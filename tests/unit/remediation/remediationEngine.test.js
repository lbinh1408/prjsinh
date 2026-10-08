import test from "node:test";
import assert from "node:assert/strict";

import {
    buildRemediationPlan
} from "../../../src/engines/remediation/remediationEngine.js";


/**
 * ============================================================
 * FIXED TEST DATA
 * ============================================================
 */

const FIXED_NOW =
    "2026-09-28T10:00:00.000Z";


const FAILURE_SIGNATURES = {
    schemaVersion: "1.0.0",

    signatures: {
        prerequisite_gap: {},
        concept_confusion: {},
        mechanism_confusion: {},
        calculation_error: {},
        data_interpretation_error: {},
        reasoning_error: {},
        cross_node_reasoning_error: {},
        careless_error: {},
        source_knowledge_gap: {},
        meta_skill_gap: {}
    }
};


const KNOWLEDGE_MAP = {
    schemaVersion: "4.0.0",

    nodes: {
        K281: {
            id: "K281",
            dependencies: []
        },

        K282: {
            id: "K282",

            dependencies: [
                {
                    nodeId: "K281",
                    type: "D1"
                }
            ]
        },

        K283: {
            id: "K283",

            dependencies: [
                {
                    nodeId: "K281",
                    type: "D1"
                },

                {
                    nodeId: "K282",
                    type: "D2"
                }
            ]
        }
    }
};


const REMEDIATION_RULES = {
    schemaVersion: "1.0.0",

    maximumDepth: 3,

    maxMinutes: 30,

    maxQuestions: 7,

    avoidExactQuestion: true,

    avoidSameContext: true,

    respectPrerequisites: true,

    allowEscalation: true
};


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function makeAttempt({
    failureType = "concept_confusion",
    sourceNodeId,
    confidence = 0.8,
    occurrenceCount,
    primaryNode = "K283",
    questionId = "Q-A-K283-A-001",
    attemptId = "ATT-001",
    skills = []
} = {}) {

    const diagnostic = {
        failureType,
        confidence
    };


    if (sourceNodeId) {
        diagnostic.sourceNodeId =
            sourceNodeId;
    }


    if (
        Number.isInteger(
            occurrenceCount
        )
    ) {
        diagnostic.occurrenceCount =
            occurrenceCount;
    }


    return {
        attemptId,
        questionId,
        primaryNode,
        result: "wrong",
        score: 0,
        skills,
        diagnostic
    };
}


function makeState({
    nodeId = "K283",
    mastery = "M2",
    status = "developing",
    failureSummary,
    lastFailure
} = {}) {

    const state = {
        nodeId,
        mastery,
        status
    };


    if (failureSummary) {
        state.failureSummary =
            failureSummary;
    }


    if (lastFailure) {
        state.lastFailure =
            lastFailure;
    }


    return state;
}


function makeKnowledgeState({
    k281 = "M1",
    k282 = "M2",
    k283 = "M2"
} = {}) {

    return {
        knowledge: {
            K281: {
                mastery: k281
            },

            K282: {
                mastery: k282
            },

            K283: {
                mastery: k283
            }
        }
    };
}


function makeAdaptiveDecision({
    targetNodeId = "K283",
    sourceNodeId,
    failureSignature,
    metaSkillId,
    masteryUpdateId =
    "MU-001"
} = {}) {

    const reason = {
        primary:
            "Remediation required.",

        codes: [
            "STATUS_WEAK"
        ]
    };


    if (failureSignature) {
        reason.failureSignature =
            failureSignature;
    }


    if (sourceNodeId) {
        reason.sourceNodeId =
            sourceNodeId;
    }


    if (metaSkillId) {
        reason.metaSkillId =
            metaSkillId;
    }


    return {
        schemaVersion:
            "1.0.0",

        action:
            "REMEDIATE",

        target: {
            type:
                "KNOWLEDGE_NODE",

            nodeIds: [
                targetNodeId
            ],

            primaryNodeId:
                targetNodeId
        },

        reason,

        source: {
            engine:
                "AdaptiveEngine",

            rulesVersion:
                "1.0.0",

            pathsVersion:
                "1.0.0",

            masteryUpdateId
        }
    };
}


function remediate(overrides = {}) {

    return buildRemediationPlan({
        studentId:
            "STUDENT-001",

        adaptiveDecision:
            makeAdaptiveDecision(),

        attempt:
            makeAttempt(),

        masteryState:
            makeState(),

        knowledgeMap:
            KNOWLEDGE_MAP,

        failureSignatures:
            FAILURE_SIGNATURES,

        remediationRules:
            REMEDIATION_RULES,

        now:
            FIXED_NOW,

        ...overrides
    });
}


const CANONICAL_FAILURES = [
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


/**
 * ============================================================
 * TEST SUITE
 * ============================================================
 */

test(
    "Remediation Engine V1",
    async (t) => {

        /**
         * ====================================================
         * GROUP A
         * FAILURE → ROOT CAUSE
         * ====================================================
         */

        await t.test(
            "1. prerequisite_gap maps to PREREQUISITE_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "PREREQUISITE_GAP"
                );
            }
        );


        await t.test(
            "2. concept_confusion maps to CONCEPT_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "CONCEPT_GAP"
                );
            }
        );


        await t.test(
            "3. mechanism_confusion maps to MECHANISM_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "mechanism_confusion"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "MECHANISM_GAP"
                );
            }
        );


        await t.test(
            "4. calculation_error maps to PROCEDURE_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "calculation_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "PROCEDURE_GAP"
                );
            }
        );


        await t.test(
            "5. data_interpretation_error maps to DATA_HANDLING_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "data_interpretation_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "DATA_HANDLING_GAP"
                );
            }
        );


        await t.test(
            "6. reasoning_error maps to REASONING_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "reasoning_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "REASONING_GAP"
                );
            }
        );


        await t.test(
            "7. cross_node_reasoning_error maps to CROSS_NODE_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "cross_node_reasoning_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "CROSS_NODE_GAP"
                );
            }
        );


        await t.test(
            "8. careless_error stays UNKNOWN rather than inventing knowledge gap",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "careless_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "UNKNOWN"
                );
            }
        );


        await t.test(
            "9. source_knowledge_gap stays UNKNOWN when schema has no dedicated root cause",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "source_knowledge_gap",

                                sourceNodeId:
                                    "K281"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "UNKNOWN"
                );
            }
        );


        await t.test(
            "10. meta_skill_gap maps to META_SKILL_GAP",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "meta_skill_gap",

                                skills: [
                                    "S008"
                                ]
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "META_SKILL_GAP"
                );
            }
        );


        /**
         * ====================================================
         * GROUP B
         * FAILURE → STRATEGY
         * ====================================================
         */

        const strategyCases = [
            [
                "prerequisite_gap",
                "REBUILD_FOUNDATION"
            ],

            [
                "concept_confusion",
                "RETEACH_CONCEPT"
            ],

            [
                "mechanism_confusion",
                "EXPLAIN_MECHANISM"
            ],

            [
                "calculation_error",
                "PROCEDURE_REPAIR"
            ],

            [
                "data_interpretation_error",
                "DATA_INTERPRETATION"
            ],

            [
                "reasoning_error",
                "REASONING_REPAIR"
            ],

            [
                "cross_node_reasoning_error",
                "CROSS_NODE_REPAIR"
            ],

            [
                "careless_error",
                "MINIMAL_REPAIR"
            ],

            [
                "source_knowledge_gap",
                "REBUILD_FOUNDATION"
            ],

            [
                "meta_skill_gap",
                "META_SKILL_TRAINING"
            ]
        ];


        for (
            let index = 0;
            index < strategyCases.length;
            index++
        ) {

            const [
                failure,
                strategy
            ] =
                strategyCases[index];


            await t.test(
                `${11 + index}. ${failure} selects ${strategy}`,
                () => {

                    const attemptOptions = {
                        failureType:
                            failure
                    };


                    if (
                        failure ===
                        "prerequisite_gap" ||
                        failure ===
                        "source_knowledge_gap"
                    ) {

                        attemptOptions
                            .sourceNodeId =
                            "K281";
                    }


                    if (
                        failure ===
                        "meta_skill_gap"
                    ) {

                        attemptOptions
                            .skills = [
                                "S008"
                            ];
                    }


                    const result =
                        remediate({
                            attempt:
                                makeAttempt(
                                    attemptOptions
                                )
                        });


                    assert.equal(
                        result.plan.strategy,
                        strategy
                    );
                }
            );
        }


        /**
         * ====================================================
         * GROUP C
         * TARGET / SOURCE NODE
         * ====================================================
         */

        await t.test(
            "21. explicit prerequisite source node becomes SOURCE_NODE target",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281"
                            })
                    });


                assert.equal(
                    result.target
                        .originalNodeId,
                    "K283"
                );


                assert.equal(
                    result.target
                        .sourceNodeId,
                    "K281"
                );


                assert.equal(
                    result.target
                        .targetType,
                    "SOURCE_NODE"
                );
            }
        );


        await t.test(
            "22. prerequisite_gap can infer weakest D1 prerequisite",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap"
                            }),

                        masteryState:
                            makeKnowledgeState({
                                k281: "M0",
                                k282: "M3",
                                k283: "M2"
                            })
                    });


                assert.equal(
                    result.target
                        .sourceNodeId,
                    "K281"
                );


                assert.equal(
                    result.target
                        .targetType,
                    "SOURCE_NODE"
                );
            }
        );


        await t.test(
            "23. source_knowledge_gap uses explicit source node",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "source_knowledge_gap",

                                sourceNodeId:
                                    "K282"
                            })
                    });


                assert.equal(
                    result.target
                        .sourceNodeId,
                    "K282"
                );


                assert.equal(
                    result.target
                        .targetType,
                    "SOURCE_NODE"
                );
            }
        );


        await t.test(
            "24. source_knowledge_gap without evidence does not invent source node",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "source_knowledge_gap"
                            })
                    });


                assert.equal(
                    Object.hasOwn(
                        result.target,
                        "sourceNodeId"
                    ),
                    false
                );


                assert.equal(
                    result.target
                        .targetType,
                    "ORIGINAL_NODE"
                );
            }
        );


        await t.test(
            "25. ordinary concept confusion repairs original node",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion"
                            })
                    });


                assert.equal(
                    result.target
                        .targetType,
                    "ORIGINAL_NODE"
                );


                assert.equal(
                    result.target
                        .originalNodeId,
                    "K283"
                );
            }
        );


        await t.test(
            "26. meta_skill_gap becomes META_SKILL target when skill exists",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "meta_skill_gap",

                                skills: [
                                    "S008"
                                ]
                            })
                    });


                assert.equal(
                    result.target
                        .targetType,
                    "META_SKILL"
                );


                assert.equal(
                    result.target
                        .metaSkillId,
                    "S008"
                );
            }
        );


        await t.test(
            "27. cross-node failure creates MULTI_NODE target when supporting nodes exist",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "cross_node_reasoning_error"
                            })
                    });


                assert.equal(
                    result.target
                        .targetType,
                    "MULTI_NODE"
                );


                assert.ok(
                    result.target
                        .supportingNodeIds
                        .includes("K282")
                );
            }
        );


        /**
         * ====================================================
         * GROUP D
         * DEPTH
         * ====================================================
         */

        await t.test(
            "28. isolated ordinary failure uses depth 1",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion",

                                occurrenceCount:
                                    1
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    1
                );
            }
        );


        await t.test(
            "29. repeated failure count 2 uses depth 2",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion",

                                occurrenceCount:
                                    2
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    2
                );
            }
        );


        await t.test(
            "30. persistent failure count 3 uses depth 3",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion",

                                occurrenceCount:
                                    3
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    3
                );
            }
        );


        await t.test(
            "31. prerequisite gap uses at least depth 2 when diagnosis confidence is sufficient",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                confidence:
                                    0.8,

                                occurrenceCount:
                                    1
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    2
                );
            }
        );


        await t.test(
            "32. careless_error remains depth 1 even when repeated",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "careless_error",

                                occurrenceCount:
                                    3,

                                confidence:
                                    0.9
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    1
                );
            }
        );


        await t.test(
            "33. low diagnosis confidence prevents aggressive remediation",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                confidence:
                                    0.3,

                                occurrenceCount:
                                    3
                            })
                    });


                assert.equal(
                    result.plan.depth,
                    1
                );
            }
        );


        /**
         * ====================================================
         * GROUP E
         * DIAGNOSIS / EVIDENCE
         * ====================================================
         */

        await t.test(
            "34. failed attempt becomes diagnostic evidence",
            () => {

                const result =
                    remediate();


                const failedAttempt =
                    result.diagnosis
                        .evidence
                        .find(
                            (item) =>
                                item.type ===
                                "FAILED_ATTEMPT"
                        );


                assert.ok(
                    failedAttempt
                );


                assert.equal(
                    failedAttempt
                        .attemptId,
                    "ATT-001"
                );


                assert.equal(
                    failedAttempt
                        .questionId,
                    "Q-A-K283-A-001"
                );
            }
        );


        await t.test(
            "35. repeated failure adds REPEATED_FAILURE evidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion",

                                occurrenceCount:
                                    2
                            })
                    });


                assert.ok(
                    result.diagnosis
                        .evidence
                        .some(
                            (item) =>
                                item.type ===
                                "REPEATED_FAILURE"
                        )
                );
            }
        );


        await t.test(
            "36. source node adds DEPENDENCY evidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281"
                            })
                    });


                const dependency =
                    result.diagnosis
                        .evidence
                        .find(
                            (item) =>
                                item.type ===
                                "DEPENDENCY"
                        );


                assert.ok(
                    dependency
                );


                assert.equal(
                    dependency.nodeId,
                    "K281"
                );
            }
        );


        await t.test(
            "37. diagnosis confidence respects explicit attempt confidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "mechanism_confusion",

                                confidence:
                                    0.73
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .confidence,
                    0.73
                );
            }
        );


        /**
         * ====================================================
         * GROUP F
         * PLAN / QUESTION CONTRACT
         * ====================================================
         */

        await t.test(
            "38. remediation plan always contains at least one step",
            () => {

                const result =
                    remediate();


                assert.ok(
                    result.plan
                        .steps.length >= 1
                );
            }
        );


        await t.test(
            "39. remediation questionTypes use semantic Question Contract values",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "mechanism_confusion"
                            })
                    });


                for (
                    const step
                    of result.plan.steps
                ) {

                    if (
                        !step.questionTypes
                    ) {
                        continue;
                    }


                    for (
                        const questionType
                        of step.questionTypes
                    ) {

                        assert.ok(
                            CANONICAL_QUESTION_TYPES
                                .includes(
                                    questionType
                                ),

                            `Invalid questionType: ${questionType}`
                        );
                    }
                }
            }
        );


        await t.test(
            "40. legacy Q-K/Q-E/Q-A/Q-T/Q-D never leak into remediation output",
            () => {

                const legacy = [
                    "Q-K",
                    "Q-E",
                    "Q-A",
                    "Q-T",
                    "Q-D"
                ];


                for (
                    const failure
                    of CANONICAL_FAILURES
                ) {

                    const options = {
                        failureType:
                            failure
                    };


                    if (
                        failure ===
                        "prerequisite_gap" ||
                        failure ===
                        "source_knowledge_gap"
                    ) {

                        options.sourceNodeId =
                            "K281";
                    }


                    if (
                        failure ===
                        "meta_skill_gap"
                    ) {

                        options.skills = [
                            "S008"
                        ];
                    }


                    const result =
                        remediate({
                            attempt:
                                makeAttempt(
                                    options
                                )
                        });


                    for (
                        const step
                        of result.plan.steps
                    ) {

                        for (
                            const type
                            of (
                                step
                                    .questionTypes ??
                                []
                            )
                        ) {

                            assert.equal(
                                legacy.includes(
                                    type
                                ),
                                false,

                                `Legacy question type leaked: ${type}`
                            );
                        }
                    }


                    for (
                        const type
                        of result.probe
                            .questionTypes
                    ) {

                        assert.equal(
                            legacy.includes(
                                type
                            ),
                            false,

                            `Legacy probe type leaked: ${type}`
                        );
                    }
                }
            }
        );


        /**
         * ====================================================
         * GROUP G
         * PROBE / RETURN
         * ====================================================
         */

        await t.test(
            "41. remediation always requires MINI_PROBE",
            () => {

                const result =
                    remediate();


                assert.equal(
                    result.probe.required,
                    true
                );


                assert.equal(
                    result.probe.type,
                    "MINI_PROBE"
                );
            }
        );


        await t.test(
            "42. concept confusion probe checks know evidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion"
                            })
                    });


                assert.equal(
                    result.probe
                        .successCriteria
                        .requiredEvidenceDimension,
                    "know"
                );
            }
        );


        await t.test(
            "43. mechanism confusion probe checks explain evidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "mechanism_confusion"
                            })
                    });


                assert.equal(
                    result.probe
                        .successCriteria
                        .requiredEvidenceDimension,
                    "explain"
                );
            }
        );


        await t.test(
            "44. cross-node reasoning probe checks transfer evidence",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "cross_node_reasoning_error"
                            })
                    });


                assert.equal(
                    result.probe
                        .successCriteria
                        .requiredEvidenceDimension,
                    "transfer"
                );
            }
        );


        await t.test(
            "45. successful remediation returns to original node",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                primaryNode:
                                    "K283"
                            })
                    });


                assert.equal(
                    result.return
                        .targetNodeId,
                    "K283"
                );


                assert.equal(
                    result.return
                        .condition,
                    "PROBE_PASSED"
                );


                assert.equal(
                    result.return
                        .preserveOriginalFailure,
                    true
                );
            }
        );


        await t.test(
            "46. Remediation Engine does not decide return action",
            () => {

                const result =
                    remediate();


                assert.equal(
                    Object.hasOwn(
                        result.return,
                        "action"
                    ),
                    false
                );
            }
        );


        /**
         * ====================================================
         * GROUP H
         * OWNERSHIP / IMMUTABILITY / STRUCTURE
         * ====================================================
         */

        await t.test(
            "47. output contains required remediation top-level fields",
            () => {

                const result =
                    remediate();


                const required = [
                    "schemaVersion",
                    "remediationId",
                    "studentId",
                    "timestamp",
                    "trigger",
                    "target",
                    "diagnosis",
                    "plan",
                    "probe",
                    "return",
                    "constraints",
                    "source"
                ];


                for (
                    const field
                    of required
                ) {

                    assert.ok(
                        Object.hasOwn(
                            result,
                            field
                        ),

                        `Missing required field: ${field}`
                    );
                }
            }
        );


        await t.test(
            "48. Remediation Engine does not write mastery or nextAction",
            () => {

                const result =
                    remediate();


                const forbiddenFields = [
                    "mastery",
                    "newMastery",
                    "masteryUpdate",
                    "nextAction",
                    "action"
                ];


                for (
                    const field
                    of forbiddenFields
                ) {

                    assert.equal(
                        Object.hasOwn(
                            result,
                            field
                        ),
                        false,

                        `Ownership violation: output contains ${field}`
                    );
                }
            }
        );


        await t.test(
            "49. engine does not mutate inputs",
            () => {

                const attempt =
                    makeAttempt({
                        failureType:
                            "prerequisite_gap",

                        sourceNodeId:
                            "K281"
                    });


                const masteryState =
                    makeKnowledgeState({
                        k281: "M0",
                        k282: "M2",
                        k283: "M2"
                    });


                const adaptiveDecision =
                    makeAdaptiveDecision({
                        failureSignature:
                            "prerequisite_gap",

                        sourceNodeId:
                            "K281"
                    });


                const knowledgeMap =
                    structuredClone(
                        KNOWLEDGE_MAP
                    );


                const rules =
                    structuredClone(
                        REMEDIATION_RULES
                    );


                const before = {
                    attempt:
                        structuredClone(
                            attempt
                        ),

                    masteryState:
                        structuredClone(
                            masteryState
                        ),

                    adaptiveDecision:
                        structuredClone(
                            adaptiveDecision
                        ),

                    knowledgeMap:
                        structuredClone(
                            knowledgeMap
                        ),

                    rules:
                        structuredClone(
                            rules
                        )
                };


                buildRemediationPlan({
                    studentId:
                        "STUDENT-001",

                    adaptiveDecision,

                    attempt,

                    masteryState,

                    knowledgeMap,

                    failureSignatures:
                        FAILURE_SIGNATURES,

                    remediationRules:
                        rules,

                    now:
                        FIXED_NOW
                });


                assert.deepEqual(
                    attempt,
                    before.attempt
                );


                assert.deepEqual(
                    masteryState,
                    before.masteryState
                );


                assert.deepEqual(
                    adaptiveDecision,
                    before.adaptiveDecision
                );


                assert.deepEqual(
                    knowledgeMap,
                    before.knowledgeMap
                );


                assert.deepEqual(
                    rules,
                    before.rules
                );
            }
        );


        await t.test(
            "50. canonical end-to-end remediation decision is coherent",
            () => {

                const result =
                    buildRemediationPlan({
                        studentId:
                            "STUDENT-001",

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                targetNodeId:
                                    "K283",

                                failureSignature:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281"
                            }),

                        attempt:
                            makeAttempt({
                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                confidence:
                                    0.9,

                                occurrenceCount:
                                    2
                            }),

                        masteryState:
                            makeKnowledgeState({
                                k281: "M1",
                                k282: "M2",
                                k283: "M3"
                            }),

                        knowledgeMap:
                            KNOWLEDGE_MAP,

                        failureSignatures:
                            FAILURE_SIGNATURES,

                        remediationRules:
                            REMEDIATION_RULES,

                        now:
                            FIXED_NOW
                    });


                /*
                 * Trigger
                 */
                assert.equal(
                    result.trigger
                        .failureSignature,
                    "prerequisite_gap"
                );


                assert.equal(
                    result.trigger
                        .repeated,
                    true
                );


                /*
                 * Target
                 */
                assert.equal(
                    result.target
                        .originalNodeId,
                    "K283"
                );


                assert.equal(
                    result.target
                        .sourceNodeId,
                    "K281"
                );


                assert.equal(
                    result.target
                        .targetType,
                    "SOURCE_NODE"
                );


                /*
                 * Diagnosis
                 */
                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "PREREQUISITE_GAP"
                );


                assert.equal(
                    result.diagnosis
                        .failureSignature,
                    "prerequisite_gap"
                );


                /*
                 * Repair
                 */
                assert.equal(
                    result.plan.strategy,
                    "REBUILD_FOUNDATION"
                );


                assert.equal(
                    result.plan.depth,
                    2
                );


                for (
                    const step
                    of result.plan.steps
                ) {

                    assert.deepEqual(
                        step.targetNodeIds,
                        ["K281"]
                    );
                }


                /*
                 * Probe source node before returning.
                 */
                assert.equal(
                    result.probe
                        .targetNodeId,
                    "K281"
                );


                assert.equal(
                    result.probe.type,
                    "MINI_PROBE"
                );


                /*
                 * Return to original target.
                 */
                assert.equal(
                    result.return
                        .targetNodeId,
                    "K283"
                );


                assert.equal(
                    result.return
                        .condition,
                    "PROBE_PASSED"
                );


                /*
                 * Ownership.
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
                        result.return,
                        "action"
                    ),
                    false
                );


                /*
                 * Determinism.
                 */
                assert.equal(
                    result.timestamp,
                    FIXED_NOW
                );


                assert.equal(
                    result.source.engine,
                    "RemediationEngine"
                );
            }
        );
    }
);