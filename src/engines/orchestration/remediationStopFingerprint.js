import { createHash } from "node:crypto";

export const REMEDIATION_POLICY_ERROR_FINGERPRINT_V1_SEMANTICS =
    "remediation-policy-error-stop-fingerprint-v1";

export const REMEDIATION_STOP_FINGERPRINT_V2_CONTRACT =
    "remediation-stop-fingerprint-v2";

export class RemediationStopFingerprintValidationError extends TypeError {
    constructor(code, message) {
        super(message);
        this.name = "RemediationStopFingerprintValidationError";
        this.code = code;
    }
}

function validationError(code, message) {
    throw new RemediationStopFingerprintValidationError(code, message);
}

function canonicalize(value, path = "$", ancestors = new Set(), inArray = false) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            validationError("NON_FINITE_NUMBER", `Non-finite number at ${path}.`);
        }
        return value;
    }
    if (value === undefined) {
        if (inArray) {
            validationError("UNDEFINED_ARRAY_ELEMENT", `Undefined array element at ${path}.`);
        }
        return undefined;
    }
    if (typeof value !== "object") {
        validationError("UNSUPPORTED_VALUE_TYPE", `Unsupported value type at ${path}.`);
    }
    if (ancestors.has(value)) {
        validationError("CYCLIC_INPUT", `Cyclic fingerprint input at ${path}.`);
    }

    ancestors.add(value);
    if (Array.isArray(value)) {
        const result = [];
        for (let index = 0; index < value.length; index += 1) {
            result.push(canonicalize(
                value[index],
                `${path}[${index}]`,
                ancestors,
                true
            ));
        }
        ancestors.delete(value);
        return result;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        validationError("UNSUPPORTED_OBJECT_TYPE", `Unsupported object type at ${path}.`);
    }

    const result = {};
    for (const key of Object.keys(value).sort()) {
        const item = canonicalize(value[key], `${path}.${key}`, ancestors);
        if (item !== undefined) {
            result[key] = item;
        }
    }
    ancestors.delete(value);
    return result;
}

function digest(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        validationError("INVALID_INPUT", "Fingerprint input must be an object.");
    }
    let serialized;
    try {
        serialized = JSON.stringify(canonicalize(input));
    } catch (error) {
        if (error instanceof RemediationStopFingerprintValidationError) {
            throw error;
        }
        throw new RemediationStopFingerprintValidationError(
            "INVALID_INPUT",
            `Could not serialize fingerprint input: ${error.message}`
        );
    }
    return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function legacyFields({
    resolverVersion,
    targetNodeId,
    bankIdentity,
    questionBank,
    selectorConstraints = {},
    config,
    generationRules
}) {
    return {
        resolverVersion,
        targetNodeId,
        bankIdentity,
        questionBank,
        selectorConstraints,
        config,
        generationRules
    };
}

export function computeLegacyInfeasibleFingerprintV1(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        validationError("INVALID_INPUT", "Fingerprint input must be an object.");
    }
    return digest(legacyFields(input));
}

export function computePolicyErrorFingerprintV1(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        validationError("INVALID_INPUT", "Fingerprint input must be an object.");
    }
    return digest({
        semanticsVersion: REMEDIATION_POLICY_ERROR_FINGERPRINT_V1_SEMANTICS,
        ...legacyFields(input),
        policy: input.policy
    });
}

export function computeRemediationStopFingerprintV2(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        validationError("INVALID_INPUT", "Fingerprint input must be an object.");
    }
    const {
        stopKind,
        participation,
        resolverVersion,
        targetNodeId,
        bankIdentity,
        questionBank,
        selectorConstraints = {},
        config,
        generationRules,
        policy
    } = input;
    if (stopKind !== "INFEASIBLE" && stopKind !== "POLICY_ERROR") {
        validationError("UNSUPPORTED_STOP_KIND", "stopKind must be INFEASIBLE or POLICY_ERROR.");
    }
    if (participation !== "LEGACY" && participation !== "AUTHORED") {
        validationError("UNSUPPORTED_PARTICIPATION", "participation must be LEGACY or AUTHORED.");
    }
    if (participation === "AUTHORED") {
        if (
            !policy ||
            typeof policy !== "object" ||
            typeof policy.policyId !== "string" ||
            !policy.policyId.trim() ||
            typeof policy.policyVersion !== "string" ||
            !policy.policyVersion.trim()
        ) {
            validationError(
                "INVALID_POLICY_IDENTITY",
                "AUTHORED participation requires policyId and policyVersion."
            );
        }
    }

    return digest({
        contractVersion: REMEDIATION_STOP_FINGERPRINT_V2_CONTRACT,
        stopKind,
        participation,
        resolverVersion,
        targetNodeId,
        bankIdentity,
        questionBank,
        selectorConstraints,
        config,
        generationRules,
        ...(participation === "AUTHORED" ? { policy } : {})
    });
}
