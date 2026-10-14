import test from "node:test";
import assert from "node:assert/strict";
import {
    K283_A003_REASONING_CONFIRMATION_PROMPT,
    K283_A004_REASONING_CONFIRMATION_PROMPT,
    submitK283DiagnosticAnswer
} from "../../k283A003DiagnosticConfirmationV1.js";

const questionA003 = {
    id: "Q-A-K283-A-003",
    answer: { type: "single", value: "B" }
};

const questionA004 = {
    id: "Q-A-K283-A-004",
    answer: { type: "single", value: "B" }
};

async function run({ question = questionA003, response, confirmation }) {
    let promptCount = 0;
    let submitCount = 0;
    let submitted = null;
    const result = await submitK283DiagnosticAnswer({
        question,
        response,
        askConfirmation: async prompt => {
            promptCount += 1;
            assert.equal(
                prompt,
                question.id === questionA004.id
                    ? K283_A004_REASONING_CONFIRMATION_PROMPT
                    : K283_A003_REASONING_CONFIRMATION_PROMPT
            );
            return confirmation;
        },
        submit: value => {
            submitCount += 1;
            submitted = value;
            return { attemptId: "attempt-once" };
        }
    });
    assert.equal(submitCount, 1);
    assert.deepEqual(result, { attemptId: "attempt-once" });
    return { promptCount, submitted };
}

test("confirmed arithmetic reasoning attaches the existing calculation_error signature once", async () => {
    const outcome = await run({ response: "A", confirmation: "1" });
    assert.equal(outcome.promptCount, 1);
    assert.equal(outcome.submitted.response, "A");
    assert.deepEqual(outcome.submitted.diagnostic, {
        failureType: "calculation_error",
        failureSignatureId: "calculation_error",
        evidence: "learner_confirmed:understood_two_recombinant_types_but_miscalculated"
    });
});

test("confirmed concept reasoning attaches the existing concept_confusion signature once", async () => {
    const outcome = await run({ response: "C", confirmation: "2" });
    assert.equal(outcome.promptCount, 1);
    assert.equal(outcome.submitted.diagnostic.failureType, "concept_confusion");
    assert.equal(outcome.submitted.diagnostic.failureSignatureId, "concept_confusion");
});

test("ambiguous or unsupported confirmation is submitted without a diagnosis", async () => {
    const outcome = await run({ response: "A", confirmation: "unsure" });
    assert.equal(outcome.promptCount, 1);
    assert.equal(outcome.submitted.diagnostic, null);
});

test("skipping confirmation submits the original answer with diagnostic null", async () => {
    const outcome = await run({ response: "D", confirmation: "skip" });
    assert.equal(outcome.promptCount, 1);
    assert.equal(outcome.submitted.response, "D");
    assert.equal(outcome.submitted.diagnostic, null);
});

test("correct A-003 answer skips confirmation and remains undiagnosed", async () => {
    const outcome = await run({ response: "B", confirmation: "1" });
    assert.equal(outcome.promptCount, 0);
    assert.equal(outcome.submitted.response, "B");
    assert.equal(outcome.submitted.diagnostic, null);
});

test("A-004 explicit arithmetic confirmation uses the same canonical signature as A-003", async () => {
    const a003 = await run({ response: "A", confirmation: "1" });
    const outcome = await run({
        question: questionA004,
        response: "A",
        confirmation: "yes"
    });
    assert.equal(outcome.promptCount, 1);
    assert.deepEqual(outcome.submitted.diagnostic, {
        failureType: "calculation_error",
        failureSignatureId: "calculation_error",
        evidence: "learner_confirmed:identified_recombinant_classes_but_miscalculated_sum"
    });
    assert.equal(
        outcome.submitted.diagnostic.failureType,
        a003.submitted.diagnostic.failureType
    );
    assert.equal(
        outcome.submitted.diagnostic.failureSignatureId,
        a003.submitted.diagnostic.failureSignatureId
    );
});

test("A-004 ambiguous confirmation stays undiagnosed", async () => {
    const outcome = await run({
        question: questionA004,
        response: "A",
        confirmation: "unsure"
    });
    assert.equal(outcome.promptCount, 1);
    assert.equal(outcome.submitted.diagnostic, null);
});
