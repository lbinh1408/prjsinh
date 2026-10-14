import test from "node:test";
import assert from "node:assert/strict";
import {
    ProbeAuthoringPolicyError,
    resolveProbeAuthoringPolicy
} from "../../../src/engines/remediation/probeAuthoringPolicyResolver.js";

function createPolicy() {
    return {
        schemaVersion: "1.0.0",
        policyId: "probe-authoring-defaults",
        policyVersion: "2.1.0",
        failureSignatureDefaults: {
            calculation_error: {
                difficulty: "D2",
                evidenceDimension: "apply",
                questionTypes: ["numeric", "mcq"]
            },
            concept_confusion: {
                difficulty: "D1",
                evidenceDimension: "know"
            }
        },
        targetNodeOverrides: [
            {
                targetNodeId: "K284",
                failureSignature: "calculation_error",
                difficulty: "D3",
                questionTypes: ["numeric"]
            }
        ]
    };
}

function capturePolicyError(fn, reasonCode) {
    assert.throws(fn, error =>
        error instanceof ProbeAuthoringPolicyError &&
        error.reasonCode === reasonCode
    );
}

test("resolves failure-signature defaults and exposes canonical policy identity", () => {
    const result = resolveProbeAuthoringPolicy({
        policy: createPolicy(),
        targetNodeId: "K283",
        failureSignature: "calculation_error"
    });

    assert.equal(result.status, "RESOLVED");
    assert.deepEqual(result.policyIdentity, {
        schemaVersion: "1.0.0",
        policyId: "probe-authoring-defaults",
        policyVersion: "2.1.0"
    });
    assert.deepEqual(result.constraints, {
        difficulty: "D2",
        evidenceDimension: "apply",
        questionTypes: ["mcq", "numeric"]
    });
    assert.equal(
        result.canonicalPolicyJson,
        JSON.stringify(result.canonicalPolicy)
    );
});

test("applies target-node fields over defaults without changing other defaults", () => {
    const result = resolveProbeAuthoringPolicy({
        policy: createPolicy(),
        targetNodeId: "K284",
        failureSignature: "calculation_error"
    });

    assert.deepEqual(result.constraints, {
        difficulty: "D3",
        evidenceDimension: "apply",
        questionTypes: ["numeric"]
    });
});

test("rejects invalid constraints and unsupported policy versions", () => {
    const invalidDifficulty = createPolicy();
    invalidDifficulty.failureSignatureDefaults.calculation_error.difficulty = "D6";
    capturePolicyError(() => resolveProbeAuthoringPolicy({
        policy: invalidDifficulty,
        targetNodeId: "K283",
        failureSignature: "calculation_error"
    }), "INVALID_POLICY");

    const invalidEvidence = createPolicy();
    invalidEvidence.failureSignatureDefaults.calculation_error.evidenceDimension = "observe";
    capturePolicyError(() => resolveProbeAuthoringPolicy({
        policy: invalidEvidence,
        targetNodeId: "K283",
        failureSignature: "calculation_error"
    }), "INVALID_POLICY");

    const unsupported = createPolicy();
    unsupported.schemaVersion = "2.0.0";
    capturePolicyError(() => resolveProbeAuthoringPolicy({
        policy: unsupported,
        targetNodeId: "K283",
        failureSignature: "calculation_error"
    }), "UNSUPPORTED_POLICY_VERSION");
});

test("rejects conflicting duplicate overrides and overrides without defaults", () => {
    const conflicting = createPolicy();
    conflicting.targetNodeOverrides.push({
        targetNodeId: "K284",
        failureSignature: "calculation_error",
        difficulty: "D4"
    });
    capturePolicyError(() => resolveProbeAuthoringPolicy({
        policy: conflicting,
        targetNodeId: "K284",
        failureSignature: "calculation_error"
    }), "CONFLICTING_TARGET_OVERRIDES");

    const orphaned = createPolicy();
    orphaned.targetNodeOverrides[0].failureSignature = "unknown_failure";
    capturePolicyError(() => resolveProbeAuthoringPolicy({
        policy: orphaned,
        targetNodeId: "K284",
        failureSignature: "calculation_error"
    }), "OVERRIDE_WITHOUT_DEFAULT");
});

test("resolution and canonical identity are deterministic and do not mutate policy", () => {
    const policy = createPolicy();
    const original = structuredClone(policy);
    const input = {
        policy,
        targetNodeId: "K284",
        failureSignature: "calculation_error"
    };

    assert.deepEqual(
        resolveProbeAuthoringPolicy(input),
        resolveProbeAuthoringPolicy(input)
    );
    assert.deepEqual(policy, original);
});

test("no policy returns the legacy path without imposing constraints", () => {
    assert.deepEqual(resolveProbeAuthoringPolicy(), {
        status: "LEGACY",
        policyIdentity: null,
        canonicalPolicy: null,
        canonicalPolicyJson: null,
        constraints: null
    });
});
