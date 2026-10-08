
/**
 * ============================================================
 * checkpointStore.realSession.integration.test.js
 * ============================================================
 *
 * PHASE 3.2 — CHECKPOINT STORE REAL K283 INTEGRATION
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Real production pipeline:
 *
 * StudySession
 *   -> LessonEngine
 *   -> QuestionSelector
 *   -> AnswerEvaluator
 *   -> AttemptBuilder
 *   -> LearningFlow
 *   -> AttemptStore
 *   -> CheckpointCodec
 *   -> CheckpointStore
 *
 * Tests are registered by the parent K283 integration suite.
 *
 * IMPORTANT:
 *
 * - No modifications to LOCKED engines.
 * - No filesystem or database persistence.
 * - No session hydration/resume.
 * - No actual SHA-256 content verification.
 * - No cross-store atomic transaction.
 *
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createCheckpointStore
} from '../../../src/persistence/checkpointStore.js';

import {
    createAttemptStore
} from '../../../src/persistence/attemptStore.js';

import {
    encodeCheckpoint,
    decodeCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const SESSION_ID = 'SESSION-K283-LF-001';

const ATTEMPT_ID = 'ATT-K283-Q010-001';

const QUESTION_ID = 'Q-A-K283-T-010';

const SAVED_AT_1 = '2026-10-08T10:00:00.000Z';
const SAVED_AT_2 = '2026-10-08T10:05:00.000Z';
const SAVED_AT_3 = '2026-10-08T10:10:00.000Z';

/**
 * Structural content references for integration tests.
 *
 * SHA-256 values are placeholders.
 * These tests do not claim content integrity verification.
 */
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

function expectRevisionConflict(callback) {
    assert.throws(callback, error => {
        assert.equal(
            error.code,
            'CHECKPOINT_REVISION_CONFLICT'
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

        return true;
    });
}

/**
 * ============================================================
 * TEST REGISTRATION
 * ============================================================
 */

export function registerCheckpointStoreRealSessionTests(fixtures) {
    const {
        makeSession,
        navigateToTransferSection,
        selectTransferQuestion,
        submitTransferAnswer
    } = fixtures;

    for (const [name, fn] of Object.entries({
        makeSession,
        navigateToTransferSection,
        selectTransferQuestion,
        submitTransferAnswer
    })) {
        if (typeof fn !== 'function') {
            throw new TypeError(
                `Missing K283 fixture: ${name}`
            );
        }
    }

    /**
     * Generate a real post-answer StudySession.
     *
     * submitTransferAnswer(selectedSession) must return
     * the complete submitAnswer() result:
     *
     * {
     *   session,
     *   attempt,
     *   flowResult,
     *   ...
     * }
     */
    function makeSubmitted() {
        const selected = selectTransferQuestion(
            makeSession()
        );

        const submitted = submitTransferAnswer(
            selected.session
        );

        assert.ok(submitted);
        assert.ok(submitted.session);
        assert.ok(submitted.attempt);
        assert.ok(submitted.flowResult);

        assert.equal(
            submitted.attempt.attemptId,
            ATTEMPT_ID
        );

        assert.equal(
            submitted.attempt.questionId,
            QUESTION_ID
        );

        assert.deepStrictEqual(
            submitted.session.attempts,
            [submitted.attempt]
        );

        return submitted;
    }

    /**
     * Persist real attempts in AttemptStore first.
     *
     * Return IDs only after appendAttempt() succeeds.
     *
     * NOTE:
     * AttemptStore is memory-only, so "persisted" means
     * stored in this test's in-memory store instance.
     */
    function storeRealAttempts(session, attemptStore) {
        const sessionId = session.runtime.sessionId;

        for (const attempt of session.attempts) {
            attemptStore.appendAttempt({
                sessionId,
                attempt
            });
        }

        const persistedAttemptIds =
            attemptStore.listAttemptIds({
                sessionId
            });

        assert.deepStrictEqual(
            persistedAttemptIds,
            session.attempts.map(
                attempt => attempt.attemptId
            )
        );

        return persistedAttemptIds;
    }

    /**
     * Encode a real session into a checkpoint.
     */
    function encodeRealCheckpoint({
        session,
        revision,
        savedAt,
        attemptStore
    }) {
        const persistedAttemptIds =
            storeRealAttempts(
                session,
                attemptStore
            );

        return encodeCheckpoint({
            session,
            contentRefs: clone(CONTENT_REFS),
            revision,
            savedAt,
            persistedAttemptIds
        });
    }

    /**
     * ========================================================
     * CS-R01 — INITIAL SESSION
     * ========================================================
     */

    test(
        'P3.2-CS-R01: store initial real K283 checkpoint',
        () => {
            const session = makeSession();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            const saved = checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            assert.deepStrictEqual(
                saved,
                checkpoint
            );

            assert.equal(
                checkpointStore.getRevision({
                    sessionId: SESSION_ID
                }),
                1
            );

            assert.deepStrictEqual(
                checkpointStore.getCheckpoint({
                    sessionId: SESSION_ID
                }),
                checkpoint
            );
        }
    );

    /**
     * ========================================================
     * CS-R02 — LESSON PROGRESS
     * ========================================================
     */

    test(
        'P3.2-CS-R02: store real K283 lesson progress checkpoint',
        () => {
            const session = navigateToTransferSection(
                makeSession()
            );

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const loaded = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            assert.deepStrictEqual(
                loaded.lessonRuntime.progress.completedSectionIds,
                ['S08']
            );
        }
    );

    /**
     * ========================================================
     * CS-R03 — PENDING QUESTION
     * ========================================================
     */

    test(
        'P3.2-CS-R03: store real pending Q010 checkpoint',
        () => {
            const selected = selectTransferQuestion(
                makeSession()
            );

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session: selected.session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const loaded = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            assert.equal(
                loaded.currentQuestion.id,
                QUESTION_ID
            );

            assert.equal(
                loaded.lessonRuntime.currentItem.sectionId,
                'S09'
            );
        }
    );

    /**
     * ========================================================
     * CS-R04 — POST-ANSWER
     * ========================================================
     */

    test(
        'P3.2-CS-R04: store real post-answer LearningFlow checkpoint',
        () => {
            const submitted = makeSubmitted();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session: submitted.session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const loaded = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            assert.deepStrictEqual(
                loaded.attemptIds,
                [ATTEMPT_ID]
            );

            assert.equal(
                loaded.currentQuestion,
                null
            );

            assert.ok(
                loaded.lessonRuntime.progress.completedSectionIds
                    .includes('S09')
            );

            assert.deepStrictEqual(
                loaded.masteryRuntime.evidenceHistoryByNode,
                submitted.session.masteryRuntime.evidenceHistoryByNode
            );
        }
    );

    /**
     * ========================================================
     * CS-R05 — REVISION ADVANCE
     * ========================================================
     */

    test(
        'P3.2-CS-R05: real K283 checkpoint revision advances 1 to 2',
        () => {
            const initial = makeSession();
            const selected = selectTransferQuestion(initial);

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint1 = encodeRealCheckpoint({
                session: initial,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: checkpoint1,
                expectedRevision: 0
            });

            const checkpoint2 = encodeRealCheckpoint({
                session: selected.session,
                revision: 2,
                savedAt: SAVED_AT_2,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: checkpoint2,
                expectedRevision: 1
            });

            assert.equal(
                checkpointStore.getRevision({
                    sessionId: SESSION_ID
                }),
                2
            );

            assert.deepStrictEqual(
                checkpointStore.getCheckpoint({
                    sessionId: SESSION_ID
                }),
                checkpoint2
            );
        }
    );

    /**
     * ========================================================
     * CS-R06 — IDEMPOTENCY
     * ========================================================
     */

    test(
        'P3.2-CS-R06: retry real K283 checkpoint without revision advance',
        () => {
            const session = makeSession();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const retry = checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: clone(checkpoint),
                expectedRevision: 0
            });

            assert.deepStrictEqual(
                retry,
                checkpoint
            );

            assert.equal(
                checkpointStore.getRevision({
                    sessionId: SESSION_ID
                }),
                1
            );
        }
    );

    /**
     * ========================================================
     * CS-R07 — STALE WRITER
     * ========================================================
     */

    test(
        'P3.2-CS-R07: stale K283 writer cannot overwrite newer checkpoint',
        () => {
            const initial = makeSession();
            const selected = selectTransferQuestion(initial);

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint1 = encodeRealCheckpoint({
                session: initial,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: checkpoint1,
                expectedRevision: 0
            });

            const checkpoint2 = encodeRealCheckpoint({
                session: selected.session,
                revision: 2,
                savedAt: SAVED_AT_2,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: checkpoint2,
                expectedRevision: 1
            });

            const staleCheckpoint = encodeRealCheckpoint({
                session: initial,
                revision: 3,
                savedAt: SAVED_AT_3,
                attemptStore
            });

            expectRevisionConflict(() => {
                checkpointStore.saveCheckpoint({
                    sessionId: SESSION_ID,
                    checkpoint: staleCheckpoint,
                    expectedRevision: 1
                });
            });

            assert.deepStrictEqual(
                checkpointStore.getCheckpoint({
                    sessionId: SESSION_ID
                }),
                checkpoint2
            );
        }
    );

    /**
     * ========================================================
     * CS-R08 — SAME REVISION, DIFFERENT CONTENT
     * ========================================================
     */

    test(
        'P3.2-CS-R08: same revision with changed real session is rejected',
        () => {
            const initial = makeSession();
            const selected = selectTransferQuestion(initial);

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint1 = encodeRealCheckpoint({
                session: initial,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint: checkpoint1,
                expectedRevision: 0
            });

            const changed = encodeRealCheckpoint({
                session: selected.session,
                revision: 1,
                savedAt: SAVED_AT_2,
                attemptStore
            });

            expectRevisionConflict(() => {
                checkpointStore.saveCheckpoint({
                    sessionId: SESSION_ID,
                    checkpoint: changed,
                    expectedRevision: 0
                });
            });

            assert.deepStrictEqual(
                checkpointStore.getCheckpoint({
                    sessionId: SESSION_ID
                }),
                checkpoint1
            );
        }
    );

    /**
     * ========================================================
     * CS-R09 — NO SESSION MUTATION
     * ========================================================
     */

    test(
        'P3.2-CS-R09: storing checkpoint does not mutate real StudySession',
        () => {
            const submitted = makeSubmitted();

            const before = clone(submitted.session);

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session: submitted.session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            assert.deepStrictEqual(
                submitted.session,
                before
            );
        }
    );

    /**
     * ========================================================
     * CS-R10 — DETACHED READ
     * ========================================================
     */

    test(
        'P3.2-CS-R10: loaded real checkpoint cannot mutate stored checkpoint',
        () => {
            const submitted = makeSubmitted();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session: submitted.session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const loaded = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            loaded.runtime.status = 'corrupted';
            loaded.attemptIds.push('FAKE-ATTEMPT');

            const loadedAgain = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            assert.deepStrictEqual(
                loadedAgain,
                checkpoint
            );
        }
    );

    /**
     * ========================================================
     * CS-R11 — ATTEMPT REFERENCE INTEGRITY
     * ========================================================
     */

    test(
        'P3.2-CS-R11: checkpoint attempt IDs match stored real attempts',
        () => {
            const submitted = makeSubmitted();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session: submitted.session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            checkpointStore.saveCheckpoint({
                sessionId: SESSION_ID,
                checkpoint,
                expectedRevision: 0
            });

            const loaded = checkpointStore.getCheckpoint({
                sessionId: SESSION_ID
            });

            const storedAttemptIds =
                attemptStore.listAttemptIds({
                    sessionId: SESSION_ID
                });

            assert.deepStrictEqual(
                loaded.attemptIds,
                storedAttemptIds
            );

            assert.deepStrictEqual(
                loaded.attemptIds,
                submitted.session.attempts.map(
                    attempt => attempt.attemptId
                )
            );

            const decoded = decodeCheckpoint(
                JSON.stringify(loaded)
            );

            assert.deepStrictEqual(
                decoded.attemptIds,
                storedAttemptIds
            );

            assert.equal(
                Object.hasOwn(decoded, 'attempts'),
                false
            );
        }
    );

    /**
     * ========================================================
     * CS-R12 — SESSION OWNERSHIP
     * ========================================================
     */

    test(
        'P3.2-CS-R12: real K283 checkpoint cannot be saved under another session',
        () => {
            const session = makeSession();

            const attemptStore = createAttemptStore();
            const checkpointStore = createCheckpointStore();

            const checkpoint = encodeRealCheckpoint({
                session,
                revision: 1,
                savedAt: SAVED_AT_1,
                attemptStore
            });

            const otherSessionId = `${SESSION_ID}-OTHER`;

            expectSessionConflict(() => {
                checkpointStore.saveCheckpoint({
                    sessionId: otherSessionId,
                    checkpoint,
                    expectedRevision: 0
                });
            });

            assert.equal(
                checkpointStore.hasCheckpoint({
                    sessionId: otherSessionId
                }),
                false
            );

            assert.equal(
                checkpointStore.hasCheckpoint({
                    sessionId: SESSION_ID
                }),
                false
            );
        }
    );
}
