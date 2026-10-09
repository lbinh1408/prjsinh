import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCheckpointStore } from '../../../src/persistence/checkpointStore.js';
import { createAttemptStore } from '../../../src/persistence/attemptStore.js';
import { planHydration } from '../../../src/hydration/hydrationPlanner.js';
import { HYDRATION_ERROR_CODES as C } from '../../../src/hydration/hydrationContract.js';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures/hydration');
const cp = JSON.parse(readFileSync(resolve(fixtureDir, 'k283-checkpoint.json'), 'utf8'));
const attempts = JSON.parse(readFileSync(resolve(fixtureDir, 'k283-attempts.json'), 'utf8'));
const clone = x => JSON.parse(JSON.stringify(x));
const sid = cp.runtime.sessionId;
function setup() {
    const checkpointStore = createCheckpointStore();
    const attemptStore = createAttemptStore();
    for (const attempt of attempts) attemptStore.appendAttempt({ sessionId: sid, attempt: clone(attempt) });
    checkpointStore.saveCheckpoint({ sessionId: sid, checkpoint: clone(cp), expectedRevision: 0 });
    return { sessionId: sid, expectedContentRefs: clone(cp.contentRefs), checkpointStore, attemptStore };
}
function replaceCheckpoint(r, mutate) {
    const source = r.checkpointStore;
    r.checkpointStore = {
        getRevision: args => source.getRevision(args),
        getCheckpoint: args => { const value = source.getCheckpoint(args); mutate(value); return value; }
    };
}
function rejected(r, expected) {
    let candidate;
    assert.throws(() => { candidate = planHydration(r); }, e => {
        assert.equal(e?.code, expected);
        return true;
    });
    assert.equal(candidate, undefined, 'no partial candidate returned');
}

test('HYC-04 codec-invalid checkpoint -> INVALID_CHECKPOINT; no partial plan', () => {
    const r = setup();
    replaceCheckpoint(r, value => { delete value.lessonRuntime.progress; });
    rejected(r, C.INVALID_CHECKPOINT);
});


test('HYC-10 unsupported checkpoint schema -> UNSUPPORTED_VERSION', () => {
    const r = setup();

    replaceCheckpoint(r, value => {
        value.schemaVersion = '99.0.0';
    });

    rejected(r, C.UNSUPPORTED_VERSION);
});


test('HYC-07 reordered IDs with equal membership -> ATTEMPT_SEQUENCE_MISMATCH', () => {
    const r = setup();
    const first = cp.attemptIds[0];
    const second = 'ATT-K283-SECOND';
    replaceCheckpoint(r, value => { value.attemptIds = [first, second]; });
    const source = r.attemptStore;
    r.attemptStore = {
        listAttemptIds: () => [second, first],
        getAttempt: args => args.attemptId === second
            ? { ...clone(attempts[0]), attemptId: second }
            : source.getAttempt(args)
    };
    rejected(r, C.ATTEMPT_SEQUENCE_MISMATCH);
});

test('HYC-24 incomplete lesson progress -> INVALID_CHECKPOINT (codec gate)', () => {
    const r = setup();
    replaceCheckpoint(r, value => { delete value.lessonRuntime.progress.completedSectionIds; });
    rejected(r, C.INVALID_CHECKPOINT);
});

test('HYC-27 rejection returns no candidate and does not leak adapter message/code', () => {
    const r = setup();
    const secret = 'PRIVATE_STUDENT_ANSWER_789';
    r.attemptStore = {
        listAttemptIds: args => attempts.map(a => a.attemptId),
        getAttempt: () => { const e = new Error(secret); e.code = secret; throw e; }
    };
    let candidate;
    assert.throws(() => { candidate = planHydration(r); }, e => {
        assert.equal(e?.code, C.READ_FAILED);
        assert.equal(JSON.stringify({ message: e.message, details: e.details }).includes(secret), false);
        return true;
    });
    assert.equal(candidate, undefined);
});
