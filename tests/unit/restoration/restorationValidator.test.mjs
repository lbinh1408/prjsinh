import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateRestorationReadiness } from '../../../src/restoration/restorationValidator.js';
import { RESTORATION_ERROR_CODES as C, RestorationError } from '../../../src/restoration/restorationContract.js';
const artifact = (id = 'lesson-1', version = '1.0.0', text = 'lesson payload') => ({ id, version, bytes: Buffer.from(text) });
const digest = b => createHash('sha256').update(b).digest('hex');
function setup() {
    const a = artifact();
    const ref = { id: a.id, version: a.version, sha256: digest(a.bytes) };
    const candidate = {
        status: 'ready-for-restoration', executable: false, sessionId: 's1', revision: 1,
        checkpoint: { schemaVersion: '1.0.0-draft', revision: 1, runtime: { name: 'StudySession', version: '0.2.0', sessionId: 's1', status: 'active' }, state: { schemaVersion: '1.2.0' }, config: { lessonId: a.id }, contentRefs: { lesson: { ...ref } } },
        attempts: [], contentRefs: { lesson: { ...ref } }, runtimeVersion: '0.2.0',
        compatibility: { checkpointSchemaVersion: '1.0.0-draft', runtimeName: 'StudySession', runtimeVersion: '0.2.0', studentStateSchemaVersion: '1.2.0' },
        verification: { checkpointValidated: true, attemptSequenceValidated: true, attemptOwnershipValidated: true, contentReferencesMatched: true, contentIntegrityVerified: false, atomicSnapshotGuaranteed: false, runtimeContinuityVerified: false }
    };
    return { candidate, contentBundle: { lesson: a }, adapter: { restore() { throw Error('should not be called') } } };
}
const reject = (r, code) => assert.throws(() => validateRestorationReadiness(r), e => e instanceof RestorationError && e.code === code && Object.keys(e.details).length === 0);
test('C2-01 valid actual bytes are SHA-256 verified, still non-executable', () => { const x = validateRestorationReadiness(setup()); assert.equal(x.contentBytesVerified, true); assert.equal(x.executable, false); assert.equal(x.runtimeContinuityVerified, false); assert.equal(x.adapterCapabilityVerified, false); });
test('C2-02 missing artifact', () => { const r = setup(); r.contentBundle = {}; reject(r, C.CONTENT_UNVERIFIED); });
test('C2-03 extra artifact', () => { const r = setup(); r.contentBundle.extra = artifact(); reject(r, C.CONTENT_UNVERIFIED); });
test('C2-04 ID mismatch', () => { const r = setup(); r.contentBundle.lesson.id = 'wrong'; reject(r, C.CONTENT_UNVERIFIED); });
test('C2-05 version mismatch', () => { const r = setup(); r.contentBundle.lesson.version = 'wrong'; reject(r, C.CONTENT_UNVERIFIED); });
test('C2-06 byte tampering', () => { const r = setup(); r.contentBundle.lesson.bytes = Buffer.from('tampered'); reject(r, C.CONTENT_UNVERIFIED); });
test('C2-07 hash placeholder rejected', () => { const r = setup(); r.candidate.contentRefs.lesson.sha256 = '0'.repeat(64); r.candidate.checkpoint.contentRefs.lesson.sha256 = '0'.repeat(64); reject(r, C.CONTENT_UNVERIFIED); });
test('C2-08 caller-provided hash alone not accepted', () => { const r = setup(); r.contentBundle.lesson = { id: 'lesson-1', version: '1.0.0', sha256: r.candidate.contentRefs.lesson.sha256 }; reject(r, C.CONTENT_UNVERIFIED); });
test('C2-09 checkpoint content mismatch', () => { const r = setup(); r.candidate.checkpoint.contentRefs.lesson.version = 'bad'; reject(r, C.INVALID_CANDIDATE); });
test('C2-10 non-active runtime rejected', () => { const r = setup(); r.candidate.checkpoint.runtime.status = 'completed'; reject(r, C.INVALID_CANDIDATE); });
test('C2-11 missing config rejected', () => { const r = setup(); delete r.candidate.checkpoint.config; reject(r, C.INVALID_CANDIDATE); });
test('C2-12 never invokes adapter', () => { const r = setup(); let n = 0; r.adapter.restore = () => { n++; }; validateRestorationReadiness(r); assert.equal(n, 0); });
test('C2-13 no mutations to request', () => { const r = setup(); const before = JSON.stringify(r.candidate); const bytesBefore = Buffer.from(r.contentBundle.lesson.bytes); validateRestorationReadiness(r); assert.equal(JSON.stringify(r.candidate), before); assert.deepEqual(r.contentBundle.lesson.bytes, bytesBefore); });
test('C2-14 metadata SHA case insensitive', () => { const r = setup(); r.candidate.contentRefs.lesson.sha256 = r.candidate.contentRefs.lesson.sha256.toUpperCase(); assert.equal(validateRestorationReadiness(r).contentBytesVerified, true); });
test('C2-15 invalid hydration verification rejected', () => { const r = setup(); r.candidate.verification.checkpointValidated = false; reject(r, C.INVALID_CANDIDATE); });
test('C2-16 adapter required but not executed', () => { const r = setup(); r.adapter = {}; reject(r, C.ADAPTER_UNAVAILABLE); });
