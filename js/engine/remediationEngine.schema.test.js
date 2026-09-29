import test from "node:test";
import assert from "node:assert/strict";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
    buildRemediationPlan
} from "./remediationEngine.js";

import remediationSchema
    from "../../data/remediation/remediation.schema.json"
with { type: "json" };


/**
 * ============================================================
 * AJV
 * ============================================================
 */

const ajv = new Ajv2020({
    allErrors: true,
    strict: false
});

addFormats(ajv);

const validateRemediation =
    ajv.compile(
        remediationSchema
    );


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

        K280: {
            id: "K280",
            dependencies: []
        },

        K281: {
            id: "K281",

            dependencies: [
                {
                    nodeId: "K280",
                    type: "D1"
                }
            ]
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
    failureType =
    "concept_confusion",

    sourceNodeId,

    confidence = 0.8,

    occurrenceCount = 1,

    primaryNode = "K283",

    questionId =
    "Q-A-K283-A-001",

    attemptId =
    "ATT-001",

    skills = []

} = {}) {

    const diagnostic = {
        failureType,
        confidence,
        occurrenceCount
    };


    if (sourceNodeId) {
        diagnostic.sourceNodeId =
            sourceNodeId;
    }


    return {
        attemptId,
        questionId,
        primaryNode,

        result:
            "wrong",

        score:
            0,

        skills,

        diagnostic
    };
}


function makeAdaptiveDecision({

    targetNodeId =
    "K283",

    failureSignature =
    "concept_confusion",

    sourceNodeId,

    metaSkillId,

    masteryUpdateId =
    "MU-STUDENT-001-K283-001"

} = {}) {

    const reason = {

        primary:
            "Remediation required.",

        codes: [
            "STATUS_WEAK"
        ],

        failureSignature
    };


    if (sourceNodeId) {
        reason.sourceNodeId =
            sourceNodeId;
    }


    if (metaSkillId) {
        reason.metaSkillId =
            metaSkillId;
    }


    const target = {

        type:
            "KNOWLEDGE_NODE",

        nodeIds: [
            targetNodeId
        ],

        primaryNodeId:
            targetNodeId
    };


    if (sourceNodeId) {
        target.sourceNodeId =
            sourceNodeId;
    }


    return {

        schemaVersion:
            "1.0.0",

        decisionId:
            "AD-STUDENT-001-K283-001",

        studentId:
            "STUDENT-001",

        timestamp:
            FIXED_NOW,

        action:
            "REMEDIATE",

        reason,

        target,

        selectionCriteria: {
            questionTypes: [
                "mcq",
                "short_answer"
            ],

            evidenceDimensions: [
                "know",
                "explain"
            ],

            difficulty: {
                min: "D1",
                max: "D3"
            }
        },

        path: {
            current:
                "REMEDIATE",

            next:
                "MINI_PRACTICE",

            terminal:
                false
        },

        constraints: {
            maxQuestions:
                5,

            maxTimeMinutes:
                20,

            respectPrerequisites:
                true
        },

        priority: {
            score:
                100,

            factors: []
        },

        source: {
            engine:
                "AdaptiveEngine",

            rulesVersion:
                "1.0.0",

            pathsVersion:
                "1.0.0",

            masteryUpdateId,

            learningMode:
                "HOC_SAU"
        }
    };
}


function makeMasteryState({

    nodeId =
    "K283",

    mastery =
    "M2",

    status =
    "weak",

    failureType =
    "concept_confusion",

    sourceNodeId,

    occurrenceCount = 1,

    metaSkillId

} = {}) {

    const lastFailure = {

        failureType,
        occurrenceCount
    };


    if (sourceNodeId) {
        lastFailure.sourceNodeId =
            sourceNodeId;
    }


    if (metaSkillId) {
        lastFailure.metaSkillId =
            metaSkillId;
    }


    return {

        nodeId,

        mastery,

        status,

        masteryUpdateId:
            "MU-STUDENT-001-K283-001",

        lastFailure
    };
}


function makeKnowledgeState({

    k280 = "M2",
    k281 = "M1",
    k282 = "M2",
    k283 = "M3"

} = {}) {

    return {

        masteryUpdateId:
            "MU-STUDENT-001-K283-001",

        knowledge: {

            K280: {
                mastery: k280
            },

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


/**
 * ============================================================
 * SCHEMA ASSERTION
 * ============================================================
 */

function assertValidRemediation(
    result
) {

    const valid =
        validateRemediation(
            result
        );


    assert.equal(
        valid,
        true,
        [
            "",
            "remediation.schema.json validation failed:",
            JSON.stringify(
                validateRemediation.errors,
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


/**
 * ============================================================
 * BASE EXECUTOR
 * ============================================================
 */

function remediate({
    attempt,
    adaptiveDecision,
    masteryState,
    remediationRules
} = {}) {

    return buildRemediationPlan({

        studentId:
            "STUDENT-001",

        adaptiveDecision:
            adaptiveDecision ??
            makeAdaptiveDecision(),

        attempt:
            attempt ??
            makeAttempt(),

        masteryState:
            masteryState ??
            makeMasteryState(),

        knowledgeMap:
            KNOWLEDGE_MAP,

        failureSignatures:
            FAILURE_SIGNATURES,

        remediationRules:
            remediationRules ??
            REMEDIATION_RULES,

        now:
            FIXED_NOW
    });
}


/**
 * ============================================================
 * SCHEMA TEST SUITE
 * ============================================================
 */

test(
    "Remediation Engine V1 - Schema Gate",
    async (t) => {

        /**
         * ====================================================
         * 1
         * CONCEPT CONFUSION
         * ====================================================
         */

        await t.test(
            "1. concept_confusion output validates against remediation.schema.json",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "concept_confusion"
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "concept_confusion"
                            })
                    });


                assert.equal(
                    result.plan.strategy,
                    "RETEACH_CONCEPT"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 2
         * PREREQUISITE GAP
         * ====================================================
         */

        await t.test(
            "2. prerequisite_gap with source node validates",
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
                                    0.9
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281"
                            }),

                        masteryState:
                            makeKnowledgeState({
                                k281: "M1",
                                k283: "M3"
                            })
                    });


                assert.equal(
                    result.target
                        .targetType,
                    "SOURCE_NODE"
                );


                assert.equal(
                    result.target
                        .sourceNodeId,
                    "K281"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 3
         * MECHANISM CONFUSION
         * ====================================================
         */

        await t.test(
            "3. mechanism_confusion output validates",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "mechanism_confusion",

                                confidence:
                                    0.85
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "mechanism_confusion"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "MECHANISM_GAP"
                );


                assert.equal(
                    result.plan.strategy,
                    "EXPLAIN_MECHANISM"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 4
         * CALCULATION ERROR
         * ====================================================
         */

        await t.test(
            "4. calculation_error output validates",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "calculation_error"
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "calculation_error"
                            })
                    });


                assert.equal(
                    result.plan.strategy,
                    "PROCEDURE_REPAIR"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 5
         * DATA INTERPRETATION
         * ====================================================
         */

        await t.test(
            "5. data_interpretation_error output validates",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "data_interpretation_error"
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "data_interpretation_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "DATA_HANDLING_GAP"
                );


                assert.equal(
                    result.plan.strategy,
                    "DATA_INTERPRETATION"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 6
         * CROSS NODE
         * ====================================================
         */

        await t.test(
            "6. cross_node_reasoning_error multi-node output validates",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "cross_node_reasoning_error"
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "cross_node_reasoning_error"
                            })
                    });


                assert.equal(
                    result.target
                        .targetType,
                    "MULTI_NODE"
                );


                assert.equal(
                    result.plan.strategy,
                    "CROSS_NODE_REPAIR"
                );


                assert.equal(
                    result.probe
                        .successCriteria
                        .requiredEvidenceDimension,
                    "transfer"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 7
         * CARELESS ERROR
         * ====================================================
         */

        await t.test(
            "7. careless_error minimal repair validates",
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
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "careless_error"
                            })
                    });


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "UNKNOWN"
                );


                assert.equal(
                    result.plan.strategy,
                    "MINIMAL_REPAIR"
                );


                assert.equal(
                    result.plan.depth,
                    1
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 8
         * META SKILL
         * ====================================================
         */

        await t.test(
            "8. meta_skill_gap output validates",
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
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "meta_skill_gap",

                                metaSkillId:
                                    "S008"
                            }),

                        masteryState:
                            makeMasteryState({
                                failureType:
                                    "meta_skill_gap",

                                metaSkillId:
                                    "S008"
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


                assert.equal(
                    result.plan.strategy,
                    "META_SKILL_TRAINING"
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 9
         * DEPTH 3
         * ====================================================
         */

        await t.test(
            "9. persistent repeated failure depth 3 validates",
            () => {

                const result =
                    remediate({
                        attempt:
                            makeAttempt({
                                failureType:
                                    "reasoning_error",

                                occurrenceCount:
                                    3,

                                confidence:
                                    0.9
                            }),

                        adaptiveDecision:
                            makeAdaptiveDecision({
                                failureSignature:
                                    "reasoning_error"
                            }),

                        masteryState:
                            makeMasteryState({
                                failureType:
                                    "reasoning_error",

                                occurrenceCount:
                                    3
                            })
                    });


                assert.equal(
                    result.trigger
                        .repeated,
                    true
                );


                assert.equal(
                    result.trigger
                        .occurrenceCount,
                    3
                );


                assert.equal(
                    result.plan.depth,
                    3
                );


                assertValidRemediation(
                    result
                );
            }
        );


        /**
         * ====================================================
         * 10
         * COMPLEX END-TO-END
         * ====================================================
         */

        await t.test(
            "10. complex Adaptive → Remediation output validates and preserves ownership boundaries",
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
                                    "K281",

                                masteryUpdateId:
                                    "MU-STUDENT-001-K283-001"
                            }),

                        attempt:
                            makeAttempt({

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                confidence:
                                    0.92,

                                occurrenceCount:
                                    2,

                                primaryNode:
                                    "K283",

                                questionId:
                                    "Q-A-K283-A-002",

                                attemptId:
                                    "ATT-K283-002"
                            }),

                        masteryState:
                            makeKnowledgeState({

                                k280:
                                    "M2",

                                k281:
                                    "M1",

                                k282:
                                    "M2",

                                k283:
                                    "M3"
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
                 * Schema gate
                 */
                assertValidRemediation(
                    result
                );


                /*
                 * Contract identity
                 */
                assert.equal(
                    result.schemaVersion,
                    "1.0.0"
                );


                assert.equal(
                    result.studentId,
                    "STUDENT-001"
                );


                assert.equal(
                    result.timestamp,
                    FIXED_NOW
                );


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
                        .occurrenceCount,
                    2
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
                        .failureSignature,
                    "prerequisite_gap"
                );


                assert.equal(
                    result.diagnosis
                        .rootCauseType,
                    "PREREQUISITE_GAP"
                );


                /*
                 * Plan
                 */
                assert.equal(
                    result.plan.strategy,
                    "REBUILD_FOUNDATION"
                );


                assert.equal(
                    result.plan.depth,
                    2
                );


                /*
                 * Repair source node,
                 * not original target.
                 */
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
                 * Probe repaired source.
                 */
                assert.equal(
                    result.probe
                        .required,
                    true
                );


                assert.equal(
                    result.probe.type,
                    "MINI_PROBE"
                );


                assert.equal(
                    result.probe
                        .targetNodeId,
                    "K281"
                );


                /*
                 * Return to original learning target.
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
                 * Adaptive owns next action.
                 */
                assert.equal(
                    Object.hasOwn(
                        result.return,
                        "action"
                    ),
                    false
                );


                /*
                 * Mastery owns mastery mutation.
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


                /*
                 * Source traceability
                 */
                assert.equal(
                    result.source.engine,
                    "RemediationEngine"
                );


                assert.equal(
                    result.source
                        .masteryUpdateId,
                    "MU-STUDENT-001-K283-001"
                );


                /*
                 * R1:
                 * all question types remain semantic.
                 */
                const legacy = new Set([
                    "Q-K",
                    "Q-E",
                    "Q-A",
                    "Q-T",
                    "Q-D"
                ]);


                for (
                    const step
                    of result.plan.steps
                ) {

                    for (
                        const type
                        of (
                            step.questionTypes ??
                            []
                        )
                    ) {

                        assert.equal(
                            legacy.has(type),
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
                        legacy.has(type),
                        false,
                        `Legacy probe question type leaked: ${type}`
                    );
                }
            }
        );
    }
);