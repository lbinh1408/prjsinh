import test from 'node:test';
import assert from 'node:assert/strict';
import {
    RESTORATION_ERROR_CODES as C, RestorationError, validateRestorationCandidate,
    validateRestorationRequest, getRestorationContractInfo
} from '../../../src/restoration/restorationContract.js';

const makeCandidate = () => ({
    status: 'ready-for-restoration', executable: false, sessionId: 's1', revision: 1,
    checkpoint: {
        schemaVersion: '1.0.0-draft', revision: 1,
        runtime: { sessionId: 's1', version: '0.2.0' }, state: { schemaVersion: '1.2.0' }
    },
    attempts: [], contentRefs: { lesson: { id: 'l', version: '1', sha256: '0'.repeat(64) } },
    runtimeVersion: '0.2.0',
    compatibility: {
        checkpointSchemaVersion: '1.0.0-draft', runtimeName: 'StudySession',
        runtimeVersion: '0.2.0', studentStateSchemaVersion: '1.2.0'
    },
    verification: {
        checkpointValidated: true, attemptSequenceValidated: true,
        attemptOwnershipValidated: true, contentReferencesMatched: true,
        contentIntegrityVerified: false, atomicSnapshotGuaranteed: false,
        runtimeContinuityVerified: false
    }
});
const rejects = (f, code) => assert.throws(f, e => e instanceof RestorationError && e.code === code);

test('C1-01 valid Hydration V1 candidate accepted structurally', () => assert.equal(validateRestorationCandidate(makeCandidate()), true));
test('C1-02 missing candidate rejected', () => rejects(() => validateRestorationRequest({}), C.INVALID_REQUEST));
test('C1-03 candidate must be non-executable', () => { const c = makeCandidate(); c.executable = true; rejects(() => validateRestorationCandidate(c), C.INVALID_CANDIDATE); });
test('C1-04 incomplete hydration verification rejected', () => { const c = makeCandidate(); c.verification.checkpointValidated = false; rejects(() => validateRestorationCandidate(c), C.INVALID_CANDIDATE); });
test('C1-05 cannot elevate integrity flags by assertion', () => { const c = makeCandidate(); c.verification.contentIntegrityVerified = true; rejects(() => validateRestorationCandidate(c), C.INVALID_CANDIDATE); });
test('C1-06 unsupported runtime rejected', () => { const c = makeCandidate(); c.compatibility.runtimeVersion = '9.0.0'; rejects(() => validateRestorationCandidate(c), C.UNSUPPORTED_RUNTIME); });
test('C1-07 session mismatch rejected', () => { const c = makeCandidate(); c.checkpoint.runtime.sessionId = 's2'; rejects(() => validateRestorationCandidate(c), C.INVALID_CANDIDATE); });
test('C1-08 revision mismatch rejected', () => { const c = makeCandidate(); c.checkpoint.revision = 2; rejects(() => validateRestorationCandidate(c), C.INVALID_CANDIDATE); });
test('C1-09 missing adapter rejected', () => rejects(() => validateRestorationRequest({ candidate: makeCandidate(), contentBundle: {} }), C.ADAPTER_UNAVAILABLE));
test('C1-10 missing content bundle rejected', () => rejects(() => validateRestorationRequest({ candidate: makeCandidate(), adapter: { restore() { } } }), C.INVALID_REQUEST));
test('C1-11 request preflight never invokes restore', () => { let n = 0; const req = { candidate: makeCandidate(), contentBundle: {}, adapter: { restore() { n++; } } }; assert.equal(validateRestorationRequest(req), true); assert.equal(n, 0); });
test('C1-12 errors have no caller data details', () => { const e = new RestorationError(C.RESTORE_FAILED, 'Restore failed.'); assert.deepEqual(e.details, {}); });
test('C1-13 contract metadata detached', () => { const a = getRestorationContractInfo(); a.errorCodes.INVALID_REQUEST = 'x'; assert.equal(getRestorationContractInfo().errorCodes.INVALID_REQUEST, C.INVALID_REQUEST); });
