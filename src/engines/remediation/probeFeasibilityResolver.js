import { selectQuestion } from "../question/questionSelector.js";

export const PROBE_FEASIBILITY_RESOLVER_VERSION = "1.0.0";

const DIFFICULTIES = new Set(["D1", "D2", "D3", "D4", "D5"]);
const EVIDENCE_DIMENSIONS = new Set(["know", "explain", "apply", "transfer"]);
const QUESTION_TYPES = new Set([
    "mcq", "multi_select", "true_false", "matching", "ordering",
    "fill_blank", "short_answer", "numeric", "data_analysis",
    "experiment", "sequence", "open_response"
]);

function infeasible(reasonCode) {
    return { status: "INFEASIBLE", reasonCode, eligibleQuestionIds: [] };
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateBankIdentity(bankIdentity, questionBank) {
    if (
        !isRecord(bankIdentity) ||
        !isRecord(questionBank) ||
        typeof bankIdentity.bankId !== "string" ||
        !bankIdentity.bankId.trim() ||
        typeof bankIdentity.version !== "string" ||
        !bankIdentity.version.trim() ||
        questionBank.bankId !== bankIdentity.bankId ||
        questionBank.version !== bankIdentity.version
    ) {
        return false;
    }
    return true;
}

function uniqueStrings(values) {
    return [...new Set(values)];
}

/**
 * Resolve whether a proposed probe has at least one question accepted by the
 * production selector. This inspects candidates only; it never submits or
 * mutates the caller's probe, bank, or state.
 */
export function resolveProbeFeasibility({
    proposedProbe,
    targetNodeId,
    bankIdentity,
    questionBank,
    selectorConstraints = {}
} = {}) {
    if (!validateBankIdentity(bankIdentity, questionBank)) {
        return infeasible("BANK_IDENTITY_MISMATCH");
    }
    if (
        typeof targetNodeId !== "string" ||
        !targetNodeId.trim() ||
        questionBank.primaryNode !== targetNodeId ||
        !Array.isArray(questionBank.questions)
    ) {
        return infeasible("UNKNOWN_TARGET");
    }

    if (
        !isRecord(proposedProbe) ||
        (proposedProbe.targetNodeId !== undefined &&
            proposedProbe.targetNodeId !== targetNodeId) ||
        !DIFFICULTIES.has(proposedProbe.difficulty) ||
        !Array.isArray(proposedProbe.questionTypes) ||
        proposedProbe.questionTypes.length === 0 ||
        proposedProbe.questionTypes.some(type => !QUESTION_TYPES.has(type))
    ) {
        return infeasible("INVALID_PROBE_CONSTRAINTS");
    }

    const criteria = isRecord(proposedProbe.successCriteria)
        ? proposedProbe.successCriteria
        : {};
    const requiredDimension = criteria.requiredEvidenceDimension;
    if (requiredDimension !== undefined && !EVIDENCE_DIMENSIONS.has(requiredDimension)) {
        return infeasible("INVALID_PROBE_CONSTRAINTS");
    }

    const existingTypes = selectorConstraints.questionTypes;
    if (
        existingTypes !== undefined &&
        (!Array.isArray(existingTypes) ||
            existingTypes.some(type => typeof type !== "string" || !QUESTION_TYPES.has(type)))
    ) {
        return infeasible("INVALID_SELECTOR_CONSTRAINTS");
    }
    const questionTypes = existingTypes?.length
        ? proposedProbe.questionTypes.filter(type => existingTypes.includes(type))
        : [...proposedProbe.questionTypes];
    if (questionTypes.length === 0) {
        return infeasible("QUESTION_TYPE_CONFLICT");
    }

    const existingDimensions = selectorConstraints.evidenceDimensions ?? [];
    if (
        !Array.isArray(existingDimensions) ||
        existingDimensions.some(dimension => !EVIDENCE_DIMENSIONS.has(dimension))
    ) {
        return infeasible("INVALID_SELECTOR_CONSTRAINTS");
    }
    const evidenceDimensions = requiredDimension === undefined
        ? [...existingDimensions]
        : existingDimensions.length
            ? existingDimensions.filter(dimension => dimension === requiredDimension)
            : [requiredDimension];
    if (requiredDimension !== undefined && evidenceDimensions.length === 0) {
        return infeasible("EVIDENCE_DIMENSION_CONFLICT");
    }

    const difficultyRange = selectorConstraints.difficulty ?? {};
    const rank = value => Number(value.slice(1));
    if (
        !isRecord(difficultyRange) ||
        (difficultyRange.min !== undefined && !DIFFICULTIES.has(difficultyRange.min)) ||
        (difficultyRange.max !== undefined && !DIFFICULTIES.has(difficultyRange.max)) ||
        (difficultyRange.min && difficultyRange.max &&
            rank(difficultyRange.min) > rank(difficultyRange.max))
    ) {
        return infeasible("INVALID_SELECTOR_CONSTRAINTS");
    }
    if (
        (difficultyRange.min && rank(proposedProbe.difficulty) < rank(difficultyRange.min)) ||
        (difficultyRange.max && rank(proposedProbe.difficulty) > rank(difficultyRange.max))
    ) {
        return infeasible("DIFFICULTY_CONFLICT");
    }

    const selectorDecision = {
        decisionId: "PROBE-FEASIBILITY",
        action: "REMEDIATE",
        target: { type: "KNOWLEDGE_NODE", primaryNodeId: targetNodeId, nodeIds: [targetNodeId] },
        selectionCriteria: {
            ...selectorConstraints,
            questionTypes,
            evidenceDimensions,
            difficulty: {
                min: proposedProbe.difficulty,
                max: proposedProbe.difficulty,
                preferred: proposedProbe.difficulty
            },
            excludeQuestionIds: uniqueStrings(selectorConstraints.excludeQuestionIds ?? [])
        },
        constraints: {},
        path: { current: "MINI_PROBE", next: null },
        fallback: null
    };
    const excluded = new Set(selectorDecision.selectionCriteria.excludeQuestionIds);
    const eligibleQuestionIds = [];

    while (eligibleQuestionIds.length <= questionBank.questions.length) {
        const selection = selectQuestion({
            adaptiveDecision: selectorDecision,
            questionBanks: [questionBank],
            history: []
        });
        if (selection.status !== "SELECTED") break;
        const questionId = selection.selected.questionId;
        if (excluded.has(questionId)) break;
        eligibleQuestionIds.push(questionId);
        excluded.add(questionId);
        selectorDecision.selectionCriteria.excludeQuestionIds.push(questionId);
    }

    if (eligibleQuestionIds.length === 0) {
        return infeasible("NO_ELIGIBLE_BANK_QUESTION");
    }
    return {
        status: "FEASIBLE",
        reasonCode: "ELIGIBLE_QUESTIONS_FOUND",
        eligibleQuestionIds: eligibleQuestionIds.sort((a, b) => a.localeCompare(b))
    };
}
