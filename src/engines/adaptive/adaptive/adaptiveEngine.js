/**
 * adaptiveEngine.js
 * Version: 1.0.0
 *
 * Responsibility:
 * - Decide what the student should do next.
 * - Select canonical primary action.
 * - Select target node.
 * - Build question-selection criteria.
 * - Resolve workflow/path metadata.
 * - Calculate adaptive priority.
 * - Produce payload compatible with next-action.schema.json.
 *
 * Does NOT:
 * - calculate mastery
 * - update mastery
 * - score answers
 * - generate lesson content
 * - generate question content
 * - perform remediation itself
 * - mutate student state
 */

const ENGINE_NAME = "AdaptiveEngine";
const ENGINE_VERSION = "1.0.0";

const SCHEMA_VERSION = "1.0.0";

const ACTIONS = Object.freeze([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);

const MASTERY_LEVELS = Object.freeze([
    "M0",
    "M1",
    "M2",
    "M3",
    "M4"
]);

const FAILURE_SIGNATURES = Object.freeze([
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

const LEARNING_MODES = Object.freeze([
    "HOC_NHANH",
    "HOC_SAU",
    "ON_THI"
]);

const DEFAULT_QUESTION_SELECTION = Object.freeze({
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
        evidence: ["know", "explain", "apply"]
    },

    RETEST: {
        difficulty: ["D3", "D4"],
        evidence: ["apply", "transfer"]
    },

    REVIEW: {
        difficulty: ["D3", "D4"],
        evidence: ["apply", "transfer"]
    },

    SKIP: {
        difficulty: [],
        evidence: []
    }
});

const DEFAULT_QUESTION_TYPES = Object.freeze({
    LEARN: [
        "mcq",
        "true_false",
        "matching",
        "fill_blank",
        "short_answer"
    ],

    PRACTICE: [
        "mcq",
        "multi_select",
        "true_false",
        "matching",
        "ordering",
        "fill_blank",
        "short_answer",
        "numeric",
        "data_analysis"
    ],

    CHALLENGE: [
        "mcq",
        "multi_select",
        "true_false",
        "ordering",
        "short_answer",
        "numeric",
        "data_analysis",
        "experiment",
        "sequence",
        "open_response"
    ],

    REMEDIATE: [
        "mcq",
        "true_false",
        "matching",
        "fill_blank",
        "short_answer",
        "numeric"
    ],

    RETEST: [
        "mcq",
        "multi_select",
        "true_false",
        "short_answer",
        "numeric",
        "data_analysis",
        "experiment",
        "open_response"
    ],

    REVIEW: [
        "mcq",
        "multi_select",
        "true_false",
        "short_answer",
        "numeric",
        "data_analysis"
    ],

    SKIP: []
});

const REASON_CODE_BY_MASTERY = Object.freeze({
    M0: "MASTERY_M0",
    M1: "MASTERY_M1",
    M2: "MASTERY_M2",
    M3: "MASTERY_M3",
    M4: "MASTERY_M4"
});

const REASON_CODE_BY_FAILURE = Object.freeze({
    prerequisite_gap: "PREREQUISITE_GAP",
    source_knowledge_gap: "SOURCE_KNOWLEDGE_GAP",
    concept_confusion: "CONCEPT_CONFUSION",
    mechanism_confusion: "MECHANISM_CONFUSION",
    calculation_error: "CALCULATION_ERROR",
    data_interpretation_error: "DATA_INTERPRETATION_ERROR",
    reasoning_error: "REASONING_ERROR",
    cross_node_reasoning_error: "CROSS_NODE_REASONING_ERROR",
    careless_error: "CAREFULNESS_ERROR",
    meta_skill_gap: "META_SKILL_GAP"
});

const DEFAULT_PRIORITY_FACTORS = Object.freeze({
    P1: 100,
    P2: 70,
    weakness: 40,
    prerequisiteBlocking: 50,
    examRelevance: 20,
    dependencyCentrality: 20,
    recentFailure: 20,
    staleKnowledge: 10,
    transferGap: 15
});

/**
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

export function decideNextAction({
    studentId,
    targetNodeId,

    masteryState = {},
    knowledgeMap = {},

    adaptiveRules = {},
    adaptivePaths = {},

    recentResults = [],
    sessionContext = {},

    learningMode = "HOC_SAU",
    timeBudget = null,

    now = null
} = {}) {
    const timestamp = resolveTimestamp(now);

    const normalizedStudentId =
        normalizeNonEmptyString(studentId) || "unknown-student";

    const normalizedTargetNodeId =
        normalizeNonEmptyString(targetNodeId) ||
        inferNodeId(masteryState) ||
        "unknown-node";

    const mode = normalizeLearningMode(learningMode);

    const targetState = normalizeMasteryState(
        masteryState,
        normalizedTargetNodeId
    );

    const context = normalizeSessionContext(sessionContext);

    const prerequisiteResult = evaluatePrerequisites({
        targetNodeId: normalizedTargetNodeId,
        knowledgeMap,
        masteryState,
        sessionContext: context,
        adaptiveRules
    });

    const failureResult = evaluateFailurePattern({
        targetState,
        recentResults,
        sessionContext: context
    });

    /*
     * Primary action is selected here.
     *
     * IMPORTANT:
     * adaptivePaths must never override this decision.
     */
    const decision = selectPrimaryDecision({
        targetNodeId: normalizedTargetNodeId,
        targetState,
        prerequisiteResult,
        failureResult,
        sessionContext: context,
        adaptiveRules,
        learningMode: mode
    });

    const selectedTarget = resolveTarget({
        decision,
        targetNodeId: normalizedTargetNodeId,
        prerequisiteResult,
        failureResult
    });

    const selectionCriteria = buildSelectionCriteria({
        action: decision.action,
        adaptiveRules,
        targetState,
        recentResults,
        sessionContext: context
    });

    const path = resolvePath({
        action: decision.action,
        targetState,
        adaptivePaths,
        sessionContext: context
    });

    const constraints = buildConstraints({
        action: decision.action,
        timeBudget,
        prerequisiteResult,
        sessionContext: context,
        adaptiveRules
    });

    const priority = calculatePriority({
        selectedTarget,
        targetState,
        prerequisiteResult,
        failureResult,
        sessionContext: context,
        adaptiveRules,
        learningMode: mode
    });

    const reason = buildReason({
        decision,
        targetState,
        prerequisiteResult,
        failureResult,
        learningMode: mode
    });

    const source = buildSource({
        adaptiveRules,
        adaptivePaths,
        learningMode: mode,
        sessionContext: context
    });

    const result = {
        schemaVersion: SCHEMA_VERSION,

        decisionId: createDecisionId({
            studentId: normalizedStudentId,
            nodeId: selectedTarget.primaryNodeId,
            timestamp
        }),

        studentId: normalizedStudentId,

        timestamp,

        action: decision.action,

        reason,

        target: selectedTarget,

        selectionCriteria,

        path,

        constraints,

        priority,

        source
    };

    if (context.previousAction) {
        const previousAction = normalizeAction(context.previousAction);

        if (previousAction) {
            result.previousAction = previousAction;
        }
    }

    if (normalizeNonEmptyString(context.previousDecisionId)) {
        result.previousDecisionId =
            normalizeNonEmptyString(context.previousDecisionId);
    }

    const fallback = buildFallback({
        decision,
        targetNodeId: normalizedTargetNodeId,
        prerequisiteResult
    });

    if (fallback) {
        result.fallback = fallback;
    }

    return result;
}

/**
 * =========================================================
 * PRIMARY DECISION
 * =========================================================
 */

function selectPrimaryDecision({
    targetNodeId,
    targetState,
    prerequisiteResult,
    failureResult,
    sessionContext,
    adaptiveRules
}) {
    /*
     * Canonical precedence:
     *
     * safety_and_validity
     * blocking_prerequisite
     * active_remediation
     * repeated_failure
     * unlearned_knowledge
     * developing_knowledge
     * challenge_opportunity
     * retest_due
     * review_due
     * skip_known
     *
     * V1 implements the executable subset supported
     * by the current contracts.
     */

    /*
     * 1. Blocking D1 prerequisite.
     */
    if (prerequisiteResult.blocked) {
        return {
            ruleId: "R002",
            action: "REMEDIATE",
            targetType: "PREREQUISITE",
            targetNodeId:
                prerequisiteResult.weakestBlockingNodeId ||
                targetNodeId,
            reason:
                "Không thể học hiệu quả node hiện tại khi prerequisite nền tảng chưa đủ."
        };
    }

    /*
     * 2. Active remediation.
     *
     * Do not invent remediation strategy here.
     * Adaptive only keeps the primary action REMEDIATE.
     */
    if (isActiveRemediation(sessionContext)) {
        return {
            ruleId: "ACTIVE_REMEDIATION",
            action: "REMEDIATE",
            targetType: "REMEDIATION",
            targetNodeId:
                normalizeNonEmptyString(
                    sessionContext.remediationTargetNodeId
                ) || targetNodeId,
            reason:
                "Đang có remediation chưa hoàn tất."
        };
    }

    /*
     * 3. Weak status.
     *
     * Current decisionRules contain R001 with highest
     * explicit rule priority.
     */
    if (targetState.status === "weak") {
        return {
            ruleId: "R001",
            action: "REMEDIATE",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Node đang có failure pattern cần xử lý."
        };
    }

    /*
     * 4. Repeated failure signature.
     */
    if (failureResult.repeatedCount >= 2) {
        return {
            ruleId: "R003",
            action: "REMEDIATE",
            targetType: failureResult.sourceNodeId
                ? "SOURCE"
                : "TARGET",
            targetNodeId:
                failureResult.sourceNodeId ||
                targetNodeId,
            reason:
                "Lỗi có tính hệ thống."
        };
    }

    /*
     * 5. Mastery routing.
     */

    if (targetState.mastery === "M0") {
        return {
            ruleId: "R004",
            action: "LEARN",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Node chưa được hình thành."
        };
    }

    if (targetState.mastery === "M1") {
        return {
            ruleId: "R005",
            action: "LEARN",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Node mới dừng ở nhận biết."
        };
    }

    if (targetState.mastery === "M2") {
        return {
            ruleId: "R006",
            action: "PRACTICE",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Cần củng cố khả năng vận dụng."
        };
    }

    if (targetState.mastery === "M3") {
        return {
            ruleId: "R007",
            action: "CHALLENGE",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Cần phát triển transfer."
        };
    }

    /*
     * M4 requires more context than mastery alone.
     */

    if (
        targetState.mastery === "M4" &&
        resolveRetestDue(targetState, sessionContext)
    ) {
        return {
            ruleId: "R008",
            action: "RETEST",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Cần xác nhận mastery."
        };
    }

    if (
        targetState.status === "stable" &&
        resolveReviewDue(targetState, sessionContext)
    ) {
        return {
            ruleId: "R009",
            action: "REVIEW",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Kiến thức ổn định nhưng đến chu kỳ ôn."
        };
    }

    if (
        targetState.status === "stable" &&
        !resolveReviewDue(targetState, sessionContext)
    ) {
        return {
            ruleId: "R010",
            action: "SKIP",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Không cần bắt học sinh học lại kiến thức đã ổn định."
        };
    }

    /*
     * Mastered M4 but retest flag was not explicitly supplied.
     * RETEST is the safest contract-consistent default.
     */
    if (
        targetState.mastery === "M4" ||
        targetState.status === "mastered"
    ) {
        return {
            ruleId: "M4_DEFAULT",
            action: "RETEST",
            targetType: "TARGET",
            targetNodeId,
            reason:
                "Node đã đạt mastery và cần được xác nhận bằng retest."
        };
    }

    /*
     * Defensive fallback.
     */
    return {
        ruleId: "DEFAULT_LEARN",
        action: "LEARN",
        targetType: "TARGET",
        targetNodeId,
        reason:
            "Chưa có đủ dữ liệu để chọn bước nâng cao; tiếp tục củng cố node hiện tại."
    };
}

/**
 * =========================================================
 * PREREQUISITE
 * =========================================================
 */

function evaluatePrerequisites({
    targetNodeId,
    knowledgeMap,
    masteryState,
    sessionContext
}) {
    const explicit =
        Array.isArray(sessionContext.prerequisites)
            ? sessionContext.prerequisites
            : null;

    const prerequisites =
        explicit ||
        extractPrerequisitesFromKnowledgeMap(
            targetNodeId,
            knowledgeMap
        );

    const normalized = prerequisites
        .map((prerequisite) =>
            normalizePrerequisite(
                prerequisite,
                masteryState,
                sessionContext
            )
        )
        .filter(Boolean);

    const blocking = normalized.filter(
        (item) =>
            item.dependencyType === "D1" &&
            masteryRank(item.mastery) < masteryRank("M2")
    );

    blocking.sort((a, b) => {
        const masteryDifference =
            masteryRank(a.mastery) -
            masteryRank(b.mastery);

        if (masteryDifference !== 0) {
            return masteryDifference;
        }

        return String(a.nodeId).localeCompare(
            String(b.nodeId)
        );
    });

    return {
        blocked: blocking.length > 0,

        blockingPrerequisites: blocking,

        weakestBlockingNodeId:
            blocking[0]?.nodeId || null,

        all: normalized
    };
}

function extractPrerequisitesFromKnowledgeMap(
    targetNodeId,
    knowledgeMap
) {
    const node = findKnowledgeNode(
        knowledgeMap,
        targetNodeId
    );

    if (!node) {
        return [];
    }

    const raw =
        node.dependencies ||
        node.prerequisites ||
        node.requires ||
        [];

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw;
}

function normalizePrerequisite(
    prerequisite,
    masteryState,
    sessionContext
) {
    if (typeof prerequisite === "string") {
        return {
            nodeId: prerequisite,
            dependencyType: "D1",
            mastery: lookupNodeMastery(
                prerequisite,
                masteryState,
                sessionContext
            )
        };
    }

    if (!prerequisite || typeof prerequisite !== "object") {
        return null;
    }

    const nodeId =
        normalizeNonEmptyString(prerequisite.nodeId) ||
        normalizeNonEmptyString(prerequisite.id) ||
        normalizeNonEmptyString(prerequisite.node) ||
        normalizeNonEmptyString(prerequisite.target);

    if (!nodeId) {
        return null;
    }

    const dependencyType =
        normalizeDependencyType(
            prerequisite.dependencyType ||
            prerequisite.type ||
            prerequisite.level
        );

    return {
        nodeId,

        dependencyType,

        mastery:
            normalizeMasteryLevel(prerequisite.mastery) ||
            lookupNodeMastery(
                nodeId,
                masteryState,
                sessionContext
            )
    };
}

/**
 * =========================================================
 * FAILURE PATTERN
 * =========================================================
 */

function evaluateFailurePattern({
    targetState,
    recentResults,
    sessionContext
}) {
    const candidates = [];

    const explicitFailure =
        sessionContext.failure ||
        sessionContext.failurePattern ||
        null;

    if (explicitFailure) {
        candidates.push(explicitFailure);
    }

    if (targetState.failure) {
        candidates.push(targetState.failure);
    }

    if (
        Array.isArray(recentResults) &&
        recentResults.length > 0
    ) {
        candidates.push(...recentResults);
    }

    let best = {
        signature: null,
        repeatedCount: 0,
        sourceNodeId: null,
        metaSkillId: null
    };

    for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        const signature =
            normalizeFailureSignature(
                candidate.failureType ||
                candidate.failureSignature ||
                candidate.signature ||
                candidate.type
            );

        const repeatedCount = Math.max(
            normalizeNonNegativeInteger(
                candidate.repeated
            ),
            normalizeNonNegativeInteger(
                candidate.count
            ),
            normalizeNonNegativeInteger(
                candidate.sameFailureSignatureCount
            ),
            normalizeNonNegativeInteger(
                candidate.repeatCount
            )
        );

        if (repeatedCount > best.repeatedCount) {
            best = {
                signature,
                repeatedCount,
                sourceNodeId:
                    normalizeNonEmptyString(
                        candidate.sourceNodeId
                    ),
                metaSkillId:
                    normalizeNonEmptyString(
                        candidate.metaSkillId
                    )
            };
        }
    }

    /*
     * Also support failureSummary-like maps:
     *
     * {
     *   concept_confusion: 2
     * }
     */
    const summaries = [
        targetState.failureSummary,
        sessionContext.failureSummary
    ];

    for (const summary of summaries) {
        if (!summary || typeof summary !== "object") {
            continue;
        }

        for (const [key, rawCount] of Object.entries(summary)) {
            const signature =
                normalizeFailureSignature(key);

            if (!signature) {
                continue;
            }

            const count =
                typeof rawCount === "number"
                    ? rawCount
                    : normalizeNonNegativeInteger(
                        rawCount?.count
                    );

            if (count > best.repeatedCount) {
                best = {
                    signature,
                    repeatedCount: count,
                    sourceNodeId:
                        normalizeNonEmptyString(
                            rawCount?.sourceNodeId
                        ),
                    metaSkillId:
                        normalizeNonEmptyString(
                            rawCount?.metaSkillId
                        )
                };
            }
        }
    }

    return best;
}

/**
 * =========================================================
 * TARGET
 * =========================================================
 */

function resolveTarget({
    decision,
    targetNodeId,
    prerequisiteResult,
    failureResult
}) {
    let primaryNodeId =
        normalizeNonEmptyString(
            decision.targetNodeId
        ) || targetNodeId;

    let sourceNodeId = null;

    if (
        decision.targetType === "PREREQUISITE" &&
        prerequisiteResult.weakestBlockingNodeId
    ) {
        primaryNodeId =
            prerequisiteResult.weakestBlockingNodeId;

        sourceNodeId = targetNodeId;
    }

    if (
        decision.targetType === "SOURCE" &&
        failureResult.sourceNodeId
    ) {
        primaryNodeId =
            failureResult.sourceNodeId;

        sourceNodeId = targetNodeId;
    }

    const result = {
        type: "KNOWLEDGE_NODE",
        nodeIds: [primaryNodeId],
        primaryNodeId
    };

    if (sourceNodeId) {
        result.sourceNodeId = sourceNodeId;
    }

    return result;
}

/**
 * =========================================================
 * SELECTION CRITERIA
 * =========================================================
 */

function buildSelectionCriteria({
    action,
    adaptiveRules,
    recentResults,
    sessionContext
}) {
    const configured =
        adaptiveRules?.questionSelectionRules?.[action];

    const fallback =
        DEFAULT_QUESTION_SELECTION[action] ||
        DEFAULT_QUESTION_SELECTION.LEARN;

    const difficulties =
        normalizeDifficultyArray(
            configured?.difficulty
        );

    const finalDifficulties =
        difficulties.length > 0
            ? difficulties
            : [...fallback.difficulty];

    const evidence =
        normalizeEvidenceArray(
            configured?.evidence
        );

    const finalEvidence =
        evidence.length > 0
            ? evidence
            : [...fallback.evidence];

    const questionTypes =
        resolveQuestionTypes({
            action,
            sessionContext
        });

    /*
     * SKIP still needs schema-compatible selectionCriteria.
     *
     * Schema requires questionTypes and difficulty.min.
     * Therefore use a harmless minimum D1 criterion even though
     * no question should actually be selected for SKIP.
     */
    const difficultyMin =
        finalDifficulties[0] || "D1";

    const difficultyMax =
        finalDifficulties[
        finalDifficulties.length - 1
        ] || difficultyMin;

    const difficultyPreferred =
        choosePreferredDifficulty(
            finalDifficulties
        );

    const result = {
        questionTypes,

        difficulty: {
            min: difficultyMin,
            max: difficultyMax,
            preferred: difficultyPreferred
        }
    };

    if (finalEvidence.length > 0) {
        result.evidenceDimensions =
            finalEvidence;
    }

    const recentQuestionIds =
        extractRecentQuestionIds(recentResults);

    if (recentQuestionIds.length > 0) {
        result.excludeQuestionIds =
            recentQuestionIds;
    }

    if (action === "RETEST") {
        result.requireDifferentQuestion = true;
        result.requireDifferentContext = true;
        result.requireIndependentEvidence = true;
    }

    if (action === "CHALLENGE") {
        result.requireDifferentContext = true;
    }

    const metaSkillId =
        normalizeNonEmptyString(
            sessionContext.metaSkillId
        );

    if (metaSkillId) {
        result.metaSkills = [metaSkillId];
    }

    const secondaryNodes =
        uniqueStrings(
            sessionContext.secondaryNodes
        );

    if (secondaryNodes.length > 0) {
        result.secondaryNodes =
            secondaryNodes;
    }

    const failureSignatures =
        uniqueStrings(
            sessionContext.failureSignatures
        ).filter(
            (value) =>
                FAILURE_SIGNATURES.includes(value)
        );

    if (failureSignatures.length > 0) {
        result.failureSignatures =
            failureSignatures;
    }

    return result;
}

function resolveQuestionTypes({
    action,
    sessionContext
}) {
    const explicit =
        uniqueStrings(
            sessionContext.questionTypes
        ).filter(isAllowedQuestionType);

    if (explicit.length > 0) {
        return explicit;
    }

    const defaults =
        DEFAULT_QUESTION_TYPES[action] ||
        DEFAULT_QUESTION_TYPES.LEARN;

    /*
     * Schema requires questionTypes.
     * SKIP has no actual question requirement.
     * [] is valid because schema does not require minItems.
     */
    return [...defaults];
}

/**
 * =========================================================
 * PATH RESOLUTION
 * =========================================================
 */

function resolvePath({
    action,
    targetState,
    adaptivePaths,
    sessionContext
}) {
    /*
     * IMPORTANT:
     *
     * Paths never change the primary action.
     * They only describe workflow position / next stage.
     */

    const explicitCurrent =
        normalizePathStage(
            sessionContext.currentPathStage
        );

    const current =
        explicitCurrent ||
        normalizePathStage(action) ||
        "LEARN";

    /*
     * Active remediation has its own internal workflow.
     */
    if (action === "REMEDIATE") {
        const remediationPath =
            adaptivePaths?.remediationPaths;

        const remediationDepth =
            clampInteger(
                sessionContext.remediationDepth,
                0,
                remediationPath?.maximumDepth ?? 3
            );

        let next = "MINI_PRACTICE";

        if (
            current === "MINI_PRACTICE"
        ) {
            next = "MINI_PROBE";
        }

        if (
            current === "MINI_PROBE" &&
            sessionContext.probePassed === true
        ) {
            next = "RETURN";
        }

        if (
            current === "MINI_PROBE" &&
            sessionContext.probePassed === false
        ) {
            next = "REMEDIATE";
        }

        const result = {
            current,
            next,
            terminal: false,
            remediationDepth
        };

        const returnToNodeId =
            normalizeNonEmptyString(
                sessionContext.returnToNodeId
            );

        if (returnToNodeId) {
            result.returnToNodeId =
                returnToNodeId;
        }

        return result;
    }

    /*
     * Stable/review path.
     */
    if (action === "REVIEW") {
        return {
            current,
            next: "SESSION_COMPLETE",
            terminal: false
        };
    }

    /*
     * Skip means no work on the current node.
     */
    if (action === "SKIP") {
        return {
            current: "SKIP",
            next: "SESSION_COMPLETE",
            terminal: false
        };
    }

    /*
     * Mastery path can provide the canonical sequence.
     */
    const masteryPath =
        adaptivePaths
            ?.masteryPaths
            ?.[targetState.mastery]
            ?.path;

    if (Array.isArray(masteryPath)) {
        const actionIndex =
            masteryPath.indexOf(action);

        if (
            actionIndex >= 0 &&
            actionIndex <
            masteryPath.length - 1
        ) {
            const candidate =
                normalizePathStage(
                    masteryPath[actionIndex + 1]
                );

            if (candidate) {
                return {
                    current,
                    next: candidate,
                    terminal: false
                };
            }
        }
    }

    /*
     * Contract-safe defaults.
     */
    const defaultNext = {
        LEARN: "PRACTICE",
        PRACTICE: "CHALLENGE",
        CHALLENGE: "RETEST",
        RETEST: "REVIEW"
    };

    return {
        current,
        next:
            defaultNext[action] ||
            "SESSION_COMPLETE",
        terminal: false
    };
}

/**
 * =========================================================
 * CONSTRAINTS
 * =========================================================
 */

function buildConstraints({
    action,
    timeBudget,
    prerequisiteResult,
    sessionContext,
    adaptiveRules
}) {
    const result = {
        respectPrerequisites: true,
        minimumPrerequisiteMastery: "M2",

        allowSkip:
            action === "SKIP" ||
            adaptiveRules
                ?.acceleratedLearningRules
                ?.enabled === true,

        allowStudentChoice:
            adaptiveRules
                ?.studentChoiceRules
                ?.override
                ?.enabled !== false,

        requireDifferentContext:
            action === "RETEST" ||
            action === "CHALLENGE",

        requireDifferentQuestion:
            action === "RETEST"
    };

    const maxQuestions =
        normalizePositiveInteger(
            sessionContext.maxQuestions
        );

    if (maxQuestions) {
        result.maxQuestions =
            clampInteger(
                maxQuestions,
                1,
                50
            );
    }

    const budget =
        normalizePositiveInteger(
            timeBudget
        ) ||
        normalizePositiveInteger(
            sessionContext.timeBudgetMinutes
        );

    if (budget) {
        result.maxTimeMinutes =
            clampInteger(
                budget,
                1,
                180
            );
    }

    const sameNodeLimit =
        normalizePositiveInteger(
            adaptiveRules
                ?.antiLoopRules
                ?.sameNodeSameActionLimit
        );

    if (sameNodeLimit) {
        result.maxSameNodeActions =
            clampInteger(
                sameNodeLimit,
                1,
                5
            );
    }

    const failureLimit =
        normalizePositiveInteger(
            adaptiveRules
                ?.antiLoopRules
                ?.sameFailureSignatureLimit
        );

    if (failureLimit) {
        result.maxSameFailureSignature =
            clampInteger(
                failureLimit,
                1,
                5
            );
    }

    return result;
}

/**
 * =========================================================
 * PRIORITY
 * =========================================================
 */

function calculatePriority({
    targetState,
    prerequisiteResult,
    failureResult,
    sessionContext,
    adaptiveRules,
    learningMode
}) {
    const configured =
        adaptiveRules
            ?.priorityRules
            ?.priorityFactors ||
        DEFAULT_PRIORITY_FACTORS;

    const knowledgePriority =
        resolveKnowledgePriority(
            targetState,
            sessionContext,
            configured
        );

    const weaknessBonus =
        targetState.status === "weak"
            ? numericRule(
                configured.weakness,
                DEFAULT_PRIORITY_FACTORS.weakness
            )
            : 0;

    const prerequisiteBonus =
        prerequisiteResult.blocked
            ? numericRule(
                configured.prerequisiteBlocking,
                DEFAULT_PRIORITY_FACTORS
                    .prerequisiteBlocking
            )
            : 0;

    const examRelevance =
        resolveBooleanOrNumericBonus(
            sessionContext.examRelevance,
            configured.examRelevance
        );

    const dependencyCentrality =
        resolveCentralityBonus({
            value:
                sessionContext.dependencyCentrality,
            configured,
            adaptiveRules
        });

    const recentFailureBonus =
        failureResult.repeatedCount > 0
            ? numericRule(
                configured.recentFailure,
                DEFAULT_PRIORITY_FACTORS
                    .recentFailure
            )
            : 0;

    const staleBonus =
        sessionContext.staleKnowledge === true
            ? numericRule(
                configured.staleKnowledge,
                DEFAULT_PRIORITY_FACTORS
                    .staleKnowledge
            )
            : 0;

    const transferGapBonus =
        sessionContext.transferGap === true
            ? numericRule(
                configured.transferGap,
                DEFAULT_PRIORITY_FACTORS
                    .transferGap
            )
            : 0;

    const factors = {
        knowledgePriority,
        weaknessBonus,
        prerequisiteBonus,
        examRelevance,
        dependencyCentrality,
        recentFailureBonus,
        staleBonus,
        transferGapBonus
    };

    /*
     * ON_THI changes priority/selection strategy,
     * never mastery definition.
     *
     * V1 does not invent extra numerical weights.
     * It uses only configured factors.
     */
    const score =
        Object.values(factors)
            .reduce(
                (sum, value) =>
                    sum + safeNumber(value),
                0
            );

    return {
        score: round(score, 4),
        factors
    };
}

function resolveKnowledgePriority(
    targetState,
    sessionContext,
    configured
) {
    const explicit =
        normalizeNonNegativeNumber(
            sessionContext.knowledgePriority
        );

    if (explicit !== null) {
        return explicit;
    }

    const priority =
        String(
            sessionContext.nodePriority ||
            targetState.priority ||
            ""
        ).toUpperCase();

    if (priority === "P1") {
        return numericRule(
            configured.P1,
            DEFAULT_PRIORITY_FACTORS.P1
        );
    }

    if (priority === "P2") {
        return numericRule(
            configured.P2,
            DEFAULT_PRIORITY_FACTORS.P2
        );
    }

    return 0;
}

/**
 * =========================================================
 * REASON
 * =========================================================
 */

function buildReason({
    decision,
    targetState,
    prerequisiteResult,
    failureResult,
    learningMode
}) {
    const codes = [];

    const masteryCode =
        REASON_CODE_BY_MASTERY[
        targetState.mastery
        ];

    if (masteryCode) {
        codes.push(masteryCode);
    }

    if (targetState.status === "weak") {
        codes.push("STATUS_WEAK");
    }

    if (targetState.status === "mastered") {
        codes.push("STATUS_MASTERED");
    }

    if (targetState.status === "stable") {
        codes.push("STATUS_STABLE");
    }

    if (prerequisiteResult.blocked) {
        codes.push(
            "PREREQUISITE_GAP",
            "DEPENDENCY_BLOCK"
        );
    }

    if (
        failureResult.signature &&
        REASON_CODE_BY_FAILURE[
        failureResult.signature
        ]
    ) {
        codes.push(
            REASON_CODE_BY_FAILURE[
            failureResult.signature
            ]
        );
    }

    if (decision.action === "RETEST") {
        codes.push("RETEST_DUE");
    }

    if (decision.action === "REVIEW") {
        codes.push("REVIEW_DUE");
    }

    if (learningMode === "HOC_NHANH") {
        codes.push("HOC_NHANH_MODE");
    }

    if (learningMode === "HOC_SAU") {
        codes.push("HOC_SAU_MODE");
    }

    if (learningMode === "ON_THI") {
        codes.push("ON_THI_MODE");
    }

    const result = {
        primary: decision.reason,
        codes: uniqueStrings(codes),
        masteryLevel: targetState.mastery,
        status: normalizeSchemaStatus(
            targetState.status
        )
    };

    if (failureResult.signature) {
        result.failureSignature =
            failureResult.signature;
    }

    if (failureResult.sourceNodeId) {
        result.sourceNodeId =
            failureResult.sourceNodeId;
    }

    if (failureResult.metaSkillId) {
        result.metaSkillId =
            failureResult.metaSkillId;
    }

    return result;
}

/**
 * =========================================================
 * SOURCE
 * =========================================================
 */

function buildSource({
    adaptiveRules,
    adaptivePaths,
    learningMode,
    sessionContext
}) {
    const result = {
        engine: ENGINE_NAME,

        rulesVersion:
            normalizeNonEmptyString(
                adaptiveRules?.schemaVersion
            ) ||
            normalizeNonEmptyString(
                adaptiveRules
                    ?.versioning
                    ?.currentVersion
            ) ||
            "1.0.0",

        pathsVersion:
            normalizeNonEmptyString(
                adaptivePaths?.schemaVersion
            ) ||
            "1.0.0",

        learningMode
    };

    const masteryUpdateId =
        normalizeNonEmptyString(
            sessionContext.masteryUpdateId
        );

    if (masteryUpdateId) {
        result.masteryUpdateId =
            masteryUpdateId;
    }

    return result;
}

/**
 * =========================================================
 * FALLBACK
 * =========================================================
 */

function buildFallback({
    decision,
    targetNodeId,
    prerequisiteResult
}) {
    if (decision.action === "REMEDIATE") {
        return {
            action: "LEARN",
            reason:
                "Nếu remediation chuyên biệt chưa khả dụng, quay về củng cố kiến thức nguồn.",
            targetNodeIds: [
                prerequisiteResult
                    .weakestBlockingNodeId ||
                targetNodeId
            ]
        };
    }

    if (decision.action === "CHALLENGE") {
        return {
            action: "PRACTICE",
            reason:
                "Nếu challenge phù hợp chưa khả dụng, tiếp tục practice trên cùng node.",
            targetNodeIds: [
                targetNodeId
            ]
        };
    }

    if (decision.action === "RETEST") {
        return {
            action: "REVIEW",
            reason:
                "Nếu retest phù hợp chưa khả dụng, thực hiện review ngắn.",
            targetNodeIds: [
                targetNodeId
            ]
        };
    }

    return null;
}

/**
 * =========================================================
 * STATE NORMALIZATION
 * =========================================================
 */

function normalizeMasteryState(
    masteryState,
    targetNodeId
) {
    let raw = masteryState;

    /*
     * Support:
     *
     * masteryState = single node state
     *
     * OR
     *
     * masteryState = {
     *   K283: {...}
     * }
     *
     * OR
     *
     * masteryState = {
     *   knowledge: {
     *      K283: {...}
     *   }
     * }
     */
    if (
        masteryState &&
        typeof masteryState === "object"
    ) {
        if (
            masteryState.knowledge &&
            masteryState.knowledge[targetNodeId]
        ) {
            raw =
                masteryState.knowledge[
                targetNodeId
                ];
        } else if (
            masteryState[targetNodeId]
        ) {
            raw =
                masteryState[targetNodeId];
        }
    }

    raw =
        raw &&
            typeof raw === "object"
            ? raw
            : {};

    return {
        ...raw,

        nodeId:
            normalizeNonEmptyString(
                raw.nodeId
            ) ||
            targetNodeId,

        mastery:
            normalizeMasteryLevel(
                raw.mastery
            ) ||
            "M0",

        status:
            normalizeStatus(
                raw.status
            ) ||
            "developing",

        evidence:
            normalizeEvidenceObject(
                raw.evidence
            ),

        confidence:
            raw.confidence &&
                typeof raw.confidence === "object"
                ? { ...raw.confidence }
                : {
                    level: "low",
                    score: 0
                },

        failure:
            raw.failure &&
                typeof raw.failure === "object"
                ? { ...raw.failure }
                : null,

        failureSummary:
            raw.failureSummary &&
                typeof raw.failureSummary === "object"
                ? { ...raw.failureSummary }
                : {}
    };
}

function normalizeSessionContext(
    sessionContext
) {
    if (
        !sessionContext ||
        typeof sessionContext !== "object"
    ) {
        return {};
    }

    return {
        ...sessionContext
    };
}

/**
 * =========================================================
 * RETEST / REVIEW
 * =========================================================
 */

function resolveRetestDue(
    targetState,
    sessionContext
) {
    if (
        typeof sessionContext.retestDue === "boolean"
    ) {
        return sessionContext.retestDue;
    }

    if (
        typeof targetState.retestDue === "boolean"
    ) {
        return targetState.retestDue;
    }

    if (
        typeof targetState.retest?.due === "boolean"
    ) {
        return targetState.retest.due;
    }

    return false;
}

function resolveReviewDue(
    targetState,
    sessionContext
) {
    if (
        typeof sessionContext.reviewDue === "boolean"
    ) {
        return sessionContext.reviewDue;
    }

    if (
        typeof targetState.reviewDue === "boolean"
    ) {
        return targetState.reviewDue;
    }

    if (
        typeof targetState.review?.due === "boolean"
    ) {
        return targetState.review.due;
    }

    return false;
}

function isActiveRemediation(
    sessionContext
) {
    return (
        sessionContext.activeRemediation === true ||
        sessionContext.currentPathStage ===
        "REMEDIATE" ||
        sessionContext.currentPathStage ===
        "MINI_PRACTICE" ||
        sessionContext.currentPathStage ===
        "MINI_PROBE"
    );
}

/**
 * =========================================================
 * KNOWLEDGE LOOKUPS
 * =========================================================
 */

function findKnowledgeNode(
    knowledgeMap,
    nodeId
) {
    if (
        !knowledgeMap ||
        typeof knowledgeMap !== "object"
    ) {
        return null;
    }

    if (
        knowledgeMap.nodes &&
        !Array.isArray(knowledgeMap.nodes) &&
        knowledgeMap.nodes[nodeId]
    ) {
        return knowledgeMap.nodes[nodeId];
    }

    if (Array.isArray(knowledgeMap.nodes)) {
        return (
            knowledgeMap.nodes.find(
                (node) =>
                    node?.id === nodeId ||
                    node?.nodeId === nodeId
            ) || null
        );
    }

    if (knowledgeMap[nodeId]) {
        return knowledgeMap[nodeId];
    }

    return null;
}

function lookupNodeMastery(
    nodeId,
    masteryState,
    sessionContext
) {
    const explicit =
        sessionContext
            ?.prerequisiteMastery
        ?.[nodeId];

    const explicitLevel =
        normalizeMasteryLevel(explicit);

    if (explicitLevel) {
        return explicitLevel;
    }

    const fromKnowledge =
        masteryState
            ?.knowledge
            ?.[nodeId]
            ?.mastery;

    const knowledgeLevel =
        normalizeMasteryLevel(
            fromKnowledge
        );

    if (knowledgeLevel) {
        return knowledgeLevel;
    }

    const direct =
        masteryState
            ?.[nodeId]
            ?.mastery;

    const directLevel =
        normalizeMasteryLevel(direct);

    if (directLevel) {
        return directLevel;
    }

    return "M0";
}

/**
 * =========================================================
 * QUESTION HELPERS
 * =========================================================
 */

function extractRecentQuestionIds(
    recentResults
) {
    if (!Array.isArray(recentResults)) {
        return [];
    }

    return uniqueStrings(
        recentResults
            .map(
                (result) =>
                    result?.questionId ||
                    result?.question?.id
            )
            .filter(Boolean)
    );
}

function choosePreferredDifficulty(
    difficulties
) {
    if (!Array.isArray(difficulties)) {
        return "D1";
    }

    if (difficulties.includes("D3")) {
        return "D3";
    }

    return (
        difficulties[
        Math.floor(
            difficulties.length / 2
        )
        ] ||
        difficulties[0] ||
        "D1"
    );
}

/**
 * =========================================================
 * PRIORITY HELPERS
 * =========================================================
 */

function resolveBooleanOrNumericBonus(
    value,
    configured
) {
    const numeric =
        normalizeNonNegativeNumber(value);

    if (numeric !== null) {
        return numeric;
    }

    if (value === true) {
        return safeNumber(configured);
    }

    return 0;
}

function resolveCentralityBonus({
    value,
    configured,
    adaptiveRules
}) {
    const numeric =
        normalizeNonNegativeNumber(value);

    if (numeric !== null) {
        return numeric;
    }

    const level =
        typeof value === "string"
            ? value.toLowerCase()
            : null;

    const bonusLevels =
        adaptiveRules
            ?.dependencyCentralityRules
            ?.bonusLevels;

    if (
        level &&
        bonusLevels &&
        typeof bonusLevels[level] === "number"
    ) {
        return Math.max(
            0,
            bonusLevels[level]
        );
    }

    if (value === true) {
        return numericRule(
            configured.dependencyCentrality,
            DEFAULT_PRIORITY_FACTORS
                .dependencyCentrality
        );
    }

    return 0;
}

/**
 * =========================================================
 * NORMALIZATION
 * =========================================================
 */

function normalizeLearningMode(value) {
    return LEARNING_MODES.includes(value)
        ? value
        : "HOC_SAU";
}

function normalizeAction(value) {
    return ACTIONS.includes(value)
        ? value
        : null;
}

function normalizeMasteryLevel(value) {
    return MASTERY_LEVELS.includes(value)
        ? value
        : null;
}

function normalizeStatus(value) {
    const allowed = [
        "not_started",
        "developing",
        "mastered",
        "stable",
        "weak"
    ];

    return allowed.includes(value)
        ? value
        : null;
}

/*
 * next-action.schema.json does not contain "not_started".
 * For reason.status, map it to developing.
 */
function normalizeSchemaStatus(value) {
    if (value === "not_started") {
        return "developing";
    }

    const allowed = [
        "developing",
        "mastered",
        "stable",
        "weak"
    ];

    return allowed.includes(value)
        ? value
        : "developing";
}

function normalizeDependencyType(value) {
    return ["D1", "D2", "D3"].includes(value)
        ? value
        : "D1";
}

function normalizeFailureSignature(value) {
    return FAILURE_SIGNATURES.includes(value)
        ? value
        : null;
}

function normalizeDifficultyArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return uniqueStrings(value).filter(
        (difficulty) =>
            [
                "D1",
                "D2",
                "D3",
                "D4",
                "D5"
            ].includes(difficulty)
    );
}

function normalizeEvidenceArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return uniqueStrings(value).filter(
        (dimension) =>
            [
                "know",
                "explain",
                "apply",
                "transfer"
            ].includes(dimension)
    );
}

function normalizeEvidenceObject(value) {
    const raw =
        value &&
            typeof value === "object"
            ? value
            : {};

    return {
        know:
            clamp01(raw.know),
        explain:
            clamp01(raw.explain),
        apply:
            clamp01(raw.apply),
        transfer:
            clamp01(raw.transfer)
    };
}

function normalizePathStage(value) {
    const allowed = [
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
        "CROSS_NODE",
        "RETURN",
        "SESSION_COMPLETE"
    ];

    return allowed.includes(value)
        ? value
        : null;
}

function isAllowedQuestionType(value) {
    return [
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
    ].includes(value);
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
        return new Date(now).toISOString();
    }

    if (
        typeof now === "number" &&
        Number.isFinite(now)
    ) {
        return new Date(now).toISOString();
    }

    return new Date().toISOString();
}

function createDecisionId({
    studentId,
    nodeId,
    timestamp
}) {
    const safeTimestamp =
        timestamp
            .replaceAll(":", "")
            .replaceAll(".", "")
            .replaceAll("-", "");

    return [
        "AD",
        sanitizeIdPart(studentId),
        sanitizeIdPart(nodeId),
        safeTimestamp
    ].join("-");
}

function sanitizeIdPart(value) {
    return String(value || "unknown")
        .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );
}

/**
 * =========================================================
 * GENERIC HELPERS
 * =========================================================
 */

function inferNodeId(masteryState) {
    if (
        masteryState &&
        typeof masteryState === "object"
    ) {
        return (
            normalizeNonEmptyString(
                masteryState.nodeId
            ) ||
            normalizeNonEmptyString(
                masteryState.primaryNodeId
            )
        );
    }

    return null;
}

function masteryRank(level) {
    return MASTERY_LEVELS.indexOf(level);
}

function uniqueStrings(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [
        ...new Set(
            values.filter(
                (value) =>
                    typeof value === "string" &&
                    value.length > 0
            )
        )
    ];
}

function normalizeNonEmptyString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0
        ? trimmed
        : null;
}

function normalizeNonNegativeInteger(value) {
    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number < 0
    ) {
        return 0;
    }

    return Math.floor(number);
}

function normalizePositiveInteger(value) {
    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return null;
    }

    return Math.floor(number);
}

function normalizeNonNegativeNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        typeof value === "boolean"
    ) {
        return null;
    }

    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number < 0
    ) {
        return null;
    }

    return number;
}

function numericRule(
    value,
    fallback
) {
    return (
        normalizeNonNegativeNumber(value) ??
        fallback
    );
}

function safeNumber(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

function clamp01(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(1, number)
    );
}

function clampInteger(
    value,
    min,
    max
) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.max(
        min,
        Math.min(
            max,
            Math.floor(number)
        )
    );
}

function round(
    value,
    decimals = 4
) {
    const factor =
        10 ** decimals;

    return (
        Math.round(
            value * factor
        ) / factor
    );
}