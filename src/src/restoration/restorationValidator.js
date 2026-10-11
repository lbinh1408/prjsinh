/** Phase 3.3-C/C2 — read-only restoration validation; NOT session restoration. */
import { createHash, timingSafeEqual } from 'node:crypto';
import { RESTORATION_ERROR_CODES as C, RestorationError, validateRestorationRequest } from './restorationContract.js';

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const fail = (code, msg) => { throw new RestorationError(code, msg); };
const hex = v => typeof v === 'string' && /^[0-9a-f]{64}$/i.test(v);
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const bytes = v => v instanceof Uint8Array && !(v instanceof Uint8ClampedArray);

/**
 * contentBundle format: { [manifestKey]: {id, version, bytes: Uint8Array} }
 * Bytes MUST be exact trusted artifact bytes, not JSON reserialization or caller-supplied hash.
 * C2 validates content bytes and selected checkpoint metadata, but cannot prove provenance,
 * cross-store atomicity, or StudySession runtime continuity.
 */
export function validateRestorationReadiness(request) {
    validateRestorationRequest(request);
    const { candidate, contentBundle } = request;
    const refs = candidate.contentRefs;
    const keys = Object.keys(refs);
    if (!keys.length || keys.length !== Object.keys(contentBundle).length ||
        keys.some(k => !own(contentBundle, k))) {
        fail(C.CONTENT_UNVERIFIED, 'Content artifact set does not match manifest.');
    }
    for (const key of keys) {
        const ref = refs[key];
        const artifact = contentBundle[key];
        if (!record(ref) || !nonempty(ref.id) || !nonempty(ref.version) || !hex(ref.sha256) ||
            /^0{64}$/.test(ref.sha256) || !record(artifact) ||
            artifact.id !== ref.id || artifact.version !== ref.version || !bytes(artifact.bytes)) {
            fail(C.CONTENT_UNVERIFIED, 'Content artifact metadata or bytes invalid.');
        }
        const expected = Buffer.from(ref.sha256, 'hex');
        const actual = createHash('sha256').update(artifact.bytes).digest();
        if (!timingSafeEqual(expected, actual)) {
            fail(C.CONTENT_UNVERIFIED, 'Content artifact digest mismatch.');
        }
    }
    const cp = candidate.checkpoint;
    if (!record(cp.runtime) || !record(cp.state) || !record(cp.config) ||
        !record(cp.contentRefs) || !Array.isArray(candidate.attempts) ||
        cp.runtime.name !== 'StudySession' || cp.runtime.status !== 'active' ||
        cp.runtime.sessionId !== candidate.sessionId || cp.revision !== candidate.revision ||
        cp.config.lessonId !== refs.lesson?.id ||
        Object.keys(cp.contentRefs).length !== keys.length ||
        keys.some(k => !own(cp.contentRefs, k) ||
            cp.contentRefs[k]?.id !== refs[k].id ||
            cp.contentRefs[k]?.version !== refs[k].version ||
            cp.contentRefs[k]?.sha256?.toLowerCase() !== refs[k].sha256.toLowerCase())) {
        fail(C.INVALID_CANDIDATE, 'Checkpoint runtime or manifest is inconsistent.');
    }
    // C2 cannot establish adapter correctness or full internal state reconstruction.
    // Do not return an executable capability or promote hydration verification flags.
    return Object.freeze({
        status: 'validated-for-restoration-design',
        executable: false,
        sessionId: candidate.sessionId,
        revision: candidate.revision,
        verifiedArtifactCount: keys.length,
        contentBytesVerified: true,
        runtimeContinuityVerified: false,
        atomicSnapshotGuaranteed: false,
        adapterCapabilityVerified: false
    });
}
