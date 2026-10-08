/**
 * ============================================================
 * studySession.lesson.realcontent.test.js
 * ============================================================
 *
 * StudySession V0.2.0
 * Real Content Integration — K283
 *
 * REAL:
 *
 * - lesson-k283.json
 * - K283.question-bank.json
 * - LessonEngine
 * - QuestionSelector
 * - StudySession
 *
 * NO MOCKS.
 *
 * Scope:
 *
 * AdaptiveDecision
 *      ↓
 * StudySession
 *      ↓
 * LessonEngine
 *      ↓
 * lesson-k283 real sections
 *      ↓
 * questionRequest
 *      ↓
 * QuestionSelector
 *      ↓
 * K283 real question bank
 *
 * ============================================================
 */


import test from "node:test";
import assert from "node:assert/strict";

import {
    createStudySession,
    getNextStudyItem,
    completeLessonItem,
    getNextQuestion,
    getSessionSnapshot,
    STUDY_SESSION_INFO
} from "../../src/engines/orchestration/studySession.js";

import lessonK283 from
    "../../src/data/lessons/c09/lesson-k283.json"
with { type: "json" };

import questionBankK283 from
    "../../src/data/questions/c09/K283.question-bank.json"
with { type: "json" };


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const FIXED_NOW =
    "2026-10-07T10:00:00.000Z";

const TARGET_NODE =
    "K283";

const TRANSFER_QUESTION_ID =
    "Q-A-K283-T-010";


/**
 * ============================================================
 * FIXTURES
 * ============================================================
 */

function makeStudentState() {

    return {

        schemaVersion:
            "1.2.0",

        stateId:
            "STATE-K283-REAL-001",

        stateType:
            "student-learning-state",

        updatedAt:
            FIXED_NOW,

        student: {
            studentId:
                "STUDENT-K283-REAL"
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
                    consecutiveWrong: 0,
                    consecutiveSkip: 0,
                    consecutiveRemediation: 0
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
                    know: 0.85,
                    explain: 0.8,
                    apply: 0.75,
                    transfer: 0.4
                },

                overallEvidence:
                    0.7,

                confidence:
                    "high",

                evidenceSufficiency: {
                    independentObservations: 5,
                    distinctContexts: 2,
                    distinctQuestionTypes: 1,
                    observedEvidenceTypes: [
                        "know",
                        "explain",
                        "apply"
                    ]
                },

                attemptStats: {
                    total: 5,
                    correct: 4,
                    wrong: 1,
                    partial: 0,
                    skipped: 0
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
                    attempted: false,
                    lastRetestAt: null,
                    passed: false,
                    differentQuestion: false,
                    differentContext: false,
                    independent: false
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
 * Build a canonical AdaptiveDecision suitable for
 * QuestionSelector + StudySession.
 */
function makeDecision({

    action,

    evidenceDimensions = [],

    minDifficulty = "D1",

    maxDifficulty = "D5",

    preferredDifficulty =
    minDifficulty,

    questionTypes = [],

    excludeQuestionIds = [],

    requireDifferentQuestion =
    false,

    requireDifferentContext =
    false,

    requireIndependentEvidence =
    false

}) {

    return {

        decisionId:
            `DEC-K283-${action}`,

        action,

        target: {

            primaryNodeId:
                TARGET_NODE,

            nodeIds: [
                TARGET_NODE
            ]
        },

        selectionCriteria: {

            questionTypes,

            difficulty: {
                min:
                    minDifficulty,
                max:
                    maxDifficulty,
                preferred:
                    preferredDifficulty
            },

            evidenceDimensions,

            excludeQuestionIds,

            requireDifferentQuestion,

            requireDifferentContext,

            requireIndependentEvidence,

            metaSkills:
                [],

            secondaryNodes:
                [],

            failureSignatures:
                []
        },

        constraints: {
            requireDifferentQuestion,
            requireDifferentContext
        },

        path: {
            current:
                action,
            next:
                null
        },

        reason: {
            codes: [
                "REAL_CONTENT_TEST"
            ]
        },

        priority:
            1
    };
}


function makeSession({

    action,

    evidenceDimensions = [],

    minDifficulty = "D1",

    maxDifficulty = "D5",

    preferredDifficulty =
    minDifficulty,

    questionTypes = [],

    excludeQuestionIds = []

}) {

    return createStudySession({

        sessionId:
            `SESSION-K283-${action}`,

        studentState:
            makeStudentState(),

        initialDecision:
            makeDecision({
                action,
                evidenceDimensions,
                minDifficulty,
                maxDifficulty,
                preferredDifficulty,
                questionTypes,
                excludeQuestionIds
            }),

        questionBanks:
            questionBankK283,

        lesson:
            lessonK283,

        learningMode:
            "HOC_SAU",

        clusterId:
            "C09",

        lessonId:
            lessonK283.id,

        history:
            [],

        now:
            FIXED_NOW
    });
}


/**
 * Mark lesson sections as completed without changing
 * mastery/evidence.
 *
 * Used only to navigate to a specific real section.
 */
function withCompletedSections(
    session,
    sectionIds
) {

    const next =
        structuredClone(
            session
        );

    next.lessonRuntime
        .progress
        .completedSectionIds =
        [
            ...sectionIds
        ];

    return next;
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
    "1. real-content suite runs against StudySession V0.2.0",
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
    "2. real lesson is lesson-k283 and targets K283",
    () => {

        assert.equal(
            lessonK283.id,
            "lesson-k283-v1"
        );

        assert.ok(
            Array.isArray(
                lessonK283.knowledgeNodes
            )
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
    "3. real K283 bank contains production questions",
    () => {

        assert.ok(
            Array.isArray(
                questionBankK283.questions
            )
        );

        assert.ok(
            questionBankK283
                .questions
                .length >= 10
        );
    }
);


/**
 * 4
 */
test(
    "4. real bank contains Q010 transfer question",
    () => {

        const question =
            questionBankK283
                .questions
                .find(
                    q =>
                        q.id ===
                        TRANSFER_QUESTION_ID
                );

        assert.ok(
            question,
            `${TRANSFER_QUESTION_ID} must exist`
        );

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
 * 5
 */
test(
    "5. Q010 production answer remains 25 percent",
    () => {

        const question =
            questionBankK283
                .questions
                .find(
                    q =>
                        q.id ===
                        TRANSFER_QUESTION_ID
                );

        assert.ok(question);

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
 * 6
 */
test(
    "6. Q010 carries a semantic evidence context",
    () => {

        const question =
            questionBankK283
                .questions
                .find(
                    q =>
                        q.id ===
                        TRANSFER_QUESTION_ID
                );

        assert.ok(
            question.context
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
 * 7
 */
test(
    "7. LEARN builds a real lesson delivery plan",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });

        const result =
            getNextStudyItem({
                session
            });

        assert.equal(
            result.status,
            "CONTENT"
        );

        assert.ok(
            result.plan
        );

        assert.equal(
            result.plan.lessonId,
            lessonK283.id
        );

        assert.equal(
            result.plan
                .adaptiveContext
                .action,
            "LEARN"
        );

        assert.equal(
            result.plan
                .adaptiveContext
                .targetNodeId,
            TARGET_NODE
        );
    }
);


/**
 * 8
 */
test(
    "8. LEARN starts at real section S01",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });

        const result =
            getNextStudyItem({
                session
            });

        assert.equal(
            result.status,
            "CONTENT"
        );

        assert.equal(
            result.item.sectionId,
            "S01"
        );
    }
);


/**
 * 9
 */
test(
    "9. completing real S01 advances lesson delivery",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });

        const first =
            getNextStudyItem({
                session
            });

        assert.equal(
            first.item.sectionId,
            "S01"
        );

        const completed =
            completeLessonItem({
                session:
                    first.session
            });

        const next =
            getNextStudyItem({
                session:
                    completed.session
            });

        assert.notEqual(
            next.item?.sectionId,
            "S01"
        );

        assert.ok(
            completed.progress
                .completedSectionIds
                .includes(
                    "S01"
                )
        );
    }
);


/**
 * 10
 */
test(
    "10. content completion does not alter K283 mastery",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });

        const before =
            structuredClone(
                session
                    .state
                    .knowledge
                    .K283
            );

        const first =
            getNextStudyItem({
                session
            });

        const completed =
            completeLessonItem({
                session:
                    first.session
            });

        assert.deepEqual(
            completed
                .session
                .state
                .knowledge
                .K283,
            before
        );

        assert.equal(
            completed
                .session
                .attempts
                .length,
            0
        );
    }
);


/**
 * 11
 */
test(
    "11. CHALLENGE plan uses the real lesson without changing Adaptive action",
    () => {

        const session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });

        const result =
            getNextStudyItem({
                session
            });

        assert.equal(
            result.plan
                .adaptiveContext
                .action,
            "CHALLENGE"
        );

        assert.equal(
            result.session
                .currentDecision
                .action,
            "CHALLENGE"
        );
    }
);


/**
 * 12
 *
 * Real lesson S09 is the transfer section.
 *
 * Earlier CHALLENGE-compatible sections are marked completed
 * only to navigate to S09. This does not update mastery.
 */
test(
    "12. real CHALLENGE flow reaches S09 transfer",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.item.sectionId,
            "S09"
        );

        assert.equal(
            result.item.sectionType,
            "transfer"
        );
    }
);


/**
 * 13
 */
test(
    "13. real S09 exposes declarative transfer questionRequest",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.item.sectionId,
            "S09"
        );

        assert.ok(
            result.item.questionRequest
        );

        assert.equal(
            result.item
                .questionRequest
                .primaryNode,
            TARGET_NODE
        );

        assert.ok(
            result.item
                .questionRequest
                .evidence
                .includes(
                    "transfer"
                )
        );

        assert.ok(
            result.item
                .questionRequest
                .difficulty
                .includes(
                    "D4"
                )
        );
    }
);


/**
 * 14
 */
test(
    "14. QuestionSelector selects real Q010 for transfer D4 numeric challenge",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.status,
            "QUESTION"
        );

        assert.equal(
            result.selection.status,
            "SELECTED"
        );

        assert.equal(
            result.question.id,
            TRANSFER_QUESTION_ID
        );
    }
);


/**
 * 15
 */
test(
    "15. real Q010 is compatible with real S09 delivery constraints",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.question.id,
            TRANSFER_QUESTION_ID
        );

        assert.equal(
            result.compatibility.compatible,
            true
        );

        assert.deepEqual(
            result.compatibility.reasons,
            []
        );
    }
);


/**
 * 16
 */
test(
    "16. StudySession does not hardcode Q010 into lesson delivery",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        const serializedItem =
            JSON.stringify(
                result.item
            );


        assert.equal(
            serializedItem.includes(
                TRANSFER_QUESTION_ID
            ),
            false
        );

        assert.equal(
            result.question.id,
            TRANSFER_QUESTION_ID
        );
    }
);


/**
 * 17
 */
test(
    "17. real lesson questionRequest does not mutate Adaptive selectionCriteria",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const before =
            structuredClone(
                session.currentDecision
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.deepEqual(
            result.session
                .currentDecision,
            before
        );
    }
);


/**
 * 18
 */
test(
    "18. real Q010 semantic context remains question-owned",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.question
                .context
                .contextId,
            "c09-k283-transfer-gamete-counts-03"
        );

        assert.equal(
            result.question
                .context
                .contextType,
            "data_table"
        );
    }
);


/**
 * 19
 */
test(
    "19. real-content selection remains deterministic",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const first =
            getNextStudyItem({

                session,

                now:
                    FIXED_NOW
            });


        const second =
            getNextStudyItem({

                session,

                now:
                    FIXED_NOW
            });


        assert.equal(
            first.question.id,
            TRANSFER_QUESTION_ID
        );

        assert.deepEqual(
            first,
            second
        );
    }
);


/**
 * 20
 */
test(
    "20. real-content getNextStudyItem does not mutate input session",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const before =
            structuredClone(
                session
            );


        getNextStudyItem({
            session
        });


        assert.deepEqual(
            session,
            before
        );
    }
);


/**
 * 21
 */
test(
    "21. real-content snapshot preserves lesson runtime safely",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        const snapshot =
            getSessionSnapshot(
                result.session
            );


        assert.deepEqual(
            snapshot.lessonRuntime,
            result.session.lessonRuntime
        );

        assert.notEqual(
            snapshot.lessonRuntime,
            result.session.lessonRuntime
        );
    }
);


/**
 * 22
 *
 * Legacy question-only entry point remains usable even when a
 * lesson is attached.
 */
test(
    "22. legacy getNextQuestion can select Q010 from the real bank",
    () => {

        const session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        const result =
            getNextQuestion({

                session,

                now:
                    FIXED_NOW
            });


        assert.equal(
            result.selection.status,
            "SELECTED"
        );

        assert.equal(
            result.question.id,
            TRANSFER_QUESTION_ID
        );
    }
);


/**
 * 23
 *
 * Lesson progress is delivery state only.
 */
test(
    "23. navigating directly to real S09 does not promote mastery",
    () => {

        let session =
            makeSession({

                action:
                    "CHALLENGE",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                questionTypes: [
                    "numeric"
                ]
            });


        const masteryBefore =
            session
                .state
                .knowledge
                .K283
                .mastery;


        session =
            withCompletedSections(
                session,
                [
                    "S08"
                ]
            );


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.question.id,
            TRANSFER_QUESTION_ID
        );

        assert.equal(
            result.session
                .state
                .knowledge
                .K283
                .mastery,
            masteryBefore
        );

        assert.equal(
            result.session
                .attempts
                .length,
            0
        );
    }
);