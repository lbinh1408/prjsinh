/*
 * studentStateValidator.js
 *
 * Phase 1 — Data Validation Layer
 *
 * Responsibility:
 *
 *   READ → CHECK → REPORT
 *
 * This validator checks:
 *
 *   1. Basic Student State structure
 *   2. Canonical enum/range constraints
 *   3. Knowledge/meta-skill references
 *   4. Failure signature references
 *   5. Cross-field consistency
 *   6. Runtime/adaptive/remediation references
 *   7. Progress arithmetic consistency
 *
 * This validator MUST NOT:
 *
 *   - calculate mastery
 *   - calculate evidence
 *   - calculate confidence
 *   - promote/downgrade mastery
 *   - diagnose failure
 *   - choose remediation
 *   - choose next action
 *   - schedule review/retest
 *   - rebuild Student State
 *   - mutate input
 *
 * Student State is a runtime snapshot.
 * It stores projections/output produced by other engines.
 */


const VALIDATOR_NAME =
    "student-state-validator";

const VALIDATOR_VERSION =
    "1.0.0";

const STATE_SCHEMA_VERSION =
    "1.1.0";


/* =========================================================
 * Canonical enums
 * ========================================================= */


const STATE_TYPES = new Set([
    "runtime"
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


const CONFIDENCE_LEVELS = new Set([
    "low",
    "medium",
    "high"
]);


const EVIDENCE_DIMENSIONS = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);


const DIFFICULTIES = new Set([
    "D1",
    "D2",
    "D3",
    "D4",
    "D5"
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


const FATIGUE_LEVELS = new Set([
    "normal",
    "elevated",
    "high"
]);


const CLUSTER_STATUSES = new Set([
    "not_started",
    "in_progress",
    "mastered",
    "stable"
]);


const REMEDIATION_RESULT_STATUSES =
    new Set([
        "completed",
        "failed",
        "cancelled"
    ]);


const REMEDIATION_PLAN_STATUSES =
    new Set([
        "pending",
        "active",
        "paused"
    ]);


/* =========================================================
 * Field registries
 *
 * Used to enforce additionalProperties:false behavior
 * without requiring an external JSON Schema library.
 * ========================================================= */


const ROOT_FIELDS = new Set([
    "schemaVersion",
    "stateId",
    "stateType",
    "updatedAt",
    "student",
    "learning",
    "knowledge",
    "metaSkills",
    "failurePatterns",
    "remediation",
    "adaptive",
    "history",
    "progress",
    "preferences"
]);


const STUDENT_FIELDS = new Set([
    "studentId",
    "displayName",
    "grade",
    "curriculum",
    "target"
]);


const TARGET_FIELDS = new Set([
    "mode",
    "exam",
    "subject"
]);


const LEARNING_FIELDS = new Set([
    "currentMode",
    "session",
    "current"
]);


const SESSION_FIELDS = new Set([
    "sessionId",
    "startedAt",
    "lastActivityAt",
    "timeBudgetMinutes",
    "timeUsedMinutes",
    "runtimeSignals",
    "fatigue"
]);


const RUNTIME_SIGNAL_FIELDS =
    new Set([
        "consecutiveWrong",
        "consecutiveSkip",
        "consecutiveRemediation"
    ]);


const FATIGUE_FIELDS = new Set([
    "level",
    "signals"
]);


const CURRENT_FIELDS = new Set([
    "clusterId",
    "lessonId",
    "nodeId",
    "action",
    "contextId"
]);


const KNOWLEDGE_STATE_FIELDS =
    new Set([
        "mastery",
        "status",
        "evidence",
        "overallEvidence",
        "confidence",
        "evidenceSufficiency",
        "attemptStats",
        "weakEvidence",
        "signals",
        "lastAttemptAt",
        "lastSuccessAt",
        "lastFailure",
        "failureSummary",
        "retest",
        "review"
    ]);


const EVIDENCE_FIELDS = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);


const EVIDENCE_SUFFICIENCY_FIELDS =
    new Set([
        "independentObservations",
        "distinctContexts",
        "observedEvidenceTypes"
    ]);


const KNOWLEDGE_ATTEMPT_FIELDS =
    new Set([
        "total",
        "correct",
        "wrong",
        "partial",
        "skipped"
    ]);


const KNOWLEDGE_FAILURE_FIELDS =
    new Set([
        "questionId",
        "failureSignatureId",
        "failureType",
        "sourceNodeId",
        "metaSkillId",
        "at"
    ]);


const FAILURE_SUMMARY_ITEM_FIELDS =
    new Set([
        "count",
        "sourceNodeId",
        "lastAt"
    ]);


const RETEST_FIELDS = new Set([
    "attempted",
    "lastRetestAt",
    "passed",
    "differentQuestion",
    "differentContext",
    "independent"
]);


const REVIEW_FIELDS = new Set([
    "lastReviewedAt"
]);


const META_SKILL_FIELDS = new Set([
    "mastery",
    "status",
    "evidence",
    "confidence",
    "attemptStats",
    "weak",
    "signals",
    "lastFailure"
]);


const META_SKILL_ATTEMPT_FIELDS =
    new Set([
        "total",
        "wrong"
    ]);


const META_SKILL_FAILURE_FIELDS =
    new Set([
        "questionId",
        "failureSignatureId",
        "failureType",
        "at"
    ]);


const FAILURE_PATTERNS_FIELDS =
    new Set([
        "active"
    ]);


const FAILURE_PATTERN_FIELDS =
    new Set([
        "failureSignatureId",
        "failureType",
        "nodeId",
        "sourceNodeId",
        "metaSkillId",
        "count",
        "lastAt"
    ]);


const REMEDIATION_FIELDS = new Set([
    "lastResult",
    "activePlan"
]);


const REMEDIATION_RESULT_FIELDS =
    new Set([
        "targetNodeId",
        "sourceNodeId",
        "triggerNodeId",
        "failureSignatureId",
        "failureType",
        "status",
        "completedAt"
    ]);


const REMEDIATION_PLAN_FIELDS =
    new Set([
        "planId",
        "targetNodeId",
        "sourceNodeId",
        "triggerNodeId",
        "failureSignatureId",
        "failureType",
        "status"
    ]);


const ADAPTIVE_FIELDS = new Set([
    "lastDecision",
    "nextAction"
]);


const ADAPTIVE_DECISION_FIELDS =
    new Set([
        "action",
        "nodeId",
        "reasonCodes",
        "at"
    ]);


const NEXT_ACTION_FIELDS =
    new Set([
        "action",
        "nodeId",
        "priority",
        "constraints",
        "decidedAt"
    ]);


const CONSTRAINT_FIELDS = new Set([
    "difficulty",
    "evidence"
]);


const HISTORY_FIELDS = new Set([
    "recentActions",
    "recentQuestions"
]);


const RECENT_ACTION_FIELDS =
    new Set([
        "action",
        "nodeId",
        "at"
    ]);


const PROGRESS_FIELDS = new Set([
    "nodes",
    "clusters"
]);


const NODE_PROGRESS_FIELDS =
    new Set([
        "total",
        "unstarted",
        "developing",
        "mastered",
        "stable"
    ]);


const CLUSTER_PROGRESS_FIELDS =
    new Set([
        "status",
        "progress"
    ]);


const PREFERENCE_FIELDS = new Set([
    "preferredSessionLength",
    "preferredDifficulty",
    "allowChallenge",
    "allowSkipKnown",
    "showDetailedFeedback"
]);


/* =========================================================
 * Error metadata
 *
 * Only canonical Phase-1 registry codes are used.
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


    STATE_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    STATE_INVALID_MASTERY: {
        severity: "error",
        category: "contract"
    },

    STATE_INVALID_STATUS: {
        severity: "error",
        category: "contract"
    },

    STATE_INVALID_EVIDENCE: {
        severity: "error",
        category: "contract"
    },

    STATE_INVALID_CONFIDENCE: {
        severity: "error",
        category: "contract"
    },

    STATE_FAILURE_SIGNATURE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    STATE_SOURCE_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    STATE_INVALID_CURRENT_NODE: {
        severity: "error",
        category: "reference"
    },

    STATE_INVALID_CURRENT_ACTION: {
        severity: "error",
        category: "contract"
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


/**
 * Validate Student State.
 *
 * @param {object} studentState
 *
 * @param {object} options
 *
 * Supported options:
 *
 * {
 *   knowledgeMap,
 *   failureRegistry,
 *   errorRegistry,
 *   path
 * }
 *
 * knowledgeMap:
 *   Used only for reference validation.
 *
 * failureRegistry:
 *   Used only for failureSignatureId validation.
 *
 * errorRegistry:
 *   Optional canonical validation/error-codes.json.
 *
 * path:
 *   Optional target path for validation report.
 */
export function validateStudentState(
    studentState,
    options = {}
) {

    const startedAt =
        Date.now();


    const context = createContext(
        studentState,
        options
    );


    validateRoot(
        context
    );


    /*
     * If root itself is not an object,
     * nested validation cannot continue.
     */
    if (!isPlainObject(studentState)) {

        return buildReport(
            context,
            startedAt
        );
    }


    validateStudent(
        context
    );

    validateLearning(
        context
    );

    validateKnowledge(
        context
    );

    validateMetaSkills(
        context
    );

    validateFailurePatterns(
        context
    );

    validateRemediation(
        context
    );

    validateAdaptive(
        context
    );

    validateHistory(
        context
    );

    validateProgress(
        context
    );

    validatePreferences(
        context
    );


    /*
     * Cross-section invariants.
     *
     * These checks verify stored projections.
     * They DO NOT calculate new engine outputs.
     */
    validateCrossStateConsistency(
        context
    );


    return buildReport(
        context,
        startedAt
    );
}


/* =========================================================
 * Context / indexes
 * ========================================================= */


function createContext(
    studentState,
    options
) {

    const knowledgeMap =
        options.knowledgeMap ?? null;

    const failureRegistry =
        options.failureRegistry ?? null;


    return {

        state:
            studentState,

        options,

        issues: [],

        errorRegistry:
            options.errorRegistry ?? null,

        indexes: {

            knowledgeNodeIds:
                buildKnowledgeNodeIndex(
                    knowledgeMap
                ),

            clusterIds:
                buildClusterIndex(
                    knowledgeMap
                ),

            skillIds:
                buildSkillIndex(
                    knowledgeMap
                ),

            failureSignatureIds:
                buildFailureRegistryIndex(
                    failureRegistry
                )
        },

        hasKnowledgeMap:
            knowledgeMap !== null,

        hasFailureRegistry:
            failureRegistry !== null
    };
}


function buildKnowledgeNodeIndex(
    knowledgeMap
) {

    const result =
        new Set();


    if (!knowledgeMap) {
        return result;
    }


    const nodes =
        Array.isArray(
            knowledgeMap.nodes
        )
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (
            isPlainObject(node) &&
            typeof node.id === "string"
        ) {

            result.add(
                node.id
            );
        }
    }


    return result;
}


function buildClusterIndex(
    knowledgeMap
) {

    const result =
        new Set();


    if (!knowledgeMap) {
        return result;
    }


    const clusters =
        Array.isArray(
            knowledgeMap.clusters
        )
            ? knowledgeMap.clusters
            : [];


    for (const cluster of clusters) {

        if (
            isPlainObject(cluster) &&
            typeof cluster.id === "string"
        ) {

            result.add(
                cluster.id
            );
        }
    }


    /*
     * Defensive support:
     *
     * If cluster definitions are not stored
     * separately but nodes contain clusterId,
     * those IDs may still be indexed.
     */
    const nodes =
        Array.isArray(
            knowledgeMap.nodes
        )
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (
            isPlainObject(node) &&
            typeof node.clusterId === "string"
        ) {

            result.add(
                node.clusterId
            );
        }
    }


    return result;
}


function buildSkillIndex(
    knowledgeMap
) {

    const result =
        new Set();


    if (!knowledgeMap) {
        return result;
    }


    /*
     * Common possible canonical containers.
     *
     * This does not invent skills.
     * It only indexes explicitly declared IDs.
     */
    const collections = [
        knowledgeMap.skills,
        knowledgeMap.metaSkills
    ];


    for (const collection of collections) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const item of collection) {

            if (
                isPlainObject(item) &&
                typeof item.id === "string"
            ) {

                result.add(
                    item.id
                );
            }
        }
    }


    /*
     * Skills may also be explicitly referenced
     * by knowledge nodes.
     */
    const nodes =
        Array.isArray(
            knowledgeMap.nodes
        )
            ? knowledgeMap.nodes
            : [];


    for (const node of nodes) {

        if (!isPlainObject(node)) {
            continue;
        }


        const skills =
            Array.isArray(node.skills)
                ? node.skills
                : [];


        for (const skillId of skills) {

            if (typeof skillId === "string") {

                result.add(
                    skillId
                );
            }
        }
    }


    return result;
}


function buildFailureRegistryIndex(
    failureRegistry
) {

    const result =
        new Set();


    if (!failureRegistry) {
        return result;
    }


    /*
     * Support common registry forms:
     *
     * [
     *   { id: "FS-..." }
     * ]
     *
     * {
     *   signatures: [...]
     * }
     *
     * {
     *   failureSignatures: [...]
     * }
     */
    let collection = null;


    if (Array.isArray(failureRegistry)) {

        collection =
            failureRegistry;

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

        if (
            isPlainObject(item) &&
            typeof item.id === "string"
        ) {

            result.add(
                item.id
            );

        } else if (
            typeof item === "string"
        ) {

            result.add(
                item
            );
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

    const state =
        context.state;


    if (!isPlainObject(state)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "",
            state,
            "object",
            "Student State must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        state,
        ROOT_FIELDS,
        ""
    );


    const required = [
        "schemaVersion",
        "stateId",
        "stateType",
        "updatedAt",
        "student",
        "learning",
        "knowledge",
        "metaSkills",
        "failurePatterns",
        "remediation",
        "adaptive",
        "history",
        "progress",
        "preferences"
    ];


    validateRequiredFields(
        context,
        state,
        required,
        ""
    );


    if (
        "schemaVersion" in state &&
        state.schemaVersion !==
        STATE_SCHEMA_VERSION
    ) {

        addIssue(
            context,
            "CONTRACT_VERSION_INCOMPATIBLE",
            "/schemaVersion",
            state.schemaVersion,
            STATE_SCHEMA_VERSION,
            `Student State schemaVersion must be '${STATE_SCHEMA_VERSION}'.`
        );
    }


    if (
        "stateId" in state &&
        !isNonEmptyString(
            state.stateId
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/stateId",
            state.stateId,
            "non-empty string",
            "stateId must be a non-empty string."
        );
    }


    if (
        "stateType" in state
    ) {

        validateEnum(
            context,
            state.stateType,
            STATE_TYPES,
            "/stateType"
        );
    }


    validateDateTimeIfPresent(
        context,
        state.updatedAt,
        "/updatedAt"
    );
}


/* =========================================================
 * Student
 * ========================================================= */


function validateStudent(
    context
) {

    const student =
        context.state.student;


    if (!isPlainObject(student)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/student",
            student,
            "object",
            "student must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        student,
        STUDENT_FIELDS,
        "/student"
    );


    validateRequiredFields(
        context,
        student,
        [
            "studentId"
        ],
        "/student"
    );


    if (
        "studentId" in student &&
        !isNonEmptyString(
            student.studentId
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/student/studentId",
            student.studentId,
            "non-empty string",
            "student.studentId must be a non-empty string."
        );
    }


    if (
        "grade" in student &&
        (
            !Number.isInteger(
                student.grade
            ) ||
            student.grade < 1 ||
            student.grade > 12
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/student/grade",
            student.grade,
            "integer 1..12",
            "student.grade must be an integer between 1 and 12."
        );
    }


    if (
        "target" in student
    ) {

        validateStudentTarget(
            context,
            student.target
        );
    }
}


function validateStudentTarget(
    context,
    target
) {

    if (!isPlainObject(target)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/student/target",
            target,
            "object",
            "student.target must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        target,
        TARGET_FIELDS,
        "/student/target"
    );


    if (
        "mode" in target
    ) {

        validateEnum(
            context,
            target.mode,
            LEARNING_MODES,
            "/student/target/mode"
        );
    }
}


/* =========================================================
 * Learning runtime
 * ========================================================= */


function validateLearning(
    context
) {

    const learning =
        context.state.learning;


    if (!isPlainObject(learning)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/learning",
            learning,
            "object",
            "learning must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        learning,
        LEARNING_FIELDS,
        "/learning"
    );


    validateRequiredFields(
        context,
        learning,
        [
            "currentMode",
            "session",
            "current"
        ],
        "/learning"
    );


    if (
        "currentMode" in learning
    ) {

        validateEnum(
            context,
            learning.currentMode,
            LEARNING_MODES,
            "/learning/currentMode"
        );
    }


    validateSession(
        context,
        learning.session
    );


    validateCurrentLearningContext(
        context,
        learning.current
    );
}


function validateSession(
    context,
    session
) {

    if (!isPlainObject(session)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/learning/session",
            session,
            "object",
            "learning.session must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        session,
        SESSION_FIELDS,
        "/learning/session"
    );


    validateRequiredFields(
        context,
        session,
        [
            "sessionId",
            "startedAt",
            "lastActivityAt",
            "timeBudgetMinutes",
            "timeUsedMinutes",
            "runtimeSignals",
            "fatigue"
        ],
        "/learning/session"
    );


    validateDateTimeIfPresent(
        context,
        session.startedAt,
        "/learning/session/startedAt"
    );


    validateDateTimeIfPresent(
        context,
        session.lastActivityAt,
        "/learning/session/lastActivityAt"
    );


    validateNonNegativeIntegerIfPresent(
        context,
        session.timeBudgetMinutes,
        "/learning/session/timeBudgetMinutes"
    );


    validateNonNegativeIntegerIfPresent(
        context,
        session.timeUsedMinutes,
        "/learning/session/timeUsedMinutes"
    );


    /*
     * Pure consistency check:
     *
     * lastActivityAt cannot be earlier
     * than startedAt.
     */
    if (
        isValidDateTime(
            session.startedAt
        ) &&
        isValidDateTime(
            session.lastActivityAt
        ) &&
        Date.parse(
            session.lastActivityAt
        ) <
        Date.parse(
            session.startedAt
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/learning/session/lastActivityAt",
            session.lastActivityAt,
            ">= startedAt",
            "Session lastActivityAt cannot be earlier than startedAt."
        );
    }


    validateRuntimeSignals(
        context,
        session.runtimeSignals
    );


    validateFatigue(
        context,
        session.fatigue
    );
}


function validateRuntimeSignals(
    context,
    signals
) {

    if (!isPlainObject(signals)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/learning/session/runtimeSignals",
            signals,
            "object",
            "runtimeSignals must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        signals,
        RUNTIME_SIGNAL_FIELDS,
        "/learning/session/runtimeSignals"
    );


    validateRequiredFields(
        context,
        signals,
        [
            "consecutiveWrong",
            "consecutiveSkip",
            "consecutiveRemediation"
        ],
        "/learning/session/runtimeSignals"
    );


    for (
        const field
        of RUNTIME_SIGNAL_FIELDS
    ) {

        if (field in signals) {

            validateNonNegativeIntegerIfPresent(
                context,
                signals[field],
                `/learning/session/runtimeSignals/${field}`
            );
        }
    }
}


function validateFatigue(
    context,
    fatigue
) {

    if (!isPlainObject(fatigue)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/learning/session/fatigue",
            fatigue,
            "object",
            "fatigue must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        fatigue,
        FATIGUE_FIELDS,
        "/learning/session/fatigue"
    );


    validateRequiredFields(
        context,
        fatigue,
        [
            "level",
            "signals"
        ],
        "/learning/session/fatigue"
    );


    if ("level" in fatigue) {

        validateEnum(
            context,
            fatigue.level,
            FATIGUE_LEVELS,
            "/learning/session/fatigue/level"
        );
    }


    validateStringArrayIfPresent(
        context,
        fatigue.signals,
        "/learning/session/fatigue/signals",
        true
    );
}


function validateCurrentLearningContext(
    context,
    current
) {

    if (!isPlainObject(current)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/learning/current",
            current,
            "object",
            "learning.current must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        current,
        CURRENT_FIELDS,
        "/learning/current"
    );


    validateRequiredFields(
        context,
        current,
        [
            "clusterId",
            "lessonId",
            "nodeId",
            "action",
            "contextId"
        ],
        "/learning/current"
    );


    if (
        current.nodeId !== null &&
        current.nodeId !== undefined
    ) {

        validateNodeReference(
            context,
            current.nodeId,
            "/learning/current/nodeId",
            "STATE_INVALID_CURRENT_NODE"
        );
    }


    if (
        current.clusterId !== null &&
        current.clusterId !== undefined
    ) {

        validateClusterReference(
            context,
            current.clusterId,
            "/learning/current/clusterId"
        );
    }


    if (
        current.action !== null &&
        current.action !== undefined
    ) {

        if (
            typeof current.action !== "string" ||
            !ACTIONS.has(
                current.action
            )
        ) {

            addIssue(
                context,
                "STATE_INVALID_CURRENT_ACTION",
                "/learning/current/action",
                current.action,
                [...ACTIONS],
                `Invalid current action '${current.action}'.`
            );
        }
    }
}


/* =========================================================
 * Knowledge state
 * ========================================================= */


function validateKnowledge(
    context
) {

    const knowledge =
        context.state.knowledge;


    if (!isPlainObject(knowledge)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/knowledge",
            knowledge,
            "object",
            "knowledge must be an object."
        );

        return;
    }


    for (
        const [
            nodeId,
            nodeState
        ]
        of Object.entries(
            knowledge
        )
    ) {

        const basePath =
            `/knowledge/${escapePointer(nodeId)}`;


        if (
            !/^K[0-9]+$/.test(
                nodeId
            )
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                basePath,
                nodeId,
                "knowledge node ID matching ^K[0-9]+$",
                `Invalid knowledge node key '${nodeId}'.`
            );
        }


        validateNodeReference(
            context,
            nodeId,
            basePath,
            "STATE_NODE_NOT_FOUND"
        );


        validateKnowledgeState(
            context,
            nodeId,
            nodeState,
            basePath
        );
    }
}


function validateKnowledgeState(
    context,
    nodeId,
    state,
    basePath
) {

    if (!isPlainObject(state)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            basePath,
            state,
            "object",
            `Knowledge state '${nodeId}' must be an object.`
        );

        return;
    }


    validateUnknownFields(
        context,
        state,
        KNOWLEDGE_STATE_FIELDS,
        basePath
    );


    validateRequiredFields(
        context,
        state,
        [
            "mastery",
            "status",
            "evidence",
            "overallEvidence",
            "confidence",
            "evidenceSufficiency",
            "attemptStats",
            "weakEvidence",
            "signals",
            "lastAttemptAt",
            "lastSuccessAt",
            "lastFailure",
            "retest",
            "review"
        ],
        basePath
    );


    if (
        "mastery" in state &&
        (
            typeof state.mastery !== "string" ||
            !MASTERY_LEVELS.has(
                state.mastery
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_MASTERY",
            `${basePath}/mastery`,
            state.mastery,
            [...MASTERY_LEVELS],
            `Invalid mastery '${state.mastery}' for node '${nodeId}'.`
        );
    }


    if (
        "status" in state &&
        (
            typeof state.status !== "string" ||
            !MASTERY_STATUSES.has(
                state.status
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_STATUS",
            `${basePath}/status`,
            state.status,
            [...MASTERY_STATUSES],
            `Invalid status '${state.status}' for node '${nodeId}'.`
        );
    }


    validateEvidenceVector(
        context,
        state.evidence,
        `${basePath}/evidence`
    );


    validateEvidenceValue(
        context,
        state.overallEvidence,
        `${basePath}/overallEvidence`
    );


    if (
        "confidence" in state &&
        (
            typeof state.confidence !== "string" ||
            !CONFIDENCE_LEVELS.has(
                state.confidence
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_CONFIDENCE",
            `${basePath}/confidence`,
            state.confidence,
            [...CONFIDENCE_LEVELS],
            `Invalid confidence '${state.confidence}' for node '${nodeId}'.`
        );
    }


    validateEvidenceSufficiency(
        context,
        state.evidenceSufficiency,
        `${basePath}/evidenceSufficiency`
    );


    validateKnowledgeAttemptStats(
        context,
        state.attemptStats,
        `${basePath}/attemptStats`
    );


    validateEvidenceDimensionArray(
        context,
        state.weakEvidence,
        `${basePath}/weakEvidence`
    );


    validateStringArrayIfPresent(
        context,
        state.signals,
        `${basePath}/signals`,
        true
    );


    validateNullableDateTime(
        context,
        state.lastAttemptAt,
        `${basePath}/lastAttemptAt`
    );


    validateNullableDateTime(
        context,
        state.lastSuccessAt,
        `${basePath}/lastSuccessAt`
    );


    validateKnowledgeFailure(
        context,
        state.lastFailure,
        `${basePath}/lastFailure`
    );


    if (
        "failureSummary" in state
    ) {

        validateFailureSummary(
            context,
            state.failureSummary,
            `${basePath}/failureSummary`
        );
    }


    validateRetest(
        context,
        state.retest,
        `${basePath}/retest`
    );


    validateReview(
        context,
        state.review,
        `${basePath}/review`
    );


    /*
     * Contract consistency:
     *
     * attemptStats.total must equal the sum
     * of stored result buckets.
     *
     * This does NOT recalculate attempts from
     * event history. It only checks internal
     * arithmetic consistency of the snapshot.
     */
    if (
        isPlainObject(
            state.attemptStats
        )
    ) {

        const stats =
            state.attemptStats;


        const values = [
            stats.correct,
            stats.wrong,
            stats.partial,
            stats.skipped
        ];


        if (
            Number.isInteger(
                stats.total
            ) &&
            values.every(
                Number.isInteger
            )
        ) {

            const sum =
                values.reduce(
                    (
                        total,
                        value
                    ) =>
                        total + value,
                    0
                );


            if (
                stats.total !== sum
            ) {

                addIssue(
                    context,
                    "SCHEMA_INVALID",
                    `${basePath}/attemptStats/total`,
                    stats.total,
                    sum,
                    `attemptStats.total for '${nodeId}' must equal correct + wrong + partial + skipped.`
                );
            }
        }
    }


    /*
     * Temporal consistency only.
     *
     * lastSuccessAt cannot be later than
     * lastAttemptAt.
     */
    if (
        isValidDateTime(
            state.lastAttemptAt
        ) &&
        isValidDateTime(
            state.lastSuccessAt
        ) &&
        Date.parse(
            state.lastSuccessAt
        ) >
        Date.parse(
            state.lastAttemptAt
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${basePath}/lastSuccessAt`,
            state.lastSuccessAt,
            "<= lastAttemptAt",
            `lastSuccessAt for '${nodeId}' cannot be later than lastAttemptAt.`
        );
    }
}


function validateEvidenceVector(
    context,
    evidence,
    path
) {

    if (!isPlainObject(evidence)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            evidence,
            "object",
            "Evidence vector must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        evidence,
        EVIDENCE_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        evidence,
        [
            "know",
            "explain",
            "apply",
            "transfer"
        ],
        path
    );


    for (
        const dimension
        of EVIDENCE_DIMENSIONS
    ) {

        if (
            dimension in evidence
        ) {

            validateEvidenceValue(
                context,
                evidence[dimension],
                `${path}/${dimension}`
            );
        }
    }
}


function validateEvidenceValue(
    context,
    value,
    path
) {

    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
    ) {

        addIssue(
            context,
            "STATE_INVALID_EVIDENCE",
            path,
            value,
            "number 0..1",
            "Evidence value must be between 0 and 1."
        );
    }
}


function validateEvidenceSufficiency(
    context,
    value,
    path
) {

    if (!isPlainObject(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "object",
            "evidenceSufficiency must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        value,
        EVIDENCE_SUFFICIENCY_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        value,
        [
            "independentObservations",
            "distinctContexts",
            "observedEvidenceTypes"
        ],
        path
    );


    validateNonNegativeIntegerIfPresent(
        context,
        value.independentObservations,
        `${path}/independentObservations`
    );


    validateNonNegativeIntegerIfPresent(
        context,
        value.distinctContexts,
        `${path}/distinctContexts`
    );


    validateEvidenceDimensionArray(
        context,
        value.observedEvidenceTypes,
        `${path}/observedEvidenceTypes`
    );
}


function validateKnowledgeAttemptStats(
    context,
    stats,
    path
) {

    if (!isPlainObject(stats)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            stats,
            "object",
            "attemptStats must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        stats,
        KNOWLEDGE_ATTEMPT_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        stats,
        [
            "total",
            "correct",
            "wrong",
            "partial",
            "skipped"
        ],
        path
    );


    for (
        const field
        of KNOWLEDGE_ATTEMPT_FIELDS
    ) {

        if (field in stats) {

            validateNonNegativeIntegerIfPresent(
                context,
                stats[field],
                `${path}/${field}`
            );
        }
    }
}


/* =========================================================
 * Failure
 * ========================================================= */


function validateKnowledgeFailure(
    context,
    failure,
    path
) {

    if (
        failure === null ||
        failure === undefined
    ) {
        return;
    }


    if (!isPlainObject(failure)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            failure,
            "object|null",
            "lastFailure must be an object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        failure,
        KNOWLEDGE_FAILURE_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        failure,
        [
            "questionId",
            "failureType",
            "sourceNodeId",
            "at"
        ],
        path
    );


    validateFailureType(
        context,
        failure.failureType,
        `${path}/failureType`
    );


    if (
        "failureSignatureId" in failure
    ) {

        validateFailureSignatureReference(
            context,
            failure.failureSignatureId,
            `${path}/failureSignatureId`
        );
    }


    if (
        failure.sourceNodeId !== null &&
        failure.sourceNodeId !== undefined
    ) {

        validateSourceNodeReference(
            context,
            failure.sourceNodeId,
            `${path}/sourceNodeId`
        );
    }


    if (
        failure.metaSkillId !== null &&
        failure.metaSkillId !== undefined
    ) {

        validateSkillReference(
            context,
            failure.metaSkillId,
            `${path}/metaSkillId`
        );
    }


    validateDateTimeIfPresent(
        context,
        failure.at,
        `${path}/at`
    );
}


function validateFailureSummary(
    context,
    summary,
    path
) {

    if (!isPlainObject(summary)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            summary,
            "object",
            "failureSummary must be an object."
        );

        return;
    }


    for (
        const [
            failureType,
            item
        ]
        of Object.entries(
            summary
        )
    ) {

        const itemPath =
            `${path}/${escapePointer(
                failureType
            )}`;


        validateFailureType(
            context,
            failureType,
            itemPath
        );


        if (!isPlainObject(item)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                itemPath,
                item,
                "object",
                "failureSummary item must be an object."
            );

            continue;
        }


        validateUnknownFields(
            context,
            item,
            FAILURE_SUMMARY_ITEM_FIELDS,
            itemPath
        );


        validateRequiredFields(
            context,
            item,
            [
                "count",
                "sourceNodeId",
                "lastAt"
            ],
            itemPath
        );


        if (
            !Number.isInteger(
                item.count
            ) ||
            item.count < 1
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                `${itemPath}/count`,
                item.count,
                "integer >= 1",
                "failureSummary count must be at least 1."
            );
        }


        if (
            item.sourceNodeId !== null &&
            item.sourceNodeId !== undefined
        ) {

            validateSourceNodeReference(
                context,
                item.sourceNodeId,
                `${itemPath}/sourceNodeId`
            );
        }


        validateDateTimeIfPresent(
            context,
            item.lastAt,
            `${itemPath}/lastAt`
        );
    }
}


function validateFailureType(
    context,
    value,
    path
) {

    if (
        typeof value !== "string" ||
        !FAILURE_TYPES.has(value)
    ) {

        addIssue(
            context,
            "INVALID_ENUM_VALUE",
            path,
            value,
            [...FAILURE_TYPES],
            `Invalid failureType '${value}'.`
        );
    }
}


function validateFailureSignatureReference(
    context,
    signatureId,
    path
) {

    if (!isNonEmptyString(signatureId)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            signatureId,
            "non-empty string",
            "failureSignatureId must be a non-empty string."
        );

        return;
    }


    /*
     * Important:
     *
     * Do NOT emit NOT_FOUND when no registry
     * was supplied.
     */
    if (
        context.hasFailureRegistry &&
        !context.indexes
            .failureSignatureIds
            .has(signatureId)
    ) {

        addIssue(
            context,
            "STATE_FAILURE_SIGNATURE_NOT_FOUND",
            path,
            signatureId,
            "existing canonical failure signature ID",
            `Failure signature '${signatureId}' does not exist in the canonical failure-signature registry.`
        );
    }
}


/* =========================================================
 * Retest / review
 * ========================================================= */


function validateRetest(
    context,
    retest,
    path
) {

    if (!isPlainObject(retest)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            retest,
            "object",
            "retest must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        retest,
        RETEST_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        retest,
        [
            "attempted",
            "lastRetestAt",
            "passed",
            "differentQuestion",
            "differentContext",
            "independent"
        ],
        path
    );


    for (
        const field
        of [
            "attempted",
            "passed",
            "differentQuestion",
            "differentContext",
            "independent"
        ]
    ) {

        if (
            field in retest &&
            typeof retest[field]
            !== "boolean"
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                `${path}/${field}`,
                retest[field],
                "boolean",
                `retest.${field} must be boolean.`
            );
        }
    }


    validateNullableDateTime(
        context,
        retest.lastRetestAt,
        `${path}/lastRetestAt`
    );


    /*
     * Observational consistency only.
     *
     * No scheduling or eligibility logic.
     */
    if (
        retest.attempted === false &&
        retest.lastRetestAt !== null
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            `${path}/lastRetestAt`,
            retest.lastRetestAt,
            null,
            "lastRetestAt must be null when no retest has been attempted."
        );
    }


    if (
        retest.attempted === false &&
        retest.passed === true
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            `${path}/passed`,
            retest.passed,
            false,
            "A retest cannot be marked passed when attempted=false."
        );
    }


    if (
        retest.attempted === true &&
        retest.lastRetestAt === null
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            `${path}/lastRetestAt`,
            null,
            "date-time",
            "lastRetestAt is required when attempted=true."
        );
    }
}


function validateReview(
    context,
    review,
    path
) {

    if (!isPlainObject(review)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            review,
            "object",
            "review must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        review,
        REVIEW_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        review,
        [
            "lastReviewedAt"
        ],
        path
    );


    validateNullableDateTime(
        context,
        review.lastReviewedAt,
        `${path}/lastReviewedAt`
    );
}


/* =========================================================
 * Meta skills
 * ========================================================= */


function validateMetaSkills(
    context
) {

    const metaSkills =
        context.state.metaSkills;


    if (!isPlainObject(metaSkills)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/metaSkills",
            metaSkills,
            "object",
            "metaSkills must be an object."
        );

        return;
    }


    for (
        const [
            skillId,
            skillState
        ]
        of Object.entries(
            metaSkills
        )
    ) {

        const path =
            `/metaSkills/${escapePointer(
                skillId
            )}`;


        if (
            !/^S[0-9]+$/.test(
                skillId
            )
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                path,
                skillId,
                "meta-skill ID matching ^S[0-9]+$",
                `Invalid meta-skill key '${skillId}'.`
            );
        }


        validateSkillReference(
            context,
            skillId,
            path
        );


        validateMetaSkillState(
            context,
            skillId,
            skillState,
            path
        );
    }
}


function validateMetaSkillState(
    context,
    skillId,
    state,
    path
) {

    if (!isPlainObject(state)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            state,
            "object",
            `Meta-skill '${skillId}' must be an object.`
        );

        return;
    }


    validateUnknownFields(
        context,
        state,
        META_SKILL_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        state,
        [
            "mastery",
            "status",
            "evidence",
            "confidence",
            "attemptStats",
            "weak",
            "signals",
            "lastFailure"
        ],
        path
    );


    if (
        "mastery" in state &&
        (
            typeof state.mastery !== "string" ||
            !MASTERY_LEVELS.has(
                state.mastery
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_MASTERY",
            `${path}/mastery`,
            state.mastery,
            [...MASTERY_LEVELS],
            `Invalid mastery for meta-skill '${skillId}'.`
        );
    }


    if (
        "status" in state &&
        (
            typeof state.status !== "string" ||
            !MASTERY_STATUSES.has(
                state.status
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_STATUS",
            `${path}/status`,
            state.status,
            [...MASTERY_STATUSES],
            `Invalid status for meta-skill '${skillId}'.`
        );
    }


    validateEvidenceValue(
        context,
        state.evidence,
        `${path}/evidence`
    );


    if (
        "confidence" in state &&
        (
            typeof state.confidence !== "string" ||
            !CONFIDENCE_LEVELS.has(
                state.confidence
            )
        )
    ) {

        addIssue(
            context,
            "STATE_INVALID_CONFIDENCE",
            `${path}/confidence`,
            state.confidence,
            [...CONFIDENCE_LEVELS],
            `Invalid confidence for meta-skill '${skillId}'.`
        );
    }


    validateMetaSkillAttemptStats(
        context,
        state.attemptStats,
        `${path}/attemptStats`
    );


    if (
        "weak" in state &&
        typeof state.weak !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${path}/weak`,
            state.weak,
            "boolean",
            "metaSkill.weak must be boolean."
        );
    }


    validateStringArrayIfPresent(
        context,
        state.signals,
        `${path}/signals`,
        true
    );


    validateMetaSkillFailure(
        context,
        state.lastFailure,
        `${path}/lastFailure`
    );
}


function validateMetaSkillAttemptStats(
    context,
    stats,
    path
) {

    if (!isPlainObject(stats)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            stats,
            "object",
            "Meta-skill attemptStats must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        stats,
        META_SKILL_ATTEMPT_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        stats,
        [
            "total",
            "wrong"
        ],
        path
    );


    validateNonNegativeIntegerIfPresent(
        context,
        stats.total,
        `${path}/total`
    );


    validateNonNegativeIntegerIfPresent(
        context,
        stats.wrong,
        `${path}/wrong`
    );


    if (
        Number.isInteger(
            stats.total
        ) &&
        Number.isInteger(
            stats.wrong
        ) &&
        stats.wrong > stats.total
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            `${path}/wrong`,
            stats.wrong,
            `<= ${stats.total}`,
            "Meta-skill wrong attempts cannot exceed total attempts."
        );
    }
}


function validateMetaSkillFailure(
    context,
    failure,
    path
) {

    if (
        failure === null ||
        failure === undefined
    ) {
        return;
    }


    if (!isPlainObject(failure)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            failure,
            "object|null",
            "Meta-skill lastFailure must be object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        failure,
        META_SKILL_FAILURE_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        failure,
        [
            "questionId",
            "failureType",
            "at"
        ],
        path
    );


    validateFailureType(
        context,
        failure.failureType,
        `${path}/failureType`
    );


    if (
        "failureSignatureId" in failure
    ) {

        validateFailureSignatureReference(
            context,
            failure.failureSignatureId,
            `${path}/failureSignatureId`
        );
    }


    validateDateTimeIfPresent(
        context,
        failure.at,
        `${path}/at`
    );
}


/* =========================================================
 * Global failure patterns
 * ========================================================= */


function validateFailurePatterns(
    context
) {

    const patterns =
        context.state.failurePatterns;


    if (!isPlainObject(patterns)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/failurePatterns",
            patterns,
            "object",
            "failurePatterns must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        patterns,
        FAILURE_PATTERNS_FIELDS,
        "/failurePatterns"
    );


    validateRequiredFields(
        context,
        patterns,
        [
            "active"
        ],
        "/failurePatterns"
    );


    if (!Array.isArray(patterns.active)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/failurePatterns/active",
            patterns.active,
            "array",
            "failurePatterns.active must be an array."
        );

        return;
    }


    patterns.active.forEach(
        (
            pattern,
            index
        ) => {

            validateFailurePattern(
                context,
                pattern,
                `/failurePatterns/active/${index}`
            );
        }
    );
}


function validateFailurePattern(
    context,
    pattern,
    path
) {

    if (!isPlainObject(pattern)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            pattern,
            "object",
            "Failure pattern must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        pattern,
        FAILURE_PATTERN_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        pattern,
        [
            "failureType",
            "nodeId",
            "sourceNodeId",
            "count",
            "lastAt"
        ],
        path
    );


    validateFailureType(
        context,
        pattern.failureType,
        `${path}/failureType`
    );


    if (
        "failureSignatureId" in pattern
    ) {

        validateFailureSignatureReference(
            context,
            pattern.failureSignatureId,
            `${path}/failureSignatureId`
        );
    }


    validateNodeReference(
        context,
        pattern.nodeId,
        `${path}/nodeId`,
        "STATE_NODE_NOT_FOUND"
    );


    if (
        pattern.sourceNodeId !== null &&
        pattern.sourceNodeId !== undefined
    ) {

        validateSourceNodeReference(
            context,
            pattern.sourceNodeId,
            `${path}/sourceNodeId`
        );
    }


    if (
        pattern.metaSkillId !== null &&
        pattern.metaSkillId !== undefined
    ) {

        validateSkillReference(
            context,
            pattern.metaSkillId,
            `${path}/metaSkillId`
        );
    }


    if (
        !Number.isInteger(
            pattern.count
        ) ||
        pattern.count < 1
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/count`,
            pattern.count,
            "integer >= 1",
            "Failure pattern count must be at least 1."
        );
    }


    validateDateTimeIfPresent(
        context,
        pattern.lastAt,
        `${path}/lastAt`
    );
}


/* =========================================================
 * Remediation projection
 * ========================================================= */


function validateRemediation(
    context
) {

    const remediation =
        context.state.remediation;


    if (!isPlainObject(remediation)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/remediation",
            remediation,
            "object",
            "remediation must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        remediation,
        REMEDIATION_FIELDS,
        "/remediation"
    );


    validateRequiredFields(
        context,
        remediation,
        [
            "lastResult",
            "activePlan"
        ],
        "/remediation"
    );


    if (
        remediation.lastResult !== null
    ) {

        validateRemediationResult(
            context,
            remediation.lastResult,
            "/remediation/lastResult"
        );
    }


    if (
        remediation.activePlan !== null
    ) {

        validateRemediationPlan(
            context,
            remediation.activePlan,
            "/remediation/activePlan"
        );
    }
}


function validateRemediationResult(
    context,
    result,
    path
) {

    if (!isPlainObject(result)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            result,
            "object|null",
            "remediation.lastResult must be object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        result,
        REMEDIATION_RESULT_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        result,
        [
            "targetNodeId",
            "sourceNodeId",
            "triggerNodeId",
            "failureType",
            "status",
            "completedAt"
        ],
        path
    );


    validateNodeReference(
        context,
        result.targetNodeId,
        `${path}/targetNodeId`,
        "STATE_NODE_NOT_FOUND"
    );


    if (
        result.sourceNodeId !== null &&
        result.sourceNodeId !== undefined
    ) {

        validateSourceNodeReference(
            context,
            result.sourceNodeId,
            `${path}/sourceNodeId`
        );
    }


    validateNodeReference(
        context,
        result.triggerNodeId,
        `${path}/triggerNodeId`,
        "STATE_NODE_NOT_FOUND"
    );


    validateFailureType(
        context,
        result.failureType,
        `${path}/failureType`
    );


    if (
        "failureSignatureId" in result
    ) {

        validateFailureSignatureReference(
            context,
            result.failureSignatureId,
            `${path}/failureSignatureId`
        );
    }


    validateEnum(
        context,
        result.status,
        REMEDIATION_RESULT_STATUSES,
        `${path}/status`
    );


    validateDateTimeIfPresent(
        context,
        result.completedAt,
        `${path}/completedAt`
    );
}


function validateRemediationPlan(
    context,
    plan,
    path
) {

    if (!isPlainObject(plan)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            plan,
            "object|null",
            "remediation.activePlan must be object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        plan,
        REMEDIATION_PLAN_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        plan,
        [
            "planId",
            "targetNodeId",
            "triggerNodeId",
            "failureType",
            "status"
        ],
        path
    );


    validateNodeReference(
        context,
        plan.targetNodeId,
        `${path}/targetNodeId`,
        "STATE_NODE_NOT_FOUND"
    );


    validateNodeReference(
        context,
        plan.triggerNodeId,
        `${path}/triggerNodeId`,
        "STATE_NODE_NOT_FOUND"
    );


    if (
        plan.sourceNodeId !== null &&
        plan.sourceNodeId !== undefined
    ) {

        validateSourceNodeReference(
            context,
            plan.sourceNodeId,
            `${path}/sourceNodeId`
        );
    }


    validateFailureType(
        context,
        plan.failureType,
        `${path}/failureType`
    );


    if (
        "failureSignatureId" in plan
    ) {

        validateFailureSignatureReference(
            context,
            plan.failureSignatureId,
            `${path}/failureSignatureId`
        );
    }


    validateEnum(
        context,
        plan.status,
        REMEDIATION_PLAN_STATUSES,
        `${path}/status`
    );
}


/* =========================================================
 * Adaptive projection
 * ========================================================= */


function validateAdaptive(
    context
) {

    const adaptive =
        context.state.adaptive;


    if (!isPlainObject(adaptive)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/adaptive",
            adaptive,
            "object",
            "adaptive must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        adaptive,
        ADAPTIVE_FIELDS,
        "/adaptive"
    );


    validateRequiredFields(
        context,
        adaptive,
        [
            "lastDecision",
            "nextAction"
        ],
        "/adaptive"
    );


    if (
        adaptive.lastDecision !== null
    ) {

        validateAdaptiveDecision(
            context,
            adaptive.lastDecision,
            "/adaptive/lastDecision"
        );
    }


    if (
        adaptive.nextAction !== null
    ) {

        validateNextAction(
            context,
            adaptive.nextAction,
            "/adaptive/nextAction"
        );
    }
}


function validateAdaptiveDecision(
    context,
    decision,
    path
) {

    if (!isPlainObject(decision)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            decision,
            "object|null",
            "adaptive.lastDecision must be object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        decision,
        ADAPTIVE_DECISION_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        decision,
        [
            "action",
            "nodeId",
            "reasonCodes",
            "at"
        ],
        path
    );


    validateAction(
        context,
        decision.action,
        `${path}/action`
    );


    if (
        decision.nodeId !== null &&
        decision.nodeId !== undefined
    ) {

        validateNodeReference(
            context,
            decision.nodeId,
            `${path}/nodeId`,
            "STATE_NODE_NOT_FOUND"
        );
    }


    validateStringArrayIfPresent(
        context,
        decision.reasonCodes,
        `${path}/reasonCodes`,
        true
    );


    validateDateTimeIfPresent(
        context,
        decision.at,
        `${path}/at`
    );
}


function validateNextAction(
    context,
    next,
    path
) {

    if (!isPlainObject(next)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            next,
            "object|null",
            "adaptive.nextAction must be object or null."
        );

        return;
    }


    validateUnknownFields(
        context,
        next,
        NEXT_ACTION_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        next,
        [
            "action",
            "nodeId",
            "priority",
            "constraints",
            "decidedAt"
        ],
        path
    );


    validateAction(
        context,
        next.action,
        `${path}/action`
    );


    if (
        next.nodeId !== null &&
        next.nodeId !== undefined
    ) {

        validateNodeReference(
            context,
            next.nodeId,
            `${path}/nodeId`,
            "STATE_NODE_NOT_FOUND"
        );
    }


    if (
        typeof next.priority !== "number" ||
        !Number.isFinite(
            next.priority
        )
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${path}/priority`,
            next.priority,
            "finite number",
            "adaptive.nextAction.priority must be a finite number."
        );
    }


    validateAdaptiveConstraints(
        context,
        next.constraints,
        `${path}/constraints`
    );


    validateDateTimeIfPresent(
        context,
        next.decidedAt,
        `${path}/decidedAt`
    );
}


function validateAdaptiveConstraints(
    context,
    constraints,
    path
) {

    if (!isPlainObject(constraints)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            constraints,
            "object",
            "Adaptive constraints must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        constraints,
        CONSTRAINT_FIELDS,
        path
    );


    if (
        "difficulty" in constraints
    ) {

        validateEnumArray(
            context,
            constraints.difficulty,
            DIFFICULTIES,
            `${path}/difficulty`
        );
    }


    if (
        "evidence" in constraints
    ) {

        validateEnumArray(
            context,
            constraints.evidence,
            EVIDENCE_DIMENSIONS,
            `${path}/evidence`
        );
    }
}


/* =========================================================
 * History projection
 * ========================================================= */


function validateHistory(
    context
) {

    const history =
        context.state.history;


    if (!isPlainObject(history)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/history",
            history,
            "object",
            "history must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        history,
        HISTORY_FIELDS,
        "/history"
    );


    validateRequiredFields(
        context,
        history,
        [
            "recentActions",
            "recentQuestions"
        ],
        "/history"
    );


    if (
        Array.isArray(
            history.recentActions
        )
    ) {

        history.recentActions.forEach(
            (
                action,
                index
            ) => {

                validateRecentAction(
                    context,
                    action,
                    `/history/recentActions/${index}`
                );
            }
        );

    } else {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/history/recentActions",
            history.recentActions,
            "array",
            "history.recentActions must be an array."
        );
    }


    validateStringArrayIfPresent(
        context,
        history.recentQuestions,
        "/history/recentQuestions",
        false
    );
}


function validateRecentAction(
    context,
    item,
    path
) {

    if (!isPlainObject(item)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            item,
            "object",
            "Recent action must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        item,
        RECENT_ACTION_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        item,
        [
            "action",
            "nodeId",
            "at"
        ],
        path
    );


    validateAction(
        context,
        item.action,
        `${path}/action`
    );


    if (
        item.nodeId !== null &&
        item.nodeId !== undefined
    ) {

        validateNodeReference(
            context,
            item.nodeId,
            `${path}/nodeId`,
            "STATE_NODE_NOT_FOUND"
        );
    }


    validateDateTimeIfPresent(
        context,
        item.at,
        `${path}/at`
    );
}


/* =========================================================
 * Progress
 * ========================================================= */


function validateProgress(
    context
) {

    const progress =
        context.state.progress;


    if (!isPlainObject(progress)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/progress",
            progress,
            "object",
            "progress must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        progress,
        PROGRESS_FIELDS,
        "/progress"
    );


    validateRequiredFields(
        context,
        progress,
        [
            "nodes",
            "clusters"
        ],
        "/progress"
    );


    validateNodeProgress(
        context,
        progress.nodes
    );


    validateClusterProgressCollection(
        context,
        progress.clusters
    );
}


function validateNodeProgress(
    context,
    nodes
) {

    const path =
        "/progress/nodes";


    if (!isPlainObject(nodes)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            nodes,
            "object",
            "progress.nodes must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        nodes,
        NODE_PROGRESS_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        nodes,
        [
            "total",
            "unstarted",
            "developing",
            "mastered",
            "stable"
        ],
        path
    );


    for (
        const field
        of NODE_PROGRESS_FIELDS
    ) {

        if (field in nodes) {

            validateNonNegativeIntegerIfPresent(
                context,
                nodes[field],
                `${path}/${field}`
            );
        }
    }


    /*
     * Stored projection arithmetic only.
     *
     * Does not derive progress from Knowledge Map.
     */
    const parts = [
        nodes.unstarted,
        nodes.developing,
        nodes.mastered,
        nodes.stable
    ];


    if (
        Number.isInteger(
            nodes.total
        ) &&
        parts.every(
            Number.isInteger
        )
    ) {

        const sum =
            parts.reduce(
                (
                    total,
                    value
                ) =>
                    total + value,
                0
            );


        if (
            nodes.total !== sum
        ) {

            addIssue(
                context,
                "SCHEMA_INVALID",
                `${path}/total`,
                nodes.total,
                sum,
                "progress.nodes.total must equal unstarted + developing + mastered + stable."
            );
        }
    }
}


function validateClusterProgressCollection(
    context,
    clusters
) {

    if (!isPlainObject(clusters)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/progress/clusters",
            clusters,
            "object",
            "progress.clusters must be an object."
        );

        return;
    }


    for (
        const [
            clusterId,
            value
        ]
        of Object.entries(
            clusters
        )
    ) {

        const path =
            `/progress/clusters/${escapePointer(
                clusterId
            )}`;


        validateClusterReference(
            context,
            clusterId,
            path
        );


        if (!isPlainObject(value)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                path,
                value,
                "object",
                "Cluster progress must be an object."
            );

            continue;
        }


        validateUnknownFields(
            context,
            value,
            CLUSTER_PROGRESS_FIELDS,
            path
        );


        validateRequiredFields(
            context,
            value,
            [
                "status",
                "progress"
            ],
            path
        );


        validateEnum(
            context,
            value.status,
            CLUSTER_STATUSES,
            `${path}/status`
        );


        validateEvidenceValue(
            context,
            value.progress,
            `${path}/progress`
        );
    }
}


/* =========================================================
 * Preferences
 * ========================================================= */


function validatePreferences(
    context
) {

    const preferences =
        context.state.preferences;


    if (!isPlainObject(preferences)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/preferences",
            preferences,
            "object",
            "preferences must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        preferences,
        PREFERENCE_FIELDS,
        "/preferences"
    );


    validateRequiredFields(
        context,
        preferences,
        [
            "preferredSessionLength",
            "preferredDifficulty",
            "allowChallenge",
            "allowSkipKnown",
            "showDetailedFeedback"
        ],
        "/preferences"
    );


    validateEnum(
        context,
        preferences.preferredSessionLength,
        new Set([
            "short",
            "normal",
            "long"
        ]),
        "/preferences/preferredSessionLength"
    );


    validateEnum(
        context,
        preferences.preferredDifficulty,
        new Set([
            "adaptive",
            "easier",
            "harder"
        ]),
        "/preferences/preferredDifficulty"
    );


    for (
        const field
        of [
            "allowChallenge",
            "allowSkipKnown",
            "showDetailedFeedback"
        ]
    ) {

        if (
            field in preferences &&
            typeof preferences[field]
            !== "boolean"
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                `/preferences/${field}`,
                preferences[field],
                "boolean",
                `preferences.${field} must be boolean.`
            );
        }
    }
}


/* =========================================================
 * Cross-state consistency
 * ========================================================= */


function validateCrossStateConsistency(
    context
) {

    const state =
        context.state;


    /*
     * updatedAt should not precede
     * current session activity.
     */
    const lastActivityAt =
        state.learning
            ?.session
            ?.lastActivityAt;


    if (
        isValidDateTime(
            state.updatedAt
        ) &&
        isValidDateTime(
            lastActivityAt
        ) &&
        Date.parse(
            state.updatedAt
        ) <
        Date.parse(
            lastActivityAt
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/updatedAt",
            state.updatedAt,
            ">= learning.session.lastActivityAt",
            "Student State updatedAt cannot be earlier than the current session lastActivityAt."
        );
    }


    /*
     * Current node should normally have a
     * knowledge-state entry if it is non-null.
     *
     * This is a snapshot consistency rule,
     * not Adaptive business logic.
     */
    const currentNodeId =
        state.learning
            ?.current
            ?.nodeId;


    if (
        typeof currentNodeId === "string" &&
        isPlainObject(
            state.knowledge
        ) &&
        !Object.prototype
            .hasOwnProperty
            .call(
                state.knowledge,
                currentNodeId
            )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            "/learning/current/nodeId",
            currentNodeId,
            "node represented in Student State knowledge projection",
            `Current node '${currentNodeId}' is not represented in state.knowledge.`
        );
    }


    /*
     * Adaptive lastDecision and nextAction
     * are independent snapshots.
     *
     * We intentionally DO NOT require:
     *
     * lastDecision.action === nextAction.action
     *
     * because nextAction may represent a newer
     * future decision.
     */


    /*
     * Validate failurePattern node IDs against
     * state.knowledge as an additional internal
     * projection consistency check.
     */
    const patterns =
        state.failurePatterns
            ?.active;


    if (
        Array.isArray(patterns) &&
        isPlainObject(
            state.knowledge
        )
    ) {

        patterns.forEach(
            (
                pattern,
                index
            ) => {

                if (
                    isPlainObject(pattern) &&
                    typeof pattern.nodeId
                    === "string" &&
                    !Object.prototype
                        .hasOwnProperty
                        .call(
                            state.knowledge,
                            pattern.nodeId
                        )
                ) {

                    addIssue(
                        context,
                        "CONTRACT_NODE_REFERENCE_MISMATCH",
                        `/failurePatterns/active/${index}/nodeId`,
                        pattern.nodeId,
                        "node represented in state.knowledge",
                        `Failure pattern node '${pattern.nodeId}' is not represented in state.knowledge.`
                    );
                }
            }
        );
    }


    /*
     * We intentionally DO NOT compare:
     *
     * mastery ↔ evidence thresholds
     * mastery ↔ status
     * confidence ↔ evidence
     * weakEvidence ↔ evidence values
     * adaptive action ↔ mastery
     * remediation ↔ failure
     * cluster progress ↔ mastery
     *
     * Those relationships depend on engine
     * business rules and therefore do not
     * belong in StudentStateValidator.
     */
}


/* =========================================================
 * Reference helpers
 * ========================================================= */


function validateNodeReference(
    context,
    nodeId,
    path,
    code =
        "STATE_NODE_NOT_FOUND"
) {

    if (!isNonEmptyString(nodeId)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            nodeId,
            "non-empty knowledge node ID",
            "Knowledge node reference must be a non-empty string."
        );

        return;
    }


    /*
     * Do not produce false NOT_FOUND errors
     * if Knowledge Map was not supplied.
     */
    if (
        context.hasKnowledgeMap &&
        !context.indexes
            .knowledgeNodeIds
            .has(nodeId)
    ) {

        addIssue(
            context,
            code,
            path,
            nodeId,
            "existing Knowledge Map node ID",
            `Knowledge node '${nodeId}' does not exist in Knowledge Map.`
        );
    }
}


function validateSourceNodeReference(
    context,
    nodeId,
    path
) {

    if (!isNonEmptyString(nodeId)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            nodeId,
            "non-empty knowledge node ID",
            "sourceNodeId must be a non-empty string or null."
        );

        return;
    }


    if (
        context.hasKnowledgeMap &&
        !context.indexes
            .knowledgeNodeIds
            .has(nodeId)
    ) {

        addIssue(
            context,
            "STATE_SOURCE_NODE_NOT_FOUND",
            path,
            nodeId,
            "existing Knowledge Map node ID",
            `Source node '${nodeId}' does not exist in Knowledge Map.`
        );
    }
}


function validateSkillReference(
    context,
    skillId,
    path
) {

    if (!isNonEmptyString(skillId)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            skillId,
            "non-empty meta-skill ID",
            "Meta-skill reference must be a non-empty string."
        );

        return;
    }


    /*
     * Only validate existence when Knowledge Map
     * actually supplied skill references.
     *
     * Empty skill index must not create false
     * NOT_FOUND errors.
     */
    if (
        context.hasKnowledgeMap &&
        context.indexes
            .skillIds
            .size > 0 &&
        !context.indexes
            .skillIds
            .has(skillId)
    ) {

        addIssue(
            context,
            "CONTRACT_SKILL_REFERENCE_MISMATCH",
            path,
            skillId,
            "existing canonical meta-skill ID",
            `Meta-skill '${skillId}' does not exist in the supplied canonical skill references.`
        );
    }
}


function validateClusterReference(
    context,
    clusterId,
    path
) {

    if (
        !isNonEmptyString(
            clusterId
        ) ||
        !/^C[0-9]+$/.test(
            clusterId
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            clusterId,
            "cluster ID matching ^C[0-9]+$",
            `Invalid cluster ID '${clusterId}'.`
        );

        return;
    }


    if (
        context.hasKnowledgeMap &&
        context.indexes
            .clusterIds
            .size > 0 &&
        !context.indexes
            .clusterIds
            .has(clusterId)
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            path,
            clusterId,
            "existing Knowledge Map cluster ID",
            `Cluster '${clusterId}' does not exist in Knowledge Map.`
        );
    }
}


/* =========================================================
 * Generic validation helpers
 * ========================================================= */


function validateAction(
    context,
    value,
    path
) {

    if (
        typeof value !== "string" ||
        !ACTIONS.has(value)
    ) {

        addIssue(
            context,
            "STATE_INVALID_CURRENT_ACTION",
            path,
            value,
            [...ACTIONS],
            `Invalid adaptive action '${value}'.`
        );
    }
}


function validateEnum(
    context,
    value,
    allowed,
    path
) {

    if (
        typeof value !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            value,
            "string",
            `${path || "value"} must be a string.`
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


function validateEnumArray(
    context,
    value,
    allowed,
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


    const seen =
        new Set();


    value.forEach(
        (
            item,
            index
        ) => {

            if (
                typeof item !== "string" ||
                !allowed.has(item)
            ) {

                addIssue(
                    context,
                    "INVALID_ENUM_VALUE",
                    `${path}/${index}`,
                    item,
                    [...allowed],
                    `Invalid enum value '${item}'.`
                );
            }


            if (seen.has(item)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "unique items",
                    `Duplicate array value '${item}'.`
                );

            } else {

                seen.add(item);
            }
        }
    );
}


function validateEvidenceDimensionArray(
    context,
    value,
    path
) {

    validateEnumArray(
        context,
        value,
        EVIDENCE_DIMENSIONS,
        path
    );
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
                `${basePath}/${escapePointer(
                    field
                )}`,
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

        if (
            !allowedFields.has(field)
        ) {

            addIssue(
                context,
                "UNKNOWN_FIELD",
                `${basePath}/${escapePointer(
                    field
                )}`,
                object[field],
                [...allowedFields],
                `Unknown field '${field}'.`
            );
        }
    }
}


function validateNonNegativeIntegerIfPresent(
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


function validateDateTimeIfPresent(
    context,
    value,
    path
) {

    if (!isValidDateTime(value)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "valid date-time",
            `${path} must be a valid date-time string.`
        );
    }
}


function validateNullableDateTime(
    context,
    value,
    path
) {

    if (value === null) {
        return;
    }


    validateDateTimeIfPresent(
        context,
        value,
        path
    );
}


function validateStringArrayIfPresent(
    context,
    value,
    path,
    unique
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


    const seen =
        new Set();


    value.forEach(
        (
            item,
            index
        ) => {

            if (!isNonEmptyString(item)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "non-empty string",
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
                    "unique item",
                    `Duplicate value '${item}' is not allowed.`
                );
            }


            seen.add(item);
        }
    );
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

        issue.value =
            value;
    }


    if (expected !== undefined) {

        issue.expected =
            expected;
    }


    context.issues.push(
        issue
    );
}


function getErrorMetadata(
    context,
    code
) {

    const external =
        context.errorRegistry;


    /*
     * Supported registry forms:
     *
     * {
     *   codes: {
     *      CODE: {...}
     *   }
     * }
     *
     * or
     *
     * {
     *   CODE: {...}
     * }
     */
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
        FALLBACK_ERROR_METADATA[
        code
        ];


    if (fallback) {

        return fallback;
    }


    /*
     * Validators must not invent codes.
     *
     * If code is missing from both registries,
     * fail loudly as a validator implementation
     * error rather than silently generating a
     * non-canonical validation issue.
     */
    throw new Error(
        `StudentStateValidator attempted to emit unregistered error code '${code}'.`
    );
}


function buildReport(
    context,
    startedAt
) {

    const durationMs =
        Date.now() -
        startedAt;


    const errorCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "error"
        ).length;


    const warningCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "warning"
        ).length;


    const infoCount =
        context.issues.filter(
            issue =>
                issue.severity ===
                "info"
        ).length;


    const stateId =
        isPlainObject(
            context.state
        ) &&
            typeof context.state.stateId
            === "string"
            ? context.state.stateId
            : null;


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
                "student-state",

            id:
                stateId,

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
                context.options
                    .environment ??
                "test"
        }
    };
}


/* =========================================================
 * Utility
 * ========================================================= */


function createValidationId() {

    return (
        "VAL-STATE-" +
        Date.now().toString(36) +
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


function isValidDateTime(
    value
) {

    return (
        typeof value === "string" &&
        value.trim() !== "" &&
        !Number.isNaN(
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