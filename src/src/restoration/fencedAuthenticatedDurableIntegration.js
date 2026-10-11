/** Phase 3.3-C: compose fenced capture with REAL synchronous durable persistence.
 * Guarded reconstruction only. Caller must supply closed-world single-writer authority.
 */
import { persistFencedAuthenticatedCapture } from './fencedAuthenticatedCaptureTransaction.js';
import { readPreAuthenticatedPersistedCapture } from './authenticatedPersistedIntegration.js';

const fail = code => { const e = new Error(code); e.code = code; throw e; };

export function commitFencedDurableCapture({ authority, capture, assembleFixture, rootDir, key, keyId, expectedRevision = 0, validateEnvelope } = {}) {
    if (typeof rootDir !== 'string' || typeof validateEnvelope !== 'function') fail('FENCED_DURABLE_INVALID_INPUT');
    const saved = persistFencedAuthenticatedCapture({ authority, capture, assembleFixture, rootDir, key, keyId, expectedRevision, validateEnvelope });
    if (!saved?.receipt || saved.sessionId !== capture.sessionId || saved.revision !== capture.revision) fail('FENCED_DURABLE_INVALID_RECEIPT');
    return { ...saved, durableAdapterUsed: true, authenticatedCaptureClaim: true, globalAtomicityProven: false, executable: false };
}

export function readFencedDurableCapture({ rootDir, sessionId, validateEnvelope, resolveKey } = {}) {
    const result = readPreAuthenticatedPersistedCapture({ rootDir, sessionId, validateEnvelope, resolveKey });
    if (result === null) return null;
    if (result.authenticatedEnvelopeVerified !== true || result.preAuthenticatedBeforeReconstruction !== true) fail('FENCED_DURABLE_UNAUTHENTICATED');
    return { ...result, durableAdapterUsed: true, globalAtomicityProven: false, executable: false };
}
