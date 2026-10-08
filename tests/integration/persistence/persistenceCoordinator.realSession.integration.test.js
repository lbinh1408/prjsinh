
/**
 * ============================================================
 * persistenceCoordinator.realSession.integration.test.js
 * ============================================================
 *
 * Phase 3.2 — Persistence Coordinator V1
 *
 * REAL STUDYSESSION K283 INTEGRATION TESTS
 *
 * Tests:
 *   PC-R01 ... PC-R15
 *
 * Status:
 *   DRAFT — NOT LOCKED
 *
 * IMPORTANT:
 *
 * - Uses REAL StudySession K283 fixtures.
 * - Does not modify StudySession V0.2.0.
 * - Does not modify Mastery Engine V2.
 * - Does not hydrate or resume sessions.
 * - Does not require filesystem persistence.
 *
 * The parent integration test must register this suite.
 *
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPersistenceCoordinator
} from '../../../src/persistence/persistenceCoordinator.js';

import {
    createAttemptStore
} from '../../../src/persistence/attemptStore.js';

import {
    createCheckpointStore
} from '../../../src/persistence/checkpointStore.js';

import {
    decodeCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const SAVED_AT_1 = '2026-10-08T10:00:00.000Z';
const SAVED_AT_2 = '2026-10-08T10:05:00.000Z';
const SAVED_AT_3 = '2026-10-08T10:10:00.000Z';

const CONTENT_REFS = Object.freeze({
    knowledgeMap: {
        id: 'knowledge-map-v4',
        version: '4.0.0',
        sha256: 'a'.repeat(64)
    }
});

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function clone(value) {
    return structuredClone(value);
}

function createHarness() {
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

function sessionIdOf(session) {
    assert.ok(session);
    assert.ok(session.runtime);

    const sessionId = session.runtime.sessionId;

    assert.equal(typeof sessionId, 'string');
    assert.ok(sessionId.length > 0);

    return sessionId;
}

function attemptIdsOf(session) {
    assert.ok(Array.isArray(session.attempts));

    return session.attempts.map(
        attempt => attempt.attemptId
    );
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

function readSnapshot(
    coordinator,
    session
) {
    return coordinator.getPersistedSnapshot({
        sessionId: sessionIdOf(session)
    });
}

function expectErrorCode(
    callback,
    expectedCode
) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            expectedCode
        );

        return true;
    });
}

function expectWriteFailure(callback) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'PERSISTENCE_WRITE_FAILED'
        );

        assert.ok(error.cause);

        return true;
    });
}

/**
 * ============================================================
 * REGISTRATION
 * ============================================================
 *
 * Parent must provide:
 *
 * makeSession()
 *
 * navigateToTransferSection(session)
 *   -> session or { session }
 *
 * selectTransferQuestion(session)
 *   -> session or { session }
 *
 * submitTransferAnswer(session)
 *   -> session or { session }
 *
 * Each helper must use the real K283 StudySession API.
 *
 * ============================================================
 */

export function registerPersistenceCoordinatorRealSessionTests({
    makeSession,
    navigateToTransferSection,
    selectTransferQuestion,
    submitTransferAnswer
}) {
    assert.equal(
        typeof makeSession,
        'function',
        'makeSession fixture is required'
    );

    assert.equal(
        typeof navigateToTransferSection,
        'function',
        'navigateToTransferSection fixture is required'
    );

    assert.equal(
        typeof selectTransferQuestion,
        'function',
        'selectTransferQuestion fixture is required'
    );

    assert.equal(
        typeof submitTransferAnswer,
        'function',
        'submitTransferAnswer fixture is required'
    );

    /**
     * A StudySession helper may mutate its session in place
     * or return a wrapper containing the session.
     */

    function resolveSession(result, fallback) {
        if (
            result &&
            result.runtime &&
            Array.isArray(result.attempts)
        ) {
            return result;
        }

        if (
            result &&
            result.session &&
            result.session.runtime
        ) {
            return result.session;
        }

        return fallback;
    }

    function makeInitial() {
        return makeSession();
    }

    function makeAtTransferSection() {
        const initial = makeInitial();

        const result =
            navigateToTransferSection(initial);

        return resolveSession(result, initial);
    }

    function makeQuestionSelected() {
        const session = makeAtTransferSection();

        const result =
            selectTransferQuestion(session);

        return resolveSession(result, session);
    }

    function makeSubmitted() {
        const session = makeQuestionSelected();

        const result =
            submitTransferAnswer(session);

        const submittedSession =
            resolveSession(result, session);

        assert.ok(
            submittedSession.attempts.length >= 1,
            'Expected a real StudySession attempt'
        );

        return submittedSession;
    }

    /**
     * ========================================================
     * GROUP A — INITIAL SESSION / LESSON
     * ========================================================
     */

    test('P3.2-PC-R01: persist initial real K283 session', () => {
        const { coordinator } = createHarness();

        const session = makeInitial();

        const result = persist(
            coordinator,
            session
        );

        assert.equal(
            result.status,
            'committed'
        );

        assert.equal(
            result.sessionId,
            sessionIdOf(session)
        );

        assert.equal(
            result.revision,
            1
        );
    });

    test('P3.2-PC-R02: persist real lesson progress', () => {
        const { coordinator } = createHarness();

        const session =
            makeAtTransferSection();

        const result = persist(
            coordinator,
            session
        );

        assert.equal(
            result.status,
            'committed'
        );

        assert.deepStrictEqual(
            result.checkpoint.lessonRuntime.progress,
            session.lessonRuntime.progress
        );
    });

    test('P3.2-PC-R03: persist selected transfer question', () => {
        const { coordinator } = createHarness();

        const session =
            makeQuestionSelected();

        assert.ok(
            session.currentQuestion,
            'Expected selected real question'
        );

        const result = persist(
            coordinator,
            session
        );

        assert.deepStrictEqual(
            result.checkpoint.currentQuestion,
            session.currentQuestion
        );
    });

    /**
     * ========================================================
     * GROUP B — LEARNING FLOW
     * ========================================================
     */

    test('P3.2-PC-R04: persist real submitted attempt', () => {
        const {
            coordinator,
            attemptStore
        } = createHarness();

        const session = makeSubmitted();

        const result = persist(
            coordinator,
            session
        );

        const sessionId = sessionIdOf(session);

        assert.deepStrictEqual(
            result.attemptIds,
            attemptIdsOf(session)
        );

        assert.deepStrictEqual(
            attemptStore.listAttemptIds({
                sessionId
            }),
            attemptIdsOf(session)
        );
    });

    test('P3.2-PC-R05: persist real mastery evidence history', () => {
        const { coordinator } = createHarness();

        const session = makeSubmitted();

        const result = persist(
            coordinator,
            session
        );

        assert.deepStrictEqual(
            result.checkpoint.masteryRuntime
                .evidenceHistoryByNode,
            session.masteryRuntime
                .evidenceHistoryByNode
        );
    });

    test('P3.2-PC-R06: committed real checkpoint decodes correctly', () => {
        const { coordinator } = createHarness();

        const session = makeSubmitted();

        const result = persist(
            coordinator,
            session
        );

        const decoded = decodeCheckpoint(
            JSON.stringify(result.checkpoint)
        );

        assert.deepStrictEqual(
            decoded,
            result.checkpoint
        );
    });

    /**
     * ========================================================
     * GROUP C — REVISION / IDEMPOTENCY
     * ========================================================
     */

    test('P3.2-PC-R07: real session revision advances', () => {
        const { coordinator } = createHarness();

        const session = makeSubmitted();

        const first = persist(
            coordinator,
            session
        );

        const second = persist(
            coordinator,
            session,
            {
                revision: 2,
                expectedRevision: 1,
                savedAt: SAVED_AT_2
            }
        );

        assert.equal(first.revision, 1);
        assert.equal(second.revision, 2);

        assert.equal(
            second.status,
            'committed'
        );
    });

    test('P3.2-PC-R08: exact retry is idempotent', () => {
        const {
            coordinator,
            attemptStore
        } = createHarness();

        const session = makeSubmitted();

        const first = persist(
            coordinator,
            session
        );

        const retry = persist(
            coordinator,
            session
        );

        assert.equal(
            first.status,
            'committed'
        );

        assert.equal(
            retry.status,
            'idempotent'
        );

        assert.deepStrictEqual(
            attemptStore.listAttemptIds({
                sessionId: sessionIdOf(session)
            }),
            attemptIdsOf(session)
        );
    });

    test('P3.2-PC-R09: stale real session write is rejected', () => {
        const {
            coordinator,
            checkpointStore
        } = createHarness();

        const session = makeSubmitted();

        persist(
            coordinator,
            session
        );

        persist(
            coordinator,
            session,
            {
                revision: 2,
                expectedRevision: 1,
                savedAt: SAVED_AT_2
            }
        );

        expectErrorCode(() => {
            persist(
                coordinator,
                session,
                {
                    revision: 1,
                    expectedRevision: 0,
                    savedAt: SAVED_AT_1
                }
            );
        }, 'PERSISTENCE_REVISION_CONFLICT');

        assert.equal(
            checkpointStore.getRevision({
                sessionId: sessionIdOf(session)
            }),
            2
        );
    });

    /**
     * ========================================================
     * GROUP D — FAILURE / RECOVERY
     * ========================================================
     */

    test('P3.2-PC-R10: real attempt append failure prevents checkpoint', () => {
        const realAttemptStore =
            createAttemptStore();

        const checkpointStore =
            createCheckpointStore();

        const coordinator =
            createPersistenceCoordinator({
                attemptStore: {
                    appendAttempt() {
                        throw new Error(
                            'Injected attempt failure'
                        );
                    },

                    getAttempt:
                        realAttemptStore.getAttempt,

                    listAttemptIds:
                        realAttemptStore.listAttemptIds
                },

                checkpointStore
            });

        const session = makeSubmitted();

        expectWriteFailure(() => {
            persist(
                coordinator,
                session
            );
        });

        assert.equal(
            checkpointStore.getRevision({
                sessionId: sessionIdOf(session)
            }),
            0
        );
    });

    test('P3.2-PC-R11: checkpoint failure preserves real attempt', () => {
        const attemptStore =
            createAttemptStore();

        const realCheckpointStore =
            createCheckpointStore();

        const coordinator =
            createPersistenceCoordinator({
                attemptStore,

                checkpointStore: {
                    saveCheckpoint() {
                        throw new Error(
                            'Injected checkpoint failure'
                        );
                    },

                    getCheckpoint:
                        realCheckpointStore.getCheckpoint,

                    getRevision:
                        realCheckpointStore.getRevision
                }
            });

        const session = makeSubmitted();

        expectWriteFailure(() => {
            persist(
                coordinator,
                session
            );
        });

        assert.deepStrictEqual(
            attemptStore.listAttemptIds({
                sessionId: sessionIdOf(session)
            }),
            attemptIdsOf(session)
        );

        assert.equal(
            realCheckpointStore.getRevision({
                sessionId: sessionIdOf(session)
            }),
            0
        );
    });

    test('P3.2-PC-R12: retry after real checkpoint failure succeeds', () => {
        const attemptStore =
            createAttemptStore();

        const realCheckpointStore =
            createCheckpointStore();

        let failOnce = true;

        const coordinator =
            createPersistenceCoordinator({
                attemptStore,

                checkpointStore: {
                    saveCheckpoint(args) {
                        if (failOnce) {
                            failOnce = false;

                            throw new Error(
                                'Injected one-time checkpoint failure'
                            );
                        }

                        return realCheckpointStore
                            .saveCheckpoint(args);
                    },

                    getCheckpoint:
                        realCheckpointStore.getCheckpoint,

                    getRevision:
                        realCheckpointStore.getRevision
                }
            });

        const session = makeSubmitted();

        expectWriteFailure(() => {
            persist(
                coordinator,
                session
            );
        });

        const result = persist(
            coordinator,
            session
        );

        assert.equal(
            result.status,
            'committed'
        );

        assert.deepStrictEqual(
            attemptStore.listAttemptIds({
                sessionId: sessionIdOf(session)
            }),
            attemptIdsOf(session)
        );
    });

    /**
     * ========================================================
     * GROUP E — INTEGRITY
     * ========================================================
     */

    test('P3.2-PC-R13: persistence does not mutate real StudySession', () => {
        const { coordinator } = createHarness();

        const session = makeSubmitted();

        const before = clone({
            runtime: session.runtime,
            state: session.state,
            attempts: session.attempts,
            history: session.history,
            lessonRuntime: session.lessonRuntime,
            masteryRuntime: session.masteryRuntime
        });

        persist(
            coordinator,
            session
        );

        const after = clone({
            runtime: session.runtime,
            state: session.state,
            attempts: session.attempts,
            history: session.history,
            lessonRuntime: session.lessonRuntime,
            masteryRuntime: session.masteryRuntime
        });

        assert.deepStrictEqual(
            after,
            before
        );
    });

    test('P3.2-PC-R14: checkpoint attempt IDs match real AttemptStore', () => {
        const {
            coordinator,
            attemptStore
        } = createHarness();

        const session = makeSubmitted();

        const result = persist(
            coordinator,
            session
        );

        const storedIds =
            attemptStore.listAttemptIds({
                sessionId: sessionIdOf(session)
            });

        assert.deepStrictEqual(
            result.checkpoint.attemptIds,
            storedIds
        );

        assert.deepStrictEqual(
            storedIds,
            attemptIdsOf(session)
        );
    });

    test('P3.2-PC-R15: independent real sessions do not share checkpoints', () => {
        const {
            coordinator,
            checkpointStore
        } = createHarness();

        const sessionA = makeInitial();
        const sessionB = makeInitial();

        const sessionIdA = sessionIdOf(sessionA);
        const sessionIdB = sessionIdOf(sessionB);

        /**
         * Some fixtures intentionally use a fixed
         * sessionId for deterministic tests.
         *
         * If so, create an independent test session
         * by changing only its runtime identity.
         */

        if (sessionIdA === sessionIdB) {
            sessionB.runtime.sessionId =
                `${sessionIdB}-SECOND`;
        }

        const independentIdB =
            sessionIdOf(sessionB);

        assert.notEqual(
            sessionIdA,
            independentIdB
        );

        persist(
            coordinator,
            sessionA
        );

        persist(
            coordinator,
            sessionB
        );

        assert.equal(
            checkpointStore.getRevision({
                sessionId: sessionIdA
            }),
            1
        );

        assert.equal(
            checkpointStore.getRevision({
                sessionId: independentIdB
            }),
            1
        );

        assert.equal(
            checkpointStore.getCheckpoint({
                sessionId: sessionIdA
            }).runtime.sessionId,
            sessionIdA
        );

        assert.equal(
            checkpointStore.getCheckpoint({
                sessionId: independentIdB
            }).runtime.sessionId,
            independentIdB
        );
    });
}
