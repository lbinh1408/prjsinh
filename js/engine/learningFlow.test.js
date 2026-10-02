
import test from "node:test";
import assert from "node:assert/strict";

import {
    processAttempt,
    processRemediationProbe
} from "./learningFlow.js";


/**
 * ============================================================
 * FIXED TEST TIME
 * ============================================================
 */

const FIXED_NOW =
    "2026-09-29T08:00:00.000Z";


/**
 * ============================================================
 * CANONICAL DOMAINS
 * ============================================================
 */

const CANONICAL_ACTIONS = new Set([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);


const CANONICAL_FAILURES = new Set([
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
]);


/**
 * ============================================================
 * KNOWLEDGE MAP
 *
 * K281
 *   ↓ D1
 * K282
 *
 * K281 --D1--> K283
 * K282 --D2--> K283
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
 *
 * These are intentionally close to the currently locked
 * mastery/rules.json contract.
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


/**
 * ============================================================
 * EVIDENCE MODEL
 *
 * Empty is intentional:
 * Mastery Engine already has canonical rules above and safety
 * fallbacks. E2E is testing orchestration, not evidence-model
 * contract behavior.
 * ============================================================
 */

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
 * FAILURE SIGNATURE REGISTRY
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
 * HELPERS
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

    contexts = [
        "CTX-1",
        "CTX-2"
    ],

    questionTypes = [
        "mcq",
        "short_answer"
    ],

    failureSummary = {},

    evidenceWrongStreaks = {}

} = {}) {

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

            observedEvidenceTypes:
                [
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
                        "M2",

                    status:
                        "developing"
                }),

            K282:
                k282 ??
                makeKnowledgeState({
                    nodeId:
                        "K282",

                    mastery:
                        "M2",

                    status:
                        "developing"
                }),

            K283:
                k283 ??
                makeKnowledgeState({
                    nodeId:
                        "K283",

                    mastery:
                        "M2",

                    status:
                        "developing"
                })
        },

        /*
         * These fields are present to resemble the actual
         * Student State shape.
         *
         * learningFlow only reads the fields it owns the right
         * to read.
         */
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

    hintUsed =
    false,

    questionType =
    "mcq",

    contextId =
    "CTX-E2E-001"

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
                hintUsed,

            count:
                hintUsed
                    ? 1
                    : 0
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

            questionType
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
            attempt.diagnostic
                .sourceNodeId =
                sourceNodeId;
        }


        if (
            Number.isInteger(
                occurrenceCount
            )
        ) {
            attempt.diagnostic
                .occurrenceCount =
                occurrenceCount;
        }
    }


    return attempt;
}


/**
 * ============================================================
 * DEFAULT FLOW EXECUTOR
 * ============================================================
 */

function runFlow({

    attempt,

    studentState,

    recentResults = [],

    sessionContext = {},

    learningMode = null,

    timeBudget = null

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

        timeBudget,

        now:
            FIXED_NOW
    });
}


/**
 * ============================================================
 * TEST SUITE
 * ============================================================
 */

test(
    "Learning Flow V1 — End-to-End Integration",
    async (t) => {

        /**
         * ====================================================
         * 1
         * BASIC PIPELINE
         * ====================================================
         */

        await t.test(
            "1. completed Attempt flows through Mastery and Adaptive",
            () => {

                const state =
                    makeStudentState();


                const attempt =
                    makeAttempt({
                        result:
                            "correct",

                        evidenceDimension:
                            "apply"
                    });


                const result =
                    runFlow({
                        attempt,
                        studentState:
                            state
                    });


                assert.ok(
                    result.masteryUpdate
                );


                assert.ok(
                    result.adaptiveDecision
                );


                assert.ok(
                    CANONICAL_ACTIONS.has(
                        result
                            .adaptiveDecision
                            .action
                    )
                );
            }
        );


        /**
         * ====================================================
         * 2
         * TRACEABILITY
         * ====================================================
         */

        await t.test(
            "2. flow preserves student, attempt and target identity",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt({
                                attemptId:
                                    "ATT-K283-TRACE",

                                questionId:
                                    "Q-K283-TRACE",

                                nodeId:
                                    "K283"
                            })
                    });


                assert.equal(
                    result.studentId,
                    "STUDENT-001"
                );


                assert.equal(
                    result.targetNodeId,
                    "K283"
                );


                assert.equal(
                    result.attempt
                        .attemptId,
                    "ATT-K283-TRACE"
                );


                assert.equal(
                    result.attempt
                        .questionId,
                    "Q-K283-TRACE"
                );
            }
        );


        /**
         * ====================================================
         * 3
         * MASTERY → PROJECTION
         * ====================================================
         */

        await t.test(
            "3. Mastery output is projected into Adaptive-readable node state",
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


                const projected =
                    result
                        .projection
                        .nodeState;


                assert.equal(
                    projected.nodeId,
                    "K283"
                );


                assert.equal(
                    projected.mastery,
                    result
                        .masteryUpdate
                        .current
                        .mastery
                );


                assert.equal(
                    projected.status,
                    result
                        .masteryUpdate
                        .current
                        .status
                );


                assert.deepEqual(
                    projected.evidence,
                    result
                        .masteryUpdate
                        .current
                        .evidence
                );
            }
        );


        /**
         * ====================================================
         * 4
         * NO STATE MUTATION
         * ====================================================
         */

        await t.test(
            "4. processAttempt does not mutate Student State",
            () => {

                const state =
                    makeStudentState();


                const before =
                    structuredClone(
                        state
                    );


                runFlow({

                    studentState:
                        state,

                    attempt:
                        makeAttempt({
                            result:
                                "incorrect",

                            failureType:
                                "concept_confusion"
                        })
                });


                assert.deepEqual(
                    state,
                    before
                );
            }
        );


        /**
         * ====================================================
         * 5
         * NO REMEDIATION WHEN ADAPTIVE DOES NOT REQUEST IT
         * ====================================================
         */

        await t.test(
            "5. Remediation Engine is not invoked when Adaptive action is not REMEDIATE",
            () => {

                const state =
                    makeStudentState({

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M2"
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
                                result:
                                    "correct",

                                evidenceDimension:
                                    "apply"
                            })
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


                    assert.equal(
                        result.outcome
                            .remediationRequired,
                        false
                    );


                    assert.equal(
                        result.outcome
                            .remediationCreated,
                        false
                    );
                }
            }
        );


        /**
         * ====================================================
         * 6
         * CRITICAL E2E CASE
         *
         * K283 failure
         *   ↓
         * prerequisite_gap
         *   ↓
         * source K281
         *   ↓
         * Adaptive REMEDIATE
         *   ↓
         * Remediation target K281
         * ====================================================
         */

        await t.test(
            "6. K283 prerequisite gap routes end-to-end to remediation of K281",
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
                                    "developing",

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
                                    "M2",

                                status:
                                    "developing"
                            })
                    });


                const attempt =
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
                            2,

                        evidenceDimension:
                            "apply"
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt,

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
                 * Mastery executed.
                 */
                assert.ok(
                    result.masteryUpdate
                );


                /*
                 * Adaptive owns routing.
                 */
                assert.equal(
                    result
                        .adaptiveDecision
                        .action,
                    "REMEDIATE"
                );


                /*
                 * Adaptive selected prerequisite source.
                 */
                assert.equal(
                    result
                        .adaptiveDecision
                        .target
                        .primaryNodeId,
                    "K281"
                );


                /*
                 * Remediation was created only because
                 * Adaptive selected REMEDIATE.
                 */
                assert.ok(
                    result.remediationPlan
                );


                assert.equal(
                    result.outcome
                        .remediationRequired,
                    true
                );


                assert.equal(
                    result.outcome
                        .remediationCreated,
                    true
                );


                /*
                 * Remediation knows original failure location.
                 */
                assert.equal(
                    result
                        .remediationPlan
                        .target
                        .originalNodeId,
                    "K283"
                );


                /*
                 * Repair target is K281.
                 */
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
                        .target
                        .targetType,
                    "SOURCE_NODE"
                );


                /*
                 * After repair, return toward K283.
                 */
                assert.equal(
                    result
                        .remediationPlan
                        .return
                        .targetNodeId,
                    "K283"
                );
            }
        );


        /**
         * ====================================================
         * 7
         * FAILURE TAXONOMY SURVIVES ENGINE BOUNDARIES
         * ====================================================
         */

        await t.test(
            "7. canonical failure signature survives Mastery → Adaptive → Remediation boundary",
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


                const failure =
                    result
                        .remediationPlan
                        ?.diagnosis
                        ?.failureSignature;


                assert.ok(
                    CANONICAL_FAILURES.has(
                        failure
                    )
                );


                assert.equal(
                    failure,
                    "prerequisite_gap"
                );
            }
        );


        /**
         * ====================================================
         * 8
         * SOURCE NODE DOES NOT BECOME ORIGINAL NODE
         * ====================================================
         */

        await t.test(
            "8. remediation preserves distinction between original node K283 and source node K281",
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


                assert.notEqual(
                    result
                        .remediationPlan
                        .target
                        .originalNodeId,

                    result
                        .remediationPlan
                        .target
                        .sourceNodeId
                );
            }
        );


        /**
         * ====================================================
         * 9
         * REMEDIATION DOES NOT LEAK NEXT ACTION OWNERSHIP
         * ====================================================
         */

        await t.test(
            "9. remediation return does not select canonical next action",
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
                    Object.hasOwn(
                        result
                            .remediationPlan
                            .return,
                        "action"
                    ),
                    false
                );
            }
        );


        /**
         * ====================================================
         * 10
         * LEARNING MODE PROPAGATION
         * ====================================================
         */

        await t.test(
            "10. learning mode propagates from Attempt to Adaptive source",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState({
                                mode:
                                    "HOC_SAU"
                            }),

                        attempt:
                            makeAttempt({
                                learningMode:
                                    "ON_THI",

                                result:
                                    "correct"
                            })
                    });


                assert.equal(
                    result
                        .adaptiveDecision
                        .source
                        .learningMode,
                    "ON_THI"
                );
            }
        );


        /**
         * ====================================================
         * 11
         * EXPLICIT LEARNING MODE OVERRIDE
         * ====================================================
         */

        await t.test(
            "11. explicit learningMode input overrides Attempt and Student State mode",
            () => {

                const result =
                    processAttempt({

                        attempt:
                            makeAttempt({
                                learningMode:
                                    "HOC_NHANH"
                            }),

                        studentState:
                            makeStudentState({
                                mode:
                                    "HOC_SAU"
                            }),

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
                            "ON_THI",

                        now:
                            FIXED_NOW
                    });


                assert.equal(
                    result
                        .adaptiveDecision
                        .source
                        .learningMode,
                    "ON_THI"
                );
            }
        );


        /**
         * ====================================================
         * 12
         * FLOW METADATA
         * ====================================================
         */

        await t.test(
            "12. integration result identifies LearningFlow V1",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt()
                    });


                assert.equal(
                    result.flow.name,
                    "LearningFlow"
                );


                assert.equal(
                    result.flow.version,
                    "1.0.0"
                );
            }
        );


        /**
         * ====================================================
         * 13
         * OUTCOME ACTION = ADAPTIVE ACTION
         * ====================================================
         */

        await t.test(
            "13. flow outcome never invents an action different from Adaptive",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt()
                    });


                assert.equal(
                    result.outcome.action,
                    result
                        .adaptiveDecision
                        .action
                );
            }
        );


        /**
         * ====================================================
         * 14
         * PROJECTED STATE DOES NOT DESTROY OTHER NODES
         * ====================================================
         */

        await t.test(
            "14. projection updates target node while preserving other knowledge nodes",
            () => {

                const state =
                    makeStudentState();


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt({
                                nodeId:
                                    "K283",

                                result:
                                    "correct"
                            })
                    });


                assert.ok(
                    result
                        .projection
                        .masteryState
                        .knowledge
                        .K281
                );


                assert.ok(
                    result
                        .projection
                        .masteryState
                        .knowledge
                        .K282
                );


                assert.ok(
                    result
                        .projection
                        .masteryState
                        .knowledge
                        .K283
                );


                assert.deepEqual(
                    result
                        .projection
                        .masteryState
                        .knowledge
                        .K281,

                    state
                        .knowledge
                        .K281
                );
            }
        );


        /**
         * ====================================================
         * 15
         * PROJECTED STATE IS A NEW OBJECT
         * ====================================================
         */

        await t.test(
            "15. projected mastery state does not reuse Student State knowledge object",
            () => {

                const state =
                    makeStudentState();


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt:
                            makeAttempt()
                    });


                assert.notEqual(
                    result
                        .projection
                        .masteryState
                        .knowledge,

                    state.knowledge
                );


                assert.notEqual(
                    result
                        .projection
                        .masteryState
                        .knowledge
                        .K283,

                    state
                        .knowledge
                        .K283
                );
            }
        );


        /**
         * ====================================================
         * 16
         * REPEATED FAILURE
         * ====================================================
         */

        await t.test(
            "16. repeated canonical failure can trigger remediation through Adaptive",
            () => {

                const state =
                    makeStudentState({

                        k283:
                            makeKnowledgeState({
                                nodeId:
                                    "K283",

                                mastery:
                                    "M2",

                                status:
                                    "developing",

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


                assert.ok(
                    result.remediationPlan
                );


                assert.equal(
                    result
                        .remediationPlan
                        .diagnosis
                        .failureSignature,
                    "concept_confusion"
                );
            }
        );


        /**
         * ====================================================
         * 17
         * REMEDIATION PLAN REPAIR / RETURN
         * ====================================================
         */

        await t.test(
            "17. remediation repairs source node but returns to original target",
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
                        .probe
                        .targetNodeId,
                    "K281"
                );


                assert.equal(
                    result
                        .remediationPlan
                        .return
                        .targetNodeId,
                    "K283"
                );
            }
        );


        /**
         * ====================================================
         * 18
         * MINI PROBE REUSES SAME PIPELINE
         * ====================================================
         */

        await t.test(
            "18. remediation MINI_PROBE goes back through Mastery → Adaptive",
            () => {

                /*
                 * First create remediation.
                 */

                const originalState =
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
                                            0.50,

                                        apply:
                                            0.35,

                                        transfer:
                                            0.20
                                    })
                            })
                    });


                const failedFlow =
                    runFlow({

                        studentState:
                            originalState,

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


                assert.ok(
                    failedFlow
                        .remediationPlan
                );


                /*
                 * Build a projected state as if caller/projector
                 * persisted the first flow result.
                 *
                 * learningFlow itself does not persist.
                 */

                const projectedState =
                    structuredClone(
                        originalState
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
                 * Student now completes MINI_PROBE on K281.
                 */

                const probeAttempt =
                    makeAttempt({

                        attemptId:
                            "ATT-K281-PROBE-001",

                        questionId:
                            "Q-K281-PROBE-001",

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
                            "CTX-REMEDIATION-K281"
                    });


                probeAttempt.context
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


                /*
                 * Probe is not a special mastery path.
                 *
                 * It generated a normal Mastery Update.
                 */
                assert.ok(
                    probeResult
                        .masteryUpdate
                );


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


                /*
                 * And Adaptive runs again afterwards.
                 */
                assert.ok(
                    probeResult
                        .adaptiveDecision
                );


                assert.ok(
                    CANONICAL_ACTIONS.has(
                        probeResult
                            .adaptiveDecision
                            .action
                    )
                );
            }
        );


        /**
         * ====================================================
         * 19
         * PROBE DOES NOT DIRECTLY MUTATE ORIGINAL TARGET
         * ====================================================
         */

        await t.test(
            "19. K281 MINI_PROBE does not directly update K283 mastery",
            () => {

                const state =
                    makeStudentState({

                        currentNodeId:
                            "K281",

                        k281:
                            makeKnowledgeState({
                                nodeId:
                                    "K281",

                                mastery:
                                    "M1"
                            }),

                        k283:
                            makeKnowledgeState({
                                nodeId:
                                    "K283",

                                mastery:
                                    "M2"
                            })
                    });


                const originalK283 =
                    structuredClone(
                        state
                            .knowledge
                            .K283
                    );


                const remediationPlan = {

                    remediationId:
                        "REM-STUDENT-001-K283-001",

                    target: {
                        originalNodeId:
                            "K283",

                        sourceNodeId:
                            "K281"
                    },

                    return: {
                        targetNodeId:
                            "K283",

                        condition:
                            "PROBE_PASSED"
                    }
                };


                const result =
                    processRemediationProbe({

                        attempt:
                            makeAttempt({

                                attemptId:
                                    "ATT-K281-PROBE-002",

                                questionId:
                                    "Q-K281-PROBE-002",

                                nodeId:
                                    "K281",

                                result:
                                    "correct",

                                evidenceDimension:
                                    "know",

                                difficulty:
                                    "D1",

                                action:
                                    "REMEDIATE",

                                pathStage:
                                    "MINI_PROBE"
                            }),

                        remediationPlan,

                        studentState:
                            state,

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

                        now:
                            FIXED_NOW
                    });


                assert.equal(
                    result
                        .masteryUpdate
                        .nodeId,
                    "K281"
                );


                assert.deepEqual(
                    state
                        .knowledge
                        .K283,

                    originalK283
                );
            }
        );


        /**
         * ====================================================
         * 20
         * NO BUSINESS-LOGIC OWNERSHIP LEAK
         * ====================================================
         */

        await t.test(
            "20. LearningFlow exposes engine outputs without creating its own mastery or remediation decision",
            () => {

                const result =
                    runFlow({

                        studentState:
                            makeStudentState(),

                        attempt:
                            makeAttempt()
                    });


                /*
                 * Flow may summarize the action,
                 * but it must equal Adaptive exactly.
                 */
                assert.equal(
                    result.outcome.action,
                    result
                        .adaptiveDecision
                        .action
                );


                /*
                 * No root-level independently calculated mastery.
                 */
                assert.equal(
                    Object.hasOwn(
                        result,
                        "newMastery"
                    ),
                    false
                );


                /*
                 * No root-level independently selected strategy.
                 */
                assert.equal(
                    Object.hasOwn(
                        result,
                        "remediationStrategy"
                    ),
                    false
                );


                /*
                 * No root-level independently diagnosed failure.
                 */
                assert.equal(
                    Object.hasOwn(
                        result,
                        "diagnosis"
                    ),
                    false
                );
            }
        );
        /**
 * ====================================================
 * 21
 * CURRENT SUCCESSFUL ATTEMPT MUST REACH
 * ADAPTIVE RECENT-QUESTION EXCLUSION
 * ====================================================
 */

        await t.test(
            "21. current successful Attempt is included in Adaptive excludeQuestionIds",
            () => {

                const state =
                    makeStudentState();


                /*
                 * Historical question already completed
                 * before the current Attempt.
                 */
                const previousQuestionId =
                    "Q-A-K283-A-003";


                /*
                 * Current successful question.
                 *
                 * This is the important case:
                 * a correct Attempt has no failure,
                 * but Adaptive must still know that
                 * this question was just answered.
                 */
                const currentQuestionId =
                    "Q-A-K283-K-001";


                const attempt =
                    makeAttempt({

                        attemptId:
                            "ATT-K283-EXCLUDE-001",

                        questionId:
                            currentQuestionId,

                        nodeId:
                            "K283",

                        result:
                            "correct",

                        score:
                            1,

                        evidenceDimension:
                            "know",

                        difficulty:
                            "D1"
                    });


                const result =
                    runFlow({

                        studentState:
                            state,

                        attempt,

                        recentResults: [
                            {
                                attemptId:
                                    "ATT-K283-PREVIOUS-001",

                                questionId:
                                    previousQuestionId,

                                result:
                                    "correct"
                            }
                        ]
                    });


                const excludeQuestionIds =
                    result
                        .adaptiveDecision
                        ?.selectionCriteria
                        ?.excludeQuestionIds ??
                    [];


                /*
                 * Historical question must remain excluded.
                 */
                assert.ok(
                    excludeQuestionIds.includes(
                        previousQuestionId
                    ),
                    "Adaptive must exclude the previously answered question"
                );


                /*
                 * REGRESSION ASSERTION:
                 *
                 * The current successful Attempt must ALSO
                 * be visible to Adaptive.
                 *
                 * Before INT-001 fix this assertion fails
                 * because normalizeRecentResults() only
                 * appended the current Attempt when it
                 * contained failure information.
                 */
                assert.ok(
                    excludeQuestionIds.includes(
                        currentQuestionId
                    ),
                    "Adaptive must exclude the current successful question"
                );
            }
        );

    }
);
