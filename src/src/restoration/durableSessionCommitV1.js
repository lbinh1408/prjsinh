/** Durable Session Commit V1 DRAFT: audited checkpoint projection, not executable restoration. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { encodeCheckpoint, validateCheckpoint } from '../persistence/checkpointCodec.js';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const sha = s => createHash('sha256').update(s).digest('hex');
const idOk = x => typeof x === 'string' && x.length > 0 && x.length <= 256 && x.trim() === x;
function canonical(v, seen = new Set()) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (!v || typeof v !== 'object' || seen.has(v) || Object.getOwnPropertySymbols(v).length) fail('SESSION_COMMIT_NON_JSON');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail('SESSION_COMMIT_NON_JSON');
    seen.add(v);
    try {
        if (Array.isArray(v)) {
            if (Object.keys(v).length !== v.length || v.some((_, i) => !Object.hasOwn(v, i))) fail('SESSION_COMMIT_NON_JSON');
            return '[' + v.map(x => canonical(x, seen)).join(',') + ']';
        }
        return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k], seen)).join(',') + '}';
    } finally { seen.delete(v); }
}
const copy = v => JSON.parse(canonical(v));
const syncDir = dir => { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
export function createDurableSessionCommitV1({ rootDir, attemptStore, journal, lockTimeoutMs = 1000, lockPollMs = 10, failpoint = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || typeof attemptStore?.getAttempt !== 'function' ||
        typeof attemptStore?.listAttemptIds !== 'function' || typeof journal?.read !== 'function' ||
        typeof journal?.reconcile !== 'function' || !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0 ||
        !Number.isSafeInteger(lockPollMs) || lockPollMs < 1) fail('SESSION_COMMIT_INVALID_OPTIONS');
    fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 }); const root = fs.realpathSync(rootDir);
    const filename = id => { if (!idOk(id)) fail('SESSION_COMMIT_INVALID_SESSION'); return path.join(root, sha(id) + '.json'); };
    function read({ sessionId } = {}) {
        const name = filename(sessionId); let raw;
        try { raw = fs.readFileSync(name, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        let wrapper; try { wrapper = JSON.parse(raw); } catch { fail('SESSION_COMMIT_CORRUPT'); }
        if (!wrapper || wrapper.format !== 'durable-session-commit-v1' || wrapper.sessionId !== sessionId ||
            !Number.isSafeInteger(wrapper.authorityRevision) || wrapper.authorityRevision < 0 ||
            !Number.isSafeInteger(wrapper.checkpointRevision) || wrapper.checkpointRevision < 1 ||
            typeof wrapper.checkpointPayload !== 'string' || typeof wrapper.sha256 !== 'string' ||
            sha(wrapper.checkpointPayload) !== wrapper.sha256) fail('SESSION_COMMIT_CORRUPT');
        let checkpoint;
        try {
            checkpoint = JSON.parse(wrapper.checkpointPayload); validateCheckpoint(checkpoint);
            if (canonical(checkpoint) !== wrapper.checkpointPayload || checkpoint.revision !== wrapper.checkpointRevision || checkpoint.runtime.sessionId !== sessionId) fail('SESSION_COMMIT_CORRUPT');
        } catch { fail('SESSION_COMMIT_CORRUPT'); }
        return {
            sessionId, authorityRevision: wrapper.authorityRevision, checkpointRevision: wrapper.checkpointRevision,
            checkpoint: copy(checkpoint), sha256: wrapper.sha256, durableCheckpointObserved: true,
            durableSessionCommitProven: false, crossStoreAtomicityProven: false, resumeAuthorized: false, retryAuthorized: false, executable: false
        };
    }
    function locked(sessionId, fn) {
        const dir = filename(sessionId) + '.lock', deadline = Date.now() + lockTimeoutMs; let token;
        while (true) {
            try {
                fs.mkdirSync(dir, { mode: 0o700 }); token = randomUUID();
                const fd = fs.openSync(path.join(dir, 'owner.json'), 'wx', 0o600);
                try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
                syncDir(dir); syncDir(root); break;
            } catch (e) {
                if (e.code !== 'EEXIST') throw e; if (Date.now() >= deadline) fail('SESSION_COMMIT_LOCK_TIMEOUT');
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockPollMs);
            }
        }
        try { return fn(); } finally {
            let owner; try { owner = JSON.parse(fs.readFileSync(path.join(dir, 'owner.json'), 'utf8')); } catch { fail('SESSION_COMMIT_LOCK_LOST'); }
            if (owner.token !== token || owner.pid !== process.pid) fail('SESSION_COMMIT_LOCK_LOST');
            fs.unlinkSync(path.join(dir, 'owner.json')); fs.rmdirSync(dir); syncDir(root);
        }
    }
    function verifyAttempts(sessionId, session) {
        const attempts = session.attempts;
        if (!Array.isArray(attempts)) fail('SESSION_COMMIT_INVALID_ATTEMPTS');
        const ids = attempts.map(a => a?.attemptId);
        if (ids.some(x => !idOk(x)) || new Set(ids).size !== ids.length) fail('SESSION_COMMIT_INVALID_ATTEMPTS');
        const storedIds = attemptStore.listAttemptIds({ sessionId });
        if (!isDeepStrictEqual(ids, storedIds)) fail('SESSION_COMMIT_ATTEMPT_SEQUENCE_CONFLICT');
        const journalRecord = journal.read(sessionId);
        if (ids.length !== (journalRecord?.entries?.length ?? 0)) fail('SESSION_COMMIT_JOURNAL_SEQUENCE_CONFLICT');
        for (let i = 0; i < ids.length; i++) {
            const attempt = attemptStore.getAttempt({ sessionId, attemptId: ids[i] });
            if (attempt === null || canonical(attempt) !== canonical(attempts[i])) fail('SESSION_COMMIT_ATTEMPT_MISMATCH');
            const entry = journalRecord.entries[i];
            if (entry.attemptId !== ids[i] || entry.state !== 'COMMITTED') fail('SESSION_COMMIT_JOURNAL_UNVERIFIED');
            const audit = journal.reconcile({ sessionId, attemptId: ids[i] });
            if (audit.status !== 'COMMITTED' || audit.verification !== 'ATTEMPT_MATCHED' || audit.externalAttemptCommitVerified !== true)
                fail('SESSION_COMMIT_JOURNAL_UNVERIFIED');
        }
        return ids;
    }
    function commit({ authority, sessionId, expectedAuthorityRevision, expectedCheckpointRevision, contentRefs, savedAt } = {}) {
        if (typeof authority?.inspect !== 'function' || !Number.isSafeInteger(expectedAuthorityRevision) || expectedAuthorityRevision < 0 ||
            !Number.isSafeInteger(expectedCheckpointRevision) || expectedCheckpointRevision < 0) fail('SESSION_COMMIT_INVALID_REQUEST');
        return locked(sessionId, () => {
            const previous = read({ sessionId });
            if ((previous?.checkpointRevision ?? 0) !== expectedCheckpointRevision) fail('SESSION_COMMIT_REVISION_CONFLICT');
            const before = authority.inspect();
            if (before.sessionId !== sessionId || before.session?.runtime?.sessionId !== sessionId || before.revision !== expectedAuthorityRevision)
                fail('SESSION_COMMIT_AUTHORITY_CONFLICT');
            const attemptIds = verifyAttempts(sessionId, before.session);
            const checkpointRevision = expectedCheckpointRevision + 1;
            const checkpoint = encodeCheckpoint({ session: before.session, contentRefs, revision: checkpointRevision, savedAt, persistedAttemptIds: attemptIds });
            if (!isDeepStrictEqual(authority.inspect(), before)) fail('SESSION_COMMIT_AUTHORITY_DRIFT');
            const payload = canonical(checkpoint);
            const wrapper = {
                format: 'durable-session-commit-v1', sessionId, authorityRevision: expectedAuthorityRevision,
                checkpointRevision, checkpointPayload: payload, sha256: sha(payload)
            };
            const target = filename(sessionId), tmp = target + '.' + randomUUID() + '.tmp';
            try {
                const fd = fs.openSync(tmp, 'wx', 0o600);
                try { fs.writeFileSync(fd, canonical(wrapper)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
                if (failpoint === 'afterTempFsync') fail('SESSION_COMMIT_INJECTED_FAILURE');
                if (!isDeepStrictEqual(authority.inspect(), before)) fail('SESSION_COMMIT_AUTHORITY_DRIFT');
                fs.renameSync(tmp, target);
                if (failpoint === 'afterRename') fail('SESSION_COMMIT_INJECTED_FAILURE');
                syncDir(root);
            } finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
            return read({ sessionId });
        });
    }
    function audit({ sessionId } = {}) {
        const persisted = read({ sessionId });
        if (!persisted) return { status: 'NO_CHECKPOINT', durableCheckpointObserved: false, durableSessionCommitProven: false, resumeAuthorized: false, retryAuthorized: false, executable: false };
        const ids = persisted.checkpoint.attemptIds;
        const storedIds = attemptStore.listAttemptIds({ sessionId });
        if (!isDeepStrictEqual(ids, storedIds)) fail('SESSION_COMMIT_ATTEMPT_SEQUENCE_CONFLICT');
        const record = journal.read(sessionId);
        if (ids.length !== (record?.entries?.length ?? 0)) fail('SESSION_COMMIT_JOURNAL_SEQUENCE_CONFLICT');
        for (let i = 0; i < ids.length; i++) {
            if (record.entries[i].attemptId !== ids[i]) fail('SESSION_COMMIT_JOURNAL_SEQUENCE_CONFLICT');
            const check = journal.reconcile({ sessionId, attemptId: ids[i] });
            if (check.verification !== 'ATTEMPT_MATCHED' || check.status !== 'COMMITTED') fail('SESSION_COMMIT_JOURNAL_UNVERIFIED');
        }
        return {
            status: 'CHECKPOINT_MATCHED', checkpointRevision: persisted.checkpointRevision,
            authorityRevision: persisted.authorityRevision, durableCheckpointObserved: true, durableSessionCommitProven: false,
            crossStoreAtomicityProven: false, resumeAuthorized: false, retryAuthorized: false, executable: false
        };
    }
    return Object.freeze({ commit, read, audit });
}
