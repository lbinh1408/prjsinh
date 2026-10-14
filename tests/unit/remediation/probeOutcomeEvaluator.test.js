import test from "node:test";
import assert from "node:assert/strict";

import {
    evaluateProbeOutcome
} from "../../../src/engines/remediation/probeOutcomeEvaluator.js";

function makePlan(successCriteria = {
    minimumResult: "correct",
    requiredEvidenceDimension: "apply",
    minimumEvidence: 0.7
}) {
    return {
        remediationId: "REM-001",
        probe: {
            required: true,
            type: "MINI_PROBE",
            targetNodeId: "K283",
            successCriteria
        }
    };
}

function makeAttempt(overrides = {}) {
    return {
        result: "correct",
        evidence: {
            primaryDimension: "apply",
            evidenceStrength: 0.8
        },
        context: {
            action: "REMEDIATE",
            pathStage: "MINI_PROBE",
            remediationId: "REM-001",
            nodeId: "K283"
        },
        ...overrides
    };
}

test("accepts a probe that satisfies every configured criterion", () => {
    assert.deepEqual(
        evaluateProbeOutcome({ attempt: makeAttempt(), remediationPlan: makePlan() }),
        { isProbe: true, passed: true, reason: "SUCCESS_CRITERIA_MET" }
    );
});

test("rejects a wrong answer", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt({ result: "incorrect" }),
        remediationPlan: makePlan()
    });
    assert.deepEqual(outcome, {
        isProbe: true, passed: false, reason: "MINIMUM_RESULT_NOT_MET"
    });
});

test("rejects an attempt for a different probe target", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt({
            context: { ...makeAttempt().context, nodeId: "K282" }
        }),
        remediationPlan: makePlan()
    });
    assert.deepEqual(outcome, {
        isProbe: true, passed: false, reason: "PROBE_TARGET_MISMATCH"
    });
});

test("does not classify an ordinary attempt as a probe", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt({
            context: { ...makeAttempt().context, pathStage: "PRACTICE" }
        }),
        remediationPlan: makePlan()
    });
    assert.deepEqual(outcome, {
        isProbe: false, passed: false, reason: "NOT_A_PROBE"
    });
});

test("fails closed when probe identity is missing", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt({
            context: { ...makeAttempt().context, remediationId: undefined }
        }),
        remediationPlan: makePlan()
    });
    assert.deepEqual(outcome, {
        isProbe: true, passed: false, reason: "MISSING_PROBE_IDENTITY"
    });
});

test("rejects evidence below the configured threshold", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt({
            evidence: { primaryDimension: "apply", evidenceStrength: 0.69 }
        }),
        remediationPlan: makePlan()
    });
    assert.deepEqual(outcome, {
        isProbe: true, passed: false, reason: "MINIMUM_EVIDENCE_NOT_MET"
    });
});

test("fails closed on malformed success criteria", () => {
    const outcome = evaluateProbeOutcome({
        attempt: makeAttempt(),
        remediationPlan: makePlan({
            minimumResult: "almost_correct",
            minimumEvidence: 1.2
        })
    });
    assert.deepEqual(outcome, {
        isProbe: true, passed: false, reason: "MALFORMED_SUCCESS_CRITERIA"
    });
});

test("requires pre/post mastery evidence to prove evidence improvement", () => {
    const attempt = makeAttempt();
    const remediationPlan = makePlan({
        minimumResult: "mastery_evidence_improved",
        requiredEvidenceDimension: "apply"
    });
    const masteryUpdate = {
        previous: { evidence: { apply: 0.4 } },
        current: { evidence: { apply: 0.5 } }
    };

    assert.deepEqual(
        evaluateProbeOutcome({ attempt, remediationPlan, masteryUpdate }),
        { isProbe: true, passed: true, reason: "SUCCESS_CRITERIA_MET" }
    );
    assert.deepEqual(
        evaluateProbeOutcome({
            attempt,
            remediationPlan,
            masteryUpdate: {
                previous: { evidence: { apply: 0.5 } },
                current: { evidence: { apply: 0.5 } }
            }
        }),
        { isProbe: true, passed: false, reason: "MASTERY_EVIDENCE_NOT_IMPROVED" }
    );
});
