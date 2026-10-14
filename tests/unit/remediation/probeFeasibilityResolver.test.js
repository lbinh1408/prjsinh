import test from "node:test";
import assert from "node:assert/strict";
import questionBank from "../../../src/data/questions/c09/K283.question-bank.json" with { type: "json" };
import { resolveProbeFeasibility } from "../../../src/engines/remediation/probeFeasibilityResolver.js";

const bankIdentity = { bankId: questionBank.bankId, version: questionBank.version };

function proposedProbe({
    difficulty = "D1",
    evidenceDimension = "apply",
    questionTypes = ["mcq"]
} = {}) {
    return {
        targetNodeId: "K283",
        difficulty,
        questionTypes,
        successCriteria: {
            minimumResult: "correct",
            requiredEvidenceDimension: evidenceDimension
        }
    };
}

test("K283 calculation_error D1/apply is infeasible", () => {
    const result = resolveProbeFeasibility({
        proposedProbe: proposedProbe(),
        targetNodeId: "K283",
        bankIdentity,
        questionBank
    });
    assert.deepEqual(result, {
        status: "INFEASIBLE",
        reasonCode: "NO_ELIGIBLE_BANK_QUESTION",
        eligibleQuestionIds: []
    });
});

test("K283 D3/apply resolves real selector-compatible questions", () => {
    const result = resolveProbeFeasibility({
        proposedProbe: proposedProbe({ difficulty: "D3" }),
        targetNodeId: "K283",
        bankIdentity,
        questionBank
    });
    assert.equal(result.status, "FEASIBLE");
    assert.equal(result.reasonCode, "ELIGIBLE_QUESTIONS_FOUND");
    assert.ok(result.eligibleQuestionIds.length > 0);
    for (const id of result.eligibleQuestionIds) {
        const question = questionBank.questions.find(item => item.id === id);
        assert.equal(question.primaryNode, "K283");
        assert.equal(question.difficulty, "D3");
        assert.equal(question.evidence, "apply");
        assert.ok(["practice", "remediation"].some(mode => question.mode.includes(mode)));
    }
});

test("conflicting selector evidence constraints are distinguished from no bank match", () => {
    const result = resolveProbeFeasibility({
        proposedProbe: proposedProbe({ difficulty: "D3" }),
        targetNodeId: "K283",
        bankIdentity,
        questionBank,
        selectorConstraints: { evidenceDimensions: ["know"] }
    });
    assert.equal(result.status, "INFEASIBLE");
    assert.equal(result.reasonCode, "EVIDENCE_DIMENSION_CONFLICT");
});

test("question type intersection and QuestionSelector remediation-mode eligibility are honored", () => {
    const data = {
        bankId: "QB-TEST",
        version: "1.0",
        primaryNode: "K283",
        questions: [
            { id: "Q-LEARN", primaryNode: "K283", evidence: "apply", difficulty: "D3", questionType: "mcq", mode: ["learning"] },
            { id: "Q-NUMERIC", primaryNode: "K283", evidence: "apply", difficulty: "D3", questionType: "numeric", mode: ["practice"] },
            { id: "Q-PRACTICE", primaryNode: "K283", evidence: "apply", difficulty: "D3", questionType: "mcq", mode: ["practice"] }
        ]
    };
    const result = resolveProbeFeasibility({
        proposedProbe: proposedProbe({ difficulty: "D3", questionTypes: ["mcq", "numeric"] }),
        targetNodeId: "K283",
        bankIdentity: { bankId: data.bankId, version: data.version },
        questionBank: data,
        selectorConstraints: { questionTypes: ["mcq"] }
    });
    assert.deepEqual(result, {
        status: "FEASIBLE",
        reasonCode: "ELIGIBLE_QUESTIONS_FOUND",
        eligibleQuestionIds: ["Q-PRACTICE"]
    });
});

test("unknown target and mismatched bank identity fail with distinct reasons", () => {
    const base = {
        proposedProbe: proposedProbe({ difficulty: "D3" }),
        targetNodeId: "K283",
        bankIdentity,
        questionBank
    };
    assert.equal(
        resolveProbeFeasibility({ ...base, targetNodeId: "K999" }).reasonCode,
        "UNKNOWN_TARGET"
    );
    assert.equal(
        resolveProbeFeasibility({
            ...base,
            bankIdentity: { ...bankIdentity, version: "wrong-version" }
        }).reasonCode,
        "BANK_IDENTITY_MISMATCH"
    );
});

test("resolver is deterministic and leaves inputs unchanged", () => {
    const probe = proposedProbe({ difficulty: "D3" });
    const constraints = { evidenceDimensions: ["apply"], excludeQuestionIds: ["Q-A-K283-A-005"] };
    const beforeProbe = structuredClone(probe);
    const beforeBank = structuredClone(questionBank);
    const beforeConstraints = structuredClone(constraints);
    const args = {
        proposedProbe: probe,
        targetNodeId: "K283",
        bankIdentity,
        questionBank,
        selectorConstraints: constraints
    };
    const first = resolveProbeFeasibility(args);
    const second = resolveProbeFeasibility(args);
    assert.deepEqual(first, second);
    assert.deepEqual(probe, beforeProbe);
    assert.deepEqual(questionBank, beforeBank);
    assert.deepEqual(constraints, beforeConstraints);
});
