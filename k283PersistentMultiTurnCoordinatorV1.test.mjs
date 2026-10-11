import test from 'node:test';
import assert from 'node:assert/strict';
import { createK283PersistentMultiTurnCoordinatorV1 } from './src/restoration/k283PersistentMultiTurnCoordinatorV1.js';
const make = () => {
    let revision = 0, session = { runtime: { sessionId: 's' }, attempts: [] }, writes = 0;
    const authority = {
        inspect: () => ({ sessionId: 's', revision, session: structuredClone(session) }), mutate: ({ expectedRevision, apply }) => {
            assert.equal(expectedRevision, revision); session = apply(structuredClone(session)); revision++;
        }
    };
    const coordination = { withWriter: ({ write }) => { writes++; return write({ epoch: writes }); } };
    const attemptStore = { appendAttempt() { }, getAttempt() { return null; }, listAttemptIds() { return []; } };
    const journal = { prepare() { }, markUnknown() { }, reconcile() { }, read() { return null; } };
    const durableCommit = { commit() { }, read() { return null; }, audit() { } };
    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId: 's', authority, coordination,
        attemptStore, journal, durableCommit, contentRefs: {}, select: ({ session }) => ({ session: { ...session, currentSelection: { status: 'SELECTED' }, currentQuestion: { id: 'q' } }, selection: { status: 'SELECTED' }, question: { id: 'q' } }), submit: () => ({})
    });
    return { coordinator, getWrites: () => writes };
};
test('fresh coordinator begins without resume or retry permission', () => {
    const { coordinator } = make(); assert.equal(coordinator.inspect().completed, 0);
    assert.equal(coordinator.inspect().resumeAuthorized, false); assert.equal(coordinator.inspect().retryAuthorized, false);
});
test('submit without selected question is blocked', () => {
    const { coordinator } = make(); assert.throws(() => coordinator.submitSelected({ attemptId: 'a' }), /K283_MULTI_NO_SELECTION/);
});
test('selection advances in-memory authority revision', () => {
    const { coordinator, getWrites } = make(); const s = coordinator.selectNext();
    assert.equal(s.revision, 1); assert.equal(coordinator.inspect().awaitingSubmit, true); assert.equal(getWrites(), 1);
});
test('second selection while pending is blocked', () => {
    const { coordinator } = make(); coordinator.selectNext(); assert.throws(() => coordinator.selectNext(), /K283_MULTI_SELECTION_PENDING/);
});
test('failed submit poisons coordinator and denies retry', () => {
    const { coordinator } = make(); coordinator.selectNext();
    assert.throws(() => coordinator.submitSelected({ attemptId: 'a' }), /K283_MULTI_INVALID_RESULT/);
    assert.equal(coordinator.inspect().poisoned, true);
    assert.throws(() => coordinator.submitSelected({ attemptId: 'a' }), /K283_MULTI_POISONED/);
});
