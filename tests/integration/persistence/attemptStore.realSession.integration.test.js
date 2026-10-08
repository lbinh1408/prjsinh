
/**
 * ============================================================
 * Phase 3.2 — AttemptStore Real Session Integration
 * ============================================================
 *
 * Status: DRAFT — NOT LOCKED
 *
 * Pipeline:
 * StudySession
 *   -> QuestionSelector
 *   -> AnswerEvaluator
 *   -> AttemptBuilder
 *   -> LearningFlow
 *   -> AttemptStore
 *
 * Uses the real K283 fixture from:
 * studySession.lesson.learningflow.integration.test.js
 *
 * This module registers tests through a fixture factory.
 * It is not a standalone test entry point.
 *
 * No modifications to LOCKED engines.
 * No durable persistence claims.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createAttemptStore,
    ATTEMPT_STORE_INFO
} from '../../../src/persistence/attemptStore.js';

import {
    encodeCheckpoint,
    decodeCheckpoint
} from '../../../src/persistence/checkpointCodec.js';

const EXPECTED_QUESTION_ID = 'Q-A-K283-T-010';
const EXPECTED_ATTEMPT_ID = 'ATT-K283-Q010-001';

const SAVED_AT = '2026-10-08T10:00:00.000Z';

const CONTENT_REFS = {
    knowledgeMap: {
        id: 'knowledge-map-v4',
        version: '4.0.0',
        sha256: 'a'.repeat(64)
    }
};

/**
 * CONTENT_REFS contains a test-only SHA-256 placeholder.
 *
 * The codec validates its structure but does not verify
 * the hash against production file bytes.
 *
 * Real content integrity verification belongs to a
 * separate persistence integration phase.
 */

function clone(value) {
    return structuredClone(value);
}

function expectConflict(callback) {
    assert.throws(callback, error => {
        assert.equal(error.code, 'ATTEMPT_CONFLICT');
        return true;
    });
}

export function registerAttemptStoreRealSessionTests(fixtures) {
    const {
        makeSession,
        selectTransferQuestion,
        submitTransferAnswer
    } = fixtures;

    for (const [name, fn] of Object.entries({
        makeSession,
        selectTransferQuestion,
        submitTransferAnswer
    })) {
        if (typeof fn !== 'function') {
            throw new TypeError(
                `Missing real K283 fixture: ${name}`
            );
        }
    }

    /**
     * Produce a fresh real K283 attempt through the
     * production LearningFlow.
     */
    function makeRealSubmission() {
        const initialSession = makeSession();

        const selected = selectTransferQuestion(
            initialSession
        );

        const submitted = submitTransferAnswer(
            selected.session
        );

        assert.ok(submitted);
        assert.ok(submitted.session);
        assert.ok(submitted.attempt);

        assert.equal(
            submitted.attempt.questionId,
            EXPECTED_QUESTION_ID
        );

        assert.equal(
            submitted.attempt.attemptId,
            EXPECTED_ATTEMPT_ID
        );

        assert.equal(
            submitted.session.attempts.length,
            1
        );

        assert.deepStrictEqual(
            submitted.session.attempts[0],
            submitted.attempt
        );

        return {
            initialSession,
            selected,
            submitted
        };
    }

    function createStoredSubmission() {
        const { submitted } = makeRealSubmission();

        const store = createAttemptStore();

        const sessionId =
            submitted.session.runtime.sessionId;

        const stored = store.appendAttempt({
            sessionId,
            attempt: submitted.attempt
        });

        return {
            store,
            sessionId,
            submitted,
            stored
        };
    }

    // ========================================================
    // AS-R01 — STORE REAL ATTEMPT
    // ========================================================

    test(
        'P3.2-AS-R01: store real K283 AttemptBuilder attempt',
        () => {
            const {
                store,
                sessionId,
                submitted,
                stored
            } = createStoredSubmission();

            assert.equal(
                ATTEMPT_STORE_INFO.durable,
                false
            );

            assert.deepStrictEqual(
                stored,
                submitted.attempt
            );

            assert.equal(
                store.countAttempts({ sessionId }),
                1
            );
        }
    );

    // ========================================================
    // AS-R02 — EXACT ROUND-TRIP
    // ========================================================

    test(
        'P3.2-AS-R02: stored real attempt matches production attempt',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const loaded = store.getAttempt({
                sessionId,
                attemptId: EXPECTED_ATTEMPT_ID
            });

            assert.deepStrictEqual(
                loaded,
                submitted.attempt
            );

            assert.equal(
                loaded.questionId,
                EXPECTED_QUESTION_ID
            );

            assert.equal(
                loaded.result,
                'correct'
            );

            assert.equal(
                loaded.evidence.primaryDimension,
                'transfer'
            );

            assert.equal(
                loaded.evidence.difficulty,
                'D4'
            );
        }
    );

    // ========================================================
    // AS-R03 — IDEMPOTENT RETRY
    // ========================================================

    test(
        'P3.2-AS-R03: retrying real attempt is idempotent',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const retry = store.appendAttempt({
                sessionId,
                attempt: clone(submitted.attempt)
            });

            assert.deepStrictEqual(
                retry,
                submitted.attempt
            );

            assert.equal(
                store.countAttempts({ sessionId }),
                1
            );

            assert.deepStrictEqual(
                store.listAttemptIds({ sessionId }),
                [EXPECTED_ATTEMPT_ID]
            );
        }
    );

    // ========================================================
    // AS-R04 — CONFLICT
    // ========================================================

    test(
        'P3.2-AS-R04: changed real attempt payload causes conflict',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const conflicting = clone(
                submitted.attempt
            );

            conflicting.result = 'wrong';

            expectConflict(() => {
                store.appendAttempt({
                    sessionId,
                    attempt: conflicting
                });
            });

            assert.deepStrictEqual(
                store.getAttempt({
                    sessionId,
                    attemptId: EXPECTED_ATTEMPT_ID
                }),
                submitted.attempt
            );
        }
    );

    // ========================================================
    // AS-R05 — INPUT OWNERSHIP
    // ========================================================

    test(
        'P3.2-AS-R05: storing attempt does not mutate StudySession',
        () => {
            const { submitted } = makeRealSubmission();

            const before = clone(
                submitted.session
            );

            const attemptBefore = clone(
                submitted.attempt
            );

            const store = createAttemptStore();

            store.appendAttempt({
                sessionId:
                    submitted.session.runtime.sessionId,
                attempt:
                    submitted.attempt
            });

            assert.deepStrictEqual(
                submitted.session,
                before
            );

            assert.deepStrictEqual(
                submitted.attempt,
                attemptBefore
            );
        }
    );

    // ========================================================
    // AS-R06 — OUTPUT OWNERSHIP
    // ========================================================

    test(
        'P3.2-AS-R06: modifying loaded attempt cannot mutate store',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const loaded = store.getAttempt({
                sessionId,
                attemptId: EXPECTED_ATTEMPT_ID
            });

            loaded.result = 'wrong';
            loaded.evidence.primaryDimension = 'know';

            const loadedAgain = store.getAttempt({
                sessionId,
                attemptId: EXPECTED_ATTEMPT_ID
            });

            assert.deepStrictEqual(
                loadedAgain,
                submitted.attempt
            );
        }
    );

    // ========================================================
    // AS-R07 — ORDER
    // ========================================================

    test(
        'P3.2-AS-R07: stored attempt IDs match StudySession order',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const sessionAttemptIds =
                submitted.session.attempts.map(
                    attempt => attempt.attemptId
                );

            assert.deepStrictEqual(
                store.listAttemptIds({ sessionId }),
                sessionAttemptIds
            );
        }
    );

    // ========================================================
    // AS-R08 — CHECKPOINT CODEC COMPATIBILITY
    // ========================================================

    test(
        'P3.2-AS-R08: stored attempt IDs are accepted by checkpoint codec',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const persistedAttemptIds =
                store.listAttemptIds({ sessionId });

            const checkpoint = encodeCheckpoint({
                session: submitted.session,
                contentRefs: CONTENT_REFS,
                revision: 1,
                savedAt: SAVED_AT,
                persistedAttemptIds
            });

            const decoded = decodeCheckpoint(
                JSON.stringify(checkpoint)
            );

            assert.deepStrictEqual(
                decoded.attemptIds,
                persistedAttemptIds
            );

            assert.deepStrictEqual(
                decoded.attemptIds,
                submitted.session.attempts.map(
                    attempt => attempt.attemptId
                )
            );

            assert.equal(
                Object.hasOwn(decoded, 'attempts'),
                false
            );

            assert.equal(
                Object.hasOwn(decoded, 'dependencies'),
                false
            );
        }
    );

    // ========================================================
    // AS-R09 — SESSION ISOLATION
    // ========================================================

    test(
        'P3.2-AS-R09: real attemptId cannot belong to another session',
        () => {
            const {
                store,
                sessionId,
                submitted
            } = createStoredSubmission();

            const otherSessionId = `${sessionId}-OTHER`;

            // Preserve real AttemptBuilder data.
            const otherAttempt = clone(submitted.attempt);

            // Make the payload valid for the second session.
            // Keep the same attemptId to test global ownership.
            if (Object.hasOwn(otherAttempt, 'sessionId')) {
                otherAttempt.sessionId = otherSessionId;
            }

            expectConflict(() => {
                store.appendAttempt({
                    sessionId: otherSessionId,
                    attempt: otherAttempt
                });
            });

            assert.equal(
                store.countAttempts({
                    sessionId: otherSessionId
                }),
                0
            );

            assert.equal(
                store.countAttempts({
                    sessionId
                }),
                1
            );

            assert.deepStrictEqual(
                store.listAttemptIds({ sessionId }),
                [EXPECTED_ATTEMPT_ID]
            );
        }
    );

    // ========================================================
    // AS-R10 — NO LEARNING STATE MUTATION
    // ========================================================

    test(
        'P3.2-AS-R10: AttemptStore does not recompute mastery or adaptive state',
        () => {
            const { submitted } = makeRealSubmission();

            const sessionBefore = clone(
                submitted.session
            );

            const store = createAttemptStore();

            const sessionId =
                submitted.session.runtime.sessionId;

            store.appendAttempt({
                sessionId,
                attempt: submitted.attempt
            });

            store.listAttempts({ sessionId });
            store.listAttemptIds({ sessionId });
            store.getAttempt({
                sessionId,
                attemptId: EXPECTED_ATTEMPT_ID
            });

            assert.deepStrictEqual(
                submitted.session.state,
                sessionBefore.state
            );

            assert.deepStrictEqual(
                submitted.session.currentDecision,
                sessionBefore.currentDecision
            );

            assert.deepStrictEqual(
                submitted.session.masteryRuntime,
                sessionBefore.masteryRuntime
            );

            assert.deepStrictEqual(
                submitted.session.history,
                sessionBefore.history
            );

            assert.deepStrictEqual(
                submitted.session,
                sessionBefore
            );
        }
    );
}
