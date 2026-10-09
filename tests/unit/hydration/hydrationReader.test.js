
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    readHydrationSnapshot
} from '../../../src/hydration/hydrationReader.js';

import {
    HydrationError,
    HYDRATION_ERROR_CODES as CODES
} from '../../../src/hydration/hydrationContract.js';

const SESSION = 'K283-session';

const refs = {
    knowledgeMap: {
        id: 'K283',
        version: '4',
        sha256: 'a'.repeat(64)
    }
};

function fixture({
    checkpoint = null,
    revision = 1,
    ids = ['A1', 'A2'],
    attempts = null
} = {}) {
    const savedCheckpoint = checkpoint ?? {
        schemaVersion: '1.0.0-draft',
        revision,
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId: SESSION
        },
        attemptIds: [...ids]
    };

    const records = attempts ?? {
        A1: { attemptId: 'A1', sessionId: SESSION },
        A2: { attemptId: 'A2', sessionId: SESSION }
    };

    const checkpointStore = {
        getRevision({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return revision;
        },
        getCheckpoint({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return savedCheckpoint;
        }
    };

    const attemptStore = {
        listAttemptIds({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return ids;
        },
        getAttempt({ sessionId, attemptId }) {
            assert.equal(sessionId, SESSION);
            return records[attemptId] ?? null;
        }
    };

    return {
        sessionId: SESSION,
        expectedContentRefs: refs,
        checkpointStore,
        attemptStore
    };
}

function expectCode(fn, code) {
    assert.throws(fn, error =>
        error instanceof HydrationError &&
        error.code === code
    );
}

test('HYR-01 reads checkpoint and ordered attempts', () => {
    const result = readHydrationSnapshot(fixture());

    assert.equal(result.sessionId, SESSION);
    assert.equal(result.revision, 1);
    assert.deepEqual(result.attemptIds, ['A1', 'A2']);
    assert.deepEqual(
        result.attempts.map(a => a.attemptId),
        ['A1', 'A2']
    );
});

test('HYR-02 supports empty attempt history', () => {
    const request = fixture({
        ids: [],
        attempts: {}
    });

    const result = readHydrationSnapshot(request);

    assert.deepEqual(result.attemptIds, []);
    assert.deepEqual(result.attempts, []);
});

test('HYR-03 rejects missing checkpoint', () => {
    const request = fixture();

    request.checkpointStore.getCheckpoint = () => null;

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.CHECKPOINT_NOT_FOUND
    );
});

test('HYR-04 rejects revision mismatch', () => {
    const request = fixture({
        checkpoint: {
            revision: 2,
            runtime: { sessionId: SESSION }
        }
    });

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.REVISION_MISMATCH
    );
});

test('HYR-05 rejects revision change during read', () => {
    const request = fixture();
    let calls = 0;

    request.checkpointStore.getRevision = () => {
        calls++;
        return calls === 1 ? 1 : 2;
    };

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.REVISION_MISMATCH
    );
});

test('HYR-06 rejects checkpoint change during read', () => {
    const request = fixture();
    let calls = 0;

    request.checkpointStore.getCheckpoint = () => {
        calls++;

        return {
            revision: 1,
            runtime: {
                sessionId: SESSION,
                marker: calls === 1 ? 'before' : 'after'
            }
        };
    };

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.REVISION_MISMATCH
    );
});

test('HYR-07 rejects attempt ID sequence change', () => {
    const request = fixture();
    let calls = 0;

    request.attemptStore.listAttemptIds = () => {
        calls++;
        return calls === 1
            ? ['A1', 'A2']
            : ['A2', 'A1'];
    };

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.ATTEMPT_SEQUENCE_MISMATCH
    );
});

test('HYR-08 rejects missing attempt payload', () => {
    const request = fixture();

    request.attemptStore.getAttempt = ({
        attemptId
    }) => attemptId === 'A2'
            ? null
            : { attemptId: 'A1' };

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.ATTEMPT_PAYLOAD_MISMATCH
    );
});

test('HYR-09 rejects duplicate IDs from store', () => {
    const request = fixture({
        ids: ['A1', 'A1']
    });

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.READ_FAILED
    );
});

test('HYR-10 wraps unexpected store exception', () => {
    const request = fixture();

    request.checkpointStore.getCheckpoint = () => {
        throw new Error('Storage unavailable');
    };

    expectCode(
        () => readHydrationSnapshot(request),
        CODES.READ_FAILED
    );
});

test('HYR-11 result is detached from stores', () => {
    const request = fixture();
    const result = readHydrationSnapshot(request);

    result.checkpoint.runtime.name = 'Changed';
    result.attemptIds.push('A3');
    result.attempts[0].attemptId = 'Changed';

    assert.equal(
        request.checkpointStore
            .getCheckpoint({ sessionId: SESSION })
            .runtime.name,
        'StudySession'
    );

    assert.deepEqual(
        request.attemptStore
            .listAttemptIds({ sessionId: SESSION }),
        ['A1', 'A2']
    );

    assert.equal(
        request.attemptStore
            .getAttempt({
                sessionId: SESSION,
                attemptId: 'A1'
            }).attemptId,
        'A1'
    );
});

test('HYR-12 reader does not validate attempt ownership', () => {
    const request = fixture({
        ids: ['A1'],
        attempts: {
            A1: {
                attemptId: 'WRONG',
                sessionId: 'OTHER'
            }
        }
    });

    const result = readHydrationSnapshot(request);

    // HydrationValidator must reject this later.
    assert.equal(result.attempts[0].attemptId, 'WRONG');
});

test('HYR-13 reader does not reject extra stored IDs', () => {
    const request = fixture({
        checkpoint: {
            revision: 1,
            runtime: { sessionId: SESSION },
            attemptIds: ['A1']
        },
        ids: ['A1', 'A2']
    });

    const result = readHydrationSnapshot(request);

    // HydrationValidator owns checkpoint/store sequence matching.
    assert.deepEqual(result.attemptIds, ['A1', 'A2']);
});

test('HYR-14 rejects invalid request', () => {
    expectCode(
        () => readHydrationSnapshot(null),
        CODES.INVALID_REQUEST
    );
});
