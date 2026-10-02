/**
 * Answer Evaluator V1.0.0
 *
 * Responsibility:
 * - Evaluate one student response against one question.
 * - Produce a small deterministic grading result.
 *
 * Study MVP support:
 * - questionType: "mcq"
 * - answer.type: "single"
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
const EVALUATOR_VERSION = "1.0.0";

const SUPPORTED_QUESTION_TYPES = new Set([
    "mcq"
]);

const SUPPORTED_ANSWER_TYPES = new Set([
    "single"
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
 * null / undefined / "" -> skipped
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
            `AnswerEvaluator V1.0.0 supports: ` +
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
            `AnswerEvaluator V1.0.0 supports: ` +
            `${[...SUPPORTED_ANSWER_TYPES].join(", ")}.`
        );
    }

    return evaluateSingleMcq({
        question,
        response
    });
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
     * "Z"
     * "hello"
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
     * V1 single-answer MCQ has no partial result.
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
 * RESPONSE NORMALIZATION
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
        typeof question.answer !== "object"
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
     * V1 single-answer contract.
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
        Math.min(1, value)
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