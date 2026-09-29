/*
 * eventValidator.js
 *
 * Phase 1 — Data Validation Layer
 *
 * Version: 1.0.0
 *
 * Responsibility:
 *
 *   READ → CHECK → REPORT
 *
 * Event:
 *   = what happened
 *
 * Student State:
 *   = current state
 *
 * Analytics:
 *   = what events imply
 *
 * MUST NOT:
 *
 *   - mutate event
 *   - update mastery
 *   - calculate mastery
 *   - rebuild Student State
 *   - diagnose failure
 *   - create remediation plan
 *   - choose next action
 *   - calculate analytics
 *   - infer missing event data
 */


const VALIDATOR_NAME = "event-validator";
const VALIDATOR_VERSION = "1.0.0";

const EVENT_SCHEMA_VERSION = "1.0.0";


/* =========================================================
 * Canonical enums
 * ========================================================= */


const EVENT_TYPES = new Set([
    "SESSION_STARTED",
    "SESSION_PAUSED",
    "SESSION_RESUMED",
    "SESSION_COMPLETED",
    "SESSION_ABANDONED",

    "LEARNING_STARTED",
    "LEARNING_COMPLETED",

    "QUESTION_PRESENTED",
    "QUESTION_STARTED",
    "QUESTION_SUBMITTED",
    "QUESTION_SKIPPED",
    "QUESTION_RETRIED",

    "ANSWER_CORRECT",
    "ANSWER_INCORRECT",
    "ANSWER_PARTIAL",

    "HINT_REQUESTED",

    "MASTERY_UPDATED",
    "MASTERY_ADVANCED",
    "MASTERY_STABLE",
    "MASTERY_WEAK",

    "FAILURE_DETECTED",
    "SOURCE_NODE_IDENTIFIED",

    "REMEDIATION_STARTED",
    "REMEDIATION_STEP_COMPLETED",
    "REMEDIATION_PROBE_STARTED",
    "REMEDIATION_PROBE_PASSED",
    "REMEDIATION_PROBE_FAILED",
    "REMEDIATION_COMPLETED",

    "NEXT_ACTION_SELECTED",
    "ACTION_STARTED",
    "ACTION_COMPLETED",

    "RETEST_DUE",
    "RETEST_STARTED",
    "RETEST_PASSED",
    "RETEST_FAILED",

    "REVIEW_DUE",
    "REVIEW_STARTED",
    "REVIEW_COMPLETED",

    "NODE_SKIPPED",
    "NODE_UNLOCKED",
    "NODE_BLOCKED",

    "CHALLENGE_STARTED",
    "CHALLENGE_COMPLETED",

    "TRANSFER_ATTEMPTED",
    "TRANSFER_PASSED",
    "TRANSFER_FAILED",

    "META_SKILL_DETECTED",
    "META_SKILL_PRACTICED",

    "STUDENT_CHOICE",
    "STUDENT_CHANGED_PATH",

    "FATIGUE_SIGNAL_DETECTED",
    "BREAK_SUGGESTED",

    "ERROR_SYSTEM",
    "VALIDATION_FAILED"
]);


const SOURCE_COMPONENTS = new Set([
    "UI",
    "LessonEngine",
    "QuestionEngine",
    "MasteryEngine",
    "AdaptiveEngine",
    "RemediationEngine",
    "AnalyticsEngine",
    "Storage",
    "System"
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


const RESULTS = new Set([
    "correct",
    "incorrect",
    "partial",
    "skipped",
    "completed",
    "failed",
    "passed",
    "blocked",
    "started",
    "cancelled"
]);


const MASTERY_LEVELS = new Set([
    "M0",
    "M1",
    "M2",
    "M3",
    "M4"
]);


const MASTERY_STATUSES = new Set([
    "developing",
    "mastered",
    "stable",
    "weak"
]);


const MASTERY_DECISIONS = new Set([
    "unchanged",
    "advanced",
    "mastered",
    "stable",
    "review_required",
    "remediation_required"
]);


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


const PROBE_RESULTS = new Set([
    "passed",
    "failed",
    "partial"
]);


const STUDENT_CHOICES = new Set([
    "CONTINUE",
    "REVIEW",
    "CHALLENGE",
    "DIFFERENT_NODE",
    "TAKE_BREAK",
    "END_SESSION"
]);


const FATIGUE_SIGNALS = new Set([
    "FOUR_WRONG",
    "THREE_SKIPS",
    "CAREFUL_ERROR_PATTERN",
    "LONG_SESSION",
    "SLOW_RESPONSE_PATTERN"
]);


/* =========================================================
 * Structural field sets
 * ========================================================= */


const ROOT_FIELDS = new Set([
    "schemaVersion",
    "eventId",
    "eventType",
    "timestamp",
    "studentId",
    "sessionId",
    "source",
    "context",
    "payload",
    "correlation"
]);


const SOURCE_FIELDS = new Set([
    "component",
    "engineVersion",
    "appVersion"
]);


const CONTEXT_FIELDS = new Set([
    "learningMode",
    "clusterId",
    "nodeId",
    "secondaryNodeIds",
    "metaSkillId",
    "lessonId",
    "questionId",
    "action",
    "pathStage",
    "remediationId",
    "decisionId"
]);


const PAYLOAD_FIELDS = new Set([
    "result",
    "score",
    "timeSpentSeconds",

    "hintUsed",
    "hintLevel",

    "retry",
    "attemptNumber",

    "failureType",
    "failureSignatureId",
    "sourceNodeId",
    "metaSkillId",

    "masteryLevel",
    "previousMasteryLevel",
    "status",
    "previousStatus",
    "masteryDecision",

    "action",
    "previousAction",
    "nextAction",
    "decisionReason",

    "remediationDepth",
    "probeResult",

    "studentChoice",
    "fatigueSignal",

    "errorCode",
    "message"
]);


const CORRELATION_FIELDS = new Set([
    "attemptId",
    "masteryUpdateId",
    "remediationId",
    "decisionId",
    "parentEventId"
]);


/* =========================================================
 * Event semantic groups
 * ========================================================= */


const QUESTION_EVENTS = new Set([
    "QUESTION_PRESENTED",
    "QUESTION_STARTED",
    "QUESTION_SUBMITTED",
    "QUESTION_SKIPPED",
    "QUESTION_RETRIED",
    "ANSWER_CORRECT",
    "ANSWER_INCORRECT",
    "ANSWER_PARTIAL",
    "HINT_REQUESTED"
]);


const ANSWER_EVENTS = new Set([
    "ANSWER_CORRECT",
    "ANSWER_INCORRECT",
    "ANSWER_PARTIAL"
]);


const MASTERY_EVENTS = new Set([
    "MASTERY_UPDATED",
    "MASTERY_ADVANCED",
    "MASTERY_STABLE",
    "MASTERY_WEAK"
]);


const FAILURE_EVENTS = new Set([
    "FAILURE_DETECTED",
    "SOURCE_NODE_IDENTIFIED"
]);


const REMEDIATION_EVENTS = new Set([
    "REMEDIATION_STARTED",
    "REMEDIATION_STEP_COMPLETED",
    "REMEDIATION_PROBE_STARTED",
    "REMEDIATION_PROBE_PASSED",
    "REMEDIATION_PROBE_FAILED",
    "REMEDIATION_COMPLETED"
]);


const REMEDIATION_PROBE_EVENTS = new Set([
    "REMEDIATION_PROBE_STARTED",
    "REMEDIATION_PROBE_PASSED",
    "REMEDIATION_PROBE_FAILED"
]);


const ACTION_EVENTS = new Set([
    "NEXT_ACTION_SELECTED",
    "ACTION_STARTED",
    "ACTION_COMPLETED"
]);


const RETEST_EVENTS = new Set([
    "RETEST_DUE",
    "RETEST_STARTED",
    "RETEST_PASSED",
    "RETEST_FAILED"
]);


const REVIEW_EVENTS = new Set([
    "REVIEW_DUE",
    "REVIEW_STARTED",
    "REVIEW_COMPLETED"
]);


const NODE_EVENTS = new Set([
    "NODE_SKIPPED",
    "NODE_UNLOCKED",
    "NODE_BLOCKED"
]);


const CHALLENGE_EVENTS = new Set([
    "CHALLENGE_STARTED",
    "CHALLENGE_COMPLETED"
]);


const TRANSFER_EVENTS = new Set([
    "TRANSFER_ATTEMPTED",
    "TRANSFER_PASSED",
    "TRANSFER_FAILED"
]);


const META_SKILL_EVENTS = new Set([
    "META_SKILL_DETECTED",
    "META_SKILL_PRACTICED"
]);


/* =========================================================
 * Fallback error metadata
 *
 * Uses existing canonical registry codes.
 *
 * No EVENT_* codes are invented in V1.
 * ========================================================= */


const FALLBACK_ERROR_METADATA = {

    SCHEMA_INVALID: {
        severity: "error",
        category: "schema"
    },

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

    KNOWLEDGE_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    KNOWLEDGE_SKILL_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_FAILURE_SIGNATURE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    FAILURE_SIGNATURE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    CONTRACT_EVIDENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_FAILURE_SIGNATURE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_NODE_REFERENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_SKILL_REFERENCE_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_ACTION_MISMATCH: {
        severity: "error",
        category: "consistency"
    },

    CONTRACT_VERSION_INCOMPATIBLE: {
        severity: "error",
        category: "contract"
    }
};


/* =========================================================
 * Public API
 * ========================================================= */


export function validateEvent(
    event,
    options = {}
) {

    const startedAt = Date.now();

    const context =
        createContext(
            event,
            options
        );


    validateRoot(context);


    if (!isPlainObject(event)) {

        return buildReport(
            context,
            startedAt
        );
    }


    validateIdentity(context);

    validateSource(context);

    validateEventContext(context);

    validatePayload(context);

    validateCorrelation(context);

    validateReferences(context);

    validateEventSemantics(context);


    return buildReport(
        context,
        startedAt
    );
}


/* =========================================================
 * Context / indexes
 * ========================================================= */


function createContext(
    event,
    options
) {

    return {

        event,

        options,

        issues: [],

        errorRegistry:
            options.errorRegistry ?? null,

        hasKnowledgeMap:
            options.knowledgeMap != null,

        hasQuestions:
            options.questions != null,

        hasFailureRegistry:
            options.failureRegistry != null,

        indexes: {

            nodeIds:
                buildNodeIndex(
                    options.knowledgeMap
                ),

            clusterIds:
                buildClusterIndex(
                    options.knowledgeMap
                ),

            skillIds:
                buildSkillIndex(
                    options.knowledgeMap
                ),

            questionIds:
                buildQuestionIndex(
                    options.questions
                ),

            failureSignatureIds:
                buildFailureIndex(
                    options.failureRegistry
                )
        }
    };
}


function buildNodeIndex(
    knowledgeMap
) {

    const result = new Set();

    if (!knowledgeMap) {
        return result;
    }


    const nodes =
        Array.isArray(knowledgeMap.nodes)
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (
            isPlainObject(node) &&
            isNonEmptyString(node.id)
        ) {

            result.add(node.id);
        }
    }


    return result;
}


function buildClusterIndex(
    knowledgeMap
) {

    const result = new Set();

    if (!knowledgeMap) {
        return result;
    }


    const clusters =
        Array.isArray(knowledgeMap.clusters)
            ? knowledgeMap.clusters
            : [];


    for (const cluster of clusters) {

        if (isNonEmptyString(cluster)) {

            result.add(cluster);

        } else if (
            isPlainObject(cluster) &&
            isNonEmptyString(cluster.id)
        ) {

            result.add(cluster.id);
        }
    }


    return result;
}


function buildSkillIndex(
    knowledgeMap
) {

    const result = new Set();

    if (!knowledgeMap) {
        return result;
    }


    const collections = [
        knowledgeMap.skills,
        knowledgeMap.metaSkills
    ];


    for (const collection of collections) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const item of collection) {

            if (isNonEmptyString(item)) {

                result.add(item);

            } else if (
                isPlainObject(item) &&
                isNonEmptyString(item.id)
            ) {

                result.add(item.id);
            }
        }
    }


    const nodes =
        Array.isArray(knowledgeMap.nodes)
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (!isPlainObject(node)) {
            continue;
        }


        if (Array.isArray(node.skills)) {

            for (const skillId of node.skills) {

                if (isNonEmptyString(skillId)) {
                    result.add(skillId);
                }
            }
        }
    }


    return result;
}


function buildQuestionIndex(
    questions
) {

    const result = new Map();

    if (!questions) {
        return result;
    }


    if (questions instanceof Map) {

        for (
            const [id, question]
            of questions.entries()
        ) {

            result.set(id, question);
        }

        return result;
    }


    if (Array.isArray(questions)) {

        for (const question of questions) {

            if (
                isPlainObject(question) &&
                isNonEmptyString(question.id)
            ) {

                result.set(
                    question.id,
                    question
                );
            }
        }

        return result;
    }


    if (isPlainObject(questions)) {

        for (
            const [key, question]
            of Object.entries(questions)
        ) {

            if (
                isPlainObject(question) &&
                isNonEmptyString(question.id)
            ) {

                result.set(
                    question.id,
                    question
                );

            } else {

                result.set(
                    key,
                    question
                );
            }
        }
    }


    return result;
}


function buildFailureIndex(
    failureRegistry
) {

    const result = new Set();

    if (!failureRegistry) {
        return result;
    }


    let collection = null;


    if (Array.isArray(failureRegistry)) {

        collection = failureRegistry;

    } else if (
        Array.isArray(
            failureRegistry.signatures
        )
    ) {

        collection =
            failureRegistry.signatures;

    } else if (
        Array.isArray(
            failureRegistry.failureSignatures
        )
    ) {

        collection =
            failureRegistry.failureSignatures;
    }


    if (!collection) {
        return result;
    }


    for (const item of collection) {

        if (isNonEmptyString(item)) {

            result.add(item);

        } else if (
            isPlainObject(item) &&
            isNonEmptyString(item.id)
        ) {

            result.add(item.id);
        }
    }


    return result;
}


/* =========================================================
 * Root
 * ========================================================= */


function validateRoot(
    context
) {

    const event = context.event;


    if (!isPlainObject(event)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "",
            event,
            "object",
            "Event must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        event,
        ROOT_FIELDS,
        ""
    );


    validateRequiredFields(
        context,
        event,
        [
            "schemaVersion",
            "eventId",
            "eventType",
            "timestamp",
            "studentId",
            "sessionId",
            "source",
            "context",
            "payload"
        ],
        ""
    );
}


/* =========================================================
 * Identity
 * ========================================================= */


function validateIdentity(
    context
) {

    const event = context.event;


    if ("schemaVersion" in event) {

        if (
            event.schemaVersion !==
            EVENT_SCHEMA_VERSION
        ) {

            addIssue(
                context,
                "CONTRACT_VERSION_INCOMPATIBLE",
                "/schemaVersion",
                event.schemaVersion,
                EVENT_SCHEMA_VERSION,
                `Event schemaVersion must be '${EVENT_SCHEMA_VERSION}'.`
            );
        }
    }


    validateNonEmptyStringField(
        context,
        event,
        "eventId",
        "/eventId"
    );


    if ("eventType" in event) {

        validateEnum(
            context,
            event.eventType,
            EVENT_TYPES,
            "/eventType"
        );
    }


    if ("timestamp" in event) {

        if (!isDateTime(event.timestamp)) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/timestamp",
                event.timestamp,
                "ISO 8601 date-time",
                "Event timestamp must be a valid date-time."
            );
        }
    }


    validateNonEmptyStringField(
        context,
        event,
        "studentId",
        "/studentId"
    );


    validateNonEmptyStringField(
        context,
        event,
        "sessionId",
        "/sessionId"
    );
}


/* =========================================================
 * Source
 * ========================================================= */


function validateSource(
    context
) {

    const source =
        context.event.source;


    if (source === undefined) {
        return;
    }


    if (!isPlainObject(source)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/source",
            source,
            "object",
            "source must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        source,
        SOURCE_FIELDS,
        "/source"
    );


    validateRequiredFields(
        context,
        source,
        ["component"],
        "/source"
    );


    if ("component" in source) {

        validateEnum(
            context,
            source.component,
            SOURCE_COMPONENTS,
            "/source/component"
        );
    }


    validateOptionalNonEmptyString(
        context,
        source.engineVersion,
        "/source/engineVersion"
    );


    validateOptionalNonEmptyString(
        context,
        source.appVersion,
        "/source/appVersion"
    );
}


/* =========================================================
 * Event context
 * ========================================================= */


function validateEventContext(
    context
) {

    const value =
        context.event.context;


    if (value === undefined) {
        return;
    }


    if (!isPlainObject(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/context",
            value,
            "object",
            "context must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        value,
        CONTEXT_FIELDS,
        "/context"
    );


    validateRequiredFields(
        context,
        value,
        ["learningMode"],
        "/context"
    );


    if ("learningMode" in value) {

        validateEnum(
            context,
            value.learningMode,
            LEARNING_MODES,
            "/context/learningMode"
        );
    }


    validateOptionalNonEmptyString(
        context,
        value.clusterId,
        "/context/clusterId"
    );


    validateOptionalNodeFormat(
        context,
        value.nodeId,
        "/context/nodeId"
    );


    if ("secondaryNodeIds" in value) {

        validateNodeIdArray(
            context,
            value.secondaryNodeIds,
            "/context/secondaryNodeIds"
        );
    }


    validateOptionalSkillFormat(
        context,
        value.metaSkillId,
        "/context/metaSkillId"
    );


    validateOptionalNonEmptyString(
        context,
        value.lessonId,
        "/context/lessonId"
    );


    validateOptionalNonEmptyString(
        context,
        value.questionId,
        "/context/questionId"
    );


    if ("action" in value) {

        validateEnum(
            context,
            value.action,
            ACTIONS,
            "/context/action"
        );
    }


    if ("pathStage" in value) {

        validateEnum(
            context,
            value.pathStage,
            PATH_STAGES,
            "/context/pathStage"
        );
    }


    validateOptionalNonEmptyString(
        context,
        value.remediationId,
        "/context/remediationId"
    );


    validateOptionalNonEmptyString(
        context,
        value.decisionId,
        "/context/decisionId"
    );
}


/* =========================================================
 * Payload
 * ========================================================= */


function validatePayload(
    context
) {

    const payload =
        context.event.payload;


    if (payload === undefined) {
        return;
    }


    if (!isPlainObject(payload)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/payload",
            payload,
            "object",
            "payload must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        payload,
        PAYLOAD_FIELDS,
        "/payload"
    );


    if ("result" in payload) {

        validateEnum(
            context,
            payload.result,
            RESULTS,
            "/payload/result"
        );
    }


    if ("score" in payload) {

        validateNumberRange(
            context,
            payload.score,
            0,
            1,
            "/payload/score"
        );
    }


    if ("timeSpentSeconds" in payload) {

        validateNonNegativeInteger(
            context,
            payload.timeSpentSeconds,
            "/payload/timeSpentSeconds"
        );
    }


    if ("hintUsed" in payload) {

        validateBoolean(
            context,
            payload.hintUsed,
            "/payload/hintUsed"
        );
    }


    if ("hintLevel" in payload) {

        validateIntegerRange(
            context,
            payload.hintLevel,
            1,
            2,
            "/payload/hintLevel"
        );
    }


    if ("retry" in payload) {

        validateBoolean(
            context,
            payload.retry,
            "/payload/retry"
        );
    }


    if ("attemptNumber" in payload) {

        validatePositiveInteger(
            context,
            payload.attemptNumber,
            "/payload/attemptNumber"
        );
    }


    if ("failureType" in payload) {

        validateEnum(
            context,
            payload.failureType,
            FAILURE_TYPES,
            "/payload/failureType"
        );
    }


    validateOptionalNonEmptyString(
        context,
        payload.failureSignatureId,
        "/payload/failureSignatureId"
    );


    validateOptionalNodeFormat(
        context,
        payload.sourceNodeId,
        "/payload/sourceNodeId"
    );


    validateOptionalSkillFormat(
        context,
        payload.metaSkillId,
        "/payload/metaSkillId"
    );


    if ("masteryLevel" in payload) {

        validateEnum(
            context,
            payload.masteryLevel,
            MASTERY_LEVELS,
            "/payload/masteryLevel"
        );
    }


    if (
        "previousMasteryLevel"
        in payload
    ) {

        validateEnum(
            context,
            payload.previousMasteryLevel,
            MASTERY_LEVELS,
            "/payload/previousMasteryLevel"
        );
    }


    if ("status" in payload) {

        validateEnum(
            context,
            payload.status,
            MASTERY_STATUSES,
            "/payload/status"
        );
    }


    if ("previousStatus" in payload) {

        validateEnum(
            context,
            payload.previousStatus,
            MASTERY_STATUSES,
            "/payload/previousStatus"
        );
    }


    if ("masteryDecision" in payload) {

        validateEnum(
            context,
            payload.masteryDecision,
            MASTERY_DECISIONS,
            "/payload/masteryDecision"
        );
    }


    for (
        const field
        of [
            "action",
            "previousAction",
            "nextAction"
        ]
    ) {

        if (field in payload) {

            validateEnum(
                context,
                payload[field],
                ACTIONS,
                `/payload/${field}`
            );
        }
    }


    validateOptionalNonEmptyString(
        context,
        payload.decisionReason,
        "/payload/decisionReason"
    );


    if ("remediationDepth" in payload) {

        validateIntegerRange(
            context,
            payload.remediationDepth,
            1,
            3,
            "/payload/remediationDepth"
        );
    }


    if ("probeResult" in payload) {

        validateEnum(
            context,
            payload.probeResult,
            PROBE_RESULTS,
            "/payload/probeResult"
        );
    }


    if ("studentChoice" in payload) {

        validateEnum(
            context,
            payload.studentChoice,
            STUDENT_CHOICES,
            "/payload/studentChoice"
        );
    }


    if ("fatigueSignal" in payload) {

        validateEnum(
            context,
            payload.fatigueSignal,
            FATIGUE_SIGNALS,
            "/payload/fatigueSignal"
        );
    }


    validateOptionalNonEmptyString(
        context,
        payload.errorCode,
        "/payload/errorCode"
    );


    validateOptionalNonEmptyString(
        context,
        payload.message,
        "/payload/message"
    );


    /*
     * Cross-field hint consistency.
     *
     * This checks representation only.
     * It does not infer whether a hint should
     * have been used.
     */
    if (
        payload.hintUsed === false &&
        "hintLevel" in payload
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/payload/hintLevel",
            payload.hintLevel,
            "absent when hintUsed=false",
            "hintLevel must be absent when hintUsed is false."
        );
    }


    if (
        payload.hintUsed === true &&
        !("hintLevel" in payload)
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/payload/hintLevel",
            undefined,
            "hintLevel",
            "hintLevel is required when hintUsed is true."
        );
    }
}


/* =========================================================
 * Correlation
 * ========================================================= */


function validateCorrelation(
    context
) {

    const correlation =
        context.event.correlation;


    if (correlation === undefined) {
        return;
    }


    if (!isPlainObject(correlation)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/correlation",
            correlation,
            "object",
            "correlation must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        correlation,
        CORRELATION_FIELDS,
        "/correlation"
    );


    for (
        const field
        of CORRELATION_FIELDS
    ) {

        validateOptionalNonEmptyString(
            context,
            correlation[field],
            `/correlation/${field}`
        );
    }


    if (
        correlation.parentEventId ===
        context.event.eventId
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/correlation/parentEventId",
            correlation.parentEventId,
            "event ID different from eventId",
            "An event cannot reference itself as parentEventId."
        );
    }
}


/* =========================================================
 * Reference validation
 * ========================================================= */


function validateReferences(
    context
) {

    const event = context.event;

    const eventContext =
        isPlainObject(event.context)
            ? event.context
            : {};

    const payload =
        isPlainObject(event.payload)
            ? event.payload
            : {};


    validateNodeReference(
        context,
        eventContext.nodeId,
        "/context/nodeId"
    );


    if (
        Array.isArray(
            eventContext.secondaryNodeIds
        )
    ) {

        eventContext.secondaryNodeIds
            .forEach(
                (nodeId, index) => {

                    validateNodeReference(
                        context,
                        nodeId,
                        `/context/secondaryNodeIds/${index}`
                    );
                }
            );
    }


    validateNodeReference(
        context,
        payload.sourceNodeId,
        "/payload/sourceNodeId"
    );


    validateSkillReference(
        context,
        eventContext.metaSkillId,
        "/context/metaSkillId"
    );


    validateSkillReference(
        context,
        payload.metaSkillId,
        "/payload/metaSkillId"
    );


    validateQuestionReference(
        context,
        eventContext.questionId,
        "/context/questionId"
    );


    validateFailureSignatureReference(
        context,
        payload.failureSignatureId,
        "/payload/failureSignatureId"
    );


    /*
     * If Knowledge Map exposes cluster registry,
     * validate clusterId.
     */
    if (
        context.hasKnowledgeMap &&
        context.indexes.clusterIds.size > 0 &&
        isNonEmptyString(
            eventContext.clusterId
        ) &&
        !context.indexes.clusterIds.has(
            eventContext.clusterId
        )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            "/context/clusterId",
            eventContext.clusterId,
            "existing Knowledge Map cluster ID",
            `Cluster '${eventContext.clusterId}' does not exist in Knowledge Map.`
        );
    }


    /*
     * If a Question is available, compare its
     * canonical node mapping with Event context.
     *
     * Event does not calculate anything here;
     * it only checks recorded references.
     */
    if (
        context.hasQuestions &&
        isNonEmptyString(
            eventContext.questionId
        )
    ) {

        const question =
            context.indexes.questionIds.get(
                eventContext.questionId
            );


        if (isPlainObject(question)) {

            if (
                isNonEmptyString(
                    eventContext.nodeId
                ) &&
                isNonEmptyString(
                    question.primaryNode
                ) &&
                eventContext.nodeId !==
                question.primaryNode
            ) {

                addIssue(
                    context,
                    "CONTRACT_NODE_REFERENCE_MISMATCH",
                    "/context/nodeId",
                    eventContext.nodeId,
                    question.primaryNode,
                    `Event nodeId '${eventContext.nodeId}' does not match Question primaryNode '${question.primaryNode}'.`
                );
            }


            if (
                Array.isArray(
                    eventContext.secondaryNodeIds
                ) &&
                Array.isArray(
                    question.secondaryNodes
                )
            ) {

                const expected =
                    new Set(
                        question.secondaryNodes
                    );


                for (
                    let i = 0;
                    i <
                    eventContext
                        .secondaryNodeIds
                        .length;
                    i++
                ) {

                    const nodeId =
                        eventContext
                            .secondaryNodeIds[i];


                    if (!expected.has(nodeId)) {

                        addIssue(
                            context,
                            "CONTRACT_NODE_REFERENCE_MISMATCH",
                            `/context/secondaryNodeIds/${i}`,
                            nodeId,
                            question.secondaryNodes,
                            `Event secondary node '${nodeId}' is not a canonical secondary node of Question '${question.id}'.`
                        );
                    }
                }
            }
        }
    }
}


/* =========================================================
 * Event semantic validation
 *
 * These rules answer:
 *
 * "Does this event contain enough information
 *  to describe the thing it claims happened?"
 *
 * They DO NOT answer:
 *
 * "Was the engine's decision correct?"
 * ========================================================= */


function validateEventSemantics(
    context
) {

    const event = context.event;

    if (
        !EVENT_TYPES.has(
            event.eventType
        )
    ) {
        return;
    }


    const type =
        event.eventType;


    /*
     * Question lifecycle / answer events.
     */
    if (QUESTION_EVENTS.has(type)) {

        requireContextField(
            context,
            "questionId",
            type
        );
    }


    /*
     * Question submitted / skipped / retried /
     * answer events should correlate to an Attempt.
     *
     * QUESTION_PRESENTED and QUESTION_STARTED may
     * happen before an Attempt exists.
     */
    if (
        new Set([
            "QUESTION_SUBMITTED",
            "QUESTION_SKIPPED",
            "QUESTION_RETRIED",
            "ANSWER_CORRECT",
            "ANSWER_INCORRECT",
            "ANSWER_PARTIAL"
        ]).has(type)
    ) {

        requireCorrelationField(
            context,
            "attemptId",
            type
        );
    }


    /*
     * Answer events require their canonical result.
     */
    if (type === "ANSWER_CORRECT") {

        requirePayloadExact(
            context,
            "result",
            "correct",
            type
        );
    }


    if (type === "ANSWER_INCORRECT") {

        requirePayloadExact(
            context,
            "result",
            "incorrect",
            type
        );
    }


    if (type === "ANSWER_PARTIAL") {

        requirePayloadExact(
            context,
            "result",
            "partial",
            type
        );
    }


    if (type === "QUESTION_SKIPPED") {

        requirePayloadExact(
            context,
            "result",
            "skipped",
            type
        );
    }


    if (type === "QUESTION_RETRIED") {

        requirePayloadExact(
            context,
            "retry",
            true,
            type
        );
    }


    /*
     * Hint event.
     */
    if (type === "HINT_REQUESTED") {

        requirePayloadExact(
            context,
            "hintUsed",
            true,
            type
        );

        requirePayloadField(
            context,
            "hintLevel",
            type
        );
    }


    /*
     * Mastery events.
     *
     * Require node + mastery snapshot.
     *
     * We intentionally do NOT evaluate whether
     * the mastery transition is mathematically
     * correct. That belongs to Mastery Engine.
     */
    if (MASTERY_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );

        requirePayloadField(
            context,
            "masteryLevel",
            type
        );

        requirePayloadField(
            context,
            "status",
            type
        );
    }


    if (type === "MASTERY_ADVANCED") {

        requirePayloadField(
            context,
            "previousMasteryLevel",
            type
        );

        requirePayloadExact(
            context,
            "masteryDecision",
            "advanced",
            type
        );
    }


    if (type === "MASTERY_STABLE") {

        requirePayloadExact(
            context,
            "status",
            "stable",
            type
        );
    }


    if (type === "MASTERY_WEAK") {

        requirePayloadExact(
            context,
            "status",
            "weak",
            type
        );
    }


    /*
     * Failure events.
     *
     * FAILURE_DETECTED requires taxonomy category.
     *
     * failureSignatureId remains optional because
     * not every diagnosed failure must resolve to
     * a specific registry signature.
     */
    if (type === "FAILURE_DETECTED") {

        requireContextField(
            context,
            "nodeId",
            type
        );

        requirePayloadField(
            context,
            "failureType",
            type
        );
    }


    if (type === "SOURCE_NODE_IDENTIFIED") {

        requireContextField(
            context,
            "nodeId",
            type
        );

        requirePayloadField(
            context,
            "sourceNodeId",
            type
        );
    }


    /*
     * Remediation events.
     */
    if (REMEDIATION_EVENTS.has(type)) {

        requireRemediationIdentifier(
            context,
            type
        );
    }


    if (type === "REMEDIATION_STARTED") {

        requireContextField(
            context,
            "nodeId",
            type
        );

        requirePayloadField(
            context,
            "failureType",
            type
        );
    }


    if (
        REMEDIATION_PROBE_EVENTS.has(type)
    ) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    if (
        type ===
        "REMEDIATION_PROBE_PASSED"
    ) {

        requirePayloadExact(
            context,
            "probeResult",
            "passed",
            type
        );
    }


    if (
        type ===
        "REMEDIATION_PROBE_FAILED"
    ) {

        requirePayloadExact(
            context,
            "probeResult",
            "failed",
            type
        );
    }


    /*
     * Adaptive decision.
     */
    if (
        type ===
        "NEXT_ACTION_SELECTED"
    ) {

        requireDecisionIdentifier(
            context,
            type
        );

        requirePayloadField(
            context,
            "nextAction",
            type
        );

        requirePayloadField(
            context,
            "decisionReason",
            type
        );
    }


    /*
     * Action lifecycle.
     */
    if (
        type === "ACTION_STARTED" ||
        type === "ACTION_COMPLETED"
    ) {

        requireContextField(
            context,
            "action",
            type
        );
    }


    /*
     * Retest.
     */
    if (RETEST_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    if (type === "RETEST_PASSED") {

        requirePayloadExact(
            context,
            "result",
            "passed",
            type
        );
    }


    if (type === "RETEST_FAILED") {

        requirePayloadExact(
            context,
            "result",
            "failed",
            type
        );
    }


    /*
     * Review.
     */
    if (REVIEW_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    /*
     * Node lifecycle.
     */
    if (NODE_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    if (type === "NODE_SKIPPED") {

        if (
            isPlainObject(event.context) &&
            "action" in event.context &&
            event.context.action !== "SKIP"
        ) {

            addIssue(
                context,
                "CONTRACT_ACTION_MISMATCH",
                "/context/action",
                event.context.action,
                "SKIP",
                "NODE_SKIPPED context.action must be SKIP when action is recorded."
            );
        }
    }


    /*
     * Challenge.
     */
    if (CHALLENGE_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    /*
     * Transfer.
     */
    if (TRANSFER_EVENTS.has(type)) {

        requireContextField(
            context,
            "nodeId",
            type
        );
    }


    if (type === "TRANSFER_PASSED") {

        requirePayloadExact(
            context,
            "result",
            "passed",
            type
        );
    }


    if (type === "TRANSFER_FAILED") {

        requirePayloadExact(
            context,
            "result",
            "failed",
            type
        );
    }


    /*
     * Meta skill.
     */
    if (META_SKILL_EVENTS.has(type)) {

        requireMetaSkill(
            context,
            type
        );
    }


    /*
     * Student choice.
     */
    if (type === "STUDENT_CHOICE") {

        requirePayloadField(
            context,
            "studentChoice",
            type
        );
    }


    /*
     * Fatigue signal.
     */
    if (
        type ===
        "FATIGUE_SIGNAL_DETECTED"
    ) {

        requirePayloadField(
            context,
            "fatigueSignal",
            type
        );
    }


    /*
     * System errors.
     */
    if (
        type === "ERROR_SYSTEM" ||
        type === "VALIDATION_FAILED"
    ) {

        requirePayloadField(
            context,
            "message",
            type
        );
    }


    /*
     * Cross-location identity consistency.
     */
    validateCrossLocationConsistency(
        context
    );
}


/* =========================================================
 * Cross-location consistency
 * ========================================================= */


function validateCrossLocationConsistency(
    context
) {

    const eventContext =
        isPlainObject(
            context.event.context
        )
            ? context.event.context
            : {};

    const payload =
        isPlainObject(
            context.event.payload
        )
            ? context.event.payload
            : {};

    const correlation =
        isPlainObject(
            context.event.correlation
        )
            ? context.event.correlation
            : {};


    /*
     * remediationId may appear in both context
     * and correlation.
     */
    if (
        isNonEmptyString(
            eventContext.remediationId
        ) &&
        isNonEmptyString(
            correlation.remediationId
        ) &&
        eventContext.remediationId !==
        correlation.remediationId
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/correlation/remediationId",
            correlation.remediationId,
            eventContext.remediationId,
            "context.remediationId and correlation.remediationId must match when both are present."
        );
    }


    /*
     * decisionId may appear in both context
     * and correlation.
     */
    if (
        isNonEmptyString(
            eventContext.decisionId
        ) &&
        isNonEmptyString(
            correlation.decisionId
        ) &&
        eventContext.decisionId !==
        correlation.decisionId
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/correlation/decisionId",
            correlation.decisionId,
            eventContext.decisionId,
            "context.decisionId and correlation.decisionId must match when both are present."
        );
    }


    /*
     * Context and payload action describe the
     * same canonical action when both are present.
     */
    if (
        isNonEmptyString(
            eventContext.action
        ) &&
        isNonEmptyString(
            payload.action
        ) &&
        eventContext.action !==
        payload.action
    ) {

        addIssue(
            context,
            "CONTRACT_ACTION_MISMATCH",
            "/payload/action",
            payload.action,
            eventContext.action,
            "context.action and payload.action must match when both are present."
        );
    }


    /*
     * metaSkillId may appear in context and
     * payload. They must agree.
     */
    if (
        isNonEmptyString(
            eventContext.metaSkillId
        ) &&
        isNonEmptyString(
            payload.metaSkillId
        ) &&
        eventContext.metaSkillId !==
        payload.metaSkillId
    ) {

        addIssue(
            context,
            "CONTRACT_SKILL_REFERENCE_MISMATCH",
            "/payload/metaSkillId",
            payload.metaSkillId,
            eventContext.metaSkillId,
            "context.metaSkillId and payload.metaSkillId must match when both are present."
        );
    }
}


/* =========================================================
 * Semantic requirement helpers
 * ========================================================= */


function requireContextField(
    context,
    field,
    eventType
) {

    const value =
        context.event.context?.[field];


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            `/context/${field}`,
            undefined,
            field,
            `${eventType} requires context.${field}.`
        );
    }
}


function requirePayloadField(
    context,
    field,
    eventType
) {

    const value =
        context.event.payload?.[field];


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            `/payload/${field}`,
            undefined,
            field,
            `${eventType} requires payload.${field}.`
        );
    }
}


function requireCorrelationField(
    context,
    field,
    eventType
) {

    const value =
        context.event
            .correlation?.[field];


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            `/correlation/${field}`,
            undefined,
            field,
            `${eventType} requires correlation.${field}.`
        );
    }
}


function requirePayloadExact(
    context,
    field,
    expected,
    eventType
) {

    const payload =
        context.event.payload;

    const actual =
        payload?.[field];


    if (actual === undefined) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            `/payload/${field}`,
            undefined,
            expected,
            `${eventType} requires payload.${field} = ${JSON.stringify(expected)}.`
        );

        return;
    }


    if (actual !== expected) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            `/payload/${field}`,
            actual,
            expected,
            `${eventType} requires payload.${field} = ${JSON.stringify(expected)}.`
        );
    }
}


function requireRemediationIdentifier(
    context,
    eventType
) {

    const fromContext =
        context.event.context
            ?.remediationId;

    const fromCorrelation =
        context.event.correlation
            ?.remediationId;


    if (
        !isNonEmptyString(fromContext) &&
        !isNonEmptyString(fromCorrelation)
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/context/remediationId",
            undefined,
            "context.remediationId or correlation.remediationId",
            `${eventType} requires a remediation identifier.`
        );
    }
}


function requireDecisionIdentifier(
    context,
    eventType
) {

    const fromContext =
        context.event.context
            ?.decisionId;

    const fromCorrelation =
        context.event.correlation
            ?.decisionId;


    if (
        !isNonEmptyString(fromContext) &&
        !isNonEmptyString(fromCorrelation)
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/context/decisionId",
            undefined,
            "context.decisionId or correlation.decisionId",
            `${eventType} requires a decision identifier.`
        );
    }
}


function requireMetaSkill(
    context,
    eventType
) {

    const fromContext =
        context.event.context
            ?.metaSkillId;

    const fromPayload =
        context.event.payload
            ?.metaSkillId;


    if (
        !isNonEmptyString(fromContext) &&
        !isNonEmptyString(fromPayload)
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/context/metaSkillId",
            undefined,
            "context.metaSkillId or payload.metaSkillId",
            `${eventType} requires a meta-skill identifier.`
        );
    }
}


/* =========================================================
 * Canonical reference helpers
 * ========================================================= */


function validateNodeReference(
    context,
    nodeId,
    path
) {

    if (nodeId === undefined) {
        return;
    }


    if (
        !isNonEmptyString(nodeId) ||
        !/^K[0-9]+$/.test(nodeId)
    ) {

        return;
    }


    if (
        context.hasKnowledgeMap &&
        !context.indexes.nodeIds.has(
            nodeId
        )
    ) {

        addIssue(
            context,
            "KNOWLEDGE_NODE_NOT_FOUND",
            path,
            nodeId,
            "existing Knowledge Map node ID",
            `Knowledge node '${nodeId}' does not exist in Knowledge Map.`
        );
    }
}


function validateSkillReference(
    context,
    skillId,
    path
) {

    if (skillId === undefined) {
        return;
    }


    if (
        !isNonEmptyString(skillId) ||
        !/^S[0-9]+$/.test(skillId)
    ) {

        return;
    }


    if (
        context.hasKnowledgeMap &&
        context.indexes.skillIds.size > 0 &&
        !context.indexes.skillIds.has(
            skillId
        )
    ) {

        addIssue(
            context,
            "KNOWLEDGE_SKILL_NOT_FOUND",
            path,
            skillId,
            "existing canonical skill ID",
            `Meta-skill '${skillId}' does not exist in Knowledge Map.`
        );
    }
}


function validateQuestionReference(
    context,
    questionId,
    path
) {

    if (
        questionId === undefined ||
        !isNonEmptyString(questionId)
    ) {
        return;
    }


    if (
        context.hasQuestions &&
        !context.indexes.questionIds.has(
            questionId
        )
    ) {

        addIssue(
            context,
            "QUESTION_NODE_NOT_FOUND",
            path,
            questionId,
            "existing Question ID",
            `Question '${questionId}' does not exist in the supplied Question registry.`
        );
    }
}


function validateFailureSignatureReference(
    context,
    signatureId,
    path
) {

    if (
        signatureId === undefined ||
        !isNonEmptyString(signatureId)
    ) {
        return;
    }


    if (
        context.hasFailureRegistry &&
        !context.indexes
            .failureSignatureIds
            .has(signatureId)
    ) {

        addIssue(
            context,
            "FAILURE_SIGNATURE_NOT_FOUND",
            path,
            signatureId,
            "existing canonical failure signature ID",
            `Failure signature '${signatureId}' does not exist in the canonical registry.`
        );
    }
}


/* =========================================================
 * Generic validation helpers
 * ========================================================= */


function validateOptionalNodeFormat(
    context,
    value,
    path
) {

    if (value === undefined) {
        return;
    }


    if (
        !isNonEmptyString(value) ||
        !/^K[0-9]+$/.test(value)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "knowledge node ID matching ^K[0-9]+$",
            `${path} must contain a valid Knowledge Node ID.`
        );
    }
}


function validateOptionalSkillFormat(
    context,
    value,
    path
) {

    if (value === undefined) {
        return;
    }


    if (
        !isNonEmptyString(value) ||
        !/^S[0-9]+$/.test(value)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "meta-skill ID matching ^S[0-9]+$",
            `${path} must contain a valid meta-skill ID.`
        );
    }
}


function validateNodeIdArray(
    context,
    value,
    path
) {

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


    const seen = new Set();


    value.forEach(
        (nodeId, index) => {

            const itemPath =
                `${path}/${index}`;


            if (
                !isNonEmptyString(nodeId) ||
                !/^K[0-9]+$/.test(nodeId)
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    itemPath,
                    nodeId,
                    "knowledge node ID matching ^K[0-9]+$",
                    `Invalid knowledge node ID '${nodeId}'.`
                );

                return;
            }


            if (seen.has(nodeId)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    itemPath,
                    nodeId,
                    "unique node reference",
                    `Duplicate node '${nodeId}'.`
                );

            } else {

                seen.add(nodeId);
            }
        }
    );
}


function validateEnum(
    context,
    value,
    allowed,
    path
) {

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
            `Invalid value '${value}'.`
        );
    }
}


function validateNumberRange(
    context,
    value,
    min,
    max,
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
            "number",
            `${path} must be a number.`
        );

        return;
    }


    if (
        value < min ||
        value > max
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            `${min}..${max}`,
            `${path} must be between ${min} and ${max}.`
        );
    }
}


function validateIntegerRange(
    context,
    value,
    min,
    max,
    path
) {

    if (!Number.isInteger(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "integer",
            `${path} must be an integer.`
        );

        return;
    }


    if (
        value < min ||
        value > max
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            `${min}..${max}`,
            `${path} must be between ${min} and ${max}.`
        );
    }
}


function validatePositiveInteger(
    context,
    value,
    path
) {

    if (
        !Number.isInteger(value) ||
        value < 1
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "integer >= 1",
            `${path} must be a positive integer.`
        );
    }
}


function validateNonNegativeInteger(
    context,
    value,
    path
) {

    if (
        !Number.isInteger(value) ||
        value < 0
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "integer >= 0",
            `${path} must be a non-negative integer.`
        );
    }
}


function validateBoolean(
    context,
    value,
    path
) {

    if (typeof value !== "boolean") {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "boolean",
            `${path} must be boolean.`
        );
    }
}


function validateNonEmptyStringField(
    context,
    object,
    field,
    path
) {

    if (!(field in object)) {
        return;
    }


    if (!isNonEmptyString(object[field])) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            object[field],
            "non-empty string",
            `${path} must be a non-empty string.`
        );
    }
}


function validateOptionalNonEmptyString(
    context,
    value,
    path
) {

    if (value === undefined) {
        return;
    }


    if (!isNonEmptyString(value)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "non-empty string",
            `${path} must be a non-empty string.`
        );
    }
}


function validateRequiredFields(
    context,
    object,
    fields,
    basePath
) {

    if (!isPlainObject(object)) {
        return;
    }


    for (const field of fields) {

        if (
            !Object.prototype
                .hasOwnProperty
                .call(
                    object,
                    field
                )
        ) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `${basePath}/${escapePointer(field)}`,
                undefined,
                field,
                `Required field '${field}' is missing.`
            );
        }
    }
}


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
        const field
        of Object.keys(object)
    ) {

        if (!allowedFields.has(field)) {

            addIssue(
                context,
                "UNKNOWN_FIELD",
                `${basePath}/${escapePointer(field)}`,
                object[field],
                [...allowedFields],
                `Unknown field '${field}'.`
            );
        }
    }
}


/* =========================================================
 * Report
 * ========================================================= */


function addIssue(
    context,
    code,
    path,
    value,
    expected,
    message
) {

    const metadata =
        getErrorMetadata(
            context,
            code
        );


    const issue = {

        code,

        severity:
            metadata.severity,

        category:
            metadata.category,

        path:
            path === ""
                ? null
                : path,

        message
    };


    if (value !== undefined) {
        issue.value = value;
    }


    if (expected !== undefined) {
        issue.expected = expected;
    }


    context.issues.push(issue);
}


function getErrorMetadata(
    context,
    code
) {

    const external =
        context.errorRegistry;


    if (external) {

        const candidate =
            external.codes?.[code] ??
            external[code];


        if (
            candidate &&
            typeof candidate.severity
            === "string" &&
            typeof candidate.category
            === "string"
        ) {

            return {
                severity:
                    candidate.severity,

                category:
                    candidate.category
            };
        }
    }


    const fallback =
        FALLBACK_ERROR_METADATA[code];


    if (fallback) {
        return fallback;
    }


    throw new Error(
        `EventValidator attempted to emit unregistered error code '${code}'.`
    );
}


function buildReport(
    context,
    startedAt
) {

    const durationMs =
        Date.now() - startedAt;


    const errorCount =
        context.issues.filter(
            issue =>
                issue.severity === "error"
        ).length;


    const warningCount =
        context.issues.filter(
            issue =>
                issue.severity === "warning"
        ).length;


    const infoCount =
        context.issues.filter(
            issue =>
                issue.severity === "info"
        ).length;


    return {

        schemaVersion:
            "1.0.0",

        validationId:
            createValidationId(),

        validator: {
            name:
                VALIDATOR_NAME,

            version:
                VALIDATOR_VERSION
        },

        target: {
            type:
                "event",

            id:
                isPlainObject(
                    context.event
                ) &&
                    isNonEmptyString(
                        context.event.eventId
                    )
                    ? context.event.eventId
                    : null,

            path:
                context.options.path ??
                null
        },

        valid:
            errorCount === 0,

        summary: {
            errorCount,
            warningCount,
            infoCount
        },

        issues:
            context.issues,

        metadata: {
            validatedAt:
                new Date()
                    .toISOString(),

            durationMs,

            environment:
                context.options.environment ??
                "test"
        }
    };
}


/* =========================================================
 * Utilities
 * ========================================================= */


function createValidationId() {

    return (
        "VAL-EVENT-" +
        Date.now()
            .toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );
}


function isPlainObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function isNonEmptyString(
    value
) {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}


function isDateTime(
    value
) {

    return (
        typeof value === "string" &&
        value.trim().length > 0 &&
        Number.isFinite(
            Date.parse(value)
        )
    );
}


function escapePointer(
    value
) {

    return String(value)
        .replace(
            /~/g,
            "~0"
        )
        .replace(
            /\//g,
            "~1"
        );
}