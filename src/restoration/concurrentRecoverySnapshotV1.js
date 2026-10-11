/** Phase 3.3-D DRAFT: conservative read-only snapshot stability observer.
 * This is NOT an atomic multi-store snapshot or a recovery authorization.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const safe = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, crossStoreAtomicityProven: false, durableSessionCommitProven: false });
const result = (status, reason, extra = {}) => Object.freeze({ schemaVersion: 'concurrent-recovery-snapshot-v1', status, reason, ...extra, ...safe });
const valid = s => typeof s === 'string' && s.length > 0 && s.length <= 256 && s.trim() === s;
function statFile(file) {
    try { const bytes = fs.readFileSync(file); return { present: true, sha256: sha(bytes), size: bytes.length }; }
    catch (e) { if (e.code === 'ENOENT') return { present: false }; throw e; }
}
function lockState(dir) { try { const s = fs.lstatSync(dir); return { present: true, isDirectory: s.isDirectory() }; } catch (e) { if (e.code === 'ENOENT') return { present: false }; throw e; } }
export function createConcurrentRecoverySnapshotV1({ rootDir, audit, hook = null } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || typeof audit?.inspect !== 'function' || (hook !== null && typeof hook !== 'function')) throw new TypeError('SNAPSHOT_INVALID_OPTIONS');
    const root = path.resolve(rootDir);
    function fingerprint(sessionId) {
        const name = sha(sessionId) + '.json';
        const files = [['attempts', path.join(root, 'attempts', 'attempts.json')], ['journal', path.join(root, 'journal', name)], ['checkpoint', path.join(root, 'checkpoints', name)]];
        const locks = [['attemptLock', path.join(root, 'attempts', 'attempts.lock')], ['journalLock', path.join(root, 'journal', sha(sessionId) + '.lock')], ['checkpointLock', path.join(root, 'checkpoints', sha(sessionId) + '.json.lock')]];
        return { files: Object.fromEntries(files.map(([k, v]) => [k, statFile(v)])), locks: Object.fromEntries(locks.map(([k, v]) => [k, lockState(v)])) };
    }
    function inspect({ sessionId } = {}) {
        if (!valid(sessionId)) throw new TypeError('SNAPSHOT_INVALID_SESSION');
        try {
            const before = fingerprint(sessionId);
            if (hook) hook('after-before', sessionId);
            const observation = audit.inspect({ sessionId });
            if (hook) hook('after-audit', sessionId);
            const after = fingerprint(sessionId);
            const changed = JSON.stringify(before.files) !== JSON.stringify(after.files);
            const locked = Object.values(before.locks).some(x => x.present) || Object.values(after.locks).some(x => x.present);
            if (changed) return result('UNSTABLE', 'FILES_CHANGED_DURING_AUDIT', { sessionId });
            if (locked) return result('UNSTABLE', 'LOCK_OBSERVED', { sessionId });
            if (!observation || typeof observation.status !== 'string') return result('UNSTABLE', 'INVALID_AUDIT_RESULT', { sessionId });
            return result(observation.status, observation.reason, { sessionId, stableAcrossTwoScans: true, underlyingAudit: observation });
        } catch (e) { return result('UNSTABLE', 'OBSERVATION_FAILED', { sessionId, errorCode: typeof e?.code === 'string' ? e.code : 'UNKNOWN' }); }
    }
    return Object.freeze({ inspect });
}
