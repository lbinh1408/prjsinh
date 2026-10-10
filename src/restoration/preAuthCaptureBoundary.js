/** Phase 3.3-C: authenticate the committed envelope BEFORE dependency loading/reconstruction. */
import { createHash } from 'node:crypto';
import { createDurableAtomicCaptureStore } from './durableAtomicStore.js';
import { readAtomicCapture } from './atomicCaptureProtocol.js';
import { readBoundCapture } from './atomicManifestBinding.js';
import { verifyCaptureEnvelope } from './authenticatedCaptureAuthority.js';
import path from 'node:path';
const fail = (code) => { const error = new Error(code); error.code = code; throw error; };
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function readPreAuthenticatedBoundCapture({ rootDir, sessionId, validateEnvelope, resolveKey } = {}) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir) || typeof sessionId !== 'string' || !sessionId.trim() || typeof validateEnvelope !== 'function' || typeof resolveKey !== 'function') fail('PREAUTH_INVALID_INPUT');
    // Durable store read only: no manifest/blob parsing or reconstruction before authentication.
    const store = createDurableAtomicCaptureStore({ rootDir, validateEnvelope });
    const initial = readAtomicCapture({ store, sessionId });
    if (initial === null) return null;
    const verification = verifyCaptureEnvelope({ envelope: initial.envelope, resolveKey });
    if (verification.sessionId !== sessionId || verification.revision !== initial.revision) fail('PREAUTH_IDENTITY_MISMATCH');
    const initialDigest = digest(initial.envelope);
    // Reuse existing validated manifest/blob loader only AFTER successful authentication.
    const result = readBoundCapture({ rootDir, sessionId, validateEnvelope });
    if (!result || result.read.revision !== initial.revision || digest(result.read.envelope) !== initialDigest) fail('PREAUTH_COMMIT_CHANGED');
    return { ...result, verification, preAuthenticatedBeforeReconstruction: true, atomicityProven: false, executable: false };
}
/** Two reads + monotonic revision fencing: detects observed mutation, not atomic capture. */
export function captureFencedLiveSnapshot({ readSnapshot, readRevision, requireQuiescent } = {}) {
    if (typeof readSnapshot !== 'function' || typeof readRevision !== 'function') fail('CAPTURE_INVALID_READER');
    if (requireQuiescent !== undefined && typeof requireQuiescent !== 'function') fail('CAPTURE_INVALID_QUIESCENCE');
    if (requireQuiescent && !requireQuiescent()) fail('CAPTURE_NOT_QUIESCENT');
    const before = readRevision();
    if (!Number.isSafeInteger(before) || before < 0) fail('CAPTURE_INVALID_REVISION');
    const first = readSnapshot();
    const second = readSnapshot();
    const after = readRevision();
    if (before !== after || digest(first) !== digest(second)) fail('CAPTURE_CONCURRENT_MUTATION');
    if (requireQuiescent && !requireQuiescent()) fail('CAPTURE_NOT_QUIESCENT');
    return { snapshot: structuredClone(second), revision: after, doubleReadConsistent: true, atomicityProven: false, executable: false };
}
