/**
 * ============================================================
 * studySession.test.js
 * ============================================================
 *
 * StudySession V0.1.0
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
import { fileURLToPath } from "node:url";


import {
    createStudySession,
    getNextQuestion,
    submitAnswer,
    getSessionSnapshot,
    getStudentState,
    STUDY_SESSION_INFO
} from "./studySession.js";


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
        "data/knowledge/knowledge-map-v4.json"
    );


const masteryRules =
    loadJson(
        "data/mastery/rules.json"
    );


const evidenceModel =
    loadJson(
        "data/mastery/evidence.json"
    );


const adaptiveRules =
    loadJson(
        "data/adaptive/rules.json"
    );


const adaptivePaths =
    loadJson(
        "data/adaptive/paths.json"
    );


const failureSignatures =
    loadJson(
        "data/remediation/failure-signatures.json"
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
        "data/questions/c09/K283.question-bank.json"
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
    "1. StudySession exposes V0.1.0 runtime metadata",
    () => {

        assert.equal(
            STUDY_SESSION_INFO.name,
            "StudySession"
        );


        assert.equal(
            STUDY_SESSION_INFO.version,
            "0.1.0"
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
            "0.1.0"
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