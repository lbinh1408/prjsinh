import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createConcurrentRecoverySnapshotV1 } from '../../../src/restoration/concurrentRecoverySnapshotV1.js';
import { createRecoveryReadinessAuditV1 } from '../../../src/restoration/recoveryReadinessAuditV1.js';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from '../../../src/restoration/durableSessionCommitV1.js';
const hash = s => createHash('sha256').update(s).digest('hex');
const worker = new URL('./realFilesystemCrashIntegrationV1.worker.mjs', import.meta.url);
function setup(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-v1-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }
function write(root, crash = '', n = 1) { const r = spawnSync(process.execPath, [worker.pathname, root, crash, String(n)], { encoding: 'utf8', timeout: 10000 }); assert.equal(r.error, undefined, r.error?.message); return r; }
function inspect(root, hook = null) { const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, 'attempts'), lockTimeoutMs: 60 }); const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore, lockTimeoutMs: 60 }); const durableCommit = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoints'), attemptStore, journal, lockTimeoutMs: 60 }); const audit = createRecoveryReadinessAuditV1({ attemptStore, journal, durableCommit }); return createConcurrentRecoverySnapshotV1({ rootDir: root, audit, hook }).inspect({ sessionId: 's1' }); }
function denied(r) { for (const k of ['resumeAuthorized', 'retryAuthorized', 'executable', 'recoveryAuthorized', 'crossStoreAtomicityProven', 'durableSessionCommitProven']) assert.equal(r[k], false, k); }
function changed(r) { assert.equal(r.status, 'UNSTABLE', JSON.stringify(r)); assert.equal(r.reason, 'FILES_CHANGED_DURING_AUDIT'); denied(r); }
test('01 stable completed real filesystem is observed, never authorized', t => { const root = setup(t); assert.equal(write(root).status, 0); const r = inspect(root); assert.equal(r.status, 'CONSISTENT'); assert.equal(r.stableAcrossTwoScans, true); denied(r); });
test('02 empty real filesystem remains incomplete', t => { const root = setup(t); const r = inspect(root); assert.equal(r.status, 'INCOMPLETE'); denied(r); });
test('03 write after first scan detected', t => { const root = setup(t); changed(inspect(root, stage => { if (stage === 'after-before') assert.equal(write(root).status, 0); })); });
test('04 write after audit read detected', t => { const root = setup(t); changed(inspect(root, stage => { if (stage === 'after-audit') assert.equal(write(root).status, 0); })); });
test('05 checkpoint modification after audit detected', t => { const root = setup(t); assert.equal(write(root).status, 0); changed(inspect(root, stage => { if (stage === 'after-audit') fs.appendFileSync(path.join(root, 'checkpoints', hash('s1') + '.json'), ' '); })); });
test('06 journal modification after audit detected', t => { const root = setup(t); assert.equal(write(root).status, 0); changed(inspect(root, stage => { if (stage === 'after-audit') fs.appendFileSync(path.join(root, 'journal', hash('s1') + '.json'), ' '); })); });
test('07 attempt modification after audit detected', t => { const root = setup(t); assert.equal(write(root).status, 0); changed(inspect(root, stage => { if (stage === 'after-audit') fs.appendFileSync(path.join(root, 'attempts', 'attempts.json'), ' '); })); });
test('08 attempt store lock is fail-closed', t => { const root = setup(t); assert.equal(write(root).status, 0); fs.mkdirSync(path.join(root, 'attempts', 'attempts.lock')); const r = inspect(root); assert.equal(r.status, 'UNSTABLE'); assert.equal(r.reason, 'LOCK_OBSERVED'); denied(r); });
test('09 journal lock is fail-closed', t => { const root = setup(t); assert.equal(write(root).status, 0); fs.mkdirSync(path.join(root, 'journal', hash('s1') + '.lock')); const r = inspect(root); assert.equal(r.status, 'UNSTABLE'); assert.equal(r.reason, 'LOCK_OBSERVED'); denied(r); });
test('10 checkpoint lock is fail-closed', t => { const root = setup(t); assert.equal(write(root).status, 0); fs.mkdirSync(path.join(root, 'checkpoints', hash('s1') + '.json.lock')); const r = inspect(root); assert.equal(r.status, 'UNSTABLE'); assert.equal(r.reason, 'LOCK_OBSERVED'); denied(r); });
test('11 transient lock between scans is fail-closed', t => { const root = setup(t); assert.equal(write(root).status, 0); const lock = path.join(root, 'attempts', 'attempts.lock'); const r = inspect(root, stage => { if (stage === 'after-before') fs.mkdirSync(lock); }); assert.equal(r.status, 'UNSTABLE'); denied(r); });
test('12 failed underlying audit is not promoted', t => { const root = setup(t); const r = createConcurrentRecoverySnapshotV1({ rootDir: root, audit: { inspect() { throw new Error('injected'); } } }).inspect({ sessionId: 's1' }); assert.equal(r.status, 'UNSTABLE'); assert.equal(r.reason, 'OBSERVATION_FAILED'); denied(r); });
