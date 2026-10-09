import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createCheckpointStore } from '../../../src/persistence/checkpointStore.js';
import { createAttemptStore } from '../../../src/persistence/attemptStore.js';
import { planHydration } from '../../../src/hydration/hydrationPlanner.js';
import { HYDRATION_ERROR_CODES as C } from '../../../src/hydration/hydrationContract.js';

const base = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures/hydration');
const cp = JSON.parse(readFileSync(resolve(base, 'k283-checkpoint.json'), 'utf8'));
const payloads = JSON.parse(readFileSync(resolve(base, 'k283-attempts.json'), 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const sid = cp.runtime.sessionId;
function setup() {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();
    for (const attempt of payloads) attemptStore.appendAttempt({ sessionId: sid, attempt: clone(attempt) });
    checkpointStore.saveCheckpoint({ sessionId: sid, checkpoint: clone(cp), expectedRevision: 0 });
    return { sessionId: sid, expectedContentRefs: clone(cp.contentRefs), checkpointStore, attemptStore };
}
function expectCode(fn, expected) {
    assert.throws(fn, e => e?.code === expected, `Expected ${expected}`);
}
function wrapAttempts(r, overrides) {
    const source = r.attemptStore;
    r.attemptStore = {
        listAttemptIds: args => source.listAttemptIds(args),
        getAttempt: args => source.getAttempt(args),
        ...overrides
    };
}

test('HYC-06 listed attempt without payload is rejected', () => {
    const r = setup();
    wrapAttempts(r, { getAttempt: () => null });
    expectCode(() => planHydration(r), C.ATTEMPT_PAYLOAD_MISMATCH);
});

test('HYC-07 attempt ID sequence changes between reads', () => {
    const r = setup();
    const original = r.attemptStore;
    let calls = 0;
    wrapAttempts(r, {
        listAttemptIds: args => {
            calls++;
            const ids = original.listAttemptIds(args);
            return calls === 1 ? ids : [...ids, 'LATE'];
        }
    });
    expectCode(() => planHydration(r), C.ATTEMPT_SEQUENCE_MISMATCH);
});

test('HYC-09 SHA digest mismatch is rejected', () => {
    const r = setup();
    r.expectedContentRefs.lesson.sha256 = 'f'.repeat(64);
    expectCode(() => planHydration(r), C.CONTENT_MISMATCH);
});

test('HYC-19 content reference ID mismatch is rejected', () => {
    const r = setup();
    r.expectedContentRefs.lesson.id = 'other-lesson';
    expectCode(() => planHydration(r), C.CONTENT_MISMATCH);
});

test('HYC-18 missing expected content key is rejected', () => {
    const r = setup();
    delete r.expectedContentRefs.lesson;
    expectCode(() => planHydration(r), C.CONTENT_MISMATCH);
});

test('HYC-10 unsupported student state version is rejected', () => {
    const r = setup();
    const source = r.checkpointStore;
    r.checkpointStore = {
        getRevision: args => source.getRevision(args),
        getCheckpoint: args => ({ ...source.getCheckpoint(args), state: { ...cp.state, schemaVersion: '99.0.0' } })
    };
    // Codec may reject the altered structure/version first; the contract alignment
    // explicitly maps codec-invalid checkpoints to INVALID_CHECKPOINT.
    assert.throws(() => planHydration(r), e =>
        [C.UNSUPPORTED_VERSION, C.INVALID_CHECKPOINT].includes(e?.code));
});

test('HYC-23 missing store method is INVALID_REQUEST', () => {
    const r = setup();
    r.attemptStore = { listAttemptIds: () => [] };
    expectCode(() => planHydration(r), C.INVALID_REQUEST);
});

test('HYC-27 malicious external error.code is never exposed', () => {
    const r = setup();
    const secret = 'STUDENT_PRIVATE_ANSWER_123';
    wrapAttempts(r, {
        getAttempt() {
            const err = new Error('external read failure');
            err.code = secret;
            throw err;
        }
    });
    assert.throws(() => planHydration(r), e => {
        assert.equal(e?.code, C.READ_FAILED);
        assert.equal(JSON.stringify({ message: e.message, details: e.details }).includes(secret), false);
        return true;
    });
});


test('HYC-11/14 failure does not call store writes', () => {
    const r = setup();
    let writes = 0;

    const originalCheckpointStore = r.checkpointStore;
    const originalAttemptStore = r.attemptStore;

    // Wrapper cho CheckpointStore: chỉ cho phép đọc.
    r.checkpointStore = {
        getRevision: (args) =>
            originalCheckpointStore.getRevision(args),

        getCheckpoint: (args) =>
            originalCheckpointStore.getCheckpoint(args),

        saveCheckpoint: () => {
            writes++;
            throw new Error('write attempted');
        }
    };

    // Wrapper cho AttemptStore: chỉ cho phép đọc.
    r.attemptStore = {
        listAttemptIds: (args) =>
            originalAttemptStore.listAttemptIds(args),

        getAttempt: (args) =>
            originalAttemptStore.getAttempt(args),

        appendAttempt: () => {
            writes++;
            throw new Error('write attempted');
        }
    };

    // Cố ý tạo content mismatch.
    r.expectedContentRefs.lesson.version = 'not-the-same';

    // Hydration phải từ chối mà không ghi dữ liệu.
    expectCode(
        () => planHydration(r),
        C.CONTENT_MISMATCH
    );

    // Không có bất kỳ thao tác ghi nào.
    assert.equal(writes, 0);
});


test('HYC-26 candidate explicitly retains non-guarantees', () => {
    const p = planHydration(setup());
    assert.equal(p.executable, false);
    assert.equal(p.verification.contentIntegrityVerified, false);
    assert.equal(p.verification.atomicSnapshotGuaranteed, false);
    assert.equal(p.verification.runtimeContinuityVerified, false);
});
