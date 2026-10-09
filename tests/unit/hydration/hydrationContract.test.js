
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    HYDRATION_COMPATIBILITY,
    HYDRATION_ERROR_CODES,
    HydrationError,
    validateHydrationRequest,
    getHydrationContractInfo
} from '../../../src/hydration/hydrationContract.js';

const valid = () => ({
    sessionId: 'K283-session',
    expectedContentRefs: { knowledgeMap: { id: 'K283', version: '4', sha256: 'a'.repeat(64) } },
    checkpointStore: { getCheckpoint() { }, getRevision() { } },
    attemptStore: { listAttemptIds() { }, getAttempt() { } }
});
const rejects = request => assert.throws(() => validateHydrationRequest(request), error =>
    error instanceof HydrationError && error.code === HYDRATION_ERROR_CODES.INVALID_REQUEST);

test('HCT-01 valid request', () => assert.equal(validateHydrationRequest(valid()), true));
test('HCT-02 invalid request object', () => rejects(null));
test('HCT-03 empty session ID', () => rejects({ ...valid(), sessionId: ' ' }));
test('HCT-04 missing manifest', () => rejects({ ...valid(), expectedContentRefs: {} }));
test('HCT-05 malformed SHA-256', () => rejects({ ...valid(), expectedContentRefs: { x: { id: 'x', version: '1', sha256: 'bad' } } }));
test('HCT-06 missing checkpoint method', () => rejects({ ...valid(), checkpointStore: { getCheckpoint() { } } }));
test('HCT-07 missing attempt method', () => rejects({ ...valid(), attemptStore: { getAttempt() { } } }));
test('HCT-08 stable error shape', () => {
    const error = new HydrationError(HYDRATION_ERROR_CODES.READ_FAILED, 'Read failed.');
    assert.equal(error.name, 'HydrationError');
    assert.equal(error.code, 'HYDRATION_READ_FAILED');
    assert.deepEqual(error.details, {});
});
test('HCT-09 unsupported error code rejected', () => assert.throws(() => new HydrationError('UNKNOWN', 'x'), TypeError));
test('HCT-10 compatibility policy', () => {
    assert.deepEqual(HYDRATION_COMPATIBILITY.checkpointSchemaVersions, ['1.0.0-draft']);
    assert.deepEqual(HYDRATION_COMPATIBILITY.runtime.versions, ['0.2.0']);
    assert.deepEqual(HYDRATION_COMPATIBILITY.studentStateSchemaVersions, ['1.2.0']);
});
test('HCT-11 info returns detached policy arrays', () => {
    const info = getHydrationContractInfo();
    info.compatibility.runtime.versions.push('bad');
    assert.deepEqual(HYDRATION_COMPATIBILITY.runtime.versions, ['0.2.0']);
});
