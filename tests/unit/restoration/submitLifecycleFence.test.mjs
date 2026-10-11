import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveSessionRevisionAuthority } from '../../../src/restoration/liveSessionRevisionAuthority.js';
import { createSubmitLifecycleFence } from '../../../src/restoration/submitLifecycleFence.js';
const session = () => ({ runtime: { name: 'StudySession', version: '0.2.0', sessionId: 's', status: 'active' }, currentSelection: { status: 'SELECTED' }, currentQuestion: { id: 'q' }, attempts: [] });
const make = ({ submit, persistAttempt } = {}) => {
    const authority = createLiveSessionRevisionAuthority({ initialSession: session() });
    const fence = createSubmitLifecycleFence({ authority, submit: submit ?? (({ session, attemptId }) => ({ session: { ...session, currentQuestion: null, currentSelection: null }, attempt: { attemptId, sessionId: 's' } })), persistAttempt: persistAttempt ?? (() => ({ stored: true })) });
    return { authority, fence };
};
test('capture IDLE is explicitly non executable', () => { const { fence } = make(); const x = fence.capturePreSubmit({ expectedRevision: 0, readSnapshot: s => s }); assert.equal(x.submitLifecycle.inFlightSubmitExcludedUnderCoordinator, true); assert.equal(x.submitLifecycle.durableAbsenceProven, false); });
test('submit once updates authority revision', () => { const { fence, authority } = make(); const r = fence.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.equal(r.phase, 'COMMITTED'); assert.equal(authority.inspect().revision, 1); });
test('no repeat submit', () => { const { fence } = make(); fence.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.throws(() => fence.submitOnce({ expectedRevision: 1, attemptId: 'b' }), { code: 'SUBMIT_FENCE_SUBMIT_BLOCKED' }); });
test('capture blocked after commit', () => { const { fence } = make(); fence.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.throws(() => fence.capturePreSubmit({ expectedRevision: 1, readSnapshot: s => s }), { code: 'SUBMIT_FENCE_CAPTURE_BLOCKED' }); });
test('persist error enters unknown and blocks capture', () => { const { fence } = make({ persistAttempt: () => { throw Error('disk'); } }); assert.throws(() => fence.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(fence.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => fence.capturePreSubmit({ expectedRevision: 0, readSnapshot: s => s }), { code: 'SUBMIT_FENCE_CAPTURE_BLOCKED' }); });
test('submit error enters unknown', () => { const { fence } = make({ submit: () => { throw Error('evaluation'); } }); assert.throws(() => fence.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(fence.inspect().phase, 'COMMIT_UNKNOWN'); });
test('stale revision rejected before lifecycle change', () => { const { fence } = make(); assert.throws(() => fence.submitOnce({ expectedRevision: 3, attemptId: 'a' }), { code: 'SUBMIT_FENCE_REVISION_CONFLICT' }); assert.equal(fence.inspect().phase, 'IDLE'); });
test('async persistence rejected and unknown', () => { const { fence } = make({ persistAttempt: () => Promise.resolve(true) }); assert.throws(() => fence.submitOnce({ expectedRevision: 0, attemptId: 'a' }), { code: 'SUBMIT_FENCE_ASYNC_UNSUPPORTED' }); assert.equal(fence.inspect().phase, 'COMMIT_UNKNOWN'); });
test('invalid result rejected', () => { const { fence } = make({ submit: () => ({}) }); assert.throws(() => fence.submitOnce({ expectedRevision: 0, attemptId: 'a' }), { code: 'SUBMIT_FENCE_INVALID_RESULT' }); });
