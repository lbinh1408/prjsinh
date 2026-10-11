/**
 * questionSelector.js
 * Version: 1.0.0
 *
 * Responsibility:
 * - Select one question from available question banks.
 * - Execute selection criteria produced by AdaptiveEngine.
 * - Enforce target-node, exclusion, type, difficulty, evidence,
 *   mode, retest, context, and independence constraints.
 * - Rank eligible questions deterministically.
 * - Report why a question was selected or why no match exists.
 *
 * Does NOT:
 * - calculate mastery
 * - decide the next adaptive action
 * - execute Adaptive fallback actions
 * - diagnose remediation
 * - generate question content
 * - score answers
 * - mutate question banks
 * - mutate history
 * - mutate student state
 * - perform persistence / file I/O
 */

const SELECTOR_NAME = "QuestionSelector";
const SELECTOR_VERSION = "1.0.0";

const RESULT_STATUSES = Object.freeze([
    "SELECTED",
    "NO_MATCH",
    "NOT_REQUIRED"
]);

const MATCH_LEVELS = Object.freeze([
    "EXACT",
    "NONE"
]);

const DIFFICULTY_ORDER = Object.freeze([
    "D1",
    "D2",
    "D3",
    "D4",
    "D5"
]);

const EVIDENCE_DIMENSIONS = Object.freeze([
    "know",
    "explain",
    "apply",
    "transfer"
]);

const QUESTION_TYPES = Object.freeze([
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
]);

const ACTIONS = Object.freeze([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);

/**
 * Question modes allowed for each Adaptive primary action.
 *
 * IMPORTANT:
 * MINI_PRACTICE / MINI_PROBE / TRANSFER / CROSS_NODE
 * are workflow/path stages, not primary actions.
 */
const ACTION_MODE_COMPATIBILITY = Object.freeze({
    LEARN: Object.freeze([
        "learning",
        "diagnostic"
    ]),

    PRACTICE: Object.freeze([
        "practice"
    ]),

    CHALLENGE: Object.freeze([
        "challenge",
        "practice"
    ]),

    REMEDIATE: Object.freeze([
        "remediation",
        "practice"
    ]),

    RETEST: Object.freeze([
        "retest"
    ]),

    REVIEW: Object.freeze([
        "review",
        "practice"
    ]),

    SKIP: Object.freeze([])
});


/**
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

/**
 * Select one question from question banks according to an
 * AdaptiveEngine next-action decision.
 *
 * @param {Object} params
 * @param {Object} params.adaptiveDecision
 * @param {Array|Object} params.questionBanks
 * @param {Array} [params.history=[]]
 * @param {Date|string|number|null} [params.now=null]
 *
 * @returns {Object}
 */
export function selectQuestion({
    adaptiveDecision,
    questionBanks,
    history = [],
    now = null
} = {}) {
    assertAdaptiveDecision(adaptiveDecision);

    const timestamp = resolveTimestamp(now);

    const action = normalizeAction(
        adaptiveDecision.action
    );

    const decisionId =
        normalizeNonEmptyString(
            adaptiveDecision.decisionId
        ) || "unknown-decision";

    const targetNodeId =
        resolveTargetNodeId(adaptiveDecision);

    const selectionId =
        createSelectionId({
            decisionId,
            targetNodeId,
            timestamp
        });

    /*
     * SKIP is semantically different from a failed selection.
     *
     * Adaptive intentionally still emits schema-compatible
     * selectionCriteria for SKIP, but no question is required.
     */
    if (action === "SKIP") {
        return {
            version: SELECTOR_VERSION,

            selectionId,
            decisionId,

            timestamp,

            action,
            targetNodeId,

            status: "NOT_REQUIRED",

            selected: null,

            match: {
                level: "NONE",

                preferredDifficulty: false,
                modeMatch: false,

                failureSignatureMatches: [],

                differentQuestionVerified: null,
                differentContextVerified: null,
                independentEvidenceVerified: null
            },

            candidates: {
                total: countAllQuestions(questionBanks),
                targetMatched: 0,
                eligible: 0
            },

            reason: {
                code: "QUESTION_NOT_REQUIRED",
                message:
                    "Adaptive action is SKIP; no question should be selected."
            },

            source: {
                selector: SELECTOR_NAME,
                version: SELECTOR_VERSION
            }
        };
    }

    const criteria =
        normalizeSelectionCriteria(
            adaptiveDecision.selectionCriteria
        );

    const constraints =
        normalizeConstraints(
            adaptiveDecision.constraints
        );

    const path =
        normalizePath(
            adaptiveDecision.path
        );

    const normalizedHistory =
        normalizeHistory(history);

    const reference =
        resolveReferenceAttempt({
            history: normalizedHistory,
            targetNodeId
        });

    const questions =
        flattenQuestionBanks(questionBanks);

    const targetCandidates =
        questions.filter(
            (candidate) =>
                questionMatchesTarget(
                    candidate.question,
                    targetNodeId,
                    adaptiveDecision.target
                )
        );

    const eligible = [];

    for (const candidate of targetCandidates) {
        const evaluation =
            evaluateCandidate({
                candidate,
                adaptiveDecision,
                action,
                criteria,
                constraints,
                path,
                reference
            });

        if (evaluation.eligible) {
            eligible.push({
                ...candidate,
                evaluation
            });
        }
    }

    if (eligible.length === 0) {
        return {
            version: SELECTOR_VERSION,

            selectionId,
            decisionId,

            timestamp,

            action,
            targetNodeId,

            status: "NO_MATCH",

            selected: null,

            match: {
                level: "NONE",

                preferredDifficulty: false,
                modeMatch: false,

                failureSignatureMatches: [],

                differentQuestionVerified:
                    resolveNoMatchVerification(
                        "question",
                        action,
                        criteria,
                        constraints,
                        reference
                    ),

                differentContextVerified:
                    resolveNoMatchVerification(
                        "context",
                        action,
                        criteria,
                        constraints,
                        reference
                    ),

                independentEvidenceVerified:
                    resolveNoMatchVerification(
                        "independent",
                        action,
                        criteria,
                        constraints,
                        reference
                    )
            },

            candidates: {
                total: questions.length,
                targetMatched: targetCandidates.length,
                eligible: 0
            },

            reason: {
                code: "NO_ELIGIBLE_QUESTION",
                message:
                    buildNoMatchMessage({
                        action,
                        targetNodeId,
                        criteria,
                        targetCount:
                            targetCandidates.length
                    })
            },

            fallback:
                projectAdaptiveFallback(
                    adaptiveDecision.fallback
                ),

            source: {
                selector: SELECTOR_NAME,
                version: SELECTOR_VERSION
            }
        };
    }

    /*
     * Deterministic ranking.
     *
     * No randomness in V1.
     */
    eligible.sort(compareCandidates);

    const winner = eligible[0];

    return {
        version: SELECTOR_VERSION,

        selectionId,
        decisionId,

        timestamp,

        action,
        targetNodeId,

        status: "SELECTED",

        selected: {
            bankId: winner.bankId,
            questionId: winner.question.id,

            /*
             * Return a clone so callers cannot accidentally mutate
             * the source question bank through this result.
             */
            question:
                clonePlainObject(
                    winner.question
                )
        },

        match: {
            level: "EXACT",

            preferredDifficulty:
                winner.evaluation
                    .preferredDifficulty,

            modeMatch:
                winner.evaluation.modeMatch,

            failureSignatureMatches:
                [
                    ...winner.evaluation
                        .failureSignatureMatches
                ],

            differentQuestionVerified:
                winner.evaluation
                    .differentQuestionVerified,

            differentContextVerified:
                winner.evaluation
                    .differentContextVerified,

            independentEvidenceVerified:
                winner.evaluation
                    .independentEvidenceVerified
        },

        candidates: {
            total: questions.length,
            targetMatched:
                targetCandidates.length,
            eligible:
                eligible.length
        },

        reason: {
            code: "QUESTION_SELECTED",
            message:
                buildSelectedMessage({
                    winner,
                    action,
                    targetNodeId
                })
        },

        source: {
            selector: SELECTOR_NAME,
            version: SELECTOR_VERSION
        }
    };
}


/**
 * =========================================================
 * CANDIDATE EVALUATION
 * =========================================================
 */

function evaluateCandidate({
    candidate,
    adaptiveDecision,
    action,
    criteria,
    constraints,
    path,
    reference
}) {
    const question = candidate.question;

    /*
     * ---------------------------------------------------------
     * HARD FILTER 1
     * Explicit exclusion from Adaptive.
     * ---------------------------------------------------------
     */

    if (
        criteria.excludeQuestionIds.includes(
            question.id
        )
    ) {
        return ineligible(
            "EXCLUDED_QUESTION"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 2
     * Question type.
     * ---------------------------------------------------------
     */

    if (
        criteria.questionTypes.length > 0 &&
        !criteria.questionTypes.includes(
            question.questionType
        )
    ) {
        return ineligible(
            "QUESTION_TYPE_MISMATCH"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 3
     * Difficulty min/max.
     *
     * preferred is ranking only.
     * ---------------------------------------------------------
     */

    if (
        !difficultyWithinRange(
            question.difficulty,
            criteria.difficulty.min,
            criteria.difficulty.max
        )
    ) {
        return ineligible(
            "DIFFICULTY_OUT_OF_RANGE"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 4
     * Evidence dimension.
     * ---------------------------------------------------------
     */

    if (
        criteria.evidenceDimensions.length > 0 &&
        !criteria.evidenceDimensions.includes(
            question.evidence
        )
    ) {
        return ineligible(
            "EVIDENCE_MISMATCH"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 5
     * Action ↔ question mode compatibility.
     * ---------------------------------------------------------
     */

    const modeMatch =
        questionMatchesActionMode({
            question,
            action,
            path
        });

    if (!modeMatch) {
        return ineligible(
            "MODE_MISMATCH"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 6
     * Different question.
     * ---------------------------------------------------------
     */

    const requireDifferentQuestion =
        criteria.requireDifferentQuestion ||
        constraints.requireDifferentQuestion ||
        action === "RETEST";

    const differentQuestionVerified =
        evaluateDifferentQuestion({
            question,
            reference,
            required:
                requireDifferentQuestion
        });

    if (
        requireDifferentQuestion &&
        differentQuestionVerified === false
    ) {
        return ineligible(
            "SAME_QUESTION_NOT_ALLOWED"
        );
    }

    /*
     * For RETEST, absence of a reference means we cannot prove
     * that the question is different.
     *
     * RETEST is intentionally strict.
     */
    if (
        action === "RETEST" &&
        requireDifferentQuestion &&
        differentQuestionVerified !== true
    ) {
        return ineligible(
            "DIFFERENT_QUESTION_UNVERIFIABLE"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 7
     * Different context.
     * ---------------------------------------------------------
     */

    const requireDifferentContext =
        criteria.requireDifferentContext ||
        constraints.requireDifferentContext ||
        action === "RETEST" ||
        action === "CHALLENGE";

    const differentContextVerified =
        evaluateDifferentContext({
            question,
            reference,
            required:
                requireDifferentContext
        });

    if (
        requireDifferentContext &&
        differentContextVerified === false
    ) {
        return ineligible(
            "SAME_CONTEXT_NOT_ALLOWED"
        );
    }

    /*
     * RETEST requires verified context novelty.
     *
     * CHALLENGE may continue if context novelty cannot be
     * verified because history may not contain a prior context.
     */
    if (
        action === "RETEST" &&
        requireDifferentContext &&
        differentContextVerified !== true
    ) {
        return ineligible(
            "DIFFERENT_CONTEXT_UNVERIFIABLE"
        );
    }

    /*
     * ---------------------------------------------------------
     * HARD FILTER 8
     * Independent evidence.
     * ---------------------------------------------------------
     */

    const requireIndependentEvidence =
        criteria.requireIndependentEvidence === true;

    const independentEvidenceVerified =
        evaluateIndependentEvidence({
            question,
            reference,
            required:
                requireIndependentEvidence
        });

    if (
        requireIndependentEvidence &&
        independentEvidenceVerified === false
    ) {
        return ineligible(
            "INDEPENDENT_EVIDENCE_NOT_SATISFIED"
        );
    }

    /*
     * For RETEST, independence must be positively verifiable.
     */
    if (
        action === "RETEST" &&
        requireIndependentEvidence &&
        independentEvidenceVerified !== true
    ) {
        return ineligible(
            "INDEPENDENT_EVIDENCE_UNVERIFIABLE"
        );
    }

    /*
     * ---------------------------------------------------------
     * RANKING SIGNALS
     * ---------------------------------------------------------
     */

    const preferredDifficulty =
        question.difficulty ===
        criteria.difficulty.preferred;

    const failureSignatureMatches =
        intersection(
            normalizeStringArray(
                question.failureSignatures
            ),
            criteria.failureSignatures
        );

    const secondaryNodeMatches =
        intersection(
            normalizeStringArray(
                question.secondaryNodes
            ),
            criteria.secondaryNodes
        );

    const metaSkillMatches =
        intersection(
            normalizeStringArray(
                question.skills
            ),
            criteria.metaSkills
        );

    const exactActionMode =
        questionHasExactActionMode(
            question,
            action
        );

    const contextNovelty =
        differentContextVerified === true;

    const recent =
        criteria.excludeQuestionIds.includes(
            question.id
        );

    return {
        eligible: true,

        preferredDifficulty,
        modeMatch,
        exactActionMode,

        failureSignatureMatches,
        secondaryNodeMatches,
        metaSkillMatches,

        differentQuestionVerified,
        differentContextVerified,
        independentEvidenceVerified,

        contextNovelty,

        recent,

        rankingTuple:
            buildRankingTuple({
                preferredDifficulty,
                exactActionMode,
                failureSignatureMatches,
                secondaryNodeMatches,
                metaSkillMatches,
                contextNovelty,
                question
            })
    };
}


/**
 * =========================================================
 * TARGET MATCHING
 * =========================================================
 */

function questionMatchesTarget(
    question,
    targetNodeId,
    adaptiveTarget
) {
    if (
        !question ||
        typeof question !== "object"
    ) {
        return false;
    }

    const questionNodes =
        normalizeStringArray(
            question.nodes
        );

    const primaryNode =
        normalizeNonEmptyString(
            question.primaryNode
        );

    /*
     * Directly measured node only.
     *
     * secondaryNodes are NOT enough to make a question a
     * candidate for a target node.
     */
    if (
        targetNodeId &&
        (
            primaryNode === targetNodeId ||
            questionNodes.includes(
                targetNodeId
            )
        )
    ) {
        return true;
    }

    /*
     * Defensive support for target.nodeIds.
     */
    const targetNodeIds =
        normalizeStringArray(
            adaptiveTarget?.nodeIds
        );

    return targetNodeIds.some(
        (nodeId) =>
            primaryNode === nodeId ||
            questionNodes.includes(nodeId)
    );
}


/**
 * =========================================================
 * ACTION / MODE
 * =========================================================
 */

function questionMatchesActionMode({
    question,
    action,
    path
}) {
    const modes =
        normalizeStringArray(
            question.mode
        );

    const compatibleModes =
        ACTION_MODE_COMPATIBILITY[action] ||
        [];

    if (compatibleModes.length === 0) {
        return false;
    }

    /*
     * Active remediation stages remain under primary action
     * REMEDIATE.
     */
    if (
        action === "REMEDIATE" &&
        (
            path.current === "MINI_PRACTICE" ||
            path.current === "MINI_PROBE"
        )
    ) {
        return (
            modes.includes("remediation") ||
            modes.includes("practice")
        );
    }

    return compatibleModes.some(
        (mode) => modes.includes(mode)
    );
}


function questionHasExactActionMode(
    question,
    action
) {
    const modes =
        normalizeStringArray(
            question.mode
        );

    const exactMode =
        {
            LEARN: "learning",
            PRACTICE: "practice",
            CHALLENGE: "challenge",
            REMEDIATE: "remediation",
            RETEST: "retest",
            REVIEW: "review"
        }[action];

    return (
        exactMode !== undefined &&
        modes.includes(exactMode)
    );
}


/**
 * =========================================================
 * DIFFERENT QUESTION
 * =========================================================
 */

function evaluateDifferentQuestion({
    question,
    reference,
    required
}) {
    if (!required) {
        return null;
    }

    if (!reference) {
        return null;
    }

    const previousQuestionId =
        normalizeNonEmptyString(
            reference.questionId
        );

    if (!previousQuestionId) {
        return null;
    }

    return question.id !== previousQuestionId;
}


/**
 * =========================================================
 * DIFFERENT CONTEXT
 * =========================================================
 */

function evaluateDifferentContext({
    question,
    reference,
    required
}) {
    if (!required) {
        return null;
    }

    if (!reference) {
        return null;
    }

    const currentContextId =
        resolveQuestionContextId(
            question
        );

    const previousContextId =
        resolveHistoryContextId(
            reference
        );

    /*
     * Cannot prove context novelty if either side has no
     * canonical context identifier.
     */
    if (
        !currentContextId ||
        !previousContextId
    ) {
        return null;
    }

    return (
        currentContextId !==
        previousContextId
    );
}


/**
 * =========================================================
 * INDEPENDENT EVIDENCE
 * =========================================================
 */

function evaluateIndependentEvidence({
    question,
    reference,
    required
}) {
    if (!required) {
        return null;
    }

    /*
     * Question metadata itself does not prove that the student
     * will answer independently.
     *
     * What we can verify at selection time is whether this is a
     * fresh question/context rather than a repeated assisted
     * interaction.
     *
     * Actual independence is finally recorded by Attempt.
     */

    if (!reference) {
        return null;
    }

    const differentQuestion =
        evaluateDifferentQuestion({
            question,
            reference,
            required: true
        });

    const differentContext =
        evaluateDifferentContext({
            question,
            reference,
            required: true
        });

    if (
        differentQuestion === true &&
        differentContext === true
    ) {
        return true;
    }

    if (
        differentQuestion === false ||
        differentContext === false
    ) {
        return false;
    }

    return null;
}


/**
 * =========================================================
 * RANKING
 * =========================================================
 */

function buildRankingTuple({
    preferredDifficulty,
    exactActionMode,
    failureSignatureMatches,
    secondaryNodeMatches,
    metaSkillMatches,
    contextNovelty,
    question
}) {
    /*
     * Larger values are better.
     *
     * question.id is NOT stored here because the final
     * deterministic tie-break is alphabetical.
     */
    return [
        preferredDifficulty ? 1 : 0,
        exactActionMode ? 1 : 0,
        failureSignatureMatches.length,
        secondaryNodeMatches.length,
        metaSkillMatches.length,
        contextNovelty ? 1 : 0
    ];
}


function compareCandidates(a, b) {
    const tupleA =
        a.evaluation.rankingTuple;

    const tupleB =
        b.evaluation.rankingTuple;

    const length =
        Math.max(
            tupleA.length,
            tupleB.length
        );

    for (let index = 0; index < length; index += 1) {
        const valueA =
            safeNumber(tupleA[index]);

        const valueB =
            safeNumber(tupleB[index]);

        if (valueA !== valueB) {
            /*
             * Higher ranking value first.
             */
            return valueB - valueA;
        }
    }

    /*
     * Stable deterministic tie-break.
     */
    return String(
        a.question.id
    ).localeCompare(
        String(b.question.id)
    );
}


/**
 * =========================================================
 * QUESTION BANK NORMALIZATION
 * =========================================================
 */

function flattenQuestionBanks(
    questionBanks
) {
    const banks =
        normalizeQuestionBanks(
            questionBanks
        );

    const result = [];

    for (const bank of banks) {
        const bankId =
            normalizeNonEmptyString(
                bank?.bankId
            ) || "unknown-bank";

        const questions =
            Array.isArray(bank?.questions)
                ? bank.questions
                : [];

        for (const question of questions) {
            if (
                !question ||
                typeof question !== "object"
            ) {
                continue;
            }

            result.push({
                bankId,
                question
            });
        }
    }

    return result;
}


function normalizeQuestionBanks(
    questionBanks
) {
    if (Array.isArray(questionBanks)) {
        return questionBanks.filter(
            (bank) =>
                bank &&
                typeof bank === "object"
        );
    }

    if (
        questionBanks &&
        typeof questionBanks === "object"
    ) {
        /*
         * Single bank:
         *
         * {
         *   bankId,
         *   questions: [...]
         * }
         */
        if (
            Array.isArray(
                questionBanks.questions
            )
        ) {
            return [questionBanks];
        }

        /*
         * Map form:
         *
         * {
         *   K281: bank,
         *   K282: bank
         * }
         */
        return Object.values(
            questionBanks
        ).filter(
            (bank) =>
                bank &&
                typeof bank === "object"
        );
    }

    return [];
}


function countAllQuestions(
    questionBanks
) {
    return flattenQuestionBanks(
        questionBanks
    ).length;
}


/**
 * =========================================================
 * HISTORY
 * =========================================================
 */

function normalizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history.filter(
        (item) =>
            item &&
            typeof item === "object"
    );
}


/**
 * Find the most recent relevant interaction for the target.
 *
 * History is expected newest-last.
 *
 * Supported forms include:
 *
 * {
 *   questionId,
 *   nodeId,
 *   contextId,
 *   question: {...},
 *   context: {...}
 * }
 *
 * or Attempt-like records.
 */
function resolveReferenceAttempt({
    history,
    targetNodeId
}) {
    if (!Array.isArray(history)) {
        return null;
    }

    for (
        let index = history.length - 1;
        index >= 0;
        index -= 1
    ) {
        const item = history[index];

        if (
            historyItemMatchesNode(
                item,
                targetNodeId
            )
        ) {
            return item;
        }
    }

    /*
     * If node information is absent from history, use the
     * latest interaction as a defensive reference.
     */
    return (
        history.length > 0
            ? history[
            history.length - 1
            ]
            : null
    );
}


function historyItemMatchesNode(
    item,
    targetNodeId
) {
    if (!targetNodeId) {
        return true;
    }

    const candidates = [
        item?.nodeId,
        item?.primaryNode,
        item?.targetNodeId,
        item?.question?.primaryNode,
        item?.context?.nodeId
    ]
        .map(normalizeNonEmptyString)
        .filter(Boolean);

    if (
        Array.isArray(
            item?.question?.nodes
        )
    ) {
        candidates.push(
            ...item.question.nodes
                .map(
                    normalizeNonEmptyString
                )
                .filter(Boolean)
        );
    }

    /*
     * If this history record contains no node metadata,
     * we cannot establish node relevance.
     */
    if (candidates.length === 0) {
        return false;
    }

    return candidates.includes(
        targetNodeId
    );
}


function resolveHistoryContextId(
    item
) {
    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }

    return (
        normalizeNonEmptyString(
            item.contextId
        ) ||
        normalizeNonEmptyString(
            item.questionContextId
        ) ||
        normalizeNonEmptyString(
            item.context?.contextId
        ) ||
        normalizeNonEmptyString(
            item.question?.context?.contextId
        ) ||
        normalizeNonEmptyString(
            item.question?.metadata?.contextId
        ) ||
        null
    );
}


/**
 * =========================================================
 * QUESTION CONTEXT
 * =========================================================
 */

function resolveQuestionContextId(
    question
) {
    if (
        !question ||
        typeof question !== "object"
    ) {
        return null;
    }

    return (
        normalizeNonEmptyString(
            question.context?.contextId
        ) ||
        normalizeNonEmptyString(
            question.metadata?.contextId
        ) ||
        null
    );
}


/**
 * =========================================================
 * DIFFICULTY
 * =========================================================
 */

function difficultyWithinRange(
    difficulty,
    min,
    max
) {
    const valueRank =
        difficultyRank(difficulty);

    const minRank =
        difficultyRank(min);

    const maxRank =
        difficultyRank(max);

    if (valueRank < 0) {
        return false;
    }

    if (
        minRank >= 0 &&
        valueRank < minRank
    ) {
        return false;
    }

    if (
        maxRank >= 0 &&
        valueRank > maxRank
    ) {
        return false;
    }

    return true;
}


function difficultyRank(value) {
    return DIFFICULTY_ORDER.indexOf(
        value
    );
}


/**
 * =========================================================
 * NORMALIZATION
 * =========================================================
 */

function normalizeSelectionCriteria(
    value
) {
    const raw =
        value &&
            typeof value === "object"
            ? value
            : {};

    const rawDifficulty =
        raw.difficulty &&
            typeof raw.difficulty === "object"
            ? raw.difficulty
            : {};

    const min =
        normalizeDifficulty(
            rawDifficulty.min
        ) || "D1";

    let max =
        normalizeDifficulty(
            rawDifficulty.max
        ) || min;

    /*
     * Defensive normalization if malformed caller input places
     * max below min.
     */
    if (
        difficultyRank(max) <
        difficultyRank(min)
    ) {
        max = min;
    }

    const preferredRaw =
        normalizeDifficulty(
            rawDifficulty.preferred
        );

    const preferred =
        preferredRaw &&
            difficultyWithinRange(
                preferredRaw,
                min,
                max
            )
            ? preferredRaw
            : min;

    return {
        questionTypes:
            normalizeStringArray(
                raw.questionTypes
            ).filter(
                (value) =>
                    QUESTION_TYPES.includes(
                        value
                    )
            ),

        difficulty: {
            min,
            max,
            preferred
        },

        evidenceDimensions:
            normalizeStringArray(
                raw.evidenceDimensions
            ).filter(
                (value) =>
                    EVIDENCE_DIMENSIONS.includes(
                        value
                    )
            ),

        excludeQuestionIds:
            normalizeStringArray(
                raw.excludeQuestionIds
            ),

        requireDifferentQuestion:
            raw.requireDifferentQuestion === true,

        requireDifferentContext:
            raw.requireDifferentContext === true,

        requireIndependentEvidence:
            raw.requireIndependentEvidence === true,

        metaSkills:
            normalizeStringArray(
                raw.metaSkills
            ),

        secondaryNodes:
            normalizeStringArray(
                raw.secondaryNodes
            ),

        failureSignatures:
            normalizeStringArray(
                raw.failureSignatures
            )
    };
}


function normalizeConstraints(value) {
    const raw =
        value &&
            typeof value === "object"
            ? value
            : {};

    return {
        requireDifferentContext:
            raw.requireDifferentContext === true,

        requireDifferentQuestion:
            raw.requireDifferentQuestion === true
    };
}


function normalizePath(value) {
    const raw =
        value &&
            typeof value === "object"
            ? value
            : {};

    return {
        current:
            normalizeNonEmptyString(
                raw.current
            ),

        next:
            normalizeNonEmptyString(
                raw.next
            )
    };
}


function normalizeAction(value) {
    return ACTIONS.includes(value)
        ? value
        : "LEARN";
}


function normalizeDifficulty(value) {
    return DIFFICULTY_ORDER.includes(
        value
    )
        ? value
        : null;
}


function normalizeStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [
        ...new Set(
            values
                .map(
                    normalizeNonEmptyString
                )
                .filter(Boolean)
        )
    ];
}


function normalizeNonEmptyString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed =
        value.trim();

    return trimmed.length > 0
        ? trimmed
        : null;
}


/**
 * =========================================================
 * REFERENCE VERIFICATION
 * =========================================================
 */

function resolveNoMatchVerification(
    type,
    action,
    criteria,
    constraints,
    reference
) {
    let required = false;

    if (type === "question") {
        required =
            criteria.requireDifferentQuestion ||
            constraints.requireDifferentQuestion ||
            action === "RETEST";
    }

    if (type === "context") {
        required =
            criteria.requireDifferentContext ||
            constraints.requireDifferentContext ||
            action === "RETEST" ||
            action === "CHALLENGE";
    }

    if (type === "independent") {
        required =
            criteria.requireIndependentEvidence === true;
    }

    if (!required) {
        return null;
    }

    if (!reference) {
        return null;
    }

    /*
     * At NO_MATCH level this function only reports whether a
     * reference existed. Candidate-specific verification is
     * performed during evaluation.
     */
    return null;
}


/**
 * =========================================================
 * FALLBACK PROJECTION
 * =========================================================
 */

/**
 * IMPORTANT:
 *
 * Selector only reports Adaptive's fallback.
 * It does NOT execute or reinterpret it.
 */
function projectAdaptiveFallback(
    fallback
) {
    if (
        !fallback ||
        typeof fallback !== "object"
    ) {
        return null;
    }

    return clonePlainObject(
        fallback
    );
}


/**
 * =========================================================
 * RESULT HELPERS
 * =========================================================
 */

function ineligible(reasonCode) {
    return {
        eligible: false,
        reasonCode
    };
}


function buildSelectedMessage({
    winner,
    action,
    targetNodeId
}) {
    return [
        "Selected",
        winner.question.id,
        "for",
        action,
        "on",
        targetNodeId
    ].join(" ");
}


function buildNoMatchMessage({
    action,
    targetNodeId,
    criteria,
    targetCount
}) {
    if (targetCount === 0) {
        return (
            `No question directly measures target node ` +
            `${targetNodeId}.`
        );
    }

    return (
        `No eligible question satisfies Adaptive criteria ` +
        `for action ${action} on node ${targetNodeId} ` +
        `(difficulty ${criteria.difficulty.min}-` +
        `${criteria.difficulty.max}).`
    );
}


/**
 * =========================================================
 * VALIDATION
 * =========================================================
 */

function assertAdaptiveDecision(
    adaptiveDecision
) {
    if (
        !adaptiveDecision ||
        typeof adaptiveDecision !== "object"
    ) {
        throw new TypeError(
            "QuestionSelector requires adaptiveDecision."
        );
    }

    if (
        !normalizeNonEmptyString(
            adaptiveDecision.decisionId
        )
    ) {
        throw new TypeError(
            "QuestionSelector requires adaptiveDecision.decisionId."
        );
    }

    if (
        !ACTIONS.includes(
            adaptiveDecision.action
        )
    ) {
        throw new TypeError(
            `Unsupported Adaptive action: ` +
            `${String(adaptiveDecision.action)}`
        );
    }

    if (
        !adaptiveDecision.target ||
        typeof adaptiveDecision.target !== "object"
    ) {
        throw new TypeError(
            "QuestionSelector requires adaptiveDecision.target."
        );
    }

    if (
        !adaptiveDecision.selectionCriteria ||
        typeof adaptiveDecision.selectionCriteria !==
        "object"
    ) {
        throw new TypeError(
            "QuestionSelector requires adaptiveDecision.selectionCriteria."
        );
    }
}


/**
 * =========================================================
 * TARGET RESOLUTION
 * =========================================================
 */

function resolveTargetNodeId(
    adaptiveDecision
) {
    const primary =
        normalizeNonEmptyString(
            adaptiveDecision
                ?.target
                ?.primaryNodeId
        );

    if (primary) {
        return primary;
    }

    const nodeIds =
        normalizeStringArray(
            adaptiveDecision
                ?.target
                ?.nodeIds
        );

    if (nodeIds.length > 0) {
        return nodeIds[0];
    }

    return "unknown-node";
}


/**
 * =========================================================
 * IDS / TIME
 * =========================================================
 */

function resolveTimestamp(now) {
    if (now instanceof Date) {
        return now.toISOString();
    }

    if (
        typeof now === "string" &&
        !Number.isNaN(
            Date.parse(now)
        )
    ) {
        return new Date(
            now
        ).toISOString();
    }

    if (
        typeof now === "number" &&
        Number.isFinite(now)
    ) {
        return new Date(
            now
        ).toISOString();
    }

    return new Date().toISOString();
}


function createSelectionId({
    decisionId,
    targetNodeId,
    timestamp
}) {
    const safeTimestamp =
        timestamp
            .replaceAll(":", "")
            .replaceAll(".", "")
            .replaceAll("-", "");

    return [
        "QS",
        sanitizeIdPart(decisionId),
        sanitizeIdPart(targetNodeId),
        safeTimestamp
    ].join("-");
}


function sanitizeIdPart(value) {
    return String(
        value || "unknown"
    ).replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
    );
}


/**
 * =========================================================
 * GENERIC HELPERS
 * =========================================================
 */

function intersection(a, b) {
    const setB =
        new Set(
            normalizeStringArray(b)
        );

    return normalizeStringArray(a)
        .filter(
            (value) =>
                setB.has(value)
        );
}


function safeNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function clonePlainObject(value) {
    if (
        value === undefined
    ) {
        return undefined;
    }

    /*
     * Current contracts contain JSON-compatible data only.
     */
    return JSON.parse(
        JSON.stringify(value)
    );
}