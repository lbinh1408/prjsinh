import test from "node:test";
import assert from "node:assert/strict";

import {
    validateQuestionContent
} from "../../../../src/quality/validators/contentQaValidator.js";


function makeMcq(options) {
    return {
        id: "Q-A-TEST-A-001",
        version: "1.0.0",

        nodes: ["K282"],
        primaryNode: "K282",

        evidence: "apply",
        difficulty: "D3",
        questionType: "mcq",
        mode: ["practice"],

        content: {
            stem: "Xác định các loại giao tử trong trường hợp sau.",
            options
        },

        answer: {
            type: "single",
            value: "A"
        },

        explanation: {
            correct: "Giải thích đáp án đúng.",
            incorrect: {
                B: "Giải thích B.",
                C: "Giải thích C.",
                D: "Giải thích D."
            }
        },

        failureSignatures: [
            "concept_confusion"
        ],

        metadata: {
            reviewStatus: "reviewed"
        }
    };
}


function duplicateOptionErrors(report) {
    return report.issues.filter(
        issue =>
            issue.code ===
            "CONTENT_QA_DUPLICATE_OPTION"
    );
}


test(
    "allele case differences must NOT be treated as duplicate options",
    () => {
        const question = makeMcq([
            {
                id: "A",
                text: "AB và ab.",
                isCorrect: true
            },
            {
                id: "B",
                text: "Ab và aB.",
                isCorrect: false
            },
            {
                id: "C",
                text: "AB và Ab.",
                isCorrect: false
            },
            {
                id: "D",
                text: "aB và ab.",
                isCorrect: false
            }
        ]);

        const report =
            validateQuestionContent(question);

        assert.equal(
            duplicateOptionErrors(report).length,
            0
        );
    }
);


test(
    "different allele phases must NOT be treated as duplicate options",
    () => {
        const question = makeMcq([
            {
                id: "A",
                text: "Mn và mN.",
                isCorrect: true
            },
            {
                id: "B",
                text: "MN và mn.",
                isCorrect: false
            },
            {
                id: "C",
                text: "Mn và MN.",
                isCorrect: false
            },
            {
                id: "D",
                text: "mN và mn.",
                isCorrect: false
            }
        ]);

        const report =
            validateQuestionContent(question);

        assert.equal(
            duplicateOptionErrors(report).length,
            0
        );
    }
);


test(
    "true duplicate options MUST still be detected",
    () => {
        const question = makeMcq([
            {
                id: "A",
                text: "AB và ab.",
                isCorrect: true
            },
            {
                id: "B",
                text: "AB và ab.",
                isCorrect: false
            },
            {
                id: "C",
                text: "Ab và aB.",
                isCorrect: false
            },
            {
                id: "D",
                text: "AB và Ab.",
                isCorrect: false
            }
        ]);

        const report =
            validateQuestionContent(question);

        const errors =
            duplicateOptionErrors(report);

        assert.equal(errors.length, 1);

        assert.equal(
            errors[0].path,
            "/content/options/1/text"
        );
    }
);


test(
    "irrelevant whitespace and punctuation differences are duplicates",
    () => {
        const question = makeMcq([
            {
                id: "A",
                text: "AB và ab.",
                isCorrect: true
            },
            {
                id: "B",
                text: "  AB   và   ab  ",
                isCorrect: false
            },
            {
                id: "C",
                text: "Ab và aB.",
                isCorrect: false
            },
            {
                id: "D",
                text: "AB và Ab.",
                isCorrect: false
            }
        ]);

        const report =
            validateQuestionContent(question);

        assert.equal(
            duplicateOptionErrors(report).length,
            1
        );
    }
);