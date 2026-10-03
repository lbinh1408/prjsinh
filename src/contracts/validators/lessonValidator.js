/*
 * lessonValidator.js
 *
 * Phase 1 — Data Validation Layer
 *
 * Version: 1.0.1
 *
 * Responsibility:
 *
 *   READ → CHECK → REPORT
 *
 * Validates a Biology Lesson definition against:
 *
 *   - Lesson Contract
 *   - Knowledge Map references
 *   - Question Contract semantics
 *   - Failure Signature registry references
 *
 * MUST NOT:
 *
 *   - run the lesson
 *   - inspect student mastery
 *   - inspect student progress
 *   - choose next lesson
 *   - choose next knowledge node
 *   - choose adaptive action
 *   - update mastery
 *   - diagnose actual student failure
 *   - create remediation plans
 *   - mutate input
 */


const VALIDATOR_NAME = "lesson-validator";
const VALIDATOR_VERSION = "1.0.1";

const LESSON_SCHEMA_VERSION = "1.0.0";


/* =========================================================
 * Canonical enums
 * ========================================================= */


const LESSON_TYPES = new Set([
    "cluster",
    "concept",
    "mechanism",
    "application",
    "transfer",
    "remediation",
    "review",
    "integrated"
]);


const DELIVERY_MODES = new Set([
    "HOC_NHANH",
    "HOC_SAU",
    "ON_THI"
]);


const SECTION_TYPES = new Set([
    "orientation",
    "entryDiagnostic",
    "concept",
    "observation",
    "comparison",
    "mechanism",
    "workedExample",
    "guidedPractice",
    "practice",
    "apply",
    "transfer",
    "crossNode",
    "remediation",
    "reflection",
    "exitDiagnostic",
    "summary"
]);


const OBJECTIVE_TYPES = new Set([
    "understand",
    "know",
    "explain",
    "apply",
    "transfer"
]);


const EVIDENCE_VALUES = new Set([
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


const LESSON_DIFFICULTIES = new Set([
    "adaptive",
    "D1",
    "D2",
    "D3",
    "D4",
    "D5"
]);


/*
 * Lesson-local routing tokens.
 *
 * These are NOT Adaptive Engine primary actions.
 */
const ENTRY_DIAGNOSTIC_ACTIONS = new Set([
    "SKIP_TO_CHALLENGE",
    "LEARN_GAPS",
    "START_FROM_PREREQUISITE"
]);


const EXIT_DIAGNOSTIC_ACTIONS = new Set([
    "UPDATE_MASTERY",
    "PRACTICE_GAP",
    "REMEDIATE"
]);


/*
 * Fields allowed in question selection rules.
 */
const QUESTION_SELECTION_FIELDS = new Set([
    "node",
    "nodes",
    "primaryNode",
    "evidence",
    "difficulty",
    "mode",
    "skill",
    "failureSignature",
    "contextType",
    "retestGroupId",
    "count",
    "maxQuestions"
]);


/* =========================================================
 * Structural field registries
 * ========================================================= */


const LESSON_FIELDS = new Set([
    "id",
    "version",
    "title",
    "type",
    "deliveryModes",
    "knowledgeNodes",

    "description",
    "domain",

    "primaryNodes",
    "supportingNodes",

    "prerequisites",
    "entryDiagnostic",
    "exitDiagnostic",
    "estimatedMinutes",
    "difficulty",
    "objectives",
    "adaptiveRules",
    "metadata",

    "sections"
]);


const OBJECTIVE_FIELDS = new Set([
    "id",
    "node",
    "type",
    "description"
]);


const DIAGNOSTIC_FIELDS = new Set([
    "enabled",
    "purpose",
    "questionSelection",
    "adaptiveStopping",
    "outcomes"
]);


const QUESTION_SET_FIELDS = new Set([
    "source",
    "selection",
    "adaptive"
]);


const SECTION_FIELDS = new Set([
    "id",
    "type",
    "title",
    "nodes",
    "estimatedMinutes",
    "content",
    "questionSet",
    "prompts",
    "metadata"
]);


const CONTENT_FIELDS = new Set([
    "format",
    "data",
    "blocks",
    "contentRef",
    "chain"
]);


const CONTENT_BLOCK_FIELDS = new Set([
    "type",
    "node",
    "contentRef"
]);


const ESTIMATED_MINUTES_FIELDS = new Set([
    "minimum",
    "typical",
    "maximum"
]);


const METADATA_FIELDS = new Set([
    "author",
    "createdAt",
    "updatedAt",
    "reviewStatus",
    "tags"
]);


/* =========================================================
 * Canonical error metadata
 *
 * V1 does not invent LESSON_* error codes.
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

    QUESTION_SKILL_NOT_FOUND: {
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


export function validateLesson(
    lesson,
    options = {}
) {

    const startedAt = Date.now();

    const context = createContext(
        lesson,
        options
    );


    validateRoot(context);


    if (!isPlainObject(lesson)) {

        return buildReport(
            context,
            startedAt
        );
    }


    validateIdentity(context);

    validateLessonType(context);

    validateDeliveryModes(context);

    validateKnowledgeScope(context);

    validatePrerequisites(context);

    validateObjectives(context);

    validateEntryDiagnostic(context);

    validateSections(context);

    validateExitDiagnostic(context);

    validateEstimatedMinutes(context);

    validateDifficulty(context);

    validateAdaptiveRules(context);

    validateMetadata(context);


    /*
     * Cross-field / cross-contract invariants.
     */
    validateCrossContractConsistency(
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
    lesson,
    options
) {

    return {

        lesson,

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

            if (
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

            result.set(
                id,
                question
            );
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
 * Root / identity
 * ========================================================= */


function validateRoot(
    context
) {

    const lesson = context.lesson;


    if (!isPlainObject(lesson)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "",
            lesson,
            "object",
            "Lesson must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        lesson,
        LESSON_FIELDS,
        ""
    );


    validateRequiredFields(
        context,
        lesson,
        [
            "id",
            "version",
            "title",
            "type",
            "deliveryModes",
            "knowledgeNodes",
            "sections"
        ],
        ""
    );
}


function validateIdentity(
    context
) {

    const lesson = context.lesson;


    if (
        "id" in lesson &&
        !isNonEmptyString(lesson.id)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/id",
            lesson.id,
            "non-empty string",
            "Lesson id must be a non-empty string."
        );
    }


    if (
        "version" in lesson &&
        !isSemver(lesson.version)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/version",
            lesson.version,
            "semantic version such as 1.0.0",
            "Lesson version must use semantic version format."
        );
    }


    if (
        "title" in lesson &&
        !isNonEmptyString(lesson.title)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/title",
            lesson.title,
            "non-empty string",
            "Lesson title must be a non-empty string."
        );
    }
}


/* =========================================================
 * Lesson type / delivery mode
 * ========================================================= */


function validateLessonType(
    context
) {

    if (!("type" in context.lesson)) {
        return;
    }


    validateEnum(
        context,
        context.lesson.type,
        LESSON_TYPES,
        "/type"
    );
}


function validateDeliveryModes(
    context
) {

    if (!("deliveryModes" in context.lesson)) {
        return;
    }


    validateEnumArray(
        context,
        context.lesson.deliveryModes,
        DELIVERY_MODES,
        "/deliveryModes",
        true
    );
}


/* =========================================================
 * Knowledge scope
 * ========================================================= */


function validateKnowledgeScope(
    context
) {

    const lesson = context.lesson;


    if ("knowledgeNodes" in lesson) {

        validateNodeArray(
            context,
            lesson.knowledgeNodes,
            "/knowledgeNodes",
            true
        );
    }


    if ("primaryNodes" in lesson) {

        validateNodeArray(
            context,
            lesson.primaryNodes,
            "/primaryNodes",
            false
        );
    }


    if ("supportingNodes" in lesson) {

        validateNodeArray(
            context,
            lesson.supportingNodes,
            "/supportingNodes",
            false
        );
    }
}


function validatePrerequisites(
    context
) {

    if (!("prerequisites" in context.lesson)) {
        return;
    }


    /*
     * IMPORTANT:
     *
     * prerequisites must exist in Knowledge Map,
     * but they do NOT need to belong to
     * lesson.knowledgeNodes.
     */
    validateNodeArray(
        context,
        context.lesson.prerequisites,
        "/prerequisites",
        false
    );
}


/* =========================================================
 * Objectives
 * ========================================================= */


function validateObjectives(
    context
) {

    const objectives =
        context.lesson.objectives;


    if (objectives === undefined) {
        return;
    }


    if (!Array.isArray(objectives)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/objectives",
            objectives,
            "array",
            "objectives must be an array."
        );

        return;
    }


    const ids = new Set();


    objectives.forEach(
        (objective, index) => {

            const path =
                `/objectives/${index}`;


            if (!isPlainObject(objective)) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    objective,
                    "object",
                    "Each objective must be an object."
                );

                return;
            }


            validateUnknownFields(
                context,
                objective,
                OBJECTIVE_FIELDS,
                path
            );


            validateRequiredFields(
                context,
                objective,
                [
                    "id",
                    "node",
                    "type",
                    "description"
                ],
                path
            );


            if (
                isNonEmptyString(
                    objective.id
                )
            ) {

                if (ids.has(objective.id)) {

                    addIssue(
                        context,
                        "INVALID_FORMAT",
                        `${path}/id`,
                        objective.id,
                        "unique objective ID",
                        `Duplicate objective id '${objective.id}'.`
                    );

                } else {

                    ids.add(objective.id);
                }
            }


            if ("node" in objective) {

                validateNodeReference(
                    context,
                    objective.node,
                    `${path}/node`
                );
            }


            if ("type" in objective) {

                validateEnum(
                    context,
                    objective.type,
                    OBJECTIVE_TYPES,
                    `${path}/type`
                );
            }


            if (
                "description" in objective &&
                !isNonEmptyString(
                    objective.description
                )
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/description`,
                    objective.description,
                    "non-empty string",
                    "Objective description must be non-empty."
                );
            }
        }
    );
}


/* =========================================================
 * Entry / exit diagnostics
 * ========================================================= */


function validateEntryDiagnostic(
    context
) {

    const diagnostic =
        context.lesson.entryDiagnostic;


    if (diagnostic === undefined) {
        return;
    }


    validateDiagnosticObject(
        context,
        diagnostic,
        "/entryDiagnostic",
        "entry"
    );
}


function validateExitDiagnostic(
    context
) {

    const diagnostic =
        context.lesson.exitDiagnostic;


    if (diagnostic === undefined) {
        return;
    }


    validateDiagnosticObject(
        context,
        diagnostic,
        "/exitDiagnostic",
        "exit"
    );
}


function validateDiagnosticObject(
    context,
    diagnostic,
    path,
    kind
) {

    if (!isPlainObject(diagnostic)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            diagnostic,
            "object",
            `${path} must be an object.`
        );

        return;
    }


    validateUnknownFields(
        context,
        diagnostic,
        DIAGNOSTIC_FIELDS,
        path
    );


    if (
        "enabled" in diagnostic &&
        typeof diagnostic.enabled !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${path}/enabled`,
            diagnostic.enabled,
            "boolean",
            `${path}.enabled must be boolean.`
        );
    }


    if ("purpose" in diagnostic) {

        validateStringArray(
            context,
            diagnostic.purpose,
            `${path}/purpose`,
            true
        );
    }


    if (
        "adaptiveStopping" in diagnostic &&
        typeof diagnostic.adaptiveStopping
        !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${path}/adaptiveStopping`,
            diagnostic.adaptiveStopping,
            "boolean",
            "adaptiveStopping must be boolean."
        );
    }


    if (
        "questionSelection" in diagnostic
    ) {

        validateDiagnosticQuestionSelection(
            context,
            diagnostic.questionSelection,
            `${path}/questionSelection`
        );
    }


    if ("outcomes" in diagnostic) {

        validateDiagnosticOutcomes(
            context,
            diagnostic.outcomes,
            `${path}/outcomes`,
            kind
        );
    }
}


function validateDiagnosticQuestionSelection(
    context,
    questionSelection,
    path
) {

    if (!isPlainObject(questionSelection)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            questionSelection,
            "object",
            "Diagnostic questionSelection must be an object."
        );

        return;
    }


    if (
        "source" in questionSelection &&
        !isNonEmptyString(
            questionSelection.source
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/source`,
            questionSelection.source,
            "non-empty string",
            "Question source must be a non-empty string."
        );
    }


    /*
     * Exit diagnostic canonical form:
     *
     * questionSelection: {
     *     source,
     *     selection: {...}
     * }
     */
    if ("selection" in questionSelection) {

        validateQuestionSelection(
            context,
            questionSelection.selection,
            `${path}/selection`
        );
    }


    /*
     * Entry diagnostic canonical form:
     *
     * questionSelection: {
     *     source,
     *     nodes,
     *     evidence,
     *     maxQuestions
     * }
     */
    const directSelection = {};


    for (
        const field
        of QUESTION_SELECTION_FIELDS
    ) {

        if (field in questionSelection) {

            directSelection[field] =
                questionSelection[field];
        }
    }


    if (
        Object.keys(
            directSelection
        ).length > 0
    ) {

        validateQuestionSelection(
            context,
            directSelection,
            path
        );
    }


    const allowed =
        new Set([
            "source",
            "selection",
            ...QUESTION_SELECTION_FIELDS
        ]);


    validateUnknownFields(
        context,
        questionSelection,
        allowed,
        path
    );
}


function validateDiagnosticOutcomes(
    context,
    outcomes,
    path,
    kind
) {

    if (!isPlainObject(outcomes)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            outcomes,
            "object",
            "Diagnostic outcomes must be an object."
        );

        return;
    }


    const allowedActions =
        kind === "entry"
            ? ENTRY_DIAGNOSTIC_ACTIONS
            : EXIT_DIAGNOSTIC_ACTIONS;


    for (
        const [
            outcomeName,
            outcome
        ]
        of Object.entries(outcomes)
    ) {

        const outcomePath =
            `${path}/${escapePointer(
                outcomeName
            )}`;


        if (!isPlainObject(outcome)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                outcomePath,
                outcome,
                "object",
                "Diagnostic outcome must be an object."
            );

            continue;
        }


        validateUnknownFields(
            context,
            outcome,
            new Set(["action"]),
            outcomePath
        );


        validateRequiredFields(
            context,
            outcome,
            ["action"],
            outcomePath
        );


        if ("action" in outcome) {

            validateEnum(
                context,
                outcome.action,
                allowedActions,
                `${outcomePath}/action`,
                "CONTRACT_ACTION_MISMATCH"
            );
        }
    }
}


/* =========================================================
 * Sections
 * ========================================================= */


function validateSections(
    context
) {

    const sections =
        context.lesson.sections;


    if (sections === undefined) {
        return;
    }


    if (!Array.isArray(sections)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/sections",
            sections,
            "array",
            "sections must be an array."
        );

        return;
    }


    if (sections.length === 0) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/sections",
            sections,
            "at least one section",
            "Lesson must contain at least one section."
        );

        return;
    }


    const ids = new Set();


    sections.forEach(
        (section, index) => {

            const path =
                `/sections/${index}`;


            if (!isPlainObject(section)) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    section,
                    "object",
                    "Each lesson section must be an object."
                );

                return;
            }


            validateUnknownFields(
                context,
                section,
                SECTION_FIELDS,
                path
            );


            validateRequiredFields(
                context,
                section,
                [
                    "id",
                    "type",
                    "title",
                    "nodes",
                    "estimatedMinutes"
                ],
                path
            );


            if (
                isNonEmptyString(
                    section.id
                )
            ) {

                if (ids.has(section.id)) {

                    addIssue(
                        context,
                        "INVALID_FORMAT",
                        `${path}/id`,
                        section.id,
                        "unique section ID",
                        `Duplicate section id '${section.id}'.`
                    );

                } else {

                    ids.add(section.id);
                }

            } else if ("id" in section) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/id`,
                    section.id,
                    "non-empty string",
                    "Section id must be non-empty."
                );
            }


            if ("type" in section) {

                validateEnum(
                    context,
                    section.type,
                    SECTION_TYPES,
                    `${path}/type`
                );
            }


            if (
                "title" in section &&
                !isNonEmptyString(
                    section.title
                )
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/title`,
                    section.title,
                    "non-empty string",
                    "Section title must be non-empty."
                );
            }


            if ("nodes" in section) {

                validateNodeArray(
                    context,
                    section.nodes,
                    `${path}/nodes`,
                    false
                );
            }


            if (
                "estimatedMinutes" in section
            ) {

                validatePositiveNumber(
                    context,
                    section.estimatedMinutes,
                    `${path}/estimatedMinutes`
                );
            }


            if ("content" in section) {

                validateContent(
                    context,
                    section.content,
                    `${path}/content`
                );
            }


            if ("questionSet" in section) {

                validateQuestionSet(
                    context,
                    section.questionSet,
                    `${path}/questionSet`
                );
            }


            if ("prompts" in section) {

                validateStringArray(
                    context,
                    section.prompts,
                    `${path}/prompts`,
                    false
                );
            }
        }
    );
}


/* =========================================================
 * Content
 * ========================================================= */


function validateContent(
    context,
    content,
    path
) {

    if (!isPlainObject(content)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            content,
            "object",
            "Section content must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        content,
        CONTENT_FIELDS,
        path
    );


    if (
        "format" in content &&
        !isNonEmptyString(
            content.format
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/format`,
            content.format,
            "non-empty string",
            "content.format must be non-empty."
        );
    }


    if (
        "contentRef" in content &&
        !isNonEmptyString(
            content.contentRef
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/contentRef`,
            content.contentRef,
            "non-empty string",
            "contentRef must be non-empty."
        );
    }


    if ("blocks" in content) {

        if (!Array.isArray(content.blocks)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                `${path}/blocks`,
                content.blocks,
                "array",
                "content.blocks must be an array."
            );

        } else {

            content.blocks.forEach(
                (block, index) => {

                    validateContentBlock(
                        context,
                        block,
                        `${path}/blocks/${index}`
                    );
                }
            );
        }
    }


    /*
     * content.data intentionally remains open.
     *
     * Known Kxxx references inside the canonical
     * concept-map sequence are still checked.
     */
    if (
        isPlainObject(content.data) &&
        Array.isArray(
            content.data.sequence
        )
    ) {

        content.data.sequence.forEach(
            (nodeId, index) => {

                if (
                    typeof nodeId === "string" &&
                    /^K[0-9]+$/.test(nodeId)
                ) {

                    validateNodeReference(
                        context,
                        nodeId,
                        `${path}/data/sequence/${index}`
                    );
                }
            }
        );
    }


    /*
     * chain contains semantic labels, not
     * necessarily knowledge node IDs.
     */
    if ("chain" in content) {

        validateStringArray(
            context,
            content.chain,
            `${path}/chain`,
            false
        );
    }
}


function validateContentBlock(
    context,
    block,
    path
) {

    if (!isPlainObject(block)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            block,
            "object",
            "Content block must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        block,
        CONTENT_BLOCK_FIELDS,
        path
    );


    if ("node" in block) {

        validateNodeReference(
            context,
            block.node,
            `${path}/node`
        );
    }


    if (
        "contentRef" in block &&
        !isNonEmptyString(
            block.contentRef
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/contentRef`,
            block.contentRef,
            "non-empty string",
            "Block contentRef must be non-empty."
        );
    }
}


/* =========================================================
 * Question sets / selection
 * ========================================================= */


function validateQuestionSet(
    context,
    questionSet,
    path
) {

    if (!isPlainObject(questionSet)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            questionSet,
            "object",
            "questionSet must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        questionSet,
        QUESTION_SET_FIELDS,
        path
    );


    validateRequiredFields(
        context,
        questionSet,
        [
            "source",
            "selection"
        ],
        path
    );


    if (
        "source" in questionSet &&
        !isNonEmptyString(
            questionSet.source
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/source`,
            questionSet.source,
            "non-empty string",
            "questionSet.source must be non-empty."
        );
    }


    if (
        "adaptive" in questionSet &&
        typeof questionSet.adaptive
        !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            `${path}/adaptive`,
            questionSet.adaptive,
            "boolean",
            "questionSet.adaptive must be boolean."
        );
    }


    if ("selection" in questionSet) {

        validateQuestionSelection(
            context,
            questionSet.selection,
            `${path}/selection`
        );
    }
}


function validateQuestionSelection(
    context,
    selection,
    path
) {

    if (!isPlainObject(selection)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            path,
            selection,
            "object",
            "Question selection must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        selection,
        QUESTION_SELECTION_FIELDS,
        path
    );


    if ("node" in selection) {

        validateNodeReference(
            context,
            selection.node,
            `${path}/node`
        );
    }


    if ("nodes" in selection) {

        validateNodeArray(
            context,
            selection.nodes,
            `${path}/nodes`,
            false
        );
    }


    if ("primaryNode" in selection) {

        validateNodeReference(
            context,
            selection.primaryNode,
            `${path}/primaryNode`
        );
    }


    if ("evidence" in selection) {

        validateEnumOrEnumArray(
            context,
            selection.evidence,
            EVIDENCE_VALUES,
            `${path}/evidence`
        );
    }


    if ("difficulty" in selection) {

        validateEnumOrEnumArray(
            context,
            selection.difficulty,
            DIFFICULTIES,
            `${path}/difficulty`
        );
    }


    /*
     * Exact Question mode validation belongs to
     * Question Contract / Cross Contract Validator.
     *
     * Lesson Validator checks structural validity.
     */
    if ("mode" in selection) {

        validateStringOrStringArray(
            context,
            selection.mode,
            `${path}/mode`
        );
    }


    if ("skill" in selection) {

        validateSkillSelection(
            context,
            selection.skill,
            `${path}/skill`
        );
    }


    if (
        "failureSignature"
        in selection
    ) {

        validateFailureSignatureSelection(
            context,
            selection.failureSignature,
            `${path}/failureSignature`
        );
    }


    if ("contextType" in selection) {

        validateStringOrStringArray(
            context,
            selection.contextType,
            `${path}/contextType`
        );
    }


    if (
        "retestGroupId" in selection &&
        !isNonEmptyString(
            selection.retestGroupId
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            `${path}/retestGroupId`,
            selection.retestGroupId,
            "non-empty string",
            "retestGroupId must be non-empty."
        );
    }


    if ("count" in selection) {

        validatePositiveInteger(
            context,
            selection.count,
            `${path}/count`
        );
    }


    if ("maxQuestions" in selection) {

        validatePositiveInteger(
            context,
            selection.maxQuestions,
            `${path}/maxQuestions`
        );
    }


    /*
     * If both are declared, primaryNode must
     * belong to nodes.
     */
    if (
        isNonEmptyString(
            selection.primaryNode
        ) &&
        Array.isArray(
            selection.nodes
        ) &&
        !selection.nodes.includes(
            selection.primaryNode
        )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `${path}/primaryNode`,
            selection.primaryNode,
            "primaryNode included in selection.nodes",
            `Question selection primaryNode '${selection.primaryNode}' is not included in selection.nodes.`
        );
    }
}


/* =========================================================
 * Estimated minutes / difficulty
 * ========================================================= */


function validateEstimatedMinutes(
    context
) {

    const value =
        context.lesson.estimatedMinutes;


    if (value === undefined) {
        return;
    }


    if (!isPlainObject(value)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/estimatedMinutes",
            value,
            "object",
            "Lesson estimatedMinutes must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        value,
        ESTIMATED_MINUTES_FIELDS,
        "/estimatedMinutes"
    );


    validateRequiredFields(
        context,
        value,
        [
            "minimum",
            "typical",
            "maximum"
        ],
        "/estimatedMinutes"
    );


    for (
        const field
        of ESTIMATED_MINUTES_FIELDS
    ) {

        if (field in value) {

            validatePositiveNumber(
                context,
                value[field],
                `/estimatedMinutes/${field}`
            );
        }
    }


    if (
        isFiniteNumber(value.minimum) &&
        isFiniteNumber(value.typical) &&
        value.minimum > value.typical
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/estimatedMinutes/typical",
            value.typical,
            `>= minimum (${value.minimum})`,
            "estimatedMinutes.typical cannot be smaller than minimum."
        );
    }


    if (
        isFiniteNumber(value.typical) &&
        isFiniteNumber(value.maximum) &&
        value.typical > value.maximum
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            "/estimatedMinutes/maximum",
            value.maximum,
            `>= typical (${value.typical})`,
            "estimatedMinutes.maximum cannot be smaller than typical."
        );
    }
}


function validateDifficulty(
    context
) {

    if (
        !("difficulty" in context.lesson)
    ) {
        return;
    }


    validateEnum(
        context,
        context.lesson.difficulty,
        LESSON_DIFFICULTIES,
        "/difficulty"
    );
}


/* =========================================================
 * Adaptive rules
 *
 * Definition-only validation.
 *
 * Conditions are opaque DSL strings.
 * Validator MUST NOT execute them.
 * ========================================================= */


function validateAdaptiveRules(
    context
) {

    const rules =
        context.lesson.adaptiveRules;


    if (rules === undefined) {
        return;
    }


    if (!isPlainObject(rules)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/adaptiveRules",
            rules,
            "object",
            "adaptiveRules must be an object."
        );

        return;
    }


    if (
        "enabled" in rules &&
        typeof rules.enabled !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/adaptiveRules/enabled",
            rules.enabled,
            "boolean",
            "adaptiveRules.enabled must be boolean."
        );
    }


    for (
        const [ruleName, rule]
        of Object.entries(rules)
    ) {

        if (ruleName === "enabled") {
            continue;
        }


        const path =
            `/adaptiveRules/${escapePointer(
                ruleName
            )}`;


        if (!isPlainObject(rule)) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                path,
                rule,
                "object",
                "Adaptive lesson rule must be an object."
            );

            continue;
        }


        validateUnknownFields(
            context,
            rule,
            new Set([
                "condition",
                "action"
            ]),
            path
        );


        validateRequiredFields(
            context,
            rule,
            [
                "condition",
                "action"
            ],
            path
        );


        if (
            "condition" in rule &&
            !isNonEmptyString(
                rule.condition
            )
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                `${path}/condition`,
                rule.condition,
                "non-empty condition string",
                "Adaptive rule condition must be non-empty."
            );
        }


        if (
            "action" in rule &&
            !isNonEmptyString(
                rule.action
            )
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                `${path}/action`,
                rule.action,
                "non-empty lesson delivery action",
                "Adaptive rule action must be non-empty."
            );
        }
    }
}


/* =========================================================
 * Metadata
 * ========================================================= */


function validateMetadata(
    context
) {

    const metadata =
        context.lesson.metadata;


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
            "metadata must be an object."
        );

        return;
    }


    validateUnknownFields(
        context,
        metadata,
        METADATA_FIELDS,
        "/metadata"
    );


    if ("tags" in metadata) {

        validateStringArray(
            context,
            metadata.tags,
            "/metadata/tags",
            true
        );
    }
}


/* =========================================================
 * Cross-contract consistency
 * ========================================================= */


function validateCrossContractConsistency(
    context
) {

    const lesson =
        context.lesson;


    if (
        !Array.isArray(
            lesson.knowledgeNodes
        )
    ) {
        return;
    }


    /*
     * =====================================================
     * Scope 1 — Lesson teaching scope
     *
     * Used by:
     *
     *   primaryNodes
     *   supportingNodes
     *   objectives
     *   sections
     *   section question selection
     *   content blocks
     *   exit diagnostic
     *
     * Prerequisites are NOT automatically part
     * of this scope.
     * =====================================================
     */

    const lessonScope =
        new Set(
            lesson.knowledgeNodes.filter(
                isNonEmptyString
            )
        );


    /*
     * =====================================================
     * Scope 2 — Entry diagnostic scope
     *
     * Entry diagnostic may probe both:
     *
     *   knowledgeNodes
     *   prerequisites
     *
     * because its purpose includes identifying
     * prerequisite gaps.
     *
     * IMPORTANT:
     *
     * Do NOT use this expanded scope for sections,
     * objectives, primaryNodes or supportingNodes.
     * =====================================================
     */

    const entryDiagnosticScope =
        new Set([
            ...lessonScope,

            ...(
                Array.isArray(
                    lesson.prerequisites
                )
                    ? lesson.prerequisites.filter(
                        isNonEmptyString
                    )
                    : []
            )
        ]);


    /*
     * primaryNodes ⊆ knowledgeNodes
     */
    validateSubsetOfLessonScope(
        context,
        lesson.primaryNodes,
        lessonScope,
        "/primaryNodes",
        "primaryNodes"
    );


    /*
     * supportingNodes ⊆ knowledgeNodes
     */
    validateSubsetOfLessonScope(
        context,
        lesson.supportingNodes,
        lessonScope,
        "/supportingNodes",
        "supportingNodes"
    );


    /*
     * A node should not simultaneously be
     * primary and supporting.
     */
    if (
        Array.isArray(
            lesson.primaryNodes
        ) &&
        Array.isArray(
            lesson.supportingNodes
        )
    ) {

        const primary =
            new Set(
                lesson.primaryNodes
            );


        lesson.supportingNodes.forEach(
            (nodeId, index) => {

                if (primary.has(nodeId)) {

                    addIssue(
                        context,
                        "CONTRACT_NODE_REFERENCE_MISMATCH",
                        `/supportingNodes/${index}`,
                        nodeId,
                        "node not duplicated in primaryNodes",
                        `Node '${nodeId}' cannot simultaneously be primary and supporting in the same lesson.`
                    );
                }
            }
        );
    }


    /*
     * Objective target nodes must belong to
     * lesson teaching scope.
     */
    if (
        Array.isArray(
            lesson.objectives
        )
    ) {

        lesson.objectives.forEach(
            (objective, index) => {

                if (
                    isPlainObject(objective) &&
                    isNonEmptyString(
                        objective.node
                    ) &&
                    !lessonScope.has(
                        objective.node
                    )
                ) {

                    addIssue(
                        context,
                        "CONTRACT_NODE_REFERENCE_MISMATCH",
                        `/objectives/${index}/node`,
                        objective.node,
                        "node included in lesson.knowledgeNodes",
                        `Objective node '${objective.node}' is outside the lesson knowledge scope.`
                    );
                }
            }
        );
    }


    /*
     * Section nodes must belong to lesson
     * teaching scope.
     */
    if (
        Array.isArray(
            lesson.sections
        )
    ) {

        lesson.sections.forEach(
            (section, sectionIndex) => {

                if (
                    !isPlainObject(section)
                ) {
                    return;
                }


                if (
                    Array.isArray(
                        section.nodes
                    )
                ) {

                    section.nodes.forEach(
                        (nodeId, nodeIndex) => {

                            if (
                                isNonEmptyString(nodeId) &&
                                !lessonScope.has(
                                    nodeId
                                )
                            ) {

                                addIssue(
                                    context,
                                    "CONTRACT_NODE_REFERENCE_MISMATCH",
                                    `/sections/${sectionIndex}/nodes/${nodeIndex}`,
                                    nodeId,
                                    "node included in lesson.knowledgeNodes",
                                    `Section node '${nodeId}' is outside the lesson knowledge scope.`
                                );
                            }
                        }
                    );
                }


                validateSectionQuestionScope(
                    context,
                    section,
                    sectionIndex
                );


                validateContentBlockScope(
                    context,
                    section,
                    sectionIndex
                );
            }
        );
    }


    /*
     * =====================================================
     * Entry diagnostic:
     *
     * knowledgeNodes ∪ prerequisites
     * =====================================================
     */

    validateDiagnosticScope(
        context,
        lesson.entryDiagnostic,
        "/entryDiagnostic",
        entryDiagnosticScope
    );


    /*
     * =====================================================
     * Exit diagnostic:
     *
     * knowledgeNodes only.
     *
     * Exit diagnostic measures lesson outcomes,
     * not external prerequisite gaps.
     * =====================================================
     */

    validateDiagnosticScope(
        context,
        lesson.exitDiagnostic,
        "/exitDiagnostic",
        lessonScope
    );


    /*
     * Deliberately NOT validated here:
     *
     * - mastery thresholds
     * - whether student should skip section
     * - adaptive runtime decisions
     * - whether remediation should trigger
     * - student progress
     * - lesson completion → mastery
     */
}


function validateSubsetOfLessonScope(
    context,
    nodes,
    scope,
    path,
    label
) {

    if (!Array.isArray(nodes)) {
        return;
    }


    nodes.forEach(
        (nodeId, index) => {

            if (
                isNonEmptyString(nodeId) &&
                !scope.has(nodeId)
            ) {

                addIssue(
                    context,
                    "CONTRACT_NODE_REFERENCE_MISMATCH",
                    `${path}/${index}`,
                    nodeId,
                    "node included in lesson.knowledgeNodes",
                    `${label} node '${nodeId}' is not included in lesson.knowledgeNodes.`
                );
            }
        }
    );
}


function validateSectionQuestionScope(
    context,
    section,
    sectionIndex
) {

    const selection =
        section.questionSet?.selection;


    if (!isPlainObject(selection)) {
        return;
    }


    const sectionNodes =
        new Set(
            Array.isArray(
                section.nodes
            )
                ? section.nodes
                : []
        );


    if (
        isNonEmptyString(
            selection.primaryNode
        ) &&
        !sectionNodes.has(
            selection.primaryNode
        )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/sections/${sectionIndex}/questionSet/selection/primaryNode`,
            selection.primaryNode,
            "node included in section.nodes",
            `Question selection primaryNode '${selection.primaryNode}' is outside this section's node scope.`
        );
    }


    if (
        isNonEmptyString(
            selection.node
        ) &&
        !sectionNodes.has(
            selection.node
        )
    ) {

        addIssue(
            context,
            "CONTRACT_NODE_REFERENCE_MISMATCH",
            `/sections/${sectionIndex}/questionSet/selection/node`,
            selection.node,
            "node included in section.nodes",
            `Question selection node '${selection.node}' is outside this section's node scope.`
        );
    }


    if (
        Array.isArray(
            selection.nodes
        )
    ) {

        selection.nodes.forEach(
            (nodeId, index) => {

                if (
                    isNonEmptyString(nodeId) &&
                    !sectionNodes.has(nodeId)
                ) {

                    addIssue(
                        context,
                        "CONTRACT_NODE_REFERENCE_MISMATCH",
                        `/sections/${sectionIndex}/questionSet/selection/nodes/${index}`,
                        nodeId,
                        "node included in section.nodes",
                        `Question selection node '${nodeId}' is outside this section's node scope.`
                    );
                }
            }
        );
    }
}


function validateContentBlockScope(
    context,
    section,
    sectionIndex
) {

    const blocks =
        section.content?.blocks;


    if (!Array.isArray(blocks)) {
        return;
    }


    const sectionNodes =
        new Set(
            Array.isArray(
                section.nodes
            )
                ? section.nodes
                : []
        );


    blocks.forEach(
        (block, blockIndex) => {

            if (
                isPlainObject(block) &&
                isNonEmptyString(
                    block.node
                ) &&
                !sectionNodes.has(
                    block.node
                )
            ) {

                addIssue(
                    context,
                    "CONTRACT_NODE_REFERENCE_MISMATCH",
                    `/sections/${sectionIndex}/content/blocks/${blockIndex}/node`,
                    block.node,
                    "node included in section.nodes",
                    `Content block node '${block.node}' is outside this section's node scope.`
                );
            }
        }
    );
}


/*
 * Validate diagnostic selection against an
 * explicitly supplied scope.
 *
 * Caller decides which scope is correct:
 *
 * Entry:
 *   knowledgeNodes ∪ prerequisites
 *
 * Exit:
 *   knowledgeNodes
 */
function validateDiagnosticScope(
    context,
    diagnostic,
    path,
    allowedScope
) {

    if (!isPlainObject(diagnostic)) {
        return;
    }


    let selection =
        diagnostic.questionSelection;


    if (!isPlainObject(selection)) {
        return;
    }


    /*
     * Exit diagnostic normally wraps the actual
     * selection under questionSelection.selection.
     */
    if (
        isPlainObject(
            selection.selection
        )
    ) {

        selection =
            selection.selection;
    }


    const refs = [];


    if (
        isNonEmptyString(
            selection.node
        )
    ) {

        refs.push({
            nodeId:
                selection.node,

            path:
                buildDiagnosticSelectionPath(
                    path,
                    diagnostic,
                    "node"
                )
        });
    }


    if (
        isNonEmptyString(
            selection.primaryNode
        )
    ) {

        refs.push({
            nodeId:
                selection.primaryNode,

            path:
                buildDiagnosticSelectionPath(
                    path,
                    diagnostic,
                    "primaryNode"
                )
        });
    }


    if (
        Array.isArray(
            selection.nodes
        )
    ) {

        selection.nodes.forEach(
            (nodeId, index) => {

                refs.push({
                    nodeId,

                    path:
                        buildDiagnosticSelectionPath(
                            path,
                            diagnostic,
                            `nodes/${index}`
                        )
                });
            }
        );
    }


    for (const ref of refs) {

        if (
            isNonEmptyString(ref.nodeId) &&
            !allowedScope.has(
                ref.nodeId
            )
        ) {

            addIssue(
                context,
                "CONTRACT_NODE_REFERENCE_MISMATCH",
                ref.path,
                ref.nodeId,
                "node inside allowed diagnostic scope",
                `Diagnostic selection node '${ref.nodeId}' is outside the allowed diagnostic scope.`
            );
        }
    }
}


function buildDiagnosticSelectionPath(
    diagnosticPath,
    diagnostic,
    suffix
) {

    const wrapped =
        isPlainObject(
            diagnostic
                ?.questionSelection
                ?.selection
        );


    return wrapped
        ? `${diagnosticPath}/questionSelection/selection/${suffix}`
        : `${diagnosticPath}/questionSelection/${suffix}`;
}


/* =========================================================
 * Reference validation
 * ========================================================= */


function validateNodeArray(
    context,
    value,
    path,
    requireNonEmpty
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


    if (
        requireNonEmpty &&
        value.length === 0
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            path,
            value,
            "non-empty node array",
            `${path} must contain at least one node.`
        );
    }


    const seen = new Set();


    value.forEach(
        (nodeId, index) => {

            const nodePath =
                `${path}/${index}`;


            if (
                !isNonEmptyString(nodeId) ||
                !/^K[0-9]+$/.test(nodeId)
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    nodePath,
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
                    nodePath,
                    nodeId,
                    "unique node reference",
                    `Duplicate node '${nodeId}'.`
                );

            } else {

                seen.add(nodeId);
            }


            validateNodeReference(
                context,
                nodeId,
                nodePath
            );
        }
    );
}


function validateNodeReference(
    context,
    nodeId,
    path
) {

    if (
        !isNonEmptyString(nodeId) ||
        !/^K[0-9]+$/.test(nodeId)
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            nodeId,
            "knowledge node ID matching ^K[0-9]+$",
            `Invalid knowledge node reference '${nodeId}'.`
        );

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


function validateSkillSelection(
    context,
    value,
    path
) {

    const skills =
        Array.isArray(value)
            ? value
            : [value];


    skills.forEach(
        (skillId, index) => {

            const itemPath =
                Array.isArray(value)
                    ? `${path}/${index}`
                    : path;


            if (
                !isNonEmptyString(
                    skillId
                )
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    itemPath,
                    skillId,
                    "non-empty skill ID",
                    "Question selection skill must be a non-empty string."
                );

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
                    "CONTRACT_SKILL_REFERENCE_MISMATCH",
                    itemPath,
                    skillId,
                    "existing canonical skill ID",
                    `Skill '${skillId}' does not exist in canonical skill references.`
                );
            }
        }
    );
}


function validateFailureSignatureSelection(
    context,
    value,
    path
) {

    const ids =
        Array.isArray(value)
            ? value
            : [value];


    ids.forEach(
        (id, index) => {

            const itemPath =
                Array.isArray(value)
                    ? `${path}/${index}`
                    : path;


            if (!isNonEmptyString(id)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    itemPath,
                    id,
                    "non-empty failure signature ID",
                    "failureSignature must contain canonical failure signature IDs."
                );

                return;
            }


            if (
                context.hasFailureRegistry &&
                !context.indexes
                    .failureSignatureIds
                    .has(id)
            ) {

                addIssue(
                    context,
                    "FAILURE_SIGNATURE_NOT_FOUND",
                    itemPath,
                    id,
                    "existing canonical failure signature ID",
                    `Failure signature '${id}' does not exist in the canonical registry.`
                );
            }
        }
    );
}


/* =========================================================
 * Generic validators
 * ========================================================= */


function validateEnum(
    context,
    value,
    allowed,
    path,
    code = "INVALID_ENUM_VALUE"
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
            code,
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
    path,
    requireNonEmpty = false
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


    if (
        requireNonEmpty &&
        value.length === 0
    ) {

        addIssue(
            context,
            "SCHEMA_INVALID",
            path,
            value,
            "non-empty array",
            `${path} cannot be empty.`
        );
    }


    const seen = new Set();


    value.forEach(
        (item, index) => {

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
                    `Invalid value '${item}'.`
                );
            }


            if (seen.has(item)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "unique array value",
                    `Duplicate value '${item}'.`
                );

            } else {

                seen.add(item);
            }
        }
    );
}


function validateEnumOrEnumArray(
    context,
    value,
    allowed,
    path
) {

    if (Array.isArray(value)) {

        validateEnumArray(
            context,
            value,
            allowed,
            path,
            false
        );

        return;
    }


    validateEnum(
        context,
        value,
        allowed,
        path
    );
}


function validateStringOrStringArray(
    context,
    value,
    path
) {

    if (Array.isArray(value)) {

        validateStringArray(
            context,
            value,
            path,
            true
        );

        return;
    }


    if (!isNonEmptyString(value)) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "non-empty string or array of strings",
            `${path} must be a non-empty string or string array.`
        );
    }
}


function validateStringArray(
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


    const seen = new Set();


    value.forEach(
        (item, index) => {

            if (!isNonEmptyString(item)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/${index}`,
                    item,
                    "non-empty string",
                    `${path}/${index} must be non-empty.`
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
                    "unique string",
                    `Duplicate value '${item}'.`
                );
            }


            seen.add(item);
        }
    );
}


function validatePositiveInteger(
    context,
    value,
    path
) {

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "integer > 0",
            `${path} must be a positive integer.`
        );
    }
}


function validatePositiveNumber(
    context,
    value,
    path
) {

    if (
        !isFiniteNumber(value) ||
        value <= 0
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            path,
            value,
            "number > 0",
            `${path} must be a positive number.`
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
 * Validation report
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


    /*
     * Phase 1 invariant:
     *
     * Validator must never silently invent
     * an unregistered error code.
     */
    throw new Error(
        `LessonValidator attempted to emit unregistered error code '${code}'.`
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
                "lesson",

            id:
                isPlainObject(
                    context.lesson
                ) &&
                    isNonEmptyString(
                        context.lesson.id
                    )
                    ? context.lesson.id
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
        "VAL-LESSON-" +
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


function isFiniteNumber(
    value
) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}


function isSemver(
    value
) {

    return (
        typeof value === "string" &&
        /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
            .test(value)
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