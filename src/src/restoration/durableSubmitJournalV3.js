/** Multi-Attempt Journal V3 DRAFT. Cooperative local filesystem; no resume/retry authorization. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const hash = s => createHash('sha256').update(s).digest('hex');
const valid = s => typeof s === 'string' && s.length > 0 && s.length <= 256 && s.trim() === s;
function canonical(v, seen = new Set()) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (!v || typeof v !== 'object' || seen.has(v) || Object.getOwnPropertySymbols(v).length) fail('SUBMIT_V3_NON_JSON');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail('SUBMIT_V3_NON_JSON');
    seen.add(v);
    try {
        if (Array.isArray(v)) {
            if (Object.keys(v).length !== v.length || v.some((_, i) => !Object.hasOwn(v, i))) fail('SUBMIT_V3_NON_JSON');
            return '[' + v.map(x => canonical(x, seen)).join(',') + ']';
        }
        return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k], seen)).join(',') + '}';
    } finally { seen.delete(v); }
}
const clone = v => JSON.parse(canonical(v));
const digest = v => hash(canonical(v));
const syncDir = dir => { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
export function createDurableSubmitJournalV3({ rootDir, attemptStore, lockTimeoutMs = 1000, lockPollMs = 10, failpoint = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || typeof attemptStore?.getAttempt !== 'function' ||
        !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0 || !Number.isSafeInteger(lockPollMs) || lockPollMs < 1) fail('SUBMIT_V3_INVALID_OPTIONS');
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const root = fs.realpathSync(rootDir);
    const file = id => { if (!valid(id)) fail('SUBMIT_V3_INVALID_SESSION'); return path.join(root, hash(id) + '.json'); };
    const lock = id => path.join(root, hash(id) + '.lock');
    function acquire(id) {
        const dir = lock(id), deadline = Date.now() + lockTimeoutMs;
        while (true) {
            try {
                fs.mkdirSync(dir, { mode: 0o700 });
                const token = randomUUID();
                const fd = fs.openSync(path.join(dir, 'owner.json'), 'wx', 0o600);
                try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
                syncDir(dir); syncDir(root);
                return { dir, token };
            } catch (e) {
                if (e.code !== 'EEXIST') throw e;
                if (Date.now() >= deadline) fail('SUBMIT_V3_LOCK_TIMEOUT');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockPollMs);
            }
        }
    }
    function release(held) {
        let owner; try { owner = JSON.parse(fs.readFileSync(path.join(held.dir, 'owner.json'), 'utf8')); } catch { fail('SUBMIT_V3_LOCK_LOST'); }
        if (owner.pid !== process.pid || owner.token !== held.token) fail('SUBMIT_V3_LOCK_LOST');
        fs.unlinkSync(path.join(held.dir, 'owner.json')); fs.rmdirSync(held.dir); syncDir(root);
    }
    function guarded(id, fn) { const held = acquire(id); try { return fn(); } finally { release(held); } }
    function read(sessionId) {
        const target = file(sessionId);
        let raw; try { raw = fs.readFileSync(target, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        let wrapper; try { wrapper = JSON.parse(raw); } catch { fail('SUBMIT_V3_CORRUPT'); }
        if (!wrapper || wrapper.schemaVersion !== 'durable-submit-journal-v3' || wrapper.sessionId !== sessionId || !Array.isArray(wrapper.entries) || typeof wrapper.digest !== 'string') fail('SUBMIT_V3_CORRUPT');
        const { digest: recorded, ...body } = wrapper;
        try { if (digest(body) !== recorded) fail('SUBMIT_V3_CORRUPT'); } catch { fail('SUBMIT_V3_CORRUPT'); }
        let prev = -1; const ids = new Set();
        for (const entry of wrapper.entries) {
            if (!valid(entry.attemptId) || ids.has(entry.attemptId) || !Number.isSafeInteger(entry.expectedRevision) || entry.expectedRevision <= prev ||
                !['PREPARED', 'COMMIT_UNKNOWN', 'COMMITTED'].includes(entry.state) || !/^[a-f0-9]{64}$/.test(entry.attemptSha256)) fail('SUBMIT_V3_CORRUPT');
            ids.add(entry.attemptId); prev = entry.expectedRevision;
        }
        return clone(wrapper);
    }
    function write(body) {
        const target = file(body.sessionId), { digest: _unused, ...payload } = body;
        const tmp = target + '.' + randomUUID() + '.tmp';
        try {
            const fd = fs.openSync(tmp, 'wx', 0o600);
            try { fs.writeFileSync(fd, canonical({ ...payload, digest: digest(payload) })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
            if (failpoint === 'afterTempFsync') fail('SUBMIT_V3_INJECTED_FAILURE');
            fs.renameSync(tmp, target);
            if (failpoint === 'afterRename') fail('SUBMIT_V3_INJECTED_FAILURE');
            syncDir(root);
        } finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    }
    const view = (entry, verification = 'NOT_CHECKED') => ({
        status: entry?.state ?? 'NO_JOURNAL', attemptId: entry?.attemptId ?? null,
        verification, externalAttemptCommitVerified: verification === 'ATTEMPT_MATCHED', safeToRetry: false, retryAuthorized: false,
        resumeAuthorized: false, executable: false, durableSessionCommitProven: false, crossStoreAtomicityProven: false
    });
    function prepare({ sessionId, attempt, expectedRevision } = {}) {
        if (!valid(sessionId) || !attempt || !valid(attempt.attemptId) || (Object.hasOwn(attempt, 'sessionId') && attempt.sessionId !== sessionId) ||
            !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) fail('SUBMIT_V3_INVALID_INTENT');
        const safe = clone(attempt);
        return guarded(sessionId, () => {
            const record = read(sessionId) ?? { schemaVersion: 'durable-submit-journal-v3', sessionId, entries: [] };
            const last = record.entries.at(-1);
            if (last && (last.state !== 'COMMITTED' || expectedRevision <= last.expectedRevision)) fail('SUBMIT_V3_SEQUENCE_BLOCKED');
            if (record.entries.some(e => e.attemptId === safe.attemptId)) fail('SUBMIT_V3_DUPLICATE_ATTEMPT');
            if (attemptStore.getAttempt({ sessionId, attemptId: safe.attemptId }) !== null) fail('SUBMIT_V3_ATTEMPT_ALREADY_PRESENT');
            const entry = { attemptId: safe.attemptId, expectedRevision, attemptSha256: digest(safe), state: 'PREPARED' };
            record.entries.push(entry); write(record); return view(entry);
        });
    }
    function markUnknown({ sessionId, attemptId } = {}) {
        return guarded(sessionId, () => {
            const record = read(sessionId); const entry = record?.entries.at(-1);
            if (!entry || entry.attemptId !== attemptId || entry.state === 'COMMITTED') fail('SUBMIT_V3_INVALID_TRANSITION');
            if (entry.state !== 'COMMIT_UNKNOWN') { entry.state = 'COMMIT_UNKNOWN'; write(record); }
            return view(entry);
        });
    }
    function reconcile({ sessionId, attemptId } = {}) {
        return guarded(sessionId, () => {
            const record = read(sessionId);
            if (!record) return view(null);
            const entry = attemptId === undefined ? record.entries.at(-1) : record.entries.find(e => e.attemptId === attemptId);
            if (!entry) return view(null);
            const stored = attemptStore.getAttempt({ sessionId, attemptId: entry.attemptId });
            if (stored === null) return view(entry, 'ATTEMPT_NOT_FOUND');
            if (stored.attemptId !== entry.attemptId || (Object.hasOwn(stored, 'sessionId') && stored.sessionId !== sessionId) || digest(stored) !== entry.attemptSha256) fail('SUBMIT_V3_ATTEMPT_MISMATCH');
            if (entry.state !== 'COMMITTED') { entry.state = 'COMMITTED'; write(record); }
            return view(entry, 'ATTEMPT_MATCHED');
        });
    }
    function list({ sessionId } = {}) { return (read(sessionId)?.entries ?? []).map(e => ({ ...clone(e), ...view(e) })); }
    return Object.freeze({ prepare, markUnknown, reconcile, read, list });
}
