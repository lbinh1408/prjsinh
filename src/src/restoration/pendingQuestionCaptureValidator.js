/** Phase 3.3-C Pending Selected Question V1 — DRAFT; pure, fail-closed. */
import { isDeepStrictEqual } from 'node:util';
import { getNextLessonItem } from '../engines/lesson/lessonEngine.js';
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const reject = code => { const e = new Error(code); e.code = code; throw e; };
const equal = (a, b) => isDeepStrictEqual(a, b);
/** Validates a pre-submit question pending in a lesson. Does not authorize resume/submit. */
export function validatePendingQuestionCapture(checkpoint) {
    if (!obj(checkpoint) || checkpoint.runtime?.name !== 'StudySession' || checkpoint.runtime?.version !== '0.2.0' || checkpoint.runtime?.status !== 'active') reject('PENDING_QUESTION_RUNTIME');
    const lessonRuntime = checkpoint.lessonRuntime;
    const item = lessonRuntime?.currentItem;
    const selection = checkpoint.currentSelection;
    const question = checkpoint.currentQuestion;
    if (!obj(item) || item.kind !== 'question_set' || !nonempty(item.sectionId)) reject('PENDING_QUESTION_ITEM');
    if (!obj(selection) || selection.status !== 'SELECTED' || !obj(selection.selected) || !obj(question)) reject('PENDING_QUESTION_SELECTION');
    if (!nonempty(question.id) || selection.selected.questionId !== question.id || !nonempty(selection.selected.bankId) || !equal(selection.selected.question, question)) reject('PENDING_QUESTION_IDENTITY');
    if (!nonempty(selection.decisionId) || selection.decisionId !== checkpoint.currentDecision?.decisionId || selection.action !== checkpoint.currentDecision?.action) reject('PENDING_QUESTION_DECISION');
    if (!obj(lessonRuntime.plan) || lessonRuntime.plan.status !== 'READY' || !Array.isArray(lessonRuntime.plan.items) || !obj(lessonRuntime.progress) || !Array.isArray(lessonRuntime.progress.completedSectionIds) || !Array.isArray(lessonRuntime.progress.skippedSectionIds)) reject('PENDING_QUESTION_PLAN');
    const items = lessonRuntime.plan.items;
    const ids = items.map(x => x?.sectionId);
    if (ids.some(id => !nonempty(id)) || new Set(ids).size !== ids.length) reject('PENDING_QUESTION_PLAN');
    const completed = lessonRuntime.progress.completedSectionIds, skipped = lessonRuntime.progress.skippedSectionIds;
    if ([...completed, ...skipped].some(id => !nonempty(id) || !ids.includes(id)) || new Set([...completed, ...skipped]).size !== completed.length + skipped.length) reject('PENDING_QUESTION_PROGRESS');
    let next;
    try { next = getNextLessonItem({ plan: lessonRuntime.plan, progress: lessonRuntime.progress }); }
    catch { reject('PENDING_QUESTION_PLAN'); }
    if (next.status !== 'NEXT_ITEM' || !equal(next.item, item) || item.disposition !== 'include') reject('PENDING_QUESTION_NAVIGATION');
    if (checkpoint.attemptIds !== undefined && (!Array.isArray(checkpoint.attemptIds) || checkpoint.attemptIds.some(id => !nonempty(id)))) reject('PENDING_QUESTION_ATTEMPTS');
    if (checkpoint.attemptIds?.length && !Array.isArray(checkpoint.history)) reject('PENDING_QUESTION_ATTEMPTS');
    // A captured snapshot alone cannot establish the absence of an in-flight submit.
    // The fenced capture authority must separately prove that boundary.
    return Object.freeze({ status: 'validated-pending-question-shape', sectionId: item.sectionId, questionId: question.id, executable: false, submitAuthorized: false, inFlightSubmitExcluded: false });
}
