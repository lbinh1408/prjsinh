/** Durable Attempt Store V1 DRAFT. Single-root, single-record filesystem CAS under a cross-process lock.
 * Requires an exclusively controlled local filesystem root. No network FS / hostile local actors guarantee.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const error = code => { const e = new Error(code); e.code = code; throw e; };
const hash = value => createHash('sha256').update(value).digest('hex');
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const validId = x => typeof x === 'string' && x.length > 0 && x.length <= 256 && x.trim() === x;
function canonical(x, stack = new Set()) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (!x || typeof x !== 'object' || stack.has(x)) error('ATTEMPT_STORE_NON_JSON');
    if (Array.isArray(x)) {
        if (Object.keys(x).length !== x.length || Object.getOwnPropertySymbols(x).length || x.some((_, i) => !own(x, i))) error('ATTEMPT_STORE_NON_JSON');
        stack.add(x); try { return '[' + x.map(v => canonical(v, stack)).join(',') + ']'; } finally { stack.delete(x); }
    }
    if (Object.getPrototypeOf(x) !== Object.prototype && Object.getPrototypeOf(x) !== null) error('ATTEMPT_STORE_NON_JSON');
    if (Object.getOwnPropertySymbols(x).length) error('ATTEMPT_STORE_NON_JSON');
    stack.add(x);
    try { return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k], stack)).join(',') + '}'; }
    finally { stack.delete(x); }
}
const clone = x => JSON.parse(canonical(x));
function syncDir(dir) { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function decode(raw) {
    let wrapper; try { wrapper = JSON.parse(raw); } catch { error('ATTEMPT_STORE_CORRUPT'); }
    if (!wrapper || wrapper.format !== 'durable-attempt-store-v1' || typeof wrapper.payload !== 'string' || typeof wrapper.sha256 !== 'string' || hash(wrapper.payload) !== wrapper.sha256) error('ATTEMPT_STORE_CORRUPT');
    let data; try { data = JSON.parse(wrapper.payload); } catch { error('ATTEMPT_STORE_CORRUPT'); }
    try { if (canonical(data) !== wrapper.payload) error('ATTEMPT_STORE_CORRUPT'); } catch { error('ATTEMPT_STORE_CORRUPT'); }
    if (!data || data.version !== 1 || !Array.isArray(data.entries)) error('ATTEMPT_STORE_CORRUPT');
    const ids = new Set();
    for (const entry of data.entries) {
        if (!entry || !validId(entry.sessionId) || !entry.attempt || !validId(entry.attempt.attemptId) || ids.has(entry.attempt.attemptId)) error('ATTEMPT_STORE_CORRUPT');
        ids.add(entry.attempt.attemptId);
    }
    return data;
}
function encode(data) { const payload = canonical(data); return canonical({ format: 'durable-attempt-store-v1', payload, sha256: hash(payload) }); }
export const DURABLE_ATTEMPT_STORE_INFO = Object.freeze({ name: 'DurableAttemptStore', version: '1.0.0-draft', storage: 'filesystem', durable: true, supportsTransactions: false, supportsHydration: false, atomicityScope: 'single-record-local-filesystem', globalAtomicityProven: false });

export function createDurableAttemptStore({ rootDir, lockTimeoutMs = 2000, lockPollMs = 10, failpoint = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0 || !Number.isSafeInteger(lockPollMs) || lockPollMs < 1) error('ATTEMPT_STORE_INVALID_OPTIONS');
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const root = fs.realpathSync(rootDir);
    const record = path.join(root, 'attempts.json'), lock = path.join(root, 'attempts.lock');
    const blank = () => ({ version: 1, entries: [] });
    function readData() { let raw; try { raw = fs.readFileSync(record, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return blank(); throw e; } return decode(raw); }
    function acquire() {
        const deadline = Date.now() + lockTimeoutMs;
        while (true) {
            try {
                fs.mkdirSync(lock, { mode: 0o700 });
                const token = randomUUID();
                // Incomplete locks are never automatically reclaimed: fail closed.
                const fd = fs.openSync(path.join(lock, 'owner.json'), 'wx', 0o600);
                try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
                syncDir(lock); syncDir(root);
                return token;
            } catch (e) {
                if (e.code !== 'EEXIST') throw e;
                if (Date.now() >= deadline) error('ATTEMPT_STORE_LOCK_TIMEOUT');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockPollMs);
            }
        }
    }
    function release(token) {
        let owner; try { owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner.json'), 'utf8')); } catch { error('ATTEMPT_STORE_LOCK_LOST'); }
        if (owner.token !== token || owner.pid !== process.pid) error('ATTEMPT_STORE_LOCK_LOST');
        fs.unlinkSync(path.join(lock, 'owner.json')); fs.rmdirSync(lock); syncDir(root);
    }
    function appendAttempt({ sessionId, attempt } = {}) {
        if (!validId(sessionId) || !attempt || typeof attempt !== 'object' || !validId(attempt.attemptId)) error('ATTEMPT_STORE_INVALID_ATTEMPT');
        const safe = clone(attempt);
        if (own(safe, 'sessionId') && safe.sessionId !== sessionId) error('ATTEMPT_STORE_SESSION_MISMATCH');
        const token = acquire(); let tmp = null;
        try {
            const data = readData(); const previous = data.entries.find(e => e.attempt.attemptId === safe.attemptId);
            if (previous) {
                if (previous.sessionId !== sessionId || canonical(previous.attempt) !== canonical(safe)) error('ATTEMPT_CONFLICT');
                return clone(previous.attempt);
            }
            data.entries.push({ sessionId, attempt: safe });
            tmp = path.join(root, '.attempts-' + randomUUID() + '.tmp');
            const fd = fs.openSync(tmp, 'wx', 0o600);
            try { fs.writeFileSync(fd, encode(data), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
            if (failpoint === 'afterTempFsync') error('ATTEMPT_STORE_INJECTED_FAILURE');
            fs.renameSync(tmp, record); tmp = null;
            if (failpoint === 'afterRename') error('ATTEMPT_STORE_INJECTED_FAILURE');
            syncDir(root);
            return clone(safe);
        } finally {
            if (tmp) { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
            release(token);
        }
    }
    function getAttempt({ sessionId, attemptId } = {}) {
        if (!validId(sessionId) || !validId(attemptId)) error('ATTEMPT_STORE_INVALID_ID');
        const found = readData().entries.find(e => e.sessionId === sessionId && e.attempt.attemptId === attemptId);
        return found ? clone(found.attempt) : null;
    }
    function listAttempts({ sessionId } = {}) { if (!validId(sessionId)) error('ATTEMPT_STORE_INVALID_ID'); return readData().entries.filter(e => e.sessionId === sessionId).map(e => clone(e.attempt)); }
    function listAttemptIds({ sessionId } = {}) { return listAttempts({ sessionId }).map(a => a.attemptId); }
    function hasAttempt({ sessionId, attemptId } = {}) { return getAttempt({ sessionId, attemptId }) !== null; }
    function countAttempts({ sessionId } = {}) { return listAttemptIds({ sessionId }).length; }
    function getInfo() { return { ...DURABLE_ATTEMPT_STORE_INFO }; }
    return Object.freeze({ appendAttempt, getAttempt, listAttempts, listAttemptIds, hasAttempt, countAttempts, getInfo });
}
export function getDurableAttemptStoreInfo() { return { ...DURABLE_ATTEMPT_STORE_INFO }; }
