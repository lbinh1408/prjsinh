/** Phase 3.3-C — durable submit-intent journal, DRAFT, no execution authorization.
 * Single-host, application-owned local filesystem only. This journal is NOT an
 * atomic transaction with an external Attempt store.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const error = code => { const e = new Error(code); e.code = code; throw e; };
const hash = value => createHash('sha256').update(value).digest('hex');
const valid = s => typeof s === 'string' && s.trim() === s && s.length > 0 && s.length <= 256;
const json = value => {
    const seen = new Set();
    const encode = v => {
        if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
        if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
        if (!v || typeof v !== 'object' || seen.has(v)) error('SUBMIT_JOURNAL_NON_JSON');
        seen.add(v);
        try {
            if (Array.isArray(v)) {
                if (Object.keys(v).length !== v.length || v.some((_, i) => !Object.hasOwn(v, i))) error('SUBMIT_JOURNAL_NON_JSON');
                return '[' + v.map(encode).join(',') + ']';
            }
            if (Object.getPrototypeOf(v) !== Object.prototype) error('SUBMIT_JOURNAL_NON_JSON');
            return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + encode(v[k])).join(',') + '}';
        } finally { seen.delete(v); }
    };
    return encode(value);
};
const copy = x => JSON.parse(json(x));
function syncDir(dir) { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }

export function createDurableSubmitReconciliation({ rootDir } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir)) error('SUBMIT_JOURNAL_INVALID_ROOT');
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const root = fs.realpathSync(rootDir);
    const filename = sessionId => { if (!valid(sessionId)) error('SUBMIT_JOURNAL_INVALID_SESSION'); return path.join(root, hash(sessionId) + '.json'); };
    function read(sessionId) {
        const target = filename(sessionId);
        let raw;
        try { raw = fs.readFileSync(target, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        let record;
        try { record = JSON.parse(raw); } catch { error('SUBMIT_JOURNAL_CORRUPT'); }
        if (record?.schemaVersion !== 'submit-journal-v1' || record.sessionId !== sessionId ||
            !valid(record.attemptId) || !['PREPARED', 'COMMIT_UNKNOWN', 'COMMITTED'].includes(record.state) ||
            typeof record.digest !== 'string') error('SUBMIT_JOURNAL_CORRUPT');
        const { digest, ...payload } = record;
        if (hash(json(payload)) !== digest) error('SUBMIT_JOURNAL_CORRUPT');
        return copy(record);
    }
    function write(record) {
        const target = filename(record.sessionId);
        const { digest: _ignored, ...payload } = record;
        const encoded = json({ ...payload, digest: hash(json(payload)) });
        const tmp = target + '.' + randomUUID() + '.tmp';
        try {
            const fd = fs.openSync(tmp, 'wx', 0o600);
            try { fs.writeFileSync(fd, encoded); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
            fs.renameSync(tmp, target);
            syncDir(root);
        } finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    }
    function prepare({ sessionId, attemptId, expectedRevision } = {}) {
        if (!valid(attemptId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) error('SUBMIT_JOURNAL_INVALID_INTENT');
        const old = read(sessionId);
        if (old) error('SUBMIT_JOURNAL_ALREADY_EXISTS');
        const record = { schemaVersion: 'submit-journal-v1', sessionId, attemptId, expectedRevision, state: 'PREPARED' };
        // Conservative: an interrupted write is never evidence that no submit occurred.
        write(record);
        return { ...read(sessionId), executable: false, retryAuthorized: false };
    }
    function markUnknown({ sessionId, attemptId } = {}) {
        const old = read(sessionId);
        if (!old || old.attemptId !== attemptId || old.state === 'COMMITTED') error('SUBMIT_JOURNAL_INVALID_TRANSITION');
        write({ ...old, state: 'COMMIT_UNKNOWN' });
        return { ...read(sessionId), executable: false, retryAuthorized: false };
    }
    function markCommitted({ sessionId, attemptId, receipt, verifyReceipt } = {}) {
        const old = read(sessionId);
        if (!old || old.attemptId !== attemptId || typeof verifyReceipt !== 'function' ||
            verifyReceipt({ sessionId, attemptId, receipt: copy(receipt) }) !== true) error('SUBMIT_JOURNAL_COMMIT_UNVERIFIED');
        if (old.state === 'COMMITTED') error('SUBMIT_JOURNAL_ALREADY_COMMITTED');
        write({ ...old, state: 'COMMITTED', receipt: copy(receipt) });
        return { ...read(sessionId), executable: false, retryAuthorized: false };
    }
    function reconcile({ sessionId } = {}) {
        const record = read(sessionId);
        if (!record) return { status: 'NO_JOURNAL', safeToRetry: false, executable: false };
        return {
            status: record.state, sessionId, attemptId: record.attemptId,
            durableIntentObserved: true, externalAttemptCommitVerified: false,
            safeToRetry: false, executable: false
        };
    }
    return Object.freeze({ prepare, markUnknown, markCommitted, reconcile, read });
}
