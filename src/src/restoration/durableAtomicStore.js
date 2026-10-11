/** Phase 3.3-C Durable Atomic Store V1. Node filesystem, one record per session. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';

const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
const sha = s => createHash('sha256').update(s).digest('hex');
const isRev = x => Number.isSafeInteger(x) && x >= 0;
const isId = x => typeof x === 'string' && x.length > 0 && x.length <= 256 && x.trim() === x;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) { if (Object.keys(x).length !== x.length || x.some((_, i) => !own(x, i))) fail('DURABLE_NON_JSON'); return '[' + x.map(canonical).join(',') + ']'; }
    if (!x || typeof x !== 'object' || Object.getPrototypeOf(x) !== Object.prototype) fail('DURABLE_NON_JSON');
    return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}
const clone = x => JSON.parse(canonical(x));
function fsyncDir(dir) { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function validateRecord(record, id) {
    if (!record || record.format !== 'durable-capture-v1' || record.sessionId !== id || !isRev(record.revision) || record.revision < 1 || typeof record.envelopeJson !== 'string' || typeof record.sha256 !== 'string') fail('DURABLE_CORRUPT_RECORD');
    if (sha(record.envelopeJson) !== record.sha256) fail('DURABLE_CORRUPT_RECORD');
    let envelope; try { envelope = JSON.parse(record.envelopeJson); } catch { fail('DURABLE_CORRUPT_RECORD'); }
    if (canonical(envelope) !== record.envelopeJson || envelope?.binding?.sessionId !== id || envelope?.checkpoint?.runtime?.sessionId !== id || envelope?.checkpoint?.revision !== record.revision || envelope?.executable !== false) fail('DURABLE_CORRUPT_RECORD');
    return envelope;
}
/** Requires exclusive ownership of rootDir by the application; do not use on untrusted/shared filesystem. */
export function createDurableAtomicCaptureStore({ rootDir, validateEnvelope, lockTimeoutMs = 2000, lockPollMs = 10, recoverDeadLocks = false, failpoint = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || typeof validateEnvelope !== 'function') fail('DURABLE_INVALID_OPTIONS');
    if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0 || !Number.isSafeInteger(lockPollMs) || lockPollMs < 1) fail('DURABLE_INVALID_OPTIONS');
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
    const root = fs.realpathSync(rootDir);
    const records = path.join(root, 'records'); const locks = path.join(root, 'locks');
    fs.mkdirSync(records, { recursive: true, mode: 0o700 }); fs.mkdirSync(locks, { recursive: true, mode: 0o700 });
    const key = id => { if (!isId(id)) fail('DURABLE_INVALID_SESSION'); return sha(id); };
    const file = id => path.join(records, key(id) + '.json');
    const lockDir = id => path.join(locks, key(id) + '.lock');
    const recoveryDir = id => path.join(locks, key(id) + '.recovery');
    function checkEnvelope(envelope) {
        const id = envelope?.binding?.sessionId;
        if (!isId(id)) fail('DURABLE_INVALID_ENVELOPE');
        try { validateEnvelope(envelope); } catch (e) { if (e?.code) throw e; fail('DURABLE_INVALID_ENVELOPE'); }
        if (envelope.checkpoint?.runtime?.sessionId !== id || !isRev(envelope.checkpoint?.revision) || envelope.checkpoint.revision < 1 || envelope.executable !== false) fail('DURABLE_INVALID_ENVELOPE');
        return id;
    }
    function readInternal(id) {
        let raw; try { raw = fs.readFileSync(file(id), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        let rec; try { rec = JSON.parse(raw); } catch { fail('DURABLE_CORRUPT_RECORD'); }
        const envelope = validateRecord(rec, id);
        checkEnvelope(envelope);
        return { envelope, revision: rec.revision, recordSha256: sha(raw) };
    }
    /** Fail-closed crash recovery: never steal a lock held by a live/unknown PID.
     * The per-session recovery mutex serializes reclaimers. A lock lacking complete
     * owner metadata is deliberately NOT recovered automatically.
     */
    function recover(id) {
        if (!recoverDeadLocks) return false;
        const guard = recoveryDir(id);
        try { fs.mkdirSync(guard, { mode: 0o700 }); } catch (e) { if (e.code === 'EEXIST') return false; throw e; }
        try {
            const name = lockDir(id);
            let owner;
            try { owner = JSON.parse(fs.readFileSync(path.join(name, 'owner.json'), 'utf8')); }
            catch (e) { if (e.code === 'ENOENT') return false; return false; }
            if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid < 1 || typeof owner.token !== 'string' || !owner.token) return false;
            try { process.kill(owner.pid, 0); return false; }
            catch (e) { if (e.code !== 'ESRCH') return false; }
            // Owner PID is absent. The recovery mutex ensures only one reclaimer acts.
            // A process with a reused/live PID is always treated as alive (fail closed).
            const tomb = path.join(locks, key(id) + '.dead-' + randomUUID());
            try { fs.renameSync(name, tomb); } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
            fs.rmSync(tomb, { recursive: true, force: true });
            fsyncDir(locks);
            return true;
        } finally { fs.rmdirSync(guard); }
    }
    function lock(id) {
        const name = lockDir(id); const deadline = Date.now() + lockTimeoutMs;
        for (; ;) {
            try {
                fs.mkdirSync(name, { mode: 0o700 });
                const token = randomUUID();
                try {
                    const fd = fs.openSync(path.join(name, 'owner.json'), 'wx', 0o600);
                    try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
                    fsyncDir(name);
                    return { name, token };
                } catch (e) {
                    // If metadata could not be made durable, leave the incomplete lock
                    // in place: unsafe recovery is intentionally forbidden.
                    throw e;
                }
            } catch (e) {
                if (e.code !== 'EEXIST') throw e;
                if (recover(id)) continue;
                if (Date.now() >= deadline) fail('DURABLE_LOCK_TIMEOUT');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockPollMs);
            }
        }
    }
    function unlock(held) {
        // Only the holder can release; a corrupted/missing owner fails closed.
        let owner; try { owner = JSON.parse(fs.readFileSync(path.join(held.name, 'owner.json'), 'utf8')); } catch { fail('DURABLE_LOCK_OWNERSHIP_LOST'); }
        if (owner.token !== held.token || owner.pid !== process.pid) fail('DURABLE_LOCK_OWNERSHIP_LOST');
        fs.unlinkSync(path.join(held.name, 'owner.json'));
        fs.rmdirSync(held.name);
    }
    function commit({ envelope, expectedRevision } = {}) {
        const id = checkEnvelope(envelope);
        if (!isRev(expectedRevision)) fail('DURABLE_INVALID_EXPECTED_REVISION');
        const serialized = canonical(envelope);
        const held = lock(id); let tmp = null;
        try {
            const old = readInternal(id); const actual = old?.revision ?? 0;
            if (actual === envelope.checkpoint.revision && old && canonical(old.envelope) === serialized) return { status: 'idempotent', sessionId: id, revision: actual };
            if (actual !== expectedRevision || envelope.checkpoint.revision !== expectedRevision + 1) fail('DURABLE_REVISION_CONFLICT');
            const rec = { format: 'durable-capture-v1', sessionId: id, revision: envelope.checkpoint.revision, envelopeJson: serialized, sha256: sha(serialized) };
            tmp = path.join(records, `${key(id)}.${process.pid}.${cryptoRandom()}.tmp`);
            const fd = fs.openSync(tmp, 'wx', 0o600);
            try { fs.writeFileSync(fd, canonical(rec), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
            if (failpoint === 'afterTempFsync') fail('DURABLE_INJECTED_FAILURE');
            fs.renameSync(tmp, file(id)); tmp = null;
            if (failpoint === 'afterRename') fail('DURABLE_INJECTED_FAILURE');
            fsyncDir(records);
            return { status: 'committed', sessionId: id, revision: envelope.checkpoint.revision };
        } finally {
            if (tmp) { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
            unlock(held);
        }
    }
    function read({ sessionId } = {}) {
        if (!isId(sessionId)) fail('DURABLE_INVALID_SESSION');
        const result = readInternal(sessionId);
        if (!result) return null;
        return { status: 'durable-record-read', envelope: clone(result.envelope), revision: result.revision, storageDurabilityVerified: false, externalProvenanceVerified: false, executable: false };
    }
    return Object.freeze({ commit, read });
}
function cryptoRandom() { return createHash('sha256').update(os.hostname() + ':' + process.hrtime.bigint() + ':' + Math.random()).digest('hex').slice(0, 16); }
