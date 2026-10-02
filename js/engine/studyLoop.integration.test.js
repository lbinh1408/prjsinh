/**
 * studyLoop.integration.test.js
 *
 * Study MVP vertical-slice integration gate.
 *
 * Flow under test:
 *
 * AdaptiveDecision
 *      ↓
 * QuestionSelector V1.0.0
 *      ↓
 * Real C09 / K283 Question
 *      ↓
 * AnswerEvaluator V1.0.0
 *      ↓
 * AttemptBuilder V1.0.1
 *      ↓
 * Canonical Attempt V1.0.0
 *      ↓
 * LearningFlow V1.0.0
 *      ↓
 * Mastery → Adaptive → optional Remediation
 *      ↓
 * Next AdaptiveDecision
 *      ↓
 * QuestionSelector
 *
 * PURPOSE
 * -------
 * Verify the first complete Study MVP runtime vertical slice
 * using real project data.
 *
 * IMPORTANT
 * ---------
 * This test does NOT:
 *
 * - redefine Adaptive behavior
 * - redefine QuestionSelector ranking
 * - redefine Mastery behavior
 * - persist Student State
 * - mutate Student State
 * - execute Adaptive fallback
 * - require the next AdaptiveDecision to select a question
 *
 * LearningFlow currently returns a projection/update but does
 * not own persistence. Therefore this file tests orchestration
 * boundaries, not state persistence across sessions.
 *
 * Run:
 *
 *   node --test studyLoop.integration.test.js
 */


import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";

import {
    fileURLToPath
} from "node:url";


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
 * =========================================================
 * PATHS
 * =========================================================
 */

const __filename =
    fileURLToPath(
        import.meta.url
    );


const __dirname =
    path.dirname(
        __filename
    );


const PROJECT_ROOT =
    path.resolve(
        __dirname,
        "../.."
    );


/**
 * =========================================================
 * JSON HELPERS
 * =========================================================
 */

function loadJson(
    filePath
) {

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


function firstExistingPath(
    candidates,
    label
) {

    for (
        const candidate
        of candidates
    ) {

        const resolved =
            path.resolve(
                PROJECT_ROOT,
                candidate
            );


        if (
            fs.existsSync(
                resolved
            )
        ) {

            return resolved;
        }
    }


    throw new Error(
        [
            `Cannot locate ${label}.`,
            "",
            "Checked:",
            ...candidates.map(
                (candidate) =>
                    `- ${candidate}`
            )
        ].join("\n")
    );
}


/**
 * =========================================================
 * REAL RUNTIME FILES
 * =========================================================
 */

const KNOWLEDGE_MAP_PATH =
    firstExistingPath(
        [
            "data/knowledge/knowledge-map-v4.json",
            "knowledge-map-v4.json"
        ],
        "knowledge-map-v4.json"
    );


const MASTERY_RULES_PATH =
    firstExistingPath(
        [
            "mastery/rules.json",
            "data/mastery/rules.json",
            "data/mastery-rules.json",
            "data/rules.json"
        ],
        "mastery/rules.json"
    );


const EVIDENCE_MODEL_PATH =
    firstExistingPath(
        [
            "mastery/evidence.json",
            "data/mastery/evidence.json",
            "data/evidence.json"
        ],
        "mastery/evidence.json"
    );


const ADAPTIVE_RULES_PATH =
    firstExistingPath(
        [
            "adaptive/rules.json",
            "data/adaptive/rules.json",
            "data/adaptive-rules.json"
        ],
        "adaptive/rules.json"
    );


const ADAPTIVE_PATHS_PATH =
    firstExistingPath(
        [
            "adaptive/paths.json",
            "data/adaptive/paths.json",
            "data/adaptive-paths.json"
        ],
        "adaptive/paths.json"
    );


const FAILURE_SIGNATURES_PATH =
    firstExistingPath(
        [
            "remediation/failure-signatures.json",
            "data/remediation/failure-signatures.json",
            "data/failure-signatures.json"
        ],
        "failure-signatures.json"
    );


const QUESTION_BANK_PATH =
    firstExistingPath(
        [
            "data/questions/c09/K283.question-bank.json"
        ],
        "K283.question-bank.json"
    );


/**
 * =========================================================
 * LOAD REAL DATA
 * =========================================================
 */

const knowledgeMap =
    loadJson(
        KNOWLEDGE_MAP_PATH
    );


const masteryRules =
    loadJson(
        MASTERY_RULES_PATH
    );


const evidenceModel =
    loadJson(
        EVIDENCE_MODEL_PATH
    );


const adaptiveRules =
    loadJson(
        ADAPTIVE_RULES_PATH
    );


const adaptivePaths =
    loadJson(
        ADAPTIVE_PATHS_PATH
    );


const failureSignatures =
    loadJson(
        FAILURE_SIGNATURES_PATH
    );


/*
 * There is currently no canonical
 * remediation/rules.json.
 *
 * Do not invent one for integration testing.
 */
const remediationRules = {};


const questionBank =
    loadJson(
        QUESTION_BANK_PATH
    );


/**
 * =========================================================
 * FIXED CLOCKS
 * =========================================================
 */

const SELECTOR_NOW_1 =
    "2026-10-01T07:00:00.000Z";


const ATTEMPT_STARTED_AT =
    "2026-10-01T07:01:00.000Z";


const ATTEMPT_SUBMITTED_AT =
    "2026-10-01T07:01:30.000Z";


const FLOW_NOW =
    "2026-10-01T07:02:00.000Z";


const SELECTOR_NOW_2 =
    "2026-10-01T07:03:00.000Z";


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const STUDENT_ID =
    "STUDENT-STUDY-LOOP";


const SESSION_ID =
    "SESSION-STUDY-LOOP";


const CLUSTER_ID =
    "C09";


const TARGET_NODE_ID =
    "K283";


const PRIMARY_ACTIONS =
    Object.freeze([
        "LEARN",
        "PRACTICE",
        "CHALLENGE",
        "REMEDIATE",
        "RETEST",
        "REVIEW",
        "SKIP"
    ]);


/**
 * =========================================================
 * QUESTION HELPERS
 * =========================================================
 */

function getQuestions() {

    assert.ok(
        Array.isArray(
            questionBank.questions
        ),
        "K283 bank must contain questions[]."
    );


    assert.ok(
        questionBank.questions.length > 0,
        "K283 bank must not be empty."
    );


    return questionBank.questions;
}


function getCorrectOptionId(
    question
) {

    assert.equal(
        question.questionType,
        "mcq"
    );


    assert.equal(
        question.answer?.type,
        "single"
    );


    assert.equal(
        typeof question.answer?.value,
        "string"
    );


    return question.answer.value;
}


/**
 * =========================================================
 * STUDENT STATE
 * =========================================================
 */

function createStudentState(
    overrides = {}
) {

    const base = {

        studentId:
            STUDENT_ID,

        knowledge: {},

        learning: {
            mode:
                "HOC_SAU"
        },

        preferences: {},

        progress: {}
    };


    return {
        ...base,
        ...overrides
    };
}


/**
 * =========================================================
 * INITIAL ADAPTIVE DECISION
 * =========================================================
 *
 * This is an orchestration fixture.
 *
 * It does NOT replace AdaptiveEngine.
 *
 * Its only purpose is to provide a canonical Adaptive-shaped
 * input to QuestionSelector so that the vertical slice can
 * begin at:
 *
 * AdaptiveDecision → QuestionSelector
 */

function createInitialDecision() {

    return {

        decisionId:
            "DECISION-STUDY-ENTRY",

        action:
            "PRACTICE",

        target: {

            primaryNodeId:
                "K283",

            nodeIds:
                [
                    "K283"
                ]
        },

        selectionCriteria: {

            questionTypes:
                [
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
 * =========================================================
 * ATTEMPT FACTORY
 * =========================================================
 */

function createAttemptFromSelectedQuestion({
    selection,
    response = undefined,
    attemptId =
    "ATTEMPT-STUDY-LOOP-001"
}) {

    assert.equal(
        selection.status,
        "SELECTED"
    );


    assert.ok(
        selection.selected
    );


    assert.ok(
        selection.selected.question
    );


    const question =
        selection.selected.question;


    const actualResponse =
        response !== undefined
            ? response
            : getCorrectOptionId(
                question
            );


    const evaluation =
        evaluateAnswer({
            question,
            response:
                actualResponse
        });


    const attempt =
        buildAttempt({

            attemptId,

            studentId:
                STUDENT_ID,

            sessionId:
                SESSION_ID,

            question,

            evaluation,

            startedAt:
                ATTEMPT_STARTED_AT,

            submittedAt:
                ATTEMPT_SUBMITTED_AT,

            attemptNumber:
                1,

            context: {

                learningMode:
                    "HOC_SAU",

                action:
                    selection.action,

                pathStage:
                    selection.action,

                clusterId:
                    CLUSTER_ID,

                decisionId:
                    selection.decisionId
            },

            metadata: {

                engineVersion:
                    "study-loop-integration"
            }
        });


    return {
        question,
        evaluation,
        attempt
    };
}


/**
 * =========================================================
 * LEARNING FLOW
 * =========================================================
 */

function runLearningFlow({
    attempt,
    studentState =
    createStudentState(),

    recentResults = [],

    sessionContext = {},

    learningMode =
    "HOC_SAU",

    timeBudget = null
}) {

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

        sessionContext,

        learningMode,

        timeBudget,

        now:
            FLOW_NOW
    });
}


/**
 * =========================================================
 * HISTORY PROJECTION
 * =========================================================
 *
 * QuestionSelector accepts Attempt-like history records.
 *
 * Canonical Attempt already contains:
 *
 * - questionId
 * - context.nodeId
 *
 * so no new history contract is invented here.
 */

function createSelectorHistory(
    attempt
) {

    return [
        structuredClone(
            attempt
        )
    ];
}


/**
 * =========================================================
 * GENERIC ASSERTIONS
 * =========================================================
 */

function assertCanonicalAdaptiveAction(
    action
) {

    assert.ok(
        PRIMARY_ACTIONS.includes(
            action
        ),
        `Unexpected Adaptive action '${action}'.`
    );
}


function assertSelectedQuestion(
    selection
) {

    assert.equal(
        selection.status,
        "SELECTED"
    );


    assert.ok(
        selection.selected &&
        typeof selection.selected ===
        "object"
    );


    assert.equal(
        typeof selection.selected.questionId,
        "string"
    );


    assert.ok(
        selection.selected.question &&
        typeof selection.selected.question ===
        "object"
    );


    assert.equal(
        selection.selected.question.id,
        selection.selected.questionId
    );


    assert.equal(
        selection.targetNodeId,
        TARGET_NODE_ID
    );


    assert.equal(
        selection.selected.question.primaryNode,
        TARGET_NODE_ID
    );
}


/**
 * =========================================================
 * 1. REAL DATA
 * =========================================================
 */

test(
    "1. loads real Study MVP runtime data",
    () => {

        assert.ok(
            knowledgeMap &&
            typeof knowledgeMap ===
            "object"
        );


        assert.ok(
            masteryRules &&
            typeof masteryRules ===
            "object"
        );


        assert.ok(
            evidenceModel &&
            typeof evidenceModel ===
            "object"
        );


        assert.ok(
            adaptiveRules &&
            typeof adaptiveRules ===
            "object"
        );


        assert.ok(
            adaptivePaths &&
            typeof adaptivePaths ===
            "object"
        );


        assert.ok(
            failureSignatures &&
            typeof failureSignatures ===
            "object"
        );


        assert.ok(
            Array.isArray(
                questionBank.questions
            )
        );


        assert.ok(
            questionBank.questions.length > 0
        );
    }
);


/**
 * =========================================================
 * 2. INITIAL ADAPTIVE → QUESTION SELECTOR
 * =========================================================
 */

test(
    "2. initial AdaptiveDecision selects a real K283 question",
    () => {

        const decision =
            createInitialAdaptiveDecision();


        const selection =
            selectQuestion({

                adaptiveDecision:
                    decision,

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        assertSelectedQuestion(
            selection
        );


        assert.equal(
            selection.action,
            "PRACTICE"
        );


        assert.equal(
            selection.decisionId,
            decision.decisionId
        );


        assert.equal(
            selection.reason?.code,
            "QUESTION_SELECTED"
        );
    }
);


/**
 * =========================================================
 * 3. SELECTOR DOES NOT MUTATE BANK
 * =========================================================
 */

test(
    "3. QuestionSelector does not mutate real question bank",
    () => {

        const before =
            structuredClone(
                questionBank
            );


        selectQuestion({

            adaptiveDecision:
                createInitialAdaptiveDecision(),

            questionBanks:
                questionBank,

            history: [],

            now:
                SELECTOR_NOW_1
        });


        assert.deepEqual(
            questionBank,
            before
        );
    }
);


/**
 * =========================================================
 * 4. SELECTED QUESTION IS CLONED
 * =========================================================
 */

test(
    "4. selected question is not the source-bank object",
    () => {

        const selection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        assertSelectedQuestion(
            selection
        );


        const sourceQuestion =
            getQuestions().find(
                (question) =>
                    question.id ===
                    selection.selected.questionId
            );


        assert.ok(
            sourceQuestion
        );


        assert.notEqual(
            selection.selected.question,
            sourceQuestion
        );


        assert.deepEqual(
            selection.selected.question,
            sourceQuestion
        );
    }
);


/**
 * =========================================================
 * 5. QUESTION → ANSWER EVALUATOR
 * =========================================================
 */

test(
    "5. selected real question reaches AnswerEvaluator",
    () => {

        const selection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const question =
            selection.selected.question;


        const evaluation =
            evaluateAnswer({

                question,

                response:
                    getCorrectOptionId(
                        question
                    )
            });


        assert.equal(
            evaluation.questionId,
            question.id
        );


        assert.equal(
            evaluation.result,
            "correct"
        );


        assert.equal(
            evaluation.correct,
            true
        );


        assert.equal(
            evaluation.score.normalized,
            1
        );
    }
);


/**
 * =========================================================
 * 6. SELECTION → ATTEMPT
 * =========================================================
 */

test(
    "6. selected question becomes canonical Attempt",
    () => {

        const selection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            question,
            evaluation,
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection
            });


        assert.equal(
            evaluation.result,
            "correct"
        );


        assert.equal(
            attempt.questionId,
            question.id
        );


        assert.equal(
            attempt.result,
            "correct"
        );


        assert.equal(
            attempt.context.nodeId,
            TARGET_NODE_ID
        );


        assert.equal(
            attempt.context.action,
            "PRACTICE"
        );


        assert.equal(
            attempt.context.pathStage,
            "PRACTICE"
        );


        assert.equal(
            attempt.context.decisionId,
            selection.decisionId
        );


        assert.equal(
            attempt.evidence.primaryDimension,
            question.evidence
        );


        assert.equal(
            attempt.evidence.difficulty,
            question.difficulty
        );
    }
);


/**
 * =========================================================
 * 7. ATTEMPT → LEARNING FLOW
 * =========================================================
 */

test(
    "7. canonical Attempt reaches LearningFlow",
    () => {

        const selection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection
            });


        const result =
            runLearningFlow({
                attempt
            });


        assert.equal(
            result.flow?.name,
            "LearningFlow"
        );


        assert.equal(
            result.flow?.version,
            "1.0.0"
        );


        assert.equal(
            result.studentId,
            STUDENT_ID
        );


        assert.equal(
            result.targetNodeId,
            TARGET_NODE_ID
        );


        assert.equal(
            result.attempt?.attemptId,
            attempt.attemptId
        );


        assert.equal(
            result.masteryUpdate?.attemptId,
            attempt.attemptId
        );


        assert.equal(
            result.masteryUpdate?.nodeId,
            TARGET_NODE_ID
        );


        assert.ok(
            result.adaptiveDecision
        );


        assertCanonicalAdaptiveAction(
            result.adaptiveDecision.action
        );
    }
);


/**
 * =========================================================
 * 8. FULL FIRST VERTICAL SLICE
 * =========================================================
 */

test(
    "8. Adaptive → Selector → Evaluator → Attempt → LearningFlow passes",
    () => {

        const initialDecision =
            createInitialAdaptiveDecision();


        const selection =
            selectQuestion({

                adaptiveDecision:
                    initialDecision,

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        assertSelectedQuestion(
            selection
        );


        const {
            question,
            evaluation,
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection
            });


        assert.equal(
            question.id,
            selection.selected.questionId
        );


        assert.equal(
            evaluation.questionId,
            question.id
        );


        assert.equal(
            attempt.questionId,
            question.id
        );


        const result =
            runLearningFlow({
                attempt
            });


        assert.equal(
            result.targetNodeId,
            question.primaryNode
        );


        assert.equal(
            result.masteryUpdate.nodeId,
            question.primaryNode
        );


        assertCanonicalAdaptiveAction(
            result.adaptiveDecision.action
        );


        assert.equal(
            result.outcome.action,
            result.adaptiveDecision.action
        );
    }
);


/**
 * =========================================================
 * 9. NO HIDDEN MUTATION
 * =========================================================
 */

test(
    "9. complete first slice does not mutate bank, state, or Attempt",
    () => {

        const bankBefore =
            structuredClone(
                questionBank
            );


        const studentState =
            createStudentState();


        const stateBefore =
            structuredClone(
                studentState
            );


        const selection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection
            });


        const attemptBefore =
            structuredClone(
                attempt
            );


        runLearningFlow({
            attempt,
            studentState
        });


        assert.deepEqual(
            questionBank,
            bankBefore,
            "Question bank mutated."
        );


        assert.deepEqual(
            studentState,
            stateBefore,
            "Student State mutated."
        );


        assert.deepEqual(
            attempt,
            attemptBefore,
            "Attempt mutated."
        );
    }
);


/**
 * =========================================================
 * 10. NEXT ADAPTIVE DECISION → SELECTOR
 * =========================================================
 *
 * Important:
 *
 * The next AdaptiveDecision is produced by the REAL
 * LearningFlow / AdaptiveEngine.
 *
 * QuestionSelector must accept that decision without a
 * translation layer.
 *
 * SELECTED, NO_MATCH and NOT_REQUIRED are all legitimate
 * selector outcomes.
 */

test(
    "10. next real AdaptiveDecision is directly consumable by QuestionSelector",
    () => {

        const firstSelection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection:
                    firstSelection
            });


        const flowResult =
            runLearningFlow({
                attempt
            });


        const nextDecision =
            flowResult.adaptiveDecision;


        assert.ok(
            nextDecision &&
            typeof nextDecision ===
            "object"
        );


        assertCanonicalAdaptiveAction(
            nextDecision.action
        );


        const history =
            createSelectorHistory(
                attempt
            );


        const nextSelection =
            selectQuestion({

                adaptiveDecision:
                    nextDecision,

                questionBanks:
                    questionBank,

                history,

                now:
                    SELECTOR_NOW_2
            });


        assert.ok(
            [
                "SELECTED",
                "NO_MATCH",
                "NOT_REQUIRED"
            ].includes(
                nextSelection.status
            ),
            `Unexpected selector status '${nextSelection.status}'.`
        );


        assert.equal(
            nextSelection.decisionId,
            nextDecision.decisionId
        );


        assert.equal(
            nextSelection.action,
            nextDecision.action
        );
    }
);


/**
 * =========================================================
 * 11. HISTORY IS NOT MUTATED
 * =========================================================
 */

test(
    "11. next-question selection does not mutate Attempt history",
    () => {

        const firstSelection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection:
                    firstSelection
            });


        const flowResult =
            runLearningFlow({
                attempt
            });


        const history =
            createSelectorHistory(
                attempt
            );


        const before =
            structuredClone(
                history
            );


        selectQuestion({

            adaptiveDecision:
                flowResult.adaptiveDecision,

            questionBanks:
                questionBank,

            history,

            now:
                SELECTOR_NOW_2
        });


        assert.deepEqual(
            history,
            before
        );
    }
);


/**
 * =========================================================
 * 12. SELECTED NEXT QUESTION, WHEN AVAILABLE
 * =========================================================
 */

test(
    "12. next selected question remains a real directly measured target question",
    () => {

        const firstSelection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection:
                    firstSelection
            });


        const flowResult =
            runLearningFlow({
                attempt
            });


        const nextSelection =
            selectQuestion({

                adaptiveDecision:
                    flowResult.adaptiveDecision,

                questionBanks:
                    questionBank,

                history:
                    createSelectorHistory(
                        attempt
                    ),

                now:
                    SELECTOR_NOW_2
            });


        /*
         * Adaptive may legitimately decide SKIP, or its criteria
         * may have no matching question in the currently loaded
         * K283 bank.
         *
         * QuestionSelector owns neither fallback execution nor
         * Adaptive policy, so those outcomes are not failures.
         */

        if (
            nextSelection.status !==
            "SELECTED"
        ) {

            assert.equal(
                nextSelection.selected,
                null
            );


            assert.ok(
                [
                    "NO_MATCH",
                    "NOT_REQUIRED"
                ].includes(
                    nextSelection.status
                )
            );


            return;
        }


        const selected =
            nextSelection.selected.question;


        assert.ok(
            selected
        );


        assert.equal(
            selected.id,
            nextSelection.selected.questionId
        );


        assert.equal(
            selected.primaryNode,
            nextSelection.targetNodeId
        );


        assert.ok(
            selected.nodes.includes(
                nextSelection.targetNodeId
            )
        );


        const sourceQuestion =
            getQuestions().find(
                (question) =>
                    question.id ===
                    selected.id
            );


        assert.ok(
            sourceQuestion,
            "Next selected question must come from the real K283 bank."
        );


        assert.deepEqual(
            selected,
            sourceQuestion
        );
    }
);


/**
 * =========================================================
 * 13. NEXT SELECTED QUESTION CAN ENTER EVALUATOR
 * =========================================================
 */

test(
    "13. next selected question can continue into AnswerEvaluator",
    () => {

        const firstSelection =
            selectQuestion({

                adaptiveDecision:
                    createInitialAdaptiveDecision(),

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        const {
            attempt
        } =
            createAttemptFromSelectedQuestion({
                selection:
                    firstSelection
            });


        const flowResult =
            runLearningFlow({
                attempt
            });


        const nextSelection =
            selectQuestion({

                adaptiveDecision:
                    flowResult.adaptiveDecision,

                questionBanks:
                    questionBank,

                history:
                    createSelectorHistory(
                        attempt
                    ),

                now:
                    SELECTOR_NOW_2
            });


        /*
         * No question means the runtime correctly stopped at
         * Selector. Do not execute Adaptive fallback here.
         */
        if (
            nextSelection.status !==
            "SELECTED"
        ) {

            assert.equal(
                nextSelection.selected,
                null
            );

            return;
        }


        const question =
            nextSelection.selected.question;


        const evaluation =
            evaluateAnswer({

                question,

                response:
                    getCorrectOptionId(
                        question
                    )
            });


        assert.equal(
            evaluation.questionId,
            question.id
        );


        assert.equal(
            evaluation.result,
            "correct"
        );


        assert.equal(
            evaluation.score.normalized,
            1
        );
    }
);


/**
 * =========================================================
 * 14. COMPLETE STUDY MVP RUNTIME GATE
 * =========================================================
 */

test(
    "14. complete Study MVP runtime vertical slice passes",
    () => {

        /*
         * STEP 1
         * AdaptiveDecision
         */

        const decision1 =
            createInitialAdaptiveDecision();


        assert.equal(
            decision1.action,
            "PRACTICE"
        );


        /*
         * STEP 2
         * AdaptiveDecision → QuestionSelector
         */

        const selection1 =
            selectQuestion({

                adaptiveDecision:
                    decision1,

                questionBanks:
                    questionBank,

                history: [],

                now:
                    SELECTOR_NOW_1
            });


        assertSelectedQuestion(
            selection1
        );


        /*
         * STEP 3
         * Question → AnswerEvaluator → AttemptBuilder
         */

        const {
            question,
            evaluation,
            attempt
        } =
            createAttemptFromSelectedQuestion({

                selection:
                    selection1,

                attemptId:
                    "ATTEMPT-STUDY-LOOP-GATE"
            });


        assert.equal(
            question.id,
            selection1.selected.questionId
        );


        assert.equal(
            evaluation.result,
            "correct"
        );


        assert.equal(
            attempt.result,
            "correct"
        );


        assert.equal(
            attempt.context.nodeId,
            TARGET_NODE_ID
        );


        /*
         * STEP 4
         * Attempt → LearningFlow
         */

        const flowResult =
            runLearningFlow({
                attempt
            });


        assert.equal(
            flowResult.masteryUpdate
                .attemptId,
            attempt.attemptId
        );


        assert.equal(
            flowResult.masteryUpdate
                .nodeId,
            TARGET_NODE_ID
        );


        /*
         * STEP 5
         * LearningFlow → real next AdaptiveDecision
         */

        const decision2 =
            flowResult.adaptiveDecision;


        assert.ok(
            decision2
        );


        assertCanonicalAdaptiveAction(
            decision2.action
        );


        /*
         * STEP 6
         * real next AdaptiveDecision → QuestionSelector
         */

        const history =
            createSelectorHistory(
                attempt
            );


        const selection2 =
            selectQuestion({

                adaptiveDecision:
                    decision2,

                questionBanks:
                    questionBank,

                history,

                now:
                    SELECTOR_NOW_2
            });


        assert.ok(
            [
                "SELECTED",
                "NO_MATCH",
                "NOT_REQUIRED"
            ].includes(
                selection2.status
            )
        );


        assert.equal(
            selection2.decisionId,
            decision2.decisionId
        );


        assert.equal(
            selection2.action,
            decision2.action
        );


        /*
         * STEP 7
         * If Adaptive + Selector provide another question,
         * prove that the loop can continue into evaluation.
         */

        if (
            selection2.status ===
            "SELECTED"
        ) {

            const question2 =
                selection2.selected.question;


            const evaluation2 =
                evaluateAnswer({

                    question:
                        question2,

                    response:
                        getCorrectOptionId(
                            question2
                        )
                });


            assert.equal(
                evaluation2.questionId,
                question2.id
            );


            assert.equal(
                evaluation2.result,
                "correct"
            );
        }
    }
);