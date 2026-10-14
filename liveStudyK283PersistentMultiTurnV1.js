/**
 * ============================================================
 * liveStudyK283.js
 * ============================================================
 *
 * Adaptive Biology Learning System
 * Phase 2A — LIVE STUDY CLI
 *
 * Purpose: 
 * - Run one real interactive K283 study session in terminal.
 * - Use the LOCKED StudySession runtime.
 *
 * DOES:
 * - load real project data
 * - create StudySession
 * - ask QuestionSelector for the real next question
 * - display question
 * - read A/B/C/D from terminal
 * - submit through StudySession
 * - display evaluation + mastery snapshot + next action
 *
 * DOES NOT:
 * - calculate mastery
 * - calculate evidence
 * - select questions
 * - decide adaptive action
 * - diagnose remediation
 * - mutate engine contracts
 *
 * Run:
 *
 *   node liveStudyK283.js
 *   K283_PROBE_AUTHORING_POLICY=/path/to/policy.json node liveStudyK283PersistentMultiTurnV1.js
 *
 * Commands:
 *
 *   A / B / C / D
 *   state
 *   status
 *   decision
 *   help
 *   quit
 *
 * ============================================================
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { createLiveSessionRevisionAuthority } from "./src/restoration/liveSessionRevisionAuthority.js";
import { createDurableAttemptStore } from "./src/persistence/durableAttemptStore.js";
import { createDurableSubmitJournalV3 } from "./src/restoration/durableSubmitJournalV3.js";
import { createDurableSessionCommitV1 } from "./src/restoration/durableSessionCommitV1.js";
import { createK283PersistentMultiTurnCoordinatorV1 } from "./src/restoration/k283PersistentMultiTurnCoordinatorV1.js";

import { createAtomicCaptureCoordinationV1 } from "./src/restoration/atomicCaptureCoordinationV1.js";

import { createHash } from "node:crypto";
import { evaluateK283Completion, MASTERY_LEVELS } from "./k283SessionCompletionV1.js";
import { findLatestVerifiedK283Progress } from "./k283ProgressContinuationV1.js";
import { getPreviouslyObservedK283QuestionIds, applyK283InitialExclusions, applyK283SelectionExclusions, assertK283QuestionNotPreviouslyObserved } from "./k283CrossSessionQuestionGuardV1.js";
import {
    bootstrapAdaptiveDecision,
    acceptBootstrapRemediationProvenance,
    classifyBootstrapRemediationStop,
    resolveBootstrapRemediationGenerationStop,
    restoreBootstrapRemediationGenerationStop,
    resolveBootstrapRemediationPolicyErrorStop,
    restoreBootstrapRemediationPolicyErrorStop
} from "./k283AdaptiveBootstrapV1.js";
import { resolveQuestionFeedback, formatQuestionFeedbackLines } from "./k283ImmediateFeedbackV1.js";
import { resolveRemediationStepContent, formatRemediationStepLines, INSTRUCTIONAL_STEP_TYPES } from "./k283RemediationContentResolverV1.js";
import { selectK283NextQuestion, formatK283ProbeOutcome } from "./k283RemediationCLIProbeV1.js";
import { submitK283DiagnosticAnswer } from "./k283A003DiagnosticConfirmationV1.js";
import {
    K283ProbePolicyConfigurationError,
    preflightK283ProbeAuthoringPolicy
} from "./k283ProbePolicyPreflightV1.js";


import {
    createStudySession,
    getNextQuestion,
    submitAnswer,
    getStudentState
} from "./src/engines/orchestration/studySession.js";


/**
 * ============================================================
 * PATHS
 * ============================================================
 */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


/**
 * IMPORTANT:
 *
 * If one of your project files lives somewhere else,
 * change ONLY this PATHS object.
 *
 * Do not change runtime logic below.
 */

const PATHS = Object.freeze({

    questionBank:
        "./src/data/questions/c09/K283.question-bank.json",

    knowledgeMap:
        "./src/data/knowledge/knowledge-map-v4.json",

    masteryRules:
        "./src/policies/mastery/rules.json",

    evidenceModel:
        "./src/data/mastery/evidence.json",

    adaptiveRules:
        "./src/policies/adaptive/rules.json",

    adaptivePaths:
        "./src/policies/adaptive/paths.json",

    failureSignatures:
        "./src/data/remediation/failure-signatures.json",

    studentState:
        "./src/data/student-state.json"
});


/**
 * ============================================================
 * LIVE STUDY CONFIG
 * ============================================================
 */

const TARGET_NODE_ID =
    "K283";

const CLUSTER_ID =
    "C09";

const LEARNING_MODE =
    "HOC_SAU";

const TIME_BUDGET_MINUTES =
    60;

const CONTEXT_ID =
    "live-study-k283";

const SESSION_ID =
    `LIVE-K283-${Date.now()}`;

const STUDENT_ID_FALLBACK =
    "STUDENT-LIVE-K283";


/**
 * ============================================================
 * INITIAL ADAPTIVE DECISION
 * ============================================================
 *
 * This is only the StudySession entry fixture.
 *
 * After the first Attempt:
 *
 * AdaptiveEngine owns every next decision.
 */

function createInitialDecision() {

    return {

        decisionId:
            `DECISION-${SESSION_ID}-INITIAL`,

        action:
            "PRACTICE",

        target: {

            primaryNodeId:
                TARGET_NODE_ID,

            nodeIds: [
                TARGET_NODE_ID
            ]
        },

        selectionCriteria: {

            questionTypes: [
                "mcq"
            ],

            difficulty: {

                min:
                    "D1",

                max:
                    "D5",

                preferred:
                    "D3"
            },

            evidenceDimensions:
                [],

            excludeQuestionIds:
                [],

            requireDifferentQuestion:
                false,

            requireDifferentContext:
                false,

            requireIndependentEvidence:
                false,

            metaSkills:
                [],

            secondaryNodes:
                [],

            failureSignatures:
                []
        },

        constraints: {

            requireDifferentContext:
                false,

            requireDifferentQuestion:
                false
        },

        path: {

            current:
                "PRACTICE",

            next:
                null
        },

        fallback:
            null
    };
}


/**
 * ============================================================
 * JSON LOADING
 * ============================================================
 */

function resolveProjectPath(
    relativePath
) {

    return path.resolve(
        __dirname,
        relativePath
    );
}


function readJson(
    relativePath,
    {
        required = true,
        fallback = null
    } = {}
) {

    const absolutePath =
        resolveProjectPath(
            relativePath
        );


    if (
        !fs.existsSync(
            absolutePath
        )
    ) {

        if (!required) {
            return structuredClone(
                fallback
            );
        }


        throw new Error(
            [
                "",
                `Missing required file:`,
                `  ${relativePath}`,
                "",
                `Resolved path:`,
                `  ${absolutePath}`,
                "",
                `Update PATHS at the top of liveStudyK283.js if necessary.`
            ].join("\n")
        );
    }


    const raw =
        fs.readFileSync(
            absolutePath,
            "utf8"
        );


    try {

        return JSON.parse(
            raw
        );

    } catch (error) {

        throw new Error(
            `Invalid JSON in '${relativePath}': ${error.message}`
        );
    }
}


/**
 * ============================================================
 * LOAD PROJECT DATA
 * ============================================================
 */

function loadDependencies() {

    const questionBank =
        readJson(
            PATHS.questionBank
        );


    const knowledgeMap =
        readJson(
            PATHS.knowledgeMap
        );


    const masteryRules =
        readJson(
            PATHS.masteryRules
        );


    const evidenceModel =
        readJson(
            PATHS.evidenceModel
        );


    const adaptiveRules =
        readJson(
            PATHS.adaptiveRules
        );


    const adaptivePaths =
        readJson(
            PATHS.adaptivePaths
        );


    const failureSignatures =
        readJson(
            PATHS.failureSignatures
        );


    /**
     * IMPORTANT:
     *
     * There is currently NO remediation/rules.json.
     *
     * LearningFlow / StudySession already allow:
     *
     * remediationRules = {}
     *
     * Therefore we intentionally use {} here.
     */

    const remediationRules =
        {};


    return {

        questionBank,
        knowledgeMap,
        masteryRules,
        evidenceModel,
        adaptiveRules,
        adaptivePaths,
        failureSignatures,
        remediationRules
    };
}


/**
 * ============================================================
 * STUDENT STATE
 * ============================================================
 */

function loadStudentState() {

    const loaded =
        readJson(
            PATHS.studentState,
            {
                required:
                    false,

                fallback:
                    null
            }
        );


    if (loaded) {

        /**
         * We intentionally start this CLI with the
         * current file state.
         *
         * StudySession clones caller-owned state.
         */

        return loaded;
    }


    /**
     * --------------------------------------------------------
     * Minimal runtime Student State V1.2.0 fallback
     * --------------------------------------------------------
     *
     * Used only if student-state.json does not exist.
     */

    const now =
        new Date()
            .toISOString();


    return {

        schemaVersion:
            "1.2.0",

        stateId:
            `STATE-${STUDENT_ID_FALLBACK}`,

        stateType:
            "runtime",

        updatedAt:
            now,

        student: {

            studentId:
                STUDENT_ID_FALLBACK
        },

        learning: {

            currentMode:
                LEARNING_MODE,

            session: {

                sessionId:
                    "NOT_STARTED",

                startedAt:
                    now,

                lastActivityAt:
                    now,

                timeBudgetMinutes:
                    TIME_BUDGET_MINUTES,

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

                    signals:
                        []
                }
            },

            current: {

                clusterId:
                    null,

                lessonId:
                    null,

                nodeId:
                    null,

                action:
                    null,

                contextId:
                    null
            }
        },

        knowledge:
            {},

        metaSkills:
            {},

        failurePatterns: {

            active:
                []
        },

        remediation: {

            lastResult:
                null,

            activePlan:
                null
        },

        adaptive: {

            lastDecision:
                null,

            nextAction:
                null
        },

        history: {

            recentActions:
                [],

            recentQuestions:
                []
        },

        progress: {

            nodes: {

                total:
                    0,

                unstarted:
                    0,

                developing:
                    0,

                mastered:
                    0,

                stable:
                    0
            },

            clusters:
                {}
        },

        preferences: {

            preferredSessionLength:
                "normal",

            preferredDifficulty:
                "adaptive",

            allowChallenge:
                true,

            allowSkipKnown:
                true,

            showDetailedFeedback:
                true
        }
    };
}


/**
 * ============================================================
 * QUESTION BANK ADAPTER
 * ============================================================
 */

function buildQuestionBanks(
    bank
) {

    /**
     * QuestionSelector accepts the project question-bank
     * collection used by StudySession tests.
     *
     * Keep the original bank object.
     *
     * If the selector receives a registry keyed by node,
     * this also exposes K283 explicitly.
     */

    return {
        [TARGET_NODE_ID]:
            bank
    };
}


/**
 * ============================================================
 * DISPLAY HELPERS
 * ============================================================
 */

function line(
    char = "─",
    count = 60
) {

    return char.repeat(
        count
    );
}


function printHeader() {

    console.log(
        "\n" +
        line("═")
    );

    console.log(
        " BIOLOGY LIVE STUDY — K283 (PERSISTENT MULTI-TURN DRAFT)"
    );

    console.log(
        line("═")
    );

    console.log(
        ` Session : ${SESSION_ID}`
    );

    console.log(
        ` Node    : ${TARGET_NODE_ID}`
    );

    console.log(
        ` Cluster : ${CLUSTER_ID}`
    );

    console.log(
        ` Mode    : ${LEARNING_MODE}`
    );

    console.log(
        ` Budget  : ${TIME_BUDGET_MINUTES} min`
    );

    console.log(
        line("═") +
        "\n"
    );
}


function printQuestion({
    question,
    decision,
    questionNumber
}) {

    console.log(
        "\n" +
        line()
    );

    console.log(
        `QUESTION #${questionNumber}`
    );

    console.log(
        line()
    );


    console.log(
        `ID         : ${question.id}`
    );

    console.log(
        `Action     : ${decision?.action ?? "-"}`
    );

    console.log(
        `Evidence   : ${question.evidence ?? "-"}`
    );

    console.log(
        `Difficulty : ${question.difficulty ?? "-"}`
    );

    console.log(
        `Mode       : ${Array.isArray(question.mode)
            ? question.mode.join(", ")
            : question.mode ?? "-"
        }`
    );


    console.log(
        "\n" +
        getQuestionStem(
            question
        )
    );


    const options =
        question
            ?.content
            ?.options ??
        [];


    for (
        const option
        of options
    ) {

        console.log(
            `${option.id}. ${option.text}`
        );
    }


    const isNumeric = question?.questionType === "numeric";
    console.log(
        "\n" +
        (isNumeric
            ? "Commands: <number> | status | state | decision | help | quit"
            : "Commands: A/B/C/D | status | state | decision | help | quit")
    );

    console.log(
        line()
    );
}


function getQuestionStem(
    question
) {

    const context =
        question
            ?.content
            ?.context;


    const stem =
        question
            ?.content
            ?.stem ??
        "(missing stem)";


    if (
        typeof context === "string" &&
        context.trim()
    ) {

        return (
            context.trim() +
            "\n\n" +
            stem
        );
    }


    return stem;
}


function printEvaluation(
    result
) {

    const evaluation =
        result.evaluation;


    console.log(
        "\n" +
        (
            evaluation.correct
                ? "✓ CORRECT"
                : evaluation.result ===
                    "skipped"
                    ? "○ SKIPPED"
                    : "✗ INCORRECT"
        )
    );


    console.log(
        `Score: ${formatNumber(
            evaluation
                ?.score
                ?.normalized
        )
        }`
    );


    const question =
        result
            ?.session
            ?.attempts
            ?.length
            ? result
                .flowResult
                ?.question
            : null;


    /**
     * Explanation is read from the current question before
     * submit in main loop, so displayQuestionFeedback() handles it.
     */
}


function displayQuestionFeedback(
    question,
    evaluation,
    userResponse = null
) {
    const feedback = resolveQuestionFeedback(question, evaluation, userResponse);
    const lines = formatQuestionFeedbackLines(feedback);

    if (lines.length > 0) {
        console.log("\n" + lines.join("\n"));
    }
}


/**
 * ============================================================
 * STATUS DISPLAY
 * ============================================================
 */

function getK283State(
    session
) {

    const state =
        getStudentState(
            session
        );


    return (
        state
            ?.knowledge
        ?.[TARGET_NODE_ID] ??
        null
    );
}


function printStatus(
    session
) {

    const node =
        getK283State(
            session
        );


    console.log(
        "\n" +
        line()
    );

    console.log(
        "K283 STATUS"
    );

    console.log(
        line()
    );


    if (!node) {

        console.log(
            "No committed K283 evidence yet."
        );

        console.log(
            line()
        );

        return;
    }


    console.log(
        `Mastery    : ${node.mastery ?? "M0"}`
    );

    console.log(
        `Status     : ${node.status ?? "developing"}`
    );

    console.log(
        `Confidence : ${typeof node.confidence ===
            "string"
            ? node.confidence
            : node
                ?.confidence
                ?.level ??
            "low"
        }`
    );

    console.log(
        `Overall    : ${formatNumber(
            node.overallEvidence
        )
        }`
    );


    console.log(
        "\nEvidence"
    );

    console.log(
        `  know     : ${formatNumber(
            node
                ?.evidence
                ?.know
        )
        }`
    );

    console.log(
        `  explain  : ${formatNumber(
            node
                ?.evidence
                ?.explain
        )
        }`
    );

    console.log(
        `  apply    : ${formatNumber(
            node
                ?.evidence
                ?.apply
        )
        }`
    );

    console.log(
        `  transfer : ${formatNumber(
            node
                ?.evidence
                ?.transfer
        )
        }`
    );


    const stats =
        node.attemptStats ??
        {};


    console.log(
        "\nAttempts"
    );

    console.log(
        `  total    : ${stats.total ?? 0}`
    );

    console.log(
        `  correct  : ${stats.correct ?? 0}`
    );

    console.log(
        `  wrong    : ${stats.wrong ?? 0}`
    );

    console.log(
        `  partial  : ${stats.partial ?? 0}`
    );

    console.log(
        `  skipped  : ${stats.skipped ?? 0}`
    );


    const sufficiency =
        node.evidenceSufficiency ??
        {};


    console.log(
        "\nEvidence sufficiency"
    );

    console.log(
        `  independent observations : ${sufficiency
            .independentObservations ??
        0
        }`
    );

    console.log(
        `  distinct contexts        : ${sufficiency
            .distinctContexts ??
        0
        }`
    );

    console.log(
        `  distinct question types  : ${sufficiency
            .distinctQuestionTypes ??
        0
        }`
    );

    console.log(
        `  observed evidence types  : ${Array.isArray(
            sufficiency
                .observedEvidenceTypes
        )
            ? sufficiency
                .observedEvidenceTypes
                .join(", ") ||
            "-"
            : "-"
        }`
    );


    if (
        Array.isArray(
            node.weakEvidence
        ) &&
        node.weakEvidence.length >
        0
    ) {

        console.log(
            `\nWeak evidence: ${node.weakEvidence.join(
                ", "
            )
            }`
        );
    }


    if (
        Array.isArray(
            node.signals
        ) &&
        node.signals.length >
        0
    ) {

        console.log(
            `Signals: ${node.signals.join(
                ", "
            )
            }`
        );
    }


    console.log(
        line()
    );
}


/**
 * ============================================================
 * DECISION DISPLAY
 * ============================================================
 */

function printDecision(
    session
) {

    const decision =
        session.currentDecision;


    console.log(
        "\n" +
        line()
    );

    console.log(
        "CURRENT ADAPTIVE DECISION"
    );

    console.log(
        line()
    );


    console.log(
        `Decision ID : ${decision?.decisionId ??
        "-"
        }`
    );

    console.log(
        `Action      : ${decision?.action ??
        "-"
        }`
    );

    console.log(
        `Target      : ${decision
            ?.target
            ?.primaryNodeId ??
        "-"
        }`
    );


    const reasonCodes =
        decision
            ?.reason
            ?.codes ??
        decision
            ?.reasonCodes ??
        [];


    if (
        Array.isArray(
            reasonCodes
        ) &&
        reasonCodes.length >
        0
    ) {

        console.log(
            `Reasons     : ${reasonCodes.join(
                ", "
            )
            }`
        );
    }


    console.log(
        line()
    );
}


/**
 * ============================================================
 * REMEDIATION DISPLAY
 * ============================================================
 */

function printRemediation(
    session,
    question = null,
    attempt = null
) {

    const plan =
        session
            .activeRemediationPlan;


    if (!plan) {
        return;
    }


    console.log(
        "\n" +
        line("!")
    );

    console.log(
        "REMEDIATION ACTIVE"
    );

    console.log(
        line("!")
    );


    console.log(
        `Plan ID     : ${plan.remediationId ??
        "-"
        }`
    );

    console.log(
        `Failure     : ${plan
            ?.diagnosis
            ?.failureType ??
        plan.failureType ??
        "-"
        }`
    );

    console.log(
        `Target node : ${plan
            ?.target
            ?.targetNodeId ??
        plan
            ?.target
            ?.sourceNodeId ??
        "-"
        }`
    );


    const steps =
        plan.steps ??
        plan.plan ??
        [];


    // Resolve the learner's chosen option from the failed attempt
    // (used by ERROR_ANALYSIS to select the per-option explanation).
    const chosenOption =
        attempt?.response?.value ??
        attempt?.response?.selected ??
        null;


    if (
        Array.isArray(steps) &&
        steps.length > 0
    ) {

        console.log(
            "\nSteps:"
        );


        steps.forEach(
            (
                step,
                index
            ) => {

                console.log(
                    `  ${index + 1}. [${step?.type ?? "STEP"}]`
                );


                if (INSTRUCTIONAL_STEP_TYPES.includes(step?.type)) {

                    // Resolve authoritative content from the question that
                    // triggered this remediation. Never use an unrelated question.
                    const resolved = resolveRemediationStepContent({
                        step,
                        question,
                        chosenOption
                    });

                    const contentLines = formatRemediationStepLines(resolved);

                    contentLines.forEach(l => console.log(`     ${l}`));

                } else {

                    // Unsupported step type — preserve original fallback display.
                    const text =
                        typeof step === "string"
                            ? step
                            : step?.instruction ??
                              step?.description ??
                              step?.type ??
                              JSON.stringify(step);

                    console.log(`     ${text}`);
                }
            }
        );
    }


    console.log(
        line("!")
    );
}


/**
 * ============================================================
 * COMMANDS
 * ============================================================
 */

function printHelp() {

    console.log(
        `
Commands

  A
  B
  C
  D
      Submit answer.

  status
      Show current K283 mastery/evidence snapshot.

  state
      Print current canonical Student State.

  decision
      Print current AdaptiveDecision.

  help
      Show this help.

  quit
      End CLI session.

Important:
  Mastery and Adaptive decisions are NOT calculated by this file.
  They come from the real StudySession → LearningFlow pipeline.
`
    );
}


/**
 * ============================================================
 * INPUT NORMALIZATION
 * ============================================================
 */

function normalizeCommand(
    value
) {

    return String(
        value ??
        ""
    )
        .trim();
}


function normalizeAnswer(
    value,
    question = null
) {
    const raw =
        normalizeCommand(
            value
        );

    if (
        question?.questionType === "numeric"
    ) {
        if (!raw) {
            return null;
        }

        const parsed =
            Number(raw);

        if (
            Number.isFinite(parsed)
        ) {
            return parsed;
        }

        return null;
    }

    const candidate =
        raw.toUpperCase();

    if (
        [
            "A",
            "B",
            "C",
            "D"
        ].includes(
            candidate
        )
    ) {
        return candidate;
    }

    return null;
}


/**
 * ============================================================
 * ATTEMPT IDS / TIME
 * ============================================================
 */

function createAttemptId(
    number
) {

    return (
        `ATTEMPT-${SESSION_ID}-${String(number).padStart(3, "0")}`
    );
}


function nowIso() {

    return new Date()
        .toISOString();
}


/**
 * ============================================================
 * FORMAT
 * ============================================================
 */

function formatNumber(
    value
) {

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {

        return "0.000";
    }


    return value.toFixed(
        3
    );
}


/**
 * ============================================================
 * SESSION CREATION
 * ============================================================
 */

export function createRuntimeSession(previousProgress = null, probeAuthoringPolicy = null) {
    const remediationProvenance = acceptBootstrapRemediationProvenance(previousProgress);

    const dependencies =
        loadDependencies();

    const config = {
        learningMode: LEARNING_MODE,
        timeBudget: TIME_BUDGET_MINUTES,
        clusterId: CLUSTER_ID,
        lessonId: null,
        contextId: CONTEXT_ID,
        historyLimit: 50
    };
    const policyPreflight = preflightK283ProbeAuthoringPolicy({
        policy: probeAuthoringPolicy,
        dependencies,
        targetNodeId: TARGET_NODE_ID,
        config,
        selectorConstraints: {}
    });

    if (policyPreflight.status === "VALIDATED") {
        dependencies.probeAuthoringPolicy = policyPreflight.policy;
    }

    const remediationStopClassification = classifyBootstrapRemediationStop({
        checkpoint: previousProgress?.checkpoint, remediationProvenance,
        dependencies, config, targetNodeId: TARGET_NODE_ID, selectorConstraints: {}
    });

    const studentState =
        previousProgress?.studentState ?? loadStudentState();


    /**
     * The CLI intentionally starts a NEW runtime study session.
     *
     * Existing knowledge/mastery inside studentState is preserved.
     */

    const initialDecision =
        (previousProgress
            ? bootstrapAdaptiveDecision({
                studentState,
                dependencies,
                targetNodeId: TARGET_NODE_ID,
                clusterId: CLUSTER_ID,
                learningMode: LEARNING_MODE,
                timeBudget: TIME_BUDGET_MINUTES,
                sessionId: SESSION_ID,
                now: nowIso()
            })
            : null) ?? createInitialDecision();

    const session = createStudySession({

        sessionId:
            SESSION_ID,

        studentState,

        initialDecision,

        questionBanks:
            buildQuestionBanks(
                dependencies
                    .questionBank
            ),

        knowledgeMap:
            dependencies
                .knowledgeMap,

        masteryRules:
            dependencies
                .masteryRules,

        evidenceModel:
            dependencies
                .evidenceModel,

        adaptiveRules:
            dependencies
                .adaptiveRules,

        adaptivePaths:
            dependencies
                .adaptivePaths,

        failureSignatures:
            dependencies
                .failureSignatures,

        remediationRules:
            dependencies
                .remediationRules,

        ...(dependencies.probeAuthoringPolicy === undefined
            ? {}
            : { probeAuthoringPolicy: dependencies.probeAuthoringPolicy }),

        ...config,
        history:
            previousProgress?.history ?? [],

        now:
            nowIso()
    });

    const remediationGenerationStop = previousProgress?.remediationGenerationStop
        ? resolveBootstrapRemediationGenerationStop({
            checkpoint: previousProgress.checkpoint,
            dependencies,
            questionBank: dependencies.questionBank,
            targetNodeId: TARGET_NODE_ID,
            selectorConstraints: {},
            config: {
                learningMode: LEARNING_MODE,
                timeBudget: TIME_BUDGET_MINUTES,
                clusterId: CLUSTER_ID,
                lessonId: null,
                contextId: CONTEXT_ID,
                historyLimit: 50
            }
        })
        : null;

    if (remediationGenerationStop?.status === "FAIL_CLOSED") {
        throw new Error(
            `K283_REMEDIATION_STOP_RESTORE_BLOCKED: ${remediationGenerationStop.reasonCode}`
        );
    }
    if (
        remediationGenerationStop?.status === "PROBE_GENERATION_INFEASIBLE" ||
        remediationGenerationStop?.status === "RETRY_ELIGIBLE"
    ) {
        restoreBootstrapRemediationGenerationStop(session, remediationGenerationStop);
    }

    const remediationPolicyErrorStop = previousProgress?.remediationPolicyErrorStop
        ? resolveBootstrapRemediationPolicyErrorStop({
            checkpoint: previousProgress.checkpoint,
            dependencies,
            questionBank: dependencies.questionBank,
            policy: dependencies.probeAuthoringPolicy,
            targetNodeId: TARGET_NODE_ID,
            selectorConstraints: {},
            config
        })
        : null;

    if (remediationPolicyErrorStop?.status === "FAIL_CLOSED") {
        throw new Error(
            `K283_POLICY_ERROR_STOP_RESTORE_BLOCKED: ${remediationPolicyErrorStop.reasonCode}`
        );
    }
    if (
        remediationPolicyErrorStop?.status === "POLICY_ERROR" ||
        remediationPolicyErrorStop?.status === "RETRY_ELIGIBLE"
    ) {
        restoreBootstrapRemediationPolicyErrorStop(session, remediationPolicyErrorStop);
    }

    return { session, remediationGenerationStop, remediationPolicyErrorStop, remediationStopClassification,
        ...(remediationProvenance === undefined ? {} : { remediationProvenance }) };
}

/**
 * ============================================================
 * RUNTIME TRACE
 * ============================================================
 *
 * Diagnostic only.
 *
 * DOES NOT:
 * - mutate session
 * - calculate mastery
 * - alter AdaptiveDecision
 * - alter QuestionSelector
 *
 * Purpose:
 *
 * AdaptiveDecision
 *      ↓
 * QuestionSelector
 *      ↓
 * Question
 *      ↓
 * Attempt
 *      ↓
 * Mastery
 *      ↓
 * AdaptiveDecision
 */

function printRuntimeTrace({
    turn,
    entryDecision,
    selection,
    question,
    attempt = null,
    flowResult = null,
    nextDecision = null,
    session = null
}) {

    console.log("\n");
    console.log(
        "╔════════════════════════════════════════════════════════════╗"
    );

    console.log(
        `║ RUNTIME TRACE — TURN ${String(turn).padEnd(37)}║`
    );

    console.log(
        "╚════════════════════════════════════════════════════════════╝"
    );


    /**
     * --------------------------------------------------------
     * 1. ENTRY ADAPTIVE DECISION
     * --------------------------------------------------------
     */

    console.log("\n[1] ENTRY ADAPTIVE DECISION");

    console.log(
        JSON.stringify(
            {
                decisionId:
                    entryDecision?.decisionId ?? null,

                action:
                    entryDecision?.action ?? null,

                target:
                    entryDecision?.target ?? null,

                selectionCriteria:
                    entryDecision?.selectionCriteria ?? null,

                constraints:
                    entryDecision?.constraints ?? null,

                path:
                    entryDecision?.path ?? null,

                fallback:
                    entryDecision?.fallback ?? null,

                reason:
                    entryDecision?.reason ?? null,

                reasonCodes:
                    entryDecision?.reasonCodes ?? null
            },
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 2. QUESTION SELECTOR OUTPUT
     * --------------------------------------------------------
     */

    console.log("\n[2] QUESTION SELECTOR OUTPUT");

    console.log(
        JSON.stringify(
            {
                status:
                    selection?.status ?? null,

                reason:
                    selection?.reason ?? null,

                selectedQuestionId:
                    selection
                        ?.selected
                        ?.question
                        ?.id ??
                    null,

                selected:
                    selection?.selected
                        ? {
                            questionId:
                                selection
                                    ?.selected
                                    ?.question
                                    ?.id ??
                                null,

                            evidence:
                                selection
                                    ?.selected
                                    ?.question
                                    ?.evidence ??
                                null,

                            difficulty:
                                selection
                                    ?.selected
                                    ?.question
                                    ?.difficulty ??
                                null,

                            questionType:
                                selection
                                    ?.selected
                                    ?.question
                                    ?.questionType ??
                                null,

                            mode:
                                selection
                                    ?.selected
                                    ?.question
                                    ?.mode ??
                                null
                        }
                        : null
            },
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 3. SELECTED QUESTION
     * --------------------------------------------------------
     */

    console.log("\n[3] SELECTED QUESTION");

    console.log(
        JSON.stringify(
            question
                ? {
                    id:
                        question.id ?? null,

                    primaryNode:
                        question.primaryNode ?? null,

                    nodes:
                        question.nodes ?? null,

                    secondaryNodes:
                        question.secondaryNodes ?? null,

                    evidence:
                        question.evidence ?? null,

                    difficulty:
                        question.difficulty ?? null,

                    questionType:
                        question.questionType ?? null,

                    mode:
                        question.mode ?? null,

                    contextId:
                        question.contextId ??
                        question
                            ?.content
                            ?.contextId ??
                        null
                }
                : null,
            null,
            2
        )
    );


    /**
     * Selection-only trace.
     *
     * This happens before submitAnswer().
     */

    if (!attempt) {

        console.log(
            "\n[4] ATTEMPT\n<not submitted yet>"
        );

        console.log(
            "\n──────────────── TRACE END ────────────────"
        );

        return;
    }


    /**
     * --------------------------------------------------------
     * 4. CANONICAL ATTEMPT
     * --------------------------------------------------------
     */

    console.log("\n[4] CANONICAL ATTEMPT");

    console.log(
        JSON.stringify(
            {
                attemptId:
                    attempt.attemptId ?? null,

                questionId:
                    attempt.questionId ?? null,

                result:
                    attempt.result ?? null,

                score:
                    attempt.score ?? null,

                attemptNumber:
                    attempt.attemptNumber ?? null,

                context:
                    attempt.context ?? null,

                evidence:
                    attempt.evidence ?? null,

                diagnostic:
                    attempt.diagnostic ?? null,

                hint:
                    attempt.hint ?? null
            },
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 5. RAW MASTERY UPDATE
     * --------------------------------------------------------
     */

    console.log("\n[5] MASTERY UPDATE");

    const mastery =
        flowResult?.masteryUpdate;


    console.log(
        JSON.stringify(
            mastery
                ? {
                    nodeId:
                        mastery.nodeId ?? null,

                    previous:
                        mastery.previous ?? null,

                    current:
                        mastery.current ?? null,

                    update:
                        mastery.update ?? null,

                    evidence:
                        mastery.evidence ?? null,

                    confidence:
                        mastery.confidence ?? null,

                    weakness:
                        mastery.weakness ?? null,

                    failure:
                        mastery.failure ?? null,

                    decision:
                        mastery.decision ??
                        mastery.masteryDecision ??
                        null
                }
                : null,
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 6. LEARNINGFLOW PROJECTION
     * --------------------------------------------------------
     */

    console.log("\n[6] LEARNINGFLOW PROJECTION");

    console.log(
        JSON.stringify(
            {
                targetNodeId:
                    flowResult?.targetNodeId ?? null,

                nodeState:
                    flowResult
                        ?.projection
                        ?.nodeState ??
                    null
            },
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 7. NEXT ADAPTIVE DECISION
     * --------------------------------------------------------
     */

    console.log("\n[7] NEXT ADAPTIVE DECISION");

    console.log(
        JSON.stringify(
            nextDecision
                ? {
                    decisionId:
                        nextDecision.decisionId ?? null,

                    action:
                        nextDecision.action ?? null,

                    target:
                        nextDecision.target ?? null,

                    selectionCriteria:
                        nextDecision.selectionCriteria ?? null,

                    constraints:
                        nextDecision.constraints ?? null,

                    path:
                        nextDecision.path ?? null,

                    fallback:
                        nextDecision.fallback ?? null,

                    reason:
                        nextDecision.reason ?? null,

                    reasonCodes:
                        nextDecision.reasonCodes ?? null
                }
                : null,
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 8. COMMITTED STUDENT STATE
     * --------------------------------------------------------
     */

    console.log("\n[8] COMMITTED STUDENT STATE — K283");

    const nodeState =
        session
            ?.state
            ?.knowledge
        ?.[TARGET_NODE_ID] ??
        null;


    console.log(
        JSON.stringify(
            nodeState,
            null,
            2
        )
    );


    /**
     * --------------------------------------------------------
     * 9. RUNTIME HISTORY
     * --------------------------------------------------------
     */

    console.log("\n[9] STUDY SESSION HISTORY");

    console.log(
        JSON.stringify(
            session?.history ?? [],
            null,
            2
        )
    );


    console.log(
        "\n──────────────── TRACE END ────────────────"
    );
}

// DRAFT: one-turn persistent trial. No automatic recovery or second-turn continuation.
function buildContentRefs() {
    const refs = {};
    for (const [name, relative] of Object.entries(PATHS)) {
        if (name === "studentState") continue;
        const bytes = fs.readFileSync(resolveProjectPath(relative));
        refs[name] = { id: relative, version: "cli-k283-v1", sha256: createHash("sha256").update(bytes).digest("hex") };
    }
    return refs;
}
function createPersistentSession(initialSession, excludedQuestionIds = []) {
    const root = path.resolve(__dirname, ".k283-persistent-draft");
    const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, "attempts") });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, "journal"), attemptStore });
    const durableCommit = createDurableSessionCommitV1({ rootDir: path.join(root, "checkpoints"), attemptStore, journal });
    const authority = createLiveSessionRevisionAuthority({ initialSession, sessionId: SESSION_ID });
    const coordination = createAtomicCaptureCoordinationV1({
        rootDir: path.join(root, "coordination"),
        publisher: { publish() { throw new Error("PUBLICATION_DISABLED"); } },
        capture() { throw new Error("CAPTURE_DISABLED"); }
    });
    return createK283PersistentMultiTurnCoordinatorV1({
        sessionId: SESSION_ID, authority, coordination, attemptStore, journal, durableCommit,
        contentRefs: buildContentRefs(),
        select: ({ session, now }) => {
            const excluded = typeof excludedQuestionIds === "function"
                ? excludedQuestionIds()
                : (Array.isArray(excludedQuestionIds) ? excludedQuestionIds : []);
            const sessionWithExclusions = applyK283SelectionExclusions(session, excluded);
            return selectK283NextQuestion({ session: sessionWithExclusions, now });
        },
        submit: submitAnswer, now: nowIso
    });
}

/**
 * ============================================================
 * MAIN LIVE LOOP
 * ============================================================
 */

async function main() {
    const targetMastery = process.env.K283_TARGET_MASTERY ?? 'M2';
    if (!MASTERY_LEVELS.includes(targetMastery)) {
        console.error('Invalid K283_TARGET_MASTERY (expected M0-M4).');
        process.exitCode = 1;
        return;
    }
    console.log(`\nK283 session target: ${targetMastery}`);


    const rl =
        readline.createInterface({
            input,
            output
        });


    let session;
    let restoredGenerationStop;
    let restoredPolicyErrorStop;
    let persistent;
    let priorQuestionIds = [];


    try {

        const policyPath = process.env.K283_PROBE_AUTHORING_POLICY;
        let probeAuthoringPolicy = null;
        if (policyPath) {
            try {
                probeAuthoringPolicy = readJson(policyPath);
            } catch (error) {
                throw new K283ProbePolicyConfigurationError(
                    "POLICY_FILE_INVALID",
                    `Unable to load K283 probe authoring policy: ${error.message}`,
                    { cause: error }
                );
            }
        }
        const previousProgress = process.env.K283_CONTINUE_PROGRESS === '1'
            ? findLatestVerifiedK283Progress({
                rootDir: path.resolve(__dirname, '.k283-persistent-draft'),
                contentRefs: buildContentRefs()
            })
            : null;
        const runtime = createRuntimeSession(previousProgress, probeAuthoringPolicy);
        session = runtime.session;
        restoredGenerationStop = runtime.remediationGenerationStop;
        restoredPolicyErrorStop = runtime.remediationPolicyErrorStop;
        if (previousProgress) {
            session.masteryRuntime.evidenceHistoryByNode = structuredClone(previousProgress.evidenceHistoryByNode);
            priorQuestionIds = getPreviouslyObservedK283QuestionIds(previousProgress.evidenceHistoryByNode);
            session = applyK283InitialExclusions(session, priorQuestionIds);
            console.log(`Cross-session exclusion: ${priorQuestionIds.length} previously observed question IDs.`);
            console.log(`\nNEW SESSION using verified progress from ${previousProgress.fromSessionId}.`);
            console.log('This is progress continuation, NOT recovery of the old session.');
        }
        if (restoredGenerationStop?.status === "PROBE_GENERATION_INFEASIBLE") {
            console.log(
                `\nPROBE_GENERATION_INFEASIBLE: ${restoredGenerationStop.reasonCode} ` +
                `(trigger ${restoredGenerationStop.stop.triggerAttemptId}); ` +
                "the stored trigger will not be replayed."
            );
        } else if (restoredGenerationStop?.status === "RETRY_ELIGIBLE") {
            console.log(
                "\nRETRY_ELIGIBLE: remediation constraints changed since the stored stop; " +
                "no automatic retry will occur."
            );
        }
        if (restoredPolicyErrorStop?.status === "POLICY_ERROR") {
            console.log(
                `\nPOLICY_ERROR: ${restoredPolicyErrorStop.reasonCode} ` +
                `(trigger ${restoredPolicyErrorStop.stop.triggerAttemptId}); ` +
                "the stored trigger will not be replayed and selection is suppressed."
            );
        } else if (restoredPolicyErrorStop?.status === "RETRY_ELIGIBLE") {
            console.log(
                "\nRETRY_ELIGIBLE: policy or configuration changed since the stored policy error; " +
                "no automatic retry will occur."
            );
        }
        persistent = createPersistentSession(session, priorQuestionIds);

    } catch (error) {

        console.error(
            "\nFailed to create StudySession."
        );

        console.error(
            error.stack ??
            error.message
        );

        rl.close();

        process.exitCode =
            1;

        return;
    }


    printHeader();


    let questionNumber =
        0;
    let remediationTrigger = null;


    try {

        while (true) {
            const entryDecision =
                structuredClone(
                    session.currentDecision
                );

            /**
             * ------------------------------------------------
             * Ask the REAL QuestionSelector for next question.
             * ------------------------------------------------
             */

            const next = persistent.selectNext();


            session =
                next.session;


            /**
             * ------------------------------------------------
             * Selector did not return a question.
             * ------------------------------------------------
             */

            if (
                next.selection
                    ?.status !==
                "SELECTED"
            ) {
                printRuntimeTrace({

                    turn:
                        questionNumber + 1,

                    entryDecision,

                    selection:
                        next.selection,

                    question:
                        next.question,

                    session
                });

                console.log(
                    "\n" +
                    line()
                );

                console.log(
                    "NO QUESTION SELECTED"
                );

                console.log(
                    line()
                );

                console.log(
                    `Selector status: ${next.selection
                        ?.status ??
                    "UNKNOWN"
                    }`
                );


                if (
                    next.selection
                        ?.reason
                ) {

                    console.log(
                        `Reason: ${typeof next
                            .selection
                            .reason ===
                            "string"
                            ? next
                                .selection
                                .reason
                            : JSON.stringify(
                                next
                                    .selection
                                    .reason,
                                null,
                                2
                            )
                        }`
                    );
                }


                console.log(
                    `Adaptive action: ${session
                        ?.currentDecision
                        ?.action ??
                    "-"
                    }`
                );


                printStatus(
                    session
                );


                /**
                 * IMPORTANT:
                 *
                 * We stop here.
                 *
                 * The CLI MUST NOT invent fallback behavior
                 * because QuestionSelector owns NO_MATCH /
                 * NOT_REQUIRED semantics.
                 */

                console.log(
                    "\nSession stopped without inventing a fallback."
                );

                break;
            }


            const question =
                next.question;

            // Fail closed before any submit: a repeated question cannot produce new independent evidence.
            assertK283QuestionNotPreviouslyObserved(question.id, priorQuestionIds);


            questionNumber +=
                1;


            printQuestion({

                question,

                decision:
                    session.currentDecision,

                questionNumber
            });


            const startedAt =
                nowIso();


            /**
             * ------------------------------------------------
             * Wait until user submits an answer.
             * ------------------------------------------------
             */

            let submitted =
                false;


            while (!submitted) {

                const raw =
                    await rl.question(
                        "\nYour answer > "
                    );


                const command =
                    normalizeCommand(
                        raw
                    );


                const lower =
                    command
                        .toLowerCase();


                /**
                 * QUIT
                 */

                if (
                    lower === "quit" ||
                    lower === "q" ||
                    lower === "exit"
                ) {

                    console.log(
                        "\nStudy session ended."
                    );

                    printStatus(
                        session
                    );

                    return;
                }


                /**
                 * HELP
                 */

                if (
                    lower === "help"
                ) {

                    printHelp();

                    continue;
                }


                /**
                 * STATUS
                 */

                if (
                    lower === "status"
                ) {

                    printStatus(
                        session
                    );

                    continue;
                }


                /**
                 * DECISION
                 */

                if (
                    lower ===
                    "decision"
                ) {

                    printDecision(
                        session
                    );

                    continue;
                }


                /**
                 * FULL STATE
                 */

                if (
                    lower === "state"
                ) {

                    console.log(
                        JSON.stringify(
                            getStudentState(
                                session
                            ),
                            null,
                            2
                        )
                    );

                    continue;
                }


                /**
                 * ANSWER
                 */

                const answer =
                    normalizeAnswer(
                        command,
                        question
                    );


                if (answer === null || answer === undefined) {

                    const hint =
                        question?.questionType === "numeric"
                            ? "Please enter a number (e.g. 25 or -3.5), status, state, decision, help, or quit."
                            : "Please enter A, B, C, D, status, state, decision, help, or quit.";

                    console.log(hint);

                    continue;
                }


                // This CLI permits one submission per newly selected question.
                // attemptNumber is per-question retry count, NOT the session turn.
                // The session-wide sequence is still used for unique attempt IDs.
                const attemptNumber = 1;


                let result;


                try {

                    /**
                     * ========================================
                     * REAL RUNTIME TURN
                     * ========================================
                     *
                     * AnswerEvaluator
                     *      ↓
                     * AttemptBuilder
                     *      ↓
                     * LearningFlow
                     *      ↓
                     * Mastery
                     *      ↓
                     * Adaptive
                     *      ↓
                     * optional Remediation
                     *      ↓
                     * Student State commit
                     */

                    const committed = await submitK283DiagnosticAnswer({
                        question,
                        response: answer,
                        askConfirmation: prompt => rl.question(prompt),
                        submit: ({ response, diagnostic }) => {
                            const submittedAt = nowIso();
                            return persistent.submitSelected({
                                attemptId: createAttemptId(session.attempts.length + 1),
                                args: {
                                    response, startedAt, submittedAt, attemptNumber,
                                    hint: null, timing: null, diagnostic, retry: null, feedback: null,
                                    ui: { device: "desktop", inputMethod: "keyboard" },
                                    metadata: { engineVersion: "live-study-k283-persistent-multiturn-v1" },
                                    now: submittedAt
                                }
                            });
                        }
                    });
                    if (committed.status !== "CHECKPOINT_OBSERVED") throw new Error("K283_CHECKPOINT_NOT_OBSERVED");
                    result = committed.result;

                } catch (error) {

                    console.error(
                        "\nSUBMIT FAILED"
                    );

                    console.error(
                        error.stack ??
                        error.message
                    );

                    console.error(
                        "\nCommit outcome may be unknown. Session stopped; do NOT retry or resume."
                    );

                    process.exitCode = 1;
                    return;
                }


                /**
                 * Commit the NEW immutable session returned
                 * by StudySession.
                 */

                session =
                    result.session;
                const activePlan = session.activeRemediationPlan;
                if (!activePlan) {
                    remediationTrigger = null;
                } else if (remediationTrigger?.remediationId !== activePlan.remediationId) {
                    remediationTrigger = {
                        remediationId: activePlan.remediationId,
                        question,
                        attempt: result.attempt
                    };
                }
                // Also prevent repeated evidence within this new session.
                priorQuestionIds.push(question.id);


                submitted =
                    true;

                printRuntimeTrace({

                    turn:
                        questionNumber,

                    entryDecision,

                    selection:
                        next.selection,

                    question,

                    attempt:
                        result.attempt,

                    flowResult:
                        result.flowResult,

                    nextDecision:
                        result.nextDecision,

                    session
                });
                /**
                 * ------------------------------------------------
                 * Show result.
                 * ------------------------------------------------
                 */

                printEvaluation(
                    result
                );


                displayQuestionFeedback(
                    question,
                    result.evaluation
                );


                printStatus(
                    session
                );

                const probeMessage = formatK283ProbeOutcome(result.flowResult?.probeOutcome);
                if (probeMessage) console.log(`\n${probeMessage}`);

                console.log(
                    `\nAdaptive → ${result
                        ?.nextDecision
                        ?.action ??
                    "-"
                    }`
                );


                console.log(
                    `Target   → ${result
                        ?.nextDecision
                        ?.target
                        ?.primaryNodeId ??
                    "-"
                    }`
                );


                printRemediation(
                    session,
                    remediationTrigger?.question ?? null,
                    remediationTrigger?.attempt ?? null
                );
                const completion = evaluateK283Completion({
                    nodeState: getK283State(session),
                    targetMastery,
                    checkpointObserved: true
                });
                if (completion.complete) {
                    console.log(`\nSESSION COMPLETE — K283 reached ${completion.currentMastery} (target ${targetMastery}).`);
                    console.log('Checkpoint verified. Cross-process resume is NOT yet supported.');
                    return;
                }
                console.log("\nDurable checkpoint observed. Proceeding to next question.");
            }
        }


    } catch (error) {

        console.error(
            "\nLIVE STUDY ERROR"
        );

        console.error(
            error.stack ??
            error.message
        );

        process.exitCode =
            1;

    } finally {

        rl.close();
    }
}


/**
 * ============================================================
 * START
 * ============================================================
 */

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
