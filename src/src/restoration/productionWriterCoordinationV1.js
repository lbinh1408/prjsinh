/** Phase 3.3-E DRAFT: explicit opt-in write boundary, not enforcement of raw stores. */
const fault = code => Object.assign(new Error(code), { code });
const deny = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, crossStoreAtomicityProven: false });
export function createProductionWriterCoordinationV1({ coordination, attemptStore, journal, durableCommit } = {}) {
    if (typeof coordination?.withWriter !== 'function' || typeof attemptStore?.appendAttempt !== 'function' || typeof journal?.prepare !== 'function' || typeof journal?.markUnknown !== 'function' || typeof durableCommit?.commit !== 'function') throw fault('WRITER_INTEGRATION_INVALID_DEPENDENCY');
    function guarded(sessionId, operation, invoke) {
        if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(sessionId)) throw fault('WRITER_INTEGRATION_INVALID_SESSION');
        let calls = 0;
        return coordination.withWriter({
            sessionId, write: ({ epoch }) => {
                calls++;
                if (calls !== 1 || !Number.isSafeInteger(epoch) || epoch < 1) throw fault('WRITER_INTEGRATION_INVALID_FENCE');
                const value = invoke();
                if (value && typeof value.then === 'function') throw fault('WRITER_INTEGRATION_ASYNC_UNSUPPORTED');
                return { operation, epoch, value, ...deny };
            }
        });
    }
    return Object.freeze({
        appendAttempt: args => guarded(args?.sessionId, 'appendAttempt', () => attemptStore.appendAttempt(args)),
        prepare: args => guarded(args?.sessionId, 'prepare', () => journal.prepare(args)),
        markUnknown: args => guarded(args?.sessionId, 'markUnknown', () => journal.markUnknown(args)),
        commit: args => guarded(args?.sessionId, 'commit', () => durableCommit.commit(args)),
        policy: deny
    });
}
