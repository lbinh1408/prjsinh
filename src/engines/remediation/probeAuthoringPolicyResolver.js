const SUPPORTED_SCHEMA_VERSION = "1.0.0";
const DIFFICULTIES = new Set(["D1", "D2", "D3", "D4", "D5"]);
const EVIDENCE_DIMENSIONS = new Set(["know", "explain", "apply", "transfer"]);
const QUESTION_TYPES = new Set([
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
const POLICY_FIELDS = new Set([
    "schemaVersion",
    "policyId",
    "policyVersion",
    "failureSignatureDefaults",
    "targetNodeOverrides"
]);
const CONSTRAINT_FIELDS = new Set([
    "difficulty",
    "evidenceDimension",
    "questionTypes"
]);

export class ProbeAuthoringPolicyError extends TypeError {
    constructor(reasonCode, message) {
        super(message);
        this.name = "ProbeAuthoringPolicyError";
        this.reasonCode = reasonCode;
    }
}

function reject(reasonCode, message) {
    throw new ProbeAuthoringPolicyError(reasonCode, message);
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        reject("INVALID_POLICY", `${fieldName} must be a non-empty string.`);
    }
}

function validateConstraintFields(constraints, fieldName, allowPartial) {
    if (!isRecord(constraints)) {
        reject("INVALID_POLICY", `${fieldName} must be an object.`);
    }

    for (const field of Object.keys(constraints)) {
        if (!CONSTRAINT_FIELDS.has(field)) {
            reject("INVALID_POLICY", `${fieldName}.${field} is not supported.`);
        }
    }

    if (!allowPartial &&
        (!Object.hasOwn(constraints, "difficulty") ||
            !Object.hasOwn(constraints, "evidenceDimension"))) {
        reject(
            "INVALID_POLICY",
            `${fieldName} must define difficulty and evidenceDimension.`
        );
    }
    if (allowPartial && Object.keys(constraints).length === 0) {
        reject("INVALID_POLICY", `${fieldName} must override at least one constraint.`);
    }
    if (constraints.difficulty !== undefined &&
        !DIFFICULTIES.has(constraints.difficulty)) {
        reject("INVALID_POLICY", `${fieldName}.difficulty is invalid.`);
    }
    if (constraints.evidenceDimension !== undefined &&
        !EVIDENCE_DIMENSIONS.has(constraints.evidenceDimension)) {
        reject("INVALID_POLICY", `${fieldName}.evidenceDimension is invalid.`);
    }
    if (constraints.questionTypes !== undefined &&
        (!Array.isArray(constraints.questionTypes) ||
            constraints.questionTypes.length === 0 ||
            constraints.questionTypes.some(type => !QUESTION_TYPES.has(type)) ||
            new Set(constraints.questionTypes).size !== constraints.questionTypes.length)) {
        reject("INVALID_POLICY", `${fieldName}.questionTypes must be unique supported types.`);
    }
}

function canonicalizePolicy(policy) {
    const defaults = {};
    for (const signature of Object.keys(policy.failureSignatureDefaults).sort()) {
        const constraints = policy.failureSignatureDefaults[signature];
        defaults[signature] = {
            difficulty: constraints.difficulty,
            evidenceDimension: constraints.evidenceDimension,
            ...(constraints.questionTypes === undefined
                ? {}
                : { questionTypes: [...constraints.questionTypes].sort() })
        };
    }

    const overrides = (policy.targetNodeOverrides ?? [])
        .map(override => ({
            targetNodeId: override.targetNodeId,
            failureSignature: override.failureSignature,
            ...(override.difficulty === undefined ? {} : { difficulty: override.difficulty }),
            ...(override.evidenceDimension === undefined
                ? {}
                : { evidenceDimension: override.evidenceDimension }),
            ...(override.questionTypes === undefined
                ? {}
                : { questionTypes: [...override.questionTypes].sort() })
        }))
        .sort((left, right) =>
            left.targetNodeId.localeCompare(right.targetNodeId) ||
            left.failureSignature.localeCompare(right.failureSignature)
        );

    return {
        schemaVersion: policy.schemaVersion,
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
        failureSignatureDefaults: defaults,
        ...(policy.targetNodeOverrides === undefined
            ? {}
            : { targetNodeOverrides: overrides })
    };
}

function validatePolicy(policy) {
    if (!isRecord(policy)) {
        reject("INVALID_POLICY", "policy must be an object.");
    }
    for (const field of Object.keys(policy)) {
        if (!POLICY_FIELDS.has(field)) {
            reject("INVALID_POLICY", `policy.${field} is not supported.`);
        }
    }
    if (policy.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
        reject("UNSUPPORTED_POLICY_VERSION", "The probe authoring policy version is unsupported.");
    }
    requireNonEmptyString(policy.policyId, "policyId");
    requireNonEmptyString(policy.policyVersion, "policyVersion");
    if (!isRecord(policy.failureSignatureDefaults) ||
        Object.keys(policy.failureSignatureDefaults).length === 0) {
        reject("INVALID_POLICY", "failureSignatureDefaults must be a non-empty object.");
    }

    for (const [signature, constraints] of Object.entries(policy.failureSignatureDefaults)) {
        requireNonEmptyString(signature, "failure signature");
        validateConstraintFields(
            constraints,
            `failureSignatureDefaults.${signature}`,
            false
        );
    }

    if (policy.targetNodeOverrides !== undefined &&
        !Array.isArray(policy.targetNodeOverrides)) {
        reject("INVALID_POLICY", "targetNodeOverrides must be an array.");
    }
    const seenOverrides = new Set();
    for (const [index, override] of (policy.targetNodeOverrides ?? []).entries()) {
        if (!isRecord(override)) {
            reject("INVALID_POLICY", `targetNodeOverrides[${index}] must be an object.`);
        }
        const allowedFields = new Set([
            "targetNodeId",
            "failureSignature",
            ...CONSTRAINT_FIELDS
        ]);
        if (Object.keys(override).some(field => !allowedFields.has(field))) {
            reject("INVALID_POLICY", `targetNodeOverrides[${index}] contains an unsupported field.`);
        }
        requireNonEmptyString(override.targetNodeId, `targetNodeOverrides[${index}].targetNodeId`);
        requireNonEmptyString(
            override.failureSignature,
            `targetNodeOverrides[${index}].failureSignature`
        );
        const overrideConstraints = Object.fromEntries(
            Object.entries(override).filter(([field]) => CONSTRAINT_FIELDS.has(field))
        );
        validateConstraintFields(
            overrideConstraints,
            `targetNodeOverrides[${index}]`,
            true
        );
        if (!Object.hasOwn(policy.failureSignatureDefaults, override.failureSignature)) {
            reject(
                "OVERRIDE_WITHOUT_DEFAULT",
                `No default is defined for ${override.failureSignature}.`
            );
        }
        const key = `${override.targetNodeId}\u0000${override.failureSignature}`;
        if (seenOverrides.has(key)) {
            reject(
                "CONFLICTING_TARGET_OVERRIDES",
                `More than one override applies to ${override.targetNodeId}/${override.failureSignature}.`
            );
        }
        seenOverrides.add(key);
    }
}

/**
 * Resolve authored probe constraints. With no policy, callers should retain
 * the legacy remediation engine's behavior unchanged.
 */
export function resolveProbeAuthoringPolicy({
    policy,
    targetNodeId,
    failureSignature
} = {}) {
    if (policy === undefined || policy === null) {
        return {
            status: "LEGACY",
            policyIdentity: null,
            canonicalPolicy: null,
            canonicalPolicyJson: null,
            constraints: null
        };
    }

    validatePolicy(policy);
    requireNonEmptyString(targetNodeId, "targetNodeId");
    requireNonEmptyString(failureSignature, "failureSignature");

    const defaults = policy.failureSignatureDefaults[failureSignature];
    if (!defaults) {
        reject(
            "FAILURE_SIGNATURE_NOT_CONFIGURED",
            `No default is defined for ${failureSignature}.`
        );
    }
    const canonicalPolicy = canonicalizePolicy(policy);
    const override = (policy.targetNodeOverrides ?? []).find(item =>
        item.targetNodeId === targetNodeId &&
        item.failureSignature === failureSignature
    );
    const resolved = {
        difficulty: override?.difficulty ?? defaults.difficulty,
        evidenceDimension: override?.evidenceDimension ?? defaults.evidenceDimension,
        questionTypes: override?.questionTypes === undefined
            ? defaults.questionTypes === undefined
                ? null
                : [...defaults.questionTypes].sort()
            : [...override.questionTypes].sort()
    };

    return {
        status: "RESOLVED",
        policyIdentity: {
            schemaVersion: policy.schemaVersion,
            policyId: policy.policyId,
            policyVersion: policy.policyVersion
        },
        canonicalPolicy,
        canonicalPolicyJson: JSON.stringify(canonicalPolicy),
        constraints: resolved
    };
}
