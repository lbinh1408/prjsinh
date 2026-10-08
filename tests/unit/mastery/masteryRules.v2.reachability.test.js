/**
 * masteryRules.v2.reachability.test.js
 *
 * Gate test for mastery/rules.json V2.
 *
 * PURPOSE
 * -------
 * Validate the RULE MODEL before MasteryEngine V2 is implemented.
 *
 * This test intentionally DOES NOT import masterEngine.js V1.x.
 * It verifies:
 *   1. V2 structural invariants.
 *   2. Every M0 -> M4 transition is reachable from the evidence dimensions
 *      exposed by the current Adaptive progression.
 *   3. The K283 happy path can progress:
 *         M0 -> M1 -> M2 -> M3 -> M4
 *      without EMA-from-zero evidence farming.
 *
 * Run:
 *   node masteryRules.v2.reachability.test.js
 *
 * Optional rules path:
 *   node masteryRules.v2.reachability.test.js ./path/to/rules.json
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULES_PATH = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../../../src/policies/mastery/rules.json");

const rules = JSON.parse(
    fs.readFileSync(RULES_PATH, "utf8")
);

const LEVELS = ["M0", "M1", "M2", "M3", "M4"];

const DIMENSIONS = [
    "know",
    "explain",
    "apply",
    "transfer"
];

const CONFIDENCE_ORDER = [
    "low",
    "medium",
    "high",
    "very_high"
];

/**
 * Mirrors the currently locked Adaptive progression.
 *
 * If Adaptive changes, this fixture must change and
 * the cross-contract reachability gate must be rerun.
 */
const ADAPTIVE_REACHABILITY = {
    M0: {
        action: "LEARN",
        evidence: ["know", "explain"],
        difficulty: ["D1", "D2"]
    },

    M1: {
        action: "LEARN",
        evidence: ["know", "explain"],
        difficulty: ["D1", "D2"]
    },

    M2: {
        action: "PRACTICE",
        evidence: ["explain", "apply"],
        difficulty: ["D2", "D3"]
    },

    M3: {
        action: "CHALLENGE",
        evidence: ["apply", "transfer"],
        difficulty: ["D3", "D4", "D5"]
    }
};

/* ============================================================
 * HELPERS
 * ============================================================
 */

function clamp(value, min = 0, max = 1) {
    return Math.min(
        max,
        Math.max(min, value)
    );
}

function confidenceAtLeast(actual, required) {
    return (
        CONFIDENCE_ORDER.indexOf(actual) >=
        CONFIDENCE_ORDER.indexOf(required)
    );
}

/**
 * Reachability test uses the minimum-attempt levels declared
 * in rules V2.
 *
 * This is NOT intended to duplicate the full future
 * MasteryEngine V2 confidence algorithm.
 */
function confidenceFromAttempts(totalAttempts) {
    const levels =
        rules.evidenceConfidence?.levels ?? {};

    let selected = "low";

    for (const level of CONFIDENCE_ORDER) {
        const minimum = Number(
            levels?.[level]?.minimumAttempts ??
            Infinity
        );

        if (totalAttempts >= minimum) {
            selected = level;
        }
    }

    return selected;
}

function createState() {
    return {
        mastery: "M0",

        evidence: {
            know: null,
            explain: null,
            apply: null,
            transfer: null
        },

        observations: {
            know: [],
            explain: [],
            apply: [],
            transfer: []
        },

        sufficiency: {
            independentObservations: 0,

            distinctContexts: new Set(),

            distinctQuestionTypes: new Set(),

            observedEvidenceTypes: new Set(),

            qualifying: {
                know: 0,
                explain: 0,
                apply: 0,
                transfer: 0
            }
        },

        confidence: "low"
    };
}

/* ============================================================
 * OBSERVATION SCORE
 * ============================================================
 */

function observationScore({
    result = "correct",
    normalizedScore = 1,
    difficulty,
    independence = "independent"
}) {
    if (result === "skipped") {
        return null;
    }

    const attemptWeights =
        rules.attemptWeights ?? {};

    const difficultyWeights =
        rules.difficultyWeights ?? {};

    let resultScore;

    if (result === "correct") {
        resultScore = 1;
    } else if (result === "partial") {
        resultScore =
            normalizedScore *
            Number(
                attemptWeights.partialCorrect ??
                0.5
            );
    } else if (result === "wrong") {
        resultScore = 0;
    } else {
        throw new Error(
            `Unsupported result: ${result}`
        );
    }

    let independenceWeight = 1;

    if (independence === "hint_assisted") {
        independenceWeight =
            Number(
                attemptWeights.correctAfterHint ??
                0.6
            );
    } else if (
        independence === "retry_assisted"
    ) {
        /**
         * Rules V2 currently do not define a separate
         * retry scalar.
         *
         * Keep this conservative and explicit rather
         * than inventing a new rule.
         */
        independenceWeight =
            Number(
                attemptWeights.correctAfterHint ??
                0.6
            );
    }

    const difficultyWeight =
        Number(
            difficultyWeights[difficulty]
        );

    assert.ok(
        Number.isFinite(difficultyWeight),
        `Missing difficulty weight for ${difficulty}`
    );

    return clamp(
        resultScore *
        difficultyWeight *
        independenceWeight
    );
}

/* ============================================================
 * RELIABILITY
 * ============================================================
 */

function reliabilityWeight(observation) {
    let weight = 1;

    /**
     * Diagnostic affects reliability,
     * NOT demonstrated capability.
     */
    if (observation.mode === "diagnostic") {
        weight *= Number(
            rules.diagnosticRules
                ?.diagnosticReliabilityWeight ??
            1
        );
    }

    /**
     * Reachability test uses fresh observations,
     * therefore recency weight = 1.
     */

    return weight;
}

/* ============================================================
 * EVIDENCE ESTIMATOR
 * ============================================================
 */

function recalculateDimension(
    state,
    dimension
) {
    const maxWindow =
        Number(
            rules.evidenceUpdate
                ?.maxRecentObservationsPerDimension ??
            8
        );

    const window =
        state.observations[dimension]
            .slice(-maxWindow);

    if (window.length === 0) {
        state.evidence[dimension] = null;
        return;
    }

    /**
     * V2 no-zero-seed rule.
     *
     * First observation initializes capability directly.
     */
    if (window.length === 1) {
        state.evidence[dimension] =
            window[0].score;

        return;
    }

    let numerator = 0;
    let denominator = 0;

    for (const observation of window) {
        const weight =
            reliabilityWeight(observation);

        numerator +=
            observation.score * weight;

        denominator += weight;
    }

    state.evidence[dimension] =
        denominator > 0
            ? clamp(
                numerator / denominator
            )
            : null;
}

/* ============================================================
 * THRESHOLD HELPERS
 * ============================================================
 */

function requiredThresholdForDimension(
    level,
    dimension
) {
    return (
        rules.levelThresholds
            ?.[level]
            ?.requiredEvidence
        ?.[dimension] ??
        null
    );
}

/* ============================================================
 * ADD OBSERVATION
 * ============================================================
 */

function addObservation(
    state,
    observation
) {
    const dimension =
        observation.dimension;

    assert.ok(
        DIMENSIONS.includes(dimension),
        `Unknown evidence dimension: ${dimension}`
    );

    const score =
        observationScore(observation);

    /**
     * skipped = no capability observation
     */
    if (score === null) {
        return;
    }

    const normalized = {
        ...observation,
        score
    };

    state.observations[dimension]
        .push(normalized);

    recalculateDimension(
        state,
        dimension
    );

    state.sufficiency
        .observedEvidenceTypes
        .add(dimension);

    if (
        observation.independence ===
        "independent"
    ) {
        state.sufficiency
            .independentObservations += 1;
    }

    if (observation.contextId) {
        state.sufficiency
            .distinctContexts
            .add(
                observation.contextId
            );
    }

    if (observation.questionType) {
        state.sufficiency
            .distinctQuestionTypes
            .add(
                observation.questionType
            );
    }

    /**
     * Each evidence dimension has a natural mastery
     * level at which it becomes a qualifying requirement.
     */
    const targetLevelByDimension = {
        know: "M1",
        explain: "M2",
        apply: "M3",
        transfer: "M4"
    };

    const qualifyingThreshold =
        requiredThresholdForDimension(
            targetLevelByDimension[
            dimension
            ],
            dimension
        );

    if (
        observation.result === "correct" &&
        observation.independence ===
        "independent" &&
        qualifyingThreshold !== null &&
        score >= qualifyingThreshold
    ) {
        state.sufficiency
            .qualifying[dimension] += 1;
    }

    const totalAttempts =
        Object.values(
            state.observations
        ).reduce(
            (sum, items) =>
                sum + items.length,
            0
        );

    state.confidence =
        confidenceFromAttempts(
            totalAttempts
        );
}

/* ============================================================
 * LEVEL EVALUATION
 * ============================================================
 */

function levelSatisfied(
    state,
    level
) {
    if (level === "M0") {
        return true;
    }

    const threshold =
        rules.levelThresholds?.[level];

    assert.ok(
        threshold,
        `Missing levelThresholds.${level}`
    );

    /* --------------------------------------------------------
     * Capability requirements
     * --------------------------------------------------------
     */

    for (
        const [dimension, minimum]
        of Object.entries(
            threshold.requiredEvidence ??
            {}
        )
    ) {
        const actual =
            state.evidence[dimension];

        if (
            actual === null ||
            actual < Number(minimum)
        ) {
            return false;
        }
    }

    /* --------------------------------------------------------
     * Evidence sufficiency requirements
     * --------------------------------------------------------
     */

    const suff =
        threshold
            .minimumEvidenceSufficiency ??
        {};

    const mappings = {
        minimumQualifyingKnowObservations:
            state.sufficiency
                .qualifying.know,

        minimumQualifyingExplainObservations:
            state.sufficiency
                .qualifying.explain,

        minimumQualifyingApplyObservations:
            state.sufficiency
                .qualifying.apply,

        minimumQualifyingTransferObservations:
            state.sufficiency
                .qualifying.transfer,

        minimumIndependentObservations:
            state.sufficiency
                .independentObservations,

        minimumDistinctContexts:
            state.sufficiency
                .distinctContexts.size,

        minimumDistinctQuestionTypes:
            state.sufficiency
                .distinctQuestionTypes.size
    };

    for (
        const [field, minimum]
        of Object.entries(suff)
    ) {
        assert.ok(
            Object.prototype
                .hasOwnProperty.call(
                    mappings,
                    field
                ),
            `Test harness does not understand ${field}`
        );

        if (
            mappings[field] <
            Number(minimum)
        ) {
            return false;
        }
    }

    /* --------------------------------------------------------
     * Confidence requirement
     * --------------------------------------------------------
     */

    if (
        threshold.minimumConfidence &&
        !confidenceAtLeast(
            state.confidence,
            threshold.minimumConfidence
        )
    ) {
        return false;
    }

    return true;
}

/* ============================================================
 * SEQUENTIAL PROMOTION
 * ============================================================
 */

function promoteAtMostOneLevel(state) {
    const currentIndex =
        LEVELS.indexOf(
            state.mastery
        );

    assert.ok(
        currentIndex >= 0,
        `Unknown mastery ${state.mastery}`
    );

    if (
        currentIndex >=
        LEVELS.length - 1
    ) {
        return state.mastery;
    }

    const nextLevel =
        LEVELS[currentIndex + 1];

    if (
        levelSatisfied(
            state,
            nextLevel
        )
    ) {
        state.mastery =
            nextLevel;
    }

    return state.mastery;
}

function processObservation(
    state,
    observation
) {
    addObservation(
        state,
        observation
    );

    promoteAtMostOneLevel(state);

    return state;
}

/* ============================================================
 * OBSERVATION FACTORY
 * ============================================================
 */

function makeObservation({
    id,
    dimension,
    difficulty,
    contextId,
    questionType = "mcq",
    mode = "practice",
    result = "correct",
    independence = "independent"
}) {
    return {
        id,
        dimension,
        difficulty,
        contextId,
        questionType,
        mode,
        result,
        independence
    };
}

/* ============================================================
 * TEST RUNNER
 * ============================================================
 */

let passed = 0;

function test(name, fn) {
    try {
        fn();

        passed += 1;

        console.log(
            `PASS ${passed}: ${name}`
        );
    } catch (error) {
        console.error(
            `FAIL: ${name}`
        );

        console.error(error);

        process.exitCode = 1;

        throw error;
    }
}

/* ============================================================
 * 1. STRUCTURAL V2 GATE
 * ============================================================
 */

test(
    "rules are Mastery Rules V2",
    () => {
        assert.equal(
            rules.schemaVersion,
            "2.0.0"
        );

        assert.equal(
            rules.rulesId,
            "biology-mastery-rules-v2"
        );
    }
);

test(
    "V2 uses bounded weighted observation mean",
    () => {
        assert.equal(
            rules.evidenceUpdate?.method,
            "bounded_weighted_observation_mean"
        );

        assert.equal(
            rules.evidenceSemantics
                ?.noZeroSeedPenalty,
            true
        );
    }
);

test(
    "overallEvidence is not a hard promotion gate",
    () => {
        assert.equal(
            rules
                .overallEvidenceCalculation
                ?.hardPromotionGate,
            false
        );

        for (
            const transition of [
                "M0_to_M1",
                "M1_to_M2",
                "M2_to_M3",
                "M3_to_M4"
            ]
        ) {
            const conditions =
                rules
                    .masteryPromotionRules
                    ?.[transition]
                    ?.conditions ??
                [];

            assert.equal(
                conditions.some(
                    condition =>
                        condition.includes(
                            "overallEvidence"
                        )
                ),
                false,
                `${transition} still depends on overallEvidence`
            );
        }
    }
);

test(
    "diagnostic reliability does not reduce capability score",
    () => {
        assert.equal(
            rules
                .diagnosticRules
                ?.affectsCapabilityObservationScore,
            false
        );

        assert.ok(
            Number(
                rules
                    .diagnosticRules
                    ?.diagnosticReliabilityWeight
            ) > 0
        );
    }
);

/* ============================================================
 * 2. CROSS-RULE REACHABILITY GATE
 * ============================================================
 */

test(
    "M0 -> M1 required dimensions are reachable from LEARN",
    () => {
        const required =
            Object.keys(
                rules
                    .levelThresholds
                    .M1
                    .requiredEvidence
            );

        for (
            const dimension of required
        ) {
            assert.ok(
                ADAPTIVE_REACHABILITY
                    .M0
                    .evidence
                    .includes(dimension),

                `M1 requires ${dimension}, but M0/LEARN cannot produce it`
            );
        }
    }
);

test(
    "M1 -> M2 required NEW dimensions are reachable from LEARN",
    () => {
        const previous =
            new Set(
                Object.keys(
                    rules
                        .levelThresholds
                        .M1
                        .requiredEvidence
                )
            );

        const next =
            Object.keys(
                rules
                    .levelThresholds
                    .M2
                    .requiredEvidence
            );

        const newlyRequired =
            next.filter(
                dimension =>
                    !previous.has(
                        dimension
                    )
            );

        for (
            const dimension
            of newlyRequired
        ) {
            assert.ok(
                ADAPTIVE_REACHABILITY
                    .M1
                    .evidence
                    .includes(dimension),

                `M2 newly requires ${dimension}, but M1/LEARN cannot produce it`
            );
        }
    }
);

test(
    "M2 -> M3 required NEW dimensions are reachable from PRACTICE",
    () => {
        const previous =
            new Set(
                Object.keys(
                    rules
                        .levelThresholds
                        .M2
                        .requiredEvidence
                )
            );

        const next =
            Object.keys(
                rules
                    .levelThresholds
                    .M3
                    .requiredEvidence
            );

        const newlyRequired =
            next.filter(
                dimension =>
                    !previous.has(
                        dimension
                    )
            );

        for (
            const dimension
            of newlyRequired
        ) {
            assert.ok(
                ADAPTIVE_REACHABILITY
                    .M2
                    .evidence
                    .includes(dimension),

                `M3 newly requires ${dimension}, but M2/PRACTICE cannot produce it`
            );
        }
    }
);

test(
    "M3 -> M4 required NEW dimensions are reachable from CHALLENGE",
    () => {
        const previous =
            new Set(
                Object.keys(
                    rules
                        .levelThresholds
                        .M3
                        .requiredEvidence
                )
            );

        const next =
            Object.keys(
                rules
                    .levelThresholds
                    .M4
                    .requiredEvidence
            );

        const newlyRequired =
            next.filter(
                dimension =>
                    !previous.has(
                        dimension
                    )
            );

        for (
            const dimension
            of newlyRequired
        ) {
            assert.ok(
                ADAPTIVE_REACHABILITY
                    .M3
                    .evidence
                    .includes(dimension),

                `M4 newly requires ${dimension}, but M3/CHALLENGE cannot produce it`
            );
        }
    }
);

/* ============================================================
 * 3. EVIDENCE SEMANTICS GATE
 * ============================================================
 */

test(
    "first correct D1 KNOW observation produces .70 capability, not .14",
    () => {
        const state =
            createState();

        processObservation(
            state,

            makeObservation({
                id: "K283-KNOW-1",
                dimension: "know",
                difficulty: "D1",
                contextId: "ctx-know-1",
                mode: "diagnostic"
            })
        );

        assert.equal(
            state.evidence.know,
            0.7
        );

        assert.notEqual(
            state.evidence.know,
            0.14
        );

        assert.equal(
            state.mastery,
            "M0"
        );
    }
);

test(
    "diagnostic reliability changes estimator weight, not first capability score",
    () => {
        const state =
            createState();

        processObservation(
            state,

            makeObservation({
                id: "K283-KNOW-DIAG",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "ctx-know-diag",
                mode: "diagnostic"
            })
        );

        assert.equal(
            state.evidence.know,
            0.7
        );

        processObservation(
            state,

            makeObservation({
                id: "K283-KNOW-LEARN",
                dimension: "know",
                difficulty: "D2",
                contextId:
                    "ctx-know-learn",
                mode: "learning"
            })
        );

        /**
         * Weighted mean:
         *
         * (.70 * .70 + .85 * 1.00)
         * -------------------------
         *        (.70 + 1.00)
         */
        const expected =
            (
                0.7 * 0.7 +
                0.85
            ) / 1.7;

        assert.ok(
            Math.abs(
                state.evidence.know -
                expected
            ) < 1e-12
        );
    }
);

/* ============================================================
 * 4. K283 HAPPY-PATH REACHABILITY
 * ============================================================
 */

test(
    "K283 happy path reaches M1 after KNOW + EXPLAIN evidence",
    () => {
        const state =
            createState();

        processObservation(
            state,

            makeObservation({
                id: "Q-A-K283-K-001",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "k283-concept",
                mode: "diagnostic"
            })
        );

        assert.equal(
            state.mastery,
            "M0"
        );

        processObservation(
            state,

            makeObservation({
                id: "Q-A-K283-E-002",
                dimension: "explain",
                difficulty: "D2",
                contextId:
                    "k283-explain",
                mode: "learning"
            })
        );

        assert.equal(
            state.evidence.know,
            0.7
        );

        assert.equal(
            state.evidence.explain,
            0.85
        );

        assert.equal(
            state.confidence,
            "medium"
        );

        assert.equal(
            state.mastery,
            "M1"
        );
    }
);

test(
    "K283 happy path reaches M2 after first APPLY observation",
    () => {
        const state =
            createState();

        const sequence = [
            makeObservation({
                id: "Q-A-K283-K-001",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "k283-concept",
                mode: "diagnostic"
            }),

            makeObservation({
                id: "Q-A-K283-E-002",
                dimension: "explain",
                difficulty: "D2",
                contextId:
                    "k283-explain",
                mode: "learning"
            }),

            makeObservation({
                id: "Q-A-K283-A-003",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-1",
                mode: "practice"
            })
        ];

        for (
            const observation
            of sequence
        ) {
            processObservation(
                state,
                observation
            );
        }

        assert.equal(
            state.mastery,
            "M2"
        );

        assert.equal(
            state.evidence.apply,
            1
        );
    }
);

test(
    "K283 happy path reaches M3 after second independent APPLY context",
    () => {
        const state =
            createState();

        const sequence = [
            makeObservation({
                id: "Q-A-K283-K-001",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "k283-concept",
                mode: "diagnostic"
            }),

            makeObservation({
                id: "Q-A-K283-E-002",
                dimension: "explain",
                difficulty: "D2",
                contextId:
                    "k283-explain",
                mode: "learning"
            }),

            makeObservation({
                id: "Q-A-K283-A-003",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-1",
                mode: "practice"
            }),

            makeObservation({
                id: "Q-A-K283-A-004",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-2",
                mode: "practice"
            })
        ];

        for (
            const observation
            of sequence
        ) {
            processObservation(
                state,
                observation
            );
        }

        assert.equal(
            state.confidence,
            "high"
        );

        assert.equal(
            state
                .sufficiency
                .qualifying
                .apply,
            2
        );

        assert.equal(
            state.mastery,
            "M3"
        );
    }
);

test(
    "one TRANSFER observation is insufficient for M4",
    () => {
        const state =
            createState();

        const sequence = [
            makeObservation({
                id: "Q-A-K283-K-001",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "k283-concept",
                mode: "diagnostic"
            }),

            makeObservation({
                id: "Q-A-K283-E-002",
                dimension: "explain",
                difficulty: "D2",
                contextId:
                    "k283-explain",
                mode: "learning"
            }),

            makeObservation({
                id: "Q-A-K283-A-003",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-1"
            }),

            makeObservation({
                id: "Q-A-K283-A-004",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-2"
            }),

            makeObservation({
                id: "Q-A-K283-T-008",
                dimension: "transfer",
                difficulty: "D4",
                contextId:
                    "k283-transfer-1",
                mode: "challenge"
            })
        ];

        for (
            const observation
            of sequence
        ) {
            processObservation(
                state,
                observation
            );
        }

        assert.equal(
            state.mastery,
            "M3"
        );

        assert.equal(
            state
                .sufficiency
                .qualifying
                .transfer,
            1
        );
    }
);

test(
    "K283 happy path reaches M4 after second independent TRANSFER context",
    () => {
        const state =
            createState();

        const sequence = [
            makeObservation({
                id: "Q-A-K283-K-001",
                dimension: "know",
                difficulty: "D1",
                contextId:
                    "k283-concept",
                mode: "diagnostic",
                questionType: "mcq"
            }),

            makeObservation({
                id: "Q-A-K283-E-002",
                dimension: "explain",
                difficulty: "D2",
                contextId:
                    "k283-explain",
                mode: "learning",
                questionType: "mcq"
            }),

            makeObservation({
                id: "Q-A-K283-A-003",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-1",
                mode: "practice",
                questionType: "mcq"
            }),

            makeObservation({
                id: "Q-A-K283-A-004",
                dimension: "apply",
                difficulty: "D3",
                contextId:
                    "k283-apply-2",
                mode: "practice",
                questionType: "mcq"
            }),

            makeObservation({
                id: "Q-A-K283-T-008",
                dimension: "transfer",
                difficulty: "D4",
                contextId:
                    "k283-transfer-1",
                mode: "challenge",
                questionType:
                    "data_analysis"
            }),

            makeObservation({
                id: "Q-A-K283-T-009",
                dimension: "transfer",
                difficulty: "D4",
                contextId:
                    "k283-transfer-2",
                mode: "challenge",
                questionType:
                    "data_analysis"
            })
        ];

        const expectedMasteryAfterEach = [
            "M0",
            "M1",
            "M2",
            "M3",
            "M3",
            "M4"
        ];

        sequence.forEach(
            (
                observation,
                index
            ) => {
                processObservation(
                    state,
                    observation
                );

                assert.equal(
                    state.mastery,

                    expectedMasteryAfterEach[
                    index
                    ],

                    `Unexpected mastery after ${observation.id}`
                );
            }
        );

        assert.equal(
            state.evidence.know,
            0.7
        );

        assert.equal(
            state.evidence.explain,
            0.85
        );

        assert.equal(
            state.evidence.apply,
            1
        );

        assert.equal(
            state.evidence.transfer,
            1
        );

        assert.equal(
            state
                .sufficiency
                .independentObservations,
            6
        );

        assert.ok(
            state
                .sufficiency
                .distinctContexts
                .size >= 2
        );

        assert.ok(
            state
                .sufficiency
                .distinctQuestionTypes
                .size >= 2
        );

        assert.equal(
            state.confidence,
            "very_high"
        );

        assert.equal(
            state.mastery,
            "M4"
        );
    }
);

/* ============================================================
 * 5. ANTI-FARM / SAFETY GATES
 * ============================================================
 */

test(
    "two APPLY observations cannot bypass KNOW/EXPLAIN into M3",
    () => {
        const state =
            createState();

        processObservation(
            state,

            makeObservation({
                id: "APPLY-1",
                dimension: "apply",
                difficulty: "D3",
                contextId: "apply-a"
            })
        );

        processObservation(
            state,

            makeObservation({
                id: "APPLY-2",
                dimension: "apply",
                difficulty: "D3",
                contextId: "apply-b"
            })
        );

        assert.equal(
            state.mastery,
            "M0"
        );
    }
);

test(
    "one TRANSFER observation cannot establish M4",
    () => {
        const state =
            createState();

        /**
         * Seed a legitimate M3 state
         * for this isolated gate.
         */
        state.mastery = "M3";

        state.evidence.apply = 1;

        state.evidence.explain = 0.85;

        state.sufficiency
            .independentObservations = 5;

        state.sufficiency
            .distinctContexts
            .add("ctx-a");

        state.sufficiency
            .distinctContexts
            .add("ctx-b");

        state.sufficiency
            .distinctQuestionTypes
            .add("mcq");

        state.sufficiency
            .distinctQuestionTypes
            .add("data_analysis");

        state.confidence = "high";

        processObservation(
            state,

            makeObservation({
                id: "TRANSFER-1",
                dimension: "transfer",
                difficulty: "D4",
                contextId:
                    "ctx-transfer",
                questionType:
                    "data_analysis",
                mode: "challenge"
            })
        );

        assert.equal(
            state.evidence.transfer,
            1
        );

        assert.equal(
            state
                .sufficiency
                .qualifying
                .transfer,
            1
        );

        assert.equal(
            state.mastery,
            "M3"
        );
    }
);

/* ============================================================
 * RESULT
 * ============================================================
 */

console.log(
    `\nALL PASS — ${passed} Mastery Rules V2 reachability tests.`
);