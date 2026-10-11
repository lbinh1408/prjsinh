import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const deny = Object.freeze({ resumeAuthorized: false, retryAuthorized: false, executable: false, recoveryAuthorized: false, crossStoreAtomicityProven: false });
const valid = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(x);
const err = code => Object.assign(new Error(code), { code });
const digest = x => crypto.createHash('sha256').update(x).digest('hex');
const syncDir = dir => { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) } };
function atomic(dir, name, bytes) {
    const tmp = path.join(dir, `.tmp-${crypto.randomUUID()}`);
    try { const fd = fs.openSync(tmp, 'wx', 0o600); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }; fs.renameSync(tmp, path.join(dir, name)); syncDir(dir); }
    finally { try { fs.unlinkSync(tmp) } catch (e) { if (e.code !== 'ENOENT') throw e } }
}
/** Cooperative fencing protocol. ALL participating writers must use withWriter().
 * Non-cooperating writers, direct publication API, and multi-file atomicity are NOT covered.
 * A stale lock is deliberately never auto-reclaimed. */
export function createAtomicCaptureCoordinationV1({ rootDir, publisher, capture } = {}) {
    if (typeof rootDir !== 'string' || !rootDir) throw err('INVALID_ROOT');
    if (!publisher || typeof publisher.publish !== 'function') throw err('INVALID_PUBLISHER');
    if (typeof capture !== 'function') throw err('INVALID_CAPTURE');
    const base = path.join(path.resolve(rootDir), 'capture-coordination-v1');
    const dirFor = id => { if (!valid(id)) throw err('INVALID_SESSION_ID'); return path.join(base, id) };
    function withLock(sessionId, callback) {
        const dir = dirFor(sessionId); fs.mkdirSync(dir, { recursive: true });
        const lock = path.join(dir, 'COORDINATION.lock');
        try { fs.mkdirSync(lock) } catch (e) { if (e.code === 'EEXIST') throw err('CAPTURE_LOCK_BUSY'); throw e }
        try { return callback(dir) } finally { fs.rmdirSync(lock) }
    }
    function readEpoch(dir) {
        const file = path.join(dir, 'EPOCH.json'); if (!fs.existsSync(file)) return 0;
        let obj; try { obj = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { throw err('FENCE_CORRUPT') }
        if (!obj || !Number.isSafeInteger(obj.epoch) || obj.epoch < 1 || obj.sha256 !== digest(String(obj.epoch))) throw err('FENCE_CORRUPT');
        return obj.epoch;
    }
    function advance(dir) { const next = readEpoch(dir) + 1; if (!Number.isSafeInteger(next)) throw err('FENCE_EXHAUSTED'); atomic(dir, 'EPOCH.json', JSON.stringify({ epoch: next, sha256: digest(String(next)) })); return next }
    function withWriter({ sessionId, write }) {
        if (typeof write !== 'function') throw err('INVALID_WRITER');
        return withLock(sessionId, dir => { const epoch = advance(dir); return write({ epoch }) });
    }
    function issuePublisherToken({ sessionId }) {
        return withLock(sessionId, dir => { const epoch = advance(dir); return Object.freeze({ sessionId, epoch }) });
    }
    function publishCaptured({ sessionId, token }) {
        if (!token || token.sessionId !== sessionId || !Number.isSafeInteger(token.epoch) || token.epoch < 1) throw err('INVALID_FENCE_TOKEN');
        return withLock(sessionId, dir => {
            if (readEpoch(dir) !== token.epoch) throw err('STALE_PUBLISHER');
            // All cooperative writes are excluded while capture and publish run synchronously.
            const observation = capture({ sessionId });
            if (observation?.status !== 'CONSISTENT') throw err('CAPTURE_NOT_CONSISTENT');
            const result = publisher.publish({ sessionId, observation });
            if (result?.status !== 'PUBLISHED') throw err('PUBLICATION_NOT_CONFIRMED');
            return { ...result, coordination: 'COOPERATIVE_ONLY', ...deny };
        });
    }
    function inspect({ sessionId }) {
        const dir = dirFor(sessionId);
        if (fs.existsSync(path.join(dir, 'COORDINATION.lock'))) return { status: 'BUSY', sessionId, ...deny };
        try { return { status: 'OBSERVED', sessionId, epoch: readEpoch(dir), ...deny } } catch (e) { return { status: 'CORRUPT', sessionId, reason: e.code, ...deny } }
    }
    return Object.freeze({ withWriter, issuePublisherToken, publishCaptured, inspect });
}
