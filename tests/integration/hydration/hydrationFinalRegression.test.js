import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createCheckpointStore } from '../../../src/persistence/checkpointStore.js';
import { createAttemptStore } from '../../../src/persistence/attemptStore.js';
import { planHydration } from '../../../src/hydration/hydrationPlanner.js';
import { HYDRATION_ERROR_CODES as C } from '../../../src/hydration/hydrationContract.js';

// Copy the two uploaded fixtures into tests/fixtures/hydration/.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures/hydration');
const cp = JSON.parse(readFileSync(resolve(root, 'k283-checkpoint.json'), 'utf8'));
const attempts = JSON.parse(readFileSync(resolve(root, 'k283-attempts.json'), 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));
const sid = cp.runtime.sessionId;

function setup({ checkpoint = cp, payloads = attempts, expectedRefs = cp.contentRefs } = {}) {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();
    for (const attempt of payloads) attemptStore.appendAttempt({ sessionId: sid, attempt: clone(attempt) });
    checkpointStore.saveCheckpoint({ sessionId: sid, checkpoint: clone(checkpoint), expectedRevision: 0 });
    return { sessionId: sid, expectedContentRefs: clone(expectedRefs), checkpointStore, attemptStore };
}
function code(fn, expected) {
    assert.throws(fn, e => e?.code === expected, `Expected ${expected}`);
}

test('HYC-01 K283 persisted fixture returns non-executable detached plan', () => {
    const r = setup();
    const p = planHydration(r);
    assert.equal(p.status, 'ready-for-restoration');
    assert.equal(p.executable, false);
    assert.deepEqual(p.attempts.map(x => x.attemptId), cp.attemptIds);
    p.attempts[0].result = 'wrong';
    assert.equal(r.attemptStore.getAttempt({ sessionId: sid, attemptId: cp.attemptIds[0] }).result, 'correct');
});

test('HYC-03 session mismatch', () => {
    const r = setup();
    r.sessionId = 'ANOTHER-SESSION';
    // Different lookup key means no checkpoint, not an identity mismatch.
    code(() => planHydration(r), C.CHECKPOINT_NOT_FOUND);
});

test('HYC-17 payload session mismatch via read adapter', () => {
    const r = setup();
    const original = r.attemptStore;
    r.attemptStore = {
        listAttemptIds: args => original.listAttemptIds(args),
        getAttempt: args => ({ ...original.getAttempt(args), sessionId: 'OTHER' })
    };
    code(() => planHydration(r), C.ATTEMPT_PAYLOAD_MISMATCH);
});

test('HYC-18 extra expected manifest key', () => {
    const r = setup();
    r.expectedContentRefs.extra = { id: 'extra', version: '1', sha256: 'f'.repeat(64) };
    code(() => planHydration(r), C.CONTENT_MISMATCH);
});

test('HYC-19 SHA hex case equivalence', () => {
    const modified = clone(cp);
    modified.contentRefs.lesson.sha256 = 'aBcD'.repeat(16);
    const r = setup({ checkpoint: modified, expectedRefs: clone(modified.contentRefs) });
    r.expectedContentRefs.lesson.sha256 = modified.contentRefs.lesson.sha256.toUpperCase();
    assert.equal(planHydration(r).status, 'ready-for-restoration');
});

test('HYC-20 unsupported runtime name', () => {
    const modified = clone(cp);
    modified.runtime.name = 'OtherRuntime';
    const r = setup({ checkpoint: modified });
    code(() => planHydration(r), C.UNSUPPORTED_VERSION);
});

test('HYC-24 incomplete mastery runtime', () => {
    const modified = clone(cp);
    modified.masteryRuntime.evidenceHistoryByNode = [];
    // Real CheckpointStore rejects codec-invalid checkpoint at save time.
    assert.throws(() => setup({ checkpoint: modified }));
});

test('HYC-27 read errors do not expose attempt answer', () => {
    const r = setup();
    r.attemptStore = {
        listAttemptIds: args => [cp.attemptIds[0]],
        getAttempt: () => { throw new Error('SECRET_STUDENT_ANSWER'); }
    };
    assert.throws(() => planHydration(r), e => {
        assert.equal(e.code, C.READ_FAILED);
        assert.equal(JSON.stringify({ message: e.message, details: e.details }).includes('SECRET_STUDENT_ANSWER'), false);
        return true;
    });
});

test('Payload-race demonstration: current two-pass reader cannot detect changed attempt body', () => {
    const r = setup();
    const original = r.attemptStore;
    r.attemptStore = {
        listAttemptIds: args => original.listAttemptIds(args),
        getAttempt: args => ({ ...original.getAttempt(args), result: 'wrong' })
    };
    const p = planHydration(r);
    assert.equal(p.attempts[0].result, 'wrong');
    assert.equal(p.verification.atomicSnapshotGuaranteed, false);
});
