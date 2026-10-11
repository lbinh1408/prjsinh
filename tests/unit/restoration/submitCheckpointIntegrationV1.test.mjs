import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmitCheckpointIntegrationV1 } from '../../../src/restoration/submitCheckpointIntegrationV1.js';

function fixture({ failAt = null, existing = false } = {}) {
    const sessionId = 'session-1';
    let revision = 0, count = 0, saved = null, entries = [];
    const authority = { inspect: () => ({ sessionId, revision, session: { runtime: { sessionId }, attempts: entries.map(e => ({ attemptId: e.attemptId })) } }) };
    const journal = { read: () => existing ? { entries: [] } : entries.length ? { entries: entries.map(e => ({ ...e })) } : null };
    const integration = {
        inspect: () => ({ phase: 'IDLE', completed: count, ownedRevision: revision }),
        submitOnce: ({ expectedRevision, attemptId }) => {
            if (failAt === 'upstream') throw Error('upstream');
            assert.equal(expectedRevision, revision);
            entries.push({ attemptId, state: 'COMMITTED' }); revision++; count++;
            return { status: 'COMMITTED', attemptId, revision, attemptStoreVerifiedBeforeSessionMutation: true };
        }
    };
    const durableCommit = {
        read: () => saved ? structuredClone(saved) : null,
        commit: ({ expectedAuthorityRevision, expectedCheckpointRevision }) => {
            if (failAt === 'commit') throw Error('disk');
            assert.equal(expectedAuthorityRevision, revision);
            assert.equal(expectedCheckpointRevision, saved?.checkpointRevision ?? 0);
            saved = {
                checkpointRevision: expectedCheckpointRevision + 1, authorityRevision: revision, sha256: `hash-${revision}`,
                durableCheckpointObserved: true, checkpoint: { attemptIds: entries.map(e => e.attemptId) }
            };
            return structuredClone(saved);
        },
        audit: () => {
            if (failAt === 'audit') throw Error('audit');
            return saved ? { status: 'CHECKPOINT_MATCHED', checkpointRevision: saved.checkpointRevision, authorityRevision: saved.authorityRevision } : { status: 'NO_CHECKPOINT' };
        }
    };
    const create = () => createSubmitCheckpointIntegrationV1({
        integration, authority, durableCommit, journal,
        contentRefs: { biology: { id: 'bio', version: '1', sha256: 'a'.repeat(64) } }, now: () => '2026-10-10T00:00:00.000Z'
    });
    return { create, authority, journal, integration, durableCommit };
}

test('1 fresh instance begins IDLE, zero checkpoints', () => { const x = fixture().create(); assert.equal(x.inspect().phase, 'IDLE'); assert.equal(x.inspect().checkpointRevision, 0) });
test('2 first submit commits checkpoint and remains non-executable', () => { const x = fixture().create(); const r = x.submitOnce({ expectedRevision: 0, attemptId: 'a1' }); assert.equal(r.checkpointRevision, 1); assert.equal(r.resumeAuthorized, false); assert.equal(r.executable, false) });
test('3 multiple sequential submits advance authority and checkpoint revisions', () => { const x = fixture().create(); for (let i = 0; i < 3; i++)assert.equal(x.submitOnce({ expectedRevision: i, attemptId: `a${i}` }).checkpointRevision, i + 1); assert.equal(x.inspect().completed, 3) });
test('4 stale revision rejected without invoking submit', () => { const x = fixture().create(); assert.throws(() => x.submitOnce({ expectedRevision: 1, attemptId: 'a' }), { code: 'SUBMIT_CHECKPOINT_REVISION_CONFLICT' }); assert.equal(x.inspect().phase, 'IDLE') });
test('5 upstream failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'upstream' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'b' }), { code: 'SUBMIT_CHECKPOINT_SUBMIT_BLOCKED' }) });
test('6 checkpoint failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'commit' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => x.submitOnce({ expectedRevision: 1, attemptId: 'b' }), { code: 'SUBMIT_CHECKPOINT_SUBMIT_BLOCKED' }) });
test('7 audit failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'audit' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN') });
test('8 existing journal blocks construction', () => assert.throws(() => fixture({ existing: true }).create(), { code: 'SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED' }));
test('9 existing checkpoint blocks new instance', () => { const f = fixture(); const x = f.create(); x.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.throws(() => f.create(), { code: 'SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED' }) });
test('10 read-only audit does not authorize resume', () => { const x = fixture().create(); x.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.equal(x.audit().resumeAuthorized, false); assert.equal(x.audit().status, 'CHECKPOINT_MATCHED') });
test('11 mismatched session ID audit rejected', () => { const x = fixture().create(); assert.throws(() => x.audit({ sessionId: 'other' }), { code: 'SUBMIT_CHECKPOINT_SESSION_CONFLICT' }) });
test('12 malformed dependency input rejected', () => assert.throws(() => createSubmitCheckpointIntegrationV1({}), { code: 'SUBMIT_CHECKPOINT_INVALID_OPTIONS' }));
