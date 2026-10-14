import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
    createRemediationStopProvenance,
    REMEDIATION_STOP_PROVENANCE_VERSION,
    RemediationStopProvenanceValidationError,
    verifyRemediationStopProvenance
} from "../../../src/engines/orchestration/remediationStopProvenance.js";
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1,
    computeRemediationStopFingerprintV2
} from "../../../src/engines/orchestration/remediationStopFingerprint.js";

const policy = {
    schemaVersion: "1.0.0",
    policyId: "authored-policy",
    policyVersion: "3.1.0",
    failureSignatureDefaults: {
        calculation_error: {
            difficulty: "D3",
            evidenceDimension: "apply",
            questionTypes: ["mcq", "numeric"]
        }
    }
};

function generationInputs({ authored = false, policyError = false } = {}) {
    return {
        resolverVersion: "1.0.0",
        targetNodeId: "K283",
        bankIdentity: { bankId: "QB-K283", version: "1.2.0" },
        questionBank: {
            bankId: "QB-K283",
            version: "1.2.0",
            primaryNode: "K283",
            questions: [
                { id: "Q1", difficulty: "D1" },
                { id: "Q2", difficulty: "D2" }
            ]
        },
        selectorConstraints: { questionTypes: ["mcq"] },
        config: {
            learningMode: "HOC_SAU",
            timeBudget: 60,
            clusterId: "C09",
            lessonId: null,
            contextId: "ctx",
            historyLimit: 50
        },
        generationRules: {
            adaptiveRules: { rules: ["a"] },
            adaptivePaths: { paths: ["b"] },
            knowledgeMap: { nodes: ["K283"] },
            failureSignatures: { signatures: ["calculation_error"] },
            remediationRules: { rules: ["r"] }
        },
        ...(authored || policyError ? { policy } : {})
    };
}

function provenanceFor({
    stopKind = "INFEASIBLE",
    contract = "V1",
    participation = null,
    inputs = generationInputs()
} = {}) {
    const fingerprint = contract === "V1"
        ? stopKind === "INFEASIBLE"
            ? computeLegacyInfeasibleFingerprintV1(inputs)
            : computePolicyErrorFingerprintV1(inputs)
        : computeRemediationStopFingerprintV2({
            ...inputs,
            stopKind,
            participation
        });
    return createRemediationStopProvenance({
        sessionId: "session-1",
        checkpointRevision: 7,
        checkpointPayloadSha256: "a".repeat(64),
        stopKind,
        stopFingerprint: fingerprint,
        fingerprintContract: contract,
        participation,
        generationInputs: inputs
    });
}

function verify(provenance, overrides = {}) {
    return verifyRemediationStopProvenance({
        provenance,
        sessionId: "session-1",
        checkpointRevision: 7,
        checkpointPayloadSha256: "a".repeat(64),
        stopKind: provenance.stopKind,
        stopFingerprint: provenance.stopFingerprint,
        ...overrides
    });
}

function assertProvenanceError(callback, code) {
    assert.throws(
        callback,
        error => error instanceof RemediationStopProvenanceValidationError &&
            error.code === code
    );
}

for (const stopKind of ["INFEASIBLE", "POLICY_ERROR"]) {
    test(`${stopKind}: explicit null remediationRules preserves V1 inputs and digests`, () => {
        const inputs = generationInputs({ policyError: stopKind === "POLICY_ERROR" });
        inputs.generationRules.remediationRules = null;
        const original = structuredClone(inputs);
        const fingerprint = stopKind === "INFEASIBLE"
            ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1;
        const provenance = provenanceFor({ stopKind, inputs });
        assert.deepEqual(inputs, original);
        assert.deepEqual(provenance.generationInputs, original);
        assert.equal(provenance.generationInputs.generationRules.remediationRules, null);
        assert.equal(provenance.stopFingerprint, fingerprint(inputs));
        const canonical = JSON.stringify(inputs, (key, value) =>
            value && typeof value === "object" && !Array.isArray(value)
                ? Object.fromEntries(Object.keys(value).sort().map(k => [k, value[k]])) : value);
        assert.equal(provenance.inputSha256, createHash("sha256").update(canonical).digest("hex"));
        assert.equal(verify(JSON.parse(JSON.stringify(provenance))).status, "VERIFIED");
        for (const replacement of [{}, undefined]) {
            const changed = structuredClone(inputs);
            if (replacement === undefined) delete changed.generationRules.remediationRules;
            else changed.generationRules.remediationRules = replacement;
            assert.notEqual(fingerprint(changed), provenance.stopFingerprint);
        }
    });

    test(`${stopKind}: encoding and verification reject missing or invalid remediationRules`, () => {
        const inputs = generationInputs({ policyError: stopKind === "POLICY_ERROR" });
        inputs.generationRules.remediationRules = null;
        const valid = provenanceFor({ stopKind, inputs });
        for (const value of [undefined, [], "rules", 0, false, () => {}, new Date(0)]) {
            const changed = structuredClone(inputs);
            changed.generationRules.remediationRules = value;
            assertProvenanceError(() => createRemediationStopProvenance({ ...valid, generationInputs: changed }), "GENERATION_RULES_INVALID");
            assertProvenanceError(() => verify({ ...valid, generationInputs: changed }), "GENERATION_RULES_INVALID");
        }
        const missing = structuredClone(inputs);
        delete missing.generationRules.remediationRules;
        assertProvenanceError(() => createRemediationStopProvenance({ ...valid, generationInputs: missing }), "GENERATION_RULES_INVALID");
        assertProvenanceError(() => verify({ ...valid, generationInputs: missing }), "GENERATION_RULES_INVALID");
        for (const field of ["adaptiveRules", "adaptivePaths", "knowledgeMap", "failureSignatures"]) {
            const changed = structuredClone(inputs); changed.generationRules[field] = null;
            assertProvenanceError(() => createRemediationStopProvenance({ ...valid, generationInputs: changed }), "GENERATION_RULES_INVALID");
            assertProvenanceError(() => verify({ ...valid, generationInputs: changed }), "GENERATION_RULES_INVALID");
        }
    });
}

test("V1 INFEASIBLE and POLICY_ERROR inputs verify with exact historical semantics", () => {
    for (const [stopKind, inputs] of [
        ["INFEASIBLE", generationInputs()],
        ["POLICY_ERROR", generationInputs({ policyError: true })]
    ]) {
        const provenance = provenanceFor({ stopKind, inputs });
        assert.equal(provenance.schemaVersion, REMEDIATION_STOP_PROVENANCE_VERSION);
        assert.equal(provenance.fingerprintContract, "V1");
        assert.equal(provenance.participation, null);
        assert.equal(verify(provenance).status, "VERIFIED");
    }
});

test("V2 explicitly separates LEGACY and AUTHORED for both supported stop kinds", () => {
    for (const stopKind of ["INFEASIBLE", "POLICY_ERROR"]) {
        const legacy = provenanceFor({
            stopKind,
            contract: "V2",
            participation: "LEGACY",
            inputs: generationInputs()
        });
        assert.equal(verify(legacy).participation, "LEGACY");

        const authored = provenanceFor({
            stopKind,
            contract: "V2",
            participation: "AUTHORED",
            inputs: generationInputs({ authored: true })
        });
        assert.equal(verify(authored).participation, "AUTHORED");
        assert.notEqual(authored.stopFingerprint, legacy.stopFingerprint);
    }
});

test("authored policy content is part of V2 recomputation even at unchanged version", () => {
    const provenance = provenanceFor({
        contract: "V2",
        participation: "AUTHORED",
        inputs: generationInputs({ authored: true })
    });
    const changedInputs = structuredClone(provenance.generationInputs);
    changedInputs.policy.failureSignatureDefaults.calculation_error.difficulty = "D4";
    assert.equal(
        changedInputs.policy.policyVersion,
        provenance.generationInputs.policy.policyVersion
    );
    assertProvenanceError(
        () => createRemediationStopProvenance({
            sessionId: "session-1",
            checkpointRevision: 7,
            checkpointPayloadSha256: "a".repeat(64),
            stopKind: provenance.stopKind,
            stopFingerprint: provenance.stopFingerprint,
            fingerprintContract: "V2",
            participation: "AUTHORED",
            generationInputs: changedInputs
        }),
        "STOP_FINGERPRINT_MISMATCH"
    );

    const policyErrorInputs = generationInputs({ policyError: true });
    const changedPolicyErrorInputs = structuredClone(policyErrorInputs);
    changedPolicyErrorInputs.policy.failureSignatureDefaults.calculation_error.difficulty = "D4";
    assert.notEqual(
        computePolicyErrorFingerprintV1(policyErrorInputs),
        computePolicyErrorFingerprintV1(changedPolicyErrorInputs)
    );
});

test("verification rejects mismatched session, revision, checkpoint hash and stop bindings", () => {
    const provenance = provenanceFor();
    for (const [override, code] of [
        [{ sessionId: "other-session" }, "PROVENANCE_BINDING_MISMATCH"],
        [{ checkpointRevision: 8 }, "PROVENANCE_BINDING_MISMATCH"],
        [{ checkpointPayloadSha256: "b".repeat(64) }, "PROVENANCE_BINDING_MISMATCH"],
        [{ stopFingerprint: "c".repeat(64) }, "PROVENANCE_BINDING_MISMATCH"],
        [{ stopKind: "POLICY_ERROR" }, "PROVENANCE_BINDING_MISMATCH"]
    ]) {
        assertProvenanceError(() => verify(provenance, override), code);
    }
});

test("missing, unsupported, malformed and inconsistent inputs fail with typed errors", () => {
    assertProvenanceError(
        () => createRemediationStopProvenance({
            sessionId: "session-1",
            checkpointRevision: 1,
            checkpointPayloadSha256: "a".repeat(64),
            stopKind: "INFEASIBLE",
            stopFingerprint: "b".repeat(64),
            fingerprintContract: "V1",
            generationInputs: undefined
        }),
        "GENERATION_INPUTS_FIELDS_INVALID"
    );

    const provenance = provenanceFor();
    assertProvenanceError(
        () => verify({ ...provenance, inputSha256: "f".repeat(64) }),
        "INPUT_DIGEST_MISMATCH"
    );
    assertProvenanceError(
        () => verify({ ...provenance, extra: true }),
        "PROVENANCE_FIELDS_INVALID"
    );
    assertProvenanceError(
        () => verify({ ...provenance, schemaVersion: "remediation-stop-provenance-v2" }),
        "PROVENANCE_VERSION_UNSUPPORTED"
    );

    const malformedInputs = structuredClone(provenance.generationInputs);
    malformedInputs.config = { ...malformedInputs.config, bad: [undefined] };
    assertProvenanceError(
        () => createRemediationStopProvenance({
            sessionId: "session-1",
            checkpointRevision: 7,
            checkpointPayloadSha256: "a".repeat(64),
            stopKind: "INFEASIBLE",
            stopFingerprint: provenance.stopFingerprint,
            fingerprintContract: "V1",
            generationInputs: malformedInputs
        }),
        "UNDEFINED_ARRAY_ELEMENT"
    );
});

test("ambiguous contract or participation is rejected rather than inferred", () => {
    const inputs = generationInputs();
    assertProvenanceError(
        () => createRemediationStopProvenance({
            sessionId: "session-1",
            checkpointRevision: 1,
            checkpointPayloadSha256: "a".repeat(64),
            stopKind: "INFEASIBLE",
            stopFingerprint: computeLegacyInfeasibleFingerprintV1(inputs),
            fingerprintContract: undefined,
            generationInputs: inputs
        }),
        "FINGERPRINT_CONTRACT_INVALID"
    );
    assertProvenanceError(
        () => createRemediationStopProvenance({
            sessionId: "session-1",
            checkpointRevision: 1,
            checkpointPayloadSha256: "a".repeat(64),
            stopKind: "INFEASIBLE",
            stopFingerprint: "b".repeat(64),
            fingerprintContract: "V2",
            participation: null,
            generationInputs: inputs
        }),
        "PARTICIPATION_INVALID"
    );
});
