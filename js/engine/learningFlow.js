
/**
 * ============================================================
 * learningFlow.js
 * ============================================================
 *
 * Adaptive Biology Learning System
 * Phase 2A — End-to-End Integration
 *
 * Integration Version: 1.0.0
 *
 * Responsibility:
 *
 *   Attempt
 *      ↓
 *   Mastery Engine
 *      ↓
 *   Mastery Update
 *      ↓
 *   Project runtime mastery state
 *      ↓
 *   Adaptive Engine
 *      ↓
 *   Next Action
 *      ↓
 *   if action === REMEDIATE
 *      ↓
 *   Remediation Engine
 *      ↓
 *   Remediation Plan
 *
 *
 * IMPORTANT:
 *
 * learningFlow.js is an ORCHESTRATOR.
 *
 * It DOES NOT:
 *
 * - calculate mastery
 * - calculate evidence
 * - diagnose failures
 * - select remediation strategy
 * - select canonical next action
 * - generate questions
 * - generate lessons
 * - mutate Student State
 * - persist runtime state
 *
 *
 * Engine ownership:
 *
 * Mastery Engine
 *   → mastery / evidence / confidence / weakness / failure
 *
 * Adaptive Engine
 *   → canonical next action
 *
 * Remediation Engine
 *   → diagnosis + repair plan
 *
 *
 * Student State persistence/projection remains outside this file.
 * ============================================================
 */


import {
    updateMastery
} from "./masterEngine.js";


import {
    decideNextAction
} from "./adaptiveEngine.js";


import {
    buildRemediationPlan
} from "./remediationEngine.js";


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const FLOW_VERSION = "1.0.0";

const FLOW_NAME = "LearningFlow";


const CANONICAL_ACTIONS = new Set([
    "LEARN",
    "PRACTICE",
    "CHALLENGE",
    "REMEDIATE",
    "RETEST",
    "REVIEW",
    "SKIP"
]);


/**
 * ============================================================
 * PUBLIC API
 * ============================================================
 */

/**
 * Process one completed learning attempt through:
 *
 * Attempt
 *   → Mastery
 *   → Adaptive
 *   → optional Remediation
 *
 *
 * IMPORTANT:
 *
 * This function does NOT mutate studentState.
 *
 * It returns all projections required by the caller to update
 * Student State later.
 */
export function processAttempt({

    attempt,

    studentState = {},

    knowledgeMap = {},

    masteryRules = {},
    evidenceModel = {},

    adaptiveRules = {},
    adaptivePaths = {},

    failureSignatures = {},
    remediationRules = {},

    recentResults = [],

    sessionContext = {},

    learningMode = null,

    timeBudget = null,

    now = null

} = {}) {

    assertAttempt(attempt);


    /*
     * --------------------------------------------------------
     * Normalize Attempt for engine interoperability.
     *
     * Attempt Contract stores the active knowledge node in:
     *
     *     attempt.context.nodeId
     *
     * Mastery / Remediation engines also support:
     *
     *     attempt.nodeId
     *
     * The orchestrator projects the canonical context node onto
     * the engine-facing Attempt WITHOUT mutating the original
     * Attempt object.
     *
     * This is an integration adapter only.
     * No business logic is introduced here.
     * --------------------------------------------------------
     */

    const engineAttempt =
        projectAttemptForEngines(
            attempt
        );


    /*
     * --------------------------------------------------------
     * Resolve runtime identity
         * --------------------------------------------------------
         */

    const studentId =
        resolveStudentId({
            attempt,
            studentState
        });


    const targetNodeId =
        resolveAttemptNodeId(attempt);


    if (!targetNodeId) {
        throw new Error(
            "LearningFlow cannot resolve target node from attempt."
        );
    }


    const resolvedLearningMode =
        resolveLearningMode({
            learningMode,
            attempt,
            studentState
        });


    const resolvedTimeBudget =
        resolveTimeBudget({
            timeBudget,
            studentState
        });


    /*
     * --------------------------------------------------------
     * STEP 1
     *
     * Read current node state.
     *
     * This is INPUT to Mastery Engine.
     *
     * No mutation.
     * --------------------------------------------------------
     */

    const currentNodeState =
        resolveCurrentNodeState({
            studentState,
            nodeId: targetNodeId
        });


    /*
     * --------------------------------------------------------
     * STEP 2
     *
     * Mastery Engine
     * --------------------------------------------------------
     */

    const masteryUpdate =
        updateMastery({

            attempt:
                engineAttempt,

            currentState:
                currentNodeState,

            masteryRules,

            evidenceModel
        });


    /*
     * --------------------------------------------------------
     * STEP 3
     *
     * Adapter:
     *
     * Mastery runtime output
     *        ↓
     * Adaptive-readable node state
     *
     * This adapter contains NO mastery logic.
     *
     * It only projects already-calculated values.
     * --------------------------------------------------------
     */

    const projectedNodeState =
        projectMasteryNodeState({
            masteryUpdate,
            previousState:
                currentNodeState
        });


    /*
     * --------------------------------------------------------
     * STEP 4
     *
     * Build a projected mastery state containing:
     *
     * existing Student State knowledge
     * +
     * newly calculated target node
     *
     * IMPORTANT:
     *
     * This is a new object.
     * studentState is NOT mutated.
     * --------------------------------------------------------
     */

    const projectedMasteryState =
        projectMasteryState({

            studentState,

            nodeId:
                targetNodeId,

            nodeState:
                projectedNodeState
        });


    /*
     * --------------------------------------------------------
     * STEP 5
     *
     * Build Adaptive session context.
     *
     * We preserve caller context and add only integration
     * metadata that has already been produced upstream.
     * --------------------------------------------------------
     */

    const adaptiveSessionContext =
        buildAdaptiveSessionContext({

            sessionContext,

            attempt:
                engineAttempt,

            masteryUpdate
        });


    /*
     * --------------------------------------------------------
     * STEP 6
     *
     * Adaptive Engine
     * --------------------------------------------------------
     */

    const adaptiveDecision =
        decideNextAction({

            studentId,

            targetNodeId,

            masteryState:
                projectedMasteryState,

            knowledgeMap,

            adaptiveRules,

            adaptivePaths,

            recentResults:
                normalizeRecentResults({
                    recentResults,
                    attempt:
                        engineAttempt
                }),

            sessionContext:
                adaptiveSessionContext,

            learningMode:
                resolvedLearningMode,

            timeBudget:
                resolvedTimeBudget,

            now
        });


    assertCanonicalAdaptiveAction(
        adaptiveDecision
    );


    /*
     * --------------------------------------------------------
     * STEP 7
     *
     * Remediation Engine is called ONLY when Adaptive Engine
     * selects canonical action REMEDIATE.
     *
     * learningFlow itself never decides that remediation
     * should happen.
     * --------------------------------------------------------
     */

    let remediationPlan = null;


    if (
        adaptiveDecision.action ===
        "REMEDIATE"
    ) {

        remediationPlan =
            buildRemediationPlan({

                studentId,

                adaptiveDecision,

                attempt:
                    engineAttempt,

                masteryState:
                    projectedNodeState,

                knowledgeMap,

                failureSignatures,

                remediationRules,

                now
            });
    }


    /*
     * --------------------------------------------------------
     * STEP 8
     *
     * Return integration result.
     *
     * No persistence.
     * No Student State mutation.
     * --------------------------------------------------------
     */

    return {

        flow: {
            name:
                FLOW_NAME,

            version:
                FLOW_VERSION
        },


        studentId,

        targetNodeId,


        attempt: {
            attemptId:
                attempt.attemptId ?? null,

            questionId:
                attempt.questionId ?? null
        },


        masteryUpdate,


        projection: {

            nodeState:
                projectedNodeState,

            masteryState:
                projectedMasteryState
        },


        adaptiveDecision,


        remediationPlan,


        outcome: {

            action:
                adaptiveDecision.action,

            remediationRequired:
                adaptiveDecision.action ===
                "REMEDIATE",

            remediationCreated:
                remediationPlan !== null,

            targetNodeId:
                adaptiveDecision
                    ?.target
                    ?.primaryNodeId ??
                targetNodeId
        }
    };
}


/**
 * Process an attempt generated by a remediation MINI_PROBE.
 *
 * IMPORTANT:
 *
 * A MINI_PROBE is still an Attempt.
 *
 * Therefore it must go through the exact same:
 *
 * Mastery
 *   → Adaptive
 *
 * pipeline.
 *
 * We intentionally delegate to processAttempt()
 * instead of creating separate mastery/adaptive logic.
 */
export function processRemediationProbe({

    attempt,

    remediationPlan,

    studentState = {},

    knowledgeMap = {},

    masteryRules = {},
    evidenceModel = {},

    adaptiveRules = {},
    adaptivePaths = {},

    failureSignatures = {},
    remediationRules = {},

    recentResults = [],

    sessionContext = {},

    learningMode = null,

    timeBudget = null,

    now = null

} = {}) {

    if (
        !remediationPlan ||
        typeof remediationPlan !== "object"
    ) {
        throw new TypeError(
            "LearningFlow requires remediationPlan for processRemediationProbe()."
        );
    }


    assertAttempt(attempt);


    const enrichedSessionContext = {
        ...clonePlainObject(
            sessionContext
        ),

        remediation: {
            remediationId:
                remediationPlan
                    .remediationId ??
                null,

            originalNodeId:
                remediationPlan
                    ?.target
                    ?.originalNodeId ??
                null,

            sourceNodeId:
                remediationPlan
                    ?.target
                    ?.sourceNodeId ??
                null,

            returnTargetNodeId:
                remediationPlan
                    ?.return
                    ?.targetNodeId ??
                null,

            returnCondition:
                remediationPlan
                    ?.return
                    ?.condition ??
                null
        },

        remediationId:
            remediationPlan
                .remediationId ??
            undefined,

        previousAction:
            "REMEDIATE"
    };


    return processAttempt({

        attempt,

        studentState,

        knowledgeMap,

        masteryRules,
        evidenceModel,

        adaptiveRules,
        adaptivePaths,

        failureSignatures,
        remediationRules,

        recentResults,

        sessionContext:
            enrichedSessionContext,

        learningMode,

        timeBudget,

        now
    });
}


/**
 * ============================================================
 * MASTERY → ADAPTIVE ADAPTER
 * ============================================================
 */

/**
 * Convert Mastery Engine runtime output into a node-state shape
 * that Adaptive Engine already knows how to consume.
 *
 *
 * Mastery Engine output:
 *
 * {
 *   current: {
 *      mastery,
 *      status,
 *      evidence,
 *      overallEvidence,
 *      confidence,
 *      evidenceSufficiency,
 *      attemptStats,
 *      signals,
 *      failureSummary,
 *      evidenceWrongStreaks
 *   },
 *   weakness,
 *   failure,
 *   ...
 * }
 *
 *
 * Adaptive node state:
 *
 * {
 *   nodeId,
 *   mastery,
 *   status,
 *   evidence,
 *   confidence,
 *   failure,
 *   failureSummary,
 *   ...
 * }
 */
function projectMasteryNodeState({

    masteryUpdate,

    previousState = {}

}) {

    const current =
        isPlainObject(
            masteryUpdate?.current
        )
            ? masteryUpdate.current
            : {};


    const weakness =
        isPlainObject(
            masteryUpdate?.weakness
        )
            ? masteryUpdate.weakness
            : {};


    const failure =
        normalizeFailureForAdaptive(
            masteryUpdate?.failure
        );


    const projected = {

        nodeId:
            masteryUpdate?.nodeId ??
            previousState?.nodeId ??
            null,


        mastery:
            current.mastery ??
            previousState?.mastery ??
            "M0",


        status:
            current.status ??
            previousState?.status ??
            "developing",


        evidence:
            clonePlainObject(
                current.evidence ??
                previousState?.evidence ??
                {}
            ),


        overallEvidence:
            finiteNumberOr(
                current.overallEvidence,
                finiteNumberOr(
                    previousState
                        ?.overallEvidence,
                    0
                )
            ),


        confidence:
            clonePlainObject(
                current.confidence ??
                previousState?.confidence ??
                {
                    level: "low",
                    score: 0
                }
            ),


        evidenceSufficiency:
            clonePlainObject(
                current
                    .evidenceSufficiency ??
                previousState
                    ?.evidenceSufficiency ??
                {}
            ),


        attemptStats:
            clonePlainObject(
                current.attemptStats ??
                previousState
                    ?.attemptStats ??
                previousState
                    ?.attempts ??
                {}
            ),


        signals:
            cloneArray(
                current.signals ??
                weakness.signals ??
                previousState?.signals ??
                []
            ),


        failureSummary:
            clonePlainObject(
                current.failureSummary ??
                previousState
                    ?.failureSummary ??
                {}
            ),


        evidenceWrongStreaks:
            clonePlainObject(
                current
                    .evidenceWrongStreaks ??
                previousState
                    ?.evidenceWrongStreaks ??
                {}
            )
    };


    /*
     * Only expose failure when Mastery Engine actually emitted
     * canonical failure evidence.
     *
     * Do not invent failure information here.
     */
    if (failure) {
        projected.failure =
            failure;
    } else if (
        isPlainObject(
            previousState?.failure
        )
    ) {
        projected.failure =
            clonePlainObject(
                previousState.failure
            );
    }


    /*
     * Traceability only.
     *
     * This does not affect mastery calculation.
     */
    if (
        masteryUpdate?.attemptId
    ) {
        projected.lastAttemptId =
            masteryUpdate.attemptId;
    }


    if (
        masteryUpdate?.questionId
    ) {
        projected.lastQuestionId =
            masteryUpdate.questionId;
    }


    return projected;
}


/**
 * Build an Adaptive-readable knowledge map without mutating
 * Student State.
 */
function projectMasteryState({

    studentState,

    nodeId,

    nodeState

}) {

    const existingKnowledge =
        resolveKnowledgeState(
            studentState
        );


    return {
        knowledge: {
            ...cloneKnowledgeMap(
                existingKnowledge
            ),

            [nodeId]:
                clonePlainObject(
                    nodeState
                )
        }
    };
}


/**
 * ============================================================
 * ADAPTIVE CONTEXT ADAPTER
 * ============================================================
 */

function buildAdaptiveSessionContext({

    sessionContext,

    attempt,

    masteryUpdate

}) {

    const context = {
        ...clonePlainObject(
            sessionContext
        )
    };


    /*
     * Mastery Update traceability.
     *
     * Adaptive Engine already supports masteryUpdateId in its
     * source metadata when supplied through session context.
     */
    const masteryUpdateId =
        masteryUpdate?.updateId ??
        masteryUpdate?.masteryUpdateId ??
        null;


    if (masteryUpdateId) {
        context.masteryUpdateId =
            masteryUpdateId;
    }


    /*
     * Failure evidence.
     *
     * We expose only information already produced by Attempt /
     * Mastery.
     *
     * No diagnosis is performed here.
     */
    const failure =
        normalizeFailureForAdaptive(
            masteryUpdate?.failure
        ) ??
        normalizeFailureFromAttempt(
            attempt
        );


    if (failure) {
        context.failure =
            failure;
    }


    const failureSummary =
        masteryUpdate
            ?.current
            ?.failureSummary;


    if (
        isPlainObject(
            failureSummary
        )
    ) {
        context.failureSummary =
            clonePlainObject(
                failureSummary
            );
    }


    /*
     * Preserve runtime path information from the Attempt when
     * the caller did not explicitly provide it.
     */
    if (
        !context.pathStage &&
        typeof attempt
            ?.context
            ?.pathStage === "string"
    ) {
        context.pathStage =
            attempt.context.pathStage;
    }


    if (
        !context.previousAction &&
        typeof attempt
            ?.context
            ?.action === "string"
    ) {
        context.previousAction =
            attempt.context.action;
    }


    return context;
}


/**
 * ============================================================
 * FAILURE ADAPTERS
 * ============================================================
 */

function normalizeFailureForAdaptive(
    rawFailure
) {

    if (
        !rawFailure ||
        typeof rawFailure !== "object"
    ) {
        return null;
    }


    const failureType =
        normalizeNonEmptyString(
            rawFailure.failureType
        ) ??
        normalizeNonEmptyString(
            rawFailure.failureSignature
        ) ??
        normalizeNonEmptyString(
            rawFailure.failureSignatureId
        ) ??
        normalizeNonEmptyString(
            rawFailure.signature
        );


    if (!failureType) {
        return null;
    }


    const result = {
        failureType
    };


    const sourceNodeId =
        normalizeNonEmptyString(
            rawFailure.sourceNodeId
        );


    if (sourceNodeId) {
        result.sourceNodeId =
            sourceNodeId;
    }


    const metaSkillId =
        normalizeNonEmptyString(
            rawFailure.metaSkillId
        );


    if (metaSkillId) {
        result.metaSkillId =
            metaSkillId;
    }


    const count =
        firstPositiveInteger([
            rawFailure
                .sameFailureSignatureCount,

            rawFailure
                .occurrenceCount,

            rawFailure.count,

            rawFailure.repeatCount,

            rawFailure.repeated
        ]);


    if (count !== null) {

        result.count =
            count;

        result.sameFailureSignatureCount =
            count;
    }


    return result;
}


function normalizeFailureFromAttempt(
    attempt
) {

    const diagnostic =
        attempt?.diagnostic;


    if (
        !diagnostic ||
        typeof diagnostic !== "object"
    ) {
        return null;
    }


    const failureType =
        normalizeNonEmptyString(
            diagnostic.failureType
        ) ??
        normalizeNonEmptyString(
            diagnostic
                .failureSignatureId
        );


    if (!failureType) {
        return null;
    }


    const result = {
        failureType
    };


    const sourceNodeId =
        normalizeNonEmptyString(
            diagnostic.sourceNodeId
        );


    if (sourceNodeId) {
        result.sourceNodeId =
            sourceNodeId;
    }


    const count =
        firstPositiveInteger([
            diagnostic
                .occurrenceCount,

            diagnostic
                .sameFailureSignatureCount,

            diagnostic.count,

            diagnostic.repeatCount
        ]);


    if (count !== null) {
        result.count =
            count;

        result.sameFailureSignatureCount =
            count;
    }


    return result;
}


/**
 * ============================================================
 * RECENT RESULTS
 * ============================================================
 */

/**
 * Preserve supplied recent results and append the current
 * attempt only when it carries usable failure information.
 *
 * This allows Adaptive Engine to evaluate repeated failures
 * without learningFlow itself deciding what "repeated" means.
 */
function normalizeRecentResults({

    recentResults,

    attempt

}) {

    const results =
        Array.isArray(recentResults)
            ? recentResults.map(
                clonePlainObject
            )
            : [];


    const failure =
        normalizeFailureFromAttempt(
            attempt
        );


    if (failure) {

        results.push({
            ...failure,

            attemptId:
                attempt?.attemptId ??
                null,

            questionId:
                attempt?.questionId ??
                null,

            result:
                attempt?.result ??
                null
        });
    }


    return results;
}

/**
 * ============================================================
 * ATTEMPT → ENGINE ADAPTER
 * ============================================================
 */

/**
 * Project the canonical runtime node from Attempt.context
 * onto the lightweight top-level nodeId understood by the
 * current engine implementations.
 *
 * IMPORTANT:
 *
 * - does NOT mutate the original Attempt
 * - does NOT change Attempt semantics
 * - does NOT infer a different learning target
 * - does NOT calculate mastery
 * - does NOT diagnose failure
 *
 * This exists only to bridge the locked Attempt Contract with
 * the current Mastery / Remediation engine input shapes.
 */
function projectAttemptForEngines(
    attempt
) {

    const projected =
        clonePlainObject(
            attempt
        );


    const nodeId =
        resolveAttemptNodeId(
            attempt
        );


    if (nodeId) {

        projected.nodeId =
            nodeId;
    }


    return projected;
}
/**
 * ============================================================
 * STUDENT STATE READ ADAPTERS
 * ============================================================
 */

function resolveStudentId({

    attempt,

    studentState

}) {

    return (
        normalizeNonEmptyString(
            attempt?.studentId
        ) ??
        normalizeNonEmptyString(
            studentState
                ?.student
                ?.studentId
        ) ??
        "unknown-student"
    );
}


function resolveAttemptNodeId(
    attempt
) {

    return (
        normalizeNonEmptyString(
            attempt?.context?.nodeId
        ) ??
        normalizeNonEmptyString(
            attempt?.nodeId
        ) ??
        normalizeNonEmptyString(
            attempt?.primaryNode
        ) ??
        normalizeNonEmptyString(
            attempt
                ?.evidence
                ?.primaryNode
        ) ??
        null
    );
}


function resolveKnowledgeState(
    studentState
) {

    if (
        isPlainObject(
            studentState?.knowledge
        )
    ) {
        return studentState.knowledge;
    }


    /*
     * Integration tests may pass a lightweight mastery-state
     * fixture instead of the full Student State contract.
     */
    if (
        isPlainObject(
            studentState
        )
    ) {

        const entries =
            Object.entries(
                studentState
            )
                .filter(
                    ([key, value]) =>
                        /^K\d+$/.test(key) &&
                        isPlainObject(value)
                );


        if (entries.length > 0) {
            return Object.fromEntries(
                entries
            );
        }
    }


    return {};
}


function resolveCurrentNodeState({

    studentState,

    nodeId

}) {

    const knowledge =
        resolveKnowledgeState(
            studentState
        );


    const state =
        knowledge?.[nodeId];


    return isPlainObject(state)
        ? clonePlainObject(state)
        : null;
}


/**
 * ============================================================
 * LEARNING MODE / TIME
 * ============================================================
 */

function resolveLearningMode({

    learningMode,

    attempt,

    studentState

}) {

    const candidates = [

        learningMode,

        attempt
            ?.context
            ?.learningMode,

        studentState
            ?.learning
            ?.currentMode,

        studentState
            ?.student
            ?.target
            ?.mode

    ];


    for (const value of candidates) {

        if (
            value === "HOC_NHANH" ||
            value === "HOC_SAU" ||
            value === "ON_THI"
        ) {
            return value;
        }
    }


    return "HOC_SAU";
}


function resolveTimeBudget({

    timeBudget,

    studentState

}) {

    if (
        Number.isFinite(
            timeBudget
        ) &&
        timeBudget >= 0
    ) {
        return timeBudget;
    }


    const stateBudget =
        studentState
            ?.learning
            ?.session
            ?.timeBudgetMinutes;


    if (
        Number.isFinite(
            stateBudget
        ) &&
        stateBudget >= 0
    ) {
        return stateBudget;
    }


    return null;
}


/**
 * ============================================================
 * ASSERTIONS
 * ============================================================
 */

function assertAttempt(
    attempt
) {

    if (
        !attempt ||
        typeof attempt !== "object" ||
        Array.isArray(attempt)
    ) {
        throw new TypeError(
            "LearningFlow requires a valid attempt object."
        );
    }
}


function assertCanonicalAdaptiveAction(
    adaptiveDecision
) {

    const action =
        adaptiveDecision?.action;


    if (
        !CANONICAL_ACTIONS.has(
            action
        )
    ) {
        throw new Error(
            `LearningFlow received invalid Adaptive action: ${String(action)}`
        );
    }
}


/**
 * ============================================================
 * GENERIC HELPERS
 * ============================================================
 */

function isPlainObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function clonePlainObject(
    value
) {

    if (!isPlainObject(value)) {
        return {};
    }


    return Object.fromEntries(
        Object.entries(value)
            .map(
                ([key, item]) => [
                    key,
                    cloneValue(item)
                ]
            )
    );
}


function cloneKnowledgeMap(
    knowledge
) {

    if (!isPlainObject(knowledge)) {
        return {};
    }


    const result = {};


    for (
        const [nodeId, state]
        of Object.entries(knowledge)
    ) {

        result[nodeId] =
            isPlainObject(state)
                ? clonePlainObject(state)
                : state;
    }


    return result;
}


function cloneArray(
    value
) {

    return Array.isArray(value)
        ? value.map(cloneValue)
        : [];
}


function cloneValue(
    value
) {

    if (Array.isArray(value)) {
        return value.map(
            cloneValue
        );
    }


    if (isPlainObject(value)) {

        return Object.fromEntries(
            Object.entries(value)
                .map(
                    ([key, item]) => [
                        key,
                        cloneValue(item)
                    ]
                )
        );
    }


    return value;
}


function normalizeNonEmptyString(
    value
) {

    if (
        typeof value !== "string"
    ) {
        return null;
    }


    const normalized =
        value.trim();


    return normalized.length > 0
        ? normalized
        : null;
}


function finiteNumberOr(
    value,
    fallback
) {

    return Number.isFinite(value)
        ? value
        : fallback;
}


function firstPositiveInteger(
    values
) {

    for (const value of values) {

        if (
            Number.isInteger(value) &&
            value >= 1
        ) {
            return value;
        }
    }


    return null;
}
