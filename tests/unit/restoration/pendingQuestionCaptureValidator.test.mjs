import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePendingQuestionCapture as validate } from '../../../src/restoration/pendingQuestionCaptureValidator.js';
const fixture = () => {
    const question = { id: 'q1', questionType: 'mcq' };
    const item = { sectionId: 's1', sectionType: 'practice', kind: 'question_set', disposition: 'include', reason: 'ACTION_PRACTICE', nodes: [], estimatedMinutes: null, questionRequest: {} };
    return { runtime: { name: 'StudySession', version: '0.2.0', status: 'active' }, currentDecision: { decisionId: 'd1', action: 'PRACTICE' }, currentSelection: { status: 'SELECTED', decisionId: 'd1', action: 'PRACTICE', selected: { bankId: 'b1', questionId: 'q1', question: structuredClone(question) } }, currentQuestion: question, lessonRuntime: { currentItem: structuredClone(item), plan: { status: 'READY', items: [item] }, progress: { completedSectionIds: [], skippedSectionIds: [] } }, attemptIds: [], history: [] };
};
test('accepts coherent pending question as guarded shape only', () => { const r = validate(fixture()); assert.equal(r.executable, false); assert.equal(r.submitAuthorized, false); assert.equal(r.inFlightSubmitExcluded, false) });
const cases = [
    ['inactive runtime', s => s.runtime.status = 'completed', 'PENDING_QUESTION_RUNTIME'],
    ['content item', s => s.lessonRuntime.currentItem.kind = 'content', 'PENDING_QUESTION_ITEM'],
    ['missing selected question', s => s.currentSelection.selected = null, 'PENDING_QUESTION_SELECTION'],
    ['question id drift', s => s.currentQuestion.id = 'q2', 'PENDING_QUESTION_IDENTITY'],
    ['question payload drift', s => s.currentQuestion.questionType = 'numeric', 'PENDING_QUESTION_IDENTITY'],
    ['decision drift', s => s.currentSelection.decisionId = 'other', 'PENDING_QUESTION_DECISION'],
    ['duplicate plan sections', s => s.lessonRuntime.plan.items.push(structuredClone(s.lessonRuntime.plan.items[0])), 'PENDING_QUESTION_PLAN'],
    ['already completed', s => s.lessonRuntime.progress.completedSectionIds.push('s1'), 'PENDING_QUESTION_NAVIGATION'],
    ['skipped', s => s.lessonRuntime.progress.skippedSectionIds.push('s1'), 'PENDING_QUESTION_NAVIGATION'],
    ['item tampering', s => s.lessonRuntime.currentItem.questionRequest = { changed: true }, 'PENDING_QUESTION_NAVIGATION'],
    ['unknown progress id', s => s.lessonRuntime.progress.completedSectionIds.push('unknown'), 'PENDING_QUESTION_PROGRESS']
];
for (const [name, mutate, code] of cases) test('rejects ' + name, () => { const s = fixture(); mutate(s); assert.throws(() => validate(s), { code }) });
