/**
 * Lesson Engine
 * Version: 1.0.0
 *
 * Responsibility:
 *   Project a validated lesson definition into a runtime delivery plan
 *   using:
 *     - delivery mode
 *     - an already-decided Adaptive action
 *     - optional target node
 *
 * Lesson Engine DOES:
 *   - validate its runtime inputs
 *   - project Adaptive action -> eligible lesson sections
 *   - apply delivery-mode compatibility
 *   - apply target-node relevance
 *   - preserve question-selection requests for QuestionSelector
 *   - expose deterministic delivery-plan navigation
 *
 * Lesson Engine DOES NOT:
 *   - calculate mastery
 *   - inspect Mastery Rules
 *   - decide the next Adaptive action
 *   - diagnose failure signatures
 *   - select concrete questions
 *   - evaluate answers
 *   - mutate Student State
 *   - mutate lesson definitions
 *   - mutate lesson progress
 *
 * Ownership:
 *   Knowledge Engine   -> knowledge structure
 *   QuestionSelector  -> concrete question selection
 *   AnswerEvaluator   -> answer evaluation
 *   Mastery Engine    -> evidence -> mastery
 *   Adaptive Engine   -> next action
 *   Remediation Engine-> failure diagnosis / remediation strategy
 *   Lesson Engine     -> lesson definition -> delivery projection
 *   StudySession      -> runtime orchestration
 */

const ENGINE_NAME = "LessonEngine";
const ENGINE_VERSION = "1.0.0";
const LESSON_SCHEMA_VERSION = "1.0.0";

const DELIVERY_MODES = Object.freeze([
    "HOC_NHANH",
    "HOC_SAU",
    "ON_THI"
]);

const ADAPTIVE_ACTIONS = Object.freeze([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);

const SECTION_TYPES = Object.freeze([
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

/**
 * Action -> section projection.
 *
 * IMPORTANT:
 * This does NOT decide the action.
 * It only projects an action already chosen by Adaptive Engine
 * into lesson delivery section types.
 */
const ACTION_SECTION_TYPES = Object.freeze({
    LEARN: Object.freeze([
        "orientation",
        "observation",
        "concept",
        "comparison",
        "mechanism",
        "workedExample",
        "guidedPractice",
        "summary",
        "reflection"
    ]),

    PRACTICE: Object.freeze([
        "workedExample",
        "guidedPractice",
        "practice",
        "apply",
        "reflection"
    ]),

    CHALLENGE: Object.freeze([
        "apply",
        "crossNode",
        "transfer",
        "reflection"
    ]),

    REMEDIATE: Object.freeze([
        "remediation",
        "concept",
        "comparison",
        "mechanism",
        "guidedPractice"
    ]),

    RETEST: Object.freeze([
        "exitDiagnostic",
        "transfer"
    ]),

    REVIEW: Object.freeze([
        "summary",
        "comparison",
        "practice",
        "crossNode",
        "reflection"
    ]),

    SKIP: Object.freeze([])
});

/**
 * Delivery mode -> section compatibility.
 *
 * Delivery mode is a projection/filter.
 * It MUST NOT change the Adaptive action.
 */
const MODE_SECTION_TYPES = Object.freeze({
    HOC_NHANH: Object.freeze([
        "entryDiagnostic",
        "concept",
        "observation",
        "comparison",
        "workedExample",
        "guidedPractice",
        "practice",
        "apply",
        "transfer",
        "crossNode",
        "remediation",
        "exitDiagnostic",
        "summary"
    ]),

    HOC_SAU: Object.freeze([
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
    ]),

    ON_THI: Object.freeze([
        "entryDiagnostic",
        "concept",
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
    ])
});

const PLAN_STATUSES = Object.freeze({
    READY: "READY",
    SKIPPED: "SKIPPED",
    NO_DELIVERY_MATCH: "NO_DELIVERY_MATCH"
});

const NEXT_ITEM_STATUSES = Object.freeze({
    NEXT_ITEM: "NEXT_ITEM",
    PLAN_COMPLETE: "PLAN_COMPLETE"
});

const DISPOSITIONS = Object.freeze({
    INCLUDE: "include",
    EXCLUDE: "exclude"
});

const REASONS = Object.freeze({
    ACTION_LEARN: "ACTION_LEARN",
    ACTION_PRACTICE: "ACTION_PRACTICE",
    ACTION_CHALLENGE: "ACTION_CHALLENGE",
    ACTION_REMEDIATE: "ACTION_REMEDIATE",
    ACTION_RETEST: "ACTION_RETEST",
    ACTION_REVIEW: "ACTION_REVIEW",

    ADAPTIVE_SKIP: "ADAPTIVE_SKIP",

    NOT_RELEVANT_TO_ACTION:
        "NOT_RELEVANT_TO_ACTION",

    NOT_COMPATIBLE_WITH_DELIVERY_MODE:
        "NOT_COMPATIBLE_WITH_DELIVERY_MODE",

    NOT_RELEVANT_TO_TARGET_NODE:
        "NOT_RELEVANT_TO_TARGET_NODE"
});


/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function isPlainObject(value) {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return (
        prototype === Object.prototype ||
        prototype === null
    );
}

function clonePlainObject(value) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    if (
        typeof structuredClone === "function"
    ) {
        return structuredClone(value);
    }

    return JSON.parse(
        JSON.stringify(value)
    );
}

function uniqueStrings(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [
        ...new Set(
            values.filter(
                value =>
                    typeof value === "string" &&
                    value.length > 0
            )
        )
    ];
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(
        object,
        key
    );
}


/* -------------------------------------------------------------------------- */
/* Runtime validation                                                         */
/* -------------------------------------------------------------------------- */

function validateLessonInput(lesson) {
    if (!isPlainObject(lesson)) {
        throw new TypeError(
            "LessonEngine requires a lesson object."
        );
    }

    if (
        typeof lesson.id !== "string" ||
        lesson.id.length === 0
    ) {
        throw new TypeError(
            "LessonEngine requires lesson.id."
        );
    }

    if (
        typeof lesson.version !== "string" ||
        lesson.version.length === 0
    ) {
        throw new TypeError(
            `Lesson '${lesson.id}' requires version.`
        );
    }

    if (!Array.isArray(lesson.deliveryModes)) {
        throw new TypeError(
            `Lesson '${lesson.id}' requires deliveryModes.`
        );
    }

    if (!Array.isArray(lesson.sections)) {
        throw new TypeError(
            `Lesson '${lesson.id}' requires sections.`
        );
    }

    for (const section of lesson.sections) {
        if (!isPlainObject(section)) {
            throw new TypeError(
                `Lesson '${lesson.id}' contains an invalid section.`
            );
        }

        if (
            typeof section.id !== "string" ||
            section.id.length === 0
        ) {
            throw new TypeError(
                `Lesson '${lesson.id}' contains a section without id.`
            );
        }

        if (
            typeof section.type !== "string" ||
            !SECTION_TYPES.includes(section.type)
        ) {
            throw new Error(
                `Lesson '${lesson.id}' section '${section.id}' has unsupported section type '${section.type}'.`
            );
        }
    }
}

function validateDeliveryMode(
    lesson,
    deliveryMode
) {
    if (
        typeof deliveryMode !== "string" ||
        !DELIVERY_MODES.includes(deliveryMode)
    ) {
        throw new Error(
            `Unsupported deliveryMode '${deliveryMode}'.`
        );
    }

    if (
        !lesson.deliveryModes.includes(
            deliveryMode
        )
    ) {
        throw new Error(
            `Lesson '${lesson.id}' does not support deliveryMode '${deliveryMode}'.`
        );
    }
}

function validateAdaptiveDecision(
    adaptiveDecision
) {
    if (!isPlainObject(adaptiveDecision)) {
        throw new TypeError(
            "LessonEngine requires an adaptiveDecision object."
        );
    }

    const { action } = adaptiveDecision;

    if (
        typeof action !== "string" ||
        !ADAPTIVE_ACTIONS.includes(action)
    ) {
        throw new Error(
            `Unsupported adaptive action '${action}'.`
        );
    }

    if (
        hasOwn(
            adaptiveDecision,
            "targetNodeId"
        ) &&
        adaptiveDecision.targetNodeId !== null &&
        (
            typeof adaptiveDecision.targetNodeId !==
            "string" ||
            adaptiveDecision.targetNodeId.length === 0
        )
    ) {
        throw new TypeError(
            "adaptiveDecision.targetNodeId must be a non-empty string or null."
        );
    }
}


/* -------------------------------------------------------------------------- */
/* Projection                                                                 */
/* -------------------------------------------------------------------------- */

function getActionReason(action) {
    switch (action) {
        case "LEARN":
            return REASONS.ACTION_LEARN;

        case "PRACTICE":
            return REASONS.ACTION_PRACTICE;

        case "CHALLENGE":
            return REASONS.ACTION_CHALLENGE;

        case "REMEDIATE":
            return REASONS.ACTION_REMEDIATE;

        case "RETEST":
            return REASONS.ACTION_RETEST;

        case "REVIEW":
            return REASONS.ACTION_REVIEW;

        case "SKIP":
            return REASONS.ADAPTIVE_SKIP;

        default:
            throw new Error(
                `Unsupported adaptive action '${action}'.`
            );
    }
}

function isActionCompatible(
    sectionType,
    action
) {
    return ACTION_SECTION_TYPES[
        action
    ].includes(sectionType);
}

function isModeCompatible(
    sectionType,
    deliveryMode
) {
    return MODE_SECTION_TYPES[
        deliveryMode
    ].includes(sectionType);
}

/**
 * Target-node filtering is intentionally conservative.
 *
 * If Adaptive Engine did not specify a target node,
 * Lesson Engine does not invent one.
 *
 * Sections without node bindings are treated as globally
 * relevant delivery content.
 */
function isTargetNodeRelevant(
    section,
    targetNodeId
) {
    if (!targetNodeId) {
        return true;
    }

    if (
        !Array.isArray(section.nodes) ||
        section.nodes.length === 0
    ) {
        return true;
    }

    return section.nodes.includes(
        targetNodeId
    );
}

function determineDisposition({
    section,
    action,
    deliveryMode,
    targetNodeId
}) {
    if (action === "SKIP") {
        return {
            disposition:
                DISPOSITIONS.EXCLUDE,

            reason:
                REASONS.ADAPTIVE_SKIP
        };
    }

    if (
        !isActionCompatible(
            section.type,
            action
        )
    ) {
        return {
            disposition:
                DISPOSITIONS.EXCLUDE,

            reason:
                REASONS
                    .NOT_RELEVANT_TO_ACTION
        };
    }

    if (
        !isModeCompatible(
            section.type,
            deliveryMode
        )
    ) {
        return {
            disposition:
                DISPOSITIONS.EXCLUDE,

            reason:
                REASONS
                    .NOT_COMPATIBLE_WITH_DELIVERY_MODE
        };
    }

    if (
        !isTargetNodeRelevant(
            section,
            targetNodeId
        )
    ) {
        return {
            disposition:
                DISPOSITIONS.EXCLUDE,

            reason:
                REASONS
                    .NOT_RELEVANT_TO_TARGET_NODE
        };
    }

    return {
        disposition:
            DISPOSITIONS.INCLUDE,

        reason:
            getActionReason(action)
    };
}


/* -------------------------------------------------------------------------- */
/* Delivery item projection                                                   */
/* -------------------------------------------------------------------------- */

function buildQuestionRequest(section) {
    if (
        !isPlainObject(section.questionSet)
    ) {
        return null;
    }

    const selection =
        section.questionSet.selection;

    if (!isPlainObject(selection)) {
        return null;
    }

    return clonePlainObject(selection);
}

function determineItemKind(section) {
    if (
        isPlainObject(section.questionSet)
    ) {
        return "question_set";
    }

    if (
        section.type ===
        "entryDiagnostic"
    ) {
        return "diagnostic";
    }

    if (
        section.type ===
        "exitDiagnostic"
    ) {
        return "diagnostic";
    }

    return "content";
}

function projectSection({
    section,
    action,
    deliveryMode,
    targetNodeId
}) {
    const {
        disposition,
        reason
    } = determineDisposition({
        section,
        action,
        deliveryMode,
        targetNodeId
    });

    const item = {
        sectionId: section.id,
        sectionType: section.type,

        kind:
            determineItemKind(section),

        disposition,
        reason,

        nodes:
            uniqueStrings(section.nodes),

        estimatedMinutes:
            Number.isFinite(
                section.estimatedMinutes
            )
                ? section.estimatedMinutes
                : null
    };

    const questionRequest =
        buildQuestionRequest(section);

    if (questionRequest !== null) {
        item.questionRequest =
            questionRequest;
    }

    return item;
}


/* -------------------------------------------------------------------------- */
/* Plan construction                                                          */
/* -------------------------------------------------------------------------- */

function determinePlanStatus(
    action,
    items
) {
    if (action === "SKIP") {
        return PLAN_STATUSES.SKIPPED;
    }

    const included =
        items.some(
            item =>
                item.disposition ===
                DISPOSITIONS.INCLUDE
        );

    if (!included) {
        return PLAN_STATUSES
            .NO_DELIVERY_MATCH;
    }

    return PLAN_STATUSES.READY;
}

/**
 * Build a deterministic delivery projection.
 *
 * IMPORTANT:
 * - does not mutate lesson
 * - does not mutate adaptiveDecision
 * - does not inspect Student State
 * - does not calculate mastery
 * - does not select questions
 */
function buildLessonPlan({
    lesson,
    deliveryMode,
    adaptiveDecision
} = {}) {
    validateLessonInput(lesson);

    validateDeliveryMode(
        lesson,
        deliveryMode
    );

    validateAdaptiveDecision(
        adaptiveDecision
    );

    const action =
        adaptiveDecision.action;

    const targetNodeId =
        adaptiveDecision.targetNodeId ??
        null;

    const items =
        lesson.sections.map(
            section =>
                projectSection({
                    section,
                    action,
                    deliveryMode,
                    targetNodeId
                })
        );

    const status =
        determinePlanStatus(
            action,
            items
        );

    return {
        schemaVersion:
            LESSON_SCHEMA_VERSION,

        engine: {
            name: ENGINE_NAME,
            version: ENGINE_VERSION
        },

        status,

        lessonId:
            lesson.id,

        lessonVersion:
            lesson.version,

        deliveryMode,

        adaptiveContext: {
            action,
            targetNodeId
        },

        items
    };
}


/* -------------------------------------------------------------------------- */
/* Plan navigation                                                            */
/* -------------------------------------------------------------------------- */

function validatePlan(plan) {
    if (!isPlainObject(plan)) {
        throw new TypeError(
            "LessonEngine requires a plan object."
        );
    }

    if (!Array.isArray(plan.items)) {
        throw new TypeError(
            "LessonEngine plan requires items."
        );
    }
}

function normalizeProgress(progress) {
    if (
        progress === undefined ||
        progress === null
    ) {
        return {
            completedSectionIds: [],
            skippedSectionIds: []
        };
    }

    if (!isPlainObject(progress)) {
        throw new TypeError(
            "LessonEngine progress must be an object."
        );
    }

    return {
        completedSectionIds:
            uniqueStrings(
                progress.completedSectionIds
            ),

        skippedSectionIds:
            uniqueStrings(
                progress.skippedSectionIds
            )
    };
}

/**
 * Return the next included, unfinished item.
 *
 * This function does not mutate progress.
 */
function getNextLessonItem({
    plan,
    progress
} = {}) {
    validatePlan(plan);

    const normalizedProgress =
        normalizeProgress(progress);

    const completed =
        new Set(
            normalizedProgress
                .completedSectionIds
        );

    const skipped =
        new Set(
            normalizedProgress
                .skippedSectionIds
        );

    const nextItem =
        plan.items.find(item => {
            if (
                item.disposition !==
                DISPOSITIONS.INCLUDE
            ) {
                return false;
            }

            if (
                completed.has(
                    item.sectionId
                )
            ) {
                return false;
            }

            if (
                skipped.has(
                    item.sectionId
                )
            ) {
                return false;
            }

            return true;
        });

    if (!nextItem) {
        return {
            status:
                NEXT_ITEM_STATUSES
                    .PLAN_COMPLETE,

            item: null
        };
    }

    return {
        status:
            NEXT_ITEM_STATUSES
                .NEXT_ITEM,

        item:
            clonePlainObject(
                nextItem
            )
    };
}


/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

function getLessonEngineInfo() {
    return {
        name: ENGINE_NAME,

        version:
            ENGINE_VERSION,

        lessonSchemaVersion:
            LESSON_SCHEMA_VERSION,

        supportedDeliveryModes:
            [...DELIVERY_MODES],

        supportedActions:
            [...ADAPTIVE_ACTIONS],

        supportedSectionTypes:
            [...SECTION_TYPES]
    };
}


/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export {
    buildLessonPlan,
    getNextLessonItem,
    getLessonEngineInfo
};

export default {
    buildLessonPlan,
    getNextLessonItem,
    getLessonEngineInfo
};