/** Phase 3.3-C Atomic Capture Protocol V1. Single-record CAS; no cross-store atomicity claim. */
import { createHash } from 'node:crypto';
import { captureRestorationSnapshotExtension, validateRestorationSnapshotExtension } from './restorationSnapshotExtension.js';
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const plain = o => o !== null && typeof o === 'object' && !Array.isArray(o) && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
const fail = c => { const e = new Error(c); e.code = c; throw e; };
function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) { if (Object.keys(x).length !== x.length || x.some((_, i) => !own(x, i))) fail('ATOMIC_NON_JSON'); return '[' + x.map(canonical).join(',') + ']'; }
    if (!plain(x)) fail('ATOMIC_NON_JSON'); const keys = Object.keys(x).sort(); return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}
const clone = x => JSON.parse(canonical(x));
const sha = x => createHash('sha256').update(canonical(x), 'utf8').digest('hex');
const revision = x => Number.isSafeInteger(x) && x >= 0;
function validateEnvelope(envelope) {
    if (!plain(envelope) || envelope.schemaVersion !== '1.0.0' || envelope.executable !== false || !plain(envelope.checkpoint) || !plain(envelope.extension) || !plain(envelope.binding)) fail('ATOMIC_INVALID_ENVELOPE');
    const cp = envelope.checkpoint;
    if (envelope.binding.sessionId !== cp.runtime?.sessionId || envelope.binding.revision !== cp.revision || envelope.binding.checkpointSha256 !== sha(cp)) fail('ATOMIC_BINDING_MISMATCH');
    validateRestorationSnapshotExtension({ checkpoint: cp, extension: envelope.extension });
    if (envelope.binding.extensionSha256 !== sha(envelope.extension)) fail('ATOMIC_BINDING_MISMATCH');
    if (!revision(cp.revision) || cp.revision < 1) fail('ATOMIC_INVALID_REVISION');
    return cp.runtime.sessionId;
}
/** Capture from the same immutable caller-provided live snapshot. Does NOT make a database transaction. */
export function prepareAtomicCapture({ checkpoint, liveSnapshot } = {}) {
    const cp = clone(checkpoint);
    const snapshot = clone(liveSnapshot);
    const extension = captureRestorationSnapshotExtension({ checkpoint: cp, liveSnapshot: snapshot });
    const envelope = { schemaVersion: '1.0.0', checkpoint: cp, extension, binding: { sessionId: cp.runtime.sessionId, revision: cp.revision, checkpointSha256: sha(cp), extensionSha256: sha(extension) }, executable: false };
    validateEnvelope(envelope);
    return clone(envelope);
}
/** A reference single-record, synchronous, in-memory CAS store. NOT durable, NOT multi-process safe. */
export function createInMemoryAtomicCaptureStore() {
    const entries = new Map();
    return Object.freeze({
        commit({ envelope, expectedRevision }) {
            const id = validateEnvelope(envelope);
            if (!revision(expectedRevision)) fail('ATOMIC_INVALID_EXPECTED_REVISION');
            const current = entries.get(id);
            const actual = current?.revision ?? 0;
            const serialized = canonical(envelope);
            if (actual === envelope.checkpoint.revision && current?.serialized === serialized) return { status: 'idempotent', sessionId: id, revision: actual };
            if (actual !== expectedRevision || envelope.checkpoint.revision !== expectedRevision + 1) fail('ATOMIC_REVISION_CONFLICT');
            entries.set(id, { revision: envelope.checkpoint.revision, serialized });
            return { status: 'committed', sessionId: id, revision: envelope.checkpoint.revision };
        },
        read({ sessionId }) {
            if (typeof sessionId !== 'string' || !sessionId.trim()) fail('ATOMIC_INVALID_SESSION');
            const current = entries.get(sessionId);
            if (!current) return null;
            const envelope = JSON.parse(current.serialized);
            validateEnvelope(envelope);
            if (current.revision !== envelope.checkpoint.revision) fail('ATOMIC_REVISION_CONFLICT');
            return { status: 'atomic-record-read', envelope, revision: current.revision, storageDurabilityVerified: false, externalProvenanceVerified: false, executable: false };
        }
    });
}
/** Adapter must guarantee ONE atomic record write and CAS; protocol cannot attest implementation. */
export function commitAtomicCapture({ store, envelope, expectedRevision } = {}) {
    if (!store || typeof store.commit !== 'function') fail('ATOMIC_STORE_UNAVAILABLE');
    validateEnvelope(envelope);
    const result = store.commit({ envelope: clone(envelope), expectedRevision });
    if (!plain(result) || !['committed', 'idempotent'].includes(result.status) || result.sessionId !== envelope.binding.sessionId || result.revision !== envelope.binding.revision) fail('ATOMIC_UNVERIFIED_COMMIT');
    return { status: result.status, sessionId: result.sessionId, revision: result.revision, externalAtomicityVerified: false, storageDurabilityVerified: false, executable: false };
}
export function readAtomicCapture({ store, sessionId } = {}) {
    if (!store || typeof store.read !== 'function') fail('ATOMIC_STORE_UNAVAILABLE');
    const result = store.read({ sessionId });
    if (result === null) return null;
    if (!plain(result) || !plain(result.envelope) || result.envelope.binding?.sessionId !== sessionId) fail('ATOMIC_INVALID_READ');
    validateEnvelope(result.envelope);
    return { status: 'validated-record', envelope: clone(result.envelope), revision: result.envelope.checkpoint.revision, externalAtomicityVerified: false, storageDurabilityVerified: false, executable: false };
}
