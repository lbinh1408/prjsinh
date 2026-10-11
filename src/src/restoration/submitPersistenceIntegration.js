/** Phase 3.3-C — Submit Persistence Integration V1 DRAFT.
 * Coordinates synchronous cooperative submit fence and durable Attempt/Journal.
 * NOT an atomic transaction with session authority, checkpoints or other side effects.
 * A failed call must NEVER be retried automatically.
 */
import { createSubmitLifecycleFence } from './submitLifecycleFence.js';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
export function createSubmitPersistenceIntegration({ authority, submit, attemptStore, journal } = {}) {
    if (!authority || typeof submit !== 'function' ||
        typeof attemptStore?.appendAttempt !== 'function' || typeof attemptStore?.getAttempt !== 'function' ||
        typeof journal?.prepare !== 'function' || typeof journal?.markUnknown !== 'function' ||
        typeof journal?.reconcile !== 'function' || typeof journal?.read !== 'function') fail('SUBMIT_INTEGRATION_INVALID_INPUT');
    const fence = createSubmitLifecycleFence({
        authority, submit,
        persistAttempt({ sessionId, attempt }) {
            // Persist the exact Attempt returned by submit(), before any Attempt write.
            const revision = authority.inspect().revision;
            journal.prepare({ sessionId, attempt, expectedRevision: revision });
            // Fail closed before any Attempt write. Crash leaves durable COMMIT_UNKNOWN.
            journal.markUnknown({ sessionId, attemptId: attempt.attemptId });
            const stored = attemptStore.appendAttempt({ sessionId, attempt });
            // Do not trust the append return value as proof; re-read via journal verifier.
            const audit = journal.reconcile({ sessionId });
            if (audit.status !== 'COMMITTED' || audit.verification !== 'ATTEMPT_MATCHED' ||
                audit.externalAttemptCommitVerified !== true || audit.attemptId !== attempt.attemptId) {
                fail('SUBMIT_INTEGRATION_ATTEMPT_UNVERIFIED');
            }
            return { attemptId: attempt.attemptId, auditStatus: audit.status, appendReceiptObserved: stored !== undefined };
        }
    });
    function submitOnce(input) {
        const result = fence.submitOnce(input);
        // Session authority mutation happened in the fence after durable Attempt verification.
        // Still NOT durable session state / cross-store atomicity.
        return {
            ...result, attemptStoreVerifiedBeforeSessionMutation: true,
            durableSessionCommitProven: false, crossStoreAtomicityProven: false,
            resumeAuthorized: false, retryAuthorized: false, executable: false
        };
    }
    function reconcile({ sessionId } = {}) {
        // Read-only from the perspective of session authority; journal may advance to COMMITTED.
        const audit = journal.reconcile({ sessionId });
        return {
            ...audit, durableSessionCommitProven: false, crossStoreAtomicityProven: false,
            resumeAuthorized: false, retryAuthorized: false, executable: false
        };
    }
    const inspect = () => ({ ...fence.inspect(), resumeAuthorized: false, retryAuthorized: false });
    return Object.freeze({ submitOnce, reconcile, inspect, capturePreSubmit: fence.capturePreSubmit });
}
