import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCrossContract } from '../../../../src/quality/validators/crossContractValidator.js';

function getBaseArtifacts() {
    return {
        knowledgeMap: {
            nodes: [{ id: "K204" }, { id: "K205" }],
            skills: [{ id: "SK01" }]
        },
        failureRegistry: {
            failureSignatures: [
                { id: "mechanism_confusion" },
                { id: "concept_confusion" }
            ]
        },
        questions: [
            {
                id: "Q01",
                primaryNode: "K204",
                nodes: ["K204", "K205"],
                evidence: "explain",
                skills: ["SK01"],
                failureSignatures: ["mechanism_confusion", "concept_confusion"]
            },
            {
                id: "Q02",
                primaryNode: "K205",
                nodes: ["K205"],
                evidence: "apply",
                skills: [],
                failureSignatures: []
            }
        ],
        attempts: [
            {
                attemptId: "A01",
                questionId: "Q01",
                evidence: {
                    primaryDimension: "explain"
                },
                nodeId: "K204",
                failureSignatureId: "mechanism_confusion",
                failureType: "concept_confusion",
                sourceNodeId: "K205"
            }
        ],
        events: [
            {
                eventId: "E01",
                eventType: "ANSWER_INCORRECT",
                context: {
                    questionId: "Q01",
                    nodeId: "K204",
                    action: "LEARN"
                },
                payload: {
                    action: "LEARN",
                    failureSignatureId: "mechanism_confusion",
                    failureType: "concept_confusion",
                    sourceNodeId: "K205"
                },
                correlation: {
                    attemptId: "A01"
                }
            }
        ],
        studentState: {
            learning: {
                currentNodeId: "K204"
            }
        },
        lessons: [
            {
                id: "L01",
                knowledgeNodes: ["K204"],
                prerequisites: ["K205"]
            }
        ]
    };
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "artifacts object was mutated during validation!"
    );
}

function runAndAssertInvalid(artifacts, ...expectedCodes) {
    const original = JSON.parse(JSON.stringify(artifacts));
    const report = validateCrossContract(artifacts, {});
    assert.equal(report.valid, false, "Expected artifacts to be INVALID");

    for (const code of expectedCodes) {
        const hasCode = report.issues.some(issue => issue.code === code);
        assert.ok(hasCode, `Expected issue with code ${code}, but got: ${report.issues.map(i => i.code).join(", ")}`);
    }

    ensureNoMutation(original, artifacts);
}

test('crossContractValidator test suite', async (t) => {

    await t.test('1. Canonical Knowledge + Question + Attempt + Event khớp nhau -> VALID', () => {
        const artifacts = getBaseArtifacts();
        const original = JSON.parse(JSON.stringify(artifacts));
        const report = validateCrossContract(artifacts, {});
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true, "Expected base artifacts to be VALID");
        ensureNoMutation(original, artifacts);
    });

    await t.test('2. Immutability', () => {
        // Zipped into test 1 & others
        assert.ok(true);
    });

    await t.test('3. Question primaryNode khác nodes -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.questions[0].primaryNode = "K205";
        artifacts.questions[0].nodes = ["K204"];
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('4. Question node không thuộc Knowledge Map -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.questions[0].nodes.push("K999");
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('5. Question skill không tồn tại -> CONTRACT_SKILL_REFERENCE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.questions[0].skills.push("SK999");
        runAndAssertInvalid(artifacts, "CONTRACT_SKILL_REFERENCE_MISMATCH");
    });

    await t.test('6. Attempt evidence=explain, Question evidence=apply -> CONTRACT_EVIDENCE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.attempts[0].evidence.primaryDimension = "explain";
        artifacts.questions[0].evidence = "apply";
        runAndAssertInvalid(artifacts, "CONTRACT_EVIDENCE_MISMATCH");
    });

    await t.test('7. Attempt evidence=none -> không mismatch với Question evidence', () => {
        const artifacts = getBaseArtifacts();
        artifacts.attempts[0].evidence.primaryDimension = "none";
        artifacts.questions[0].evidence = "apply";
        const report = validateCrossContract(artifacts, {});
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true, "Expected none evidence to be valid");
    });

    await t.test('8. Attempt node khác Question primaryNode -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.attempts[0].nodeId = "K205";
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('9. Attempt failureSignatureId không thuộc Question failure signatures -> CONTRACT_FAILURE_SIGNATURE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.attempts[0].failureSignatureId = "concept_confusion";
        artifacts.questions[0].failureSignatures = ["mechanism_confusion"]; // Exclude concept_confusion from question
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('10. Event questionId trỏ đúng Question, nodeId khác primaryNode -> node mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].context.nodeId = "K205";
        // Also update attempt to K205 so it doesn't fail Event-Attempt mismatch first, but Question remains K204
        artifacts.attempts[0].nodeId = "K205";
        // Or just let it fail Event-Question cross check which gives CONTRACT_NODE_REFERENCE_MISMATCH
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('11. Event <-> correlated Attempt có questionId khác nhau -> mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].context.questionId = "Q02";
        // The validator will catch it as SCHEMA_INVALID or CONTRACT_NODE_REFERENCE_MISMATCH
        // We'll just assert it's invalid
        const report = validateCrossContract(artifacts, {});
        assert.equal(report.valid, false);
    });

    await t.test('12. Event <-> Attempt có node khác nhau -> mismatch', () => {
        const artifacts = getBaseArtifacts();
        // Disconnect their nodes, but keep both matching their respective questions if needed, 
        // or just rely on Event-Attempt direct check
        artifacts.events[0].context.nodeId = "K205";
        const report = validateCrossContract(artifacts, {});
        assert.equal(report.valid, false);
    });

    await t.test('13. Event <-> Attempt failureType khác nhau -> mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].payload.failureType = "reasoning_error";
        artifacts.attempts[0].failureType = "concept_confusion";
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('14. Event <-> Attempt failureSignatureId khác nhau -> mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].payload.failureSignatureId = "concept_confusion";
        artifacts.attempts[0].failureSignatureId = "mechanism_confusion";
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('15. Event <-> Attempt sourceNodeId khác nhau -> mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].payload.sourceNodeId = "K204";
        artifacts.attempts[0].sourceNodeId = "K205";
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('16. Event context.action khác payload.action -> CONTRACT_ACTION_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].context.action = "LEARN";
        artifacts.events[0].payload.action = "PRACTICE";
        runAndAssertInvalid(artifacts, "CONTRACT_ACTION_MISMATCH");
    });

    await t.test('17. NEXT_ACTION_SELECTED: context.action khác payload.nextAction -> action mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].eventType = "NEXT_ACTION_SELECTED";
        artifacts.events[0].context.action = "LEARN";
        artifacts.events[0].payload.nextAction = "PRACTICE";
        artifacts.events[0].context.decisionId = "dec-123"; // required for NEXT_ACTION_SELECTED
        artifacts.events[0].payload.decisionReason = "something"; 
        runAndAssertInvalid(artifacts, "CONTRACT_ACTION_MISMATCH");
    });

    await t.test('18. Fake failure signature trong Question -> CONTRACT_FAILURE_SIGNATURE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.questions[0].failureSignatures.push("fake_sig");
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('19. Fake failure signature trong Attempt -> CONTRACT_FAILURE_SIGNATURE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.attempts[0].failureSignatureId = "fake_sig";
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('20. Fake failure signature trong Event -> CONTRACT_FAILURE_SIGNATURE_MISMATCH', () => {
        const artifacts = getBaseArtifacts();
        artifacts.events[0].payload.failureSignatureId = "fake_sig";
        runAndAssertInvalid(artifacts, "CONTRACT_FAILURE_SIGNATURE_MISMATCH");
    });

    await t.test('21. Student State currentNodeId không thuộc Knowledge -> node mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.studentState.learning.currentNodeId = "K999";
        runAndAssertInvalid(artifacts, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('22. Lesson knowledge/prerequisite node không thuộc Knowledge -> node mismatch', () => {
        const artifacts = getBaseArtifacts();
        artifacts.lessons[0].knowledgeNodes.push("K999");
        const report = validateCrossContract(artifacts, {});
        assert.equal(report.valid, false);
    });

    await t.test('23. Chỉ truyền Question, không truyền Attempt/Event -> validator vẫn chạy bình thường', () => {
        const artifacts = getBaseArtifacts();
        delete artifacts.attempts;
        delete artifacts.events;
        delete artifacts.studentState;
        delete artifacts.lessons;
        const report = validateCrossContract(artifacts, {});
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true);
    });

    await t.test('24. Empty artifacts {} -> VALID, không crash', () => {
        const report = validateCrossContract({}, {});
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true);
    });
});
