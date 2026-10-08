/**
 * answerEvaluator.numeric.test.js
 *
 * Focused tests for AnswerEvaluator V1.1.0
 *
 * Coverage:
 * - existing MCQ behavior still works
 * - numeric exact answer
 * - numeric string response
 * - numeric object response
 * - numeric tolerance
 * - numeric skipped response
 * - invalid numeric response
 * - invalid numeric answer
 * - unsupported combinations
 * - evaluator metadata
 *
 * Run:
 *
 * node answerEvaluator.numeric.test.js
 */

import {
    evaluateAnswer,
    ANSWER_EVALUATOR_INFO
} from "../../../src/engines/evaluation/answerEvaluator.js";


/* =========================================================
 * SMALL TEST HARNESS
 * ======================================================= */

let passed = 0;
let failed = 0;


function test(
    name,
    fn
) {

    try {

        fn();

        passed += 1;

        console.log(
            `✓ PASS — ${name}`
        );

    } catch (error) {

        failed += 1;

        console.error(
            `✗ FAIL — ${name}`
        );

        console.error(
            error?.stack ??
            error
        );
    }
}


function assertEqual(
    actual,
    expected,
    message = ""
) {

    if (actual !== expected) {

        throw new Error(
            message ||
            `Expected ${JSON.stringify(expected)}, ` +
            `received ${JSON.stringify(actual)}`
        );
    }
}


function assertDeepEqual(
    actual,
    expected,
    message = ""
) {

    const actualJson =
        JSON.stringify(actual);

    const expectedJson =
        JSON.stringify(expected);


    if (
        actualJson !==
        expectedJson
    ) {

        throw new Error(
            message ||
            `Expected ${expectedJson}, ` +
            `received ${actualJson}`
        );
    }
}


function assertThrows(
    fn,
    expectedMessagePart = null
) {

    let thrown = null;


    try {

        fn();

    } catch (error) {

        thrown = error;
    }


    if (!thrown) {

        throw new Error(
            "Expected function to throw."
        );
    }


    if (
        expectedMessagePart !== null &&
        !String(
            thrown.message
        ).includes(
            expectedMessagePart
        )
    ) {

        throw new Error(
            `Expected error message to contain ` +
            `'${expectedMessagePart}', ` +
            `received '${thrown.message}'.`
        );
    }
}


/* =========================================================
 * QUESTION FIXTURES
 * ======================================================= */

function createMcqQuestion() {

    return {

        id:
            "Q-A-K283-A-TEST",

        questionType:
            "mcq",

        content: {

            stem:
                "Tần số hoán vị gene là bao nhiêu?",

            options: [
                {
                    id: "A",
                    text: "10%"
                },
                {
                    id: "B",
                    text: "20%"
                },
                {
                    id: "C",
                    text: "30%"
                },
                {
                    id: "D",
                    text: "40%"
                }
            ]
        },

        answer: {
            type: "single",
            value: "B"
        },

        scoring: {
            maxScore: 1,
            partialCredit: false
        }
    };
}


function createNumericQuestion(
    overrides = {}
) {

    const question = {

        id:
            "Q-A-K283-T-TEST",

        questionType:
            "numeric",

        content: {

            stem:
                "Một phép lai phân tích cho thấy " +
                "20% đời con là kiểu hình tái tổ hợp. " +
                "Tần số hoán vị gene là bao nhiêu?"
        },

        answer: {
            type: "number",
            value: 20,
            tolerance: 0,
            unit: "%"
        },

        scoring: {
            maxScore: 1,
            partialCredit: false
        }
    };


    return {
        ...question,
        ...overrides,

        answer: {
            ...question.answer,
            ...(
                overrides.answer ??
                {}
            )
        },

        scoring: {
            ...question.scoring,
            ...(
                overrides.scoring ??
                {}
            )
        }
    };
}


/* =========================================================
 * MCQ REGRESSION
 * ======================================================= */

test(
    "MCQ correct behavior remains unchanged",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    "B"
            });


        assertEqual(
            result.result,
            "correct"
        );

        assertEqual(
            result.correct,
            true
        );

        assertEqual(
            result.score.normalized,
            1
        );

        assertEqual(
            result.response.value,
            "B"
        );
    }
);


test(
    "MCQ wrong behavior remains unchanged",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    "A"
            });


        assertEqual(
            result.result,
            "wrong"
        );

        assertEqual(
            result.correct,
            false
        );

        assertEqual(
            result.score.normalized,
            0
        );
    }
);


test(
    "MCQ skipped behavior remains unchanged",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createMcqQuestion(),

                response:
                    null
            });


        assertEqual(
            result.result,
            "skipped"
        );

        assertEqual(
            result.correct,
            false
        );

        assertEqual(
            result.response.value,
            null
        );
    }
);


/* =========================================================
 * NUMERIC — EXACT
 * ======================================================= */

test(
    "numeric accepts exact number response",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    20
            });


        assertEqual(
            result.result,
            "correct"
        );

        assertEqual(
            result.correct,
            true
        );

        assertEqual(
            result.response.value,
            20
        );

        assertEqual(
            result.score.earned,
            1
        );

        assertEqual(
            result.score.max,
            1
        );

        assertEqual(
            result.score.normalized,
            1
        );
    }
);


test(
    "numeric marks incorrect exact response wrong",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    19
            });


        assertEqual(
            result.result,
            "wrong"
        );

        assertEqual(
            result.correct,
            false
        );

        assertEqual(
            result.score.normalized,
            0
        );
    }
);


/* =========================================================
 * NUMERIC — NORMALIZATION
 * ======================================================= */

test(
    "numeric accepts numeric string response",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    "20"
            });


        assertEqual(
            result.result,
            "correct"
        );

        assertEqual(
            result.response.value,
            20
        );

        assertEqual(
            typeof result.response.value,
            "number"
        );
    }
);


test(
    "numeric accepts object with numeric value",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response: {
                    value: 20
                }
            });


        assertEqual(
            result.result,
            "correct"
        );

        assertEqual(
            result.response.value,
            20
        );
    }
);


test(
    "numeric accepts object with numeric string value",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response: {
                    value: "20"
                }
            });


        assertEqual(
            result.result,
            "correct"
        );

        assertEqual(
            result.response.value,
            20
        );

        assertEqual(
            typeof result.response.value,
            "number"
        );
    }
);


/* =========================================================
 * NUMERIC — TOLERANCE
 * ======================================================= */

test(
    "numeric accepts lower tolerance boundary",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance: 0.5
                }
            });


        const result =
            evaluateAnswer({
                question,
                response:
                    19.5
            });


        assertEqual(
            result.result,
            "correct"
        );
    }
);


test(
    "numeric accepts upper tolerance boundary",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance: 0.5
                }
            });


        const result =
            evaluateAnswer({
                question,
                response:
                    20.5
            });


        assertEqual(
            result.result,
            "correct"
        );
    }
);


test(
    "numeric rejects value outside tolerance",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance: 0.5
                }
            });


        const result =
            evaluateAnswer({
                question,
                response:
                    20.51
            });


        assertEqual(
            result.result,
            "wrong"
        );

        assertEqual(
            result.correct,
            false
        );
    }
);


/* =========================================================
 * NUMERIC — SKIPPED
 * ======================================================= */

test(
    "numeric null response is skipped",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    null
            });


        assertEqual(
            result.result,
            "skipped"
        );

        assertEqual(
            result.response.value,
            null
        );
    }
);


test(
    "numeric undefined response is skipped",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    undefined
            });


        assertEqual(
            result.result,
            "skipped"
        );
    }
);


test(
    "numeric empty string is skipped",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    "   "
            });


        assertEqual(
            result.result,
            "skipped"
        );
    }
);


test(
    "numeric object with empty value is skipped",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response: {
                    value: ""
                }
            });


        assertEqual(
            result.result,
            "skipped"
        );
    }
);


/* =========================================================
 * NUMERIC — INVALID RESPONSE
 * ======================================================= */

test(
    "numeric rejects non-numeric string",
    () => {

        assertThrows(
            () =>
                evaluateAnswer({
                    question:
                        createNumericQuestion(),

                    response:
                        "abc"
                }),

            "not a valid finite number"
        );
    }
);


test(
    "numeric rejects value containing unit text",
    () => {

        assertThrows(
            () =>
                evaluateAnswer({
                    question:
                        createNumericQuestion(),

                    response:
                        "20%"
                }),

            "not a valid finite number"
        );
    }
);


test(
    "numeric rejects Infinity",
    () => {

        assertThrows(
            () =>
                evaluateAnswer({
                    question:
                        createNumericQuestion(),

                    response:
                        Infinity
                }),

            "finite number"
        );
    }
);


test(
    "numeric rejects NaN",
    () => {

        assertThrows(
            () =>
                evaluateAnswer({
                    question:
                        createNumericQuestion(),

                    response:
                        NaN
                }),

            "finite number"
        );
    }
);


test(
    "numeric rejects array response",
    () => {

        assertThrows(
            () =>
                evaluateAnswer({
                    question:
                        createNumericQuestion(),

                    response:
                        [20]
                }),

            "Unsupported response format"
        );
    }
);


/* =========================================================
 * NUMERIC — QUESTION VALIDATION GUARDS
 * ======================================================= */

test(
    "numeric rejects non-number canonical answer",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    value: "20"
                }
            });


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "numeric answer.value must be a finite number"
        );
    }
);


test(
    "numeric rejects negative tolerance",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance: -0.1
                }
            });


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "numeric answer.tolerance must be a non-negative finite number"
        );
    }
);


test(
    "numeric rejects non-number tolerance",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance: "0.5"
                }
            });


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "numeric answer.tolerance must be a non-negative finite number"
        );
    }
);


test(
    "numeric rejects non-string unit",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    unit: 123
                }
            });


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "numeric answer.unit must be a string"
        );
    }
);


/* =========================================================
 * QUESTION TYPE + ANSWER TYPE PAIRING
 * ======================================================= */

test(
    "rejects mcq + number combination",
    () => {

        const question =
            createMcqQuestion();


        question.answer = {
            type: "number",
            value: 20
        };


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "Unsupported evaluator combination"
        );
    }
);


test(
    "rejects numeric + single combination",
    () => {

        const question =
            createNumericQuestion();


        question.answer = {
            type: "single",
            value: "B"
        };


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        "B"
                }),

            "Unsupported evaluator combination"
        );
    }
);


/* =========================================================
 * UNSUPPORTED TYPES
 * ======================================================= */

test(
    "unsupported questionType is rejected",
    () => {

        const question =
            createNumericQuestion({
                questionType:
                    "short_answer"
            });


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        "20"
                }),

            "Unsupported questionType"
        );
    }
);


test(
    "unsupported answer.type is rejected",
    () => {

        const question =
            createNumericQuestion();


        question.answer = {
            type: "text",
            value: 20
        };


        assertThrows(
            () =>
                evaluateAnswer({
                    question,
                    response:
                        20
                }),

            "Unsupported answer.type"
        );
    }
);


/* =========================================================
 * SCORING
 * ======================================================= */

test(
    "numeric respects scoring.maxScore",
    () => {

        const question =
            createNumericQuestion({
                scoring: {
                    maxScore: 2
                }
            });


        const result =
            evaluateAnswer({
                question,
                response:
                    20
            });


        assertEqual(
            result.score.earned,
            2
        );

        assertEqual(
            result.score.max,
            2
        );

        assertEqual(
            result.score.normalized,
            1
        );
    }
);


test(
    "wrong numeric answer earns zero",
    () => {

        const question =
            createNumericQuestion({
                scoring: {
                    maxScore: 2
                }
            });


        const result =
            evaluateAnswer({
                question,
                response:
                    10
            });


        assertEqual(
            result.score.earned,
            0
        );

        assertEqual(
            result.score.max,
            2
        );

        assertEqual(
            result.score.normalized,
            0
        );
    }
);


/* =========================================================
 * RESULT SHAPE
 * ======================================================= */

test(
    "numeric result exposes canonical evaluator shape",
    () => {

        const result =
            evaluateAnswer({
                question:
                    createNumericQuestion(),

                response:
                    20
            });


        assertEqual(
            result.evaluator.name,
            "AnswerEvaluator"
        );

        assertEqual(
            result.evaluator.version,
            "1.1.0"
        );

        assertEqual(
            result.questionType,
            "numeric"
        );

        assertEqual(
            result.answerType,
            "number"
        );

        assertDeepEqual(
            result.response,
            {
                value: 20
            }
        );

        assertDeepEqual(
            result.score,
            {
                earned: 1,
                max: 1,
                normalized: 1
            }
        );
    }
);


/* =========================================================
 * METADATA
 * ======================================================= */

test(
    "ANSWER_EVALUATOR_INFO reports V1.1.0",
    () => {

        assertEqual(
            ANSWER_EVALUATOR_INFO.version,
            "1.1.0"
        );

        assertEqual(
            ANSWER_EVALUATOR_INFO.name,
            "AnswerEvaluator"
        );
    }
);


test(
    "ANSWER_EVALUATOR_INFO exposes supported question types",
    () => {

        assertDeepEqual(
            ANSWER_EVALUATOR_INFO
                .supportedQuestionTypes,
            [
                "mcq",
                "numeric"
            ]
        );
    }
);


test(
    "ANSWER_EVALUATOR_INFO exposes supported answer types",
    () => {

        assertDeepEqual(
            ANSWER_EVALUATOR_INFO
                .supportedAnswerTypes,
            [
                "single",
                "number"
            ]
        );
    }
);


/* =========================================================
 * SUMMARY
 * ======================================================= */

console.log(
    "\n" +
    "============================================================"
);

console.log(
    "AnswerEvaluator V1.1.0 — Numeric Focused Tests"
);

console.log(
    "============================================================"
);

console.log(
    `Passed : ${passed}`
);

console.log(
    `Failed : ${failed}`
);

console.log(
    `Total  : ${passed + failed}`
);

console.log(
    "============================================================"
);


if (failed > 0) {

    process.exitCode = 1;

} else {

    console.log(
        "\n✓ AnswerEvaluator V1.1.0 numeric behavior PASS"
    );
}