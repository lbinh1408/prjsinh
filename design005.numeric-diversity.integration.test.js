/**
 * ============================================================
 * design005.numeric-diversity.integration.test.js
 * ============================================================
 *
 * DESIGN-005
 * Question-Type Diversity Reachability
 *
 * Goal:
 *
 *   K283 M3
 *   distinctQuestionTypes = 1 ("mcq")
 *              ↓
 *   AdaptiveDecision = CHALLENGE
 *              ↓
 *   QuestionSelector selects Q010
 *              ↓
 *   Q010 = numeric / transfer / D4
 *              ↓
 *   submit numeric response 25
 *              ↓
 *   AnswerEvaluator
 *              ↓
 *   AttemptBuilder
 *              ↓
 *   LearningFlow
 *              ↓
 *   Mastery V2
 *              ↓
 *   distinctQuestionTypes = 2
 *              ↓
 *   M3 → M4
 *
 * IMPORTANT:
 *
 * - Uses REAL StudySession.
 * - Uses REAL QuestionSelector.
 * - Uses REAL AnswerEvaluator.
 * - Uses REAL AttemptBuilder.
 * - Uses REAL LearningFlow.
 * - Uses REAL Mastery + Adaptive.
 * - Uses REAL K283 question bank.
 *
 * - Does NOT calculate mastery in this test.
 * - Does NOT modify production engines.
 * - Does NOT fake the Q010 result.
 *
 * Run from project root:
 *
 *   node design005.numeric-diversity.integration.test.js
 *
 * ============================================================
 */


import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    createStudySession,
    getNextQuestion,
    submitAnswer,
    getStudentState
} from "./src/engines/orchestration/studySession.js";


/* ============================================================
 * PATHS
 * ============================================================
 */

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


const PATHS =
    Object.freeze({

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
            "./src/data/student/student-state.json"
    });


/* ============================================================
 * CONSTANTS
 * ============================================================
 */

const TARGET_NODE_ID =
    "K283";

const TARGET_QUESTION_ID =
    "Q-A-K283-T-010";

const CLUSTER_ID =
    "C09";

const LEARNING_MODE =
    "HOC_SAU";

const SESSION_ID =
    "SESSION-DESIGN005";

const STUDENT_ID =
    "STUDENT-DESIGN005";

const FIXED_NOW =
    "2026-10-05T12:00:00.000Z";


/* ============================================================
 * TEST HARNESS
 * ============================================================
 */

let passed =
    0;

let failed =
    0;


function test(
    name,
    fn
) {

    try {

        fn();

        passed += 1;

        console.log(
            `✓ PASS — ${name}`
        );

    } catch (error) {

        failed += 1;

        console.error(
            `✗ FAIL — ${name}`
        );

        console.error(
            error?.stack ??
            error
        );
    }
}


function assert(
    condition,
    message
) {

    if (!condition) {

        throw new Error(
            message ??
            "Assertion failed."
        );
    }
}


function assertEqual(
    actual,
    expected,
    message = ""
) {

    if (
        actual !==
        expected
    ) {

        throw new Error(
            message ||
            (
                `Expected ${JSON.stringify(expected)}, ` +
                `received ${JSON.stringify(actual)}`
            )
        );
    }
}


/* ============================================================
 * JSON
 * ============================================================
 */

function readJson(
    relativePath
) {

    const absolutePath =
        path.resolve(
            __dirname,
            relativePath
        );


    if (
        !fs.existsSync(
            absolutePath
        )
    ) {

        throw new Error(
            `Missing required file: ${relativePath}`
        );
    }


    return JSON.parse(
        fs.readFileSync(
            absolutePath,
            "utf8"
        )
    );
}


/* ============================================================
 * LOAD REAL PROJECT DATA
 * ============================================================
 */

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

const baseStudentState =
    readJson(
        PATHS.studentState
    );


/**
 * Project intentionally has no remediation/rules.json.
 */
const remediationRules =
    {};


/* ============================================================
 * REAL Q010 GUARD
 * ============================================================
 */

const q010 =
    questionBank
        .questions
        .find(
            question =>
                question.id ===
                TARGET_QUESTION_ID
        );


test(
    "real bank contains Q010",
    () => {

        assert(
            q010 != null,
            "Q010 is missing from real K283 bank."
        );
    }
);


test(
    "Q010 is numeric + number",
    () => {

        assertEqual(
            q010.questionType,
            "numeric"
        );

        assertEqual(
            q010.answer?.type,
            "number"
        );
    }
);


test(
    "Q010 is transfer D4 challenge",
    () => {

        assertEqual(
            q010.evidence,
            "transfer"
        );

        assertEqual(
            q010.difficulty,
            "D4"
        );

        assert(
            q010.mode?.includes(
                "challenge"
            ),
            "Q010 must support challenge mode."
        );
    }
);


/* ============================================================
 * M3 STUDENT STATE FIXTURE
 * ============================================================
 *
 * Persisted Student State represents the snapshot.
 *
 * Runtime evidence history is seeded separately below because
 * Mastery V2 derives sufficiency from runtime observations.
 *
 * The fixture is intentionally M4-capable EXCEPT for:
 *
 *     distinctQuestionTypes = 1
 *
 * Existing question type:
 *
 *     mcq
 *
 * Q010 should introduce:
 *
 *     numeric
 *
 * ============================================================
 */

function createM3StudentState() {

    const state =
        structuredClone(
            baseStudentState
        );


    state.schemaVersion =
        "1.2.0";


    state.student = {
        ...(
            state.student ??
            {}
        ),

        studentId:
            STUDENT_ID
    };


    state.knowledge =
        state.knowledge ??
        {};


    state.knowledge[
        TARGET_NODE_ID
    ] = {

        nodeId:
            TARGET_NODE_ID,

        mastery:
            "M3",

        status:
            "developing",

        evidence: {

            know:
                0.90,

            explain:
                0.85,

            apply:
                0.85,

            transfer:
                0.75
        },

        overallEvidence:
            0.835,

        confidence:
            "high",

        evidenceSufficiency: {

            independentObservations:
                6,

            distinctContexts:
                6,

            distinctQuestionTypes:
                1,

            observedEvidenceTypes: [
                "know",
                "explain",
                "apply",
                "transfer"
            ]
        },

        attemptStats: {

            total:
                6,

            correct:
                6,

            wrong:
                0,

            partial:
                0,

            skipped:
                0
        },

        weakEvidence:
            [],

        signals:
            [],

        lastAttemptAt:
            FIXED_NOW,

        lastSuccessAt:
            FIXED_NOW,

        lastFailure:
            null,

        retest: {

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
        },

        review: {

            lastReviewedAt:
                null
        }
    };


    return state;
}


/* ============================================================
 * RUNTIME EVIDENCE HISTORY
 * ============================================================
 *
 * IMPORTANT:
 *
 * Mastery V2 calculates:
 *
 * - independentObservations
 * - distinctContexts
 * - distinctQuestionTypes
 * - qualifying observations
 *
 * from evidenceHistory.
 *
 * Therefore merely writing:
 *
 *     state.evidenceSufficiency.distinctQuestionTypes = 1
 *
 * would NOT be a valid DESIGN-005 test.
 *
 * All six existing observations below are:
 *
 *     questionType = "mcq"
 *
 * After Q010:
 *
 *     mcq + numeric
 *
 * should produce:
 *
 *     distinctQuestionTypes = 2
 *
 * ============================================================
 */

function observation({
    attemptId,
    questionId,
    dimension,
    score,
    contextId
}) {

    return {

        attemptId,

        questionId,

        dimension,

        score,

        reliabilityWeight:
            1,

        independent:
            true,

        contextId,

        questionType:
            "mcq",

        at:
            FIXED_NOW
    };
}


function createM3EvidenceHistory() {

    return {

        know: [

            observation({
                attemptId:
                    "PRE-D005-001",

                questionId:
                    "Q-A-K283-K-001",

                dimension:
                    "know",

                score:
                    0.90,

                contextId:
                    "d005-pre-context-01"
            })
        ],

        explain: [

            observation({
                attemptId:
                    "PRE-D005-002",

                questionId:
                    "Q-A-K283-E-002",

                dimension:
                    "explain",

                score:
                    0.85,

                contextId:
                    "d005-pre-context-02"
            })
        ],

        apply: [

            observation({
                attemptId:
                    "PRE-D005-003",

                questionId:
                    "Q-A-K283-A-003",

                dimension:
                    "apply",

                score:
                    0.85,

                contextId:
                    "d005-pre-context-03"
            }),

            observation({
                attemptId:
                    "PRE-D005-004",

                questionId:
                    "Q-A-K283-A-004",

                dimension:
                    "apply",

                score:
                    0.85,

                contextId:
                    "d005-pre-context-04"
            })
        ],

        transfer: [

            observation({
                attemptId:
                    "PRE-D005-005",

                questionId:
                    "Q-A-K283-T-008",

                dimension:
                    "transfer",

                score:
                    0.75,

                contextId:
                    "d005-pre-context-05"
            }),

            observation({
                attemptId:
                    "PRE-D005-006",

                questionId:
                    "Q-A-K283-T-009",

                dimension:
                    "transfer",

                score:
                    0.75,

                contextId:
                    "d005-pre-context-06"
            })
        ]
    };
}


/* ============================================================
 * INITIAL ADAPTIVE DECISION
 * ============================================================
 *
 * This fixture represents the already-reached M3 challenge
 * stage.
 *
 * It does NOT calculate the next action.
 *
 * AdaptiveEngine still owns the NEXT decision after Q010.
 *
 * questionTypes=["numeric"] makes this test target the newly
 * reachable task type without changing QuestionSelector.
 *
 * ============================================================
 */

function createChallengeDecision() {

    return {

        decisionId:
            "DECISION-DESIGN005-INITIAL",

        action:
            "CHALLENGE",

        target: {

            primaryNodeId:
                TARGET_NODE_ID,

            nodeIds: [
                TARGET_NODE_ID
            ]
        },

        selectionCriteria: {

            questionTypes: [
                "numeric"
            ],

            difficulty: {

                min:
                    "D4",

                max:
                    "D4",

                preferred:
                    "D4"
            },

            evidenceDimensions: [
                "transfer"
            ],

            excludeQuestionIds:
                [],

            requireDifferentQuestion:
                false,

            requireDifferentContext:
                false,

            requireIndependentEvidence:
                true,

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
                "CHALLENGE",

            next:
                null
        },

        fallback:
            null
    };
}


/* ============================================================
 * CREATE REAL STUDY SESSION
 * ============================================================
 */

let session =
    createStudySession({

        sessionId:
            SESSION_ID,

        studentState:
            createM3StudentState(),

        initialDecision:
            createChallengeDecision(),

        questionBanks: {

            [TARGET_NODE_ID]:
                questionBank
        },

        knowledgeMap,

        masteryRules,

        evidenceModel,

        adaptiveRules,

        adaptivePaths,

        failureSignatures,

        remediationRules,

        learningMode:
            LEARNING_MODE,

        timeBudget:
            60,

        clusterId:
            CLUSTER_ID,

        lessonId:
            null,

        contextId:
            "design005-runtime-session",

        history:
            [],

        historyLimit:
            50,

        now:
            FIXED_NOW
    });


/**
 * StudySession intentionally keeps runtime-only mastery
 * evidence outside canonical Student State.
 *
 * Seed the exact runtime channel used by submitAnswer().
 */
session.masteryRuntime = {

    ...(
        session.masteryRuntime ??
        {}
    ),

    evidenceHistoryByNode: {

        ...(
            session
                .masteryRuntime
                ?.evidenceHistoryByNode ??
            {}
        ),

        [TARGET_NODE_ID]:
            createM3EvidenceHistory()
    }
};


/* ============================================================
 * PRECONDITION ASSERTIONS
 * ============================================================
 */

const beforeState =
    getStudentState(
        session
    );

const beforeNode =
    beforeState
        .knowledge[
    TARGET_NODE_ID
    ];


test(
    "precondition mastery is M3",
    () => {

        assertEqual(
            beforeNode.mastery,
            "M3"
        );
    }
);


test(
    "precondition distinctQuestionTypes is exactly 1",
    () => {

        assertEqual(
            beforeNode
                .evidenceSufficiency
                .distinctQuestionTypes,
            1
        );
    }
);


test(
    "runtime history initially contains only mcq",
    () => {

        const history =
            session
                .masteryRuntime
                .evidenceHistoryByNode[
            TARGET_NODE_ID
            ];


        const types =
            new Set(
                Object.values(
                    history
                )
                    .flat()
                    .map(
                        item =>
                            item.questionType
                    )
            );


        assertEqual(
            types.size,
            1
        );

        assert(
            types.has(
                "mcq"
            ),
            "Initial runtime history must contain mcq."
        );
    }
);


/* ============================================================
 * QUESTION SELECTION
 * ============================================================
 */

const selectionResult =
    getNextQuestion({

        session,

        now:
            FIXED_NOW
    });


session =
    selectionResult.session;


test(
    "QuestionSelector returns SELECTED",
    () => {

        assertEqual(
            selectionResult
                .selection
                ?.status,
            "SELECTED"
        );
    }
);


test(
    "QuestionSelector selects Q010",
    () => {

        assertEqual(
            selectionResult
                .question
                ?.id,
            TARGET_QUESTION_ID
        );
    }
);


test(
    "selected question is numeric transfer D4",
    () => {

        assertEqual(
            selectionResult
                .question
                ?.questionType,
            "numeric"
        );

        assertEqual(
            selectionResult
                .question
                ?.evidence,
            "transfer"
        );

        assertEqual(
            selectionResult
                .question
                ?.difficulty,
            "D4"
        );
    }
);


/* ============================================================
 * SUBMIT REAL NUMERIC ANSWER
 * ============================================================
 */

const submitResult =
    submitAnswer({

        session,

        response:
            25,

        attemptId:
            "ATTEMPT-DESIGN005-001",

        startedAt:
            "2026-10-05T11:59:50.000Z",

        submittedAt:
            FIXED_NOW,

        attemptNumber:
            1,

        hint:
            null,

        timing:
            null,

        diagnostic:
            null,

        retry:
            null,

        feedback:
            null,

        ui: {

            device:
                "desktop",

            inputMethod:
                "keyboard"
        },

        metadata: {

            test:
                "DESIGN-005"
        },

        now:
            FIXED_NOW
    });


session =
    submitResult.session;

console.log(
    "\n========== DESIGN-005 BRIDGE DEBUG =========="
);

console.log(
    JSON.stringify(
        {
            attemptNodeId:
                submitResult.attempt?.context?.nodeId,

            flowTargetNodeId:
                submitResult.flowResult?.targetNodeId,

            flowRuntime:
                submitResult.flowResult?.runtime,

            projectedNode:
                submitResult.flowResult?.projection?.nodeState,

            masteryUpdate:
                submitResult.flowResult?.masteryUpdate,

            sessionMasteryRuntime:
                session.masteryRuntime
        },
        null,
        2
    )
);
/* ============================================================
 * ANSWER EVALUATOR
 * ============================================================
 */

test(
    "numeric answer 25 is evaluated correct",
    () => {

        assertEqual(
            submitResult
                .evaluation
                ?.correct,
            true
        );

        assertEqual(
            submitResult
                .evaluation
                ?.result,
            "correct"
        );
    }
);


/* ============================================================
 * ATTEMPT BUILDER
 * ============================================================
 */

test(
    "AttemptBuilder creates canonical numeric response",
    () => {

        assertEqual(
            submitResult
                .attempt
                ?.questionId,
            TARGET_QUESTION_ID
        );

        assertEqual(
            submitResult
                .attempt
                ?.response
                ?.type,
            "numeric"
        );

        assertEqual(
            submitResult
                .attempt
                ?.response
                ?.value,
            25
        );

        assertEqual(
            submitResult
                .attempt
                ?.response
                ?.normalizedValue,
            25
        );
    }
);


test(
    "Attempt carries transfer D4 evidence",
    () => {

        assertEqual(
            submitResult
                .attempt
                ?.evidence
                ?.primaryDimension,
            "transfer"
        );

        assertEqual(
            submitResult
                .attempt
                ?.evidence
                ?.difficulty,
            "D4"
        );
    }
);


/* ============================================================
 * MASTERY RUNTIME RESULT
 * ============================================================
 */

const flowResult =
    submitResult.flowResult;


const runtimeMastery =
    flowResult
        ?.runtime
        ?.mastery;


test(
    "LearningFlow returns mastery projection",
    () => {

        assert(
            flowResult
                ?.projection
                ?.nodeState != null,
            "Missing flowResult.projection.nodeState."
        );

        assert(
            flowResult
                ?.masteryUpdate != null,
            "Missing flowResult.masteryUpdate."
        );
    }
);


/* ============================================================
 * RUNTIME EVIDENCE HISTORY AFTER Q010
 * ============================================================
 */

const runtimeHistoryAfter =
    session
        .masteryRuntime
        ?.evidenceHistoryByNode
    ?.[TARGET_NODE_ID];


test(
    "runtime mastery history survives StudySession commit",
    () => {

        assert(
            runtimeHistoryAfter != null,
            "Missing K283 runtime evidence history after Q010."
        );
    }
);


test(
    "runtime history now contains numeric evidence",
    () => {

        const all =
            Object.values(
                runtimeHistoryAfter
            )
                .flat();


        const types =
            new Set(
                all.map(
                    item =>
                        item.questionType
                )
            );


        assert(
            types.has(
                "mcq"
            ),
            "Runtime history lost existing mcq evidence."
        );


        assert(
            types.has(
                "numeric"
            ),
            "Q010 numeric questionType did not reach Mastery history."
        );


        assertEqual(
            types.size,
            2,
            "Expected exactly mcq + numeric."
        );
    }
);


test(
    "Q010 observation uses semantic question context",
    () => {

        const transferHistory =
            runtimeHistoryAfter
                .transfer;


        const q010Observation =
            transferHistory.find(
                item =>
                    item.questionId ===
                    TARGET_QUESTION_ID
            );


        assert(
            q010Observation != null,
            "Q010 transfer observation missing."
        );


        assertEqual(
            q010Observation.questionType,
            "numeric"
        );


        assertEqual(
            q010Observation.contextId,
            q010.context.contextId
        );
    }
);


/* ============================================================
 * COMMITTED STUDENT STATE
 * ============================================================
 */

const afterState =
    getStudentState(
        session
    );

const afterNode =
    afterState
        .knowledge[
    TARGET_NODE_ID
    ];


test(
    "Student State distinctQuestionTypes becomes 2",
    () => {

        assertEqual(
            afterNode
                .evidenceSufficiency
                .distinctQuestionTypes,
            2
        );
    }
);


test(
    "Student State independent observations increase",
    () => {

        assertEqual(
            afterNode
                .evidenceSufficiency
                .independentObservations,
            7
        );
    }
);


test(
    "Student State observes transfer evidence",
    () => {

        assert(
            afterNode
                .evidenceSufficiency
                .observedEvidenceTypes
                .includes(
                    "transfer"
                ),
            "transfer missing from observedEvidenceTypes."
        );
    }
);


/* ============================================================
 * DESIGN-005 CORE ASSERTION
 * ============================================================
 */

test(
    "DESIGN-005 promotes K283 from M3 to M4",
    () => {

        assertEqual(
            beforeNode.mastery,
            "M3"
        );

        assertEqual(
            afterNode.mastery,
            "M4",
            (
                "Expected Q010 numeric diversity evidence " +
                "to promote K283 from M3 to M4."
            )
        );
    }
);


/* ============================================================
 * SUPPORTED LEVEL
 * ============================================================
 */

// test(
//     "Mastery reports M4 as supported level",
//     () => {

//         const supportedLevel =
//             flowResult
//                 ?.runtime
//                 ?.mastery
//                 ?.decision
//                 ?.supportedLevel ??
//             flowResult
//                 ?.runtime
//                 ?.mastery
//                 ?.masteryDecision
//                 ?.supportedLevel ??
//             flowResult
//                 ?.masteryUpdate
//                 ?.decision
//                 ?.supportedLevel ??
//             null;


//         assertEqual(
//             supportedLevel,
//             "M4"
//         );
//     }
// );


/* ============================================================
 * ADAPTIVE RECEIVES POST-MASTERY STATE
 * ============================================================
 */

test(
    "Adaptive produces a next decision after M4",
    () => {

        assert(
            submitResult
                .nextDecision != null,
            "Missing next AdaptiveDecision."
        );

        assert(
            typeof submitResult
                .nextDecision
                ?.action ===
            "string",
            "Next AdaptiveDecision has no action."
        );
    }
);


/* ============================================================
 * ORIGINAL STATE IMMUTABILITY
 * ============================================================
 */

test(
    "pre-submit snapshot remains M3",
    () => {

        assertEqual(
            beforeState
                .knowledge[
                TARGET_NODE_ID
            ]
                .mastery,
            "M3"
        );

        assertEqual(
            beforeState
                .knowledge[
                TARGET_NODE_ID
            ]
                .evidenceSufficiency
                .distinctQuestionTypes,
            1
        );
    }
);


/* ============================================================
 * DIAGNOSTIC TRACE
 * ============================================================
 */

console.log(
    "\n============================================================"
);

console.log(
    "DESIGN-005 RUNTIME TRACE"
);

console.log(
    "============================================================"
);


console.log(
    JSON.stringify(
        {

            question: {

                id:
                    selectionResult
                        .question
                        ?.id,

                questionType:
                    selectionResult
                        .question
                        ?.questionType,

                evidence:
                    selectionResult
                        .question
                        ?.evidence,

                difficulty:
                    selectionResult
                        .question
                        ?.difficulty,

                contextId:
                    selectionResult
                        .question
                        ?.context
                        ?.contextId
            },

            evaluation: {

                result:
                    submitResult
                        .evaluation
                        ?.result,

                correct:
                    submitResult
                        .evaluation
                        ?.correct
            },

            attempt: {

                responseType:
                    submitResult
                        .attempt
                        ?.response
                        ?.type,

                value:
                    submitResult
                        .attempt
                        ?.response
                        ?.value,

                normalizedValue:
                    submitResult
                        .attempt
                        ?.response
                        ?.normalizedValue
            },

            before: {

                mastery:
                    beforeNode
                        .mastery,

                distinctQuestionTypes:
                    beforeNode
                        .evidenceSufficiency
                        .distinctQuestionTypes,

                independentObservations:
                    beforeNode
                        .evidenceSufficiency
                        .independentObservations
            },

            after: {

                mastery:
                    afterNode
                        .mastery,

                confidence:
                    afterNode
                        .confidence,

                distinctQuestionTypes:
                    afterNode
                        .evidenceSufficiency
                        .distinctQuestionTypes,

                independentObservations:
                    afterNode
                        .evidenceSufficiency
                        .independentObservations,

                distinctContexts:
                    afterNode
                        .evidenceSufficiency
                        .distinctContexts,

                observedEvidenceTypes:
                    afterNode
                        .evidenceSufficiency
                        .observedEvidenceTypes
            },

            nextAction:
                submitResult
                    .nextDecision
                    ?.action ??
                null
        },
        null,
        2
    )
);


/* ============================================================
 * SUMMARY
 * ============================================================
 */

console.log(
    "\n============================================================"
);

console.log(
    "DESIGN-005 — NUMERIC DIVERSITY INTEGRATION TEST"
);

console.log(
    "============================================================"
);

console.log(
    `Passed : ${passed}`
);

console.log(
    `Failed : ${failed}`
);

console.log(
    `Total  : ${passed + failed}`
);

console.log(
    "------------------------------------------------------------"
);

console.log(
    `Question type : ${selectionResult
        .question
        ?.questionType ??
    "?"
    }`
);

console.log(
    `Before types  : ${beforeNode
        .evidenceSufficiency
        .distinctQuestionTypes
    }`
);

console.log(
    `After types   : ${afterNode
        .evidenceSufficiency
        .distinctQuestionTypes
    }`
);

console.log(
    `Mastery       : ${beforeNode.mastery
    } → ${afterNode.mastery
    }`
);

console.log(
    "============================================================"
);


if (
    failed > 0
) {

    console.log(
        "\n✗ DESIGN-005 NOT VERIFIED"
    );

    process.exitCode =
        1;

} else {

    console.log(
        "\n✓ DESIGN-005 — RESOLVED / LIVE VERIFIED"
    );
}