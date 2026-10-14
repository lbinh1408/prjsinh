/**
 * tests/unit/k283RemediationContentResolverV1.test.js
 *
 * Focused unit tests for K283 Remediation Content Resolver V1.
 * Covers: correct mapping, missing question reference, neutral fallback,
 * ERROR_ANALYSIS per-option, MICRO_LEARN, EXAMPLE.
 *
 * Runner: node:test — matches project convention (type: "module").
 * No engine calls, no mocks, no question bank I/O.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveRemediationStepContent,
    formatRemediationStepLines,
    INSTRUCTIONAL_STEP_TYPES,
} from '../../k283RemediationContentResolverV1.js';

// ---------------------------------------------------------------------------
// Fixtures derived from K283.question-bank.json field shapes
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

const QUESTION_HINT_DISABLED = {
    id: 'Q-STUB-H',
    answer: { type: 'single', value: 'A' },
    explanation: { correct: 'Correct text here.', incorrect: {} },
    hint: { enabled: false, levels: [{ level: 1, text: 'Hidden.' }] }
};

const step = (type, id = 'RSTEP-1') => ({ stepId: id, type, targetNodeIds: ['K283'] });

// ===========================================================================
// INSTRUCTIONAL_STEP_TYPES export
// ===========================================================================

test('RC-001: INSTRUCTIONAL_STEP_TYPES includes exactly MICRO_LEARN, EXAMPLE, ERROR_ANALYSIS', () => {
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('MICRO_LEARN'));
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('EXAMPLE'));
    assert.ok(INSTRUCTIONAL_STEP_TYPES.includes('ERROR_ANALYSIS'));
    assert.equal(INSTRUCTIONAL_STEP_TYPES.length, 3);
});

// ===========================================================================
// ERROR_ANALYSIS
// ===========================================================================

test('RC-002: ERROR_ANALYSIS — per-option explanation resolved for known option', () => {
    const r = resolveRemediationStepContent({ step: step('ERROR_ANALYSIS'), question: MCQ_FULL, chosenOption: 'B' });
    assert.equal(r.isAuthoritative, true);
    assert.equal(r.stepType, 'ERROR_ANALYSIS');
    assert.equal(r.body, MCQ_FULL.explanation.incorrect.B);
    assert.equal(r.hint, MCQ_FULL.hint.levels[0].text);
    assert.equal(r.headline, 'Error Analysis');
});

test('RC-003: ERROR_ANALYSIS — falls back to incorrect.default for numeric unknown response', () => {
    const r = resolveRemediationStepContent({ step: step('ERROR_ANALYSIS'), question: NUMERIC_FULL, chosenOption: 99 });
    assert.equal(r.isAuthoritative, true);
    assert.equal(r.body, NUMERIC_FULL.explanation.incorrect.default);
});

test('RC-004: ERROR_ANALYSIS — falls back to correct explanation when no incorrect map exists', () => {
    const r = resolveRemediationStepContent({ step: step('ERROR_ANALYSIS'), question: QUESTION_HINT_DISABLED, chosenOption: 'B' });
    assert.equal(r.isAuthoritative, true);
    assert.equal(r.body, 'Correct text here.');
    assert.equal(r.hint, null);   // hint disabled
});

test('RC-005: ERROR_ANALYSIS — fallback when no explanation content at all', () => {
    const r = resolveRemediationStepContent({ step: step('ERROR_ANALYSIS'), question: QUESTION_NO_CONTENT, chosenOption: 'B' });
    assert.equal(r.isAuthoritative, false);
    assert.match(r.body, /No error analysis content/i);
});

// ===========================================================================
// MICRO_LEARN
// ===========================================================================

test('RC-006: MICRO_LEARN — resolves correct explanation as body, headline=Review', () => {
    const r = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: MCQ_FULL });
    assert.equal(r.isAuthoritative, true);
    assert.equal(r.headline, 'Review');
    assert.equal(r.body, MCQ_FULL.explanation.correct);
    assert.equal(r.hint, MCQ_FULL.hint.levels[0].text);
});

test('RC-007: MICRO_LEARN — fallback when question is null', () => {
    const r = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: null });
    assert.equal(r.isAuthoritative, false);
    assert.match(r.body, /No question reference/i);
});

test('RC-008: MICRO_LEARN — fallback when explanation is missing', () => {
    const r = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: QUESTION_NO_CONTENT });
    assert.equal(r.isAuthoritative, false);
    assert.match(r.body, /No explanation content/i);
});

// ===========================================================================
// EXAMPLE
// ===========================================================================

test('RC-009: EXAMPLE — resolves correct explanation as body, headline=Example', () => {
    const r = resolveRemediationStepContent({ step: step('EXAMPLE'), question: NUMERIC_FULL });
    assert.equal(r.isAuthoritative, true);
    assert.equal(r.headline, 'Example');
    assert.equal(r.body, NUMERIC_FULL.explanation.correct);
    assert.equal(r.hint, NUMERIC_FULL.hint.levels[0].text);
});

// ===========================================================================
// Non-instructional step type
// ===========================================================================

test('RC-010: MINI_PRACTICE — not an instructional type, returns fallback with message', () => {
    const r = resolveRemediationStepContent({ step: step('MINI_PRACTICE'), question: MCQ_FULL });
    assert.equal(r.isAuthoritative, false);
    assert.match(r.body, /not an instructional type/i);
});

// ===========================================================================
// formatRemediationStepLines
// ===========================================================================

test('RC-011: formatRemediationStepLines — full content produces 3 lines', () => {
    const r = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: MCQ_FULL });
    const lines = formatRemediationStepLines(r);
    assert.equal(lines.length, 3);
    assert.equal(lines[0], 'Review');
    assert.equal(lines[1], MCQ_FULL.explanation.correct);
    assert.ok(lines[2].startsWith('Hint:'));
});

test('RC-012: formatRemediationStepLines — fallback produces exactly 1 line (body only)', () => {
    const r = resolveRemediationStepContent({ step: step('MICRO_LEARN'), question: null });
    const lines = formatRemediationStepLines(r);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /No question reference/i);
});

test('RC-013: formatRemediationStepLines — hint disabled produces 2 lines (headline + body)', () => {
    const r = resolveRemediationStepContent({ step: step('EXAMPLE'), question: QUESTION_HINT_DISABLED });
    const lines = formatRemediationStepLines(r);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], 'Example');
    assert.equal(lines[1], 'Correct text here.');
});
