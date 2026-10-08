
/**
 * ============================================================
 * checkpointStore.test.js
 * ============================================================
 *
 * Phase 3.2 — CheckpointStore V1 Unit Tests
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Coverage:
 * - Metadata and store interface
 * - Create / read / revision
 * - CAS revision sequencing
 * - Idempotent retries
 * - Revision conflicts
 * - Session isolation
 * - Immutable input/output
 * - CheckpointCodec validation
 * - JSON safety
 * - Failed-write atomicity
 *
 * No changes to LOCKED engines.
 * No durable persistence assumptions.
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createCheckpointStore,
    getCheckpointStoreInfo,
    CHECKPOINT_STORE_INFO
} from '../../../src/persistence/checkpointStore.js';

import {
    encodeCheckpoint,
    validateCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

const SESSION_A = 'SESSION-CP-UNIT-A';
const SESSION_B = 'SESSION-CP-UNIT-B';

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

function makeStore() {
    return createCheckpointStore();
}

/**
 * Minimal StudySession-shaped fixture for CheckpointCodec.
 *
 * This is a codec fixture, not a production StudySession.
 * It contains only the runtime projection fields needed
 * by encodeCheckpoint().
 */
function makeSession(sessionId = SESSION_A) {
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
            contextId: 'checkpoint-unit-test',
            historyLimit: 50
        },

        dependencies: {},

        state: {
            schemaVersion: '1.2.0',
            student: {
                studentId: 'STUDENT-CP-UNIT'
            },
            knowledge: {},
            history: {
                recentActions: [],
                recentQuestions: []
            }
        },

        currentDecision: {
            decisionId: 'DEC-CP-UNIT-001',
            action: 'CHALLENGE',
            target: {
                primaryNodeId: 'K283',
                nodeIds: ['K283']
            }
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

        attempts: [],
        history: [],

        masteryRuntime: {
            evidenceHistoryByNode: {}
        },

        lastFlowResult: null
    };
}

function makeCheckpoint({
    sessionId = SESSION_A,
    revision = 1,
    savedAt = SAVED_AT_1,
    session = null
} = {}) {
    return encodeCheckpoint({
        session: session ?? makeSession(sessionId),
        contentRefs: clone(CONTENT_REFS),
        revision,
        savedAt,
        persistedAttemptIds: []
    });
}

function save(
    store,
    checkpoint,
    expectedRevision = 0,
    sessionId = checkpoint.runtime.sessionId
) {
    return store.saveCheckpoint({
        sessionId,
        checkpoint,
        expectedRevision
    });
}

function expectRevisionConflict(callback) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'CHECKPOINT_REVISION_CONFLICT'
        );

        assert.match(
            error.message,
            /Checkpoint revision conflict/
        );

        return true;
    });
}

function expectSessionConflict(callback) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'CHECKPOINT_SESSION_CONFLICT'
        );

        assert.match(
            error.message,
            /Checkpoint session conflict/
        );

        return true;
    });
}

function expectInvalid(callback, pattern = null) {
    assert.throws(callback, error => {
        assert.ok(error instanceof Error);

        if (pattern) {
            assert.match(error.message, pattern);
        }

        return true;
    });
}

/**
 * ============================================================
 * GROUP A — METADATA / FACTORY
 * ============================================================
 */

test('P3.2-CS01: CheckpointStore metadata identity', () => {
    assert.equal(
        CHECKPOINT_STORE_INFO.name,
        'CheckpointStore'
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.version,
        '1.0.0-draft'
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.storage,
        'memory'
    );
});

test('P3.2-CS02: memory store does not claim durability', () => {
    assert.equal(
        CHECKPOINT_STORE_INFO.durable,
        false
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.supportsTransactions,
        false
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.supportsHydration,
        false
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.supportsPersistence,
        false
    );
});

test('P3.2-CS03: CAS and idempotency capabilities are declared', () => {
    assert.equal(
        CHECKPOINT_STORE_INFO.supportsCAS,
        true
    );

    assert.equal(
        CHECKPOINT_STORE_INFO.supportsIdempotency,
        true
    );
});

test('P3.2-CS04: factory exposes expected methods', () => {
    const store = makeStore();

    for (const method of [
        'saveCheckpoint',
        'getCheckpoint',
        'hasCheckpoint',
        'getRevision',
        'getInfo'
    ]) {
        assert.equal(
            typeof store[method],
            'function',
            `${method} must exist`
        );
    }

    assert.ok(Object.isFrozen(store));
});

test('P3.2-CS05: metadata accessor returns detached object', () => {
    const info = getCheckpointStoreInfo();

    assert.deepStrictEqual(
        info,
        CHECKPOINT_STORE_INFO
    );

    assert.notStrictEqual(
        info,
        CHECKPOINT_STORE_INFO
    );

    assert.deepStrictEqual(
        makeStore().getInfo(),
        CHECKPOINT_STORE_INFO
    );
});

/**
 * ============================================================
 * GROUP B — CREATE / READ / REVISION
 * ============================================================
 */

test('P3.2-CS06: new store starts empty', () => {
    const store = makeStore();

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_A }),
        false
    );

    assert.equal(
        store.getCheckpoint({ sessionId: SESSION_A }),
        null
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        0
    );
});

test('P3.2-CS07: create revision 1 with expected revision 0', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    const stored = save(store, checkpoint, 0);

    assert.deepStrictEqual(stored, checkpoint);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_A }),
        true
    );
});

test('P3.2-CS08: getCheckpoint returns saved checkpoint', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    save(store, checkpoint, 0);

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint
    );
});

test('P3.2-CS09: revision advances from 1 to 2', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    const checkpoint2 = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_2
    });

    save(store, checkpoint2, 1);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        2
    );

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint2
    );
});

test('P3.2-CS10: revision advances from 2 to 3', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    save(
        store,
        makeCheckpoint({
            revision: 2,
            savedAt: SAVED_AT_2
        }),
        1
    );

    const checkpoint3 = makeCheckpoint({
        revision: 3,
        savedAt: SAVED_AT_3
    });

    save(store, checkpoint3, 2);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        3
    );

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint3
    );
});

test('P3.2-CS11: separate store instances have independent state', () => {
    const storeA = makeStore();
    const storeB = makeStore();

    save(storeA, makeCheckpoint(), 0);

    assert.equal(
        storeA.getRevision({ sessionId: SESSION_A }),
        1
    );

    assert.equal(
        storeB.getRevision({ sessionId: SESSION_A }),
        0
    );
});

/**
 * ============================================================
 * GROUP C — CAS CONFLICTS
 * ============================================================
 */

test('P3.2-CS12: stale expected revision is rejected', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    save(
        store,
        makeCheckpoint({
            revision: 2,
            savedAt: SAVED_AT_2
        }),
        1
    );

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 3,
                savedAt: SAVED_AT_3
            }),
            1
        );
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        2
    );
});

test('P3.2-CS13: future expected revision is rejected', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 3,
                savedAt: SAVED_AT_3
            }),
            2
        );
    });
});

test('P3.2-CS14: cannot create revision 2 without revision 1', () => {
    const store = makeStore();

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 2,
                savedAt: SAVED_AT_2
            }),
            0
        );
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        0
    );
});

test('P3.2-CS15: cannot skip a revision during update', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 3,
                savedAt: SAVED_AT_3
            }),
            1
        );
    });
});

test('P3.2-CS16: cannot overwrite current revision with new content', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    const modified = makeCheckpoint({
        revision: 1,
        savedAt: SAVED_AT_2
    });

    expectRevisionConflict(() => {
        save(store, modified, 1);
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS17: stale writer cannot overwrite a newer checkpoint', () => {
    const store = makeStore();

    const original = makeCheckpoint();

    save(store, original, 0);

    const winner = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_2
    });

    save(store, winner, 1);

    const stale = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_3
    });

    expectRevisionConflict(() => {
        save(store, stale, 1);
    });

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        winner
    );
});

test('P3.2-CS18: revision zero checkpoint is rejected', () => {
    const store = makeStore();

    const checkpoint = makeCheckpoint();
    checkpoint.revision = 0;

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        0
    );
});

/**
 * ============================================================
 * GROUP D — IDEMPOTENCY
 * ============================================================
 */

test('P3.2-CS19: exact retry of revision 1 is idempotent', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    const first = save(store, checkpoint, 0);
    const retry = save(store, clone(checkpoint), 0);

    assert.deepStrictEqual(retry, first);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS20: exact retry with current expected revision succeeds', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    save(store, checkpoint, 0);

    const retry = save(store, clone(checkpoint), 1);

    assert.deepStrictEqual(retry, checkpoint);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS21: exact retry of revision 2 is idempotent', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    const checkpoint2 = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_2
    });

    save(store, checkpoint2, 1);

    const retry = save(
        store,
        clone(checkpoint2),
        1
    );

    assert.deepStrictEqual(retry, checkpoint2);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        2
    );
});

test('P3.2-CS22: object key order does not break idempotency', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    save(store, checkpoint, 0);

    const reordered = {};

    for (const key of Object.keys(checkpoint).reverse()) {
        reordered[key] = clone(checkpoint[key]);
    }

    const retry = save(store, reordered, 0);

    assert.deepStrictEqual(retry, checkpoint);

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS23: same revision with different content is not idempotent', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 1,
                savedAt: SAVED_AT_2
            }),
            0
        );
    });
});

test('P3.2-CS24: retry of an older revision is rejected', () => {
    const store = makeStore();

    const checkpoint1 = makeCheckpoint();

    save(store, checkpoint1, 0);

    save(
        store,
        makeCheckpoint({
            revision: 2,
            savedAt: SAVED_AT_2
        }),
        1
    );

    expectRevisionConflict(() => {
        save(store, checkpoint1, 0);
    });
});

/**
 * ============================================================
 * GROUP E — SESSION ISOLATION
 * ============================================================
 */

test('P3.2-CS25: two sessions can each start at revision 1', () => {
    const store = makeStore();

    save(
        store,
        makeCheckpoint({ sessionId: SESSION_A }),
        0
    );

    save(
        store,
        makeCheckpoint({ sessionId: SESSION_B }),
        0
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_B }),
        1
    );
});

test('P3.2-CS26: updating session A does not affect session B', () => {
    const store = makeStore();

    save(
        store,
        makeCheckpoint({ sessionId: SESSION_A }),
        0
    );

    const checkpointB = makeCheckpoint({
        sessionId: SESSION_B
    });

    save(store, checkpointB, 0);

    save(
        store,
        makeCheckpoint({
            sessionId: SESSION_A,
            revision: 2,
            savedAt: SAVED_AT_2
        }),
        1
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        2
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_B }),
        1
    );

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_B }),
        checkpointB
    );
});

test('P3.2-CS27: checkpoint cannot be saved under another session ID', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint({
        sessionId: SESSION_A
    });

    expectSessionConflict(() => {
        save(
            store,
            checkpoint,
            0,
            SESSION_B
        );
    });

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_B }),
        false
    );
});

test('P3.2-CS28: missing session has independent empty state', () => {
    const store = makeStore();

    save(
        store,
        makeCheckpoint({ sessionId: SESSION_A }),
        0
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_B }),
        0
    );

    assert.equal(
        store.getCheckpoint({ sessionId: SESSION_B }),
        null
    );

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_B }),
        false
    );
});

/**
 * ============================================================
 * GROUP F — IMMUTABILITY
 * ============================================================
 */

test('P3.2-CS29: saving does not mutate input checkpoint', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();
    const before = clone(checkpoint);

    save(store, checkpoint, 0);

    assert.deepStrictEqual(checkpoint, before);
});

test('P3.2-CS30: changing input after save cannot change stored data', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();
    const before = clone(checkpoint);

    save(store, checkpoint, 0);

    checkpoint.savedAt = SAVED_AT_3;
    checkpoint.runtime.status = 'changed';

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        before
    );
});

test('P3.2-CS31: changing getCheckpoint result cannot change store', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    save(store, checkpoint, 0);

    const loaded = store.getCheckpoint({
        sessionId: SESSION_A
    });

    loaded.savedAt = SAVED_AT_3;
    loaded.runtime.status = 'changed';

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint
    );
});

test('P3.2-CS32: changing save result cannot change store', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    const saved = save(store, checkpoint, 0);

    saved.runtime.sessionId = 'CORRUPTED';
    saved.revision = 999;

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS33: returned checkpoints are detached from each other', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    const first = store.getCheckpoint({
        sessionId: SESSION_A
    });

    const second = store.getCheckpoint({
        sessionId: SESSION_A
    });

    assert.notStrictEqual(first, second);
    assert.notStrictEqual(first.runtime, second.runtime);

    first.runtime.status = 'changed';

    assert.notEqual(
        second.runtime.status,
        'changed'
    );
});

/**
 * ============================================================
 * GROUP G — VALIDATION / JSON SAFETY
 * ============================================================
 */

test('P3.2-CS34: valid codec checkpoint is accepted', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    const validation = validateCheckpoint(checkpoint);

    assert.notEqual(validation, false);

    const saved = save(store, checkpoint, 0);

    assert.deepStrictEqual(saved, checkpoint);
});

test('P3.2-CS35: null checkpoint is rejected', () => {
    const store = makeStore();

    expectInvalid(() => {
        store.saveCheckpoint({
            sessionId: SESSION_A,
            checkpoint: null,
            expectedRevision: 0
        });
    });
});

test('P3.2-CS36: malformed checkpoint is rejected', () => {
    const store = makeStore();

    expectInvalid(() => {
        store.saveCheckpoint({
            sessionId: SESSION_A,
            checkpoint: {
                revision: 1,
                runtime: {
                    sessionId: SESSION_A
                }
            },
            expectedRevision: 0
        });
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        0
    );
});

test('P3.2-CS37: invalid session IDs are rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    for (const sessionId of [
        '',
        '   ',
        null,
        undefined,
        123,
        {}
    ]) {
        expectInvalid(() => {
            store.saveCheckpoint({
                sessionId,
                checkpoint,
                expectedRevision: 0
            });
        }, /sessionId must be a nonempty string/);
    }
});

test('P3.2-CS38: invalid expected revisions are rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    for (const expectedRevision of [
        -1,
        1.5,
        NaN,
        Infinity,
        null,
        undefined,
        '0'
    ]) {
        expectInvalid(() => {
            store.saveCheckpoint({
                sessionId: SESSION_A,
                checkpoint,
                expectedRevision
            });
        }, /expectedRevision must be a nonnegative safe integer/);
    }
});

test('P3.2-CS39: undefined nested value is rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.runtime.unexpected = undefined;

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        0
    );
});

test('P3.2-CS40: non-finite nested number is rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.runtime.unexpected = Infinity;

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });
});

test('P3.2-CS41: circular reference is rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.circular = checkpoint;

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });
});

test('P3.2-CS42: non-plain objects are rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.runtime.unexpected = new Date();

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });
});

test('P3.2-CS43: sparse arrays are rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.history = new Array(2);

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });
});

test('P3.2-CS44: symbol-keyed objects are rejected', () => {
    const store = makeStore();
    const checkpoint = makeCheckpoint();

    checkpoint.runtime[Symbol('hidden')] = 'value';

    expectInvalid(() => {
        save(store, checkpoint, 0);
    });
});

/**
 * ============================================================
 * GROUP H — FAILED-WRITE ATOMICITY
 * ============================================================
 */

test('P3.2-CS45: failed CAS does not modify existing checkpoint', () => {
    const store = makeStore();

    const original = makeCheckpoint();

    save(store, original, 0);

    const before = clone(
        store.getCheckpoint({ sessionId: SESSION_A })
    );

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 3,
                savedAt: SAVED_AT_3
            }),
            0
        );
    });

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        before
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS46: failed validation does not modify existing checkpoint', () => {
    const store = makeStore();

    const original = makeCheckpoint();

    save(store, original, 0);

    const invalid = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_2
    });

    invalid.runtime.invalid = undefined;

    expectInvalid(() => {
        save(store, invalid, 1);
    });

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        original
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS47: failed session ownership check does not create record', () => {
    const store = makeStore();

    expectSessionConflict(() => {
        save(
            store,
            makeCheckpoint({
                sessionId: SESSION_A
            }),
            0,
            SESSION_B
        );
    });

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_A }),
        false
    );

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_B }),
        false
    );
});

test('P3.2-CS48: failed create does not prevent later valid create', () => {
    const store = makeStore();

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 2
            }),
            0
        );
    });

    const valid = makeCheckpoint();

    assert.deepStrictEqual(
        save(store, valid, 0),
        valid
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );
});

test('P3.2-CS49: failed update does not prevent later valid update', () => {
    const store = makeStore();

    save(store, makeCheckpoint(), 0);

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 3,
                savedAt: SAVED_AT_3
            }),
            1
        );
    });

    const valid = makeCheckpoint({
        revision: 2,
        savedAt: SAVED_AT_2
    });

    assert.deepStrictEqual(
        save(store, valid, 1),
        valid
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        2
    );
});

test('P3.2-CS50: all store reads remain consistent after conflict', () => {
    const store = makeStore();

    const checkpoint = makeCheckpoint();

    save(store, checkpoint, 0);

    expectRevisionConflict(() => {
        save(
            store,
            makeCheckpoint({
                revision: 2,
                savedAt: SAVED_AT_2
            }),
            0
        );
    });

    assert.equal(
        store.hasCheckpoint({ sessionId: SESSION_A }),
        true
    );

    assert.equal(
        store.getRevision({ sessionId: SESSION_A }),
        1
    );

    assert.deepStrictEqual(
        store.getCheckpoint({ sessionId: SESSION_A }),
        checkpoint
    );
});
