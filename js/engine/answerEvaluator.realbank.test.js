/**
 * answerEvaluator.realbank.test.js
 *
 * Real-bank integration tests for:
 *   AnswerEvaluator V1.0.0
 *
 * Uses REAL C09 question banks:
 *   K281
 *   K282
 *   K283
 *   K284
 *
 * Run:
 *   node --test answerEvaluator.realbank.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    evaluateAnswer
} from "./answerEvaluator.js";


/**
 * =========================================================
 * PATH / JSON LOADER
 * =========================================================
 */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


function loadJson(fileName) {
    const filePath =
        path.join(
            __dirname,
            "../../data/questions/c09",
            fileName
        );

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
}


/**
 * =========================================================
 * REAL QUESTION BANKS
 * =========================================================
 */

const K281_BANK =
    loadJson(
        "K281.question-bank.json"
    );

const K282_BANK =
    loadJson(
        "K282.question-bank.json"
    );

const K283_BANK =
    loadJson(
        "K283.question-bank.json"
    );

const K284_BANK =
    loadJson(
        "K284.question-bank.json"
    );


const REAL_BANKS = [
    K281_BANK,
    K282_BANK,
    K283_BANK,
    K284_BANK
];


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getQuestion(
    bank,
    questionId
) {
    const question =
        bank.questions.find(
            (item) =>
                item.id === questionId
        );

    assert.ok(
        question,
        `Question '${questionId}' must exist in bank '${bank.bankId}'.`
    );

    return question;
}


function getCorrectOptionId(question) {
    /**
     * answer.value is the canonical grading source.
     */
    return question.answer.value;
}


function getWrongOptionId(question) {
    const correctValue =
        question.answer.value;

    const wrongOption =
        question.content.options.find(
            (option) =>
                option.id !== correctValue
        );

    assert.ok(
        wrongOption,
        `Question '${question.id}' must contain at least one wrong option.`
    );

    return wrongOption.id;
}


function assertCorrectEvaluation(
    evaluation,
    question
) {
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
        evaluation.response.value,
        question.answer.value
    );

    assert.equal(
        evaluation.score.earned,
        question.scoring.maxScore
    );

    assert.equal(
        evaluation.score.max,
        question.scoring.maxScore
    );

    if (
        question.scoring.maxScore > 0
    ) {
        assert.equal(
            evaluation.score.normalized,
            1
        );
    }
}


function assertWrongEvaluation(
    evaluation,
    question,
    submittedValue
) {
    assert.equal(
        evaluation.questionId,
        question.id
    );

    assert.equal(
        evaluation.result,
        "wrong"
    );

    assert.equal(
        evaluation.correct,
        false
    );

    assert.equal(
        evaluation.response.value,
        submittedValue
    );

    assert.equal(
        evaluation.score.earned,
        0
    );

    assert.equal(
        evaluation.score.max,
        question.scoring.maxScore
    );

    assert.equal(
        evaluation.score.normalized,
        0
    );
}


/**
 * =========================================================
 * 1. REAL BANK SANITY
 * =========================================================
 */

test(
    "1. loads all four real C09 question banks",
    () => {
        assert.equal(
            K281_BANK.bankId,
            "QB-C09-K281-V1"
        );

        assert.equal(
            K282_BANK.bankId,
            "QB-C09-K282-V1"
        );

        assert.equal(
            K283_BANK.bankId,
            "QB-C09-K283-V1"
        );

        assert.equal(
            K284_BANK.bankId,
            "QB-C09-K284-V1"
        );


        assert.equal(
            K281_BANK.questions.length,
            5
        );

        assert.equal(
            K282_BANK.questions.length,
            6
        );

        assert.equal(
            K283_BANK.questions.length,
            9
        );

        assert.equal(
            K284_BANK.questions.length,
            12
        );
    }
);


/**
 * =========================================================
 * 2. ALL REAL QUESTIONS ARE SUPPORTED BY V1
 * =========================================================
 */

test(
    "2. every real C09 question is single-answer MCQ supported by AnswerEvaluator V1",
    () => {
        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                assert.equal(
                    question.questionType,
                    "mcq",
                    `${question.id} must be mcq`
                );

                assert.equal(
                    question.answer.type,
                    "single",
                    `${question.id} must use answer.type=single`
                );

                assert.equal(
                    typeof question.answer.value,
                    "string",
                    `${question.id} answer.value must be a string`
                );
            }
        }
    }
);


/**
 * =========================================================
 * 3. EVERY REAL CORRECT ANSWER CAN BE EVALUATED
 * =========================================================
 */

test(
    "3. evaluator marks the canonical answer correct for every real C09 question",
    () => {
        let evaluatedCount =
            0;

        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const evaluation =
                    evaluateAnswer({
                        question,

                        response:
                            getCorrectOptionId(
                                question
                            )
                    });


                assertCorrectEvaluation(
                    evaluation,
                    question
                );


                evaluatedCount += 1;
            }
        }


        /**
         * 5 + 6 + 9 + 12
         */
        assert.equal(
            evaluatedCount,
            32
        );
    }
);


/**
 * =========================================================
 * 4. EVERY REAL QUESTION CAN PRODUCE WRONG
 * =========================================================
 */

test(
    "4. evaluator marks a non-answer option wrong for every real C09 question",
    () => {
        let evaluatedCount =
            0;

        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const wrongOptionId =
                    getWrongOptionId(
                        question
                    );


                const evaluation =
                    evaluateAnswer({
                        question,

                        response:
                            wrongOptionId
                    });


                assertWrongEvaluation(
                    evaluation,
                    question,
                    wrongOptionId
                );


                evaluatedCount += 1;
            }
        }


        assert.equal(
            evaluatedCount,
            32
        );
    }
);


/**
 * =========================================================
 * 5. EVERY REAL QUESTION CAN BE SKIPPED
 * =========================================================
 */

test(
    "5. null response produces skipped for every real C09 question",
    () => {
        let evaluatedCount =
            0;

        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const evaluation =
                    evaluateAnswer({
                        question,
                        response: null
                    });


                assert.equal(
                    evaluation.questionId,
                    question.id
                );

                assert.equal(
                    evaluation.result,
                    "skipped"
                );

                assert.equal(
                    evaluation.correct,
                    false
                );

                assert.equal(
                    evaluation.response.value,
                    null
                );

                assert.equal(
                    evaluation.score.earned,
                    0
                );


                evaluatedCount += 1;
            }
        }


        assert.equal(
            evaluatedCount,
            32
        );
    }
);


/**
 * =========================================================
 * 6. K281 REAL QUESTION
 * =========================================================
 */

test(
    "6. evaluates real K281 practice question correctly",
    () => {
        const question =
            getQuestion(
                K281_BANK,
                "Q-A-K281-A-004"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.primaryNode,
            "K281"
        );

        assert.equal(
            question.evidence,
            "apply"
        );

        assert.ok(
            question.mode.includes(
                "practice"
            )
        );
    }
);


/**
 * =========================================================
 * 7. K282 REAL QUESTION
 * =========================================================
 */

test(
    "7. evaluates real K282 D3 apply question correctly",
    () => {
        const question =
            getQuestion(
                K282_BANK,
                "Q-A-K282-A-003"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response: {
                    value:
                        question.answer.value
                }
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.primaryNode,
            "K282"
        );

        assert.equal(
            question.evidence,
            "apply"
        );

        assert.equal(
            question.difficulty,
            "D3"
        );
    }
);


/**
 * =========================================================
 * 8. K283 REAL REMEDIATION QUESTION
 * =========================================================
 */

test(
    "8. evaluates real K283 remediation question correctly",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-A-005"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response: {
                    optionId:
                        question.answer.value
                }
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.primaryNode,
            "K283"
        );

        assert.ok(
            question.mode.includes(
                "remediation"
            )
        );
    }
);


/**
 * =========================================================
 * 9. K284 REAL QUESTION
 * =========================================================
 */

test(
    "9. evaluates real K284 D3 question correctly",
    () => {
        const question =
            getQuestion(
                K284_BANK,
                "Q-A-K284-A-003"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response: {
                    selectedOptionId:
                        question.answer.value
                }
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.primaryNode,
            "K284"
        );

        assert.equal(
            question.evidence,
            "apply"
        );
    }
);


/**
 * =========================================================
 * 10. K282 REAL RETEST
 * =========================================================
 */

test(
    "10. evaluates real K282 transfer retest question",
    () => {
        const question =
            getQuestion(
                K282_BANK,
                "Q-A-K282-T-006"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "transfer"
        );

        assert.equal(
            question.difficulty,
            "D4"
        );

        assert.ok(
            question.mode.includes(
                "retest"
            )
        );
    }
);


/**
 * =========================================================
 * 11. K283 REAL APPLY RETEST
 * =========================================================
 */

test(
    "11. evaluates real K283 apply retest question",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-A-007"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "apply"
        );

        assert.equal(
            question.difficulty,
            "D3"
        );

        assert.ok(
            question.mode.includes(
                "retest"
            )
        );
    }
);


/**
 * =========================================================
 * 12. K283 REAL CHALLENGE
 * =========================================================
 */

test(
    "12. evaluates real K283 transfer challenge question",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-T-008"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "transfer"
        );

        assert.equal(
            question.difficulty,
            "D4"
        );

        assert.ok(
            question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * 13. K283 REAL TRANSFER RETEST
 * =========================================================
 */

test(
    "13. evaluates real K283 transfer retest question",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-T-009"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "transfer"
        );

        assert.equal(
            question.difficulty,
            "D4"
        );

        assert.ok(
            question.mode.includes(
                "retest"
            )
        );

        assert.ok(
            question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * 14. K284 REAL RETEST
 * =========================================================
 */

test(
    "14. evaluates real K284 apply retest question",
    () => {
        const question =
            getQuestion(
                K284_BANK,
                "Q-A-K284-A-010"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "apply"
        );

        assert.equal(
            question.difficulty,
            "D3"
        );

        assert.ok(
            question.mode.includes(
                "retest"
            )
        );
    }
);


/**
 * =========================================================
 * 15. K284 REAL TRANSFER CHALLENGE
 * =========================================================
 */

test(
    "15. evaluates real K284 transfer challenge question",
    () => {
        const question =
            getQuestion(
                K284_BANK,
                "Q-A-K284-T-011"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "transfer"
        );

        assert.equal(
            question.difficulty,
            "D4"
        );

        assert.ok(
            question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * 16. K284 REAL TRANSFER RETEST
 * =========================================================
 */

test(
    "16. evaluates real K284 transfer retest question",
    () => {
        const question =
            getQuestion(
                K284_BANK,
                "Q-A-K284-T-012"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    question.answer.value
            });


        assertCorrectEvaluation(
            evaluation,
            question
        );

        assert.equal(
            question.evidence,
            "transfer"
        );

        assert.equal(
            question.difficulty,
            "D4"
        );

        assert.ok(
            question.mode.includes(
                "retest"
            )
        );

        assert.ok(
            question.mode.includes(
                "challenge"
            )
        );
    }
);


/**
 * =========================================================
 * 17. ANSWER.VALUE EXISTS AS REAL OPTION
 * =========================================================
 */

test(
    "17. every real answer.value points to an existing option",
    () => {
        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const optionIds =
                    question.content.options.map(
                        (option) =>
                            option.id
                    );


                assert.ok(
                    optionIds.includes(
                        question.answer.value
                    ),

                    `${question.id}: answer.value '${question.answer.value}' must exist in content.options`
                );
            }
        }
    }
);


/**
 * =========================================================
 * 18. ANSWER.VALUE AGREES WITH isCorrect
 * =========================================================
 */

test(
    "18. every real answer.value agrees with the single isCorrect option",
    () => {
        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const correctOptions =
                    question.content.options.filter(
                        (option) =>
                            option.isCorrect === true
                    );


                assert.equal(
                    correctOptions.length,
                    1,

                    `${question.id} must contain exactly one isCorrect option`
                );


                assert.equal(
                    correctOptions[0].id,
                    question.answer.value,

                    `${question.id}: answer.value must agree with isCorrect`
                );
            }
        }
    }
);


/**
 * =========================================================
 * 19. REAL INVALID OPTION REJECTED
 * =========================================================
 */

test(
    "19. invalid option is rejected against a real K283 question",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-A-003"
            );


        assert.throws(
            () => {
                evaluateAnswer({
                    question,

                    response:
                        "__INVALID_OPTION__"
                });
            },

            /does not exist/
        );
    }
);


/**
 * =========================================================
 * 20. REAL SKIPPED QUESTION
 * =========================================================
 */

test(
    "20. empty response skips a real K284 question",
    () => {
        const question =
            getQuestion(
                K284_BANK,
                "Q-A-K284-A-003"
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    "   "
            });


        assert.equal(
            evaluation.result,
            "skipped"
        );

        assert.equal(
            evaluation.correct,
            false
        );

        assert.equal(
            evaluation.response.value,
            null
        );

        assert.equal(
            evaluation.score.earned,
            0
        );
    }
);


/**
 * =========================================================
 * 21. NO QUESTION MUTATION
 * =========================================================
 */

test(
    "21. evaluating real questions does not mutate the question banks",
    () => {
        const before =
            structuredClone(
                REAL_BANKS
            );


        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                evaluateAnswer({
                    question,

                    response:
                        question.answer.value
                });
            }
        }


        assert.deepEqual(
            REAL_BANKS,
            before
        );
    }
);


/**
 * =========================================================
 * 22. OUTPUT DOES NOT EXPOSE CANONICAL ANSWER
 * =========================================================
 */

test(
    "22. wrong evaluation on real question does not expose canonical answer",
    () => {
        const question =
            getQuestion(
                K283_BANK,
                "Q-A-K283-A-007"
            );


        const wrongOptionId =
            getWrongOptionId(
                question
            );


        const evaluation =
            evaluateAnswer({
                question,

                response:
                    wrongOptionId
            });


        assert.equal(
            evaluation.result,
            "wrong"
        );

        assert.deepEqual(
            evaluation.response,
            {
                value:
                    wrongOptionId
            }
        );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                evaluation,
                "correctAnswer"
            ),
            false
        );


        assert.equal(
            Object.prototype.hasOwnProperty.call(
                evaluation.response,
                "correctValue"
            ),
            false
        );
    }
);


/**
 * =========================================================
 * 23. ALL REAL MAX SCORES ARE HONORED
 * =========================================================
 */

test(
    "23. evaluator honors scoring.maxScore for every real question",
    () => {
        for (
            const bank
            of REAL_BANKS
        ) {
            for (
                const question
                of bank.questions
            ) {
                const evaluation =
                    evaluateAnswer({
                        question,

                        response:
                            question.answer.value
                    });


                assert.equal(
                    evaluation.score.max,
                    question.scoring.maxScore,
                    `${question.id}: max score mismatch`
                );


                assert.equal(
                    evaluation.score.earned,
                    question.scoring.maxScore,
                    `${question.id}: correct response must receive full score`
                );
            }
        }
    }
);


/**
 * =========================================================
 * 24. FULL REAL-BANK COUNT
 * =========================================================
 */

test(
    "24. real Study MVP contains exactly 32 evaluable C09 questions",
    () => {
        const allQuestions =
            REAL_BANKS.flatMap(
                (bank) =>
                    bank.questions
            );


        assert.equal(
            allQuestions.length,
            32
        );


        for (
            const question
            of allQuestions
        ) {
            assert.doesNotThrow(
                () => {
                    evaluateAnswer({
                        question,

                        response:
                            question.answer.value
                    });
                },

                `${question.id} should be evaluable`
            );
        }
    }
);