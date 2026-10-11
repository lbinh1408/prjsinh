/** Submit Lifecycle Fence V1 DRAFT. In-process cooperative coordinator; no resume permit. */
import { isDeepStrictEqual } from 'node:util';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const detached = v => structuredClone(v);
/** All session writers MUST use this coordinator; never expose its authority for direct mutation. */
export function createSubmitLifecycleFence({ authority, submit, persistAttempt } = {}) {
    if (!authority || typeof authority.inspect !== 'function' || typeof authority.mutate !== 'function' || typeof authority.capture !== 'function' || typeof submit !== 'function' || typeof persistAttempt !== 'function') fail('SUBMIT_FENCE_INVALID_INPUT');
    let phase = 'IDLE';
    let pendingAttemptId = null;
    const inspect = () => Object.freeze({ phase, pendingAttemptId, executable: false, submitAuthorized: false, durableCommitProven: false });
    function capturePreSubmit({ expectedRevision, readSnapshot } = {}) {
        if (phase !== 'IDLE') fail('SUBMIT_FENCE_CAPTURE_BLOCKED');
        const result = authority.capture({ expectedRevision, readSnapshot });
        if (phase !== 'IDLE') fail('SUBMIT_FENCE_CAPTURE_BLOCKED');
        return { ...result, submitLifecycle: { phase: 'IDLE', inFlightSubmitExcludedUnderCoordinator: true, durableAbsenceProven: false, executable: false } };
    }
    /** No retry on failure. Persist callback must be synchronous and authoritative for its own commit. */
    function submitOnce({ expectedRevision, attemptId, args = {} } = {}) {
        if (phase !== 'IDLE') fail('SUBMIT_FENCE_SUBMIT_BLOCKED');
        if (!nonempty(attemptId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || args === null || typeof args !== 'object' || Array.isArray(args)) fail('SUBMIT_FENCE_INVALID_SUBMIT');
        const before = authority.inspect();
        if (before.revision !== expectedRevision) fail('SUBMIT_FENCE_REVISION_CONFLICT');
        if (before.session.currentSelection?.status !== 'SELECTED' || !before.session.currentQuestion) fail('SUBMIT_FENCE_NO_QUESTION');
        phase = 'SUBMITTING'; pendingAttemptId = attemptId;
        try {
            const result = submit({ ...detached(args), session: detached(before.session), attemptId });
            if (result && typeof result.then === 'function') fail('SUBMIT_FENCE_ASYNC_UNSUPPORTED');
            if (!result?.session || result?.attempt?.attemptId !== attemptId || result.attempt.sessionId !== before.session.runtime.sessionId) fail('SUBMIT_FENCE_INVALID_RESULT');
            phase = 'COMMIT_UNKNOWN'; // Before any external side effect: fail closed.
            const receipt = persistAttempt({ sessionId: before.session.runtime.sessionId, attempt: detached(result.attempt) });
            if (receipt && typeof receipt.then === 'function') fail('SUBMIT_FENCE_ASYNC_UNSUPPORTED');
            // A returned receipt is not proof of durable persistence. Caller must independently audit storage.
            if (!isDeepStrictEqual(authority.inspect().session, before.session) || authority.inspect().revision !== expectedRevision) fail('SUBMIT_FENCE_STATE_DRIFT');
            authority.mutate({ expectedRevision, apply: () => detached(result.session) });
            phase = 'COMMITTED';
            return { phase, attemptId, receipt: detached(receipt ?? null), revision: authority.inspect().revision, durableCommitProven: false, executable: false };
        } catch (e) {
            phase = 'COMMIT_UNKNOWN';
            throw e;
        }
    }
    return Object.freeze({ inspect, capturePreSubmit, submitOnce });
}
