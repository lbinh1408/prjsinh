/** Phase 3.3-C: signed, manifest-bound, disk-persisted guarded reconstruction. */
import { createHash } from 'node:crypto';
import { persistBoundCapture } from './atomicManifestBinding.js';
import { readPreAuthenticatedBoundCapture } from './preAuthCaptureBoundary.js';
import { signCaptureEnvelope } from './authenticatedCaptureAuthority.js';
import { REQUIRED_RUNTIME_DEPENDENCIES } from './dependencyCoverageValidator.js';

const fail = code => { const e = new Error(code); e.code = code; throw e; };
const sha = b => createHash('sha256').update(b).digest('hex');

/** Match the immutable dependency manifest that persistBoundCapture will write. */
export function prepareAuthenticatedFixture(fixture) {
    if (!fixture?.envelope?.binding || !fixture.contentBundle || !fixture.bindings) fail('AUTH_PERSIST_INVALID_FIXTURE');
    const { envelope, bindings, contentBundle } = fixture;
    const manifest = { schemaVersion: 'persisted-dependencies-v1', sessionId: envelope.binding.sessionId, revision: envelope.binding.revision, bindings: structuredClone(bindings), artifacts: {} };
    for (const name of REQUIRED_RUNTIME_DEPENDENCIES) {
        const key = bindings[name]; if (key === null) continue;
        const artifact = contentBundle[key]; if (!artifact || !artifact.bytes) fail('AUTH_PERSIST_MISSING_DEPENDENCY');
        manifest.artifacts[key] = { id: artifact.id, version: artifact.version, sha256: sha(Buffer.from(artifact.bytes)) };
    }
    const manifestDigest = sha(Buffer.from(JSON.stringify(manifest), 'utf8'));
    const captureBinding = { schemaVersion: 'atomic-manifest-binding-v1', manifestSha256: manifestDigest, sessionId: manifest.sessionId, revision: manifest.revision };
    return { ...fixture, envelope: { ...structuredClone(envelope), captureBinding }, manifestDigest };
}

export function persistPreAuthenticatedCapture({ rootDir, fixture, expectedRevision = 0, validateEnvelope, key, keyId } = {}) {
    const prepared = prepareAuthenticatedFixture(fixture);
    const signed = signCaptureEnvelope({ envelope: prepared.envelope, key, keyId });
    const result = persistBoundCapture({ rootDir, fixture: { ...prepared, envelope: signed }, expectedRevision, validateEnvelope });
    if (result.manifestDigest !== prepared.manifestDigest) fail('AUTH_PERSIST_MANIFEST_MISMATCH');
    return { ...result, authenticatedCaptureClaim: true, atomicityProven: false, executable: false };
}

export function readPreAuthenticatedPersistedCapture({ rootDir, sessionId, validateEnvelope, resolveKey } = {}) {
    const result = readPreAuthenticatedBoundCapture({ rootDir, sessionId, validateEnvelope, resolveKey });
    if (result === null) return null;
    if (result.verification.authenticated !== true || result.preAuthenticatedBeforeReconstruction !== true) fail('AUTH_PERSIST_UNVERIFIED');
    return { ...result, authenticatedEnvelopeVerified: true, atomicityProven: false, executable: false };
}
