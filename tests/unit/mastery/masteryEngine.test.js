import test from 'node:test';
import assert from 'node:assert/strict';
import { updateMastery } from './masterEngine.js';

function createDefaultState() {
    return {
        mastery: "M0",
        status: "developing",
        evidence: { know: 0, explain: 0, apply: 0, transfer: 0 },
        overallEvidence: 0,
        confidence: { level: "low", score: 0, attemptCount: 0 },

        evidenceSufficiency: {
            independentObservations: 0,
            distinctContexts: 0,
            distinctQuestionTypes: 0,
            observedEvidenceTypes: [],
            contextIds: [],
            questionTypes: []
        },

        evidenceWrongStreaks: {
            know: 0,
            explain: 0,
            apply: 0,
            transfer: 0
        },
        attemptStats: { total: 0, correct: 0, wrong: 0, partial: 0, skipped: 0 },
        signals: [],
        failureSummary: {}
    };
}

function ensureNoMutation(originalObj, objToTest) {
    assert.deepEqual(
        JSON.parse(JSON.stringify(objToTest)),
        originalObj,
        "Object was mutated during engine execution!"
    );
}

test('Mastery Engine test suite', async (t) => {

    await t.test('1. Basic correct attempt', () => {
        const state = createDefaultState();
        const attempt = {
            attemptId: "A1",
            questionId: "Q1",
            nodeId: "K100",
            primaryDimension: "know",
            result: "correct",
            difficulty: "D3"
        };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.evidence.know > 0, true, "Evidence should increase");
        assert.equal(result.current.attemptStats.total, 1);
        assert.equal(result.current.attemptStats.correct, 1);
        assert.equal(result.update.directEvidence, true);
    });

    await t.test('2. Wrong attempt decays evidence', () => {
        const state = createDefaultState();
        state.evidence.know = 0.8; // Set high initial
        const attempt = {
            nodeId: "K100",
            primaryDimension: "know",
            result: "incorrect",
            difficulty: "D3"
        };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.evidence.know < 0.8, true, "Evidence should decay");
        assert.equal(result.current.attemptStats.wrong, 1);
    });

    await t.test('3. Partial correct attempt uses partial weight', () => {
        const state1 = createDefaultState();
        const state2 = createDefaultState();
        const attCorrect = { nodeId: "K100", primaryDimension: "apply", result: "correct", difficulty: "D3" };
        const attPartial = { nodeId: "K100", primaryDimension: "apply", result: "partial", score: 0.5, difficulty: "D3" };

        const res1 = updateMastery({ attempt: attCorrect, currentState: state1 });
        const res2 = updateMastery({ attempt: attPartial, currentState: state2 });

        assert.equal(res2.current.evidence.apply > 0, true);
        assert.equal(res2.current.evidence.apply < res1.current.evidence.apply, true, "Partial gains less than full correct");
    });

    await t.test('4. Skipped attempt does not affect evidence', () => {
        const state = createDefaultState();
        state.evidence.apply = 0.5;
        const attempt = { nodeId: "K100", primaryDimension: "apply", result: "skipped" };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.evidence.apply, 0.5, "Evidence should not change");
        assert.equal(result.current.attemptStats.skipped, 1);
    });

    await t.test('5. Hint used attempt reduces weight', () => {
        const state1 = createDefaultState();
        const state2 = createDefaultState();
        const attNoHint = { nodeId: "K1", primaryDimension: "know", result: "correct" };
        const attHint = { nodeId: "K1", primaryDimension: "know", result: "correct", hintUsed: true };

        const res1 = updateMastery({ attempt: attNoHint, currentState: state1 });
        const res2 = updateMastery({ attempt: attHint, currentState: state2 });

        assert.equal(res2.current.evidence.know < res1.current.evidence.know, true, "Hint provides less evidence");
        assert.equal(res2.current.evidenceSufficiency.independentObservations, 0, "Hinted attempt is not independent");
    });

    await t.test('6. Diagnostic attempt reduces weight', () => {
        const state1 = createDefaultState();
        const state2 = createDefaultState();
        const attNorm = { nodeId: "K1", primaryDimension: "know", result: "correct" };
        const attDiag = { nodeId: "K1", primaryDimension: "know", result: "correct", mode: "diagnostic" };

        const res1 = updateMastery({ attempt: attNorm, currentState: state1 });
        const res2 = updateMastery({ attempt: attDiag, currentState: state2 });

        assert.equal(res2.current.evidence.know < res1.current.evidence.know, true, "Diagnostic provides less evidence");
    });

    await t.test('7. None primaryDimension', () => {
        const state = createDefaultState();
        const attempt = { nodeId: "K1", primaryDimension: "none", result: "correct" };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.update.directEvidence, false);
        assert.equal(result.current.attemptStats.total, 1);
    });

    await t.test('8. D1 difficulty vs D5 difficulty', () => {
        const state1 = createDefaultState();
        const state2 = createDefaultState();
        const attD1 = { nodeId: "K1", primaryDimension: "know", result: "correct", difficulty: "D1" };
        const attD5 = { nodeId: "K1", primaryDimension: "know", result: "correct", difficulty: "D5" };

        const res1 = updateMastery({ attempt: attD1, currentState: state1 });
        const res2 = updateMastery({ attempt: attD5, currentState: state2 });

        assert.equal(res2.current.evidence.know > res1.current.evidence.know, true, "D5 gives more evidence than D1");
    });

    await t.test('9. M0 -> M1 Promotion', () => {
        const state = createDefaultState();
        state.evidence.know = 0.65; // M1 threshold is 0.60
        state.attemptStats = { //tdo
            total: 1,
            correct: 1,
            wrong: 0,
            partial: 0,
            skipped: 0
        };
        state.evidenceSufficiency = {
            independentObservations: 2,
            distinctContexts: 1,
            observedEvidenceTypes: ["know"],
            contextIds: ["C1"]
        };
        state.confidence = { level: "medium", score: 0.6, attemptCount: 2 };

        const attempt = { nodeId: "K1", primaryDimension: "know", result: "correct", contextId: "C1" };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M1");
        assert.equal(result.decision.masteryChanged, true);
    });

    await t.test('10. M1 -> M2 Promotion', () => {

        const state = createDefaultState();
        state.mastery = "M1";
        state.evidence = { know: 0.85, explain: 0.75, apply: 0.55, transfer: 0.45 };
        state.attemptStats = {
            total: 3,
            correct: 3,
            wrong: 0,
            partial: 0,
            skipped: 0
        };
        state.evidenceSufficiency = {
            independentObservations: 3,
            distinctContexts: 2,
            distinctQuestionTypes: 2,
            observedEvidenceTypes: ["know", "explain", "apply", "transfer"],
            contextIds: ["C1", "C2"],
            questionTypes: ["mcq", "true_false"]
        };
        state.confidence = { level: "high", score: 0.8, attemptCount: 4 };

        const attempt = { nodeId: "K1", primaryDimension: "explain", result: "correct" };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M2");
    });

    await t.test('11. M2 -> M3 Promotion', () => {

        const state = createDefaultState();
        state.mastery = "M2";
        state.evidence = {
            know: 0.9,
            explain: 0.85,
            apply: 0.8,
            transfer: 0.7
        };

        state.attemptStats = {
            total: 5,
            correct: 5,
            wrong: 0,
            partial: 0,
            skipped: 0
        };
        state.evidenceSufficiency = {
            independentObservations: 5,
            distinctContexts: 2,
            distinctQuestionTypes: 2,
            observedEvidenceTypes: ["know", "explain", "apply", "transfer"],
            contextIds: ["C1", "C2"],
            questionTypes: ["mcq", "data_analysis"]
        };
        state.confidence = { level: "high", score: 0.9, attemptCount: 6 };

        const attempt = { nodeId: "K1", primaryDimension: "apply", result: "correct" };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M3");
    });

    await t.test('12. M3 -> M4 Promotion', () => {

        const state = createDefaultState();
        state.mastery = "M3";
        state.evidence = {
            know: 0.95,
            explain: 0.95,
            apply: 0.95,
            transfer: 0.9
        };
        state.attemptStats = {
            total: 7,
            correct: 7,
            wrong: 0,
            partial: 0,
            skipped: 0
        };
        state.evidenceSufficiency = {
            independentObservations: 7,
            distinctContexts: 2,
            distinctQuestionTypes: 2,
            observedEvidenceTypes: ["know", "explain", "apply", "transfer"],
            contextIds: ["C1", "C2"],
            questionTypes: ["mcq", "data_analysis"]
        };
        state.confidence = { level: "high", score: 0.9, attemptCount: 8 };

        const attempt = {
            nodeId: "K1",
            primaryDimension: "transfer",
            result: "correct",
            contextId: "C3",
            questionType: "data_analysis"
        };

        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M4");
    });

    await t.test('13. Insufficient evidence observations block promotion', () => {
        const state = createDefaultState();
        state.evidence.know = 0.9;
        state.evidenceSufficiency = {
            independentObservations: 0, // Need 2 for M1
            distinctContexts: 1,
            observedEvidenceTypes: ["know"],
            contextIds: ["C1"]
        };
        state.confidence = { level: "high", score: 0.9, attemptCount: 1 };

        const attempt = { nodeId: "K1", primaryDimension: "know", result: "correct", hintUsed: true };
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M0", "Should not promote due to insufficient independent observations");
    });

    await t.test('14. Low confidence blocks M1 promotion', () => {
        const state = createDefaultState();
        state.evidence.know = 0.8;
        state.evidenceSufficiency = { independentObservations: 2, distinctContexts: 1, observedEvidenceTypes: ["know"], contextIds: ["C1"] };
        state.confidence = { level: "low", score: 0.1, attemptCount: 2 };

        const attempt = { nodeId: "K1", primaryDimension: "know", result: "wrong" }; // Will cause low consistency
        const result = updateMastery({ attempt, currentState: state });
        assert.equal(result.current.mastery, "M0");
        assert.equal(result.current.confidence.level, "low");
    });

    await t.test('15. Repeated failure triggers weakness signal', () => {
        const state = createDefaultState();
        state.failureSummary = {
            "mechanism_confusion": { count: 1, sourceNodeId: "K99", lastAt: "2026-09-01T00:00:00Z" }
        };
        const attempt = {
            nodeId: "K1",
            result: "incorrect",
            failureType: "mechanism_confusion"
        };

        const result = updateMastery({ attempt, currentState: state });
        assert.equal(
            result.weakness.signals.includes(
                "trigger_remediation_diagnosis_recommended"
            ),
            true
        );

        assert.equal(result.weakness.isWeak, true);
        assert.equal(result.current.status, "weak");
    });

    await t.test('16. Immutability of inputs', () => {
        const state = createDefaultState();
        const attempt = { nodeId: "K1", primaryDimension: "know", result: "correct" };

        const stateCopy = JSON.parse(JSON.stringify(state));
        const attemptCopy = JSON.parse(JSON.stringify(attempt));

        updateMastery({ attempt, currentState: state });

        ensureNoMutation(stateCopy, state);
        ensureNoMutation(attemptCopy, attempt);
    });

    await t.test('17. Missing fields handled gracefully', () => {
        const attempt = {};
        const result = updateMastery({ attempt });
        assert.equal(result.current.mastery, "M0");
        assert.equal(result.nodeId, null);
    });

    await t.test('18. Context ID processing', () => {
        const state = createDefaultState();
        const attempt1 = { nodeId: "K1", primaryDimension: "know", result: "correct", contextId: "C1" };
        const res1 = updateMastery({ attempt: attempt1, currentState: state });

        const attempt2 = { nodeId: "K1", primaryDimension: "know", result: "correct", contextId: "C2" };
        const res2 = updateMastery({ attempt: attempt2, currentState: res1.current });

        assert.equal(res2.current.evidenceSufficiency.distinctContexts, 2);
    });

    await t.test('19. Fallback on invalid failureType', () => {
        const attempt = { nodeId: "K1", result: "wrong", failureType: "not_a_real_failure" };
        const result = updateMastery({ attempt });
        assert.equal(result.failure.failureType, null, "Should not record invalid failure type");
    });

    await t.test('20. M4 conservative downgrade', () => {
        const state = createDefaultState();
        state.mastery = "M4";
        state.evidence = { know: 0.9, explain: 0.9, apply: 0.9, transfer: 0.9 };

        const attempt = { nodeId: "K1", primaryDimension: "transfer", result: "wrong" };
        const result = updateMastery({ attempt, currentState: state });

        // Single wrong answer shouldn't downgrade from M4 if we didn't drop below M4 thresholds drastically,
        // but even if we did, engine holds the line unless forced by complex rule. 
        // Here, the engine's evaluateMastery keeps previousMastery if it doesn't meet lower ones (actually it tries M4->M1, then keeps previous if none).
        assert.equal(result.current.mastery, "M4");
    });

    await t.test('21. Confidence score computation increases with consistency', () => {
        let state = createDefaultState();

        state.evidenceSufficiency = {
            independentObservations: 10,
            distinctContexts: 5,
            distinctQuestionTypes: 4,

            observedEvidenceTypes: [
                "know",
                "explain",
                "apply",
                "transfer"
            ],

            contextIds: [
                "C1",
                "C2",
                "C3",
                "C4",
                "C5"
            ],

            questionTypes: [
                "mcq",
                "true_false",
                "data_analysis",
                "experiment"
            ]
        };
        const attempt = {
            nodeId: "K1",
            primaryDimension: "know",
            result: "correct",
            contextId: "C5",
            questionType: "mcq"
        };

        // 10 correct attempts -> high consistency
        state.attemptStats = { total: 10, correct: 10, wrong: 0, partial: 0, skipped: 0 };
        const result = updateMastery({ attempt, currentState: state });

        assert.equal(result.current.confidence.level, "very_high");
        assert.ok(result.current.confidence.score > 0.75);
    });
    /*
 * =========================================================
 * DOWNGRADE REGRESSION TESTS — Mastery Engine V1.0.1
 * =========================================================
 */


    /*
     * 22.
     * Một câu sai không được downgrade mastery.
     *
     * Contract:
     * singleWrongAnswer.action = update_evidence_only
     * resetMastery = false
     */
    await t.test(
        '22. Single wrong answer never downgrades mastery',
        () => {

            const state = createDefaultState();

            state.mastery = "M4";

            state.evidence = {
                know: 0.95,
                explain: 0.95,
                apply: 0.95,
                transfer: 0.91
            };

            state.attemptStats = {
                total: 8,
                correct: 8,
                wrong: 0,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 8,
                distinctContexts: 2,
                distinctQuestionTypes: 2,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis"
                ]
            };

            const attempt = {
                nodeId: "K1",
                primaryDimension: "transfer",
                result: "wrong",
                failureType: "reasoning_error",
                failureSignatureId: "FS-REASONING-01",
                contextId: "C2",
                questionType: "data_analysis"
            };

            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            assert.equal(
                result.current.mastery,
                "M4"
            );

            assert.equal(
                result.decision.downgradeTriggered,
                false
            );

            assert.equal(
                result.decision.persistentFailureCount,
                1
            );
        }
    );


    /*
     * 23.
     * Failure cùng signature lần thứ 2:
     *
     * → weak
     * → remediation signal
     * → KHÔNG downgrade mastery
     */
    await t.test(
        '23. Repeated same failure marks weak but does not downgrade',
        () => {

            const state = createDefaultState();

            state.mastery = "M4";

            state.evidence = {
                know: 0.95,
                explain: 0.95,
                apply: 0.95,
                transfer: 0.80
            };

            state.attemptStats = {
                total: 8,
                correct: 7,
                wrong: 1,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 8,
                distinctContexts: 2,
                distinctQuestionTypes: 2,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis"
                ]
            };

            /*
             * Failure #1 already exists.
             */
            state.failureSummary = {

                "FS-TRANSFER-01": {
                    count: 1,
                    failureType:
                        "reasoning_error",
                    failureSignatureId:
                        "FS-TRANSFER-01",
                    sourceNodeId:
                        "K1",
                    lastAt:
                        "2026-09-20T00:00:00Z"
                }
            };

            state.evidenceWrongStreaks = {
                know: 0,
                explain: 0,
                apply: 0,
                transfer: 1
            };


            /*
             * Failure #2.
             */
            const attempt = {

                nodeId: "K1",

                primaryDimension:
                    "transfer",

                result:
                    "wrong",

                failureType:
                    "reasoning_error",

                failureSignatureId:
                    "FS-TRANSFER-01",

                contextId:
                    "C2",

                questionType:
                    "data_analysis"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            assert.equal(
                result.decision
                    .persistentFailureCount,
                2
            );


            assert.equal(
                result.weakness.isWeak,
                true
            );


            assert.equal(
                result.weakness.signals.includes(
                    "trigger_remediation_diagnosis_recommended"
                ),
                true
            );


            assert.equal(
                result.current.mastery,
                "M4"
            );


            assert.equal(
                result.decision
                    .downgradeTriggered,
                false
            );
        }
    );


    /*
     * 24.
     * Failure cùng signature lần thứ 3:
     *
     * → persistent failure
     * → evidence không còn support M4
     * → cho phép downgrade
     * → tối đa 1 level
     *
     * M4 → M3
     */
    await t.test(
        '24. Persistent third failure can downgrade M4 to M3',
        () => {

            const state = createDefaultState();

            state.mastery = "M4";

            /*
             * transfer đã suy yếu đủ để M4
             * không còn được support.
             *
             * Nhưng evidence vẫn support lower mastery.
             */
            state.evidence = {
                know: 0.95,
                explain: 0.92,
                apply: 0.90,
                transfer: 0.60
            };

            state.attemptStats = {
                total: 9,
                correct: 7,
                wrong: 2,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 9,
                distinctContexts: 3,
                distinctQuestionTypes: 3,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2",
                    "C3"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis",
                    "experiment"
                ]
            };


            state.failureSummary = {

                "FS-TRANSFER-01": {

                    count: 2,

                    failureType:
                        "reasoning_error",

                    failureSignatureId:
                        "FS-TRANSFER-01",

                    sourceNodeId:
                        "K1",

                    lastAt:
                        "2026-09-21T00:00:00Z"
                }
            };


            state.evidenceWrongStreaks = {
                know: 0,
                explain: 0,
                apply: 0,
                transfer: 2
            };


            const attempt = {

                nodeId:
                    "K1",

                primaryDimension:
                    "transfer",

                result:
                    "wrong",

                failureType:
                    "reasoning_error",

                failureSignatureId:
                    "FS-TRANSFER-01",

                contextId:
                    "C3",

                questionType:
                    "experiment"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            assert.equal(
                result.decision
                    .persistentFailureCount,
                3
            );


            assert.equal(
                result.current.mastery,
                "M3"
            );


            assert.equal(
                result.decision
                    .downgradeTriggered,
                true
            );


            assert.equal(
                result.decision.direction,
                "down"
            );


            assert.equal(
                result.decision
                    .downgradeReason,
                "persistent_failure_recalculate_mastery"
            );
        }
    );


    /*
     * 25.
     * Dù evidence hiện chỉ support thấp hơn nhiều,
     * một update chỉ được giảm TỐI ĐA 1 mastery level.
     *
     * M4 → M3
     *
     * KHÔNG:
     * M4 → M2
     * M4 → M1
     */
    await t.test(
        '25. Downgrade is limited to one mastery level per update',
        () => {

            const state = createDefaultState();

            state.mastery = "M4";

            /*
             * Evidence rất yếu.
             *
             * supportedLevel có thể thấp hơn M3,
             * nhưng downgrade vẫn chỉ được M4 → M3.
             */
            state.evidence = {
                know: 0.76,
                explain: 0.61,
                apply: 0.40,
                transfer: 0.30
            };

            state.attemptStats = {
                total: 10,
                correct: 7,
                wrong: 3,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 10,
                distinctContexts: 3,
                distinctQuestionTypes: 3,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2",
                    "C3"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis",
                    "experiment"
                ]
            };


            state.failureSummary = {

                "FS-APPLY-01": {

                    count: 2,

                    failureType:
                        "reasoning_error",

                    failureSignatureId:
                        "FS-APPLY-01",

                    sourceNodeId:
                        "K1",

                    lastAt:
                        "2026-09-21T00:00:00Z"
                }
            };


            state.evidenceWrongStreaks = {
                know: 0,
                explain: 0,
                apply: 2,
                transfer: 0
            };


            const attempt = {

                nodeId:
                    "K1",

                primaryDimension:
                    "apply",

                result:
                    "wrong",

                failureType:
                    "reasoning_error",

                failureSignatureId:
                    "FS-APPLY-01",

                contextId:
                    "C3",

                questionType:
                    "experiment"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            assert.equal(
                result.decision
                    .persistentFailureCount,
                3
            );


            /*
             * Critical assertion.
             */
            assert.equal(
                result.current.mastery,
                "M3"
            );


            assert.equal(
                result.decision
                    .downgradeTriggered,
                true
            );


            assert.ok(
                masteryTestRank(
                    result.decision.supportedLevel
                ) <
                masteryTestRank("M3")
            );
        }
    );


    /*
     * 26.
     * Failed RETEST:
     *
     * contract says:
     *
     * keepMastery = true
     * remove_stable_status
     *
     * Therefore:
     *
     * M3 stable
     *   ↓ failed retest
     * M3, NOT stable
     */
    await t.test(
        '26. Failed retest keeps mastery but removes stable status',
        () => {

            const state = createDefaultState();

            state.mastery = "M3";
            state.status = "stable";

            state.evidence = {
                know: 0.85,
                explain: 0.75,
                apply: 0.71,
                transfer: 0.55
            };

            state.attemptStats = {
                total: 6,
                correct: 5,
                wrong: 1,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 6,
                distinctContexts: 2,
                distinctQuestionTypes: 2,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis"
                ]
            };


            const attempt = {

                nodeId:
                    "K1",

                primaryDimension:
                    "apply",

                result:
                    "wrong",

                failureType:
                    "reasoning_error",

                failureSignatureId:
                    "FS-RETEST-01",

                context: {
                    pathStage:
                        "RETEST"
                },

                contextId:
                    "C2",

                questionType:
                    "data_analysis"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            /*
             * Mastery retained.
             */
            assert.equal(
                result.current.mastery,
                "M3"
            );


            /*
             * Stable removed.
             */
            assert.notEqual(
                result.current.status,
                "stable"
            );


            assert.equal(
                result.decision
                    .downgradeTriggered,
                false
            );


            assert.equal(
                result.decision
                    .downgradeReason,
                "failed_retest_keeps_mastery"
            );
        }
    );


    /*
     * 27.
     * Diagnostic failure alone must NOT downgrade mastery,
     * even if the same signature count reaches persistent
     * threshold.
     *
     * Diagnostic may update evidence/failure evidence,
     * but must not invalidate mastery by itself.
     */
    await t.test(
        '27. Diagnostic persistent failure alone does not downgrade mastery',
        () => {

            const state = createDefaultState();

            state.mastery = "M4";

            state.evidence = {
                know: 0.90,
                explain: 0.85,
                apply: 0.80,
                transfer: 0.60
            };

            state.attemptStats = {
                total: 8,
                correct: 6,
                wrong: 2,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 8,
                distinctContexts: 2,
                distinctQuestionTypes: 2,
                observedEvidenceTypes: [
                    "know",
                    "explain",
                    "apply",
                    "transfer"
                ],
                contextIds: [
                    "C1",
                    "C2"
                ],
                questionTypes: [
                    "mcq",
                    "data_analysis"
                ]
            };


            state.failureSummary = {

                "FS-DIAG-01": {

                    count: 2,

                    failureType:
                        "reasoning_error",

                    failureSignatureId:
                        "FS-DIAG-01",

                    sourceNodeId:
                        "K1",

                    lastAt:
                        "2026-09-21T00:00:00Z"
                }
            };


            const attempt = {

                nodeId:
                    "K1",

                primaryDimension:
                    "transfer",

                result:
                    "wrong",

                mode:
                    "diagnostic",

                failureType:
                    "reasoning_error",

                failureSignatureId:
                    "FS-DIAG-01",

                contextId:
                    "C2",

                questionType:
                    "data_analysis"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            assert.equal(
                result.decision
                    .persistentFailureCount,
                3
            );


            assert.equal(
                result.current.mastery,
                "M4"
            );


            assert.equal(
                result.decision
                    .downgradeTriggered,
                false
            );


            assert.equal(
                result.decision
                    .downgradeReason,
                "diagnostic_failure_not_sufficient_for_downgrade"
            );
        }
    );


    /*
     * 28.
     * Persistent failure must never downgrade below
     * minimumPossibleLevel = M1.
     *
     * M1 → M0 is prohibited by current downgrade contract.
     */
    await t.test(
        '28. Persistent failure cannot downgrade below M1',
        () => {

            const state = createDefaultState();

            state.mastery = "M1";

            state.evidence = {
                know: 0.50,
                explain: 0.20,
                apply: 0.10,
                transfer: 0.00
            };

            state.attemptStats = {
                total: 5,
                correct: 2,
                wrong: 3,
                partial: 0,
                skipped: 0
            };

            state.evidenceSufficiency = {
                independentObservations: 5,
                distinctContexts: 2,
                distinctQuestionTypes: 2,
                observedEvidenceTypes: [
                    "know",
                    "explain"
                ],
                contextIds: [
                    "C1",
                    "C2"
                ],
                questionTypes: [
                    "mcq",
                    "true_false"
                ]
            };


            state.failureSummary = {

                "FS-KNOW-01": {

                    count: 2,

                    failureType:
                        "concept_confusion",

                    failureSignatureId:
                        "FS-KNOW-01",

                    sourceNodeId:
                        "K1",

                    lastAt:
                        "2026-09-21T00:00:00Z"
                }
            };


            state.evidenceWrongStreaks = {
                know: 2,
                explain: 0,
                apply: 0,
                transfer: 0
            };


            const attempt = {

                nodeId:
                    "K1",

                primaryDimension:
                    "know",

                result:
                    "wrong",

                failureType:
                    "concept_confusion",

                failureSignatureId:
                    "FS-KNOW-01",

                contextId:
                    "C2",

                questionType:
                    "mcq"
            };


            const result =
                updateMastery({
                    attempt,
                    currentState: state
                });


            /*
             * Current evidence supports M0,
             * persistent failure threshold is reached,
             * but policy minimumPossibleLevel = M1.
             */
            assert.equal(
                result.decision.supportedLevel,
                "M0"
            );


            assert.equal(
                result.current.mastery,
                "M1"
            );


            assert.equal(
                result.decision
                    .persistentFailureCount,
                3
            );


            /*
             * Important:
             *
             * downgradeTriggered must be FALSE because
             * final mastery remains M1.
             */
            assert.equal(
                result.decision
                    .downgradeTriggered,
                false
            );
        }
    );


    /*
     * Test-only helper.
     *
     * Do NOT import internal engine masteryRank().
     */
    function masteryTestRank(level) {

        return [
            "M0",
            "M1",
            "M2",
            "M3",
            "M4"
        ].indexOf(level);
    }

});
