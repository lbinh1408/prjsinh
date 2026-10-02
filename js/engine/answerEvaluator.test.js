/**
 * answerEvaluator.test.js
 *
 * Tests for:
 *   AnswerEvaluator V1.0.0
 *
 * Run:
 *   node --test answerEvaluator.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    evaluateAnswer,
    ANSWER_EVALUATOR_INFO
} from "./answerEvaluator.js";


/**
 * =========================================================
 * FIXTURE
 * =========================================================
 *
 * Minimal question following the current Question Contract.
 */

function createMcqQuestion(overrides = {}) {
    const base = {
        id: "Q-A-K283-A-001",
        version: "1.0.0",

        nodes: ["K283"],
        primaryNode: "K283",
        secondaryNodes: ["K282"],

        evidence: "apply",
        difficulty: "D3",

        questionType: "mcq",

        mode: [
            "practice"
        ],

        prerequisites: [
            "K282"
        ],

        skills: [
            "S008"
        ],

        content: {
            stem:
                "Một câu hỏi kiểm thử.",

            context:
                null,

            options: [
                {
                    id: "A",
                    text: "10%",
                    isCorrect: false
                },
                {
                    id: "B",
                    text: "20%",
                    isCorrect: true
                },
                {
                    id: "C",
                    text: "30%",
                    isCorrect: false
                },
                {
                    id: "D",
                    text: "40%",
                    isCorrect: false
                }
            ],

            media: [],
            data: null
        },

        answer: {
            type: "single",
            value: "B"
        },

        scoring: {
            maxScore: 1,
            partialCredit: false,
            rubric: null
        },

        failureSignatures: [
            "calculation_error"
        ],

        explanation: {
            correct:
                "Đáp án đúng là B.",

            incorrect: {
                A: "Sai.",
                C: "Sai.",
                D: "Sai."
            }
        }
    };


    return {
        ...base,
        ...overrides
    };
}


/**
 * =========================================================
 * 1. METADATA
 * =========================================================
 */

test(
    "1. exposes AnswerEvaluator V1.0.0 metadata",
    () => {
        assert.equal(
            ANSWER_EVALUATOR_INFO.name,
            "AnswerEvaluator"
        );

        assert.equal(
            ANSWER_EVALUATOR_INFO.version,
            "1.0.0"
        );

        assert.deepEqual(
            ANSWER_EVALUATOR_INFO.supportedQuestionTypes,
            ["mcq"]
        );

        assert.deepEqual(
            ANSWER_EVALUATOR_INFO.supportedAnswerTypes,
            ["single"]
        );
    }
);


/**
 * =========================================================
 * 2. CORRECT DIRECT STRING
 * =========================================================
 */

test(
    "2. correct direct string response returns correct",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,
                response: "B"
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.correct,
            true
        );

        assert.equal(
            result.response.value,
            "B"
        );

        assert.equal(
            result.score.earned,
            1
        );

        assert.equal(
            result.score.max,
            1
        );

        assert.equal(
            result.score.normalized,
            1
        );
    }
);


/**
 * =========================================================
 * 3. WRONG DIRECT STRING
 * =========================================================
 */

test(
    "3. wrong direct string response returns wrong",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,
                response: "A"
            });

        assert.equal(
            result.result,
            "wrong"
        );

        assert.equal(
            result.correct,
            false
        );

        assert.equal(
            result.response.value,
            "A"
        );

        assert.equal(
            result.score.earned,
            0
        );

        assert.equal(
            result.score.max,
            1
        );

        assert.equal(
            result.score.normalized,
            0
        );
    }
);


/**
 * =========================================================
 * 4. RESPONSE { value }
 * =========================================================
 */

test(
    "4. accepts response object with value",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,

                response: {
                    value: "B"
                }
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.response.value,
            "B"
        );
    }
);


/**
 * =========================================================
 * 5. RESPONSE { optionId }
 * =========================================================
 */

test(
    "5. accepts response object with optionId",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,

                response: {
                    optionId: "B"
                }
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.response.value,
            "B"
        );
    }
);


/**
 * =========================================================
 * 6. RESPONSE { selectedOptionId }
 * =========================================================
 */

test(
    "6. accepts response object with selectedOptionId",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,

                response: {
                    selectedOptionId: "B"
                }
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.response.value,
            "B"
        );
    }
);


/**
 * =========================================================
 * 7. STRING TRIMMING
 * =========================================================
 */

test(
    "7. trims surrounding whitespace from response",
    () => {
        const question =
            createMcqQuestion();

        const result =
            evaluateAnswer({
                question,
                response: "   B   "
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.response.value,
            "B"
        );
    }
);


/**
 * =========================================================
 * 8. NULL = SKIPPED
 * =========================================================
 */

test(
    "8. null response returns skipped",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    null
            });

        assert.equal(
            result.result,
            "skipped"
        );

        assert.equal(
            result.correct,
            false
        );

        assert.equal(
            result.response.value,
            null
        );

        assert.equal(
            result.score.earned,
            0
        );

        assert.equal(
            result.score.normalized,
            0
        );
    }
);


/**
 * =========================================================
 * 9. UNDEFINED = SKIPPED
 * =========================================================
 */

test(
    "9. undefined response returns skipped",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    undefined
            });

        assert.equal(
            result.result,
            "skipped"
        );

        assert.equal(
            result.response.value,
            null
        );
    }
);


/**
 * =========================================================
 * 10. EMPTY STRING = SKIPPED
 * =========================================================
 */

test(
    "10. empty string response returns skipped",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    "   "
            });

        assert.equal(
            result.result,
            "skipped"
        );

        assert.equal(
            result.response.value,
            null
        );
    }
);


/**
 * =========================================================
 * 11. EMPTY RESPONSE OBJECT = SKIPPED
 * =========================================================
 */

test(
    "11. empty response object returns skipped",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response: {}
            });

        assert.equal(
            result.result,
            "skipped"
        );
    }
);


/**
 * =========================================================
 * 12. INVALID OPTION
 * =========================================================
 */

test(
    "12. rejects option id that does not exist",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    question:
                        createMcqQuestion(),

                    response:
                        "Z"
                });
            },

            /does not exist/
        );
    }
);


/**
 * =========================================================
 * 13. CASE SENSITIVE
 * =========================================================
 */

test(
    "13. option ids remain case-sensitive",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    question:
                        createMcqQuestion(),

                    response:
                        "b"
                });
            },

            /does not exist/
        );
    }
);


/**
 * =========================================================
 * 14. NON-STRING OBJECT VALUE
 * =========================================================
 */

test(
    "14. rejects non-string single-answer response value",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    question:
                        createMcqQuestion(),

                    response: {
                        value: 2
                    }
                });
            },

            TypeError
        );
    }
);


/**
 * =========================================================
 * 15. ARRAY RESPONSE UNSUPPORTED
 * =========================================================
 */

test(
    "15. rejects array response for single-answer MCQ",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    question:
                        createMcqQuestion(),

                    response: [
                        "B"
                    ]
                });
            },

            TypeError
        );
    }
);


/**
 * =========================================================
 * 16. NUMBER RESPONSE UNSUPPORTED
 * =========================================================
 */

test(
    "16. rejects numeric response for single-answer MCQ",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    question:
                        createMcqQuestion(),

                    response:
                        2
                });
            },

            TypeError
        );
    }
);


/**
 * =========================================================
 * 17. UNSUPPORTED QUESTION TYPE
 * =========================================================
 */

test(
    "17. rejects unsupported question type",
    () => {
        const question =
            createMcqQuestion({
                questionType:
                    "numeric"
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /Unsupported questionType/
        );
    }
);


/**
 * =========================================================
 * 18. UNSUPPORTED ANSWER TYPE
 * =========================================================
 */

test(
    "18. rejects unsupported answer type",
    () => {
        const question =
            createMcqQuestion({
                answer: {
                    type:
                        "multiple",

                    value: [
                        "A",
                        "B"
                    ]
                }
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /Unsupported answer.type/
        );
    }
);


/**
 * =========================================================
 * 19. QUESTION REQUIRED
 * =========================================================
 */

test(
    "19. rejects missing question",
    () => {
        assert.throws(
            () => {
                evaluateAnswer({
                    response:
                        "B"
                });
            },

            TypeError
        );
    }
);


/**
 * =========================================================
 * 20. QUESTION ID REQUIRED
 * =========================================================
 */

test(
    "20. rejects question without valid id",
    () => {
        const question =
            createMcqQuestion({
                id: ""
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /valid id/
        );
    }
);


/**
 * =========================================================
 * 21. ANSWER REQUIRED
 * =========================================================
 */

test(
    "21. rejects question without answer",
    () => {
        const question =
            createMcqQuestion({
                answer:
                    null
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /missing answer/
        );
    }
);


/**
 * =========================================================
 * 22. ANSWER VALUE REQUIRED
 * =========================================================
 */

test(
    "22. rejects question without answer.value",
    () => {
        const question =
            createMcqQuestion({
                answer: {
                    type:
                        "single"
                }
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /missing answer.value/
        );
    }
);


/**
 * =========================================================
 * 23. CONTENT OPTIONS REQUIRED
 * =========================================================
 */

test(
    "23. rejects submitted response when content.options is missing",
    () => {
        const question =
            createMcqQuestion({
                content: {
                    stem:
                        "Broken fixture."
                }
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /does not contain content.options/
        );
    }
);


/**
 * =========================================================
 * 24. INVALID MAX SCORE
 * =========================================================
 */

test(
    "24. rejects invalid scoring.maxScore",
    () => {
        const question =
            createMcqQuestion({
                scoring: {
                    maxScore:
                        -1,

                    partialCredit:
                        false,

                    rubric:
                        null
                }
            });

        assert.throws(
            () => {
                evaluateAnswer({
                    question,
                    response:
                        "B"
                });
            },

            /invalid scoring.maxScore/
        );
    }
);


/**
 * =========================================================
 * 25. CUSTOM MAX SCORE - CORRECT
 * =========================================================
 */

test(
    "25. correct answer earns full custom maxScore",
    () => {
        const question =
            createMcqQuestion({
                scoring: {
                    maxScore:
                        5,

                    partialCredit:
                        false,

                    rubric:
                        null
                }
            });

        const result =
            evaluateAnswer({
                question,
                response:
                    "B"
            });

        assert.equal(
            result.score.earned,
            5
        );

        assert.equal(
            result.score.max,
            5
        );

        assert.equal(
            result.score.normalized,
            1
        );
    }
);


/**
 * =========================================================
 * 26. CUSTOM MAX SCORE - WRONG
 * =========================================================
 */

test(
    "26. wrong answer earns zero with custom maxScore",
    () => {
        const question =
            createMcqQuestion({
                scoring: {
                    maxScore:
                        5,

                    partialCredit:
                        false,

                    rubric:
                        null
                }
            });

        const result =
            evaluateAnswer({
                question,
                response:
                    "A"
            });

        assert.equal(
            result.score.earned,
            0
        );

        assert.equal(
            result.score.max,
            5
        );

        assert.equal(
            result.score.normalized,
            0
        );
    }
);


/**
 * =========================================================
 * 27. ZERO MAX SCORE
 * =========================================================
 */

test(
    "27. zero maxScore produces normalized score 0",
    () => {
        const question =
            createMcqQuestion({
                scoring: {
                    maxScore:
                        0,

                    partialCredit:
                        false,

                    rubric:
                        null
                }
            });

        const result =
            evaluateAnswer({
                question,
                response:
                    "B"
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.score.earned,
            0
        );

        assert.equal(
            result.score.max,
            0
        );

        assert.equal(
            result.score.normalized,
            0
        );
    }
);


/**
 * =========================================================
 * 28. OUTPUT METADATA
 * =========================================================
 */

test(
    "28. output contains evaluator and question metadata",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    "B"
            });

        assert.deepEqual(
            result.evaluator,
            {
                name:
                    "AnswerEvaluator",

                version:
                    "1.0.0"
            }
        );

        assert.equal(
            result.questionId,
            "Q-A-K283-A-001"
        );

        assert.equal(
            result.questionType,
            "mcq"
        );

        assert.equal(
            result.answerType,
            "single"
        );
    }
);


/**
 * =========================================================
 * 29. DOES NOT MUTATE QUESTION
 * =========================================================
 */

test(
    "29. evaluator does not mutate question",
    () => {
        const question =
            createMcqQuestion();

        const before =
            structuredClone(
                question
            );

        evaluateAnswer({
            question,
            response:
                "B"
        });

        assert.deepEqual(
            question,
            before
        );
    }
);


/**
 * =========================================================
 * 30. DOES NOT MUTATE RESPONSE
 * =========================================================
 */

test(
    "30. evaluator does not mutate response object",
    () => {
        const question =
            createMcqQuestion();

        const response = {
            value:
                "B"
        };

        const before =
            structuredClone(
                response
            );

        evaluateAnswer({
            question,
            response
        });

        assert.deepEqual(
            response,
            before
        );
    }
);


/**
 * =========================================================
 * 31. CORRECTNESS COMES FROM answer.value
 * =========================================================
 */

test(
    "31. grading uses question.answer.value as source of truth",
    () => {
        const question =
            createMcqQuestion({
                answer: {
                    type:
                        "single",

                    value:
                        "C"
                }
            });

        const result =
            evaluateAnswer({
                question,
                response:
                    "C"
            });

        assert.equal(
            result.result,
            "correct"
        );

        assert.equal(
            result.correct,
            true
        );
    }
);


/**
 * =========================================================
 * 32. WRONG RESULT DOES NOT EXPOSE CORRECT ANSWER
 * =========================================================
 */

test(
    "32. wrong evaluation result does not inject correct answer into response",
    () => {
        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    "A"
            });

        assert.deepEqual(
            result.response,
            {
                value:
                    "A"
            }
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                result.response,
                "correctValue"
            ),
            false
        );
    }
);