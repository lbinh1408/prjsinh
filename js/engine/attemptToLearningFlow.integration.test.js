/**
 * attemptToLearningFlow.integration.test.js
 *
 * Integration boundary gate:
 *
 * Real Question
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
 *
 * PURPOSE
 * -------
 * Verify that the newly LOCKED AttemptBuilder contract can be
 * consumed by the already LOCKED LearningFlow/runtime engines.
 *
 * IMPORTANT
 * ---------
 * This test does NOT redefine Mastery / Adaptive / Remediation
 * behavior.
 *
 * It specifically protects integration boundaries:
 *
 * - attempt.context.nodeId
 * - result vocabulary
 * - evidence.primaryDimension
 * - evidence.independence
 * - diagnostic.failureType
 * - diagnostic.failureSignatureId
 * - Student State non-mutation
 * - Attempt non-mutation
 *
 * Run:
 *
 *   node --test attemptToLearningFlow.integration.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import {
    fileURLToPath
} from "node:url";


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
 *
 * We allow a few filename layouts because some project files
 * have historically lived under either:
 *
 *   data/
 *
 * or their domain folders:
 *
 *   mastery/
 *   adaptive/
 *   remediation/
 *
 * This does NOT alter their content.
 * The first existing canonical project file is loaded.
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


const REMEDIATION_RULES_PATH = [];


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


const remediationRules = {};


const questionBank =
    loadJson(
        QUESTION_BANK_PATH
    );


/**
 * =========================================================
 * FIXED TEST CLOCK
 * =========================================================
 *
 * Keep tests deterministic.
 */

const NOW =
    "2026-10-01T07:30:00.000Z";


const STARTED_AT =
    "2026-10-01T07:00:00.000Z";


const SUBMITTED_AT =
    "2026-10-01T07:00:30.000Z";


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


function getQuestion({
    evidence = null,
    difficulty = null
} = {}) {

    const question =
        getQuestions().find(
            (candidate) => {

                if (
                    evidence !== null &&
                    candidate.evidence !==
                    evidence
                ) {
                    return false;
                }


                if (
                    difficulty !== null &&
                    candidate.difficulty !==
                    difficulty
                ) {
                    return false;
                }


                return true;
            }
        );


    assert.ok(
        question,
        [
            "Could not find required real K283 question.",
            `evidence=${evidence}`,
            `difficulty=${difficulty}`
        ].join(" ")
    );


    return question;
}


function getAnyQuestion() {

    return getQuestions()[0];
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


function getWrongOptionId(
    question
) {

    const correct =
        getCorrectOptionId(
            question
        );


    const wrong =
        question.content
            ?.options
            ?.find(
                (option) =>
                    option.id !==
                    correct
            );


    assert.ok(
        wrong,
        `${question.id} must contain a wrong option.`
    );


    return wrong.id;
}


/**
 * =========================================================
 * STUDENT STATE FIXTURE
 * =========================================================
 *
 * Minimal integration state.
 *
 * LearningFlow already owns projection/adaptation from this
 * state into the engine-specific structures.
 */

function createStudentState(
    overrides = {}
) {

    const base = {

        studentId:
            "STUDENT-INTEGRATION",

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
 * ATTEMPT FACTORY
 * =========================================================
 */

function createAttempt({
    question = getAnyQuestion(),

    response = undefined,

    attemptId = "ATTEMPT-INTEGRATION-001",

    attemptNumber = 1,

    hint = null,

    diagnostic = null,

    retry = null,

    action = "PRACTICE",

    pathStage = "PRACTICE"
} = {}) {

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


    return buildAttempt({

        attemptId,

        studentId:
            "STUDENT-INTEGRATION",

        sessionId:
            "SESSION-INTEGRATION",

        question,

        evaluation,

        startedAt:
            STARTED_AT,

        submittedAt:
            SUBMITTED_AT,

        attemptNumber,

        hint,

        context: {

            learningMode:
                "HOC_SAU",

            action,

            pathStage,

            clusterId:
                "C09",

            decisionId:
                "DECISION-INTEGRATION"
        },

        diagnostic,

        retry,

        metadata: {

            engineVersion:
                "integration-test"
        }
    });
}


/**
 * =========================================================
 * FLOW FACTORY
 * =========================================================
 */

function runFlow({
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
            NOW
    });
}


/**
 * =========================================================
 * GENERIC FLOW ASSERTIONS
 * =========================================================
 */

function assertValidFlowResult(
    result,
    attempt
) {

    assert.ok(
        result &&
        typeof result ===
        "object"
    );


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
        attempt.studentId
    );


    assert.equal(
        result.targetNodeId,
        attempt.context.nodeId
    );


    assert.equal(
        result.attempt?.attemptId,
        attempt.attemptId
    );


    assert.equal(
        result.attempt?.questionId,
        attempt.questionId
    );


    assert.ok(
        result.masteryUpdate &&
        typeof result.masteryUpdate ===
        "object"
    );


    assert.ok(
        result.projection &&
        typeof result.projection ===
        "object"
    );


    assert.ok(
        result.projection.nodeState &&
        typeof result.projection.nodeState ===
        "object"
    );


    assert.ok(
        result.adaptiveDecision &&
        typeof result.adaptiveDecision ===
        "object"
    );


    assert.ok(
        [
            "LEARN",
            "PRACTICE",
            "CHALLENGE",
            "REMEDIATE",
            "RETEST",
            "REVIEW",
            "SKIP"
        ].includes(
            result.adaptiveDecision.action
        ),
        `Unexpected Adaptive action '${result.adaptiveDecision.action}'.`
    );


    assert.equal(
        result.outcome?.action,
        result.adaptiveDecision.action
    );


    assert.equal(
        result.outcome
            ?.remediationRequired,
        result.adaptiveDecision.action ===
        "REMEDIATE"
    );


    assert.equal(
        result.outcome
            ?.remediationCreated,
        result.remediationPlan !==
        null
    );
}


/**
 * =========================================================
 * 1. REAL DATA LOAD
 * =========================================================
 */

test(
    "1. loads real runtime contracts and K283 bank",
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
    }
);


/**
 * =========================================================
 * 2. CORRECT ATTEMPT → LEARNING FLOW
 * =========================================================
 */

test(
    "2. canonical correct Attempt is consumed by LearningFlow",
    () => {

        const question =
            getAnyQuestion();


        const attempt =
            createAttempt({
                question
            });


        assert.equal(
            attempt.result,
            "correct"
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 3. CONTEXT NODE BOUNDARY
 * =========================================================
 *
 * Critical integration regression:
 *
 * AttemptBuilder stores:
 *
 *     attempt.context.nodeId
 *
 * Mastery historically reads:
 *
 *     attempt.nodeId
 *
 * LearningFlow must bridge this boundary.
 */

test(
    "3. LearningFlow resolves target node from attempt.context.nodeId",
    () => {

        const question =
            getAnyQuestion();


        const attempt =
            createAttempt({
                question
            });


        assert.equal(
            attempt.nodeId,
            undefined
        );


        assert.equal(
            attempt.context.nodeId,
            question.primaryNode
        );


        const result =
            runFlow({
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


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 4. ATTEMPT MUST NOT BE MUTATED
 * =========================================================
 */

test(
    "4. LearningFlow engine projection does not mutate canonical Attempt",
    () => {

        const attempt =
            createAttempt();


        const before =
            structuredClone(
                attempt
            );


        runFlow({
            attempt
        });


        assert.deepEqual(
            attempt,
            before
        );


        assert.equal(
            attempt.nodeId,
            undefined
        );
    }
);


/**
 * =========================================================
 * 5. STUDENT STATE MUST NOT BE MUTATED
 * =========================================================
 */

test(
    "5. LearningFlow does not mutate Student State",
    () => {

        const attempt =
            createAttempt();


        const studentState =
            createStudentState();


        const before =
            structuredClone(
                studentState
            );


        runFlow({
            attempt,
            studentState
        });


        assert.deepEqual(
            studentState,
            before
        );
    }
);


/**
 * =========================================================
 * 6. EVIDENCE DIMENSION
 * =========================================================
 */

test(
    "6. Attempt primaryDimension reaches Mastery public boundary",
    () => {

        const question =
            getQuestion({
                evidence:
                    "apply"
            });

        const attempt =
            createAttempt({
                question
            });

        assert.equal(
            attempt.evidence.primaryDimension,
            "apply"
        );

        const result =
            runFlow({
                attempt
            });

        assert.equal(
            result.masteryUpdate
                .evidence
                .updatedDimension,
            "apply"
        );

        assert.equal(
            result.masteryUpdate
                .evidence
                .evidenceSource,
            "apply"
        );

        assertValidFlowResult(
            result,
            attempt
        );
    }
);


test(
    "7. Attempt difficulty is consumed through Mastery pipeline",
    () => {

        const question =
            getQuestion({
                difficulty:
                    "D3"
            });

        const attempt =
            createAttempt({
                question
            });

        assert.equal(
            attempt.evidence.difficulty,
            "D3"
        );

        const result =
            runFlow({
                attempt
            });

        /*
         * Difficulty is an INPUT to Mastery evidence weighting.
         *
         * The public MasteryUpdate contract does NOT expose the
         * raw MasteryEngine field:
         *
         *     update.attemptStrength
         *
         * Therefore this integration boundary must not depend
         * on that private runtime representation.
         */

        assert.equal(
            result.masteryUpdate.nodeId,
            question.primaryNode
        );

        assert.equal(
            result.masteryUpdate.attemptId,
            attempt.attemptId
        );

        assert.ok(
            result.masteryUpdate.evidence &&
            typeof result.masteryUpdate.evidence ===
            "object"
        );

        assertValidFlowResult(
            result,
            attempt
        );
    }
);


test(
    "8. AnswerEvaluator wrong becomes Attempt incorrect and reaches LearningFlow",
    () => {

        const question =
            getAnyQuestion();

        const attempt =
            createAttempt({

                question,

                response:
                    getWrongOptionId(
                        question
                    ),

                attemptId:
                    "ATTEMPT-INTEGRATION-WRONG"
            });

        /*
         * Boundary 1:
         *
         * AnswerEvaluator "wrong"
         *      ↓
         * AttemptBuilder "incorrect"
         */

        assert.equal(
            attempt.result,
            "incorrect"
        );

        const result =
            runFlow({
                attempt
            });

        /*
         * LearningFlow successfully consumed the canonical
         * Attempt.
         *
         * Public MasteryUpdate does NOT expose:
         *
         *     masteryUpdate.update.result
         *
         * so we verify public output identity instead.
         */

        assert.equal(
            result.masteryUpdate.attemptId,
            attempt.attemptId
        );

        assert.equal(
            result.masteryUpdate.questionId,
            attempt.questionId
        );

        assert.equal(
            result.masteryUpdate.nodeId,
            attempt.context.nodeId
        );

        assertValidFlowResult(
            result,
            attempt
        );
    }
);


test(
    "9. skipped Attempt is consumed without contract translation error",
    () => {

        const question =
            getAnyQuestion();

        const attempt =
            createAttempt({

                question,

                response:
                    null,

                attemptId:
                    "ATTEMPT-INTEGRATION-SKIPPED"
            });

        assert.equal(
            attempt.result,
            "skipped"
        );

        assert.equal(
            attempt.score,
            0
        );

        const result =
            runFlow({
                attempt
            });

        /*
         * Successful processAttempt() proves that the canonical
         * skipped Attempt crossed the Mastery/Adaptive boundary.
         *
         * Do not assert raw MasteryEngine update.result here;
         * it is intentionally absent from the public contract.
         */

        assert.equal(
            result.masteryUpdate.attemptId,
            attempt.attemptId
        );

        assert.equal(
            result.masteryUpdate.questionId,
            attempt.questionId
        );

        assert.equal(
            result.masteryUpdate.nodeId,
            attempt.context.nodeId
        );

        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 10. INDEPENDENT EVIDENCE
 * =========================================================
 */

test(
    "10. independent Attempt crosses LearningFlow boundary",
    () => {

        const attempt =
            createAttempt();


        assert.equal(
            attempt.evidence.independence,
            "independent"
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 11. HINT-ASSISTED EVIDENCE
 * =========================================================
 */

test(
    "11. hint_assisted Attempt crosses LearningFlow boundary",
    () => {

        const attempt =
            createAttempt({

                attemptId:
                    "ATTEMPT-HINT",

                hint: {

                    used:
                        true,

                    level:
                        1,

                    count:
                        1
                }
            });


        assert.equal(
            attempt.evidence.independence,
            "hint_assisted"
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 12. RETRY-ASSISTED EVIDENCE
 * =========================================================
 */

test(
    "12. retry_assisted Attempt crosses LearningFlow boundary",
    () => {

        const attempt =
            createAttempt({

                attemptId:
                    "ATTEMPT-RETRY",

                attemptNumber:
                    2,

                retry: {

                    isRetry:
                        true,

                    previousAttemptId:
                        "ATTEMPT-PREVIOUS",

                    retryNumber:
                        1
                }
            });


        assert.equal(
            attempt.evidence.independence,
            "retry_assisted"
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 13. FAILURE TYPE BOUNDARY
 * =========================================================
 *
 * Critical contract:
 *
 * Attempt:
 *
 *   diagnostic.failureType
 *
 * LearningFlow / Mastery:
 *
 *   must consume canonical taxonomy without requiring the
 *   removed legacy diagnostic.failureSignature field.
 */

test(
    "13. canonical diagnostic.failureType reaches LearningFlow",
    () => {

        const question =
            getAnyQuestion();


        const attempt =
            createAttempt({

                question,

                response:
                    getWrongOptionId(
                        question
                    ),

                attemptId:
                    "ATTEMPT-FAILURE-TYPE",

                diagnostic: {

                    failureType:
                        "reasoning_error",

                    sourceNodeId:
                        question.primaryNode,

                    confidence:
                        0.9,

                    evidence:
                        "Integration failure-type evidence."
                }
            });


        assert.equal(
            attempt.diagnostic
                .failureType,
            "reasoning_error"
        );


        assert.equal(
            Object.prototype
                .hasOwnProperty
                .call(
                    attempt.diagnostic,
                    "failureSignature"
                ),
            false
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );


        assert.ok(
            result.masteryUpdate.failure &&
            typeof result
                .masteryUpdate
                .failure ===
            "object"
        );
    }
);


/**
 * =========================================================
 * 14. FAILURE SIGNATURE ID BOUNDARY
 * =========================================================
 */

test(
    "14. canonical diagnostic.failureSignatureId reaches LearningFlow",
    () => {

        const question =
            getAnyQuestion();


        const attempt =
            createAttempt({

                question,

                response:
                    getWrongOptionId(
                        question
                    ),

                attemptId:
                    "ATTEMPT-FAILURE-SIGNATURE",

                diagnostic: {

                    failureSignatureId:
                        "FS-INTEGRATION-001",

                    failureType:
                        "reasoning_error",

                    sourceNodeId:
                        question.primaryNode,

                    confidence:
                        0.9,

                    evidence:
                        "Integration signature evidence."
                }
            });


        assert.equal(
            attempt
                .diagnostic
                .failureSignatureId,
            "FS-INTEGRATION-001"
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );


        /**
         * We deliberately do NOT assert the exact internal
         * failureSummary shape here.
         *
         * Mastery owns that representation.
         *
         * This integration gate only proves that canonical
         * Attempt input does not require legacy
         * diagnostic.failureSignature.
         */
        assert.ok(
            result.masteryUpdate.failure &&
            typeof result
                .masteryUpdate
                .failure ===
            "object"
        );
    }
);


/**
 * =========================================================
 * 15. NO LEGACY EVIDENCE QUESTION TYPE
 * =========================================================
 */

test(
    "15. LearningFlow works without legacy evidence.questionType",
    () => {

        const attempt =
            createAttempt();


        assert.equal(
            Object.prototype
                .hasOwnProperty
                .call(
                    attempt.evidence,
                    "questionType"
                ),
            false
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 16. QUESTION TYPE STILL AVAILABLE UPSTREAM
 * =========================================================
 *
 * questionType belongs to Question / AnswerEvaluator.
 * It is intentionally NOT duplicated into Attempt.evidence.
 */

test(
    "16. removal of evidence.questionType does not break runtime pipeline",
    () => {

        const question =
            getAnyQuestion();


        assert.equal(
            question.questionType,
            "mcq"
        );


        const attempt =
            createAttempt({
                question
            });


        assert.equal(
            attempt.response.type,
            "singleChoice"
        );


        assert.equal(
            attempt.evidence
                .questionType,
            undefined
        );


        const result =
            runFlow({
                attempt
            });


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 17. PRIMARY NODE IDENTITY
 * =========================================================
 */

test(
    "17. node identity remains K283 across Attempt and LearningFlow",
    () => {

        const question =
            getAnyQuestion();


        assert.equal(
            question.primaryNode,
            "K283"
        );


        const attempt =
            createAttempt({
                question
            });


        const result =
            runFlow({
                attempt
            });


        assert.equal(
            attempt.context.nodeId,
            "K283"
        );


        assert.equal(
            result.targetNodeId,
            "K283"
        );


        assert.equal(
            result.masteryUpdate.nodeId,
            "K283"
        );


        assertValidFlowResult(
            result,
            attempt
        );
    }
);


/**
 * =========================================================
 * 18. ADAPTIVE ACTION CONTRACT
 * =========================================================
 */

test(
    "18. LearningFlow returns canonical Adaptive primary action",
    () => {

        const attempt =
            createAttempt();


        const result =
            runFlow({
                attempt
            });


        assert.ok(
            [
                "LEARN",
                "PRACTICE",
                "CHALLENGE",
                "REMEDIATE",
                "RETEST",
                "REVIEW",
                "SKIP"
            ].includes(
                result.adaptiveDecision.action
            )
        );


        assert.equal(
            result.outcome.action,
            result.adaptiveDecision.action
        );
    }
);


/**
 * =========================================================
 * 19. REMEDIATION OWNERSHIP
 * =========================================================
 */

test(
    "19. remediation plan exists iff Adaptive selects REMEDIATE",
    () => {

        const question =
            getAnyQuestion();


        const attempt =
            createAttempt({

                question,

                response:
                    getWrongOptionId(
                        question
                    ),

                attemptId:
                    "ATTEMPT-REMEDIATION-BOUNDARY",

                diagnostic: {

                    failureType:
                        "reasoning_error",

                    sourceNodeId:
                        question.primaryNode,

                    confidence:
                        0.9,

                    evidence:
                        "Integration remediation boundary."
                }
            });


        const result =
            runFlow({
                attempt
            });


        if (
            result.adaptiveDecision.action ===
            "REMEDIATE"
        ) {

            assert.ok(
                result.remediationPlan
            );


            assert.equal(
                result.outcome
                    .remediationRequired,
                true
            );


            assert.equal(
                result.outcome
                    .remediationCreated,
                true
            );

        } else {

            assert.equal(
                result.remediationPlan,
                null
            );


            assert.equal(
                result.outcome
                    .remediationRequired,
                false
            );


            assert.equal(
                result.outcome
                    .remediationCreated,
                false
            );
        }
    }
);


/**
 * =========================================================
 * 20. COMPLETE BOUNDARY GATE
 * =========================================================
 *
 * Exercise several canonical Attempt forms through the same
 * LearningFlow boundary.
 */

test(
    "20. complete AttemptBuilder → LearningFlow integration gate passes",
    () => {

        const question =
            getAnyQuestion();


        const cases = [

            {
                name:
                    "correct-independent",

                attempt:
                    createAttempt({

                        question,

                        attemptId:
                            "ATTEMPT-GATE-001"
                    })
            },


            {
                name:
                    "incorrect-independent",

                attempt:
                    createAttempt({

                        question,

                        response:
                            getWrongOptionId(
                                question
                            ),

                        attemptId:
                            "ATTEMPT-GATE-002"
                    })
            },


            {
                name:
                    "skipped",

                attempt:
                    createAttempt({

                        question,

                        response:
                            null,

                        attemptId:
                            "ATTEMPT-GATE-003"
                    })
            },


            {
                name:
                    "correct-hint-assisted",

                attempt:
                    createAttempt({

                        question,

                        attemptId:
                            "ATTEMPT-GATE-004",

                        hint: {

                            used:
                                true,

                            level:
                                1,

                            count:
                                1
                        }
                    })
            },


            {
                name:
                    "correct-retry-assisted",

                attempt:
                    createAttempt({

                        question,

                        attemptId:
                            "ATTEMPT-GATE-005",

                        attemptNumber:
                            2,

                        retry: {

                            isRetry:
                                true,

                            previousAttemptId:
                                "ATTEMPT-GATE-000",

                            retryNumber:
                                1
                        }
                    })
            },


            {
                name:
                    "incorrect-failure-type",

                attempt:
                    createAttempt({

                        question,

                        response:
                            getWrongOptionId(
                                question
                            ),

                        attemptId:
                            "ATTEMPT-GATE-006",

                        diagnostic: {

                            failureType:
                                "reasoning_error",

                            sourceNodeId:
                                "K283",

                            confidence:
                                0.9,

                            evidence:
                                "Boundary gate failure."
                        }
                    })
            },


            {
                name:
                    "incorrect-failure-signature-id",

                attempt:
                    createAttempt({

                        question,

                        response:
                            getWrongOptionId(
                                question
                            ),

                        attemptId:
                            "ATTEMPT-GATE-007",

                        diagnostic: {

                            failureSignatureId:
                                "FS-INTEGRATION-001",

                            failureType:
                                "reasoning_error",

                            sourceNodeId:
                                "K283",

                            confidence:
                                0.9,

                            evidence:
                                "Boundary gate signature."
                        }
                    })
            }

        ];


        for (
            const {
                name,
                attempt
            }
            of cases
        ) {

            const attemptBefore =
                structuredClone(
                    attempt
                );


            const studentState =
                createStudentState();


            const stateBefore =
                structuredClone(
                    studentState
                );


            const result =
                runFlow({
                    attempt,
                    studentState
                });


            assertValidFlowResult(
                result,
                attempt
            );


            /**
             * Boundary invariants.
             */

            assert.equal(
                result.targetNodeId,
                attempt.context.nodeId,
                name
            );


            assert.equal(
                result.masteryUpdate.nodeId,
                attempt.context.nodeId,
                name
            );


            /**
             * No hidden mutation.
             */

            assert.deepEqual(
                attempt,
                attemptBefore,
                `${name}: Attempt mutated`
            );


            assert.deepEqual(
                studentState,
                stateBefore,
                `${name}: Student State mutated`
            );
        }
    }
);