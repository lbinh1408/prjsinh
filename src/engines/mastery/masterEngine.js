/*
 * masteryEngine.js
 *
 * Adaptive Biology Learning System
 * Phase 2A — Study MVP
 *
 * Engine Version: 1.0.1
 *
 * Source of truth:
 *   mastery/rules.json
 *
 * Responsibility:
 *
 * Attempt
 *   ↓
 * Interpret attempt
 *   ↓
 * Update evidence
 *   ↓
 * Update evidence sufficiency / attempt statistics
 *   ↓
 * Calculate overall evidence
 *   ↓
 * Calculate confidence
 *   ↓
 * Record failure evidence
 *   ↓
 * Evaluate weakness
 *   ↓
 * Evaluate mastery promotion / conservative downgrade
 *   ↓
 * Evaluate status
 *   ↓
 * Return Mastery Update
 *
 * IMPORTANT:
 *
 * Mastery Engine DOES NOT:
 * - choose next action
 * - choose lesson
 * - choose question
 * - schedule review
 * - schedule retest
 * - execute remediation
 * - mutate Student State
 *
 * It only emits mastery/evidence/failure/weakness state.
 */


const ENGINE_NAME = "mastery-engine";
const ENGINE_VERSION = "1.0.1";


/* =========================================================
 * Canonical domains
 * ========================================================= */

const EVIDENCE_DIMENSIONS = [
    "know",
    "explain",
    "apply",
    "transfer"
];


const MASTERY_LEVELS = [
    "M0",
    "M1",
    "M2",
    "M3",
    "M4"
];


const CONFIDENCE_LEVELS = [
    "low",
    "medium",
    "high",
    "very_high"
];


const FAILURE_TYPES = new Set([
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


/* =========================================================
 * Fallback rules
 *
 * These are safety fallbacks only.
 * mastery/rules.json remains source of truth.
 * ========================================================= */

const DEFAULT_RULES = {

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
        method: "weighted_rolling_average",
        defaultLearningRate: 0.20,
        minimumLearningRate: 0.10,
        maximumLearningRate: 0.35,

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
                condition: "sameEvidenceWrongStreak >= 2",
                signal: "mark_evidence_weak_recommended"
            },
            {
                id: "W02",
                condition: "sameFailureSignatureCount >= 2",
                signal: "trigger_remediation_diagnosis_recommended"
            },
            {
                id: "W03",
                condition: "retestFailed == true",
                signal: "schedule_review_recommended"
            }
        ]
    },

    masteryDowngradeRules: {

        singleWrongAnswer: {
            action: "update_evidence_only",
            resetMastery: false
        },

        repeatedWrongSameSignature: {
            threshold: 2,
            action: "mark_weak_and_remediate",
            resetMastery: false
        },

        failedRetest: {
            action: "remove_stable_status",
            keepMastery: true,
            signal: "review_or_remediation_recommended"
        },

        persistentFailure: {
            threshold: 3,
            action: "recalculate_mastery",
            maximumLevelsPerUpdate: 1,
            minimumPossibleLevel: "M1"
        }
    },

    diagnosticRules: {
        diagnosticEvidenceWeight: 0.70
    },

    recencyRules: {
        enabled: true,
        halfLifeDays: 45
    }
};


/* =========================================================
 * Public API
 * ========================================================= */

export function updateMastery({
    attempt,
    currentState = null,
    masteryRules = {},
    evidenceModel = {}
}) {

    if (!isPlainObject(attempt)) {
        throw new TypeError(
            "MasteryEngine requires a valid attempt object."
        );
    }


    const rules = resolveRules(
        masteryRules,
        evidenceModel
    );


    const previousState =
        normalizeCurrentState(currentState);


    const nodeId =
        resolveNodeId(attempt);


    const dimension =
        resolveEvidenceDimension(attempt);


    const result =
        normalizeAttemptResult(attempt);


    const directEvidence =
        EVIDENCE_DIMENSIONS.includes(dimension);


    /* -----------------------------------------------------
     * Evidence
     * ----------------------------------------------------- */

    const attemptStrength =
        calculateAttemptStrength(
            attempt,
            result,
            rules
        );


    const evidenceUpdate =
        directEvidence
            ? updateEvidenceDimension({
                dimension,
                previousEvidence:
                    previousState.evidence,
                attempt,
                result,
                attemptStrength,
                rules
            })
            : createNoEvidenceUpdate(
                previousState.evidence
            );


    const evidence =
        evidenceUpdate.evidence;


    /* -----------------------------------------------------
     * Attempt statistics
     * ----------------------------------------------------- */

    const attemptStats =
        updateAttemptStatistics(
            previousState.attemptStats,
            attempt,
            result
        );


    /* -----------------------------------------------------
     * Evidence sufficiency
     * ----------------------------------------------------- */

    const evidenceSufficiency =
        updateEvidenceSufficiency({
            previous:
                previousState.evidenceSufficiency,
            attempt,
            dimension,
            result
        });


    /* -----------------------------------------------------
     * Overall evidence
     * ----------------------------------------------------- */

    const overallEvidence =
        calculateOverallEvidence(
            evidence,
            rules
        );


    /* -----------------------------------------------------
     * Confidence
     * ----------------------------------------------------- */

    const confidence =
        calculateConfidence({
            evidenceSufficiency,
            attemptStats,
            attempt,
            previousState,
            rules
        });


    /* -----------------------------------------------------
     * Failure
     * ----------------------------------------------------- */

    const failure =
        buildFailureUpdate({
            attempt,
            result
        });


    /* -----------------------------------------------------
     * Failure history + streak
     * ----------------------------------------------------- */

    const failureState =
        updateFailureState({
            previousState,
            attempt,
            result,
            dimension,
            failure
        });


    /* -----------------------------------------------------
     * Weakness
     * ----------------------------------------------------- */

    const weakness =
        evaluateWeakness({
            evidence,
            failureState,
            attempt,
            result,
            rules
        });


    /* -----------------------------------------------------
     * Mastery
     * ----------------------------------------------------- */

    const masteryEvaluation =
        evaluateMastery({
            previousMastery:
                previousState.mastery,

            evidence,

            overallEvidence,

            confidence,

            evidenceSufficiency,

            attemptStats,

            attempt,

            result,

            failureState,

            rules
        });


    const mastery =
        masteryEvaluation.mastery;


    /* -----------------------------------------------------
     * Status
     * ----------------------------------------------------- */

    const status =
        evaluateStatus({
            previousStatus:
                previousState.status,
            mastery,
            weakness,
            attempt,
            rules
        });


    /* -----------------------------------------------------
     * Output
     * ----------------------------------------------------- */

    return {

        engine: {
            name: ENGINE_NAME,
            version: ENGINE_VERSION
        },

        nodeId,

        attemptId:
            attempt.attemptId ?? null,

        questionId:
            attempt.questionId ?? null,


        previous: {

            mastery:
                previousState.mastery,

            status:
                previousState.status,

            evidence:
                cloneEvidence(
                    previousState.evidence
                ),

            overallEvidence:
                previousState.overallEvidence,

            confidence:
                cloneObject(
                    previousState.confidence
                )
        },


        current: {

            mastery,

            status,

            evidence:
                cloneEvidence(evidence),

            overallEvidence,

            confidence,

            evidenceSufficiency,

            attemptStats,

            signals:
                [...weakness.signals],

            failureSummary:
                cloneObject(
                    failureState.failureSummary
                ),

            evidenceWrongStreaks:
                cloneObject(
                    failureState.evidenceWrongStreaks
                )
        },


        update: {

            directEvidence,

            dimension:
                directEvidence
                    ? dimension
                    : null,

            result,

            attemptStrength,

            previousValue:
                directEvidence
                    ? evidenceUpdate.previousValue
                    : null,

            newValue:
                directEvidence
                    ? evidenceUpdate.newValue
                    : null,

            delta:
                directEvidence
                    ? round(
                        evidenceUpdate.newValue -
                        evidenceUpdate.previousValue
                    )
                    : 0
        },


        weakness,

        failure,


        decision: {

            masteryChanged:
                mastery !== previousState.mastery,

            from:
                previousState.mastery,

            to:
                mastery,

            direction:
                masteryEvaluation.direction,

            supportedLevel:
                masteryEvaluation.supportedLevel,

            downgradeTriggered:
                masteryEvaluation.downgradeTriggered,

            downgradeReason:
                masteryEvaluation.downgradeReason,

            persistentFailureCount:
                masteryEvaluation.persistentFailureCount,

            statusChanged:
                status !== previousState.status
        }
    };
}


/* =========================================================
 * Evidence update
 * ========================================================= */

function updateEvidenceDimension({
    dimension,
    previousEvidence,
    attempt,
    result,
    attemptStrength,
    rules
}) {

    const evidence =
        cloneEvidence(previousEvidence);


    const previousValue =
        clamp01(evidence[dimension]);


    let newValue =
        previousValue;


    /*
     * skipped != wrong
     */
    if (result === "skipped") {

        return {
            evidence,
            previousValue,
            newValue
        };
    }


    /*
     * Wrong answer → decay only.
     */
    if (isWrongResult(result)) {

        const wrongRule =
            rules.evidenceUpdate
                .wrongAnswerRule;


        if (wrongRule.enabled === false) {

            return {
                evidence,
                previousValue,
                newValue
            };
        }


        const decay =
            calculateWrongDecay(rules);


        newValue =
            previousValue *
            (1 - decay);


        evidence[dimension] =
            round(
                clamp01(newValue)
            );


        return {
            evidence,
            previousValue:
                round(previousValue),
            newValue:
                evidence[dimension]
        };
    }


    /*
     * correct / partial
     */
    const learningRate =
        calculateLearningRate(rules);


    newValue =
        previousValue *
        (1 - learningRate) +
        attemptStrength *
        learningRate;


    evidence[dimension] =
        round(
            clamp01(newValue)
        );


    return {
        evidence,
        previousValue:
            round(previousValue),
        newValue:
            evidence[dimension]
    };
}


/* =========================================================
 * Attempt strength
 * ========================================================= */

function calculateAttemptStrength(
    attempt,
    result,
    rules
) {

    if (
        isWrongResult(result) ||
        result === "skipped"
    ) {
        return 0;
    }


    let baseWeight = 0;


    if (result === "partial") {

        /*
         * Partial is based on score/rubric.
         *
         * partialCorrect remains the maximum
         * default evidence weight for partial.
         */
        const partialWeight =
            rules.attemptWeights
                .partialCorrect;


        if (isFiniteNumber(attempt.score)) {

            baseWeight =
                clamp01(attempt.score) *
                partialWeight;

        } else {

            baseWeight =
                partialWeight;
        }

    } else if (attempt.hintUsed === true) {

        baseWeight =
            rules.attemptWeights
                .correctAfterHint;

    } else {

        baseWeight =
            rules.attemptWeights
                .independentCorrect;
    }


    const difficulty =
        resolveDifficulty(attempt);


    const difficultyWeight =
        rules.difficultyWeights[
        difficulty
        ] ?? 1;


    /*
     * Difficulty > D3 should be capable of
     * creating stronger evidence.
     *
     * Do NOT clamp difficulty multiplier before
     * learning-rate application.
     *
     * Final evidence remains bounded [0,1].
     */
    let strength =
        baseWeight *
        difficultyWeight;


    /*
     * Diagnostic evidence is weaker.
     */
    if (isDiagnosticAttempt(attempt)) {

        strength *=
            rules.diagnosticRules
                .diagnosticEvidenceWeight;
    }


    return round(
        Math.max(0, strength)
    );
}


/* =========================================================
 * Learning rate
 * ========================================================= */

function calculateLearningRate(rules) {

    const config =
        rules.evidenceUpdate;


    return clamp(
        config.defaultLearningRate,
        config.minimumLearningRate,
        config.maximumLearningRate
    );
}


/* =========================================================
 * Wrong decay
 * ========================================================= */

function calculateWrongDecay(rules) {

    const config =
        rules.evidenceUpdate
            .wrongAnswerRule;


    return clamp(
        config.defaultDecay,
        0,
        config.maximumDecay
    );
}


/* =========================================================
 * Overall evidence
 * ========================================================= */

function calculateOverallEvidence(
    evidence,
    rules
) {

    let score = 0;
    let totalWeight = 0;


    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {

        const weight =
            numericOr(
                rules.evidenceWeights[
                dimension
                ],
                0
            );


        score +=
            clamp01(
                evidence[dimension]
            ) *
            weight;


        totalWeight += weight;
    }


    if (totalWeight <= 0) {
        return 0;
    }


    return round(
        clamp01(
            score / totalWeight
        )
    );
}


/* =========================================================
 * Evidence sufficiency
 * ========================================================= */

function updateEvidenceSufficiency({
    previous,
    attempt,
    dimension,
    result
}) {

    const old =
        normalizeEvidenceSufficiency(
            previous
        );


    const contextIds =
        new Set(old.contextIds);


    const questionTypes =
        new Set(old.questionTypes);


    const observedEvidenceTypes =
        new Set(
            old.observedEvidenceTypes
        );


    let independentObservations =
        old.independentObservations;


    const direct =
        EVIDENCE_DIMENSIONS.includes(
            dimension
        );


    const usableObservation =
        direct &&
        result !== "skipped";


    const independent =
        attempt.hintUsed !== true;


    if (usableObservation) {

        observedEvidenceTypes.add(
            dimension
        );


        if (independent) {

            independentObservations++;
        }


        const contextId =
            resolveContextId(attempt);


        if (contextId) {
            contextIds.add(contextId);
        }


        const questionType =
            resolveQuestionType(attempt);


        if (questionType) {
            questionTypes.add(
                questionType
            );
        }
    }


    return {

        independentObservations,

        distinctContexts:
            contextIds.size,

        distinctQuestionTypes:
            questionTypes.size,

        observedEvidenceTypes:
            [...observedEvidenceTypes],

        contextIds:
            [...contextIds],

        questionTypes:
            [...questionTypes]
    };
}


/* =========================================================
 * Confidence
 *
 * rules.json defines confidence levels primarily by
 * evidence amount (attempt count), while also declaring:
 *
 * - evidence consistency
 * - context diversity
 * - question type diversity
 * - recency
 *
 * V1.0.1 therefore computes a score from these dimensions,
 * but level cannot exceed the amount-supported level.
 * ========================================================= */

function calculateConfidence({
    evidenceSufficiency,
    attemptStats,
    attempt,
    previousState,
    rules
}) {

    const confidenceRules =
        rules.evidenceConfidence;


    const levels =
        confidenceRules.levels;


    const totalAttempts =
        attemptStats.total;


    const amountLevel =
        resolveConfidenceLevelByAttempts(
            totalAttempts,
            levels
        );


    /* ---------------- consistency ---------------- */

    const answered =
        attemptStats.correct +
        attemptStats.wrong +
        attemptStats.partial;


    const consistency =
        answered > 0
            ? clamp01(
                (
                    attemptStats.correct +
                    attemptStats.partial * 0.5
                ) /
                answered
            )
            : 0;


    /* ---------------- amount ---------------- */

    const veryHighAttempts =
        numericOr(
            levels.very_high
                ?.minimumAttempts,
            6
        );


    const amount =
        clamp01(
            totalAttempts /
            Math.max(
                1,
                veryHighAttempts
            )
        );


    /* ---------------- context diversity ---------------- */

    const contextTarget =
        Math.max(
            1,
            confidenceRules
                .minimumDistinctContextsForMastery ??
            2
        );


    const contextDiversity =
        clamp01(
            evidenceSufficiency
                .distinctContexts /
            contextTarget
        );


    /* ---------------- question diversity ---------------- */

    const questionTypeTarget =
        Math.max(
            1,
            confidenceRules
                .minimumDistinctQuestionTypesForMastery ??
            2
        );


    const questionTypeDiversity =
        clamp01(
            evidenceSufficiency
                .distinctQuestionTypes /
            questionTypeTarget
        );


    /* ---------------- recency ---------------- */

    const recency =
        calculateRecencyFactor({
            attempt,
            previousState,
            rules
        });


    /*
     * confidenceRules lists five dimensions but
     * does not define numeric weights.
     *
     * Equal weighting is used for V1.0.1.
     * This is an implementation policy, not a new
     * mastery contract.
     */
    const score =
        round(
            (
                amount +
                consistency +
                contextDiversity +
                questionTypeDiversity +
                recency
            ) / 5
        );


    const scoreLevel =
        confidenceLevelFromScore(score);


    /*
     * Confidence cannot exceed the level supported
     * by the amount of evidence.
     */
    const level =
        lowerConfidenceLevel(
            amountLevel,
            scoreLevel
        );


    return {

        level,

        score,

        attemptCount:
            totalAttempts,

        factors: {

            evidenceAmount:
                round(amount),

            evidenceConsistency:
                round(consistency),

            contextDiversity:
                round(contextDiversity),

            questionTypeDiversity:
                round(
                    questionTypeDiversity
                ),

            recency:
                round(recency)
        }
    };
}


/* =========================================================
 * Confidence helpers
 * ========================================================= */

function resolveConfidenceLevelByAttempts(
    attempts,
    levels
) {

    const ordered = [
        "very_high",
        "high",
        "medium",
        "low"
    ];


    for (const level of ordered) {

        const minimum =
            levels[level]
                ?.minimumAttempts;


        if (
            isFiniteNumber(minimum) &&
            attempts >= minimum
        ) {
            return level;
        }
    }


    return "low";
}


function confidenceLevelFromScore(score) {

    if (score >= 0.85) {
        return "very_high";
    }

    if (score >= 0.70) {
        return "high";
    }

    if (score >= 0.45) {
        return "medium";
    }

    return "low";
}


function lowerConfidenceLevel(
    a,
    b
) {

    const rank = {
        low: 0,
        medium: 1,
        high: 2,
        very_high: 3
    };


    return rank[a] <= rank[b]
        ? a
        : b;
}


/* =========================================================
 * Recency
 * ========================================================= */

function calculateRecencyFactor({
    attempt,
    previousState,
    rules
}) {

    const config =
        rules.recencyRules;


    if (config.enabled === false) {
        return 1;
    }


    const timestamp =
        resolveAttemptTimestamp(attempt) ??
        previousState.lastAttemptAt;


    if (!timestamp) {

        /*
         * Unknown recency must not destroy confidence.
         */
        return 0.5;
    }


    const parsed =
        Date.parse(timestamp);


    if (!Number.isFinite(parsed)) {
        return 0.5;
    }


    const now =
        Date.now();


    const days =
        Math.max(
            0,
            (now - parsed) /
            86400000
        );


    const halfLife =
        Math.max(
            1,
            numericOr(
                config.halfLifeDays,
                45
            )
        );


    return clamp01(
        Math.pow(
            0.5,
            days / halfLife
        )
    );
}


/* =========================================================
 * Failure update
 * ========================================================= */

function buildFailureUpdate({
    attempt,
    result
}) {

    if (!isWrongResult(result)) {
        return null;
    }


    const diagnostic =
        isPlainObject(
            attempt.diagnostic
        )
            ? attempt.diagnostic
            : {};


    const failureType =
        diagnostic.failureType ??
        attempt.failureType ??
        null;


    const failureSignatureId =
        diagnostic.failureSignatureId ??
        attempt.failureSignatureId ??
        null;


    const sourceNodeId =
        diagnostic.sourceNodeId ??
        attempt.sourceNodeId ??
        null;


    return {

        failureType:
            FAILURE_TYPES.has(
                failureType
            )
                ? failureType
                : null,

        failureSignatureId:
            typeof failureSignatureId ===
                "string"
                ? failureSignatureId
                : null,

        sourceNodeId:
            typeof sourceNodeId ===
                "string"
                ? sourceNodeId
                : null,

        confidence:
            isFiniteNumber(
                diagnostic.confidence
            )
                ? clamp01(
                    diagnostic.confidence
                )
                : null,

        at:
            resolveAttemptTimestamp(
                attempt
            )
    };
}


/* =========================================================
 * Failure state
 *
 * We track:
 *
 * - failureSummary by canonical failure signature/type key
 * - wrong streak by evidence dimension
 *
 * persistentFailure uses the strongest available repeated
 * failure count.
 * ========================================================= */

function updateFailureState({
    previousState,
    attempt,
    result,
    dimension,
    failure
}) {

    const failureSummary =
        cloneFailureSummary(
            previousState.failureSummary
        );


    const evidenceWrongStreaks = {
        ...previousState.evidenceWrongStreaks
    };


    /* -----------------------------------------------------
     * Evidence wrong streak
     * ----------------------------------------------------- */

    if (
        EVIDENCE_DIMENSIONS.includes(
            dimension
        )
    ) {

        if (isWrongResult(result)) {

            evidenceWrongStreaks[
                dimension
            ] =
                safeInteger(
                    evidenceWrongStreaks[
                    dimension
                    ]
                ) + 1;

        } else if (
            result === "correct" ||
            result === "partial"
        ) {

            /*
             * A successful attempt breaks the wrong streak.
             */
            evidenceWrongStreaks[
                dimension
            ] = 0;
        }
    }


    /* -----------------------------------------------------
     * Failure signature count
     * ----------------------------------------------------- */

    let currentFailureKey = null;
    let currentFailureCount = 0;


    if (failure) {

        /*
         * Prefer failureSignatureId because downgrade rule
         * explicitly says repeatedWrongSameSignature.
         *
         * Fall back to failureType for older/prototype
         * attempts without a signature ID.
         */
        currentFailureKey =
            failure.failureSignatureId ??
            failure.failureType ??
            null;


        if (currentFailureKey) {

            const previous =
                failureSummary[
                currentFailureKey
                ] ?? {
                    count: 0,
                    failureType: null,
                    failureSignatureId: null,
                    sourceNodeId: null,
                    lastAt: null
                };


            currentFailureCount =
                safeInteger(
                    previous.count
                ) + 1;


            failureSummary[
                currentFailureKey
            ] = {

                count:
                    currentFailureCount,

                failureType:
                    failure.failureType ??
                    previous.failureType ??
                    null,

                failureSignatureId:
                    failure.failureSignatureId ??
                    previous.failureSignatureId ??
                    null,

                sourceNodeId:
                    failure.sourceNodeId ??
                    previous.sourceNodeId ??
                    null,

                lastAt:
                    failure.at ??
                    previous.lastAt ??
                    null
            };
        }
    }


    const sameEvidenceWrongStreak =
        EVIDENCE_DIMENSIONS.includes(
            dimension
        )
            ? safeInteger(
                evidenceWrongStreaks[
                dimension
                ]
            )
            : 0;


    return {

        failureSummary,

        evidenceWrongStreaks,

        currentFailureKey,

        currentFailureCount,

        sameEvidenceWrongStreak
    };
}


/* =========================================================
 * Weakness
 * ========================================================= */

function evaluateWeakness({
    evidence,
    failureState,
    attempt,
    result,
    rules
}) {

    const config =
        rules.weaknessRules;


    const weakEvidence = [];


    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {

        const threshold =
            config
                .weakEvidenceThreshold[
            dimension
            ];


        if (
            isFiniteNumber(threshold) &&
            evidence[dimension] <
            threshold
        ) {

            weakEvidence.push(
                dimension
            );
        }
    }


    const signals =
        new Set();


    const sameWrongThreshold =
        resolveWeaknessTriggerThreshold(
            config,
            "sameEvidenceWrongStreak",
            2
        );


    if (
        failureState
            .sameEvidenceWrongStreak >=
        sameWrongThreshold
    ) {

        signals.add(
            "mark_evidence_weak_recommended"
        );
    }


    const repeatedSignatureThreshold =
        rules.masteryDowngradeRules
            .repeatedWrongSameSignature
            ?.threshold ??
        resolveWeaknessTriggerThreshold(
            config,
            "sameFailureSignatureCount",
            2
        );


    if (
        failureState
            .currentFailureCount >=
        repeatedSignatureThreshold
    ) {

        signals.add(
            "trigger_remediation_diagnosis_recommended"
        );
    }


    if (
        resolveRetestFailed(attempt)
    ) {

        signals.add(
            "schedule_review_recommended"
        );
    }


    /*
     * Weak is triggered by weakness patterns,
     * NOT merely because untouched dimensions start at zero.
     */
    const isWeak =
        signals.size > 0;


    return {

        isWeak,

        weakEvidence,

        signals:
            [...signals],

        sameEvidenceWrongStreak:
            failureState
                .sameEvidenceWrongStreak,

        sameFailureSignatureCount:
            failureState
                .currentFailureCount
    };
}


/* =========================================================
 * Mastery evaluation
 * ========================================================= */

function evaluateMastery({
    previousMastery,
    evidence,
    overallEvidence,
    confidence,
    evidenceSufficiency,
    attemptStats,
    attempt,
    result,
    failureState,
    rules
}) {

    /*
     * Determine what level current evidence supports.
     *
     * This does NOT automatically mean downgrade.
     */
    const supportedLevel =
        findHighestSupportedMastery({
            evidence,
            overallEvidence,
            confidence,
            evidenceSufficiency,
            attemptStats,
            rules
        });


    const previousRank =
        masteryRank(previousMastery);


    const supportedRank =
        masteryRank(supportedLevel);


    /* =====================================================
     * Promotion
     * ===================================================== */

    if (supportedRank > previousRank) {

        /*
         * Promotion is sequential.
         *
         * A single update must not leap through multiple
         * mastery levels.
         *
         * This also preserves the semantic transitions in
         * masteryPromotionRules:
         *
         * M0→M1
         * M1→M2
         * M2→M3
         * M3→M4
         */
        const promoted =
            oneLevelAbove(
                previousMastery
            );


        if (
            masteryRank(promoted) <=
            supportedRank
        ) {

            return {
                mastery: promoted,
                supportedLevel,
                direction: "up",
                downgradeTriggered: false,
                downgradeReason: null,
                persistentFailureCount:
                    failureState
                        .currentFailureCount
            };
        }
    }


    /* =====================================================
     * Same level
     * ===================================================== */

    if (supportedRank === previousRank) {

        return {
            mastery: previousMastery,
            supportedLevel,
            direction: "stable",
            downgradeTriggered: false,
            downgradeReason: null,
            persistentFailureCount:
                failureState
                    .currentFailureCount
        };
    }


    /* =====================================================
     * Potential downgrade
     * ===================================================== */

    const downgrade =
        evaluateDowngrade({
            previousMastery,
            supportedLevel,
            attempt,
            result,
            failureState,
            rules
        });


    if (!downgrade.allowed) {

        return {
            mastery:
                previousMastery,

            supportedLevel,

            direction:
                "stable",

            downgradeTriggered:
                false,

            downgradeReason:
                downgrade.reason,

            persistentFailureCount:
                downgrade.persistentFailureCount
        };
    }


    const downgraded =
        downgradeOneLevel({
            previousMastery,
            rules
        });


    return {

        mastery:
            downgraded,

        supportedLevel,

        direction:
            "down",

        downgradeTriggered:
            downgraded !==
            previousMastery,

        downgradeReason:
            downgrade.reason,

        persistentFailureCount:
            downgrade.persistentFailureCount
    };
}


/* =========================================================
 * Highest currently supported mastery
 * ========================================================= */

function findHighestSupportedMastery({
    evidence,
    overallEvidence,
    confidence,
    evidenceSufficiency,
    attemptStats,
    rules
}) {

    /*
     * Evaluate highest → lowest.
     */
    if (
        qualifiesForM4({
            evidence,
            overallEvidence,
            confidence,
            evidenceSufficiency,
            attemptStats,
            rules
        })
    ) {
        return "M4";
    }


    if (
        qualifiesForM3({
            evidence,
            overallEvidence,
            rules
        })
    ) {
        return "M3";
    }


    if (
        qualifiesForM2({
            evidence,
            overallEvidence,
            rules
        })
    ) {
        return "M2";
    }


    if (
        qualifiesForM1({
            evidence,
            confidence,
            rules
        })
    ) {
        return "M1";
    }


    return "M0";
}


/* =========================================================
 * Promotion conditions
 *
 * Implement masteryPromotionRules directly.
 * ========================================================= */

function qualifiesForM1({
    evidence,
    confidence,
    rules
}) {

    const threshold =
        rules.levelThresholds
            .M1
            .requiredEvidence;


    return (
        meetsRequiredEvidence(
            evidence,
            threshold
        ) &&
        confidence.level !== "low"
    );
}


function qualifiesForM2({
    evidence,
    overallEvidence,
    rules
}) {

    const level =
        rules.levelThresholds.M2;


    return (
        meetsRequiredEvidence(
            evidence,
            level.requiredEvidence
        ) &&
        overallEvidence >=
        level.minOverallEvidence
    );
}


function qualifiesForM3({
    evidence,
    overallEvidence,
    rules
}) {

    const level =
        rules.levelThresholds.M3;


    return (
        meetsRequiredEvidence(
            evidence,
            level.requiredEvidence
        ) &&
        overallEvidence >=
        level.minOverallEvidence
    );
}


function qualifiesForM4({
    evidence,
    overallEvidence,
    confidence,
    evidenceSufficiency,
    attemptStats,
    rules
}) {

    const level =
        rules.levelThresholds.M4;


    const confidenceRules =
        rules.evidenceConfidence;


    return (
        meetsRequiredEvidence(
            evidence,
            level.requiredEvidence
        ) &&

        overallEvidence >=
        level.minOverallEvidence &&

        attemptStats.total >=
        confidenceRules
            .minimumAttemptsForMastery &&

        evidenceSufficiency
            .distinctContexts >=
        confidenceRules
            .minimumDistinctContextsForMastery &&

        /*
         * rules.json globally declares minimum distinct
         * question types for mastery.
         */
        evidenceSufficiency
            .distinctQuestionTypes >=
        confidenceRules
            .minimumDistinctQuestionTypesForMastery &&

        confidence.level !== "low"
    );
}


/* =========================================================
 * Required evidence helper
 * ========================================================= */

function meetsRequiredEvidence(
    evidence,
    requiredEvidence
) {

    if (!isPlainObject(requiredEvidence)) {
        return false;
    }


    for (
        const [
            dimension,
            threshold
        ]
        of Object.entries(
            requiredEvidence
        )
    ) {

        if (
            !EVIDENCE_DIMENSIONS.includes(
                dimension
            )
        ) {
            continue;
        }


        if (
            evidence[dimension] <
            threshold
        ) {
            return false;
        }
    }


    return true;
}


/* =========================================================
 * Downgrade evaluation
 *
 * Canonical rules:
 *
 * 1 wrong:
 *   update evidence only
 *
 * same signature >= 2:
 *   weak/remediation signal
 *   NO mastery reset
 *
 * persistent failure >= 3:
 *   recalculate mastery
 *
 * failed retest:
 *   keep mastery
 *   remove stable
 * ========================================================= */

function evaluateDowngrade({
    previousMastery,
    supportedLevel,
    attempt,
    result,
    failureState,
    rules
}) {

    const policy =
        rules.masteryDowngradeRules;


    /* -----------------------------------------------------
     * Nothing below M0
     * ----------------------------------------------------- */

    if (previousMastery === "M0") {

        return {
            allowed: false,
            reason: "already_M0",
            persistentFailureCount: 0
        };
    }


    /* -----------------------------------------------------
     * Retest failure explicitly keeps mastery
     * ----------------------------------------------------- */

    if (
        resolveRetestFailed(attempt)
    ) {

        return {
            allowed: false,
            reason:
                "failed_retest_keeps_mastery",
            persistentFailureCount:
                failureState
                    .currentFailureCount
        };
    }


    /* -----------------------------------------------------
     * Only wrong answers can contribute to downgrade.
     * ----------------------------------------------------- */

    if (!isWrongResult(result)) {

        return {
            allowed: false,
            reason:
                "current_attempt_not_wrong",
            persistentFailureCount:
                failureState
                    .currentFailureCount
        };
    }


    /*
     * Hint-related / diagnostic wrong attempts still update
     * evidence, but diagnostic evidence alone should not be
     * used as persistent mastery invalidation in V1.
     */
    if (isDiagnosticAttempt(attempt)) {

        return {
            allowed: false,
            reason:
                "diagnostic_failure_not_sufficient_for_downgrade",
            persistentFailureCount:
                failureState
                    .currentFailureCount
        };
    }


    /* -----------------------------------------------------
     * Current evidence must support a lower level.
     * ----------------------------------------------------- */

    if (
        masteryRank(supportedLevel) >=
        masteryRank(previousMastery)
    ) {

        return {
            allowed: false,
            reason:
                "current_mastery_still_supported",
            persistentFailureCount:
                failureState
                    .currentFailureCount
        };
    }


    /* -----------------------------------------------------
     * Persistent failure threshold
     * ----------------------------------------------------- */

    const threshold =
        safePositiveInteger(
            policy
                .persistentFailure
                ?.threshold,
            3
        );


    const persistentFailureCount =
        failureState
            .currentFailureCount;


    if (
        persistentFailureCount <
        threshold
    ) {

        /*
         * This covers:
         *
         * #1 wrong → evidence only
         * #2 same signature → weak/remediation
         *
         * Neither downgrades mastery.
         */
        return {
            allowed: false,
            reason:
                persistentFailureCount >= 2
                    ? "repeated_failure_marks_weak_only"
                    : "single_failure_updates_evidence_only",

            persistentFailureCount
        };
    }


    /* -----------------------------------------------------
     * Persistent failure established.
     * Mastery may now be recalculated conservatively.
     * ----------------------------------------------------- */

    return {
        allowed: true,
        reason:
            "persistent_failure_recalculate_mastery",
        persistentFailureCount
    };
}


/* =========================================================
 * Conservative one-level downgrade
 * ========================================================= */

function downgradeOneLevel({
    previousMastery,
    rules
}) {

    const policy =
        rules.masteryDowngradeRules
            .persistentFailure;


    const previousRank =
        masteryRank(previousMastery);


    if (previousRank <= 0) {
        return "M0";
    }


    const maximumLevels =
        safePositiveInteger(
            policy
                ?.maximumLevelsPerUpdate,
            1
        );


    /*
     * Contract currently says 1.
     * Implementation supports config but never
     * allows negative rank.
     */
    let targetRank =
        Math.max(
            0,
            previousRank -
            maximumLevels
        );


    const minimumLevel =
        MASTERY_LEVELS.includes(
            policy?.minimumPossibleLevel
        )
            ? policy.minimumPossibleLevel
            : "M1";


    const minimumRank =
        masteryRank(
            minimumLevel
        );


    targetRank =
        Math.max(
            targetRank,
            minimumRank
        );


    /*
     * M0 cannot be reached through persistentFailure
     * while minimumPossibleLevel = M1.
     */
    return (
        MASTERY_LEVELS[
        targetRank
        ] ??
        previousMastery
    );
}


/* =========================================================
 * Promotion helper
 * ========================================================= */

function oneLevelAbove(level) {

    const rank =
        masteryRank(level);


    return (
        MASTERY_LEVELS[
        Math.min(
            rank + 1,
            MASTERY_LEVELS.length - 1
        )
        ] ?? level
    );
}


/* =========================================================
 * Status
 * ========================================================= */

function evaluateStatus({
    previousStatus,
    mastery,
    weakness,
    attempt
}) {

    /*
     * Failed retest:
     *
     * remove stable status,
     * keep mastery.
     */
    if (
        resolveRetestFailed(attempt)
    ) {

        if (weakness.isWeak) {
            return "weak";
        }


        if (mastery === "M4") {
            return "mastered";
        }


        return "developing";
    }


    /*
     * Weakness takes precedence over normal developing.
     */
    if (weakness.isWeak) {
        return "weak";
    }


    /*
     * Stable is retained unless a rule explicitly removes it.
     */
    if (
        previousStatus === "stable" &&
        mastery === "M4"
    ) {
        return "stable";
    }


    if (mastery === "M4") {
        return "mastered";
    }


    if (mastery === "M0") {

        /*
         * If there are attempts, M0 is developing,
         * otherwise caller may persist not_started.
         *
         * updateMastery itself is invoked because an
         * interaction occurred, therefore developing.
         */
        return "developing";
    }


    return "developing";
}


/* =========================================================
 * Attempt statistics
 * ========================================================= */

function updateAttemptStatistics(
    previous,
    attempt,
    result
) {

    const old =
        normalizeAttemptStats(previous);


    const next = {
        ...old
    };


    next.total++;


    switch (result) {

        case "correct":
            next.correct++;
            break;

        case "partial":
            next.partial++;
            break;

        case "skipped":
            next.skipped++;
            break;

        case "incorrect":
        case "wrong":
            next.wrong++;
            break;
    }


    return next;
}


/* =========================================================
 * Rules resolution
 * ========================================================= */

function resolveRules(
    masteryRules,
    evidenceModel
) {

    const supplied =
        isPlainObject(masteryRules)
            ? masteryRules
            : {};


    return {

        evidenceWeights: {
            ...DEFAULT_RULES.evidenceWeights,
            ...(
                supplied.evidenceWeights ??
                evidenceModel?.evidenceWeights ??
                evidenceModel?.weights ??
                {}
            )
        },


        attemptWeights: {
            ...DEFAULT_RULES.attemptWeights,
            ...(
                supplied.attemptWeights ??
                {}
            )
        },


        difficultyWeights: {
            ...DEFAULT_RULES.difficultyWeights,
            ...(
                supplied.difficultyWeights ??
                {}
            )
        },


        evidenceUpdate: {

            ...DEFAULT_RULES.evidenceUpdate,

            ...(
                supplied.evidenceUpdate ??
                {}
            ),

            wrongAnswerRule: {

                ...DEFAULT_RULES
                    .evidenceUpdate
                    .wrongAnswerRule,

                ...(
                    supplied
                        .evidenceUpdate
                        ?.wrongAnswerRule ??
                    {}
                )
            }
        },


        levelThresholds:
            deepMergeObject(
                DEFAULT_RULES
                    .levelThresholds,

                supplied
                    .levelThresholds ??
                {}
            ),


        evidenceConfidence:
            deepMergeObject(
                DEFAULT_RULES
                    .evidenceConfidence,

                supplied
                    .evidenceConfidence ??
                {}
            ),


        masteryPromotionRules:
            deepMergeObject(
                DEFAULT_RULES
                    .masteryPromotionRules,

                supplied
                    .masteryPromotionRules ??
                {}
            ),


        weaknessRules:
            deepMergeObject(
                DEFAULT_RULES
                    .weaknessRules,

                supplied
                    .weaknessRules ??
                {}
            ),


        masteryDowngradeRules:
            deepMergeObject(
                DEFAULT_RULES
                    .masteryDowngradeRules,

                supplied
                    .masteryDowngradeRules ??
                {}
            ),


        diagnosticRules:
            deepMergeObject(
                DEFAULT_RULES
                    .diagnosticRules,

                supplied
                    .diagnosticRules ??
                {}
            ),


        recencyRules:
            deepMergeObject(
                DEFAULT_RULES
                    .recencyRules,

                supplied
                    .recencyRules ??
                {}
            )
    };
}


/* =========================================================
 * State normalization
 * ========================================================= */

function normalizeCurrentState(
    currentState
) {

    const state =
        isPlainObject(currentState)
            ? currentState
            : {};


    return {

        mastery:
            MASTERY_LEVELS.includes(
                state.mastery
            )
                ? state.mastery
                : "M0",


        status:
            typeof state.status === "string"
                ? state.status
                : "developing",


        evidence:
            normalizeEvidence(
                state.evidence
            ),


        overallEvidence:
            isFiniteNumber(
                state.overallEvidence
            )
                ? clamp01(
                    state.overallEvidence
                )
                : 0,


        confidence:
            normalizeConfidence(
                state.confidence
            ),


        evidenceSufficiency:
            normalizeEvidenceSufficiency(
                state.evidenceSufficiency
            ),


        attemptStats:
            normalizeAttemptStats(
                state.attemptStats ??
                state.attempts
            ),


        failureSummary:
            cloneFailureSummary(
                state.failureSummary
            ),


        evidenceWrongStreaks:
            normalizeEvidenceWrongStreaks(
                state.evidenceWrongStreaks
            ),


        signals:
            Array.isArray(
                state.signals
            )
                ? [...state.signals]
                : [],


        lastAttemptAt:
            typeof state.lastAttemptAt ===
                "string"
                ? state.lastAttemptAt
                : null
    };
}


/* =========================================================
 * Evidence normalization
 * ========================================================= */

function normalizeEvidence(value) {

    const source =
        isPlainObject(value)
            ? value
            : {};


    return {
        know:
            normalizeEvidenceValue(
                source.know
            ),

        explain:
            normalizeEvidenceValue(
                source.explain
            ),

        apply:
            normalizeEvidenceValue(
                source.apply
            ),

        transfer:
            normalizeEvidenceValue(
                source.transfer
            )
    };
}


function normalizeEvidenceValue(value) {

    return isFiniteNumber(value)
        ? round(clamp01(value))
        : 0;
}


/* =========================================================
 * Evidence sufficiency normalization
 * ========================================================= */

function normalizeEvidenceSufficiency(
    value
) {

    const source =
        isPlainObject(value)
            ? value
            : {};


    const contextIds =
        uniqueStrings(
            source.contextIds
        );


    const questionTypes =
        uniqueStrings(
            source.questionTypes
        );


    return {

        independentObservations:
            safeInteger(
                source.independentObservations
            ),

        distinctContexts:
            Math.max(
                safeInteger(
                    source.distinctContexts
                ),
                contextIds.length
            ),

        distinctQuestionTypes:
            Math.max(
                safeInteger(
                    source.distinctQuestionTypes
                ),
                questionTypes.length
            ),

        observedEvidenceTypes:
            uniqueEvidenceDimensions(
                source.observedEvidenceTypes
            ),

        contextIds,

        questionTypes
    };
}


/* =========================================================
 * Attempt statistics normalization
 * ========================================================= */

function normalizeAttemptStats(value) {

    const source =
        isPlainObject(value)
            ? value
            : {};


    return {

        total:
            safeInteger(
                source.total ??
                source.attempts
            ),

        correct:
            safeInteger(
                source.correct
            ),

        wrong:
            safeInteger(
                source.wrong
            ),

        partial:
            safeInteger(
                source.partial
            ),

        skipped:
            safeInteger(
                source.skipped
            )
    };
}


/* =========================================================
 * Confidence normalization
 * ========================================================= */

function normalizeConfidence(value) {

    if (!isPlainObject(value)) {

        return {
            level: "low",
            score: 0,
            attemptCount: 0
        };
    }


    return {

        level:
            CONFIDENCE_LEVELS.includes(
                value.level
            )
                ? value.level
                : "low",

        score:
            isFiniteNumber(value.score)
                ? clamp01(value.score)
                : 0,

        attemptCount:
            safeInteger(
                value.attemptCount
            )
    };
}


/* =========================================================
 * Evidence wrong streak normalization
 * ========================================================= */

function normalizeEvidenceWrongStreaks(
    value
) {

    const source =
        isPlainObject(value)
            ? value
            : {};


    return {

        know:
            safeInteger(source.know),

        explain:
            safeInteger(source.explain),

        apply:
            safeInteger(source.apply),

        transfer:
            safeInteger(source.transfer)
    };
}


/* =========================================================
 * Attempt interpretation
 * ========================================================= */

function resolveNodeId(attempt) {

    return (
        attempt.nodeId ??
        attempt.primaryNode ??
        attempt.evidence?.primaryNode ??
        null
    );
}


function resolveEvidenceDimension(
    attempt
) {

    return (
        attempt.evidence
            ?.primaryDimension ??
        attempt.primaryDimension ??
        (
            typeof attempt.evidence ===
                "string"
                ? attempt.evidence
                : null
        ) ??
        "none"
    );
}


function resolveDifficulty(attempt) {

    return (
        attempt.evidence
            ?.difficulty ??
        attempt.difficulty ??
        "D3"
    );
}


function resolveQuestionType(attempt) {

    const value =
        attempt.questionType ??
        attempt.context?.questionType ??
        null;


    return (
        typeof value === "string" &&
        value.trim().length > 0
    )
        ? value
        : null;
}


function resolveContextId(attempt) {

    const candidates = [
        attempt.contextId,
        attempt.context?.contextId,
        attempt.context?.lessonId,
        attempt.lessonId
    ];


    for (const value of candidates) {

        if (
            typeof value === "string" &&
            value.trim().length > 0
        ) {
            return value;
        }
    }


    return null;
}


function normalizeAttemptResult(
    attempt
) {

    const raw =
        attempt.result ??
        attempt.outcome ??
        null;


    switch (raw) {

        case "correct":
            return "correct";

        case "incorrect":
        case "wrong":
            return "incorrect";

        case "partial":
            return "partial";

        case "skipped":
            return "skipped";

        default:
            return "skipped";
    }
}


function isWrongResult(result) {

    return (
        result === "incorrect" ||
        result === "wrong"
    );
}


function isDiagnosticAttempt(
    attempt
) {

    const candidates = [
        attempt.mode,
        attempt.context?.mode,
        attempt.context?.pathStage
    ];


    for (const value of candidates) {

        if (
            value === "diagnostic" ||
            value === "DIAGNOSTIC"
        ) {
            return true;
        }


        if (
            Array.isArray(value) &&
            value.some(
                item =>
                    item === "diagnostic" ||
                    item === "DIAGNOSTIC"
            )
        ) {
            return true;
        }
    }


    return false;
}


/* =========================================================
 * Retest interpretation
 * ========================================================= */

function resolveRetestFailed(attempt) {

    if (
        attempt.retestFailed === true
    ) {
        return true;
    }


    if (
        attempt.retest?.passed === false
    ) {
        return true;
    }


    const stage =
        attempt.context?.pathStage ??
        attempt.pathStage ??
        null;


    return (
        stage === "RETEST" &&
        isWrongResult(
            normalizeAttemptResult(
                attempt
            )
        )
    );
}


/* =========================================================
 * Timestamp
 * ========================================================= */

function resolveAttemptTimestamp(
    attempt
) {

    const candidates = [
        attempt.timestamp,
        attempt.submittedAt,
        attempt.completedAt,
        attempt.createdAt
    ];


    for (const value of candidates) {

        if (
            typeof value === "string" &&
            value.trim().length > 0
        ) {
            return value;
        }
    }


    return null;
}


/* =========================================================
 * Weakness trigger threshold parser
 * ========================================================= */

function resolveWeaknessTriggerThreshold(
    weaknessRules,
    conditionName,
    fallback
) {

    const triggers =
        Array.isArray(
            weaknessRules
                .weaknessTriggers
        )
            ? weaknessRules
                .weaknessTriggers
            : [];


    const trigger =
        triggers.find(
            item =>
                typeof item?.condition ===
                "string" &&
                item.condition.startsWith(
                    conditionName
                )
        );


    if (!trigger) {
        return fallback;
    }


    const match =
        trigger.condition.match(
            />=\s*(\d+)/
        );


    if (!match) {
        return fallback;
    }


    return safePositiveInteger(
        Number(match[1]),
        fallback
    );
}


/* =========================================================
 * Failure summary
 * ========================================================= */

function cloneFailureSummary(value) {

    if (!isPlainObject(value)) {
        return {};
    }


    const output = {};


    for (
        const [key, entry]
        of Object.entries(value)
    ) {

        if (!isPlainObject(entry)) {
            continue;
        }


        output[key] = {

            count:
                safeInteger(
                    entry.count
                ),

            failureType:
                entry.failureType ??
                null,

            failureSignatureId:
                entry.failureSignatureId ??
                null,

            sourceNodeId:
                entry.sourceNodeId ??
                null,

            lastAt:
                entry.lastAt ??
                null
        };
    }


    return output;
}


/* =========================================================
 * No evidence update
 * ========================================================= */

function createNoEvidenceUpdate(
    evidence
) {

    return {
        evidence:
            cloneEvidence(evidence),
        previousValue: null,
        newValue: null
    };
}


/* =========================================================
 * Mastery rank
 * ========================================================= */

function masteryRank(level) {

    const rank =
        MASTERY_LEVELS.indexOf(
            level
        );


    return rank >= 0
        ? rank
        : 0;
}


/* =========================================================
 * Utility helpers
 * ========================================================= */

function cloneEvidence(evidence) {

    return {
        know: evidence.know,
        explain: evidence.explain,
        apply: evidence.apply,
        transfer: evidence.transfer
    };
}


function uniqueEvidenceDimensions(
    values
) {

    if (!Array.isArray(values)) {
        return [];
    }


    return [
        ...new Set(
            values.filter(
                value =>
                    EVIDENCE_DIMENSIONS.includes(
                        value
                    )
            )
        )
    ];
}


function uniqueStrings(values) {

    if (!Array.isArray(values)) {
        return [];
    }


    return [
        ...new Set(
            values.filter(
                value =>
                    typeof value === "string" &&
                    value.trim().length > 0
            )
        )
    ];
}


function deepMergeObject(
    base,
    override
) {

    if (!isPlainObject(base)) {

        return cloneObject(
            override
        );
    }


    const output =
        cloneObject(base);


    if (!isPlainObject(override)) {
        return output;
    }


    for (
        const [key, value]
        of Object.entries(override)
    ) {

        if (
            isPlainObject(value) &&
            isPlainObject(output[key])
        ) {

            output[key] =
                deepMergeObject(
                    output[key],
                    value
                );

        } else {

            output[key] =
                cloneValue(value);
        }
    }


    return output;
}


function cloneValue(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return value;
    }


    if (
        typeof value !== "object"
    ) {
        return value;
    }


    return JSON.parse(
        JSON.stringify(value)
    );
}


function cloneObject(value) {

    if (!isPlainObject(value)) {
        return {};
    }


    return JSON.parse(
        JSON.stringify(value)
    );
}


function numericOr(
    value,
    fallback
) {

    return isFiniteNumber(value)
        ? value
        : fallback;
}


function safeInteger(value) {

    return (
        Number.isInteger(value) &&
        value >= 0
    )
        ? value
        : 0;
}


function safePositiveInteger(
    value,
    fallback
) {

    return (
        Number.isInteger(value) &&
        value > 0
    )
        ? value
        : fallback;
}


function clamp(
    value,
    minimum,
    maximum
) {

    if (!isFiniteNumber(value)) {
        return minimum;
    }


    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}


function clamp01(value) {

    return clamp(
        value,
        0,
        1
    );
}


function round(
    value,
    digits = 4
) {

    const factor =
        10 ** digits;


    return (
        Math.round(
            value * factor
        ) /
        factor
    );
}


function isFiniteNumber(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}


function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}