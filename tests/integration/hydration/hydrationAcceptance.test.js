
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    encodeCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

import {
    createCheckpointStore
} from '../../../src/persistence/checkpointStore.js';

import {
    createAttemptStore
} from '../../../src/persistence/attemptStore.js';

import {
    planHydration
} from '../../../src/hydration/hydrationPlanner.js';

import {
    HydrationError,
    HYDRATION_ERROR_CODES as C
} from '../../../src/hydration/hydrationContract.js';

const SESSION = 'K283-acceptance-session';
const NOW = '2026-10-08T00:00:00.000Z';
const clone = x => JSON.parse(JSON.stringify(x));

const refs = {
    knowledgeMap: {
        id: 'K283',
        version: '4',
        sha256: 'a'.repeat(64)
    }
};

function makeSession(attempts = []) {
    return {
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId: SESSION,
            startedAt: NOW,
            lastActivityAt: NOW,
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
        state: {
            schemaVersion: '1.2.0',
            learning: { session: { sessionId: SESSION } },
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
        attempts: clone(attempts),
        history: [],
        masteryRuntime: {
            evidenceHistoryByNode: {}
        }
    };
}

function setup(ids = ['A1']) {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();

    const attempts = ids.map(id => ({
        attemptId: id,
        sessionId: SESSION,
        questionId: 'Q-K283',
        result: 'correct'
    }));

    for (const attempt of attempts) {
        attemptStore.appendAttempt({
            sessionId: SESSION,
            attempt
        });
    }

    const session = makeSession(attempts);

    const checkpoint = encodeCheckpoint({
        session,
        contentRefs: clone(refs),
        revision: 1,
        savedAt: NOW,
        persistedAttemptIds: ids
    });

    checkpointStore.saveCheckpoint({
        sessionId: SESSION,
        checkpoint,
        expectedRevision: 0
    });

    const request = {
        sessionId: SESSION,
        expectedContentRefs: clone(refs),
        checkpointStore,
        attemptStore
    };

    return {
        request,
        checkpointStore,
        attemptStore,
        checkpoint,
        attempts,
        session
    };
}

function expectCode(fn, code) {
    assert.throws(
        fn,
        error =>
            error instanceof HydrationError &&
            error.code === code
    );
}

// A01 — Real codec + stores + hydration planner
test('HYA-01 real-store happy path', () => {
    const { request } = setup(['A1', 'A2']);

    const plan = planHydration(request);

    assert.equal(plan.status, 'ready-for-restoration');
    assert.equal(plan.executable, false);
    assert.equal(plan.revision, 1);
    assert.deepEqual(
        plan.attempts.map(a => a.attemptId),
        ['A1', 'A2']
    );
});

// A02 — Empty attempts
test('HYA-02 empty attempts', () => {
    const { request } = setup([]);

    const plan = planHydration(request);

    assert.deepEqual(plan.attempts, []);
    assert.deepEqual(plan.checkpoint.attemptIds, []);
});

// A03 — Missing checkpoint
test('HYA-03 missing checkpoint', () => {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();

    expectCode(
        () => planHydration({
            sessionId: SESSION,
            expectedContentRefs: clone(refs),
            checkpointStore,
            attemptStore
        }),
        C.CHECKPOINT_NOT_FOUND
    );
});

// A04 — Orphan attempt in actual store
test('HYA-04 extra persisted attempt', () => {
    const { request, attemptStore } = setup();

    attemptStore.appendAttempt({
        sessionId: SESSION,
        attempt: {
            attemptId: 'ORPHAN',
            sessionId: SESSION
        }
    });

    expectCode(
        () => planHydration(request),
        C.ATTEMPT_SEQUENCE_MISMATCH
    );
});

// A05 — Content mismatch
test('HYA-05 trusted content mismatch', () => {
    const { request } = setup();

    request.expectedContentRefs.knowledgeMap.version = '5';

    expectCode(
        () => planHydration(request),
        C.CONTENT_MISMATCH
    );
});

// A06 — Result detached from real stores
test('HYA-06 detached candidate', () => {
    const { request, checkpointStore, attemptStore } = setup();

    const plan = planHydration(request);

    plan.checkpoint.runtime.status = 'corrupted';
    plan.attempts[0].attemptId = 'corrupted';
    plan.contentRefs.knowledgeMap.version = 'corrupted';

    assert.equal(
        checkpointStore.getCheckpoint({ sessionId: SESSION })
            .runtime.status,
        'active'
    );

    assert.equal(
        attemptStore.getAttempt({
            sessionId: SESSION,
            attemptId: 'A1'
        }).attemptId,
        'A1'
    );

    assert.equal(
        planHydration(request).contentRefs.knowledgeMap.version,
        '4'
    );
});

// A07 — Revision race between reader passes
test('HYA-07 revision race', () => {
    const { request, checkpointStore } = setup();

    let calls = 0;
    const proxy = {
        getCheckpoint: args => checkpointStore.getCheckpoint(args),
        getRevision(args) {
            calls++;
            const revision = checkpointStore.getRevision(args);
            return calls >= 2 ? revision + 1 : revision;
        }
    };

    request.checkpointStore = proxy;

    expectCode(
        () => planHydration(request),
        C.REVISION_MISMATCH
    );
});

// A08 — Attempt ID race
test('HYA-08 attempt ID race', () => {
    const { request, attemptStore } = setup();

    let calls = 0;

    request.attemptStore = {
        getAttempt: args => attemptStore.getAttempt(args),
        listAttemptIds(args) {
            calls++;
            const ids = attemptStore.listAttemptIds(args);
            return calls >= 2 ? [...ids, 'LATE'] : ids;
        }
    };

    expectCode(
        () => planHydration(request),
        C.ATTEMPT_SEQUENCE_MISMATCH
    );
});

// A09 — Checkpoint body race without revision change
test('HYA-09 checkpoint body race', () => {
    const { request, checkpointStore } = setup();

    let calls = 0;

    request.checkpointStore = {
        getRevision: args => checkpointStore.getRevision(args),
        getCheckpoint(args) {
            calls++;
            const checkpoint = checkpointStore.getCheckpoint(args);

            if (calls >= 2) {
                checkpoint.runtime.status = 'paused';
            }

            return checkpoint;
        }
    };

    expectCode(
        () => planHydration(request),
        C.REVISION_MISMATCH
    );
});

// A10 — Store read exception
test('HYA-10 store read failure', () => {
    const { request } = setup();

    request.attemptStore = {
        listAttemptIds() {
            throw new Error('SECRET_ANSWER');
        },
        getAttempt() {
            throw new Error('SECRET_ANSWER');
        }
    };

    assert.throws(
        () => planHydration(request),
        error => {
            assert.equal(error.code, C.READ_FAILED);
            assert.equal(
                JSON.stringify({
                    message: error.message,
                    details: error.details
                }).includes('SECRET_ANSWER'),
                false
            );
            return true;
        }
    );
});

// A11 — Conservative verification flags
test('HYA-11 conservative guarantees', () => {
    const { request } = setup();

    const plan = planHydration(request);

    assert.equal(plan.verification.checkpointValidated, true);
    assert.equal(plan.verification.attemptSequenceValidated, true);
    assert.equal(plan.verification.contentReferencesMatched, true);

    assert.equal(plan.verification.contentIntegrityVerified, false);
    assert.equal(plan.verification.atomicSnapshotGuaranteed, false);
    assert.equal(plan.verification.runtimeContinuityVerified, false);
});

// A12 — Input immutability
test('HYA-12 no input mutation', () => {
    const { request, session, attempts } = setup();

    const beforeSession = clone(session);
    const beforeAttempts = clone(attempts);
    const beforeRefs = clone(request.expectedContentRefs);

    planHydration(request);

    assert.deepEqual(session, beforeSession);
    assert.deepEqual(attempts, beforeAttempts);
    assert.deepEqual(request.expectedContentRefs, beforeRefs);
});

// A13 — Optional attempt.sessionId
test('HYA-13 optional attempt sessionId', () => {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();

    const attempt = { attemptId: 'A1' };

    attemptStore.appendAttempt({
        sessionId: SESSION,
        attempt
    });

    const checkpoint = encodeCheckpoint({
        session: makeSession([attempt]),
        contentRefs: clone(refs),
        revision: 1,
        savedAt: NOW,
        persistedAttemptIds: ['A1']
    });

    checkpointStore.saveCheckpoint({
        sessionId: SESSION,
        checkpoint,
        expectedRevision: 0
    });

    const plan = planHydration({
        sessionId: SESSION,
        expectedContentRefs: clone(refs),
        checkpointStore,
        attemptStore
    });

    assert.equal(plan.attempts[0].attemptId, 'A1');
    assert.equal('sessionId' in plan.attempts[0], false);
});
