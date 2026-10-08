
/**
 * Phase 3.2 — Attempt Store V1 Unit Tests
 *
 * Target:
 *   src/persistence/attemptStore.js
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Run:
 *   node --test tests/unit/persistence/attemptStore.test.js
 *
 * No mocked production engines.
 * No durable persistence assumptions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ATTEMPT_STORE_INFO,
    createAttemptStore,
    getAttemptStoreInfo
} from '../../../src/persistence/attemptStore.js';

const SESSION_A = 'session-k283-A';
const SESSION_B = 'session-k283-B';

function makeAttempt(overrides = {}) {
    return {
        attemptId: 'attempt-k283-001',
        questionId: 'Q-A-K283-T-010',
        primaryNode: 'K283',
        response: 25,
        isCorrect: true,
        evidence: {
            type: 'transfer',
            difficulty: 'D4',
            contextId: 'c09-k283-transfer-gamete-counts-03',
            reliabilityWeight: 1
        },
        metadata: {
            mode: 'practice',
            source: 'realbank'
        },
        ...overrides
    };
}

function makeStore() {
    return createAttemptStore();
}

function append(store, attempt = makeAttempt(), sessionId = SESSION_A) {
    return store.appendAttempt({
        sessionId,
        attempt
    });
}

function expectConflict(callback) {
    assert.throws(callback, error => {
        assert.equal(error.code, 'ATTEMPT_CONFLICT');
        assert.match(error.message, /Attempt conflict/);
        return true;
    });
}

function expectInvalid(callback, pattern = /Invalid attempt store operation/) {
    assert.throws(callback, error => {
        assert.ok(error instanceof TypeError);
        assert.match(error.message, pattern);
        return true;
    });
}

// ============================================================
// GROUP A — METADATA & INSTANCE
// ============================================================

test('P3.2-AS01: metadata identifies in-memory draft store', () => {
    assert.equal(ATTEMPT_STORE_INFO.name, 'AttemptStore');
    assert.equal(ATTEMPT_STORE_INFO.version, '1.0.0-draft');
    assert.equal(ATTEMPT_STORE_INFO.storage, 'memory');
    assert.equal(ATTEMPT_STORE_INFO.durable, false);
    assert.equal(ATTEMPT_STORE_INFO.supportsTransactions, false);
    assert.equal(ATTEMPT_STORE_INFO.supportsHydration, false);
});

test('P3.2-AS02: getAttemptStoreInfo returns detached metadata', () => {
    const info = getAttemptStoreInfo();

    assert.deepStrictEqual(info, ATTEMPT_STORE_INFO);
    assert.notStrictEqual(info, ATTEMPT_STORE_INFO);

    info.name = 'Modified';

    assert.equal(ATTEMPT_STORE_INFO.name, 'AttemptStore');
});

test('P3.2-AS03: store exposes expected API', () => {
    const store = makeStore();

    for (const name of [
        'appendAttempt',
        'getAttempt',
        'listAttempts',
        'listAttemptIds',
        'hasAttempt',
        'countAttempts',
        'getInfo'
    ]) {
        assert.equal(typeof store[name], 'function');
    }

    assert.equal(Object.isFrozen(store), true);
});

test('P3.2-AS04: each store instance is isolated', () => {
    const first = makeStore();
    const second = makeStore();

    append(first);

    assert.equal(first.countAttempts({ sessionId: SESSION_A }), 1);
    assert.equal(second.countAttempts({ sessionId: SESSION_A }), 0);
});

test('P3.2-AS05: empty store returns empty results', () => {
    const store = makeStore();

    assert.deepStrictEqual(store.listAttempts({ sessionId: SESSION_A }), []);
    assert.deepStrictEqual(store.listAttemptIds({ sessionId: SESSION_A }), []);
    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 0);
    assert.equal(store.hasAttempt({
        sessionId: SESSION_A,
        attemptId: 'missing'
    }), false);

    assert.equal(store.getAttempt({
        sessionId: SESSION_A,
        attemptId: 'missing'
    }), null);
});

// ============================================================
// GROUP B — APPEND & READ
// ============================================================

test('P3.2-AS06: append stores a valid attempt', () => {
    const store = makeStore();
    const attempt = makeAttempt();

    const result = append(store, attempt);

    assert.deepStrictEqual(result, attempt);
    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

test('P3.2-AS07: getAttempt returns the stored attempt', () => {
    const store = makeStore();
    const attempt = makeAttempt();

    append(store, attempt);

    assert.deepStrictEqual(
        store.getAttempt({
            sessionId: SESSION_A,
            attemptId: attempt.attemptId
        }),
        attempt
    );
});

test('P3.2-AS08: listAttempts preserves insertion order', () => {
    const store = makeStore();

    const attempts = [
        makeAttempt({ attemptId: 'A001' }),
        makeAttempt({ attemptId: 'A002' }),
        makeAttempt({ attemptId: 'A003' })
    ];

    for (const attempt of attempts) {
        append(store, attempt);
    }

    assert.deepStrictEqual(
        store.listAttempts({ sessionId: SESSION_A }),
        attempts
    );
});

test('P3.2-AS09: listAttemptIds preserves insertion order', () => {
    const store = makeStore();

    for (const id of ['A001', 'A002', 'A003']) {
        append(store, makeAttempt({ attemptId: id }));
    }

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_A }),
        ['A001', 'A002', 'A003']
    );
});

test('P3.2-AS10: hasAttempt reports existence correctly', () => {
    const store = makeStore();

    append(store);

    assert.equal(store.hasAttempt({
        sessionId: SESSION_A,
        attemptId: 'attempt-k283-001'
    }), true);

    assert.equal(store.hasAttempt({
        sessionId: SESSION_A,
        attemptId: 'missing'
    }), false);
});

test('P3.2-AS11: countAttempts tracks appended attempts', () => {
    const store = makeStore();

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 0);

    append(store, makeAttempt({ attemptId: 'A001' }));
    append(store, makeAttempt({ attemptId: 'A002' }));

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 2);
});

test('P3.2-AS12: different sessions maintain independent lists', () => {
    const store = makeStore();

    append(store, makeAttempt({ attemptId: 'A001' }), SESSION_A);
    append(store, makeAttempt({ attemptId: 'B001' }), SESSION_B);

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_A }),
        ['A001']
    );

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_B }),
        ['B001']
    );
});

// ============================================================
// GROUP C — IDEMPOTENCY
// ============================================================

test('P3.2-AS13: identical retry is idempotent', () => {
    const store = makeStore();
    const attempt = makeAttempt();

    const first = append(store, attempt);
    const second = append(store, structuredClone(attempt));

    assert.deepStrictEqual(first, second);
    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

test('P3.2-AS14: object key order does not affect idempotency', () => {
    const store = makeStore();

    append(store, {
        attemptId: 'A001',
        questionId: 'Q010',
        response: {
            a: 1,
            b: 2
        }
    });

    append(store, {
        response: {
            b: 2,
            a: 1
        },
        questionId: 'Q010',
        attemptId: 'A001'
    });

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

test('P3.2-AS15: nested object key order does not affect idempotency', () => {
    const store = makeStore();

    append(store, {
        attemptId: 'A001',
        evidence: {
            context: {
                node: 'K283',
                score: 1
            }
        }
    });

    append(store, {
        evidence: {
            context: {
                score: 1,
                node: 'K283'
            }
        },
        attemptId: 'A001'
    });

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

test('P3.2-AS16: idempotent retry does not change insertion order', () => {
    const store = makeStore();

    append(store, makeAttempt({ attemptId: 'A001' }));
    append(store, makeAttempt({ attemptId: 'A002' }));
    append(store, makeAttempt({ attemptId: 'A001' }));

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_A }),
        ['A001', 'A002']
    );
});

test('P3.2-AS17: repeated retries never increase count', () => {
    const store = makeStore();
    const attempt = makeAttempt();

    for (let i = 0; i < 10; i++) {
        append(store, attempt);
    }

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

// ============================================================
// GROUP D — CONFLICT
// ============================================================

test('P3.2-AS18: same attemptId with changed response conflicts', () => {
    const store = makeStore();

    append(store, makeAttempt());

    expectConflict(() => append(
        store,
        makeAttempt({ response: 99 })
    ));

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
});

test('P3.2-AS19: same attemptId with changed evidence conflicts', () => {
    const store = makeStore();

    append(store, makeAttempt());

    expectConflict(() => append(
        store,
        makeAttempt({
            evidence: {
                type: 'transfer',
                difficulty: 'D4',
                contextId: 'changed-context',
                reliabilityWeight: 1
            }
        })
    ));
});

test('P3.2-AS20: same attemptId cannot belong to another session', () => {
    const store = makeStore();

    append(store, makeAttempt(), SESSION_A);

    expectConflict(() => append(
        store,
        makeAttempt(),
        SESSION_B
    ));

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);
    assert.equal(store.countAttempts({ sessionId: SESSION_B }), 0);
});

test('P3.2-AS21: conflict does not overwrite original attempt', () => {
    const store = makeStore();
    const original = makeAttempt();

    append(store, original);

    expectConflict(() => append(
        store,
        makeAttempt({ isCorrect: false })
    ));

    assert.deepStrictEqual(
        store.getAttempt({
            sessionId: SESSION_A,
            attemptId: original.attemptId
        }),
        original
    );
});

test('P3.2-AS22: array order is significant for conflict detection', () => {
    const store = makeStore();

    append(store, {
        attemptId: 'A001',
        nodes: ['K281', 'K282']
    });

    expectConflict(() => append(store, {
        attemptId: 'A001',
        nodes: ['K282', 'K281']
    }));
});

// ============================================================
// GROUP E — OWNERSHIP & IMMUTABILITY
// ============================================================

test('P3.2-AS23: append does not mutate caller-owned attempt', () => {
    const store = makeStore();
    const attempt = makeAttempt();
    const before = structuredClone(attempt);

    append(store, attempt);

    assert.deepStrictEqual(attempt, before);
});

test('P3.2-AS24: modifying original attempt cannot change stored data', () => {
    const store = makeStore();
    const attempt = makeAttempt();

    append(store, attempt);

    attempt.response = 999;
    attempt.evidence.contextId = 'modified';

    const stored = store.getAttempt({
        sessionId: SESSION_A,
        attemptId: 'attempt-k283-001'
    });

    assert.equal(stored.response, 25);
    assert.equal(
        stored.evidence.contextId,
        'c09-k283-transfer-gamete-counts-03'
    );
});

test('P3.2-AS25: modifying append result cannot change stored data', () => {
    const store = makeStore();

    const result = append(store);

    result.response = 999;
    result.evidence.contextId = 'modified';

    const stored = store.getAttempt({
        sessionId: SESSION_A,
        attemptId: 'attempt-k283-001'
    });

    assert.equal(stored.response, 25);
    assert.equal(
        stored.evidence.contextId,
        'c09-k283-transfer-gamete-counts-03'
    );
});

test('P3.2-AS26: modifying getAttempt result cannot change stored data', () => {
    const store = makeStore();

    append(store);

    const result = store.getAttempt({
        sessionId: SESSION_A,
        attemptId: 'attempt-k283-001'
    });

    result.evidence.contextId = 'changed';

    const next = store.getAttempt({
        sessionId: SESSION_A,
        attemptId: 'attempt-k283-001'
    });

    assert.equal(
        next.evidence.contextId,
        'c09-k283-transfer-gamete-counts-03'
    );
});

test('P3.2-AS27: modifying listAttempts result cannot change stored data', () => {
    const store = makeStore();

    append(store);

    const result = store.listAttempts({
        sessionId: SESSION_A
    });

    result[0].evidence.contextId = 'changed';
    result.push(makeAttempt({ attemptId: 'injected' }));

    assert.equal(store.countAttempts({ sessionId: SESSION_A }), 1);

    assert.equal(
        store.getAttempt({
            sessionId: SESSION_A,
            attemptId: 'attempt-k283-001'
        }).evidence.contextId,
        'c09-k283-transfer-gamete-counts-03'
    );
});

test('P3.2-AS28: modifying listAttemptIds result cannot change store', () => {
    const store = makeStore();

    append(store);

    const ids = store.listAttemptIds({
        sessionId: SESSION_A
    });

    ids.push('injected');

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_A }),
        ['attempt-k283-001']
    );
});

// ============================================================
// GROUP F — JSON SAFETY
// ============================================================

test('P3.2-AS29: nested undefined values are rejected', () => {
    const store = makeStore();

    expectInvalid(() => append(
        store,
        makeAttempt({
            metadata: {
                invalid: undefined
            }
        })
    ), /not JSON-safe/);
});

test('P3.2-AS30: NaN and Infinity are rejected', () => {
    const store = makeStore();

    for (const value of [NaN, Infinity, -Infinity]) {
        expectInvalid(() => append(
            store,
            makeAttempt({ response: value })
        ), /finite number/);
    }
});

test('P3.2-AS31: functions and BigInt are rejected', () => {
    const store = makeStore();

    expectInvalid(() => append(
        store,
        makeAttempt({
            metadata: {
                fn: () => true
            }
        })
    ), /not JSON-safe/);

    expectInvalid(() => append(
        store,
        makeAttempt({
            response: 10n
        })
    ), /not JSON-safe/);
});

test('P3.2-AS32: sparse arrays are rejected', () => {
    const store = makeStore();

    const sparse = [];
    sparse[2] = 'K283';

    expectInvalid(() => append(
        store,
        makeAttempt({ nodes: sparse })
    ), /sparse array slot/);
});

test('P3.2-AS33: circular structures are rejected', () => {
    const store = makeStore();

    const attempt = makeAttempt();
    attempt.self = attempt;

    expectInvalid(() => append(
        store,
        attempt
    ), /circular reference/);
});

test('P3.2-AS34: Date, Map and Set are rejected', () => {
    const store = makeStore();

    for (const value of [
        new Date(),
        new Map(),
        new Set()
    ]) {
        expectInvalid(() => append(
            store,
            makeAttempt({ metadata: value })
        ), /plain object/);
    }
});

test('P3.2-AS35: symbol-keyed properties are rejected', () => {
    const store = makeStore();

    const attempt = makeAttempt();
    attempt[Symbol('hidden')] = 'value';

    expectInvalid(() => append(
        store,
        attempt
    ), /symbol properties/);
});

test('P3.2-AS36: unsupported array properties are rejected', () => {
    const store = makeStore();

    const nodes = ['K281'];
    nodes.extra = 'invalid';

    expectInvalid(() => append(
        store,
        makeAttempt({ nodes })
    ), /unsupported array property/);
});

// ============================================================
// GROUP G — INPUT VALIDATION
// ============================================================

test('P3.2-AS37: invalid sessionId is rejected', () => {
    const store = makeStore();

    for (const sessionId of [
        '',
        '   ',
        null,
        undefined,
        123
    ]) {
        expectInvalid(
            () => store.appendAttempt({
                sessionId,
                attempt: makeAttempt()
            }),
            /sessionId must be a nonempty string/
        );
    }

    assert.equal(
        store.countAttempts({ sessionId: SESSION_A }),
        0
    );
});

test('P3.2-AS38: invalid attemptId is rejected', () => {
    const store = makeStore();

    for (const attemptId of [
        '',
        '   ',
        null,
        undefined,
        123
    ]) {
        expectInvalid(() => append(
            store,
            makeAttempt({ attemptId })
        ), /attempt\.attemptId must be a nonempty string/);
    }
});

test('P3.2-AS39: attempt.sessionId mismatch is rejected', () => {
    const store = makeStore();

    expectInvalid(() => append(
        store,
        makeAttempt({
            sessionId: SESSION_B
        }),
        SESSION_A
    ), /does not match sessionId/);
});

test('P3.2-AS40: invalid operations do not create attempts', () => {
    const store = makeStore();

    expectInvalid(() => append(
        store,
        makeAttempt({ response: undefined })
    ));

    assert.equal(
        store.countAttempts({ sessionId: SESSION_A }),
        0
    );

    assert.deepStrictEqual(
        store.listAttemptIds({ sessionId: SESSION_A }),
        []
    );
});
