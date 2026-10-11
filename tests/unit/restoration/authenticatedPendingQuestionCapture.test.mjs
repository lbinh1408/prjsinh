import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveSessionRevisionAuthority } from '../../../src/restoration/liveSessionRevisionAuthority.js';
import { preflightPendingQuestionCapture } from '../../../src/restoration/authenticatedPendingQuestionCapture.js';
const question = { id: 'q1' };
const item = { sectionId: 's1', kind: 'question_set', disposition: 'include' };
function fixture() {
    return {
        runtime: { name: 'StudySession', version: '0.2.0', status: 'active', sessionId: 'session-1' },
        currentDecision: { decisionId: 'd1', action: 'PRACTICE' },
        currentSelection: { status: 'SELECTED', decisionId: 'd1', action: 'PRACTICE', selected: { bankId: 'b1', questionId: 'q1', question } },
        currentQuestion: question,
        lessonRuntime: { currentItem: item, plan: { status: 'READY', items: [item] }, progress: { completedSectionIds: [], skippedSectionIds: [] } },
        history: [], attempts: []
    };
}
const project = (s, { revision }) => ({ ...s, revision, attemptIds: s.attempts.map(a => a.attemptId) });
function setup() {
    const authority = createLiveSessionRevisionAuthority({ initialSession: fixture(), initialRevision: 1 });
    const capture = authority.capture({ expectedRevision: 1, readSnapshot: s => s });
    return { authority, capture };
}
test('accepts shape under cooperative fence, never authorizes submit or persistence', () => {
    const result = preflightPendingQuestionCapture({ ...setup(), checkpointFromSnapshot: project });
    assert.equal(result.questionId, 'q1');
    for (const flag of ['executable', 'submitAuthorized', 'inFlightSubmitExcluded', 'durableCommitPerformed', 'authenticatedEnvelopeVerified']) assert.equal(result[flag], false);
});
test('rejects stale revision', () => {
    const x = setup();
    x.authority.mutate({ expectedRevision: 1, apply: s => ({ ...s, history: [{ changed: true }] }) });
    assert.throws(() => preflightPendingQuestionCapture({ ...x, checkpointFromSnapshot: project }), /FENCE_STALE_CAPTURE/);
});
test('rejects changed question projection', () => {
    assert.throws(() => preflightPendingQuestionCapture({ ...setup(), checkpointFromSnapshot: (s, m) => ({ ...project(s, m), currentQuestion: { id: 'other' } }) }), /QUESTION_CAPTURE_PROJECTION_DRIFT/);
});
test('rejects attempt projection drift', () => {
    assert.throws(() => preflightPendingQuestionCapture({ ...setup(), checkpointFromSnapshot: (s, m) => ({ ...project(s, m), attemptIds: ['invented'] }) }), /QUESTION_CAPTURE_ATTEMPT_DRIFT/);
});
test('rejects asynchronous checkpoint projector', () => {
    assert.throws(() => preflightPendingQuestionCapture({ ...setup(), checkpointFromSnapshot: async s => s }), /QUESTION_CAPTURE_ASYNC_UNSUPPORTED/);
});
test('rejects missing capture', () => {
    assert.throws(() => preflightPendingQuestionCapture({ authority: setup().authority, checkpointFromSnapshot: project }), /QUESTION_CAPTURE_INVALID_INPUT/);
});
