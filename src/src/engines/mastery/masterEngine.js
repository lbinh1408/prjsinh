/**
 * =========================================================
 * MASTER ENGINE
 * =========================================================
 *
 * Phase:
 *   Phase 2A — Study MVP
 *
 * Engine Version:
 *   2.0.0
 *
 * Source of truth:
 *   mastery/rules.json — Mastery Rules V2
 *
 * =========================================================
 * RESPONSIBILITY
 * =========================================================
 *
 * Mastery Engine owns:
 *
 * Attempt
 *   ↓
 * interpret attempt
 *   ↓
 * build capability observation
 *   ↓
 * update bounded evidence history
 *   ↓
 * calculate capability evidence
 *   ↓
 * update evidence sufficiency
 *   ↓
 * calculate overall evidence
 *   ↓
 * calculate confidence
 *   ↓
 * update failure evidence
 *   ↓
 * detect weakness
 *   ↓
 * evaluate promotion / downgrade
 *   ↓
 * determine status
 *   ↓
 * emit Mastery Update
 *
 * Mastery Engine DOES NOT own:
 *
 * - next action
 * - lesson selection
 * - question selection
 * - remediation planning
 * - scheduling
 * - Student State persistence
 *
 * Student State remains a runtime projection.
 *
 * V2 IMPORTANT:
 *
 * capability !== sufficiency !== confidence
 *
 * Evidence history is Mastery runtime data.
 * It is NOT required to be persisted inside Student State.
 *
 * =========================================================
 */

const ENGINE_VERSION = "2.0.0";

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

const VALID_RESULTS = [
    "correct",
    "incorrect",
    "wrong",
    "partial",
    "skipped"
];

const VALID_FAILURE_TYPES = [
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

/**
 * =========================================================
 * DEFAULT RULES
 * =========================================================
 *
 * These are fallbacks only.
 *
 * Production source of truth remains mastery/rules.json.
 *
 * V2:
 * - no zero-seed EMA
 * - bounded observation window
 * - overall evidence is NOT a hard promotion gate
 * - diagnostic reliability does NOT reduce capability score
 */

const DEFAULT_RULES = {
    schemaVersion: "2.0.0",

    evidenceWeights: {
        know: 0.15,
        explain: 0.25,
        apply: 0.30,
        transfer: 0.30
    },

    attemptWeights: {
        independentCorrect: 1.0,
        correctAfterHint: 0.6,
        partialCorrect: 0.5,
        wrong: 0,
        skipped: 0
    },

    difficultyWeights: {
        D1: 0.70,
        D2: 0.85,
        D3: 1.00,
        D4: 1.15,
        D5: 1.25
    },

    evidenceUpdate: {
        method: "bounded_weighted_observation_mean",

        capabilityRange: {
            minimum: 0,
            maximum: 1
        },

        maxRecentObservationsPerDimension: 8
    },

    diagnostic: {
        diagnosticReliabilityWeight: 0.70,
        affectsCapabilityObservationScore: false
    },

    levelThresholds: {
        M0: {
            meaning:
                "Chưa đủ evidence đáng tin cậy để xác nhận M1."
        },

        M1: {
            requiredEvidence: {
                know: 0.60
            },

            minimumEvidenceSufficiency: {
                minimumQualifyingKnowObservations: 1,
                minimumIndependentObservations: 2
            },

            minimumConfidence: "medium"
        },

        M2: {
            requiredEvidence: {
                know: 0.60,
                explain: 0.65
            },

            minimumEvidenceSufficiency: {
                minimumQualifyingKnowObservations: 1,
                minimumQualifyingExplainObservations: 1,
                minimumIndependentObservations: 3
            },

            minimumConfidence: "medium"
        },

        M3: {
            requiredEvidence: {
                explain: 0.60,
                apply: 0.70
            },

            minimumEvidenceSufficiency: {
                minimumQualifyingApplyObservations: 2,
                minimumIndependentObservations: 4,
                minimumDistinctContexts: 2
            },

            minimumConfidence: "high"
        },

        M4: {
            requiredEvidence: {
                apply: 0.70,
                transfer: 0.70
            },

            minimumEvidenceSufficiency: {
                minimumQualifyingTransferObservations: 2,
                minimumIndependentObservations: 6,
                minimumDistinctContexts: 2,
                minimumDistinctQuestionTypes: 2
            },

            minimumConfidence: "high"
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

    weakness: {
        thresholds: {
            know: 0.50,
            explain: 0.50,
            apply: 0.55,
            transfer: 0.55
        },

        sameEvidenceWrongStreak: 2,
        sameFailureSignatureCount: 2
    },

    downgrade: {
        persistentFailureThreshold: 3,
        minimumPossibleLevel: "M1",
        maximumLevelsPerUpdate: 1
    },

    promotion: {
        sequentialPromotion: true,
        maximumLevelsPerUpdate: 1
    }
};

/**
 * =========================================================
 * GENERIC HELPERS
 * =========================================================
 */

function deepClone(value) {
    if (value === undefined) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function clamp(value, minimum = 0, maximum = 1) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return minimum;
    }

    return Math.min(
        maximum,
        Math.max(minimum, numeric)
    );
}

function safeNumber(value, fallback = 0) {
    const numeric = Number(value);

    return Number.isFinite(numeric)
        ? numeric
        : fallback;
}

function safeInteger(value, fallback = 0) {
    const numeric = Number(value);

    if (!Number.isInteger(numeric)) {
        return fallback;
    }

    return numeric;
}

function uniqueStrings(values = []) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [
        ...new Set(
            values.filter(
                value =>
                    typeof value === "string" &&
                    value.length > 0
            )
        )
    ];
}

function normalizeResult(result) {
    if (result === "wrong") {
        return "incorrect";
    }

    if (VALID_RESULTS.includes(result)) {
        return result;
    }

    return null;
}

function masteryRank(level) {
    const index = MASTERY_LEVELS.indexOf(level);

    return index >= 0
        ? index
        : 0;
}

function confidenceRank(level) {
    const index = CONFIDENCE_LEVELS.indexOf(level);

    return index >= 0
        ? index
        : 0;
}

function isConfidenceAtLeast(
    actual,
    required
) {
    return (
        confidenceRank(actual) >=
        confidenceRank(required)
    );
}

function nextMasteryLevel(level) {
    const index = masteryRank(level);

    return (
        MASTERY_LEVELS[
        Math.min(
            index + 1,
            MASTERY_LEVELS.length - 1
        )
        ]
    );
}

function previousMasteryLevel(level) {
    const index = masteryRank(level);

    return (
        MASTERY_LEVELS[
        Math.max(index - 1, 0)
        ]
    );
}

function nowIso(attempt = {}) {
    return (
        attempt.submittedAt ||
        attempt.at ||
        new Date().toISOString()
    );
}

/**
 * =========================================================
 * RULE RESOLUTION
 * =========================================================
 */

function mergeObjects(base, override) {
    if (!isObject(base)) {
        return deepClone(override);
    }

    if (!isObject(override)) {
        return deepClone(base);
    }

    const result = deepClone(base);

    for (
        const [key, value]
        of Object.entries(override)
    ) {
        if (
            isObject(value) &&
            isObject(result[key])
        ) {
            result[key] =
                mergeObjects(
                    result[key],
                    value
                );
        } else {
            result[key] =
                deepClone(value);
        }
    }

    return result;
}

function resolveRules(masteryRules = {}) {
    return mergeObjects(
        DEFAULT_RULES,
        masteryRules || {}
    );
}

function getDifficultyWeights(rules) {
    return (
        rules.difficultyWeights ||
        rules.attemptScoring?.difficultyWeights ||
        rules.attemptWeighting?.difficultyWeights ||
        DEFAULT_RULES.difficultyWeights
    );
}

function getAttemptWeights(rules) {
    return (
        rules.attemptWeights ||
        rules.attemptScoring?.attemptWeights ||
        rules.attemptWeighting?.attemptWeights ||
        DEFAULT_RULES.attemptWeights
    );
}

function getEvidenceWeights(rules) {
    return (
        rules.evidenceWeights ||
        rules.overallEvidenceCalculation?.weights ||
        DEFAULT_RULES.evidenceWeights
    );
}

function getMaxObservationWindow(rules) {
    const value =
        rules.evidenceUpdate
            ?.maxRecentObservationsPerDimension;

    if (
        Number.isInteger(value) &&
        value > 0
    ) {
        return value;
    }

    return 8;
}

function getDiagnosticReliability(rules) {
    const value =
        rules.diagnostic
            ?.diagnosticReliabilityWeight;

    return clamp(
        value ?? 0.70,
        0,
        1
    );
}

/**
 * =========================================================
 * DEFAULT STATE
 * =========================================================
 */

function createEmptyEvidence() {
    return {
        know: 0,
        explain: 0,
        apply: 0,
        transfer: 0
    };
}

function createEmptyEvidenceHistory() {
    return {
        know: [],
        explain: [],
        apply: [],
        transfer: []
    };
}

function createDefaultEvidenceSufficiency() {
    return {
        independentObservations: 0,
        distinctContexts: 0,
        distinctQuestionTypes: 0,
        observedEvidenceTypes: [],

        // Runtime-only compatibility fields.
        // These do NOT need to be committed to
        // Student State V1.2.0.
        contextIds: [],
        questionTypes: []
    };
}

function createDefaultAttemptStats() {
    return {
        total: 0,
        correct: 0,
        wrong: 0,
        partial: 0,
        skipped: 0
    };
}

function createDefaultWrongStreaks() {
    return {
        know: 0,
        explain: 0,
        apply: 0,
        transfer: 0
    };
}

function createDefaultState() {
    return {
        mastery: "M0",
        status: "developing",

        evidence: createEmptyEvidence(),

        overallEvidence: 0,

        confidence: {
            level: "low",
            score: 0,
            attemptCount: 0
        },

        evidenceSufficiency:
            createDefaultEvidenceSufficiency(),

        evidenceWrongStreaks:
            createDefaultWrongStreaks(),

        attemptStats:
            createDefaultAttemptStats(),

        weakEvidence: [],

        signals: [],

        failureSummary: {},

        lastAttemptAt: null,
        lastSuccessAt: null,
        lastFailure: null,

        retest: {
            attempted: false,
            lastRetestAt: null,
            passed: false,
            differentQuestion: false,
            differentContext: false,
            independent: false
        },

        review: {
            lastReviewedAt: null
        }
    };
}

/**
 * =========================================================
 * STATE NORMALIZATION
 * =========================================================
 */

function normalizeEvidence(evidence) {
    const source =
        isObject(evidence)
            ? evidence
            : {};

    const normalized =
        createEmptyEvidence();

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        normalized[dimension] =
            clamp(
                source[dimension] ?? 0
            );
    }

    return normalized;
}

function normalizeEvidenceHistory(history) {
    const source =
        isObject(history)
            ? history
            : {};

    const result =
        createEmptyEvidenceHistory();

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        const observations =
            Array.isArray(source[dimension])
                ? source[dimension]
                : [];

        result[dimension] =
            observations
                .filter(isObject)
                .map(observation => ({
                    dimension,
                    score:
                        clamp(
                            observation.score ?? 0
                        ),

                    reliabilityWeight:
                        clamp(
                            observation
                                .reliabilityWeight ?? 1,
                            0,
                            1
                        ),

                    independent:
                        observation.independent === true,

                    contextId:
                        typeof observation.contextId
                            === "string"
                            ? observation.contextId
                            : null,

                    questionType:
                        typeof observation.questionType
                            === "string"
                            ? observation.questionType
                            : null,

                    diagnostic:
                        observation.diagnostic === true,

                    result:
                        normalizeResult(
                            observation.result
                        ),

                    at:
                        typeof observation.at
                            === "string"
                            ? observation.at
                            : null,

                    questionId:
                        typeof observation.questionId
                            === "string"
                            ? observation.questionId
                            : null
                }));
    }

    return result;
}

function normalizeEvidenceSufficiency(
    sufficiency
) {
    const source =
        isObject(sufficiency)
            ? sufficiency
            : {};

    return {
        independentObservations:
            Math.max(
                0,
                safeInteger(
                    source
                        .independentObservations,
                    0
                )
            ),

        distinctContexts:
            Math.max(
                0,
                safeInteger(
                    source.distinctContexts,
                    0
                )
            ),

        distinctQuestionTypes:
            Math.max(
                0,
                safeInteger(
                    source
                        .distinctQuestionTypes,
                    0
                )
            ),

        observedEvidenceTypes:
            uniqueStrings(
                source
                    .observedEvidenceTypes
            ).filter(
                value =>
                    EVIDENCE_DIMENSIONS
                        .includes(value)
            ),

        contextIds:
            uniqueStrings(
                source.contextIds
            ),

        questionTypes:
            uniqueStrings(
                source.questionTypes
            )
    };
}

function normalizeAttemptStats(stats) {
    const source =
        isObject(stats)
            ? stats
            : {};

    return {
        total:
            Math.max(
                0,
                safeInteger(
                    source.total,
                    0
                )
            ),

        correct:
            Math.max(
                0,
                safeInteger(
                    source.correct,
                    0
                )
            ),

        wrong:
            Math.max(
                0,
                safeInteger(
                    source.wrong,
                    0
                )
            ),

        partial:
            Math.max(
                0,
                safeInteger(
                    source.partial,
                    0
                )
            ),

        skipped:
            Math.max(
                0,
                safeInteger(
                    source.skipped,
                    0
                )
            )
    };
}

function normalizeWrongStreaks(streaks) {
    const source =
        isObject(streaks)
            ? streaks
            : {};

    const result =
        createDefaultWrongStreaks();

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        result[dimension] =
            Math.max(
                0,
                safeInteger(
                    source[dimension],
                    0
                )
            );
    }

    return result;
}

function normalizeConfidence(confidence) {
    const source =
        isObject(confidence)
            ? confidence
            : {};

    const level =
        CONFIDENCE_LEVELS.includes(
            source.level
        )
            ? source.level
            : "low";

    return {
        level,

        score:
            clamp(
                source.score ?? 0
            ),

        attemptCount:
            Math.max(
                0,
                safeInteger(
                    source.attemptCount,
                    0
                )
            )
    };
}

function normalizeState(currentState) {
    const defaults =
        createDefaultState();

    if (!isObject(currentState)) {
        return defaults;
    }

    const state = {
        ...defaults,
        ...deepClone(currentState)
    };

    state.mastery =
        MASTERY_LEVELS.includes(
            currentState.mastery
        )
            ? currentState.mastery
            : "M0";

    state.status =
        typeof currentState.status
            === "string"
            ? currentState.status
            : "developing";

    state.evidence =
        normalizeEvidence(
            currentState.evidence
        );

    state.overallEvidence =
        clamp(
            currentState
                .overallEvidence ?? 0
        );

    state.confidence =
        normalizeConfidence(
            currentState.confidence
        );

    state.evidenceSufficiency =
        normalizeEvidenceSufficiency(
            currentState
                .evidenceSufficiency
        );

    state.evidenceWrongStreaks =
        normalizeWrongStreaks(
            currentState
                .evidenceWrongStreaks
        );

    state.attemptStats =
        normalizeAttemptStats(
            currentState
                .attemptStats
        );

    state.weakEvidence =
        uniqueStrings(
            currentState
                .weakEvidence
        ).filter(
            value =>
                EVIDENCE_DIMENSIONS
                    .includes(value)
        );

    state.signals =
        uniqueStrings(
            currentState.signals
        );

    state.failureSummary =
        isObject(
            currentState.failureSummary
        )
            ? deepClone(
                currentState.failureSummary
            )
            : {};

    return state;
}

/**
 * =========================================================
 * ATTEMPT INTERPRETATION
 * =========================================================
 */

function getPrimaryDimension(attempt) {
    const dimension =
        attempt?.primaryDimension ||
        attempt?.evidence
            ?.primaryDimension ||
        null;

    if (
        EVIDENCE_DIMENSIONS.includes(
            dimension
        )
    ) {
        return dimension;
    }

    return null;
}

function getAttemptResult(attempt) {
    return normalizeResult(
        attempt?.result
    );
}

function getAttemptDifficulty(attempt) {
    const difficulty =
        attempt?.difficulty ||
        attempt?.evidence
            ?.difficulty ||
        "D3";

    return (
        typeof difficulty === "string"
            ? difficulty
            : "D3"
    );
}

function isDiagnosticAttempt(attempt) {
    if (
        attempt?.mode === "diagnostic"
    ) {
        return true;
    }

    if (
        Array.isArray(attempt?.mode) &&
        attempt.mode.includes(
            "diagnostic"
        )
    ) {
        return true;
    }

    return (
        attempt?.context
            ?.pathStage ===
        "DIAGNOSTIC"
    );
}

function isRetestAttempt(attempt) {
    return (
        attempt?.context
            ?.pathStage ===
        "RETEST" ||
        attempt?.mode ===
        "retest"
    );
}

function isReviewAttempt(attempt) {
    return (
        attempt?.context
            ?.pathStage ===
        "REVIEW" ||
        attempt?.mode ===
        "review"
    );
}

function isHintUsed(attempt) {
    if (
        attempt?.hintUsed === true
    ) {
        return true;
    }

    return (
        attempt?.hint?.used === true
    );
}

function isRetryAttempt(attempt) {
    if (
        attempt?.retry?.isRetry === true
    ) {
        return true;
    }

    return (
        safeInteger(
            attempt?.retryNumber,
            0
        ) > 0
    );
}

function getIndependenceType(attempt) {
    const explicit =
        attempt?.evidence
            ?.independence;

    if (
        explicit ===
        "hint_assisted" ||
        explicit ===
        "retry_assisted" ||
        explicit ===
        "independent"
    ) {
        return explicit;
    }

    if (isHintUsed(attempt)) {
        return "hint_assisted";
    }

    if (isRetryAttempt(attempt)) {
        return "retry_assisted";
    }

    return "independent";
}

function getContextId(
    attempt,
    evidenceContext = {}
) {
    return (
        evidenceContext.contextId ||
        attempt?.contextId ||
        attempt?.context
            ?.contextId ||
        null
    );
}

function getQuestionType(
    attempt,
    evidenceContext = {}
) {
    /*
     * Canonical Attempt V1.0.0 does NOT
     * own questionType.
     *
     * evidenceContext is therefore the
     * preferred V2 runtime source.
     *
     * Legacy top-level attempt.questionType
     * is still read for backward-compatible
     * tests/runtime fixtures.
     */

    return (
        evidenceContext.questionType ||
        attempt?.questionType ||
        null
    );
}
/**
 * =========================================================
 * ATTEMPT SCORE / CAPABILITY OBSERVATION
 * =========================================================
 */

function getNormalizedPartialScore(attempt) {
    const candidates = [
        attempt?.score,
        attempt?.normalizedScore,
        attempt?.response?.score
    ];

    for (const value of candidates) {
        const numeric = Number(value);

        if (Number.isFinite(numeric)) {
            return clamp(numeric);
        }
    }

    return 0.5;
}

function getDifficultyWeight(
    difficulty,
    rules
) {
    const weights =
        getDifficultyWeights(rules);

    const value =
        safeNumber(
            weights?.[difficulty],
            1
        );

    return Math.max(0, value);
}

function getIndependenceWeight(
    attempt,
    rules
) {
    const weights =
        getAttemptWeights(rules);

    const independence =
        getIndependenceType(attempt);

    /*
     * V2 interpretation:
     *
     * - independent:
     *     full reliability/capability contribution.
     *
     * - hint_assisted:
     *     reduced observation score.
     *
     * - retry_assisted:
     *     reduced observation score.
     *
     * The V2 rules file still carries legacy
     * attemptWeight names, therefore this function
     * is the compatibility adapter.
     */

    if (
        independence ===
        "hint_assisted"
    ) {
        return clamp(
            weights.correctAfterHint ??
            0.6
        );
    }

    if (
        independence ===
        "retry_assisted"
    ) {
        /*
         * Until rules explicitly define a
         * retry-assisted weight, use the same
         * conservative weight as assisted work.
         *
         * This remains isolated here so the
         * mapping can later be replaced without
         * changing estimator logic.
         */
        return clamp(
            weights.retryAssisted ??
            weights.correctAfterHint ??
            0.6
        );
    }

    return clamp(
        weights.independentCorrect ??
        1
    );
}

function calculateResultScore(
    attempt,
    rules
) {
    const result =
        getAttemptResult(attempt);

    const weights =
        getAttemptWeights(rules);

    if (result === "correct") {
        return 1;
    }

    if (result === "partial") {
        const normalized =
            getNormalizedPartialScore(
                attempt
            );

        const partialWeight =
            clamp(
                weights.partialCorrect ??
                0.5
            );

        return clamp(
            normalized *
            partialWeight
        );
    }

    if (
        result === "incorrect" ||
        result === "wrong"
    ) {
        return 0;
    }

    if (result === "skipped") {
        return null;
    }

    return null;
}

function calculateCapabilityObservationScore({
    attempt,
    rules
}) {
    const resultScore =
        calculateResultScore(
            attempt,
            rules
        );

    if (resultScore === null) {
        return null;
    }

    const difficulty =
        getAttemptDifficulty(
            attempt
        );

    const difficultyWeight =
        getDifficultyWeight(
            difficulty,
            rules
        );

    const independenceWeight =
        getIndependenceWeight(
            attempt,
            rules
        );

    /*
     * V2:
     *
     * capability observation =
     *
     * resultScore
     * × difficultyWeight
     * × independenceWeight
     *
     * Diagnostic reliability is intentionally
     * NOT multiplied here.
     */

    return clamp(
        resultScore *
        difficultyWeight *
        independenceWeight
    );
}

function calculateObservationReliability({
    attempt,
    rules
}) {
    let reliability = 1;

    /*
     * Diagnostic affects reliability,
     * not demonstrated capability.
     */

    if (isDiagnosticAttempt(attempt)) {
        reliability *=
            getDiagnosticReliability(
                rules
            );
    }

    /*
     * Hint/retry assistance has already
     * affected observationScore through
     * independenceWeight.
     *
     * Do not double-penalize it here.
     */

    return clamp(
        reliability,
        0,
        1
    );
}

function buildCapabilityObservation({
    attempt,
    dimension,
    rules,
    evidenceContext
}) {
    if (
        !EVIDENCE_DIMENSIONS.includes(
            dimension
        )
    ) {
        return null;
    }

    const score =
        calculateCapabilityObservationScore({
            attempt,
            rules
        });

    /*
     * skipped / invalid result:
     * no capability observation.
     */

    if (score === null) {
        return null;
    }

    const reliabilityWeight =
        calculateObservationReliability({
            attempt,
            rules
        });

    const independence =
        getIndependenceType(
            attempt
        );

    return {
        dimension,

        score,

        reliabilityWeight,

        independent:
            independence ===
            "independent",

        contextId:
            getContextId(
                attempt,
                evidenceContext
            ),

        questionType:
            getQuestionType(
                attempt,
                evidenceContext
            ),

        diagnostic:
            isDiagnosticAttempt(
                attempt
            ),

        result:
            getAttemptResult(
                attempt
            ),

        at:
            nowIso(attempt),

        questionId:
            typeof attempt?.questionId
                === "string"
                ? attempt.questionId
                : null
    };
}

/**
 * =========================================================
 * EVIDENCE HISTORY
 * =========================================================
 */

function resolveEvidenceHistory({
    evidenceHistory,
    currentState
}) {
    /*
     * Preferred source:
     *
     * explicit runtime input.
     */

    if (isObject(evidenceHistory)) {
        return normalizeEvidenceHistory(
            evidenceHistory
        );
    }

    /*
     * Runtime handoff compatibility:
     *
     * result.current may be passed directly
     * into the next updateMastery call.
     *
     * This field is Mastery runtime projection,
     * NOT a required Student State field.
     */

    if (
        isObject(
            currentState?.evidenceHistory
        )
    ) {
        return normalizeEvidenceHistory(
            currentState
                .evidenceHistory
        );
    }

    return createEmptyEvidenceHistory();
}

function appendObservation({
    history,
    observation,
    rules
}) {
    const nextHistory =
        normalizeEvidenceHistory(
            history
        );

    if (!observation) {
        return nextHistory;
    }

    const dimension =
        observation.dimension;

    if (
        !EVIDENCE_DIMENSIONS.includes(
            dimension
        )
    ) {
        return nextHistory;
    }

    const windowSize =
        getMaxObservationWindow(
            rules
        );

    const existing =
        Array.isArray(
            nextHistory[dimension]
        )
            ? nextHistory[dimension]
            : [];

    const updated = [
        ...existing,
        deepClone(observation)
    ];

    nextHistory[dimension] =
        updated.slice(
            Math.max(
                0,
                updated.length -
                windowSize
            )
        );

    return nextHistory;
}

/**
 * =========================================================
 * CAPABILITY ESTIMATOR
 * =========================================================
 */

function calculateDimensionEvidence(
    observations
) {
    if (
        !Array.isArray(observations) ||
        observations.length === 0
    ) {
        return null;
    }

    let weightedScore = 0;
    let totalWeight = 0;

    for (
        const observation
        of observations
    ) {
        if (!isObject(observation)) {
            continue;
        }

        const score =
            clamp(
                observation.score ?? 0
            );

        const reliability =
            clamp(
                observation
                    .reliabilityWeight ?? 1,
                0,
                1
            );

        /*
         * A zero reliability observation
         * carries no estimator weight.
         */

        if (reliability <= 0) {
            continue;
        }

        weightedScore +=
            score *
            reliability;

        totalWeight +=
            reliability;
    }

    if (totalWeight <= 0) {
        return null;
    }

    return clamp(
        weightedScore /
        totalWeight
    );
}

function calculateEvidenceFromHistory({
    previousEvidence,
    evidenceHistory
}) {
    const previous =
        normalizeEvidence(
            previousEvidence
        );

    const history =
        normalizeEvidenceHistory(
            evidenceHistory
        );

    const nextEvidence = {
        ...previous
    };

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        const estimate =
            calculateDimensionEvidence(
                history[dimension]
            );

        /*
         * No observations for this dimension:
         *
         * preserve existing aggregate evidence.
         *
         * This matters when migrating a runtime
         * snapshot that has V1 aggregate evidence
         * but no V2 observation history yet.
         */

        if (estimate === null) {
            continue;
        }

        nextEvidence[dimension] =
            estimate;
    }

    return nextEvidence;
}

/**
 * =========================================================
 * QUALIFYING OBSERVATIONS
 * =========================================================
 */

function isQualifyingObservation(
    observation,
    dimension,
    rules
) {
    if (!isObject(observation)) {
        return false;
    }

    if (
        observation.dimension !==
        dimension
    ) {
        return false;
    }

    if (
        observation.independent !==
        true
    ) {
        return false;
    }

    /*
     * A qualifying observation must show
     * capability at or above the threshold
     * relevant to that evidence dimension.
     *
     * We use the lowest V2 threshold that
     * establishes meaningful evidence for
     * that dimension.
     */

    const thresholds =
        getQualifyingThresholds(
            rules
        );

    const minimum =
        thresholds[dimension];

    return (
        safeNumber(
            observation.score,
            0
        ) >= minimum
    );
}

function getQualifyingThresholds(
    rules
) {
    const levelThresholds =
        rules.levelThresholds ||
        DEFAULT_RULES.levelThresholds;

    return {
        know:
            safeNumber(
                levelThresholds
                    ?.M1
                    ?.requiredEvidence
                    ?.know,
                0.60
            ),

        explain:
            safeNumber(
                levelThresholds
                    ?.M2
                    ?.requiredEvidence
                    ?.explain,
                0.65
            ),

        apply:
            safeNumber(
                levelThresholds
                    ?.M3
                    ?.requiredEvidence
                    ?.apply,
                0.70
            ),

        transfer:
            safeNumber(
                levelThresholds
                    ?.M4
                    ?.requiredEvidence
                    ?.transfer,
                0.70
            )
    };
}

function countQualifyingObservations({
    evidenceHistory,
    dimension,
    rules
}) {
    const observations =
        evidenceHistory?.[dimension];

    if (!Array.isArray(observations)) {
        return 0;
    }

    return observations.filter(
        observation =>
            isQualifyingObservation(
                observation,
                dimension,
                rules
            )
    ).length;
}

function getQualifyingCounts({
    evidenceHistory,
    rules
}) {
    return {
        know:
            countQualifyingObservations({
                evidenceHistory,
                dimension: "know",
                rules
            }),

        explain:
            countQualifyingObservations({
                evidenceHistory,
                dimension: "explain",
                rules
            }),

        apply:
            countQualifyingObservations({
                evidenceHistory,
                dimension: "apply",
                rules
            }),

        transfer:
            countQualifyingObservations({
                evidenceHistory,
                dimension: "transfer",
                rules
            })
    };
}

/**
 * =========================================================
 * EVIDENCE SUFFICIENCY
 * =========================================================
 */

function collectHistoryObservations(
    evidenceHistory
) {
    const observations = [];

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        const list =
            evidenceHistory?.[dimension];

        if (!Array.isArray(list)) {
            continue;
        }

        observations.push(
            ...list
        );
    }

    return observations;
}

function calculateHistorySufficiency(
    evidenceHistory
) {
    const observations =
        collectHistoryObservations(
            evidenceHistory
        );

    const independentObservations =
        observations.filter(
            observation =>
                observation?.independent ===
                true
        ).length;

    const contextIds =
        uniqueStrings(
            observations.map(
                observation =>
                    observation?.contextId
            )
        );

    const questionTypes =
        uniqueStrings(
            observations.map(
                observation =>
                    observation
                        ?.questionType
            )
        );

    const observedEvidenceTypes =
        EVIDENCE_DIMENSIONS.filter(
            dimension =>
                Array.isArray(
                    evidenceHistory
                    ?.[dimension]
                ) &&
                evidenceHistory[
                    dimension
                ].length > 0
        );

    return {
        independentObservations,
        distinctContexts:
            contextIds.length,
        distinctQuestionTypes:
            questionTypes.length,
        observedEvidenceTypes,
        contextIds,
        questionTypes
    };
}

function updateEvidenceSufficiency({
    previous,
    evidenceHistory,
    observation
}) {
    const previousNormalized =
        normalizeEvidenceSufficiency(
            previous
        );

    const fromHistory =
        calculateHistorySufficiency(
            evidenceHistory
        );

    /*
     * V2 migration compatibility:
     *
     * Evidence history may be unavailable for
     * an older runtime snapshot.
     *
     * Therefore never erase aggregate
     * sufficiency already present in state.
     */

    const contextIds =
        uniqueStrings([
            ...previousNormalized
                .contextIds,

            ...fromHistory
                .contextIds,

            observation?.contextId
        ]);

    const questionTypes =
        uniqueStrings([
            ...previousNormalized
                .questionTypes,

            ...fromHistory
                .questionTypes,

            observation?.questionType
        ]);

    const observedEvidenceTypes =
        uniqueStrings([
            ...previousNormalized
                .observedEvidenceTypes,

            ...fromHistory
                .observedEvidenceTypes,

            observation?.dimension
        ]).filter(
            dimension =>
                EVIDENCE_DIMENSIONS
                    .includes(dimension)
        );

    let independentObservations =
        Math.max(
            previousNormalized
                .independentObservations,

            fromHistory
                .independentObservations
        );

    /*
     * If explicit history already contains the
     * current observation, do not increment
     * again.
     *
     * appendObservation() runs before this
     * function, therefore fromHistory normally
     * already includes it.
     */

    if (
        fromHistory
            .independentObservations === 0 &&
        observation?.independent === true
    ) {
        independentObservations =
            Math.max(
                independentObservations,
                previousNormalized
                    .independentObservations +
                1
            );
    }

    return {
        independentObservations,

        distinctContexts:
            Math.max(
                previousNormalized
                    .distinctContexts,
                contextIds.length
            ),

        distinctQuestionTypes:
            Math.max(
                previousNormalized
                    .distinctQuestionTypes,
                questionTypes.length
            ),

        observedEvidenceTypes,

        contextIds,

        questionTypes
    };
}

/**
 * =========================================================
 * OVERALL EVIDENCE
 * =========================================================
 */

function calculateOverallEvidence(
    evidence,
    rules
) {
    const normalized =
        normalizeEvidence(
            evidence
        );

    const weights =
        getEvidenceWeights(
            rules
        );

    let total = 0;

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        const weight =
            safeNumber(
                weights?.[dimension],
                0
            );

        total +=
            normalized[dimension] *
            weight;
    }

    /*
     * V2:
     *
     * overallEvidence is an analytics /
     * progress summary.
     *
     * It is NOT a promotion hard gate.
     */

    return clamp(total);
}

/**
 * =========================================================
 * ATTEMPT STATS
 * =========================================================
 */

function updateAttemptStats(
    previousStats,
    attempt
) {
    const stats =
        normalizeAttemptStats(
            previousStats
        );

    const result =
        getAttemptResult(
            attempt
        );

    stats.total += 1;

    if (result === "correct") {
        stats.correct += 1;
    } else if (
        result === "incorrect" ||
        result === "wrong"
    ) {
        stats.wrong += 1;
    } else if (
        result === "partial"
    ) {
        stats.partial += 1;
    } else if (
        result === "skipped"
    ) {
        stats.skipped += 1;
    }

    return stats;
}

/**
 * =========================================================
 * WRONG STREAKS
 * =========================================================
 */

function updateWrongStreaks({
    previous,
    attempt,
    dimension
}) {
    const streaks =
        normalizeWrongStreaks(
            previous
        );

    if (
        !EVIDENCE_DIMENSIONS.includes(
            dimension
        )
    ) {
        return streaks;
    }

    const result =
        getAttemptResult(
            attempt
        );

    if (
        result === "incorrect" ||
        result === "wrong"
    ) {
        streaks[dimension] += 1;

        return streaks;
    }

    if (
        result === "correct" ||
        result === "partial"
    ) {
        streaks[dimension] = 0;
    }

    return streaks;
}

/**
 * =========================================================
 * CONFIDENCE
 * =========================================================
 */

function calculateConsistencyScore(
    attemptStats
) {
    const stats =
        normalizeAttemptStats(
            attemptStats
        );

    const evaluated =
        stats.correct +
        stats.wrong +
        stats.partial;

    if (evaluated <= 0) {
        return 0;
    }

    const partialCredit =
        stats.partial * 0.5;

    return clamp(
        (
            stats.correct +
            partialCredit
        ) /
        evaluated
    );
}

function calculateAmountScore(
    independentObservations
) {
    /*
     * Six independent observations are enough
     * to fully saturate the amount component.
     */

    return clamp(
        safeNumber(
            independentObservations,
            0
        ) / 6
    );
}

function calculateContextDiversityScore(
    distinctContexts
) {
    /*
     * Two contexts satisfy the V2 M4
     * diversity requirement.
     */

    return clamp(
        safeNumber(
            distinctContexts,
            0
        ) / 2
    );
}

function calculateQuestionTypeDiversityScore(
    distinctQuestionTypes
) {
    /*
     * Two question types satisfy the V2 M4
     * diversity requirement.
     */

    return clamp(
        safeNumber(
            distinctQuestionTypes,
            0
        ) / 2
    );
}

function calculateConfidenceScore({
    evidenceSufficiency,
    attemptStats
}) {
    const sufficiency =
        normalizeEvidenceSufficiency(
            evidenceSufficiency
        );

    const amountScore =
        calculateAmountScore(
            sufficiency
                .independentObservations
        );

    const consistencyScore =
        calculateConsistencyScore(
            attemptStats
        );

    const contextScore =
        calculateContextDiversityScore(
            sufficiency
                .distinctContexts
        );

    const questionTypeScore =
        calculateQuestionTypeDiversityScore(
            sufficiency
                .distinctQuestionTypes
        );

    /*
     * Confidence is deliberately broader than
     * attempt count.
     *
     * V2 principle:
     *
     * confidence reflects quantity +
     * consistency + diversity.
     */

    return clamp(
        amountScore * 0.40 +
        consistencyScore * 0.30 +
        contextScore * 0.15 +
        questionTypeScore * 0.15
    );
}

function getAttemptSupportedConfidenceLevel({
    independentObservations,
    rules
}) {
    const levels =
        rules.evidenceConfidence
            ?.levels ||
        DEFAULT_RULES
            .evidenceConfidence
            .levels;

    let supported =
        "low";

    for (
        const level
        of CONFIDENCE_LEVELS
    ) {
        const minimum =
            safeInteger(
                levels
                    ?.[level]
                    ?.minimumAttempts,
                0
            );

        if (
            independentObservations >=
            minimum
        ) {
            supported = level;
        }
    }

    return supported;
}

function scoreToConfidenceLevel(score) {
    if (score >= 0.85) {
        return "very_high";
    }

    if (score >= 0.65) {
        return "high";
    }

    if (score >= 0.40) {
        return "medium";
    }

    return "low";
}

function lowerConfidenceLevel(
    levelA,
    levelB
) {
    return (
        confidenceRank(levelA) <=
            confidenceRank(levelB)
            ? levelA
            : levelB
    );
}

function calculateConfidence({
    evidenceSufficiency,
    attemptStats,
    rules
}) {
    const sufficiency =
        normalizeEvidenceSufficiency(
            evidenceSufficiency
        );

    const score =
        calculateConfidenceScore({
            evidenceSufficiency:
                sufficiency,
            attemptStats
        });

    const scoreLevel =
        scoreToConfidenceLevel(
            score
        );

    const attemptSupportedLevel =
        getAttemptSupportedConfidenceLevel({
            independentObservations:
                sufficiency
                    .independentObservations,
            rules
        });

    /*
     * Confidence cannot exceed what the
     * amount of independent evidence supports.
     */

    const level =
        lowerConfidenceLevel(
            scoreLevel,
            attemptSupportedLevel
        );

    return {
        level,
        score,
        attemptCount:
            sufficiency
                .independentObservations
    };
}
/**
 * =========================================================
 * FAILURE TRACKING
 * =========================================================
 */

function normalizeFailureType(
    failureType
) {
    return (
        VALID_FAILURE_TYPES.includes(
            failureType
        )
            ? failureType
            : null
    );
}

function getFailureType(attempt) {
    return normalizeFailureType(
        attempt?.failureType ||
        attempt?.diagnostic
            ?.failureType ||
        null
    );
}

function getFailureSignatureId(
    attempt
) {
    const value =
        attempt?.failureSignatureId ||
        attempt?.diagnostic
            ?.failureSignatureId ||
        null;

    return (
        typeof value === "string" &&
            value.length > 0
            ? value
            : null
    );
}

function getFailureSourceNodeId(
    attempt
) {
    const value =
        attempt?.sourceNodeId ||
        attempt?.diagnostic
            ?.sourceNodeId ||
        attempt?.nodeId ||
        attempt?.context
            ?.nodeId ||
        null;

    return (
        typeof value === "string"
            ? value
            : null
    );
}

function getFailureMetaSkillId(
    attempt
) {
    const value =
        attempt?.metaSkillId ||
        attempt?.diagnostic
            ?.metaSkillId ||
        null;

    return (
        typeof value === "string"
            ? value
            : null
    );
}

function buildFailureKey({
    failureType,
    failureSignatureId
}) {
    /*
     * Signature is preferred because two
     * failures of the same broad type may
     * represent different misconceptions.
     */

    if (failureSignatureId) {
        return failureSignatureId;
    }

    return failureType;
}

function updateFailureEvidence({
    previousFailureSummary,
    previousLastFailure,
    attempt
}) {
    const summary =
        isObject(
            previousFailureSummary
        )
            ? deepClone(
                previousFailureSummary
            )
            : {};

    const result =
        getAttemptResult(
            attempt
        );

    const isFailure =
        result === "incorrect" ||
        result === "wrong";

    if (!isFailure) {
        return {
            summary,
            lastFailure:
                previousLastFailure
                    ? deepClone(
                        previousLastFailure
                    )
                    : null,

            failureType: null,
            failureSignatureId: null,
            failureKey: null,
            persistentFailureCount: 0,
            recorded: false
        };
    }

    const failureType =
        getFailureType(attempt);

    const failureSignatureId =
        getFailureSignatureId(
            attempt
        );

    /*
     * Invalid / missing canonical failure type:
     * do not create a failure record.
     */

    if (!failureType) {
        return {
            summary,
            lastFailure:
                previousLastFailure
                    ? deepClone(
                        previousLastFailure
                    )
                    : null,

            failureType: null,
            failureSignatureId: null,
            failureKey: null,
            persistentFailureCount: 0,
            recorded: false
        };
    }

    const failureKey =
        buildFailureKey({
            failureType,
            failureSignatureId
        });

    const sourceNodeId =
        getFailureSourceNodeId(
            attempt
        );

    const metaSkillId =
        getFailureMetaSkillId(
            attempt
        );

    const at =
        nowIso(attempt);

    const previousRecord =
        isObject(
            summary[failureKey]
        )
            ? summary[failureKey]
            : {};

    const count =
        Math.max(
            0,
            safeInteger(
                previousRecord.count,
                0
            )
        ) + 1;

    const record = {
        count,
        failureType,
        sourceNodeId,
        lastAt: at
    };

    if (failureSignatureId) {
        record.failureSignatureId =
            failureSignatureId;
    }

    if (metaSkillId) {
        record.metaSkillId =
            metaSkillId;
    }

    summary[failureKey] =
        record;

    const lastFailure = {
        questionId:
            typeof attempt?.questionId
                === "string"
                ? attempt.questionId
                : null,

        failureType,

        sourceNodeId,

        at
    };

    if (failureSignatureId) {
        lastFailure
            .failureSignatureId =
            failureSignatureId;
    }

    if (metaSkillId) {
        lastFailure.metaSkillId =
            metaSkillId;
    }

    return {
        summary,
        lastFailure,
        failureType,
        failureSignatureId,
        failureKey,
        persistentFailureCount:
            count,
        recorded: true
    };
}

/**
 * =========================================================
 * WEAKNESS
 * =========================================================
 */

function hasEnoughObservationsForWeakness({
    evidenceHistory,
    dimension
}) {
    const observations =
        evidenceHistory?.[dimension];

    /*
     * An unobserved dimension must NOT be
     * interpreted as weak.
     *
     * Two actual observations are the minimum
     * before capability weakness can be inferred.
     */

    return (
        Array.isArray(observations) &&
        observations.length >= 2
    );
}

function getWeaknessThresholds(
    rules
) {
    return (
        rules.weakness
            ?.thresholds ||
        DEFAULT_RULES
            .weakness
            .thresholds
    );
}

function evaluateWeakEvidence({
    evidence,
    evidenceHistory,
    rules
}) {
    const thresholds =
        getWeaknessThresholds(
            rules
        );

    const weakEvidence = [];

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        if (
            !hasEnoughObservationsForWeakness({
                evidenceHistory,
                dimension
            })
        ) {
            continue;
        }

        const threshold =
            safeNumber(
                thresholds
                ?.[dimension],
                0
            );

        if (
            safeNumber(
                evidence?.[dimension],
                0
            ) < threshold
        ) {
            weakEvidence.push(
                dimension
            );
        }
    }

    return weakEvidence;
}

function evaluateWeakness({
    evidence,
    evidenceHistory,
    evidenceWrongStreaks,
    failureResult,
    previousSignals,
    rules
}) {
    const signals =
        uniqueStrings(
            previousSignals
        );

    const weakEvidence =
        evaluateWeakEvidence({
            evidence,
            evidenceHistory,
            rules
        });

    const sameEvidenceWrongThreshold =
        Math.max(
            1,
            safeInteger(
                rules.weakness
                    ?.sameEvidenceWrongStreak,
                DEFAULT_RULES
                    .weakness
                    .sameEvidenceWrongStreak
            )
        );

    const sameFailureThreshold =
        Math.max(
            1,
            safeInteger(
                rules.weakness
                    ?.sameFailureSignatureCount,
                DEFAULT_RULES
                    .weakness
                    .sameFailureSignatureCount
            )
        );

    let repeatedEvidenceFailure =
        false;

    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {
        if (
            safeInteger(
                evidenceWrongStreaks
                ?.[dimension],
                0
            ) >=
            sameEvidenceWrongThreshold
        ) {
            repeatedEvidenceFailure =
                true;

            const signal =
                `weak_${dimension}`;

            if (
                !signals.includes(
                    signal
                )
            ) {
                signals.push(signal);
            }
        }
    }

    const repeatedFailureSignature =
        safeInteger(
            failureResult
                ?.persistentFailureCount,
            0
        ) >=
        sameFailureThreshold;

    if (
        repeatedFailureSignature &&
        !signals.includes(
            "trigger_remediation_diagnosis_recommended"
        )
    ) {
        signals.push(
            "trigger_remediation_diagnosis_recommended"
        );
    }

    for (
        const dimension
        of weakEvidence
    ) {
        const signal =
            `low_${dimension}_evidence`;

        if (!signals.includes(signal)) {
            signals.push(signal);
        }
    }

    const isWeak =
        weakEvidence.length > 0 ||
        repeatedEvidenceFailure ||
        repeatedFailureSignature;

    return {
        isWeak,
        weakEvidence,
        signals,

        repeatedEvidenceFailure,
        repeatedFailureSignature
    };
}

/**
 * =========================================================
 * PROMOTION REQUIREMENT HELPERS
 * =========================================================
 */

function getLevelRule(
    level,
    rules
) {
    return (
        rules.levelThresholds
        ?.[level] ||
        DEFAULT_RULES
            .levelThresholds
        ?.[level] ||
        null
    );
}

function evidenceRequirementsSatisfied({
    evidence,
    requiredEvidence
}) {
    if (
        !isObject(
            requiredEvidence
        )
    ) {
        return true;
    }

    for (
        const [
            dimension,
            minimum
        ]
        of Object.entries(
            requiredEvidence
        )
    ) {
        if (
            !EVIDENCE_DIMENSIONS
                .includes(dimension)
        ) {
            continue;
        }

        if (
            safeNumber(
                evidence
                ?.[dimension],
                0
            ) <
            safeNumber(
                minimum,
                0
            )
        ) {
            return false;
        }
    }

    return true;
}

function getMinimumRequirement(
    requirements,
    key,
    fallback = 0
) {
    return Math.max(
        0,
        safeInteger(
            requirements?.[key],
            fallback
        )
    );
}

function sufficiencyRequirementsSatisfied({
    level,
    evidenceSufficiency,
    qualifyingCounts,
    rules
}) {
    const levelRule =
        getLevelRule(
            level,
            rules
        );

    if (!levelRule) {
        return false;
    }

    const requirements =
        levelRule
            .minimumEvidenceSufficiency ||
        {};

    const sufficiency =
        normalizeEvidenceSufficiency(
            evidenceSufficiency
        );

    const minimumIndependent =
        getMinimumRequirement(
            requirements,
            "minimumIndependentObservations"
        );

    if (
        sufficiency
            .independentObservations <
        minimumIndependent
    ) {
        return false;
    }

    const minimumContexts =
        getMinimumRequirement(
            requirements,
            "minimumDistinctContexts"
        );

    if (
        sufficiency
            .distinctContexts <
        minimumContexts
    ) {
        return false;
    }

    const minimumQuestionTypes =
        getMinimumRequirement(
            requirements,
            "minimumDistinctQuestionTypes"
        );

    if (
        sufficiency
            .distinctQuestionTypes <
        minimumQuestionTypes
    ) {
        return false;
    }

    const qualifyingRequirementMap = {
        minimumQualifyingKnowObservations:
            "know",

        minimumQualifyingExplainObservations:
            "explain",

        minimumQualifyingApplyObservations:
            "apply",

        minimumQualifyingTransferObservations:
            "transfer"
    };

    for (
        const [
            requirementKey,
            dimension
        ]
        of Object.entries(
            qualifyingRequirementMap
        )
    ) {
        const minimum =
            getMinimumRequirement(
                requirements,
                requirementKey
            );

        if (
            safeInteger(
                qualifyingCounts
                ?.[dimension],
                0
            ) < minimum
        ) {
            return false;
        }
    }

    return true;
}

function confidenceRequirementSatisfied({
    level,
    confidence,
    rules
}) {
    const levelRule =
        getLevelRule(
            level,
            rules
        );

    if (!levelRule) {
        return false;
    }

    const minimumConfidence =
        levelRule.minimumConfidence ||
        "low";

    return isConfidenceAtLeast(
        confidence?.level ||
        "low",
        minimumConfidence
    );
}

/**
 * =========================================================
 * LEVEL SUPPORT
 * =========================================================
 */

function isLevelSupported({
    level,
    evidence,
    evidenceSufficiency,
    qualifyingCounts,
    confidence,
    rules
}) {
    if (level === "M0") {
        return true;
    }

    const levelRule =
        getLevelRule(
            level,
            rules
        );

    if (!levelRule) {
        return false;
    }

    const evidenceSatisfied =
        evidenceRequirementsSatisfied({
            evidence,
            requiredEvidence:
                levelRule
                    .requiredEvidence
        });

    if (!evidenceSatisfied) {
        return false;
    }

    const sufficiencySatisfied =
        sufficiencyRequirementsSatisfied({
            level,
            evidenceSufficiency,
            qualifyingCounts,
            rules
        });

    if (!sufficiencySatisfied) {
        return false;
    }

    const confidenceSatisfied =
        confidenceRequirementSatisfied({
            level,
            confidence,
            rules
        });

    if (!confidenceSatisfied) {
        return false;
    }

    /*
     * IMPORTANT V2:
     *
     * No overallEvidence requirement here.
     *
     * This is deliberate.
     */

    return true;
}

function findHighestSupportedMastery({
    evidence,
    evidenceSufficiency,
    qualifyingCounts,
    confidence,
    rules
}) {
    for (
        let index =
            MASTERY_LEVELS.length - 1;
        index >= 1;
        index -= 1
    ) {
        const level =
            MASTERY_LEVELS[index];

        if (
            isLevelSupported({
                level,
                evidence,
                evidenceSufficiency,
                qualifyingCounts,
                confidence,
                rules
            })
        ) {
            return level;
        }
    }

    return "M0";
}

/**
 * =========================================================
 * PROMOTION
 * =========================================================
 */

function evaluatePromotion({
    previousMastery,
    evidence,
    evidenceSufficiency,
    qualifyingCounts,
    confidence,
    rules
}) {
    const previous =
        MASTERY_LEVELS.includes(
            previousMastery
        )
            ? previousMastery
            : "M0";

    if (previous === "M4") {
        return {
            mastery: "M4",
            promoted: false,
            direction: "none",
            supportedLevel:
                findHighestSupportedMastery({
                    evidence,
                    evidenceSufficiency,
                    qualifyingCounts,
                    confidence,
                    rules
                })
        };
    }

    const target =
        nextMasteryLevel(
            previous
        );

    const targetSupported =
        isLevelSupported({
            level: target,
            evidence,
            evidenceSufficiency,
            qualifyingCounts,
            confidence,
            rules
        });

    /*
     * Sequential promotion:
     *
     * one update may advance at most
     * one mastery level.
     */

    if (targetSupported) {
        return {
            mastery: target,
            promoted: true,
            direction: "up",
            supportedLevel:
                findHighestSupportedMastery({
                    evidence,
                    evidenceSufficiency,
                    qualifyingCounts,
                    confidence,
                    rules
                })
        };
    }

    return {
        mastery: previous,
        promoted: false,
        direction: "none",
        supportedLevel:
            findHighestSupportedMastery({
                evidence,
                evidenceSufficiency,
                qualifyingCounts,
                confidence,
                rules
            })
    };
}

/**
 * =========================================================
 * DOWNGRADE POLICY
 * =========================================================
 */

function getPersistentFailureThreshold(
    rules
) {
    return Math.max(
        1,
        safeInteger(
            rules.downgrade
                ?.persistentFailureThreshold,
            DEFAULT_RULES
                .downgrade
                .persistentFailureThreshold
        )
    );
}

function getMinimumDowngradeLevel(
    rules
) {
    const configured =
        rules.downgrade
            ?.minimumPossibleLevel;

    return (
        MASTERY_LEVELS.includes(
            configured
        )
            ? configured
            : "M1"
    );
}

function evaluateDowngrade({
    previousMastery,
    promotedMastery,
    supportedLevel,
    failureResult,
    attempt,
    rules
}) {
    const previous =
        MASTERY_LEVELS.includes(
            previousMastery
        )
            ? previousMastery
            : "M0";

    /*
     * Promotion wins this update.
     *
     * Do not promote and downgrade in
     * the same transaction.
     */

    if (
        masteryRank(
            promotedMastery
        ) >
        masteryRank(previous)
    ) {
        return {
            mastery:
                promotedMastery,

            downgradeTriggered:
                false,

            downgradeReason:
                null,

            direction: "up"
        };
    }

    const result =
        getAttemptResult(
            attempt
        );

    const isFailure =
        result === "incorrect" ||
        result === "wrong";

    if (!isFailure) {
        return {
            mastery: previous,
            downgradeTriggered:
                false,
            downgradeReason:
                null,
            direction: "none"
        };
    }

    /*
     * Failed RETEST:
     *
     * retain mastery.
     * Stability is handled separately.
     */

    if (isRetestAttempt(attempt)) {
        return {
            mastery: previous,

            downgradeTriggered:
                false,

            downgradeReason:
                "failed_retest_keeps_mastery",

            direction: "none"
        };
    }

    /*
     * Diagnostic failure alone cannot
     * invalidate established mastery.
     */

    if (
        isDiagnosticAttempt(
            attempt
        )
    ) {
        return {
            mastery: previous,

            downgradeTriggered:
                false,

            downgradeReason:
                "diagnostic_failure_not_sufficient_for_downgrade",

            direction: "none"
        };
    }

    const persistentCount =
        safeInteger(
            failureResult
                ?.persistentFailureCount,
            0
        );

    const threshold =
        getPersistentFailureThreshold(
            rules
        );

    /*
     * Single / repeated-but-not-persistent
     * failures update evidence and weakness
     * only.
     */

    if (
        persistentCount <
        threshold
    ) {
        return {
            mastery: previous,

            downgradeTriggered:
                false,

            downgradeReason:
                null,

            direction: "none"
        };
    }

    /*
     * Persistent failure only allows
     * downgrade when current evidence no
     * longer supports the existing level.
     */

    if (
        masteryRank(
            supportedLevel
        ) >=
        masteryRank(previous)
    ) {
        return {
            mastery: previous,

            downgradeTriggered:
                false,

            downgradeReason:
                null,

            direction: "none"
        };
    }

    const minimumLevel =
        getMinimumDowngradeLevel(
            rules
        );

    const candidate =
        previousMasteryLevel(
            previous
        );

    const boundedCandidate =
        masteryRank(candidate) <
            masteryRank(minimumLevel)
            ? minimumLevel
            : candidate;

    /*
     * If policy floor means final mastery
     * equals previous mastery, no actual
     * downgrade occurred.
     */

    if (
        boundedCandidate ===
        previous
    ) {
        return {
            mastery: previous,

            downgradeTriggered:
                false,

            downgradeReason:
                "persistent_failure_recalculate_mastery",

            direction: "none"
        };
    }

    return {
        mastery:
            boundedCandidate,

        downgradeTriggered:
            true,

        downgradeReason:
            "persistent_failure_recalculate_mastery",

        direction: "down"
    };
}

/**
 * =========================================================
 * MASTERY DECISION
 * =========================================================
 */

function evaluateMastery({
    previousMastery,
    evidence,
    evidenceSufficiency,
    qualifyingCounts,
    confidence,
    failureResult,
    attempt,
    rules
}) {
    const promotion =
        evaluatePromotion({
            previousMastery,
            evidence,
            evidenceSufficiency,
            qualifyingCounts,
            confidence,
            rules
        });

    const downgrade =
        evaluateDowngrade({
            previousMastery,

            promotedMastery:
                promotion.mastery,

            supportedLevel:
                promotion.supportedLevel,

            failureResult,
            attempt,
            rules
        });

    const finalMastery =
        downgrade.mastery;

    const masteryChanged =
        finalMastery !==
        previousMastery;

    let direction =
        downgrade.direction;

    if (
        direction === "none" &&
        promotion.promoted
    ) {
        direction = "up";
    }

    return {
        mastery:
            finalMastery,

        supportedLevel:
            promotion.supportedLevel,

        masteryChanged,

        promoted:
            promotion.promoted &&
            finalMastery ===
            promotion.mastery,

        downgradeTriggered:
            downgrade
                .downgradeTriggered,

        downgradeReason:
            downgrade
                .downgradeReason,

        direction,

        persistentFailureCount:
            safeInteger(
                failureResult
                    ?.persistentFailureCount,
                0
            )
    };
}

/**
 * =========================================================
 * RETEST STATE
 * =========================================================
 */

function normalizeRetestState(
    retest
) {
    const source =
        isObject(retest)
            ? retest
            : {};

    return {
        attempted:
            source.attempted === true,

        lastRetestAt:
            typeof source.lastRetestAt
                === "string"
                ? source.lastRetestAt
                : null,

        passed:
            source.passed === true,

        differentQuestion:
            source
                .differentQuestion === true,

        differentContext:
            source
                .differentContext === true,

        independent:
            source.independent === true
    };
}

function updateRetestState({
    previousRetest,
    attempt,
    observation
}) {
    const retest =
        normalizeRetestState(
            previousRetest
        );

    if (
        !isRetestAttempt(
            attempt
        )
    ) {
        return retest;
    }

    const result =
        getAttemptResult(
            attempt
        );

    retest.attempted = true;

    retest.lastRetestAt =
        nowIso(attempt);

    retest.passed =
        result === "correct";

    retest.independent =
        observation
            ?.independent === true;

    /*
     * These flags may be supplied by the
     * orchestration/runtime layer.
     */

    if (
        attempt
            ?.retest
            ?.differentQuestion === true ||
        attempt
            ?.differentQuestion === true
    ) {
        retest.differentQuestion =
            true;
    }

    if (
        attempt
            ?.retest
            ?.differentContext === true ||
        attempt
            ?.differentContext === true
    ) {
        retest.differentContext =
            true;
    }

    return retest;
}

/**
 * =========================================================
 * REVIEW STATE
 * =========================================================
 */

function normalizeReviewState(
    review
) {
    const source =
        isObject(review)
            ? review
            : {};

    return {
        lastReviewedAt:
            typeof source.lastReviewedAt
                === "string"
                ? source.lastReviewedAt
                : null
    };
}

function updateReviewState({
    previousReview,
    attempt
}) {
    const review =
        normalizeReviewState(
            previousReview
        );

    if (
        isReviewAttempt(
            attempt
        )
    ) {
        review.lastReviewedAt =
            nowIso(attempt);
    }

    return review;
}

/**
 * =========================================================
 * STABILITY
 * =========================================================
 */

function isSuccessfulRetest({
    attempt,
    retest
}) {
    if (
        !isRetestAttempt(
            attempt
        )
    ) {
        return false;
    }

    if (
        getAttemptResult(
            attempt
        ) !== "correct"
    ) {
        return false;
    }

    /*
     * V2 retains the existing conservative
     * stability semantics:
     *
     * successful independent retest.
     *
     * Different-question/context information
     * may be supplied by orchestration.
     */

    return (
        retest?.independent === true
    );
}

/**
 * =========================================================
 * STATUS
 * =========================================================
 */

function determineStatus({
    previousStatus,
    mastery,
    weakness,
    attempt,
    retest
}) {
    /*
     * Weakness takes precedence.
     */

    if (weakness?.isWeak) {
        return "weak";
    }

    /*
     * Failed retest removes stable status
     * without reducing mastery.
     */

    if (
        isRetestAttempt(
            attempt
        ) &&
        getAttemptResult(
            attempt
        ) !== "correct"
    ) {
        return (
            mastery === "M4"
                ? "mastered"
                : "developing"
        );
    }

    /*
     * Successful independent retest
     * establishes stability.
     */

    if (
        isSuccessfulRetest({
            attempt,
            retest
        })
    ) {
        return "stable";
    }

    /*
     * Preserve an existing stable state unless
     * a rule above explicitly invalidates it.
     */

    if (
        previousStatus === "stable"
    ) {
        return "stable";
    }

    if (mastery === "M4") {
        return "mastered";
    }

    return "developing";
}
/**
 * =========================================================
 * TIMESTAMPS
 * =========================================================
 */

function updateTimestamps({
    previousState,
    attempt
}) {
    const result =
        getAttemptResult(attempt);

    const at =
        nowIso(attempt);

    let lastAttemptAt =
        previousState
            ?.lastAttemptAt ||
        null;

    let lastSuccessAt =
        previousState
            ?.lastSuccessAt ||
        null;

    /*
     * Every processed attempt becomes
     * the latest attempt timestamp.
     */
    lastAttemptAt = at;

    if (result === "correct") {
        lastSuccessAt = at;
    }

    return {
        lastAttemptAt,
        lastSuccessAt
    };
}

/**
 * =========================================================
 * DIRECT EVIDENCE RESULT
 * =========================================================
 */

function buildDirectEvidenceResult({
    dimension,
    observation,
    previousEvidence,
    currentEvidence
}) {
    if (
        !dimension ||
        !observation
    ) {
        return {
            directEvidence: false,
            dimension: null,
            previousValue: null,
            currentValue: null,
            observationScore: null,
            reliabilityWeight: null
        };
    }

    return {
        directEvidence: true,

        dimension,

        previousValue:
            safeNumber(
                previousEvidence
                ?.[dimension],
                0
            ),

        currentValue:
            safeNumber(
                currentEvidence
                ?.[dimension],
                0
            ),

        observationScore:
            observation.score,

        reliabilityWeight:
            observation
                .reliabilityWeight
    };
}

/**
 * =========================================================
 * MASTERED EVALUATION
 * =========================================================
 */

function isMastered({
    mastery
}) {
    /*
     * V2 distinction:
     *
     * M4     → mastered capability
     * stable → successful retest / stability
     *
     * Do NOT collapse mastered and stable.
     */

    return mastery === "M4";
}

/**
 * =========================================================
 * PUBLIC UPDATE
 * =========================================================
 */

export function updateMastery({
    attempt = {},
    currentState = null,
    masteryRules = {},
    evidenceModel = {},
    evidenceHistory = null,
    evidenceContext = {}
} = {}) {
    /*
     * =====================================================
     * 1. INPUT IMMUTABILITY
     * =====================================================
     *
     * Never mutate caller-owned objects.
     */

    const safeAttempt =
        isObject(attempt)
            ? deepClone(attempt)
            : {};

    const safeCurrentState =
        isObject(currentState)
            ? deepClone(currentState)
            : null;

    const safeMasteryRules =
        isObject(masteryRules)
            ? deepClone(masteryRules)
            : {};

    const safeEvidenceHistory =
        isObject(evidenceHistory)
            ? deepClone(
                evidenceHistory
            )
            : null;

    const safeEvidenceContext =
        isObject(evidenceContext)
            ? deepClone(
                evidenceContext
            )
            : {};

    /*
     * evidenceModel remains part of the
     * public API for compatibility.
     *
     * V2 rules are currently sufficient for
     * the estimator implemented here.
     */

    const safeEvidenceModel =
        isObject(evidenceModel)
            ? deepClone(
                evidenceModel
            )
            : {};

    void safeEvidenceModel;

    /*
     * =====================================================
     * 2. RESOLVE RULES
     * =====================================================
     */

    const rules =
        resolveRules(
            safeMasteryRules
        );

    /*
     * =====================================================
     * 3. NORMALIZE CURRENT STATE
     * =====================================================
     */

    const previousState =
        normalizeState(
            safeCurrentState
        );

    const previousMastery =
        previousState.mastery;

    const previousStatus =
        previousState.status;

    const previousEvidence =
        normalizeEvidence(
            previousState.evidence
        );

    /*
     * =====================================================
     * 4. RESOLVE EVIDENCE HISTORY
     * =====================================================
     *
     * Preferred:
     *
     *   updateMastery({
     *     evidenceHistory
     *   })
     *
     * Runtime handoff:
     *
     *   updateMastery({
     *     currentState:
     *       previousResult.current
     *   })
     *
     * Neither requires evidenceHistory to
     * become part of Student State V1.2.0.
     */

    const previousHistory =
        resolveEvidenceHistory({
            evidenceHistory:
                safeEvidenceHistory,

            currentState:
                safeCurrentState
        });

    /*
     * =====================================================
     * 5. INTERPRET ATTEMPT
     * =====================================================
     */

    const nodeId =
        typeof safeAttempt.nodeId
            === "string"
            ? safeAttempt.nodeId
            : (
                typeof safeAttempt
                    ?.context
                    ?.nodeId === "string"
                    ? safeAttempt
                        .context
                        .nodeId
                    : null
            );

    const dimension =
        getPrimaryDimension(
            safeAttempt
        );

    const result =
        getAttemptResult(
            safeAttempt
        );

    /*
     * =====================================================
     * 6. BUILD CAPABILITY OBSERVATION
     * =====================================================
     *
     * skipped / primaryDimension=none /
     * missing dimension:
     *
     * → no capability observation.
     */

    const observation =
        dimension
            ? buildCapabilityObservation({
                attempt:
                    safeAttempt,

                dimension,

                rules,

                evidenceContext:
                    safeEvidenceContext
            })
            : null;

    /*
     * =====================================================
     * 7. UPDATE BOUNDED HISTORY
     * =====================================================
     */

    const currentHistory =
        appendObservation({
            history:
                previousHistory,

            observation,

            rules
        });

    /*
     * =====================================================
     * 8. CALCULATE CAPABILITY EVIDENCE
     * =====================================================
     *
     * V2 estimator:
     *
     * weighted mean over recent bounded
     * observations.
     *
     * First observation seeds capability
     * directly.
     */

    const currentEvidence =
        calculateEvidenceFromHistory({
            previousEvidence,
            evidenceHistory:
                currentHistory
        });

    /*
     * =====================================================
     * 9. UPDATE ATTEMPT STATS
     * =====================================================
     */

    const currentAttemptStats =
        updateAttemptStats(
            previousState
                .attemptStats,

            safeAttempt
        );

    /*
     * =====================================================
     * 10. UPDATE WRONG STREAKS
     * =====================================================
     */

    const currentWrongStreaks =
        updateWrongStreaks({
            previous:
                previousState
                    .evidenceWrongStreaks,

            attempt:
                safeAttempt,

            dimension
        });

    /*
     * =====================================================
     * 11. UPDATE EVIDENCE SUFFICIENCY
     * =====================================================
     */

    const currentSufficiency =
        updateEvidenceSufficiency({
            previous:
                previousState
                    .evidenceSufficiency,

            evidenceHistory:
                currentHistory,

            observation
        });

    /*
     * =====================================================
     * 12. QUALIFYING OBSERVATIONS
     * =====================================================
     */

    const qualifyingCounts =
        getQualifyingCounts({
            evidenceHistory:
                currentHistory,

            rules
        });

    /*
     * =====================================================
     * 13. OVERALL EVIDENCE
     * =====================================================
     *
     * Analytics summary only.
     *
     * NOT a promotion hard gate.
     */

    const overallEvidence =
        calculateOverallEvidence(
            currentEvidence,
            rules
        );

    /*
     * =====================================================
     * 14. CONFIDENCE
     * =====================================================
     */

    const confidence =
        calculateConfidence({
            evidenceSufficiency:
                currentSufficiency,

            attemptStats:
                currentAttemptStats,

            rules
        });

    /*
     * =====================================================
     * 15. FAILURE EVIDENCE
     * =====================================================
     */

    const failureResult =
        updateFailureEvidence({
            previousFailureSummary:
                previousState
                    .failureSummary,

            previousLastFailure:
                previousState
                    .lastFailure,

            attempt:
                safeAttempt
        });

    /*
     * =====================================================
     * 16. WEAKNESS
     * =====================================================
     */

    const weakness =
        evaluateWeakness({
            evidence:
                currentEvidence,

            evidenceHistory:
                currentHistory,

            evidenceWrongStreaks:
                currentWrongStreaks,

            failureResult,

            previousSignals:
                previousState
                    .signals,

            rules
        });

    /*
     * =====================================================
     * 17. PROMOTION / DOWNGRADE
     * =====================================================
     */

    const masteryDecision =
        evaluateMastery({
            previousMastery,

            evidence:
                currentEvidence,

            evidenceSufficiency:
                currentSufficiency,

            qualifyingCounts,

            confidence,

            failureResult,

            attempt:
                safeAttempt,

            rules
        });

    const currentMastery =
        masteryDecision.mastery;

    /*
     * =====================================================
     * 18. RETEST
     * =====================================================
     */

    const retest =
        updateRetestState({
            previousRetest:
                previousState
                    .retest,

            attempt:
                safeAttempt,

            observation
        });

    /*
     * =====================================================
     * 19. REVIEW
     * =====================================================
     */

    const review =
        updateReviewState({
            previousReview:
                previousState
                    .review,

            attempt:
                safeAttempt
        });

    /*
     * =====================================================
     * 20. STATUS
     * =====================================================
     */

    const status =
        determineStatus({
            previousStatus,

            mastery:
                currentMastery,

            weakness,

            attempt:
                safeAttempt,

            retest
        });

    /*
     * =====================================================
     * 21. TIMESTAMPS
     * =====================================================
     */

    const timestamps =
        updateTimestamps({
            previousState,

            attempt:
                safeAttempt
        });

    /*
     * =====================================================
     * 22. DIRECT EVIDENCE RESULT
     * =====================================================
     */

    const directEvidenceResult =
        buildDirectEvidenceResult({
            dimension,
            observation,
            previousEvidence,
            currentEvidence
        });

    /*
     * =====================================================
     * 23. BUILD CURRENT STATE PROJECTION
     * =====================================================
     *
     * IMPORTANT:
     *
     * evidenceHistory below is Mastery runtime
     * handoff data.
     *
     * Student State persistence layer should
     * DROP this property when committing to
     * canonical Student State V1.2.0.
     */

    const current = {
        ...previousState,

        mastery:
            currentMastery,

        status,

        evidence:
            currentEvidence,

        overallEvidence,

        confidence,

        evidenceSufficiency:
            currentSufficiency,

        evidenceWrongStreaks:
            currentWrongStreaks,

        attemptStats:
            currentAttemptStats,

        weakEvidence:
            weakness
                .weakEvidence,

        signals:
            weakness
                .signals,

        failureSummary:
            failureResult
                .summary,

        lastFailure:
            failureResult
                .lastFailure,

        lastAttemptAt:
            timestamps
                .lastAttemptAt,

        lastSuccessAt:
            timestamps
                .lastSuccessAt,

        retest,

        review,

        /*
         * Runtime-only Mastery projection.
         */
        evidenceHistory:
            currentHistory
    };

    /*
     * =====================================================
     * 24. BUILD DECISION
     * =====================================================
     */

    const decision = {
        previousMastery,

        currentMastery,

        supportedLevel:
            masteryDecision
                .supportedLevel,

        masteryChanged:
            masteryDecision
                .masteryChanged,

        promoted:
            masteryDecision
                .promoted,

        downgradeTriggered:
            masteryDecision
                .downgradeTriggered,

        downgradeReason:
            masteryDecision
                .downgradeReason,

        direction:
            masteryDecision
                .direction,

        persistentFailureCount:
            masteryDecision
                .persistentFailureCount,

        mastered:
            isMastered({
                mastery:
                    currentMastery
            }),

        stable:
            status === "stable"
    };

    /*
     * =====================================================
     * 25. BUILD UPDATE METADATA
     * =====================================================
     */

    const update = {
        directEvidence:
            directEvidenceResult
                .directEvidence,

        dimension:
            directEvidenceResult
                .dimension,

        previousValue:
            directEvidenceResult
                .previousValue,

        currentValue:
            directEvidenceResult
                .currentValue,

        observationScore:
            directEvidenceResult
                .observationScore,

        reliabilityWeight:
            directEvidenceResult
                .reliabilityWeight,

        overallEvidence,

        qualifyingObservations: {
            ...qualifyingCounts
        }
    };

    /*
     * =====================================================
     * 26. FAILURE OUTPUT
     * =====================================================
     */

    const failure = {
        recorded:
            failureResult.recorded,

        failureType:
            failureResult
                .failureType,

        failureSignatureId:
            failureResult
                .failureSignatureId,

        failureKey:
            failureResult
                .failureKey,

        persistentFailureCount:
            failureResult
                .persistentFailureCount,

        lastFailure:
            failureResult
                .lastFailure
    };

    /*
     * =====================================================
     * 27. WEAKNESS OUTPUT
     * =====================================================
     */

    const weaknessOutput = {
        isWeak:
            weakness.isWeak,

        weakEvidence: [
            ...weakness
                .weakEvidence
        ],

        signals: [
            ...weakness.signals
        ],

        repeatedEvidenceFailure:
            weakness
                .repeatedEvidenceFailure,

        repeatedFailureSignature:
            weakness
                .repeatedFailureSignature
    };

    /*
     * =====================================================
     * 28. RETURN MASTERy UPDATE
     * =====================================================
     */

    return {
        engine: {
            name:
                "MasteryEngine",

            version:
                ENGINE_VERSION
        },

        nodeId,

        previous: {
            mastery:
                previousMastery,

            status:
                previousStatus,

            evidence:
                previousEvidence,

            overallEvidence:
                previousState
                    .overallEvidence,

            confidence:
                previousState
                    .confidence
        },

        current,

        update,

        failure,

        weakness:
            weaknessOutput,

        decision,

        /*
         * Runtime handoff convenience.
         *
         * Caller may persist this in a dedicated
         * Mastery evidence store or reconstruct
         * it from Attempt/Event history.
         *
         * Do NOT blindly commit this object into
         * Student State V1.2.0.
         */
        evidenceHistory:
            currentHistory,

        metadata: {
            rulesVersion:
                rules.schemaVersion ||
                null,

            processedResult:
                result,

            primaryDimension:
                dimension,

            diagnostic:
                isDiagnosticAttempt(
                    safeAttempt
                ),

            retest:
                isRetestAttempt(
                    safeAttempt
                ),

            review:
                isReviewAttempt(
                    safeAttempt
                )
        }
    };
}

/**
 * =========================================================
 * OPTIONAL NAMED EXPORTS
 * =========================================================
 *
 * Keep the public engine surface small.
 *
 * These helpers are exported only where useful for
 * V2 tests / integration diagnostics.
 */

export {
    ENGINE_VERSION,

    EVIDENCE_DIMENSIONS,

    MASTERY_LEVELS,

    CONFIDENCE_LEVELS
};

/**
 * =========================================================
 * END MASTER ENGINE V2.0.0
 * =========================================================
 */