/**
 * questionSelector.test.js
 *
 * Tests for:
 *   questionSelector.js V1.0.0
 *
 * Run:
 *   node --test questionSelector.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    selectQuestion
} from "../../../src/engines/question/questionSelector.js";


/**
 * =========================================================
 * FIXED TIME
 * =========================================================
 */

const NOW = "2026-10-01T09:00:00.000Z";


/**
 * =========================================================
 * QUESTION FIXTURES
 * =========================================================
 *
 * These fixtures intentionally use the same contract shape
 * as the real K281 question bank, but keep only fields needed
 * by QuestionSelector.
 */

const K281_BANK = {
    schemaVersion: "1.0.0",
    bankId: "QB-C09-K281-V1",
    version: "1.0.0",
    subject: "biology",
    language: "vi",
    cluster: "C09",
    primaryNode: "K281",
    status: "draft",

    questions: [
        {
            id: "Q-A-K281-K-001",
            version: "1.0.0",

            nodes: ["K281"],
            primaryNode: "K281",
            secondaryNodes: [],

            evidence: "know",
            difficulty: "D1",
            questionType: "mcq",

            mode: [
                "diagnostic"
            ],

            failureSignatures: [
                "concept_confusion"
            ],

            content: {
                stem:
                    "Khái niệm cơ bản về liên kết gene."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "A"
            }
        },

        {
            id: "Q-A-K281-E-002",
            version: "1.0.0",

            nodes: ["K281"],
            primaryNode: "K281",
            secondaryNodes: ["K280"],

            evidence: "explain",
            difficulty: "D2",
            questionType: "mcq",

            mode: [
                "practice"
            ],

            failureSignatures: [
                "mechanism_confusion",
                "concept_confusion"
            ],

            content: {
                stem:
                    "Giải thích giao tử của AB/ab khi liên kết hoàn toàn."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "B"
            }
        },

        {
            id: "Q-A-K281-A-003",
            version: "1.0.0",

            nodes: ["K281"],
            primaryNode: "K281",
            secondaryNodes: [],

            evidence: "apply",
            difficulty: "D3",
            questionType: "mcq",

            mode: [
                "remediation",
                "practice"
            ],

            failureSignatures: [
                "concept_confusion",
                "mechanism_confusion"
            ],

            context: {
                contextId:
                    "c09-k281-remediation-01",
                contextType:
                    "genetic_cross"
            },

            content: {
                stem:
                    "Xác định giao tử của Ab/aB trong liên kết hoàn toàn."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "B"
            }
        },

        {
            id: "Q-A-K281-A-004",
            version: "1.0.0",

            nodes: ["K281"],
            primaryNode: "K281",
            secondaryNodes: [],

            evidence: "apply",
            difficulty: "D3",
            questionType: "mcq",

            mode: [
                "remediation",
                "practice"
            ],

            failureSignatures: [
                "concept_confusion",
                "mechanism_confusion"
            ],

            context: {
                contextId:
                    "c09-k281-remediation-02",
                contextType:
                    "genetic_cross"
            },

            content: {
                stem:
                    "Vận dụng liên kết hoàn toàn với MN/mn."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "A"
            }
        },

        {
            id: "Q-A-K281-A-005",
            version: "1.0.0",

            nodes: ["K281"],
            primaryNode: "K281",
            secondaryNodes: [],

            evidence: "apply",
            difficulty: "D3",
            questionType: "mcq",

            mode: [
                "retest"
            ],

            failureSignatures: [
                "concept_confusion",
                "reasoning_error"
            ],

            context: {
                contextId:
                    "c09-k281-retest-verbal-01",
                contextType:
                    "genetic_cross"
            },

            metadata: {
                retestGroupId:
                    "c09-k281-linkage-01",

                contextId:
                    "c09-k281-retest-verbal-01"
            },

            content: {
                stem:
                    "Retest liên kết gene với Pq/pQ."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "B"
            }
        }
    ]
};


const K282_BANK = {
    schemaVersion: "1.0.0",
    bankId: "QB-C09-K282-V1",
    version: "1.0.0",
    subject: "biology",
    language: "vi",
    cluster: "C09",
    primaryNode: "K282",
    status: "draft",

    questions: [
        {
            id: "Q-A-K282-A-001",
            version: "1.0.0",

            nodes: ["K282"],
            primaryNode: "K282",

            evidence: "apply",
            difficulty: "D3",
            questionType: "mcq",

            mode: [
                "practice"
            ],

            failureSignatures: [
                "calculation_error"
            ],

            content: {
                stem:
                    "K282 fixture."
            },

            answer: {
                type: "single_choice",
                correctOptionId: "A"
            }
        }
    ]
};


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
        schemaVersion: "1.0.0",

        decisionId:
            `AD-student-1-${targetNodeId}-test`,

        studentId: "student-1",

        timestamp: NOW,

        action,

        reason: {
            primary:
                "Test decision.",
            codes: []
        },

        target: {
            type: "KNOWLEDGE_NODE",
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

            terminal: false
        },

        constraints: {
            respectPrerequisites: true,
            minimumPrerequisiteMastery:
                "M2",

            allowSkip:
                action === "SKIP",

            allowStudentChoice: true,

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
            engine: "AdaptiveEngine",
            rulesVersion: "1.0.0",
            pathsVersion: "1.0.0",
            learningMode: "HOC_SAU"
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
    nodeId = "K281",
    contextId = null
} = {}) {
    const result = {
        questionId,
        nodeId
    };

    if (contextId) {
        result.contextId =
            contextId;
    }

    return result;
}


/**
 * =========================================================
 * TEST 1
 * BASIC SELECTION
 * =========================================================
 */

test(
    "1. selects a matching K281 PRACTICE question",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history: [],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.targetNodeId,
            "K281"
        );

        assert.equal(
            result.selected.bankId,
            "QB-C09-K281-V1"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-003"
        );

        assert.equal(
            result.match.level,
            "EXACT"
        );

        assert.equal(
            result.match.preferredDifficulty,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 2
 * TARGET NODE IS HARD BOUNDARY
 * =========================================================
 */

test(
    "2. selects only questions that directly measure the Adaptive target node",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                targetNodeId: "K282",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK,
                    K282_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.targetNodeId,
            "K282"
        );

        assert.equal(
            result.selected.bankId,
            "QB-C09-K282-V1"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K282-A-001"
        );
    }
);


/**
 * =========================================================
 * TEST 3
 * SECONDARY NODE DOES NOT BECOME DIRECT TARGET
 * =========================================================
 */

test(
    "3. secondaryNodes do not make a question eligible for direct target evidence",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                targetNodeId: "K280",

                evidenceDimensions: [
                    "explain"
                ],

                minDifficulty: "D2",
                maxDifficulty: "D2",
                preferredDifficulty: "D2"
            });

        /*
         * K281-E-002 contains secondaryNodes: ["K280"],
         * but directly measures K281.
         *
         * It must NOT be selected for target K280.
         */
        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
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
            result.candidates.targetMatched,
            0
        );
    }
);


/**
 * =========================================================
 * TEST 4
 * DIFFICULTY MIN/MAX
 * =========================================================
 */

test(
    "4. difficulty min/max are hard filters",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "explain",
                    "apply"
                ],

                minDifficulty: "D2",
                maxDifficulty: "D2",
                preferredDifficulty: "D2"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-E-002"
        );

        assert.equal(
            result.selected.question.difficulty,
            "D2"
        );
    }
);


/**
 * =========================================================
 * TEST 5
 * PREFERRED DIFFICULTY IS RANKING, NOT HARD FILTER
 * =========================================================
 */

test(
    "5. preferred difficulty ranks candidates but does not exclude other allowed difficulties",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "explain",
                    "apply"
                ],

                minDifficulty: "D2",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        /*
         * D3 is preferred over the eligible D2 question.
         */
        assert.equal(
            result.selected.question.difficulty,
            "D3"
        );

        assert.equal(
            result.match.preferredDifficulty,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 6
 * EVIDENCE HARD FILTER
 * =========================================================
 */

test(
    "6. evidenceDimensions are enforced as a hard filter",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "explain"
                ],

                minDifficulty: "D1",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-E-002"
        );

        assert.equal(
            result.selected.question.evidence,
            "explain"
        );
    }
);


/**
 * =========================================================
 * TEST 7
 * QUESTION TYPE HARD FILTER
 * =========================================================
 */

test(
    "7. questionTypes are enforced as a hard filter",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                questionTypes: [
                    "numeric"
                ],

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D1",
                maxDifficulty: "D5",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
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
 * TEST 8
 * EXCLUDE QUESTION IDS
 * =========================================================
 */

test(
    "8. excludeQuestionIds prevent recently used questions from being selected",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3",

                excludeQuestionIds: [
                    "Q-A-K281-A-003"
                ]
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-004"
        );

        assert.notEqual(
            result.selected.questionId,
            "Q-A-K281-A-003"
        );
    }
);


/**
 * =========================================================
 * TEST 9
 * DETERMINISTIC TIE BREAK
 * =========================================================
 */

test(
    "9. equal candidates are selected deterministically by question id",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const first =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        const second =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            first.selected.questionId,
            "Q-A-K281-A-003"
        );

        assert.equal(
            second.selected.questionId,
            first.selected.questionId
        );
    }
);


/**
 * =========================================================
 * TEST 10
 * FAILURE SIGNATURE IS RANKING SIGNAL
 * =========================================================
 */

test(
    "10. matching failure signature improves ranking without becoming a hard filter",
    () => {
        const customBank = {
            bankId:
                "QB-FAILURE-RANKING",

            questions: [
                {
                    id:
                        "Q-A-K281-A-101",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "remediation"
                    ],

                    failureSignatures: [
                        "mechanism_confusion"
                    ]
                },

                {
                    id:
                        "Q-A-K281-A-102",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "remediation"
                    ],

                    failureSignatures: [
                        "concept_confusion"
                    ]
                }
            ]
        };

        const decision =
            createDecision({
                action: "REMEDIATE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3",

                failureSignatures: [
                    "concept_confusion"
                ]
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    customBank
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-102"
        );

        assert.deepEqual(
            result.match.failureSignatureMatches,
            [
                "concept_confusion"
            ]
        );
    }
);


/**
 * =========================================================
 * TEST 11
 * FAILURE SIGNATURE IS NOT HARD FILTER
 * =========================================================
 */

test(
    "11. remediation may still select an eligible question when no failure signature matches",
    () => {
        const customBank = {
            bankId:
                "QB-FAILURE-FALLBACK",

            questions: [
                {
                    id:
                        "Q-A-K281-A-201",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "remediation"
                    ],

                    failureSignatures: [
                        "mechanism_confusion"
                    ]
                }
            ]
        };

        const decision =
            createDecision({
                action: "REMEDIATE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3",

                failureSignatures: [
                    "concept_confusion"
                ]
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    customBank
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-201"
        );

        assert.deepEqual(
            result.match.failureSignatureMatches,
            []
        );
    }
);


/**
 * =========================================================
 * TEST 12
 * REMEDIATION MODE
 * =========================================================
 */

test(
    "12. REMEDIATE selects remediation-compatible questions",
    () => {
        const decision =
            createDecision({
                action: "REMEDIATE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3",

                failureSignatures: [
                    "concept_confusion"
                ]
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.match.modeMatch,
            true
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
 * TEST 13
 * MINI_PRACTICE REMAINS REMEDIATE
 * =========================================================
 */

test(
    "13. MINI_PRACTICE path stage remains compatible with primary REMEDIATE action",
    () => {
        const decision =
            createDecision({
                action: "REMEDIATE",

                currentPathStage:
                    "MINI_PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.action,
            "REMEDIATE"
        );

        assert.equal(
            result.match.modeMatch,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 14
 * MINI_PROBE REMAINS REMEDIATE
 * =========================================================
 */

test(
    "14. MINI_PROBE path stage does not become a new primary action",
    () => {
        const decision =
            createDecision({
                action: "REMEDIATE",

                currentPathStage:
                    "MINI_PROBE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.action,
            "REMEDIATE"
        );

        assert.equal(
            result.match.modeMatch,
            true
        );
    }
);


/**
 * =========================================================
 * TEST 15
 * RETEST WITH VERIFIED NOVELTY
 * =========================================================
 */

test(
    "15. RETEST selects a different question and different context when both are verifiable",
    () => {
        const decision =
            createDecision({
                action: "RETEST",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

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
                    "Q-A-K281-A-004",

                nodeId:
                    "K281",

                contextId:
                    "c09-k281-remediation-02"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history,

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-A-005"
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
 * TEST 16
 * RETEST WITHOUT HISTORY IS STRICT
 * =========================================================
 */

test(
    "16. RETEST returns NO_MATCH when novelty cannot be verified because history is missing",
    () => {
        const decision =
            createDecision({
                action: "RETEST",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history: [],

                now: NOW
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
            result.candidates.eligible,
            0
        );
    }
);


/**
 * =========================================================
 * TEST 17
 * RETEST REJECTS SAME QUESTION
 * =========================================================
 */

test(
    "17. RETEST rejects the same previous question",
    () => {
        const decision =
            createDecision({
                action: "RETEST",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

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
                    "old-context"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history,

                now: NOW
            });

        /*
         * K281 fixture has only one RETEST-mode question,
         * and it is the same question as the reference.
         */
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
 * TEST 18
 * RETEST REJECTS SAME CONTEXT
 * =========================================================
 */

test(
    "18. RETEST rejects a candidate that reuses the previous context",
    () => {
        const decision =
            createDecision({
                action: "RETEST",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

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
                    "Q-OLD-K281-A-999",

                nodeId:
                    "K281",

                contextId:
                    "c09-k281-retest-verbal-01"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history,

                now: NOW
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
 * TEST 19
 * RETEST REQUIRES CONTEXT METADATA
 * =========================================================
 */

test(
    "19. RETEST rejects a candidate when different context cannot be verified",
    () => {
        const bank = {
            bankId:
                "QB-RETEST-NO-CONTEXT",

            questions: [
                {
                    id:
                        "Q-A-K281-A-301",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "retest"
                    ],

                    failureSignatures: []
                }
            ]
        };

        const decision =
            createDecision({
                action: "RETEST",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3",

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
                    "Q-OLD-K281-A-001",

                nodeId:
                    "K281",

                contextId:
                    "old-context"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    bank
                ],

                history,

                now: NOW
            });

        assert.equal(
            result.status,
            "NO_MATCH"
        );
    }
);


/**
 * =========================================================
 * TEST 20
 * CHALLENGE DIFFERENT CONTEXT CAN BE UNVERIFIABLE
 * =========================================================
 */

test(
    "20. CHALLENGE may select a candidate when context novelty is required but no reference exists",
    () => {
        const bank = {
            bankId:
                "QB-CHALLENGE",

            questions: [
                {
                    id:
                        "Q-A-K281-A-401",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "challenge"
                    ],

                    failureSignatures: []
                }
            ]
        };

        const decision =
            createDecision({
                action: "CHALLENGE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

                requireDifferentContext:
                    true,

                constraintDifferentContext:
                    true
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    bank
                ],

                history: [],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.match.differentContextVerified,
            null
        );
    }
);


/**
 * =========================================================
 * TEST 21
 * CHALLENGE REJECTS VERIFIED SAME CONTEXT
 * =========================================================
 */

test(
    "21. CHALLENGE rejects a candidate when the same context is positively identified",
    () => {
        const bank = {
            bankId:
                "QB-CHALLENGE-CONTEXT",

            questions: [
                {
                    id:
                        "Q-A-K281-A-402",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "apply",
                    difficulty: "D3",
                    questionType: "mcq",

                    mode: [
                        "challenge"
                    ],

                    context: {
                        contextId:
                            "challenge-context-1"
                    },

                    failureSignatures: []
                }
            ]
        };

        const decision =
            createDecision({
                action: "CHALLENGE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D4",
                preferredDifficulty: "D3",

                requireDifferentContext:
                    true
            });

        const history = [
            historyItem({
                questionId:
                    "Q-OLD-K281-A-402",

                nodeId:
                    "K281",

                contextId:
                    "challenge-context-1"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    bank
                ],

                history,

                now: NOW
            });

        assert.equal(
            result.status,
            "NO_MATCH"
        );
    }
);


/**
 * =========================================================
 * TEST 22
 * SKIP
 * =========================================================
 */

test(
    "22. SKIP returns NOT_REQUIRED and never selects a question",
    () => {
        const decision =
            createDecision({
                action: "SKIP",

                questionTypes: [],

                evidenceDimensions: [],

                minDifficulty: "D1",
                maxDifficulty: "D1",
                preferredDifficulty: "D1"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "NOT_REQUIRED"
        );

        assert.equal(
            result.selected,
            null
        );

        assert.equal(
            result.reason.code,
            "QUESTION_NOT_REQUIRED"
        );
    }
);


/**
 * =========================================================
 * TEST 23
 * NO TARGET QUESTION
 * =========================================================
 */

test(
    "23. returns NO_MATCH when no bank directly measures the target node",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                targetNodeId:
                    "K999",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D1",
                maxDifficulty: "D5",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK,
                    K282_BANK
                ],

                now: NOW
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
            result.candidates.targetMatched,
            0
        );

        assert.equal(
            result.reason.code,
            "NO_ELIGIBLE_QUESTION"
        );
    }
);


/**
 * =========================================================
 * TEST 24
 * NO MATCH DOES NOT EXECUTE ADAPTIVE FALLBACK
 * =========================================================
 */

test(
    "24. NO_MATCH reports Adaptive fallback but does not execute it",
    () => {
        const decision =
            createDecision({
                action: "RETEST",

                questionTypes: [
                    "numeric"
                ],

                evidenceDimensions: [
                    "transfer"
                ],

                minDifficulty: "D5",
                maxDifficulty: "D5",
                preferredDifficulty: "D5",

                requireDifferentQuestion:
                    true,

                requireDifferentContext:
                    true,

                requireIndependentEvidence:
                    true,

                fallback: {
                    action: "REVIEW",

                    reason:
                        "No retest available.",

                    targetNodeIds: [
                        "K281"
                    ]
                }
            });

        const history = [
            historyItem({
                questionId:
                    "Q-OLD-K281-A-001",

                nodeId:
                    "K281",

                contextId:
                    "old-context"
            })
        ];

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                history,

                now: NOW
            });

        assert.equal(
            result.status,
            "NO_MATCH"
        );

        /*
         * Selector must preserve original action.
         */
        assert.equal(
            result.action,
            "RETEST"
        );

        /*
         * It only exposes Adaptive's fallback.
         */
        assert.deepEqual(
            result.fallback,
            {
                action: "REVIEW",

                reason:
                    "No retest available.",

                targetNodeIds: [
                    "K281"
                ]
            }
        );
    }
);


/**
 * =========================================================
 * TEST 25
 * SINGLE BANK INPUT
 * =========================================================
 */

test(
    "25. accepts a single question-bank object",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks:
                    K281_BANK,

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.bankId,
            "QB-C09-K281-V1"
        );
    }
);


/**
 * =========================================================
 * TEST 26
 * BANK MAP INPUT
 * =========================================================
 */

test(
    "26. accepts question banks in node-keyed map form",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                targetNodeId:
                    "K282",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: {
                    K281:
                        K281_BANK,

                    K282:
                        K282_BANK
                },

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.bankId,
            "QB-C09-K282-V1"
        );
    }
);


/**
 * =========================================================
 * TEST 27
 * NO INPUT MUTATION
 * =========================================================
 */

test(
    "27. does not mutate Adaptive decision, question banks, or history",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const banks = [
            structuredClone(
                K281_BANK
            )
        ];

        const history = [
            historyItem({
                questionId:
                    "Q-OLD-K281-A-001",

                nodeId:
                    "K281",

                contextId:
                    "old-context"
            })
        ];

        const decisionBefore =
            structuredClone(
                decision
            );

        const banksBefore =
            structuredClone(
                banks
            );

        const historyBefore =
            structuredClone(
                history
            );

        selectQuestion({
            adaptiveDecision:
                decision,

            questionBanks:
                banks,

            history,

            now: NOW
        });

        assert.deepEqual(
            decision,
            decisionBefore
        );

        assert.deepEqual(
            banks,
            banksBefore
        );

        assert.deepEqual(
            history,
            historyBefore
        );
    }
);


/**
 * =========================================================
 * TEST 28
 * RETURNED QUESTION IS CLONED
 * =========================================================
 */

test(
    "28. selected.question is cloned and cannot mutate the source bank",
    () => {
        const bank =
            structuredClone(
                K281_BANK
            );

        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    bank
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        result.selected.question.difficulty =
            "D5";

        const sourceQuestion =
            bank.questions.find(
                (question) =>
                    question.id ===
                    result.selected.questionId
            );

        assert.equal(
            sourceQuestion.difficulty,
            "D3"
        );
    }
);


/**
 * =========================================================
 * TEST 29
 * INVALID ADAPTIVE DECISION
 * =========================================================
 */

test(
    "29. throws when adaptiveDecision is missing",
    () => {
        assert.throws(
            () =>
                selectQuestion({
                    questionBanks: [
                        K281_BANK
                    ],

                    now: NOW
                }),

            /adaptiveDecision/i
        );
    }
);


/**
 * =========================================================
 * TEST 30
 * INVALID ACTION
 * =========================================================
 */

test(
    "30. throws for unsupported Adaptive action",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE"
            });

        decision.action =
            "MINI_PROBE";

        assert.throws(
            () =>
                selectQuestion({
                    adaptiveDecision:
                        decision,

                    questionBanks: [
                        K281_BANK
                    ],

                    now: NOW
                }),

            /Unsupported Adaptive action/i
        );
    }
);


/**
 * =========================================================
 * TEST 31
 * FIXED TIME PRODUCES DETERMINISTIC SELECTION ID
 * =========================================================
 */

test(
    "31. fixed now produces deterministic selectionId",
    () => {
        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "apply"
                ],

                minDifficulty: "D3",
                maxDifficulty: "D3",
                preferredDifficulty: "D3"
            });

        const first =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        const second =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    K281_BANK
                ],

                now: NOW
            });

        assert.equal(
            first.selectionId,
            second.selectionId
        );

        assert.equal(
            first.timestamp,
            NOW
        );
    }
);


/**
 * =========================================================
 * TEST 32
 * PREFERRED DIFFICULTY FALLBACK
 * =========================================================
 */

test(
    "32. still selects an allowed non-preferred difficulty when preferred difficulty is unavailable",
    () => {
        const customBank = {
            bankId:
                "QB-NON-PREFERRED",

            questions: [
                {
                    id:
                        "Q-A-K281-E-501",

                    nodes: ["K281"],
                    primaryNode: "K281",

                    evidence: "explain",
                    difficulty: "D2",
                    questionType: "mcq",

                    mode: [
                        "practice"
                    ],

                    failureSignatures: []
                }
            ]
        };

        const decision =
            createDecision({
                action: "PRACTICE",

                evidenceDimensions: [
                    "explain"
                ],

                minDifficulty: "D2",
                maxDifficulty: "D3",

                /*
                 * D3 preferred but no D3 candidate exists.
                 */
                preferredDifficulty:
                    "D3"
            });

        const result =
            selectQuestion({
                adaptiveDecision:
                    decision,

                questionBanks: [
                    customBank
                ],

                now: NOW
            });

        assert.equal(
            result.status,
            "SELECTED"
        );

        assert.equal(
            result.selected.questionId,
            "Q-A-K281-E-501"
        );

        assert.equal(
            result.match.preferredDifficulty,
            false
        );
    }
);