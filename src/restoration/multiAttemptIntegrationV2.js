/** Phase 3.3-C — Multi-Attempt Integration V2 DRAFT.
 * Cooperative, synchronous, same-process-only. NOT a recovery/resume permit.
 * Must be the exclusive session writer; journal/attempt store roots are trusted local storage.
 */
import { isDeepStrictEqual } from 'node:util';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const clone = x => structuredClone(x);
const validId = x => typeof x === 'string' && x.trim() === x && x.length > 0 && x.length <= 256;
const promise = x => x !== null && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
export function createMultiAttemptIntegrationV2({ authority, submit, attemptStore, journal } = {}) {
    if (!authority || typeof authority.inspect !== 'function' || typeof authority.mutate !== 'function' ||
        typeof authority.capture !== 'function' || typeof submit !== 'function' ||
        typeof attemptStore?.appendAttempt !== 'function' || typeof attemptStore?.getAttempt !== 'function' ||
        !['prepare', 'markUnknown', 'reconcile', 'read'].every(k => typeof journal?.[k] === 'function')) fail('MULTI_V2_INVALID_INPUT');
    const initial = authority.inspect();
    const sessionId = initial.session?.runtime?.sessionId;
    if (!validId(sessionId) || initial.sessionId !== sessionId) fail('MULTI_V2_INVALID_SESSION');
    // A new instance cannot establish whether earlier in-memory session mutations survived.
    // Deliberately refuse to adopt an existing journal after restart/reinstantiation.
    if (journal.read(sessionId) !== null) fail('MULTI_V2_EXISTING_JOURNAL_REQUIRES_RECOVERY_PROOF');
    let phase = 'IDLE', pendingAttemptId = null, ownedRevision = initial.revision;
    let completed = 0;
    const inspect = () => Object.freeze({
        phase, pendingAttemptId, completed, ownedRevision,
        durableSessionCommitProven: false, crossStoreAtomicityProven: false,
        resumeAuthorized: false, retryAuthorized: false, executable: false
    });
    function checkOwned() {
        const now = authority.inspect();
        if (now.sessionId !== sessionId || now.revision !== ownedRevision) fail('MULTI_V2_AUTHORITY_DRIFT');
        return now;
    }
    function submitOnce({ expectedRevision, attemptId, args = {} } = {}) {
        if (phase !== 'IDLE') fail('MULTI_V2_SUBMIT_BLOCKED');
        if (!validId(attemptId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
            args === null || typeof args !== 'object' || Array.isArray(args)) fail('MULTI_V2_INVALID_SUBMIT');
        const before = checkOwned();
        if (before.revision !== expectedRevision) fail('MULTI_V2_REVISION_CONFLICT');
        if (before.session.currentSelection?.status !== 'SELECTED' || !before.session.currentQuestion) fail('MULTI_V2_NO_QUESTION');
        // A journal from a different process or an unexpected transition is not trusted.
        const record = journal.read(sessionId);
        if ((record?.entries?.length ?? 0) !== completed ||
            (completed > 0 && record.entries.at(-1).state !== 'COMMITTED')) fail('MULTI_V2_JOURNAL_DRIFT');
        phase = 'SUBMITTING'; pendingAttemptId = attemptId;
        try {
            const result = submit({ ...clone(args), session: clone(before.session), attemptId });
            if (promise(result)) fail('MULTI_V2_ASYNC_UNSUPPORTED');
            if (!result?.session || !result?.attempt || result.attempt.attemptId !== attemptId ||
                result.attempt.sessionId !== sessionId || result.session.runtime?.sessionId !== sessionId) fail('MULTI_V2_INVALID_RESULT');
            if (!isDeepStrictEqual(authority.inspect(), before)) fail('MULTI_V2_STATE_DRIFT');
            if (Object.hasOwn(result, 'remediationStopCapture') &&
                (result.remediationStopCapture === undefined || result.remediationStopCapture === null)) {
                fail('MULTI_V2_REMEDIATION_CAPTURE_INVALID');
            }
            journal.prepare({ sessionId, attempt: clone(result.attempt), expectedRevision });
            phase = 'COMMIT_UNKNOWN';
            journal.markUnknown({ sessionId, attemptId });
            attemptStore.appendAttempt({ sessionId, attempt: clone(result.attempt) });
            const audit = journal.reconcile({ sessionId, attemptId });
            if (audit.status !== 'COMMITTED' || audit.verification !== 'ATTEMPT_MATCHED' ||
                audit.externalAttemptCommitVerified !== true || audit.attemptId !== attemptId) fail('MULTI_V2_ATTEMPT_UNVERIFIED');
            if (!isDeepStrictEqual(authority.inspect(), before)) fail('MULTI_V2_STATE_DRIFT');
            const mutation = authority.mutate({ expectedRevision, apply: () => clone(result.session) });
            if (promise(mutation)) fail('MULTI_V2_ASYNC_UNSUPPORTED');
            ownedRevision = authority.inspect().revision;
            if (ownedRevision !== expectedRevision + 1) fail('MULTI_V2_REVISION_DRIFT');
            completed++;
            phase = 'IDLE'; pendingAttemptId = null;
            return {
                status: 'COMMITTED', attemptId, revision: ownedRevision,
                attemptStoreVerifiedBeforeSessionMutation: true, durableSessionCommitProven: false,
                crossStoreAtomicityProven: false, resumeAuthorized: false, retryAuthorized: false, executable: false,
                ...(Object.hasOwn(result, 'remediationStopCapture')
                    ? { remediationStopCapture: result.remediationStopCapture }
                    : {})
            };
        } catch (e) {
            phase = 'COMMIT_UNKNOWN'; // Even a failure before durable intent cannot authorize a retry.
            throw e;
        }
    }
    function reconcile({ attemptId } = {}) {
        const audit = journal.reconcile({ sessionId, attemptId });
        return {
            ...audit, durableSessionCommitProven: false, crossStoreAtomicityProven: false,
            resumeAuthorized: false, retryAuthorized: false, executable: false
        };
    }
    function capturePreSubmit({ expectedRevision, readSnapshot } = {}) {
        if (phase !== 'IDLE') fail('MULTI_V2_CAPTURE_BLOCKED');
        checkOwned();
        if (expectedRevision !== ownedRevision) fail('MULTI_V2_REVISION_CONFLICT');
        const result = authority.capture({ expectedRevision, readSnapshot });
        if (phase !== 'IDLE') fail('MULTI_V2_CAPTURE_BLOCKED');
        return {
            ...result, submitLifecycle: {
                phase, inFlightSubmitExcludedUnderCoordinator: true,
                durableAbsenceProven: false, executable: false
            }
        };
    }
    return Object.freeze({ submitOnce, reconcile, inspect, capturePreSubmit });
}
