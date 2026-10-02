/**
 * attemptBuilder.js
 *
 * Attempt Builder V1.0.1
 *
 * Responsibility:
 * - Convert Question + AnswerEvaluation + interaction/session metadata
 *   into one canonical Attempt Contract object.
 *
 * Source of truth:
 * - attempt.schema.json V1.0.0
 *
 * Does NOT:
 * - evaluate answers
 * - calculate mastery
 * - decide adaptive action
 * - diagnose failure automatically
 * - select questions
 * - mutate inputs
 * - persist anything
 *
 * Study MVP:
 * - Supports current single-answer MCQ flow.
 * - Output conforms to attempt.schema.json V1.0.0.
 */

const BUILDER_NAME = "AttemptBuilder";
const BUILDER_VERSION = "1.0.1";
const SCHEMA_VERSION = "1.0.0";


const VALID_RESULTS = new Set([
    "correct",
    "incorrect",
    "partial",
    "skipped"
]);


const VALID_ACTIONS = new Set([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);


const VALID_PATH_STAGES = new Set([
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
]);


const VALID_LEARNING_MODES = new Set([
    "HOC_NHANH",
    "HOC_SAU",
    "ON_THI"
]);


const VALID_EVIDENCE_DIMENSIONS = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);


const VALID_FAILURE_TYPES = new Set([
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
]);


/**
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

/**
 * Build one canonical Attempt.
 *
 * Required:
 *
 * buildAttempt({
 *   attemptId,
 *   studentId,
 *   sessionId,
 *   question,
 *   evaluation,
 *   startedAt,
 *   submittedAt,
 *   context: {
 *      learningMode,
 *      action,
 *      pathStage
 *   }
 * })
 *
 * Optional:
 *
 * attemptNumber
 * hint
 * timing
 * diagnostic
 * retry
 * feedback
 * ui
 * metadata
 *
 * @returns {Object} Attempt Contract V1.0.0
 */
export function buildAttempt({
    attemptId,
    studentId,
    sessionId,

    question,
    evaluation,

    startedAt,
    submittedAt,

    attemptNumber = 1,

    hint = null,
    timing = null,
    context = null,

    diagnostic = null,
    retry = null,

    feedback = null,
    ui = null,
    metadata = null
} = {}) {

    /**
     * -----------------------------------------------------
     * Runtime guards
     * -----------------------------------------------------
     */

    assertNonEmptyString(
        attemptId,
        "attemptId"
    );

    assertNonEmptyString(
        studentId,
        "studentId"
    );

    assertNonEmptyString(
        sessionId,
        "sessionId"
    );

    assertQuestion(
        question
    );

    assertEvaluation(
        evaluation,
        question
    );

    assertDateTime(
        startedAt,
        "startedAt"
    );

    assertDateTime(
        submittedAt,
        "submittedAt"
    );

    assertChronology(
        startedAt,
        submittedAt
    );

    assertPositiveInteger(
        attemptNumber,
        "attemptNumber"
    );


    /**
     * -----------------------------------------------------
     * Build required contract sections
     * -----------------------------------------------------
     */

    const attempt = {

        schemaVersion:
            SCHEMA_VERSION,

        attemptId:
            attemptId.trim(),

        studentId:
            studentId.trim(),

        sessionId:
            sessionId.trim(),

        questionId:
            question.id,

        startedAt:
            normalizeDateTime(
                startedAt
            ),

        submittedAt:
            normalizeDateTime(
                submittedAt
            ),

        response:
            buildResponse({
                question,
                evaluation
            }),

        result:
            mapEvaluationResult(
                evaluation.result
            ),

        /**
         * Attempt Contract stores normalized score only.
         *
         * 0 <= score <= 1
         */
        score:
            normalizeScore(
                evaluation
                    ?.score
                    ?.normalized
            ),

        attemptNumber,

        hint:
            buildHint(
                hint
            ),

        timing:
            buildTiming({
                timing,
                startedAt,
                submittedAt
            }),

        context:
            buildContext({
                context,
                question
            })
    };


    /**
     * -----------------------------------------------------
     * Optional diagnostic
     * -----------------------------------------------------
     *
     * AttemptBuilder only records diagnostic information
     * supplied by another layer.
     *
     * It does NOT infer failureType or failureSignatureId.
     */

    const builtDiagnostic =
        buildDiagnostic(
            diagnostic
        );

    if (builtDiagnostic) {
        attempt.diagnostic =
            builtDiagnostic;
    }


    /**
     * -----------------------------------------------------
     * Optional retry
     * -----------------------------------------------------
     */

    const builtRetry =
        buildRetry({
            retry,
            attemptNumber
        });

    if (builtRetry) {
        attempt.retry =
            builtRetry;
    }


    /**
     * -----------------------------------------------------
     * Evidence
     * -----------------------------------------------------
     *
     * attempt.schema.json V1.0.0 owns:
     *
     * {
     *   difficulty,
     *   primaryDimension,
     *   evidenceStrength?,
     *   independence?
     * }
     *
     * IMPORTANT:
     * There is NO evidence.questionType in Attempt Contract.
     */

    attempt.evidence =
        buildEvidence({
            question,
            hint: attempt.hint,
            attemptNumber
        });


    /**
     * -----------------------------------------------------
     * Optional feedback
     * -----------------------------------------------------
     */

    const builtFeedback =
        buildFeedback(
            feedback
        );

    if (builtFeedback) {
        attempt.feedback =
            builtFeedback;
    }


    /**
     * -----------------------------------------------------
     * Optional UI
     * -----------------------------------------------------
     */

    const builtUi =
        buildUi(
            ui
        );

    if (builtUi) {
        attempt.ui =
            builtUi;
    }


    /**
     * -----------------------------------------------------
     * Optional metadata
     * -----------------------------------------------------
     */

    const builtMetadata =
        buildMetadata({
            metadata,
            question
        });

    if (builtMetadata) {
        attempt.metadata =
            builtMetadata;
    }


    return attempt;
}


/**
 * =========================================================
 * RESPONSE
 * =========================================================
 */

function buildResponse({
    question,
    evaluation
}) {

    /**
     * Study MVP V1 supports:
     *
     * questionType = mcq
     * answer.type   = single
     */

    if (
        question.questionType !== "mcq" ||
        question.answer?.type !== "single"
    ) {
        throw new Error(
            `AttemptBuilder V1.0.1 does not support ` +
            `question '${question.id}' with ` +
            `questionType='${question.questionType}' ` +
            `and answer.type='${question.answer?.type}'.`
        );
    }


    const value =
        evaluation
            ?.response
            ?.value ?? null;


    return {

        type:
            "singleChoice",

        value,

        normalizedValue:
            value
    };
}


/**
 * =========================================================
 * RESULT
 * =========================================================
 *
 * AnswerEvaluator vocabulary:
 *
 * correct
 * wrong
 * partial
 * skipped
 *
 * Attempt Contract vocabulary:
 *
 * correct
 * incorrect
 * partial
 * skipped
 */

function mapEvaluationResult(
    result
) {

    const mapped = {

        correct:
            "correct",

        wrong:
            "incorrect",

        partial:
            "partial",

        skipped:
            "skipped"

    }[result];


    if (
        !mapped ||
        !VALID_RESULTS.has(mapped)
    ) {
        throw new Error(
            `Unsupported evaluation result '${result}'.`
        );
    }


    return mapped;
}


/**
 * =========================================================
 * SCORE
 * =========================================================
 */

function normalizeScore(
    score
) {

    if (
        typeof score !== "number" ||
        !Number.isFinite(score)
    ) {
        throw new Error(
            "evaluation.score.normalized must be a finite number."
        );
    }


    if (
        score < 0 ||
        score > 1
    ) {
        throw new Error(
            "evaluation.score.normalized must be between 0 and 1."
        );
    }


    return score;
}


/**
 * =========================================================
 * HINT
 * =========================================================
 *
 * Attempt Contract:
 *
 * used  : boolean
 * level : 1..2
 * count : 0..2
 */

function buildHint(
    hint
) {

    /**
     * Default:
     * independent answer with no hint.
     */

    if (
        hint === null ||
        hint === undefined
    ) {
        return {
            used: false,
            count: 0
        };
    }


    if (
        typeof hint !== "object" ||
        Array.isArray(hint)
    ) {
        throw new TypeError(
            "hint must be an object."
        );
    }


    const used =
        hint.used === true;


    const count =
        Number.isInteger(
            hint.count
        )
            ? hint.count
            : used
                ? 1
                : 0;


    if (
        count < 0 ||
        count > 2
    ) {
        throw new Error(
            "hint.count must be between 0 and 2."
        );
    }


    /**
     * Semantic consistency:
     *
     * used=false cannot carry positive hint count.
     */
    if (
        used === false &&
        count > 0
    ) {
        throw new Error(
            "hint.used=false requires hint.count=0."
        );
    }


    const result = {
        used,
        count
    };


    if (
        hint.level !== undefined &&
        hint.level !== null
    ) {

        if (
            !Number.isInteger(
                hint.level
            ) ||
            hint.level < 1 ||
            hint.level > 2
        ) {
            throw new Error(
                "hint.level must be an integer from 1 to 2."
            );
        }


        /**
         * A hint level only makes sense if a hint
         * was actually used.
         */
        if (!used) {
            throw new Error(
                "hint.level requires hint.used=true."
            );
        }


        result.level =
            hint.level;
    }


    return result;
}


/**
 * =========================================================
 * TIMING
 * =========================================================
 */

function buildTiming({
    timing,
    startedAt,
    submittedAt
}) {

    /**
     * If timing is not explicitly supplied,
     * derive wall-clock duration from timestamps.
     */

    if (
        timing === null ||
        timing === undefined
    ) {

        const milliseconds =
            Date.parse(submittedAt) -
            Date.parse(startedAt);


        return {
            timeSpentSeconds:
                Math.max(
                    0,
                    Math.floor(
                        milliseconds / 1000
                    )
                )
        };
    }


    if (
        typeof timing !== "object" ||
        Array.isArray(timing)
    ) {
        throw new TypeError(
            "timing must be an object."
        );
    }


    assertNonNegativeInteger(
        timing.timeSpentSeconds,
        "timing.timeSpentSeconds"
    );


    const result = {

        timeSpentSeconds:
            timing.timeSpentSeconds
    };


    if (
        timing.activeTimeSeconds !==
        undefined
    ) {

        assertNonNegativeInteger(
            timing.activeTimeSeconds,
            "timing.activeTimeSeconds"
        );

        result.activeTimeSeconds =
            timing.activeTimeSeconds;
    }


    if (
        timing.pausedTimeSeconds !==
        undefined
    ) {

        assertNonNegativeInteger(
            timing.pausedTimeSeconds,
            "timing.pausedTimeSeconds"
        );

        result.pausedTimeSeconds =
            timing.pausedTimeSeconds;
    }


    return result;
}


/**
 * =========================================================
 * CONTEXT
 * =========================================================
 */

function buildContext({
    context,
    question
}) {

    if (
        !context ||
        typeof context !== "object" ||
        Array.isArray(context)
    ) {
        throw new TypeError(
            "context must be an object."
        );
    }


    const learningMode =
        context.learningMode;

    const action =
        context.action;

    const pathStage =
        context.pathStage;


    if (
        !VALID_LEARNING_MODES.has(
            learningMode
        )
    ) {
        throw new Error(
            `Invalid learningMode '${learningMode}'.`
        );
    }


    if (
        !VALID_ACTIONS.has(
            action
        )
    ) {
        throw new Error(
            `Invalid action '${action}'.`
        );
    }


    if (
        !VALID_PATH_STAGES.has(
            pathStage
        )
    ) {
        throw new Error(
            `Invalid pathStage '${pathStage}'.`
        );
    }


    /**
     * Question Contract is source of truth
     * for the primary directly measured node.
     */

    const result = {

        learningMode,
        action,
        pathStage,

        nodeId:
            question.primaryNode
    };


    /**
     * Context may explicitly override secondary/meta IDs.
     *
     * Otherwise project from Question metadata.
     */

    const secondaryNodeIds =
        uniqueStrings(
            context.secondaryNodeIds ??
            question.secondaryNodes
        );


    if (
        secondaryNodeIds.length > 0
    ) {
        result.secondaryNodeIds =
            secondaryNodeIds;
    }


    const metaSkillIds =
        uniqueStrings(
            context.metaSkillIds ??
            question.skills
        );


    if (
        metaSkillIds.length > 0
    ) {
        result.metaSkillIds =
            metaSkillIds;
    }


    copyOptionalString(
        result,
        context,
        "clusterId"
    );

    copyOptionalString(
        result,
        context,
        "lessonId"
    );

    copyOptionalString(
        result,
        context,
        "remediationId"
    );

    copyOptionalString(
        result,
        context,
        "decisionId"
    );


    return result;
}


/**
 * =========================================================
 * EVIDENCE
 * =========================================================
 *
 * Canonical Attempt Contract:
 *
 * {
 *   difficulty,
 *   primaryDimension,
 *   evidenceStrength?,
 *   independence?
 * }
 *
 * NOTE:
 * - No questionType field here.
 * - Question Contract already owns questionType.
 * - primaryDimension is sufficient for Mastery evidence.
 */

function buildEvidence({
    question,
    hint,
    attemptNumber
}) {

    const dimension =
        question.evidence;


    if (
        !VALID_EVIDENCE_DIMENSIONS.has(
            dimension
        )
    ) {
        throw new Error(
            `Invalid question evidence '${dimension}'.`
        );
    }


    const difficulty =
        question.difficulty;


    if (
        !/^D[1-5]$/.test(
            difficulty ?? ""
        )
    ) {
        throw new Error(
            `Invalid question difficulty '${difficulty}'.`
        );
    }


    return {

        difficulty,

        primaryDimension:
            dimension,

        independence:
            resolveIndependence({
                hint,
                attemptNumber
            })
    };
}


/**
 * =========================================================
 * INDEPENDENCE
 * =========================================================
 */

function resolveIndependence({
    hint,
    attemptNumber
}) {

    /**
     * Hint has precedence over retry.
     *
     * Example:
     *
     * attemptNumber = 2
     * hint.used = true
     *
     * => hint_assisted
     */

    if (
        hint?.used === true ||
        (
            Number.isInteger(
                hint?.count
            ) &&
            hint.count > 0
        )
    ) {
        return "hint_assisted";
    }


    if (
        attemptNumber > 1
    ) {
        return "retry_assisted";
    }


    return "independent";
}


/**
 * =========================================================
 * DIAGNOSTIC
 * =========================================================
 *
 * Attempt Contract distinguishes:
 *
 * failureSignatureId
 *   = reference to canonical failure signature registry
 *
 * failureType
 *   = canonical failure taxonomy
 *
 * AttemptBuilder NEVER diagnoses.
 * It only records values supplied by another layer.
 */

function buildDiagnostic(
    diagnostic
) {

    if (
        diagnostic === null ||
        diagnostic === undefined
    ) {
        return null;
    }


    if (
        typeof diagnostic !== "object" ||
        Array.isArray(diagnostic)
    ) {
        throw new TypeError(
            "diagnostic must be an object."
        );
    }


    const result = {};


    /**
     * Canonical failure signature reference.
     */

    if (
        diagnostic.failureSignatureId !==
        undefined
    ) {

        assertNonEmptyString(
            diagnostic.failureSignatureId,
            "diagnostic.failureSignatureId"
        );


        result.failureSignatureId =
            diagnostic
                .failureSignatureId
                .trim();
    }


    /**
     * Canonical failure taxonomy.
     */

    if (
        diagnostic.failureType !==
        undefined
    ) {

        if (
            !VALID_FAILURE_TYPES.has(
                diagnostic.failureType
            )
        ) {
            throw new Error(
                `Invalid failureType '${diagnostic.failureType}'.`
            );
        }


        result.failureType =
            diagnostic.failureType;
    }


    copyOptionalString(
        result,
        diagnostic,
        "sourceNodeId"
    );

    copyOptionalString(
        result,
        diagnostic,
        "metaSkillId"
    );


    if (
        diagnostic.confidence !==
        undefined
    ) {

        if (
            typeof diagnostic.confidence !==
            "number" ||
            !Number.isFinite(
                diagnostic.confidence
            ) ||
            diagnostic.confidence < 0 ||
            diagnostic.confidence > 1
        ) {
            throw new Error(
                "diagnostic.confidence must be between 0 and 1."
            );
        }


        result.confidence =
            diagnostic.confidence;
    }


    copyOptionalString(
        result,
        diagnostic,
        "evidence"
    );


    return Object.keys(result).length > 0
        ? result
        : null;
}


/**
 * =========================================================
 * RETRY
 * =========================================================
 */

function buildRetry({
    retry,
    attemptNumber
}) {

    if (
        retry === null ||
        retry === undefined
    ) {
        return null;
    }


    if (
        typeof retry !== "object" ||
        Array.isArray(retry)
    ) {
        throw new TypeError(
            "retry must be an object."
        );
    }


    const isRetry =
        retry.isRetry === true;


    const result = {
        isRetry
    };


    if (
        retry.previousAttemptId !==
        undefined
    ) {

        assertNonEmptyString(
            retry.previousAttemptId,
            "retry.previousAttemptId"
        );


        result.previousAttemptId =
            retry
                .previousAttemptId
                .trim();
    }


    if (
        retry.retryNumber !==
        undefined
    ) {

        if (
            !Number.isInteger(
                retry.retryNumber
            ) ||
            retry.retryNumber < 1 ||
            retry.retryNumber > 2
        ) {
            throw new Error(
                "retry.retryNumber must be an integer from 1 to 2."
            );
        }


        result.retryNumber =
            retry.retryNumber;
    }


    /**
     * Runtime semantic consistency.
     */

    if (
        isRetry === true &&
        attemptNumber <= 1
    ) {
        throw new Error(
            "retry.isRetry=true requires attemptNumber > 1."
        );
    }


    return result;
}


/**
 * =========================================================
 * FEEDBACK
 * =========================================================
 */

function buildFeedback(
    feedback
) {

    if (
        feedback === null ||
        feedback === undefined
    ) {
        return null;
    }


    if (
        typeof feedback !== "object" ||
        Array.isArray(feedback)
    ) {
        throw new TypeError(
            "feedback must be an object."
        );
    }


    const result = {};


    if (
        feedback.shown !==
        undefined
    ) {

        if (
            typeof feedback.shown !==
            "boolean"
        ) {
            throw new Error(
                "feedback.shown must be boolean."
            );
        }


        result.shown =
            feedback.shown;
    }


    if (
        feedback.type !==
        undefined
    ) {

        const allowed =
            new Set([
                "correct",
                "incorrect",
                "partial",
                "hint",
                "none"
            ]);


        if (
            !allowed.has(
                feedback.type
            )
        ) {
            throw new Error(
                `Invalid feedback.type '${feedback.type}'.`
            );
        }


        result.type =
            feedback.type;
    }


    return Object.keys(result).length > 0
        ? result
        : null;
}


/**
 * =========================================================
 * UI
 * =========================================================
 */

function buildUi(
    ui
) {

    if (
        ui === null ||
        ui === undefined
    ) {
        return null;
    }


    if (
        typeof ui !== "object" ||
        Array.isArray(ui)
    ) {
        throw new TypeError(
            "ui must be an object."
        );
    }


    const result = {};


    if (
        ui.device !==
        undefined
    ) {

        const allowedDevices =
            new Set([
                "desktop",
                "tablet",
                "mobile"
            ]);


        if (
            !allowedDevices.has(
                ui.device
            )
        ) {
            throw new Error(
                `Invalid ui.device '${ui.device}'.`
            );
        }


        result.device =
            ui.device;
    }


    if (
        ui.inputMethod !==
        undefined
    ) {

        const allowedMethods =
            new Set([
                "mouse",
                "keyboard",
                "touch",
                "mixed"
            ]);


        if (
            !allowedMethods.has(
                ui.inputMethod
            )
        ) {
            throw new Error(
                `Invalid ui.inputMethod '${ui.inputMethod}'.`
            );
        }


        result.inputMethod =
            ui.inputMethod;
    }


    return Object.keys(result).length > 0
        ? result
        : null;
}


/**
 * =========================================================
 * METADATA
 * =========================================================
 */

function buildMetadata({
    metadata,
    question
}) {

    const result = {};


    /**
     * Question version is known by Builder,
     * so it may safely be projected.
     */

    if (
        typeof question.version ===
        "string" &&
        question.version.trim()
    ) {
        result.questionVersion =
            question.version.trim();
    }


    if (
        metadata !== null &&
        metadata !== undefined
    ) {

        if (
            typeof metadata !== "object" ||
            Array.isArray(metadata)
        ) {
            throw new TypeError(
                "metadata must be an object."
            );
        }


        copyOptionalString(
            result,
            metadata,
            "engineVersion"
        );

        copyOptionalString(
            result,
            metadata,
            "validatorVersion"
        );
    }


    return Object.keys(result).length > 0
        ? result
        : null;
}


/**
 * =========================================================
 * QUESTION GUARD
 * =========================================================
 */

function assertQuestion(
    question
) {

    if (
        !question ||
        typeof question !== "object" ||
        Array.isArray(question)
    ) {
        throw new TypeError(
            "question must be an object."
        );
    }


    assertNonEmptyString(
        question.id,
        "question.id"
    );

    assertNonEmptyString(
        question.primaryNode,
        "question.primaryNode"
    );

    assertNonEmptyString(
        question.questionType,
        "question.questionType"
    );

    assertNonEmptyString(
        question.difficulty,
        "question.difficulty"
    );

    assertNonEmptyString(
        question.evidence,
        "question.evidence"
    );
}


/**
 * =========================================================
 * EVALUATION GUARD
 * =========================================================
 */

function assertEvaluation(
    evaluation,
    question
) {

    if (
        !evaluation ||
        typeof evaluation !== "object" ||
        Array.isArray(evaluation)
    ) {
        throw new TypeError(
            "evaluation must be an object."
        );
    }


    /**
     * Prevent evaluation of Question A
     * from being attached to Question B.
     */

    if (
        evaluation.questionId !==
        question.id
    ) {
        throw new Error(
            `evaluation.questionId '${evaluation.questionId}' ` +
            `does not match question.id '${question.id}'.`
        );
    }


    if (
        typeof evaluation.result !==
        "string"
    ) {
        throw new Error(
            "evaluation.result is required."
        );
    }


    if (
        !evaluation.score ||
        typeof evaluation.score !==
        "object" ||
        Array.isArray(evaluation.score)
    ) {
        throw new Error(
            "evaluation.score is required."
        );
    }


    if (
        !evaluation.response ||
        typeof evaluation.response !==
        "object" ||
        Array.isArray(evaluation.response)
    ) {
        throw new Error(
            "evaluation.response is required."
        );
    }
}


/**
 * =========================================================
 * DATE / TIME
 * =========================================================
 */

function assertDateTime(
    value,
    name
) {

    if (
        typeof value !== "string" ||
        !value.trim() ||
        Number.isNaN(
            Date.parse(value)
        )
    ) {
        throw new Error(
            `${name} must be a valid date-time string.`
        );
    }
}


function normalizeDateTime(
    value
) {

    return new Date(
        value
    ).toISOString();
}


function assertChronology(
    startedAt,
    submittedAt
) {

    if (
        Date.parse(submittedAt) <
        Date.parse(startedAt)
    ) {
        throw new Error(
            "submittedAt cannot be earlier than startedAt."
        );
    }
}


/**
 * =========================================================
 * GENERAL UTILITIES
 * =========================================================
 */

function assertNonEmptyString(
    value,
    name
) {

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            `${name} must be a non-empty string.`
        );
    }
}


function assertPositiveInteger(
    value,
    name
) {

    if (
        !Number.isInteger(value) ||
        value < 1
    ) {
        throw new Error(
            `${name} must be a positive integer.`
        );
    }
}


function assertNonNegativeInteger(
    value,
    name
) {

    if (
        !Number.isInteger(value) ||
        value < 0
    ) {
        throw new Error(
            `${name} must be a non-negative integer.`
        );
    }
}


function uniqueStrings(
    values
) {

    if (!Array.isArray(values)) {
        return [];
    }


    return [
        ...new Set(
            values
                .filter(
                    (value) =>
                        typeof value ===
                        "string" &&
                        value.trim()
                )
                .map(
                    (value) =>
                        value.trim()
                )
        )
    ];
}


function copyOptionalString(
    target,
    source,
    key
) {

    const value =
        source?.[key];


    if (
        typeof value === "string" &&
        value.trim()
    ) {
        target[key] =
            value.trim();
    }
}


/**
 * =========================================================
 * METADATA EXPORT
 * =========================================================
 */

export const ATTEMPT_BUILDER_INFO =
    Object.freeze({

        name:
            BUILDER_NAME,

        version:
            BUILDER_VERSION,

        schemaVersion:
            SCHEMA_VERSION

    });


export default buildAttempt;