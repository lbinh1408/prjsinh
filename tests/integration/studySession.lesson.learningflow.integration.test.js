/**
 * ============================================================
 * studySession.lesson.learningflow.integration.test.js
 * ============================================================
 *
 * StudySession V0.2.0
 * Lesson → Question → Attempt → LearningFlow Integration
 *
 * REAL PRODUCTION COMPONENTS:
 *
 * AdaptiveDecision
 *      ↓
 * StudySession
 *      ↓
 * LessonEngine
 *      ↓
 * lesson-k283-v1
 *      ↓
 * S09 transfer
 *      ↓
 * QuestionSelector
 *      ↓
 * Q-A-K283-T-010
 *      ↓
 * answer = 25
 *      ↓
 * AnswerEvaluator
 *      ↓
 * AttemptBuilder
 *      ↓
 * LearningFlow
 *      ├── Mastery
 *      ├── Adaptive
 *      └── Remediation
 *      ↓
 * StudySession commit
 *      ↓
 * S09 completed
 *      ↓
 * old LessonPlan invalidated
 *      ↓
 * next getNextStudyItem()
 *      ↓
 * LessonPlan rebuilt from NEW AdaptiveDecision
 *
 *
 * IMPORTANT:
 *
 * This suite does NOT assert that one correct answer must
 * promote K283 to M4.
 *
 * Promotion is owned by Mastery Rules and depends on the
 * complete evidence/sufficiency state.
 *
 * This suite verifies orchestration boundaries and runtime
 * continuity instead.
 *
 * ============================================================
 */


import test from "node:test";
import assert from "node:assert/strict";


import {
    createStudySession,
    getNextStudyItem,
    submitAnswer,
    getSessionSnapshot,
    STUDY_SESSION_INFO
} from "../../src/engines/orchestration/studySession.js";


import lessonK283 from
    "../../src/data/lessons/c09/lesson-k283.json"
with { type: "json" };

import questionBankK283 from
    "../../src/data/questions/c09/K283.question-bank.json"
with { type: "json" };

import knowledgeMap from
    "../../src/data/knowledge/knowledge-map-v4.json"
with { type: "json" };

import evidenceModel from
    "../../src/data/mastery/evidence.json"
with { type: "json" };

import masteryRules from
    "../../src/policies/mastery/rules.json"
with { type: "json" };

import adaptiveRules from
    "../../src/policies/adaptive/rules.json"
with { type: "json" };

import adaptivePaths from
    "../../src/policies/adaptive/paths.json"
with { type: "json" };

import failureSignatures from
    "../../src/data/remediation/failure-signatures.json"
with { type: "json" };


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */
const ATTEMPT_ID =
    "ATT-K283-Q010-001";

const FIXED_NOW =
    "2026-10-07T10:00:00.000Z";

const SUBMIT_NOW =
    "2026-10-07T10:05:00.000Z";
const QUESTION_STARTED_AT =
    "2026-10-07T10:04:00.000Z";

const NEXT_NOW =
    "2026-10-07T10:06:00.000Z";

const TARGET_NODE =
    "K283";

const LESSON_ID =
    "lesson-k283-v1";

const TRANSFER_SECTION_ID =
    "S09";

const TRANSFER_QUESTION_ID =
    "Q-A-K283-T-010";


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function deepClone(value) {

    return structuredClone(value);
}


function findQuestion(questionId) {

    return questionBankK283
        .questions
        .find(
            question =>
                question.id === questionId
        );
}


/**
 * ============================================================
 * STUDENT STATE
 * ============================================================
 *
 * K283 begins at recorded M3.
 *
 * We intentionally provide meaningful prior evidence but do
 * NOT force the state to satisfy M4 promotion.
 *
 * The production Mastery Engine + rules remain authoritative.
 */

function makeStudentState() {

    return {

        schemaVersion:
            "1.2.0",

        stateId:
            "STATE-K283-LF-001",

        stateType:
            "student-learning-state",

        updatedAt:
            FIXED_NOW,

        student: {

            studentId:
                "STUDENT-K283-LF"
        },

        learning: {

            currentMode:
                "HOC_SAU",

            session: {

                sessionId:
                    null,

                startedAt:
                    null,

                lastActivityAt:
                    null,

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

                    signals:
                        []
                }
            },

            current: {

                clusterId:
                    null,

                lessonId:
                    null,

                nodeId:
                    null,

                action:
                    null,

                contextId:
                    null
            }
        },

        knowledge: {

            K283: {

                mastery:
                    "M3",

                status:
                    "developing",

                evidence: {

                    know:
                        0.85,

                    explain:
                        0.80,

                    apply:
                        0.75,

                    transfer:
                        0.45
                },

                overallEvidence:
                    0.71,

                confidence:
                    "high",

                evidenceSufficiency: {

                    independentObservations:
                        5,

                    distinctContexts:
                        2,

                    distinctQuestionTypes:
                        1,

                    observedEvidenceTypes: [
                        "know",
                        "explain",
                        "apply"
                    ]
                },

                attemptStats: {

                    total:
                        5,

                    correct:
                        4,

                    wrong:
                        1,

                    partial:
                        0,

                    skipped:
                        0
                },

                weakEvidence: [
                    "transfer"
                ],

                signals:
                    [],

                lastAttemptAt:
                    null,

                lastSuccessAt:
                    null,

                lastFailure:
                    null,

                retest: {

                    attempted:
                        false,

                    lastRetestAt:
                        null,

                    passed:
                        false,

                    differentQuestion:
                        false,

                    differentContext:
                        false,

                    independent:
                        false
                },

                review: {

                    lastReviewedAt:
                        null
                }
            }
        },

        metaSkills:
            {},

        failurePatterns:
            {},

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

            recentActions:
                [],

            recentQuestions:
                []
        },

        progress:
            {},

        preferences:
            {}
    };
}


/**
 * ============================================================
 * INITIAL ADAPTIVE DECISION
 * ============================================================
 *
 * Narrow enough to deterministically select:
 *
 * Q-A-K283-T-010
 *
 * transfer / D4 / numeric / challenge
 */

function makeChallengeDecision() {

    return {

        decisionId:
            "DEC-K283-TRANSFER-D4-001",

        action:
            "CHALLENGE",

        target: {

            primaryNodeId:
                TARGET_NODE,

            nodeIds: [
                TARGET_NODE
            ]
        },

        selectionCriteria: {

            questionTypes: [
                "numeric"
            ],

            difficulty: {

                min:
                    "D4",

                max:
                    "D4",

                preferred:
                    "D4"
            },

            evidenceDimensions: [
                "transfer"
            ],

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

            requireDifferentQuestion:
                false,

            requireDifferentContext:
                false
        },

        path: {

            current:
                "CHALLENGE",

            next:
                null
        },

        reason: {

            codes: [
                "INTEGRATION_TEST_TRANSFER"
            ]
        },

        priority:
            1
    };
}


/**
 * ============================================================
 * SESSION FACTORY
 * ============================================================
 */

function makeSession() {

    return createStudySession({

        sessionId:
            "SESSION-K283-LF-001",

        studentState:
            makeStudentState(),

        initialDecision:
            makeChallengeDecision(),

        questionBanks:
            questionBankK283,

        knowledgeMap,

        masteryRules,

        evidenceModel,

        adaptiveRules,

        adaptivePaths,

        failureSignatures,

        /**
         * There is intentionally no production
         * remediation/rules.json in the current architecture.
         */
        remediationRules:
            {},

        lesson:
            lessonK283,

        learningMode:
            "HOC_SAU",

        timeBudget:
            60,

        clusterId:
            "C09",

        lessonId:
            LESSON_ID,

        contextId:
            "runtime-k283-learningflow",

        history:
            [],

        historyLimit:
            50,

        now:
            FIXED_NOW
    });
}


/**
 * ============================================================
 * NAVIGATION HELPER
 * ============================================================
 *
 * S08 is CHALLENGE-compatible and occurs before S09.
 *
 * We mark S08 complete only to navigate directly to the real
 * transfer section S09.
 *
 * This helper does NOT create evidence or mastery changes.
 */

function navigateToTransferSection(session) {

    const next =
        deepClone(session);


    next.lessonRuntime
        .progress
        .completedSectionIds =
        [
            "S08"
        ];


    return next;
}


/**
 * ============================================================
 * SELECT REAL Q010
 * ============================================================
 */

function selectTransferQuestion(session) {

    const prepared =
        navigateToTransferSection(
            session
        );


    const result =
        getNextStudyItem({

            session:
                prepared,

            now:
                FIXED_NOW
        });


    assert.equal(
        result.status,
        "QUESTION"
    );


    assert.equal(
        result.item.sectionId,
        TRANSFER_SECTION_ID
    );


    assert.equal(
        result.question.id,
        TRANSFER_QUESTION_ID
    );


    return result;
}


/**
 * ============================================================
 * TESTS
 * ============================================================
 */


/**
 * 1
 */
test(
    "1. integration suite targets StudySession V0.2.0",
    () => {

        assert.equal(
            STUDY_SESSION_INFO.version,
            "0.2.0"
        );


        assert.equal(
            STUDY_SESSION_INFO.lessonIntegration,
            true
        );
    }
);


/**
 * 2
 */
test(
    "2. production lesson identity is lesson-k283-v1",
    () => {

        assert.equal(
            lessonK283.id,
            LESSON_ID
        );


        assert.ok(
            lessonK283
                .knowledgeNodes
                .includes(
                    TARGET_NODE
                )
        );
    }
);


/**
 * 3
 */
test(
    "3. production bank contains real Q010",
    () => {

        const question =
            findQuestion(
                TRANSFER_QUESTION_ID
            );


        assert.ok(question);


        assert.equal(
            question.primaryNode,
            TARGET_NODE
        );


        assert.equal(
            question.evidence,
            "transfer"
        );


        assert.equal(
            question.difficulty,
            "D4"
        );


        assert.equal(
            question.questionType,
            "numeric"
        );
    }
);


/**
 * 4
 */
test(
    "4. Q010 production answer is numeric 25",
    () => {

        const question =
            findQuestion(
                TRANSFER_QUESTION_ID
            );


        assert.equal(
            question.answer.type,
            "number"
        );


        assert.equal(
            question.answer.value,
            25
        );


        assert.equal(
            question.answer.tolerance,
            0
        );
    }
);


/**
 * 5
 */
test(
    "5. Q010 provides semantic evidence context",
    () => {

        const question =
            findQuestion(
                TRANSFER_QUESTION_ID
            );


        assert.equal(
            question.context.contextId,
            "c09-k283-transfer-gamete-counts-03"
        );


        assert.equal(
            question.context.contextType,
            "data_table"
        );
    }
);


/**
 * 6
 */
test(
    "6. session is created with all real LearningFlow dependencies",
    () => {

        const session =
            makeSession();


        assert.ok(
            session.dependencies
        );


        assert.ok(
            session.dependencies
                .knowledgeMap
        );


        assert.ok(
            session.dependencies
                .masteryRules
        );


        assert.ok(
            session.dependencies
                .evidenceModel
        );


        assert.ok(
            session.dependencies
                .adaptiveRules
        );


        assert.ok(
            session.dependencies
                .adaptivePaths
        );


        assert.ok(
            session.dependencies
                .failureSignatures
        );


        assert.deepEqual(
            session.dependencies
                .remediationRules,
            {}
        );
    }
);


/**
 * 7
 */
test(
    "7. real CHALLENGE flow reaches S09",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.equal(
            selected.item.sectionId,
            TRANSFER_SECTION_ID
        );


        assert.equal(
            selected.item.sectionType,
            "transfer"
        );
    }
);


/**
 * 8
 */
test(
    "8. S09 delegates concrete selection to QuestionSelector",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.equal(
            selected.selection.status,
            "SELECTED"
        );


        assert.equal(
            selected.question.id,
            TRANSFER_QUESTION_ID
        );


        assert.equal(
            selected.compatibility
                .compatible,
            true
        );
    }
);


/**
 * 9
 */
test(
    "9. selected real question is stored as currentQuestion",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.equal(
            selected.session
                .currentQuestion
                .id,
            TRANSFER_QUESTION_ID
        );


        assert.equal(
            selected.session
                .lessonRuntime
                .currentItem
                .sectionId,
            TRANSFER_SECTION_ID
        );
    }
);


/**
 * 10
 *
 * This is the first full runtime crossing:
 *
 * Q010 → answerEvaluator → attemptBuilder → LearningFlow
 */
test(
    "10. submitting 25 to real Q010 crosses the full LearningFlow",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted
        );


        assert.ok(
            submitted.session
        );


        assert.ok(
            submitted.attempt
        );


        assert.ok(
            submitted.flowResult
        );
    }
);


/**
 * 11
 */
test(
    "11. AnswerEvaluator marks Q010 answer 25 correct",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.attempt
                .result,
            "correct"
        );


        assert.equal(
            submitted.attempt
                .questionId,
            TRANSFER_QUESTION_ID
        );
    }
);


/**
 * 12
 */
test(
    "12. AttemptBuilder preserves Q010 transfer D4 evidence metadata",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.attempt
                .questionId,
            TRANSFER_QUESTION_ID
        );


        assert.equal(
            submitted.attempt
                .evidence
                .difficulty,
            "D4"
        );


        assert.equal(
            submitted.attempt
                .evidence
                .primaryDimension,
            "transfer"
        );
    }
);


/**
 * 13
 *
 * Semantic context must come from the Question, not from the
 * StudySession runtime contextId.
 */
test(
    "13. Mastery runtime receives Q010 semantic context",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,

                attemptId:
                    ATTEMPT_ID,

                response:
                    25,

                startedAt:
                    QUESTION_STARTED_AT,

                submittedAt:
                    SUBMIT_NOW,

                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.session
                .masteryRuntime
        );


        const transferHistory =
            submitted.session
                .masteryRuntime
                .evidenceHistoryByNode
                .K283
                .transfer;


        assert.ok(
            Array.isArray(
                transferHistory
            )
        );


        assert.ok(
            transferHistory.length >= 1
        );


        const latest =
            transferHistory[
            transferHistory.length - 1
            ];


        assert.equal(
            latest.dimension,
            "transfer"
        );


        assert.equal(
            latest.contextId,
            "c09-k283-transfer-gamete-counts-03"
        );


        assert.equal(
            latest.questionType,
            "numeric"
        );


        assert.equal(
            latest.questionId,
            TRANSFER_QUESTION_ID
        );


        assert.equal(
            latest.result,
            "correct"
        );


        assert.equal(
            latest.independent,
            true
        );
    }
);


/**
 * 14
 */
test(
    "14. LearningFlow produces a new AdaptiveDecision",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const oldDecisionId =
            selected.session
                .currentDecision
                .decisionId;


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.flowResult
                .adaptiveDecision
        );


        assert.ok(
            submitted.session
                .currentDecision
        );


        assert.equal(
            submitted.session
                .currentDecision
                .decisionId,
            submitted.flowResult
                .adaptiveDecision
                .decisionId
        );


        /**
         * New runtime decision should not simply be the
         * original externally supplied decision object.
         */
        assert.notEqual(
            submitted.session
                .currentDecision,
            selected.session
                .currentDecision
        );


        assert.equal(
            oldDecisionId,
            "DEC-K283-TRANSFER-D4-001"
        );
    }
);


/**
 * 15
 *
 * We deliberately do NOT assert M4.
 *
 * Mastery Rules remain authoritative.
 */
test(
    "15. StudySession commits the Mastery projection without hardcoding M4",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const before =
            deepClone(
                selected.session
                    .state
                    .knowledge
                    .K283
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        const after =
            submitted.session
                .state
                .knowledge
                .K283;


        assert.ok(after);


        assert.equal(
            typeof after.mastery,
            "string"
        );


        assert.ok(
            [
                "M0",
                "M1",
                "M2",
                "M3",
                "M4"
            ].includes(
                after.mastery
            )
        );


        /**
         * Correct transfer evidence must result in a real
         * LearningFlow commit, but the test does not own the
         * promotion outcome.
         */
        assert.ok(
            submitted.session
                .lastFlowResult
        );


        assert.deepEqual(
            submitted.session
                .lastFlowResult,
            submitted.flowResult
        );


        assert.ok(before);
    }
);


/**
 * 16
 */
test(
    "16. submitAnswer records the real attempt in session runtime",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.session
                .attempts
                .length,
            1
        );


        assert.equal(
            submitted.session
                .attempts[0]
                .questionId,
            TRANSFER_QUESTION_ID
        );


        assert.equal(
            submitted.session
                .attempts[0]
                .result,
            "correct"
        );
    }
);


/**
 * 17
 *
 * Critical Lesson integration behavior:
 *
 * A question_set section is completed through submitAnswer,
 * never completeLessonItem().
 */
test(
    "17. submitAnswer completes real lesson section S09",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.equal(
            selected.session
                .lessonRuntime
                .currentItem
                .sectionId,
            TRANSFER_SECTION_ID
        );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.session
                .lessonRuntime
                .progress
                .completedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                )
        );
    }
);


/**
 * 18
 */
test(
    "18. completed S09 is removed from skipped lesson progress",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const prepared =
            deepClone(
                selected.session
            );


        prepared.lessonRuntime
            .progress
            .skippedSectionIds
            .push(
                TRANSFER_SECTION_ID
            );


        const submitted =
            submitAnswer({

                session:
                    prepared,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.session
                .lessonRuntime
                .progress
                .completedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                )
        );


        assert.equal(
            submitted.session
                .lessonRuntime
                .progress
                .skippedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                ),
            false
        );
    }
);


/**
 * 19
 *
 * DESIGN-006 core assertion.
 *
 * Old plan was projected from old AdaptiveDecision.
 * It must not survive the LearningFlow decision transition.
 */
test(
    "19. submitAnswer invalidates the old Lesson plan",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.ok(
            selected.session
                .lessonRuntime
                .plan
        );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.session
                .lessonRuntime
                .plan,
            null
        );


        assert.equal(
            submitted.session
                .lessonRuntime
                .currentItem,
            null
        );
    }
);


/**
 * 20
 */
test(
    "20. submitAnswer clears concrete question selection after LearningFlow",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        assert.ok(
            selected.session
                .currentQuestion
        );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,
                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.session
                .currentQuestion,
            null
        );


        assert.equal(
            submitted.session
                .currentSelection,
            null
        );
    }
);


/**
 * 21
 *
 * After invalidation, getNextStudyItem() must create a fresh
 * LessonEngine projection.
 */
test(
    "21. next study item rebuilds Lesson plan after LearningFlow",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submitted.session
                .lessonRuntime
                .plan,
            null
        );


        const next =
            getNextStudyItem({

                session:
                    submitted.session,

                now:
                    NEXT_NOW
            });


        assert.ok(
            next.session
                .lessonRuntime
                .plan
        );
    }
);


/**
 * 22
 *
 * The rebuilt plan must use the NEW AdaptiveDecision.
 */
test(
    "22. rebuilt Lesson plan is projected from the new AdaptiveDecision",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        const newAction =
            submitted.session
                .currentDecision
                .action;


        const next =
            getNextStudyItem({

                session:
                    submitted.session,

                now:
                    NEXT_NOW
            });


        assert.equal(
            next.session
                .lessonRuntime
                .plan
                .adaptiveContext
                .action,
            newAction
        );
    }
);


/**
 * 23
 *
 * Progress survives plan invalidation/reprojection.
 */
test(
    "23. S09 completion survives Lesson plan rebuild",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.session
                .lessonRuntime
                .progress
                .completedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                )
        );


        const next =
            getNextStudyItem({

                session:
                    submitted.session,

                now:
                    NEXT_NOW
            });


        assert.ok(
            next.session
                .lessonRuntime
                .progress
                .completedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                )
        );
    }
);


/**
 * 24
 *
 * Reprojection must not send the learner back to the exact
 * completed S09 section.
 *
 * It may legitimately return:
 *
 * - CONTENT
 * - QUESTION
 * - PLAN_COMPLETE
 * - SKIPPED
 * - NO_DELIVERY_MATCH
 * - QUESTION_NO_MATCH
 * - QUESTION_NOT_REQUIRED
 *
 * depending on the production AdaptiveDecision.
 */
test(
    "24. rebuilt lesson flow does not redeliver completed S09",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        const next =
            getNextStudyItem({

                session:
                    submitted.session,

                now:
                    NEXT_NOW
            });


        if (next.item) {

            assert.notEqual(
                next.item.sectionId,
                TRANSFER_SECTION_ID
            );
        }
    }
);


/**
 * 25
 *
 * The runtime session context and semantic evidence context
 * remain separate concepts.
 */
test(
    "25. runtime context does not replace Q010 semantic evidence context",
    () => {

        const session =
            makeSession();


        assert.equal(
            session.config.contextId,
            "runtime-k283-learningflow"
        );


        const selected =
            selectTransferQuestion(
                session
            );


        assert.equal(
            selected.question
                .context
                .contextId,
            "c09-k283-transfer-gamete-counts-03"
        );


        const submitted =
            submitAnswer({

                session:
                    selected.session,

                attemptId:
                    ATTEMPT_ID,

                response:
                    25,

                startedAt:
                    QUESTION_STARTED_AT,

                submittedAt:
                    SUBMIT_NOW,

                now:
                    SUBMIT_NOW
            });


        const transferHistory =
            submitted.session
                .masteryRuntime
                .evidenceHistoryByNode
                .K283
                .transfer;


        assert.ok(
            Array.isArray(
                transferHistory
            )
        );


        assert.ok(
            transferHistory.length >= 1
        );


        const latest =
            transferHistory[
            transferHistory.length - 1
            ];


        assert.equal(
            latest.contextId,
            "c09-k283-transfer-gamete-counts-03"
        );


        assert.equal(
            latest.questionType,
            "numeric"
        );


        assert.notEqual(
            latest.contextId,
            "runtime-k283-learningflow"
        );
    }
);


/**
 * 26
 */
test(
    "26. submitAnswer does not mutate caller-owned selected session",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const before =
            deepClone(
                selected.session
            );


        submitAnswer({

            session:
                selected.session,
            attemptId:
                ATTEMPT_ID,

            response:
                25,
            startedAt:
                QUESTION_STARTED_AT,
            submittedAt: SUBMIT_NOW,
            now:
                SUBMIT_NOW
        });


        assert.deepEqual(
            selected.session,
            before
        );
    }
);


/**
 * 27
 */
test(
    "27. original production lesson and question bank remain immutable",
    () => {

        const lessonBefore =
            deepClone(
                lessonK283
            );


        const bankBefore =
            deepClone(
                questionBankK283
            );


        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        submitAnswer({

            session:
                selected.session,
            attemptId:
                ATTEMPT_ID,

            response:
                25,
            startedAt:
                QUESTION_STARTED_AT,
            submittedAt: SUBMIT_NOW,
            now:
                SUBMIT_NOW
        });


        assert.deepEqual(
            lessonK283,
            lessonBefore
        );


        assert.deepEqual(
            questionBankK283,
            bankBefore
        );
    }
);


/**
 * 28
 */
test(
    "28. full correct-answer flow is deterministic for fixed input and time",
    () => {

        const sessionA =
            makeSession();


        const selectedA =
            selectTransferQuestion(
                sessionA
            );


        const submittedA =
            submitAnswer({

                session:
                    selectedA.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        const sessionB =
            makeSession();


        const selectedB =
            selectTransferQuestion(
                sessionB
            );


        const submittedB =
            submitAnswer({

                session:
                    selectedB.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.equal(
            submittedA.attempt
                .questionId,
            submittedB.attempt
                .questionId
        );


        assert.equal(
            submittedA.attempt
                .result,
            submittedB.attempt
                .result
        );


        assert.equal(
            submittedA.session
                .currentDecision
                .action,
            submittedB.session
                .currentDecision
                .action
        );


        assert.deepEqual(
            submittedA.session
                .lessonRuntime
                .progress,
            submittedB.session
                .lessonRuntime
                .progress
        );
    }
);


/**
 * 29
 *
 * Snapshot after the full flow must expose the committed
 * runtime without sharing references.
 */
test(
    "29. session snapshot reflects committed Lesson + LearningFlow runtime safely",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        const snapshot =
            getSessionSnapshot(
                submitted.session
            );


        assert.deepEqual(
            snapshot.lessonRuntime,
            submitted.session
                .lessonRuntime
        );


        assert.notEqual(
            snapshot.lessonRuntime,
            submitted.session
                .lessonRuntime
        );


        assert.deepEqual(
            snapshot.currentDecision,
            submitted.session
                .currentDecision
        );


        assert.notEqual(
            snapshot.currentDecision,
            submitted.session
                .currentDecision
        );
    }
);


/**
 * 30
 *
 * Final architectural ownership assertion.
 *
 * Lesson completion is tracked by StudySession.
 * Mastery outcome is produced by LearningFlow.
 * AdaptiveDecision is produced by Adaptive.
 *
 * The rebuilt Lesson plan only projects that decision.
 */
test(
    "30. full pipeline preserves ownership boundaries after reprojection",
    () => {

        const session =
            makeSession();


        const selected =
            selectTransferQuestion(
                session
            );


        const submitted =
            submitAnswer({

                session:
                    selected.session,
                attemptId:
                    ATTEMPT_ID,

                response:
                    25,
                startedAt:
                    QUESTION_STARTED_AT,
                submittedAt: SUBMIT_NOW,
                now:
                    SUBMIT_NOW
            });


        assert.ok(
            submitted.flowResult
        );


        assert.ok(
            submitted.flowResult
                .adaptiveDecision
        );


        assert.deepEqual(
            submitted.session
                .currentDecision,
            submitted.flowResult
                .adaptiveDecision
        );


        assert.ok(
            submitted.session
                .lessonRuntime
                .progress
                .completedSectionIds
                .includes(
                    TRANSFER_SECTION_ID
                )
        );


        assert.equal(
            submitted.session
                .lessonRuntime
                .plan,
            null
        );


        const next =
            getNextStudyItem({

                session:
                    submitted.session,

                now:
                    NEXT_NOW
            });


        assert.equal(
            next.session
                .lessonRuntime
                .plan
                .adaptiveContext
                .action,
            submitted.flowResult
                .adaptiveDecision
                .action
        );


        /**
         * Lesson plan remains delivery projection only.
         */
        assert.equal(
            Object.hasOwn(
                next.session
                    .lessonRuntime
                    .plan,
                "masteryUpdate"
            ),
            false
        );


        assert.equal(
            Object.hasOwn(
                next.session
                    .lessonRuntime
                    .plan,
                "newMasteryLevel"
            ),
            false
        );


        assert.equal(
            Object.hasOwn(
                next.session
                    .lessonRuntime
                    .plan,
                "failureDiagnosis"
            ),
            false
        );


        assert.equal(
            Object.hasOwn(
                next.session
                    .lessonRuntime
                    .plan,
                "remediationStrategy"
            ),
            false
        );
    }
);