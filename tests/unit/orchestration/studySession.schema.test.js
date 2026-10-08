/**
 * ============================================================
 * studySession.schema.test.js
 * ============================================================
 *
 * StudySession V0.1.0
 * Student State Schema Integration Gate
 *
 * PURPOSE
 * ------------------------------------------------------------
 *
 * Prove that StudySession runtime commits preserve the
 * canonical Student State V1.2.0 contract.
 *
 *
 * Flow under test:
 *
 * createStudySession()
 *      ↓
 * validate Student State
 *      ↓
 * select question #1
 *      ↓
 * submit answer
 *      ↓
 * commit Student State
 *      ↓
 * validate
 *      ↓
 * repeat #2
 *      ↓
 * validate
 *      ↓
 * repeat #3
 *      ↓
 * validate
 *
 *
 * IMPORTANT
 * ------------------------------------------------------------
 *
 * This test does NOT re-test:
 *
 * - Mastery behavior
 * - Adaptive behavior
 * - QuestionSelector ranking
 * - AnswerEvaluator grading
 * - AttemptBuilder contract
 * - Remediation diagnosis
 *
 * Those layers already have their own tests.
 *
 * This file tests the StudySession → StudentState boundary.
 *
 * ============================================================
 */


import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


import {
    createStudySession,
    getNextQuestion,
    submitAnswer
} from "../../../src/engines/orchestration/studySession.js";


import {
    validateStudentState
} from "../../../src/contracts/validators/studentStateValidator.js";


/**
 * ============================================================
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


const ROOT =
    path.resolve(
        __dirname,
        "../.."
    );


/**
 * ============================================================
 * DATA LOADER
 * ============================================================
 */

function loadJson(
    relativePath
) {

    const fullPath =
        path.join(
            ROOT,
            relativePath
        );


    return JSON.parse(
        fs.readFileSync(
            fullPath,
            "utf8"
        )
    );
}


/**
 * ============================================================
 * PROJECT DATA
 * ============================================================
 */

const knowledgeMap =
    loadJson(
        "../src/data/knowledge/knowledge-map-v4.json"
    );


const masteryRules =
    loadJson(
        "../src/policies/mastery/rules.json"
    );


const evidenceModel =
    loadJson(
        "../src/data/mastery/evidence.json"
    );


const adaptiveRules =
    loadJson(
        "../src/policies/adaptive/rules.json"
    );


const adaptivePaths =
    loadJson(
        "../src/policies/adaptive/paths.json"
    );


const failureSignatures =
    loadJson(
        "../src/data/remediation/failure-signatures.json"
    );


/**
 * Current project intentionally has no
 * remediation/rules.json.
 */
const remediationRules = {};


const k283Bank =
    loadJson(
        "../src/data/questions/c09/K283.question-bank.json"
    );


const questionBanks = {

    K283:
        k283Bank
};


/**
 * ============================================================
 * FIXED TIME
 * ============================================================
 */

const T0 =
    "2026-10-01T08:00:00.000Z";


const TIMES = [

    {
        start:
            "2026-10-01T08:01:00.000Z",

        end:
            "2026-10-01T08:01:30.000Z"
    },

    {
        start:
            "2026-10-01T08:02:00.000Z",

        end:
            "2026-10-01T08:02:40.000Z"
    },

    {
        start:
            "2026-10-01T08:03:00.000Z",

        end:
            "2026-10-01T08:03:50.000Z"
    }
];


/**
 * ============================================================
 * INITIAL STUDENT STATE
 * ============================================================
 */

function createInitialStudentState() {

    return {

        schemaVersion:
            "1.2.0",

        stateId:
            "STATE-STUDY-SCHEMA-001",

        stateType:
            "runtime",

        updatedAt:
            T0,


        student: {

            studentId:
                "STUDENT-STUDY-SCHEMA",

            grade:
                11,

            curriculum:
                "KNTT",

            target: {

                mode:
                    "HOC_SAU",

                exam:
                    "THPT",

                subject:
                    "Biology"
            }
        },


        learning: {

            currentMode:
                "HOC_SAU",

            session: {

                sessionId:
                    "SESSION-PRE",

                startedAt:
                    T0,

                lastActivityAt:
                    T0,

                timeBudgetMinutes:
                    60,

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
                    "C09",

                lessonId:
                    null,

                nodeId:
                    null,

                action:
                    null,

                contextId:
                    "CTX-K283-SCHEMA"
            }
        },


        knowledge: {},


        metaSkills: {},


        failurePatterns: {

            active: []
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

            recentActions: [],

            recentQuestions: []
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

            clusters: {}
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
 * INITIAL ADAPTIVE DECISION
 * ============================================================
 *
 * Same canonical fixture shape already proven by
 * studyLoop.integration.test.js.
 */

function createInitialDecision() {

    return {

        decisionId:
            "DECISION-STUDY-SCHEMA-INITIAL",

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
 * ============================================================
 * SESSION FACTORY
 * ============================================================
 */

function createSession() {

    return createStudySession({

        sessionId:
            "SESSION-STUDY-SCHEMA-001",

        studentState:
            createInitialStudentState(),

        initialDecision:
            createInitialDecision(),

        questionBanks,

        knowledgeMap,

        masteryRules,
        evidenceModel,

        adaptiveRules,
        adaptivePaths,

        failureSignatures,
        remediationRules,

        learningMode:
            "HOC_SAU",

        timeBudget:
            60,

        clusterId:
            "C09",

        contextId:
            "CTX-K283-SCHEMA",

        now:
            T0
    });
}


/**
 * ============================================================
 * QUESTION HELPERS
 * ============================================================
 */

function getCorrectOptionId(
    question
) {

    const option =
        question
            ?.content
            ?.options
            ?.find(
                item =>
                    item.isCorrect ===
                    true
            );


    assert.ok(
        option,
        `${question?.id} must contain a correct option.`
    );


    return option.id;
}


/**
 * ============================================================
 * VALIDATION HELPER
 * ============================================================
 *
 * Keep all validator-report assertions here so if the
 * validator reports an error, the test output immediately
 * shows the complete issue list.
 */

function assertValidStudentState(
    state,
    label
) {

    const report =
        validateStudentState(
            state
        );


    if (!report.valid) {

        console.error(
            `\n${label} INVALID STUDENT STATE`
        );

        console.dir(
            report,
            {
                depth:
                    null
            }
        );
    }


    assert.equal(
        report.valid,
        true,
        `${label} must satisfy Student State V1.2.0`
    );


    assert.equal(
        report.summary.errorCount,
        0,
        `${label} must contain zero validation errors`
    );


    return report;
}


/**
 * ============================================================
 * SUBMIT ONE CORRECT ATTEMPT
 * ============================================================
 */

function runCorrectAttempt({

    session,

    index

}) {

    const time =
        TIMES[index];


    assert.ok(
        time,
        `Missing test time for attempt index ${index}`
    );


    const selectionResult =
        getNextQuestion({

            session,

            now:
                time.start
        });


    assert.equal(
        selectionResult
            .selection
            .status,
        "SELECTED",
        `Attempt #${index + 1} requires a selected question`
    );


    const selectedSession =
        selectionResult.session;


    const question =
        selectedSession
            .currentQuestion;


    assert.ok(
        question,
        `Attempt #${index + 1} requires currentQuestion`
    );


    const result =
        submitAnswer({

            session:
                selectedSession,

            response:
                getCorrectOptionId(
                    question
                ),

            attemptId:
                `ATTEMPT-SCHEMA-${String(
                    index + 1
                ).padStart(
                    3,
                    "0"
                )}`,

            startedAt:
                time.start,

            submittedAt:
                time.end,

            timing: {

                timeSpentSeconds:
                    30
            },

            now:
                time.end
        });


    return result;
}


/**
 * ============================================================
 * 1. INITIAL FIXTURE
 * ============================================================
 */

test(
    "1. initial Student State fixture satisfies V1.2.0",
    () => {

        const state =
            createInitialStudentState();


        assertValidStudentState(
            state,
            "Initial fixture"
        );
    }
);


/**
 * ============================================================
 * 2. SESSION START
 * ============================================================
 *
 * createStudySession() already performs a runtime projection:
 *
 * - sessionId
 * - timestamps
 * - learning.current
 * - learningMode
 *
 * Therefore the projected state must still satisfy schema.
 */

test(
    "2. Student State remains schema-valid after session start projection",
    () => {

        const session =
            createSession();


        assertValidStudentState(
            session.state,
            "After session start"
        );
    }
);


/**
 * ============================================================
 * 3. FIRST COMMIT
 * ============================================================
 */

test(
    "3. Student State remains schema-valid after Attempt #1 commit",
    () => {

        let session =
            createSession();


        const result =
            runCorrectAttempt({

                session,

                index:
                    0
            });


        session =
            result.session;


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            1
        );


        assertValidStudentState(
            session.state,
            "After Attempt #1"
        );
    }
);


/**
 * ============================================================
 * 4. SECOND COMMIT
 * ============================================================
 */

test(
    "4. Student State remains schema-valid after Attempt #2 commit",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        assertValidStudentState(
            session.state,
            "After Attempt #1"
        );


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                1
        }));


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            2
        );


        assertValidStudentState(
            session.state,
            "After Attempt #2"
        );
    }
);


/**
 * ============================================================
 * 5. THREE-COMMIT CHAIN
 * ============================================================
 *
 * This is the main schema gate.
 *
 * We validate after EVERY commit rather than only validating
 * the final snapshot.
 */

test(
    "5. Student State remains schema-valid through three consecutive commits",
    () => {

        let session =
            createSession();


        for (
            let index = 0;
            index < 3;
            index += 1
        ) {

            const result =
                runCorrectAttempt({

                    session,

                    index
                });


            session =
                result.session;


            assert.equal(
                session
                    .state
                    .knowledge
                    .K283
                    .attemptStats
                    .total,
                index + 1,
                `Attempt #${index + 1} must accumulate state`
            );


            assertValidStudentState(
                session.state,
                `After Attempt #${index + 1}`
            );
        }


        assert.equal(
            session.attempts.length,
            3
        );


        assert.equal(
            session.history.length,
            3
        );
    }
);


/**
 * ============================================================
 * 6. KNOWLEDGE PROJECTION SHAPE
 * ============================================================
 *
 * LearningFlow projection contains runtime fields that do not
 * all belong directly in Student State knowledgeState.
 *
 * This test verifies that StudySession performs the boundary
 * projection rather than blindly assigning nodeState.
 */

test(
    "6. committed K283 knowledgeState contains only Student State projection fields",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        const nodeState =
            session
                .state
                .knowledge
                .K283;


        assert.ok(
            nodeState
        );


        assert.equal(
            "contextIds" in
            nodeState.evidenceSufficiency,
            false
        );


        assert.equal(
            "questionTypes" in
            nodeState.evidenceSufficiency,
            false
        );


        assert.ok(
            "distinctQuestionTypes" in
            nodeState.evidenceSufficiency
        );


        assert.ok(
            Array.isArray(
                nodeState
                    .evidenceSufficiency
                    .observedEvidenceTypes
            )
        );


        assertValidStudentState(
            session.state,
            "Knowledge projection"
        );
    }
);


/**
 * ============================================================
 * 7. REQUIRED KNOWLEDGE STATE FIELDS
 * ============================================================
 */

test(
    "7. committed K283 contains required Student State knowledge fields",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        const node =
            session
                .state
                .knowledge
                .K283;


        const requiredFields = [

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
        ];


        for (
            const field of
            requiredFields
        ) {

            assert.equal(
                Object.hasOwn(
                    node,
                    field
                ),
                true,
                `K283 knowledgeState must contain ${field}`
            );
        }


        assertValidStudentState(
            session.state,
            "Required knowledge fields"
        );
    }
);


/**
 * ============================================================
 * 8. EVIDENCE SUFFICIENCY V1.2.0
 * ============================================================
 *
 * Regression test for the field added before StudySession:
 *
 * distinctQuestionTypes
 */

test(
    "8. evidenceSufficiency persists distinctQuestionTypes across commits",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        const first =
            session
                .state
                .knowledge
                .K283
                .evidenceSufficiency;


        assert.equal(
            Number.isInteger(
                first
                    .distinctQuestionTypes
            ),
            true
        );


        assert.ok(
            first
                .distinctQuestionTypes >=
            0
        );


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                1
        }));


        const second =
            session
                .state
                .knowledge
                .K283
                .evidenceSufficiency;


        assert.equal(
            Number.isInteger(
                second
                    .distinctQuestionTypes
            ),
            true
        );


        assert.ok(
            second
                .distinctQuestionTypes >=
            first
                .distinctQuestionTypes
        );


        assertValidStudentState(
            session.state,
            "Evidence sufficiency"
        );
    }
);


/**
 * ============================================================
 * 9. ADAPTIVE PROJECTION
 * ============================================================
 */

test(
    "9. AdaptiveDecision projection remains valid inside Student State",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        assert.ok(
            session
                .state
                .adaptive
                .lastDecision
        );


        assert.ok(
            session
                .state
                .adaptive
                .nextAction
        );


        assert.equal(
            session
                .state
                .adaptive
                .lastDecision
                .action,
            session
                .currentDecision
                .action
        );


        assert.equal(
            session
                .state
                .adaptive
                .nextAction
                .action,
            session
                .currentDecision
                .action
        );


        assertValidStudentState(
            session.state,
            "Adaptive projection"
        );
    }
);


/**
 * ============================================================
 * 10. HISTORY PROJECTION
 * ============================================================
 */

test(
    "10. Student State history remains valid after multiple commits",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                1
        }));


        assert.equal(
            session
                .state
                .history
                .recentActions
                .length,
            2
        );


        assert.equal(
            session
                .state
                .history
                .recentQuestions
                .length,
            2
        );


        assertValidStudentState(
            session.state,
            "History projection"
        );
    }
);


/**
 * ============================================================
 * 11. SESSION RUNTIME PROJECTION
 * ============================================================
 */

test(
    "11. learning.session projection remains valid after commits",
    () => {

        let session =
            createSession();


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                0
        }));


        ({
            session
        } = runCorrectAttempt({

            session,

            index:
                1
        }));


        const runtime =
            session
                .state
                .learning
                .session;


        assert.equal(
            runtime.sessionId,
            "SESSION-STUDY-SCHEMA-001"
        );


        assert.equal(
            runtime.timeUsedMinutes,
            2
        );


        assert.equal(
            runtime.lastActivityAt,
            TIMES[1].end
        );


        assertValidStudentState(
            session.state,
            "Session runtime projection"
        );
    }
);


/**
 * ============================================================
 * 12. FINAL FULL SNAPSHOT
 * ============================================================
 *
 * Final gate:
 *
 * after three real questions through the entire StudySession
 * stack, the complete runtime Student State must remain valid.
 */

test(
    "12. final three-attempt StudySession snapshot satisfies Student State V1.2.0",
    () => {

        let session =
            createSession();


        for (
            let index = 0;
            index < 3;
            index += 1
        ) {

            ({
                session
            } = runCorrectAttempt({

                session,

                index
            }));
        }


        const report =
            assertValidStudentState(
                session.state,
                "Final StudySession snapshot"
            );


        assert.equal(
            report.valid,
            true
        );


        assert.equal(
            report.summary.errorCount,
            0
        );


        assert.equal(
            session
                .state
                .knowledge
                .K283
                .attemptStats
                .total,
            3
        );


        assert.equal(
            session.attempts.length,
            3
        );


        assert.equal(
            session.history.length,
            3
        );
    }
);