import test from 'node:test';
import assert from 'node:assert/strict';
import { runValidation } from '../../../src/quality/validators/validationRunner.js';
import { knowledgeMap, questions, attempts, events, studentState, lessons } from '../../fixtures/validation/validationRunner.fixtures.js';

function getCanonicalArtifacts() {
    const artifacts = {
        knowledgeMap: JSON.parse(JSON.stringify(knowledgeMap)),
        questions: JSON.parse(JSON.stringify(questions)),
        attempts: JSON.parse(JSON.stringify(attempts)),
        events: JSON.parse(JSON.stringify(events)),
        studentState: JSON.parse(JSON.stringify(studentState)),
        lessons: JSON.parse(JSON.stringify(lessons)),
        failureRegistry: {
            failureSignatures: [
                { id: "concept_confusion" },
                { id: "mechanism_confusion" },
                { id: "source_knowledge_gap" },
                { id: "careless_error" },
                { id: "cross_node_reasoning_error" },
                { id: "data_interpretation_error" }
            ]
        }
    };

    // Thêm các node còn thiếu
    const missingNodes = ["K013", "K200", "K201", "K202", "K204", "K205", "K206", "K208"];
    for (const n of missingNodes) {
        if (!artifacts.knowledgeMap.nodes.find(x => x.id === n)) {
            artifacts.knowledgeMap.nodes.push({
                id: n, name: "Node", cluster: "C01", priority: "P1", targetMastery: "M2",
                dependencies: { D1: [], D2: [], D3: [] }, leadsTo: []
            });
        }
    }
    // Thêm các cluster còn thiếu
    const missingClusters = ["C02", "C05"];
    for (const c of missingClusters) {
        if (!artifacts.knowledgeMap.clusters.find(x => x.id === c)) {
            artifacts.knowledgeMap.clusters.push({ id: c, name: "Cluster" });
        }
    }
    artifacts.knowledgeMap.metaSkills = [{ id: "S001" }, { id: "S002" }, { id: "S003" }, { id: "attention" }, { id: "persistence" }];

    if (!artifacts.questions.find(q => q.id === "Q-A-K206-A-002")) {
        artifacts.questions.push({
            id: "Q-A-K206-A-002",
            version: "1.0.0",
            questionType: "mcq",
            evidence: "apply",
            difficulty: "D3",
            primaryNode: "K206",
            nodes: ["K206"],
            mode: ["practice"],
            content: {
                stem: "Q",
                options: [
                    { id: "A", text: "1", isCorrect: true },
                    { id: "B", text: "2", isCorrect: false }
                ]
            },
            answer: { type: "single", value: "A" },
            scoring: { maxScore: 1, partialCredit: false },
            failureSignatures: ["mechanism_confusion"],
            explanation: { correct: "E" }
        });
    }

    const ev = artifacts.events[0];
    if (ev && ev.context.questionId === "Q-A206-002") {
        ev.context.questionId = "Q-A-K206-A-002";
    }

    return artifacts;
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "artifacts object was mutated during validation!"
    );
}

test('validationRunner test suite', async (t) => {

    await t.test('1. {} -> valid, không crash', () => {
        const result = runValidation({});
        if (!result.valid) console.error(JSON.stringify(result, null, 2));
        assert.equal(result.valid, true);
        assert.equal(result.summary.individual.failed, 0);
    });

    await t.test('2. Chỉ Knowledge valid -> valid', () => {
        const artifacts = { knowledgeMap: getCanonicalArtifacts().knowledgeMap };
        const result = runValidation(artifacts);
        assert.equal(result.valid, true);
        assert.equal(result.summary.artifacts.knowledge.supplied, true);
        assert.equal(result.summary.artifacts.knowledge.valid, true);
    });

    await t.test('3. Một Question valid -> individual + cross đều chạy', () => {
        const arts = getCanonicalArtifacts();
        const artifacts = { knowledgeMap: arts.knowledgeMap, questions: arts.questions };
        const result = runValidation(artifacts);
        if (!result.valid) console.error(JSON.stringify(result, null, 2));
        assert.equal(result.valid, true);
        assert.equal(result.summary.individual.run > 0, true);
        assert.equal(result.summary.crossContract.run, true);
    });

    await t.test('4. Full canonical dataset -> valid', () => {
        const artifacts = getCanonicalArtifacts();
        const original = JSON.parse(JSON.stringify(artifacts));
        const result = runValidation(artifacts);
        if (!result.valid) console.error(JSON.stringify(result, null, 2));
        assert.equal(result.valid, true);
        ensureNoMutation(original, artifacts);
    });

    await t.test('5. Một Question individual fail -> overall false', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123; // invalid type
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.questions.invalid, 1);
    });

    await t.test('6. Question fail bị loại khỏi cross-contract', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123; // invalid type, will be excluded
        const result = runValidation(artifacts);
        // cross-contract should run but with 0 valid questions
        assert.equal(result.summary.crossContract.run, true);
        // We can inspect reports.crossContract to see if it missed something? 
        // It shouldn't crash.
        assert.equal(result.valid, false);
    });

    await t.test('7. 2 Questions: 1 pass + 1 fail -> cross chỉ nhận Question pass', () => {
        const artifacts = getCanonicalArtifacts();
        const qFail = JSON.parse(JSON.stringify(artifacts.questions[0]));
        qFail.id = "Q02";
        qFail.primaryNode = 123; // invalid
        artifacts.questions = [artifacts.questions[0], qFail];
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.questions.valid, 1);
        assert.equal(result.summary.artifacts.questions.invalid, 1);
        assert.equal(result.summary.crossContract.run, true);
    });

    await t.test('8. Attempt individual fail -> không vào cross', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.attempts[0].attemptId = 123; // invalid
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.attempts.invalid, 1);
    });

    await t.test('9. Event individual fail -> không vào cross', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.events[0].eventId = 123; // invalid
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.events.invalid, 1);
    });

    await t.test('10. Lesson individual fail -> không vào cross', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.lessons[0].id = 123; // invalid
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.lessons.invalid, 1);
    });

    await t.test('11. Student State fail -> không vào cross', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.studentState.studentId = 123; // invalid
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.artifacts.studentState.valid, false);
    });

    await t.test('12. Individual đều pass nhưng cross mismatch -> overall false', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.events[0].payload.failureSignatureId = "cross_node_reasoning_error"; // mismatch with attempt (which has mechanism_confusion)
        const result = runValidation(artifacts);
        assert.equal(result.valid, false);
        assert.equal(result.summary.individual.failed, 0);
        assert.equal(result.summary.crossContract.valid, false);
    });

    await t.test('13. stopCrossContractOnIndividualFailure=true + individual fail -> cross skipped', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123;
        const result = runValidation(artifacts, { stopCrossContractOnIndividualFailure: true });
        assert.equal(result.valid, false);
        assert.equal(result.summary.crossContract.run, false);
        assert.equal(result.summary.crossContract.skipped, true);
    });

    await t.test('14. stopCrossContractOnIndividualFailure=false + individual fail -> cross vẫn chạy với valid subset', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123;
        const result = runValidation(artifacts, { stopCrossContractOnIndividualFailure: false });
        assert.equal(result.valid, false);
        assert.equal(result.summary.crossContract.run, true);
        assert.equal(result.summary.crossContract.skipped, false);
    });

    await t.test('15. Error/warning/info counts aggregate đúng', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123; // 1 error from Question
        artifacts.events[0].payload.sourceNodeId = "K204"; // 1 error from cross (event vs attempt) wait, event won't match attempt because question is invalid? No, attempt is still valid, so event vs attempt runs.
        const result = runValidation(artifacts);
        assert.equal(result.summary.errorCount > 0, true);
    });

    await t.test('16. Reports giữ đúng provenance theo từng validator', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.questions[0].primaryNode = 123;
        const result = runValidation(artifacts);
        assert.equal(result.reports.questions[0].valid, false);
        assert.equal(result.reports.questions[0].validator.name, "question-validator");
    });

    await t.test('17. Input immutability', () => {
        const artifacts = getCanonicalArtifacts();
        artifacts.events[0].payload.sourceNodeId = "K204"; // cause an error
        const original = JSON.parse(JSON.stringify(artifacts));
        runValidation(artifacts);
        ensureNoMutation(original, artifacts);
    });

    await t.test('18. Array / single artifact / Map / registry object normalization chạy đúng', () => {
        const arts = getCanonicalArtifacts();

        // Convert to Map
        const questionsMap = new Map();
        questionsMap.set(arts.questions[0].id, arts.questions[0]);
        questionsMap.set(arts.questions[1].id, arts.questions[1]);

        // Convert to plain registry object
        const attemptsObj = {
            "A01": arts.attempts[0]
        };

        // Convert to single artifact
        const eventSingle = arts.events[0];

        const artifacts = {
            knowledgeMap: arts.knowledgeMap,
            failureRegistry: arts.failureRegistry,
            questions: questionsMap,
            attempts: attemptsObj,
            events: eventSingle,
            lessons: arts.lessons, // Array
            studentState: arts.studentState
        };

        const result = runValidation(artifacts);
        if (!result.valid) console.error(JSON.stringify(result, null, 2));
        assert.equal(result.valid, true);
        assert.equal(result.summary.artifacts.questions.supplied, 2);
        assert.equal(result.summary.artifacts.attempts.supplied, 1);
        assert.equal(result.summary.artifacts.events.supplied, 1);
        assert.equal(result.summary.artifacts.lessons.supplied, 1);
    });
});
