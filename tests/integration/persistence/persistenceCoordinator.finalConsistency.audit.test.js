
/**
 * ============================================================
 * persistenceCoordinator.finalConsistency.audit.test.js
 * ============================================================
 *
 * Phase 3.2 — Final Consistency Audit
 *
 * FCA-01: Attempt write-then-throw recovery
 * FCA-02: Checkpoint write-then-throw recovery
 * FCA-03: Attempt payload conflict
 * FCA-04: Non-prefix stored attempts
 * FCA-05: Stale checkpoint CAS
 * FCA-06: Competing writers
 * FCA-07: Attempts-first integrity
 * FCA-08: Retry after checkpoint failure
 * FCA-09: Detached data / immutability
 * FCA-10: Capability honesty
 *
 * Scope:
 * - In-memory persistence only
 * - Synchronous store implementations
 * - No hydration or resume
 * - No durability or distributed atomicity claims
 *
 * Does not modify locked engines.
 *
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPersistenceCoordinator,
    PERSISTENCE_COORDINATOR_INFO
} from '../../../src/persistence/persistenceCoordinator.js';

import {
    createAttemptStore
} from '../../../src/persistence/attemptStore.js';

import {
    createCheckpointStore
} from '../../../src/persistence/checkpointStore.js';

import {
    encodeCheckpoint,
    decodeCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const SESSION_ID = 'SESSION-FCA-001';

const SAVED_AT_1 = '2026-10-08T10:00:00.000Z';
const SAVED_AT_2 = '2026-10-08T10:05:00.000Z';

const CONTENT_REFS = Object.freeze({
    knowledgeMap: {
        id: 'knowledge-map-v4',
        version: '4.0.0',
        sha256: 'a'.repeat(64)
    }
});

/**
 * ============================================================
 * FIXTURES
 * ============================================================
 */

function clone(value) {
    return structuredClone(value);
}

function makeAttempt(index, sessionId = SESSION_ID) {
    const suffix = String(index).padStart(3, '0');

    return {
        attemptId: `ATT-FCA-${suffix}`,
        sessionId,
        questionId: `Q-FCA-${suffix}`,
        response: index,
        result: 'correct'
    };
}

function makeSession({
    sessionId = SESSION_ID,
    attempts = []
} = {}) {
    return {
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId,
            startedAt: SAVED_AT_1,
            lastActivityAt: SAVED_AT_1,
            status: 'active'
        },

        config: {
            learningMode: 'HOC_SAU',
            timeBudget: 60,
            clusterId: 'C09',
            lessonId: 'lesson-k283-v1',
            contextId: 'persistence-final-audit',
            historyLimit: 50
        },

        dependencies: {},

        state: {
            schemaVersion: '1.2.0',

            student: {
                studentId: 'STUDENT-FCA'
            },

            knowledge: {},

            history: {
                recentActions: [],
                recentQuestions: []
            }
        },

        currentDecision: {
            action: 'continue',
            reason: 'final-consistency-audit'
        },

        currentSelection: null,
        currentQuestion: null,

        lessonRuntime: {
            plan: null,
            currentItem: null,

            progress: {
                completedSectionIds: [],
                skippedSectionIds: []
            }
        },

        activeRemediationPlan: null,

        attempts,
        history: [],

        masteryRuntime: {
            evidenceHistoryByNode: {}
        },

        lastFlowResult: null
    };
}

function makeHarness({
    attemptStore = createAttemptStore(),
    checkpointStore = createCheckpointStore()
} = {}) {
    const coordinator = createPersistenceCoordinator({
        attemptStore,
        checkpointStore
    });

    return {
        attemptStore,
        checkpointStore,
        coordinator
    };
}

function persist(
    coordinator,
    session,
    {
        revision = 1,
        expectedRevision = 0,
        savedAt = SAVED_AT_1
    } = {}
) {
    return coordinator.persistSession({
        session,
        contentRefs: clone(CONTENT_REFS),
        revision,
        expectedRevision,
        savedAt
    });
}

function ids(attemptStore, sessionId = SESSION_ID) {
    return attemptStore.listAttemptIds({
        sessionId
    });
}

function revision(
    checkpointStore,
    sessionId = SESSION_ID
) {
    return checkpointStore.getRevision({
        sessionId
    });
}

function checkpoint(
    checkpointStore,
    sessionId = SESSION_ID
) {
    return checkpointStore.getCheckpoint({
        sessionId
    });
}

// function expectCode(callback, expectedCode) {
//     assert.throws(callback, error => {
//         assert.equal(
//             error.code,
//             expectedCode,
//             `Expected ${expectedCode}, received ${error.code}`
//         );

//         return true;
//     });
// }
function expectCode(callback, expectedCode) {
    assert.throws(callback, error => {
        if (error.code !== expectedCode) {
            console.log('\n[AUDIT ERROR DETAILS]');
            console.log('Actual code:', error.code);
            console.log('Cause code:', error.cause?.code);
            console.log('Cause message:', error.cause?.message);
            console.log('Details:', error.details);
        }

        assert.equal(
            error.code,
            expectedCode,
            `Expected ${expectedCode}, received ${error.code}`
        );

        return true;
    });
}

function expectWriteFailure(callback) {
    let captured;

    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'PERSISTENCE_WRITE_FAILED'
        );

        assert.ok(
            error.cause,
            'Expected original error in cause'
        );

        captured = error;
        return true;
    });

    return captured;
}
function expectCheckpointCASConflict(callback) {
    let captured;

    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'PERSISTENCE_WRITE_FAILED'
        );

        assert.ok(
            error.cause,
            'Expected underlying CheckpointStore error'
        );

        assert.equal(
            error.cause.code,
            'CHECKPOINT_REVISION_CONFLICT'
        );

        assert.equal(
            error.details?.appendedCount,
            0
        );

        captured = error;

        return true;
    });

    return captured;
}
/**
 * Wrap real store methods without replacing their semantics.
 *
 * Store methods are synchronous in Phase 3.2.
 */

function wrapAttemptStore(realStore, overrides = {}) {
    return {
        appendAttempt:
            overrides.appendAttempt ??
            ((args) => realStore.appendAttempt(args)),

        getAttempt:
            (args) => realStore.getAttempt(args),

        listAttemptIds:
            (args) => realStore.listAttemptIds(args)
    };
}

function wrapCheckpointStore(realStore, overrides = {}) {
    return {
        saveCheckpoint:
            overrides.saveCheckpoint ??
            ((args) => realStore.saveCheckpoint(args)),

        getCheckpoint:
            (args) => realStore.getCheckpoint(args),

        getRevision:
            (args) => realStore.getRevision(args)
    };
}

/**
 * ============================================================
 * FCA-01
 *
 * AttemptStore writes successfully, then throws.
 *
 * This simulates a lost acknowledgment after a successful
 * append.
 *
 * The coordinator must recover on retry without duplicating
 * the attempt.
 * ============================================================
 */

test('P3.2-FCA-01: attempt write-then-throw recovers without duplicate', () => {
    const realAttemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

    let throwOnce = true;

    const attemptStore = wrapAttemptStore(
        realAttemptStore,
        {
            appendAttempt(args) {
                const result =
                    realAttemptStore.appendAttempt(args);

                if (throwOnce) {
                    throwOnce = false;

                    throw new Error(
                        'Injected lost ACK after attempt append'
                    );
                }

                return result;
            }
        }
    );

    const { coordinator } = makeHarness({
        attemptStore,
        checkpointStore
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1)
        ]
    });

    const failure = expectWriteFailure(() => {
        persist(coordinator, session);
    });

    assert.equal(
        failure.details.appendedCount,
        0
    );

    assert.deepStrictEqual(
        ids(realAttemptStore),
        ['ATT-FCA-001']
    );

    assert.equal(
        revision(checkpointStore),
        0
    );

    const result = persist(
        coordinator,
        session
    );

    assert.equal(
        result.status,
        'committed'
    );

    assert.deepStrictEqual(
        ids(realAttemptStore),
        ['ATT-FCA-001']
    );

    assert.equal(
        revision(checkpointStore),
        1
    );
});

/**
 * ============================================================
 * FCA-02
 *
 * CheckpointStore commits successfully, then throws.
 *
 * Retry must detect the already committed checkpoint
 * and return an idempotent result.
 * ============================================================
 */

test('P3.2-FCA-02: checkpoint write-then-throw is idempotent on retry', () => {
    const attemptStore = createAttemptStore();
    const realCheckpointStore = createCheckpointStore();

    let throwOnce = true;

    const checkpointStore = wrapCheckpointStore(
        realCheckpointStore,
        {
            saveCheckpoint(args) {
                const result =
                    realCheckpointStore.saveCheckpoint(args);

                if (throwOnce) {
                    throwOnce = false;

                    throw new Error(
                        'Injected lost ACK after checkpoint commit'
                    );
                }

                return result;
            }
        }
    );

    const { coordinator } = makeHarness({
        attemptStore,
        checkpointStore
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1)
        ]
    });

    expectWriteFailure(() => {
        persist(coordinator, session);
    });

    assert.equal(
        revision(realCheckpointStore),
        1
    );

    assert.deepStrictEqual(
        ids(attemptStore),
        ['ATT-FCA-001']
    );

    const retry = persist(
        coordinator,
        session
    );

    assert.equal(
        retry.status,
        'idempotent'
    );

    assert.equal(
        retry.revision,
        1
    );

    assert.equal(
        revision(realCheckpointStore),
        1
    );

    assert.deepStrictEqual(
        ids(attemptStore),
        ['ATT-FCA-001']
    );
});

/**
 * ============================================================
 * FCA-03
 *
 * Same attemptId, different payload.
 *
 * Existing persisted attempt must remain unchanged.
 * ============================================================
 */

test('P3.2-FCA-03: conflicting attempt payload cannot overwrite persisted data', () => {
    const {
        attemptStore,
        checkpointStore,
        coordinator
    } = makeHarness();

    const originalAttempt = makeAttempt(1);

    const session = makeSession({
        attempts: [
            originalAttempt
        ]
    });

    persist(coordinator, session);

    const before = attemptStore.getAttempt({
        sessionId: SESSION_ID,
        attemptId: originalAttempt.attemptId
    });

    const conflictingAttempt = {
        ...originalAttempt,
        response: 999
    };

    const conflictingSession = makeSession({
        attempts: [
            conflictingAttempt
        ]
    });

    expectCode(() => {
        persist(
            coordinator,
            conflictingSession,
            {
                revision: 2,
                expectedRevision: 1,
                savedAt: SAVED_AT_2
            }
        );
    }, 'PERSISTENCE_ATTEMPT_CONFLICT');

    const after = attemptStore.getAttempt({
        sessionId: SESSION_ID,
        attemptId: originalAttempt.attemptId
    });

    assert.deepStrictEqual(after, before);

    assert.equal(
        revision(checkpointStore),
        1
    );
});

/**
 * ============================================================
 * FCA-04
 *
 * Stored attempt IDs must be an exact prefix of the
 * current StudySession attempt sequence.
 * ============================================================
 */

test('P3.2-FCA-04: non-prefix stored attempts are rejected before writes', () => {
    const {
        attemptStore,
        checkpointStore,
        coordinator
    } = makeHarness();

    attemptStore.appendAttempt({
        sessionId: SESSION_ID,
        attempt: makeAttempt(2)
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2)
        ]
    });

    const beforeIds = ids(attemptStore);

    expectCode(() => {
        persist(coordinator, session);
    }, 'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT');

    assert.deepStrictEqual(
        ids(attemptStore),
        beforeIds
    );

    assert.equal(
        revision(checkpointStore),
        0
    );
});

/**
 * ============================================================
 * FCA-05
 *
 * Stale CAS must not overwrite newer checkpoint.
 * ============================================================
 */

test('P3.2-FCA-05: stale CAS cannot overwrite newer checkpoint', () => {
    const {
        checkpointStore,
        coordinator
    } = makeHarness();

    const session = makeSession();

    persist(coordinator, session);

    persist(
        coordinator,
        session,
        {
            revision: 2,
            expectedRevision: 1,
            savedAt: SAVED_AT_2
        }
    );

    const before = checkpoint(
        checkpointStore
    );

    expectCheckpointCASConflict(() => {
        persist(
            coordinator,
            session,
            {
                revision: 2,
                expectedRevision: 1,
                savedAt: SAVED_AT_1
            }
        );
    });

    assert.equal(
        revision(checkpointStore),
        2
    );

    assert.deepStrictEqual(
        checkpoint(checkpointStore),
        before
    );
});

/**
 * ============================================================
 * FCA-06
 *
 * Two writers attempt to commit different payloads
 * using the same expectedRevision.
 *
 * This is a sequential CAS conflict simulation.
 * It does NOT prove multi-process concurrency safety.
 * ============================================================
 */

test('P3.2-FCA-06: competing writers cannot commit different revision-2 payloads', () => {
    const {
        checkpointStore,
        coordinator
    } = makeHarness();

    const initial = makeSession();

    persist(coordinator, initial);

    const writerA = makeSession();
    const writerB = makeSession();

    writerA.history.push({
        action: 'writer-a'
    });

    writerB.history.push({
        action: 'writer-b'
    });

    const winner = persist(
        coordinator,
        writerA,
        {
            revision: 2,
            expectedRevision: 1,
            savedAt: SAVED_AT_2
        }
    );

    const committedCheckpoint = clone(
        checkpoint(checkpointStore)
    );

    assert.equal(
        winner.status,
        'committed'
    );

    expectCheckpointCASConflict(() => {
        persist(
            coordinator,
            writerB,
            {
                revision: 2,
                expectedRevision: 1,
                savedAt: SAVED_AT_2
            }
        );
    });

    assert.equal(
        revision(checkpointStore),
        2
    );

    assert.deepStrictEqual(
        checkpoint(checkpointStore),
        committedCheckpoint
    );
});

/**
 * ============================================================
 * FCA-07
 *
 * Checkpoint must only reference attempts already
 * persisted in AttemptStore.
 * ============================================================
 */

test('P3.2-FCA-07: checkpoint is written only after all attempts exist', () => {
    const attemptStore = createAttemptStore();
    const realCheckpointStore = createCheckpointStore();

    const observed = [];

    const checkpointStore = wrapCheckpointStore(
        realCheckpointStore,
        {
            saveCheckpoint(args) {
                const sessionId = args.sessionId;

                const storedIds =
                    attemptStore.listAttemptIds({
                        sessionId
                    });

                const referencedIds =
                    args.checkpoint.attemptIds;

                assert.deepStrictEqual(
                    storedIds,
                    referencedIds
                );

                observed.push({
                    storedIds: clone(storedIds),
                    referencedIds: clone(referencedIds)
                });

                return realCheckpointStore
                    .saveCheckpoint(args);
            }
        }
    );

    const { coordinator } = makeHarness({
        attemptStore,
        checkpointStore
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2),
            makeAttempt(3)
        ]
    });

    persist(coordinator, session);

    assert.equal(observed.length, 1);

    assert.deepStrictEqual(
        observed[0].storedIds,
        [
            'ATT-FCA-001',
            'ATT-FCA-002',
            'ATT-FCA-003'
        ]
    );

    assert.equal(
        revision(realCheckpointStore),
        1
    );
});

/**
 * ============================================================
 * FCA-08
 *
 * Checkpoint fails before commit.
 * Attempts remain stored.
 *
 * Retry must complete without duplicating attempts.
 * ============================================================
 */

test('P3.2-FCA-08: checkpoint failure retry preserves attempt integrity', () => {
    const attemptStore = createAttemptStore();
    const realCheckpointStore = createCheckpointStore();

    let failOnce = true;

    const checkpointStore = wrapCheckpointStore(
        realCheckpointStore,
        {
            saveCheckpoint(args) {
                if (failOnce) {
                    failOnce = false;

                    throw new Error(
                        'Injected checkpoint failure before commit'
                    );
                }

                return realCheckpointStore
                    .saveCheckpoint(args);
            }
        }
    );

    const { coordinator } = makeHarness({
        attemptStore,
        checkpointStore
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2)
        ]
    });

    expectWriteFailure(() => {
        persist(coordinator, session);
    });

    assert.deepStrictEqual(
        ids(attemptStore),
        [
            'ATT-FCA-001',
            'ATT-FCA-002'
        ]
    );

    assert.equal(
        revision(realCheckpointStore),
        0
    );

    const result = persist(
        coordinator,
        session
    );

    assert.equal(
        result.status,
        'committed'
    );

    assert.deepStrictEqual(
        ids(attemptStore),
        [
            'ATT-FCA-001',
            'ATT-FCA-002'
        ]
    );

    assert.equal(
        revision(realCheckpointStore),
        1
    );
});

/**
 * ============================================================
 * FCA-09
 *
 * Mutation of returned data must not affect persisted
 * checkpoint or attempts.
 * ============================================================
 */

test('P3.2-FCA-09: returned data is detached from persisted stores', () => {
    const {
        attemptStore,
        checkpointStore,
        coordinator
    } = makeHarness();

    const session = makeSession({
        attempts: [
            makeAttempt(1)
        ]
    });

    const originalSession = clone(session);

    const result = persist(
        coordinator,
        session
    );

    assert.deepStrictEqual(
        session,
        originalSession
    );

    const beforeCheckpoint = clone(
        checkpoint(checkpointStore)
    );

    const beforeAttempt = clone(
        attemptStore.getAttempt({
            sessionId: SESSION_ID,
            attemptId: 'ATT-FCA-001'
        })
    );

    result.checkpoint.runtime.status =
        'tampered';

    result.attemptIds.push(
        'ATT-FAKE'
    );

    assert.deepStrictEqual(
        checkpoint(checkpointStore),
        beforeCheckpoint
    );

    assert.deepStrictEqual(
        attemptStore.getAttempt({
            sessionId: SESSION_ID,
            attemptId: 'ATT-FCA-001'
        }),
        beforeAttempt
    );

    assert.deepStrictEqual(
        ids(attemptStore),
        ['ATT-FCA-001']
    );
});

/**
 * ============================================================
 * FCA-10
 *
 * Metadata must not claim capabilities that are not
 * implemented in Phase 3.2.
 * ============================================================
 */

test('P3.2-FCA-10: persistence capability metadata is honest', () => {
    const {
        coordinator
    } = makeHarness();

    const info = coordinator.getInfo();

    assert.equal(
        info.durable,
        false
    );

    assert.equal(
        info.supportsTransactions,
        false
    );

    assert.equal(
        info.supportsAtomicCommit,
        false
    );

    assert.equal(
        info.supportsHydration,
        false
    );

    assert.equal(
        info.supportsResume,
        false
    );

    assert.equal(
        info.supportsCAS,
        true
    );

    assert.equal(
        info.supportsIdempotency,
        true
    );

    assert.deepStrictEqual(
        info.writeOrder,
        [
            'attempts',
            'checkpoint'
        ]
    );

    assert.deepStrictEqual(
        info,
        PERSISTENCE_COORDINATOR_INFO
    );

    assert.equal(
        typeof coordinator.hydrateSession,
        'undefined'
    );

    assert.equal(
        typeof coordinator.resumeSession,
        'undefined'
    );
});
