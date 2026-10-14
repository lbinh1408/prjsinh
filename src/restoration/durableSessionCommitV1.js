/** Durable Session Commit V1 DRAFT: audited checkpoint projection, not executable restoration. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { encodeCheckpoint, validateCheckpoint } from '../persistence/checkpointCodec.js';
import { createRemediationStopProvenance, verifyRemediationStopProvenance } from '../engines/orchestration/remediationStopProvenance.js';
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
const captureFields = ['stopKind', 'stopFingerprint', 'targetNodeId', 'triggerAttemptId', 'generationInputs'];
function frozenData(value, seen = new Set()) {
    if (!value || typeof value !== 'object') return true;
    if (!Object.isFrozen(value) || seen.has(value)) return false;
    seen.add(value);
    return Reflect.ownKeys(value).every(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return Object.hasOwn(descriptor, 'value') && frozenData(descriptor.value, seen);
    });
}
function boundStop(checkpoint, kind, inputs) {
    const field = kind === 'INFEASIBLE' ? 'remediationGenerationStop'
        : kind === 'POLICY_ERROR' ? 'remediationPolicyErrorStop' : null;
    const stop = field && checkpoint.extensions?.[field];
    if (!stop || stop.status !== kind || !checkpoint.attemptIds.includes(stop.triggerAttemptId) ||
        inputs?.targetNodeId !== stop.targetNodeId || inputs?.bankIdentity?.bankId !== stop.bankId ||
        inputs?.bankIdentity?.version !== stop.bankVersion ||
        inputs?.questionBank?.bankId !== stop.bankId || inputs?.questionBank?.version !== stop.bankVersion ||
        inputs?.questionBank?.primaryNode !== stop.targetNodeId ||
        (kind === 'POLICY_ERROR' && (inputs?.policy?.policyId !== stop.policyId ||
            inputs?.policy?.policyVersion !== stop.policyVersion))) fail('SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID');
    return stop;
}
function verifyWrapperProvenance(wrapper, checkpoint) {
    const provenance = wrapper.remediationStopProvenance;
    const stop = boundStop(checkpoint, provenance?.stopKind, provenance?.generationInputs);
    // This integration writes/accepts V1 only; library V2 support is not activation.
    if (provenance.fingerprintContract !== 'V1' || provenance.participation !== null)
        fail('SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID');
    return verifyRemediationStopProvenance({ provenance, sessionId: wrapper.sessionId,
        checkpointRevision: wrapper.checkpointRevision, checkpointPayloadSha256: wrapper.sha256,
        stopKind: stop.status, stopFingerprint: stop.configFingerprint });
}
// Compatibility: only a supplied capture requires provenance at commit time.
// No capture means the historical wrapper bytes/shape, even for a historical stop.
// A missing whole member on read is absent/unverified: its deletion is indistinguishable
// from a legacy wrapper. sha256 still covers checkpointPayload only, not this envelope.
// No provenance is reconstructed or carried forward from a previous revision.
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
            if (Object.hasOwn(wrapper, 'remediationStopProvenance')) verifyWrapperProvenance(wrapper, checkpoint);
        } catch { fail('SESSION_COMMIT_CORRUPT'); }
        return {
            sessionId, authorityRevision: wrapper.authorityRevision, checkpointRevision: wrapper.checkpointRevision,
            checkpoint: copy(checkpoint), sha256: wrapper.sha256, durableCheckpointObserved: true,
            ...(Object.hasOwn(wrapper, 'remediationStopProvenance')
                ? { remediationStopProvenance: copy(wrapper.remediationStopProvenance) } : {}),
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
    function commit(request = {}) {
        const { authority, sessionId, expectedAuthorityRevision, expectedCheckpointRevision, contentRefs, savedAt } = request;
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
            if (Object.hasOwn(request, 'remediationStopCapture')) {
                try {
                    const capture = request.remediationStopCapture;
                    if (!capture || ![Object.prototype, null].includes(Object.getPrototypeOf(capture)) ||
                        Reflect.ownKeys(capture).length !== captureFields.length ||
                        captureFields.some(key => !Object.hasOwn(capture, key)) || !frozenData(capture))
                        fail('SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID');
                    // Reject non-JSON inputs before the helper can canonicalize away undefined values.
                    canonical(capture);
                    const stop = boundStop(checkpoint, capture.stopKind, capture.generationInputs);
                    const trigger = before.session.attempts.at(-1);
                    if (capture.targetNodeId !== stop.targetNodeId || capture.triggerAttemptId !== stop.triggerAttemptId ||
                        capture.stopFingerprint !== stop.configFingerprint || trigger?.attemptId !== capture.triggerAttemptId ||
                        trigger?.sessionId !== sessionId) fail('SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID');
                    wrapper.remediationStopProvenance = createRemediationStopProvenance({
                        sessionId, checkpointRevision, checkpointPayloadSha256: wrapper.sha256,
                        stopKind: capture.stopKind, stopFingerprint: capture.stopFingerprint,
                        fingerprintContract: 'V1', participation: null, generationInputs: capture.generationInputs
                    });
                    verifyWrapperProvenance(wrapper, checkpoint);
                } catch (cause) {
                    const error = new Error('SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID', { cause });
                    error.code = 'SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID';
                    throw error;
                }
            }
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
