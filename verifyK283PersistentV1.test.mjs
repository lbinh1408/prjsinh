import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyPersistentOneTurn } from './verifyK283PersistentV1.mjs';
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fixture() {
    const attempt = { attemptId: 'ATTEMPT-1', score: 1 };
    const entries = [{ attemptId: 'ATTEMPT-1', expectedRevision: 0, state: 'COMMITTED', attemptSha256: digest(attempt) }];
    const saved = { checkpointRevision: 1, authorityRevision: 1, checkpoint: { attemptIds: ['ATTEMPT-1'] } };
    return { attemptStore: { listAttempts: () => [attempt] }, journal: { read: () => ({ entries }) }, durableCommit: { read: () => saved }, sessionId: 'LIVE-K283-test' };
}
test('consistent one turn', () => assert.equal(verifyPersistentOneTurn(fixture()).status, 'CONSISTENT_ONE_TURN'));
test('missing checkpoint fails closed', () => { const f = fixture(); f.durableCommit.read = () => null; assert.equal(verifyPersistentOneTurn(f).status, 'INCONSISTENT') });
test('uncommitted journal fails closed', () => { const f = fixture(); const original = f.journal.read().entries[0]; f.journal.read = () => ({ entries: [{ ...original, state: 'COMMIT_UNKNOWN' }] }); assert.equal(verifyPersistentOneTurn(f).status, 'INCONSISTENT') });
test('no resume/retry authorization', () => { const r = verifyPersistentOneTurn(fixture()); assert.equal(r.resumeAuthorized, false); assert.equal(r.retryAuthorized, false) });
