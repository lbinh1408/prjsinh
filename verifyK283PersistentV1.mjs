/** Read-only consistency check for K283 one-turn DRAFT. Never calls reconcile/audit. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createDurableAttemptStore } from './src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from './src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from './src/restoration/durableSessionCommitV1.js';

const sha = value => createHash('sha256').update(value).digest('hex');
function canonical(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
export function verifyPersistentOneTurn({ attemptStore, journal, durableCommit, sessionId }) {
    const errors = [];
    const attempts = attemptStore.listAttempts({ sessionId });
    const record = journal.read(sessionId);
    const saved = durableCommit.read({ sessionId });
    const entries = record?.entries ?? [];
    const ids = attempts.map(a => a.attemptId);
    const checkpointIds = saved?.checkpoint?.attemptIds ?? [];
    if (attempts.length !== 1) errors.push('EXPECTED_EXACTLY_ONE_ATTEMPT');
    if (entries.length !== 1) errors.push('EXPECTED_EXACTLY_ONE_JOURNAL_ENTRY');
    if (!saved) errors.push('CHECKPOINT_MISSING');
    if (saved && saved.checkpointRevision !== 1) errors.push('CHECKPOINT_REVISION_MISMATCH');
    if (saved && saved.authorityRevision !== 1) errors.push('AUTHORITY_REVISION_MISMATCH');
    if (ids.length !== checkpointIds.length || ids.some((id, i) => id !== checkpointIds[i])) errors.push('CHECKPOINT_ATTEMPT_SEQUENCE_MISMATCH');
    if (ids.length !== entries.length || ids.some((id, i) => id !== entries[i].attemptId)) errors.push('JOURNAL_ATTEMPT_SEQUENCE_MISMATCH');
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i], attempt = attempts[i];
        if (entry.state !== 'COMMITTED') errors.push('JOURNAL_NOT_COMMITTED');
        if (entry.expectedRevision !== i) errors.push('JOURNAL_REVISION_MISMATCH');
        if (attempt && sha(canonical(attempt)) !== entry.attemptSha256) errors.push('ATTEMPT_DIGEST_MISMATCH');
    }
    return Object.freeze({ status: errors.length ? 'INCONSISTENT' : 'CONSISTENT_ONE_TURN', sessionId, attemptCount: attempts.length, journalCount: entries.length, checkpointRevision: saved?.checkpointRevision ?? null, errors, resumeAuthorized: false, retryAuthorized: false, crossStoreAtomicityProven: false });
}
function main() {
    const sessionId = process.argv[2];
    if (!sessionId || !/^LIVE-K283-[\w-]+$/.test(sessionId)) throw Error('USAGE: node verifyK283PersistentV1.mjs LIVE-K283-<id>');
    const root = path.resolve('.k283-persistent-draft');
    const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore });
    const durableCommit = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoints'), attemptStore, journal });
    const result = verifyPersistentOneTurn({ attemptStore, journal, durableCommit, sessionId });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'CONSISTENT_ONE_TURN') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { main(); } catch (e) { console.error(e.stack ?? e); process.exitCode = 1; }
}
