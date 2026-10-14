const EVIDENCE_DIMENSIONS = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);

const MINIMUM_RESULTS = new Set([
    "correct",
    "partial_or_better",
    "mastery_evidence_improved"
]);

function result(isProbe, passed, reason) {
    return { isProbe, passed, reason };
}

function isRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateSuccessCriteria(criteria) {
    if (!isRecord(criteria)) {
        return "MALFORMED_SUCCESS_CRITERIA";
    }

    const allowedKeys = new Set([
        "minimumResult",
        "requiredEvidenceDimension",
        "minimumEvidence"
    ]);

    if (
        Object.keys(criteria).some(key => !allowedKeys.has(key)) ||
        !Object.hasOwn(criteria, "minimumResult") ||
        !MINIMUM_RESULTS.has(criteria.minimumResult) ||
        (criteria.requiredEvidenceDimension !== undefined &&
            !EVIDENCE_DIMENSIONS.has(criteria.requiredEvidenceDimension)) ||
        (criteria.minimumEvidence !== undefined &&
            (typeof criteria.minimumEvidence !== "number" ||
                !Number.isFinite(criteria.minimumEvidence) ||
                criteria.minimumEvidence < 0 ||
                criteria.minimumEvidence > 1))
    ) {
        return "MALFORMED_SUCCESS_CRITERIA";
    }

    return null;
}

function hasImprovedMasteryEvidence(masteryUpdate, dimension) {
    const before = masteryUpdate?.previous?.evidence;
    const after = masteryUpdate?.current?.evidence;
    const dimensions = dimension ? [dimension] : [...EVIDENCE_DIMENSIONS];

    if (!isRecord(before) || !isRecord(after)) {
        return false;
    }

    return dimensions.some(key =>
        typeof before[key] === "number" &&
        Number.isFinite(before[key]) &&
        typeof after[key] === "number" &&
        Number.isFinite(after[key]) &&
        after[key] > before[key]
    );
}

/**
 * Evaluate whether an Attempt is an identified probe for the active remediation
 * plan and whether it satisfies the plan's configured success criteria.
 */
export function evaluateProbeOutcome({ attempt, remediationPlan, masteryUpdate } = {}) {
    const context = isRecord(attempt?.context) ? attempt.context : null;
    const isProbe = context?.pathStage === "MINI_PROBE";

    if (!isProbe) {
        return result(false, false, "NOT_A_PROBE");
    }

    if (context.action !== "REMEDIATE") {
        return result(true, false, "INVALID_PROBE_ACTION");
    }

    if (
        !isRecord(remediationPlan) ||
        remediationPlan.probe?.required !== true ||
        remediationPlan.probe?.type !== "MINI_PROBE"
    ) {
        return result(true, false, "INVALID_ACTIVE_PROBE");
    }

    const planId = remediationPlan.remediationId;
    const targetNodeId = remediationPlan.probe.targetNodeId;
    if (
        typeof planId !== "string" || !planId.trim() ||
        typeof targetNodeId !== "string" || !targetNodeId.trim() ||
        typeof context.remediationId !== "string" || !context.remediationId.trim() ||
        typeof context.nodeId !== "string" || !context.nodeId.trim()
    ) {
        return result(true, false, "MISSING_PROBE_IDENTITY");
    }

    if (context.remediationId !== planId) {
        return result(true, false, "REMEDIATION_ID_MISMATCH");
    }

    if (context.nodeId !== targetNodeId) {
        return result(true, false, "PROBE_TARGET_MISMATCH");
    }

    const criteria = remediationPlan.probe.successCriteria;
    const criteriaError = validateSuccessCriteria(criteria);
    if (criteriaError) {
        return result(true, false, criteriaError);
    }

    const attemptResult = attempt?.result;
    const resultPassed =
        criteria.minimumResult === "mastery_evidence_improved"
            ? hasImprovedMasteryEvidence(masteryUpdate, criteria.requiredEvidenceDimension)
            : criteria.minimumResult === "correct"
                ? attemptResult === "correct"
                : attemptResult === "correct" || attemptResult === "partial";

    if (!resultPassed) {
        return result(
            true,
            false,
            criteria.minimumResult === "mastery_evidence_improved"
                ? "MASTERY_EVIDENCE_NOT_IMPROVED"
                : "MINIMUM_RESULT_NOT_MET"
        );
    }

    if (criteria.requiredEvidenceDimension !== undefined) {
        if (!isRecord(attempt?.evidence)) {
            return result(true, false, "MISSING_EVIDENCE");
        }
        if (attempt.evidence.primaryDimension !== criteria.requiredEvidenceDimension) {
            return result(true, false, "EVIDENCE_DIMENSION_NOT_MET");
        }
    }

    if (criteria.minimumEvidence !== undefined) {
        const evidenceStrength = masteryUpdate
            ? masteryUpdate?.evidence?.evidenceStrength
            : attempt?.evidence?.evidenceStrength;
        if (
            typeof evidenceStrength !== "number" ||
            !Number.isFinite(evidenceStrength)
        ) {
            return result(true, false, "MISSING_EVIDENCE_STRENGTH");
        }
        if (evidenceStrength < 0 || evidenceStrength > 1) {
            return result(true, false, "INVALID_EVIDENCE_STRENGTH");
        }
        if (evidenceStrength < criteria.minimumEvidence) {
            return result(true, false, "MINIMUM_EVIDENCE_NOT_MET");
        }
    }

    return result(true, true, "SUCCESS_CRITERIA_MET");
}
