import {
    computeLegacyInfeasibleFingerprintV1
} from "./src/engines/orchestration/remediationStopFingerprint.js";
import {
    resolveProbeAuthoringPolicy
} from "./src/engines/remediation/probeAuthoringPolicyResolver.js";
import {
    PROBE_FEASIBILITY_RESOLVER_VERSION
} from "./src/engines/remediation/probeFeasibilityResolver.js";

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class K283ProbePolicyConfigurationError extends Error {
    constructor(reasonCode, message, options) {
        super(`K283_PROBE_POLICY_CONFIGURATION_INVALID [${reasonCode}]: ${message}`, options);
        this.name = "K283ProbePolicyConfigurationError";
        this.code = "K283_PROBE_POLICY_CONFIGURATION_INVALID";
        this.reasonCode = reasonCode;
    }
}

function reject(reasonCode, message, cause) {
    throw new K283ProbePolicyConfigurationError(reasonCode, message, { cause });
}

export function preflightK283ProbeAuthoringPolicy({
    policy = null,
    dependencies,
    targetNodeId = "K283",
    config,
    selectorConstraints = {}
} = {}) {
    if (policy === null || policy === undefined) {
        return { status: "LEGACY", policy: null };
    }

    const questionBank = dependencies?.questionBank;
    if (
        !isRecord(questionBank) ||
        typeof questionBank.bankId !== "string" ||
        !questionBank.bankId.trim() ||
        typeof questionBank.version !== "string" ||
        !questionBank.version.trim() ||
        questionBank.primaryNode !== targetNodeId ||
        !Array.isArray(questionBank.questions)
    ) {
        reject(
            "BANK_IDENTITY_UNAVAILABLE",
            "K283 probe policy requires a question bank with matching bankId, version, target node and questions."
        );
    }
    if (
        !isRecord(config) ||
        typeof config.learningMode !== "string" ||
        !Number.isFinite(config.timeBudget) ||
        typeof config.clusterId !== "string" ||
        !Object.hasOwn(config, "lessonId") ||
        !(typeof config.lessonId === "string" || config.lessonId === null) ||
        !Object.hasOwn(config, "contextId") ||
        !(typeof config.contextId === "string" || config.contextId === null) ||
        !Number.isSafeInteger(config.historyLimit) ||
        config.historyLimit < 1 ||
        !isRecord(selectorConstraints) ||
        !isRecord(dependencies?.knowledgeMap) ||
        !isRecord(dependencies?.adaptiveRules) ||
        !isRecord(dependencies?.adaptivePaths) ||
        !isRecord(dependencies?.failureSignatures) ||
        !isRecord(dependencies?.remediationRules)
    ) {
        reject(
            "FINGERPRINT_INPUTS_UNAVAILABLE",
            "K283 probe policy fingerprint configuration is incomplete."
        );
    }

    let canonicalPolicy;
    try {
        if (!isRecord(policy) || !isRecord(policy.failureSignatureDefaults)) {
            reject("INVALID_POLICY", "Probe authoring policy must define failure-signature defaults.");
        }
        const signatures = Object.keys(policy.failureSignatureDefaults).sort();
        if (signatures.length === 0) {
            reject("INVALID_POLICY", "Probe authoring policy must define at least one failure signature.");
        }
        for (const failureSignature of signatures) {
            const resolution = resolveProbeAuthoringPolicy({
                policy,
                targetNodeId,
                failureSignature
            });
            canonicalPolicy = resolution.canonicalPolicy;
        }
    } catch (error) {
        if (error instanceof K283ProbePolicyConfigurationError) {
            throw error;
        }
        reject(
            error?.reasonCode ?? "INVALID_POLICY",
            `K283 probe authoring policy is invalid: ${error?.message ?? "validation failed"}`,
            error
        );
    }

    let configFingerprint;
    try {
        configFingerprint = computeLegacyInfeasibleFingerprintV1({
            resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
            targetNodeId,
            bankIdentity: {
                bankId: questionBank.bankId,
                version: questionBank.version
            },
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
    } catch (error) {
        reject(
            "FINGERPRINT_INPUTS_INVALID",
            `K283 probe policy fingerprint inputs are invalid: ${error.message}`,
            error
        );
    }

    return {
        status: "VALIDATED",
        policy: structuredClone(policy),
        canonicalPolicy,
        policyIdentity: {
            policyId: canonicalPolicy.policyId,
            policyVersion: canonicalPolicy.policyVersion
        },
        configFingerprint
    };
}
