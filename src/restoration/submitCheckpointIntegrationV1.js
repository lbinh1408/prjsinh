/** Submit + Durable Checkpoint Integration V1 — DRAFT.
 * Cooperative, synchronous, fresh-session orchestration only.
 * No durable session hydration, crash recovery, automatic retry or atomicity claim.
 * A failure poisons this instance permanently, including errors before a disk write.
 */
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const validRevision = n => Number.isSafeInteger(n) && n >= 0;
const isPromise = v => v != null && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
const clone = v => structuredClone(v);
const flags = Object.freeze({
    durableSessionCommitProven: false, crossStoreAtomicityProven: false,
    resumeAuthorized: false, retryAuthorized: false, executable: false
});

export function createSubmitCheckpointIntegrationV1({
    integration, authority, durableCommit, journal, contentRefs, now = () => new Date().toISOString()
} = {}) {
    if (!integration || typeof integration.submitOnce !== 'function' || typeof integration.inspect !== 'function' ||
        typeof authority?.inspect !== 'function' || typeof durableCommit?.commit !== 'function' ||
        typeof durableCommit?.read !== 'function' || typeof durableCommit?.audit !== 'function' ||
        typeof journal?.read !== 'function' || !contentRefs || typeof contentRefs !== 'object' ||
        Array.isArray(contentRefs) || typeof now !== 'function') fail('SUBMIT_CHECKPOINT_INVALID_OPTIONS');
    const initial = authority.inspect();
    const sessionId = initial.sessionId;
    if (typeof sessionId !== 'string' || !sessionId || initial.session?.runtime?.sessionId !== sessionId ||
        !validRevision(initial.revision)) fail('SUBMIT_CHECKPOINT_INVALID_SESSION');
    // This adapter deliberately does not adopt existing durable records. Reopening after restart
    // requires a separately designed recovery proof and is NOT authorized by this module.
    if (journal.read(sessionId) !== null || durableCommit.read({ sessionId }) !== null)
        fail('SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED');
    if (integration.inspect().phase !== 'IDLE') fail('SUBMIT_CHECKPOINT_INTEGRATION_NOT_IDLE');
    let phase = 'IDLE', completed = 0, checkpointRevision = 0, ownedRevision = initial.revision;
    let pendingAttemptId = null;
    function inspect() {
        return Object.freeze({ phase, completed, checkpointRevision, ownedRevision, pendingAttemptId, ...flags });
    }
    function checkBefore(expectedRevision) {
        if (phase !== 'IDLE') fail('SUBMIT_CHECKPOINT_SUBMIT_BLOCKED');
        const current = authority.inspect();
        if (current.sessionId !== sessionId || current.revision !== ownedRevision ||
            current.session?.runtime?.sessionId !== sessionId) fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
        if (expectedRevision !== ownedRevision) fail('SUBMIT_CHECKPOINT_REVISION_CONFLICT');
        const upstream = integration.inspect();
        if (upstream.phase !== 'IDLE' || upstream.completed !== completed || upstream.ownedRevision !== ownedRevision)
            fail('SUBMIT_CHECKPOINT_INTEGRATION_DRIFT');
        const journalRecord = journal.read(sessionId);
        if ((journalRecord?.entries?.length ?? 0) !== completed ||
            (completed && journalRecord.entries.at(-1).state !== 'COMMITTED')) fail('SUBMIT_CHECKPOINT_JOURNAL_DRIFT');
        const saved = durableCommit.read({ sessionId });
        if (completed === 0) {
            if (saved !== null) fail('SUBMIT_CHECKPOINT_CHECKPOINT_DRIFT');
        } else {
            if (!saved || saved.checkpointRevision !== checkpointRevision ||
                saved.authorityRevision !== ownedRevision ||
                saved.checkpoint?.attemptIds?.length !== completed) fail('SUBMIT_CHECKPOINT_CHECKPOINT_DRIFT');
            const audit = durableCommit.audit({ sessionId });
            if (isPromise(audit) || audit.status !== 'CHECKPOINT_MATCHED' ||
                audit.checkpointRevision !== checkpointRevision || audit.authorityRevision !== ownedRevision)
                fail('SUBMIT_CHECKPOINT_AUDIT_FAILED');
        }
    }
    function submitOnce({ expectedRevision, attemptId, args = {} } = {}) {
        checkBefore(expectedRevision);
        // Any attempted submit that fails, even before persistence, poisons the coordinator.
        phase = 'SUBMITTING'; pendingAttemptId = attemptId ?? null;
        try {
            const result = integration.submitOnce({ expectedRevision, attemptId, args });
            if (isPromise(result) || result?.status !== 'COMMITTED' || result.attemptId !== attemptId ||
                result.revision !== expectedRevision + 1 ||
                result.attemptStoreVerifiedBeforeSessionMutation !== true)
                fail('SUBMIT_CHECKPOINT_UPSTREAM_UNVERIFIED');
            phase = 'CHECKPOINT_COMMIT_UNKNOWN';
            const current = authority.inspect();
            if (current.sessionId !== sessionId || current.revision !== result.revision)
                fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
            const savedAt = now();
            if (isPromise(savedAt) || typeof savedAt !== 'string' || !Number.isFinite(Date.parse(savedAt)))
                fail('SUBMIT_CHECKPOINT_INVALID_TIMESTAMP');
            const committed = durableCommit.commit({
                authority, sessionId, expectedAuthorityRevision: result.revision,
                expectedCheckpointRevision: checkpointRevision, contentRefs: clone(contentRefs), savedAt
            });
            if (isPromise(committed) || committed?.checkpointRevision !== checkpointRevision + 1 ||
                committed.authorityRevision !== result.revision || committed.durableCheckpointObserved !== true)
                fail('SUBMIT_CHECKPOINT_COMMIT_UNVERIFIED');
            const observed = durableCommit.read({ sessionId });
            if (isPromise(observed) || !observed || observed.sha256 !== committed.sha256 ||
                observed.checkpointRevision !== committed.checkpointRevision ||
                observed.authorityRevision !== result.revision ||
                observed.checkpoint?.attemptIds?.at(-1) !== attemptId)
                fail('SUBMIT_CHECKPOINT_READBACK_MISMATCH');
            const audit = durableCommit.audit({ sessionId });
            if (isPromise(audit) || audit?.status !== 'CHECKPOINT_MATCHED' ||
                audit.checkpointRevision !== committed.checkpointRevision ||
                audit.authorityRevision !== result.revision) fail('SUBMIT_CHECKPOINT_AUDIT_FAILED');
            if (authority.inspect().revision !== result.revision) fail('SUBMIT_CHECKPOINT_AUTHORITY_DRIFT');
            ownedRevision = result.revision;
            checkpointRevision = committed.checkpointRevision;
            completed++;
            phase = 'IDLE'; pendingAttemptId = null;
            return Object.freeze({
                status: 'CHECKPOINT_OBSERVED', attemptId, revision: ownedRevision,
                checkpointRevision, durableCheckpointObserved: true, ...flags
            });
        } catch (error) {
            phase = 'COMMIT_UNKNOWN';
            throw error;
        }
    }
    function audit({ sessionId: requestedId } = {}) {
        if (requestedId !== undefined && requestedId !== sessionId) fail('SUBMIT_CHECKPOINT_SESSION_CONFLICT');
        const result = durableCommit.audit({ sessionId });
        if (isPromise(result)) fail('SUBMIT_CHECKPOINT_ASYNC_UNSUPPORTED');
        return Object.freeze({ ...result, ...flags });
    }
    return Object.freeze({ submitOnce, inspect, audit });
}
