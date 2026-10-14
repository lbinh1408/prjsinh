/**
 * Bootstrap adaptive initial decision from verified learning state,
 * or fallback to canonical initial fixture if no previous progress exists.
 */
import { decideNextAction } from "./src/engines/adaptive/adaptiveEngine.js";
import { decodeCheckpoint } from "./src/persistence/checkpointCodec.js";
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from "./src/engines/orchestration/remediationStopFingerprint.js";
import {
    PROBE_FEASIBILITY_RESOLVER_VERSION
} from "./src/engines/remediation/probeFeasibilityResolver.js";
import {
    resolveProbeAuthoringPolicy
} from "./src/engines/remediation/probeAuthoringPolicyResolver.js";

function freezeStopResult(result) {
    if (result?.stop) {
        Object.freeze(result.stop);
    }
    return Object.freeze(result);
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCurrentConfig(config) {
    return isRecord(config) &&
        typeof config.learningMode === "string" &&
        Number.isFinite(config.timeBudget) &&
        (typeof config.clusterId === "string" || config.clusterId === null) &&
        (typeof config.lessonId === "string" || config.lessonId === null) &&
        (typeof config.contextId === "string" || config.contextId === null) &&
        Number.isSafeInteger(config.historyLimit) &&
        config.historyLimit > 0;
}

function computePolicyErrorFingerprint({
    stop,
    policy,
    dependencies,
    questionBank,
    config,
    selectorConstraints
}) {
    const signatures = Object.keys(policy.failureSignatureDefaults).sort();
    if (signatures.length === 0) throw new TypeError("Policy has no failure-signature defaults.");
    const resolution = resolveProbeAuthoringPolicy({
        policy,
        targetNodeId: stop.targetNodeId,
        failureSignature: signatures[0]
    });
    return computePolicyErrorFingerprintV1({
        resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
        targetNodeId: stop.targetNodeId,
        bankIdentity: {
            bankId: questionBank.bankId,
            version: questionBank.version
        },
        questionBank,
        selectorConstraints,
        config,
        policy: resolution.canonicalPolicy,
        generationRules: {
            adaptiveRules: dependencies.adaptiveRules,
            adaptivePaths: dependencies.adaptivePaths,
            knowledgeMap: dependencies.knowledgeMap,
            failureSignatures: dependencies.failureSignatures,
            remediationRules: dependencies.remediationRules
        }
    });
}

export function resolveBootstrapRemediationPolicyErrorStop({
    checkpoint,
    dependencies,
    questionBank,
    policy,
    targetNodeId = "K283",
    config,
    selectorConstraints = {}
} = {}) {
    let verifiedCheckpoint;
    try {
        verifiedCheckpoint = decodeCheckpoint(checkpoint);
    } catch {
        return freezeStopResult({ status: "FAIL_CLOSED", reasonCode: "INVALID_CHECKPOINT" });
    }
    const stop = verifiedCheckpoint.extensions?.remediationPolicyErrorStop;
    if (!stop) return freezeStopResult({ status: "NONE", stop: null });
    if (
        typeof targetNodeId !== "string" ||
        !targetNodeId.trim() ||
        stop.targetNodeId !== targetNodeId ||
        !isRecord(policy) ||
        !isRecord(dependencies) ||
        !isRecord(dependencies.knowledgeMap) ||
        !isRecord(dependencies.adaptiveRules) ||
        !isRecord(dependencies.adaptivePaths) ||
        !isRecord(dependencies.failureSignatures) ||
        !isRecord(dependencies.remediationRules) ||
        !isCurrentConfig(config) ||
        !isRecord(selectorConstraints) ||
        !isRecord(questionBank) ||
        typeof questionBank.bankId !== "string" ||
        !questionBank.bankId.trim() ||
        typeof questionBank.version !== "string" ||
        !questionBank.version.trim() ||
        questionBank.primaryNode !== targetNodeId ||
        !Array.isArray(questionBank.questions)
    ) {
        return freezeStopResult({
            status: "FAIL_CLOSED",
            reasonCode: "CURRENT_POLICY_BANK_OR_CONFIG_UNAVAILABLE",
            stop: structuredClone(stop)
        });
    }

    let currentFingerprint;
    try {
        currentFingerprint = computePolicyErrorFingerprint({
            stop,
            policy,
            dependencies,
            questionBank,
            config,
            selectorConstraints
        });
    } catch {
        return freezeStopResult({
            status: "FAIL_CLOSED",
            reasonCode: "CURRENT_POLICY_FINGERPRINT_INVALID",
            stop: structuredClone(stop)
        });
    }

    const fingerprintMatches =
        stop.bankId === questionBank.bankId &&
        stop.bankVersion === questionBank.version &&
        stop.configFingerprint === currentFingerprint;
    return freezeStopResult({
        status: fingerprintMatches ? "POLICY_ERROR" : "RETRY_ELIGIBLE",
        reasonCode: fingerprintMatches
            ? stop.reasonCode
            : "CONFIGURATION_FINGERPRINT_CHANGED",
        stop: structuredClone(stop),
        currentFingerprint
    });
}

export function resolveBootstrapRemediationGenerationStop({
    checkpoint,
    dependencies,
    questionBank,
    targetNodeId = "K283",
    config,
    selectorConstraints = {}
} = {}) {
    let verifiedCheckpoint;
    try {
        verifiedCheckpoint = decodeCheckpoint(checkpoint);
    } catch {
        return freezeStopResult({
            status: "FAIL_CLOSED",
            reasonCode: "INVALID_CHECKPOINT"
        });
    }

    const stop = verifiedCheckpoint.extensions?.remediationGenerationStop;
    if (!stop) {
        return freezeStopResult({ status: "NONE", stop: null });
    }
    if (
        typeof targetNodeId !== "string" ||
        !targetNodeId.trim() ||
        stop.targetNodeId !== targetNodeId ||
        !isRecord(dependencies) ||
        !isRecord(dependencies.knowledgeMap) ||
        !isRecord(dependencies.adaptiveRules) ||
        !isRecord(dependencies.adaptivePaths) ||
        !isRecord(dependencies.failureSignatures) ||
        !isRecord(dependencies.remediationRules) ||
        !isCurrentConfig(config) ||
        !isRecord(selectorConstraints) ||
        !questionBank ||
        typeof questionBank.bankId !== "string" ||
        !questionBank.bankId.trim() ||
        typeof questionBank.version !== "string" ||
        !questionBank.version.trim() ||
        questionBank.primaryNode !== targetNodeId ||
        !Array.isArray(questionBank.questions)
    ) {
        return freezeStopResult({
            status: "FAIL_CLOSED",
            reasonCode: "CURRENT_BANK_OR_CONFIG_UNAVAILABLE",
            stop: structuredClone(stop)
        });
    }

    const bankIdentity = {
        bankId: questionBank.bankId,
        version: questionBank.version
    };
    let currentFingerprint;
    try {
        currentFingerprint = computeLegacyInfeasibleFingerprintV1({
            resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
            targetNodeId,
            bankIdentity,
            questionBank,
            selectorConstraints,
            config,
            generationRules: {
                adaptiveRules: dependencies.adaptiveRules,
                adaptivePaths: dependencies.adaptivePaths,
                knowledgeMap: dependencies.knowledgeMap,
                failureSignatures: dependencies.failureSignatures,
                remediationRules: dependencies.remediationRules
            }
        });
    } catch {
        return freezeStopResult({
            status: "FAIL_CLOSED",
            reasonCode: "CURRENT_BANK_OR_CONFIG_INVALID",
            stop: structuredClone(stop)
        });
    }

    const fingerprintMatches =
        stop.bankId === bankIdentity.bankId &&
        stop.bankVersion === bankIdentity.version &&
        stop.configFingerprint === currentFingerprint;

    return freezeStopResult({
        status: fingerprintMatches
            ? "PROBE_GENERATION_INFEASIBLE"
            : "RETRY_ELIGIBLE",
        reasonCode: fingerprintMatches
            ? stop.reasonCode
            : "CONFIGURATION_FINGERPRINT_CHANGED",
        stop: structuredClone(stop),
        currentFingerprint
    });
}

export function restoreBootstrapRemediationGenerationStop(session, result) {
    if (
        !isRecord(session) ||
        !["PROBE_GENERATION_INFEASIBLE", "RETRY_ELIGIBLE"].includes(result?.status) ||
        !isRecord(result.stop) ||
        session.extensions !== undefined
    ) {
        throw new Error("K283_BOOTSTRAP_STOP_RESTORE_INVALID_STATE");
    }
    const stop = Object.freeze(structuredClone(result.stop));
    Object.defineProperty(session, "extensions", {
        value: Object.freeze({ remediationGenerationStop: stop }),
        enumerable: true,
        writable: false,
        configurable: false
    });
    return session;
}

export function restoreBootstrapRemediationPolicyErrorStop(session, result) {
    if (
        !isRecord(session) ||
        !["POLICY_ERROR", "RETRY_ELIGIBLE"].includes(result?.status) ||
        !isRecord(result.stop) ||
        session.extensions !== undefined
    ) {
        throw new Error("K283_BOOTSTRAP_POLICY_ERROR_STOP_RESTORE_INVALID_STATE");
    }
    const stop = Object.freeze(structuredClone(result.stop));
    Object.defineProperty(session, "extensions", {
        value: Object.freeze({ remediationPolicyErrorStop: stop }),
        enumerable: true,
        writable: false,
        configurable: false
    });
    session.currentSelection = null;
    session.currentQuestion = null;
    return session;
}

export function bootstrapAdaptiveDecision({
    studentState,
    dependencies,
    targetNodeId = "K283",
    clusterId = "C09",
    learningMode = "HOC_SAU",
    timeBudget = 60,
    sessionId = null,
    now = null
} = {}) {
    if (!studentState || !dependencies) {
        throw new Error("K283_BOOTSTRAP_INVALID_ARGUMENTS");
    }

    const nodeKnowledge = studentState?.knowledge?.[targetNodeId] ??
                          studentState?.mastery?.nodes?.[targetNodeId];
    // If student has no recorded history or mastery for target node, fallback to null (caller uses default)
    if (!nodeKnowledge || (!nodeKnowledge.mastery && !nodeKnowledge.level)) {
        return null;
    }

    const decision = decideNextAction({
        studentId: studentState?.student?.id ?? "STUDENT-LIVE-K283",
        targetNodeId,
        masteryState: studentState,
        knowledgeMap: dependencies.knowledgeMap,
        adaptiveRules: dependencies.adaptiveRules,
        adaptivePaths: dependencies.adaptivePaths,
        recentResults: [],
        sessionContext: {
            sessionId: sessionId ?? `BOOTSTRAP-${Date.now()}`,
            clusterId,
            targetNodeId
        },
        learningMode,
        timeBudget,
        now
    });

    if (decision && decision.selectionCriteria) {
        if (!Array.isArray(decision.selectionCriteria.excludeQuestionIds)) {
            decision.selectionCriteria.excludeQuestionIds = [];
        }
    }

    return decision;
}
