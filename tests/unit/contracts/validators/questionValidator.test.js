import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from '../../../../src/contracts/validators/questionValidator.js';

const MOCK_OPTIONS = {
    knowledgeMap: {
        nodes: [
            { id: "K001" },
            { id: "K002" }
        ],
        metaSkills: [
            { id: "S001" }
        ]
    },
    failureRegistry: {
        failureSignatures: [
            { id: "concept_confusion" }
        ]
    }
};

function createValidQuestion() {
    return {
        id: "Q-A-K001-A-001",
        version: "1.0.0",
        nodes: ["K001"],
        primaryNode: "K001",
        evidence: "apply",
        difficulty: "D3",
        questionType: "mcq",
        mode: ["practice"],
        content: {
            stem: "Question stem",
            options: [
                { id: "A", text: "Option A", isCorrect: true },
                { id: "B", text: "Option B", isCorrect: false }
            ]
        },
        answer: {
            type: "single",
            value: "A"
        },
        scoring: {
            maxScore: 1
        },
        failureSignatures: ["concept_confusion"],
        explanation: {
            correct: "Explanation text"
        }
    };
}

function createValidMultiSelect() {
    const q = createValidQuestion();
    q.questionType = "multi_select";
    q.content.options = [
        { id: "A", text: "Option A", isCorrect: true },
        { id: "B", text: "Option B", isCorrect: true },
        { id: "C", text: "Option C", isCorrect: false }
    ];
    q.answer = {
        type: "multiple",
        values: ["A", "B"]
    };
    return q;
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(JSON.parse(JSON.stringify(objToTest)), originalObj, "Question object was mutated during validation!");
}

function runAndAssertInvalid(q) {
    const originalQ = JSON.parse(JSON.stringify(q));
    const report = validateQuestion(q, MOCK_OPTIONS);
    assert.equal(report.valid, false, "Expected question to be INVALID");
    ensureNoMutation(originalQ, q);
}

test('questionValidator V1 test suite', async (t) => {

    await t.test('valid question -> VALID', () => {
        const q = createValidQuestion();
        const originalQ = JSON.parse(JSON.stringify(q));
        const report = validateQuestion(q, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected base question to be VALID");
        ensureNoMutation(originalQ, q);
    });

    await t.test('primaryNode không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.primaryNode = "K999"; 
        q.nodes = ["K001", "K999"]; // keep in nodes to isolate primary node exist check
        runAndAssertInvalid(q);
    });

    await t.test('primaryNode không nằm trong nodes -> INVALID', () => {
        const q = createValidQuestion();
        q.nodes = ["K002"]; // Primary is K001, so this mismatches
        runAndAssertInvalid(q);
    });

    await t.test('node không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.nodes = ["K001", "K999"]; // K999 is not in MOCK_OPTIONS
        runAndAssertInvalid(q);
    });

    await t.test('secondaryNode không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.secondaryNodes = ["K999"];
        runAndAssertInvalid(q);
    });

    await t.test('prerequisite không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.prerequisites = ["K999"];
        runAndAssertInvalid(q);
    });

    await t.test('skill không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.skills = ["S999"];
        runAndAssertInvalid(q);
    });

    await t.test('failureSignature không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.failureSignatures = ["unknown_signature"];
        runAndAssertInvalid(q);
    });

    await t.test('evidence = diagnostic -> INVALID', () => {
        const q = createValidQuestion();
        q.evidence = "diagnostic";
        runAndAssertInvalid(q);
    });

    await t.test('difficulty = D9 -> INVALID', () => {
        const q = createValidQuestion();
        q.difficulty = "D9";
        runAndAssertInvalid(q);
    });

    await t.test('mode không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.mode = ["non_existent_mode"];
        runAndAssertInvalid(q);
    });

    await t.test('questionType không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.questionType = "non_existent_type";
        runAndAssertInvalid(q);
    });

    await t.test('MCQ answer.value không tồn tại -> INVALID', () => {
        const q = createValidQuestion();
        q.answer.value = "C"; // C doesn't exist in options
        runAndAssertInvalid(q);
    });

    await t.test('MCQ không có correct option -> INVALID', () => {
        const q = createValidQuestion();
        q.content.options[0].isCorrect = false;
        q.content.options[1].isCorrect = false;
        runAndAssertInvalid(q);
    });

    await t.test('MCQ có >1 correct option -> INVALID', () => {
        const q = createValidQuestion();
        q.content.options[0].isCorrect = true;
        q.content.options[1].isCorrect = true;
        runAndAssertInvalid(q);
    });

    await t.test('answer.value ≠ isCorrect -> INVALID', () => {
        const q = createValidQuestion();
        q.answer.value = "B"; // Canonical answer is B
        q.content.options[0].isCorrect = true; // But option A is marked correct
        q.content.options[1].isCorrect = false;
        runAndAssertInvalid(q);
    });

    await t.test('multi_select answer/options mismatch -> INVALID', () => {
        const q = createValidMultiSelect();
        // Canonical says A and B, but option B is marked false
        q.content.options[1].isCorrect = false; 
        runAndAssertInvalid(q);
    });

    await t.test('transfer thiếu contextId -> INVALID', () => {
        const q = createValidQuestion();
        q.evidence = "transfer";
        // no q.context provided
        runAndAssertInvalid(q);
    });

    await t.test('retest thiếu contextId -> INVALID', () => {
        const q = createValidQuestion();
        q.mode = ["retest"];
        // no q.context provided
        runAndAssertInvalid(q);
    });

    await t.test('retest thiếu retestGroupId -> INVALID', () => {
        const q = createValidQuestion();
        q.mode = ["retest"];
        q.context = { contextId: "CTX-123", contextType: "direct" };
        q.metadata = {}; // no retestGroupId
        runAndAssertInvalid(q);
    });

    await t.test('hint > 2 levels -> INVALID', () => {
        const q = createValidQuestion();
        q.hint = {
            enabled: true,
            levels: [
                { level: 1, text: "Hint 1" },
                { level: 2, text: "Hint 2" },
                { level: 3, text: "Hint 3" }
            ]
        };
        runAndAssertInvalid(q);
    });
    await t.test('data_analysis + number -> VALID', () => {
        const q = createValidQuestion();
        q.questionType = "data_analysis";
        q.answer = {
            type: "number",
            value: 42
        };
        const originalQ = JSON.parse(JSON.stringify(q));
        const report = validateQuestion(q, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected data_analysis + number to be VALID");
        ensureNoMutation(originalQ, q);
    });

    await t.test('data_analysis + single -> VALID', () => {
        const q = createValidQuestion();
        q.questionType = "data_analysis";
        // It already has answer.type = "single" and valid options
        const originalQ = JSON.parse(JSON.stringify(q));
        const report = validateQuestion(q, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected data_analysis + single to be VALID");
        ensureNoMutation(originalQ, q);
    });

    await t.test('experiment + text -> VALID', () => {
        const q = createValidQuestion();
        q.questionType = "experiment";
        q.answer = {
            type: "text",
            acceptedAnswers: ["valid answer"]
        };
        const originalQ = JSON.parse(JSON.stringify(q));
        const report = validateQuestion(q, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected experiment + text to be VALID");
        ensureNoMutation(originalQ, q);
    });

    await t.test('sequence + sequence -> VALID', () => {
        const q = createValidQuestion();
        q.questionType = "sequence";
        q.answer = {
            type: "sequence",
            order: ["step1", "step2"]
        };
        const originalQ = JSON.parse(JSON.stringify(q));
        const report = validateQuestion(q, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected sequence + sequence to be VALID");
        ensureNoMutation(originalQ, q);
    });

    await t.test('mcq + number -> INVALID (QUESTION_ANSWER_TYPE_MISMATCH)', () => {
        const q = createValidQuestion();
        q.questionType = "mcq";
        q.answer = {
            type: "number",
            value: 10
        };
        runAndAssertInvalid(q);
    });

    await t.test('thiếu explanation -> INVALID', () => {
        const q = createValidQuestion();
        delete q.explanation;
        runAndAssertInvalid(q);
    });
});
