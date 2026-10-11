/** Phase 3.3-D — Recovery Readiness & Consistency Audit V1 DRAFT.
 * Read-only observation. Never reconciles journal (reconcile writes), repairs, retries, or hydrates.
 * A CONSISTENT observation is NOT permission to resume or execute.
 */
import { createHash } from 'node:crypto';
const sha = s => createHash('sha256').update(s).digest('hex');
const validId = x => typeof x === 'string' && x.length > 0 && x.length <= 256 && x.trim() === x;
const fail = code => { const e = new Error(code); e.code = code; throw e; };
function canonical(v, seen = new Set()) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (!v || typeof v !== 'object' || seen.has(v) || Object.getOwnPropertySymbols(v).length) fail('RECOVERY_AUDIT_NON_JSON');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail('RECOVERY_AUDIT_NON_JSON');
    seen.add(v);
    try {
        if (Array.isArray(v)) {
            if (Object.keys(v).length !== v.length || v.some((_, i) => !Object.hasOwn(v, i))) fail('RECOVERY_AUDIT_NON_JSON');
            return '[' + v.map(x => canonical(x, seen)).join(',') + ']';
        }
        return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k], seen)).join(',') + '}';
    } finally { seen.delete(v); }
}
const digest = x => sha(canonical(x));
const safeFlags = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, crossStoreAtomicityProven: false, durableSessionCommitProven: false, recoveryAuthorized: false });
const make = (status, reason, detail = {}) => Object.freeze({ schemaVersion: 'recovery-readiness-audit-v1', status, reason, ...detail, ...safeFlags });
const corruptCodes = new Set(['ATTEMPT_STORE_CORRUPT', 'SUBMIT_V3_CORRUPT', 'SESSION_COMMIT_CORRUPT', 'RECOVERY_AUDIT_NON_JSON']);
export function createRecoveryReadinessAuditV1({ attemptStore, journal, durableCommit } = {}) {
    if (typeof attemptStore?.listAttemptIds !== 'function' || typeof attemptStore?.getAttempt !== 'function' ||
        typeof journal?.read !== 'function' || typeof durableCommit?.read !== 'function') fail('RECOVERY_AUDIT_INVALID_OPTIONS');
    function inspect({ sessionId } = {}) {
        if (!validId(sessionId)) fail('RECOVERY_AUDIT_INVALID_SESSION');
        try {
            // No journal.reconcile(), durableCommit.audit(), or mutating API is called.
            const ids = attemptStore.listAttemptIds({ sessionId });
            const record = journal.read(sessionId);
            const saved = durableCommit.read({ sessionId });
            if (!Array.isArray(ids) || ids.some(x => !validId(x)) || new Set(ids).size !== ids.length) return make('CORRUPT', 'INVALID_ATTEMPT_INDEX');
            const entries = record?.entries ?? [];
            if (!Array.isArray(entries)) return make('CORRUPT', 'INVALID_JOURNAL_ENTRIES');
            const checkpointIds = saved?.checkpoint?.attemptIds ?? [];
            if (!Array.isArray(checkpointIds) || checkpointIds.some(x => !validId(x))) return make('CORRUPT', 'INVALID_CHECKPOINT_IDS');
            const details = { sessionId, attemptCount: ids.length, journalCount: entries.length, checkpointAttemptCount: checkpointIds.length, checkpointRevision: saved?.checkpointRevision ?? null };
            if (record && record.sessionId !== sessionId) return make('CORRUPT', 'JOURNAL_SESSION_MISMATCH', details);
            if (saved && (saved.sessionId !== sessionId || saved.checkpoint?.runtime?.sessionId !== sessionId)) return make('CORRUPT', 'CHECKPOINT_SESSION_MISMATCH', details);
            if (!record && !saved && ids.length === 0) return make('INCOMPLETE', 'NO_DURABLE_SESSION', details);
            if (saved && (!Number.isSafeInteger(saved.checkpointRevision) || saved.checkpointRevision < 1 ||
                !Number.isSafeInteger(saved.authorityRevision) || saved.authorityRevision < 0 ||
                saved.checkpoint?.revision !== saved.checkpointRevision)) return make('CORRUPT', 'CHECKPOINT_REVISION_INVALID', details);
            if (saved && (new Set(checkpointIds).size !== checkpointIds.length)) return make('CORRUPT', 'CHECKPOINT_DUPLICATE_ATTEMPT', details);
            if (entries.length > ids.length || checkpointIds.length > ids.length) return make('CONFLICT', 'DURABLE_SEQUENCE_EXCEEDS_ATTEMPTS', details);
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                if (!e || e.attemptId !== ids[i]) return make('CONFLICT', 'JOURNAL_ORDER_MISMATCH', { ...details, index: i });
                const attempt = attemptStore.getAttempt({ sessionId, attemptId: ids[i] });
                if (!attempt || attempt.attemptId !== ids[i]) return make('CONFLICT', 'ATTEMPT_LOOKUP_MISMATCH', { ...details, index: i });
                if (e.attemptSha256 !== digest(attempt)) return make('CONFLICT', 'ATTEMPT_DIGEST_MISMATCH', { ...details, index: i });
                if (e.state !== 'COMMITTED') return make('INCOMPLETE', 'JOURNAL_NOT_COMMITTED', { ...details, index: i });
                if (!Number.isSafeInteger(e.expectedRevision) || e.expectedRevision < 0 ||
                    (i > 0 && e.expectedRevision <= entries[i - 1].expectedRevision)) return make('CONFLICT', 'JOURNAL_REVISION_MISMATCH', { ...details, index: i });
            }
            for (let i = 0; i < checkpointIds.length; i++) {
                if (checkpointIds[i] !== ids[i] || !entries[i] || entries[i].state !== 'COMMITTED')
                    return make('CONFLICT', 'CHECKPOINT_ATTEMPT_PREFIX_MISMATCH', { ...details, index: i });
            }
            if (saved && checkpointIds.length > 0 && entries[checkpointIds.length - 1].expectedRevision + 1 !== saved.authorityRevision)
                return make('CONFLICT', 'CHECKPOINT_AUTHORITY_REVISION_MISMATCH', details);
            if (ids.length !== entries.length) return make('INCOMPLETE', 'ATTEMPTS_WITHOUT_JOURNAL', { ...details });
            if (!saved) return make('INCOMPLETE', 'CHECKPOINT_MISSING', details);
            if (checkpointIds.length !== ids.length) return make('INCOMPLETE', 'CHECKPOINT_BEHIND_ATTEMPTS', details);
            return make('CONSISTENT', 'OBSERVED_STORES_AGREE', details);
        } catch (error) {
            const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN_READ_ERROR';
            return make(corruptCodes.has(code) ? 'CORRUPT' : 'CONFLICT', 'READ_FAILED', { sessionId, errorCode: code });
        }
    }
    return Object.freeze({ inspect });
}
