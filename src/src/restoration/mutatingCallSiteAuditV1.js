/** Phase 3.3-E DRAFT. Opt-in coordinated facade for legacy mutating paths.
 * Raw store references and unreviewed call sites remain outside this boundary. */
const fail = code => Object.assign(new Error(code), { code });
const deny = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, crossStoreAtomicityProven: false });
const valid = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
export const MUTATING_CALL_SITE_INVENTORY_V1 = Object.freeze([
    Object.freeze({ target: 'attemptStore.appendAttempt', classification: 'MUTATES', route: 'productionWriterCoordinationV1.appendAttempt' }),
    Object.freeze({ target: 'journal.prepare', classification: 'MUTATES', route: 'productionWriterCoordinationV1.prepare' }),
    Object.freeze({ target: 'journal.markUnknown', classification: 'MUTATES', route: 'productionWriterCoordinationV1.markUnknown' }),
    Object.freeze({ target: 'journal.reconcile', classification: 'MAY_MUTATE', route: 'mutatingCallSiteAuditV1.reconcile' }),
    Object.freeze({ target: 'durableCommit.commit', classification: 'MUTATES', route: 'productionWriterCoordinationV1.commit' }),
    Object.freeze({ target: 'durableCommit.audit', classification: 'MAY_MUTATE', route: 'mutatingCallSiteAuditV1.audit' }),
]);
export function createMutatingCallSiteAuditV1({ coordination, journal, durableCommit, writerAdapter } = {}) {
    if (typeof coordination?.withWriter !== 'function' || typeof journal?.reconcile !== 'function' || typeof durableCommit?.audit !== 'function' || !writerAdapter || ['appendAttempt', 'prepare', 'markUnknown', 'commit'].some(k => typeof writerAdapter[k] !== 'function')) throw fail('CALLSITE_INVALID_DEPENDENCY');
    function guarded(sessionId, operation, fn) {
        if (!valid(sessionId)) throw fail('CALLSITE_INVALID_SESSION');
        let calls = 0;
        return coordination.withWriter({
            sessionId, write: ({ epoch }) => {
                if (++calls !== 1 || !Number.isSafeInteger(epoch) || epoch < 1) throw fail('CALLSITE_INVALID_FENCE');
                const value = fn();
                if (value && typeof value.then === 'function') throw fail('CALLSITE_ASYNC_UNSUPPORTED');
                return { operation, epoch, value, ...deny };
            }
        });
    }
    return Object.freeze({
        appendAttempt: args => writerAdapter.appendAttempt(args),
        prepare: args => writerAdapter.prepare(args),
        markUnknown: args => writerAdapter.markUnknown(args),
        commit: args => writerAdapter.commit(args),
        reconcile: args => guarded(args?.sessionId, 'reconcile', () => journal.reconcile(args)),
        audit: args => guarded(args?.sessionId, 'audit', () => durableCommit.audit(args)),
        inventory: MUTATING_CALL_SITE_INVENTORY_V1,
        policy: deny,
        enforcement: 'OPT_IN_ONLY'
    });
}
