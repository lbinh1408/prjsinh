import { buildRemediationPlan } from "./remediationEngine.js";
import { resolveProbeFeasibility } from "./probeFeasibilityResolver.js";
import {
    ProbeAuthoringPolicyError,
    resolveProbeAuthoringPolicy
} from "./probeAuthoringPolicyResolver.js";

function infeasible({
    reasonCode,
    targetNodeId,
    bankIdentity,
    triggerAttemptId
}) {
    return {
        status: "INFEASIBLE",
        reasonCode,
        targetNodeId: typeof targetNodeId === "string" ? targetNodeId : null,
        bankId: typeof bankIdentity?.bankId === "string" ? bankIdentity.bankId : null,
        bankVersion: typeof bankIdentity?.version === "string" ? bankIdentity.version : null,
        triggerAttemptId: typeof triggerAttemptId === "string" ? triggerAttemptId : null
    };
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function policyError({
    reasonCode,
    targetNodeId,
    bankIdentity,
    triggerAttemptId,
    policyProvenance
}) {
    return {
        status: "POLICY_ERROR",
        reasonCode,
        targetNodeId: typeof targetNodeId === "string" ? targetNodeId : null,
        bankId: typeof bankIdentity?.bankId === "string" ? bankIdentity.bankId : null,
        bankVersion: typeof bankIdentity?.version === "string" ? bankIdentity.version : null,
        triggerAttemptId: typeof triggerAttemptId === "string" ? triggerAttemptId : null,
        ...(policyProvenance ? { policyProvenance } : {})
    };
}

function policyProvenance(resolution) {
    return {
        identity: resolution.policyIdentity,
        canonicalPolicy: resolution.canonicalPolicy
    };
}

/**
 * Generate using the legacy RemediationEngine, then expose the plan only if
 * the exact proposed probe is feasible against the identified target bank.
 * This adapter is pure and does not persist or commit the generated plan.
 */
export function buildFeasibilityAwareRemediationPlan({
    planInput,
    targetNodeId,
    bankIdentity,
    questionBank,
    selectorConstraints = {},
    probeAuthoringPolicy
} = {}) {
    const triggerAttemptId = planInput?.attempt?.attemptId;

    if (!isRecord(planInput) || !isRecord(planInput.attempt) ||
        typeof triggerAttemptId !== "string" || !triggerAttemptId.trim() ||
        typeof planInput.now !== "string" ||
        !Number.isFinite(Date.parse(planInput.now)) ||
        typeof targetNodeId !== "string" || !targetNodeId.trim() ||
        !isRecord(bankIdentity) ||
        typeof bankIdentity.bankId !== "string" || !bankIdentity.bankId.trim() ||
        typeof bankIdentity.version !== "string" || !bankIdentity.version.trim() ||
        !isRecord(questionBank) || !isRecord(selectorConstraints)) {
        return infeasible({
            reasonCode: "INVALID_INPUT",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
    }

    if (
        questionBank.bankId !== bankIdentity.bankId ||
        questionBank.version !== bankIdentity.version
    ) {
        return infeasible({
            reasonCode: "BANK_IDENTITY_MISMATCH",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
    }

    let generatedPlan;
    try {
        generatedPlan = buildRemediationPlan(planInput);
    } catch {
        return infeasible({
            reasonCode: "PLAN_GENERATION_FAILED",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
    }

    if (generatedPlan?.probe?.targetNodeId !== targetNodeId) {
        return infeasible({
            reasonCode: "PROBE_TARGET_MISMATCH",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
    }

    let plan = generatedPlan;
    let provenance;
    if (probeAuthoringPolicy !== undefined && probeAuthoringPolicy !== null) {
        let resolution;
        try {
            resolution = resolveProbeAuthoringPolicy({
                policy: probeAuthoringPolicy,
                targetNodeId: generatedPlan.probe.targetNodeId,
                failureSignature: generatedPlan.trigger?.failureSignature
            });
        } catch (error) {
            return policyError({
                reasonCode: error instanceof ProbeAuthoringPolicyError
                    ? error.reasonCode
                    : "POLICY_RESOLUTION_FAILED",
                targetNodeId,
                bankIdentity,
                triggerAttemptId
            });
        }

        provenance = policyProvenance(resolution);
        const authoredTypes = resolution.constraints.questionTypes;
        const questionTypes = authoredTypes === null
            ? [...generatedPlan.probe.questionTypes]
            : generatedPlan.probe.questionTypes.filter(type => authoredTypes.includes(type));
        if (questionTypes.length === 0) {
            return policyError({
                reasonCode: "QUESTION_TYPE_CONFLICT",
                targetNodeId,
                bankIdentity,
                triggerAttemptId,
                policyProvenance: provenance
            });
        }

        plan = structuredClone(generatedPlan);
        plan.probe.difficulty = resolution.constraints.difficulty;
        plan.probe.successCriteria.requiredEvidenceDimension =
            resolution.constraints.evidenceDimension;
        plan.probe.questionTypes = questionTypes;
    }

    let feasibility;
    try {
        feasibility = resolveProbeFeasibility({
            proposedProbe: plan.probe,
            targetNodeId,
            bankIdentity,
            questionBank,
            selectorConstraints
        });
    } catch {
        return infeasible({
            reasonCode: "FEASIBILITY_RESOLUTION_FAILED",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
    }

    if (feasibility?.status !== "FEASIBLE") {
        const result = infeasible({
            reasonCode: typeof feasibility?.reasonCode === "string"
                ? feasibility.reasonCode
                : "FEASIBILITY_RESOLUTION_FAILED",
            targetNodeId,
            bankIdentity,
            triggerAttemptId
        });
        return provenance ? { ...result, policyProvenance: provenance } : result;
    }

    return {
        status: "FEASIBLE",
        plan,
        ...(provenance ? { policyProvenance: provenance } : {})
    };
}
