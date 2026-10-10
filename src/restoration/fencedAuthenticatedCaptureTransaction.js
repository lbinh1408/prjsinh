/** Phase 3.3-C: cooperative, synchronous fenced authenticated persistence. No execution permit. */
import { validateFencedCapture } from './liveSessionRevisionAuthority.js';
import { prepareAuthenticatedFixture, persistPreAuthenticatedCapture } from './authenticatedPersistedIntegration.js';
import { signCaptureEnvelope } from './authenticatedCaptureAuthority.js';

const fail = code => { const error = new Error(code); error.code = code; throw error; };
const same = (a, b) => a === b;
/**
 * `assembleFixture(snapshot, {sessionId,revision})` MUST be deterministic and must
 * derive the checkpoint/extension/dependencies from the supplied fenced snapshot.
 * This synchronous protocol detects cooperative revision drift; it cannot stop
 * external writers bypassing the authority or guarantee rollback after rename.
 */
export function persistFencedAuthenticatedCapture({ authority, capture, assembleFixture, rootDir, key, keyId, expectedRevision = 0, validateEnvelope, persist = persistPreAuthenticatedCapture } = {}) {
    if (!authority || !capture?.fence || typeof assembleFixture !== 'function' || typeof persist !== 'function') fail('FENCED_TX_INVALID_INPUT');
    const first = validateFencedCapture({ authority, capture });
    let fixture = assembleFixture(structuredClone(capture.snapshot), { sessionId: first.sessionId, revision: first.revision });
    if (fixture && typeof fixture.then === 'function') fail('FENCED_TX_ASYNC_UNSUPPORTED');
    if (!fixture?.envelope?.binding || fixture.envelope.binding.sessionId !== first.sessionId || fixture.envelope.binding.revision !== first.revision) fail('FENCED_TX_BINDING_MISMATCH');
    // Force preparation and HMAC signing to complete before the final revision check.
    // This prevents known stale captures from reaching the disk commit.
    const prepared = prepareAuthenticatedFixture(fixture);
    signCaptureEnvelope({ envelope: prepared.envelope, key, keyId });
    const second = validateFencedCapture({ authority, capture });
    if (!same(first.revision, second.revision) || !same(first.sessionId, second.sessionId)) fail('FENCED_TX_STALE_CAPTURE');
    // This callback is synchronous by contract. Node cannot schedule ordinary
    // JS mutations between this check and a synchronous disk commit, but external
    // processes and reentrant hooks remain outside the authority's guarantees.
    const result = persist({ rootDir, fixture: prepared, expectedRevision, validateEnvelope, key, keyId });
    if (result && typeof result.then === 'function') fail('FENCED_TX_ASYNC_UNSUPPORTED');
    let postCommitFresh = false;
    try { validateFencedCapture({ authority, capture }); postCommitFresh = true; } catch (e) { if (e.code !== 'FENCE_STALE_CAPTURE') throw e; }
    return { receipt: result.receipt, manifestDigest: result.manifestDigest, sessionId: first.sessionId, revision: first.revision, fenceValidAtPreCommit: true, fenceValidAfterCommit: postCommitFresh, cooperativeAtomicityScope: 'single-process-synchronous', globalAtomicityProven: false, authenticatedCaptureClaim: true, executable: false };
}
