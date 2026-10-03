/**
 * questionValidator.js
 *
 * PHASE 1 — DATA VALIDATION LAYER
 *
 * Question Validator V1.1
 *
 * Responsibility:
 *
 *   READ -> CHECK -> REPORT
 *
 * This validator validates static Question data only.
 *
 * It MUST NOT:
 * - modify Question
 * - score student attempts
 * - update mastery
 * - diagnose actual failure
 * - choose remediation
 * - choose next action
 */

const VALIDATOR_NAME = "question-validator";
const VALIDATOR_VERSION = "1.1.0";


/* =========================================================
 * QUESTION CONTRACT
 * ======================================================= */

const QUESTION_ID_PATTERN =
    /^Q-[A-Z]-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$/;

const VERSION_PATTERN =
    /^\d+\.\d+\.\d+$/;


const QUESTION_TYPES = new Set([
    "mcq",
    "multi_select",
    "true_false",
    "matching",
    "ordering",
    "fill_blank",
    "short_answer",
    "numeric",
    "data_analysis",
    "experiment",
    "sequence",
    "open_response"
]);


const EVIDENCE_TYPES = new Set([
    "know",
    "explain",
    "apply",
    "transfer"
]);


const DIFFICULTY_LEVELS = new Set([
    "D1",
    "D2",
    "D3",
    "D4",
    "D5"
]);


const QUESTION_MODES = new Set([
    "diagnostic",
    "learning",
    "practice",
    "challenge",
    "retest",
    "review",
    "remediation"
]);


const CONTEXT_TYPES = new Set([
    "direct",
    "biological_scenario",
    "experiment",
    "data_table",
    "graph",
    "clinical_context",
    "ecological_context",
    "genetic_cross",
    "integrated_problem"
]);


/*
 * explanation is now REQUIRED.
 */
const REQUIRED_FIELDS = [
    "id",
    "version",
    "nodes",
    "primaryNode",
    "evidence",
    "difficulty",
    "questionType",
    "mode",
    "content",
    "answer",
    "scoring",
    "failureSignatures",
    "explanation"
];


/* =========================================================
 * CANONICAL ANSWER TYPES
 * ======================================================= */

/**
 * answer.type determines the structure of answer.
 *
 * questionType does NOT directly determine the answer
 * structure anymore.
 */
const ANSWER_TYPES = {

    single: {
        required: ["value"]
    },

    multiple: {
        required: ["values"]
    },

    boolean: {
        required: ["value"]
    },

    pairs: {
        required: ["pairs"]
    },

    sequence: {
        required: ["order"]
    },

    text: {
        required: ["acceptedAnswers"]
    },

    number: {
        required: ["value"],
        optional: [
            "tolerance",
            "unit"
        ]
    },

    rubric: {
        required: ["rubric"]
    }
};


/**
 * questionType determines which answer.type values
 * are allowed.
 */
const QUESTION_ANSWER_TYPES = {

    mcq: [
        "single"
    ],

    multi_select: [
        "multiple"
    ],

    true_false: [
        "boolean"
    ],

    matching: [
        "pairs"
    ],

    ordering: [
        "sequence"
    ],

    fill_blank: [
        "text"
    ],

    short_answer: [
        "text"
    ],

    numeric: [
        "number"
    ],

    open_response: [
        "rubric"
    ],

    data_analysis: [
        "single",
        "multiple",
        "boolean",
        "number",
        "text",
        "rubric"
    ],

    experiment: [
        "single",
        "multiple",
        "boolean",
        "number",
        "text",
        "rubric"
    ],

    sequence: [
        "single",
        "multiple",
        "sequence",
        "text"
    ]
};


/* =========================================================
 * ERROR METADATA FALLBACK
 * ======================================================= */

/**
 * Canonical source:
 *
 * validation/error-codes.json
 *
 * This is only fallback metadata for standalone use.
 */
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

    QUESTION_PRIMARY_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_PRIMARY_NODE_NOT_IN_NODES: {
        severity: "error",
        category: "contract"
    },

    QUESTION_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_SECONDARY_NODE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_PREREQUISITE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_SKILL_NOT_FOUND: {
        severity: "error",
        category: "reference"
    },

    QUESTION_INVALID_EVIDENCE: {
        severity: "error",
        category: "contract"
    },

    QUESTION_INVALID_DIFFICULTY: {
        severity: "error",
        category: "contract"
    },

    QUESTION_INVALID_MODE: {
        severity: "error",
        category: "contract"
    },

    QUESTION_INVALID_TYPE: {
        severity: "error",
        category: "contract"
    },

    QUESTION_ANSWER_MISSING: {
        severity: "error",
        category: "contract"
    },

    QUESTION_ANSWER_TYPE_MISMATCH: {
        severity: "error",
        category: "contract"
    },

    QUESTION_ANSWER_OPTION_NOT_FOUND: {
        severity: "error",
        category: "contract"
    },

    QUESTION_MULTIPLE_CORRECT_OPTIONS: {
        severity: "error",
        category: "contract"
    },

    QUESTION_NO_CORRECT_OPTION: {
        severity: "error",
        category: "contract"
    },

    QUESTION_FAILURE_SIGNATURE_NOT_FOUND: {
        severity: "error",
        category: "reference"
    }
};


/* =========================================================
 * PUBLIC API
 * ======================================================= */

/**
 * Validate one Question.
 *
 * @param {Object} question
 * @param {Object} options
 *
 * options:
 * {
 *   knowledgeMap,
 *   failureRegistry,
 *   errorRegistry,
 *   path
 * }
 *
 * @returns {Object} validation report
 */
export function validateQuestion(
    question,
    options = {}
) {

    const startedAt = Date.now();

    const context = createContext(
        question,
        options
    );


    validateRootStructure(context);


    if (isPlainObject(question)) {

        buildIndexes(context);

        validateIdentity(context);

        validateNodeMapping(context);

        validateEvidence(context);

        validateDifficulty(context);

        validateModes(context);

        validateQuestionType(context);

        validateContent(context);

        validateAnswer(context);

        validateScoring(context);

        validateFailureSignatures(context);

        validateExplanation(context);

        validateHint(context);

        validateContext(context);

        validateRetestContract(context);
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
    question,
    options
) {

    return {

        question,

        knowledgeMap:
            options.knowledgeMap ?? null,

        failureRegistry:
            options.failureRegistry ?? null,

        errorRegistry:
            options.errorRegistry ?? null,

        targetPath:
            options.path ?? null,

        issues: [],

        indexes: {

            knowledgeNodeIds:
                new Set(),

            skillIds:
                new Set(),

            failureSignatureIds:
                new Set()
        }
    };
}


/* =========================================================
 * INDEX BUILDING
 * ======================================================= */

function buildIndexes(context) {

    buildKnowledgeIndexes(context);

    buildFailureSignatureIndex(context);
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


    /*
     * Optional dedicated skill collections.
     */
    const skillCollections = [
        map.skills,
        map.metaSkills
    ];


    for (
        const collection
        of skillCollections
    ) {

        if (!Array.isArray(collection)) {
            continue;
        }


        for (const skill of collection) {

            const id =
                typeof skill === "string"
                    ? skill
                    : skill?.id;


            if (typeof id === "string") {

                context.indexes
                    .skillIds
                    .add(id);
            }
        }
    }
}


function buildFailureSignatureIndex(
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


    /*
     * Support object-based registry.
     */
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
 * ROOT STRUCTURE
 * ======================================================= */

function validateRootStructure(context) {

    const q =
        context.question;


    if (!isPlainObject(q)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/",
            q,
            "object",
            "Question must be an object."
        );

        return;
    }


    for (const field of REQUIRED_FIELDS) {

        if (!(field in q)) {

            addIssue(
                context,
                "REQUIRED_FIELD_MISSING",
                `/${field}`,
                undefined,
                `Required field '${field}'`,
                `Required Question field '${field}' is missing.`
            );
        }
    }
}


/* =========================================================
 * IDENTITY
 * ======================================================= */

function validateIdentity(context) {

    const q =
        context.question;


    if ("id" in q) {

        if (
            typeof q.id !== "string"
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/id",
                q.id,
                "string",
                "Question id must be a string."
            );

        } else if (
            !QUESTION_ID_PATTERN.test(q.id)
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/id",
                q.id,
                "^Q-[A-Z]-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$",
                `Invalid Question ID '${q.id}'.`
            );
        }
    }


    if ("version" in q) {

        if (
            typeof q.version !== "string"
        ) {

            addIssue(
                context,
                "INVALID_FIELD_TYPE",
                "/version",
                q.version,
                "major.minor.patch",
                "Question version must be a string."
            );

        } else if (
            !VERSION_PATTERN.test(q.version)
        ) {

            addIssue(
                context,
                "INVALID_FORMAT",
                "/version",
                q.version,
                "major.minor.patch",
                `Invalid Question version '${q.version}'.`
            );
        }
    }
}


/* =========================================================
 * NODE MAPPING
 * ======================================================= */

function validateNodeMapping(context) {

    validateNodesArray(context);

    validatePrimaryNode(context);

    validateSecondaryNodes(context);

    validatePrerequisites(context);

    validateSkills(context);
}


function validateNodesArray(context) {

    const q =
        context.question;


    if (!("nodes" in q)) {
        return;
    }


    if (!Array.isArray(q.nodes)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/nodes",
            q.nodes,
            "array",
            "Question.nodes must be an array."
        );

        return;
    }


    if (q.nodes.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/nodes",
            q.nodes,
            "At least one directly measured node",
            "Question.nodes must contain at least one directly measured knowledge node."
        );

        return;
    }


    const seen =
        new Set();


    q.nodes.forEach(
        (nodeId, index) => {

            const path =
                `/nodes/${index}`;


            if (
                typeof nodeId !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    nodeId,
                    "string",
                    "Question node ID must be a string."
                );

                return;
            }


            if (seen.has(nodeId)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    path,
                    nodeId,
                    "Unique node ID",
                    `Duplicate node '${nodeId}' in Question.nodes.`
                );

                return;
            }


            seen.add(nodeId);


            if (
                hasKnowledgeMap(context) &&
                !context.indexes
                    .knowledgeNodeIds
                    .has(nodeId)
            ) {

                addIssue(
                    context,
                    "QUESTION_NODE_NOT_FOUND",
                    path,
                    nodeId,
                    "Existing knowledge node ID",
                    `Question node '${nodeId}' does not exist in Knowledge Map.`
                );
            }
        }
    );
}


function validatePrimaryNode(context) {

    const q =
        context.question;


    if (!("primaryNode" in q)) {
        return;
    }


    if (
        typeof q.primaryNode !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/primaryNode",
            q.primaryNode,
            "string",
            "Question.primaryNode must be a string."
        );

        return;
    }


    if (
        hasKnowledgeMap(context) &&
        !context.indexes
            .knowledgeNodeIds
            .has(q.primaryNode)
    ) {

        addIssue(
            context,
            "QUESTION_PRIMARY_NODE_NOT_FOUND",
            "/primaryNode",
            q.primaryNode,
            "Existing knowledge node ID",
            `primaryNode '${q.primaryNode}' does not exist in Knowledge Map.`
        );
    }


    if (
        Array.isArray(q.nodes) &&
        !q.nodes.includes(q.primaryNode)
    ) {

        addIssue(
            context,
            "QUESTION_PRIMARY_NODE_NOT_IN_NODES",
            "/primaryNode",
            q.primaryNode,
            "primaryNode must appear in nodes",
            `primaryNode '${q.primaryNode}' is not declared in Question.nodes.`
        );
    }
}


function validateSecondaryNodes(context) {

    const q =
        context.question;


    if (!("secondaryNodes" in q)) {
        return;
    }


    if (!Array.isArray(q.secondaryNodes)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/secondaryNodes",
            q.secondaryNodes,
            "array",
            "secondaryNodes must be an array."
        );

        return;
    }


    validateKnowledgeReferenceArray(
        context,
        q.secondaryNodes,
        "/secondaryNodes",
        "QUESTION_SECONDARY_NODE_NOT_FOUND"
    );
}


function validatePrerequisites(context) {

    const q =
        context.question;


    if (!("prerequisites" in q)) {
        return;
    }


    if (!Array.isArray(q.prerequisites)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/prerequisites",
            q.prerequisites,
            "array",
            "Question.prerequisites must be an array."
        );

        return;
    }


    validateKnowledgeReferenceArray(
        context,
        q.prerequisites,
        "/prerequisites",
        "QUESTION_PREREQUISITE_NOT_FOUND"
    );
}


function validateSkills(context) {

    const q =
        context.question;


    if (!("skills" in q)) {
        return;
    }


    if (!Array.isArray(q.skills)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/skills",
            q.skills,
            "array",
            "Question.skills must be an array."
        );

        return;
    }


    const seen =
        new Set();


    q.skills.forEach(
        (skillId, index) => {

            const path =
                `/skills/${index}`;


            if (
                typeof skillId !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    skillId,
                    "string",
                    "Skill ID must be a string."
                );

                return;
            }


            if (seen.has(skillId)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    path,
                    skillId,
                    "Unique skill ID",
                    `Duplicate skill '${skillId}'.`
                );

                return;
            }


            seen.add(skillId);


            if (
                hasKnowledgeMap(context) &&
                context.indexes.skillIds.size > 0 &&
                !context.indexes
                    .skillIds
                    .has(skillId)
            ) {

                addIssue(
                    context,
                    "QUESTION_SKILL_NOT_FOUND",
                    path,
                    skillId,
                    "Existing skill ID",
                    `Skill '${skillId}' does not exist in the skill registry.`
                );
            }
        }
    );
}


function validateKnowledgeReferenceArray(
    context,
    values,
    basePath,
    errorCode
) {

    const seen =
        new Set();


    values.forEach(
        (nodeId, index) => {

            const path =
                `${basePath}/${index}`;


            if (
                typeof nodeId !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    nodeId,
                    "string",
                    "Knowledge node reference must be a string."
                );

                return;
            }


            if (seen.has(nodeId)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    path,
                    nodeId,
                    "Unique knowledge node reference",
                    `Duplicate knowledge node reference '${nodeId}'.`
                );

                return;
            }


            seen.add(nodeId);


            if (
                hasKnowledgeMap(context) &&
                !context.indexes
                    .knowledgeNodeIds
                    .has(nodeId)
            ) {

                addIssue(
                    context,
                    errorCode,
                    path,
                    nodeId,
                    "Existing knowledge node ID",
                    `Knowledge node '${nodeId}' does not exist in Knowledge Map.`
                );
            }
        }
    );
}


/* =========================================================
 * EVIDENCE
 * ======================================================= */

function validateEvidence(context) {

    const q =
        context.question;


    if (!("evidence" in q)) {
        return;
    }


    if (
        typeof q.evidence !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/evidence",
            q.evidence,
            "string",
            "Question.evidence must be a string."
        );

        return;
    }


    if (
        !EVIDENCE_TYPES.has(q.evidence)
    ) {

        const message =
            q.evidence === "diagnostic"
                ? "diagnostic is a Question mode, not an evidence dimension."
                : `Invalid evidence '${q.evidence}'.`;


        addIssue(
            context,
            "QUESTION_INVALID_EVIDENCE",
            "/evidence",
            q.evidence,
            [...EVIDENCE_TYPES],
            message
        );
    }
}


/* =========================================================
 * DIFFICULTY
 * ======================================================= */

function validateDifficulty(context) {

    const q =
        context.question;


    if (!("difficulty" in q)) {
        return;
    }


    if (
        typeof q.difficulty !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/difficulty",
            q.difficulty,
            "string",
            "Question.difficulty must be a string."
        );

        return;
    }


    if (
        !DIFFICULTY_LEVELS.has(
            q.difficulty
        )
    ) {

        addIssue(
            context,
            "QUESTION_INVALID_DIFFICULTY",
            "/difficulty",
            q.difficulty,
            [...DIFFICULTY_LEVELS],
            `Invalid difficulty '${q.difficulty}'.`
        );
    }
}


/* =========================================================
 * MODE
 * ======================================================= */

function validateModes(context) {

    const q =
        context.question;


    if (!("mode" in q)) {
        return;
    }


    if (!Array.isArray(q.mode)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/mode",
            q.mode,
            "array",
            "Question.mode must be an array."
        );

        return;
    }


    if (q.mode.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/mode",
            q.mode,
            "At least one Question mode",
            "Question.mode must contain at least one mode."
        );

        return;
    }


    const seen =
        new Set();


    q.mode.forEach(
        (mode, index) => {

            const path =
                `/mode/${index}`;


            if (
                typeof mode !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    mode,
                    "string",
                    "Question mode must be a string."
                );

                return;
            }


            if (seen.has(mode)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    path,
                    mode,
                    "Unique Question mode",
                    `Duplicate Question mode '${mode}'.`
                );

                return;
            }


            seen.add(mode);


            if (
                !QUESTION_MODES.has(mode)
            ) {

                addIssue(
                    context,
                    "QUESTION_INVALID_MODE",
                    path,
                    mode,
                    [...QUESTION_MODES],
                    `Invalid Question mode '${mode}'.`
                );
            }
        }
    );
}


/* =========================================================
 * QUESTION TYPE
 * ======================================================= */

function validateQuestionType(context) {

    const q =
        context.question;


    if (!("questionType" in q)) {
        return;
    }


    if (
        typeof q.questionType !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/questionType",
            q.questionType,
            "string",
            "questionType must be a string."
        );

        return;
    }


    if (
        !QUESTION_TYPES.has(
            q.questionType
        )
    ) {

        addIssue(
            context,
            "QUESTION_INVALID_TYPE",
            "/questionType",
            q.questionType,
            [...QUESTION_TYPES],
            `Invalid questionType '${q.questionType}'.`
        );
    }
}


/* =========================================================
 * CONTENT
 * ======================================================= */

function validateContent(context) {

    const q =
        context.question;


    if (!("content" in q)) {
        return;
    }


    if (!isPlainObject(q.content)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/content",
            q.content,
            "object",
            "Question.content must be an object."
        );

        return;
    }


    if (!("stem" in q.content)) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/content/stem",
            undefined,
            "Question stem",
            "Question.content.stem is required."
        );

    } else if (
        typeof q.content.stem !== "string" ||
        q.content.stem.trim() === ""
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/content/stem",
            q.content.stem,
            "Non-empty string",
            "Question stem must be a non-empty string."
        );
    }


    /*
     * Options are structurally required when the
     * canonical answer format is option-based.
     *
     * mcq and multi_select always require options.
     */
    if (
        q.questionType === "mcq" ||
        q.questionType === "multi_select"
    ) {

        validateOptions(context);
    }
}


/* =========================================================
 * OPTIONS
 * ======================================================= */

function validateOptions(context) {

    const q =
        context.question;

    const options =
        q.content?.options;


    if (!Array.isArray(options)) {

        addIssue(
            context,
            "QUESTION_ANSWER_MISSING",
            "/content/options",
            options,
            "Array of answer options",
            `${q.questionType} requires content.options.`
        );

        return;
    }


    if (options.length < 2) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/content/options",
            options,
            "At least two options",
            `${q.questionType} must contain at least two options.`
        );
    }


    const ids =
        new Set();


    options.forEach(
        (option, index) => {

            const basePath =
                `/content/options/${index}`;


            if (!isPlainObject(option)) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    basePath,
                    option,
                    "object",
                    "Question option must be an object."
                );

                return;
            }


            for (
                const field
                of [
                    "id",
                    "text",
                    "isCorrect"
                ]
            ) {

                if (!(field in option)) {

                    addIssue(
                        context,
                        "REQUIRED_FIELD_MISSING",
                        `${basePath}/${field}`,
                        undefined,
                        field,
                        `Question option is missing '${field}'.`
                    );
                }
            }


            if (
                "id" in option &&
                typeof option.id !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    `${basePath}/id`,
                    option.id,
                    "string",
                    "Option id must be a string."
                );
            }


            if (
                typeof option.id === "string"
            ) {

                if (ids.has(option.id)) {

                    addIssue(
                        context,
                        "INVALID_FORMAT",
                        `${basePath}/id`,
                        option.id,
                        "Unique option ID",
                        `Duplicate option ID '${option.id}'.`
                    );

                } else {

                    ids.add(option.id);
                }
            }


            if (
                "text" in option &&
                typeof option.text !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    `${basePath}/text`,
                    option.text,
                    "string",
                    "Option text must be a string."
                );
            }


            if (
                "isCorrect" in option &&
                typeof option.isCorrect !== "boolean"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    `${basePath}/isCorrect`,
                    option.isCorrect,
                    "boolean",
                    "Option.isCorrect must be boolean."
                );
            }
        }
    );
}


/* =========================================================
 * ANSWER — GENERIC CONTRACT
 * ======================================================= */

function validateAnswer(context) {

    const q =
        context.question;


    if (!("answer" in q)) {
        return;
    }


    if (!isPlainObject(q.answer)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer",
            q.answer,
            "object",
            "Question.answer must be an object."
        );

        return;
    }


    if (!("type" in q.answer)) {

        addIssue(
            context,
            "QUESTION_ANSWER_MISSING",
            "/answer/type",
            undefined,
            "Canonical answer type",
            "Question.answer.type is required."
        );

        return;
    }


    if (
        typeof q.answer.type !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/type",
            q.answer.type,
            "string",
            "Question.answer.type must be a string."
        );

        return;
    }


    const answerTypeRule =
        ANSWER_TYPES[q.answer.type];


    if (!answerTypeRule) {

        addIssue(
            context,
            "INVALID_ENUM_VALUE",
            "/answer/type",
            q.answer.type,
            Object.keys(ANSWER_TYPES),
            `Unknown answer type '${q.answer.type}'.`
        );

        return;
    }


    /*
     * questionType -> allowed answer types
     */
    const allowedTypes =
        QUESTION_ANSWER_TYPES[
        q.questionType
        ];


    if (
        Array.isArray(allowedTypes) &&
        !allowedTypes.includes(
            q.answer.type
        )
    ) {

        addIssue(
            context,
            "QUESTION_ANSWER_TYPE_MISMATCH",
            "/answer/type",
            q.answer.type,
            allowedTypes,
            `answer.type '${q.answer.type}' is not allowed for questionType '${q.questionType}'.`
        );
    }


    /*
     * answer.type -> required fields
     */
    for (
        const field
        of answerTypeRule.required
    ) {

        if (!(field in q.answer)) {

            addIssue(
                context,
                "QUESTION_ANSWER_MISSING",
                `/answer/${field}`,
                undefined,
                field,
                `answer.type '${q.answer.type}' requires field '${field}'.`
            );
        }
    }


    /*
     * Type-specific structural validation.
     */
    switch (q.answer.type) {

        case "single":
            validateSingleAnswer(context);
            break;

        case "multiple":
            validateMultipleAnswer(context);
            break;

        case "boolean":
            validateBooleanAnswer(context);
            break;

        case "pairs":
            validatePairsAnswer(context);
            break;

        case "sequence":
            validateSequenceAnswer(context);
            break;

        case "text":
            validateTextAnswer(context);
            break;

        case "number":
            validateNumericAnswer(context);
            break;

        case "rubric":
            validateRubricAnswer(context);
            break;
    }
}


/* =========================================================
 * SINGLE ANSWER
 * ======================================================= */

function validateSingleAnswer(context) {

    const q =
        context.question;


    if (
        typeof q.answer.value !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/value",
            q.answer.value,
            "option ID string",
            "single answer.value must be an option ID string."
        );

        return;
    }


    validateOptionBasedAnswer(
        context,
        new Set([
            q.answer.value
        ]),
        true
    );
}


/* =========================================================
 * MULTIPLE ANSWER
 * ======================================================= */

function validateMultipleAnswer(context) {

    const q =
        context.question;


    if (!Array.isArray(q.answer.values)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/values",
            q.answer.values,
            "array",
            "multiple answer.values must be an array."
        );

        return;
    }


    if (q.answer.values.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/answer/values",
            q.answer.values,
            "At least one option ID",
            "multiple answer.values must contain at least one option ID."
        );

        return;
    }


    const answerSet =
        new Set();


    q.answer.values.forEach(
        (value, index) => {

            if (
                typeof value !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    `/answer/values/${index}`,
                    value,
                    "string",
                    "multiple answer value must be an option ID string."
                );

                return;
            }


            if (answerSet.has(value)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `/answer/values/${index}`,
                    value,
                    "Unique option ID",
                    `Duplicate answer option '${value}'.`
                );

                return;
            }


            answerSet.add(value);
        }
    );


    validateOptionBasedAnswer(
        context,
        answerSet,
        false
    );
}


/* =========================================================
 * OPTION-BASED CONSISTENCY
 * ======================================================= */

function validateOptionBasedAnswer(
    context,
    answerSet,
    requireExactlyOne
) {

    const q =
        context.question;

    const options =
        q.content?.options;


    if (!Array.isArray(options)) {

        addIssue(
            context,
            "QUESTION_ANSWER_MISSING",
            "/content/options",
            options,
            "Array of options",
            `answer.type '${q.answer.type}' requires content.options.`
        );

        return;
    }


    /*
     * Composite types such as data_analysis may use
     * single/multiple answers, therefore validate their
     * options here even though validateContent() does not
     * require options for every composite question.
     */
    if (
        q.questionType !== "mcq" &&
        q.questionType !== "multi_select"
    ) {

        validateOptions(context);
    }


    const optionIds =
        new Set(
            options
                .filter(
                    option =>
                        typeof option?.id
                        === "string"
                )
                .map(
                    option =>
                        option.id
                )
        );


    for (const answerId of answerSet) {

        if (!optionIds.has(answerId)) {

            addIssue(
                context,
                "QUESTION_ANSWER_OPTION_NOT_FOUND",
                requireExactlyOne
                    ? "/answer/value"
                    : "/answer/values",
                answerId,
                "Existing option ID",
                `Answer option '${answerId}' does not exist in content.options.`
            );
        }
    }


    const correctOptions =
        options.filter(
            option =>
                option?.isCorrect === true
        );


    if (correctOptions.length === 0) {

        addIssue(
            context,
            "QUESTION_NO_CORRECT_OPTION",
            "/content/options",
            [],
            requireExactlyOne
                ? "Exactly one correct option"
                : "At least one correct option",
            "No option is marked isCorrect=true."
        );
    }


    if (
        requireExactlyOne &&
        correctOptions.length > 1
    ) {

        addIssue(
            context,
            "QUESTION_MULTIPLE_CORRECT_OPTIONS",
            "/content/options",
            correctOptions.map(
                option => option.id
            ),
            "Exactly one correct option",
            "Single-answer question contains multiple correct options."
        );
    }


    /*
     * answer is canonical source of truth.
     *
     * isCorrect must match it exactly.
     */
    options.forEach(
        (option, index) => {

            if (
                typeof option?.id !== "string" ||
                typeof option?.isCorrect !== "boolean"
            ) {
                return;
            }


            const expected =
                answerSet.has(option.id);


            if (
                option.isCorrect !== expected
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `/content/options/${index}/isCorrect`,
                    option.isCorrect,
                    expected,
                    `Option '${option.id}' isCorrect flag does not match canonical answer.`
                );
            }
        }
    );
}


/* =========================================================
 * BOOLEAN ANSWER
 * ======================================================= */

function validateBooleanAnswer(context) {

    const value =
        context.question
            .answer
            .value;


    if (
        typeof value !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/value",
            value,
            "boolean",
            "boolean answer.value must be boolean."
        );
    }
}


/* =========================================================
 * PAIRS ANSWER
 * ======================================================= */

function validatePairsAnswer(context) {

    const pairs =
        context.question
            .answer
            .pairs;


    if (!Array.isArray(pairs)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/pairs",
            pairs,
            "array",
            "pairs answer.pairs must be an array."
        );

        return;
    }


    if (pairs.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/answer/pairs",
            pairs,
            "At least one pair",
            "pairs answer must contain at least one pair."
        );
    }
}


/* =========================================================
 * SEQUENCE ANSWER
 * ======================================================= */

function validateSequenceAnswer(context) {

    const order =
        context.question
            .answer
            .order;


    if (!Array.isArray(order)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/order",
            order,
            "array",
            "sequence answer.order must be an array."
        );

        return;
    }


    if (order.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/answer/order",
            order,
            "Non-empty sequence",
            "sequence answer.order must not be empty."
        );

        return;
    }


    const seen =
        new Set();


    order.forEach(
        (item, index) => {

            if (
                typeof item !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    `/answer/order/${index}`,
                    item,
                    "string",
                    "sequence item must be a string."
                );

                return;
            }


            if (seen.has(item)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `/answer/order/${index}`,
                    item,
                    "Unique sequence item",
                    `Duplicate sequence item '${item}'.`
                );

                return;
            }


            seen.add(item);
        }
    );
}


/* =========================================================
 * TEXT ANSWER
 * ======================================================= */

function validateTextAnswer(context) {

    const answer =
        context.question.answer;

    const acceptedAnswers =
        answer.acceptedAnswers;


    if (!Array.isArray(acceptedAnswers)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/acceptedAnswers",
            acceptedAnswers,
            "array",
            "text answer.acceptedAnswers must be an array."
        );

        return;
    }


    if (acceptedAnswers.length === 0) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/answer/acceptedAnswers",
            acceptedAnswers,
            "At least one accepted answer",
            "acceptedAnswers must contain at least one answer."
        );

        return;
    }


    acceptedAnswers.forEach(
        (value, index) => {

            if (
                typeof value !== "string" ||
                value.trim() === ""
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `/answer/acceptedAnswers/${index}`,
                    value,
                    "Non-empty string",
                    "Each accepted answer must be a non-empty string."
                );
            }
        }
    );


    if (
        "acceptedPatterns" in answer &&
        !Array.isArray(
            answer.acceptedPatterns
        )
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/acceptedPatterns",
            answer.acceptedPatterns,
            "array",
            "acceptedPatterns must be an array."
        );
    }
}


/* =========================================================
 * NUMBER ANSWER
 * ======================================================= */

function validateNumericAnswer(context) {

    const answer =
        context.question.answer;


    if (
        typeof answer.value !== "number" ||
        !Number.isFinite(answer.value)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/value",
            answer.value,
            "finite number",
            "number answer.value must be a finite number."
        );
    }


    if (
        "tolerance" in answer &&
        (
            typeof answer.tolerance
            !== "number" ||
            !Number.isFinite(
                answer.tolerance
            ) ||
            answer.tolerance < 0
        )
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/answer/tolerance",
            answer.tolerance,
            "Non-negative finite number",
            "answer.tolerance must be a non-negative finite number."
        );
    }


    if (
        "unit" in answer &&
        answer.unit !== null &&
        typeof answer.unit !== "string"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/unit",
            answer.unit,
            "string or null",
            "answer.unit must be a string or null."
        );
    }
}


/* =========================================================
 * RUBRIC ANSWER
 * ======================================================= */

function validateRubricAnswer(context) {

    const rubric =
        context.question
            .answer
            .rubric;


    if (
        rubric === undefined ||
        rubric === null
    ) {

        addIssue(
            context,
            "QUESTION_ANSWER_MISSING",
            "/answer/rubric",
            rubric,
            "Rubric definition",
            "rubric answer requires answer.rubric."
        );

        return;
    }


    if (
        !isPlainObject(rubric) &&
        !Array.isArray(rubric)
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/answer/rubric",
            rubric,
            "object or array",
            "answer.rubric must be an object or array."
        );
    }
}


/* =========================================================
 * SCORING
 * ======================================================= */

function validateScoring(context) {

    const q =
        context.question;


    if (!("scoring" in q)) {
        return;
    }


    if (!isPlainObject(q.scoring)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/scoring",
            q.scoring,
            "object",
            "Question.scoring must be an object."
        );

        return;
    }


    if (!("maxScore" in q.scoring)) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/scoring/maxScore",
            undefined,
            "Positive number",
            "scoring.maxScore is required."
        );

    } else if (
        typeof q.scoring.maxScore !== "number" ||
        !Number.isFinite(
            q.scoring.maxScore
        ) ||
        q.scoring.maxScore <= 0
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/scoring/maxScore",
            q.scoring.maxScore,
            "Positive finite number",
            "scoring.maxScore must be a positive finite number."
        );
    }


    if (
        "partialCredit" in q.scoring &&
        typeof q.scoring.partialCredit
        !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/scoring/partialCredit",
            q.scoring.partialCredit,
            "boolean",
            "scoring.partialCredit must be boolean."
        );
    }
}


/* =========================================================
 * FAILURE SIGNATURES
 * ======================================================= */

function validateFailureSignatures(
    context
) {

    const q =
        context.question;


    if (!("failureSignatures" in q)) {
        return;
    }


    if (
        !Array.isArray(
            q.failureSignatures
        )
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/failureSignatures",
            q.failureSignatures,
            "array",
            "failureSignatures must be an array."
        );

        return;
    }


    if (
        q.failureSignatures.length < 1
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/failureSignatures",
            q.failureSignatures,
            "At least one failure signature",
            "Question must declare at least one failure signature."
        );

        return;
    }


    const seen =
        new Set();


    q.failureSignatures.forEach(
        (signatureId, index) => {

            const path =
                `/failureSignatures/${index}`;


            if (
                typeof signatureId !== "string"
            ) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    signatureId,
                    "string",
                    "Failure signature ID must be a string."
                );

                return;
            }


            if (seen.has(signatureId)) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    path,
                    signatureId,
                    "Unique failure signature ID",
                    `Duplicate failure signature '${signatureId}'.`
                );

                return;
            }


            seen.add(signatureId);


            if (
                context.failureRegistry &&
                context.indexes
                    .failureSignatureIds
                    .size > 0 &&
                !context.indexes
                    .failureSignatureIds
                    .has(signatureId)
            ) {

                addIssue(
                    context,
                    "QUESTION_FAILURE_SIGNATURE_NOT_FOUND",
                    path,
                    signatureId,
                    "Existing failure signature ID",
                    `Failure signature '${signatureId}' does not exist in canonical registry.`
                );
            }
        }
    );
}


/* =========================================================
 * EXPLANATION
 * ======================================================= */

function validateExplanation(context) {

    const q =
        context.question;


    /*
     * Contract V1.1:
     *
     * explanation is REQUIRED.
     */
    if (!("explanation" in q)) {

        /*
         * Root validator already reports missing required
         * field, therefore do not duplicate the issue here.
         */
        return;
    }


    if (!isPlainObject(q.explanation)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/explanation",
            q.explanation,
            "object",
            "Question.explanation must be an object."
        );

        return;
    }


    /*
     * explanation.correct is REQUIRED.
     */
    if (!("correct" in q.explanation)) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/explanation/correct",
            undefined,
            "Correct-answer explanation",
            "Question.explanation.correct is required."
        );

    } else if (
        typeof q.explanation.correct
        !== "string" ||
        q.explanation.correct.trim() === ""
    ) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/explanation/correct",
            q.explanation.correct,
            "Non-empty string",
            "Correct-answer explanation must be a non-empty string."
        );
    }


    /*
     * explanation.incorrect remains OPTIONAL.
     */
    if (
        "incorrect" in q.explanation &&
        q.explanation.incorrect !== null &&
        !isPlainObject(
            q.explanation.incorrect
        )
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/explanation/incorrect",
            q.explanation.incorrect,
            "object or null",
            "Question.explanation.incorrect must be an object or null."
        );
    }
}


/* =========================================================
 * HINT
 * ======================================================= */

function validateHint(context) {

    const hint =
        context.question.hint;


    if (hint === undefined) {
        return;
    }


    if (!isPlainObject(hint)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/hint",
            hint,
            "object",
            "Question.hint must be an object."
        );

        return;
    }


    if (
        "enabled" in hint &&
        typeof hint.enabled !== "boolean"
    ) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/hint/enabled",
            hint.enabled,
            "boolean",
            "hint.enabled must be boolean."
        );
    }


    if (!("levels" in hint)) {
        return;
    }


    if (!Array.isArray(hint.levels)) {

        addIssue(
            context,
            "INVALID_FIELD_TYPE",
            "/hint/levels",
            hint.levels,
            "array",
            "hint.levels must be an array."
        );

        return;
    }


    if (hint.levels.length > 2) {

        addIssue(
            context,
            "INVALID_FORMAT",
            "/hint/levels",
            hint.levels.length,
            "Maximum 2 hint levels",
            "Question may contain at most two hint levels."
        );
    }


    const seenLevels =
        new Set();


    hint.levels.forEach(
        (level, index) => {

            const path =
                `/hint/levels/${index}`;


            if (!isPlainObject(level)) {

                addIssue(
                    context,
                    "INVALID_FIELD_TYPE",
                    path,
                    level,
                    "object",
                    "Hint level must be an object."
                );

                return;
            }


            if (
                !Number.isInteger(
                    level.level
                ) ||
                ![1, 2].includes(
                    level.level
                )
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/level`,
                    level.level,
                    "1 or 2",
                    "Hint level must be 1 or 2."
                );
            }


            if (
                seenLevels.has(level.level)
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/level`,
                    level.level,
                    "Unique hint level",
                    `Duplicate hint level '${level.level}'.`
                );

            } else {

                seenLevels.add(
                    level.level
                );
            }


            if (
                typeof level.text !== "string" ||
                level.text.trim() === ""
            ) {

                addIssue(
                    context,
                    "INVALID_FORMAT",
                    `${path}/text`,
                    level.text,
                    "Non-empty string",
                    "Hint text must be a non-empty string."
                );
            }
        }
    );
}


/* =========================================================
 * CONTEXT
 * ======================================================= */

function validateContext(context) {

    const q =
        context.question;


    const requiresContext =
        q.evidence === "transfer" ||
        (
            Array.isArray(q.mode) &&
            q.mode.includes("retest")
        );


    if (!requiresContext) {
        return;
    }


    const contextId =
        getContextId(q);


    if (!contextId) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/context/contextId",
            undefined,
            "contextId",
            "contextId is required for transfer evidence or retest mode."
        );
    }


    const contextType =
        getContextType(q);


    if (
        contextType !== null &&
        !CONTEXT_TYPES.has(
            contextType
        )
    ) {

        addIssue(
            context,
            "INVALID_ENUM_VALUE",
            "/context/contextType",
            contextType,
            [...CONTEXT_TYPES],
            `Invalid contextType '${contextType}'.`
        );
    }
}


/* =========================================================
 * RETEST CONTRACT
 * ======================================================= */

function validateRetestContract(
    context
) {

    const q =
        context.question;


    if (
        !Array.isArray(q.mode) ||
        !q.mode.includes("retest")
    ) {
        return;
    }


    const retestGroupId =
        q.retestGroupId ??
        q.context?.retestGroupId;


    if (
        typeof retestGroupId !== "string" ||
        retestGroupId.trim() === ""
    ) {

        addIssue(
            context,
            "REQUIRED_FIELD_MISSING",
            "/retestGroupId",
            retestGroupId,
            "Non-empty retestGroupId",
            "Question in retest mode requires retestGroupId."
        );
    }
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
        issue.related = related;
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
            `Question Validator attempted to emit unknown validation code '${code}'.`
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
                context.question?.id
            ),

        validator: {

            name:
                VALIDATOR_NAME,

            version:
                VALIDATOR_VERSION
        },

        target: {

            type:
                "question",

            id:
                typeof context.question?.id
                    === "string"
                    ? context.question.id
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

function hasKnowledgeMap(context) {

    return (
        context.knowledgeMap !== null &&
        context.knowledgeMap !== undefined
    );
}


function getContextId(question) {

    if (
        typeof question.contextId
        === "string" &&
        question.contextId.trim() !== ""
    ) {

        return question.contextId;
    }


    if (
        typeof question.context?.contextId
        === "string" &&
        question.context.contextId.trim()
        !== ""
    ) {

        return question.context.contextId;
    }


    return null;
}


function getContextType(question) {

    if (
        typeof question.contextType
        === "string"
    ) {

        return question.contextType;
    }


    if (
        typeof question.context?.contextType
        === "string"
    ) {

        return question.context.contextType;
    }


    return null;
}


function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function createValidationId(
    questionId
) {

    const safeId =
        typeof questionId === "string"
            ? questionId
            : "unknown";


    return (
        `validation-question-${safeId}-` +
        Date.now().toString(36)
    );
}