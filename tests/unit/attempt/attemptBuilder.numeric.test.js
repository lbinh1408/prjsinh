/**
 * attemptBuilder.numeric.test.js
 *
 * Focused integration-style tests:
 *
 * AnswerEvaluator V1.1.0
 *          ↓
 * AttemptBuilder V1.0.2
 *          ↓
 * Attempt Contract V1.0.0
 *
 * Purpose:
 * - Lock numeric Question → Evaluation → Attempt mapping.
 * - Verify existing MCQ flow still works.
 * - Verify AttemptBuilder does NOT re-evaluate answers.
 * - Verify canonical response.type mapping.
 *
 * Run:
 *
 * node attemptBuilder.numeric.test.js
 */

import {
    evaluateAnswer
} from "../../../src/engines/evaluation/answerEvaluator.js";

import {
    buildAttempt,
    ATTEMPT_BUILDER_INFO
} from "../../../src/engines/attempt/attemptBuilder.js";


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

function createNumericQuestion(
    overrides = {}
) {

    const base = {

        id:
            "Q-A-K283-T-010",

        version:
            "1.0.0",

        nodes: [
            "K283"
        ],

        primaryNode:
            "K283",

        secondaryNodes: [
            "K281",
            "K282"
        ],

        evidence:
            "transfer",

        difficulty:
            "D4",

        questionType:
            "numeric",

        mode: [
            "challenge"
        ],

        skills: [
            "S008"
        ],

        content: {
            stem:
                "Một phép lai cho kết quả cho phép xác định " +
                "tần số hoán vị gene là 20%. " +
                "Nhập tần số hoán vị gene.",
            options: [],
            media: [],
            data: null
        },

        answer: {
            type:
                "number",

            value:
                20,

            tolerance:
                0,

            unit:
                "%"
        },

        scoring: {
            maxScore:
                1,

            partialCredit:
                false,

            rubric:
                null
        },

        context: {
            contextId:
                "c09-k283-numeric-transfer-01",

            contextType:
                "genetic_cross"
        }
    };


    return {

        ...base,
        ...overrides,

        answer: {
            ...base.answer,
            ...(
                overrides.answer ??
                {}
            )
        },

        scoring: {
            ...base.scoring,
            ...(
                overrides.scoring ??
                {}
            )
        },

        context: {
            ...base.context,
            ...(
                overrides.context ??
                {}
            )
        }
    };
}


function createMcqQuestion() {

    return {

        id:
            "Q-A-K283-A-003",

        version:
            "1.0.0",

        nodes: [
            "K283"
        ],

        primaryNode:
            "K283",

        secondaryNodes: [
            "K281",
            "K282"
        ],

        evidence:
            "apply",

        difficulty:
            "D3",

        questionType:
            "mcq",

        mode: [
            "practice"
        ],

        skills: [
            "S008"
        ],

        content: {

            stem:
                "Tần số hoán vị gene là 20%. " +
                "Tỉ lệ một loại giao tử tái tổ hợp là bao nhiêu?",

            options: [
                {
                    id: "A",
                    text: "5%"
                },
                {
                    id: "B",
                    text: "10%"
                },
                {
                    id: "C",
                    text: "20%"
                },
                {
                    id: "D",
                    text: "40%"
                }
            ]
        },

        answer: {
            type:
                "single",

            value:
                "B"
        },

        scoring: {
            maxScore:
                1,

            partialCredit:
                false
        }
    };
}


/* =========================================================
 * BUILD HELPERS
 * ======================================================= */

function buildNumericAttempt({
    response = 20,
    question = createNumericQuestion(),
    attemptNumber = 1,
    hint = null
} = {}) {

    const evaluation =
        evaluateAnswer({
            question,
            response
        });


    return buildAttempt({

        attemptId:
            "ATT-K283-NUMERIC-001",

        studentId:
            "STUDENT-001",

        sessionId:
            "SESSION-001",

        question,

        evaluation,

        startedAt:
            "2026-10-05T08:00:00+07:00",

        submittedAt:
            "2026-10-05T08:00:30+07:00",

        attemptNumber,

        hint,

        context: {

            learningMode:
                "HOC_SAU",

            action:
                "CHALLENGE",

            pathStage:
                "CHALLENGE",

            clusterId:
                "C09"
        }
    });
}


/* =========================================================
 * NUMERIC — CORRECT
 * ======================================================= */

test(
    "numeric correct response becomes canonical Attempt",
    () => {

        const attempt =
            buildNumericAttempt({
                response:
                    20
            });


        assertEqual(
            attempt.result,
            "correct"
        );

        assertEqual(
            attempt.score,
            1
        );
    }
);


test(
    "numeric Attempt response.type is numeric",
    () => {

        const attempt =
            buildNumericAttempt();


        assertEqual(
            attempt.response.type,
            "numeric"
        );
    }
);


test(
    "numeric Attempt preserves normalized numeric value",
    () => {

        const attempt =
            buildNumericAttempt({
                response:
                    "20"
            });


        assertDeepEqual(
            attempt.response,
            {
                type:
                    "numeric",

                value:
                    20,

                normalizedValue:
                    20
            }
        );
    }
);


/* =========================================================
 * NUMERIC — WRONG
 * ======================================================= */

test(
    "wrong numeric evaluation maps to incorrect Attempt result",
    () => {

        const attempt =
            buildNumericAttempt({
                response:
                    10
            });


        assertEqual(
            attempt.result,
            "incorrect"
        );

        assertEqual(
            attempt.score,
            0
        );

        assertEqual(
            attempt.response.value,
            10
        );
    }
);


/* =========================================================
 * NUMERIC — TOLERANCE
 * ======================================================= */

test(
    "numeric tolerance is evaluated before AttemptBuilder",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance:
                        0.5
                }
            });


        const attempt =
            buildNumericAttempt({
                question,
                response:
                    20.5
            });


        assertEqual(
            attempt.result,
            "correct"
        );

        assertEqual(
            attempt.response.value,
            20.5
        );

        assertEqual(
            attempt.score,
            1
        );
    }
);


test(
    "numeric value outside tolerance becomes incorrect Attempt",
    () => {

        const question =
            createNumericQuestion({
                answer: {
                    tolerance:
                        0.5
                }
            });


        const attempt =
            buildNumericAttempt({
                question,
                response:
                    20.51
            });


        assertEqual(
            attempt.result,
            "incorrect"
        );

        assertEqual(
            attempt.score,
            0
        );
    }
);


/* =========================================================
 * NUMERIC — SKIPPED
 * ======================================================= */

test(
    "skipped numeric response becomes skipped Attempt",
    () => {

        const attempt =
            buildNumericAttempt({
                response:
                    null
            });


        assertEqual(
            attempt.result,
            "skipped"
        );

        assertEqual(
            attempt.score,
            0
        );

        assertDeepEqual(
            attempt.response,
            {
                type:
                    "numeric",

                value:
                    null,

                normalizedValue:
                    null
            }
        );
    }
);


/* =========================================================
 * NUMERIC — QUESTION PROJECTION
 * ======================================================= */

test(
    "numeric Attempt projects primaryNode into context.nodeId",
    () => {

        const attempt =
            buildNumericAttempt();


        assertEqual(
            attempt.context.nodeId,
            "K283"
        );
    }
);


test(
    "numeric Attempt projects secondary nodes",
    () => {

        const attempt =
            buildNumericAttempt();


        assertDeepEqual(
            attempt.context.secondaryNodeIds,
            [
                "K281",
                "K282"
            ]
        );
    }
);


test(
    "numeric Attempt projects meta skills",
    () => {

        const attempt =
            buildNumericAttempt();


        assertDeepEqual(
            attempt.context.metaSkillIds,
            [
                "S008"
            ]
        );
    }
);


/* =========================================================
 * NUMERIC — EVIDENCE
 * ======================================================= */

test(
    "numeric transfer question produces transfer evidence",
    () => {

        const attempt =
            buildNumericAttempt();


        assertEqual(
            attempt.evidence.primaryDimension,
            "transfer"
        );

        assertEqual(
            attempt.evidence.difficulty,
            "D4"
        );
    }
);


test(
    "first numeric attempt is independent",
    () => {

        const attempt =
            buildNumericAttempt({
                attemptNumber:
                    1
            });


        assertEqual(
            attempt.evidence.independence,
            "independent"
        );
    }
);


test(
    "numeric retry is retry_assisted",
    () => {

        const attempt =
            buildNumericAttempt({
                attemptNumber:
                    2
            });


        assertEqual(
            attempt.evidence.independence,
            "retry_assisted"
        );
    }
);


test(
    "numeric answer after hint is hint_assisted",
    () => {

        const attempt =
            buildNumericAttempt({

                attemptNumber:
                    1,

                hint: {
                    used:
                        true,

                    count:
                        1,

                    level:
                        1
                }
            });


        assertEqual(
            attempt.evidence.independence,
            "hint_assisted"
        );
    }
);


/* =========================================================
 * IMPORTANT CONTRACT BOUNDARY
 * ======================================================= */

test(
    "Attempt evidence does not contain questionType",
    () => {

        const attempt =
            buildNumericAttempt();


        assertEqual(
            Object.prototype.hasOwnProperty.call(
                attempt.evidence,
                "questionType"
            ),
            false
        );
    }
);


test(
    "Attempt context does not receive semantic question contextId",
    () => {

        const attempt =
            buildNumericAttempt();


        /**
         * Attempt Contract V1.0.0 does not own the
         * Question semantic evidence contextId.
         *
         * StudySession passes:
         *
         * question.context.contextId
         *
         * separately through masteryEvidenceContext.
         */

        assertEqual(
            Object.prototype.hasOwnProperty.call(
                attempt.context,
                "contextId"
            ),
            false
        );
    }
);


/* =========================================================
 * RESULT VOCABULARY
 * ======================================================= */

test(
    "Evaluator wrong maps to Attempt incorrect",
    () => {

        const question =
            createNumericQuestion();


        const evaluation =
            evaluateAnswer({
                question,
                response:
                    999
            });


        assertEqual(
            evaluation.result,
            "wrong"
        );


        const attempt =
            buildAttempt({

                attemptId:
                    "ATT-K283-NUMERIC-WRONG",

                studentId:
                    "STUDENT-001",

                sessionId:
                    "SESSION-001",

                question,

                evaluation,

                startedAt:
                    "2026-10-05T08:00:00+07:00",

                submittedAt:
                    "2026-10-05T08:00:30+07:00",

                context: {

                    learningMode:
                        "HOC_SAU",

                    action:
                        "CHALLENGE",

                    pathStage:
                        "CHALLENGE"
                }
            });


        assertEqual(
            attempt.result,
            "incorrect"
        );
    }
);


/* =========================================================
 * INVALID UPSTREAM EVALUATION
 * ======================================================= */

test(
    "AttemptBuilder rejects non-number numeric evaluation value",
    () => {

        const question =
            createNumericQuestion();


        /**
         * Deliberately fake an invalid upstream evaluation.
         *
         * This proves AttemptBuilder does not silently
         * parse or repair malformed evaluator output.
         */

        const invalidEvaluation = {

            questionId:
                question.id,

            result:
                "correct",

            response: {
                value:
                    "20"
            },

            score: {
                normalized:
                    1
            }
        };


        assertThrows(
            () =>
                buildAttempt({

                    attemptId:
                        "ATT-INVALID-NUMERIC",

                    studentId:
                        "STUDENT-001",

                    sessionId:
                        "SESSION-001",

                    question,

                    evaluation:
                        invalidEvaluation,

                    startedAt:
                        "2026-10-05T08:00:00+07:00",

                    submittedAt:
                        "2026-10-05T08:00:30+07:00",

                    context: {

                        learningMode:
                            "HOC_SAU",

                        action:
                            "CHALLENGE",

                        pathStage:
                            "CHALLENGE"
                    }
                }),

            "invalid numeric evaluation.response.value"
        );
    }
);


/* =========================================================
 * MCQ REGRESSION
 * ======================================================= */

test(
    "existing MCQ flow still produces singleChoice response",
    () => {

        const question =
            createMcqQuestion();


        const evaluation =
            evaluateAnswer({
                question,
                response:
                    "B"
            });


        const attempt =
            buildAttempt({

                attemptId:
                    "ATT-K283-MCQ-001",

                studentId:
                    "STUDENT-001",

                sessionId:
                    "SESSION-001",

                question,

                evaluation,

                startedAt:
                    "2026-10-05T08:00:00+07:00",

                submittedAt:
                    "2026-10-05T08:00:30+07:00",

                context: {

                    learningMode:
                        "HOC_SAU",

                    action:
                        "PRACTICE",

                    pathStage:
                        "PRACTICE"
                }
            });


        assertDeepEqual(
            attempt.response,
            {
                type:
                    "singleChoice",

                value:
                    "B",

                normalizedValue:
                    "B"
            }
        );


        assertEqual(
            attempt.result,
            "correct"
        );
    }
);


/* =========================================================
 * UNSUPPORTED COMBINATIONS
 * ======================================================= */

test(
    "AttemptBuilder rejects unsupported numeric + single pair",
    () => {

        const question =
            createNumericQuestion();


        question.answer = {
            type:
                "single",

            value:
                "B"
        };


        const fakeEvaluation = {

            questionId:
                question.id,

            result:
                "correct",

            response: {
                value:
                    "B"
            },

            score: {
                normalized:
                    1
            }
        };


        assertThrows(
            () =>
                buildAttempt({

                    attemptId:
                        "ATT-UNSUPPORTED-001",

                    studentId:
                        "STUDENT-001",

                    sessionId:
                        "SESSION-001",

                    question,

                    evaluation:
                        fakeEvaluation,

                    startedAt:
                        "2026-10-05T08:00:00+07:00",

                    submittedAt:
                        "2026-10-05T08:00:30+07:00",

                    context: {

                        learningMode:
                            "HOC_SAU",

                        action:
                            "CHALLENGE",

                        pathStage:
                            "CHALLENGE"
                    }
                }),

            "does not support"
        );
    }
);


/* =========================================================
 * BUILDER METADATA
 * ======================================================= */

test(
    "AttemptBuilder metadata reports V1.0.2",
    () => {

        assertEqual(
            ATTEMPT_BUILDER_INFO.name,
            "AttemptBuilder"
        );

        assertEqual(
            ATTEMPT_BUILDER_INFO.version,
            "1.0.2"
        );

        assertEqual(
            ATTEMPT_BUILDER_INFO.schemaVersion,
            "1.0.0"
        );
    }
);


/* =========================================================
 * CANONICAL REQUIRED OUTPUT
 * ======================================================= */

test(
    "numeric Attempt contains canonical required root fields",
    () => {

        const attempt =
            buildNumericAttempt();


        const requiredFields = [

            "schemaVersion",
            "attemptId",
            "studentId",
            "sessionId",
            "questionId",

            "startedAt",
            "submittedAt",

            "response",
            "result",
            "score",

            "attemptNumber",

            "hint",
            "timing",
            "context"
        ];


        for (
            const field
            of requiredFields
        ) {

            if (
                !Object.prototype
                    .hasOwnProperty
                    .call(
                        attempt,
                        field
                    )
            ) {

                throw new Error(
                    `Attempt is missing required field '${field}'.`
                );
            }
        }
    }
);


/* =========================================================
 * INPUT IMMUTABILITY
 * ======================================================= */

test(
    "numeric build does not mutate Question or Evaluation",
    () => {

        const question =
            createNumericQuestion();


        const evaluation =
            evaluateAnswer({
                question,
                response:
                    "20"
            });


        const questionBefore =
            JSON.stringify(
                question
            );


        const evaluationBefore =
            JSON.stringify(
                evaluation
            );


        buildAttempt({

            attemptId:
                "ATT-IMMUTABLE-001",

            studentId:
                "STUDENT-001",

            sessionId:
                "SESSION-001",

            question,

            evaluation,

            startedAt:
                "2026-10-05T08:00:00+07:00",

            submittedAt:
                "2026-10-05T08:00:30+07:00",

            context: {

                learningMode:
                    "HOC_SAU",

                action:
                    "CHALLENGE",

                pathStage:
                    "CHALLENGE"
            }
        });


        assertEqual(
            JSON.stringify(
                question
            ),
            questionBefore,
            "Question was mutated."
        );


        assertEqual(
            JSON.stringify(
                evaluation
            ),
            evaluationBefore,
            "Evaluation was mutated."
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
    "AttemptBuilder V1.0.2 — Numeric Focused Tests"
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
        "\n✓ AttemptBuilder V1.0.2 numeric behavior PASS"
    );
}