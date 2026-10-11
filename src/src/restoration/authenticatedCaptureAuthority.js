/** C3 Authenticated Capture Authority V1. HMAC attests a capture claim, not atomicity. */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { persistBoundCapture, readBoundCapture } from './atomicManifestBinding.js';
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function canonical(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (Array.isArray(v)) { if (Object.keys(v).length !== v.length || v.some((_, i) => !own(v, i))) fail('AUTH_NON_JSON'); return '[' + v.map(canonical).join(',') + ']'; }
    if (!v || typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype) fail('AUTH_NON_JSON');
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
const sha = v => createHash('sha256').update(canonical(v)).digest('hex');
const mac = (key, payload) => createHmac('sha256', key).update('c3-capture-auth-v1\0').update(canonical(payload)).digest('hex');
function checkKey(key) { if (!Buffer.isBuffer(key) || key.length < 32) fail('AUTH_INVALID_KEY'); }
function checkId(s) { if (typeof s !== 'string' || !s.trim() || s.length > 128) fail('AUTH_INVALID_KEY_ID'); }
function payloadFor(envelope) { const { captureAuth, ...unsigned } = envelope; return { schemaVersion: 'capture-authority-v1', sessionId: unsigned.binding?.sessionId, revision: unsigned.binding?.revision, envelopeSha256: sha(unsigned) }; }
export function captureConsistentSnapshot({ readSnapshot } = {}) {
    if (typeof readSnapshot !== 'function') fail('AUTH_INVALID_READER');
    const first = readSnapshot(), second = readSnapshot();
    if (sha(first) !== sha(second)) fail('AUTH_SNAPSHOT_CHANGED');
    return { snapshot: JSON.parse(canonical(second)), doubleReadConsistent: true, atomicityProven: false };
}
export function signCaptureEnvelope({ envelope, key, keyId } = {}) {
    checkKey(key); checkId(keyId);
    if (!envelope || envelope.executable !== false || envelope.captureAuth) fail('AUTH_INVALID_ENVELOPE');
    const payload = payloadFor(envelope);
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 1 || !payload.sessionId) fail('AUTH_INVALID_ENVELOPE');
    return { ...structuredClone(envelope), captureAuth: { schemaVersion: 'capture-authority-v1', algorithm: 'HMAC-SHA256', keyId, payload, tag: mac(key, payload) } };
}
export function verifyCaptureEnvelope({ envelope, resolveKey } = {}) {
    const auth = envelope?.captureAuth;
    if (!auth || auth.schemaVersion !== 'capture-authority-v1' || auth.algorithm !== 'HMAC-SHA256' || typeof auth.tag !== 'string' || !/^[a-f0-9]{64}$/.test(auth.tag)) fail('AUTH_MISSING_OR_INVALID');
    checkId(auth.keyId);
    if (typeof resolveKey !== 'function') fail('AUTH_KEY_RESOLVER_REQUIRED');
    const key = resolveKey(auth.keyId); checkKey(key);
    const expectedPayload = payloadFor(envelope);
    if (canonical(expectedPayload) !== canonical(auth.payload)) fail('AUTH_PAYLOAD_MISMATCH');
    const expected = Buffer.from(mac(key, expectedPayload), 'hex');
    if (!timingSafeEqual(expected, Buffer.from(auth.tag, 'hex'))) fail('AUTH_TAG_MISMATCH');
    return { authenticated: true, keyId: auth.keyId, sessionId: expectedPayload.sessionId, revision: expectedPayload.revision, atomicityProven: false, executable: false };
}
/** Sign only after caller has constructed a single immutable fixture; no claim of live atomicity. */
export function persistAuthenticatedBoundCapture({ rootDir, fixture, expectedRevision = 0, validateEnvelope, key, keyId } = {}) {
    if (!fixture?.envelope) fail('AUTH_INVALID_ENVELOPE');
    const signed = signCaptureEnvelope({ envelope: fixture.envelope, key, keyId });
    const result = persistBoundCapture({ rootDir, fixture: { ...fixture, envelope: signed }, expectedRevision, validateEnvelope });
    return { ...result, authenticatedCaptureClaim: true, atomicityProven: false, executable: false };
}
/** Never return a candidate before authentication succeeds. */
export function readAuthenticatedBoundCapture({ rootDir, sessionId, validateEnvelope, resolveKey } = {}) {
    const result = readBoundCapture({ rootDir, sessionId, validateEnvelope });
    if (result === null) return null;
    const verification = verifyCaptureEnvelope({ envelope: result.read.envelope, resolveKey });
    return { ...result, verification, externalProvenanceVerified: true, authenticatedCaptureProven: false, atomicityProven: false, executable: false };
}
