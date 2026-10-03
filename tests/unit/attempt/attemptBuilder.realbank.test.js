/**
 * attemptBuilder.realbank.test.js
 *
 * Real-bank integration gate for:
 *
 *   Question Bank
 *        ↓
 *   AnswerEvaluator V1.0.0
 *        ↓
 *   AttemptBuilder V1.0.1
 *        ↓
 *   attempt.schema.json V1.0.0
 *
 * Scope:
 * - Real C09 banks:
 *   K281
 *   K282
 *   K283
 *   K284
 *
 * Purpose:
 * - Verify every real Study MVP question can travel through
 *   the actual runtime pipeline and produce a canonical Attempt.
 *
 * Does NOT:
 * - test Mastery Engine
 * - test Adaptive Engine
 * - test Remediation Engine
 * - mutate question banks
 *
 * Run:
 *   node --test attemptBuilder.realbank.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
    evaluateAnswer
} from "./answerEvaluator.js";

import {
    buildAttempt,
    ATTEMPT_BUILDER_INFO
} from "./attemptBuilder.js";


/**
 * =========================================================
 * PATHS
 * =========================================================
 */

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


/**
 * Expected project structure:
 *
 * prjsinh/
 *
 * ├── data/
 * │   ├── K281.question-bank.json
 * │   ├── K282.question-bank.json
 * │   ├── K283.question-bank.json
 * │   └── K284.question-bank.json
 *
 * ├── schemas/
 * │   └── attempt.schema.json
 *
 * └── js/
 *     └── engine/
 *         ├── answerEvaluator.js
 *         ├── attemptBuilder.js
 *         └── attemptBuilder.realbank.test.js
 */

const DATA_DIR =
    path.join(
        __dirname,
        "../../data",
        "../data/questions/c09"
    );


const ATTEMPT_SCHEMA_PATH =
    path.join(
        __dirname,
        "../../data/runtime/attempt.schema.json"
    );


const BANK_FILES = [
    "K281.question-bank.json",
    "K282.question-bank.json",
    "K283.question-bank.json",
    "K284.question-bank.json"
];


/**
 * =========================================================
 * JSON LOADING
 * =========================================================
 */

function loadJson(
    filePath
) {

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


function loadBank(
    filename
) {

    return loadJson(
        path.join(
            DATA_DIR,
            filename
        )
    );
}


/**
 * =========================================================
 * LOAD REAL BANKS
 * =========================================================
 */

const banks =
    BANK_FILES.map(
        (filename) => ({
            filename,
            bank:
                loadBank(
                    filename
                )
        })
    );


const allQuestions =
    banks.flatMap(
        ({
            filename,
            bank
        }) => {

            assert.ok(
                Array.isArray(
                    bank.questions
                ),
                `${filename} must contain questions[].`
            );


            return bank.questions.map(
                (question) => ({
                    filename,
                    bank,
                    question
                })
            );
        }
    );


/**
 * =========================================================
 * ATTEMPT SCHEMA
 * =========================================================
 */

const attemptSchema =
    loadJson(
        ATTEMPT_SCHEMA_PATH
    );


const ajv =
    new Ajv2020({
        allErrors: true,
        strict: false
    });


addFormats(
    ajv
);


const validateAttempt =
    ajv.compile(
        attemptSchema
    );


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function assertAttemptValid(
    attempt,
    label
) {

    const valid =
        validateAttempt(
            attempt
        );


    assert.equal(
        valid,
        true,

        [
            `${label} produced an invalid Attempt.`,
            "",
            "Schema errors:",
            JSON.stringify(
                validateAttempt.errors,
                null,
                2
            ),
            "",
            "Attempt:",
            JSON.stringify(
                attempt,
                null,
                2
            )
        ].join("\n")
    );
}


/**
 * Find the canonical correct option using question.answer.value.
 *
 * We intentionally use the Question Contract's answer field
 * because AnswerEvaluator also treats it as source of truth.
 */
function getCorrectOptionId(
    question
) {

    assert.equal(
        question.questionType,
        "mcq",
        `${question.id} must be MCQ for Study MVP.`
    );


    assert.equal(
        question.answer?.type,
        "single",
        `${question.id} must use answer.type='single'.`
    );


    const correctOptionId =
        question.answer?.value;


    assert.equal(
        typeof correctOptionId,
        "string",
        `${question.id} must contain answer.value.`
    );


    assert.ok(
        correctOptionId.length > 0,
        `${question.id} answer.value must not be empty.`
    );


    return correctOptionId;
}


/**
 * Find one intentionally wrong option.
 *
 * This does NOT infer biology correctness.
 * It simply chooses an option ID different from
 * the canonical question.answer.value.
 */
function getWrongOptionId(
    question
) {

    const correctOptionId =
        getCorrectOptionId(
            question
        );


    const options =
        question.content?.options;


    assert.ok(
        Array.isArray(options),
        `${question.id} must contain content.options[].`
    );


    const wrongOption =
        options.find(
            (option) =>
                option.id !==
                correctOptionId
        );


    assert.ok(
        wrongOption,
        `${question.id} must contain at least one wrong option.`
    );


    return wrongOption.id;
}


/**
 * Runtime context for a real question.
 *
 * Important:
 * AttemptBuilder owns projection of:
 * - context.nodeId
 * - secondaryNodeIds
 * - metaSkillIds
 *
 * Therefore we do NOT manually duplicate those fields here.
 */
function createContext(
    bank,
    overrides = {}
) {

    return {

        learningMode:
            "HOC_SAU",

        action:
            "PRACTICE",

        pathStage:
            "PRACTICE",

        clusterId:
            bank.cluster,

        decisionId:
            `DECISION-${bank.primaryNode}`,

        ...overrides
    };
}


/**
 * Stable deterministic timestamps.
 *
 * Avoid Date.now() so tests remain reproducible.
 */
function createTimes(
    index = 0
) {

    const base =
        Date.parse(
            "2026-10-01T07:00:00.000Z"
        );


    const started =
        new Date(
            base +
            index * 60_000
        );


    const submitted =
        new Date(
            started.getTime() +
            30_000
        );


    return {

        startedAt:
            started.toISOString(),

        submittedAt:
            submitted.toISOString()
    };
}


/**
 * Evaluate a real question and immediately build
 * the canonical Attempt.
 */
function evaluateAndBuild({
    question,
    bank,
    response,
    index,
    attemptNumber = 1,
    hint = null,
    retry = null,
    context = null
}) {

    const evaluation =
        evaluateAnswer({
            question,
            response
        });


    const {
        startedAt,
        submittedAt
    } =
        createTimes(
            index
        );


    const attempt =
        buildAttempt({

            attemptId:
                `ATTEMPT-REAL-${index + 1}`,

            studentId:
                "STUDENT-REALBANK",

            sessionId:
                "SESSION-C09-REALBANK",

            question,

            evaluation,

            startedAt,
            submittedAt,

            attemptNumber,

            hint,

            retry,

            context:
                context ??
                createContext(
                    bank
                ),

            metadata: {
                engineVersion:
                    "realbank-test"
            }
        });


    return {
        evaluation,
        attempt
    };
}


/**
 * =========================================================
 * 1. BANK FILES LOAD
 * =========================================================
 */

test(
    "1. loads all four real C09 question banks",
    () => {

        assert.equal(
            banks.length,
            4
        );


        assert.deepEqual(
            banks.map(
                ({ bank }) =>
                    bank.primaryNode
            ),
            [
                "K281",
                "K282",
                "K283",
                "K284"
            ]
        );


        for (
            const {
                filename,
                bank
            }
            of banks
        ) {

            assert.equal(
                bank.cluster,
                "C09",
                `${filename} must belong to C09.`
            );


            assert.ok(
                Array.isArray(
                    bank.questions
                ),
                `${filename} must contain questions[].`
            );


            assert.ok(
                bank.questions.length > 0,
                `${filename} must not be empty.`
            );
        }
    }
);


/**
 * =========================================================
 * 2. EXPECTED REAL BANK SIZE
 * =========================================================
 */

test(
    "2. real C09 bank contains 32 questions",
    () => {

        assert.equal(
            allQuestions.length,
            32,

            [
                "Expected the locked C09 Study MVP bank",
                "to contain exactly 32 questions.",
                "",
                "Actual bank sizes:",
                ...banks.map(
                    ({
                        filename,
                        bank
                    }) =>
                        `${filename}: ${bank.questions.length}`
                )
            ].join("\n")
        );
    }
);


/**
 * =========================================================
 * 3. STUDY MVP QUESTION TYPES
 * =========================================================
 */

test(
    "3. all real C09 questions are supported single-answer MCQs",
    () => {

        for (
            const {
                filename,
                question
            }
            of allQuestions
        ) {

            assert.equal(
                question.questionType,
                "mcq",
                `${filename} / ${question.id}`
            );


            assert.equal(
                question.answer?.type,
                "single",
                `${filename} / ${question.id}`
            );


            assert.equal(
                typeof question.answer?.value,
                "string",
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 4. CORRECT PIPELINE — ALL QUESTIONS
 * =========================================================
 *
 * This is the main real-bank gate:
 *
 * real Question
 *   → real AnswerEvaluator
 *   → real AttemptBuilder
 *   → real Attempt Schema
 */

test(
    "4. every real C09 question produces schema-valid correct Attempt",
    () => {

        allQuestions.forEach(
            (
                {
                    filename,
                    bank,
                    question
                },
                index
            ) => {

                const correctOptionId =
                    getCorrectOptionId(
                        question
                    );


                const {
                    evaluation,
                    attempt
                } =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            correctOptionId,

                        index
                    });


                assert.equal(
                    evaluation.result,
                    "correct",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    evaluation.correct,
                    true,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    evaluation.score.normalized,
                    1,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.result,
                    "correct",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.score,
                    1,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.questionId,
                    question.id,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.context.nodeId,
                    question.primaryNode,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.evidence.primaryDimension,
                    question.evidence,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.evidence.difficulty,
                    question.difficulty,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.evidence.independence,
                    "independent",
                    `${filename} / ${question.id}`
                );


                /**
                 * Regression gate:
                 *
                 * Attempt Contract V1.0.0 does NOT
                 * contain evidence.questionType.
                 */
                assert.equal(
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            attempt.evidence,
                            "questionType"
                        ),
                    false,
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    attempt,
                    `${filename} / ${question.id}`
                );
            }
        );
    }
);


/**
 * =========================================================
 * 5. WRONG PIPELINE — ALL QUESTIONS
 * =========================================================
 */

test(
    "5. every real C09 question produces schema-valid incorrect Attempt",
    () => {

        allQuestions.forEach(
            (
                {
                    filename,
                    bank,
                    question
                },
                index
            ) => {

                const wrongOptionId =
                    getWrongOptionId(
                        question
                    );


                const {
                    evaluation,
                    attempt
                } =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            wrongOptionId,

                        index:
                            index + 100
                    });


                assert.equal(
                    evaluation.result,
                    "wrong",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    evaluation.correct,
                    false,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    evaluation.score.normalized,
                    0,
                    `${filename} / ${question.id}`
                );


                /**
                 * Critical vocabulary boundary:
                 *
                 * AnswerEvaluator:
                 *   wrong
                 *
                 * Attempt Contract:
                 *   incorrect
                 */
                assert.equal(
                    attempt.result,
                    "incorrect",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.score,
                    0,
                    `${filename} / ${question.id}`
                );


                /**
                 * AttemptBuilder must NOT invent diagnosis.
                 */
                assert.equal(
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            attempt,
                            "diagnostic"
                        ),
                    false,
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    attempt,
                    `${filename} / ${question.id}`
                );
            }
        );
    }
);


/**
 * =========================================================
 * 6. SKIPPED PIPELINE — ALL QUESTIONS
 * =========================================================
 */

test(
    "6. every real C09 question produces schema-valid skipped Attempt",
    () => {

        allQuestions.forEach(
            (
                {
                    filename,
                    bank,
                    question
                },
                index
            ) => {

                const {
                    evaluation,
                    attempt
                } =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            null,

                        index:
                            index + 200
                    });


                assert.equal(
                    evaluation.result,
                    "skipped",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.result,
                    "skipped",
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.score,
                    0,
                    `${filename} / ${question.id}`
                );


                assert.equal(
                    attempt.response.value,
                    null,
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    attempt,
                    `${filename} / ${question.id}`
                );
            }
        );
    }
);


/**
 * =========================================================
 * 7. QUESTION → ATTEMPT EVIDENCE PROJECTION
 * =========================================================
 */

test(
    "7. real question evidence and difficulty project correctly",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const correctOptionId =
                getCorrectOptionId(
                    question
                );


            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        correctOptionId,

                    index:
                        index + 300
                });


            assert.equal(
                attempt.evidence.primaryDimension,
                question.evidence,
                `${filename} / ${question.id}`
            );


            assert.equal(
                attempt.evidence.difficulty,
                question.difficulty,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 8. PRIMARY NODE PROJECTION
 * =========================================================
 */

test(
    "8. real question primaryNode projects to context.nodeId",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 400
                });


            assert.equal(
                attempt.context.nodeId,
                question.primaryNode,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 9. SECONDARY NODE PROJECTION
 * =========================================================
 */

test(
    "9. real secondaryNodes project without duplication",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 500
                });


            const expected =
                Array.isArray(
                    question.secondaryNodes
                )
                    ? [
                        ...new Set(
                            question.secondaryNodes
                        )
                    ]
                    : [];


            const actual =
                attempt.context
                    .secondaryNodeIds ??
                [];


            assert.deepEqual(
                actual,
                expected,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 10. META SKILL PROJECTION
 * =========================================================
 */

test(
    "10. real skills project to context.metaSkillIds",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 600
                });


            const expected =
                Array.isArray(
                    question.skills
                )
                    ? [
                        ...new Set(
                            question.skills
                        )
                    ]
                    : [];


            const actual =
                attempt.context
                    .metaSkillIds ??
                [];


            assert.deepEqual(
                actual,
                expected,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 11. QUESTION VERSION
 * =========================================================
 */

test(
    "11. real question version projects to Attempt metadata",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 700
                });


            assert.equal(
                attempt.metadata
                    ?.questionVersion,
                question.version,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 12. HINT-ASSISTED — REAL QUESTIONS
 * =========================================================
 */

test(
    "12. real questions produce schema-valid hint-assisted Attempts",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 800,

                    hint: {
                        used:
                            true,

                        level:
                            1,

                        count:
                            1
                    }
                });


            assert.equal(
                attempt.evidence.independence,
                "hint_assisted",
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 13. RETRY-ASSISTED — REAL QUESTIONS
 * =========================================================
 */

test(
    "13. real questions produce schema-valid retry-assisted Attempts",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 900,

                    attemptNumber:
                        2,

                    retry: {

                        isRetry:
                            true,

                        previousAttemptId:
                            `ATTEMPT-PREV-${index + 1}`,

                        retryNumber:
                            1
                    }
                });


            assert.equal(
                attempt.evidence.independence,
                "retry_assisted",
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 14. DIAGNOSTIC FAILURE TYPE — REAL QUESTION
 * =========================================================
 *
 * Diagnostic data is explicitly supplied.
 * AttemptBuilder must record it, not infer it.
 */

test(
    "14. real question supports canonical diagnostic.failureType",
    () => {

        const {
            bank,
            question,
            filename
        } =
            allQuestions[0];


        const evaluation =
            evaluateAnswer({

                question,

                response:
                    getWrongOptionId(
                        question
                    )
            });


        const {
            startedAt,
            submittedAt
        } =
            createTimes(
                1000
            );


        const attempt =
            buildAttempt({

                attemptId:
                    "ATTEMPT-REAL-DIAGNOSTIC",

                studentId:
                    "STUDENT-REALBANK",

                sessionId:
                    "SESSION-C09-REALBANK",

                question,
                evaluation,

                startedAt,
                submittedAt,

                context:
                    createContext(
                        bank
                    ),

                diagnostic: {

                    failureType:
                        "reasoning_error",

                    sourceNodeId:
                        question.primaryNode,

                    confidence:
                        0.8,

                    evidence:
                        "Real-bank integration test."
                }
            });


        assert.equal(
            attempt.diagnostic.failureType,
            "reasoning_error"
        );


        assert.equal(
            attempt.result,
            "incorrect"
        );


        assertAttemptValid(
            attempt,
            `${filename} / diagnostic`
        );
    }
);


/**
 * =========================================================
 * 15. FAILURE SIGNATURE ID — REAL QUESTION
 * =========================================================
 */

test(
    "15. real question supports canonical failureSignatureId reference",
    () => {

        const {
            bank,
            question,
            filename
        } =
            allQuestions[0];


        const evaluation =
            evaluateAnswer({

                question,

                response:
                    getWrongOptionId(
                        question
                    )
            });


        const {
            startedAt,
            submittedAt
        } =
            createTimes(
                1100
            );


        const attempt =
            buildAttempt({

                attemptId:
                    "ATTEMPT-REAL-SIGNATURE",

                studentId:
                    "STUDENT-REALBANK",

                sessionId:
                    "SESSION-C09-REALBANK",

                question,
                evaluation,

                startedAt,
                submittedAt,

                context:
                    createContext(
                        bank
                    ),

                diagnostic: {

                    failureSignatureId:
                        "FS-REALBANK-001",

                    failureType:
                        "reasoning_error",

                    sourceNodeId:
                        question.primaryNode,

                    confidence:
                        0.9,

                    evidence:
                        "Canonical failure signature integration test."
                }
            });


        assert.equal(
            attempt
                .diagnostic
                .failureSignatureId,
            "FS-REALBANK-001"
        );


        assert.equal(
            attempt
                .diagnostic
                .failureType,
            "reasoning_error"
        );


        assertAttemptValid(
            attempt,
            `${filename} / failureSignatureId`
        );
    }
);


/**
 * =========================================================
 * 16. NO LEGACY EVIDENCE QUESTION TYPE
 * =========================================================
 */

test(
    "16. no real-bank Attempt emits legacy evidence.questionType",
    () => {

        for (
            const [
                index,
                {
                    filename,
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 1200
                });


            assert.equal(
                Object.prototype
                    .hasOwnProperty
                    .call(
                        attempt.evidence,
                        "questionType"
                    ),
                false,
                `${filename} / ${question.id}`
            );


            assertAttemptValid(
                attempt,
                `${filename} / ${question.id}`
            );
        }
    }
);


/**
 * =========================================================
 * 17. NO LEGACY FAILURE SIGNATURE
 * =========================================================
 */

test(
    "17. no canonical diagnostic emits legacy failureSignature",
    () => {

        const {
            bank,
            question
        } =
            allQuestions[0];


        const evaluation =
            evaluateAnswer({

                question,

                response:
                    getWrongOptionId(
                        question
                    )
            });


        const {
            startedAt,
            submittedAt
        } =
            createTimes(
                1300
            );


        const attempt =
            buildAttempt({

                attemptId:
                    "ATTEMPT-NO-LEGACY",

                studentId:
                    "STUDENT-REALBANK",

                sessionId:
                    "SESSION-C09-REALBANK",

                question,
                evaluation,

                startedAt,
                submittedAt,

                context:
                    createContext(
                        bank
                    ),

                diagnostic: {

                    failureType:
                        "reasoning_error"
                }
            });


        assert.equal(
            Object.prototype
                .hasOwnProperty
                .call(
                    attempt.diagnostic,
                    "failureSignature"
                ),
            false
        );


        assertAttemptValid(
            attempt,
            "No legacy failureSignature"
        );
    }
);


/**
 * =========================================================
 * 18. BANK DISTRIBUTION
 * =========================================================
 */

test(
    "18. all four C09 nodes are represented in runtime Attempts",
    () => {

        const observedNodes =
            new Set();


        for (
            const [
                index,
                {
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const {
                attempt
            } =
                evaluateAndBuild({

                    question,
                    bank,

                    response:
                        getCorrectOptionId(
                            question
                        ),

                    index:
                        index + 1400
                });


            observedNodes.add(
                attempt.context.nodeId
            );
        }


        assert.deepEqual(
            [
                ...observedNodes
            ].sort(),
            [
                "K281",
                "K282",
                "K283",
                "K284"
            ]
        );
    }
);


/**
 * =========================================================
 * 19. NO INPUT MUTATION
 * =========================================================
 */

test(
    "19. real Question objects are not mutated by pipeline",
    () => {

        for (
            const [
                index,
                {
                    bank,
                    question
                }
            ]
            of allQuestions.entries()
        ) {

            const before =
                structuredClone(
                    question
                );


            evaluateAndBuild({

                question,
                bank,

                response:
                    getCorrectOptionId(
                        question
                    ),

                index:
                    index + 1500
            });


            assert.deepEqual(
                question,
                before,
                question.id
            );
        }
    }
);


/**
 * =========================================================
 * 20. FULL REAL-BANK PIPELINE SUMMARY
 * =========================================================
 */

test(
    "20. complete C09 real-bank runtime gate passes",
    () => {

        let correctAttempts =
            0;

        let incorrectAttempts =
            0;

        let skippedAttempts =
            0;


        allQuestions.forEach(
            (
                {
                    filename,
                    bank,
                    question
                },
                index
            ) => {

                /**
                 * -----------------------------
                 * Correct
                 * -----------------------------
                 */

                const correct =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            getCorrectOptionId(
                                question
                            ),

                        index:
                            index + 1600
                    });


                assert.equal(
                    correct.attempt.result,
                    "correct",
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    correct.attempt,
                    `${filename} / ${question.id} / correct`
                );


                correctAttempts++;


                /**
                 * -----------------------------
                 * Incorrect
                 * -----------------------------
                 */

                const incorrect =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            getWrongOptionId(
                                question
                            ),

                        index:
                            index + 1700
                    });


                assert.equal(
                    incorrect.attempt.result,
                    "incorrect",
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    incorrect.attempt,
                    `${filename} / ${question.id} / incorrect`
                );


                incorrectAttempts++;


                /**
                 * -----------------------------
                 * Skipped
                 * -----------------------------
                 */

                const skipped =
                    evaluateAndBuild({

                        question,
                        bank,

                        response:
                            null,

                        index:
                            index + 1800
                    });


                assert.equal(
                    skipped.attempt.result,
                    "skipped",
                    `${filename} / ${question.id}`
                );


                assertAttemptValid(
                    skipped.attempt,
                    `${filename} / ${question.id} / skipped`
                );


                skippedAttempts++;
            }
        );


        assert.equal(
            correctAttempts,
            allQuestions.length
        );


        assert.equal(
            incorrectAttempts,
            allQuestions.length
        );


        assert.equal(
            skippedAttempts,
            allQuestions.length
        );


        /**
         * Locked current C09 bank:
         *
         * 32 questions × 3 runtime paths
         * = 96 schema-valid Attempts.
         */

        assert.equal(
            (
                correctAttempts +
                incorrectAttempts +
                skippedAttempts
            ),
            96
        );
    }
);