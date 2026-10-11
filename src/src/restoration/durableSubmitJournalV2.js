/** Durable Submit Journal V2 DRAFT: single-host cooperative journal + read-only attempt verification. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const fail = code => { const e = new Error(code); e.code = code; throw e; };
const hash = s => createHash('sha256').update(s).digest('hex');
const valid = s => typeof s === 'string' && s.length > 0 && s.length <= 256 && s.trim() === s;
function canonical(x, seen = new Set()) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (!x || typeof x !== 'object' || seen.has(x)) fail('SUBMIT_V2_NON_JSON');
    if (Object.getOwnPropertySymbols(x).length) fail('SUBMIT_V2_NON_JSON');
    if (!Array.isArray(x) && Object.getPrototypeOf(x) !== Object.prototype && Object.getPrototypeOf(x) !== null) fail('SUBMIT_V2_NON_JSON');
    seen.add(x);
    try {
        if (Array.isArray(x)) {
            if (Object.keys(x).length !== x.length || x.some((_, i) => !Object.hasOwn(x, i))) fail('SUBMIT_V2_NON_JSON');
            return '[' + x.map(v => canonical(v, seen)).join(',') + ']';
        }
        return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k], seen)).join(',') + '}';
    } finally { seen.delete(x); }
}
const copy = x => JSON.parse(canonical(x));
const digest = x => hash(canonical(x));
const syncDir = dir => { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
const STATES = new Set(['PREPARED', 'COMMIT_UNKNOWN', 'COMMITTED']);

export function createDurableSubmitJournalV2({ rootDir, attemptStore, lockTimeoutMs = 1000, lockPollMs = 10, failpoint = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || !attemptStore || typeof attemptStore.getAttempt !== 'function' ||
        !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0 || !Number.isSafeInteger(lockPollMs) || lockPollMs < 1) fail('SUBMIT_V2_INVALID_OPTIONS');
    // Caller must ensure rootDir is exclusively application-owned local storage, distinct from the Attempt store root.
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const root = fs.realpathSync(rootDir);
    const file = id => { if (!valid(id)) fail('SUBMIT_V2_INVALID_SESSION'); return path.join(root, hash(id) + '.json'); };
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
                if (e.code !== 'EEXIST') throw e; // Incomplete locks intentionally require manual intervention.
                if (Date.now() >= deadline) fail('SUBMIT_V2_LOCK_TIMEOUT');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockPollMs);
            }
        }
    }
    function release(held) {
        let owner;
        try { owner = JSON.parse(fs.readFileSync(path.join(held.dir, 'owner.json'), 'utf8')); } catch { fail('SUBMIT_V2_LOCK_LOST'); }
        if (owner.pid !== process.pid || owner.token !== held.token) fail('SUBMIT_V2_LOCK_LOST');
        fs.unlinkSync(path.join(held.dir, 'owner.json')); fs.rmdirSync(held.dir); syncDir(root);
    }
    function read(id) {
        const target = file(id);
        let raw;
        try { raw = fs.readFileSync(target, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        let wrapper;
        try { wrapper = JSON.parse(raw); } catch { fail('SUBMIT_V2_CORRUPT'); }
        if (!wrapper || wrapper.schemaVersion !== 'durable-submit-journal-v2' || wrapper.sessionId !== id || !valid(wrapper.attemptId) ||
            !Number.isSafeInteger(wrapper.expectedRevision) || wrapper.expectedRevision < 0 || !STATES.has(wrapper.state) ||
            !/^[a-f0-9]{64}$/.test(wrapper.attemptSha256 ?? '') || typeof wrapper.digest !== 'string') fail('SUBMIT_V2_CORRUPT');
        const { digest: recorded, ...body } = wrapper;
        try { if (digest(body) !== recorded) fail('SUBMIT_V2_CORRUPT'); } catch { fail('SUBMIT_V2_CORRUPT'); }
        return copy(wrapper);
    }
    function write(record) {
        const target = file(record.sessionId), body = { ...record };
        delete body.digest;
        const raw = canonical({ ...body, digest: digest(body) });
        const tmp = target + '.' + randomUUID() + '.tmp';
        try {
            const fd = fs.openSync(tmp, 'wx', 0o600);
            try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
            if (failpoint === 'afterTempFsync') fail('SUBMIT_V2_INJECTED_FAILURE');
            fs.renameSync(tmp, target);
            if (failpoint === 'afterRename') fail('SUBMIT_V2_INJECTED_FAILURE');
            syncDir(root);
        } finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
    }
    function guarded(id, operation) {
        const held = acquire(id);
        try { return operation(); } finally { release(held); }
    }
    function prepare({ sessionId, attempt, expectedRevision } = {}) {
        if (!valid(sessionId) || !attempt || !valid(attempt.attemptId) ||
            (Object.hasOwn(attempt, 'sessionId') && attempt.sessionId !== sessionId) ||
            !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) fail('SUBMIT_V2_INVALID_INTENT');
        const safe = copy(attempt), attemptSha256 = digest(safe);
        return guarded(sessionId, () => {
            if (read(sessionId)) fail('SUBMIT_V2_ALREADY_EXISTS');
            // No durable attempt may predate this intent; absence is not retry authorization.
            const prior = attemptStore.getAttempt({ sessionId, attemptId: safe.attemptId });
            if (prior !== null) fail('SUBMIT_V2_ATTEMPT_ALREADY_PRESENT');
            write({ schemaVersion: 'durable-submit-journal-v2', sessionId, attemptId: safe.attemptId, expectedRevision, attemptSha256, state: 'PREPARED' });
            return status(sessionId);
        });
    }
    function markUnknown({ sessionId, attemptId } = {}) {
        return guarded(sessionId, () => {
            const record = read(sessionId);
            if (!record || record.attemptId !== attemptId || record.state === 'COMMITTED') fail('SUBMIT_V2_INVALID_TRANSITION');
            if (record.state !== 'COMMIT_UNKNOWN') write({ ...record, state: 'COMMIT_UNKNOWN' });
            return status(sessionId);
        });
    }
    function verify(record) {
        const attempt = attemptStore.getAttempt({ sessionId: record.sessionId, attemptId: record.attemptId });
        if (attempt === null) return 'ABSENT';
        if (attempt.attemptId !== record.attemptId ||
            (Object.hasOwn(attempt, 'sessionId') && attempt.sessionId !== record.sessionId) ||
            digest(attempt) !== record.attemptSha256) return 'MISMATCH';
        return 'MATCH';
    }
    function status(id) {
        const record = read(id);
        if (!record) return { status: 'NO_JOURNAL', externalAttemptCommitVerified: false, safeToRetry: false, executable: false };
        return { status: record.state, sessionId: id, attemptId: record.attemptId, externalAttemptCommitVerified: false, safeToRetry: false, executable: false };
    }
    function reconcile({ sessionId } = {}) {
        return guarded(sessionId, () => {
            const record = read(sessionId);
            if (!record) return status(sessionId);
            const verification = verify(record);
            if (verification === 'MISMATCH') fail('SUBMIT_V2_ATTEMPT_MISMATCH');
            if (verification === 'ABSENT') return { ...status(sessionId), verification: 'ATTEMPT_NOT_FOUND', externalAttemptCommitVerified: false };
            if (record.state !== 'COMMITTED') write({ ...record, state: 'COMMITTED' });
            return { ...status(sessionId), verification: 'ATTEMPT_MATCHED', externalAttemptCommitVerified: true };
        });
    }
    return Object.freeze({ prepare, markUnknown, reconcile, read });
}
