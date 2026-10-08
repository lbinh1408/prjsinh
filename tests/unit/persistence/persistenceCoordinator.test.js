
/**
 * ============================================================
 * persistenceCoordinator.test.js
 * ============================================================
 *
 * Phase 3.2 — Persistence Coordinator V1
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Tests:
 * PC01–PC55
 *
 * Dependencies:
 * - PersistenceCoordinator V1
 * - AttemptStore V1
 * - CheckpointStore V1
 * - CheckpointCodec V1
 *
 * Uses a minimal StudySession-shaped fixture.
 * Does not execute LOCKED engines.
 *
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPersistenceCoordinator,
    getPersistenceCoordinatorInfo,
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

test.afterEach((context) => {
    for (const error of context.errors ?? []) {
        let current = error;
        let depth = 0;

        while (current && depth < 5) {
            console.error(
                `[${context.name}] ERROR LEVEL ${depth}:`,
                current.code ?? current.name,
                current.message
            );

            current = current.cause;
            depth++;
        }
    }
});

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const SESSION_A = 'SESSION-PC-UNIT-A';
const SESSION_B = 'SESSION-PC-UNIT-B';

const SAVED_AT_1 = '2026-10-08T10:00:00.000Z';
const SAVED_AT_2 = '2026-10-08T10:05:00.000Z';
const SAVED_AT_3 = '2026-10-08T10:10:00.000Z';

const CONTENT_REFS = {
    knowledgeMap: {
        id: 'knowledge-map-v4',
        version: '4.0.0',
        sha256: 'a'.repeat(64)
    }
};

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function clone(value) {
    return structuredClone(value);
}

function makeAttempt(
    index,
    sessionId = SESSION_A
) {
    const suffix = String(index).padStart(3, '0');

    return {
        attemptId: `ATT-PC-${suffix}`,
        sessionId,
        questionId: `Q-PC-${suffix}`,
        response: index,
        result: 'correct'
    };
}

function makeSession({
    sessionId = SESSION_A,
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
            contextId: 'persistence-coordinator-unit',
            historyLimit: 50
        },

        dependencies: {},

        state: {
            schemaVersion: '1.2.0',
            student: {
                studentId: 'STUDENT-PC-UNIT'
            },
            knowledge: {},
            history: {
                recentActions: [],
                recentQuestions: []
            }
        },

        currentDecision: {
            action: 'continue',
            reason: 'unit-test-initial-state'
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

        attempts: clone(attempts),
        history: [],

        masteryRuntime: {
            evidenceHistoryByNode: {}
        },

        lastFlowResult: null
    };
}

function makeHarness() {
    const attemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

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
    {
        session = makeSession(),
        revision = 1,
        expectedRevision = 0,
        savedAt = SAVED_AT_1,
        contentRefs = CONTENT_REFS
    } = {}
) {
    return coordinator.persistSession({
        session,
        contentRefs: clone(contentRefs),
        revision,
        expectedRevision,
        savedAt
    });
}

function expectCode(callback, code) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            code,
            `Expected ${code}, got ${error.code}`
        );

        return true;
    });
}

function expectWriteFailure(
    callback,
    causeCode = null
) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'PERSISTENCE_WRITE_FAILED'
        );

        assert.ok(error.cause);

        if (causeCode) {
            assert.equal(
                error.cause.code,
                causeCode
            );
        }

        return true;
    });
}

function getIds(attemptStore, sessionId = SESSION_A) {
    return attemptStore.listAttemptIds({
        sessionId
    });
}

function getCheckpoint(
    checkpointStore,
    sessionId = SESSION_A
) {
    return checkpointStore.getCheckpoint({
        sessionId
    });
}

function getRevision(
    checkpointStore,
    sessionId = SESSION_A
) {
    return checkpointStore.getRevision({
        sessionId
    });
}

/**
 * ============================================================
 * GROUP A — METADATA / FACTORY
 * ============================================================
 */

test('P3.2-PC01: coordinator metadata identity', () => {
    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.name,
        'PersistenceCoordinator'
    );

    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.version,
        '1.0.0-draft'
    );
});

test('P3.2-PC02: coordinator does not claim durability', () => {
    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.durable,
        false
    );

    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.supportsTransactions,
        false
    );

    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.supportsAtomicCommit,
        false
    );
});

test('P3.2-PC03: coordinator declares CAS and idempotency', () => {
    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.supportsCAS,
        true
    );

    assert.equal(
        PERSISTENCE_COORDINATOR_INFO.supportsIdempotency,
        true
    );
});

test('P3.2-PC04: write order is attempts before checkpoint', () => {
    assert.deepStrictEqual(
        PERSISTENCE_COORDINATOR_INFO.writeOrder,
        ['attempts', 'checkpoint']
    );
});

test('P3.2-PC05: factory exposes required methods', () => {
    const { coordinator } = makeHarness();

    assert.equal(
        typeof coordinator.persistSession,
        'function'
    );

    assert.equal(
        typeof coordinator.getPersistedSnapshot,
        'function'
    );

    assert.equal(
        typeof coordinator.getInfo,
        'function'
    );

    assert.ok(Object.isFrozen(coordinator));
});

test('P3.2-PC06: metadata accessor is detached', () => {
    const info = getPersistenceCoordinatorInfo();

    assert.deepStrictEqual(
        info,
        PERSISTENCE_COORDINATOR_INFO
    );

    assert.notStrictEqual(
        info,
        PERSISTENCE_COORDINATOR_INFO
    );

    assert.notStrictEqual(
        info.writeOrder,
        PERSISTENCE_COORDINATOR_INFO.writeOrder
    );
});

test('P3.2-PC07: missing dependencies are rejected', () => {
    assert.throws(() => {
        createPersistenceCoordinator({});
    });

    assert.throws(() => {
        createPersistenceCoordinator({
            attemptStore: createAttemptStore()
        });
    });

    assert.throws(() => {
        createPersistenceCoordinator({
            checkpointStore: createCheckpointStore()
        });
    });
});

test('P3.2-PC08: malformed dependencies are rejected', () => {
    assert.throws(() => {
        createPersistenceCoordinator({
            attemptStore: {},
            checkpointStore: {}
        });
    }, /attemptStore.appendAttempt/);
});

/**
 * ============================================================
 * GROUP B — EMPTY SESSION PERSISTENCE
 * ============================================================
 */

test('P3.2-PC09: persist session with zero attempts', () => {
    const { coordinator } = makeHarness();

    const result = persist(coordinator);

    assert.equal(result.status, 'committed');
    assert.equal(result.sessionId, SESSION_A);
    assert.equal(result.revision, 1);

    assert.deepStrictEqual(
        result.attemptIds,
        []
    );
});

test('P3.2-PC10: empty session creates checkpoint revision 1', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator);

    assert.equal(
        getRevision(checkpointStore),
        1
    );

    assert.ok(
        getCheckpoint(checkpointStore)
    );
});

test('P3.2-PC11: empty session stores no attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    persist(coordinator);

    assert.deepStrictEqual(
        getIds(attemptStore),
        []
    );
});

test('P3.2-PC12: coordinator checkpoint matches codec output', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    const session = makeSession();

    const result = persist(coordinator, {
        session
    });

    const expected = encodeCheckpoint({
        session,
        contentRefs: clone(CONTENT_REFS),
        revision: 1,
        savedAt: SAVED_AT_1,
        persistedAttemptIds: []
    });

    assert.deepStrictEqual(
        result.checkpoint,
        expected
    );

    assert.deepStrictEqual(
        getCheckpoint(checkpointStore),
        expected
    );
});

test('P3.2-PC13: committed checkpoint can be decoded', () => {
    const { coordinator } = makeHarness();

    const result = persist(coordinator);

    const decoded = decodeCheckpoint(
        JSON.stringify(result.checkpoint)
    );

    assert.deepStrictEqual(
        decoded,
        result.checkpoint
    );
});

/**
 * ============================================================
 * GROUP C — ATTEMPTS-FIRST
 * ============================================================
 */

test('P3.2-PC14: persist one attempt before checkpoint', () => {
    const {
        coordinator,
        attemptStore,
        checkpointStore
    } = makeHarness();

    const session = makeSession({
        attempts: [makeAttempt(1)]
    });

    const result = persist(coordinator, {
        session
    });

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001']
    );

    assert.deepStrictEqual(
        result.attemptIds,
        ['ATT-PC-001']
    );

    assert.deepStrictEqual(
        getCheckpoint(checkpointStore).attemptIds,
        ['ATT-PC-001']
    );
});

test('P3.2-PC15: persist three attempts in original order', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const attempts = [
        makeAttempt(1),
        makeAttempt(2),
        makeAttempt(3)
    ];

    const result = persist(coordinator, {
        session: makeSession({ attempts })
    });

    assert.deepStrictEqual(
        getIds(attemptStore),
        [
            'ATT-PC-001',
            'ATT-PC-002',
            'ATT-PC-003'
        ]
    );

    assert.deepStrictEqual(
        result.attemptIds,
        getIds(attemptStore)
    );
});

test('P3.2-PC16: coordinator does not duplicate existing attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const attempt = makeAttempt(1);

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt
    });

    persist(coordinator, {
        session: makeSession({
            attempts: [attempt]
        })
    });

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001']
    );
});

test('P3.2-PC17: append only missing suffix attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt: makeAttempt(1)
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2),
            makeAttempt(3)
        ]
    });

    persist(coordinator, { session });

    assert.deepStrictEqual(
        getIds(attemptStore),
        [
            'ATT-PC-001',
            'ATT-PC-002',
            'ATT-PC-003'
        ]
    );
});

test('P3.2-PC18: stored attempt payloads match session attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const attempts = [
        makeAttempt(1),
        makeAttempt(2)
    ];

    persist(coordinator, {
        session: makeSession({ attempts })
    });

    for (const attempt of attempts) {
        assert.deepStrictEqual(
            attemptStore.getAttempt({
                sessionId: SESSION_A,
                attemptId: attempt.attemptId
            }),
            attempt
        );
    }
});

test('P3.2-PC19: checkpoint references exactly persisted attempt IDs', () => {
    const {
        coordinator,
        attemptStore,
        checkpointStore
    } = makeHarness();

    const attempts = [
        makeAttempt(1),
        makeAttempt(2)
    ];

    persist(coordinator, {
        session: makeSession({ attempts })
    });

    assert.deepStrictEqual(
        getCheckpoint(checkpointStore).attemptIds,
        getIds(attemptStore)
    );
});

/**
 * ============================================================
 * GROUP D — REVISION / CAS
 * ============================================================
 */

test('P3.2-PC20: revision advances from 1 to 2', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator);

    const result = persist(coordinator, {
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    assert.equal(result.status, 'committed');
    assert.equal(result.revision, 2);

    assert.equal(
        getRevision(checkpointStore),
        2
    );
});

test('P3.2-PC21: revision advances from 2 to 3', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator);

    persist(coordinator, {
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    const result = persist(coordinator, {
        revision: 3,
        expectedRevision: 2,
        savedAt: SAVED_AT_3
    });

    assert.equal(result.revision, 3);

    assert.equal(
        getRevision(checkpointStore),
        3
    );
});

test('P3.2-PC22: stale expected revision is rejected before writes', () => {
    const {
        coordinator,
        checkpointStore,
        attemptStore
    } = makeHarness();

    persist(coordinator);

    persist(coordinator, {
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    const staleSession = makeSession({
        attempts: [makeAttempt(1)]
    });

    expectCode(() => {
        persist(coordinator, {
            session: staleSession,
            revision: 3,
            expectedRevision: 1,
            savedAt: SAVED_AT_3
        });
    }, 'PERSISTENCE_INVALID_REVISION_TRANSITION');

    assert.equal(
        getRevision(checkpointStore),
        2
    );

    assert.deepStrictEqual(
        getIds(attemptStore),
        []
    );
});

test('P3.2-PC23: valid transition with stale CAS is rejected', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator);

    persist(coordinator, {
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    expectCode(() => {
        persist(coordinator, {
            revision: 2,
            expectedRevision: 1,
            savedAt: SAVED_AT_3
        });
    }, 'PERSISTENCE_WRITE_FAILED');

    assert.equal(
        getRevision(checkpointStore),
        2
    );
});

test('P3.2-PC24: future expected revision is rejected', () => {
    const { coordinator } = makeHarness();

    expectCode(() => {
        persist(coordinator, {
            revision: 4,
            expectedRevision: 3
        });
    }, 'PERSISTENCE_REVISION_CONFLICT');
});

test('P3.2-PC25: cannot skip checkpoint revisions', () => {
    const { coordinator } = makeHarness();

    expectCode(() => {
        persist(coordinator, {
            revision: 3,
            expectedRevision: 0
        });
    }, 'PERSISTENCE_INVALID_REVISION_TRANSITION');
});

/**
 * ============================================================
 * GROUP E — IDEMPOTENCY
 * ============================================================
 */

test('P3.2-PC26: exact retry returns idempotent', () => {
    const { coordinator } = makeHarness();

    const first = persist(coordinator);

    const retry = persist(coordinator);

    assert.equal(first.status, 'committed');
    assert.equal(retry.status, 'idempotent');

    assert.deepStrictEqual(
        retry.checkpoint,
        first.checkpoint
    );
});

test('P3.2-PC27: retry does not advance revision', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator);
    persist(coordinator);

    assert.equal(
        getRevision(checkpointStore),
        1
    );
});

test('P3.2-PC28: retry does not duplicate attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2)
        ]
    });

    persist(coordinator, { session });
    persist(coordinator, { session });

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001', 'ATT-PC-002']
    );
});

test('P3.2-PC29: changed retry payload is rejected', () => {
    const { coordinator } = makeHarness();

    persist(coordinator);

    expectWriteFailure(() => {
        persist(coordinator, {
            savedAt: SAVED_AT_2
        });
    }, 'CHECKPOINT_REVISION_CONFLICT');
});

test('P3.2-PC30: retry older revision after newer commit is rejected', () => {
    const { coordinator } = makeHarness();

    persist(coordinator);

    persist(coordinator, {
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    expectCode(() => {
        persist(coordinator);
    }, 'PERSISTENCE_REVISION_CONFLICT');
});

/**
 * ============================================================
 * GROUP F — ATTEMPT CONFLICTS
 * ============================================================
 */

test('P3.2-PC31: duplicate attempt IDs in session are rejected', () => {
    const { coordinator } = makeHarness();

    const duplicate = makeAttempt(1);

    const session = makeSession({
        attempts: [
            duplicate,
            clone(duplicate)
        ]
    });

    expectCode(() => {
        persist(coordinator, { session });
    }, 'PERSISTENCE_DUPLICATE_ATTEMPT');
});

test('P3.2-PC32: attempt session mismatch is rejected', () => {
    const { coordinator } = makeHarness();

    const session = makeSession({
        attempts: [
            makeAttempt(1, SESSION_B)
        ]
    });

    expectCode(() => {
        persist(coordinator, { session });
    }, 'PERSISTENCE_SESSION_CONFLICT');
});

test('P3.2-PC33: stored attempt sequence must be a prefix', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt: makeAttempt(2)
    });

    expectCode(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [
                    makeAttempt(1),
                    makeAttempt(2)
                ]
            })
        });
    }, 'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT');
});

test('P3.2-PC34: stored attempts cannot exceed session attempts', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt: makeAttempt(1)
    });

    expectCode(() => {
        persist(coordinator);
    }, 'PERSISTENCE_ATTEMPT_SEQUENCE_CONFLICT');
});

test('P3.2-PC35: stored attempt payload conflict is rejected', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const stored = makeAttempt(1);
    stored.response = 999;

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt: stored
    });

    expectCode(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [makeAttempt(1)]
            })
        });
    }, 'PERSISTENCE_ATTEMPT_CONFLICT');
});

test('P3.2-PC36: matching stored attempts are accepted', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const attempt = makeAttempt(1);

    attemptStore.appendAttempt({
        sessionId: SESSION_A,
        attempt
    });

    const result = persist(coordinator, {
        session: makeSession({
            attempts: [attempt]
        })
    });

    assert.equal(result.status, 'committed');
});

/**
 * ============================================================
 * GROUP G — FAILURE INJECTION
 * ============================================================
 */

test('P3.2-PC37: append failure is reported', () => {
    const attemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

    const coordinator = createPersistenceCoordinator({
        attemptStore: {
            appendAttempt() {
                throw new Error('Injected append failure');
            },
            getAttempt: attemptStore.getAttempt,
            listAttemptIds: attemptStore.listAttemptIds
        },
        checkpointStore
    });

    expectWriteFailure(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [makeAttempt(1)]
            })
        });
    });

    assert.equal(
        getRevision(checkpointStore),
        0
    );
});

test('P3.2-PC38: checkpoint save failure is reported', () => {
    const attemptStore = createAttemptStore();
    const realCheckpointStore = createCheckpointStore();

    const coordinator = createPersistenceCoordinator({
        attemptStore,
        checkpointStore: {
            saveCheckpoint() {
                throw new Error('Injected checkpoint failure');
            },
            getCheckpoint:
                realCheckpointStore.getCheckpoint,
            getRevision:
                realCheckpointStore.getRevision
        }
    });

    expectWriteFailure(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [makeAttempt(1)]
            })
        });
    });

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001']
    );

    assert.equal(
        getRevision(realCheckpointStore),
        0
    );
});

test('P3.2-PC39: partial attempt writes remain visible after failure', () => {
    const realAttemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

    let appendCalls = 0;

    const coordinator = createPersistenceCoordinator({
        attemptStore: {
            appendAttempt(args) {
                appendCalls++;

                if (appendCalls === 2) {
                    throw new Error('Injected second append failure');
                }

                return realAttemptStore.appendAttempt(args);
            },
            getAttempt: realAttemptStore.getAttempt,
            listAttemptIds: realAttemptStore.listAttemptIds
        },
        checkpointStore
    });

    expectWriteFailure(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [
                    makeAttempt(1),
                    makeAttempt(2)
                ]
            })
        });
    });

    assert.deepStrictEqual(
        getIds(realAttemptStore),
        ['ATT-PC-001']
    );

    assert.equal(
        getRevision(checkpointStore),
        0
    );
});

test('P3.2-PC40: partial failure exposes appendedCount', () => {
    const realAttemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

    let calls = 0;

    const coordinator = createPersistenceCoordinator({
        attemptStore: {
            appendAttempt(args) {
                calls++;

                if (calls === 2) {
                    throw new Error('Injected failure');
                }

                return realAttemptStore.appendAttempt(args);
            },
            getAttempt: realAttemptStore.getAttempt,
            listAttemptIds: realAttemptStore.listAttemptIds
        },
        checkpointStore
    });

    assert.throws(() => {
        persist(coordinator, {
            session: makeSession({
                attempts: [
                    makeAttempt(1),
                    makeAttempt(2)
                ]
            })
        });
    }, error => {
        assert.equal(
            error.code,
            'PERSISTENCE_WRITE_FAILED'
        );

        assert.equal(
            error.details.appendedCount,
            1
        );

        assert.equal(
            error.details.partialWritePossible,
            true
        );

        return true;
    });
});

test('P3.2-PC41: retry after partial attempt failure can complete', () => {
    const realAttemptStore = createAttemptStore();
    const checkpointStore = createCheckpointStore();

    let failOnce = true;

    const coordinator = createPersistenceCoordinator({
        attemptStore: {
            appendAttempt(args) {
                if (
                    args.attempt.attemptId === 'ATT-PC-002' &&
                    failOnce
                ) {
                    failOnce = false;
                    throw new Error('Injected one-time failure');
                }

                return realAttemptStore.appendAttempt(args);
            },
            getAttempt: realAttemptStore.getAttempt,
            listAttemptIds: realAttemptStore.listAttemptIds
        },
        checkpointStore
    });

    const session = makeSession({
        attempts: [
            makeAttempt(1),
            makeAttempt(2)
        ]
    });

    expectWriteFailure(() => {
        persist(coordinator, { session });
    });

    const result = persist(coordinator, {
        session
    });

    assert.equal(result.status, 'committed');

    assert.deepStrictEqual(
        getIds(realAttemptStore),
        ['ATT-PC-001', 'ATT-PC-002']
    );

    assert.equal(
        getRevision(checkpointStore),
        1
    );
});

test('P3.2-PC42: retry after checkpoint failure can complete', () => {
    const attemptStore = createAttemptStore();
    const realCheckpointStore = createCheckpointStore();

    let failOnce = true;

    const coordinator = createPersistenceCoordinator({
        attemptStore,
        checkpointStore: {
            saveCheckpoint(args) {
                if (failOnce) {
                    failOnce = false;
                    throw new Error('Injected one-time failure');
                }

                return realCheckpointStore.saveCheckpoint(args);
            },
            getCheckpoint:
                realCheckpointStore.getCheckpoint,
            getRevision:
                realCheckpointStore.getRevision
        }
    });

    const session = makeSession({
        attempts: [makeAttempt(1)]
    });

    expectWriteFailure(() => {
        persist(coordinator, { session });
    });

    const result = persist(coordinator, {
        session
    });

    assert.equal(result.status, 'committed');

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001']
    );

    assert.equal(
        getRevision(realCheckpointStore),
        1
    );
});

/**
 * ============================================================
 * GROUP H — SESSION ISOLATION
 * ============================================================
 */

test('P3.2-PC43: two sessions persist independently', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_A
        })
    });

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_B
        })
    });

    assert.equal(
        getRevision(checkpointStore, SESSION_A),
        1
    );

    assert.equal(
        getRevision(checkpointStore, SESSION_B),
        1
    );
});

test('P3.2-PC44: attempts are isolated by session', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_A,
            attempts: [makeAttempt(1, SESSION_A)]
        })
    });

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_B,
            attempts: [makeAttempt(2, SESSION_B)]
        })
    });

    assert.deepStrictEqual(
        getIds(attemptStore, SESSION_A),
        ['ATT-PC-001']
    );

    assert.deepStrictEqual(
        getIds(attemptStore, SESSION_B),
        ['ATT-PC-002']
    );
});

test('P3.2-PC45: session A revision does not affect session B', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_A
        })
    });

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_B
        })
    });

    persist(coordinator, {
        session: makeSession({
            sessionId: SESSION_A
        }),
        revision: 2,
        expectedRevision: 1,
        savedAt: SAVED_AT_2
    });

    assert.equal(
        getRevision(checkpointStore, SESSION_A),
        2
    );

    assert.equal(
        getRevision(checkpointStore, SESSION_B),
        1
    );
});

/**
 * ============================================================
 * GROUP I — IMMUTABILITY
 * ============================================================
 */

test('P3.2-PC46: persistence does not mutate session', () => {
    const { coordinator } = makeHarness();

    const session = makeSession({
        attempts: [makeAttempt(1)]
    });

    const before = clone(session);

    persist(coordinator, { session });

    assert.deepStrictEqual(
        session,
        before
    );
});

test('P3.2-PC47: persistence does not mutate contentRefs', () => {
    const { coordinator } = makeHarness();

    const refs = clone(CONTENT_REFS);
    const before = clone(refs);

    coordinator.persistSession({
        session: makeSession(),
        contentRefs: refs,
        revision: 1,
        expectedRevision: 0,
        savedAt: SAVED_AT_1
    });

    assert.deepStrictEqual(refs, before);
});

test('P3.2-PC48: changing result checkpoint cannot change store', () => {
    const {
        coordinator,
        checkpointStore
    } = makeHarness();

    const result = persist(coordinator);

    result.checkpoint.runtime.status = 'corrupted';

    assert.notEqual(
        getCheckpoint(checkpointStore).runtime.status,
        'corrupted'
    );
});

test('P3.2-PC49: changing result attempt IDs cannot change store', () => {
    const {
        coordinator,
        attemptStore
    } = makeHarness();

    const result = persist(coordinator, {
        session: makeSession({
            attempts: [makeAttempt(1)]
        })
    });

    result.attemptIds.push('FAKE-ATTEMPT');

    assert.deepStrictEqual(
        getIds(attemptStore),
        ['ATT-PC-001']
    );
});

/**
 * ============================================================
 * GROUP J — SNAPSHOT INSPECTION
 * ============================================================
 */

test('P3.2-PC50: missing snapshot returns revision zero', () => {
    const { coordinator } = makeHarness();

    const snapshot =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.equal(snapshot.sessionId, SESSION_A);
    assert.equal(snapshot.revision, 0);
    assert.equal(snapshot.checkpoint, null);

    assert.deepStrictEqual(
        snapshot.attemptIds,
        []
    );
});

test('P3.2-PC51: snapshot reports committed revision', () => {
    const { coordinator } = makeHarness();

    persist(coordinator);

    const snapshot =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.equal(snapshot.revision, 1);
    assert.ok(snapshot.checkpoint);
});

test('P3.2-PC52: snapshot includes stored attempt IDs', () => {
    const { coordinator } = makeHarness();

    persist(coordinator, {
        session: makeSession({
            attempts: [
                makeAttempt(1),
                makeAttempt(2)
            ]
        })
    });

    const snapshot =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.deepStrictEqual(
        snapshot.attemptIds,
        ['ATT-PC-001', 'ATT-PC-002']
    );
});

test('P3.2-PC53: snapshot checkpoint is detached', () => {
    const { coordinator } = makeHarness();

    persist(coordinator);

    const first =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    first.checkpoint.runtime.status = 'changed';

    const second =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.notEqual(
        second.checkpoint.runtime.status,
        'changed'
    );
});

test('P3.2-PC54: snapshot attempt ID array is detached', () => {
    const { coordinator } = makeHarness();

    persist(coordinator, {
        session: makeSession({
            attempts: [makeAttempt(1)]
        })
    });

    const first =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    first.attemptIds.push('FAKE');

    const second =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.deepStrictEqual(
        second.attemptIds,
        ['ATT-PC-001']
    );
});

test('P3.2-PC55: snapshot inspection does not hydrate session', () => {
    const { coordinator } = makeHarness();

    persist(coordinator);

    const snapshot =
        coordinator.getPersistedSnapshot({
            sessionId: SESSION_A
        });

    assert.ok(snapshot.checkpoint);

    assert.equal(
        Object.hasOwn(snapshot, 'session'),
        false
    );

    assert.equal(
        Object.hasOwn(snapshot, 'hydratedSession'),
        false
    );
});
