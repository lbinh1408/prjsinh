import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateK283Completion as check } from './k283SessionCompletionV1.js';
test('M2 completes M2 goal only after checkpoint', () => {
    assert.equal(check({ nodeState: { mastery: 'M2' }, targetMastery: 'M2', checkpointObserved: true }).complete, true);
    assert.equal(check({ nodeState: { mastery: 'M2' }, targetMastery: 'M2', checkpointObserved: false }).complete, false);
});
test('M1 does not complete M2 goal', () => assert.equal(check({ nodeState: { mastery: 'M1' }, checkpointObserved: true }).complete, false));
test('M2 does not complete M3 goal', () => assert.equal(check({ nodeState: { mastery: 'M2' }, targetMastery: 'M3', checkpointObserved: true }).complete, false));
test('M3 completes M2 goal', () => assert.equal(check({ nodeState: { mastery: 'M3' }, checkpointObserved: true }).complete, true));
test('invalid goal rejected', () => assert.throws(() => check({ targetMastery: 'M5' }), /INVALID_TARGET/));
test('missing mastery never completes', () => assert.equal(check({ checkpointObserved: true }).complete, false));
