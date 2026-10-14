import assert from "node:assert/strict";
import test from "node:test";

import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1,
    computeRemediationStopFingerprintV2,
    RemediationStopFingerprintValidationError
} from "../../../src/engines/orchestration/remediationStopFingerprint.js";

const legacyVector = {
    resolverVersion: "1.0.0",
    targetNodeId: "K283",
    bankIdentity: { bankId: "QB-GOLDEN-K283", version: "1.0.0" },
    questionBank: {
        bankId: "QB-GOLDEN-K283",
        version: "1.0.0",
        primaryNode: "K283",
        questions: [
            { id: "Q-GOLDEN-001", difficulty: "D1" },
            { id: "Q-GOLDEN-002", difficulty: "D2" }
        ]
    },
    selectorConstraints: {
        requiredEvidenceDimension: "concept",
        questionTypes: ["mcq"]
    },
    config: {
        learningMode: "HOC_SAU",
        timeBudget: 60,
        clusterId: "C09",
        contextId: "CTX-K283-GOLDEN",
        historyLimit: 50
    },
    generationRules: {
        adaptiveRules: { schemaVersion: "1.0.0", rules: ["rule-a"] },
        adaptivePaths: { schemaVersion: "1.0.0", paths: ["path-a"] },
        knowledgeMap: { schemaVersion: "1.0.0", nodes: ["K283"] },
        failureSignatures: { schemaVersion: "1.0.0", signatures: ["calculation_error"] },
        remediationRules: { schemaVersion: "1.0.0", rules: ["remediation-a"] }
    }
};

const policy = {
    schemaVersion: "2.0.0",
    policyId: "probe-authoring-policy",
    policyVersion: "4.2.0",
    failureSignatureDefaults: {
        calculation_error: {
            difficulty: "D3",
            evidenceDimension: "apply",
            questionTypes: ["mcq", "numeric"]
        }
    }
};

function v2Input(overrides = {}) {
    return {
        ...legacyVector,
        stopKind: "INFEASIBLE",
        participation: "LEGACY",
        ...overrides
    };
}

test("V1 functions preserve FPV1-INF-K283 and FPV1-POLICY-K283", () => {
    assert.equal(
        computeLegacyInfeasibleFingerprintV1(legacyVector),
        "976366671eb2ca2c45c0a2ec8797103fdca0213a8ab52721e67038043dc6043f"
    );
    assert.equal(
        computePolicyErrorFingerprintV1({ ...legacyVector, policy }),
        "7f895912174c74b59a4d26261f8f1e00aec3a46ba25a620c5c1c5c5ad594c840"
    );
});

test("V2 is deterministic, domain separated, and preserves ordered arrays", () => {
    const digest = computeRemediationStopFingerprintV2(v2Input());
    const reordered = {
        ...legacyVector,
        config: Object.fromEntries(Object.entries(legacyVector.config).reverse()),
        stopKind: "INFEASIBLE",
        participation: "LEGACY"
    };
    assert.equal(computeRemediationStopFingerprintV2(reordered), digest);
    assert.notEqual(
        computeRemediationStopFingerprintV2(v2Input({ stopKind: "POLICY_ERROR" })),
        digest
    );
    assert.notEqual(
        computeRemediationStopFingerprintV2(v2Input({
            questionBank: {
                ...legacyVector.questionBank,
                questions: [...legacyVector.questionBank.questions].reverse()
            }
        })),
        digest
    );
});

test("V2 separates LEGACY and AUTHORED and includes full authored policy content", () => {
    const legacy = computeRemediationStopFingerprintV2(v2Input({ policy }));
    const authored = computeRemediationStopFingerprintV2(v2Input({
        participation: "AUTHORED",
        policy
    }));
    const changedPolicy = {
        ...policy,
        failureSignatureDefaults: {
            ...policy.failureSignatureDefaults,
            calculation_error: {
                ...policy.failureSignatureDefaults.calculation_error,
                difficulty: "D4"
            }
        }
    };
    assert.notEqual(authored, legacy);
    assert.equal(policy.policyVersion, changedPolicy.policyVersion);
    assert.notEqual(
        computeRemediationStopFingerprintV2(v2Input({
            participation: "AUTHORED",
            policy: changedPolicy
        })),
        authored
    );
    assert.equal(
        computeRemediationStopFingerprintV2(v2Input({ policy: changedPolicy })),
        legacy
    );
});

test("fingerprint inputs reject malformed JSON values with typed errors", () => {
    const cyclic = {};
    cyclic.self = cyclic;
    for (const malformed of [
        { value: cyclic },
        { value: [undefined] },
        { value: Number.POSITIVE_INFINITY },
        { value: 1n },
        { value: new Date(0) }
    ]) {
        assert.throws(
            () => computeRemediationStopFingerprintV2(v2Input({
                config: { ...legacyVector.config, malformed }
            })),
            error => error instanceof RemediationStopFingerprintValidationError &&
                typeof error.code === "string"
        );
    }
});

test("V2 rejects unknown domains and authored policy without identity", () => {
    assert.throws(
        () => computeRemediationStopFingerprintV2(v2Input({ stopKind: "NO_MATCH" })),
        error => error instanceof RemediationStopFingerprintValidationError &&
            error.code === "UNSUPPORTED_STOP_KIND"
    );
    assert.throws(
        () => computeRemediationStopFingerprintV2(v2Input({
            participation: "AUTHORED",
            policy: { ...policy, policyVersion: "" }
        })),
        error => error instanceof RemediationStopFingerprintValidationError &&
            error.code === "INVALID_POLICY_IDENTITY"
    );
});
