/** Phase 3.3-C: opt-in in-process single-writer authority. No modifications to LOCKED engines. */
import { createHash } from 'node:crypto';
const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
const clone = v => structuredClone(v);
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const isPromise = v => v !== null && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
function validSession(s) { return !!s && typeof s === 'object' && s.runtime?.name === 'StudySession' && typeof s.runtime?.sessionId === 'string' && s.runtime.sessionId.length > 0; }
/** Synchronous, closed-world authority: callers MUST route all state changes through mutate(). */
export function createLiveSessionRevisionAuthority({ initialSession, initialRevision = 0, sessionId } = {}) {
    if (!validSession(initialSession)) fail('FENCE_INVALID_SESSION');
    if (!Number.isSafeInteger(initialRevision) || initialRevision < 0) fail('FENCE_INVALID_REVISION');
    const identity = initialSession.runtime.sessionId;
    if (sessionId !== undefined && sessionId !== identity) fail('FENCE_SESSION_ID_MISMATCH');
    let current = clone(initialSession), revision = initialRevision, busy = false, epoch = 0;
    const enter = () => { if (busy) fail('FENCE_REENTRANT_ACCESS'); busy = true; };
    const leave = () => { busy = false; };
    const check = next => { if (!validSession(next) || next.runtime.sessionId !== identity) fail('FENCE_SESSION_ID_MISMATCH'); };
    function mutate({ expectedRevision, apply } = {}) {
        if (typeof apply !== 'function' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) fail('FENCE_INVALID_MUTATION');
        enter();
        try {
            if (expectedRevision !== revision) fail('FENCE_REVISION_CONFLICT');
            if (revision === Number.MAX_SAFE_INTEGER) fail('FENCE_REVISION_EXHAUSTED');
            const proposal = apply(clone(current));
            if (isPromise(proposal)) fail('FENCE_ASYNC_CALLBACK_UNSUPPORTED');
            check(proposal);
            current = clone(proposal); revision++; epoch++;
            return { sessionId: identity, revision, committed: true, executable: false };
        } finally { leave(); }
    }
    function capture({ expectedRevision, readSnapshot } = {}) {
        if (typeof readSnapshot !== 'function' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) fail('FENCE_INVALID_CAPTURE');
        enter();
        try {
            if (expectedRevision !== revision) fail('FENCE_REVISION_CONFLICT');
            const before = hash(current), startEpoch = epoch;
            // Reader receives a detached copy; cannot mutate the authority's live state.
            const snapshot = readSnapshot(clone(current));
            if (isPromise(snapshot)) fail('FENCE_ASYNC_CALLBACK_UNSUPPORTED');
            if (!snapshot || typeof snapshot !== 'object') fail('FENCE_INVALID_SNAPSHOT');
            if (before !== hash(current) || startEpoch !== epoch) fail('FENCE_STATE_CHANGED');
            return { sessionId: identity, revision, snapshot: clone(snapshot), fence: { schemaVersion: 'live-session-fence-v1', sessionId: identity, revision, epoch: startEpoch, snapshotSha256: hash(snapshot) }, quiescentUnderAuthority: true, atomicityScope: 'single-process-cooperative', globalAtomicityProven: false, executable: false };
        } finally { leave(); }
    }
    function inspect() { if (busy) fail('FENCE_REENTRANT_ACCESS'); return { sessionId: identity, revision, epoch, session: clone(current) }; }
    return Object.freeze({ mutate, capture, inspect });
}
/** Re-check the same authority revision before persisting a capture. Does not lock the disk commit. */
export function validateFencedCapture({ authority, capture } = {}) {
    if (!authority || typeof authority.inspect !== 'function' || !capture?.fence) fail('FENCE_INVALID_PROOF');
    const now = authority.inspect(), f = capture.fence;
    if (f.schemaVersion !== 'live-session-fence-v1' || f.sessionId !== now.sessionId || f.revision !== now.revision || f.epoch !== now.epoch || f.snapshotSha256 !== hash(capture.snapshot)) fail('FENCE_STALE_CAPTURE');
    return { valid: true, sessionId: now.sessionId, revision: now.revision, globalAtomicityProven: false, executable: false };
}
