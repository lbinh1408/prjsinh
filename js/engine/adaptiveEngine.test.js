/**
 * adaptiveEngine.test.js
 *
 * Test suite for Adaptive Engine V1.0.0
 *
 * Run:
 *   node --test adaptiveEngine.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    decideNextAction
} from "./adaptiveEngine.js";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import nextActionSchema from "../../data/adaptive/next-action.schema.json" with {
    type: "json"
};

const ajv = new Ajv2020({
    allErrors: true,
    strict: false
});

addFormats(ajv);

const validateNextAction =
    ajv.compile(nextActionSchema);
/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const FIXED_NOW = "2026-09-28T10:00:00.000Z";

const adaptiveRules = {
    schemaVersion: "1.0.0",

    priorityRules: {
        priorityFactors: {
            P1: 100,
            P2: 70,
            weakness: 40,
            prerequisiteBlocking: 50,
            examRelevance: 20,
            dependencyCentrality: 20,
            recentFailure: 20,
            staleKnowledge: 10,
            transferGap: 15
        }
    },

    questionSelectionRules: {
        LEARN: {
            difficulty: ["D1", "D2"],
            evidence: ["know", "explain"]
        },

        PRACTICE: {
            difficulty: ["D2", "D3"],
            evidence: ["explain", "apply"]
        },

        CHALLENGE: {
            difficulty: ["D3", "D4", "D5"],
            evidence: ["apply", "transfer"]
        },

        REMEDIATE: {
            difficulty: ["D1", "D2", "D3"],
            evidence: [
                "know",
                "explain",
                "apply"
            ]
        },

        RETEST: {
            difficulty: ["D3", "D4"],
            evidence: ["apply", "transfer"]
        },

        REVIEW: {
            difficulty: ["D3", "D4"],
            evidence: ["apply", "transfer"]
        }
    },

    antiLoopRules: {
        sameNodeSameActionLimit: 2,
        sameFailureSignatureLimit: 3
    },

    studentChoiceRules: {
        override: {
            enabled: true
        }
    },

    dependencyCentralityRules: {
        bonusLevels: {
            high: 20,
            medium: 10,
            low: 0
        }
    },

    versioning: {
        currentVersion: "1.0.0"
    }
};


const adaptivePaths = {
    schemaVersion: "1.0.0",

    masteryPaths: {
        M0: {
            defaultAction: "LEARN",
            path: [
                "LEARN",
                "PRACTICE",
                "CHALLENGE",
                "RETEST",
                "REVIEW"
            ]
        },

        M1: {
            defaultAction: "LEARN",
            path: [
                "LEARN",
                "PRACTICE",
                "CHALLENGE"
            ]
        },

        M2: {
            defaultAction: "PRACTICE",
            path: [
                "PRACTICE",
                "CHALLENGE",
                "RETEST",
                "REVIEW"
            ]
        },

        M3: {
            defaultAction: "CHALLENGE",
            path: [
                "CHALLENGE",
                "RETEST",
                "REVIEW"
            ]
        },

        M4: {
            defaultAction: "RETEST",
            path: [
                "RETEST",
                "REVIEW"
            ]
        }
    },

    remediationPaths: {
        default: {
            entry: "REMEDIATE",
            path: [
                "REMEDIATE",
                "MINI_PRACTICE",
                "MINI_PROBE",
                "RETURN"
            ]
        },

        maximumDepth: 3
    },

    transitionResolution: {
        sourceOfTruth:
            "adaptive/rules.json#decisionPrecedence",

        principle:
            "Adaptive rules select the canonical primary action first. Adaptive paths only resolve the workflow transition for that selected action.",

        mustNotOverridePrimaryAction: true
    }
};


const knowledgeMap = {
    nodes: [
        {
            id: "K281",
            dependencies: []
        },

        {
            id: "K282",
            dependencies: [
                {
                    nodeId: "K281",
                    dependencyType: "D1"
                }
            ]
        },

        {
            id: "K283",
            dependencies: [
                {
                    nodeId: "K281",
                    dependencyType: "D1"
                },
                {
                    nodeId: "K282",
                    dependencyType: "D2"
                }
            ]
        }
    ]
};


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */
function assertValidNextAction(result) {
    const valid =
        validateNextAction(result);

    assert.equal(
        valid,
        true,
        [
            "next-action.schema.json validation failed:",
            JSON.stringify(
                validateNextAction.errors,
                null,
                2
            ),
            "",
            "Actual output:",
            JSON.stringify(
                result,
                null,
                2
            )
        ].join("\n")
    );
}

function makeState({
    nodeId = "K283",
    mastery = "M0",
    status = "developing",
    evidence = {},
    confidence = {},
    failure = null,
    failureSummary = {}
} = {}) {
    return {
        nodeId,
        mastery,
        status,

        evidence: {
            know: 0,
            explain: 0,
            apply: 0,
            transfer: 0,
            ...evidence
        },

        confidence: {
            level: "medium",
            score: 0.6,
            ...confidence
        },

        failure,

        failureSummary
    };
}


function decide(overrides = {}) {
    return decideNextAction({
        studentId: "STUDENT-001",

        targetNodeId: "K283",

        masteryState: makeState(),

        knowledgeMap: {
            nodes: [
                {
                    id: "K283",
                    dependencies: []
                }
            ]
        },

        adaptiveRules,
        adaptivePaths,

        recentResults: [],

        sessionContext: {},

        learningMode: "HOC_SAU",

        timeBudget: 30,

        now: FIXED_NOW,

        ...overrides
    });
}


/**
 * =========================================================
 * GROUP A
 * BASIC MASTERY ROUTING
 * =========================================================
 */

test("Adaptive Engine V1", async (t) => {

    await t.test(
        "1. M0 routes to LEARN",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M0"
                })
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.equal(
                result.reason.masteryLevel,
                "M0"
            );

            assert.ok(
                result.reason.codes.includes(
                    "MASTERY_M0"
                )
            );
        }
    );


    await t.test(
        "2. M1 routes to LEARN",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M1"
                })
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.equal(
                result.reason.masteryLevel,
                "M1"
            );
        }
    );


    await t.test(
        "3. M2 routes to PRACTICE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.ok(
                result.reason.codes.includes(
                    "MASTERY_M2"
                )
            );
        }
    );


    await t.test(
        "4. M3 routes to CHALLENGE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                })
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            assert.ok(
                result.reason.codes.includes(
                    "MASTERY_M3"
                )
            );
        }
    );


    await t.test(
        "5. M4 with retestDue routes to RETEST",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                sessionContext: {
                    retestDue: true
                }
            });

            assert.equal(
                result.action,
                "RETEST"
            );

            assert.ok(
                result.reason.codes.includes(
                    "RETEST_DUE"
                )
            );
        }
    );


    /**
     * =====================================================
     * GROUP B
     * STABLE / REVIEW / SKIP
     * =====================================================
     */

    await t.test(
        "6. stable + reviewDue routes to REVIEW",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                sessionContext: {
                    reviewDue: true,
                    retestDue: false
                }
            });

            assert.equal(
                result.action,
                "REVIEW"
            );

            assert.ok(
                result.reason.codes.includes(
                    "REVIEW_DUE"
                )
            );
        }
    );


    await t.test(
        "7. stable + no reviewDue routes to SKIP",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                sessionContext: {
                    reviewDue: false,
                    retestDue: false
                }
            });

            assert.equal(
                result.action,
                "SKIP"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K283"
            );
        }
    );


    await t.test(
        "8. mastered M4 without explicit retest flag defaults to RETEST",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "mastered"
                })
            });

            assert.equal(
                result.action,
                "RETEST"
            );
        }
    );


    /**
     * =====================================================
     * GROUP C
     * WEAKNESS / FAILURE
     * =====================================================
     */

    await t.test(
        "9. weak status routes to REMEDIATE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "weak"
                })
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.ok(
                result.reason.codes.includes(
                    "STATUS_WEAK"
                )
            );
        }
    );


    await t.test(
        "10. repeated failure >= 2 routes to REMEDIATE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "developing"
                }),

                sessionContext: {
                    failure: {
                        failureType:
                            "concept_confusion",

                        repeated: 2,

                        sourceNodeId:
                            "K282"
                    }
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K282"
            );

            assert.equal(
                result.target.sourceNodeId,
                "K283"
            );

            assert.equal(
                result.reason.failureSignature,
                "concept_confusion"
            );
        }
    );


    await t.test(
        "11. single failure does not automatically remediate",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2",
                    status: "developing"
                }),

                sessionContext: {
                    failure: {
                        failureType:
                            "calculation_error",

                        repeated: 1
                    }
                }
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );
        }
    );


    await t.test(
        "12. failureSummary count >= 2 is recognized",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",

                    failureSummary: {
                        mechanism_confusion: {
                            count: 2,
                            sourceNodeId:
                                "K282"
                        }
                    }
                })
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.reason.failureSignature,
                "mechanism_confusion"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K282"
            );
        }
    );


    /**
     * =====================================================
     * GROUP D
     * PREREQUISITES
     * =====================================================
     */

    await t.test(
        "13. D1 prerequisite below M2 blocks target and routes to REMEDIATE",
        () => {
            const result = decide({
                targetNodeId: "K282",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M1"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K281"
            );

            assert.equal(
                result.target.sourceNodeId,
                "K282"
            );

            assert.ok(
                result.reason.codes.includes(
                    "PREREQUISITE_GAP"
                )
            );
        }
    );


    await t.test(
        "14. D1 prerequisite at M2 does not block",
        () => {
            const result = decide({
                targetNodeId: "K282",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M2"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K282"
            );
        }
    );


    await t.test(
        "15. D2 prerequisite below M2 does not block",
        () => {
            const result = decide({
                targetNodeId: "K283",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M3"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M0"
                    }),

                    K283: makeState({
                        nodeId: "K283",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K283"
            );
        }
    );


    await t.test(
        "16. weakest blocking D1 prerequisite is selected",
        () => {
            const customMap = {
                nodes: [
                    {
                        id: "K300",

                        dependencies: [
                            {
                                nodeId: "K100",
                                dependencyType: "D1"
                            },
                            {
                                nodeId: "K101",
                                dependencyType: "D1"
                            }
                        ]
                    }
                ]
            };

            const result = decide({
                targetNodeId: "K300",

                knowledgeMap: customMap,

                masteryState: {
                    K100: makeState({
                        nodeId: "K100",
                        mastery: "M1"
                    }),

                    K101: makeState({
                        nodeId: "K101",
                        mastery: "M0"
                    }),

                    K300: makeState({
                        nodeId: "K300",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K101"
            );
        }
    );


    /**
     * =====================================================
     * GROUP E
     * DECISION PRECEDENCE
     * =====================================================
     */

    await t.test(
        "17. blocking prerequisite overrides M3 challenge",
        () => {
            const result = decide({
                targetNodeId: "K282",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M0"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K281"
            );
        }
    );


    await t.test(
        "18. blocking prerequisite overrides weak target",
        () => {
            const result = decide({
                targetNodeId: "K282",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M0"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3",
                        status: "weak"
                    })
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K281"
            );
        }
    );


    await t.test(
        "19. active remediation overrides normal mastery routing",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                }),

                sessionContext: {
                    activeRemediation: true,

                    remediationTargetNodeId:
                        "K282"
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K282"
            );
        }
    );


    await t.test(
        "20. repeated failure overrides M3 challenge",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                }),

                sessionContext: {
                    failure: {
                        failureType:
                            "reasoning_error",

                        repeated: 2
                    }
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );
        }
    );


    /**
     * =====================================================
     * GROUP F
     * PATH RESOLUTION
     * =====================================================
     */

    await t.test(
        "21. LEARN path resolves next stage to PRACTICE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M0"
                })
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.equal(
                result.path.current,
                "LEARN"
            );

            assert.equal(
                result.path.next,
                "PRACTICE"
            );
        }
    );


    await t.test(
        "22. PRACTICE path resolves next stage to CHALLENGE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.equal(
                result.path.next,
                "CHALLENGE"
            );
        }
    );


    await t.test(
        "23. REMEDIATE resolves internal path without changing primary action",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "weak"
                })
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.path.current,
                "REMEDIATE"
            );

            assert.equal(
                result.path.next,
                "MINI_PRACTICE"
            );
        }
    );


    await t.test(
        "24. MINI_PRACTICE continues to MINI_PROBE while primary action remains REMEDIATE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                }),

                sessionContext: {
                    activeRemediation: true,

                    currentPathStage:
                        "MINI_PRACTICE"
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.path.current,
                "MINI_PRACTICE"
            );

            assert.equal(
                result.path.next,
                "MINI_PROBE"
            );
        }
    );


    await t.test(
        "25. successful MINI_PROBE resolves RETURN",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                }),

                sessionContext: {
                    activeRemediation: true,

                    currentPathStage:
                        "MINI_PROBE",

                    probePassed: true
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.path.next,
                "RETURN"
            );
        }
    );


    await t.test(
        "26. failed MINI_PROBE returns to REMEDIATE",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                }),

                sessionContext: {
                    activeRemediation: true,

                    currentPathStage:
                        "MINI_PROBE",

                    probePassed: false
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                result.path.next,
                "REMEDIATE"
            );
        }
    );


    /**
     * =====================================================
     * GROUP G
     * QUESTION SELECTION
     * =====================================================
     */

    await t.test(
        "27. PRACTICE gets D2-D3 and explain/apply selection",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.deepEqual(
                result.selectionCriteria
                    .evidenceDimensions,

                ["explain", "apply"]
            );

            assert.equal(
                result.selectionCriteria
                    .difficulty.min,
                "D2"
            );

            assert.equal(
                result.selectionCriteria
                    .difficulty.max,
                "D3"
            );
        }
    );


    await t.test(
        "28. CHALLENGE requires different context",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                })
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            assert.equal(
                result.selectionCriteria
                    .requireDifferentContext,
                true
            );

            assert.equal(
                result.constraints
                    .requireDifferentContext,
                true
            );
        }
    );


    await t.test(
        "29. RETEST requires different question and context",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                sessionContext: {
                    retestDue: true
                }
            });

            assert.equal(
                result.selectionCriteria
                    .requireDifferentQuestion,
                true
            );

            assert.equal(
                result.selectionCriteria
                    .requireDifferentContext,
                true
            );

            assert.equal(
                result.selectionCriteria
                    .requireIndependentEvidence,
                true
            );
        }
    );


    await t.test(
        "30. recent question IDs are excluded",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                }),

                recentResults: [
                    {
                        questionId:
                            "Q-A-K283-A-001"
                    },
                    {
                        questionId:
                            "Q-A-K283-A-002"
                    }
                ]
            });

            assert.deepEqual(
                result.selectionCriteria
                    .excludeQuestionIds,

                [
                    "Q-A-K283-A-001",
                    "Q-A-K283-A-002"
                ]
            );
        }
    );


    /**
     * =====================================================
     * GROUP H
     * PRIORITY
     * =====================================================
     */

    await t.test(
        "31. P1 contributes 100 priority points",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                }),

                sessionContext: {
                    nodePriority: "P1"
                }
            });

            assert.equal(
                result.priority
                    .factors
                    .knowledgePriority,
                100
            );

            assert.equal(
                result.priority.score,
                100
            );
        }
    );


    await t.test(
        "32. weak node receives weakness priority bonus",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2",
                    status: "weak"
                })
            });

            assert.equal(
                result.priority
                    .factors
                    .weaknessBonus,
                40
            );

            assert.equal(
                result.priority.score,
                40
            );
        }
    );


    await t.test(
        "33. blocking prerequisite contributes prerequisite bonus",
        () => {
            const result = decide({
                targetNodeId: "K282",

                knowledgeMap,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M0"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                result.priority
                    .factors
                    .prerequisiteBonus,
                50
            );
        }
    );


    await t.test(
        "34. repeated failure contributes recentFailure bonus",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                }),

                sessionContext: {
                    failure: {
                        failureType:
                            "concept_confusion",

                        repeated: 2
                    }
                }
            });

            assert.equal(
                result.priority
                    .factors
                    .recentFailureBonus,
                20
            );
        }
    );


    await t.test(
        "35. priority factors are additive",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2",
                    status: "weak"
                }),

                sessionContext: {
                    nodePriority: "P1",
                    examRelevance: true,
                    staleKnowledge: true,
                    transferGap: true
                }
            });

            /*
             * P1              = 100
             * weakness       = 40
             * exam relevance = 20
             * stale          = 10
             * transfer gap   = 15
             *
             * total = 185
             */

            assert.equal(
                result.priority.score,
                185
            );
        }
    );


    /**
     * =====================================================
     * GROUP I
     * OUTPUT CONTRACT BASICS
     * =====================================================
     */

    await t.test(
        "36. output contains required top-level fields",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            const required = [
                "schemaVersion",
                "decisionId",
                "studentId",
                "timestamp",
                "action",
                "reason",
                "target",
                "selectionCriteria",
                "path",
                "constraints",
                "priority",
                "source"
            ];

            for (const key of required) {
                assert.ok(
                    Object.hasOwn(
                        result,
                        key
                    ),

                    `Missing required field: ${key}`
                );
            }
        }
    );


    await t.test(
        "37. action is always canonical",
        () => {
            const allowed = [
                "LEARN",
                "PRACTICE",
                "CHALLENGE",
                "REMEDIATE",
                "RETEST",
                "REVIEW",
                "SKIP"
            ];

            const states = [
                makeState({
                    mastery: "M0"
                }),

                makeState({
                    mastery: "M1"
                }),

                makeState({
                    mastery: "M2"
                }),

                makeState({
                    mastery: "M3"
                }),

                makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                makeState({
                    mastery: "M3",
                    status: "weak"
                })
            ];

            for (const state of states) {
                const result = decide({
                    masteryState: state
                });

                assert.ok(
                    allowed.includes(
                        result.action
                    ),

                    `Non-canonical action returned: ${result.action}`
                );
            }
        }
    );


    await t.test(
        "38. source identifies AdaptiveEngine and contract versions",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.equal(
                result.source.engine,
                "AdaptiveEngine"
            );

            assert.equal(
                result.source.rulesVersion,
                "1.0.0"
            );

            assert.equal(
                result.source.pathsVersion,
                "1.0.0"
            );

            assert.equal(
                result.source.learningMode,
                "HOC_SAU"
            );
        }
    );


    await t.test(
        "39. timestamp is deterministic when now is supplied",
        () => {
            const result = decide();

            assert.equal(
                result.timestamp,
                FIXED_NOW
            );
        }
    );


    await t.test(
        "40. decisionId is deterministic when inputs and now are fixed",
        () => {
            const first = decide();

            const second = decide();

            assert.equal(
                first.decisionId,
                second.decisionId
            );
        }
    );


    /**
     * =====================================================
     * GROUP J
     * CONSTRAINTS
     * =====================================================
     */

    await t.test(
        "41. D1 minimum prerequisite mastery is M2",
        () => {
            const result = decide();

            assert.equal(
                result.constraints
                    .respectPrerequisites,
                true
            );

            assert.equal(
                result.constraints
                    .minimumPrerequisiteMastery,
                "M2"
            );
        }
    );


    await t.test(
        "42. time budget becomes maxTimeMinutes",
        () => {
            const result = decide({
                timeBudget: 15
            });

            assert.equal(
                result.constraints
                    .maxTimeMinutes,
                15
            );
        }
    );


    await t.test(
        "43. anti-loop limits are exposed as constraints",
        () => {
            const result = decide();

            assert.equal(
                result.constraints
                    .maxSameNodeActions,
                2
            );

            assert.equal(
                result.constraints
                    .maxSameFailureSignature,
                3
            );
        }
    );


    /**
     * =====================================================
     * GROUP K
     * LEARNING MODE
     * =====================================================
     */

    await t.test(
        "44. HOC_NHANH is preserved in source and reason",
        () => {
            const result = decide({
                learningMode: "HOC_NHANH"
            });

            assert.equal(
                result.source.learningMode,
                "HOC_NHANH"
            );

            assert.ok(
                result.reason.codes.includes(
                    "HOC_NHANH_MODE"
                )
            );
        }
    );


    await t.test(
        "45. ON_THI is preserved in source and reason",
        () => {
            const result = decide({
                learningMode: "ON_THI"
            });

            assert.equal(
                result.source.learningMode,
                "ON_THI"
            );

            assert.ok(
                result.reason.codes.includes(
                    "ON_THI_MODE"
                )
            );
        }
    );


    await t.test(
        "46. invalid learning mode falls back to HOC_SAU",
        () => {
            const result = decide({
                learningMode:
                    "INVALID_MODE"
            });

            assert.equal(
                result.source.learningMode,
                "HOC_SAU"
            );
        }
    );


    /**
     * =====================================================
     * GROUP L
     * IMMUTABILITY
     * =====================================================
     */

    await t.test(
        "47. engine does not mutate masteryState",
        () => {
            const state = makeState({
                mastery: "M2",

                evidence: {
                    know: 0.8,
                    explain: 0.7,
                    apply: 0.6,
                    transfer: 0.2
                }
            });

            const before =
                JSON.stringify(state);

            decide({
                masteryState: state
            });

            const after =
                JSON.stringify(state);

            assert.equal(
                after,
                before
            );
        }
    );


    await t.test(
        "48. engine does not mutate knowledgeMap",
        () => {
            const map =
                structuredClone(
                    knowledgeMap
                );

            const before =
                JSON.stringify(map);

            decide({
                targetNodeId: "K282",

                knowledgeMap: map,

                masteryState: {
                    K281: makeState({
                        nodeId: "K281",
                        mastery: "M2"
                    }),

                    K282: makeState({
                        nodeId: "K282",
                        mastery: "M3"
                    })
                }
            });

            assert.equal(
                JSON.stringify(map),
                before
            );
        }
    );


    await t.test(
        "49. engine does not mutate adaptiveRules or adaptivePaths",
        () => {
            const rules =
                structuredClone(
                    adaptiveRules
                );

            const paths =
                structuredClone(
                    adaptivePaths
                );

            const rulesBefore =
                JSON.stringify(rules);

            const pathsBefore =
                JSON.stringify(paths);

            decide({
                adaptiveRules: rules,
                adaptivePaths: paths
            });

            assert.equal(
                JSON.stringify(rules),
                rulesBefore
            );

            assert.equal(
                JSON.stringify(paths),
                pathsBefore
            );
        }
    );


    /**
     * =====================================================
     * GROUP M
     * DEFENSIVE INPUT
     * =====================================================
     */

    await t.test(
        "50. missing mastery defaults conservatively to M0 → LEARN",
        () => {
            const result =
                decideNextAction({
                    studentId:
                        "STUDENT-001",

                    targetNodeId:
                        "K283",

                    adaptiveRules,
                    adaptivePaths,

                    now:
                        FIXED_NOW
                });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.equal(
                result.reason.masteryLevel,
                "M0"
            );
        }
    );


    await t.test(
        "51. invalid mastery falls back conservatively to M0",
        () => {
            const result = decide({
                masteryState: {
                    nodeId: "K283",
                    mastery: "M99",
                    status: "developing"
                }
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.equal(
                result.reason.masteryLevel,
                "M0"
            );
        }
    );


    await t.test(
        "52. unknown failure type does not trigger remediation by itself",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                }),

                sessionContext: {
                    failure: {
                        failureType:
                            "UNKNOWN_FAILURE",

                        repeated: 1
                    }
                }
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.equal(
                result.reason
                    .failureSignature,
                undefined
            );
        }
    );


    /**
     * =====================================================
     * GROUP N
     * FALLBACKS
     * =====================================================
     */

    await t.test(
        "53. REMEDIATE provides LEARN fallback",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "weak"
                })
            });

            assert.equal(
                result.fallback.action,
                "LEARN"
            );
        }
    );


    await t.test(
        "54. CHALLENGE provides PRACTICE fallback",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                })
            });

            assert.equal(
                result.fallback.action,
                "PRACTICE"
            );
        }
    );


    await t.test(
        "55. RETEST provides REVIEW fallback",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                sessionContext: {
                    retestDue: true
                }
            });

            assert.equal(
                result.fallback.action,
                "REVIEW"
            );
        }
    );


    /**
     * =====================================================
     * GROUP O
     * IMPORTANT CONTRACT INVARIANTS
     * =====================================================
     */

    await t.test(
        "56. internal remediation stage never leaks into primary action",
        () => {
            const internalStages = [
                "MINI_PRACTICE",
                "MINI_PROBE"
            ];

            for (
                const currentPathStage
                of internalStages
            ) {
                const result = decide({
                    masteryState:
                        makeState({
                            mastery: "M3"
                        }),

                    sessionContext: {
                        activeRemediation:
                            true,

                        currentPathStage
                    }
                });

                assert.equal(
                    result.action,
                    "REMEDIATE"
                );

                assert.notEqual(
                    result.action,
                    currentPathStage
                );
            }
        }
    );


    await t.test(
        "57. paths cannot override primary action",
        () => {
            const maliciousPaths = {
                ...adaptivePaths,

                masteryPaths: {
                    ...adaptivePaths
                        .masteryPaths,

                    M2: {
                        defaultAction:
                            "REMEDIATE",

                        path: [
                            "REMEDIATE",
                            "REVIEW"
                        ]
                    }
                }
            };

            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                }),

                adaptivePaths:
                    maliciousPaths
            });

            /*
             * Primary decision must still come
             * from rules / mastery routing.
             */
            assert.equal(
                result.action,
                "PRACTICE"
            );
        }
    );


    await t.test(
        "58. engine never writes mastery into output",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

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
                    "newMastery"
                ),
                false
            );
        }
    );


    await t.test(
        "59. repeated failure does not change mastery",
        () => {
            const state =
                makeState({
                    mastery: "M3"
                });

            const result = decide({
                masteryState: state,

                sessionContext: {
                    failure: {
                        failureType:
                            "concept_confusion",

                        repeated: 3
                    }
                }
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assert.equal(
                state.mastery,
                "M3"
            );

            assert.equal(
                Object.hasOwn(
                    result,
                    "newMastery"
                ),
                false
            );
        }
    );


    await t.test(
        "60. canonical end-to-end M2 decision is structurally coherent",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2",
                    status: "developing",

                    evidence: {
                        know: 0.82,
                        explain: 0.68,
                        apply: 0.51,
                        transfer: 0.2
                    }
                }),

                sessionContext: {
                    nodePriority: "P1",
                    examRelevance: true
                }
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.equal(
                result.target.type,
                "KNOWLEDGE_NODE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K283"
            );

            assert.deepEqual(
                result.selectionCriteria
                    .evidenceDimensions,

                ["explain", "apply"]
            );

            assert.equal(
                result.path.current,
                "PRACTICE"
            );

            assert.equal(
                result.path.next,
                "CHALLENGE"
            );

            assert.equal(
                result.constraints
                    .respectPrerequisites,
                true
            );

            assert.equal(
                result.priority.score,
                120
            );

            assert.equal(
                result.source.engine,
                "AdaptiveEngine"
            );
        }
    );
    /**
 * =====================================================
 * GROUP P
 * CROSS-CONTRACT / SCHEMA COMPATIBILITY
 *
 * Tests 61–70
 *
 * Purpose:
 * - Adaptive output must use canonical Question Contract
 *   questionType values.
 * - Evidence dimension must remain separate from
 *   questionType.
 * - All 7 canonical actions must produce structurally
 *   coherent next-action payloads.
 * - Internal path stages must never leak into action.
 * =====================================================
 */

    const CANONICAL_QUESTION_TYPES = [
        "mcq",
        "multi_select",
        "true_false",
        "matching",
        "ordering",
        "fill_blank",
        "short_answer",
        "numeric",
        "data_analysis",
        "experiment",
        "sequence",
        "open_response"
    ];

    const LEGACY_QUESTION_TYPES = [
        "Q-K",
        "Q-E",
        "Q-A",
        "Q-T",
        "Q-D"
    ];

    const CANONICAL_EVIDENCE_DIMENSIONS = [
        "know",
        "explain",
        "apply",
        "transfer"
    ];

    const CANONICAL_ACTIONS = [
        "LEARN",
        "PRACTICE",
        "CHALLENGE",
        "REMEDIATE",
        "RETEST",
        "REVIEW",
        "SKIP"
    ];

    const CANONICAL_PATH_CURRENT = [
        "DIAGNOSTIC",
        "LEARN",
        "PRACTICE",
        "CHALLENGE",
        "REMEDIATE",
        "MINI_PRACTICE",
        "MINI_PROBE",
        "RETEST",
        "REVIEW",
        "SKIP",
        "TRANSFER",
        "CROSS_NODE"
    ];

    const CANONICAL_PATH_NEXT = [
        "LEARN",
        "PRACTICE",
        "CHALLENGE",
        "REMEDIATE",
        "MINI_PRACTICE",
        "MINI_PROBE",
        "RETEST",
        "REVIEW",
        "SKIP",
        "TRANSFER",
        "CROSS_NODE",
        "RETURN",
        "SESSION_COMPLETE"
    ];


    /**
     * -----------------------------------------------------
     * TEST 61
     * LEARN uses semantic Question Contract questionTypes
     * -----------------------------------------------------
     */

    await t.test(
        "61. LEARN uses canonical semantic questionTypes",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M0"
                })
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assert.ok(
                result.selectionCriteria
                    .questionTypes.length > 0
            );

            for (
                const questionType
                of result.selectionCriteria
                    .questionTypes
            ) {
                assert.ok(
                    CANONICAL_QUESTION_TYPES.includes(
                        questionType
                    ),

                    `Invalid Question Contract questionType: ${questionType}`
                );
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 62
     * No legacy Q-K / Q-E / Q-A / Q-T / Q-D may leak
     * -----------------------------------------------------
     */

    await t.test(
        "62. legacy Q-K/Q-E/Q-A/Q-T/Q-D taxonomy never leaks into questionTypes",
        () => {
            const scenarios = [
                makeState({
                    mastery: "M0"
                }),

                makeState({
                    mastery: "M1"
                }),

                makeState({
                    mastery: "M2"
                }),

                makeState({
                    mastery: "M3"
                }),

                makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                makeState({
                    mastery: "M3",
                    status: "weak"
                })
            ];

            for (const state of scenarios) {
                const result = decide({
                    masteryState: state,

                    sessionContext:
                        state.status === "stable"
                            ? {
                                reviewDue: true,
                                retestDue: false
                            }
                            : {}
                });

                for (
                    const questionType
                    of result.selectionCriteria
                        .questionTypes
                ) {
                    assert.equal(
                        LEGACY_QUESTION_TYPES.includes(
                            questionType
                        ),
                        false,

                        `Legacy question type leaked: ${questionType}`
                    );
                }
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 63
     * questionTypes and evidenceDimensions are separate
     * -----------------------------------------------------
     */

    await t.test(
        "63. questionTypes and evidenceDimensions remain separate concepts",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.ok(
                Array.isArray(
                    result.selectionCriteria
                        .questionTypes
                )
            );

            assert.ok(
                Array.isArray(
                    result.selectionCriteria
                        .evidenceDimensions
                )
            );

            for (
                const questionType
                of result.selectionCriteria
                    .questionTypes
            ) {
                assert.ok(
                    CANONICAL_QUESTION_TYPES.includes(
                        questionType
                    )
                );

                assert.equal(
                    CANONICAL_EVIDENCE_DIMENSIONS
                        .includes(questionType),
                    false,

                    `Evidence dimension leaked into questionTypes: ${questionType}`
                );
            }

            for (
                const dimension
                of result.selectionCriteria
                    .evidenceDimensions
            ) {
                assert.ok(
                    CANONICAL_EVIDENCE_DIMENSIONS
                        .includes(dimension),

                    `Invalid evidence dimension: ${dimension}`
                );

                assert.equal(
                    CANONICAL_QUESTION_TYPES.includes(
                        dimension
                    ),
                    false,

                    `Question type leaked into evidenceDimensions: ${dimension}`
                );
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 64
     * PRACTICE selection can be consumed by Question Engine
     * -----------------------------------------------------
     */

    await t.test(
        "64. PRACTICE selection criteria maps cleanly to Question Contract filters",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            const criteria =
                result.selectionCriteria;

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assert.ok(
                criteria.questionTypes.every(
                    (type) =>
                        CANONICAL_QUESTION_TYPES
                            .includes(type)
                )
            );

            assert.deepEqual(
                criteria.evidenceDimensions,
                ["explain", "apply"]
            );

            assert.equal(
                criteria.difficulty.min,
                "D2"
            );

            assert.equal(
                criteria.difficulty.max,
                "D3"
            );

            /*
             * This is the important contract boundary:
             *
             * Adaptive asks:
             *   questionType ∈ [...]
             *   evidence ∈ ["explain", "apply"]
             *   difficulty D2–D3
             *
             * Question Engine can filter its question bank
             * without translating legacy Q-A/Q-E codes.
             */
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 65
     * All seven primary actions stay canonical
     * -----------------------------------------------------
     */

    await t.test(
        "65. all seven adaptive scenarios produce canonical primary actions",
        () => {
            const scenarios = [
                {
                    expected: "LEARN",

                    masteryState:
                        makeState({
                            mastery: "M0"
                        })
                },

                {
                    expected: "PRACTICE",

                    masteryState:
                        makeState({
                            mastery: "M2"
                        })
                },

                {
                    expected: "CHALLENGE",

                    masteryState:
                        makeState({
                            mastery: "M3"
                        })
                },

                {
                    expected: "REMEDIATE",

                    masteryState:
                        makeState({
                            mastery: "M3",
                            status: "weak"
                        })
                },

                {
                    expected: "RETEST",

                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "mastered"
                        }),

                    sessionContext: {
                        retestDue: true
                    }
                },

                {
                    expected: "REVIEW",

                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "stable"
                        }),

                    sessionContext: {
                        retestDue: false,
                        reviewDue: true
                    }
                },

                {
                    expected: "SKIP",

                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "stable"
                        }),

                    sessionContext: {
                        retestDue: false,
                        reviewDue: false
                    }
                }
            ];

            const produced = [];

            for (const scenario of scenarios) {
                const result = decide({
                    masteryState:
                        scenario.masteryState,

                    sessionContext:
                        scenario.sessionContext ||
                        {}
                });

                assert.equal(
                    result.action,
                    scenario.expected
                );

                assert.ok(
                    CANONICAL_ACTIONS.includes(
                        result.action
                    )
                );

                produced.push(
                    result.action
                );
            }

            assert.deepEqual(
                produced,
                CANONICAL_ACTIONS
            );
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 66
     * path.current and path.next use serializable schema stages
     * -----------------------------------------------------
     */

    await t.test(
        "66. path stages remain inside next-action contract vocabulary",
        () => {
            const scenarios = [
                {
                    masteryState:
                        makeState({
                            mastery: "M0"
                        })
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M2"
                        })
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M3"
                        })
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M3",
                            status: "weak"
                        })
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "mastered"
                        }),

                    sessionContext: {
                        retestDue: true
                    }
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "stable"
                        }),

                    sessionContext: {
                        reviewDue: true,
                        retestDue: false
                    }
                },

                {
                    masteryState:
                        makeState({
                            mastery: "M4",
                            status: "stable"
                        }),

                    sessionContext: {
                        reviewDue: false,
                        retestDue: false
                    }
                }
            ];

            for (const scenario of scenarios) {
                const result = decide({
                    masteryState:
                        scenario.masteryState,

                    sessionContext:
                        scenario.sessionContext ||
                        {}
                });

                assert.ok(
                    CANONICAL_PATH_CURRENT.includes(
                        result.path.current
                    ),

                    `Invalid path.current: ${result.path.current}`
                );

                assert.ok(
                    CANONICAL_PATH_NEXT.includes(
                        result.path.next
                    ),

                    `Invalid path.next: ${result.path.next}`
                );
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 67
     * Internal workflow stages never become action
     * -----------------------------------------------------
     */

    await t.test(
        "67. internal path stages cannot become primary action",
        () => {
            const internalStages = [
                "DIAGNOSTIC",
                "MINI_PRACTICE",
                "MINI_PROBE",
                "TRANSFER",
                "CROSS_NODE",
                "RETURN",
                "SESSION_COMPLETE"
            ];

            for (
                const stage
                of [
                    "MINI_PRACTICE",
                    "MINI_PROBE"
                ]
            ) {
                const result = decide({
                    masteryState:
                        makeState({
                            mastery: "M3"
                        }),

                    sessionContext: {
                        activeRemediation: true,
                        currentPathStage: stage
                    }
                });

                assert.equal(
                    result.action,
                    "REMEDIATE"
                );

                assert.equal(
                    internalStages.includes(
                        result.action
                    ),
                    false
                );
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 68
     * Reason failure signature is canonical
     * -----------------------------------------------------
     */

    await t.test(
        "68. failure signature output uses canonical cross-contract taxonomy",
        () => {
            const canonicalFailures = [
                "prerequisite_gap",
                "concept_confusion",
                "mechanism_confusion",
                "calculation_error",
                "data_interpretation_error",
                "reasoning_error",
                "cross_node_reasoning_error",
                "careless_error",
                "source_knowledge_gap",
                "meta_skill_gap"
            ];

            for (
                const failureType
                of canonicalFailures
            ) {
                const result = decide({
                    masteryState:
                        makeState({
                            mastery: "M3"
                        }),

                    sessionContext: {
                        failure: {
                            failureType,
                            repeated: 2
                        }
                    }
                });

                assert.equal(
                    result.action,
                    "REMEDIATE"
                );

                assert.equal(
                    result.reason
                        .failureSignature,
                    failureType
                );

                assert.ok(
                    canonicalFailures.includes(
                        result.reason
                            .failureSignature
                    )
                );
            }
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 69
     * SKIP remains contract-safe
     * -----------------------------------------------------
     */

    await t.test(
        "69. SKIP output remains structurally contract-safe without selecting questions",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                sessionContext: {
                    retestDue: false,
                    reviewDue: false
                }
            });

            assert.equal(
                result.action,
                "SKIP"
            );

            assert.deepEqual(
                result.selectionCriteria
                    .questionTypes,
                []
            );

            assert.equal(
                result.selectionCriteria
                    .difficulty.min,
                "D1"
            );

            assert.equal(
                result.path.current,
                "SKIP"
            );

            assert.equal(
                result.path.next,
                "SESSION_COMPLETE"
            );

            /*
             * Current next-action schema requires:
             *
             * selectionCriteria
             *   + questionTypes
             *   + difficulty.min
             *
             * even for SKIP.
             *
             * Therefore [] + D1 is currently the
             * schema-compatible representation.
             *
             * This test documents that contract quirk
             * rather than pretending SKIP selects D1.
             */
        }
    );


    /**
     * -----------------------------------------------------
     * TEST 70
     * Full cross-contract invariant
     * -----------------------------------------------------
     */

    await t.test(
        "70. end-to-end Adaptive → Question selection contract is coherent",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "developing",

                    evidence: {
                        know: 0.9,
                        explain: 0.82,
                        apply: 0.76,
                        transfer: 0.48
                    }
                }),

                recentResults: [
                    {
                        questionId:
                            "Q-A-K283-A-001"
                    }
                ],

                sessionContext: {
                    nodePriority: "P1",
                    examRelevance: true,
                    transferGap: true
                },

                learningMode: "ON_THI"
            });

            /*
             * 1. Adaptive ownership
             */
            assert.equal(
                result.action,
                "CHALLENGE"
            );

            /*
             * 2. Target contract
             */
            assert.equal(
                result.target.type,
                "KNOWLEDGE_NODE"
            );

            assert.equal(
                result.target.primaryNodeId,
                "K283"
            );

            assert.deepEqual(
                result.target.nodeIds,
                ["K283"]
            );

            /*
             * 3. Question Contract compatibility
             */
            assert.ok(
                result.selectionCriteria
                    .questionTypes.length > 0
            );

            for (
                const type
                of result.selectionCriteria
                    .questionTypes
            ) {
                assert.ok(
                    CANONICAL_QUESTION_TYPES
                        .includes(type)
                );

                assert.equal(
                    LEGACY_QUESTION_TYPES
                        .includes(type),
                    false
                );
            }

            /*
             * 4. Evidence stays separate
             */
            assert.deepEqual(
                result.selectionCriteria
                    .evidenceDimensions,
                ["apply", "transfer"]
            );

            /*
             * 5. Difficulty contract
             */
            assert.equal(
                result.selectionCriteria
                    .difficulty.min,
                "D3"
            );

            assert.equal(
                result.selectionCriteria
                    .difficulty.max,
                "D5"
            );

            /*
             * 6. Different context for challenge
             */
            assert.equal(
                result.selectionCriteria
                    .requireDifferentContext,
                true
            );

            /*
             * 7. Do not immediately reuse question
             */
            assert.deepEqual(
                result.selectionCriteria
                    .excludeQuestionIds,
                ["Q-A-K283-A-001"]
            );

            /*
             * 8. Path contract
             */
            assert.equal(
                result.path.current,
                "CHALLENGE"
            );

            assert.equal(
                result.path.next,
                "RETEST"
            );

            /*
             * 9. ON_THI survives contract boundary
             */
            assert.equal(
                result.source.learningMode,
                "ON_THI"
            );

            assert.ok(
                result.reason.codes.includes(
                    "ON_THI_MODE"
                )
            );

            /*
             * 10. Adaptive must not calculate mastery
             */
            assert.equal(
                Object.hasOwn(
                    result,
                    "newMastery"
                ),
                false
            );

            /*
             * 11. Primary action must remain canonical
             */
            assert.ok(
                CANONICAL_ACTIONS.includes(
                    result.action
                )
            );
        }
    );
    /**
 * =====================================================
 * GROUP Q
 * ACTUAL JSON SCHEMA VALIDATION
 *
 * Tests 71–78
 * =====================================================
 */

    await t.test(
        "71. LEARN output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M0"
                })
            });

            assert.equal(
                result.action,
                "LEARN"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "72. PRACTICE output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M2"
                })
            });

            assert.equal(
                result.action,
                "PRACTICE"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "73. CHALLENGE output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3"
                })
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "74. REMEDIATE output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "weak"
                })
            });

            assert.equal(
                result.action,
                "REMEDIATE"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "75. RETEST output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "mastered"
                }),

                sessionContext: {
                    retestDue: true
                }
            });

            assert.equal(
                result.action,
                "RETEST"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "76. REVIEW output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                sessionContext: {
                    retestDue: false,
                    reviewDue: true
                }
            });

            assert.equal(
                result.action,
                "REVIEW"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "77. SKIP output validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M4",
                    status: "stable"
                }),

                sessionContext: {
                    retestDue: false,
                    reviewDue: false
                }
            });

            assert.equal(
                result.action,
                "SKIP"
            );

            assertValidNextAction(result);
        }
    );


    await t.test(
        "78. complex real-world decision validates against next-action.schema.json",
        () => {
            const result = decide({
                masteryState: makeState({
                    mastery: "M3",
                    status: "developing",

                    evidence: {
                        know: 0.92,
                        explain: 0.84,
                        apply: 0.77,
                        transfer: 0.51
                    }
                }),

                recentResults: [
                    {
                        questionId:
                            "Q-A-K283-A-001"
                    },

                    {
                        questionId:
                            "Q-A-K283-A-002"
                    }
                ],

                sessionContext: {
                    nodePriority: "P1",
                    examRelevance: true,
                    dependencyCentrality: "high",
                    transferGap: true,

                    maxQuestions: 5,

                    masteryUpdateId:
                        "MU-STUDENT-001-K283-001",

                    secondaryNodes: [
                        "K281",
                        "K282"
                    ]
                },

                learningMode: "ON_THI",

                timeBudget: 30
            });

            assert.equal(
                result.action,
                "CHALLENGE"
            );

            /*
             * Actual schema gate.
             */
            assertValidNextAction(result);

            /*
             * A few critical integration invariants.
             */
            assert.equal(
                result.schemaVersion,
                "1.0.0"
            );

            assert.equal(
                result.source.engine,
                "AdaptiveEngine"
            );

            assert.equal(
                result.source.learningMode,
                "ON_THI"
            );

            assert.deepEqual(
                result.selectionCriteria
                    .evidenceDimensions,
                [
                    "apply",
                    "transfer"
                ]
            );

            assert.deepEqual(
                result.selectionCriteria
                    .excludeQuestionIds,
                [
                    "Q-A-K283-A-001",
                    "Q-A-K283-A-002"
                ]
            );

            assert.deepEqual(
                result.selectionCriteria
                    .secondaryNodes,
                [
                    "K281",
                    "K282"
                ]
            );

            assert.equal(
                result.constraints
                    .maxQuestions,
                5
            );

            assert.equal(
                result.constraints
                    .maxTimeMinutes,
                30
            );

            /*
             * Adaptive must still respect ownership boundary.
             */
            assert.equal(
                Object.hasOwn(
                    result,
                    "newMastery"
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
        }
    );

});