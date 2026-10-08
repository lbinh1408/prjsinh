

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { updateMastery } from '../../../src/engines/mastery/masterEngine.js';

/**
 * =========================================================
 * LOAD MASTERY RULES V2
 * =========================================================
 *
 * Nếu mastery-rules-v2.0.0.json không nằm cùng thư mục
 * với test này, chỉ cần sửa RULES_PATH.
 */

const RULES_PATH =
    new URL('../../../src/policies/mastery/rules.json', import.meta.url);

const rules = JSON.parse(
    fs.readFileSync(
        RULES_PATH,
        'utf8'
    )
);

/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

function state0() {
    return {
        mastery: 'M0',

        status: 'developing',

        evidence: {
            know: 0,
            explain: 0,
            apply: 0,
            transfer: 0
        },

        overallEvidence: 0,

        confidence: {
            level: 'low',
            score: 0,
            attemptCount: 0
        },

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

        attemptStats: {
            total: 0,
            correct: 0,
            wrong: 0,
            partial: 0,
            skipped: 0
        },

        weakEvidence: [],

        signals: [],

        failureSummary: {},

        lastAttemptAt: null,

        lastSuccessAt: null,

        lastFailure: null,

        retest: {
            attempted: false,
            lastRetestAt: null,
            passed: false,
            differentQuestion: false,
            differentContext: false,
            independent: false
        },

        review: {
            lastReviewedAt: null
        }
    };
}

function run(
    state,
    attempt,
    evidenceContext = {}
) {
    return updateMastery({
        attempt,

        currentState: state,

        masteryRules: rules,

        evidenceContext
    });
}

function a(
    id,
    dimension,
    difficulty,
    result = 'correct',
    contextId = 'C1',
    questionType = 'mcq',
    extra = {}
) {
    return {
        attemptId: id,

        questionId: `Q-${id}`,

        nodeId: 'K283',

        primaryDimension:
            dimension,

        difficulty,

        result,

        contextId,

        questionType,

        submittedAt:
            '2026-10-04T12:00:00.000Z',

        ...extra
    };
}

/**
 * =========================================================
 * MASTERy ENGINE V2 TEST SUITE
 * =========================================================
 */

test(
    'Mastery Engine V2',

    async t => {

        /**
         * -------------------------------------------------
         * 1. VERSION
         * -------------------------------------------------
         */

        await t.test(
            '1 engine reports V2',

            () => {
                const r = run(
                    state0(),

                    a(
                        '1',
                        'know',
                        'D1'
                    )
                );

                assert.equal(
                    r.engine.version,
                    '2.0.0'
                );
            }
        );

        /**
         * -------------------------------------------------
         * 2. NO ZERO-SEED PENALTY
         * -------------------------------------------------
         */

        await t.test(
            '2 no-zero-seed: first D1 know correct = .70',

            () => {
                const r = run(
                    state0(),

                    a(
                        '1',
                        'know',
                        'D1'
                    )
                );

                assert.equal(
                    r.current
                        .evidence
                        .know,
                    0.7
                );

                assert.equal(
                    r.current
                        .evidenceHistory
                        .know
                        .length,
                    1
                );

                assert.equal(
                    r.current
                        .evidenceHistory
                        .know[0]
                        .score,
                    0.7
                );
            }
        );

        /**
         * -------------------------------------------------
         * 3. D3 CORRECT
         * -------------------------------------------------
         */

        await t.test(
            '3 first D3 correct = 1.0',

            () => {
                const r = run(
                    state0(),

                    a(
                        '1',
                        'apply',
                        'D3'
                    )
                );

                assert.equal(
                    r.current
                        .evidence
                        .apply,
                    1
                );
            }
        );

        /**
         * -------------------------------------------------
         * 4. PARTIAL
         * -------------------------------------------------
         */

        await t.test(
            '4 partial lower than correct',

            () => {
                const correct =
                    run(
                        state0(),

                        a(
                            'correct',
                            'apply',
                            'D3',
                            'correct'
                        )
                    );

                const partial =
                    run(
                        state0(),

                        a(
                            'partial',
                            'apply',
                            'D3',
                            'partial',
                            'C1',
                            'mcq',
                            {
                                score: 0.5
                            }
                        )
                    );

                assert.ok(
                    partial.current
                        .evidence
                        .apply
                    <
                    correct.current
                        .evidence
                        .apply
                );
            }
        );

        /**
         * -------------------------------------------------
         * 5. SKIPPED
         * -------------------------------------------------
         */

        await t.test(
            '5 skipped creates no observation',

            () => {
                const s =
                    state0();

                s.evidence.apply =
                    0.5;

                const r = run(
                    s,

                    a(
                        'skip',
                        'apply',
                        'D3',
                        'skipped'
                    )
                );

                assert.equal(
                    r.current
                        .evidence
                        .apply,
                    0.5
                );

                assert.equal(
                    r.current
                        .evidenceHistory
                        .apply
                        .length,
                    0
                );

                assert.equal(
                    r.update
                        .directEvidence,
                    false
                );
            }
        );

        /**
         * -------------------------------------------------
         * 6. DIAGNOSTIC
         * -------------------------------------------------
         */

        await t.test(
            '6 diagnostic keeps capability score but lowers reliability',

            () => {
                const normal =
                    run(
                        state0(),

                        a(
                            'normal',
                            'know',
                            'D1'
                        )
                    );

                const diagnostic =
                    run(
                        state0(),

                        a(
                            'diagnostic',
                            'know',
                            'D1',
                            'correct',
                            'C1',
                            'mcq',
                            {
                                mode:
                                    'diagnostic'
                            }
                        )
                    );

                /**
                 * Capability must remain identical.
                 */

                assert.equal(
                    diagnostic.current
                        .evidence
                        .know,

                    normal.current
                        .evidence
                        .know
                );

                /**
                 * Reliability must be lower.
                 */

                assert.ok(
                    diagnostic.current
                        .evidenceHistory
                        .know[0]
                        .reliabilityWeight
                    <
                    normal.current
                        .evidenceHistory
                        .know[0]
                        .reliabilityWeight
                );

                assert.equal(
                    diagnostic.current
                        .evidence
                        .know,
                    0.7
                );
            }
        );

        /**
         * -------------------------------------------------
         * 7. HINT ASSISTANCE
         * -------------------------------------------------
         */

        await t.test(
            '7 hinted correct is not independent',

            () => {
                const r = run(
                    state0(),

                    a(
                        'hint',
                        'know',
                        'D2',
                        'correct',
                        'C1',
                        'mcq',
                        {
                            hintUsed: true
                        }
                    )
                );

                assert.equal(
                    r.current
                        .evidenceSufficiency
                        .independentObservations,
                    0
                );

                assert.equal(
                    r.current
                        .evidenceHistory
                        .know[0]
                        .independent,
                    false
                );

                /**
                 * D2 = .85
                 * hint assisted = .60
                 *
                 * capability observation:
                 *
                 * 1 × .85 × .60 = .51
                 */

                assert.equal(
                    r.current
                        .evidence
                        .know,
                    0.51
                );
            }
        );

        /**
         * -------------------------------------------------
         * 8. HISTORY HANDOFF
         * -------------------------------------------------
         */

        await t.test(
            '8 history survives current-state handoff',

            () => {
                const r1 =
                    run(
                        state0(),

                        a(
                            '1',
                            'know',
                            'D1',
                            'correct',
                            'C1'
                        )
                    );

                /**
                 * IMPORTANT:
                 *
                 * No explicit evidenceHistory argument.
                 *
                 * Engine must recover runtime history from
                 * r1.current.evidenceHistory.
                 */

                const r2 =
                    run(
                        r1.current,

                        a(
                            '2',
                            'know',
                            'D1',
                            'correct',
                            'C2'
                        )
                    );

                assert.equal(
                    r2.current
                        .evidenceSufficiency
                        .distinctContexts,
                    2
                );

                assert.equal(
                    r2.current
                        .evidenceHistory
                        .know
                        .length,
                    2
                );

                assert.deepEqual(
                    r2.current
                        .evidenceSufficiency
                        .contextIds,

                    [
                        'C1',
                        'C2'
                    ]
                );
            }
        );

        /**
         * -------------------------------------------------
         * 9. BOUNDED WINDOW
         * -------------------------------------------------
         */

        await t.test(
            '9 bounded window keeps last 8 observations',

            () => {
                let s =
                    state0();

                /**
                 * Observations:
                 *
                 * 1..8 = correct
                 * 9    = wrong
                 *
                 * Window size = 8
                 *
                 * Final window:
                 *
                 * 7 correct
                 * 1 wrong
                 *
                 * D3 score:
                 *
                 * correct = 1
                 * wrong   = 0
                 *
                 * evidence =
                 *
                 * 7 / 8
                 * = .875
                 */

                for (
                    let i = 0;
                    i < 9;
                    i++
                ) {
                    const result =
                        i === 8
                            ? 'wrong'
                            : 'correct';

                    s = run(
                        s,

                        a(
                            String(i),
                            'apply',
                            'D3',
                            result,
                            `C${i}`,
                            'mcq'
                        )
                    ).current;
                }

                assert.equal(
                    s.evidenceHistory
                        .apply
                        .length,
                    8
                );

                assert.equal(
                    s.evidence.apply,
                    0.875
                );
            }
        );

        /**
         * -------------------------------------------------
         * 10. OVERALL IS NOT HARD GATE
         * -------------------------------------------------
         */

        await t.test(
            '10 overallEvidence is not promotion hard gate',

            () => {
                let s =
                    state0();

                /**
                 * Q1:
                 *
                 * KNOW D1
                 */

                s = run(
                    s,

                    a(
                        '1',
                        'know',
                        'D1',
                        'correct',
                        'C1',
                        'mcq'
                    )
                ).current;

                assert.equal(
                    s.mastery,
                    'M0'
                );

                /**
                 * Q2:
                 *
                 * EXPLAIN D2
                 *
                 * independent observations = 2
                 *
                 * M1 only requires:
                 *
                 * know >= .60
                 * qualifying know >= 1
                 * independent >= 2
                 * confidence >= medium
                 */

                s = run(
                    s,

                    a(
                        '2',
                        'explain',
                        'D2',
                        'correct',
                        'C2',
                        'mcq'
                    )
                ).current;

                assert.equal(
                    s.mastery,
                    'M1'
                );

                /**
                 * Weighted overall is still far below
                 * old V1 promotion threshold.
                 */

                assert.ok(
                    s.overallEvidence <
                    0.6
                );
            }
        );

        /**
         * -------------------------------------------------
         * 11. K283 HAPPY PATH
         * -------------------------------------------------
         */

        await t.test(
            '11 K283 V2 happy path reaches M4 sequentially',

            () => {
                let s =
                    state0();

                const sequence = [
                    /**
                     * M0
                     *
                     * KNOW D1
                     */
                    a(
                        '001',
                        'know',
                        'D1',
                        'correct',
                        'C1',
                        'mcq'
                    ),

                    /**
                     * M0 -> M1
                     *
                     * EXPLAIN D2
                     */
                    a(
                        '002',
                        'explain',
                        'D2',
                        'correct',
                        'C2',
                        'mcq'
                    ),

                    /**
                     * M1 -> M2
                     *
                     * APPLY D3
                     */
                    a(
                        '003',
                        'apply',
                        'D3',
                        'correct',
                        'C3',
                        'mcq'
                    ),

                    /**
                     * M2 -> M3
                     *
                     * second qualifying APPLY
                     */
                    a(
                        '004',
                        'apply',
                        'D3',
                        'correct',
                        'C4',
                        'mcq'
                    ),

                    /**
                     * M3 stays M3
                     *
                     * first TRANSFER
                     */
                    a(
                        '008',
                        'transfer',
                        'D4',
                        'correct',
                        'C5',
                        'data_analysis'
                    ),

                    /**
                     * M3 -> M4
                     *
                     * second TRANSFER
                     *
                     * now:
                     *
                     * independent = 6
                     * contexts >= 2
                     * question types >= 2
                     * transfer qualifying >= 2
                     */
                    a(
                        '009',
                        'transfer',
                        'D4',
                        'correct',
                        'C6',
                        'data_analysis'
                    )
                ];

                const expected = [
                    'M0',
                    'M1',
                    'M2',
                    'M3',
                    'M3',
                    'M4'
                ];

                for (
                    let i = 0;
                    i <
                    sequence.length;
                    i++
                ) {
                    const r =
                        run(
                            s,
                            sequence[i]
                        );

                    s =
                        r.current;

                    assert.equal(
                        s.mastery,
                        expected[i],
                        `Unexpected mastery at step ${i + 1}`
                    );
                }

                assert.equal(
                    s.mastery,
                    'M4'
                );

                assert.equal(
                    s.status,
                    'mastered'
                );

                assert.equal(
                    s.evidenceSufficiency
                        .independentObservations,
                    6
                );

                assert.ok(
                    s.evidenceSufficiency
                        .distinctContexts >=
                    2
                );

                assert.ok(
                    s.evidenceSufficiency
                        .distinctQuestionTypes >=
                    2
                );

                assert.equal(
                    s.evidenceHistory
                        .transfer
                        .length,
                    2
                );
            }
        );

        /**
         * -------------------------------------------------
         * 12. ANTI-FARM APPLY
         * -------------------------------------------------
         */

        await t.test(
            '12 two apply observations cannot bypass know/explain',

            () => {
                let s =
                    state0();

                s = run(
                    s,

                    a(
                        '1',
                        'apply',
                        'D3',
                        'correct',
                        'C1',
                        'mcq'
                    )
                ).current;

                s = run(
                    s,

                    a(
                        '2',
                        'apply',
                        'D3',
                        'correct',
                        'C2',
                        'mcq'
                    )
                ).current;

                /**
                 * APPLY evidence alone cannot
                 * establish M1 or M2.
                 */

                assert.equal(
                    s.mastery,
                    'M0'
                );

                assert.equal(
                    s.evidence.know,
                    0
                );

                assert.equal(
                    s.evidence.explain,
                    0
                );

                assert.equal(
                    s.evidence.apply,
                    1
                );
            }
        );

        /**
         * -------------------------------------------------
         * 13. ANTI-FARM TRANSFER
         * -------------------------------------------------
         */

        await t.test(
            '13 one transfer observation cannot establish M4',

            () => {
                let s =
                    state0();

                const preM3 = [
                    a(
                        '1',
                        'know',
                        'D1',
                        'correct',
                        'C1',
                        'mcq'
                    ),

                    a(
                        '2',
                        'explain',
                        'D2',
                        'correct',
                        'C2',
                        'mcq'
                    ),

                    a(
                        '3',
                        'apply',
                        'D3',
                        'correct',
                        'C3',
                        'mcq'
                    ),

                    a(
                        '4',
                        'apply',
                        'D3',
                        'correct',
                        'C4',
                        'mcq'
                    )
                ];

                for (
                    const attempt
                    of preM3
                ) {
                    s = run(
                        s,
                        attempt
                    ).current;
                }

                assert.equal(
                    s.mastery,
                    'M3'
                );

                s = run(
                    s,

                    a(
                        '5',
                        'transfer',
                        'D4',
                        'correct',
                        'C5',
                        'data_analysis'
                    )
                ).current;

                /**
                 * Only one qualifying TRANSFER.
                 *
                 * M4 requires two.
                 */

                assert.equal(
                    s.mastery,
                    'M3'
                );

                assert.equal(
                    s.evidenceHistory
                        .transfer
                        .length,
                    1
                );
            }
        );

        /**
         * -------------------------------------------------
         * 14. SINGLE WRONG
         * -------------------------------------------------
         */

        await t.test(
            '14 single wrong never downgrades mastery',

            () => {
                let s =
                    state0();

                const happyPath = [
                    a(
                        '1',
                        'know',
                        'D1',
                        'correct',
                        'C1',
                        'mcq'
                    ),

                    a(
                        '2',
                        'explain',
                        'D2',
                        'correct',
                        'C2',
                        'mcq'
                    ),

                    a(
                        '3',
                        'apply',
                        'D3',
                        'correct',
                        'C3',
                        'mcq'
                    ),

                    a(
                        '4',
                        'apply',
                        'D3',
                        'correct',
                        'C4',
                        'mcq'
                    ),

                    a(
                        '5',
                        'transfer',
                        'D4',
                        'correct',
                        'C5',
                        'data_analysis'
                    ),

                    a(
                        '6',
                        'transfer',
                        'D4',
                        'correct',
                        'C6',
                        'data_analysis'
                    )
                ];

                for (
                    const attempt
                    of happyPath
                ) {
                    s = run(
                        s,
                        attempt
                    ).current;
                }

                assert.equal(
                    s.mastery,
                    'M4'
                );

                const r = run(
                    s,

                    a(
                        '7',
                        'transfer',
                        'D4',
                        'wrong',
                        'C7',
                        'data_analysis',
                        {
                            failureType:
                                'reasoning_error',

                            failureSignatureId:
                                'FS-X'
                        }
                    )
                );

                /**
                 * Evidence may decrease.
                 *
                 * Mastery must NOT be destroyed
                 * by one wrong answer.
                 */

                assert.equal(
                    r.current.mastery,
                    'M4'
                );

                assert.equal(
                    r.decision
                        .downgradeTriggered,
                    false
                );

                assert.equal(
                    r.failure
                        .persistentFailureCount,
                    1
                );
            }
        );

        /**
         * -------------------------------------------------
         * 15. INPUT IMMUTABILITY
         * -------------------------------------------------
         */

        await t.test(
            '15 input immutability',

            () => {
                const state =
                    state0();

                const attempt =
                    a(
                        '1',
                        'know',
                        'D1'
                    );

                const originalState =
                    structuredClone(
                        state
                    );

                const originalAttempt =
                    structuredClone(
                        attempt
                    );

                run(
                    state,
                    attempt
                );

                assert.deepEqual(
                    state,
                    originalState
                );

                assert.deepEqual(
                    attempt,
                    originalAttempt
                );
            }
        );
    }
);