import test from "node:test";
import assert from "node:assert/strict";
import questionBank from "../../../src/data/questions/c09/K283.question-bank.json" with { type: "json" };
import knowledgeMap from "../../../src/data/knowledge/knowledge-map-v4.json" with { type: "json" };
import failureSignatures from "../../../src/data/remediation/failure-signatures.json" with { type: "json" };
import {
    buildRemediationPlan
} from "../../../src/engines/remediation/remediationEngine.js";
import {
    buildFeasibilityAwareRemediationPlan
} from "../../../src/engines/remediation/feasibilityAwareRemediationGenerator.js";

const bankIdentity = { bankId: questionBank.bankId, version: questionBank.version };
const KNOWLEDGE = {
    knowledge: {
        K281: { mastery: "M2" },
        K282: { mastery: "M2" },
        K283: { mastery: "M2" }
    }
};

function makePlanInput(failureType = "calculation_error") {
    return {
        studentId: "S1",
        adaptiveDecision: {
            action: "REMEDIATE",
            target: { type: "KNOWLEDGE_NODE", primaryNodeId: "K283", nodeIds: ["K283"] },
            reason: { failureSignature: failureType, sourceNodeId: "K283" },
            source: { masteryUpdateId: "MU-1" }
        },
        attempt: {
            attemptId: `ATT-${failureType}`,
            questionId: "Q-A-K283-A-003",
            primaryNode: "K283",
            result: "wrong",
            diagnostic: { failureType, failureSignatureId: failureType, confidence: 1, sourceNodeId: "K283" }
        },
        masteryState: {
            nodeId: "K283",
            mastery: "M2",
            status: "developing",
            knowledge: KNOWLEDGE.knowledge
        },
        knowledgeMap,
        failureSignatures,
        remediationRules: { maximumDepth: 3, maxMinutes: 30, maxQuestions: 7 },
        now: "2026-10-01T08:00:00.000Z"
    };
}

function generate({
    failureType = "calculation_error",
    bank = questionBank,
    identity = bankIdentity,
    targetNodeId = "K283",
    planInput = makePlanInput(failureType),
    probeAuthoringPolicy
} = {}) {
    return buildFeasibilityAwareRemediationPlan({
        planInput,
        targetNodeId,
        bankIdentity: identity,
        questionBank: bank,
        selectorConstraints: {},
        ...(probeAuthoringPolicy === undefined ? {} : { probeAuthoringPolicy })
    });
}

test("returns the unchanged generated plan when selector finds eligible questions", () => {
    const input = makePlanInput("concept_confusion");
    const legacyPlan = buildRemediationPlan(input);
    const result = generate({ failureType: "concept_confusion", planInput: input });
    assert.equal(result.status, "FEASIBLE");
    assert.deepEqual(result, { status: "FEASIBLE", plan: legacyPlan });
});

test("authored probe constraints apply to a cloned candidate before feasibility", () => {
    const input = makePlanInput();
    const inputBefore = structuredClone(input);
    const policy = {
        schemaVersion: "1.0.0",
        policyId: "integration-test-policy",
        policyVersion: "1.0.0",
        failureSignatureDefaults: {
            calculation_error: {
                difficulty: "D3",
                evidenceDimension: "apply",
                questionTypes: ["numeric", "mcq"]
            }
        }
    };
    const policyBefore = structuredClone(policy);
    const legacy = buildRemediationPlan(input);
    const result = generate({ planInput: input, probeAuthoringPolicy: policy });

    assert.equal(result.status, "FEASIBLE");
    assert.equal(result.plan.probe.difficulty, "D3");
    assert.equal(result.plan.probe.successCriteria.requiredEvidenceDimension, "apply");
    assert.deepEqual(
        result.plan.probe.questionTypes,
        legacy.probe.questionTypes.filter(type => ["numeric", "mcq"].includes(type))
    );
    assert.deepEqual(result.policyProvenance, {
        identity: {
            schemaVersion: policy.schemaVersion,
            policyId: policy.policyId,
            policyVersion: policy.policyVersion
        },
        canonicalPolicy: {
            ...policy,
            failureSignatureDefaults: {
                calculation_error: {
                    difficulty: "D3",
                    evidenceDimension: "apply",
                    questionTypes: ["mcq", "numeric"]
                }
            }
        }
    });
    assert.deepEqual(input, inputBefore);
    assert.deepEqual(policy, policyBefore);
    assert.equal(legacy.probe.difficulty, "D1");
    assert.equal(result.plan === legacy, false);
});

test("empty authored question-type intersection returns a typed policy conflict", () => {
    const result = generate({
        probeAuthoringPolicy: {
            schemaVersion: "1.0.0",
            policyId: "conflicting-types",
            policyVersion: "1.0.0",
            failureSignatureDefaults: {
                calculation_error: {
                    difficulty: "D3",
                    evidenceDimension: "apply",
                    questionTypes: ["experiment"]
                }
            }
        }
    });

    assert.equal(result.status, "POLICY_ERROR");
    assert.equal(result.reasonCode, "QUESTION_TYPE_CONFLICT");
    assert.equal(Object.hasOwn(result, "plan"), false);
});

test("invalid authored policy returns POLICY_ERROR rather than INFEASIBLE", () => {
    const result = generate({
        probeAuthoringPolicy: {
            schemaVersion: "2.0.0",
            policyId: "unsupported-policy",
            policyVersion: "1.0.0",
            failureSignatureDefaults: {
                calculation_error: {
                    difficulty: "D3",
                    evidenceDimension: "apply"
                }
            }
        }
    });

    assert.equal(result.status, "POLICY_ERROR");
    assert.equal(result.reasonCode, "UNSUPPORTED_POLICY_VERSION");
    assert.equal(Object.hasOwn(result, "plan"), false);
});

test("bank infeasibility remains distinct and carries canonical policy provenance", () => {
    const result = generate({
        probeAuthoringPolicy: {
            schemaVersion: "1.0.0",
            policyId: "infeasible-policy",
            policyVersion: "1.0.0",
            failureSignatureDefaults: {
                calculation_error: {
                    difficulty: "D1",
                    evidenceDimension: "apply",
                    questionTypes: ["mcq"]
                }
            }
        }
    });

    assert.equal(result.status, "INFEASIBLE");
    assert.equal(result.reasonCode, "NO_ELIGIBLE_BANK_QUESTION");
    assert.equal(result.policyProvenance.identity.policyId, "infeasible-policy");
    assert.equal(Object.hasOwn(result, "plan"), false);
});

test("does not expose an infeasible calculation_error D1/apply plan", () => {
    const result = generate();
    assert.deepEqual(result, {
        status: "INFEASIBLE",
        reasonCode: "NO_ELIGIBLE_BANK_QUESTION",
        targetNodeId: "K283",
        bankId: bankIdentity.bankId,
        bankVersion: bankIdentity.version,
        triggerAttemptId: "ATT-calculation_error"
    });
});

test("bank identity mismatch fails closed with stable provenance", () => {
    const result = generate({
        identity: { bankId: bankIdentity.bankId, version: "wrong" }
    });
    assert.equal(result.status, "INFEASIBLE");
    assert.equal(result.reasonCode, "BANK_IDENTITY_MISMATCH");
    assert.equal(result.triggerAttemptId, "ATT-calculation_error");
});

test("invalid inputs fail closed without exposing a plan", () => {
    for (const planInput of [
        { attempt: {} },
        { ...makePlanInput(), now: null }
    ]) {
        const result = generate({ planInput });
        assert.equal(result.status, "INFEASIBLE");
        assert.equal(result.reasonCode, "INVALID_INPUT");
        assert.equal(Object.hasOwn(result, "plan"), false);
    }
});

test("legacy plan-generation API still returns a plan object", () => {
    const legacy = buildRemediationPlan(makePlanInput("calculation_error"));
    assert.equal(typeof legacy.remediationId, "string");
    assert.equal(legacy.probe.difficulty, "D1");
    assert.equal(legacy.probe.successCriteria.requiredEvidenceDimension, "apply");
});

test("identical inputs return deterministic typed results", () => {
    const input = makePlanInput("concept_confusion");
    const args = {
        planInput: input,
        targetNodeId: "K283",
        bankIdentity,
        questionBank,
        selectorConstraints: {}
    };
    const first = buildFeasibilityAwareRemediationPlan(args);
    const second = buildFeasibilityAwareRemediationPlan(args);
    assert.deepEqual(first, second);
});
