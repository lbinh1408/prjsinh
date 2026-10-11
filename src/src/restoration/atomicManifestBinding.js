/** C3 persisted guarded reconstruction; not an execution permit or authenticated capture. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDurableAtomicCaptureStore } from './durableAtomicStore.js';
import { readAtomicCapture, commitAtomicCapture } from './atomicCaptureProtocol.js';
import { reconstructGuardedStudySession } from './trustedRestorationAdapter.js';
import { REQUIRED_RUNTIME_DEPENDENCIES } from './dependencyCoverageValidator.js';
const sha = b => createHash('sha256').update(b).digest('hex');
const fail = c => { const e = new Error(c); e.code = c; throw e; };
const idOk = s => typeof s === 'string' && s.length > 0 && s.length <= 256 && s.trim() === s;
function blobRoot(rootDir) { return path.join(rootDir, 'dependency-blobs'); }
function ensureStore(rootDir, validateEnvelope) { return createDurableAtomicCaptureStore({ rootDir, validateEnvelope }); }
/** Blobs are immutable, written before the envelope commit. Orphans may remain after failed commits. */
export function persistBoundCapture({ rootDir, fixture, expectedRevision = 0, validateEnvelope } = {}) {
    if (!path.isAbsolute(rootDir) || typeof validateEnvelope !== 'function' || !fixture?.envelope || !fixture.contentBundle || !fixture.bindings) fail('PERSIST_INVALID_INPUT');
    const { envelope, contentBundle, bindings } = fixture;
    // Validate *all* dependency bytes and binding references before touching disk.
    reconstructGuardedStudySession({ envelope, contentBundle, bindings });
    const blobDir = blobRoot(rootDir); fs.mkdirSync(blobDir, { recursive: true, mode: 0o700 });
    const manifest = { schemaVersion: 'persisted-dependencies-v1', sessionId: envelope.binding.sessionId, revision: envelope.binding.revision, bindings: structuredClone(bindings), artifacts: {} };
    for (const name of REQUIRED_RUNTIME_DEPENDENCIES) {
        const key = bindings[name]; if (key === null) continue;
        const artifact = contentBundle[key]; const bytes = Buffer.from(artifact.bytes); const digest = sha(bytes);
        const target = path.join(blobDir, digest + '.json');
        try { const fd = fs.openSync(target, 'wx', 0o600); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
        catch (e) { if (e.code !== 'EEXIST') throw e; const existing = fs.readFileSync(target); if (sha(existing) !== digest || !existing.equals(bytes)) fail('PERSIST_BLOB_COLLISION'); }
        manifest.artifacts[key] = { id: artifact.id, version: artifact.version, sha256: digest };
    }
    // Manifest stored as content-addressed immutable blob. Its hash is NOT yet atomically bound
    // to the envelope in Durable Store V1, so caller must retain its returned manifestDigest.
    const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8'); const manifestDigest = sha(manifestBytes);
    const manifestFile = path.join(blobDir, manifestDigest + '.manifest');
    try { const fd = fs.openSync(manifestFile, 'wx', 0o600); try { fs.writeFileSync(fd, manifestBytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
    catch (e) { if (e.code !== 'EEXIST') throw e; if (!fs.readFileSync(manifestFile).equals(manifestBytes)) fail('PERSIST_BLOB_COLLISION'); }
    const fd = fs.openSync(blobDir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const boundEnvelope = { ...structuredClone(envelope), captureBinding: { schemaVersion: "atomic-manifest-binding-v1", manifestSha256: manifestDigest, sessionId: manifest.sessionId, revision: manifest.revision } };
    const receipt = commitAtomicCapture({ store: ensureStore(rootDir, validateEnvelope), envelope: boundEnvelope, expectedRevision });
    return { receipt, manifestDigest, sessionId: manifest.sessionId, revision: manifest.revision, executable: false };
}
/** Caller supplies exact manifestDigest from prior commit; cannot infer it safely from session ID. */
export function readBoundCapture({ rootDir, sessionId, validateEnvelope } = {}) {
    if (!path.isAbsolute(rootDir) || !idOk(sessionId) || typeof validateEnvelope !== 'function') fail('PERSIST_INVALID_INPUT');
    const read = readAtomicCapture({ store: ensureStore(rootDir, validateEnvelope), sessionId }); if (read === null) return null;
    const binding = read.envelope.captureBinding;
    if (!binding || binding.schemaVersion !== 'atomic-manifest-binding-v1' || binding.sessionId !== sessionId || binding.revision !== read.revision || !(/^[a-f0-9]{64}$/.test(binding.manifestSha256))) fail('BINDING_INVALID');
    const manifestDigest = binding.manifestSha256;
    const dir = blobRoot(rootDir); let bytes; try { bytes = fs.readFileSync(path.join(dir, manifestDigest + '.manifest')); } catch { fail('PERSIST_MISSING_MANIFEST'); }
    if (sha(bytes) !== manifestDigest) fail('PERSIST_MANIFEST_TAMPER');
    let manifest; try { manifest = JSON.parse(bytes.toString('utf8')); } catch { fail('PERSIST_MANIFEST_TAMPER'); }
    if (manifest.schemaVersion !== 'persisted-dependencies-v1' || manifest.sessionId !== sessionId || manifest.revision !== read.revision) fail('PERSIST_REVISION_DRIFT');
    const bindings = manifest.bindings, contentBundle = {};
    for (const [key, ref] of Object.entries(manifest.artifacts)) {
        if (!ref || !(/^[a-f0-9]{64}$/.test(ref.sha256))) fail('PERSIST_INVALID_MANIFEST');
        let data; try { data = fs.readFileSync(path.join(dir, ref.sha256 + '.json')); } catch { fail('PERSIST_MISSING_BLOB'); }
        if (sha(data) !== ref.sha256) fail('PERSIST_BLOB_TAMPER');
        contentBundle[key] = { id: ref.id, version: ref.version, bytes: data };
    }
    const guarded = reconstructGuardedStudySession({ envelope: read.envelope, contentBundle, bindings });
    return { guarded, read, manifestDigest, manifestAtomicallyBound: true, externalProvenanceVerified: false, executable: false, authenticatedCaptureProven: false };
}
