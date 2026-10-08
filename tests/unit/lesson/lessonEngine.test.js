/**
 * Lesson Engine Unit Tests
 * Target: LessonEngine V1.0.0
 *
 * Scope:
 *   - metadata
 *   - runtime input validation
 *   - Adaptive action -> section projection
 *   - delivery-mode filtering
 *   - target-node filtering
 *   - question request projection
 *   - SKIP / NO_DELIVERY_MATCH
 *   - plan navigation
 *   - immutability
 *   - determinism
 *
 * Out of scope:
 *   - mastery calculation
 *   - Adaptive decision generation
 *   - remediation diagnosis
 *   - concrete question selection
 *   - Student State mutation
 *   - StudySession / LearningFlow orchestration
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    buildLessonPlan,
    getNextLessonItem,
    getLessonEngineInfo
} from "../../../src/engines/lesson/lessonEngine.js";


/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function makeLesson(
    overrides = {}
) {
    return {
        id: "lesson-test-01",
        version: "1.0.0",
        title: "Lesson Engine Test Lesson",
        type: "cluster",

        deliveryModes: [
            "HOC_NHANH",
            "HOC_SAU",
            "ON_THI"
        ],

        knowledgeNodes: [
            "K100",
            "K101",
            "K102"
        ],

        sections: [
            {
                id: "S01",
                type: "orientation",
                title: "Orientation",
                nodes: ["K100"],
                estimatedMinutes: 3,
                content: {
                    format: "rich_text"
                }
            },

            {
                id: "S02",
                type: "concept",
                title: "Concept K100",
                nodes: ["K100"],
                estimatedMinutes: 10,
                content: {
                    format: "rich_text"
                }
            },

            {
                id: "S03",
                type: "mechanism",
                title: "Mechanism K100",
                nodes: ["K100"],
                estimatedMinutes: 12,
                content: {
                    format: "mechanism"
                }
            },

            {
                id: "S04",
                type: "workedExample",
                title: "Worked example K101",
                nodes: ["K101"],
                estimatedMinutes: 8,
                content: {
                    format: "worked_example"
                }
            },

            {
                id: "S05",
                type: "guidedPractice",
                title: "Guided practice K100",
                nodes: ["K100"],
                estimatedMinutes: 10,

                questionSet: {
                    source: "questions/",

                    selection: {
                        primaryNode: "K100",
                        difficulty: [
                            "D2"
                        ],
                        evidence: [
                            "explain"
                        ],
                        count: 3
                    },

                    adaptive: true
                }
            },

            {
                id: "S06",
                type: "practice",
                title: "Practice K100",
                nodes: ["K100"],
                estimatedMinutes: 10,

                questionSet: {
                    source: "questions/",

                    selection: {
                        primaryNode: "K100",
                        difficulty: [
                            "D2",
                            "D3"
                        ],
                        evidence: [
                            "know",
                            "apply"
                        ],
                        count: 5
                    },

                    adaptive: true
                }
            },

            {
                id: "S07",
                type: "apply",
                title: "Apply K100",
                nodes: ["K100"],
                estimatedMinutes: 12,

                questionSet: {
                    source: "questions/",

                    selection: {
                        primaryNode: "K100",
                        difficulty: [
                            "D3"
                        ],
                        evidence: [
                            "apply"
                        ],
                        count: 4
                    },

                    adaptive: true
                }
            },

            {
                id: "S08",
                type: "crossNode",
                title: "Cross-node",
                nodes: [
                    "K100",
                    "K101"
                ],
                estimatedMinutes: 10,
                content: {
                    format: "causal_chain"
                }
            },

            {
                id: "S09",
                type: "transfer",
                title: "Transfer K100",
                nodes: ["K100"],
                estimatedMinutes: 15,

                questionSet: {
                    source:
                        "questions/transfer/",

                    selection: {
                        primaryNode: "K100",
                        difficulty: [
                            "D4"
                        ],
                        evidence: [
                            "transfer"
                        ],
                        count: 2
                    },

                    adaptive: true
                }
            },

            {
                id: "S10",
                type: "remediation",
                title: "Remediation K100",
                nodes: ["K100"],
                estimatedMinutes: 8,
                content: {
                    format: "rich_text"
                }
            },

            {
                id: "S11",
                type: "reflection",
                title: "Reflection",
                nodes: ["K100"],
                estimatedMinutes: 3,

                prompts: [
                    "Em đã hiểu gì?"
                ]
            },

            {
                id: "S12",
                type: "summary",
                title: "Summary",
                nodes: ["K100"],
                estimatedMinutes: 4,
                content: {
                    format: "rich_text"
                }
            },

            {
                id: "S13",
                type: "exitDiagnostic",
                title: "Exit diagnostic",
                nodes: ["K100"],
                estimatedMinutes: 6,

                questionSet: {
                    source: "questions/",

                    selection: {
                        primaryNode: "K100",
                        difficulty: [
                            "D3",
                            "D4"
                        ],
                        evidence: [
                            "apply",
                            "transfer"
                        ],
                        count: 4
                    }
                }
            },

            {
                id: "S14",
                type: "concept",
                title: "Concept K102",
                nodes: ["K102"],
                estimatedMinutes: 10,
                content: {
                    format: "rich_text"
                }
            },

            {
                id: "S15",
                type: "summary",
                title: "Global summary",
                estimatedMinutes: 2,
                content: {
                    format: "rich_text"
                }
            }
        ],

        ...overrides
    };
}


function build({
    action = "LEARN",
    targetNodeId = "K100",
    deliveryMode = "HOC_SAU",
    lesson = makeLesson()
} = {}) {
    return buildLessonPlan({
        lesson,
        deliveryMode,

        adaptiveDecision: {
            action,
            targetNodeId
        }
    });
}


function includedIds(plan) {
    return plan.items
        .filter(
            item =>
                item.disposition ===
                "include"
        )
        .map(
            item =>
                item.sectionId
        );
}


function excludedIds(plan) {
    return plan.items
        .filter(
            item =>
                item.disposition ===
                "exclude"
        )
        .map(
            item =>
                item.sectionId
        );
}


function findItem(
    plan,
    sectionId
) {
    return plan.items.find(
        item =>
            item.sectionId ===
            sectionId
    );
}


/* -------------------------------------------------------------------------- */
/* 1. Metadata                                                                */
/* -------------------------------------------------------------------------- */

test(
    "1. exposes LessonEngine V1.0.0 metadata",
    () => {
        const info =
            getLessonEngineInfo();

        assert.equal(
            info.name,
            "LessonEngine"
        );

        assert.equal(
            info.version,
            "1.0.0"
        );

        assert.equal(
            info.lessonSchemaVersion,
            "1.0.0"
        );

        assert.deepEqual(
            info.supportedDeliveryModes,
            [
                "HOC_NHANH",
                "HOC_SAU",
                "ON_THI"
            ]
        );

        assert.deepEqual(
            info.supportedActions,
            [
                "LEARN",
                "PRACTICE",
                "CHALLENGE",
                "REMEDIATE",
                "RETEST",
                "REVIEW",
                "SKIP"
            ]
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 2. Basic plan                                                              */
/* -------------------------------------------------------------------------- */

test(
    "2. builds a deterministic lesson delivery plan",
    () => {
        const plan = build();

        assert.equal(
            plan.schemaVersion,
            "1.0.0"
        );

        assert.deepEqual(
            plan.engine,
            {
                name: "LessonEngine",
                version: "1.0.0"
            }
        );

        assert.equal(
            plan.status,
            "READY"
        );

        assert.equal(
            plan.lessonId,
            "lesson-test-01"
        );

        assert.equal(
            plan.lessonVersion,
            "1.0.0"
        );

        assert.equal(
            plan.deliveryMode,
            "HOC_SAU"
        );

        assert.deepEqual(
            plan.adaptiveContext,
            {
                action: "LEARN",
                targetNodeId: "K100"
            }
        );

        assert.equal(
            plan.items.length,
            15
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 3. LEARN                                                                   */
/* -------------------------------------------------------------------------- */

test(
    "3. LEARN includes learning-oriented sections",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S01"));
        assert.ok(ids.includes("S02"));
        assert.ok(ids.includes("S03"));
        assert.ok(ids.includes("S05"));
        assert.ok(ids.includes("S11"));
        assert.ok(ids.includes("S12"));

        assert.ok(
            !ids.includes("S07")
        );

        assert.ok(
            !ids.includes("S09")
        );

        assert.ok(
            !ids.includes("S13")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 4. PRACTICE                                                                */
/* -------------------------------------------------------------------------- */

test(
    "4. PRACTICE projects practice-oriented sections",
    () => {
        const plan = build({
            action: "PRACTICE"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S05"));
        assert.ok(ids.includes("S06"));
        assert.ok(ids.includes("S07"));
        assert.ok(ids.includes("S11"));

        assert.ok(
            !ids.includes("S02")
        );

        assert.ok(
            !ids.includes("S03")
        );

        assert.ok(
            !ids.includes("S09")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 5. CHALLENGE                                                               */
/* -------------------------------------------------------------------------- */

test(
    "5. CHALLENGE projects apply, cross-node and transfer sections",
    () => {
        const plan = build({
            action: "CHALLENGE"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S07"));
        assert.ok(ids.includes("S08"));
        assert.ok(ids.includes("S09"));
        assert.ok(ids.includes("S11"));

        assert.ok(
            !ids.includes("S02")
        );

        assert.ok(
            !ids.includes("S05")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 6. REMEDIATE                                                               */
/* -------------------------------------------------------------------------- */

test(
    "6. REMEDIATE projects remediation-support sections",
    () => {
        const plan = build({
            action: "REMEDIATE"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S02"));
        assert.ok(ids.includes("S03"));
        assert.ok(ids.includes("S05"));
        assert.ok(ids.includes("S10"));

        assert.ok(
            !ids.includes("S07")
        );

        assert.ok(
            !ids.includes("S09")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 7. RETEST                                                                  */
/* -------------------------------------------------------------------------- */

test(
    "7. RETEST projects exit diagnostic and transfer",
    () => {
        const plan = build({
            action: "RETEST"
        });

        assert.deepEqual(
            includedIds(plan),
            [
                "S09",
                "S13"
            ]
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 8. REVIEW                                                                  */
/* -------------------------------------------------------------------------- */

test(
    "8. REVIEW projects review-oriented sections",
    () => {
        const plan = build({
            action: "REVIEW"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S06"));
        assert.ok(ids.includes("S08"));
        assert.ok(ids.includes("S11"));
        assert.ok(ids.includes("S12"));
        assert.ok(ids.includes("S15"));

        assert.ok(
            !ids.includes("S03")
        );

        assert.ok(
            !ids.includes("S09")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 9. SKIP                                                                    */
/* -------------------------------------------------------------------------- */

test(
    "9. SKIP produces a skipped plan with no included sections",
    () => {
        const plan = build({
            action: "SKIP"
        });

        assert.equal(
            plan.status,
            "SKIPPED"
        );

        assert.deepEqual(
            includedIds(plan),
            []
        );

        assert.equal(
            excludedIds(plan).length,
            15
        );

        for (
            const item of plan.items
        ) {
            assert.equal(
                item.reason,
                "ADAPTIVE_SKIP"
            );
        }
    }
);


/* -------------------------------------------------------------------------- */
/* 10. Action exclusion reason                                                */
/* -------------------------------------------------------------------------- */

test(
    "10. incompatible action sections are explicitly excluded",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const transfer =
            findItem(
                plan,
                "S09"
            );

        assert.equal(
            transfer.disposition,
            "exclude"
        );

        assert.equal(
            transfer.reason,
            "NOT_RELEVANT_TO_ACTION"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 11. HOC_NHANH mode filtering                                              */
/* -------------------------------------------------------------------------- */

test(
    "11. HOC_NHANH filters deep-only orientation and mechanism sections",
    () => {
        const plan = build({
            action: "LEARN",
            deliveryMode:
                "HOC_NHANH"
        });

        const orientation =
            findItem(
                plan,
                "S01"
            );

        const mechanism =
            findItem(
                plan,
                "S03"
            );

        assert.equal(
            orientation.disposition,
            "exclude"
        );

        assert.equal(
            orientation.reason,
            "NOT_COMPATIBLE_WITH_DELIVERY_MODE"
        );

        assert.equal(
            mechanism.disposition,
            "exclude"
        );

        assert.equal(
            mechanism.reason,
            "NOT_COMPATIBLE_WITH_DELIVERY_MODE"
        );

        assert.ok(
            includedIds(plan)
                .includes("S02")
        );

        assert.ok(
            includedIds(plan)
                .includes("S05")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 12. HOC_SAU mode                                                          */
/* -------------------------------------------------------------------------- */

test(
    "12. HOC_SAU allows deep learning sections",
    () => {
        const plan = build({
            action: "LEARN",
            deliveryMode:
                "HOC_SAU"
        });

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S01"));
        assert.ok(ids.includes("S02"));
        assert.ok(ids.includes("S03"));
        assert.ok(ids.includes("S05"));
    }
);


/* -------------------------------------------------------------------------- */
/* 13. ON_THI mode                                                           */
/* -------------------------------------------------------------------------- */

test(
    "13. ON_THI remains a projection filter and does not change the action",
    () => {
        const plan = build({
            action: "PRACTICE",
            deliveryMode:
                "ON_THI"
        });

        assert.equal(
            plan.adaptiveContext.action,
            "PRACTICE"
        );

        const ids =
            includedIds(plan);

        assert.ok(ids.includes("S05"));
        assert.ok(ids.includes("S06"));
        assert.ok(ids.includes("S07"));

        assert.ok(
            !ids.includes("S02")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 14. Target node                                                            */
/* -------------------------------------------------------------------------- */

test(
    "14. targetNodeId excludes sections bound only to other nodes",
    () => {
        const plan = build({
            action: "LEARN",
            targetNodeId: "K100"
        });

        const otherNode =
            findItem(
                plan,
                "S14"
            );

        assert.equal(
            otherNode.disposition,
            "exclude"
        );

        assert.equal(
            otherNode.reason,
            "NOT_RELEVANT_TO_TARGET_NODE"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 15. No target node                                                         */
/* -------------------------------------------------------------------------- */

test(
    "15. missing targetNodeId does not invent a node filter",
    () => {
        const plan =
            buildLessonPlan({
                lesson:
                    makeLesson(),

                deliveryMode:
                    "HOC_SAU",

                adaptiveDecision: {
                    action: "LEARN"
                }
            });

        assert.ok(
            includedIds(plan)
                .includes("S02")
        );

        assert.ok(
            includedIds(plan)
                .includes("S14")
        );

        assert.equal(
            plan.adaptiveContext
                .targetNodeId,
            null
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 16. Global section                                                         */
/* -------------------------------------------------------------------------- */

test(
    "16. section without nodes remains globally relevant to target filtering",
    () => {
        const plan = build({
            action: "REVIEW",
            targetNodeId: "K100"
        });

        const globalSummary =
            findItem(
                plan,
                "S15"
            );

        assert.equal(
            globalSummary.disposition,
            "include"
        );

        assert.equal(
            globalSummary.reason,
            "ACTION_REVIEW"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 17. Question request                                                       */
/* -------------------------------------------------------------------------- */

test(
    "17. questionSet section exposes selection as questionRequest",
    () => {
        const plan = build({
            action: "PRACTICE"
        });

        const item =
            findItem(
                plan,
                "S06"
            );

        assert.equal(
            item.kind,
            "question_set"
        );

        assert.deepEqual(
            item.questionRequest,
            {
                primaryNode: "K100",

                difficulty: [
                    "D2",
                    "D3"
                ],

                evidence: [
                    "know",
                    "apply"
                ],

                count: 5
            }
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 18. No concrete question selection                                         */
/* -------------------------------------------------------------------------- */

test(
    "18. LessonEngine does not select concrete question IDs",
    () => {
        const plan = build({
            action: "PRACTICE"
        });

        const item =
            findItem(
                plan,
                "S06"
            );

        assert.ok(
            item.questionRequest
        );

        assert.equal(
            Object.hasOwn(
                item,
                "questionId"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                item,
                "questions"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 19. Content item                                                           */
/* -------------------------------------------------------------------------- */

test(
    "19. content-only section is projected as content",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const item =
            findItem(
                plan,
                "S02"
            );

        assert.equal(
            item.kind,
            "content"
        );

        assert.equal(
            Object.hasOwn(
                item,
                "questionRequest"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 20. NO_DELIVERY_MATCH                                                      */
/* -------------------------------------------------------------------------- */

test(
    "20. returns NO_DELIVERY_MATCH when no section can serve the decision",
    () => {
        const lesson =
            makeLesson({
                sections: [
                    {
                        id: "ONLY-TRANSFER",
                        type: "transfer",
                        title: "Transfer only",
                        nodes: ["K100"]
                    }
                ]
            });

        const plan = build({
            lesson,
            action: "LEARN",
            targetNodeId: "K100"
        });

        assert.equal(
            plan.status,
            "NO_DELIVERY_MATCH"
        );

        assert.deepEqual(
            includedIds(plan),
            []
        );

        assert.equal(
            plan.items.length,
            1
        );

        assert.equal(
            plan.items[0].reason,
            "NOT_RELEVANT_TO_ACTION"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 21. Next item                                                              */
/* -------------------------------------------------------------------------- */

test(
    "21. getNextLessonItem returns first included unfinished section",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds:
                        [],
                    skippedSectionIds:
                        []
                }
            });

        assert.equal(
            result.status,
            "NEXT_ITEM"
        );

        assert.equal(
            result.item.sectionId,
            "S01"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 22. Navigation skips completed sections                                    */
/* -------------------------------------------------------------------------- */

test(
    "22. getNextLessonItem skips completed included sections",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S01",
                        "S02",
                        "S03"
                    ],

                    skippedSectionIds:
                        []
                }
            });

        assert.equal(
            result.status,
            "NEXT_ITEM"
        );

        assert.equal(
            result.item.sectionId,
            "S05"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 23. Navigation skips runtime-skipped sections                              */
/* -------------------------------------------------------------------------- */

test(
    "23. getNextLessonItem skips runtime-skipped included sections",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S01"
                    ],

                    skippedSectionIds: [
                        "S02",
                        "S03"
                    ]
                }
            });

        assert.equal(
            result.status,
            "NEXT_ITEM"
        );

        assert.equal(
            result.item.sectionId,
            "S05"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 24. Plan complete                                                          */
/* -------------------------------------------------------------------------- */

test(
    "24. getNextLessonItem returns PLAN_COMPLETE when all included items are done",
    () => {
        const plan = build({
            action: "RETEST"
        });

        assert.deepEqual(
            includedIds(plan),
            [
                "S09",
                "S13"
            ]
        );

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S09",
                        "S13"
                    ],

                    skippedSectionIds:
                        []
                }
            });

        assert.deepEqual(
            result,
            {
                status:
                    "PLAN_COMPLETE",

                item: null
            }
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 25. Empty/default progress                                                 */
/* -------------------------------------------------------------------------- */

test(
    "25. getNextLessonItem accepts omitted progress",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const result =
            getNextLessonItem({
                plan
            });

        assert.equal(
            result.status,
            "NEXT_ITEM"
        );

        assert.equal(
            result.item.sectionId,
            "S01"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 26. Immutability                                                           */
/* -------------------------------------------------------------------------- */

test(
    "26. buildLessonPlan does not mutate lesson or adaptiveDecision",
    () => {
        const lesson =
            makeLesson();

        const adaptiveDecision = {
            action: "PRACTICE",
            targetNodeId: "K100"
        };

        const lessonBefore =
            structuredClone(lesson);

        const decisionBefore =
            structuredClone(
                adaptiveDecision
            );

        buildLessonPlan({
            lesson,
            deliveryMode:
                "HOC_SAU",
            adaptiveDecision
        });

        assert.deepEqual(
            lesson,
            lessonBefore
        );

        assert.deepEqual(
            adaptiveDecision,
            decisionBefore
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 27. Navigation immutability                                                */
/* -------------------------------------------------------------------------- */

test(
    "27. getNextLessonItem does not mutate plan or progress",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const progress = {
            completedSectionIds: [
                "S01"
            ],

            skippedSectionIds: []
        };

        const planBefore =
            structuredClone(plan);

        const progressBefore =
            structuredClone(
                progress
            );

        getNextLessonItem({
            plan,
            progress
        });

        assert.deepEqual(
            plan,
            planBefore
        );

        assert.deepEqual(
            progress,
            progressBefore
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 28. Determinism                                                            */
/* -------------------------------------------------------------------------- */

test(
    "28. identical inputs produce identical delivery plans",
    () => {
        const lesson =
            makeLesson();

        const input = {
            lesson,
            deliveryMode:
                "HOC_SAU",

            adaptiveDecision: {
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K100"
            }
        };

        const a =
            buildLessonPlan(input);

        const b =
            buildLessonPlan(input);

        assert.deepEqual(
            a,
            b
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 29. Invalid lesson                                                         */
/* -------------------------------------------------------------------------- */

test(
    "29. rejects missing or invalid lesson input",
    () => {
        assert.throws(
            () =>
                buildLessonPlan({
                    lesson: null,

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "LEARN"
                    }
                }),

            /requires a lesson object/
        );

        assert.throws(
            () =>
                buildLessonPlan({
                    lesson: {},

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "LEARN"
                    }
                }),

            /requires lesson\.id/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 30. Invalid delivery mode                                                  */
/* -------------------------------------------------------------------------- */

test(
    "30. rejects unsupported delivery mode",
    () => {
        assert.throws(
            () =>
                buildLessonPlan({
                    lesson:
                        makeLesson(),

                    deliveryMode:
                        "UNKNOWN",

                    adaptiveDecision: {
                        action:
                            "LEARN"
                    }
                }),

            /Unsupported deliveryMode/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 31. Lesson does not support mode                                           */
/* -------------------------------------------------------------------------- */

test(
    "31. rejects a valid delivery mode not supported by the lesson",
    () => {
        const lesson =
            makeLesson({
                deliveryModes: [
                    "HOC_SAU"
                ]
            });

        assert.throws(
            () =>
                buildLessonPlan({
                    lesson,

                    deliveryMode:
                        "ON_THI",

                    adaptiveDecision: {
                        action:
                            "LEARN"
                    }
                }),

            /does not support deliveryMode/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 32. Invalid Adaptive action                                                */
/* -------------------------------------------------------------------------- */

test(
    "32. rejects non-canonical Adaptive actions",
    () => {
        assert.throws(
            () =>
                buildLessonPlan({
                    lesson:
                        makeLesson(),

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "DIAGNOSTIC"
                    }
                }),

            /Unsupported adaptive action/
        );

        assert.throws(
            () =>
                buildLessonPlan({
                    lesson:
                        makeLesson(),

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "LEARN_GAPS"
                    }
                }),

            /Unsupported adaptive action/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 33. Invalid targetNodeId                                                   */
/* -------------------------------------------------------------------------- */

test(
    "33. rejects malformed targetNodeId",
    () => {
        assert.throws(
            () =>
                buildLessonPlan({
                    lesson:
                        makeLesson(),

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "LEARN",

                        targetNodeId:
                            123
                    }
                }),

            /targetNodeId/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 34. Invalid section type                                                   */
/* -------------------------------------------------------------------------- */

test(
    "34. rejects unsupported section types",
    () => {
        const lesson =
            makeLesson({
                sections: [
                    {
                        id: "BAD",
                        type:
                            "challenge",
                        nodes: [
                            "K100"
                        ]
                    }
                ]
            });

        assert.throws(
            () =>
                buildLessonPlan({
                    lesson,

                    deliveryMode:
                        "HOC_SAU",

                    adaptiveDecision: {
                        action:
                            "CHALLENGE",

                        targetNodeId:
                            "K100"
                    }
                }),

            /unsupported section type/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 35. Invalid plan                                                           */
/* -------------------------------------------------------------------------- */

test(
    "35. getNextLessonItem rejects malformed plan",
    () => {
        assert.throws(
            () =>
                getNextLessonItem({
                    plan: null
                }),

            /requires a plan object/
        );

        assert.throws(
            () =>
                getNextLessonItem({
                    plan: {}
                }),

            /plan requires items/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 36. Invalid progress                                                       */
/* -------------------------------------------------------------------------- */

test(
    "36. getNextLessonItem rejects malformed progress",
    () => {
        const plan = build();

        assert.throws(
            () =>
                getNextLessonItem({
                    plan,
                    progress: []
                }),

            /progress must be an object/
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 37. Returned next item is detached                                         */
/* -------------------------------------------------------------------------- */

test(
    "37. returned next item is detached from the plan",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const result =
            getNextLessonItem({
                plan
            });

        assert.equal(
            result.status,
            "NEXT_ITEM"
        );

        result.item.nodes.push(
            "K999"
        );

        const original =
            findItem(
                plan,
                result.item.sectionId
            );

        assert.equal(
            original.nodes.includes(
                "K999"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 38. Plan preserves source section order                                    */
/* -------------------------------------------------------------------------- */

test(
    "38. delivery plan preserves lesson section order",
    () => {
        const lesson =
            makeLesson();

        const plan = build({
            lesson,
            action: "CHALLENGE"
        });

        assert.deepEqual(
            plan.items.map(
                item =>
                    item.sectionId
            ),

            lesson.sections.map(
                section =>
                    section.id
            )
        );
    }
);