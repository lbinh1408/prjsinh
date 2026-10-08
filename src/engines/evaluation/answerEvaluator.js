/**
 * Answer Evaluator V1.1.0
 *
 * Responsibility:
 * - Evaluate one student response against one question.
 * - Produce a small deterministic grading result.
 *
 * Study MVP support:
 * - questionType: "mcq"
 *   - answer.type: "single"
 *
 * - questionType: "numeric"
 *   - answer.type: "number"
 *
 * Does NOT:
 * - create Attempt
 * - update mastery
 * - decide next action
 * - select next question
 * - diagnose remediation
 * - mutate Question / Response
 * - persist Student State
 *
 * Source of truth for the correct answer:
 * - question.answer.value
 */

const EVALUATOR_NAME = "AnswerEvaluator";
const EVALUATOR_VERSION = "1.1.0";


const SUPPORTED_QUESTION_TYPES = new Set([
    "mcq",
    "numeric"
]);


const SUPPORTED_ANSWER_TYPES = new Set([
    "single",
    "number"
]);


const RESULT_TYPES = new Set([
    "correct",
    "partial",
    "wrong",
    "skipped"
]);


/**
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

/**
 * Evaluate one student response.
 *
 * @param {Object} params
 * @param {Object} params.question
 * @param {*} params.response
 *
 * Accepted MCQ response forms:
 *
 * "B"
 *
 * { value: "B" }
 *
 * { optionId: "B" }
 *
 * { selectedOptionId: "B" }
 *
 *
 * Accepted numeric response forms:
 *
 * 20
 *
 * "20"
 *
 * { value: 20 }
 *
 * { value: "20" }
 *
 *
 * null / undefined / ""
 * -> skipped
 *
 * @returns {{
 *   evaluator: {
 *     name: string,
 *     version: string
 *   },
 *   questionId: string,
 *   questionType: string,
 *   answerType: string,
 *   result: "correct"|"partial"|"wrong"|"skipped",
 *   correct: boolean,
 *   response: {
 *     value: *
 *   },
 *   score: {
 *     earned: number,
 *     max: number,
 *     normalized: number
 *   }
 * }}
 */
export function evaluateAnswer({
    question,
    response
} = {}) {

    assertQuestion(question);


    const questionType =
        question.questionType;


    const answerType =
        question.answer.type;


    if (
        !SUPPORTED_QUESTION_TYPES.has(
            questionType
        )
    ) {

        throw new Error(
            `Unsupported questionType '${questionType}'. ` +
            `AnswerEvaluator V1.1.0 supports: ` +
            `${[...SUPPORTED_QUESTION_TYPES].join(", ")}.`
        );
    }


    if (
        !SUPPORTED_ANSWER_TYPES.has(
            answerType
        )
    ) {

        throw new Error(
            `Unsupported answer.type '${answerType}'. ` +
            `AnswerEvaluator V1.1.0 supports: ` +
            `${[...SUPPORTED_ANSWER_TYPES].join(", ")}.`
        );
    }


    /**
     * Explicit questionType + answer.type dispatch.
     *
     * Do not allow arbitrary combinations merely because
     * both values are individually supported.
     */
    if (
        questionType === "mcq" &&
        answerType === "single"
    ) {

        return evaluateSingleMcq({
            question,
            response
        });
    }


    if (
        questionType === "numeric" &&
        answerType === "number"
    ) {

        return evaluateNumeric({
            question,
            response
        });
    }


    throw new Error(
        `Unsupported evaluator combination ` +
        `'${questionType}' + '${answerType}'.`
    );
}


/**
 * =========================================================
 * SINGLE-ANSWER MCQ
 * =========================================================
 */

function evaluateSingleMcq({
    question,
    response
}) {

    const normalizedResponse =
        normalizeSingleResponse(response);


    const maxScore =
        resolveMaxScore(question);


    /**
     * ---------------------------------------------
     * SKIPPED
     * ---------------------------------------------
     */

    if (normalizedResponse.skipped) {

        return buildEvaluation({
            question,
            result: "skipped",
            correct: false,
            responseValue: null,
            earnedScore: 0,
            maxScore
        });
    }


    const responseValue =
        normalizedResponse.value;


    /**
     * Make sure the submitted option actually exists.
     *
     * This prevents values such as:
     *
     * "Z"
     * "hello"
     *
     * etc. from silently becoming ordinary wrong answers.
     */

    assertValidOptionResponse(
        question,
        responseValue
    );


    const correctValue =
        question.answer.value;


    const isCorrect =
        responseValue === correctValue;


    /**
     * Single-answer MCQ has no partial result.
     *
     * Even if scoring.partialCredit exists in the
     * Question Contract, partial grading is not
     * meaningful for a single-choice MCQ.
     */

    if (isCorrect) {

        return buildEvaluation({
            question,
            result: "correct",
            correct: true,
            responseValue,
            earnedScore: maxScore,
            maxScore
        });
    }


    return buildEvaluation({
        question,
        result: "wrong",
        correct: false,
        responseValue,
        earnedScore: 0,
        maxScore
    });
}


/**
 * =========================================================
 * NUMERIC
 * =========================================================
 */

/**
 * Evaluate:
 *
 * questionType = "numeric"
 * answer.type   = "number"
 *
 * Canonical answer example:
 *
 * {
 *   "type": "number",
 *   "value": 20,
 *   "tolerance": 0.5,
 *   "unit": "%"
 * }
 *
 * tolerance is absolute:
 *
 * expected = 20
 * tolerance = 0.5
 *
 * accepted:
 * 19.5 <= response <= 20.5
 *
 * Unit is metadata for V1.1.
 *
 * The evaluator does NOT parse units from strings such as:
 *
 * "20%"
 *
 * That would mix numeric parsing with unit parsing.
 */
function evaluateNumeric({
    question,
    response
}) {

    const normalizedResponse =
        normalizeNumericResponse(response);


    const maxScore =
        resolveMaxScore(question);


    /**
     * ---------------------------------------------
     * SKIPPED
     * ---------------------------------------------
     */

    if (normalizedResponse.skipped) {

        return buildEvaluation({
            question,
            result: "skipped",
            correct: false,
            responseValue: null,
            earnedScore: 0,
            maxScore
        });
    }


    const responseValue =
        normalizedResponse.value;


    const correctValue =
        question.answer.value;


    const tolerance =
        resolveNumericTolerance(question);


    const difference =
        Math.abs(
            responseValue -
            correctValue
        );


    const isCorrect =
        difference <= tolerance;


    /**
     * Numeric V1.1 uses binary grading.
     *
     * No partial credit is inferred merely from
     * being numerically close to the answer.
     */

    if (isCorrect) {

        return buildEvaluation({
            question,
            result: "correct",
            correct: true,
            responseValue,
            earnedScore: maxScore,
            maxScore
        });
    }


    return buildEvaluation({
        question,
        result: "wrong",
        correct: false,
        responseValue,
        earnedScore: 0,
        maxScore
    });
}


/**
 * =========================================================
 * RESPONSE NORMALIZATION — SINGLE MCQ
 * =========================================================
 */

/**
 * Convert accepted response forms into:
 *
 * {
 *   skipped: boolean,
 *   value: string|null
 * }
 */
function normalizeSingleResponse(
    response
) {

    /**
     * null / undefined
     */

    if (
        response === null ||
        response === undefined
    ) {

        return {
            skipped: true,
            value: null
        };
    }


    /**
     * Direct string:
     *
     * "B"
     */

    if (
        typeof response === "string"
    ) {

        const value =
            response.trim();


        if (!value) {

            return {
                skipped: true,
                value: null
            };
        }


        return {
            skipped: false,
            value
        };
    }


    /**
     * Object forms:
     *
     * { value: "B" }
     * { optionId: "B" }
     * { selectedOptionId: "B" }
     */

    if (
        typeof response === "object" &&
        !Array.isArray(response)
    ) {

        const rawValue =
            response.value ??
            response.optionId ??
            response.selectedOptionId ??
            null;


        if (
            rawValue === null ||
            rawValue === undefined
        ) {

            return {
                skipped: true,
                value: null
            };
        }


        if (
            typeof rawValue !== "string"
        ) {

            throw new TypeError(
                "Single-answer MCQ response value must be a string."
            );
        }


        const value =
            rawValue.trim();


        if (!value) {

            return {
                skipped: true,
                value: null
            };
        }


        return {
            skipped: false,
            value
        };
    }


    throw new TypeError(
        "Unsupported response format for single-answer MCQ."
    );
}


/**
 * =========================================================
 * RESPONSE NORMALIZATION — NUMERIC
 * =========================================================
 */

/**
 * Convert accepted numeric response forms into:
 *
 * {
 *   skipped: boolean,
 *   value: number|null
 * }
 *
 * Accepted:
 *
 * 20
 * "20"
 * { value: 20 }
 * { value: "20" }
 *
 * Not accepted:
 *
 * "20%"
 * "abc"
 * Infinity
 * NaN
 * []
 */
function normalizeNumericResponse(
    response
) {

    /**
     * null / undefined
     */

    if (
        response === null ||
        response === undefined
    ) {

        return {
            skipped: true,
            value: null
        };
    }


    /**
     * Direct number.
     */

    if (
        typeof response === "number"
    ) {

        if (!Number.isFinite(response)) {

            throw new TypeError(
                "Numeric response must be a finite number."
            );
        }


        return {
            skipped: false,
            value: response
        };
    }


    /**
     * Direct string.
     */

    if (
        typeof response === "string"
    ) {

        const value =
            response.trim();


        if (!value) {

            return {
                skipped: true,
                value: null
            };
        }


        const parsed =
            parseStrictNumber(value);


        return {
            skipped: false,
            value: parsed
        };
    }


    /**
     * Object:
     *
     * { value: 20 }
     * { value: "20" }
     */

    if (
        typeof response === "object" &&
        !Array.isArray(response)
    ) {

        const rawValue =
            response.value;


        if (
            rawValue === null ||
            rawValue === undefined
        ) {

            return {
                skipped: true,
                value: null
            };
        }


        if (
            typeof rawValue === "number"
        ) {

            if (!Number.isFinite(rawValue)) {

                throw new TypeError(
                    "Numeric response must be a finite number."
                );
            }


            return {
                skipped: false,
                value: rawValue
            };
        }


        if (
            typeof rawValue === "string"
        ) {

            const value =
                rawValue.trim();


            if (!value) {

                return {
                    skipped: true,
                    value: null
                };
            }


            return {
                skipped: false,
                value:
                    parseStrictNumber(value)
            };
        }


        throw new TypeError(
            "Numeric response value must be a number or numeric string."
        );
    }


    throw new TypeError(
        "Unsupported response format for numeric question."
    );
}


/**
 * Strict numeric parser.
 *
 * Number("20abc") -> NaN
 *
 * Number("20%")   -> NaN
 *
 * Number("  ") would normally become 0,
 * but empty strings are handled before this function.
 */
function parseStrictNumber(value) {

    const parsed =
        Number(value);


    if (!Number.isFinite(parsed)) {

        throw new TypeError(
            `Numeric response '${value}' is not a valid finite number.`
        );
    }


    return parsed;
}


/**
 * =========================================================
 * OPTION VALIDATION
 * =========================================================
 */

function assertValidOptionResponse(
    question,
    responseValue
) {

    const options =
        question.content?.options;


    if (!Array.isArray(options)) {

        throw new Error(
            `Question '${question.id}' does not contain content.options.`
        );
    }


    const optionExists =
        options.some(
            (option) =>
                option?.id ===
                responseValue
        );


    if (!optionExists) {

        throw new Error(
            `Response option '${responseValue}' does not exist ` +
            `in question '${question.id}'.`
        );
    }
}


/**
 * =========================================================
 * NUMERIC ANSWER CONFIG
 * =========================================================
 */

function resolveNumericTolerance(
    question
) {

    const tolerance =
        question.answer?.tolerance ??
        0;


    if (
        typeof tolerance !== "number" ||
        !Number.isFinite(tolerance) ||
        tolerance < 0
    ) {

        throw new Error(
            `Question '${question.id}' has invalid answer.tolerance.`
        );
    }


    return tolerance;
}


/**
 * =========================================================
 * SCORE
 * =========================================================
 */

function resolveMaxScore(question) {

    const maxScore =
        question.scoring?.maxScore;


    if (
        typeof maxScore !== "number" ||
        !Number.isFinite(maxScore) ||
        maxScore < 0
    ) {

        throw new Error(
            `Question '${question.id}' has invalid scoring.maxScore.`
        );
    }


    return maxScore;
}


function normalizeScore(
    earned,
    max
) {

    if (max === 0) {
        return 0;
    }


    return clamp01(
        earned / max
    );
}


/**
 * =========================================================
 * RESULT BUILDER
 * =========================================================
 */

function buildEvaluation({
    question,
    result,
    correct,
    responseValue,
    earnedScore,
    maxScore
}) {

    if (
        !RESULT_TYPES.has(result)
    ) {

        throw new Error(
            `Invalid evaluation result '${result}'.`
        );
    }


    return {

        evaluator: {
            name:
                EVALUATOR_NAME,

            version:
                EVALUATOR_VERSION
        },

        questionId:
            question.id,

        questionType:
            question.questionType,

        answerType:
            question.answer.type,

        result,

        correct,

        response: {
            value:
                responseValue
        },

        score: {
            earned:
                earnedScore,

            max:
                maxScore,

            normalized:
                normalizeScore(
                    earnedScore,
                    maxScore
                )
        }
    };
}


/**
 * =========================================================
 * QUESTION GUARD
 * =========================================================
 *
 * QuestionValidator remains the canonical validator.
 *
 * These checks only protect the evaluator from receiving
 * an obviously unusable object at runtime.
 */

function assertQuestion(question) {

    if (
        !question ||
        typeof question !== "object" ||
        Array.isArray(question)
    ) {

        throw new TypeError(
            "evaluateAnswer requires a question object."
        );
    }


    if (
        typeof question.id !== "string" ||
        !question.id.trim()
    ) {

        throw new Error(
            "Question is missing a valid id."
        );
    }


    if (
        typeof question.questionType !== "string" ||
        !question.questionType.trim()
    ) {

        throw new Error(
            `Question '${question.id}' is missing questionType.`
        );
    }


    if (
        !question.answer ||
        typeof question.answer !== "object" ||
        Array.isArray(question.answer)
    ) {

        throw new Error(
            `Question '${question.id}' is missing answer.`
        );
    }


    if (
        typeof question.answer.type !== "string" ||
        !question.answer.type.trim()
    ) {

        throw new Error(
            `Question '${question.id}' has invalid answer.type.`
        );
    }


    if (
        question.answer.value === undefined ||
        question.answer.value === null
    ) {

        throw new Error(
            `Question '${question.id}' is missing answer.value.`
        );
    }


    /**
     * MCQ single-answer guard.
     *
     * Do NOT lowercase or otherwise normalize the answer.
     *
     * This is intentional because case can be scientifically
     * meaningful in Biology/genetics data.
     */

    if (
        question.answer.type === "single" &&
        typeof question.answer.value !== "string"
    ) {

        throw new Error(
            `Question '${question.id}' single answer.value must be a string.`
        );
    }


    /**
     * Numeric answer guard.
     */

    if (
        question.answer.type === "number"
    ) {

        if (
            typeof question.answer.value !== "number" ||
            !Number.isFinite(
                question.answer.value
            )
        ) {

            throw new Error(
                `Question '${question.id}' numeric answer.value must be a finite number.`
            );
        }


        /**
         * tolerance is optional.
         *
         * If omitted:
         *
         * tolerance = 0
         */

        if (
            question.answer.tolerance !== undefined &&
            (
                typeof question.answer.tolerance !== "number" ||
                !Number.isFinite(
                    question.answer.tolerance
                ) ||
                question.answer.tolerance < 0
            )
        ) {

            throw new Error(
                `Question '${question.id}' numeric answer.tolerance must be a non-negative finite number.`
            );
        }


        /**
         * unit is optional metadata.
         */

        if (
            question.answer.unit !== undefined &&
            typeof question.answer.unit !== "string"
        ) {

            throw new Error(
                `Question '${question.id}' numeric answer.unit must be a string when provided.`
            );
        }
    }
}


/**
 * =========================================================
 * UTILITY
 * =========================================================
 */

function clamp01(value) {

    if (!Number.isFinite(value)) {
        return 0;
    }


    return Math.max(
        0,
        Math.min(
            1,
            value
        )
    );
}


/**
 * =========================================================
 * OPTIONAL METADATA EXPORT
 * =========================================================
 */

export const ANSWER_EVALUATOR_INFO =
    Object.freeze({

        name:
            EVALUATOR_NAME,

        version:
            EVALUATOR_VERSION,

        supportedQuestionTypes:
            Object.freeze([
                ...SUPPORTED_QUESTION_TYPES
            ]),

        supportedAnswerTypes:
            Object.freeze([
                ...SUPPORTED_ANSWER_TYPES
            ])
    });


export default evaluateAnswer;