
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    planHydration
} from '../../../src/hydration/hydrationPlanner.js';

import {
    HydrationError,
    HYDRATION_ERROR_CODES as C
} from '../../../src/hydration/hydrationContract.js';

const SESSION = 'K283-session';
const TIME = '2026-10-08T00:00:00.000Z';

const clone = value => JSON.parse(JSON.stringify(value));

function fixture(ids = ['A1']) {
    const refs = {
        knowledgeMap: {
            id: 'K283',
            version: '4',
            sha256: 'a'.repeat(64)
        }
    };

    const checkpoint = {
        schemaVersion: '1.0.0-draft',
        revision: 1,
        savedAt: TIME,

        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId: SESSION,
            startedAt: TIME,
            lastActivityAt: TIME,
            status: 'active'
        },

        config: {
            historyLimit: 50,
            learningMode: 'HOC_SAU',
            timeBudget: 30,
            clusterId: null,
            lessonId: null,
            contextId: null
        },

        contentRefs: clone(refs),

        state: {
            schemaVersion: '1.2.0',
            learning: {
                session: { sessionId: SESSION }
            },
            knowledge: {}
        },

        currentDecision: { action: 'LEARN' },
        currentSelection: null,
        currentQuestion: null,

        lessonRuntime: {
            currentItem: null,
            progress: {
                completedSectionIds: [],
                skippedSectionIds: []
            }
        },

        activeRemediationPlan: null,
        history: [],
        masteryRuntime: {
            evidenceHistoryByNode: {}
        },

        attemptIds: [...ids]
    };

    const attempts = new Map(
        ids.map(id => [
            id,
            { attemptId: id, sessionId: SESSION }
        ])
    );

    const checkpointStore = {
        getRevision({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return checkpoint.revision;
        },

        getCheckpoint({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return clone(checkpoint);
        }
    };

    const attemptStore = {
        listAttemptIds({ sessionId }) {
            assert.equal(sessionId, SESSION);
            return [...attempts.keys()];
        },

        getAttempt({ sessionId, attemptId }) {
            assert.equal(sessionId, SESSION);
            const attempt = attempts.get(attemptId);
            return attempt ? clone(attempt) : null;
        }
    };

    return {
        request: {
            sessionId: SESSION,
            expectedContentRefs: refs,
            checkpointStore,
            attemptStore
        },
        checkpoint,
        attempts
    };
}

function expectError(fn, code) {
    assert.throws(
        fn,
        error =>
            error instanceof HydrationError &&
            error.code === code
    );
}

test('HYP-01 creates restoration candidate', () => {
    const { request } = fixture();

    const result = planHydration(request);

    assert.equal(result.status, 'ready-for-restoration');
    assert.equal(result.sessionId, SESSION);
    assert.equal(result.revision, 1);
    assert.equal(result.executable, false);
});

test('HYP-02 includes checkpoint and attempts', () => {
    const { request } = fixture(['A1', 'A2']);

    const result = planHydration(request);

    assert.deepEqual(
        result.attempts.map(a => a.attemptId),
        ['A1', 'A2']
    );

    assert.deepEqual(
        result.checkpoint.attemptIds,
        ['A1', 'A2']
    );
});

test('HYP-03 includes compatibility metadata', () => {
    const { request } = fixture();
    const result = planHydration(request);

    assert.deepEqual(result.compatibility, {
        checkpointSchemaVersion: '1.0.0-draft',
        runtimeName: 'StudySession',
        runtimeVersion: '0.2.0',
        studentStateSchemaVersion: '1.2.0'
    });

    assert.equal(result.runtimeVersion, '0.2.0');
});

test('HYP-04 verification flags are conservative', () => {
    const { request } = fixture();
    const result = planHydration(request);

    assert.deepEqual(result.verification, {
        checkpointValidated: true,
        attemptSequenceValidated: true,
        attemptOwnershipValidated: true,
        contentReferencesMatched: true,
        contentIntegrityVerified: false,
        atomicSnapshotGuaranteed: false,
        runtimeContinuityVerified: false
    });
});

test('HYP-05 warnings are stable', () => {
    const { request } = fixture();
    const result = planHydration(request);

    assert.deepEqual(result.warnings, [
        'NON_ATOMIC_CROSS_STORE_READ',
        'RUNTIME_CONTINUITY_NOT_VERIFIED'
    ]);
});

test('HYP-06 supports empty attempts', () => {
    const { request } = fixture([]);
    const result = planHydration(request);

    assert.deepEqual(result.attempts, []);
    assert.deepEqual(result.checkpoint.attemptIds, []);
});

test('HYP-07 rejects invalid request', () => {
    expectError(
        () => planHydration(null),
        C.INVALID_REQUEST
    );
});

test('HYP-08 rejects missing checkpoint', () => {
    const { request } = fixture();

    request.checkpointStore.getCheckpoint = () => null;

    expectError(
        () => planHydration(request),
        C.CHECKPOINT_NOT_FOUND
    );
});

test('HYP-09 rejects orphan attempt', () => {
    const { request, attempts } = fixture();

    attempts.set('A2', {
        attemptId: 'A2',
        sessionId: SESSION
    });

    expectError(
        () => planHydration(request),
        C.ATTEMPT_SEQUENCE_MISMATCH
    );
});

test('HYP-10 rejects content mismatch', () => {
    const { request } = fixture();

    request.expectedContentRefs.knowledgeMap.version = '5';

    expectError(
        () => planHydration(request),
        C.CONTENT_MISMATCH
    );
});

test('HYP-11 rejects wrong attempt payload', () => {
    const { request, attempts } = fixture();

    attempts.set('A1', {
        attemptId: 'WRONG',
        sessionId: SESSION
    });

    expectError(
        () => planHydration(request),
        C.ATTEMPT_PAYLOAD_MISMATCH
    );
});

test('HYP-12 rejects unsupported runtime', () => {
    const { request, checkpoint } = fixture();

    checkpoint.runtime.version = '9.0.0';

    expectError(
        () => planHydration(request),
        C.UNSUPPORTED_VERSION
    );
});

test('HYP-13 result is detached', () => {
    const { request, checkpoint, attempts } = fixture();

    const result = planHydration(request);

    result.checkpoint.runtime.status = 'changed';
    result.attempts[0].attemptId = 'changed';
    result.contentRefs.knowledgeMap.version = 'changed';

    assert.equal(checkpoint.runtime.status, 'active');
    assert.equal(attempts.get('A1').attemptId, 'A1');

    assert.equal(
        request.expectedContentRefs.knowledgeMap.version,
        '4'
    );
});

test('HYP-14 planning does not mutate input', () => {
    const { request, checkpoint, attempts } = fixture();

    const beforeCheckpoint = clone(checkpoint);
    const beforeRefs = clone(request.expectedContentRefs);
    const beforeAttempts = clone([...attempts.values()]);

    planHydration(request);

    assert.deepEqual(checkpoint, beforeCheckpoint);
    assert.deepEqual(request.expectedContentRefs, beforeRefs);
    assert.deepEqual([...attempts.values()], beforeAttempts);
});

test('HYP-15 wraps store read errors', () => {
    const { request } = fixture();

    request.checkpointStore.getRevision = () => {
        throw new Error('Sensitive internal storage error');
    };

    expectError(
        () => planHydration(request),
        C.READ_FAILED
    );
});

test('HYP-16 does not leak attempt answers in errors', () => {
    const { request } = fixture();

    request.attemptStore.getAttempt = () => {
        throw new Error('SECRET_STUDENT_ANSWER');
    };

    assert.throws(
        () => planHydration(request),
        error => {
            assert.equal(error.code, C.READ_FAILED);
            assert.equal(
                JSON.stringify({
                    message: error.message,
                    details: error.details
                }).includes('SECRET_STUDENT_ANSWER'),
                false
            );
            return true;
        }
    );
});
