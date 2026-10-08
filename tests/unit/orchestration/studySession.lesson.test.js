/**
 * ============================================================
 * studySession.lesson.test.js
 * ============================================================
 *
 * StudySession V0.2.0
 * LessonEngine Integration Contract Tests
 *
 * Scope:
 *
 * AdaptiveDecision
 *      ↓
 * StudySession
 *      ↓
 * LessonEngine
 *      ↓
 * Study Item
 *      ├── CONTENT
 *      └── QUESTION
 *              ↓
 *       QuestionSelector
 *
 *
 * These tests verify StudySession orchestration only.
 *
 * They do NOT re-test:
 *
 * - LessonEngine projection internals
 * - QuestionSelector ranking internals
 * - Mastery calculations
 * - Adaptive decision calculations
 * - Remediation diagnosis
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
} from "../../../src/engines/orchestration/studySession.js";


/**
 * ============================================================
 * FIXTURES
 * ============================================================
 */


/**
 * Minimal canonical Student State V1.2.0 fixture.
 *
 * StudySession only requires the pieces relevant to runtime
 * orchestration for these tests.
 */
function makeStudentState() {

    return {

        schemaVersion:
            "1.2.0",

        stateId:
            "STATE-TEST-001",

        stateType:
            "student-learning-state",

        updatedAt:
            "2026-10-07T10:00:00.000Z",

        student: {

            studentId:
                "STUDENT-001"
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
                    30,

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
                    "M2",

                status:
                    "developing",

                evidence: {

                    know:
                        0.8,

                    explain:
                        0.7,

                    apply:
                        0.5,

                    transfer:
                        0.2
                },

                overallEvidence:
                    0.55,

                confidence:
                    "medium",

                evidenceSufficiency: {

                    independentObservations:
                        3,

                    distinctContexts:
                        1,

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
                        3,

                    correct:
                        2,

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
 * AdaptiveDecision fixture compatible with both StudySession
 * and QuestionSelector.
 */
function makeDecision({

    action = "LEARN",

    decisionId =
    `DEC-${action}-001`,

    targetNodeId =
    "K283",

    evidenceDimensions =
    [],

    minDifficulty =
    "D1",

    maxDifficulty =
    "D4",

    preferredDifficulty =
    minDifficulty,

    questionTypes =
    [],

    excludeQuestionIds =
    [],

    requireDifferentQuestion =
    false,

    requireDifferentContext =
    false,

    requireIndependentEvidence =
    false

} = {}) {

    return {

        decisionId,

        action,

        target: {

            primaryNodeId:
                targetNodeId,

            nodeIds: [
                targetNodeId
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

            requireDifferentContext,

            requireDifferentQuestion
        },

        path: {

            current:
                action,

            next:
                null
        },

        reason: {

            codes: [
                "TEST_DECISION"
            ]
        },

        priority:
            1
    };
}


/**
 * Lesson fixture intentionally contains:
 *
 * S01 concept
 * S02 guidedPractice question_set
 * S03 apply question_set
 * S04 transfer question_set
 * S05 summary
 *
 * This allows us to exercise LEARN / PRACTICE / CHALLENGE.
 */
function makeLesson() {

    return {

        id:
            "lesson-k283-test",

        version:
            "1.0.0",

        title:
            "Hoán vị gen — Test Lesson",

        type:
            "concept",

        deliveryModes: [
            "HOC_NHANH",
            "HOC_SAU",
            "ON_THI"
        ],

        knowledgeNodes: [
            "K283"
        ],

        primaryNodes: [
            "K283"
        ],

        prerequisites: [
            "K282"
        ],

        sections: [

            {
                id:
                    "S01",

                type:
                    "concept",

                nodes: [
                    "K283"
                ],

                title:
                    "Khái niệm"
            },


            {
                id:
                    "S02",

                type:
                    "guidedPractice",

                nodes: [
                    "K283"
                ],

                title:
                    "Luyện tập có hướng dẫn",

                questionSet: {

                    selection: {

                        primaryNode:
                            "K283",

                        evidence: [
                            "know",
                            "explain"
                        ],

                        difficulty: [
                            "D1",
                            "D2"
                        ],

                        mode: [
                            "learning",
                            "diagnostic"
                        ],

                        count:
                            1
                    }
                }
            },


            {
                id:
                    "S03",

                type:
                    "apply",

                nodes: [
                    "K283"
                ],

                title:
                    "Vận dụng",

                questionSet: {

                    selection: {

                        primaryNode:
                            "K283",

                        evidence: [
                            "apply"
                        ],

                        difficulty: [
                            "D3"
                        ],

                        mode: [
                            "practice",
                            "challenge"
                        ],

                        count:
                            1
                    }
                }
            },


            {
                id:
                    "S04",

                type:
                    "transfer",

                nodes: [
                    "K283"
                ],

                title:
                    "Chuyển giao",

                questionSet: {

                    selection: {

                        primaryNode:
                            "K283",

                        evidence: [
                            "transfer"
                        ],

                        difficulty: [
                            "D4"
                        ],

                        mode: [
                            "challenge",
                            "retest"
                        ],

                        count:
                            1
                    }
                }
            },


            {
                id:
                    "S05",

                type:
                    "summary",

                nodes: [
                    "K283"
                ],

                title:
                    "Tổng kết"
            }
        ]
    };
}


/**
 * Questions intentionally align with lesson delivery
 * constraints.
 */
function makeQuestionBank() {

    return {

        bankId:
            "QB-K283-TEST",

        questions: [

            {
                id:
                    "Q-K283-KNOW-001",

                version:
                    "1.0.0",

                nodes: [
                    "K283"
                ],

                primaryNode:
                    "K283",

                secondaryNodes:
                    [],

                evidence:
                    "know",

                difficulty:
                    "D1",

                questionType:
                    "mcq",

                mode: [
                    "learning",
                    "diagnostic"
                ],

                prerequisites:
                    [],

                skills:
                    [],

                content: {

                    stem:
                        "Câu hỏi know",

                    options: [

                        {
                            id:
                                "A",

                            text:
                                "A",

                            isCorrect:
                                true
                        },

                        {
                            id:
                                "B",

                            text:
                                "B",

                            isCorrect:
                                false
                        }
                    ]
                }
            },


            {
                id:
                    "Q-K283-APPLY-001",

                version:
                    "1.0.0",

                nodes: [
                    "K283"
                ],

                primaryNode:
                    "K283",

                secondaryNodes:
                    [],

                evidence:
                    "apply",

                difficulty:
                    "D3",

                questionType:
                    "mcq",

                mode: [
                    "practice",
                    "challenge"
                ],

                prerequisites:
                    [],

                skills:
                    [],

                context: {

                    contextId:
                        "ctx-k283-apply-001",

                    contextType:
                        "biological_scenario"
                },

                content: {

                    stem:
                        "Câu hỏi apply",

                    options: [

                        {
                            id:
                                "A",

                            text:
                                "A",

                            isCorrect:
                                true
                        },

                        {
                            id:
                                "B",

                            text:
                                "B",

                            isCorrect:
                                false
                        }
                    ]
                }
            },


            {
                id:
                    "Q-K283-TRANSFER-001",

                version:
                    "1.0.0",

                nodes: [
                    "K283"
                ],

                primaryNode:
                    "K283",

                secondaryNodes:
                    [],

                evidence:
                    "transfer",

                difficulty:
                    "D4",

                questionType:
                    "numeric",

                mode: [
                    "challenge",
                    "retest"
                ],

                prerequisites:
                    [],

                skills:
                    [],

                context: {

                    contextId:
                        "ctx-k283-transfer-001",

                    contextType:
                        "data_table"
                },

                content: {

                    stem:
                        "Tính tần số hoán vị gen."
                },

                answer: {

                    type:
                        "number",

                    value:
                        25,

                    tolerance:
                        0
                }
            }
        ]
    };
}


/**
 * Question that Adaptive can select but the Lesson section
 * rejects.
 */
function makeMismatchQuestionBank() {

    return {

        bankId:
            "QB-K283-MISMATCH",

        questions: [

            {
                id:
                    "Q-K283-MISMATCH-001",

                version:
                    "1.0.0",

                nodes: [
                    "K283"
                ],

                primaryNode:
                    "K283",

                secondaryNodes:
                    [],

                evidence:
                    "explain",

                difficulty:
                    "D3",

                questionType:
                    "mcq",

                mode: [
                    "practice"
                ],

                prerequisites:
                    [],

                skills:
                    [],

                content: {

                    stem:
                        "Mismatch fixture",

                    options: [

                        {
                            id:
                                "A",

                            text:
                                "A",

                            isCorrect:
                                true
                        },

                        {
                            id:
                                "B",

                            text:
                                "B",

                            isCorrect:
                                false
                        }
                    ]
                }
            }
        ]
    };
}


/**
 * ------------------------------------------------------------
 * Session helper
 * ------------------------------------------------------------
 */

function makeSession({

    action =
    "LEARN",

    lesson =
    makeLesson(),

    questionBanks =
    makeQuestionBank(),

    evidenceDimensions =
    [],

    minDifficulty =
    "D1",

    maxDifficulty =
    "D4",

    preferredDifficulty =
    minDifficulty,

    learningMode =
    "HOC_SAU"

} = {}) {

    return createStudySession({

        sessionId:
            `SESSION-${action}-001`,

        studentState:
            makeStudentState(),

        initialDecision:
            makeDecision({

                action,

                evidenceDimensions,

                minDifficulty,

                maxDifficulty,

                preferredDifficulty
            }),

        questionBanks,

        lesson,

        learningMode,

        clusterId:
            "C09",

        lessonId:
            lesson?.id ??
            null,

        contextId:
            "runtime-session-context",

        history:
            [],

        now:
            "2026-10-07T10:00:00.000Z"
    });
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
    "1. StudySession exposes V0.2.0 lesson integration metadata",
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
    "2. createStudySession stores a caller-safe lesson dependency",
    () => {

        const lesson =
            makeLesson();


        const session =
            makeSession({
                lesson
            });


        assert.equal(
            session.dependencies.lesson.id,
            lesson.id
        );


        assert.notEqual(
            session.dependencies.lesson,
            lesson
        );


        assert.deepEqual(
            session.lessonRuntime,
            {
                plan:
                    null,

                currentItem:
                    null,

                progress: {

                    completedSectionIds:
                        [],

                    skippedSectionIds:
                        []
                }
            }
        );
    }
);


/**
 * 3
 */
test(
    "3. caller-owned lesson is not mutated by createStudySession",
    () => {

        const lesson =
            makeLesson();


        const before =
            structuredClone(
                lesson
            );


        makeSession({
            lesson
        });


        assert.deepEqual(
            lesson,
            before
        );
    }
);


/**
 * 4
 */
test(
    "4. LEARN returns the first eligible lesson item as CONTENT",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });


        const result =
            getNextStudyItem({

                session,

                now:
                    "2026-10-07T10:01:00.000Z"
            });


        assert.equal(
            result.status,
            "CONTENT"
        );


        assert.equal(
            result.item.sectionId,
            "S01"
        );


        assert.equal(
            result.item.sectionType,
            "concept"
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.selection,
            null
        );


        assert.equal(
            result.session
                .lessonRuntime
                .currentItem
                .sectionId,
            "S01"
        );
    }
);


/**
 * 5
 */
test(
    "5. getNextStudyItem builds and stores a LessonEngine plan",
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


        assert.ok(
            result.session
                .lessonRuntime
                .plan
        );


        assert.equal(
            result.session
                .lessonRuntime
                .plan
                .lessonId,
            "lesson-k283-test"
        );


        assert.equal(
            result.session
                .lessonRuntime
                .plan
                .adaptiveContext
                .action,
            "LEARN"
        );
    }
);


/**
 * 6
 */
test(
    "6. getNextStudyItem does not mutate caller-owned session",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });


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
 * 7
 */
test(
    "7. completeLessonItem completes the current content section",
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


        const completed =
            completeLessonItem({

                session:
                    first.session,

                sectionId:
                    "S01",

                now:
                    "2026-10-07T10:02:00.000Z"
            });


        assert.equal(
            completed.status,
            "ITEM_COMPLETED"
        );


        assert.deepEqual(
            completed.progress
                .completedSectionIds,
            [
                "S01"
            ]
        );


        assert.deepEqual(
            completed.progress
                .skippedSectionIds,
            []
        );


        assert.equal(
            completed.session
                .lessonRuntime
                .currentItem,
            null
        );
    }
);


/**
 * 8
 */
test(
    "8. completeLessonItem can mark a content section skipped",
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


        const skipped =
            completeLessonItem({

                session:
                    first.session,

                skipped:
                    true
            });


        assert.equal(
            skipped.status,
            "ITEM_SKIPPED"
        );


        assert.deepEqual(
            skipped.progress
                .skippedSectionIds,
            [
                "S01"
            ]
        );


        assert.deepEqual(
            skipped.progress
                .completedSectionIds,
            []
        );
    }
);


/**
 * 9
 */
test(
    "9. completed content is skipped by the next lesson navigation",
    () => {

        let session =
            makeSession({
                action:
                    "LEARN"
            });


        const first =
            getNextStudyItem({
                session
            });


        session =
            completeLessonItem({
                session:
                    first.session
            }).session;


        const second =
            getNextStudyItem({
                session
            });


        assert.notEqual(
            second.item.sectionId,
            "S01"
        );


        assert.equal(
            second.item.sectionId,
            "S02"
        );
    }
);


/**
 * 10
 */
test(
    "10. LEARN question_set is delegated to QuestionSelector",
    () => {

        let session =
            makeSession({

                action:
                    "LEARN",

                evidenceDimensions: [
                    "know"
                ],

                minDifficulty:
                    "D1",

                maxDifficulty:
                    "D1",

                preferredDifficulty:
                    "D1"
            });


        const first =
            getNextStudyItem({
                session
            });


        session =
            completeLessonItem({
                session:
                    first.session
            }).session;


        const second =
            getNextStudyItem({
                session
            });


        assert.equal(
            second.status,
            "QUESTION"
        );


        assert.equal(
            second.item.sectionId,
            "S02"
        );


        assert.equal(
            second.selection.status,
            "SELECTED"
        );


        assert.equal(
            second.question.id,
            "Q-K283-KNOW-001"
        );


        assert.equal(
            second.compatibility.compatible,
            true
        );


        assert.equal(
            second.session
                .currentQuestion
                .id,
            "Q-K283-KNOW-001"
        );
    }
);


/**
 * 11
 */
test(
    "11. questionRequest remains a delivery gate and is not merged into AdaptiveDecision",
    () => {

        let session =
            makeSession({

                action:
                    "LEARN",

                evidenceDimensions: [
                    "know"
                ],

                minDifficulty:
                    "D1",

                maxDifficulty:
                    "D1",

                preferredDifficulty:
                    "D1"
            });


        const originalDecision =
            structuredClone(
                session.currentDecision
            );


        const first =
            getNextStudyItem({
                session
            });


        session =
            completeLessonItem({
                session:
                    first.session
            }).session;


        const questionResult =
            getNextStudyItem({
                session
            });


        assert.deepEqual(
            questionResult.session
                .currentDecision,
            originalDecision
        );


        assert.equal(
            questionResult.item
                .questionRequest
                .primaryNode,
            "K283"
        );
    }
);


/**
 * 12
 */
test(
    "12. StudySession reports QUESTION_NO_MATCH without inventing fallback",
    () => {

        let session =
            makeSession({

                action:
                    "LEARN",

                questionBanks: {
                    bankId:
                        "EMPTY-BANK",

                    questions:
                        []
                },

                evidenceDimensions: [
                    "know"
                ],

                minDifficulty:
                    "D1",

                maxDifficulty:
                    "D1",

                preferredDifficulty:
                    "D1"
            });


        const first =
            getNextStudyItem({
                session
            });


        session =
            completeLessonItem({
                session:
                    first.session
            }).session;


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.status,
            "QUESTION_NO_MATCH"
        );


        assert.equal(
            result.selection.status,
            "NO_MATCH"
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.session.currentQuestion,
            null
        );
    }
);


/**
 * 13
 *
 * Adaptive allows explain D3 practice.
 *
 * S03 only allows apply D3.
 *
 * QuestionSelector may select the explain question, but the
 * Lesson delivery gate must reject it.
 */
test(
    "13. incompatible selected question returns QUESTION_DELIVERY_MISMATCH",
    () => {

        const session =
            makeSession({

                action:
                    "PRACTICE",

                questionBanks:
                    makeMismatchQuestionBank(),

                evidenceDimensions: [
                    "explain"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3"
            });


        /**
         * PRACTICE projection may expose S02 before S03 because
         * guidedPractice is compatible with PRACTICE.
         *
         * Mark S02 as already completed so this test targets S03
         * specifically without testing LessonEngine ordering.
         */
        const prepared =
            structuredClone(
                session
            );


        prepared.lessonRuntime.progress
            .completedSectionIds =
            [
                "S02"
            ];


        const result =
            getNextStudyItem({
                session:
                    prepared
            });


        assert.equal(
            result.item.sectionId,
            "S03"
        );


        assert.equal(
            result.selection.status,
            "SELECTED"
        );


        assert.equal(
            result.selection
                .selected
                .question
                .id,
            "Q-K283-MISMATCH-001"
        );


        assert.equal(
            result.status,
            "QUESTION_DELIVERY_MISMATCH"
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.session.currentQuestion,
            null
        );


        assert.equal(
            result.compatibility.compatible,
            false
        );


        assert.ok(
            result.compatibility
                .reasons
                .includes(
                    "EVIDENCE_MISMATCH"
                )
        );
    }
);


/**
 * 14
 */
test(
    "14. delivery mismatch does not cause StudySession to select another question",
    () => {

        const session =
            makeSession({

                action:
                    "PRACTICE",

                questionBanks:
                    makeMismatchQuestionBank(),

                evidenceDimensions: [
                    "explain"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3"
            });


        const prepared =
            structuredClone(
                session
            );


        prepared.lessonRuntime.progress
            .completedSectionIds =
            [
                "S02"
            ];


        const result =
            getNextStudyItem({
                session:
                    prepared
            });


        assert.equal(
            result.selection
                .selected
                .questionId,
            "Q-K283-MISMATCH-001"
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.status,
            "QUESTION_DELIVERY_MISMATCH"
        );
    }
);


/**
 * 15
 */
test(
    "15. completeLessonItem refuses to complete question_set directly",
    () => {

        let session =
            makeSession({

                action:
                    "LEARN",

                evidenceDimensions: [
                    "know"
                ],

                minDifficulty:
                    "D1",

                maxDifficulty:
                    "D1",

                preferredDifficulty:
                    "D1"
            });


        const first =
            getNextStudyItem({
                session
            });


        session =
            completeLessonItem({
                session:
                    first.session
            }).session;


        const questionResult =
            getNextStudyItem({
                session
            });


        assert.equal(
            questionResult.item.kind,
            "question_set"
        );


        assert.throws(
            () =>
                completeLessonItem({
                    session:
                        questionResult.session
                }),
            /must be completed through submitAnswer/
        );
    }
);


/**
 * 16
 */
test(
    "16. completeLessonItem does not create attempts or mastery updates",
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


        const beforeKnowledge =
            structuredClone(
                first.session.state.knowledge
            );


        const completed =
            completeLessonItem({
                session:
                    first.session
            });


        assert.deepEqual(
            completed.session.attempts,
            []
        );


        assert.deepEqual(
            completed.session
                .state
                .knowledge,
            beforeKnowledge
        );


        assert.equal(
            completed.session
                .lastFlowResult,
            null
        );
    }
);


/**
 * 17
 */
test(
    "17. SKIP AdaptiveDecision produces SKIPPED lesson delivery",
    () => {

        const session =
            makeSession({
                action:
                    "SKIP"
            });


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.status,
            "SKIPPED"
        );


        assert.equal(
            result.item,
            null
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.selection,
            null
        );


        assert.equal(
            result.session
                .currentQuestion,
            null
        );
    }
);


/**
 * 18
 *
 * Target a node not present in any node-scoped lesson section.
 */
test(
    "18. incompatible lesson target produces NO_DELIVERY_MATCH",
    () => {

        const studentState =
            makeStudentState();


        const session =
            createStudySession({

                sessionId:
                    "SESSION-NO-MATCH",

                studentState,

                initialDecision:
                    makeDecision({

                        action:
                            "LEARN",

                        targetNodeId:
                            "K999"
                    }),

                questionBanks:
                    makeQuestionBank(),

                lesson:
                    makeLesson(),

                learningMode:
                    "HOC_SAU",

                now:
                    "2026-10-07T10:00:00.000Z"
            });


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.status,
            "NO_DELIVERY_MATCH"
        );


        assert.equal(
            result.item,
            null
        );


        assert.equal(
            result.question,
            null
        );
    }
);


/**
 * 19
 */
test(
    "19. plan completion is a delivery outcome and does not imply mastery",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });


        const prepared =
            structuredClone(
                session
            );


        /**
         * LEARN projection in the current LessonEngine includes
         * S01, S02 and S05 from this fixture.
         */
        prepared.lessonRuntime.progress
            .completedSectionIds =
            [
                "S01",
                "S02",
                "S05"
            ];


        const result =
            getNextStudyItem({
                session:
                    prepared
            });


        assert.equal(
            result.status,
            "PLAN_COMPLETE"
        );


        assert.equal(
            result.item,
            null
        );


        assert.equal(
            result.question,
            null
        );


        assert.equal(
            result.session
                .state
                .knowledge
                .K283
                .mastery,
            "M2"
        );
    }
);


/**
 * 20
 */
test(
    "20. lesson plan preserves the Adaptive primary action",
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
                    "D4"
            });


        const result =
            getNextStudyItem({
                session
            });


        assert.equal(
            result.session
                .currentDecision
                .action,
            "CHALLENGE"
        );


        assert.equal(
            result.session
                .lessonRuntime
                .plan
                .adaptiveContext
                .action,
            "CHALLENGE"
        );
    }
);


/**
 * 21
 */
test(
    "21. CHALLENGE can deliver a compatible transfer question",
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
                    "D4"
            });


        /**
         * Current CHALLENGE projection includes S03 before S04.
         * Complete S03 so the test specifically targets transfer.
         */
        const prepared =
            structuredClone(
                session
            );


        prepared.lessonRuntime.progress
            .completedSectionIds =
            [
                "S03"
            ];


        const result =
            getNextStudyItem({
                session:
                    prepared
            });


        assert.equal(
            result.status,
            "QUESTION"
        );


        assert.equal(
            result.item.sectionId,
            "S04"
        );


        assert.equal(
            result.question.id,
            "Q-K283-TRANSFER-001"
        );


        assert.equal(
            result.question.evidence,
            "transfer"
        );


        assert.equal(
            result.question.difficulty,
            "D4"
        );


        assert.equal(
            result.compatibility.compatible,
            true
        );
    }
);


/**
 * 22
 */
test(
    "22. StudySession adapts Adaptive target.primaryNodeId for LessonEngine",
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
            session.currentDecision
                .target
                .primaryNodeId,
            "K283"
        );


        assert.equal(
            result.session
                .lessonRuntime
                .plan
                .adaptiveContext
                .targetNodeId,
            "K283"
        );
    }
);


/**
 * 23
 */
test(
    "23. getNextStudyItem is deterministic for identical lesson runtime input",
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
                    "D4"
            });


        const prepared =
            structuredClone(
                session
            );


        prepared.lessonRuntime.progress
            .completedSectionIds =
            [
                "S03"
            ];


        const first =
            getNextStudyItem({

                session:
                    prepared,

                now:
                    "2026-10-07T10:05:00.000Z"
            });


        const second =
            getNextStudyItem({

                session:
                    prepared,

                now:
                    "2026-10-07T10:05:00.000Z"
            });


        assert.deepEqual(
            first,
            second
        );
    }
);


/**
 * 24
 */
test(
    "24. completeLessonItem does not mutate caller-owned session",
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


        const before =
            structuredClone(
                first.session
            );


        completeLessonItem({
            session:
                first.session
        });


        assert.deepEqual(
            first.session,
            before
        );
    }
);


/**
 * 25
 */
test(
    "25. getSessionSnapshot includes caller-safe lesson runtime",
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
 * 26
 */
test(
    "26. question-only sessions remain backward compatible",
    () => {

        const session =
            createStudySession({

                sessionId:
                    "SESSION-LEGACY-001",

                studentState:
                    makeStudentState(),

                initialDecision:
                    makeDecision({

                        action:
                            "PRACTICE",

                        evidenceDimensions: [
                            "apply"
                        ],

                        minDifficulty:
                            "D3",

                        maxDifficulty:
                            "D3",

                        preferredDifficulty:
                            "D3"
                    }),

                questionBanks:
                    makeQuestionBank(),

                lesson:
                    null,

                learningMode:
                    "HOC_SAU",

                now:
                    "2026-10-07T10:00:00.000Z"
            });


        const result =
            getNextStudyItem({

                session,

                now:
                    "2026-10-07T10:01:00.000Z"
            });


        assert.equal(
            result.status,
            "QUESTION"
        );


        assert.equal(
            result.item,
            null
        );


        assert.equal(
            result.question.id,
            "Q-K283-APPLY-001"
        );


        assert.equal(
            result.selection.status,
            "SELECTED"
        );
    }
);


/**
 * 27
 */
test(
    "27. legacy getNextQuestion remains available with lesson-enabled sessions",
    () => {

        const session =
            makeSession({

                action:
                    "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3"
            });


        const result =
            getNextQuestion({

                session,

                now:
                    "2026-10-07T10:01:00.000Z"
            });


        assert.equal(
            result.selection.status,
            "SELECTED"
        );


        assert.equal(
            result.question.id,
            "Q-K283-APPLY-001"
        );
    }
);


/**
 * 28
 */
test(
    "28. completeLessonItem rejects a sectionId different from current item",
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


        assert.throws(
            () =>
                completeLessonItem({

                    session:
                        first.session,

                    sectionId:
                        "S999"
                }),
            /does not match the current lesson item/
        );
    }
);


/**
 * 29
 */
test(
    "29. completeLessonItem requires a current lesson item",
    () => {

        const session =
            makeSession({
                action:
                    "LEARN"
            });


        assert.throws(
            () =>
                completeLessonItem({
                    session
                }),
            /no current lesson item/
        );
    }
);


/**
 * 30
 */
test(
    "30. completeLessonItem rejects sessions without a lesson",
    () => {

        const session =
            createStudySession({

                sessionId:
                    "SESSION-NO-LESSON",

                studentState:
                    makeStudentState(),

                initialDecision:
                    makeDecision({
                        action:
                            "LEARN"
                    }),

                questionBanks:
                    makeQuestionBank(),

                lesson:
                    null,

                now:
                    "2026-10-07T10:00:00.000Z"
            });


        assert.throws(
            () =>
                completeLessonItem({
                    session
                }),
            /no lesson configured/
        );
    }
);