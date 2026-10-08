import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLesson } from '../../../../src/contracts/validators/lessonValidator.js';

// Inlined fixture
const MOCK_OPTIONS = {
    knowledgeMap: {
        nodes: [
            { id: "K204" },
            { id: "K205" },
            { id: "K206" },
            { id: "K208" },
            { id: "K013" }
        ]
    },
    failureRegistry: {
        failureSignatures: [
            { id: "mechanism_confusion" },
            { id: "source_knowledge_gap" }
        ]
    }
};

function getBaseLesson() {
    return {
        "id": "L204-01",
        "version": "1.0.0",
        "title": "Cơ chế phiên mã và dịch mã",
        "type": "mechanism",
        "deliveryModes": ["HOC_SAU", "ON_THI"],
        "knowledgeNodes": ["K204", "K205", "K206"],
        "primaryNodes": ["K204"],
        "supportingNodes": ["K205", "K206"],
        "prerequisites": ["K013"],
        "objectives": [
            {
                "id": "OBJ01",
                "node": "K204",
                "type": "explain",
                "description": "Giải thích được cơ chế phiên mã"
            }
        ],
        "estimatedMinutes": {
            "minimum": 15,
            "typical": 25,
            "maximum": 40
        },
        "difficulty": "D3",
        "entryDiagnostic": {
            "enabled": true,
            "purpose": ["assess_prior_knowledge"],
            "questionSelection": {
                "source": "BANK_01",
                "nodes": ["K204"], 
                "maxQuestions": 5
            },
            "outcomes": {
                "mastered": {
                    "action": "SKIP_TO_CHALLENGE"
                },
                "weak": {
                    "action": "START_FROM_PREREQUISITE"
                }
            }
        },
        "exitDiagnostic": {
            "enabled": true,
            "purpose": ["verify_mastery"],
            "questionSelection": {
                "source": "BANK_01",
                "selection": {
                    "nodes": ["K204"],
                    "failureSignature": "mechanism_confusion",
                    "count": 3
                }
            },
            "outcomes": {
                "pass": {
                    "action": "UPDATE_MASTERY"
                },
                "fail": {
                    "action": "REMEDIATE"
                }
            }
        },
        "sections": [
            {
                "id": "SEC_01",
                "type": "concept",
                "title": "Giới thiệu phiên mã",
                "nodes": ["K204"],
                "estimatedMinutes": 10,
                "content": {
                    "format": "markdown",
                    "contentRef": "ref_01",
                    "blocks": [
                        {
                            "type": "text",
                            "contentRef": "ref_02"
                        }
                    ]
                },
                "questionSet": {
                    "source": "BANK_01",
                    "adaptive": false,
                    "selection": {
                        "nodes": ["K204"],
                        "count": 2
                    }
                }
            }
        ]
    };
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "lesson object was mutated during validation!"
    );
}

function runAndAssertInvalid(lesson, ...expectedCodes) {
    const originalLesson = JSON.parse(JSON.stringify(lesson));
    const report = validateLesson(lesson, MOCK_OPTIONS);
    assert.equal(report.valid, false, "Expected lesson to be INVALID");

    for (const code of expectedCodes) {
        const hasCode = report.issues.some(issue => issue.code === code);
        assert.ok(hasCode, `Expected issue with code ${code}, but got: ${report.issues.map(i => i.code).join(", ")}`);
    }

    ensureNoMutation(originalLesson, lesson);
}

test('lessonValidator test suite', async (t) => {

    await t.test('1. canonical lessonObject -> VALID (and immutability check)', () => {
        const lesson = getBaseLesson();
        const originalLesson = JSON.parse(JSON.stringify(lesson));
        const report = validateLesson(lesson, MOCK_OPTIONS);
        
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        
        assert.equal(report.valid, true, "Expected base fixture to be VALID");
        ensureNoMutation(originalLesson, lesson);
    });

    await t.test('2. knowledgeNodes chứa K999 -> KNOWLEDGE_NODE_NOT_FOUND', () => {
        const lesson = getBaseLesson();
        lesson.knowledgeNodes.push("K999");
        runAndAssertInvalid(lesson, "KNOWLEDGE_NODE_NOT_FOUND");
    });

    await t.test('3. primaryNodes có node ngoài knowledgeNodes -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        if (!lesson.primaryNodes) lesson.primaryNodes = [];
        lesson.primaryNodes.push("K013"); // K013 is not in knowledgeNodes
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('4. supportingNodes có node ngoài knowledgeNodes -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        if (!lesson.supportingNodes) lesson.supportingNodes = [];
        lesson.supportingNodes.push("K013"); 
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('5. objective node ngoài scope -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        lesson.objectives[0].node = "K013";
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('6. section node ngoài scope -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        lesson.sections[0].nodes = ["K013"];
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('7. question selection primaryNode ngoài section scope -> CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        // modify an exit diagnostic selection or section questionSet selection
        const qSelection = lesson.sections.find(s => s.questionSet && s.questionSet.selection);
        if (qSelection) {
            qSelection.nodes = ["K206"]; // Set section nodes
            qSelection.questionSet.selection.primaryNode = "K204"; // K204 is not in section nodes
            runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
        }
    });

    await t.test('8. evidence "diagnostic" -> INVALID_ENUM_VALUE', () => {
        const lesson = getBaseLesson();
        const section = lesson.sections.find(s => s.questionSet && s.questionSet.selection);
        if (section) {
            section.questionSet.selection.evidence = "diagnostic";
            runAndAssertInvalid(lesson, "INVALID_ENUM_VALUE");
        }
    });

    await t.test('9. difficulty "D9" -> INVALID_ENUM_VALUE', () => {
        const lesson = getBaseLesson();
        lesson.difficulty = "D9";
        runAndAssertInvalid(lesson, "INVALID_ENUM_VALUE");
    });

    await t.test('10. section type giả -> INVALID_ENUM_VALUE', () => {
        const lesson = getBaseLesson();
        lesson.sections[0].type = "fake_type";
        runAndAssertInvalid(lesson, "INVALID_ENUM_VALUE");
    });

    await t.test('11. delivery mode giả -> INVALID_ENUM_VALUE', () => {
        const lesson = getBaseLesson();
        lesson.deliveryModes.push("HOC_VET");
        runAndAssertInvalid(lesson, "INVALID_ENUM_VALUE");
    });

    await t.test('12. duplicate section ID -> INVALID_FORMAT', () => {
        const lesson = getBaseLesson();
        const firstSection = JSON.parse(JSON.stringify(lesson.sections[0]));
        lesson.sections.push(firstSection);
        runAndAssertInvalid(lesson, "INVALID_FORMAT");
    });

    await t.test('13. estimatedMinutes minimum > typical -> SCHEMA_INVALID', () => {
        const lesson = getBaseLesson();
        lesson.estimatedMinutes = {
            minimum: 50,
            typical: 30,
            maximum: 60
        };
        runAndAssertInvalid(lesson, "SCHEMA_INVALID");
    });

    await t.test('14. failureSignature giả khi truyền registry -> FAILURE_SIGNATURE_NOT_FOUND', () => {
        const lesson = getBaseLesson();
        const diagnostic = lesson.exitDiagnostic;
        if (diagnostic && diagnostic.questionSelection && diagnostic.questionSelection.selection) {
            diagnostic.questionSelection.selection.failureSignature = "fake_signature";
            runAndAssertInvalid(lesson, "FAILURE_SIGNATURE_NOT_FOUND");
        }
    });

    await t.test('15. unknown root field -> UNKNOWN_FIELD', () => {
        const lesson = getBaseLesson();
        lesson.unknownField = "something";
        runAndAssertInvalid(lesson, "UNKNOWN_FIELD");
    });

    // 4 New Tests
    await t.test('16. K013 prerequisite + entry diagnostic K013 -> VALID', () => {
        const lesson = getBaseLesson();
        lesson.prerequisites = ["K013"];
        lesson.entryDiagnostic.questionSelection.nodes.push("K013");
        
        const report = validateLesson(lesson, MOCK_OPTIONS);
        if (!report.valid) {
            console.error(JSON.stringify(report.issues, null, 2));
        }
        assert.equal(report.valid, true, "Expected K013 in entry diagnostic to be VALID");
    });

    await t.test('17. K013 prerequisite + section.nodes K013 -> INVALID CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        lesson.prerequisites = ["K013"];
        lesson.sections[0].nodes.push("K013");
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('18. K013 prerequisite + objective.node K013 -> INVALID CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        lesson.prerequisites = ["K013"];
        lesson.objectives[0].node = "K013";
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });

    await t.test('19. K013 prerequisite + exit diagnostic K013 -> INVALID CONTRACT_NODE_REFERENCE_MISMATCH', () => {
        const lesson = getBaseLesson();
        lesson.prerequisites = ["K013"];
        lesson.exitDiagnostic.questionSelection.selection.nodes.push("K013");
        runAndAssertInvalid(lesson, "CONTRACT_NODE_REFERENCE_MISMATCH");
    });
});
