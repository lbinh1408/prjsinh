/**
 * Lesson Engine Real Content Integration Test
 *
 * Target:
 *   LessonEngine V1.0.0
 *
 * Real content:
 *   lesson-k283.json V1.0.0
 *
 * Purpose:
 *   Verify that a real validated production lesson can be projected
 *   correctly by LessonEngine.
 *
 * This test intentionally does NOT:
 *   - calculate mastery
 *   - generate Adaptive decisions
 *   - diagnose remediation
 *   - select concrete questions
 *   - evaluate answers
 *   - mutate Student State
 *
 * Boundary under test:
 *
 *   real lesson definition
 *          ↓
 *   LessonEngine
 *          ↓
 *   delivery projection
 *          ↓
 *   question-selection constraints
 *
 * Concrete question selection remains QuestionSelector ownership.
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    buildLessonPlan,
    getNextLessonItem,
    getLessonEngineInfo
} from "../../../src/engines/lesson/lessonEngine.js";


/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

/*
 * Adjust this path only if your project layout differs.
 *
 * Expected:
 *
 * src/
 * ├── data/
 * │   └── lessons/
 * │       └── c09/
 * │           └── lesson-k283.json
 * └── engines/
 *     └── lesson/
 *         └── lessonEngine.realcontent.test.js
 */
const LESSON_PATH =
    path.resolve(
        __dirname,
        "../../../src/data/lessons/c09/lesson-k283.json"
    );


/* -------------------------------------------------------------------------- */
/* Load real lesson                                                           */
/* -------------------------------------------------------------------------- */

function loadJson(filePath) {
    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}

const lesson =
    loadJson(LESSON_PATH);


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function build({
    action,
    targetNodeId = "K283",
    deliveryMode = "HOC_SAU"
}) {
    return buildLessonPlan({
        lesson,

        deliveryMode,

        adaptiveDecision: {
            action,
            targetNodeId
        }
    });
}


function includedItems(plan) {
    return plan.items.filter(
        item =>
            item.disposition ===
            "include"
    );
}


function includedIds(plan) {
    return includedItems(plan).map(
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
/* 1. Real lesson identity                                                    */
/* -------------------------------------------------------------------------- */

test(
    "1. loads real K283 lesson V1.0.0",
    () => {
        assert.equal(
            lesson.id,
            "lesson-k283-v1"
        );

        assert.equal(
            lesson.version,
            "1.0.0"
        );

        assert.equal(
            lesson.type,
            "concept"
        );

        assert.deepEqual(
            lesson.knowledgeNodes,
            [
                "K283"
            ]
        );

        assert.deepEqual(
            lesson.primaryNodes,
            [
                "K283"
            ]
        );

        assert.deepEqual(
            lesson.prerequisites,
            [
                "K282"
            ]
        );

        assert.ok(
            Array.isArray(
                lesson.sections
            )
        );

        assert.equal(
            lesson.sections.length,
            12
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 2. Engine metadata                                                         */
/* -------------------------------------------------------------------------- */

test(
    "2. real content uses LessonEngine V1.0.0",
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
    }
);


/* -------------------------------------------------------------------------- */
/* 3. LEARN                                                                   */
/* -------------------------------------------------------------------------- */

test(
    "3. LEARN produces a READY K283 delivery plan",
    () => {
        const plan = build({
            action: "LEARN"
        });

        assert.equal(
            plan.status,
            "READY"
        );

        assert.equal(
            plan.lessonId,
            "lesson-k283-v1"
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
                targetNodeId: "K283"
            }
        );

        assert.equal(
            plan.items.length,
            lesson.sections.length
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 4. LEARN projection                                                        */
/* -------------------------------------------------------------------------- */

test(
    "4. LEARN projects real K283 instructional sections",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const ids =
            includedIds(plan);

        assert.ok(
            ids.includes("S01")
        );

        assert.ok(
            ids.includes("S02")
        );

        assert.ok(
            ids.includes("S03")
        );

        assert.ok(
            ids.includes("S04")
        );

        assert.ok(
            ids.includes("S05")
        );

        assert.ok(
            ids.includes("S06")
        );

        assert.ok(
            ids.includes("S10")
        );

        assert.ok(
            ids.includes("S11")
        );

        /*
         * Apply / transfer / exit diagnostic
         * are not LEARN delivery sections.
         */
        assert.equal(
            ids.includes("S08"),
            false
        );

        assert.equal(
            ids.includes("S09"),
            false
        );

        assert.equal(
            ids.includes("S12"),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 5. PRACTICE                                                                */
/* -------------------------------------------------------------------------- */

test(
    "5. PRACTICE exposes guided practice, practice and apply sections",
    () => {
        const plan = build({
            action: "PRACTICE"
        });

        const ids =
            includedIds(plan);

        assert.ok(
            ids.includes("S05")
        );

        assert.ok(
            ids.includes("S06")
        );

        assert.ok(
            ids.includes("S07")
        );

        assert.ok(
            ids.includes("S08")
        );

        assert.ok(
            ids.includes("S10")
        );

        /*
         * PRACTICE must not silently become LEARN.
         */
        assert.equal(
            ids.includes("S02"),
            false
        );

        assert.equal(
            ids.includes("S04"),
            false
        );

        /*
         * Transfer belongs to CHALLENGE/RETEST,
         * not normal PRACTICE projection.
         */
        assert.equal(
            ids.includes("S09"),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 6. CHALLENGE                                                               */
/* -------------------------------------------------------------------------- */

test(
    "6. CHALLENGE exposes K283 apply and transfer delivery",
    () => {
        const plan = build({
            action: "CHALLENGE"
        });

        const ids =
            includedIds(plan);

        assert.ok(
            ids.includes("S08")
        );

        assert.ok(
            ids.includes("S09")
        );

        assert.ok(
            ids.includes("S10")
        );

        assert.equal(
            ids.includes("S02"),
            false
        );

        assert.equal(
            ids.includes("S06"),
            false
        );

        assert.equal(
            plan.adaptiveContext.action,
            "CHALLENGE"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 7. Real transfer section                                                   */
/* -------------------------------------------------------------------------- */

test(
    "7. S09 projects the real K283 transfer D4 question request",
    () => {
        const plan = build({
            action: "CHALLENGE"
        });

        const transfer =
            findItem(
                plan,
                "S09"
            );

        assert.ok(
            transfer
        );

        assert.equal(
            transfer.sectionType,
            "transfer"
        );

        assert.equal(
            transfer.kind,
            "question_set"
        );

        assert.equal(
            transfer.disposition,
            "include"
        );

        assert.equal(
            transfer.reason,
            "ACTION_CHALLENGE"
        );

        assert.deepEqual(
            transfer.nodes,
            [
                "K283"
            ]
        );

        assert.deepEqual(
            transfer.questionRequest,
            {
                primaryNode: "K283",

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

                count: 2
            }
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 8. Lesson does not hard-code Q010                                          */
/* -------------------------------------------------------------------------- */

test(
    "8. transfer delivery exposes constraints but does not hard-code Q010",
    () => {
        const plan = build({
            action: "CHALLENGE"
        });

        const transfer =
            findItem(
                plan,
                "S09"
            );

        assert.ok(
            transfer.questionRequest
        );

        assert.equal(
            Object.hasOwn(
                transfer,
                "questionId"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                transfer,
                "questions"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                transfer.questionRequest,
                "questionId"
            ),
            false
        );

        /*
         * Stronger guard:
         * no serialized LessonEngine output should contain
         * the concrete known Q010 id.
         */
        const serialized =
            JSON.stringify(plan);

        assert.equal(
            serialized.includes(
                "Q-A-K283-T-010"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 9. RETEST                                                                  */
/* -------------------------------------------------------------------------- */

test(
    "9. RETEST projects transfer and exit diagnostic without changing action",
    () => {
        const plan = build({
            action: "RETEST"
        });

        assert.equal(
            plan.status,
            "READY"
        );

        assert.equal(
            plan.adaptiveContext.action,
            "RETEST"
        );

        assert.deepEqual(
            includedIds(plan),
            [
                "S09",
                "S12"
            ]
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 10. Exit diagnostic                                                        */
/* -------------------------------------------------------------------------- */

test(
    "10. real exit diagnostic preserves K283 evidence constraints",
    () => {
        const plan = build({
            action: "RETEST"
        });

        const exit =
            findItem(
                plan,
                "S12"
            );

        assert.ok(exit);

        assert.equal(
            exit.sectionType,
            "exitDiagnostic"
        );

        assert.equal(
            exit.kind,
            "question_set"
        );

        assert.equal(
            exit.disposition,
            "include"
        );

        assert.deepEqual(
            exit.questionRequest,
            {
                primaryNode: "K283",

                evidence: [
                    "explain",
                    "apply",
                    "transfer"
                ],

                difficulty: [
                    "D2",
                    "D3",
                    "D4"
                ],

                mode: [
                    "retest",
                    "review",
                    "challenge"
                ],

                count: 4
            }
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 11. SKIP                                                                   */
/* -------------------------------------------------------------------------- */

test(
    "11. SKIP respects Adaptive ownership and delivers no K283 section",
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
            plan.items.length,
            lesson.sections.length
        );

        for (
            const item of plan.items
        ) {
            assert.equal(
                item.disposition,
                "exclude"
            );

            assert.equal(
                item.reason,
                "ADAPTIVE_SKIP"
            );
        }
    }
);


/* -------------------------------------------------------------------------- */
/* 12. HOC_NHANH                                                              */
/* -------------------------------------------------------------------------- */

test(
    "12. HOC_NHANH filters deep LEARN sections on real K283 content",
    () => {
        const plan = build({
            action: "LEARN",
            deliveryMode:
                "HOC_NHANH"
        });

        assert.equal(
            plan.status,
            "READY"
        );

        const orientation =
            findItem(
                plan,
                "S01"
            );

        const mechanism =
            findItem(
                plan,
                "S04"
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
                .includes("S06")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 13. HOC_SAU                                                                */
/* -------------------------------------------------------------------------- */

test(
    "13. HOC_SAU preserves deep K283 LEARN delivery",
    () => {
        const plan = build({
            action: "LEARN",
            deliveryMode:
                "HOC_SAU"
        });

        const ids =
            includedIds(plan);

        assert.ok(
            ids.includes("S01")
        );

        assert.ok(
            ids.includes("S02")
        );

        assert.ok(
            ids.includes("S03")
        );

        assert.ok(
            ids.includes("S04")
        );

        assert.ok(
            ids.includes("S05")
        );

        assert.ok(
            ids.includes("S06")
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 14. ON_THI                                                                 */
/* -------------------------------------------------------------------------- */

test(
    "14. ON_THI filters delivery but does not replace the Adaptive action",
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

        assert.equal(
            plan.deliveryMode,
            "ON_THI"
        );

        const ids =
            includedIds(plan);

        assert.ok(
            ids.includes("S06")
        );

        assert.ok(
            ids.includes("S07")
        );

        assert.ok(
            ids.includes("S08")
        );

        assert.equal(
            ids.includes("S02"),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 15. Target node preservation                                               */
/* -------------------------------------------------------------------------- */

test(
    "15. real K283 projection preserves target node context",
    () => {
        const plan = build({
            action: "CHALLENGE",
            targetNodeId: "K283"
        });

        assert.deepEqual(
            plan.adaptiveContext,
            {
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K283"
            }
        );

        for (
            const item of
            includedItems(plan)
        ) {
            assert.ok(
                item.nodes.includes(
                    "K283"
                )
            );
        }
    }
);


/* -------------------------------------------------------------------------- */
/* 16. First LEARN item                                                       */
/* -------------------------------------------------------------------------- */

test(
    "16. real K283 LEARN plan starts from S01 in HOC_SAU",
    () => {
        const plan = build({
            action: "LEARN",
            deliveryMode:
                "HOC_SAU"
        });

        const next =
            getNextLessonItem({
                plan
            });

        assert.equal(
            next.status,
            "NEXT_ITEM"
        );

        assert.equal(
            next.item.sectionId,
            "S01"
        );

        assert.equal(
            next.item.sectionType,
            "orientation"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 17. Runtime progress                                                       */
/* -------------------------------------------------------------------------- */

test(
    "17. real K283 navigation skips completed sections",
    () => {
        const plan = build({
            action: "LEARN"
        });

        const next =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S01",
                        "S02",
                        "S03",
                        "S04",
                        "S05"
                    ],

                    skippedSectionIds:
                        []
                }
            });

        assert.equal(
            next.status,
            "NEXT_ITEM"
        );

        assert.equal(
            next.item.sectionId,
            "S06"
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 18. RETEST completion                                                      */
/* -------------------------------------------------------------------------- */

test(
    "18. K283 RETEST plan completes after transfer and exit diagnostic",
    () => {
        const plan = build({
            action: "RETEST"
        });

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S09",
                        "S12"
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
/* 19. Completion is not mastery                                              */
/* -------------------------------------------------------------------------- */

test(
    "19. LessonEngine completion does not emit mastery authority",
    () => {
        const plan = build({
            action: "RETEST"
        });

        const result =
            getNextLessonItem({
                plan,

                progress: {
                    completedSectionIds: [
                        "S09",
                        "S12"
                    ],

                    skippedSectionIds:
                        []
                }
            });

        assert.equal(
            result.status,
            "PLAN_COMPLETE"
        );

        assert.equal(
            Object.hasOwn(
                result,
                "mastery"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result,
                "masteryLevel"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result,
                "masteryUpdate"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result,
                "nextAction"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 20. No Student State authority                                             */
/* -------------------------------------------------------------------------- */

test(
    "20. real delivery plan contains no Student State mutation authority",
    () => {
        const plan = build({
            action: "LEARN"
        });

        assert.equal(
            Object.hasOwn(
                plan,
                "studentState"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                plan,
                "masteryUpdate"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                plan,
                "nextAction"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                plan,
                "failureDiagnosis"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                plan,
                "remediationStrategy"
            ),
            false
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 21. Source order                                                           */
/* -------------------------------------------------------------------------- */

test(
    "21. real K283 plan preserves canonical lesson section order",
    () => {
        const plan = build({
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


/* -------------------------------------------------------------------------- */
/* 22. Real lesson immutability                                               */
/* -------------------------------------------------------------------------- */

test(
    "22. LessonEngine does not mutate real lesson-k283.json content",
    () => {
        const before =
            structuredClone(
                lesson
            );

        build({
            action: "LEARN"
        });

        build({
            action: "PRACTICE"
        });

        build({
            action: "CHALLENGE"
        });

        build({
            action: "RETEST"
        });

        assert.deepEqual(
            lesson,
            before
        );
    }
);


/* -------------------------------------------------------------------------- */
/* 23. Determinism                                                            */
/* -------------------------------------------------------------------------- */

test(
    "23. real K283 content produces deterministic delivery plans",
    () => {
        const first = build({
            action: "CHALLENGE",
            deliveryMode:
                "HOC_SAU"
        });

        const second = build({
            action: "CHALLENGE",
            deliveryMode:
                "HOC_SAU"
        });

        assert.deepEqual(
            first,
            second
        );
    }
);