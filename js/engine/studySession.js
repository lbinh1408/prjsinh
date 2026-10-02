/**
 * ============================================================
 * studySession.js
 * ============================================================
 *
 * Adaptive Biology Learning System
 * Phase 2A — Study MVP Runtime
 *
 * Version: 0.1.0
 *
 * Responsibility:
 *
 *   AdaptiveDecision
 *        ↓
 *   QuestionSelector
 *        ↓
 *   Question
 *        ↓
 *   AnswerEvaluator
 *        ↓
 *   AttemptBuilder
 *        ↓
 *   LearningFlow
 *        ↓
 *   commit runtime Student State
 *        ↓
 *   next AdaptiveDecision
 *
 *
 * StudySession IS an orchestration/runtime layer.
 *
 * It DOES:
 *
 * - keep in-memory session runtime
 * - select the next question
 * - evaluate submitted answers
 * - build canonical Attempts
 * - send Attempts through LearningFlow
 * - commit LearningFlow projections into Student State
 * - maintain bounded question/result history for runtime use
 * - carry the next AdaptiveDecision forward
 *
 *
 * It DOES NOT:
 *
 * - calculate mastery
 * - calculate evidence
 * - decide adaptive actions
 * - diagnose failures
 * - build remediation strategy
 * - grade answers itself
 * - choose question ranking itself
 * - persist to database/files
 * - mutate caller-owned inputs
 *
 * ============================================================
 */


import {
    selectQuestion
} from "./questionSelector.js";


import {
    evaluateAnswer
} from "./answerEvaluator.js";


import {
    buildAttempt
} from "./attemptBuilder.js";


import {
    processAttempt
} from "./learningFlow.js";


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const SESSION_NAME =
    "StudySession";

const SESSION_VERSION =
    "0.1.0";

const STUDENT_STATE_VERSION =
    "1.2.0";


const CANONICAL_ACTIONS =
    new Set([
        "LEARN",
        "PRACTICE",
        "CHALLENGE",
        "REMEDIATE",
        "RETEST",
        "REVIEW",
        "SKIP"
    ]);


const ATTEMPT_RESULTS =
    new Set([
        "correct",
        "incorrect",
        "partial",
        "skipped"
    ]);


/**
 * Runtime history is intentionally bounded.
 *
 * This is NOT the canonical event log.
 */
const DEFAULT_HISTORY_LIMIT =
    50;


/**
 * ============================================================
 * PUBLIC API
 * ============================================================
 */


/**
 * Create an in-memory Study Session.
 *
 * IMPORTANT:
 *
 * All caller-owned objects are cloned.
 *
 * The returned session owns its own runtime copy.
 */
export function createStudySession({

    sessionId,

    studentState,

    initialDecision,

    questionBanks,

    knowledgeMap = {},

    masteryRules = {},
    evidenceModel = {},

    adaptiveRules = {},
    adaptivePaths = {},

    failureSignatures = {},
    remediationRules = {},

    learningMode = null,

    timeBudget = null,

    clusterId = null,
    lessonId = null,
    contextId = null,

    history = [],

    historyLimit =
    DEFAULT_HISTORY_LIMIT,

    now = null

} = {}) {

    assertNonEmptyString(
        sessionId,
        "sessionId"
    );


    assertStudentState(
        studentState
    );


    assertAdaptiveDecision(
        initialDecision
    );


    assertQuestionBanks(
        questionBanks
    );


    assertHistoryLimit(
        historyLimit
    );


    const timestamp =
        resolveTimestamp(now);


    const runtimeState =
        clonePlainObject(
            studentState
        );


    const resolvedLearningMode =
        learningMode ??
        runtimeState
            ?.learning
            ?.currentMode ??
        "HOC_SAU";


    const resolvedTimeBudget =
        resolveTimeBudget({
            timeBudget,
            studentState:
                runtimeState
        });


    const runtimeHistory =
        normalizeInitialHistory(
            history,
            historyLimit
        );


    const session = {

        runtime: {

            name:
                SESSION_NAME,

            version:
                SESSION_VERSION,

            sessionId,

            startedAt:
                timestamp,

            lastActivityAt:
                timestamp,

            status:
                "active"
        },


        config: {

            learningMode:
                resolvedLearningMode,

            timeBudget:
                resolvedTimeBudget,

            clusterId:
                nullableString(
                    clusterId
                ),

            lessonId:
                nullableString(
                    lessonId
                ),

            contextId:
                nullableString(
                    contextId
                ),

            historyLimit
        },


        dependencies: {

            questionBanks:
                clonePlainObject(
                    questionBanks
                ),

            knowledgeMap:
                clonePlainObject(
                    knowledgeMap
                ),

            masteryRules:
                clonePlainObject(
                    masteryRules
                ),

            evidenceModel:
                clonePlainObject(
                    evidenceModel
                ),

            adaptiveRules:
                clonePlainObject(
                    adaptiveRules
                ),

            adaptivePaths:
                clonePlainObject(
                    adaptivePaths
                ),

            failureSignatures:
                clonePlainObject(
                    failureSignatures
                ),

            remediationRules:
                clonePlainObject(
                    remediationRules
                )
        },


        state:
            runtimeState,


        currentDecision:
            clonePlainObject(
                initialDecision
            ),


        currentSelection:
            null,


        currentQuestion:
            null,


        activeRemediationPlan:
            null,


        attempts: [],


        history:
            runtimeHistory,


        lastFlowResult:
            null
    };


    /**
     * Keep canonical Student State session projection aligned
     * with the StudySession runtime.
     *
     * This is projection only.
     */
    session.state =
        projectSessionStartToStudentState({

            studentState:
                session.state,

            sessionId,

            startedAt:
                timestamp,

            learningMode:
                resolvedLearningMode,

            timeBudget:
                resolvedTimeBudget,

            clusterId:
                session.config.clusterId,

            lessonId:
                session.config.lessonId,

            contextId:
                session.config.contextId
        });


    return session;
}


/**
 * ------------------------------------------------------------
 * getNextQuestion()
 * ------------------------------------------------------------
 *
 * Consume the current AdaptiveDecision through QuestionSelector.
 *
 * Does NOT invent fallback behavior.
 *
 * Possible selector outcomes remain owned by QuestionSelector:
 *
 * - SELECTED
 * - NO_MATCH
 * - NOT_REQUIRED
 */
export function getNextQuestion({

    session,

    now = null

} = {}) {

    assertActiveSession(
        session
    );


    assertAdaptiveDecision(
        session.currentDecision
    );


    const timestamp =
        resolveTimestamp(now);


    const selection =
        selectQuestion({

            adaptiveDecision:
                session.currentDecision,

            questionBanks:
                session
                    .dependencies
                    .questionBanks,

            history:
                clonePlainObject(
                    session.history
                ),

            now:
                timestamp
        });


    const next =
        clonePlainObject(
            session
        );


    next.runtime.lastActivityAt =
        timestamp;


    next.currentSelection =
        clonePlainObject(
            selection
        );


    if (
        selection?.status ===
        "SELECTED"
    ) {

        const question =
            selection
                ?.selected
                ?.question;


        if (
            !question ||
            typeof question !==
            "object"
        ) {
            throw new Error(
                "StudySession received SELECTED without selected.question."
            );
        }


        next.currentQuestion =
            clonePlainObject(
                question
            );

    } else {

        next.currentQuestion =
            null;
    }


    return {
        session:
            next,

        selection:
            clonePlainObject(
                selection
            ),

        question:
            next.currentQuestion
                ? clonePlainObject(
                    next.currentQuestion
                )
                : null
    };
}


/**
 * ------------------------------------------------------------
 * submitAnswer()
 * ------------------------------------------------------------
 *
 * Complete one runtime learning turn:
 *
 * Question
 *   → AnswerEvaluator
 *   → AttemptBuilder
 *   → LearningFlow
 *   → commit Student State
 *   → carry next AdaptiveDecision
 *
 */
export function submitAnswer({

    session,

    response,

    attemptId,

    startedAt,

    submittedAt,

    attemptNumber = 1,

    hint = null,

    timing = null,

    diagnostic = null,

    retry = null,

    feedback = null,

    ui = null,

    metadata = null,

    now = null

} = {}) {

    assertActiveSession(
        session
    );


    assertSelectedQuestion(
        session
    );


    assertNonEmptyString(
        attemptId,
        "attemptId"
    );


    const question =
        clonePlainObject(
            session.currentQuestion
        );


    const evaluation =
        evaluateAnswer({
            question,
            response
        });


    const decision =
        session.currentDecision;


    const timestamp =
        resolveTimestamp(
            now ??
            submittedAt
        );


    const action =
        resolveDecisionAction(
            decision
        );


    const pathStage =
        resolvePathStage({
            action,
            decision
        });


    const attempt =
        buildAttempt({

            attemptId,

            studentId:
                resolveStudentId(
                    session.state
                ),

            sessionId:
                session
                    .runtime
                    .sessionId,

            question,

            evaluation,

            startedAt,

            submittedAt,

            attemptNumber,

            hint,

            timing,

            context: {

                learningMode:
                    session
                        .config
                        .learningMode,

                action,

                pathStage,

                clusterId:
                    session
                        .config
                        .clusterId ??
                    undefined,

                lessonId:
                    session
                        .config
                        .lessonId ??
                    undefined,

                decisionId:
                    decision
                        ?.decisionId ??
                    undefined
            },

            diagnostic,

            retry,

            feedback,

            ui,

            metadata
        });


    const recentResults =
        buildRecentResults(
            session.history
        );


    const flowResult =
        processAttempt({

            attempt,

            studentState:
                session.state,

            knowledgeMap:
                session
                    .dependencies
                    .knowledgeMap,

            masteryRules:
                session
                    .dependencies
                    .masteryRules,

            evidenceModel:
                session
                    .dependencies
                    .evidenceModel,

            adaptiveRules:
                session
                    .dependencies
                    .adaptiveRules,

            adaptivePaths:
                session
                    .dependencies
                    .adaptivePaths,

            failureSignatures:
                session
                    .dependencies
                    .failureSignatures,

            remediationRules:
                session
                    .dependencies
                    .remediationRules,

            recentResults,

            sessionContext:
                buildLearningFlowSessionContext(
                    session
                ),

            learningMode:
                session
                    .config
                    .learningMode,

            timeBudget:
                session
                    .config
                    .timeBudget,

            now:
                timestamp
        });


    assertFlowResult(
        flowResult
    );


    /**
     * ========================================================
     * COMMIT BOUNDARY
     * ========================================================
     *
     * LearningFlow does NOT mutate Student State.
     *
     * StudySession owns the runtime commit.
     *
     * No mastery/evidence is recalculated here.
     */
    const committedState =
        commitFlowResult({

            studentState:
                session.state,

            flowResult,

            attempt,

            timestamp,

            session
        });


    const nextHistory =
        appendHistory({

            history:
                session.history,

            attempt,

            flowResult,

            decision,

            timestamp,

            limit:
                session
                    .config
                    .historyLimit
        });


    const nextSession =
        clonePlainObject(
            session
        );


    nextSession.state =
        committedState;


    nextSession.currentDecision =
        clonePlainObject(
            flowResult
                .adaptiveDecision
        );


    nextSession.currentSelection =
        null;


    nextSession.currentQuestion =
        null;


    nextSession.activeRemediationPlan =
        flowResult.remediationPlan
            ? clonePlainObject(
                flowResult
                    .remediationPlan
            )
            : null;


    nextSession.attempts =
        [
            ...clonePlainObject(
                session.attempts
            ),

            clonePlainObject(
                attempt
            )
        ];


    nextSession.history =
        nextHistory;


    nextSession.lastFlowResult =
        clonePlainObject(
            flowResult
        );


    nextSession.runtime.lastActivityAt =
        timestamp;


    return {

        session:
            nextSession,

        evaluation:
            clonePlainObject(
                evaluation
            ),

        attempt:
            clonePlainObject(
                attempt
            ),

        flowResult:
            clonePlainObject(
                flowResult
            ),

        nextDecision:
            clonePlainObject(
                flowResult
                    .adaptiveDecision
            )
    };
}


/**
 * Return a caller-safe snapshot.
 */
export function getSessionSnapshot(
    session
) {

    assertStudySession(
        session
    );


    return clonePlainObject(
        session
    );
}


/**
 * Return caller-safe current Student State.
 */
export function getStudentState(
    session
) {

    assertStudySession(
        session
    );


    return clonePlainObject(
        session.state
    );
}


/**
 * ============================================================
 * STUDENT STATE COMMIT
 * ============================================================
 */


/**
 * Commit outputs already produced by LearningFlow.
 *
 * IMPORTANT:
 *
 * This function is a projection adapter.
 *
 * It does NOT calculate:
 *
 * - mastery
 * - evidence
 * - confidence
 * - weakness
 * - failure diagnosis
 * - adaptive action
 */
function commitFlowResult({

    studentState,

    flowResult,

    attempt,

    timestamp,

    session

}) {

    const next =
        clonePlainObject(
            studentState
        );


    const nodeId =
        flowResult.targetNodeId ??
        attempt
            ?.context
            ?.nodeId;


    assertNonEmptyString(
        nodeId,
        "flowResult.targetNodeId"
    );


    const previousNodeState =
        next
            ?.knowledge
        ?.[nodeId] ??
        {};


    const projectedNode =
        flowResult
            ?.projection
            ?.nodeState;


    if (
        !projectedNode ||
        typeof projectedNode !==
        "object"
    ) {
        throw new Error(
            "StudySession requires LearningFlow projection.nodeState."
        );
    }


    const knowledgeState =
        projectKnowledgeState({

            projectedNode,

            previousState:
                previousNodeState,

            attempt,

            flowResult,

            timestamp
        });


    next.knowledge = {
        ...(
            next.knowledge ??
            {}
        ),

        [nodeId]:
            knowledgeState
    };


    next.updatedAt =
        timestamp;


    next.learning =
        projectLearningRuntime({

            previous:
                next.learning,

            session,

            flowResult,

            attempt,

            timestamp
        });


    next.adaptive =
        projectAdaptiveState({

            previous:
                next.adaptive,

            decision:
                flowResult
                    .adaptiveDecision,

            timestamp
        });


    next.remediation =
        projectRemediationState({

            previous:
                next.remediation,

            remediationPlan:
                flowResult
                    .remediationPlan,

            flowResult
        });


    next.history =
        projectStudentStateHistory({

            previous:
                next.history,

            attempt,

            decision:
                flowResult
                    .adaptiveDecision,

            timestamp
        });


    return next;
}


/**
 * Convert LearningFlow projection.nodeState into canonical
 * Student State V1.2.0 knowledgeState.
 *
 * This is intentionally explicit instead of blindly assigning
 * projection.nodeState because the two contracts are different.
 */
function projectKnowledgeState({

    projectedNode,

    previousState,

    attempt,

    flowResult,

    timestamp

}) {

    const result =
        attempt.result;


    const successful =
        result ===
        "correct";


    const failed =
        result ===
        "incorrect";


    const previousRetest =
        normalizeRetestObservation(
            previousState?.retest
        );


    const previousReview =
        normalizeReviewObservation(
            previousState?.review
        );


    const isRetest =
        attempt
            ?.context
            ?.pathStage ===
        "RETEST";


    const isReview =
        attempt
            ?.context
            ?.pathStage ===
        "REVIEW";


    const failure =
        resolveKnowledgeFailure({

            attempt,

            flowResult,

            timestamp,

            previousFailure:
                previousState
                    ?.lastFailure
        });


    return {

        mastery:
            normalizeMastery(
                projectedNode
                    ?.mastery ??
                previousState
                    ?.mastery
            ),

        status:
            normalizeMasteryStatus(
                projectedNode
                    ?.status ??
                previousState
                    ?.status
            ),

        evidence:
            normalizeEvidenceVector(
                projectedNode
                    ?.evidence ??
                previousState
                    ?.evidence
            ),

        overallEvidence:
            clamp01(
                projectedNode
                    ?.overallEvidence ??
                previousState
                    ?.overallEvidence ??
                0
            ),

        confidence:
            normalizeConfidenceLevel(
                projectedNode
                    ?.confidence ??
                previousState
                    ?.confidence
            ),

        evidenceSufficiency:
            normalizeEvidenceSufficiency(
                projectedNode
                    ?.evidenceSufficiency ??
                previousState
                    ?.evidenceSufficiency
            ),

        attemptStats:
            normalizeAttemptStats(
                projectedNode
                    ?.attemptStats ??
                previousState
                    ?.attemptStats
            ),

        weakEvidence:
            normalizeEvidenceDimensions(
                flowResult
                    ?.masteryUpdate
                    ?.weakness
                    ?.weakEvidence ??
                projectedNode
                    ?.weakEvidence ??
                previousState
                    ?.weakEvidence ??
                []
            ),

        signals:
            normalizeStringArray(
                projectedNode
                    ?.signals ??
                previousState
                    ?.signals ??
                []
            ),

        lastAttemptAt:
            timestamp,

        lastSuccessAt:
            successful
                ? timestamp
                : (
                    previousState
                        ?.lastSuccessAt ??
                    null
                ),

        lastFailure:
            failed
                ? failure
                : (
                    previousState
                        ?.lastFailure ??
                    null
                ),

        ...(
            projectedNode
                ?.failureSummary &&
                typeof projectedNode
                    .failureSummary ===
                "object" &&
                Object.keys(
                    projectedNode
                        .failureSummary
                ).length > 0

                ? {
                    failureSummary:
                        clonePlainObject(
                            projectedNode
                                .failureSummary
                        )
                }

                : previousState
                    ?.failureSummary

                    ? {
                        failureSummary:
                            clonePlainObject(
                                previousState
                                    .failureSummary
                            )
                    }

                    : {}
        ),

        retest:
            isRetest
                ? {
                    attempted:
                        true,

                    lastRetestAt:
                        timestamp,

                    passed:
                        successful,

                    differentQuestion:
                        Boolean(
                            flowResult
                                ?.masteryUpdate
                                ?.retest
                                ?.contextDifferent ??
                            false
                        ),

                    differentContext:
                        Boolean(
                            flowResult
                                ?.masteryUpdate
                                ?.retest
                                ?.contextDifferent ??
                            false
                        ),

                    independent:
                        attempt
                            ?.evidence
                            ?.independence ===
                        "independent"
                }
                : previousRetest,

        review:
            isReview
                ? {
                    lastReviewedAt:
                        timestamp
                }
                : previousReview
    };
}


/**
 * ============================================================
 * STUDENT STATE — LEARNING SESSION PROJECTION
 * ============================================================
 */

function projectSessionStartToStudentState({

    studentState,

    sessionId,

    startedAt,

    learningMode,

    timeBudget,

    clusterId,

    lessonId,

    contextId

}) {

    const next =
        clonePlainObject(
            studentState
        );


    next.schemaVersion =
        STUDENT_STATE_VERSION;


    next.updatedAt =
        startedAt;


    next.learning = {

        currentMode:
            learningMode,

        session: {

            sessionId,

            startedAt,

            lastActivityAt:
                startedAt,

            timeBudgetMinutes:
                normalizeNonNegativeInteger(
                    timeBudget
                ),

            timeUsedMinutes:
                0,

            runtimeSignals: {
                consecutiveWrong:
                    0,

                consecutiveSkip:
                    0,

                consecutiveRemediation:
                    0
            },

            fatigue: {
                level:
                    "normal",

                signals: []
            }
        },

        current: {

            clusterId:
                clusterId,

            lessonId:
                lessonId,

            nodeId:
                null,

            action:
                null,

            contextId:
                contextId
        }
    };


    return next;
}


function projectLearningRuntime({

    previous,

    session,

    flowResult,

    attempt,

    timestamp

}) {

    const prior =
        previous ??
        {};


    const priorRuntime =
        prior.session ??
        {};


    const previousSignals =
        priorRuntime
            .runtimeSignals ??
        {};


    const result =
        attempt.result;


    const action =
        flowResult
            ?.adaptiveDecision
            ?.action ??
        null;


    return {

        currentMode:
            session
                .config
                .learningMode,

        session: {

            sessionId:
                session
                    .runtime
                    .sessionId,

            startedAt:
                priorRuntime
                    .startedAt ??
                session
                    .runtime
                    .startedAt,

            lastActivityAt:
                timestamp,

            timeBudgetMinutes:
                normalizeNonNegativeInteger(
                    priorRuntime
                        .timeBudgetMinutes ??
                    session
                        .config
                        .timeBudget
                ),

            timeUsedMinutes:
                calculateTimeUsedMinutes({

                    previous:
                        priorRuntime
                            .timeUsedMinutes,

                    attempt
                }),

            runtimeSignals: {

                consecutiveWrong:
                    result ===
                        "incorrect"
                        ? normalizeNonNegativeInteger(
                            previousSignals
                                .consecutiveWrong
                        ) + 1
                        : 0,

                consecutiveSkip:
                    result ===
                        "skipped"
                        ? normalizeNonNegativeInteger(
                            previousSignals
                                .consecutiveSkip
                        ) + 1
                        : 0,

                consecutiveRemediation:
                    action ===
                        "REMEDIATE"
                        ? normalizeNonNegativeInteger(
                            previousSignals
                                .consecutiveRemediation
                        ) + 1
                        : 0
            },

            fatigue:
                clonePlainObject(
                    priorRuntime
                        .fatigue ??
                    {
                        level:
                            "normal",

                        signals: []
                    }
                )
        },

        current: {

            clusterId:
                session
                    .config
                    .clusterId,

            lessonId:
                session
                    .config
                    .lessonId,

            nodeId:
                flowResult
                    ?.adaptiveDecision
                    ?.target
                    ?.primaryNodeId ??
                flowResult
                    ?.outcome
                    ?.targetNodeId ??
                attempt
                    ?.context
                    ?.nodeId ??
                null,

            action,

            contextId:
                session
                    .config
                    .contextId
        }
    };
}


/**
 * ============================================================
 * STUDENT STATE — ADAPTIVE PROJECTION
 * ============================================================
 */

function projectAdaptiveState({

    previous,

    decision,

    timestamp

}) {

    if (
        !decision ||
        typeof decision !==
        "object"
    ) {
        return clonePlainObject(
            previous ?? {
                lastDecision:
                    null,

                nextAction:
                    null
            }
        );
    }


    const nodeId =
        decision
            ?.target
            ?.primaryNodeId ??
        null;


    const reasonCodes =
        normalizeStringArray(
            decision
                ?.reason
                ?.codes ??
            decision
                ?.reasonCodes ??
            []
        );


    return {

        lastDecision: {

            action:
                decision.action,

            nodeId,

            reasonCodes,

            at:
                timestamp
        },

        nextAction: {

            action:
                decision.action,

            nodeId,

            priority:
                finiteNumberOr(
                    decision.priority,
                    0
                ),

            constraints:
                projectAdaptiveConstraints(
                    decision
                ),

            decidedAt:
                timestamp
        }
    };
}


function projectAdaptiveConstraints(
    decision
) {

    const source =
        decision
            ?.selectionCriteria ??
        decision
            ?.constraints ??
        {};


    const difficulty =
        normalizeDifficultyArray(
            source
                ?.difficulty ??
            source
                ?.difficulties ??
            []
        );


    const evidence =
        normalizeEvidenceDimensions(
            source
                ?.evidence ??
            source
                ?.evidenceTypes ??
            []
        );


    const constraints = {};


    if (difficulty.length > 0) {
        constraints.difficulty =
            difficulty;
    }


    if (evidence.length > 0) {
        constraints.evidence =
            evidence;
    }


    return constraints;
}


/**
 * ============================================================
 * STUDENT STATE — REMEDIATION PROJECTION
 * ============================================================
 */

function projectRemediationState({

    previous,

    remediationPlan

}) {

    const base =
        clonePlainObject(
            previous ?? {
                lastResult:
                    null,

                activePlan:
                    null
            }
        );


    if (
        !remediationPlan ||
        typeof remediationPlan !==
        "object"
    ) {
        return base;
    }


    const failureType =
        remediationPlan
            ?.diagnosis
            ?.failureType ??
        remediationPlan
            ?.failureType ??
        null;


    const targetNodeId =
        remediationPlan
            ?.target
            ?.targetNodeId ??
        remediationPlan
            ?.target
            ?.sourceNodeId ??
        remediationPlan
            ?.target
            ?.originalNodeId ??
        null;


    const triggerNodeId =
        remediationPlan
            ?.target
            ?.originalNodeId ??
        targetNodeId;


    /**
     * Do not invent an invalid Student State remediation
     * projection if the Remediation output does not expose all
     * fields required by the Student State contract.
     */
    if (
        !remediationPlan.remediationId ||
        !targetNodeId ||
        !triggerNodeId ||
        !failureType
    ) {
        return base;
    }


    base.activePlan = {

        planId:
            remediationPlan
                .remediationId,

        targetNodeId,

        sourceNodeId:
            remediationPlan
                ?.target
                ?.sourceNodeId ??
            null,

        triggerNodeId,

        ...(
            remediationPlan
                ?.diagnosis
                ?.failureSignatureId

                ? {
                    failureSignatureId:
                        remediationPlan
                            .diagnosis
                            .failureSignatureId
                }

                : {}
        ),

        failureType,

        status:
            "active"
    };


    return base;
}


/**
 * ============================================================
 * STUDENT STATE — HISTORY PROJECTION
 * ============================================================
 */

function projectStudentStateHistory({

    previous,

    attempt,

    decision,

    timestamp

}) {

    const recentActions =
        Array.isArray(
            previous?.recentActions
        )
            ? clonePlainObject(
                previous.recentActions
            )
            : [];


    const recentQuestions =
        Array.isArray(
            previous?.recentQuestions
        )
            ? [
                ...previous
                    .recentQuestions
            ]
            : [];


    recentActions.push({

        action:
            decision?.action ??
            attempt
                ?.context
                ?.action,

        nodeId:
            decision
                ?.target
                ?.primaryNodeId ??
            attempt
                ?.context
                ?.nodeId ??
            null,

        at:
            timestamp
    });


    if (
        attempt?.questionId
    ) {
        recentQuestions.push(
            attempt.questionId
        );
    }


    return {

        recentActions:
            recentActions.slice(
                -DEFAULT_HISTORY_LIMIT
            ),

        recentQuestions:
            recentQuestions.slice(
                -DEFAULT_HISTORY_LIMIT
            )
    };
}


/**
 * ============================================================
 * INTERNAL RUNTIME HISTORY
 * ============================================================
 */

function appendHistory({

    history,

    attempt,

    flowResult,

    decision,

    timestamp,

    limit

}) {

    const next =
        Array.isArray(history)
            ? clonePlainObject(
                history
            )
            : [];


    next.push({

        attemptId:
            attempt.attemptId,

        questionId:
            attempt.questionId,

        nodeId:
            attempt
                ?.context
                ?.nodeId ??
            null,

        result:
            attempt.result,

        score:
            attempt.score,

        action:
            decision?.action ??
            null,

        nextAction:
            flowResult
                ?.adaptiveDecision
                ?.action ??
            null,

        context: {
            ...clonePlainObject(
                attempt.context
            ),

            contextId:
                sessionContextIdFromAttempt(
                    attempt
                )
        },

        submittedAt:
            attempt.submittedAt,

        at:
            timestamp
    });


    return next.slice(
        -limit
    );
}


function buildRecentResults(
    history
) {

    if (!Array.isArray(history)) {
        return [];
    }


    return history.map(
        item => ({

            attemptId:
                item.attemptId ??
                null,

            questionId:
                item.questionId ??
                null,

            nodeId:
                item.nodeId ??
                null,

            result:
                item.result ??
                null,

            score:
                clonePlainObject(
                    item.score ??
                    null
                ),

            action:
                item.action ??
                null,

            context:
                clonePlainObject(
                    item.context ??
                    {}
                ),

            submittedAt:
                item.submittedAt ??
                null
        })
    );
}


/**
 * ============================================================
 * LEARNING FLOW SESSION CONTEXT
 * ============================================================
 */

function buildLearningFlowSessionContext(
    session
) {

    return {

        sessionId:
            session
                .runtime
                .sessionId,

        previousAction:
            session
                ?.lastFlowResult
                ?.adaptiveDecision
                ?.action ??
            null,

        clusterId:
            session
                .config
                .clusterId ??
            undefined,

        lessonId:
            session
                .config
                .lessonId ??
            undefined,

        contextId:
            session
                .config
                .contextId ??
            undefined,

        remediationId:
            session
                ?.activeRemediationPlan
                ?.remediationId ??
            undefined
    };
}


/**
 * ============================================================
 * FAILURE PROJECTION
 * ============================================================
 */

function resolveKnowledgeFailure({

    attempt,

    flowResult,

    timestamp,

    previousFailure

}) {

    if (
        attempt.result !==
        "incorrect"
    ) {
        return clonePlainObject(
            previousFailure ??
            null
        );
    }


    const failure =
        flowResult
            ?.masteryUpdate
            ?.failure ??
        {};


    const diagnostic =
        attempt
            ?.diagnostic ??
        {};


    const failureType =
        failure.failureType ??
        diagnostic.failureType ??
        null;


    if (!failureType) {

        /**
         * Student State knowledgeFailure requires a canonical
         * failureType.
         *
         * Do not invent one.
         */
        return clonePlainObject(
            previousFailure ??
            null
        );
    }


    return {

        questionId:
            attempt.questionId,

        ...(
            failure.failureSignatureId ??
                diagnostic.failureSignatureId

                ? {
                    failureSignatureId:
                        failure
                            .failureSignatureId ??
                        diagnostic
                            .failureSignatureId
                }

                : {}
        ),

        failureType,

        sourceNodeId:
            failure.sourceNodeId ??
            diagnostic.sourceNodeId ??
            null,

        ...(
            failure.metaSkillId ??
                diagnostic.metaSkillId

                ? {
                    metaSkillId:
                        failure
                            .metaSkillId ??
                        diagnostic
                            .metaSkillId
                }

                : {}
        ),

        at:
            timestamp
    };
}


/**
 * ============================================================
 * NORMALIZERS
 * ============================================================
 */

function normalizeEvidenceVector(
    value
) {

    const source =
        value &&
            typeof value ===
            "object"
            ? value
            : {};


    return {

        know:
            clamp01(
                source.know
            ),

        explain:
            clamp01(
                source.explain
            ),

        apply:
            clamp01(
                source.apply
            ),

        transfer:
            clamp01(
                source.transfer
            )
    };
}


function normalizeEvidenceSufficiency(
    value
) {

    const source =
        value &&
            typeof value ===
            "object"
            ? value
            : {};


    return {

        independentObservations:
            normalizeNonNegativeInteger(
                source
                    .independentObservations
            ),

        distinctContexts:
            normalizeNonNegativeInteger(
                source
                    .distinctContexts
            ),

        distinctQuestionTypes:
            normalizeNonNegativeInteger(
                source
                    .distinctQuestionTypes
            ),

        observedEvidenceTypes:
            normalizeEvidenceDimensions(
                source
                    .observedEvidenceTypes ??
                []
            )
    };
}


function normalizeAttemptStats(
    value
) {

    const source =
        value &&
            typeof value ===
            "object"
            ? value
            : {};


    return {

        total:
            normalizeNonNegativeInteger(
                source.total
            ),

        correct:
            normalizeNonNegativeInteger(
                source.correct
            ),

        wrong:
            normalizeNonNegativeInteger(
                source.wrong
            ),

        partial:
            normalizeNonNegativeInteger(
                source.partial
            ),

        skipped:
            normalizeNonNegativeInteger(
                source.skipped
            )
    };
}


function normalizeRetestObservation(
    value
) {

    if (
        value &&
        typeof value ===
        "object"
    ) {
        return {

            attempted:
                Boolean(
                    value.attempted
                ),

            lastRetestAt:
                value.lastRetestAt ??
                null,

            passed:
                Boolean(
                    value.passed
                ),

            differentQuestion:
                Boolean(
                    value.differentQuestion
                ),

            differentContext:
                Boolean(
                    value.differentContext
                ),

            independent:
                Boolean(
                    value.independent
                )
        };
    }


    return {

        attempted:
            false,

        lastRetestAt:
            null,

        passed:
            false,

        differentQuestion:
            false,

        differentContext:
            false,

        independent:
            false
    };
}


function normalizeReviewObservation(
    value
) {

    return {

        lastReviewedAt:
            value
                ?.lastReviewedAt ??
            null
    };
}


function normalizeMastery(
    value
) {

    return [
        "M0",
        "M1",
        "M2",
        "M3",
        "M4"
    ].includes(value)
        ? value
        : "M0";
}


function normalizeMasteryStatus(
    value
) {

    return [
        "developing",
        "mastered",
        "stable",
        "weak"
    ].includes(value)
        ? value
        : "developing";
}


function normalizeConfidenceLevel(
    value
) {

    const candidate =
        typeof value ===
            "string"
            ? value
            : value?.level;


    return [
        "low",
        "medium",
        "high",
        "very_high"
    ].includes(candidate)
        ? candidate
        : "low";
}


function normalizeEvidenceDimensions(
    values
) {

    if (!Array.isArray(values)) {
        return [];
    }


    return uniqueStrings(
        values.filter(
            value =>
                [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ].includes(value)
        )
    );
}


function normalizeDifficultyArray(
    values
) {

    const source =
        Array.isArray(values)
            ? values
            : (
                typeof values ===
                    "string"
                    ? [values]
                    : []
            );


    return uniqueStrings(
        source.filter(
            value =>
                [
                    "D1",
                    "D2",
                    "D3",
                    "D4",
                    "D5"
                ].includes(value)
        )
    );
}


function normalizeStringArray(
    values
) {

    if (!Array.isArray(values)) {
        return [];
    }


    return uniqueStrings(
        values.filter(
            value =>
                typeof value ===
                "string" &&
                value.length > 0
        )
    );
}


function normalizeInitialHistory(
    history,
    limit
) {

    if (!Array.isArray(history)) {
        throw new TypeError(
            "StudySession history must be an array."
        );
    }


    return clonePlainObject(
        history.slice(
            -limit
        )
    );
}


/**
 * ============================================================
 * DECISION / PATH HELPERS
 * ============================================================
 */

function resolveDecisionAction(
    decision
) {

    const action =
        decision?.action;


    if (
        !CANONICAL_ACTIONS.has(
            action
        )
    ) {
        throw new Error(
            `StudySession received non-canonical action: ${String(action)}`
        );
    }


    return action;
}


function resolvePathStage({

    action,
    decision

}) {

    const explicit =
        decision
            ?.path
            ?.stage ??
        decision
            ?.pathStage;


    const allowed =
        new Set([
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


    if (
        explicit &&
        allowed.has(explicit)
    ) {
        return explicit;
    }


    /**
     * Canonical primary actions are also valid path stages
     * for the basic Study MVP loop.
     */
    return action;
}


/**
 * ============================================================
 * TIME HELPERS
 * ============================================================
 */

function calculateTimeUsedMinutes({

    previous,
    attempt

}) {

    const previousMinutes =
        normalizeNonNegativeInteger(
            previous
        );


    const seconds =
        normalizeNonNegativeInteger(
            attempt
                ?.timing
                ?.timeSpentSeconds
        );


    return (
        previousMinutes +
        Math.ceil(
            seconds / 60
        )
    );
}


function resolveTimeBudget({

    timeBudget,
    studentState

}) {

    if (
        Number.isFinite(
            timeBudget
        )
    ) {
        return Math.max(
            0,
            Math.floor(
                timeBudget
            )
        );
    }


    const fromState =
        studentState
            ?.learning
            ?.session
            ?.timeBudgetMinutes;


    if (
        Number.isFinite(
            fromState
        )
    ) {
        return Math.max(
            0,
            Math.floor(
                fromState
            )
        );
    }


    return 0;
}


function resolveTimestamp(
    value
) {

    if (value == null) {
        return new Date()
            .toISOString();
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new TypeError(
            "StudySession received invalid timestamp."
        );
    }


    return date.toISOString();
}


/**
 * ============================================================
 * ASSERTIONS
 * ============================================================
 */

function assertStudySession(
    session
) {

    if (
        !session ||
        typeof session !==
        "object"
    ) {
        throw new TypeError(
            "StudySession requires a session object."
        );
    }


    if (
        session
            ?.runtime
            ?.name !==
        SESSION_NAME
    ) {
        throw new TypeError(
            "Invalid StudySession runtime object."
        );
    }
}


function assertActiveSession(
    session
) {

    assertStudySession(
        session
    );


    if (
        session
            ?.runtime
            ?.status !==
        "active"
    ) {
        throw new Error(
            "StudySession is not active."
        );
    }
}


function assertSelectedQuestion(
    session
) {

    if (
        session
            ?.currentSelection
            ?.status !==
        "SELECTED"
    ) {
        throw new Error(
            "StudySession has no selected question to submit."
        );
    }


    if (
        !session.currentQuestion ||
        typeof session.currentQuestion !==
        "object"
    ) {
        throw new Error(
            "StudySession currentQuestion is missing."
        );
    }
}


function assertStudentState(
    state
) {

    if (
        !state ||
        typeof state !==
        "object"
    ) {
        throw new TypeError(
            "StudySession requires studentState."
        );
    }


    /**
     * Accept the current canonical contract.
     *
     * We do not run StudentStateValidator here because
     * validation remains a separate layer.
     */
    if (
        state.schemaVersion &&
        state.schemaVersion !==
        STUDENT_STATE_VERSION
    ) {
        throw new Error(
            `StudySession expects Student State ${STUDENT_STATE_VERSION}.`
        );
    }


    if (
        !state.knowledge ||
        typeof state.knowledge !==
        "object"
    ) {
        throw new TypeError(
            "StudySession requires studentState.knowledge."
        );
    }
}


function assertAdaptiveDecision(
    decision
) {

    if (
        !decision ||
        typeof decision !==
        "object"
    ) {
        throw new TypeError(
            "StudySession requires an AdaptiveDecision."
        );
    }


    if (
        !CANONICAL_ACTIONS.has(
            decision.action
        )
    ) {
        throw new Error(
            `Invalid AdaptiveDecision action: ${String(decision.action)}`
        );
    }
}


function assertQuestionBanks(
    banks
) {

    if (
        !banks ||
        typeof banks !==
        "object"
    ) {
        throw new TypeError(
            "StudySession requires questionBanks."
        );
    }
}


function assertHistoryLimit(
    value
) {

    if (
        !Number.isInteger(value) ||
        value < 1
    ) {
        throw new TypeError(
            "StudySession historyLimit must be a positive integer."
        );
    }
}


function assertFlowResult(
    result
) {

    if (
        !result ||
        typeof result !==
        "object"
    ) {
        throw new TypeError(
            "StudySession received invalid LearningFlow result."
        );
    }


    if (
        result
            ?.flow
            ?.name !==
        "LearningFlow"
    ) {
        throw new Error(
            "StudySession expected LearningFlow output."
        );
    }


    assertAdaptiveDecision(
        result.adaptiveDecision
    );
}


function assertNonEmptyString(
    value,
    name
) {

    if (
        typeof value !==
        "string" ||
        value.length === 0
    ) {
        throw new TypeError(
            `StudySession ${name} must be a non-empty string.`
        );
    }
}


/**
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function resolveStudentId(
    state
) {

    const studentId =
        state
            ?.student
            ?.studentId ??
        state
            ?.studentId;


    assertNonEmptyString(
        studentId,
        "studentId"
    );


    return studentId;
}


function sessionContextIdFromAttempt(
    attempt
) {

    return (
        attempt
            ?.context
            ?.contextId ??
        attempt
            ?.context
            ?.lessonId ??
        attempt
            ?.context
            ?.clusterId ??
        null
    );
}


function normalizeNonNegativeInteger(
    value
) {

    if (
        !Number.isFinite(value)
    ) {
        return 0;
    }


    return Math.max(
        0,
        Math.floor(
            value
        )
    );
}


function finiteNumberOr(
    value,
    fallback
) {

    return Number.isFinite(value)
        ? value
        : fallback;
}


function clamp01(
    value
) {

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


function nullableString(
    value
) {

    return (
        typeof value ===
        "string" &&
        value.length > 0
    )
        ? value
        : null;
}


function uniqueStrings(
    values
) {

    return [
        ...new Set(
            values
        )
    ];
}


function clonePlainObject(
    value
) {

    if (value == null) {
        return value;
    }


    return structuredClone(
        value
    );
}


/**
 * ============================================================
 * PUBLIC INFO
 * ============================================================
 */

export const STUDY_SESSION_INFO =
    Object.freeze({

        name:
            SESSION_NAME,

        version:
            SESSION_VERSION,

        studentStateVersion:
            STUDENT_STATE_VERSION,

        responsibility:
            "Runtime study-session orchestration and projection commit.",

        persistence:
            false
    });


export default {
    createStudySession,
    getNextQuestion,
    submitAnswer,
    getSessionSnapshot,
    getStudentState
};