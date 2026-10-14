import { createHash } from "node:crypto";
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1,
    computeRemediationStopFingerprintV2,
    REMEDIATION_STOP_FINGERPRINT_V2_CONTRACT
} from "./remediationStopFingerprint.js";

export const REMEDIATION_STOP_PROVENANCE_VERSION = "remediation-stop-provenance-v1";

const COMMON_INPUT_FIELDS = [
    "resolverVersion",
    "targetNodeId",
    "bankIdentity",
    "questionBank",
    "selectorConstraints",
    "config",
    "generationRules"
];
const GENERATION_RULE_FIELDS = [
    "adaptiveRules",
    "adaptivePaths",
    "knowledgeMap",
    "failureSignatures",
    "remediationRules"
];
const PROVENANCE_FIELDS = [
    "schemaVersion",
    "sessionId",
    "checkpointRevision",
    "checkpointPayloadSha256",
    "stopKind",
    "stopFingerprint",
    "fingerprintContract",
    "participation",
    "generationInputs",
    "inputSha256"
];

export class RemediationStopProvenanceValidationError extends TypeError {
    constructor(code, message) {
        super(message);
        this.name = "RemediationStopProvenanceValidationError";
        this.code = code;
    }
}

function reject(code, message) {
    throw new RemediationStopProvenanceValidationError(code, message);
}

function isRecord(value) {
    return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype ||
            Object.getPrototypeOf(value) === null);
}

function canonicalize(value, path = "$", ancestors = new Set(), inArray = false) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            reject("NON_FINITE_NUMBER", `Non-finite number at ${path}.`);
        }
        return value;
    }
    if (value === undefined) {
        if (inArray) {
            reject("UNDEFINED_ARRAY_ELEMENT", `Undefined array element at ${path}.`);
        }
        return undefined;
    }
    if (typeof value !== "object") {
        reject("UNSUPPORTED_VALUE_TYPE", `Unsupported value type at ${path}.`);
    }
    if (ancestors.has(value)) {
        reject("CYCLIC_INPUT", `Cyclic value at ${path}.`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
        reject("SYMBOL_PROPERTY", `Symbol properties are unsupported at ${path}.`);
    }

    ancestors.add(value);
    if (Array.isArray(value)) {
        const result = [];
        for (let index = 0; index < value.length; index += 1) {
            if (!Object.hasOwn(value, index)) {
                reject("SPARSE_ARRAY", `Sparse array element at ${path}[${index}].`);
            }
            result.push(canonicalize(value[index], `${path}[${index}]`, ancestors, true));
        }
        ancestors.delete(value);
        return result;
    }
    if (!isRecord(value)) {
        reject("UNSUPPORTED_OBJECT_TYPE", `Unsupported object type at ${path}.`);
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

function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}

function sha256(value) {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertExactFields(value, fields, code, label) {
    if (
        !isRecord(value) ||
        Object.keys(value).length !== fields.length ||
        fields.some(field => !Object.hasOwn(value, field)) ||
        Object.keys(value).some(field => !fields.includes(field))
    ) {
        reject(code, `${label} must contain exactly: ${fields.join(", ")}.`);
    }
}

function assertNonempty(value, code, label) {
    if (typeof value !== "string" || !value.trim()) {
        reject(code, `${label} must be a nonempty string.`);
    }
}

function assertDigest(value, code, label) {
    if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
        reject(code, `${label} must be a 64-character SHA-256 hex digest.`);
    }
}

function validateGenerationInputs(generationInputs, stopKind, fingerprintContract, participation) {
    const fields = [...COMMON_INPUT_FIELDS];
    if (
        (fingerprintContract === "V1" && stopKind === "POLICY_ERROR") ||
        (fingerprintContract === "V2" && participation === "AUTHORED")
    ) {
        fields.push("policy");
    }
    assertExactFields(
        generationInputs,
        fields,
        "GENERATION_INPUTS_FIELDS_INVALID",
        "generationInputs"
    );

    for (const field of ["resolverVersion", "targetNodeId"]) {
        assertNonempty(generationInputs[field], "GENERATION_INPUTS_INVALID", field);
    }
    assertExactFields(
        generationInputs.bankIdentity,
        ["bankId", "version"],
        "BANK_IDENTITY_INVALID",
        "generationInputs.bankIdentity"
    );
    assertNonempty(generationInputs.bankIdentity.bankId, "BANK_IDENTITY_INVALID", "bankId");
    assertNonempty(generationInputs.bankIdentity.version, "BANK_IDENTITY_INVALID", "bank version");
    if (!isRecord(generationInputs.questionBank) ||
        !Array.isArray(generationInputs.questionBank.questions) ||
        generationInputs.questionBank.bankId !== generationInputs.bankIdentity.bankId ||
        generationInputs.questionBank.version !== generationInputs.bankIdentity.version ||
        generationInputs.questionBank.primaryNode !== generationInputs.targetNodeId) {
        reject("QUESTION_BANK_INVALID", "questionBank identity and target must match generation inputs.");
    }
    if (!isRecord(generationInputs.selectorConstraints) ||
        !isRecord(generationInputs.config)) {
        reject("GENERATION_INPUTS_INVALID", "selectorConstraints and config must be objects.");
    }
    assertExactFields(
        generationInputs.generationRules,
        GENERATION_RULE_FIELDS,
        "GENERATION_RULES_INVALID",
        "generationInputs.generationRules"
    );
    for (const field of GENERATION_RULE_FIELDS) {
        if (!isRecord(generationInputs.generationRules[field])) {
            reject("GENERATION_RULES_INVALID", `${field} must be an object.`);
        }
    }
    if (fields.includes("policy") && !isRecord(generationInputs.policy)) {
        reject("POLICY_INPUT_INVALID", "generationInputs.policy must be an object.");
    }
    canonicalize(generationInputs);
}

function computeBoundFingerprint({
    stopKind,
    fingerprintContract,
    participation,
    generationInputs
}) {
    try {
        if (fingerprintContract === "V1") {
            if (participation !== null) {
                reject("V1_PARTICIPATION_UNSUPPORTED", "V1 does not encode policy participation.");
            }
            if (stopKind === "INFEASIBLE") {
                return computeLegacyInfeasibleFingerprintV1(generationInputs);
            }
            return computePolicyErrorFingerprintV1(generationInputs);
        }
        return computeRemediationStopFingerprintV2({
            ...generationInputs,
            stopKind,
            participation
        });
    } catch (error) {
        if (error instanceof RemediationStopProvenanceValidationError) {
            throw error;
        }
        reject(
            "FINGERPRINT_INPUT_INVALID",
            `Shared fingerprint validation failed: ${error?.message ?? "invalid input"}.`
        );
    }
}

function validateBindings({
    sessionId,
    checkpointRevision,
    checkpointPayloadSha256,
    stopKind,
    stopFingerprint,
    fingerprintContract,
    participation
}) {
    assertNonempty(sessionId, "SESSION_ID_INVALID", "sessionId");
    if (!Number.isSafeInteger(checkpointRevision) || checkpointRevision < 1) {
        reject("CHECKPOINT_REVISION_INVALID", "checkpointRevision must be a positive safe integer.");
    }
    assertDigest(checkpointPayloadSha256, "CHECKPOINT_DIGEST_INVALID", "checkpointPayloadSha256");
    assertDigest(stopFingerprint, "STOP_FINGERPRINT_INVALID", "stopFingerprint");
    if (stopKind !== "INFEASIBLE" && stopKind !== "POLICY_ERROR") {
        reject("STOP_KIND_INVALID", "stopKind must be INFEASIBLE or POLICY_ERROR.");
    }
    if (fingerprintContract !== "V1" && fingerprintContract !== "V2") {
        reject("FINGERPRINT_CONTRACT_INVALID", "fingerprintContract must explicitly be V1 or V2.");
    }
    if (fingerprintContract === "V1" && participation !== null) {
        reject("V1_PARTICIPATION_UNSUPPORTED", "V1 participation must be null.");
    }
    if (fingerprintContract === "V2" &&
        participation !== "LEGACY" && participation !== "AUTHORED") {
        reject("PARTICIPATION_INVALID", "V2 participation must explicitly be LEGACY or AUTHORED.");
    }
}

export function createRemediationStopProvenance({
    sessionId,
    checkpointRevision,
    checkpointPayloadSha256,
    stopKind,
    stopFingerprint,
    fingerprintContract,
    participation = null,
    generationInputs
} = {}) {
    validateBindings({
        sessionId,
        checkpointRevision,
        checkpointPayloadSha256,
        stopKind,
        stopFingerprint,
        fingerprintContract,
        participation
    });
    validateGenerationInputs(
        generationInputs,
        stopKind,
        fingerprintContract,
        participation
    );

    const canonicalInputs = canonicalize(generationInputs);
    const actualFingerprint = computeBoundFingerprint({
        stopKind,
        fingerprintContract,
        participation,
        generationInputs: canonicalInputs
    });
    if (actualFingerprint !== stopFingerprint.toLowerCase()) {
        reject("STOP_FINGERPRINT_MISMATCH", "Generation inputs do not reproduce stopFingerprint.");
    }

    return {
        schemaVersion: REMEDIATION_STOP_PROVENANCE_VERSION,
        sessionId,
        checkpointRevision,
        checkpointPayloadSha256: checkpointPayloadSha256.toLowerCase(),
        stopKind,
        stopFingerprint: stopFingerprint.toLowerCase(),
        fingerprintContract,
        participation,
        generationInputs: canonicalInputs,
        inputSha256: sha256(canonicalJson(canonicalInputs))
    };
}

export function verifyRemediationStopProvenance({
    provenance,
    sessionId,
    checkpointRevision,
    checkpointPayloadSha256,
    stopKind,
    stopFingerprint
} = {}) {
    assertExactFields(provenance, PROVENANCE_FIELDS, "PROVENANCE_FIELDS_INVALID", "provenance");
    if (provenance.schemaVersion !== REMEDIATION_STOP_PROVENANCE_VERSION) {
        reject("PROVENANCE_VERSION_UNSUPPORTED", "Unsupported provenance schemaVersion.");
    }
    validateBindings({
        sessionId: provenance.sessionId,
        checkpointRevision: provenance.checkpointRevision,
        checkpointPayloadSha256: provenance.checkpointPayloadSha256,
        stopKind: provenance.stopKind,
        stopFingerprint: provenance.stopFingerprint,
        fingerprintContract: provenance.fingerprintContract,
        participation: provenance.participation
    });
    if (
        typeof sessionId !== "string" ||
        !Number.isSafeInteger(checkpointRevision) ||
        typeof checkpointPayloadSha256 !== "string" ||
        typeof stopFingerprint !== "string" ||
        provenance.sessionId !== sessionId ||
        provenance.checkpointRevision !== checkpointRevision ||
        provenance.checkpointPayloadSha256.toLowerCase() !== checkpointPayloadSha256?.toLowerCase() ||
        provenance.stopKind !== stopKind ||
        provenance.stopFingerprint !== stopFingerprint?.toLowerCase()
    ) {
        reject("PROVENANCE_BINDING_MISMATCH", "Provenance bindings do not match checkpoint and stop.");
    }
    validateGenerationInputs(
        provenance.generationInputs,
        provenance.stopKind,
        provenance.fingerprintContract,
        provenance.participation
    );
    const inputSha256 = sha256(canonicalJson(provenance.generationInputs));
    if (provenance.inputSha256 !== inputSha256) {
        reject("INPUT_DIGEST_MISMATCH", "inputSha256 does not match canonical generationInputs.");
    }

    const actualFingerprint = computeBoundFingerprint({
        stopKind: provenance.stopKind,
        fingerprintContract: provenance.fingerprintContract,
        participation: provenance.participation,
        generationInputs: provenance.generationInputs
    });
    if (actualFingerprint !== provenance.stopFingerprint) {
        reject("STOP_FINGERPRINT_MISMATCH", "generationInputs do not reproduce stopFingerprint.");
    }
    return Object.freeze({
        status: "VERIFIED",
        sessionId: provenance.sessionId,
        checkpointRevision: provenance.checkpointRevision,
        stopKind: provenance.stopKind,
        fingerprintContract: provenance.fingerprintContract,
        participation: provenance.participation,
        stopFingerprint: provenance.stopFingerprint,
        inputSha256: provenance.inputSha256
    });
}
