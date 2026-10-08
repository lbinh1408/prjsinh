/**
 * questionSelector.realbank.test.js
 *
 * Integration tests for:
 *   QuestionSelector V1.0.0
 *
 * Uses REAL C09 question banks:
 *   K281.question-bank(1).json
 *   K282.question-bank(1).json
 *   K283.question-bank(1).json
 *   K284.question-bank.json
 *
 * Run:
 *   node --test questionSelector.realbank.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    selectQuestion
} from "../../../src/engines/question/questionSelector.js";


/**
 * =========================================================
 * PATH / JSON LOADER
 * =========================================================
 */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


function loadJson(fileName) {
    const filePath =
        path.join(
            __dirname, "../../../src/data/questions/c09/",
            fileName
        );

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


/**
 * =========================================================
 * REAL QUESTION BANKS
 * =========================================================
 *
 * If your local files do not contain "(1)",
 * change only these 3 file names.
 */

const K281_BANK =
    loadJson(
        "K281.question-bank.json"
    );

const K282_BANK =
    loadJson(
        "K282.question-bank.json"
    );

const K283_BANK =
    loadJson(
        "K283.question-bank.json"
    );

const K284_BANK =
    loadJson(
        "K284.question-bank.json"
    );


const REAL_BANKS = [
    K281_BANK,
    K282_BANK,
    K283_BANK,
    K284_BANK
];


/**
 * =========================================================
 * FIXED TIME
 * =========================================================
 */

const NOW =
    "2026-10-01T09:00:00.000Z";


/**
 * =========================================================
 * ADAPTIVE DECISION FACTORY
 * =========================================================
 */

function createDecision({
    action = "PRACTICE",

    targetNodeId = "K281",

    questionTypes = ["mcq"],

    minDifficulty = "D1",
    maxDifficulty = "D3",
    preferredDifficulty = "D3",

    evidenceDimensions = [
        "know",
        "explain",
        "apply"
    ],

    excludeQuestionIds = [],

    requireDifferentQuestion = false,
    requireDifferentContext = false,
    requireIndependentEvidence = false,

    failureSignatures = [],
    secondaryNodes = [],
    metaSkills = [],

    currentPathStage = null,

    constraintDifferentQuestion = false,
    constraintDifferentContext = false,

    fallback = null
} = {}) {
    const selectionCriteria = {
        questionTypes,

        difficulty: {
            min: minDifficulty,
            max: maxDifficulty,
            preferred:
                preferredDifficulty
        }
    };

    if (
        evidenceDimensions.length > 0
    ) {
        selectionCriteria.evidenceDimensions =
            evidenceDimensions;
    }

    if (
        excludeQuestionIds.length > 0
    ) {
        selectionCriteria.excludeQuestionIds =
            excludeQuestionIds;
    }

    if (requireDifferentQuestion) {
        selectionCriteria.requireDifferentQuestion =
            true;
    }

    if (requireDifferentContext) {
        selectionCriteria.requireDifferentContext =
            true;
    }

    if (requireIndependentEvidence) {
        selectionCriteria.requireIndependentEvidence =
            true;
    }

    if (
        failureSignatures.length > 0
    ) {
        selectionCriteria.failureSignatures =
            failureSignatures;
    }

    if (
        secondaryNodes.length > 0
    ) {
        selectionCriteria.secondaryNodes =
            secondaryNodes;
    }

    if (
        metaSkills.length > 0
    ) {
        selectionCriteria.metaSkills =
            metaSkills;
    }


    const decision = {
        schemaVersion:
            "1.0.0",

        decisionId:
            `AD-student-real-${targetNodeId}-${action}`,

        studentId:
            "student-real",

        timestamp:
            NOW,

        action,

        reason: {
            primary:
                "Real-bank selector integration test.",

            codes: []
        },

        target: {
            type:
                "KNOWLEDGE_NODE",

            nodeIds: [
                targetNodeId
            ],

            primaryNodeId:
                targetNodeId
        },

        selectionCriteria,

        path: {
            current:
                currentPathStage ||
                action,

            next:
                "PRACTICE",

            terminal:
                false
        },

        constraints: {
            respectPrerequisites:
                true,

            minimumPrerequisiteMastery:
                "M2",

            allowSkip:
                action === "SKIP",

            allowStudentChoice:
                true,

            requireDifferentContext:
                constraintDifferentContext,

            requireDifferentQuestion:
                constraintDifferentQuestion
        },

        priority: {
            score: 100,
            factors: {}
        },

        source: {
            engine:
                "AdaptiveEngine",

            rulesVersion:
                "1.0.0",

            pathsVersion:
                "1.0.0",

            learningMode:
                "HOC_SAU"
        }
    };


    if (fallback) {
        decision.fallback =
            fallback;
    }


    return decision;
}


/**
 * =========================================================
 * HISTORY FACTORY
 * =========================================================
 */

function historyItem({
    questionId,
    nodeId,
    contextId = null
}) {
    const item = {
        questionId,
        nodeId
    };

    if (contextId) {
        item.contextId =
            contextId;
    }

    return item;
}


/**
 * =========================================================
 * HELPER ASSERTIONS
 * =========================================================
 */

function assertSelectedForNode(
    result,
    nodeId
) {
    assert.equal(
        result.status,
        "SELECTED"
    );

    assert.equal(
        result.targetNodeId,
        nodeId
    );

    assert.equal(
        result.selected.question.primaryNode,
        nodeId
    );

    assert.ok(
        result.selected.question.nodes.includes(
            nodeId
        )
    );
}


/**
 * =========================================================
 * TEST 1
 * REAL BANK SANITY
 * =========================================================
 */

test(
    "1. loads the four real C09 question banks",
    () => {
        assert.equal(
            K281_BANK.bankId,
            "QB-C09-K281-V1"
        );

        assert.equal(
            K282_BANK.bankId,
            "QB-C09-K282-V1"
        );

        assert.equal(
            K283_BANK.bankId,
            "QB-C09-K283-V1"
        );

        assert.equal(
            K284_BANK.bankId,
            "QB-C09-K284-V1"
        );


        assert.equal(
            K281_BANK.questions.length,
            5
        );

        assert.equal(
            K282_BANK.questions.length,
            6
        );

        assert.equal(
            K283_BANK.questions.length,
            10
        );

        assert.equal(
            K284_BANK.questions.length,
            12
        );
    }
);


/**
 * =========================================================
 * TEST 2
 * K281 PRACTICE
 * =========================================================
 */

test(
    "2. K281 PRACTICE selects the real K281 practice question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K281",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K281"
        );

        /*
         * Real bank:
         *
         * Q003 = remediation only
         * Q004 = remediation + practice
         *
         * Therefore PRACTICE must select Q004.
         */
        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-004"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "practice"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 3
 * K282 PRACTICE
 * =========================================================
 */

test(
    "3. K282 PRACTICE selects a real K282 D3 apply question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K282",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K282"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K282-A-003"
        );

        assert.equal(
            result.selected.question.evidence,
            "apply"
        );

        assert.equal(
            result.selected.question.difficulty,
            "D3"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "practice"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 4
 * K283 PRACTICE
 * =========================================================
 */

test(
    "4. K283 PRACTICE selects a real K283 D3 apply question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K283",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-A-003"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "practice"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 5
 * K284 PRACTICE
 * =========================================================
 */

test(
    "5. K284 PRACTICE selects a real K284 D3 apply question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K284",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K284"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K284-A-003"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "practice"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 6
 * K281 REMEDIATION
 * =========================================================
 */

test(
    "6. K281 REMEDIATE selects a real remediation question",
    () => {
        const decision =
            createDecision({
                action:
                    "REMEDIATE",

                targetNodeId:
                    "K281",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                failureSignatures: [
                    "concept_confusion"
                ]
            });


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K281"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-003"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "remediation"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 7
 * K282 REMEDIATION
 * =========================================================
 */

test(
    "7. K282 REMEDIATE selects a real remediation question",
    () => {
        const decision =
            createDecision({
                action:
                    "REMEDIATE",

                targetNodeId:
                    "K282",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                failureSignatures: [
                    "concept_confusion"
                ]
            });


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K282"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K282-A-004"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "remediation"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 8
 * K283 REMEDIATION
 * =========================================================
 */

test(
    "8. K283 REMEDIATE selects a real remediation question",
    () => {
        const decision =
            createDecision({
                action:
                    "REMEDIATE",

                targetNodeId:
                    "K283",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                failureSignatures: [
                    "calculation_error"
                ]
            });


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-A-005"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "remediation"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 9
 * K284 REMEDIATION
 * =========================================================
 */

test(
    "9. K284 REMEDIATE selects a real remediation question",
    () => {
        const decision =
            createDecision({
                action:
                    "REMEDIATE",

                targetNodeId:
                    "K284",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                failureSignatures: [
                    "reasoning_error"
                ]
            });


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K284"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K284-A-004"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "remediation"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 10
 * K282 REAL RETEST
 * =========================================================
 */

test(
    "10. K282 RETEST selects the real transfer retest question with verified novelty",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K282",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K282-A-005",

                nodeId:
                    "K282",

                contextId:
                    "c09-k282-old-context"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K282"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K282-T-006"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "retest"
            )
        );

        assert.equal(
            result.selected.question.evidence,
            "transfer"
        );

        assert.equal(
            result.selected.question.difficulty,
            "D4"
        );

        assert.equal(
            result.match.differentQuestionVerified,
            true
        );

        assert.equal(
            result.match.differentContextVerified,
            true
        );

        assert.equal(
            result.match.independentEvidenceVerified,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 11
 * K283 APPLY RETEST
 * =========================================================
 */

test(
    "11. K283 RETEST apply D3 selects Q-A-K283-A-007",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K283",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K283-A-006",

                nodeId:
                    "K283",

                contextId:
                    "c09-k283-old-apply-context"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-A-007"
        );

        assert.equal(
            result.selected.question.evidence,
            "apply"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "retest"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 12
 * K283 TRANSFER RETEST
 * =========================================================
 */

test(
    "12. K283 RETEST transfer D4 selects Q-A-K283-T-009",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K283",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K283-T-008",

                nodeId:
                    "K283",

                contextId:
                    "c09-k283-transfer-testcross-01"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-T-009"
        );

        assert.equal(
            result.selected.question.evidence,
            "transfer"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "retest"
            )
        );

        assert.equal(
            result.match.differentQuestionVerified,
            true
        );

        assert.equal(
            result.match.differentContextVerified,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 13
 * K284 APPLY RETEST
 * =========================================================
 */

test(
    "13. K284 RETEST apply D3 selects Q-A-K284-A-010",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K284",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K284-A-009",

                nodeId:
                    "K284",

                contextId:
                    "c09-k284-old-interference-context"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K284"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K284-A-010"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "retest"
            )
        );

        assert.equal(
            result.selected.question.context.contextId,
            "c09-k284-retest-interference-01"
        );
    }
);


/**
 * =========================================================
 * TEST 14
 * K284 TRANSFER RETEST
 * =========================================================
 */

test(
    "14. K284 RETEST transfer D4 selects Q-A-K284-T-012",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K284",

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty:
                    "D4",

                maxDifficulty:
                    "D4",

                preferredDifficulty:
                    "D4",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K284-T-011",

                nodeId:
                    "K284",

                contextId:
                    "c09-k284-transfer-unusual-parental-01"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K284"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K284-T-012"
        );

        assert.equal(
            result.selected.question.evidence,
            "transfer"
        );

        assert.equal(
            result.selected.question.difficulty,
            "D4"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "retest"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 15
 * K283 CHALLENGE
 * =========================================================
 */

test(
    "15. K283 CHALLENGE selects the real transfer challenge question",
    () => {
        const decision =
            createDecision({
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K283",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-T-008"
        );

        assert.equal(
            result.selected.question.evidence,
            "transfer"
        );

        assert.equal(
            result.selected.question.difficulty,
            "D4"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 16
 * K284 CHALLENGE
 * =========================================================
 */

test(
    "16. K284 CHALLENGE selects the first real D4 transfer challenge deterministically",
    () => {
        const decision =
            createDecision({
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K284",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K284"
        );

        /*
         * Both T-011 and T-012 are challenge-compatible.
         * Deterministic tie-break chooses T-011.
         */
        assert.equal(
            result.selected.questionId,
            "Q-A-K284-T-011"
        );

        assert.equal(
            result.selected.question.evidence,
            "transfer"
        );

        assert.ok(
            result.selected.question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * TEST 17
 * EXCLUDE QUESTION ID
 * =========================================================
 */

test(
    "17. excludeQuestionIds moves K283 PRACTICE to the next real eligible question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K283",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                excludeQuestionIds: [
                    "Q-A-K283-A-003"
                ]
            });


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-A-004"
        );

        assert.notEqual(
            result.selected.questionId,
            "Q-A-K283-A-003"
        );
    }
);


/**
 * =========================================================
 * TEST 18
 * HARD NODE BOUNDARY
 * =========================================================
 */

test(
    "18. selector never crosses from K283 target into K284 even when K284 has matching difficulty and evidence",
    () => {
        const decision =
            createDecision({
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K283",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                /*
                 * Put K284 first deliberately.
                 */
                questionBanks: [
                    K284_BANK,
                    K283_BANK,
                    K282_BANK,
                    K281_BANK
                ],

                history: [],

                now:
                    NOW
            });


        assertSelectedForNode(
            result,
            "K283"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K283-T-008"
        );

        assert.notEqual(
            result.selected.bankId,
            "QB-C09-K284-V1"
        );
    }
);


/**
 * =========================================================
 * TEST 19
 * REAL BANK NO MATCH
 * =========================================================
 */

test(
    "19. returns NO_MATCH when real K281 bank has no D4 transfer challenge question",
    () => {
        const decision =
            createDecision({
                action:
                    "CHALLENGE",

                targetNodeId:
                    "K281",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assert.equal(
            result.status,
            "NO_MATCH"
        );

        assert.equal(
            result.selected,
            null
        );

        assert.equal(
            result.targetNodeId,
            "K281"
        );

        assert.equal(
            result.reason.code,
            "NO_ELIGIBLE_QUESTION"
        );
    }
);


/**
 * =========================================================
 * TEST 20
 * REAL K281 RETEST STRICT NOVELTY
 * =========================================================
 */

test(
    "20. K281 RETEST returns NO_MATCH when its only retest question is the previous question",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K281",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-A-K281-A-005",

                nodeId:
                    "K281",

                contextId:
                    "c09-k281-old-context"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assert.equal(
            result.status,
            "NO_MATCH"
        );

        assert.equal(
            result.selected,
            null
        );
    }
);


/**
 * =========================================================
 * TEST 21
 * REAL RETEST SAME CONTEXT REJECTED
 * =========================================================
 */

test(
    "21. K283 RETEST rejects the real candidate when previous context is identical",
    () => {
        const decision =
            createDecision({
                action:
                    "RETEST",

                targetNodeId:
                    "K283",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty:
                    "D3",

                maxDifficulty:
                    "D3",

                preferredDifficulty:
                    "D3",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });


        const history = [
            historyItem({
                questionId:
                    "Q-OLD-K283-A-999",

                nodeId:
                    "K283",

                contextId:
                    "c09-k283-retest-one-recombinant-01"
            })
        ];


        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history,

                now:
                    NOW
            });


        assert.equal(
            result.status,
            "NO_MATCH"
        );

        assert.equal(
            result.selected,
            null
        );
    }
);


/**
 * =========================================================
 * TEST 22
 * REAL BANKS DO NOT MUTATE
 * =========================================================
 */

test(
    "22. selector does not mutate any real question bank",
    () => {
        const before =
            structuredClone(
                REAL_BANKS
            );


        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K284",

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


        selectQuestion({
            adaptiveDecision:
                decision,

            questionBanks:
                REAL_BANKS,

            history: [],

            now:
                NOW
        });


        assert.deepEqual(
            REAL_BANKS,
            before
        );
    }
);


/**
 * =========================================================
 * TEST 23
 * RETURNED REAL QUESTION IS CLONED
 * =========================================================
 */

test(
    "23. returned real question is cloned and cannot mutate K284 source bank",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K284",

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
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    REAL_BANKS,

                history: [],

                now:
                    NOW
            });


        assert.equal(
            result.status,
            "SELECTED"
        );


        const questionId =
            result.selected.questionId;


        const sourceQuestion =
            K284_BANK.questions.find(
                (question) =>
                    question.id ===
                    questionId
            );


        assert.ok(
            sourceQuestion
        );


        const originalDifficulty =
            sourceQuestion.difficulty;


        result.selected.question.difficulty =
            "D5";


        assert.equal(
            sourceQuestion.difficulty,
            originalDifficulty
        );
    }
);


/**
 * =========================================================
 * TEST 24
 * BANK ORDER DOES NOT CHANGE RESULT
 * =========================================================
 */

test(
    "24. changing real-bank array order does not change selected target question",
    () => {
        const decision =
            createDecision({
                action:
                    "PRACTICE",

                targetNodeId:
                    "K283",

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


        const first =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK,
                    K282_BANK,
                    K283_BANK,
                    K284_BANK
                ],

                history: [],

                now:
                    NOW
            });


        const second =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K284_BANK,
                    K283_BANK,
                    K282_BANK,
                    K281_BANK
                ],

                history: [],

                now:
                    NOW
            });


        assert.equal(
            first.status,
            "SELECTED"
        );

        assert.equal(
            second.status,
            "SELECTED"
        );

        assert.equal(
            first.selected.questionId,
            second.selected.questionId
        );

        assert.equal(
            first.selected.questionId,
            "Q-A-K283-A-003"
        );
    }
);