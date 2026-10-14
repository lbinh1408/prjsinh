/**
 * tests/unit/k283ImmediateFeedbackV1.test.js
 *
 * Focused unit tests for K283 Immediate Feedback V1.
 * Covers: incorrect answer, correct answer, missing-explanation fallback.
 *
 * Uses only public APIs from k283ImmediateFeedbackV1.js.
 * Runner: node:test — matches project convention (type: "module", no jest config).
 * No engine calls, no mocks, no question bank I/O.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuestionFeedback, formatQuestionFeedbackLines } from '../../k283ImmediateFeedbackV1.js';

// ---------------------------------------------------------------------------
// Minimal fixtures (field shapes derived from K283.question-bank.json)
// ---------------------------------------------------------------------------

const MCQ_QUESTION = {
    id: 'Q-A-K283-K-001',
    answer: { type: 'single', value: 'A' },
    explanation: {
        correct: 'Tần số hoán vị gene được xác định bằng tổng tỉ lệ các giao tử tái tổ hợp.',
        incorrect: {
            B: 'Giao tử mang tổ hợp allele bố mẹ thuộc nhóm không tái tổ hợp.',
            C: 'Mỗi loại giao tử chỉ phản ánh một nửa tổng số tái tổ hợp.',
            D: 'Cần tính tổng tất cả giao tử tái tổ hợp.'
        }
    },
    hint: {
        enabled: true,
        levels: [
            { level: 1, text: 'Hãy nhớ f phản ánh phần giao tử được xếp vào nhóm tái tổ hợp.' },
            { level: 2, text: 'Nếu có hai loại giao tử tái tổ hợp, phải cộng tỉ lệ của cả hai.' }
        ]
    }
};

const NUMERIC_QUESTION = {
    id: 'Q-A-K283-T-010',
    answer: { type: 'numeric', value: 25 },
    explanation: {
        correct: 'Với kiểu sắp xếp AB/ab, Ab và aB là hai loại giao tử tái tổ hợp. Tổng = 25%.',
        incorrect: { default: 'Cần cộng tỉ lệ của tất cả giao tử thuộc nhóm tái tổ hợp.' }
    },
    hint: {
        enabled: true,
        levels: [{ level: 1, text: 'Xác định loại giao tử tái tổ hợp rồi cộng tỉ lệ lại.' }]
    }
};

const QUESTION_NO_EXPLANATION = {
    id: 'Q-STUB-NO-EXPL',
    answer: { type: 'single', value: 'A' },
    explanation: null,
    hint: { enabled: false, levels: [] }
};

const QUESTION_HINT_DISABLED = {
    id: 'Q-STUB-HINT-OFF',
    answer: { type: 'single', value: 'B' },
    explanation: {
        correct: 'Correct explanation text.',
        incorrect: { default: 'Wrong-answer explanation.' }
    },
    hint: { enabled: false, levels: [{ level: 1, text: 'Hidden hint.' }] }
};

const EVAL_WRONG   = { correct: false };
const EVAL_CORRECT = { correct: true };

// ===========================================================================
// resolveQuestionFeedback
// ===========================================================================

test('FB-001: incorrect MCQ — resolves per-option explanation and hint', () => {
    const fb = resolveQuestionFeedback(MCQ_QUESTION, EVAL_WRONG, 'B');
    assert.equal(fb.isCorrect, false);
    assert.equal(fb.correctValue, 'A');
    assert.equal(fb.hasAuthoritativeExplanation, true);
    assert.equal(fb.explanationText, MCQ_QUESTION.explanation.incorrect.B);
    assert.equal(fb.hintText, MCQ_QUESTION.hint.levels[0].text);
});

test('FB-002: incorrect MCQ unknown option — falls back to correct explanation', () => {
    const fb = resolveQuestionFeedback(MCQ_QUESTION, EVAL_WRONG, 'X');
    assert.equal(fb.isCorrect, false);
    assert.equal(fb.correctValue, 'A');
    assert.equal(fb.hasAuthoritativeExplanation, true);
    assert.equal(fb.explanationText, MCQ_QUESTION.explanation.correct);
});

test('FB-003: incorrect numeric — resolves default incorrect explanation', () => {
    const fb = resolveQuestionFeedback(NUMERIC_QUESTION, EVAL_WRONG, 30);
    assert.equal(fb.isCorrect, false);
    assert.equal(fb.correctValue, 25);
    assert.equal(fb.hasAuthoritativeExplanation, true);
    assert.equal(fb.explanationText, NUMERIC_QUESTION.explanation.incorrect.default);
    assert.equal(fb.hintText, NUMERIC_QUESTION.hint.levels[0].text);
});

test('FB-004: correct MCQ — resolves correct explanation, hintText null', () => {
    const fb = resolveQuestionFeedback(MCQ_QUESTION, EVAL_CORRECT);
    assert.equal(fb.isCorrect, true);
    assert.equal(fb.correctValue, 'A');
    assert.equal(fb.hasAuthoritativeExplanation, true);
    assert.equal(fb.explanationText, MCQ_QUESTION.explanation.correct);
    assert.equal(fb.hintText, null);
});

test('FB-005: correct numeric — resolves correct explanation', () => {
    const fb = resolveQuestionFeedback(NUMERIC_QUESTION, EVAL_CORRECT);
    assert.equal(fb.isCorrect, true);
    assert.equal(fb.correctValue, 25);
    assert.equal(fb.hasAuthoritativeExplanation, true);
    assert.equal(fb.explanationText, NUMERIC_QUESTION.explanation.correct);
});

test('FB-006: missing explanation — hasAuthoritativeExplanation=false, explanationText=null', () => {
    const fb = resolveQuestionFeedback(QUESTION_NO_EXPLANATION, EVAL_WRONG, 'B');
    assert.equal(fb.isCorrect, false);
    assert.equal(fb.hasAuthoritativeExplanation, false);
    assert.equal(fb.explanationText, null);
    assert.equal(fb.hintText, null);
});

test('FB-007: hint disabled — hintText is null even when level text exists', () => {
    const fb = resolveQuestionFeedback(QUESTION_HINT_DISABLED, EVAL_WRONG, 'A');
    assert.equal(fb.isCorrect, false);
    assert.equal(fb.hintText, null);
    assert.equal(fb.hasAuthoritativeExplanation, true);
});

// ===========================================================================
// formatQuestionFeedbackLines
// ===========================================================================

test('FB-008: formatQuestionFeedbackLines — incorrect full content produces 3 lines', () => {
    const fb = resolveQuestionFeedback(MCQ_QUESTION, EVAL_WRONG, 'B');
    const lines = formatQuestionFeedbackLines(fb);
    assert.equal(lines.length, 3);
    assert.match(lines[0], /^Correct answer:/);
    assert.ok(lines[0].includes('A'));
    assert.match(lines[1], /^Explanation\s*:/);
    assert.ok(lines[1].includes(MCQ_QUESTION.explanation.incorrect.B.slice(0, 10)));
    assert.match(lines[2], /^Hint\s*:/);
});

test('FB-009: formatQuestionFeedbackLines — missing explanation shows neutral fallback, no fabrication', () => {
    const fb = resolveQuestionFeedback(QUESTION_NO_EXPLANATION, EVAL_WRONG, 'B');
    const lines = formatQuestionFeedbackLines(fb);
    assert.ok(lines.some(l => l.startsWith('Correct answer:')), 'should have correct answer line');
    const explLine = lines.find(l => l.startsWith('Explanation'));
    assert.ok(explLine, 'should have explanation line');
    assert.match(explLine, /No explanation available/i);
    assert.doesNotMatch(explLine, /because|since|therefore|hence/i);
});

test('FB-010: formatQuestionFeedbackLines — correct answer shows explanation only, no hint line', () => {
    const fb = resolveQuestionFeedback(MCQ_QUESTION, EVAL_CORRECT);
    const lines = formatQuestionFeedbackLines(fb);
    assert.ok(!lines.some(l => l.startsWith('Correct answer:')), 'should not show correct-answer line');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^Explanation\s*:/);
});

test('FB-011: formatQuestionFeedbackLines — correct with missing explanation produces empty output', () => {
    const fb = resolveQuestionFeedback(QUESTION_NO_EXPLANATION, EVAL_CORRECT);
    const lines = formatQuestionFeedbackLines(fb);
    assert.equal(lines.length, 0);
});
