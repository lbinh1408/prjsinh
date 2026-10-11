import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from '../../../src/restoration/durableSessionCommitV1.js';
import { createAtomicCaptureCoordinationV1 } from '../../../src/restoration/atomicCaptureCoordinationV1.js';
import { createMutatingCallSiteAuditV1, MUTATING_CALL_SITE_INVENTORY_V1 } from '../../../src/restoration/mutatingCallSiteAuditV1.js';
import { createProductionWriterCoordinationV1 } from '../../../src/restoration/productionWriterCoordinationV1.js';
const deny = ['resumeAuthorized', 'retryAuthorized', 'executable', 'recoveryAuthorized', 'crossStoreAtomicityProven'];
function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'three-real-stores-'));
    const store = createDurableAttemptStore({ rootDir: path.join(root, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore: store });
    const durableCommit = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoint'), attemptStore: store, journal });
    const coordination = createAtomicCaptureCoordinationV1({ rootDir: root, publisher: { publish: () => ({ status: 'PUBLISHED' }) }, capture: () => ({ status: 'INCOMPLETE' }) });
    const adapter = createProductionWriterCoordinationV1({ coordination, attemptStore: store, journal, durableCommit });
    const facade = createMutatingCallSiteAuditV1({ coordination, journal, durableCommit, writerAdapter: adapter });
    const sessionId = 's1', attempt = { attemptId: 'a1', answer: 'A' };
    const session = { runtime: { name: 'StudySession', version: '1', sessionId, startedAt: '2026-10-11T00:00:00Z', lastActivityAt: '2026-10-11T00:00:00Z', status: 'ACTIVE' }, config: {}, state: {}, currentDecision: {}, currentSelection: null, currentQuestion: null, lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } }, activeRemediationPlan: null, attempts: [attempt], history: [], masteryRuntime: { evidenceHistoryByNode: {} } };
    const authority = { inspect: () => ({ sessionId, revision: 1, session }) };
    const contentRefs = { biology: { id: 'bio', version: '1', sha256: 'a'.repeat(64) } };
    const commitArgs = { sessionId, authority, expectedAuthorityRevision: 1, expectedCheckpointRevision: 0, contentRefs, savedAt: '2026-10-11T00:00:00Z' };
    const prepare = () => adapter.prepare({ sessionId, attempt, expectedRevision: 0 });
    const append = () => adapter.appendAttempt({ sessionId, attempt });
    const mark = () => adapter.markUnknown({ sessionId, attemptId: attempt.attemptId });
    const reconcile = () => journal.reconcile({ sessionId, attemptId: attempt.attemptId }); // Legacy reconciliation writes; intentionally called outside adapter; NOT part of coordinated boundary.
    return { root, store, journal, durableCommit, coordination, adapter, facade, sessionId, attempt, authority, commitArgs, prepare, append, mark, reconcile, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
const run = (name, fn) => test(name, () => { const f = fixture(); try { fn(f) } finally { f.cleanup() } });

run('1 inventory includes all six mutating or may-mutate entrypoints', f => { assert.equal(MUTATING_CALL_SITE_INVENTORY_V1.length, 6); assert.equal(f.facade.inventory.length, 6) });
run('2 coordinated reconcile transitions real journal to COMMITTED', f => { f.prepare(); f.append(); const r = f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); assert.equal(r.operation, 'reconcile'); assert.equal(r.value.status, 'COMMITTED'); assert.equal(f.journal.read('s1').entries[0].state, 'COMMITTED') });
run('3 coordinated reconcile fails closed if writer lock is held', f => { f.prepare(); f.append(); f.coordination.withWriter({ sessionId: 's1', write: () => assert.throws(() => f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }), { code: 'CAPTURE_LOCK_BUSY' }) }); assert.equal(f.journal.read('s1').entries[0].state, 'PREPARED') });
run('4 reconcile rejects invalid session before mutation', f => { assert.throws(() => f.facade.reconcile({ sessionId: '../escape', attemptId: 'a1' }), { code: 'CALLSITE_INVALID_SESSION' }); assert.equal(f.journal.read('s1'), null) });
run('5 reconciled journal permits real checkpoint commit through facade', f => { f.facade.prepare({ sessionId: 's1', attempt: f.attempt, expectedRevision: 0 }); f.facade.appendAttempt({ sessionId: 's1', attempt: f.attempt }); f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); const r = f.facade.commit(f.commitArgs); assert.equal(r.operation, 'commit'); assert.equal(f.durableCommit.read({ sessionId: 's1' }).checkpointRevision, 1) });
run('6 audit uses coordinated boundary with real persisted checkpoint', f => { f.prepare(); f.append(); f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); f.adapter.commit(f.commitArgs); const r = f.facade.audit({ sessionId: 's1' }); assert.equal(r.operation, 'audit'); assert.equal(r.value.status, 'CHECKPOINT_MATCHED'); for (const k of deny) assert.equal(r[k], false) });
run('7 audit lock contention does not touch persisted checkpoint', f => { f.prepare(); f.append(); f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); f.adapter.commit(f.commitArgs); f.coordination.withWriter({ sessionId: 's1', write: () => assert.throws(() => f.facade.audit({ sessionId: 's1' }), { code: 'CAPTURE_LOCK_BUSY' }) }); assert.equal(f.durableCommit.read({ sessionId: 's1' }).checkpointRevision, 1) });
run('8 missing checkpoint audit stays non-authorizing', f => { const r = f.facade.audit({ sessionId: 's1' }); assert.equal(r.value.status, 'NO_CHECKPOINT'); for (const k of deny) assert.equal(r[k], false) });
run('9 missing attempt reconcile does not claim COMMITTED', f => { f.prepare(); const r = f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); assert.notEqual(r.value.status, 'COMMITTED'); assert.equal(f.journal.read('s1').entries[0].state, 'PREPARED') });
run('10 epoch advances across prepare append reconcile and commit', f => { const a = f.prepare(), b = f.append(), c = f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }), d = f.facade.commit(f.commitArgs); assert.equal(b.epoch, a.epoch + 1); assert.equal(c.epoch, b.epoch + 1); assert.equal(d.epoch, c.epoch + 1) });
run('11 stale publisher rejected after reconciler advances fence', f => { f.prepare(); f.append(); const token = f.coordination.issuePublisherToken({ sessionId: 's1' }); f.facade.reconcile({ sessionId: 's1', attemptId: 'a1' }); assert.throws(() => f.coordination.publishCaptured({ sessionId: 's1', token }), { code: 'STALE_PUBLISHER' }) });
run('12 facade never asserts mandatory enforcement of raw stores', f => { assert.equal(f.facade.enforcement, 'OPT_IN_ONLY'); assert.equal(f.facade.policy.recoveryAuthorized, false); assert.equal(f.facade.inventory.find(x => x.target === 'durableCommit.audit').classification, 'MAY_MUTATE') });
