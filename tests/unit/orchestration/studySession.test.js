/**
 * ============================================================
 * studySession.test.js
 * ============================================================
 *
 * StudySession V0.2.0
 *
 * Phase 2A — Study MVP Runtime
 *
 * PRIMARY GOAL
 * ------------------------------------------------------------
 *
 * Prove that StudySession closes the runtime loop:
 *
 * AdaptiveDecision
 *      ↓
 * QuestionSelector
 *      ↓
 * AnswerEvaluator
 *      ↓
 * AttemptBuilder
 *      ↓
 * LearningFlow
 *      ↓
 * Student State commit
 *      ↓
 * next AdaptiveDecision
 *      ↓
 * next question
 *
 *
 * MOST IMPORTANT INVARIANT
 * ------------------------------------------------------------
 *
 * Attempt #2 MUST see the Student State produced by #1.
 *
 * Attempt #3 MUST see the Student State produced by #2.
 *
 *
 * This test does NOT mock:
 *
 * - QuestionSelector
 * - AnswerEvaluator
 * - AttemptBuilder
 * - LearningFlow
 * - Mastery Engine
 * - Adaptive Engine
 * - Remediation Engine
 *
 * ============================================================
 */


import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";


import {
    createStudySession,
    getNextQuestion,
    submitAnswer,
    getSessionSnapshot,
    getStudentState,
    computeRemediationConfigFingerprint,
    STUDY_SESSION_INFO
} from "../../../src/engines/orchestration/studySession.js";
import {
    PROBE_FEASIBILITY_RESOLVER_VERSION
} from "../../../src/engines/remediation/probeFeasibilityResolver.js";
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from "../../../src/engines/orchestration/remediationStopFingerprint.js";

import {
    encodeCheckpoint
} from "../../../src/persistence/checkpointCodec.js";

import {
    prepareK283DiagnosticSubmission
} from "../../../k283A003DiagnosticConfirmationV1.js";


/**
 * ============================================================
 * PATHS
 * ============================================================
 */

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


const ROOT =
    path.resolve(
        __dirname,

        "../.."
    );


/**
 * ============================================================
 * DATA LOADER
 * ============================================================
 */

function loadJson(
    relativePath
) {

    const fullPath =
        path.join(
            ROOT,
            relativePath
        );


    return JSON.parse(
        fs.readFileSync(
            fullPath,
            "utf8"
        )
    );
}


/**
 * ============================================================
 * PROJECT DATA
 * ============================================================
 */

const knowledgeMap =
    loadJson(
        "../src/data/knowledge/knowledge-map-v4.json"
    );


const masteryRules =
    loadJson(
        "../src/policies/mastery/rules.json"
    );


const evidenceModel =
    loadJson(
        "../src/data/mastery/evidence.json"
    );


const adaptiveRules =
    loadJson(
        "../src/policies/adaptive/rules.json"
    );


const adaptivePaths =
    loadJson(
        "../src/policies/adaptive/paths.json"
    );


const failureSignatures =
    loadJson(
        "../src/data/remediation/failure-signatures.json"
    );


/**
 * IMPORTANT:
 *
 * Current project has NO remediation/rules.json.
 *
 * Do NOT invent one.
 */
const remediationRules = {};


/**
 * Real K283 question bank.
 */
const k283Bank =
    loadJson(
        "../src/data/questions/c09/K283.question-bank.json"
    );


const questionBanks = {
    K283:
        k283Bank
};


/**
 * ============================================================
 * FIXED TEST TIME
 * ============================================================
 */

const T0 =
    "2026-10-01T08:00:00.000Z";

const T1_START =
    "2026-10-01T08:01:00.000Z";

const T1_END =
    "2026-10-01T08:01:30.000Z";

const T2_START =
    "2026-10-01T08:02:00.000Z";

const T2_END =
    "2026-10-01T08:02:40.000Z";

const T3_START =
    "2026-10-01T08:03:00.000Z";

const T3_END =
    "2026-10-01T08:03:50.000Z";


/**
 * ============================================================
 * INITIAL STUDENT STATE
 * ============================================================
 *
 * Canonical Student State V1.2.0 runtime fixture.
 *
 * We deliberately start K283 absent.
 *
 * LearningFlow / Mastery must create the runtime projection
 * after the first Attempt.
 */

function createInitialStudentState() {

    return {

        schemaVersion:
            "1.2.0",

        stateId:
            "STATE-STUDY-SESSION-001",

        stateType:
            "runtime",

        updatedAt:
            T0,


        student: {

            studentId:
                "STUDENT-STUDY-SESSION",

            grade:
                11,

            curriculum:
                "KNTT",

            target: {

                mode:
                    "HOC_SAU",

                exam:
                    "THPT",

                subject:
                    "Biology"
            }
        },


        learning: {

            currentMode:
                "HOC_SAU",

            session: {

                sessionId:
                    "SESSION-PRE",

                startedAt:
                    T0,

                lastActivityAt:
                    T0,

                timeBudgetMinutes:
                    60,

                timeUsedMinutes:
                    0,

                runtimeSignals: {

                    consecutiveWrong:
                        0,

                    consecutiveSkip:
                        0,

                    consecutiveRemediation:
                        0
                },

                fatigue: {

                    level:
                        "normal",

                    signals: []
                }
            },


            current: {

                clusterId:
                    "C09",

                lessonId:
                    null,

                nodeId:
                    "K283",

                action:
                    "PRACTICE",

                contextId:
                    "CTX-K283-SESSION"
            }
        },


        knowledge: {},


        metaSkills: {},


        failurePatterns: {
            active: []
        },


        remediation: {

            lastResult:
                null,

            activePlan:
                null
        },


        adaptive: {

            lastDecision:
                null,

            nextAction:
                null
        },


        history: {

            recentActions: [],

            recentQuestions: []
        },


        progress: {

            nodes: {

                total:
                    0,

                unstarted:
                    0,

                developing:
                    0,

                mastered:
                    0,

                stable:
                    0
            },

            clusters: {}
        },


        preferences: {

            preferredSessionLength:
                "normal",

            preferredDifficulty:
                "adaptive",

            allowChallenge:
                true,

            allowSkipKnown:
                true,

            showDetailedFeedback:
                true
        }
    };
}


/**
 * ============================================================
 * INITIAL ADAPTIVE DECISION
 * ============================================================
 *
 * This is only the ENTRY fixture.
 *
 * After Attempt #1, all subsequent decisions MUST come from
 * real LearningFlow / AdaptiveEngine.
 */

function createInitialDecision() {

    return {

        decisionId:
            "DECISION-STUDY-ENTRY",

        action:
            "PRACTICE",

        target: {

            primaryNodeId:
                "K283",

            nodeIds:
                [
                    "K283"
                ]
        },

        selectionCriteria: {

            questionTypes:
                [
                    "mcq"
                ],

            difficulty: {

                min:
                    "D1",

                max:
                    "D5",

                preferred:
                    "D3"
            },

            evidenceDimensions:
                [],

            excludeQuestionIds:
                [],

            requireDifferentQuestion:
                false,

            requireDifferentContext:
                false,

            requireIndependentEvidence:
                false,

            metaSkills:
                [],

            secondaryNodes:
                [],

            failureSignatures:
                []
        },

        constraints: {

            requireDifferentContext:
                false,

            requireDifferentQuestion:
                false
        },

        path: {

            current:
                "PRACTICE",

            next:
                null
        },

        fallback:
            null
    };
}


/**
 * ============================================================
 * SESSION FACTORY
 * ============================================================
 */

function createSession() {

    return createStudySession({

        sessionId:
            "SESSION-STUDY-001",

        studentState:
            createInitialStudentState(),

        initialDecision:
            createInitialDecision(),

        questionBanks,

        knowledgeMap,

        masteryRules,
        evidenceModel,

        adaptiveRules,
        adaptivePaths,

        failureSignatures,
        remediationRules,

        learningMode:
            "HOC_SAU",

        timeBudget:
            60,

        clusterId:
            "C09",

        contextId:
            "CTX-K283-SESSION",

        now:
            T0
    });
}


/**
 * ============================================================
 * QUESTION HELPERS
 * ============================================================
 */

function getCorrectOptionId(
    question
) {

    const option =
        question
            ?.content
            ?.options
            ?.find(
                item =>
                    item.isCorrect ===
                    true
            );


    assert.ok(
        option,
        `${question?.id} must contain a correct option.`
    );


    return option.id;
}


function getWrongOptionId(
    question
) {

    const option =
        question
            ?.content
            ?.options
            ?.find(
                item =>
                    item.isCorrect ===
                    false
            );


    assert.ok(
        option,
        `${question?.id} must contain a wrong option.`
    );


    return option.id;
}


/**
 * ============================================================
 * SUBMIT HELPERS
 * ============================================================
 */

function submitCorrect({

    session,

    attemptId,

    startedAt,

    submittedAt

}) {

    const question =
        session.currentQuestion;


    assert.ok(
        question
    );


    return submitAnswer({

        session,

        response:
            getCorrectOptionId(
                question
            ),

        attemptId,

        startedAt,
        submittedAt,

        timing: {

            timeSpentSeconds:
                30
        },

        now:
            submittedAt
    });
}


function submitWrong({

    session,

    attemptId,

    startedAt,

    submittedAt

}) {

    const question =
        session.currentQuestion;


    assert.ok(
        question
    );


    return submitAnswer({

        session,

        response:
            getWrongOptionId(
                question
            ),

        attemptId,

        startedAt,
        submittedAt,

        timing: {

            timeSpentSeconds:
                30
        },

        diagnostic: {

            failureType:
                "reasoning_error",

            sourceNodeId:
                "K283",

            confidence:
                0.9,

            evidence:
                "StudySession integration test failure."
        },

        now:
            submittedAt
    });
}


/**
 * ============================================================
 * 1. INFO CONTRACT
 * ============================================================
 */

test(
    "1. StudySession exposes V0.2.0 runtime metadata",
    () => {

        assert.equal(
            STUDY_SESSION_INFO.name,
            "StudySession"
        );


        assert.equal(
            STUDY_SESSION_INFO.version,
            "0.2.0"
        );


        assert.equal(
            STUDY_SESSION_INFO
                .studentStateVersion,
            "1.2.0"
        );


        assert.equal(
            STUDY_SESSION_INFO.persistence,
            false
        );
    }
);


/**
 * ============================================================
 * 2. CREATE SESSION
 * ============================================================
 */

test(
    "2. createStudySession creates an active in-memory session",
    () => {

        const session =
            createSession();


        assert.equal(
            session.runtime.name,
            "StudySession"
        );


        assert.equal(
            session.runtime.version,
            "0.2.0"
        );


        assert.equal(
            session.runtime.status,
            "active"
        );


        assert.equal(
            session.runtime.sessionId,
            "SESSION-STUDY-001"
        );


        assert.equal(
            session.config.learningMode,
            "HOC_SAU"
        );


        assert.equal(
            session.currentDecision.action,
            "PRACTICE"
        );


        assert.equal(
            session.currentQuestion,
            null
        );


        assert.deepEqual(
            session.attempts,
            []
        );


        assert.deepEqual(
            session.history,
            []
        );
    }
);


/**
 * ============================================================
 * 3. CALLER STUDENT STATE MUST NOT BE MUTATED
 * ============================================================
 */

test(
    "3. createStudySession does not mutate caller Student State",
    () => {

        const studentState =
            createInitialStudentState();


        const before =
            structuredClone(
                studentState
            );


        createStudySession({

            sessionId:
                "SESSION-IMMUTABLE",

            studentState,

            initialDecision:
                createInitialDecision(),

            questionBanks,

            knowledgeMap,

            masteryRules,
            evidenceModel,

            adaptiveRules,
            adaptivePaths,

            failureSignatures,
            remediationRules,

            learningMode:
                "HOC_SAU",

            clusterId:
                "C09",

            contextId:
                "CTX-K283-SESSION",

            now:
                T0
        });


        assert.deepEqual(
            studentState,
            before
        );
    }
);


/**
 * ============================================================
 * 4. SESSION START PROJECTION
 * ============================================================
 */

test(
    "4. createStudySession projects runtime session into Student State",
    () => {

        const session =
            createSession();


        assert.equal(
            session.state.schemaVersion,
            "1.2.0"
        );


        assert.equal(
            session
                .state
                .learning
                .session
                .sessionId,
            "SESSION-STUDY-001"
        );


        assert.equal(
            session
                .state
                .learning
                .currentMode,
            "HOC_SAU"
        );


        assert.equal(
            session.state.learning.current.nodeId,
            null
        );


        assert.equal(
            session.state.learning.current.action,
            null
        );

        assert.equal(
            session.currentDecision.action,
            "PRACTICE"
        );

        assert.equal(
            session.currentDecision.target.primaryNodeId,
            "K283"
        );
    }
);


/**
 * ============================================================
 * 5. QUESTION SELECTION
 * ============================================================
 */


test(
    "5. getNextQuestion selects a real K283 question",
    () => {

        const session =
            createSession();

        const result =
            getNextQuestion({
                session,
                now: T1_START
            });

        assert.equal(
            result.selection.status,
            "SELECTED"
        );

        assert.ok(
            result.question
        );

        assert.equal(
            result.question.primaryNode,
            "K283"
        );

        assert.equal(
            result.session.currentQuestion.id,
            result.question.id
        );
    }
);


/**
 * ============================================================
 * 6. getNextQuestion MUST NOT MUTATE INPUT SESSION
 * ============================================================
 */

test(
    "6. getNextQuestion does not mutate input session",
    () => {

        const session =
            createSession();


        const before =
            structuredClone(
                session
            );


        getNextQuestion({
            session,
            now:
                T1_START
        });


        assert.deepEqual(
            session,
            before
        );
    }
);


/**
 * ============================================================
 * 7. FIRST ATTEMPT
 * ============================================================
 */

test(
    "7. first submitted answer creates canonical Attempt and commits K283 state",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        const result =
            submitCorrect({

                session,

                attemptId:
                    "ATTEMPT-STUDY-001",

                startedAt:
                    T1_START,

                submittedAt:
                    T1_END
            });


        assert.equal(
            result.attempt.attemptId,
            "ATTEMPT-STUDY-001"
        );


        assert.equal(
            result.attempt.result,
            "correct"
        );


        assert.equal(
            result
                .attempt
                .context
                .nodeId,
            "K283"
        );


        assert.ok(
            result
                .session
                .state
                .knowledge
                .K283
        );


        assert.equal(
            result
                .session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            1
        );


        assert.equal(
            result
                .session
                .attempts
                .length,
            1
        );


        assert.equal(
            result
                .session
                .history
                .length,
            1
        );
    }
);


/**
 * ============================================================
 * 8. submitAnswer MUST NOT MUTATE INPUT SESSION
 * ============================================================
 */

test(
    "8. submitAnswer does not mutate input session",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        const before =
            structuredClone(
                session
            );


        submitCorrect({

            session,

            attemptId:
                "ATTEMPT-IMMUTABLE",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        });


        assert.deepEqual(
            session,
            before
        );
    }
);


/**
 * ============================================================
 * 9. NEXT DECISION COMES FROM LEARNING FLOW
 * ============================================================
 */

test(
    "9. after submit, StudySession carries LearningFlow AdaptiveDecision",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        const result =
            submitCorrect({

                session,

                attemptId:
                    "ATTEMPT-DECISION-001",

                startedAt:
                    T1_START,

                submittedAt:
                    T1_END
            });


        assert.deepEqual(
            result
                .session
                .currentDecision,
            result
                .flowResult
                .adaptiveDecision
        );


        assert.deepEqual(
            result.nextDecision,
            result
                .flowResult
                .adaptiveDecision
        );


        assert.equal(
            result
                .session
                .currentQuestion,
            null
        );


        assert.equal(
            result
                .session
                .currentSelection,
            null
        );
    }
);


/**
 * ============================================================
 * 10. CRITICAL STATE CARRY — ATTEMPT #1 → #2
 * ============================================================
 */

test(
    "10. Attempt #2 receives the K283 state committed by Attempt #1",
    () => {

        let session =
            createSession();


        /**
         * ATTEMPT #1
         */

        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-CARRY-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        const stateAfter1 =
            structuredClone(
                session
                    .state
                    .knowledge
                    .K283
            );


        assert.equal(
            stateAfter1
                .attemptStats
                .total,
            1
        );


        /**
         * Ask the REAL next AdaptiveDecision to select
         * another question.
         */

        const selection2 =
            getNextQuestion({

                session,

                now:
                    T2_START
            });


        /**
         * Adaptive may legally decide that a question is not
         * required, or the real bank may have no matching item.
         *
         * If so, the selector contract itself is still valid.
         *
         * The critical multi-attempt test requires SELECTED.
         */
        assert.equal(
            selection2
                .selection
                .status,
            "SELECTED",
            `Expected second question to be SELECTED, got ${selection2.selection.status}`
        );


        session =
            selection2.session;


        const result2 =
            submitCorrect({

                session,

                attemptId:
                    "ATTEMPT-CARRY-002",

                startedAt:
                    T2_START,

                submittedAt:
                    T2_END
            });


        const stateAfter2 =
            result2
                .session
                .state
                .knowledge
                .K283;


        /**
         * CRITICAL ASSERTION:
         *
         * If Attempt #2 had started from a fresh state,
         * total would still be 1.
         *
         * total === 2 proves the committed state from #1
         * crossed the session boundary into #2.
         */
        assert.equal(
            stateAfter2
                .attemptStats
                .total,
            2
        );


        assert.ok(
            stateAfter2
                .attemptStats
                .total >
            stateAfter1
                .attemptStats
                .total
        );


        assert.equal(
            result2
                .session
                .attempts
                .length,
            2
        );


        assert.equal(
            result2
                .session
                .history
                .length,
            2
        );
    }
);


/**
 * ============================================================
 * 11. CRITICAL STATE CARRY — THREE ATTEMPTS
 * ============================================================
 */

test(
    "11. three consecutive Attempts accumulate K283 runtime state",
    () => {

        let session =
            createSession();


        /**
         * -------------------------
         * ATTEMPT #1
         * -------------------------
         */

        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-CHAIN-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            1
        );


        /**
         * -------------------------
         * ATTEMPT #2
         * -------------------------
         */

        const next2 =
            getNextQuestion({
                session,
                now:
                    T2_START
            });


        assert.equal(
            next2.selection.status,
            "SELECTED",
            `Attempt #2 selection failed: ${next2.selection.status}`
        );


        session =
            next2.session;


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-CHAIN-002",

            startedAt:
                T2_START,

            submittedAt:
                T2_END
        }));


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            2
        );


        /**
         * -------------------------
         * ATTEMPT #3
         * -------------------------
         */

        const next3 =
            getNextQuestion({
                session,
                now:
                    T3_START
            });


        assert.equal(
            next3.selection.status,
            "SELECTED",
            `Attempt #3 selection failed: ${next3.selection.status}`
        );


        session =
            next3.session;


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-CHAIN-003",

            startedAt:
                T3_START,

            submittedAt:
                T3_END
        }));


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            3
        );


        assert.equal(
            session.attempts.length,
            3
        );


        assert.equal(
            session.history.length,
            3
        );


        assert.deepEqual(
            session.attempts.map(
                attempt =>
                    attempt.attemptId
            ),
            [
                "ATTEMPT-CHAIN-001",
                "ATTEMPT-CHAIN-002",
                "ATTEMPT-CHAIN-003"
            ]
        );
    }
);


/**
 * ============================================================
 * 12. WRONG RESULT UPDATES SESSION SIGNAL
 * ============================================================
 */

test(
    "12. incorrect Attempt increments consecutiveWrong",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitWrong({

            session,

            attemptId:
                "ATTEMPT-WRONG-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session
                .state
                .learning
                .session
                .runtimeSignals
                .consecutiveWrong,
            1
        );


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .wrong,
            1
        );
    }
);


/**
 * ============================================================
 * 13. CORRECT RESULT RESETS CONSECUTIVE WRONG
 * ============================================================
 */

test(
    "13. correct Attempt resets consecutiveWrong to zero",
    () => {

        let session =
            createSession();


        /**
         * First answer wrong.
         */

        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitWrong({

            session,

            attemptId:
                "ATTEMPT-WRONG-FIRST",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session
                .state
                .learning
                .session
                .runtimeSignals
                .consecutiveWrong,
            1
        );


        /**
         * Next answer correct.
         */

        const next =
            getNextQuestion({
                session,
                now:
                    T2_START
            });


        assert.equal(
            next.selection.status,
            "SELECTED"
        );


        session =
            next.session;


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-CORRECT-SECOND",

            startedAt:
                T2_START,

            submittedAt:
                T2_END
        }));


        assert.equal(
            session
                .state
                .learning
                .session
                .runtimeSignals
                .consecutiveWrong,
            0
        );
    }
);


/**
 * ============================================================
 * 14. HISTORY PROJECTION
 * ============================================================
 */

test(
    "14. committed Attempt appears in runtime and Student State history",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        const questionId =
            session
                .currentQuestion
                .id;


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-HISTORY-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session.history.length,
            1
        );


        assert.equal(
            session
                .history[0]
                .questionId,
            questionId
        );


        assert.ok(
            session
                .state
                .history
                .recentQuestions
                .includes(
                    questionId
                )
        );


        assert.equal(
            session
                .state
                .history
                .recentActions
                .length,
            1
        );
    }
);


/**
 * ============================================================
 * 15. SNAPSHOT SAFETY
 * ============================================================
 */

test(
    "15. getSessionSnapshot returns a defensive clone",
    () => {

        const session =
            createSession();


        const snapshot =
            getSessionSnapshot(
                session
            );


        snapshot.runtime.status =
            "tampered";


        assert.equal(
            session.runtime.status,
            "active"
        );
    }
);


/**
 * ============================================================
 * 16. STUDENT STATE SAFETY
 * ============================================================
 */

test(
    "16. getStudentState returns a defensive clone",
    () => {

        const session =
            createSession();


        const state =
            getStudentState(
                session
            );


        state.student.studentId =
            "TAMPERED";


        assert.equal(
            session
                .state
                .student
                .studentId,
            "STUDENT-STUDY-SESSION"
        );
    }
);


/**
 * ============================================================
 * 17. QUESTION BANK MUST NOT BE MUTATED
 * ============================================================
 */

test(
    "17. StudySession runtime does not mutate source question bank",
    () => {

        const before =
            structuredClone(
                questionBanks
            );


        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        submitCorrect({

            session,

            attemptId:
                "ATTEMPT-BANK-IMMUTABLE",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        });


        assert.deepEqual(
            questionBanks,
            before
        );
    }
);


/**
 * ============================================================
 * 18. NO SELECTED QUESTION → CANNOT SUBMIT
 * ============================================================
 */

test(
    "18. submitAnswer rejects when no question has been selected",
    () => {

        const session =
            createSession();


        assert.throws(
            () => {

                submitAnswer({

                    session,

                    response:
                        "A",

                    attemptId:
                        "ATTEMPT-INVALID",

                    startedAt:
                        T1_START,

                    submittedAt:
                        T1_END,

                    now:
                        T1_END
                });
            },

            /no selected question/i
        );
    }
);


/**
 * ============================================================
 * 19. STATE TIMESTAMP ADVANCES
 * ============================================================
 */

test(
    "19. successful commit advances Student State updatedAt",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-TIME-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session.state.updatedAt,
            T1_END
        );


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .lastAttemptAt,
            T1_END
        );


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .lastSuccessAt,
            T1_END
        );
    }
);


/**
 * ============================================================
 * 20. SESSION TIME ACCUMULATES
 * ============================================================
 */

test(
    "20. StudySession accumulates observed timeUsedMinutes",
    () => {

        let session =
            createSession();


        ({
            session
        } = getNextQuestion({
            session,
            now:
                T1_START
        }));


        ({
            session
        } = submitCorrect({

            session,

            attemptId:
                "ATTEMPT-TIME-USED-001",

            startedAt:
                T1_START,

            submittedAt:
                T1_END
        }));


        assert.equal(
            session
                .state
                .learning
                .session
                .timeUsedMinutes,
            1
        );
    }
);

function createFreshRemediationSession({
    remediationProbeSelectorConstraints = {},
    probeAuthoringPolicy = null
} = {}) {
    const studentState = createInitialStudentState();
    delete studentState.knowledge.K283;
    studentState.learning.session.sessionId = "SESSION-REMEDIATION-STOP";
    studentState.learning.session.runtimeSignals = {
        consecutiveWrong: 0,
        consecutiveSkip: 0,
        consecutiveRemediation: 0
    };

    return createStudySession({
        sessionId: "SESSION-REMEDIATION-STOP",
        studentState,
        initialDecision: createInitialDecision(),
        questionBanks,
        knowledgeMap,
        masteryRules,
        evidenceModel,
        adaptiveRules,
        adaptivePaths,
        failureSignatures,
        remediationRules: null,
        learningMode: "HOC_SAU",
        timeBudget: 60,
        clusterId: "C09",
        contextId: "CTX-K283-SESSION",
        remediationProbeSelectorConstraints,
        probeAuthoringPolicy,
        now: T0
    });
}

function submitConfirmedWrongQuestion(session, questionId, attemptId, confirmation) {
    const question = k283Bank.questions.find(item => item.id === questionId);
    assert.ok(question, `Missing question ${questionId}`);
    const wrongOption = question.content.options.find(option => !option.isCorrect);
    assert.ok(wrongOption, `${questionId} must contain an incorrect option`);

    const prepared = prepareK283DiagnosticSubmission({
        question,
        response: wrongOption.id,
        confirmation
    });
    const selectedSession = {
        ...session,
        currentSelection: {
            selectionId: `${attemptId}-selection`,
            decisionId: session.currentDecision.decisionId,
            action: session.currentDecision.action,
            targetNodeId: "K283",
            status: "SELECTED",
            selected: { questionId, question }
        },
        currentQuestion: question
    };

    return submitAnswer({
        session: selectedSession,
        response: prepared.response,
        diagnostic: prepared.diagnostic,
        attemptId,
        startedAt: T1_START,
        submittedAt: T1_END,
        now: T1_END
    });
}

test(
    "21. INFEASIBLE remediation persists a checkpoint-compatible generation stop",
    () => {
        let session = createFreshRemediationSession();
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-STOP-001",
            "1"
        ).session;
        const submitted = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-STOP-002",
            "yes"
        );
        session = submitted.session;

        assert.equal(submitted.flowResult.adaptiveDecision.action, "REMEDIATE");
        assert.equal(submitted.flowResult.remediationGeneration.status, "INFEASIBLE");
        assert.equal(session.activeRemediationPlan, null);
        assert.equal(session.currentSelection, null);
        assert.equal(session.currentQuestion, null);
        assert.equal(session.attempts.length, 2);
        assert.deepEqual(
            session.attempts.map(item => item.attemptId),
            ["ATT-STOP-001", "ATT-STOP-002"]
        );
        assert.equal(session.history.length, 2);
        assert.ok(submitted.flowResult.masteryUpdate);
        assert.equal(
            submitted.flowResult.projection.nodeState.attemptStats.total,
            2
        );
        assert.equal(
            session.extensions.remediationGenerationStop.triggerAttemptId,
            "ATT-STOP-002"
        );
        assert.equal(
            session.extensions.remediationGenerationStop.targetNodeId,
            "K283"
        );
        assert.equal(
            session.extensions.remediationGenerationStop.bankId,
            k283Bank.bankId
        );
        assert.equal(
            session.extensions.remediationGenerationStop.bankVersion,
            k283Bank.version
        );
        assert.equal(
            session.extensions.remediationGenerationStop.reasonCode,
            submitted.flowResult.remediationGeneration.reasonCode
        );
        assert.equal(
            Object.hasOwn(session.extensions, "remediationPolicyErrorStop"),
            false
        );
        assert.match(
            session.extensions.remediationGenerationStop.configFingerprint,
            /^[a-f0-9]{64}$/
        );

        const checkpoint = encodeCheckpoint({
            session: getSessionSnapshot(session),
            contentRefs: {
                questionBank: {
                    id: "K283.question-bank.json",
                    version: k283Bank.version,
                    sha256: "a".repeat(64)
                }
            },
            revision: 1,
            savedAt: T1_END,
            persistedAttemptIds: session.attempts.map(item => item.attemptId)
        });
        assert.deepEqual(
            checkpoint.extensions.remediationGenerationStop,
            session.extensions.remediationGenerationStop
        );
        assert.equal(checkpoint.currentSelection, null);
        assert.equal(checkpoint.currentQuestion, null);
    }
);

test(
    "22. remediation stop fingerprint is deterministic and reflects selector configuration",
    () => {
        function getStopFingerprint(selectorConstraints) {
            let session = createFreshRemediationSession({
                remediationProbeSelectorConstraints: selectorConstraints
            });
            session = submitConfirmedWrongQuestion(
                session,
                "Q-A-K283-A-003",
                "ATT-FINGERPRINT-001",
                "1"
            ).session;
            return submitConfirmedWrongQuestion(
                session,
                "Q-A-K283-A-004",
                "ATT-FINGERPRINT-002",
                "yes"
            ).session.extensions.remediationGenerationStop.configFingerprint;
        }

        const first = getStopFingerprint({});
        const repeated = getStopFingerprint({});
        const changed = getStopFingerprint({ evidenceDimensions: ["apply"] });
        assert.equal(first, repeated);
        assert.notEqual(first, changed);
    }
);

const INVALID_PROBE_AUTHORING_POLICY = {
    schemaVersion: "2.0.0",
    policyId: "probe-authoring-policy",
    policyVersion: "4.2.0",
    failureSignatureDefaults: {
        calculation_error: {
            difficulty: "D3",
            evidenceDimension: "apply",
            questionTypes: ["mcq", "numeric"]
        }
    }
};

function canonicalFingerprintValue(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalFingerprintValue);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value).sort()
                .filter(key => value[key] !== undefined)
                .map(key => [key, canonicalFingerprintValue(value[key])])
        );
    }
    return value;
}

function hashFingerprintInput(input) {
    return createHash("sha256")
        .update(JSON.stringify(canonicalFingerprintValue(input)), "utf8")
        .digest("hex");
}

function makeFingerprintGoldenCase(policy = null, suffix = "GOLDEN") {
    let session = createFreshRemediationSession({
        probeAuthoringPolicy: policy
    });
    session = submitConfirmedWrongQuestion(
        session,
        "Q-A-K283-A-003",
        `ATT-${suffix}-001`,
        "1"
    ).session;
    return submitConfirmedWrongQuestion(
        session,
        "Q-A-K283-A-004",
        `ATT-${suffix}-002`,
        "yes"
    ).session;
}

function captureLegacyFingerprintInputsAtGenerationBoundary(session, questionId) {
    const selectedQuestion = Object.values(session.dependencies.questionBanks)
        .flatMap(bank => bank.questions)
        .find(question => question.id === questionId);
    assert.ok(selectedQuestion, `Missing generation trigger question ${questionId}`);
    const targetNodeId = session.currentDecision.target.primaryNodeId;
    assert.equal(typeof targetNodeId, "string");

    const matchingBanks = Object.values(session.dependencies.questionBanks)
        .filter(bank => bank.primaryNode === targetNodeId);
    assert.equal(matchingBanks.length, 1);
    assert.ok(matchingBanks[0].questions.some(
        question => question.id === selectedQuestion.id
    ));
    const questionBank = structuredClone(matchingBanks[0]);
    const selectorConstraints = structuredClone(
        session.config.remediationProbeSelectorConstraints ?? {}
    );
    const config = structuredClone(session.config);
    const dependencies = structuredClone({
        adaptiveRules: session.dependencies.adaptiveRules,
        adaptivePaths: session.dependencies.adaptivePaths,
        knowledgeMap: session.dependencies.knowledgeMap,
        failureSignatures: session.dependencies.failureSignatures,
        remediationRules: session.dependencies.remediationRules
    });

    return {
        targetNodeId,
        bankIdentity: {
            bankId: questionBank.bankId,
            version: questionBank.version
        },
        fingerprintInput: {
            resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
            targetNodeId,
            bankIdentity: {
                bankId: questionBank.bankId,
                version: questionBank.version
            },
            questionBank,
            selectorConstraints,
            config,
            generationRules: dependencies
        }
    };
}

function policyErrorFingerprintGoldenInput(session, policy, targetNodeId) {
    const questionBank = Object.values(session.dependencies.questionBanks)
        .find(bank => bank.primaryNode === "K283");
    return {
        semanticsVersion: "remediation-policy-error-stop-fingerprint-v1",
        resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
        targetNodeId,
        bankIdentity: {
            bankId: questionBank.bankId,
            version: questionBank.version
        },
        questionBank,
        selectorConstraints: session.config.remediationProbeSelectorConstraints ?? {},
        config: session.config,
        policy,
        generationRules: {
            adaptiveRules: session.dependencies.adaptiveRules,
            adaptivePaths: session.dependencies.adaptivePaths,
            knowledgeMap: session.dependencies.knowledgeMap,
            failureSignatures: session.dependencies.failureSignatures,
            remediationRules: session.dependencies.remediationRules
        }
    };
}

const LEGACY_INFEASIBLE_FINGERPRINT_GOLDEN_INPUT = {
    resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
    targetNodeId: "K283",
    bankIdentity: {
        bankId: "QB-GOLDEN-K283",
        version: "1.0.0"
    },
    questionBank: {
        bankId: "QB-GOLDEN-K283",
        version: "1.0.0",
        primaryNode: "K283",
        questions: [
            { id: "Q-GOLDEN-001", difficulty: "D1" },
            { id: "Q-GOLDEN-002", difficulty: "D2" }
        ]
    },
    selectorConstraints: {
        requiredEvidenceDimension: "concept",
        questionTypes: ["mcq"]
    },
    config: {
        learningMode: "HOC_SAU",
        timeBudget: 60,
        clusterId: "C09",
        contextId: "CTX-K283-GOLDEN",
        historyLimit: 50
    },
    generationRules: {
        adaptiveRules: { schemaVersion: "1.0.0", rules: ["rule-a"] },
        adaptivePaths: { schemaVersion: "1.0.0", paths: ["path-a"] },
        knowledgeMap: { schemaVersion: "1.0.0", nodes: ["K283"] },
        failureSignatures: { schemaVersion: "1.0.0", signatures: ["calculation_error"] },
        remediationRules: { schemaVersion: "1.0.0", rules: ["remediation-a"] }
    }
};

const POLICY_ERROR_FINGERPRINT_GOLDEN_INPUT = {
    semanticsVersion: "remediation-policy-error-stop-fingerprint-v1",
    ...LEGACY_INFEASIBLE_FINGERPRINT_GOLDEN_INPUT,
    policy: INVALID_PROBE_AUTHORING_POLICY
};

test(
    "P4d.3c.1 live INFEASIBLE stop matches independently reconstructed generation-time V1 fingerprint",
    () => {
        let session = createFreshRemediationSession();
        const firstSubmit = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-PARITY-001",
            "1"
        );
        assert.equal(firstSubmit.remediationStopCapture, undefined);
        session = firstSubmit.session;

        const triggerQuestionId = "Q-A-K283-A-004";
        const generationInputs = captureLegacyFingerprintInputsAtGenerationBoundary(
            session,
            triggerQuestionId
        );
        const submitted = submitConfirmedWrongQuestion(
            session,
            triggerQuestionId,
            "ATT-PARITY-002",
            "yes"
        );
        const stop = submitted.session.extensions.remediationGenerationStop;
        const capture = submitted.remediationStopCapture;
        const expectedFingerprint = hashFingerprintInput(
            generationInputs.fingerprintInput
        );

        assert.equal(submitted.flowResult.remediationGeneration.status, "INFEASIBLE");
        assert.equal(stop.status, "INFEASIBLE");
        assert.equal(stop.triggerAttemptId, submitted.attempt.attemptId);
        assert.equal(stop.targetNodeId, generationInputs.targetNodeId);
        assert.equal(stop.bankId, generationInputs.bankIdentity.bankId);
        assert.equal(stop.bankVersion, generationInputs.bankIdentity.version);
        assert.equal(
            stop.reasonCode,
            submitted.flowResult.remediationGeneration.reasonCode
        );
        assert.equal(
            stop.configFingerprint,
            computeLegacyInfeasibleFingerprintV1({
                resolverVersion: generationInputs.fingerprintInput.resolverVersion,
                targetNodeId: generationInputs.targetNodeId,
                bankIdentity: generationInputs.bankIdentity,
                questionBank: generationInputs.fingerprintInput.questionBank,
                selectorConstraints: generationInputs.fingerprintInput.selectorConstraints,
                config: generationInputs.fingerprintInput.config,
                generationRules: generationInputs.fingerprintInput.generationRules
            })
        );
        assert.equal(stop.configFingerprint, expectedFingerprint);
        assert.deepEqual(capture, {
            stopKind: "INFEASIBLE",
            stopFingerprint: stop.configFingerprint,
            targetNodeId: stop.targetNodeId,
            triggerAttemptId: submitted.attempt.attemptId,
            generationInputs: canonicalFingerprintValue(
                generationInputs.fingerprintInput
            )
        });
        assert.equal(Object.hasOwn(submitted.session, "remediationStopCapture"), false);
        assert.equal(
            computeLegacyInfeasibleFingerprintV1(capture.generationInputs),
            capture.stopFingerprint
        );
        assert.ok(Object.isFrozen(capture));
        assert.ok(Object.isFrozen(capture.generationInputs));
        assert.ok(Object.isFrozen(capture.generationInputs.questionBank.questions));
        assert.throws(() => {
            capture.generationInputs.config.timeBudget = 1;
        }, TypeError);
        session.config.timeBudget = 1;
        assert.equal(capture.generationInputs.config.timeBudget, 60);
        assert.equal(submitted.session.currentSelection, null);
        assert.equal(submitted.session.currentQuestion, null);
        assert.deepEqual(
            submitted.session.attempts.map(attempt => attempt.attemptId),
            ["ATT-PARITY-001", "ATT-PARITY-002"]
        );
        assert.deepEqual(submitted.session.attempts[1], submitted.attempt);
        assert.ok(submitted.flowResult.masteryUpdate);
        assert.deepEqual(
            submitted.session.state.knowledge[generationInputs.targetNodeId].mastery,
            submitted.flowResult.projection.nodeState.mastery
        );
        assert.deepEqual(
            submitted.session.state.knowledge[generationInputs.targetNodeId].evidence,
            submitted.flowResult.projection.nodeState.evidence
        );
    }
);

test(
    "P4d.3c golden vector FPV1-INF-K283 preserves legacy INFEASIBLE fingerprint semantics",
    () => {
        const session = makeFingerprintGoldenCase();
        const stop = session.extensions.remediationGenerationStop;
        const input = LEGACY_INFEASIBLE_FINGERPRINT_GOLDEN_INPUT;
        const directDigest = hashFingerprintInput(input);

        assert.equal(stop.status, "INFEASIBLE");
        assert.equal(k283Bank.bankId, "QB-C09-K283-V1");
        assert.equal(k283Bank.version, "1.1.0");
        assert.equal(input.resolverVersion, PROBE_FEASIBILITY_RESOLVER_VERSION);
        assert.equal(
            computeRemediationConfigFingerprint({
                targetNodeId: input.targetNodeId,
                bankIdentity: input.bankIdentity,
                questionBank: input.questionBank,
                selectorConstraints: input.selectorConstraints,
                config: input.config,
                dependencies: {
                    adaptiveRules: input.generationRules.adaptiveRules,
                    adaptivePaths: input.generationRules.adaptivePaths,
                    knowledgeMap: input.generationRules.knowledgeMap,
                    failureSignatures: input.generationRules.failureSignatures,
                    remediationRules: input.generationRules.remediationRules
                }
            }),
            directDigest
        );
        assert.equal(
            directDigest,
            "976366671eb2ca2c45c0a2ec8797103fdca0213a8ab52721e67038043dc6043f"
        );

        const reordered = Object.fromEntries(Object.entries(input).reverse());
        assert.equal(hashFingerprintInput(reordered), directDigest);
        assert.notEqual(
            hashFingerprintInput({
                ...input,
                questionBank: {
                    ...input.questionBank,
                    questions: [...input.questionBank.questions].reverse()
                }
            }),
            directDigest
        );
    }
);

test(
    "P4d.3c golden vector FPV1-POLICY-K283 preserves POLICY_ERROR V1 fingerprint semantics",
    () => {
        const policy = INVALID_PROBE_AUTHORING_POLICY;
        const session = makeFingerprintGoldenCase(policy, "POLICY-GOLDEN");
        const stop = session.extensions.remediationPolicyErrorStop;
        const input = POLICY_ERROR_FINGERPRINT_GOLDEN_INPUT;
        const directDigest = hashFingerprintInput(input);

        assert.equal(stop.status, "POLICY_ERROR");
        assert.equal(stop.policyId, policy.policyId);
        assert.equal(stop.policyVersion, policy.policyVersion);
        assert.match(stop.configFingerprint, /^[a-f0-9]{64}$/);
        assert.equal(
            stop.configFingerprint,
            hashFingerprintInput(
                policyErrorFingerprintGoldenInput(session, policy, stop.targetNodeId)
            )
        );
        assert.equal(
            stop.configFingerprint,
            computePolicyErrorFingerprintV1(
                policyErrorFingerprintGoldenInput(session, policy, stop.targetNodeId)
            )
        );
        assert.equal(
            directDigest,
            "7f895912174c74b59a4d26261f8f1e00aec3a46ba25a620c5c1c5c5ad594c840"
        );

        const reordered = Object.fromEntries(Object.entries(input).reverse());
        assert.equal(hashFingerprintInput(reordered), directDigest);
        const reorderedPolicy = {
            ...policy,
            failureSignatureDefaults: Object.fromEntries(
                Object.entries(policy.failureSignatureDefaults).reverse()
            )
        };
        assert.equal(hashFingerprintInput({ ...input, policy: reorderedPolicy }), directDigest);
        assert.notEqual(
            hashFingerprintInput({
                ...input,
                policy: {
                    ...policy,
                    failureSignatureDefaults: {
                        calculation_error: {
                            ...policy.failureSignatureDefaults.calculation_error,
                            questionTypes: ["numeric", "mcq"]
                        }
                    }
                }
            }),
            directDigest
        );

        const changedPolicyContent = {
            ...policy,
            failureSignatureDefaults: {
                ...policy.failureSignatureDefaults,
                calculation_error: {
                    ...policy.failureSignatureDefaults.calculation_error,
                    difficulty: "D4"
                }
            }
        };
        assert.equal(changedPolicyContent.policyVersion, policy.policyVersion);
        assert.notEqual(
            hashFingerprintInput({ ...input, policy: changedPolicyContent }),
            directDigest
        );
    }
);

test(
    "P4d.2f POLICY_ERROR commits outcomes and persists a fingerprinted error stop",
    () => {
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        const firstSubmit = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-POLICY-ERROR-001",
            "1"
        );
        assert.equal(firstSubmit.remediationStopCapture, undefined);
        session = firstSubmit.session;
        const preSubmitSession = session;
        const submitted = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-POLICY-ERROR-002",
            "yes"
        );
        session = submitted.session;
        const capture = submitted.remediationStopCapture;

        assert.equal(submitted.flowResult.remediationGeneration.status, "POLICY_ERROR");
        assert.equal(submitted.flowResult.remediationGeneration.reasonCode, "UNSUPPORTED_POLICY_VERSION");
        assert.equal(session.activeRemediationPlan, null);
        assert.equal(session.currentSelection, null);
        assert.equal(session.currentQuestion, null);
        assert.equal(session.attempts.length, 2);
        assert.equal(session.history.length, 2);
        assert.ok(submitted.flowResult.masteryUpdate);
        assert.equal(submitted.flowResult.adaptiveDecision.action, "REMEDIATE");
        assert.ok(submitted.attempt.diagnostic.failureSignatureId);
        assert.deepEqual(
            session.attempts.at(-1).diagnostic,
            submitted.attempt.diagnostic
        );

        const stop = getSessionSnapshot(session).extensions.remediationPolicyErrorStop;
        const generationInputs = policyErrorFingerprintGoldenInput(
            session,
            INVALID_PROBE_AUTHORING_POLICY,
            stop.targetNodeId
        );
        delete generationInputs.semanticsVersion;
        assert.deepEqual(stop, {
            schemaVersion: "1.0.0",
            status: "POLICY_ERROR",
            reasonCode: "UNSUPPORTED_POLICY_VERSION",
            triggerAttemptId: "ATT-POLICY-ERROR-002",
            targetNodeId: "K283",
            bankId: k283Bank.bankId,
            bankVersion: k283Bank.version,
            policyId: INVALID_PROBE_AUTHORING_POLICY.policyId,
            policyVersion: INVALID_PROBE_AUTHORING_POLICY.policyVersion,
            configFingerprint: stop.configFingerprint
        });
        assert.deepEqual(capture, {
            stopKind: "POLICY_ERROR",
            stopFingerprint: stop.configFingerprint,
            targetNodeId: stop.targetNodeId,
            triggerAttemptId: submitted.attempt.attemptId,
            generationInputs: canonicalFingerprintValue(generationInputs)
        });
        assert.equal(Object.hasOwn(session, "remediationStopCapture"), false);
        assert.equal(
            computePolicyErrorFingerprintV1(capture.generationInputs),
            capture.stopFingerprint
        );
        assert.ok(Object.isFrozen(capture));
        assert.ok(Object.isFrozen(capture.generationInputs.policy));
        assert.throws(() => {
            capture.generationInputs.policy.policyVersion = "mutated";
        }, TypeError);
        preSubmitSession.dependencies.probeAuthoringPolicy.policyVersion = "mutated";
        assert.equal(
            capture.generationInputs.policy.policyVersion,
            INVALID_PROBE_AUTHORING_POLICY.policyVersion
        );
        assert.match(stop.configFingerprint, /^[a-f0-9]{64}$/);
        assert.equal(
            Object.hasOwn(session.extensions, "remediationGenerationStop"),
            false
        );
        const checkpoint = encodeCheckpoint({
            session: getSessionSnapshot(session),
            contentRefs: {
                questionBank: {
                    id: "K283.question-bank.json",
                    version: k283Bank.version,
                    sha256: "a".repeat(64)
                }
            },
            revision: 1,
            savedAt: T1_END,
            persistedAttemptIds: session.attempts.map(item => item.attemptId)
        });
        assert.deepEqual(
            checkpoint.extensions.remediationPolicyErrorStop,
            stop
        );
        assert.equal(checkpoint.currentSelection, null);
        assert.equal(checkpoint.currentQuestion, null);
    }
);

test(
    "P4d.2f missing policy identity fails closed without losing processed outcomes",
    () => {
        const invalidPolicy = {
            schemaVersion: "2.0.0",
            policyVersion: "4.2.0",
            failureSignatureDefaults: {}
        };
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: invalidPolicy
        });
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-POLICY-MISSING-ID-001",
            "1"
        ).session;
        const submitted = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-POLICY-MISSING-ID-002",
            "yes"
        );
        session = submitted.session;

        assert.equal(submitted.flowResult.remediationGeneration.status, "POLICY_ERROR");
        assert.equal(session.attempts.length, 2);
        assert.equal(session.history.length, 2);
        assert.ok(submitted.flowResult.masteryUpdate);
        assert.equal(session.activeRemediationPlan, null);
        assert.equal(session.currentSelection, null);
        assert.equal(session.currentQuestion, null);
        assert.equal(
            Object.hasOwn(session.extensions ?? {}, "remediationPolicyErrorStop"),
            false
        );

        const selection = getNextQuestion({ session, now: T1_END });
        assert.equal(selection.selection.reasonCode, "REMEDIATION_POLICY_ERROR_STOP");
        assert.equal(selection.question, null);
    }
);

test(
    "P4d.2f effective policy-error stop prevents ordinary question selection",
    () => {
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-POLICY-BLOCK-001",
            "1"
        ).session;
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-POLICY-BLOCK-002",
            "yes"
        ).session;

        const next = getNextQuestion({ session, now: T1_END });
        assert.equal(next.selection.status, "NO_MATCH");
        assert.equal(next.selection.reasonCode, "REMEDIATION_POLICY_ERROR_STOP");
        assert.equal(next.question, null);
        assert.equal(next.session.currentSelection, null);
        assert.equal(next.session.currentQuestion, null);
        assert.equal(
            next.session.extensions.remediationPolicyErrorStop.triggerAttemptId,
            "ATT-POLICY-BLOCK-002"
        );
    }
);

test(
    "P4d.2f changed policy fingerprint permits guarded selection without retrying the old Attempt",
    () => {
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-POLICY-RECOVERY-001",
            "1"
        ).session;
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-POLICY-RECOVERY-002",
            "yes"
        ).session;
        session.dependencies.probeAuthoringPolicy.policyVersion = "4.3.0";

        const next = getNextQuestion({ session, now: T1_END });
        assert.equal(
            next.selection.reasonCode,
            "REMEDIATION_POLICY_ERROR_RETRY_ELIGIBLE"
        );
        assert.equal(next.question, null);
        assert.equal(next.session.currentSelection, null);
        assert.equal(next.session.currentQuestion, null);
        assert.equal(session.attempts.length, 2);
        assert.deepEqual(
            session.attempts.map(item => item.attemptId),
            ["ATT-POLICY-RECOVERY-001", "ATT-POLICY-RECOVERY-002"]
        );
        assert.ok(next.session.extensions.remediationPolicyErrorStop);
    }
);

test(
    "P4d.2f duplicate policy-error trigger cannot replay Attempt or mastery",
    () => {
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-POLICY-DUPLICATE-001",
            "1"
        ).session;
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-POLICY-DUPLICATE-002",
            "yes"
        ).session;
        const before = structuredClone(session);
        const question = k283Bank.questions.find(item => item.id === "Q-A-K283-A-004");
        const selected = {
            ...session,
            currentSelection: {
                status: "SELECTED",
                selected: { questionId: question.id, question }
            },
            currentQuestion: question
        };

        assert.throws(
            () => submitAnswer({
                session: selected,
                response: getWrongOptionId(question),
                attemptId: "ATT-POLICY-DUPLICATE-002",
                startedAt: T1_START,
                submittedAt: T1_END,
                now: T1_END
            }),
            /already processed attempt ID/
        );
        assert.equal(session.attempts.length, before.attempts.length);
        assert.deepEqual(session.state, before.state);
    }
);

test(
    "P4d.2f policy-error stop fingerprint is deterministic and changes with policy",
    () => {
        function stopFingerprint(policy) {
            let session = createFreshRemediationSession({ probeAuthoringPolicy: policy });
            session = submitConfirmedWrongQuestion(
                session,
                "Q-A-K283-A-003",
                "ATT-POLICY-FP-001",
                "1"
            ).session;
            return submitConfirmedWrongQuestion(
                session,
                "Q-A-K283-A-004",
                "ATT-POLICY-FP-002",
                "yes"
            ).session.extensions.remediationPolicyErrorStop.configFingerprint;
        }

        const first = stopFingerprint(INVALID_PROBE_AUTHORING_POLICY);
        const repeated = stopFingerprint(INVALID_PROBE_AUTHORING_POLICY);
        const changed = stopFingerprint({
            ...INVALID_PROBE_AUTHORING_POLICY,
            policyVersion: "4.3.0"
        });
        assert.equal(first, repeated);
        assert.notEqual(first, changed);
    }
);

test(
    "P4d.2f policy and infeasibility stops replace rather than coexist",
    () => {
        let policyErrorSession = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        policyErrorSession.extensions = {
            remediationGenerationStop: {
                schemaVersion: "1.0.0",
                status: "INFEASIBLE",
                reasonCode: "NO_ELIGIBLE_BANK_QUESTION",
                triggerAttemptId: "old-trigger",
                targetNodeId: "K283",
                bankId: k283Bank.bankId,
                bankVersion: k283Bank.version,
                configFingerprint: "a".repeat(64)
            }
        };
        policyErrorSession = submitConfirmedWrongQuestion(
            policyErrorSession,
            "Q-A-K283-A-003",
            "ATT-POLICY-REPLACE-001",
            "1"
        ).session;
        policyErrorSession = submitConfirmedWrongQuestion(
            policyErrorSession,
            "Q-A-K283-A-004",
            "ATT-POLICY-REPLACE-002",
            "yes"
        ).session;
        assert.ok(policyErrorSession.extensions.remediationPolicyErrorStop);
        assert.equal(
            Object.hasOwn(policyErrorSession.extensions, "remediationGenerationStop"),
            false
        );

        let infeasibleSession = createFreshRemediationSession();
        infeasibleSession = submitConfirmedWrongQuestion(
            infeasibleSession,
            "Q-A-K283-A-003",
            "ATT-INFEASIBLE-REPLACE-001",
            "1"
        ).session;
        infeasibleSession.extensions = {
            remediationPolicyErrorStop: {
                schemaVersion: "1.0.0",
                status: "POLICY_ERROR",
                reasonCode: "INVALID_POLICY",
                triggerAttemptId: "old-policy-trigger",
                targetNodeId: "K283",
                bankId: k283Bank.bankId,
                bankVersion: k283Bank.version,
                policyId: "old-policy",
                policyVersion: "1.0.0",
                configFingerprint: "b".repeat(64)
            }
        };
        infeasibleSession = submitConfirmedWrongQuestion(
            infeasibleSession,
            "Q-A-K283-A-004",
            "ATT-INFEASIBLE-REPLACE-002",
            "yes"
        ).session;
        assert.ok(infeasibleSession.extensions.remediationGenerationStop);
        assert.equal(
            Object.hasOwn(infeasibleSession.extensions, "remediationPolicyErrorStop"),
            false
        );
    }
);

test(
    "23. duplicate committed trigger cannot replay Attempt or mastery",
    () => {
        let session = createFreshRemediationSession();
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-DUPLICATE-001",
            "1"
        ).session;
        session = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-004",
            "ATT-DUPLICATE-002",
            "yes"
        ).session;
        const before = structuredClone(session);
        const question = k283Bank.questions.find(
            item => item.id === "Q-A-K283-A-004"
        );
        const selected = {
            ...session,
            currentSelection: {
                status: "SELECTED",
                selected: { questionId: question.id, question }
            },
            currentQuestion: question
        };

        assert.throws(
            () => submitAnswer({
                session: selected,
                response: getWrongOptionId(question),
                attemptId: "ATT-DUPLICATE-002",
                startedAt: T1_START,
                submittedAt: T1_END,
                now: T1_END
            }),
            /already processed attempt ID/
        );
        assert.equal(session.attempts.length, before.attempts.length);
        assert.deepEqual(session.state, before.state);
    }
);

test(
    "24. an existing active remediation plan is preserved",
    () => {
        let session = createFreshRemediationSession({
            probeAuthoringPolicy: INVALID_PROBE_AUTHORING_POLICY
        });
        const existingPlan = {
            remediationId: "ACTIVE-PLAN-PRESERVED",
            probe: { targetNodeId: "K283" }
        };
        session = {
            ...session,
            activeRemediationPlan: existingPlan
        };
        const result = submitConfirmedWrongQuestion(
            session,
            "Q-A-K283-A-003",
            "ATT-ACTIVE-PLAN-001",
            "1"
        );

        assert.deepEqual(result.session.activeRemediationPlan, existingPlan);
        assert.equal(result.remediationStopCapture, undefined);
        assert.equal(
            result.session.extensions?.remediationGenerationStop,
            undefined
        );
        assert.equal(
            result.session.extensions?.remediationPolicyErrorStop,
            undefined
        );
    }
);

test(
    "25. ordinary correct-answer flow does not add a generation stop",
    () => {
        let session = createSession();
        ({ session } = getNextQuestion({
            session,
            now: T1_START
        }));
        const result = submitCorrect({
            session,
            attemptId: "ATT-ORDINARY-CORRECT-001",
            startedAt: T1_START,
            submittedAt: T1_END
        });

        assert.equal(result.evaluation.correct, true);
        assert.equal(result.remediationStopCapture, undefined);
        assert.equal(result.session.activeRemediationPlan, null);
        assert.equal(
            result.session.extensions?.remediationGenerationStop,
            undefined
        );
    }
);
