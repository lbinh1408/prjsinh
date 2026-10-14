/**
 * tests/unit/k283RemediationCLIWiringV1.test.js
 *
 * Focused integration tests for K283 Remediation CLI Wiring V1.
 *
 * Validates printRemediation() wiring of resolveRemediationStepContent():
 *  - Instructional steps (MICRO_LEARN, EXAMPLE, ERROR_ANALYSIS) show authoritative content
 *  - Missing question reference shows neutral fallback, not fabricated text
 *  - Unsupported step types preserve original fallback display
 *  - No state mutation on session, plan, or attempt
 *
 * Runner: node:test (project convention, type:module).
 * Tests are pure unit — no engine calls, no file I/O, no checkpoints.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveRemediationStepContent,
    formatRemediationStepLines,
    INSTRUCTIONAL_STEP_TYPES,
} from '../../k283RemediationContentResolverV1.js';
import { selectQuestion } from '../../src/engines/question/questionSelector.js';
import {
    applyK283RemediationProbeConstraints,
    selectK283NextQuestion,
    formatK283ProbeOutcome
} from '../../k283RemediationCLIProbeV1.js';
import { createK283PersistentMultiTurnCoordinatorV1 } from '../../src/restoration/k283PersistentMultiTurnCoordinatorV1.js';

// ---------------------------------------------------------------------------
// Fixtures — derived from K283.question-bank.json field shapes
// ---------------------------------------------------------------------------

const MCQ_FULL = {
    id: 'Q-A-K283-K-001',
    answer: { type: 'single', value: 'A' },
    explanation: {
        correct: 'Tần số hoán vị gene được xác định bằng tổng tỉ lệ các giao tử tái tổ hợp.',
        incorrect: {
            B: 'Giao tử mang tổ hợp allele bố mẹ thuộc nhóm không tái tổ hợp.',
            C: 'Mỗi loại giao tử chỉ phản ánh một nửa tổng số tái tổ hợp.',
        }
    },
    hint: {
        enabled: true,
        levels: [{ level: 1, text: 'Hãy nhớ f phản ánh phần giao tử tái tổ hợp.' }]
    }
};

const NUMERIC_FULL = {
    id: 'Q-A-K283-T-010',
    answer: { type: 'numeric', value: 25 },
    explanation: {
        correct: 'Tổng hai loại giao tử tái tổ hợp Ab và aB = 25%.',
        incorrect: { default: 'Cần cộng tỉ lệ của tất cả giao tử tái tổ hợp.' }
    },
    hint: {
        enabled: true,
        levels: [{ level: 1, text: 'Xác định loại giao tử tái tổ hợp rồi cộng lại.' }]
    }
};

const QUESTION_NO_CONTENT = {
    id: 'Q-STUB',
    answer: { type: 'single', value: 'A' },
    explanation: null,
    hint: { enabled: false, levels: [] }
};

// Attempt stubs — mirrors attempt.response shape from AttemptBuilder
const attempt = (value) => ({ response: { value } });

// Remediation plan step stubs — mirrors RemediationEngine plan.steps shape
const step = (type, id = 'RSTEP-1') => ({
    stepId: id,
    type,
    targetNodeIds: ['K283'],
    purpose: `Purpose for ${type}`
});

// Immutable-session stub — mirrors session.activeRemediationPlan path
const sessionWith = (planSteps) => ({
    activeRemediationPlan: {
        remediationId: 'REM-TEST-K283',
        diagnosis: { failureType: 'concept_confusion' },
        target: { targetNodeId: 'K283' },
        plan: { steps: planSteps }
    }
});

// ---------------------------------------------------------------------------
// Helper: capture console.log output from formatRemediationStepLines pipeline
// (pure logic — does not call printRemediation, so no process side-effects)
// ---------------------------------------------------------------------------

function captureStepOutput(stepObj, question, chosenOption) {
    const resolved = resolveRemediationStepContent({ step: stepObj, question, chosenOption });
    return formatRemediationStepLines(resolved);
}

// ===========================================================================
// CW-001: Wiring contract — INSTRUCTIONAL_STEP_TYPES are the 3 expected values
// ===========================================================================

test('CW-001: INSTRUCTIONAL_STEP_TYPES exported correctly', () => {
    assert.equal(INSTRUCTIONAL_STEP_TYPES.length, 3);
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('MICRO_LEARN'));
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('EXAMPLE'));
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('ERROR_ANALYSIS'));
});

// ===========================================================================
// CW-002..004: Instructional steps → authoritative content
// ===========================================================================

test('CW-002: MICRO_LEARN step with MCQ question produces headline Review + correct explanation + hint', () => {
    const lines = captureStepOutput(step('MICRO_LEARN'), MCQ_FULL, null);
    assert.equal(lines.length, 3);
    assert.equal(lines[0], 'Review');
    assert.equal(lines[1], MCQ_FULL.explanation.correct);
    assert.ok(lines[2].startsWith('Hint:'));
    assert.ok(lines[2].includes(MCQ_FULL.hint.levels[0].text));
});

test('CW-003: EXAMPLE step with numeric question produces headline Example + correct explanation', () => {
    const lines = captureStepOutput(step('EXAMPLE'), NUMERIC_FULL, null);
    assert.equal(lines[0], 'Example');
    assert.equal(lines[1], NUMERIC_FULL.explanation.correct);
});

test('CW-004: ERROR_ANALYSIS step uses per-option explanation for MCQ, correct chosenOption', () => {
    const lines = captureStepOutput(step('ERROR_ANALYSIS'), MCQ_FULL, 'B');
    assert.equal(lines[0], 'Error Analysis');
    assert.equal(lines[1], MCQ_FULL.explanation.incorrect.B);
    // must NOT include unrelated explanation text
    assert.ok(!lines.some(l => l.includes(MCQ_FULL.explanation.incorrect.C)));
});

test('CW-005: ERROR_ANALYSIS falls back to incorrect.default when option not in map', () => {
    const lines = captureStepOutput(step('ERROR_ANALYSIS'), NUMERIC_FULL, 99);
    assert.equal(lines[0], 'Error Analysis');
    assert.equal(lines[1], NUMERIC_FULL.explanation.incorrect.default);
});

// ===========================================================================
// CW-006..007: Missing question reference → neutral fallback, no fabrication
// ===========================================================================

test('CW-006: MICRO_LEARN with null question → fallback, isAuthoritative=false', () => {
    const resolved = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: null });
    assert.equal(resolved.isAuthoritative, false);
    const lines = formatRemediationStepLines(resolved);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /No question reference/i);
    // must not contain fabricated explanation language
    assert.doesNotMatch(lines[0], /because|since|therefore|hence/i);
});

test('CW-007: ERROR_ANALYSIS with no-content question → fallback, no invented text', () => {
    const resolved = resolveRemediationStepContent({
        step: step('ERROR_ANALYSIS'),
        question: QUESTION_NO_CONTENT,
        chosenOption: 'B'
    });
    assert.equal(resolved.isAuthoritative, false);
    const lines = formatRemediationStepLines(resolved);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /No error analysis content/i);
});

// ===========================================================================
// CW-008: Unsupported step type → resolver flags it correctly
// ===========================================================================

test('CW-008: MINI_PRACTICE is not in INSTRUCTIONAL_STEP_TYPES, resolver returns fallback', () => {
    const resolved = resolveRemediationStepContent({ step: step('MINI_PRACTICE'), question: MCQ_FULL });
    assert.equal(resolved.isAuthoritative, false);
    assert.match(resolved.body, /not an instructional type/i);
});

// ===========================================================================
// CW-009: No state mutation — session, plan, question, attempt are untouched
// ===========================================================================

test('CW-009: resolveRemediationStepContent does not mutate question or attempt', () => {
    const q = {
        id: 'Q-IMMUT',
        answer: { type: 'single', value: 'A' },
        explanation: { correct: 'Explanation text.', incorrect: { B: 'Wrong B.' } },
        hint: { enabled: true, levels: [{ level: 1, text: 'Hint text.' }] }
    };
    const att = attempt('B');

    const qBefore = JSON.stringify(q);
    const aBefore = JSON.stringify(att);

    resolveRemediationStepContent({ step: step('ERROR_ANALYSIS'), question: q, chosenOption: att.response.value });

    assert.equal(JSON.stringify(q), qBefore, 'question must not be mutated');
    assert.equal(JSON.stringify(att), aBefore, 'attempt must not be mutated');
});

// ===========================================================================
// CW-010: Only the triggering question's content is used (no cross-question leak)
// ===========================================================================

test('CW-010: MICRO_LEARN content matches exactly the provided question, not any other', () => {
    const otherQuestion = {
        id: 'Q-OTHER',
        answer: { type: 'single', value: 'C' },
        explanation: { correct: 'Completely different explanation — must NOT appear.' },
        hint: { enabled: false, levels: [] }
    };

    const lines = captureStepOutput(step('MICRO_LEARN'), MCQ_FULL, null);

    // Must contain the correct question's explanation
    assert.ok(lines.some(l => l === MCQ_FULL.explanation.correct));
    // Must NOT contain the other question's explanation
    assert.ok(!lines.some(l => l.includes(otherQuestion.explanation.correct)));
});

const probeQuestion = (id, difficulty = 'D2', evidence = 'apply') => ({
    id,
    version: '1.0.0',
    nodes: ['K283'],
    primaryNode: 'K283',
    secondaryNodes: [],
    evidence,
    difficulty,
    questionType: 'mcq',
    mode: ['practice', 'remediate'],
    failureSignatures: [],
    content: { stem: `Question ${id}` },
    answer: { type: 'single_choice', correctOptionId: 'A' }
});

test('CW-011: active remediation selects a constrained, non-excluded probe candidate', () => {
    const session = {
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true,
                type: 'MINI_PROBE',
                targetNodeId: 'K283',
                questionTypes: ['mcq'],
                difficulty: 'D2',
                successCriteria: {
                    minimumResult: 'correct',
                    requiredEvidenceDimension: 'apply'
                }
            }
        },
        attempts: [],
        history: [],
        currentDecision: {
            decisionId: 'DEC-1',
            action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { current: 'MINI_PRACTICE', next: 'MINI_PROBE' },
            selectionCriteria: {
                questionTypes: ['mcq', 'numeric'],
                difficulty: { min: 'D1', max: 'D5', preferred: 'D2' },
                excludeQuestionIds: ['Q-OLD']
            },
            constraints: {}
        }
    };
    const before = JSON.stringify(session);
    const constrained = applyK283RemediationProbeConstraints(session);
    const selected = selectQuestion({
        adaptiveDecision: constrained.currentDecision,
        questionBanks: [{
            bankId: 'QB-K283',
            primaryNode: 'K283',
            questions: [probeQuestion('Q-OLD'), probeQuestion('Q-PROBE')]
        }],
        history: [],
        now: '2026-10-01T09:00:00.000Z'
    });

    assert.equal(selected.status, 'SELECTED');
    assert.equal(selected.selected.questionId, 'Q-PROBE');
    assert.deepEqual(constrained.currentDecision.selectionCriteria.questionTypes, ['mcq']);
    assert.equal(constrained.currentDecision.selectionCriteria.difficulty.min, 'D2');
    assert.deepEqual(constrained.currentDecision.selectionCriteria.excludeQuestionIds, ['Q-OLD']);
    assert.equal(JSON.stringify(session), before);
});

test('CW-012: no eligible probe constraint is allowed to fail closed', () => {
    const session = {
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true,
                type: 'MINI_PROBE',
                targetNodeId: 'K283',
                questionTypes: ['numeric'],
                difficulty: 'D2',
                successCriteria: {
                    minimumResult: 'correct',
                    requiredEvidenceDimension: 'apply'
                }
            }
        },
        currentDecision: {
            action: 'REMEDIATE',
            path: { next: 'MINI_PROBE' },
            selectionCriteria: { questionTypes: ['mcq'] }
        }
    };
    const selected = selectK283NextQuestion({
        session: { ...session, runtime: { name: 'StudySession', status: 'active', sessionId: 'S1' } },
        now: '2026-10-01T09:00:00.000Z'
    });
    assert.equal(selected.selection.status, 'NO_MATCH');
    assert.equal(selected.selection.reason.code, 'K283_PROBE_CONSTRAINT_CONFLICT');
    assert.match(selected.selection.reason.message, /QUESTION_TYPE_CONFLICT/);
});

test('CW-013: selector returns NO_MATCH when every valid probe candidate is excluded', () => {
    const session = {
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true,
                type: 'MINI_PROBE',
                targetNodeId: 'K283',
                questionTypes: ['mcq'],
                difficulty: 'D2',
                successCriteria: {
                    minimumResult: 'correct',
                    requiredEvidenceDimension: 'apply'
                }
            }
        },
        currentDecision: {
            decisionId: 'DEC-1',
            action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { stage: 'MINI_PROBE' },
            pathStage: 'MINI_PROBE',
            selectionCriteria: {
                difficulty: { min: 'D1', max: 'D5', preferred: 'D2' },
                excludeQuestionIds: ['Q-USED']
            },
            constraints: {}
        }
    };
    const selected = selectK283NextQuestion({
        session: {
            ...session,
            runtime: { name: 'StudySession', status: 'active', sessionId: 'S1' },
            dependencies: {
                questionBanks: [{
                    bankId: 'QB-K283',
                    primaryNode: 'K283',
                    questions: [probeQuestion('Q-USED')]
                }]
            }
        },
        now: '2026-10-01T09:00:00.000Z'
    });
    assert.equal(selected.selection.status, 'NO_MATCH');
    assert.equal(selected.selection.reason.code, 'K283_PROBE_NO_ELIGIBLE_QUESTION');
});

test('CW-015: required evidence dimension is intersected with existing dimensions and difficulty', () => {
    const session = {
        runtime: { name: 'StudySession', status: 'active', sessionId: 'S1' },
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true, type: 'MINI_PROBE', targetNodeId: 'K283',
                questionTypes: ['mcq'], difficulty: 'D2',
                successCriteria: { minimumResult: 'correct', requiredEvidenceDimension: 'apply' }
            }
        },
        currentDecision: {
            decisionId: 'DEC-1', action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { next: 'MINI_PROBE' },
            selectionCriteria: {
                questionTypes: ['mcq'], evidenceDimensions: ['apply', 'know'],
                difficulty: { min: 'D1', max: 'D5' }, excludeQuestionIds: []
            }
        },
        dependencies: {
            questionBanks: [{
                bankId: 'QB-K283', primaryNode: 'K283',
                questions: [probeQuestion('Q-KNOW', 'D2', 'know'), probeQuestion('Q-APPLY', 'D2', 'apply')]
            }]
        },
        history: []
    };
    const result = selectK283NextQuestion({ session, now: '2026-10-01T09:00:00.000Z' });
    assert.equal(result.selection.status, 'SELECTED');
    assert.equal(result.question.id, 'Q-APPLY');
    assert.deepEqual(result.session.currentDecision.selectionCriteria.evidenceDimensions, ['apply']);
    assert.equal(result.session.currentDecision.selectionCriteria.difficulty.min, 'D2');
});

test('CW-016: required evidence dimension conflict returns a safe NO_MATCH', () => {
    const base = {
        runtime: { name: 'StudySession', status: 'active', sessionId: 'S1' },
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true, type: 'MINI_PROBE', targetNodeId: 'K283',
                questionTypes: ['mcq'], difficulty: 'D2',
                successCriteria: { minimumResult: 'correct', requiredEvidenceDimension: 'apply' }
            }
        },
        currentDecision: {
            decisionId: 'DEC-1', action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { next: 'MINI_PROBE' },
            selectionCriteria: {
                questionTypes: ['mcq'], evidenceDimensions: ['know'],
                difficulty: { min: 'D1', max: 'D5' }, excludeQuestionIds: []
            }
        }
    };
    const result = selectK283NextQuestion({ session: base, now: '2026-10-01T09:00:00.000Z' });
    assert.equal(result.selection.status, 'NO_MATCH');
    assert.equal(result.selection.reason.code, 'K283_PROBE_CONSTRAINT_CONFLICT');
    assert.match(result.selection.reason.message, /EVIDENCE_DIMENSION_CONFLICT/);
    assert.equal(result.session.activeRemediationPlan.remediationId, 'REM-1');
});

test('CW-017: existing exclusions remain enforced alongside required evidence', () => {
    const session = {
        runtime: { name: 'StudySession', status: 'active', sessionId: 'S1' },
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true, type: 'MINI_PROBE', targetNodeId: 'K283',
                questionTypes: ['mcq'], difficulty: 'D2',
                successCriteria: { minimumResult: 'correct', requiredEvidenceDimension: 'apply' }
            }
        },
        currentDecision: {
            decisionId: 'DEC-1', action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { next: 'MINI_PROBE' },
            selectionCriteria: {
                questionTypes: ['mcq'], evidenceDimensions: ['apply'],
                difficulty: { min: 'D1', max: 'D5' }, excludeQuestionIds: ['Q-EXCLUDED']
            }
        },
        dependencies: {
            questionBanks: [{
                bankId: 'QB-K283', primaryNode: 'K283',
                questions: [probeQuestion('Q-EXCLUDED'), probeQuestion('Q-AVAILABLE')]
            }]
        },
        history: []
    };
    const result = selectK283NextQuestion({ session, now: '2026-10-01T09:00:00.000Z' });
    assert.equal(result.selection.status, 'SELECTED');
    assert.equal(result.question.id, 'Q-AVAILABLE');
    assert.deepEqual(result.session.currentDecision.selectionCriteria.excludeQuestionIds, ['Q-EXCLUDED']);
});

test('CW-018: NO_MATCH cannot submit or advance checkpoint state', () => {
    let revision = 0;
    let session = {
        runtime: { sessionId: 'S1' },
        activeRemediationPlan: {
            remediationId: 'REM-1',
            probe: {
                required: true, type: 'MINI_PROBE', targetNodeId: 'K283',
                questionTypes: ['mcq'], difficulty: 'D2',
                successCriteria: { minimumResult: 'correct', requiredEvidenceDimension: 'apply' }
            }
        },
        currentDecision: {
            decisionId: 'DEC-1', action: 'REMEDIATE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            path: { next: 'MINI_PROBE' },
            selectionCriteria: {
                questionTypes: ['mcq'], evidenceDimensions: ['know'],
                difficulty: { min: 'D1', max: 'D5' }, excludeQuestionIds: []
            }
        }
    };
    let submitCalls = 0;
    const authority = {
        inspect: () => ({ sessionId: 'S1', revision, session: structuredClone(session) }),
        mutate: ({ expectedRevision, apply }) => {
            assert.equal(expectedRevision, revision);
            session = apply(structuredClone(session));
            revision += 1;
        }
    };
    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId: 'S1',
        authority,
        coordination: { withWriter: ({ write }) => write() },
        attemptStore: {
            appendAttempt() {}, getAttempt: () => null, listAttemptIds: () => []
        },
        journal: {
            prepare() {}, markUnknown() {}, reconcile() {},
            read: () => null
        },
        durableCommit: {
            commit() { throw new Error('must not commit'); },
            read: () => null, audit: () => ({ status: 'NO_CHECKPOINT' })
        },
        contentRefs: { test: { id: 'test', version: '1', sha256: 'a'.repeat(64) } },
        select: ({ session: current, now }) => selectK283NextQuestion({
            session: {
                ...current,
                dependencies: { questionBanks: [] },
                history: []
            },
            now
        }),
        submit: () => { submitCalls += 1; throw new Error('must not submit'); }
    });

    const selected = coordinator.selectNext();
    assert.equal(selected.selection.status, 'NO_MATCH');
    assert.equal(selected.session.activeRemediationPlan.remediationId, 'REM-1');
    assert.throws(() => coordinator.submitSelected({ attemptId: 'A1' }), /K283_MULTI_NO_SELECTION/);
    assert.equal(submitCalls, 0);
    assert.equal(coordinator.inspect().completed, 0);
    assert.equal(coordinator.inspect().checkpointRevision, 0);
    assert.equal(session.activeRemediationPlan.remediationId, 'REM-1');
});

test('CW-014: probe outcome display distinguishes pass, fail, and ordinary attempts', () => {
    assert.equal(formatK283ProbeOutcome({ isProbe: true, passed: true, reason: 'SUCCESS' }), 'Probe PASS (SUCCESS)');
    assert.equal(formatK283ProbeOutcome({ isProbe: true, passed: false, reason: 'CRITERIA' }), 'Probe FAIL (CRITERIA)');
    assert.equal(formatK283ProbeOutcome({ isProbe: false, passed: false }), null);
});
