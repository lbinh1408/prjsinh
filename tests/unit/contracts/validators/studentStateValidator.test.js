import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStudentState } from '../../../../src/contracts/validators/studentStateValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to canonical fixture
const FIXTURE_PATH = join(__dirname, '../../../../src/data/student/student-state.json');

const MOCK_OPTIONS = {
    knowledgeMap: {
        nodes: [
            { id: "K013" },
            { id: "K200" },
            { id: "K201" },
            { id: "K202" },
            { id: "K204" },
            { id: "K205" },
            { id: "K206" },
            { id: "K208" }
        ],
        clusters: [
            { id: "C01" },
            { id: "C02" },
            { id: "C05" }
        ],
        metaSkills: [
            { id: "S001" },
            { id: "S002" },
            { id: "S003" }
        ]
    },
    failureRegistry: {
        failureSignatures: [
            { id: "careless_error" },
            { id: "mechanism_confusion" },
            { id: "source_knowledge_gap" },
            { id: "cross_node_reasoning_error" },
            { id: "data_interpretation_error" }
        ]
    }
};

function getBaseState() {
    return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "studentState object was mutated during validation!"
    );
}

function runAndAssertInvalid(state, ...expectedCodes) {
    const originalState = JSON.parse(JSON.stringify(state));
    const report = validateStudentState(state, MOCK_OPTIONS);
    assert.equal(report.valid, false, "Expected state to be INVALID");

    for (const code of expectedCodes) {
        const hasCode = report.issues.some(issue => issue.code === code);
        assert.ok(hasCode, `Expected issue with code ${code}, but got: ${report.issues.map(i => i.code).join(", ")}`);
    }

    ensureNoMutation(originalState, state);
}

test('studentStateValidator test suite', async (t) => {

    await t.test('canonical fixture -> VALID (and immutability check)', () => {
        const state = getBaseState();
        const originalState = JSON.parse(JSON.stringify(state));
        const report = validateStudentState(state, MOCK_OPTIONS);

        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }

        assert.equal(report.valid, true, "Expected base fixture to be VALID");
        ensureNoMutation(originalState, state);
    });

    await t.test('node K999 -> STATE_NODE_NOT_FOUND', () => {
        const state = getBaseState();
        state.knowledge.K999 = state.knowledge.K200; // Clone a valid node structure but key is K999
        // K999 is not in MOCK_OPTIONS.knowledgeMap
        runAndAssertInvalid(state, "STATE_NODE_NOT_FOUND");
    });

    await t.test('sourceNodeId:"K999" -> STATE_SOURCE_NODE_NOT_FOUND', () => {
        const state = getBaseState();
        // Modify K206 lastFailure's sourceNodeId
        state.knowledge.K206.lastFailure.sourceNodeId = "K999";
        runAndAssertInvalid(state, "STATE_SOURCE_NODE_NOT_FOUND");
    });

    await t.test('failureSignatureId giả khi có registry -> STATE_FAILURE_SIGNATURE_NOT_FOUND', () => {
        const state = getBaseState();
        state.knowledge.K206.lastFailure.failureSignatureId = "FS_FAKE_999";
        runAndAssertInvalid(state, "STATE_FAILURE_SIGNATURE_NOT_FOUND");
    });

    await t.test('mastery M9 -> STATE_INVALID_MASTERY', () => {
        const state = getBaseState();
        state.knowledge.K200.mastery = "M9";
        runAndAssertInvalid(state, "STATE_INVALID_MASTERY");
    });

    await t.test('evidence 1.2 -> STATE_INVALID_EVIDENCE', () => {
        const state = getBaseState();
        state.knowledge.K200.evidence.know = 1.2;
        runAndAssertInvalid(state, "STATE_INVALID_EVIDENCE");
    });

    await t.test('confidence "very_high" -> STATE_INVALID_CONFIDENCE', () => {
        const state = getBaseState();
        state.knowledge.K200.confidence = "extreme";
        runAndAssertInvalid(state, "STATE_INVALID_CONFIDENCE");
    });

    await t.test('current action "DIAGNOSTIC" -> STATE_INVALID_CURRENT_ACTION', () => {
        const state = getBaseState();
        state.learning.current.action = "DIAGNOSTIC";
        runAndAssertInvalid(state, "STATE_INVALID_CURRENT_ACTION");
    });

    await t.test('attemptStats.total sai tổng -> INVALID (SCHEMA_INVALID)', () => {
        const state = getBaseState();
        state.knowledge.K200.attemptStats.total = 999;
        runAndAssertInvalid(state, "SCHEMA_INVALID");
    });

    await t.test('retest.attempted:false nhưng passed:true -> INVALID (SCHEMA_INVALID)', () => {
        const state = getBaseState();
        state.knowledge.K200.retest.attempted = false;
        state.knowledge.K200.retest.passed = true;
        // In the validator, this is caught by validateRetest which adds SCHEMA_INVALID
        runAndAssertInvalid(state, "SCHEMA_INVALID");
    });

    await t.test('progress.nodes.total sai tổng -> INVALID (SCHEMA_INVALID)', () => {
        const state = getBaseState();
        state.progress.nodes.total = 9999;
        // The sum of unstarted, developing, mastered, stable is 132+6+9+3 = 150. Total is 150.
        // If we set total to 9999, it should mismatch.
        runAndAssertInvalid(state, "SCHEMA_INVALID");
    });

    await t.test('unknown field -> UNKNOWN_FIELD', () => {
        const state = getBaseState();
        state.unknownProperty = "something";
        runAndAssertInvalid(state, "UNKNOWN_FIELD");
    });

});
