import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const canonical = x => JSON.stringify(x);
const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
const safeId = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(s);
const safeJson = s => { try { return JSON.parse(s); } catch { fail('SNAPSHOT_CORRUPT'); } };
const fsyncDir = p => { const fd = fs.openSync(p, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } };
const writeAtomic = (dir, target, bytes) => {
    const tmp = path.join(dir, `.tmp-${crypto.randomUUID()}`);
    let exists = false;
    try {
        const fd = fs.openSync(tmp, 'wx', 0o600); exists = true;
        try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        fs.renameSync(tmp, target); exists = false; fsyncDir(dir);
    } finally { if (exists) { try { fs.unlinkSync(tmp); } catch { } } }
};
const forbidden = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, crossStoreAtomicityProven: false });

/** V1 publishes an immutable *supplied observation*, not an atomic capture of live stores.
 * Single publisher per session required; this module does not coordinate live writers.
 */
export function createAtomicSnapshotPublicationV1({ rootDir, failpoint } = {}) {
    if (typeof rootDir !== 'string' || !rootDir) fail('INVALID_ROOT');
    const root = path.resolve(rootDir);
    const base = path.join(root, 'atomic-snapshots-v1');
    const sessionDir = id => { if (!safeId(id)) fail('INVALID_SESSION_ID'); return path.join(base, id); };
    function read({ sessionId }) {
        const dir = sessionDir(sessionId), pointer = path.join(dir, 'CURRENT.json');
        if (!fs.existsSync(pointer)) return { status: 'ABSENT', sessionId, ...forbidden };
        try {
            const p = safeJson(fs.readFileSync(pointer, 'utf8'));
            if (p.version !== 1 || !safeId(p.generation) || !/^[a-f0-9]{64}$/.test(p.sha256)) fail('SNAPSHOT_CORRUPT');
            const genPath = path.join(dir, `generation-${p.generation}.json`);
            const bytes = fs.readFileSync(genPath, 'utf8');
            if (hash(bytes) !== p.sha256) fail('SNAPSHOT_CORRUPT');
            const record = safeJson(bytes);
            if (record.version !== 1 || record.sessionId !== sessionId || record.generation !== p.generation || !record.observation || typeof record.observation !== 'object' || Array.isArray(record.observation)) fail('SNAPSHOT_CORRUPT');
            if (record.observation.status !== 'CONSISTENT' || record.observation.resumeAuthorized !== false || record.observation.retryAuthorized !== false || record.observation.executable !== false || record.observation.recoveryAuthorized !== false) fail('SNAPSHOT_CORRUPT');
            return { status: 'PUBLISHED', sessionId, generation: p.generation, observation: record.observation, ...forbidden };
        } catch (e) { return { status: 'CORRUPT', sessionId, reason: e.code || 'SNAPSHOT_READ_FAILED', ...forbidden }; }
    }
    function publish({ sessionId, observation }) {
        const dir = sessionDir(sessionId);
        if (!observation || typeof observation !== 'object' || Array.isArray(observation) || observation.status !== 'CONSISTENT' || observation.resumeAuthorized !== false || observation.retryAuthorized !== false || observation.executable !== false || observation.recoveryAuthorized !== false) fail('UNSAFE_OBSERVATION');
        // Caller must guarantee the observation came from a quiescent/consistent capture.
        // This module cannot verify that provenance or enforce a cross-store transaction.
        fs.mkdirSync(dir, { recursive: true });
        const generation = crypto.randomUUID();
        const record = { version: 1, sessionId, generation, observation: structuredClone(observation) };
        const bytes = canonical(record);
        writeAtomic(dir, path.join(dir, `generation-${generation}.json`), bytes);
        failpoint?.('after_generation_durable');
        const pointer = canonical({ version: 1, generation, sha256: hash(bytes) });
        writeAtomic(dir, path.join(dir, 'CURRENT.json'), pointer);
        failpoint?.('after_pointer_durable');
        return read({ sessionId });
    }
    return Object.freeze({ publish, read });
}
