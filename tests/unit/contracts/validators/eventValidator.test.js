import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent } from '../../../../src/contracts/validators/eventValidator.js';

const MOCK_OPTIONS = {
    knowledgeMap: {
        nodes: [
            { id: "K206" }
        ]
    },
    questions: {
        "Q-A206-002": {
            id: "Q-A206-002",
            primaryNode: "K206"
        }
    },
    failureRegistry: {
        failureSignatures: [
            { id: "mechanism_confusion" }
        ]
    }
};

function getBaseEvent() {
    return {
        "schemaVersion": "1.0.0",
        "eventId": "evt-001",
        "eventType": "ANSWER_CORRECT",
        "timestamp": "2026-09-20T09:15:00Z",
        "studentId": "S123",
        "sessionId": "sess-456",
        "source": {
            "component": "QuestionEngine"
        },
        "context": {
            "learningMode": "HOC_NHANH",
            "nodeId": "K206",
            "questionId": "Q-A206-002"
        },
        "payload": {
            "result": "correct",
            "attemptNumber": 1
        },
        "correlation": {
            "attemptId": "att-001"
        }
    };
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "event object was mutated during validation!"
    );
}

function runAndAssertInvalid(event, ...expectedCodes) {
    const originalEvent = JSON.parse(JSON.stringify(event));
    const report = validateEvent(event, MOCK_OPTIONS);
    assert.equal(report.valid, false, "Expected event to be INVALID");

    for (const code of expectedCodes) {
        const hasCode = report.issues.some(issue => issue.code === code);
        assert.ok(hasCode, `Expected issue with code ${code}, but got: ${report.issues.map(i => i.code).join(", ")}`);
    }

    ensureNoMutation(originalEvent, event);
}

test('eventValidator test suite', async (t) => {

    await t.test('1. canonical valid event & immutability', () => {
        const event = getBaseEvent();
        const original = JSON.parse(JSON.stringify(event));
        const report = validateEvent(event, MOCK_OPTIONS);

        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }

        assert.equal(report.valid, true, "Expected base fixture to be VALID");
        ensureNoMutation(original, event);
    });

    await t.test('2. unknown field -> UNKNOWN_FIELD', () => {
        const event = getBaseEvent();
        event.fakeField = "hello";
        runAndAssertInvalid(event, "UNKNOWN_FIELD");
    });

    await t.test('3. invalid eventType -> INVALID_ENUM_VALUE', () => {
        const event = getBaseEvent();
        event.eventType = "SLEEPING";
        runAndAssertInvalid(event, "INVALID_ENUM_VALUE");
    });

    await t.test('4. missing questionId cho QUESTION_SUBMITTED -> REQUIRED_FIELD_MISSING', () => {
        const event = getBaseEvent();
        event.eventType = "QUESTION_SUBMITTED";
        delete event.context.questionId;
        runAndAssertInvalid(event, "REQUIRED_FIELD_MISSING");
    });

    await t.test('5. missing attemptId -> REQUIRED_FIELD_MISSING', () => {
        const event = getBaseEvent();
        event.eventType = "QUESTION_SUBMITTED";
        delete event.correlation.attemptId;
        runAndAssertInvalid(event, "REQUIRED_FIELD_MISSING");
    });

    await t.test('6. ANSWER_CORRECT nhưng result=incorrect -> SCHEMA_INVALID', () => {
        const event = getBaseEvent();
        event.eventType = "ANSWER_CORRECT";
        event.payload.result = "incorrect";
        runAndAssertInvalid(event, "SCHEMA_INVALID");
    });

    await t.test('7. hintLevel=3 -> INVALID_FORMAT', () => {
        const event = getBaseEvent();
        event.eventType = "HINT_REQUESTED";
        event.payload.hintUsed = true;
        event.payload.hintLevel = 3;
        runAndAssertInvalid(event, "INVALID_FORMAT");
    });

    await t.test('8. nonexistent K999 -> KNOWLEDGE_NODE_NOT_FOUND', () => {
        const event = getBaseEvent();
        event.context.nodeId = "K999";
        runAndAssertInvalid(event, "KNOWLEDGE_NODE_NOT_FOUND");
    });

    await t.test('9. nonexistent question -> QUESTION_NODE_NOT_FOUND', () => {
        const event = getBaseEvent();
        event.context.questionId = "Q-FAKE-999";
        runAndAssertInvalid(event, "QUESTION_NODE_NOT_FOUND");
    });

    await t.test('10. fake failureSignatureId -> FAILURE_SIGNATURE_NOT_FOUND', () => {
        const event = getBaseEvent();
        event.eventType = "FAILURE_DETECTED";
        event.payload.failureType = "concept_confusion";
        event.payload.failureSignatureId = "fake_signature";
        runAndAssertInvalid(event, "FAILURE_SIGNATURE_NOT_FOUND");
    });

    await t.test('11. MASTERY_UPDATED thiếu masteryLevel -> REQUIRED_FIELD_MISSING', () => {
        const event = getBaseEvent();
        event.eventType = "MASTERY_UPDATED";
        event.payload = { status: "developing" }; // Missing masteryLevel
        runAndAssertInvalid(event, "REQUIRED_FIELD_MISSING");
    });

    await t.test('12. FAILURE_DETECTED thiếu failureType -> REQUIRED_FIELD_MISSING', () => {
        const event = getBaseEvent();
        event.eventType = "FAILURE_DETECTED";
        event.payload = {}; // missing failureType
        runAndAssertInvalid(event, "REQUIRED_FIELD_MISSING");
    });

    await t.test('13. NEXT_ACTION_SELECTED thiếu decisionId -> REQUIRED_FIELD_MISSING', () => {
        const event = getBaseEvent();
        event.eventType = "NEXT_ACTION_SELECTED";
        event.payload = { nextAction: "LEARN", decisionReason: "something" };
        delete event.context.decisionId;
        delete event.correlation.decisionId;
        runAndAssertInvalid(event, "REQUIRED_FIELD_MISSING");
    });

    await t.test('14. remediation IDs conflict -> SCHEMA_INVALID', () => {
        const event = getBaseEvent();
        event.eventType = "REMEDIATION_STARTED";
        event.payload = { failureType: "concept_confusion" };
        event.context.remediationId = "rem-123";
        event.correlation.remediationId = "rem-999";
        runAndAssertInvalid(event, "SCHEMA_INVALID");
    });

    await t.test('15. Valid NEXT_ACTION_SELECTED event', () => {
        const event = getBaseEvent();
        event.eventType = "NEXT_ACTION_SELECTED";
        event.payload = { nextAction: "LEARN", decisionReason: "something" };
        event.context.decisionId = "dec-123";
        const report = validateEvent(event, MOCK_OPTIONS);
        assert.equal(report.valid, true, "Expected valid event");
    });
});
