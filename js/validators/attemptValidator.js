/**
 * attemptValidator.js
 *
 * PHASE 1 — DATA VALIDATION LAYER
 *
 * Attempt Validator V1.0
 *
 * Responsibility:
 *
 *   READ -> CHECK -> REPORT
 *
 * Attempt Validator validates runtime Attempt data.
 *
 * It MUST NOT:
 * - modify Attempt
 * - evaluate whether response is correct
 * - calculate result from response
 * - calculate score from response
 * - update mastery
 * - diagnose remediation
 * - choose next action
 */

const VALIDATOR_NAME = "attempt-validator";
const VALIDATOR_VERSION = "1.0.0";

const ATTEMPT_SCHEMA_VERSION = "1.0.0";


/* =========================================================
 * CONTRACT CONSTANTS
 * ======================================================= */

const REQUIRED_FIELDS = [
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


const RESPONSE_TYPES = new Set([
    "singleChoice",
    "multipleChoice",
    "trueFalse",
    "shortText",
    "numeric",
    "ordering",
    "matching",
    "classification",
    "multiStep"
]);


const RESULTS = new Set([
    "correct",
    "incorrect",
    "partial",
    "skipped"
]);


const LEARNING_MODES = new Set([
    "HOC_NHANH",
    "HOC_SAU",
    "ON_THI"
]);


const ACTIONS = new Set([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);


const PATH_STAGES = new Set([
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





const DIFFICULTIES = new Set([
    "D1",
    "D2",
    "D3",
    "D4",
    "D5"
]);


const PRIMARY_DIMENSIONS = new Set([
    "know",
    "explain",
    "apply",
    "transfer",
    "none"
]);


const INDEPENDENCE_TYPES = new Set([
    "independent",
    "hint_assisted",
    "retry_assisted"
]);


const FEEDBACK_TYPES = new Set([
    "correct",
    "incorrect",
    "partial",
    "hint",
    "none"
]);


const DEVICES = new Set([
    "desktop",
    "tablet",
    "mobile"
]);


const INPUT_METHODS = new Set([
    "mouse",
    "keyboard",
    "touch",
    "mixed"
]);


/*
 * NOTE:
 *
 * attempt.schema.json currently calls these values
 * failureSignature, but they are actually canonical
 * FAILURE TYPES, not failure-signature IDs.
 *
 * Validator V1 follows the current schema exactly.
 */
const FAILURE_TYPES = new Set([
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


/* =========================================================
 * ERROR METADATA FALLBACK
 * ======================================================= */

const ERROR_METADATA = {

    REQUIRED_FIELD_MISSING: {
        severity: "error",
        category: "schema"
    },

    INVALID_FIELD_TYPE: {
        severity: "error",
        category: "schema"
    },

    INVALID_ENUM_VALUE: {
        severity: "error",
        category: "schema"
    },

    INVALID_FORMAT: {
        severity: "error",
        category: "schema"
    },

    UNKNOWN_FIELD: {
        severity: "error",
        category: "schema"
    },

    ATTEMPT_QUESTION_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    ATTEMPT_STUDENT_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    ATTEMPT_INVALID_RESULT: {
        severity: "error",
        category: "contract"
    },

    ATTEMPT_INVALID_SCORE: {
        severity: "error",
        category: "contract"
    },

    ATTEMPT_INVALID_ANSWER: {
        severity: "error",
        category: "contract"
    },

    ATTEMPT_INVALID_TIMESTAMP: {
        severity: "error",
        category: "contract"
    },

    ATTEMPT_NODE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    ATTEMPT_EVIDENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    ATTEMPT_DIFFICULTY_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    FAILURE_SIGNATURE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    }
};


/* =========================================================
 * ALLOWED FIELDS
 * ======================================================= */

const ROOT_FIELDS = new Set([
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
    "context",
    "diagnostic",
    "retry",
    "evidence",
    "feedback",
    "ui",
    "metadata"
]);


const RESPONSE_FIELDS = new Set([
    "type",
    "value",
    "normalizedValue",
    "steps"
]);


const HINT_FIELDS = new Set([
    "used",
    "level",
    "count"
]);


const TIMING_FIELDS = new Set([
    "timeSpentSeconds",
    "activeTimeSeconds",
    "pausedTimeSeconds"
]);


const CONTEXT_FIELDS = new Set([
    "learningMode",
    "action",
    "pathStage",
    "nodeId",
    "secondaryNodeIds",
    "metaSkillIds",
    "clusterId",
    "lessonId",
    "remediationId",
    "decisionId"
]);


const DIAGNOSTIC_FIELDS = new Set([
    "failureSignatureId",
    "failureType",
    "sourceNodeId",
    "metaSkillId",
    "confidence",
    "evidence"
]);


const RETRY_FIELDS = new Set([
    "isRetry",
    "previousAttemptId",
    "retryNumber"
]);


const EVIDENCE_FIELDS = new Set([
    "difficulty",
    "primaryDimension",
    "evidenceStrength",
    "independence"
]);

const FEEDBACK_FIELDS = new Set([
    "shown",
    "type"
]);


const UI_FIELDS = new Set([
    "device",
    "inputMethod"
]);


const METADATA_FIELDS = new Set([
    "questionVersion",
    "engineVersion",
    "validatorVersion"
]);


/* =========================================================
 * PUBLIC API
 * ======================================================= */

/**
 * Validate one Attempt.
 *
 * options:
 * {
 *   questions,
 *   question,
 *   knowledgeMap,
 *   studentRegistry,
 *   failureRegistry,
 *   errorRegistry,
 *   path
 * }
 *
 * questions may be:
 * - Array<Question>
 * - Map<string, Question>
 * - plain object keyed by questionId
 *
 * question may be supplied directly when validating
 * one Attempt against one known Question.
 */
export function validateAttempt(
    attempt,
    options = {}
) {

    const startedAt = Date.now();

    const context = createContext(
        attempt,
        options
    );


    validateRoot(context);


    if (isPlainObject(attempt)) {

        buildIndexes(context);

        resolveQuestion(context);

        validateIdentity(context);

        validateTimestamps(context);

        validateResponse(context);

        validateResult(context);

        validateScore(context);

        validateAttemptNumber(context);

        validateHint(context);

        validateTiming(context);

        validateContext(context);

        validateDiagnostic(context);

        validateRetry(context);

        validateEvidence(context);

        validateFeedback(context);

        validateUI(context);

        validateMetadata(context);

        validateQuestionConsistency(context);
    }


    return buildValidationReport(
        context,
        Date.now() - startedAt
    );
}


/* =========================================================
 * CONTEXT
 * ======================================================= */

function createContext(
    attempt,
    options
) {

    return {

        attempt,

        questions:
            options.questions ?? null,

        directQuestion:
            options.question ?? null,

        knowledgeMap:
            options.knowledgeMap ?? null,

        studentRegistry:
            options.studentRegistry ?? null,

        failureRegistry:
            options.failureRegistry ?? null,

        errorRegistry:
            options.errorRegistry ?? null,

        targetPath:
            options.path ?? null,

        resolvedQuestion:
            null,

        issues: [],

        indexes: {

            questions:
                new Map(),

            knowledgeNodeIds:
                new Set(),

            skillIds:
                new Set(),

            students:
                new Set(),

            failureSignatureIds:
                new Set()
        }
    };
}


/* =========================================================
 * INDEXES
 * ======================================================= */

function buildIndexes(context) {

    buildQuestionIndex(context);

    buildKnowledgeIndexes(context);

    buildStudentIndex(context);

    buildFailureRegistryIndex(context);
}


function buildQuestionIndex(context) {

    const questions =
        context.questions;


    if (Array.isArray(questions)) {

        for (const question of questions) {

            if (
                isPlainObject(question) &&
                typeof question.id === "string"
            ) {

                context.indexes.questions.set(
                    question.id,
                    question
                );
            }
        }

        return;
    }


    if (questions instanceof Map) {

        for (
            const [id, question]
            of questions.entries()
        ) {

            context.indexes.questions.set(
                id,
                question
            );
        }

        return;
    }


    if (isPlainObject(questions)) {

        for (
            const [id, question]
            of Object.entries(questions)
        ) {

            if (isPlainObject(question)) {

                context.indexes.questions.set(
                    question.id ?? id,
                    question
                );
            }
        }
    }
}


function buildKnowledgeIndexes(context) {

    const map =
        context.knowledgeMap;


    if (!map) {
        return;
    }


    const nodes =
        Array.isArray(map.nodes)
            ? map.nodes
            : [];


    for (const node of nodes) {

        if (
            !isPlainObject(node) ||
            typeof node.id !== "string"
        ) {
            continue;
        }


        if (/^K\d{3}$/.test(node.id)) {

            context.indexes
                .knowledgeNodeIds
                .add(node.id);

        } else if (
            /^S\d{3}$/.test(node.id)
        ) {

            context.indexes
                .skillIds
                .add(node.id);
        }
    }


    for (
        const collection
        of [
            map.skills,
            map.metaSkills
        ]
    ) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const item of collection) {

            const id =
                typeof item === "string"
                    ? item
                    : item?.id;


            if (typeof id === "string") {

                context.indexes
                    .skillIds
                    .add(id);
            }
        }
    }
}


function buildStudentIndex(context) {

    const registry =
        context.studentRegistry;


    if (!registry) {
        return;
    }


    if (registry instanceof Set) {

        for (const id of registry) {

            context.indexes.students.add(id);
        }

        return;
    }


    if (Array.isArray(registry)) {

        for (const student of registry) {

            const id =
                typeof student === "string"
                    ? student
                    : student?.id ??
                    student?.studentId;


            if (typeof id === "string") {

                context.indexes.students.add(id);
            }
        }

        return;
    }


    if (isPlainObject(registry)) {

        const collection =
            Array.isArray(registry.students)
                ? registry.students
                : null;


        if (collection) {

            for (const student of collection) {

                const id =
                    typeof student === "string"
                        ? student
                        : student?.id ??
                        student?.studentId;


                if (typeof id === "string") {

                    context.indexes.students.add(id);
                }
            }

        } else {

            for (
                const id
                of Object.keys(registry)
            ) {

                context.indexes.students.add(id);
            }
        }
    }
}


function buildFailureRegistryIndex(
    context
) {

    const registry =
        context.failureRegistry;


    if (!registry) {
        return;
    }


    const collections = [
        registry.failureSignatures,
        registry.signatures,
        registry.items
    ];


    for (const collection of collections) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const item of collection) {

            const id =
                typeof item === "string"
                    ? item
                    : item?.id;


            if (typeof id === "string") {

                context.indexes
                    .failureSignatureIds
                    .add(id);
            }
        }
    }


    if (
        isPlainObject(
            registry.failureSignatures
        )
    ) {

        for (
            const id
            of Object.keys(
                registry.failureSignatures
            )
        ) {

            context.indexes
                .failureSignatureIds
                .add(id);
        }
    }
}


/* =========================================================
 * ROOT VALIDATION
 * ======================================================= */

function validateRoot(context) {

    const attempt =
        context.attempt;


    if (!isPlainObject(attempt)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/",
            attempt,
            "object",
            "Attempt must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        attempt,
        ROOT_FIELDS,
        ""
    );


    for (const field of REQUIRED_FIELDS) {

        if (!(field in attempt)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `/${field}`,
                undefined,
                `Required field '${field}'`,
                `Required Attempt field '${field}' is missing.`
            );
        }
    }
}


/* =========================================================
 * QUESTION RESOLUTION
 * ======================================================= */

function resolveQuestion(context) {

    const attempt =
        context.attempt;


    if (
        isPlainObject(
            context.directQuestion
        )
    ) {

        context.resolvedQuestion =
            context.directQuestion;

        return;
    }


    if (
        typeof attempt.questionId !== "string"
    ) {
        return;
    }


    const question =
        context.indexes.questions.get(
            attempt.questionId
        );


    if (question) {

        context.resolvedQuestion =
            question;

        return;
    }


    /*
     * Only report NOT_FOUND if caller actually supplied
     * a question collection.
     *
     * Absence of external context is not equivalent to
     * an invalid reference.
     */
    if (context.questions !== null) {

        addIssue(
            context,
            "ATTEMPT_QUESTION_NOT_FOUND",
            "/questionId",
            attempt.questionId,
            "Existing Question ID",
            `Question '${attempt.questionId}' does not exist in the supplied Question registry.`
        );
    }
}


/* =========================================================
 * IDENTITY
 * ======================================================= */

function validateIdentity(context) {

    const a =
        context.attempt;


    validateNonEmptyString(
        context,
        a.schemaVersion,
        "/schemaVersion",
        "schemaVersion"
    );


    if (
        typeof a.schemaVersion === "string" &&
        a.schemaVersion !==
        ATTEMPT_SCHEMA_VERSION
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/schemaVersion",
            a.schemaVersion,
            ATTEMPT_SCHEMA_VERSION,
            `Attempt schemaVersion must be '${ATTEMPT_SCHEMA_VERSION}'.`
        );
    }


    validateNonEmptyString(
        context,
        a.attemptId,
        "/attemptId",
        "attemptId"
    );


    validateNonEmptyString(
        context,
        a.studentId,
        "/studentId",
        "studentId"
    );


    validateNonEmptyString(
        context,
        a.sessionId,
        "/sessionId",
        "sessionId"
    );


    validateNonEmptyString(
        context,
        a.questionId,
        "/questionId",
        "questionId"
    );


    /*
     * Student existence is checked only when
     * a canonical student registry was supplied.
     */
    if (
        context.studentRegistry !== null &&
        typeof a.studentId === "string" &&
        !context.indexes.students.has(
            a.studentId
        )
    ) {

        addIssue(
            context,
            "ATTEMPT_STUDENT_NOT_FOUND",
            "/studentId",
            a.studentId,
            "Existing student ID",
            `Student '${a.studentId}' does not exist in the supplied student registry.`
        );
    }
}


/* =========================================================
 * TIMESTAMPS
 * ======================================================= */

function validateTimestamps(context) {

    const a =
        context.attempt;


    const started =
        validateDateTime(
            context,
            a.startedAt,
            "/startedAt"
        );


    const submitted =
        validateDateTime(
            context,
            a.submittedAt,
            "/submittedAt"
        );


    if (
        started !== null &&
        submitted !== null &&
        submitted < started
    ) {

        addIssue(
            context,
            "ATTEMPT_INVALID_TIMESTAMP",
            "/submittedAt",
            a.submittedAt,
            "submittedAt >= startedAt",
            "submittedAt cannot be earlier than startedAt."
        );
    }
}


/* =========================================================
 * RESPONSE
 * ======================================================= */

function validateResponse(context) {

    const response =
        context.attempt.response;


    if (!isPlainObject(response)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/response",
            response,
            "object",
            "Attempt.response must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        response,
        RESPONSE_FIELDS,
        "/response"
    );


    for (
        const field
        of ["type", "value"]
    ) {

        if (!(field in response)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `/response/${field}`,
                undefined,
                field,
                `Attempt.response.${field} is required.`
            );
        }
    }


    if (
        "type" in response &&
        typeof response.type !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/response/type",
            response.type,
            "string",
            "response.type must be a string."
        );

    } else if (
        typeof response.type === "string" &&
        !RESPONSE_TYPES.has(response.type)
    ) {

        addIssue(
            context,
            "ATTEMPT_INVALID_ANSWER",
            "/response/type",
            response.type,
            [...RESPONSE_TYPES],
            `Invalid response.type '${response.type}'.`
        );
    }


    if (
        "steps" in response &&
        !Array.isArray(response.steps)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/response/steps",
            response.steps,
            "array",
            "response.steps must be an array."
        );
    }


    /*
     * Structural response checks only.
     *
     * DO NOT determine whether response is correct.
     */
    validateResponseValueShape(
        context,
        response
    );
}


function validateResponseValueShape(
    context,
    response
) {

    if (!("value" in response)) {
        return;
    }


    switch (response.type) {

        case "singleChoice":

            if (
                response.value !== null &&
                typeof response.value
                !== "string"
            ) {

                invalidResponseValue(
                    context,
                    response.value,
                    "string or null",
                    "singleChoice response.value must be a string or null."
                );
            }

            break;


        case "multipleChoice":
        case "ordering":

            if (
                response.value !== null &&
                !Array.isArray(response.value)
            ) {

                invalidResponseValue(
                    context,
                    response.value,
                    "array or null",
                    `${response.type} response.value must be an array or null.`
                );
            }

            break;


        case "trueFalse":

            if (
                response.value !== null &&
                typeof response.value
                !== "boolean"
            ) {

                invalidResponseValue(
                    context,
                    response.value,
                    "boolean or null",
                    "trueFalse response.value must be boolean or null."
                );
            }

            break;


        case "shortText":

            if (
                response.value !== null &&
                typeof response.value
                !== "string"
            ) {

                invalidResponseValue(
                    context,
                    response.value,
                    "string or null",
                    "shortText response.value must be a string or null."
                );
            }

            break;


        case "numeric":

            if (
                response.value !== null &&
                (
                    typeof response.value
                    !== "number" ||
                    !Number.isFinite(
                        response.value
                    )
                )
            ) {

                invalidResponseValue(
                    context,
                    response.value,
                    "finite number or null",
                    "numeric response.value must be a finite number or null."
                );
            }

            break;


        case "matching":
        case "classification":
        case "multiStep":

            /*
             * Current Attempt Schema deliberately leaves
             * value unconstrained for these types.
             *
             * Do not invent a structure here.
             */
            break;
    }
}


function invalidResponseValue(
    context,
    value,
    expected,
    message
) {

    addIssue(
        context,
        "ATTEMPT_INVALID_ANSWER",
        "/response/value",
        value,
        expected,
        message
    );
}


/* =========================================================
 * RESULT
 * ======================================================= */

function validateResult(context) {

    const result =
        context.attempt.result;


    if (typeof result !== "string") {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/result",
            result,
            "string",
            "Attempt.result must be a string."
        );

        return;
    }


    if (!RESULTS.has(result)) {

        addIssue(
            context,
            "ATTEMPT_INVALID_RESULT",
            "/result",
            result,
            [...RESULTS],
            `Invalid Attempt result '${result}'.`
        );
    }
}


/* =========================================================
 * SCORE
 * ======================================================= */

function validateScore(context) {

    const score =
        context.attempt.score;


    if (
        typeof score !== "number" ||
        !Number.isFinite(score)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/score",
            score,
            "finite number",
            "Attempt.score must be a finite number."
        );

        return;
    }


    if (
        score < 0 ||
        score > 1
    ) {

        addIssue(
            context,
            "ATTEMPT_INVALID_SCORE",
            "/score",
            score,
            "0 <= score <= 1",
            "Attempt.score must be between 0 and 1."
        );
    }


    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT enforce:
     *
     * correct   => score === 1
     * incorrect => score === 0
     * partial   => 0 < score < 1
     *
     * because that would begin to encode scoring
     * business logic not explicitly stated by the
     * Attempt Schema.
     */
}


/* =========================================================
 * ATTEMPT NUMBER
 * ======================================================= */

function validateAttemptNumber(context) {

    const value =
        context.attempt
            .attemptNumber;


    if (
        !Number.isInteger(value)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/attemptNumber",
            value,
            "integer",
            "attemptNumber must be an integer."
        );

        return;
    }


    if (value < 1) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/attemptNumber",
            value,
            "integer >= 1",
            "attemptNumber must be at least 1."
        );
    }
}


/* =========================================================
 * HINT
 * ======================================================= */

function validateHint(context) {

    const hint =
        context.attempt.hint;


    if (!isPlainObject(hint)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/hint",
            hint,
            "object",
            "Attempt.hint must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        hint,
        HINT_FIELDS,
        "/hint"
    );


    if (!("used" in hint)) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/hint/used",
            undefined,
            "boolean",
            "hint.used is required."
        );

    } else if (
        typeof hint.used !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/hint/used",
            hint.used,
            "boolean",
            "hint.used must be boolean."
        );
    }


    if ("level" in hint) {

        if (
            !Number.isInteger(
                hint.level
            )
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/hint/level",
                hint.level,
                "integer",
                "hint.level must be an integer."
            );

        } else if (
            hint.level < 1 ||
            hint.level > 2
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/level",
                hint.level,
                "1..2",
                "hint.level must be between 1 and 2."
            );
        }
    }


    if ("count" in hint) {

        if (
            !Number.isInteger(
                hint.count
            )
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/hint/count",
                hint.count,
                "integer",
                "hint.count must be an integer."
            );

        } else if (
            hint.count < 0 ||
            hint.count > 2
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/count",
                hint.count,
                "0..2",
                "hint.count must be between 0 and 2."
            );
        }
    }
    // tdo
    /*
 * Hint semantic consistency
 */
    if (hint.used === false) {

        if (
            "level" in hint
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/level",
                hint.level,
                "Absent when hint.used=false",
                "hint.level must not be present when no hint was used."
            );
        }


        if (
            "count" in hint &&
            hint.count !== 0
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/count",
                hint.count,
                0,
                "hint.count must be 0 when hint.used=false."
            );
        }
    }


    if (hint.used === true) {

        if (!("level" in hint)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                "/hint/level",
                undefined,
                "Hint level 1 or 2",
                "hint.level is required when hint.used=true."
            );
        }


        if (!("count" in hint)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                "/hint/count",
                undefined,
                "Integer 1..2",
                "hint.count is required when hint.used=true."
            );

        } else if (
            Number.isInteger(hint.count) &&
            hint.count < 1
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/count",
                hint.count,
                "Integer 1..2",
                "hint.count must be at least 1 when hint.used=true."
            );
        }
    }
}


/* =========================================================
 * TIMING
 * ======================================================= */

function validateTiming(context) {

    const timing =
        context.attempt.timing;


    if (!isPlainObject(timing)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/timing",
            timing,
            "object",
            "Attempt.timing must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        timing,
        TIMING_FIELDS,
        "/timing"
    );


    if (
        !("timeSpentSeconds" in timing)
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/timing/timeSpentSeconds",
            undefined,
            "integer >= 0",
            "timing.timeSpentSeconds is required."
        );
    }


    for (
        const field
        of [
            "timeSpentSeconds",
            "activeTimeSeconds",
            "pausedTimeSeconds"
        ]
    ) {

        if (!(field in timing)) {
            continue;
        }


        const value =
            timing[field];


        if (!Number.isInteger(value)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                `/timing/${field}`,
                value,
                "integer",
                `${field} must be an integer.`
            );

            continue;
        }


        if (value < 0) {

            addIssue(
                context,
                "INVALID_FORMAT",
                `/timing/${field}`,
                value,
                "integer >= 0",
                `${field} cannot be negative.`
            );
        }
    }
}


/* =========================================================
 * CONTEXT
 * ======================================================= */

function validateContext(context) {

    const value =
        context.attempt.context;


    if (!isPlainObject(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/context",
            value,
            "object",
            "Attempt.context must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        value,
        CONTEXT_FIELDS,
        "/context"
    );


    for (
        const field
        of [
            "learningMode",
            "action",
            "pathStage"
        ]
    ) {

        if (!(field in value)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `/context/${field}`,
                undefined,
                field,
                `context.${field} is required.`
            );
        }
    }


    validateEnumField(
        context,
        value.learningMode,
        "/context/learningMode",
        LEARNING_MODES
    );


    validateEnumField(
        context,
        value.action,
        "/context/action",
        ACTIONS
    );


    validateEnumField(
        context,
        value.pathStage,
        "/context/pathStage",
        PATH_STAGES
    );


    for (
        const field
        of [
            "nodeId",
            "clusterId",
            "lessonId",
            "remediationId",
            "decisionId"
        ]
    ) {

        if (field in value) {

            validateNonEmptyString(
                context,
                value[field],
                `/context/${field}`,
                field
            );
        }
    }


    validateStringArray(
        context,
        value.secondaryNodeIds,
        "/context/secondaryNodeIds",
        true
    );


    validateStringArray(
        context,
        value.metaSkillIds,
        "/context/metaSkillIds",
        true
    );


    validateContextKnowledgeReferences(
        context,
        value
    );
}


function validateContextKnowledgeReferences(
    context,
    value
) {

    if (!context.knowledgeMap) {
        return;
    }


    if (
        typeof value.nodeId === "string" &&
        !context.indexes
            .knowledgeNodeIds
            .has(value.nodeId)
    ) {

        addIssue(
            context,
            "ATTEMPT_NODE_MISMATCH",
            "/context/nodeId",
            value.nodeId,
            "Existing knowledge node",
            `context.nodeId '${value.nodeId}' does not exist in Knowledge Map.`
        );
    }


    if (
        Array.isArray(
            value.secondaryNodeIds
        )
    ) {

        value.secondaryNodeIds.forEach(
            (id, index) => {

                if (
                    typeof id === "string" &&
                    !context.indexes
                        .knowledgeNodeIds
                        .has(id)
                ) {

                    addIssue(
                        context,
                        "ATTEMPT_NODE_MISMATCH",
                        `/context/secondaryNodeIds/${index}`,
                        id,
                        "Existing knowledge node",
                        `Secondary node '${id}' does not exist in Knowledge Map.`
                    );
                }
            }
        );
    }


    if (
        Array.isArray(
            value.metaSkillIds
        ) &&
        context.indexes.skillIds.size > 0
    ) {

        value.metaSkillIds.forEach(
            (id, index) => {

                if (
                    typeof id === "string" &&
                    !context.indexes
                        .skillIds
                        .has(id)
                ) {

                    addIssue(
                        context,
                        "ATTEMPT_NODE_MISMATCH",
                        `/context/metaSkillIds/${index}`,
                        id,
                        "Existing meta-skill ID",
                        `Meta-skill '${id}' does not exist in the supplied registry.`
                    );
                }
            }
        );
    }
}


/* =========================================================
 * DIAGNOSTIC
 * ======================================================= */

function validateDiagnostic(context) {

    const diagnostic =
        context.attempt.diagnostic;


    if (diagnostic === undefined) {
        return;
    }


    if (!isPlainObject(diagnostic)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/diagnostic",
            diagnostic,
            "object",
            "Attempt.diagnostic must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        diagnostic,
        DIAGNOSTIC_FIELDS,
        "/diagnostic"
    );


    /*
 * failureType
 *
 * Canonical failure taxonomy.
 */
    if (
        "failureType" in diagnostic
    ) {

        const value =
            diagnostic.failureType;


        if (typeof value !== "string") {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/diagnostic/failureType",
                value,
                "string",
                "diagnostic.failureType must be a string."
            );

        } else if (
            !FAILURE_TYPES.has(value)
        ) {

            addIssue(
                context,
                "INVALID_ENUM_VALUE",
                "/diagnostic/failureType",
                value,
                [...FAILURE_TYPES],
                `Invalid failureType '${value}'.`
            );
        }
    }


    /*
     * failureSignatureId
     *
     * Reference to canonical failure-signature registry.
     */
    if (
        "failureSignatureId" in diagnostic
    ) {

        const value =
            diagnostic.failureSignatureId;


        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/diagnostic/failureSignatureId",
                value,
                "Non-empty failure signature ID",
                "diagnostic.failureSignatureId must be a non-empty string."
            );

        } else if (
            context.failureRegistry !== null &&
            context.indexes
                .failureSignatureIds
                .size > 0 &&
            !context.indexes
                .failureSignatureIds
                .has(value)
        ) {

            addIssue(
                context,
                "FAILURE_SIGNATURE_NOT_FOUND",
                "/diagnostic/failureSignatureId",
                value,
                "Existing failure signature ID",
                `Failure signature '${value}' does not exist in the canonical failure-signature registry.`
            );
        }
    }


    if (
        "sourceNodeId" in diagnostic
    ) {

        validateNonEmptyString(
            context,
            diagnostic.sourceNodeId,
            "/diagnostic/sourceNodeId",
            "sourceNodeId"
        );


        if (
            context.knowledgeMap &&
            typeof diagnostic.sourceNodeId
            === "string" &&
            !context.indexes
                .knowledgeNodeIds
                .has(
                    diagnostic.sourceNodeId
                )
        ) {

            addIssue(
                context,
                "ATTEMPT_NODE_MISMATCH",
                "/diagnostic/sourceNodeId",
                diagnostic.sourceNodeId,
                "Existing knowledge node",
                `Diagnostic source node '${diagnostic.sourceNodeId}' does not exist.`
            );
        }
    }


    if (
        "metaSkillId" in diagnostic
    ) {

        validateNonEmptyString(
            context,
            diagnostic.metaSkillId,
            "/diagnostic/metaSkillId",
            "metaSkillId"
        );
    }


    if (
        "confidence" in diagnostic
    ) {

        validateProbability(
            context,
            diagnostic.confidence,
            "/diagnostic/confidence"
        );
    }


    if (
        "evidence" in diagnostic
    ) {

        validateNonEmptyString(
            context,
            diagnostic.evidence,
            "/diagnostic/evidence",
            "diagnostic evidence"
        );
    }
}


/* =========================================================
 * RETRY
 * ======================================================= */

function validateRetry(context) {

    const retry =
        context.attempt.retry;


    if (retry === undefined) {
        return;
    }


    if (!isPlainObject(retry)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/retry",
            retry,
            "object",
            "Attempt.retry must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        retry,
        RETRY_FIELDS,
        "/retry"
    );


    if (!("isRetry" in retry)) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/retry/isRetry",
            undefined,
            "boolean",
            "retry.isRetry is required."
        );

    } else if (
        typeof retry.isRetry !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/retry/isRetry",
            retry.isRetry,
            "boolean",
            "retry.isRetry must be boolean."
        );
    }


    if (
        "previousAttemptId" in retry
    ) {

        validateNonEmptyString(
            context,
            retry.previousAttemptId,
            "/retry/previousAttemptId",
            "previousAttemptId"
        );
    }


    if (
        "retryNumber" in retry
    ) {

        if (
            !Number.isInteger(
                retry.retryNumber
            )
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/retry/retryNumber",
                retry.retryNumber,
                "integer",
                "retry.retryNumber must be an integer."
            );

        } else if (
            retry.retryNumber < 1 ||
            retry.retryNumber > 2
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/retry/retryNumber",
                retry.retryNumber,
                "1..2",
                "retry.retryNumber must be between 1 and 2."
            );
        }
    }
}


/* =========================================================
 * EVIDENCE
 * ======================================================= */

function validateEvidence(context) {

    const evidence =
        context.attempt.evidence;


    if (evidence === undefined) {
        return;
    }


    if (!isPlainObject(evidence)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/evidence",
            evidence,
            "object",
            "Attempt.evidence must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        evidence,
        EVIDENCE_FIELDS,
        "/evidence"
    );


    for (
        const field
        of [
            "difficulty",
            "primaryDimension"
        ]
    ) {

        if (!(field in evidence)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `/evidence/${field}`,
                undefined,
                field,
                `Attempt.evidence.${field} is required.`
            );
        }
    }


    if (
        typeof evidence.difficulty
        === "string" &&
        !DIFFICULTIES.has(
            evidence.difficulty
        )
    ) {

        addIssue(
            context,
            "ATTEMPT_DIFFICULTY_MISMATCH",
            "/evidence/difficulty",
            evidence.difficulty,
            [...DIFFICULTIES],
            `Invalid evidence difficulty '${evidence.difficulty}'.`
        );

    } else if (
        "difficulty" in evidence &&
        typeof evidence.difficulty
        !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/evidence/difficulty",
            evidence.difficulty,
            "string",
            "evidence.difficulty must be a string."
        );
    }


    if (
        "primaryDimension" in evidence
    ) {

        if (
            typeof evidence.primaryDimension
            !== "string"
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/evidence/primaryDimension",
                evidence.primaryDimension,
                "string",
                "evidence.primaryDimension must be a string."
            );

        } else if (
            !PRIMARY_DIMENSIONS.has(
                evidence.primaryDimension
            )
        ) {

            addIssue(
                context,
                "ATTEMPT_EVIDENCE_MISMATCH",
                "/evidence/primaryDimension",
                evidence.primaryDimension,
                [...PRIMARY_DIMENSIONS],
                `Invalid primary evidence dimension '${evidence.primaryDimension}'.`
            );
        }
    }


    if (
        "evidenceStrength" in evidence
    ) {

        validateProbability(
            context,
            evidence.evidenceStrength,
            "/evidence/evidenceStrength"
        );
    }


    if (
        "independence" in evidence
    ) {

        validateEnumField(
            context,
            evidence.independence,
            "/evidence/independence",
            INDEPENDENCE_TYPES
        );
    }
}


/* =========================================================
 * FEEDBACK
 * ======================================================= */

function validateFeedback(context) {

    const feedback =
        context.attempt.feedback;


    if (feedback === undefined) {
        return;
    }


    if (!isPlainObject(feedback)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/feedback",
            feedback,
            "object",
            "Attempt.feedback must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        feedback,
        FEEDBACK_FIELDS,
        "/feedback"
    );


    if (
        "shown" in feedback &&
        typeof feedback.shown
        !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/feedback/shown",
            feedback.shown,
            "boolean",
            "feedback.shown must be boolean."
        );
    }


    if ("type" in feedback) {

        validateEnumField(
            context,
            feedback.type,
            "/feedback/type",
            FEEDBACK_TYPES
        );
    }
}


/* =========================================================
 * UI
 * ======================================================= */

function validateUI(context) {

    const ui =
        context.attempt.ui;


    if (ui === undefined) {
        return;
    }


    if (!isPlainObject(ui)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/ui",
            ui,
            "object",
            "Attempt.ui must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        ui,
        UI_FIELDS,
        "/ui"
    );


    if ("device" in ui) {

        validateEnumField(
            context,
            ui.device,
            "/ui/device",
            DEVICES
        );
    }


    if ("inputMethod" in ui) {

        validateEnumField(
            context,
            ui.inputMethod,
            "/ui/inputMethod",
            INPUT_METHODS
        );
    }
}


/* =========================================================
 * METADATA
 * ======================================================= */

function validateMetadata(context) {

    const metadata =
        context.attempt.metadata;


    if (metadata === undefined) {
        return;
    }


    if (!isPlainObject(metadata)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/metadata",
            metadata,
            "object",
            "Attempt.metadata must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        metadata,
        METADATA_FIELDS,
        "/metadata"
    );


    for (
        const field
        of [
            "questionVersion",
            "engineVersion",
            "validatorVersion"
        ]
    ) {

        if (field in metadata) {

            validateNonEmptyString(
                context,
                metadata[field],
                `/metadata/${field}`,
                field
            );
        }
    }
}


/* =========================================================
 * QUESTION ↔ ATTEMPT CONSISTENCY
 * ======================================================= */

function validateQuestionConsistency(
    context
) {

    const attempt =
        context.attempt;

    const question =
        context.resolvedQuestion;


    if (!isPlainObject(question)) {
        return;
    }


    /*
     * questionId
     */
    if (
        typeof question.id === "string" &&
        attempt.questionId !== question.id
    ) {

        addIssue(
            context,
            "ATTEMPT_QUESTION_NOT_FOUND",
            "/questionId",
            attempt.questionId,
            question.id,
            `Attempt.questionId '${attempt.questionId}' does not match supplied Question '${question.id}'.`
        );
    }


    /*
     * primary node
     *
     * Attempt Schema stores the current node as
     * context.nodeId.
     */
    if (
        typeof attempt.context?.nodeId
        === "string" &&
        typeof question.primaryNode
        === "string" &&
        attempt.context.nodeId !==
        question.primaryNode
    ) {

        addIssue(
            context,
            "ATTEMPT_NODE_MISMATCH",
            "/context/nodeId",
            attempt.context.nodeId,
            question.primaryNode,
            `Attempt context.nodeId '${attempt.context.nodeId}' does not match Question.primaryNode '${question.primaryNode}'.`
        );
    }


    /*
     * secondary nodes
     */
    if (
        Array.isArray(
            attempt.context?.secondaryNodeIds
        ) &&
        Array.isArray(
            question.secondaryNodes
        ) &&
        !sameStringSet(
            attempt.context.secondaryNodeIds,
            question.secondaryNodes
        )
    ) {

        addIssue(
            context,
            "ATTEMPT_NODE_MISMATCH",
            "/context/secondaryNodeIds",
            attempt.context.secondaryNodeIds,
            question.secondaryNodes,
            "Attempt secondaryNodeIds do not match Question.secondaryNodes."
        );
    }


    /*
     * meta skills
     */
    if (
        Array.isArray(
            attempt.context?.metaSkillIds
        ) &&
        Array.isArray(
            question.skills
        ) &&
        !sameStringSet(
            attempt.context.metaSkillIds,
            question.skills
        )
    ) {

        addIssue(
            context,
            "ATTEMPT_NODE_MISMATCH",
            "/context/metaSkillIds",
            attempt.context.metaSkillIds,
            question.skills,
            "Attempt metaSkillIds do not match Question.skills."
        );
    }


    /*
     * evidence dimension
     */
    if (
        typeof attempt.evidence
            ?.primaryDimension === "string" &&
        typeof question.evidence
        === "string"
    ) {

        const attemptDimension =
            attempt.evidence
                .primaryDimension;


        /*
         * "none" is explicitly permitted by Attempt
         * Schema, so do not force it to equal the
         * Question evidence dimension.
         */
        if (
            attemptDimension !== "none" &&
            attemptDimension !==
            question.evidence
        ) {

            addIssue(
                context,
                "ATTEMPT_EVIDENCE_MISMATCH",
                "/evidence/primaryDimension",
                attemptDimension,
                question.evidence,
                `Attempt evidence '${attemptDimension}' does not match Question evidence '${question.evidence}'.`
            );
        }
    }


    /*
     * difficulty
     */
    if (
        typeof attempt.evidence
            ?.difficulty === "string" &&
        typeof question.difficulty
        === "string" &&
        attempt.evidence.difficulty !==
        question.difficulty
    ) {

        addIssue(
            context,
            "ATTEMPT_DIFFICULTY_MISMATCH",
            "/evidence/difficulty",
            attempt.evidence.difficulty,
            question.difficulty,
            `Attempt difficulty '${attempt.evidence.difficulty}' does not match Question difficulty '${question.difficulty}'.`
        );
    }


    /*
     * Question version
     */
    if (
        typeof attempt.metadata
            ?.questionVersion === "string" &&
        typeof question.version === "string" &&
        attempt.metadata.questionVersion !==
        question.version
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/metadata/questionVersion",
            attempt.metadata.questionVersion,
            question.version,
            "Attempt questionVersion does not match the supplied Question version."
        );
    }
    //tdo
    /*
 * Hint consistency with Question
 */
    if (
        attempt.hint?.used === true &&
        Number.isInteger(
            attempt.hint.level
        )
    ) {

        const questionHintLevels =
            question.hint?.levels;


        if (
            !Array.isArray(
                questionHintLevels
            ) ||
            !questionHintLevels.some(
                item =>
                    item?.level ===
                    attempt.hint.level
            )
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/hint/level",
                attempt.hint.level,
                "Hint level declared by Question",
                `Attempt used hint level '${attempt.hint.level}', but that hint level does not exist in the Question.`
            );
        }
    }

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT compare:
     *
     * response -> answer
     * response -> result
     * response -> score
     *
     * because that would perform Question Engine /
     * scoring business logic.
     */
}


/* =========================================================
 * UNKNOWN FIELDS
 * ======================================================= */

function validateUnknownFields(
    context,
    object,
    allowedFields,
    basePath
) {

    if (!isPlainObject(object)) {
        return;
    }


    for (
        const key
        of Object.keys(object)
    ) {

        if (!allowedFields.has(key)) {

            const path =
                `${basePath}/${escapeJsonPointer(key)}`;


            addIssue(
                context,
                "UNKNOWN_FIELD",
                path,
                object[key],
                [...allowedFields],
                `Unknown field '${key}'.`
            );
        }
    }
}


/* =========================================================
 * GENERIC VALIDATORS
 * ======================================================= */

function validateNonEmptyString(
    context,
    value,
    path,
    label
) {

    if (typeof value !== "string") {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "string",
            `${label} must be a string.`
        );

        return false;
    }


    if (value.trim() === "") {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "Non-empty string",
            `${label} must not be empty.`
        );

        return false;
    }


    return true;
}


function validateEnumField(
    context,
    value,
    path,
    allowed
) {

    if (value === undefined) {
        return;
    }


    if (typeof value !== "string") {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "string",
            `${path} must be a string.`
        );

        return;
    }


    if (!allowed.has(value)) {

        addIssue(
            context,
            "INVALID_ENUM_VALUE",
            path,
            value,
            [...allowed],
            `Invalid value '${value}' at '${path}'.`
        );
    }
}


function validateStringArray(
    context,
    value,
    path,
    unique = false
) {

    if (value === undefined) {
        return;
    }


    if (!Array.isArray(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "array",
            `${path} must be an array.`
        );

        return;
    }


    const seen =
        new Set();


    value.forEach(
        (item, index) => {

            if (
                typeof item !== "string" ||
                item.trim() === ""
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "Non-empty string",
                    `${path}/${index} must be a non-empty string.`
                );

                return;
            }


            if (
                unique &&
                seen.has(item)
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "Unique string",
                    `Duplicate value '${item}' in '${path}'.`
                );
            }


            seen.add(item);
        }
    );
}


function validateProbability(
    context,
    value,
    path
) {

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "finite number",
            `${path} must be a finite number.`
        );

        return;
    }


    if (
        value < 0 ||
        value > 1
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "0..1",
            `${path} must be between 0 and 1.`
        );
    }
}


function validateDateTime(
    context,
    value,
    path
) {

    if (typeof value !== "string") {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "ISO 8601 date-time string",
            `${path} must be a date-time string.`
        );

        return null;
    }


    const timestamp =
        Date.parse(value);


    if (Number.isNaN(timestamp)) {

        addIssue(
            context,
            "ATTEMPT_INVALID_TIMESTAMP",
            path,
            value,
            "Valid ISO 8601 date-time",
            `Invalid date-time '${value}'.`
        );

        return null;
    }


    return timestamp;
}


/* =========================================================
 * ISSUE CREATION
 * ======================================================= */

function addIssue(
    context,
    code,
    path,
    value,
    expected,
    message,
    related
) {

    const metadata =
        resolveErrorMetadata(
            context,
            code
        );


    const issue = {

        code,

        severity:
            metadata.severity,

        category:
            metadata.category,

        message
    };


    if (path !== undefined) {
        issue.path = path;
    }


    if (value !== undefined) {
        issue.value = value;
    }


    if (expected !== undefined) {
        issue.expected = expected;
    }


    if (
        Array.isArray(related) &&
        related.length > 0
    ) {

        issue.related =
            related;
    }


    context.issues.push(issue);
}


function resolveErrorMetadata(
    context,
    code
) {

    const registryEntry =
        context.errorRegistry
            ?.codes
        ?.[code];


    if (registryEntry) {

        return {

            severity:
                registryEntry.severity,

            category:
                registryEntry.category
        };
    }


    const fallback =
        ERROR_METADATA[code];


    if (!fallback) {

        throw new Error(
            `Attempt Validator attempted to emit unknown validation code '${code}'.`
        );
    }


    return fallback;
}


/* =========================================================
 * REPORT
 * ======================================================= */

function buildValidationReport(
    context,
    durationMs
) {

    const issues =
        context.issues;


    const errorCount =
        issues.filter(
            issue =>
                issue.severity === "error"
        ).length;


    const warningCount =
        issues.filter(
            issue =>
                issue.severity === "warning"
        ).length;


    const infoCount =
        issues.filter(
            issue =>
                issue.severity === "info"
        ).length;


    return {

        schemaVersion:
            "1.0.0",

        validationId:
            createValidationId(
                context.attempt?.attemptId
            ),

        validator: {

            name:
                VALIDATOR_NAME,

            version:
                VALIDATOR_VERSION
        },

        target: {

            type:
                "attempt",

            id:
                typeof context.attempt
                    ?.attemptId === "string"
                    ? context.attempt.attemptId
                    : null,

            path:
                context.targetPath
        },

        valid:
            errorCount === 0,

        summary: {

            errorCount,

            warningCount,

            infoCount
        },

        issues,

        metadata: {

            validatedAt:
                new Date()
                    .toISOString(),

            durationMs
        }
    };
}


/* =========================================================
 * HELPERS
 * ======================================================= */

function sameStringSet(
    left,
    right
) {

    if (
        !Array.isArray(left) ||
        !Array.isArray(right)
    ) {
        return false;
    }


    if (
        left.length !== right.length
    ) {
        return false;
    }


    const leftSet =
        new Set(left);

    const rightSet =
        new Set(right);


    if (
        leftSet.size !== rightSet.size
    ) {
        return false;
    }


    for (const value of leftSet) {

        if (!rightSet.has(value)) {
            return false;
        }
    }


    return true;
}


function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function escapeJsonPointer(value) {

    return String(value)
        .replace(/~/g, "~0")
        .replace(/\//g, "~1");
}


function createValidationId(
    attemptId
) {

    const safeId =
        typeof attemptId === "string"
            ? attemptId
            : "unknown";


    return (
        `validation-attempt-${safeId}-` +
        Date.now().toString(36)
    );
}