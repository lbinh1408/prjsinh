/**
 * attemptBuilder.schema.test.js
 *
 * Schema integration tests for:
 *   AttemptBuilder V1.0.1
 *
 * Purpose:
 *   Verify REAL AttemptBuilder output against
 *   the LOCKED attempt.schema.json V1.0.0 contract.
 *
 * This test intentionally uses the real JSON Schema
 * as an independent contract gate.
 *
 * Run:
 *   node --test attemptBuilder.schema.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

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
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


/**
 * Project structure expected:
 *
 * prjsinh/
 * ├── schemas/
 * │   └── attempt.schema.json
 * └── js/
 *     └── engine/
 *         ├── attemptBuilder.js
 *         └── attemptBuilder.schema.test.js
 */

const ATTEMPT_SCHEMA_PATH =
    path.join(
        __dirname,
        "../../data/runtime/attempt.schema.json"
    );


/**
 * =========================================================
 * LOAD SCHEMA
 * =========================================================
 */

function loadJson(filePath) {

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


const attemptSchema =
    loadJson(
        ATTEMPT_SCHEMA_PATH
    );


/**
 * =========================================================
 * AJV
 * =========================================================
 */

const ajv =
    new Ajv2020({
        allErrors: true,
        strict: false
    });


addFormats(
    ajv
);


const validateAttemptSchema =
    ajv.compile(
        attemptSchema
    );


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const STARTED_AT =
    "2026-10-01T07:00:00.000Z";

const SUBMITTED_AT =
    "2026-10-01T07:00:30.000Z";


function createQuestion(
    overrides = {}
) {

    const base = {

        id:
            "Q-A-K283-A-001",

        version:
            "1.0.0",

        nodes: [
            "K283"
        ],

        primaryNode:
            "K283",

        secondaryNodes: [
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
                false,

            rubric:
                null
        }
    };


    return {
        ...base,
        ...overrides
    };
}


function createEvaluation(
    overrides = {}
) {

    const base = {

        evaluator: {
            name:
                "AnswerEvaluator",

            version:
                "1.0.0"
        },

        questionId:
            "Q-A-K283-A-001",

        questionType:
            "mcq",

        answerType:
            "single",

        result:
            "correct",

        correct:
            true,

        response: {
            value:
                "B"
        },

        score: {
            earned:
                1,

            max:
                1,

            normalized:
                1
        }
    };


    return {
        ...base,
        ...overrides
    };
}


function createContext(
    overrides = {}
) {

    return {

        learningMode:
            "HOC_SAU",

        action:
            "PRACTICE",

        pathStage:
            "PRACTICE",

        decisionId:
            "DECISION-001",

        clusterId:
            "C09",

        ...overrides
    };
}


function createInput(
    overrides = {}
) {

    return {

        attemptId:
            "ATTEMPT-001",

        studentId:
            "STUDENT-001",

        sessionId:
            "SESSION-001",

        question:
            createQuestion(),

        evaluation:
            createEvaluation(),

        startedAt:
            STARTED_AT,

        submittedAt:
            SUBMITTED_AT,

        attemptNumber:
            1,

        context:
            createContext(),

        ...overrides
    };
}


/**
 * =========================================================
 * SCHEMA ASSERTION HELPERS
 * =========================================================
 */

function assertSchemaValid(
    attempt,
    label = "Attempt"
) {

    const valid =
        validateAttemptSchema(
            attempt
        );


    assert.equal(
        valid,
        true,

        [
            `${label} must satisfy attempt.schema.json.`,
            "",
            "Schema errors:",
            JSON.stringify(
                validateAttemptSchema.errors,
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


function assertSchemaInvalid(
    attempt,
    expectedKeyword = null
) {

    const valid =
        validateAttemptSchema(
            attempt
        );


    assert.equal(
        valid,
        false,
        "Expected Attempt to be rejected by attempt.schema.json."
    );


    if (expectedKeyword) {

        assert.ok(
            validateAttemptSchema
                .errors
                ?.some(
                    (error) =>
                        error.keyword ===
                        expectedKeyword
                ),

            [
                `Expected schema error keyword '${expectedKeyword}'.`,
                "",
                JSON.stringify(
                    validateAttemptSchema.errors,
                    null,
                    2
                )
            ].join("\n")
        );
    }
}


/**
 * =========================================================
 * 1. SCHEMA CONTRACT
 * =========================================================
 */

test(
    "1. loads canonical Attempt Contract V1.0.0",
    () => {

        assert.equal(
            attemptSchema.title,
            "Learning Attempt Schema"
        );

        assert.equal(
            attemptSchema.type,
            "object"
        );

        assert.equal(
            attemptSchema.additionalProperties,
            false
        );

        assert.equal(
            attemptSchema
                .properties
                .schemaVersion
                .const,
            "1.0.0"
        );

        assert.equal(
            ATTEMPT_BUILDER_INFO.schemaVersion,
            "1.0.0"
        );
    }
);


/**
 * =========================================================
 * 2. BASIC OUTPUT
 * =========================================================
 */

test(
    "2. basic AttemptBuilder V1.0.1 output validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assertSchemaValid(
            attempt,
            "Basic Attempt"
        );
    }
);


/**
 * =========================================================
 * 3. CORRECT
 * =========================================================
 */

test(
    "3. correct Attempt validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.equal(
            attempt.result,
            "correct"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 4. INCORRECT
 * =========================================================
 */

test(
    "4. evaluator wrong becomes schema-valid incorrect",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "wrong",

                correct:
                    false,

                response: {
                    value:
                        "A"
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "incorrect"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 5. PARTIAL
 * =========================================================
 */

test(
    "5. partial Attempt validates",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "partial",

                correct:
                    false,

                score: {
                    earned:
                        0.5,

                    max:
                        1,

                    normalized:
                        0.5
                }
            });


        const attempt =
            buildAttempt(
                createInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "partial"
        );

        assert.equal(
            attempt.score,
            0.5
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 6. SKIPPED
 * =========================================================
 */

test(
    "6. skipped Attempt validates",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "skipped",

                correct:
                    false,

                response: {
                    value:
                        null
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "skipped"
        );

        assert.equal(
            attempt.response.value,
            null
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 7. CANONICAL EVIDENCE
 * =========================================================
 */

test(
    "7. canonical evidence object validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.deepEqual(
            attempt.evidence,
            {
                difficulty:
                    "D3",

                primaryDimension:
                    "apply",

                independence:
                    "independent"
            }
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 8. NO LEGACY questionType
 * =========================================================
 */

test(
    "8. Builder does not emit evidence.questionType",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                attempt.evidence,
                "questionType"
            ),
            false
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 9. SCHEMA REJECTS evidence.questionType
 * =========================================================
 */

test(
    "9. schema rejects legacy evidence.questionType",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            evidence: {
                ...attempt.evidence,

                questionType:
                    "Q-A"
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "additionalProperties"
        );
    }
);


/**
 * =========================================================
 * 10. KNOW
 * =========================================================
 */

test(
    "10. know primaryDimension validates",
    () => {

        const question =
            createQuestion({

                evidence:
                    "know",

                difficulty:
                    "D1"
            });


        const attempt =
            buildAttempt(
                createInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "know"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 11. EXPLAIN
 * =========================================================
 */

test(
    "11. explain primaryDimension validates",
    () => {

        const question =
            createQuestion({

                evidence:
                    "explain",

                difficulty:
                    "D2"
            });


        const attempt =
            buildAttempt(
                createInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "explain"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 12. APPLY
 * =========================================================
 */

test(
    "12. apply primaryDimension validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "apply"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 13. TRANSFER
 * =========================================================
 */

test(
    "13. transfer primaryDimension validates",
    () => {

        const question =
            createQuestion({

                evidence:
                    "transfer",

                difficulty:
                    "D4"
            });


        const attempt =
            buildAttempt(
                createInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "transfer"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 14. ALL DIFFICULTIES
 * =========================================================
 */

test(
    "14. D1-D5 all validate",
    () => {

        for (
            const difficulty
            of [
                "D1",
                "D2",
                "D3",
                "D4",
                "D5"
            ]
        ) {

            const question =
                createQuestion({
                    difficulty
                });


            const attempt =
                buildAttempt(
                    createInput({
                        question
                    })
                );


            assert.equal(
                attempt.evidence.difficulty,
                difficulty
            );


            assertSchemaValid(
                attempt,
                `Difficulty ${difficulty}`
            );
        }
    }
);


/**
 * =========================================================
 * 15. INDEPENDENT
 * =========================================================
 */

test(
    "15. independent evidence validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.equal(
            attempt.evidence.independence,
            "independent"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 16. HINT ASSISTED
 * =========================================================
 */

test(
    "16. hint_assisted evidence validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    hint: {
                        used:
                            true,

                        level:
                            1,

                        count:
                            1
                    }
                })
            );


        assert.equal(
            attempt.evidence.independence,
            "hint_assisted"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 17. RETRY ASSISTED
 * =========================================================
 */

test(
    "17. retry_assisted evidence validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    attemptNumber:
                        2,

                    retry: {

                        isRetry:
                            true,

                        previousAttemptId:
                            "ATTEMPT-000",

                        retryNumber:
                            1
                    }
                })
            );


        assert.equal(
            attempt.evidence.independence,
            "retry_assisted"
        );

        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 18. HINT MAXIMUM
 * =========================================================
 */

test(
    "18. canonical hint maximum level/count 2 validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    hint: {
                        used:
                            true,

                        level:
                            2,

                        count:
                            2
                    }
                })
            );


        assert.deepEqual(
            attempt.hint,
            {
                used:
                    true,

                count:
                    2,

                level:
                    2
            }
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 19. SCHEMA REJECTS HINT LEVEL 3
 * =========================================================
 */

test(
    "19. schema rejects hint.level above 2",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            hint: {
                used:
                    true,

                count:
                    1,

                level:
                    3
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "maximum"
        );
    }
);


/**
 * =========================================================
 * 20. SCHEMA REJECTS HINT COUNT 3
 * =========================================================
 */

test(
    "20. schema rejects hint.count above 2",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            hint: {
                used:
                    true,

                level:
                    2,

                count:
                    3
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "maximum"
        );
    }
);


/**
 * =========================================================
 * 21. FAILURE TYPE
 * =========================================================
 */

test(
    "21. canonical diagnostic.failureType validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    diagnostic: {

                        failureType:
                            "calculation_error",

                        sourceNodeId:
                            "K283",

                        metaSkillId:
                            "S008",

                        confidence:
                            0.9,

                        evidence:
                            "Observed calculation error."
                    }
                })
            );


        assert.equal(
            attempt.diagnostic.failureType,
            "calculation_error"
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 22. FAILURE SIGNATURE ID
 * =========================================================
 */

test(
    "22. canonical diagnostic.failureSignatureId validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    diagnostic: {

                        failureSignatureId:
                            "FS-CALC-001",

                        failureType:
                            "calculation_error"
                    }
                })
            );


        assert.equal(
            attempt
                .diagnostic
                .failureSignatureId,
            "FS-CALC-001"
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 23. ALL FAILURE TYPES
 * =========================================================
 */

test(
    "23. all canonical failureType values validate",
    () => {

        const failureTypes = [

            "prerequisite_gap",
            "concept_confusion",
            "mechanism_confusion",
            "calculation_error",
            "data_interpretation_error",
            "reasoning_error",
            "cross_node_reasoning_error",
            "careless_error",
            "source_knowledge_gap",
            "meta_skill_gap"

        ];


        for (
            const failureType
            of failureTypes
        ) {

            const attempt =
                buildAttempt(
                    createInput({

                        diagnostic: {
                            failureType,
                            confidence:
                                0.8
                        }
                    })
                );


            assertSchemaValid(
                attempt,
                `failureType ${failureType}`
            );
        }
    }
);


/**
 * =========================================================
 * 24. SCHEMA REJECTS LEGACY failureSignature
 * =========================================================
 */

test(
    "24. schema rejects legacy diagnostic.failureSignature",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            diagnostic: {
                failureSignature:
                    "calculation_error"
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "additionalProperties"
        );
    }
);


/**
 * =========================================================
 * 25. RETRY MAXIMUM
 * =========================================================
 */

test(
    "25. canonical retryNumber maximum 2 validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    attemptNumber:
                        3,

                    retry: {

                        isRetry:
                            true,

                        previousAttemptId:
                            "ATTEMPT-002",

                        retryNumber:
                            2
                    }
                })
            );


        assert.equal(
            attempt.retry.retryNumber,
            2
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 26. SCHEMA REJECTS RETRY NUMBER 3
 * =========================================================
 */

test(
    "26. schema rejects retryNumber above 2",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    attemptNumber:
                        2,

                    retry: {

                        isRetry:
                            true,

                        retryNumber:
                            2
                    }
                })
            );


        const invalidAttempt = {

            ...attempt,

            retry: {
                ...attempt.retry,

                retryNumber:
                    3
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "maximum"
        );
    }
);


/**
 * =========================================================
 * 27. CONTEXT
 * =========================================================
 */

test(
    "27. canonical context with projected node data validates",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        assert.equal(
            attempt.context.nodeId,
            "K283"
        );

        assert.deepEqual(
            attempt.context.secondaryNodeIds,
            [
                "K282"
            ]
        );

        assert.deepEqual(
            attempt.context.metaSkillIds,
            [
                "S008"
            ]
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 28. PRIMARY ACTIONS
 * =========================================================
 */

test(
    "28. all canonical Adaptive primary actions validate",
    () => {

        const actions = [
            "LEARN",
            "PRACTICE",
            "CHALLENGE",
            "REMEDIATE",
            "RETEST",
            "REVIEW",
            "SKIP"
        ];


        const stageForAction = {

            LEARN:
                "LEARN",

            PRACTICE:
                "PRACTICE",

            CHALLENGE:
                "CHALLENGE",

            REMEDIATE:
                "REMEDIATE",

            RETEST:
                "RETEST",

            REVIEW:
                "REVIEW",

            SKIP:
                "SKIP"
        };


        for (
            const action
            of actions
        ) {

            const attempt =
                buildAttempt(
                    createInput({

                        context:
                            createContext({

                                action,

                                pathStage:
                                    stageForAction[
                                    action
                                    ]
                            })
                    })
                );


            assertSchemaValid(
                attempt,
                `Action ${action}`
            );
        }
    }
);


/**
 * =========================================================
 * 29. ALL PATH STAGES
 * =========================================================
 */

test(
    "29. all canonical pathStage values validate",
    () => {

        const stages = [

            "DIAGNOSTIC",
            "LEARN",
            "PRACTICE",
            "CHALLENGE",
            "REMEDIATE",
            "MINI_PRACTICE",
            "MINI_PROBE",
            "RETEST",
            "REVIEW",
            "SKIP",
            "TRANSFER",
            "CROSS_NODE"

        ];


        for (
            const pathStage
            of stages
        ) {

            const attempt =
                buildAttempt(
                    createInput({

                        context:
                            createContext({

                                action:
                                    "PRACTICE",

                                pathStage
                            })
                    })
                );


            assertSchemaValid(
                attempt,
                `pathStage ${pathStage}`
            );
        }
    }
);


/**
 * =========================================================
 * 30. MINI PROBE IS NOT PRIMARY ACTION
 * =========================================================
 */

test(
    "30. schema confirms MINI_PROBE is pathStage not action",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    context:
                        createContext({

                            action:
                                "REMEDIATE",

                            pathStage:
                                "MINI_PROBE"
                        })
                })
            );


        assertSchemaValid(
            attempt
        );


        const invalidAttempt = {

            ...attempt,

            context: {
                ...attempt.context,

                action:
                    "MINI_PROBE"
            }
        };


        assertSchemaInvalid(
            invalidAttempt,
            "enum"
        );
    }
);


/**
 * =========================================================
 * 31. ALL LEARNING MODES
 * =========================================================
 */

test(
    "31. all canonical learning modes validate",
    () => {

        const modes = [
            "HOC_NHANH",
            "HOC_SAU",
            "ON_THI"
        ];


        for (
            const learningMode
            of modes
        ) {

            const attempt =
                buildAttempt(
                    createInput({

                        context:
                            createContext({
                                learningMode
                            })
                    })
                );


            assertSchemaValid(
                attempt,
                `learningMode ${learningMode}`
            );
        }
    }
);


/**
 * =========================================================
 * 32. OPTIONAL TIMING
 * =========================================================
 */

test(
    "32. full timing object validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    timing: {

                        timeSpentSeconds:
                            30,

                        activeTimeSeconds:
                            25,

                        pausedTimeSeconds:
                            5
                    }
                })
            );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 33. FEEDBACK
 * =========================================================
 */

test(
    "33. feedback validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    feedback: {

                        shown:
                            true,

                        type:
                            "correct"
                    }
                })
            );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 34. UI
 * =========================================================
 */

test(
    "34. UI metadata validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    ui: {

                        device:
                            "desktop",

                        inputMethod:
                            "mouse"
                    }
                })
            );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 35. METADATA
 * =========================================================
 */

test(
    "35. runtime metadata validates",
    () => {

        const attempt =
            buildAttempt(
                createInput({

                    metadata: {

                        engineVersion:
                            "study-runtime-1.0.0",

                        validatorVersion:
                            "1.0.0"
                    }
                })
            );


        assert.equal(
            attempt.metadata.questionVersion,
            "1.0.0"
        );


        assertSchemaValid(
            attempt
        );
    }
);


/**
 * =========================================================
 * 36. ROOT ADDITIONAL PROPERTIES
 * =========================================================
 */

test(
    "36. schema rejects unknown root property",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            unexpectedField:
                true
        };


        assertSchemaInvalid(
            invalidAttempt,
            "additionalProperties"
        );
    }
);


/**
 * =========================================================
 * 37. WRONG RESULT VOCABULARY
 * =========================================================
 */

test(
    "37. schema rejects evaluator vocabulary 'wrong'",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            result:
                "wrong"
        };


        assertSchemaInvalid(
            invalidAttempt,
            "enum"
        );
    }
);


/**
 * =========================================================
 * 38. SCORE RANGE
 * =========================================================
 */

test(
    "38. schema rejects score above 1",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const invalidAttempt = {

            ...attempt,

            score:
                1.1
        };


        assertSchemaInvalid(
            invalidAttempt,
            "maximum"
        );
    }
);


/**
 * =========================================================
 * 39. REQUIRED ROOT FIELD
 * =========================================================
 */

test(
    "39. schema rejects Attempt missing required context",
    () => {

        const attempt =
            buildAttempt(
                createInput()
            );


        const {
            context,
            ...invalidAttempt
        } = attempt;


        assertSchemaInvalid(
            invalidAttempt,
            "required"
        );
    }
);


/**
 * =========================================================
 * 40. COMPLETE STUDY MVP ATTEMPT
 * =========================================================
 */

test(
    "40. complete Study MVP Attempt passes canonical schema gate",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "wrong",

                correct:
                    false,

                response: {
                    value:
                        "A"
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createInput({

                    attemptId:
                        "ATTEMPT-C09-001",

                    attemptNumber:
                        2,

                    evaluation,

                    hint: {
                        used:
                            true,

                        level:
                            1,

                        count:
                            1
                    },

                    timing: {

                        timeSpentSeconds:
                            42,

                        activeTimeSeconds:
                            40,

                        pausedTimeSeconds:
                            2
                    },

                    context:
                        createContext({

                            action:
                                "REMEDIATE",

                            pathStage:
                                "MINI_PROBE",

                            secondaryNodeIds: [
                                "K282"
                            ],

                            metaSkillIds: [
                                "S008"
                            ],

                            lessonId:
                                "LESSON-C09-K283",

                            remediationId:
                                "REM-C09-001"
                        }),

                    diagnostic: {

                        failureSignatureId:
                            "FS-CALC-001",

                        failureType:
                            "calculation_error",

                        sourceNodeId:
                            "K283",

                        metaSkillId:
                            "S008",

                        confidence:
                            0.9,

                        evidence:
                            "Observed calculation error during C09 practice."
                    },

                    retry: {

                        isRetry:
                            true,

                        previousAttemptId:
                            "ATTEMPT-C09-000",

                        retryNumber:
                            1
                    },

                    feedback: {

                        shown:
                            true,

                        type:
                            "incorrect"
                    },

                    ui: {

                        device:
                            "desktop",

                        inputMethod:
                            "mouse"
                    },

                    metadata: {

                        engineVersion:
                            "study-runtime-1.0.0",

                        validatorVersion:
                            "1.0.0"
                    }
                })
            );


        assert.equal(
            attempt.result,
            "incorrect"
        );

        assert.equal(
            attempt.evidence.primaryDimension,
            "apply"
        );

        assert.equal(
            attempt.evidence.independence,
            "hint_assisted"
        );

        assert.equal(
            attempt.diagnostic.failureType,
            "calculation_error"
        );

        assert.equal(
            attempt.diagnostic.failureSignatureId,
            "FS-CALC-001"
        );


        assertSchemaValid(
            attempt,
            "Complete Study MVP Attempt"
        );
    }
);