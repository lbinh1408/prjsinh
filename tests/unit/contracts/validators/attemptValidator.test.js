import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAttempt } from './attemptValidator.js';

const MOCK_OPTIONS = {
    knowledgeMap: {
        nodes: [{ id: "K001" }, { id: "K002" }],
        metaSkills: [{ id: "S001" }]
    },
    failureRegistry: {
        failureSignatures: [{ id: "concept_confusion" }]
    },
    studentRegistry: ["stu-001"],
    questions: [
        {
            id: "Q-A-K001-A-001",
            questionType: "mcq",
            evidence: "apply",
            difficulty: "D3"
        }
    ]
};

function createValidAttempt() {
    return {
        schemaVersion: "1.0.0",
        attemptId: "ATT-123456",
        studentId: "stu-001",
        sessionId: "sess-001",
        questionId: "Q-A-K001-A-001",
        startedAt: "2024-03-15T10:00:00.000Z",
        submittedAt: "2024-03-15T10:05:00.000Z",
        response: {
            type: "singleChoice",
            value: "A"
        },
        result: "correct",
        score: 1,
        attemptNumber: 1,
        hint: {
            used: false,
            count: 0
        },
        timing: {
            timeSpentSeconds: 300,
            activeTimeSeconds: 280,
            pausedTimeSeconds: 20
        },
        context: {
            learningMode: "HOC_NHANH",
            action: "PRACTICE",
            pathStage: "PRACTICE",
            nodeId: "K001",
            secondaryNodeIds: ["K002"],
            metaSkillIds: ["S001"]
        },
        diagnostic: {
            failureSignatureId: "concept_confusion",
            sourceNodeId: "K001",
            confidence: 0.8
        },
        evidence: {
            difficulty: "D3",
            primaryDimension: "apply",
            evidenceStrength: 0.9,
            independence: "independent"
        }
    };
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(JSON.parse(JSON.stringify(objToTest)), originalObj, "Attempt object was mutated during validation!");
}

function runAndAssertInvalid(a) {
    const originalA = JSON.parse(JSON.stringify(a));
    const report = validateAttempt(a, MOCK_OPTIONS);
    assert.equal(report.valid, false, "Expected attempt to be INVALID");
    ensureNoMutation(originalA, a);
}

test('attemptValidator V1 test suite', async (t) => {

    await t.test('valid attempt -> VALID', () => {
        const a = createValidAttempt();
        const originalA = JSON.parse(JSON.stringify(a));
        const report = validateAttempt(a, MOCK_OPTIONS);
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true, "Expected base attempt to be VALID");
        ensureNoMutation(originalA, a);
    });

    await t.test('missing required field -> INVALID', () => {
        const a = createValidAttempt();
        delete a.sessionId;
        runAndAssertInvalid(a);
    });

    await t.test('invalid studentId (not in registry) -> INVALID', () => {
        const a = createValidAttempt();
        a.studentId = "unknown-student";
        runAndAssertInvalid(a);
    });

    await t.test('invalid questionId (not in registry) -> INVALID', () => {
        const a = createValidAttempt();
        a.questionId = "unknown-question";
        runAndAssertInvalid(a);
    });

    await t.test('invalid result -> INVALID', () => {
        const a = createValidAttempt();
        a.result = "unknown_result";
        runAndAssertInvalid(a);
    });

    await t.test('invalid score (out of bounds) -> INVALID', () => {
        const a = createValidAttempt();
        a.score = 2; // > 1
        runAndAssertInvalid(a);
    });

    await t.test('invalid response type -> INVALID', () => {
        const a = createValidAttempt();
        a.response.type = "unknownChoice";
        runAndAssertInvalid(a);
    });

    await t.test('submittedAt < startedAt -> INVALID', () => {
        const a = createValidAttempt();
        a.startedAt = "2024-03-15T10:05:00.000Z";
        a.submittedAt = "2024-03-15T10:00:00.000Z";
        runAndAssertInvalid(a);
    });
    
    await t.test('nodeId not in knowledge map -> INVALID', () => {
        const a = createValidAttempt();
        a.context.nodeId = "K999";
        runAndAssertInvalid(a);
    });

    await t.test('failureSignatureId not in registry -> INVALID', () => {
        const a = createValidAttempt();
        a.diagnostic.failureSignatureId = "unknown_signature";
        runAndAssertInvalid(a);
    });

    await t.test('primaryDimension: apply -> VALID', () => {
        const a = createValidAttempt();
        a.evidence.primaryDimension = "apply";
        const originalA = JSON.parse(JSON.stringify(a));
        const report = validateAttempt(a, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected valid attempt");
        ensureNoMutation(originalA, a);
    });

    await t.test('primaryDimension: none -> VALID', () => {
        const a = createValidAttempt();
        a.evidence.primaryDimension = "none";
        const originalA = JSON.parse(JSON.stringify(a));
        const report = validateAttempt(a, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected none to be valid");
        ensureNoMutation(originalA, a);
    });

    await t.test('legacy questionType: Q-A -> INVALID (UNKNOWN_FIELD)', () => {
        const a = createValidAttempt();
        a.evidence.questionType = "Q-A";
        runAndAssertInvalid(a);
    });

    await t.test('attempt primaryDimension:"know" vs question evidence:"apply" -> INVALID (ATTEMPT_EVIDENCE_MISMATCH)', () => {
        const a = createValidAttempt();
        a.evidence.primaryDimension = "know";
        runAndAssertInvalid(a);
    });
});
