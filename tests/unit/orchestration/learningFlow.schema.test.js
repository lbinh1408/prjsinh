
import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
    processAttempt,
    processRemediationProbe
} from "../../../src/engines/orchestration/learningFlow.js";


/**
 * ============================================================
 * PATHS
 * ============================================================
 */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


/**
 * Adjust these paths ONLY if your project stores schemas
 * somewhere else.
 *
 * Example assumed structure:
 *
 * js/
 *   engine/
 *     learningFlow.js
 *     learningFlow.schema.test.js
 *
 *   schemas/
 *     mastery-update.schema.json
 *     next-action.schema.json
 *     remediation.schema.json
 */

function findSchema(filename) {

    const candidates = [

        path.join(
            __dirname,
            filename
        ),

        path.join(
            __dirname,
            "../../../src/contracts/schemas",
            filename
        ),

        path.join(
            __dirname,
            "../../data/schemas",
            filename
        ),

        path.join(
            __dirname,
            "../../data/mastery",
            filename
        ),

        path.join(
            __dirname,
            "../../data/adaptive",
            filename
        ),

        path.join(
            __dirname,
            "../../data/remediation",
            filename
        ),

        path.join(
            __dirname,
            "../../data/mastery",
            filename
        ),

        path.join(
            __dirname,
            "../../data/adaptive",
            filename
        ),

        path.join(
            __dirname,
            "../../data/remediation",
            filename
        )
    ];


    for (const candidate of candidates) {

        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }


    throw new Error(
        [
            `Cannot find schema: ${filename}`,
            "",
            "Checked:",
            ...candidates.map(
                item => `  - ${item}`
            )
        ].join("\n")
    );
}


function readJson(filePath) {

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


/**
 * ============================================================
 * LOAD CANONICAL SCHEMAS
 * ============================================================
 */

const masteryUpdateSchema =
    readJson(
        findSchema(
            "mastery-update.schema.json"
        )
    );


const nextActionSchema =
    readJson(
        findSchema(
            "next-action.schema.json"
        )
    );


const remediationSchema =
    readJson(
        findSchema(
            "remediation.schema.json"
        )
    );


/**
 * ============================================================
 * AJV
 * ============================================================
 */

const ajv =
    new Ajv2020({
        allErrors: true,
        strict: false
    });


addFormats(ajv);


const validateMasteryUpdate =
    ajv.compile(
        masteryUpdateSchema
    );


const validateNextAction =
    ajv.compile(
        nextActionSchema
    );


const validateRemediation =
    ajv.compile(
        remediationSchema
    );


/**
 * ============================================================
 * FIXED TIME
 * ============================================================
 */

const FIXED_NOW =
    "2026-09-29T08:00:00.000Z";


/**
 * ============================================================
 * KNOWLEDGE MAP
 * ============================================================
 */

const KNOWLEDGE_MAP = {

    schemaVersion: "4.0.0",

    nodes: {

        K281: {
            id: "K281",
            priority: "P1",
            dependencies: []
        },

        K282: {
            id: "K282",
            priority: "P1",

            dependencies: [
                {
                    nodeId: "K281",
                    type: "D1"
                }
            ]
        },

        K283: {
            id: "K283",
            priority: "P1",

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


/**
 * ============================================================
 * MASTERY RULES
 * ============================================================
 */

const MASTERY_RULES = {

    schemaVersion: "1.0.0",

    evidenceWeights: {
        know: 0.15,
        explain: 0.25,
        apply: 0.30,
        transfer: 0.30
    },

    attemptWeights: {
        independentCorrect: 1.00,
        correctAfterHint: 0.60,
        partialCorrect: 0.50,
        wrong: 0.00,
        skipped: 0.00
    },

    difficultyWeights: {
        D1: 0.70,
        D2: 0.85,
        D3: 1.00,
        D4: 1.15,
        D5: 1.25
    },

    evidenceUpdate: {

        method:
            "weighted_rolling_average",

        defaultLearningRate:
            0.20,

        minimumLearningRate:
            0.10,

        maximumLearningRate:
            0.35,

        wrongAnswerRule: {
            enabled: true,
            defaultDecay: 0.08,
            maximumDecay: 0.15
        }
    },

    levelThresholds: {

        M0: {
            maxOverallEvidence: 0.39
        },

        M1: {
            minOverallEvidence: 0.40,
            maxOverallEvidence: 0.59,

            requiredEvidence: {
                know: 0.60
            }
        },

        M2: {
            minOverallEvidence: 0.60,
            maxOverallEvidence: 0.74,

            requiredEvidence: {
                know: 0.75,
                explain: 0.60
            }
        },

        M3: {
            minOverallEvidence: 0.75,
            maxOverallEvidence: 0.89,

            requiredEvidence: {
                know: 0.80,
                explain: 0.70,
                apply: 0.70
            }
        },

        M4: {
            minOverallEvidence: 0.90,

            requiredEvidence: {
                know: 0.85,
                explain: 0.80,
                apply: 0.80,
                transfer: 0.65
            }
        }
    },

    evidenceConfidence: {

        levels: {

            low: {
                minimumAttempts: 0
            },

            medium: {
                minimumAttempts: 2
            },

            high: {
                minimumAttempts: 4
            },

            very_high: {
                minimumAttempts: 6
            }
        },

        minimumAttemptsForMastery: 4,

        minimumDistinctContextsForMastery: 2,

        minimumDistinctQuestionTypesForMastery: 2
    },

    masteryPromotionRules: {

        M0_to_M1: {
            conditions: [
                "know >= 0.60",
                "evidenceConfidence != low"
            ]
        },

        M1_to_M2: {
            conditions: [
                "know >= 0.75",
                "explain >= 0.60",
                "overallEvidence >= 0.60"
            ]
        },

        M2_to_M3: {
            conditions: [
                "know >= 0.80",
                "explain >= 0.70",
                "apply >= 0.70",
                "overallEvidence >= 0.75"
            ]
        },

        M3_to_M4: {
            conditions: [
                "know >= 0.85",
                "explain >= 0.80",
                "apply >= 0.80",
                "transfer >= 0.65",
                "overallEvidence >= 0.90",
                "minimumAttempts >= 4",
                "minimumDistinctContexts >= 2"
            ]
        }
    },

    weaknessRules: {

        weakEvidenceThreshold: {
            know: 0.60,
            explain: 0.55,
            apply: 0.55,
            transfer: 0.50
        },

        weaknessTriggers: [

            {
                id: "W01",

                condition:
                    "sameEvidenceWrongStreak >= 2",

                signal:
                    "mark_evidence_weak_recommended"
            },

            {
                id: "W02",

                condition:
                    "sameFailureSignatureCount >= 2",

                signal:
                    "trigger_remediation_diagnosis_recommended"
            },

            {
                id: "W03",

                condition:
                    "retestFailed == true",

                signal:
                    "schedule_review_recommended"
            }
        ]
    },

    masteryDowngradeRules: {

        singleWrongAnswer: {
            action:
                "update_evidence_only",

            resetMastery:
                false
        },

        repeatedWrongSameSignature: {
            threshold: 2,

            action:
                "mark_weak_and_remediate",

            resetMastery:
                false
        },

        failedRetest: {
            action:
                "remove_stable_status",

            keepMastery:
                true,

            signal:
                "review_or_remediation_recommended"
        },

        persistentFailure: {
            threshold: 3,

            action:
                "recalculate_mastery",

            maximumLevelsPerUpdate:
                1,

            minimumPossibleLevel:
                "M1"
        }
    },

    diagnosticRules: {
        evidenceWeight: 0.70
    },

    recencyRules: {
        enabled: true,
        halfLifeDays: 45
    }
};


const EVIDENCE_MODEL = {};


/**
 * ============================================================
 * ADAPTIVE RULES
 * ============================================================
 */

const ADAPTIVE_RULES = {

    schemaVersion: "1.0.0",

    prerequisiteRules: {

        D1: {
            minimumMastery: "M2",
            blocking: true
        },

        D2: {
            blocking: false
        },

        D3: {
            blocking: false
        }
    },

    acceleratedLearningRules: {
        enabled: true
    },

    antiLoopRules: {
        maxSameNodeSameAction: 2,
        maxSameFailureSignature: 3
    },

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
};


/**
 * ============================================================
 * ADAPTIVE PATHS
 * ============================================================
 */

const ADAPTIVE_PATHS = {

    schemaVersion: "1.0.0",

    masteryPaths: {

        M0: {
            preferredAction: "LEARN",
            path: [
                "LEARN",
                "PRACTICE"
            ]
        },

        M1: {
            preferredAction: "LEARN",
            path: [
                "LEARN",
                "PRACTICE"
            ]
        },

        M2: {
            preferredAction: "PRACTICE",
            path: [
                "PRACTICE",
                "CHALLENGE"
            ]
        },

        M3: {
            preferredAction: "CHALLENGE",
            path: [
                "CHALLENGE",
                "RETEST"
            ]
        },

        M4: {
            preferredAction: "RETEST",
            path: [
                "RETEST",
                "REVIEW"
            ]
        }
    }
};


/**
 * ============================================================
 * FAILURE SIGNATURES
 * ============================================================
 */

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


/**
 * ============================================================
 * REMEDIATION RULES
 * ============================================================
 */

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
 * FIXTURE HELPERS
 * ============================================================
 */

function makeEvidence({

    know = 0.75,
    explain = 0.65,
    apply = 0.60,
    transfer = 0.40

} = {}) {

    return {
        know,
        explain,
        apply,
        transfer
    };
}


function makeKnowledgeState({

    nodeId,

    mastery = "M2",

    status = "developing",

    evidence = makeEvidence(),

    confidenceLevel = "medium",

    confidenceScore = 0.65,

    attempts = 3,

    failureSummary = {},

    evidenceWrongStreaks = {}

} = {}) {

    const contexts = [
        "CTX-1",
        "CTX-2"
    ];


    const questionTypes = [
        "mcq",
        "short_answer"
    ];


    return {

        nodeId,

        mastery,

        status,

        evidence,

        overallEvidence:
            (
                evidence.know * 0.15 +
                evidence.explain * 0.25 +
                evidence.apply * 0.30 +
                evidence.transfer * 0.30
            ),

        confidence: {

            level:
                confidenceLevel,

            score:
                confidenceScore,

            attemptCount:
                attempts
        },

        evidenceSufficiency: {

            independentObservations:
                attempts,

            distinctContexts:
                contexts.length,

            distinctQuestionTypes:
                questionTypes.length,

            observedEvidenceTypes: [
                "know",
                "explain",
                "apply"
            ],

            contextIds:
                [...contexts],

            questionTypes:
                [...questionTypes]
        },

        attemptStats: {

            total:
                attempts,

            correct:
                Math.max(
                    attempts - 1,
                    0
                ),

            partial:
                0,

            wrong:
                attempts > 0
                    ? 1
                    : 0,

            skipped:
                0
        },

        failureSummary: {
            ...failureSummary
        },

        evidenceWrongStreaks: {
            ...evidenceWrongStreaks
        },

        signals: []
    };
}


function makeStudentState({

    k281,
    k282,
    k283,

    currentNodeId = "K283",

    mode = "HOC_SAU"

} = {}) {

    return {

        schemaVersion:
            "1.1.0",

        stateId:
            "STATE-STUDENT-001",

        stateType:
            "runtime",

        updatedAt:
            FIXED_NOW,

        student: {
            studentId:
                "STUDENT-001"
        },

        learning: {

            currentMode:
                mode,

            session: {

                sessionId:
                    "SESSION-001",

                startedAt:
                    FIXED_NOW,

                lastActivityAt:
                    FIXED_NOW,

                timeBudgetMinutes:
                    45,

                timeUsedMinutes:
                    10,

                runtimeSignals: {
                    consecutiveWrong: 0,
                    consecutiveSkip: 0,
                    consecutiveRemediation: 0
                },

                fatigue: {
                    level: "normal",
                    signals: []
                }
            },

            current: {

                clusterId:
                    "GENETICS-01",

                lessonId:
                    "LESSON-GENETICS-01",

                nodeId:
                    currentNodeId,

                action:
                    "PRACTICE",

                pathStage:
                    "PRACTICE"
            }
        },

        knowledge: {

            K281:
                k281 ??
                makeKnowledgeState({
                    nodeId:
                        "K281",

                    mastery:
                        "M2"
                }),

            K282:
                k282 ??
                makeKnowledgeState({
                    nodeId:
                        "K282",

                    mastery:
                        "M2"
                }),

            K283:
                k283 ??
                makeKnowledgeState({
                    nodeId:
                        "K283",

                    mastery:
                        "M2"
                })
        },

        metaSkills: {},

        failurePatterns: {
            active: [],
            history: []
        },

        remediation: {
            active: null,
            history: []
        },

        adaptive: {
            currentDecision: null,
            history: []
        },

        history: {
            recentAttemptIds: [],
            recentDecisionIds: [],
            recentRemediationIds: []
        },

        progress: {
            masteredNodes: 0,
            stableNodes: 0,
            weakNodes: 0
        },

        preferences: {}
    };
}


function makeAttempt({

    attemptId =
    "ATT-K283-001",

    questionId =
    "Q-A-K283-A-001",

    nodeId =
    "K283",

    result =
    "correct",

    score =
    result === "correct"
        ? 1
        : 0,

    evidenceDimension =
    "apply",

    difficulty =
    "D3",

    failureType = null,

    sourceNodeId = null,

    occurrenceCount = null,

    pathStage =
    "PRACTICE",

    action =
    "PRACTICE",

    learningMode =
    "HOC_SAU",

    contextId =
    "CTX-E2E-SCHEMA-001"

} = {}) {

    const attempt = {

        schemaVersion:
            "1.0.0",

        attemptId,

        studentId:
            "STUDENT-001",

        sessionId:
            "SESSION-001",

        questionId,

        startedAt:
            "2026-09-29T07:59:00.000Z",

        submittedAt:
            FIXED_NOW,

        response: {
            type:
                "singleChoice",

            value:
                "A"
        },

        result,

        score,

        attemptNumber:
            1,

        hint: {
            used:
                false,

            count:
                0
        },

        timing: {
            timeSpentSeconds:
                60
        },

        context: {

            learningMode,

            action,

            pathStage,

            nodeId,

            clusterId:
                "GENETICS-01",

            lessonId:
                "LESSON-GENETICS-01",

            contextId
        },

        evidence: {

            primaryDimension:
                evidenceDimension,

            difficulty,

            questionType:
                "mcq"
        }
    };


    if (failureType) {

        attempt.diagnostic = {

            failureType,

            failureSignatureId:
                failureType,

            confidence:
                0.90
        };


        if (sourceNodeId) {

            attempt
                .diagnostic
                .sourceNodeId =
                sourceNodeId;
        }


        if (
            Number.isInteger(
                occurrenceCount
            )
        ) {

            attempt
                .diagnostic
                .occurrenceCount =
                occurrenceCount;
        }
    }


    return attempt;
}


/**
 * ============================================================
 * FLOW EXECUTOR
 * ============================================================
 */

function runFlow({

    attempt,

    studentState,

    recentResults = [],

    sessionContext = {},

    learningMode = null

} = {}) {

    return processAttempt({

        attempt,

        studentState,

        knowledgeMap:
            KNOWLEDGE_MAP,

        masteryRules:
            MASTERY_RULES,

        evidenceModel:
            EVIDENCE_MODEL,

        adaptiveRules:
            ADAPTIVE_RULES,

        adaptivePaths:
            ADAPTIVE_PATHS,

        failureSignatures:
            FAILURE_SIGNATURES,

        remediationRules:
            REMEDIATION_RULES,

        recentResults,

        sessionContext,

        learningMode,

        now:
            FIXED_NOW
    });
}


/**
 * ============================================================
 * SCHEMA ASSERTION HELPERS
 * ============================================================
 */

function formatAjvErrors(
    errors
) {

    if (
        !Array.isArray(errors) ||
        errors.length === 0
    ) {
        return "No AJV errors.";
    }


    return errors
        .map(
            (error, index) => {

                const path =
                    error.instancePath ||
                    "/";


                return (
                    `${index + 1}. ` +
                    `${path} ` +
                    `${error.message ?? ""}` +
                    (
                        error.params
                            ? ` | ${JSON.stringify(error.params)}`
                            : ""
                    )
                );
            }
        )
        .join("\n");
}


function assertSchemaValid({

    validate,

    data,

    label

}) {

    const valid =
        validate(data);


    assert.equal(
        valid,
        true,
        [
            `${label} failed schema validation.`,
            "",
            formatAjvErrors(
                validate.errors
            ),
            "",
            "Actual payload:",
            JSON.stringify(
                data,
                null,
                2
            )
        ].join("\n")
    );
}


/**
 * ============================================================
 * E2E SCHEMA SUITE
 * ============================================================
 */

test(
    "Learning Flow V1 — E2E Contract / Schema Validation",
    async (t) => {

        /**
         * ====================================================
         * 1
         * MASTERY OUTPUT
         * ====================================================
         */

        await t.test(
            "1. real Mastery output validates against mastery-update.schema.json",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt({
                                result:
                                    "correct",

                                evidenceDimension:
                                    "apply"
                            })
                    });


                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        result.masteryUpdate,

                    label:
                        "Mastery Update"
                });
            }
        );


        /**
         * ====================================================
         * 2
         * ADAPTIVE OUTPUT
         * ====================================================
         */

        await t.test(
            "2. real Adaptive output validates against next-action.schema.json",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt({
                                result:
                                    "correct"
                            })
                    });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        result.adaptiveDecision,

                    label:
                        "Adaptive Decision"
                });
            }
        );


        /**
         * ====================================================
         * 3
         * REMEDIATION OUTPUT
         * ====================================================
         */

        await t.test(
            "3. real Remediation output validates against remediation.schema.json",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M1",

                                status:
                                    "developing"
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                result:
                                    "incorrect",

                                score:
                                    0,

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                assert.equal(
                    result
                        .adaptiveDecision
                        .action,
                    "REMEDIATE"
                );


                assert.ok(
                    result.remediationPlan
                );


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        result.remediationPlan,

                    label:
                        "Remediation Plan"
                });
            }
        );


        /**
         * ====================================================
         * 4
         * FULL FAILURE PIPELINE
         *
         * One execution must produce three schema-valid
         * engine outputs.
         * ====================================================
         */

        await t.test(
            "4. K283 prerequisite failure produces schema-valid Mastery + Adaptive + Remediation outputs",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M1",

                                evidence:
                                    makeEvidence({
                                        know:
                                            0.62,

                                        explain:
                                            0.45,

                                        apply:
                                            0.30,

                                        transfer:
                                            0.20
                                    })
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-K283-SCHEMA-FAIL",

                                result:
                                    "incorrect",

                                score:
                                    0,

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        result.masteryUpdate,

                    label:
                        "Mastery Update"
                });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        result.adaptiveDecision,

                    label:
                        "Adaptive Decision"
                });


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        result.remediationPlan,

                    label:
                        "Remediation Plan"
                });
            }
        );


        /**
         * ====================================================
         * 5
         * ORIGINAL / SOURCE NODE SEMANTICS + SCHEMA
         * ====================================================
         */

        await t.test(
            "5. prerequisite remediation remains schema-valid while preserving K283 original / K281 source",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M1"
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                result:
                                    "incorrect",

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                assert.equal(
                    result
                        .remediationPlan
                        .target
                        .originalNodeId,
                    "K283"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .target
                        .sourceNodeId,
                    "K281"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .return
                        .targetNodeId,
                    "K283"
                );


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        result.remediationPlan,

                    label:
                        "K283 → K281 remediation"
                });
            }
        );


        /**
         * ====================================================
         * 6
         * REPEATED CONCEPT FAILURE
         * ====================================================
         */

        await t.test(
            "6. repeated concept failure produces schema-valid remediation pipeline",
            () => {

                const state =
                    makeStudentState({

                        k283:
                            makeKnowledgeState({

                                nodeId:
                                    "K283",

                                mastery:
                                    "M2",

                                failureSummary: {
                                    concept_confusion:
                                        1
                                }
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-CONCEPT-002",

                                result:
                                    "incorrect",

                                failureType:
                                    "concept_confusion",

                                occurrenceCount:
                                    2
                            })
                    });


                assert.equal(
                    result
                        .adaptiveDecision
                        .action,
                    "REMEDIATE"
                );


                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        result.masteryUpdate,

                    label:
                        "Repeated failure Mastery Update"
                });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        result.adaptiveDecision,

                    label:
                        "Repeated failure Adaptive Decision"
                });


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        result.remediationPlan,

                    label:
                        "Repeated failure Remediation Plan"
                });
            }
        );


        /**
         * ====================================================
         * 7
         * NON-REMEDIATION PIPELINE
         * ====================================================
         */

        await t.test(
            "7. normal non-remediation flow validates Mastery + Adaptive and emits no Remediation payload",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-NORMAL-001",

                                result:
                                    "correct",

                                score:
                                    1
                            })
                    });


                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        result.masteryUpdate,

                    label:
                        "Normal Mastery Update"
                });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        result.adaptiveDecision,

                    label:
                        "Normal Adaptive Decision"
                });


                if (
                    result
                        .adaptiveDecision
                        .action !==
                    "REMEDIATE"
                ) {

                    assert.equal(
                        result.remediationPlan,
                        null
                    );
                }
            }
        );


        /**
         * ====================================================
         * 8
         * MINI PROBE
         *
         * Remediation
         *      ↓
         * MINI_PROBE Attempt
         *      ↓
         * Mastery
         *      ↓
         * Adaptive
         * ====================================================
         */

        await t.test(
            "8. remediation MINI_PROBE produces schema-valid Mastery + Adaptive outputs",
            () => {

                /*
                 * --------------------------------------------
                 * First create a real remediation plan.
                 * --------------------------------------------
                 */

                const initialState =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({

                                nodeId:
                                    "K281",

                                mastery:
                                    "M1",

                                evidence:
                                    makeEvidence({
                                        know:
                                            0.62,

                                        explain:
                                            0.45,

                                        apply:
                                            0.30,

                                        transfer:
                                            0.20
                                    })
                            })
                    });


                const failedFlow =
                    runFlow({

                        studentState:
                            initialState,

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-K283-BEFORE-PROBE",

                                result:
                                    "incorrect",

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                assert.ok(
                    failedFlow
                        .remediationPlan
                );


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        failedFlow
                            .remediationPlan,

                    label:
                        "Pre-probe Remediation Plan"
                });


                /*
                 * --------------------------------------------
                 * Simulate persistence/projection of the
                 * previous K283 Mastery result.
                 *
                 * learningFlow itself intentionally does not
                 * persist Student State.
                 * --------------------------------------------
                 */

                const projectedState =
                    structuredClone(
                        initialState
                    );


                projectedState
                    .knowledge
                    .K283 =
                    structuredClone(
                        failedFlow
                            .projection
                            .nodeState
                    );


                /*
                 * --------------------------------------------
                 * Real MINI_PROBE Attempt on source K281.
                 * --------------------------------------------
                 */

                const probeAttempt =
                    makeAttempt({

                        attemptId:
                            "ATT-K281-MINI-PROBE",

                        questionId:
                            "Q-K281-MINI-PROBE",

                        nodeId:
                            "K281",

                        result:
                            "correct",

                        score:
                            1,

                        evidenceDimension:
                            "know",

                        difficulty:
                            "D1",

                        pathStage:
                            "MINI_PROBE",

                        action:
                            "REMEDIATE",

                        contextId:
                            "CTX-K281-PROBE"
                    });


                probeAttempt
                    .context
                    .remediationId =
                    failedFlow
                        .remediationPlan
                        .remediationId;


                const probeResult =
                    processRemediationProbe({

                        attempt:
                            probeAttempt,

                        remediationPlan:
                            failedFlow
                                .remediationPlan,

                        studentState:
                            projectedState,

                        knowledgeMap:
                            KNOWLEDGE_MAP,

                        masteryRules:
                            MASTERY_RULES,

                        evidenceModel:
                            EVIDENCE_MODEL,

                        adaptiveRules:
                            ADAPTIVE_RULES,

                        adaptivePaths:
                            ADAPTIVE_PATHS,

                        failureSignatures:
                            FAILURE_SIGNATURES,

                        remediationRules:
                            REMEDIATION_RULES,

                        learningMode:
                            "HOC_SAU",

                        now:
                            FIXED_NOW
                    });


                assert.equal(
                    probeResult
                        .targetNodeId,
                    "K281"
                );


                assert.equal(
                    probeResult
                        .masteryUpdate
                        .nodeId,
                    "K281"
                );


                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        probeResult
                            .masteryUpdate,

                    label:
                        "MINI_PROBE Mastery Update"
                });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        probeResult
                            .adaptiveDecision,

                    label:
                        "MINI_PROBE Adaptive Decision"
                });
            }
        );


        /**
         * ====================================================
         * 9
         * ALL OUTPUTS USE CONTRACT V1
         * ====================================================
         */

        await t.test(
            "9. all contract outputs remain on schemaVersion 1.0.0",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M1"
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                result:
                                    "incorrect",

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                assert.equal(
                    result
                        .masteryUpdate
                        .schemaVersion,
                    "1.0.0"
                );


                assert.equal(
                    result
                        .adaptiveDecision
                        .schemaVersion,
                    "1.0.0"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .schemaVersion,
                    "1.0.0"
                );
            }
        );


        /**
         * ====================================================
         * 10
         * FULL CRITICAL PIPELINE CONTRACT GATE
         * ====================================================
         */

        await t.test(
            "10. critical K283 → K281 remediation pipeline passes every E2E contract gate",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({

                                nodeId:
                                    "K281",

                                mastery:
                                    "M1",

                                evidence:
                                    makeEvidence({
                                        know:
                                            0.62,

                                        explain:
                                            0.45,

                                        apply:
                                            0.30,

                                        transfer:
                                            0.20
                                    })
                            }),

                        k283:
                            makeKnowledgeState({

                                nodeId:
                                    "K283",

                                mastery:
                                    "M2"
                            })
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-CRITICAL-E2E",

                                questionId:
                                    "Q-CRITICAL-E2E",

                                nodeId:
                                    "K283",

                                result:
                                    "incorrect",

                                score:
                                    0,

                                evidenceDimension:
                                    "apply",

                                difficulty:
                                    "D3",

                                failureType:
                                    "prerequisite_gap",

                                sourceNodeId:
                                    "K281",

                                occurrenceCount:
                                    2
                            }),

                        sessionContext: {

                            prerequisites: [
                                {
                                    nodeId:
                                        "K281",

                                    type:
                                        "D1",

                                    mastery:
                                        "M1"
                                }
                            ]
                        }
                    });


                /*
                 * Semantic E2E assertions.
                 */

                assert.equal(
                    result.targetNodeId,
                    "K283"
                );


                assert.equal(
                    result
                        .masteryUpdate
                        .nodeId,
                    "K283"
                );


                assert.equal(
                    result
                        .adaptiveDecision
                        .action,
                    "REMEDIATE"
                );


                assert.equal(
                    result
                        .adaptiveDecision
                        .target
                        .primaryNodeId,
                    "K281"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .target
                        .originalNodeId,
                    "K283"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .target
                        .sourceNodeId,
                    "K281"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .return
                        .targetNodeId,
                    "K283"
                );


                /*
                 * Contract gates.
                 */

                assertSchemaValid({

                    validate:
                        validateMasteryUpdate,

                    data:
                        result.masteryUpdate,

                    label:
                        "Critical Mastery Update"
                });


                assertSchemaValid({

                    validate:
                        validateNextAction,

                    data:
                        result.adaptiveDecision,

                    label:
                        "Critical Adaptive Decision"
                });


                assertSchemaValid({

                    validate:
                        validateRemediation,

                    data:
                        result.remediationPlan,

                    label:
                        "Critical Remediation Plan"
                });
            }
        );
    }
);
