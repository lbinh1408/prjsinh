import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
function fixture(opts = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'journal-v3-'));
    const data = new Map();
    const attemptStore = { getAttempt: ({ sessionId, attemptId }) => data.get(sessionId + '|' + attemptId) ?? null };
    const journal = createDurableSubmitJournalV3({ rootDir: root, attemptStore, ...opts });
    return { root, data, journal, attemptStore, put: (attempt, sessionId = 's') => data.set(sessionId + '|' + attempt.attemptId, attempt), a: id => ({ attemptId: id, sessionId: 's', score: 1 }) };
}
test('1 prepare and read durable intent', () => { const f = fixture(); f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 0 }); assert.equal(f.journal.read('s').entries.length, 1) });
test('2 cannot proceed with pending', () => { const f = fixture(); f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 0 }); assert.throws(() => f.journal.prepare({ sessionId: 's', attempt: f.a('b'), expectedRevision: 1 }), { code: 'SUBMIT_V3_SEQUENCE_BLOCKED' }) });
test('3 multiple attempts after verified commit', () => { const f = fixture(); for (let i = 0; i < 3; i++) { const a = f.a('a' + i); f.journal.prepare({ sessionId: 's', attempt: a, expectedRevision: i }); f.journal.markUnknown({ sessionId: 's', attemptId: a.attemptId }); f.put(a); assert.equal(f.journal.reconcile({ sessionId: 's' }).status, 'COMMITTED') } assert.equal(f.journal.list({ sessionId: 's' }).length, 3) });
test('4 same revision forbidden', () => { const f = fixture(), a = f.a('a'); f.journal.prepare({ sessionId: 's', attempt: a, expectedRevision: 3 }); f.put(a); f.journal.reconcile({ sessionId: 's' }); assert.throws(() => f.journal.prepare({ sessionId: 's', attempt: f.a('b'), expectedRevision: 3 }), { code: 'SUBMIT_V3_SEQUENCE_BLOCKED' }) });
test('5 duplicate attemptId forbidden', () => { const f = fixture(), a = f.a('a'); f.journal.prepare({ sessionId: 's', attempt: a, expectedRevision: 1 }); f.put(a); f.journal.reconcile({ sessionId: 's' }); assert.throws(() => f.journal.prepare({ sessionId: 's', attempt: a, expectedRevision: 2 }), { code: 'SUBMIT_V3_DUPLICATE_ATTEMPT' }) });
test('6 restart reconcile committed attempt', () => { const f = fixture(), a = f.a('a'); f.journal.prepare({ sessionId: 's', attempt: a, expectedRevision: 1 }); f.journal.markUnknown({ sessionId: 's', attemptId: 'a' }); f.put(a); const j = createDurableSubmitJournalV3({ rootDir: f.root, attemptStore: f.attemptStore }); assert.equal(j.reconcile({ sessionId: 's' }).verification, 'ATTEMPT_MATCHED') });
test('7 absent attempt never authorizes retry', () => { const f = fixture(); f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 1 }); const x = f.journal.reconcile({ sessionId: 's' }); assert.equal(x.safeToRetry, false); assert.equal(x.verification, 'ATTEMPT_NOT_FOUND') });
test('8 mismatch fails closed', () => { const f = fixture(); f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 1 }); f.put({ ...f.a('a'), score: 0 }); assert.throws(() => f.journal.reconcile({ sessionId: 's' }), { code: 'SUBMIT_V3_ATTEMPT_MISMATCH' }) });
test('9 corrupt record rejected', () => { const f = fixture(); f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 1 }); const p = path.join(f.root, fs.readdirSync(f.root).find(n => n.endsWith('.json'))); fs.writeFileSync(p, '{}'); assert.throws(() => f.journal.read('s'), { code: 'SUBMIT_V3_CORRUPT' }) });
test('10 no journal is not permission', () => { const f = fixture(); const x = f.journal.reconcile({ sessionId: 's' }); assert.equal(x.status, 'NO_JOURNAL'); assert.equal(x.executable, false) });
test('11 after rename ambiguity is readable', () => { const f = fixture({ failpoint: 'afterRename' }); assert.throws(() => f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 1 }), { code: 'SUBMIT_V3_INJECTED_FAILURE' }); assert.equal(f.journal.read('s').entries[0].state, 'PREPARED') });
test('12 concurrent second process blocked by lock', () => { const f = fixture({ lockTimeoutMs: 0 }); const dir = path.join(f.root, sha('s') + '.lock'); fs.mkdirSync(dir); assert.throws(() => f.journal.prepare({ sessionId: 's', attempt: f.a('a'), expectedRevision: 1 }), { code: 'SUBMIT_V3_LOCK_TIMEOUT' }) });
import { createHash } from 'node:crypto';
const sha = s => createHash('sha256').update(s).digest('hex');
