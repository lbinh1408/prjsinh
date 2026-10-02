/**
 * attemptBuilder.test.js
 *
 * Unit tests for AttemptBuilder V1.0.1
 *
 * Run:
 *   node --test attemptBuilder.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
    buildAttempt,
    ATTEMPT_BUILDER_INFO
} from "./attemptBuilder.js";


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const STARTED_AT =
    "2026-10-01T07:00:00.000Z";

const SUBMITTED_AT =
    "2026-10-01T07:00:30.000Z";


function createQuestion(
    overrides = {}
) {

    const base = {

        id:
            "Q-A-K283-A-001",

        version:
            "1.0.0",

        nodes: [
            "K283"
        ],

        primaryNode:
            "K283",

        secondaryNodes: [
            "K282"
        ],

        evidence:
            "apply",

        difficulty:
            "D3",

        questionType:
            "mcq",

        mode: [
            "practice"
        ],

        prerequisites: [
            "K282"
        ],

        skills: [
            "S008"
        ],

        content: {

            stem:
                "Một câu hỏi kiểm thử.",

            context:
                null,

            options: [
                {
                    id: "A",
                    text: "10%",
                    isCorrect: false
                },
                {
                    id: "B",
                    text: "20%",
                    isCorrect: true
                },
                {
                    id: "C",
                    text: "30%",
                    isCorrect: false
                },
                {
                    id: "D",
                    text: "40%",
                    isCorrect: false
                }
            ]
        },

        answer: {
            type:
                "single",

            value:
                "B"
        },

        scoring: {
            maxScore:
                1,

            partialCredit:
                false,

            rubric:
                null
        }
    };


    return {
        ...base,
        ...overrides
    };
}


function createEvaluation(
    overrides = {}
) {

    const base = {

        evaluator: {
            name:
                "AnswerEvaluator",

            version:
                "1.0.0"
        },

        questionId:
            "Q-A-K283-A-001",

        questionType:
            "mcq",

        answerType:
            "single",

        result:
            "correct",

        correct:
            true,

        response: {
            value:
                "B"
        },

        score: {
            earned:
                1,

            max:
                1,

            normalized:
                1
        }
    };


    return {
        ...base,
        ...overrides
    };
}


function createContext(
    overrides = {}
) {

    return {

        learningMode:
            "HOC_SAU",

        action:
            "PRACTICE",

        pathStage:
            "PRACTICE",

        decisionId:
            "DECISION-001",

        clusterId:
            "C09",

        ...overrides
    };
}


function createBuildInput(
    overrides = {}
) {

    return {

        attemptId:
            "ATTEMPT-001",

        studentId:
            "STUDENT-001",

        sessionId:
            "SESSION-001",

        question:
            createQuestion(),

        evaluation:
            createEvaluation(),

        startedAt:
            STARTED_AT,

        submittedAt:
            SUBMITTED_AT,

        attemptNumber:
            1,

        context:
            createContext(),

        ...overrides
    };
}


/**
 * =========================================================
 * 1. METADATA
 * =========================================================
 */

test(
    "1. exposes AttemptBuilder V1.0.1 metadata",
    () => {

        assert.deepEqual(
            ATTEMPT_BUILDER_INFO,
            {
                name:
                    "AttemptBuilder",

                version:
                    "1.0.1",

                schemaVersion:
                    "1.0.0"
            }
        );
    }
);


/**
 * =========================================================
 * 2. MINIMAL ATTEMPT
 * =========================================================
 */

test(
    "2. builds canonical minimal Attempt",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.equal(
            attempt.schemaVersion,
            "1.0.0"
        );

        assert.equal(
            attempt.attemptId,
            "ATTEMPT-001"
        );

        assert.equal(
            attempt.studentId,
            "STUDENT-001"
        );

        assert.equal(
            attempt.sessionId,
            "SESSION-001"
        );

        assert.equal(
            attempt.questionId,
            "Q-A-K283-A-001"
        );

        assert.equal(
            attempt.attemptNumber,
            1
        );
    }
);


/**
 * =========================================================
 * 3. CORRECT
 * =========================================================
 */

test(
    "3. maps evaluator correct to Attempt correct",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.equal(
            attempt.result,
            "correct"
        );

        assert.equal(
            attempt.score,
            1
        );
    }
);


/**
 * =========================================================
 * 4. WRONG -> INCORRECT
 * =========================================================
 */

test(
    "4. maps evaluator wrong to Attempt incorrect",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "wrong",

                correct:
                    false,

                response: {
                    value:
                        "A"
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "incorrect"
        );

        assert.equal(
            attempt.score,
            0
        );

        assert.equal(
            attempt.response.value,
            "A"
        );
    }
);


/**
 * =========================================================
 * 5. PARTIAL
 * =========================================================
 */

test(
    "5. maps evaluator partial to Attempt partial",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "partial",

                correct:
                    false,

                score: {
                    earned:
                        0.5,

                    max:
                        1,

                    normalized:
                        0.5
                }
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "partial"
        );

        assert.equal(
            attempt.score,
            0.5
        );
    }
);


/**
 * =========================================================
 * 6. SKIPPED
 * =========================================================
 */

test(
    "6. maps evaluator skipped to Attempt skipped",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "skipped",

                correct:
                    false,

                response: {
                    value:
                        null
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.result,
            "skipped"
        );

        assert.equal(
            attempt.score,
            0
        );

        assert.equal(
            attempt.response.value,
            null
        );
    }
);


/**
 * =========================================================
 * 7. RESPONSE
 * =========================================================
 */

test(
    "7. maps evaluator response to canonical singleChoice response",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            attempt.response,
            {
                type:
                    "singleChoice",

                value:
                    "B",

                normalizedValue:
                    "B"
            }
        );
    }
);


/**
 * =========================================================
 * 8. NORMALIZED SCORE
 * =========================================================
 */

test(
    "8. Attempt score uses evaluation.score.normalized",
    () => {

        const evaluation =
            createEvaluation({

                score: {
                    earned:
                        2,

                    max:
                        4,

                    normalized:
                        0.5
                }
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    evaluation
                })
            );


        assert.equal(
            attempt.score,
            0.5
        );
    }
);


/**
 * =========================================================
 * 9. TIMESTAMPS
 * =========================================================
 */

test(
    "9. normalizes timestamps to ISO date-time",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    startedAt:
                        "2026-10-01T14:00:00+07:00",

                    submittedAt:
                        "2026-10-01T14:00:30+07:00"
                })
            );


        assert.equal(
            attempt.startedAt,
            "2026-10-01T07:00:00.000Z"
        );

        assert.equal(
            attempt.submittedAt,
            "2026-10-01T07:00:30.000Z"
        );
    }
);


/**
 * =========================================================
 * 10. DERIVED TIMING
 * =========================================================
 */

test(
    "10. derives timeSpentSeconds when timing is omitted",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            attempt.timing,
            {
                timeSpentSeconds:
                    30
            }
        );
    }
);


/**
 * =========================================================
 * 11. EXPLICIT TIMING
 * =========================================================
 */

test(
    "11. preserves explicit timing",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    timing: {
                        timeSpentSeconds:
                            30,

                        activeTimeSeconds:
                            25,

                        pausedTimeSeconds:
                            5
                    }
                })
            );


        assert.deepEqual(
            attempt.timing,
            {
                timeSpentSeconds:
                    30,

                activeTimeSeconds:
                    25,

                pausedTimeSeconds:
                    5
            }
        );
    }
);


/**
 * =========================================================
 * 12. DEFAULT HINT
 * =========================================================
 */

test(
    "12. defaults to no hint",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            attempt.hint,
            {
                used:
                    false,

                count:
                    0
            }
        );
    }
);


/**
 * =========================================================
 * 13. HINT
 * =========================================================
 */

test(
    "13. records valid used hint",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    hint: {
                        used:
                            true,

                        level:
                            2,

                        count:
                            2
                    }
                })
            );


        assert.deepEqual(
            attempt.hint,
            {
                used:
                    true,

                count:
                    2,

                level:
                    2
            }
        );
    }
);


/**
 * =========================================================
 * 14. CONTEXT
 * =========================================================
 */

test(
    "14. builds canonical learning context",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.equal(
            attempt.context.learningMode,
            "HOC_SAU"
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
            attempt.context.nodeId,
            "K283"
        );

        assert.equal(
            attempt.context.decisionId,
            "DECISION-001"
        );

        assert.equal(
            attempt.context.clusterId,
            "C09"
        );
    }
);


/**
 * =========================================================
 * 15. SECONDARY NODES / SKILLS
 * =========================================================
 */

test(
    "15. projects secondary nodes and skills into context",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            attempt.context.secondaryNodeIds,
            [
                "K282"
            ]
        );

        assert.deepEqual(
            attempt.context.metaSkillIds,
            [
                "S008"
            ]
        );
    }
);


/**
 * =========================================================
 * 16. CONTEXT OVERRIDE
 * =========================================================
 */

test(
    "16. explicit secondary/meta context overrides question defaults",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    context:
                        createContext({

                            secondaryNodeIds: [
                                "K281"
                            ],

                            metaSkillIds: [
                                "S009"
                            ]
                        })
                })
            );


        assert.deepEqual(
            attempt.context.secondaryNodeIds,
            [
                "K281"
            ]
        );

        assert.deepEqual(
            attempt.context.metaSkillIds,
            [
                "S009"
            ]
        );
    }
);


/**
 * =========================================================
 * 17. APPLY EVIDENCE
 * =========================================================
 */

test(
    "17. builds canonical apply evidence",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            attempt.evidence,
            {
                difficulty:
                    "D3",

                primaryDimension:
                    "apply",

                independence:
                    "independent"
            }
        );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                attempt.evidence,
                "questionType"
            ),
            false
        );
    }
);


/**
 * =========================================================
 * 18. KNOW EVIDENCE
 * =========================================================
 */

test(
    "18. preserves know as primary evidence dimension",
    () => {

        const question =
            createQuestion({

                evidence:
                    "know",

                difficulty:
                    "D1"
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "know"
        );

        assert.equal(
            attempt.evidence.difficulty,
            "D1"
        );
    }
);


/**
 * =========================================================
 * 19. EXPLAIN EVIDENCE
 * =========================================================
 */

test(
    "19. preserves explain as primary evidence dimension",
    () => {

        const question =
            createQuestion({

                evidence:
                    "explain",

                difficulty:
                    "D2"
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "explain"
        );

        assert.equal(
            attempt.evidence.difficulty,
            "D2"
        );
    }
);


/**
 * =========================================================
 * 20. TRANSFER EVIDENCE
 * =========================================================
 */

test(
    "20. preserves transfer as primary evidence dimension",
    () => {

        const question =
            createQuestion({

                evidence:
                    "transfer",

                difficulty:
                    "D4"
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    question
                })
            );


        assert.equal(
            attempt.evidence.primaryDimension,
            "transfer"
        );

        assert.equal(
            attempt.evidence.difficulty,
            "D4"
        );
    }
);


/**
 * =========================================================
 * 21. HINT ASSISTED
 * =========================================================
 */

test(
    "21. hint use produces hint_assisted evidence",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    hint: {
                        used:
                            true,

                        count:
                            1
                    }
                })
            );


        assert.equal(
            attempt.evidence.independence,
            "hint_assisted"
        );
    }
);


/**
 * =========================================================
 * 22. RETRY ASSISTED
 * =========================================================
 */

test(
    "22. attemptNumber > 1 produces retry_assisted evidence",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({
                    attemptNumber:
                        2
                })
            );


        assert.equal(
            attempt.evidence.independence,
            "retry_assisted"
        );
    }
);


/**
 * =========================================================
 * 23. HINT PRECEDENCE
 * =========================================================
 */

test(
    "23. hint assistance takes precedence over retry assistance",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    attemptNumber:
                        2,

                    hint: {
                        used:
                            true,

                        count:
                            1
                    }
                })
            );


        assert.equal(
            attempt.evidence.independence,
            "hint_assisted"
        );
    }
);


/**
 * =========================================================
 * 24. FAILURE TYPE
 * =========================================================
 */

test(
    "24. records canonical diagnostic failureType",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    diagnostic: {

                        failureType:
                            "calculation_error",

                        sourceNodeId:
                            "K283",

                        metaSkillId:
                            "S008",

                        confidence:
                            0.9,

                        evidence:
                            "Student used the wrong calculation."
                    }
                })
            );


        assert.deepEqual(
            attempt.diagnostic,
            {
                failureType:
                    "calculation_error",

                sourceNodeId:
                    "K283",

                metaSkillId:
                    "S008",

                confidence:
                    0.9,

                evidence:
                    "Student used the wrong calculation."
            }
        );
    }
);


/**
 * =========================================================
 * 25. FAILURE SIGNATURE ID
 * =========================================================
 */

test(
    "25. records canonical failureSignatureId reference",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    diagnostic: {

                        failureSignatureId:
                            "FS-CALC-001",

                        failureType:
                            "calculation_error"
                    }
                })
            );


        assert.deepEqual(
            attempt.diagnostic,
            {
                failureSignatureId:
                    "FS-CALC-001",

                failureType:
                    "calculation_error"
            }
        );
    }
);


/**
 * =========================================================
 * 26. NO DIAGNOSTIC INVENTION
 * =========================================================
 */

test(
    "26. builder does not invent diagnostic data for wrong answer",
    () => {

        const evaluation =
            createEvaluation({

                result:
                    "wrong",

                correct:
                    false,

                response: {
                    value:
                        "A"
                },

                score: {
                    earned:
                        0,

                    max:
                        1,

                    normalized:
                        0
                }
            });


        const attempt =
            buildAttempt(
                createBuildInput({
                    evaluation
                })
            );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                attempt,
                "diagnostic"
            ),
            false
        );
    }
);


/**
 * =========================================================
 * 27. RETRY
 * =========================================================
 */

test(
    "27. records valid retry metadata",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    attemptNumber:
                        2,

                    retry: {
                        isRetry:
                            true,

                        previousAttemptId:
                            "ATTEMPT-000",

                        retryNumber:
                            1
                    }
                })
            );


        assert.deepEqual(
            attempt.retry,
            {
                isRetry:
                    true,

                previousAttemptId:
                    "ATTEMPT-000",

                retryNumber:
                    1
            }
        );
    }
);


/**
 * =========================================================
 * 28. RETRY SEMANTIC GUARD
 * =========================================================
 */

test(
    "28. retry.isRetry=true requires attemptNumber > 1",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        attemptNumber:
                            1,

                        retry: {
                            isRetry:
                                true,

                            retryNumber:
                                1
                        }
                    })
                );
            },

            /attemptNumber > 1/
        );
    }
);


/**
 * =========================================================
 * 29. FEEDBACK
 * =========================================================
 */

test(
    "29. records optional feedback",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    feedback: {
                        shown:
                            true,

                        type:
                            "correct"
                    }
                })
            );


        assert.deepEqual(
            attempt.feedback,
            {
                shown:
                    true,

                type:
                    "correct"
            }
        );
    }
);


/**
 * =========================================================
 * 30. UI
 * =========================================================
 */

test(
    "30. records optional UI metadata",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    ui: {
                        device:
                            "desktop",

                        inputMethod:
                            "mouse"
                    }
                })
            );


        assert.deepEqual(
            attempt.ui,
            {
                device:
                    "desktop",

                inputMethod:
                    "mouse"
            }
        );
    }
);


/**
 * =========================================================
 * 31. METADATA
 * =========================================================
 */

test(
    "31. records question and runtime metadata",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    metadata: {

                        engineVersion:
                            "study-runtime-1.0.0",

                        validatorVersion:
                            "1.0.0"
                    }
                })
            );


        assert.deepEqual(
            attempt.metadata,
            {
                questionVersion:
                    "1.0.0",

                engineVersion:
                    "study-runtime-1.0.0",

                validatorVersion:
                    "1.0.0"
            }
        );
    }
);


/**
 * =========================================================
 * 32. QUESTION / EVALUATION MISMATCH
 * =========================================================
 */

test(
    "32. rejects evaluation belonging to another question",
    () => {

        const evaluation =
            createEvaluation({
                questionId:
                    "Q-A-K999-A-999"
            });


        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        evaluation
                    })
                );
            },

            /does not match question.id/
        );
    }
);


/**
 * =========================================================
 * 33. SCORE > 1
 * =========================================================
 */

test(
    "33. rejects normalized score above 1",
    () => {

        const evaluation =
            createEvaluation({

                score: {
                    earned:
                        2,

                    max:
                        1,

                    normalized:
                        2
                }
            });


        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        evaluation
                    })
                );
            },

            /between 0 and 1/
        );
    }
);


/**
 * =========================================================
 * 34. SCORE < 0
 * =========================================================
 */

test(
    "34. rejects negative normalized score",
    () => {

        const evaluation =
            createEvaluation({

                score: {
                    earned:
                        -1,

                    max:
                        1,

                    normalized:
                        -1
                }
            });


        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        evaluation
                    })
                );
            },

            /between 0 and 1/
        );
    }
);


/**
 * =========================================================
 * 35. INVALID RESULT
 * =========================================================
 */

test(
    "35. rejects unsupported evaluation result",
    () => {

        const evaluation =
            createEvaluation({
                result:
                    "almost_correct"
            });


        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        evaluation
                    })
                );
            },

            /Unsupported evaluation result/
        );
    }
);


/**
 * =========================================================
 * 36. INVALID LEARNING MODE
 * =========================================================
 */

test(
    "36. rejects invalid learningMode",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        context:
                            createContext({
                                learningMode:
                                    "INVALID_MODE"
                            })
                    })
                );
            },

            /Invalid learningMode/
        );
    }
);


/**
 * =========================================================
 * 37. INVALID ACTION
 * =========================================================
 */

test(
    "37. rejects internal stage as primary Adaptive action",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        context:
                            createContext({
                                action:
                                    "MINI_PROBE"
                            })
                    })
                );
            },

            /Invalid action/
        );
    }
);


/**
 * =========================================================
 * 38. MINI PROBE
 * =========================================================
 */

test(
    "38. accepts REMEDIATE with MINI_PROBE pathStage",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    context:
                        createContext({

                            action:
                                "REMEDIATE",

                            pathStage:
                                "MINI_PROBE"
                        })
                })
            );


        assert.equal(
            attempt.context.action,
            "REMEDIATE"
        );

        assert.equal(
            attempt.context.pathStage,
            "MINI_PROBE"
        );
    }
);


/**
 * =========================================================
 * 39. INVALID PATH STAGE
 * =========================================================
 */

test(
    "39. rejects invalid pathStage",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        context:
                            createContext({
                                pathStage:
                                    "SOMETHING_NEW"
                            })
                    })
                );
            },

            /Invalid pathStage/
        );
    }
);


/**
 * =========================================================
 * 40. CHRONOLOGY
 * =========================================================
 */

test(
    "40. rejects submittedAt earlier than startedAt",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        startedAt:
                            "2026-10-01T07:01:00.000Z",

                        submittedAt:
                            "2026-10-01T07:00:00.000Z"
                    })
                );
            },

            /submittedAt cannot be earlier/
        );
    }
);


/**
 * =========================================================
 * 41. ATTEMPT NUMBER
 * =========================================================
 */

test(
    "41. rejects attemptNumber below 1",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        attemptNumber:
                            0
                    })
                );
            },

            /positive integer/
        );
    }
);


/**
 * =========================================================
 * 42. HINT COUNT MAX
 * =========================================================
 */

test(
    "42. rejects hint count above canonical maximum 2",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        hint: {
                            used:
                                true,

                            count:
                                3
                        }
                    })
                );
            },

            /hint.count/
        );
    }
);


/**
 * =========================================================
 * 43. HINT LEVEL MAX
 * =========================================================
 */

test(
    "43. rejects hint level above canonical maximum 2",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        hint: {
                            used:
                                true,

                            count:
                                1,

                            level:
                                3
                        }
                    })
                );
            },

            /hint.level/
        );
    }
);


/**
 * =========================================================
 * 44. INVALID FAILURE TYPE
 * =========================================================
 */

test(
    "44. rejects non-canonical failureType",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        diagnostic: {
                            failureType:
                                "random_failure"
                        }
                    })
                );
            },

            /Invalid failureType/
        );
    }
);


/**
 * =========================================================
 * 45. UNSUPPORTED QUESTION TYPE
 * =========================================================
 */

test(
    "45. V1 rejects unsupported non-MCQ question",
    () => {

        const question =
            createQuestion({
                questionType:
                    "numeric"
            });


        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({
                        question
                    })
                );
            },

            /does not support/
        );
    }
);


/**
 * =========================================================
 * 46. NODE SOURCE OF TRUTH
 * =========================================================
 */

test(
    "46. context.nodeId comes from question.primaryNode",
    () => {

        const question =
            createQuestion({

                id:
                    "Q-A-K282-A-001",

                nodes: [
                    "K282"
                ],

                primaryNode:
                    "K282"
            });


        const evaluation =
            createEvaluation({
                questionId:
                    "Q-A-K282-A-001"
            });


        const attempt =
            buildAttempt(
                createBuildInput({

                    question,
                    evaluation,

                    context:
                        createContext({
                            nodeId:
                                "K999"
                        })
                })
            );


        assert.equal(
            attempt.context.nodeId,
            "K282"
        );
    }
);


/**
 * =========================================================
 * 47. UNIQUE SECONDARY NODES
 * =========================================================
 */

test(
    "47. removes duplicate secondary node ids",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    context:
                        createContext({

                            secondaryNodeIds: [
                                "K281",
                                "K281",
                                "K282"
                            ]
                        })
                })
            );


        assert.deepEqual(
            attempt.context.secondaryNodeIds,
            [
                "K281",
                "K282"
            ]
        );
    }
);


/**
 * =========================================================
 * 48. UNIQUE META SKILLS
 * =========================================================
 */

test(
    "48. removes duplicate meta skill ids",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    context:
                        createContext({

                            metaSkillIds: [
                                "S008",
                                "S008",
                                "S009"
                            ]
                        })
                })
            );


        assert.deepEqual(
            attempt.context.metaSkillIds,
            [
                "S008",
                "S009"
            ]
        );
    }
);


/**
 * =========================================================
 * 49. NO MUTATION — QUESTION
 * =========================================================
 */

test(
    "49. does not mutate Question",
    () => {

        const question =
            createQuestion();

        const before =
            structuredClone(
                question
            );


        buildAttempt(
            createBuildInput({
                question
            })
        );


        assert.deepEqual(
            question,
            before
        );
    }
);


/**
 * =========================================================
 * 50. NO MUTATION — EVALUATION
 * =========================================================
 */

test(
    "50. does not mutate AnswerEvaluation",
    () => {

        const evaluation =
            createEvaluation();

        const before =
            structuredClone(
                evaluation
            );


        buildAttempt(
            createBuildInput({
                evaluation
            })
        );


        assert.deepEqual(
            evaluation,
            before
        );
    }
);


/**
 * =========================================================
 * 51. NO MUTATION — CONTEXT
 * =========================================================
 */

test(
    "51. does not mutate context",
    () => {

        const context =
            createContext({

                secondaryNodeIds: [
                    "K281",
                    "K281"
                ]
            });


        const before =
            structuredClone(
                context
            );


        buildAttempt(
            createBuildInput({
                context
            })
        );


        assert.deepEqual(
            context,
            before
        );
    }
);


/**
 * =========================================================
 * 52. HINT SEMANTIC CONSISTENCY
 * =========================================================
 */

test(
    "52. rejects hint.used=false with positive count",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        hint: {
                            used:
                                false,

                            count:
                                1
                        }
                    })
                );
            },

            /hint.used=false requires hint.count=0/
        );
    }
);


/**
 * =========================================================
 * 53. HINT LEVEL REQUIRES USE
 * =========================================================
 */

test(
    "53. rejects hint.level when hint was not used",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        hint: {
                            used:
                                false,

                            count:
                                0,

                            level:
                                1
                        }
                    })
                );
            },

            /hint.level requires hint.used=true/
        );
    }
);


/**
 * =========================================================
 * 54. RETRY NUMBER MAX
 * =========================================================
 */

test(
    "54. rejects retryNumber above canonical maximum 2",
    () => {

        assert.throws(
            () => {

                buildAttempt(
                    createBuildInput({

                        attemptNumber:
                            2,

                        retry: {
                            isRetry:
                                true,

                            retryNumber:
                                3
                        }
                    })
                );
            },

            /retry.retryNumber/
        );
    }
);


/**
 * =========================================================
 * 55. BUILDER DOES NOT ACCEPT LEGACY failureSignature
 * =========================================================
 */

test(
    "55. legacy failureSignature is not projected into diagnostic",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput({

                    diagnostic: {

                        failureSignature:
                            "calculation_error"
                    }
                })
            );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                attempt,
                "diagnostic"
            ),
            false
        );
    }
);


/**
 * =========================================================
 * 56. EVIDENCE HAS NO LEGACY QUESTION TYPE
 * =========================================================
 */

test(
    "56. Attempt evidence does not duplicate questionType classification",
    () => {

        const attempt =
            buildAttempt(
                createBuildInput()
            );


        assert.deepEqual(
            Object.keys(
                attempt.evidence
            ).sort(),
            [
                "difficulty",
                "independence",
                "primaryDimension"
            ].sort()
        );
    }
);