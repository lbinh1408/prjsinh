import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRecoveryReadinessAuditV1 } from '../../../src/restoration/recoveryReadinessAuditV1.js';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from '../../../src/restoration/durableSessionCommitV1.js';
const worker = new URL('./realFilesystemCrashIntegrationV1.worker.mjs', import.meta.url);
const hash = x => createHash('sha256').update(x).digest('hex');
function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-fs-v1-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }
function run(root, crash = '', n = 1) { const r = spawnSync(process.execPath, [worker.pathname, root, crash, String(n)], { encoding: 'utf8', timeout: 10000 }); assert.equal(r.error, undefined, r.error?.message); return r; }
function observer(root) { const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, 'attempts'), lockTimeoutMs: 60 }); const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore, lockTimeoutMs: 60 }); const durableCommit = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoints'), attemptStore, journal, lockTimeoutMs: 60 }); return { attemptStore, journal, durableCommit, audit: createRecoveryReadinessAuditV1({ attemptStore, journal, durableCommit }) }; }
const observe = root => observer(root).audit.inspect({ sessionId: 's1' });
const flags = x => { for (const k of ['resumeAuthorized', 'retryAuthorized', 'executable', 'recoveryAuthorized', 'crossStoreAtomicityProven', 'durableSessionCommitProven']) assert.equal(x[k], false, k); };
const checkpointPath = root => path.join(root, 'checkpoints', hash('s1') + '.json');
const journalPath = root => path.join(root, 'journal', hash('s1') + '.json');
const attemptPath = root => path.join(root, 'attempts', 'attempts.json');
function editJson(file, fn) { const o = JSON.parse(fs.readFileSync(file, 'utf8')); fn(o); fs.writeFileSync(file, JSON.stringify(o)); }
function canonical(v) { if (v === null || typeof v !== 'object') return JSON.stringify(v); if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'; return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'; }
function rewriteAttempt(root, fn) { editJson(attemptPath(root), o => { const data = JSON.parse(o.payload); fn(data); o.payload = canonical(data); o.sha256 = hash(o.payload); }); }
function rewriteJournal(root, fn) { editJson(journalPath(root), o => { fn(o); const { digest: _, ...body } = o; o.digest = hash(canonical(body)); }); }
function rewriteCheckpoint(root, fn) { editJson(checkpointPath(root), o => { const checkpoint = JSON.parse(o.checkpointPayload); fn(checkpoint, o); o.checkpointPayload = canonical(checkpoint); o.sha256 = hash(o.checkpointPayload); }); }
function check(root, status, reason) { const r = observe(root); assert.equal(r.status, status, JSON.stringify(r)); if (reason) assert.equal(r.reason, reason); flags(r); return r; }
test('01 no durable records -> INCOMPLETE', t => { const root = fixture(t); check(root, 'INCOMPLETE', 'NO_DURABLE_SESSION'); });
test('02 one successful real submit -> CONSISTENT', t => { const root = fixture(t); assert.equal(run(root).status, 0); const r = check(root, 'CONSISTENT'); assert.equal(r.attemptCount, 1); });
test('03 two successful real submits -> CONSISTENT', t => { const root = fixture(t); assert.equal(run(root, '', 2).status, 0); const r = check(root, 'CONSISTENT'); assert.equal(r.attemptCount, 2); });
test('04 crash before attempt -> INCOMPLETE', t => { const root = fixture(t); assert.equal(run(root, 'before-attempt').status, 71); check(root, 'INCOMPLETE'); });
test('05 crash after attempt -> INCOMPLETE', t => { const root = fixture(t); assert.equal(run(root, 'after-attempt').status, 72); check(root, 'INCOMPLETE'); });
test('06 crash after authority mutation -> INCOMPLETE', t => { const root = fixture(t); assert.equal(run(root, 'after-authority').status, 73); check(root, 'INCOMPLETE', 'CHECKPOINT_MISSING'); });
test('07 crash before checkpoint -> INCOMPLETE', t => { const root = fixture(t); assert.equal(run(root, 'before-checkpoint').status, 74); check(root, 'INCOMPLETE', 'CHECKPOINT_MISSING'); });
test('08 failpoint after checkpoint rename -> checkpoint observed', t => { const root = fixture(t); assert.notEqual(run(root, 'after-checkpoint-rename').status, 0); check(root, 'CONSISTENT'); });
test('09 corrupt attempt bytes -> CORRUPT', t => { const root = fixture(t); assert.equal(run(root).status, 0); fs.appendFileSync(attemptPath(root), 'x'); check(root, 'CORRUPT', 'READ_FAILED'); });
test('10 corrupt checkpoint digest -> CORRUPT', t => { const root = fixture(t); assert.equal(run(root).status, 0); editJson(checkpointPath(root), o => o.sha256 = '0'.repeat(64)); check(root, 'CORRUPT', 'READ_FAILED'); });
test('11 valid-checksum attempt tamper -> CONFLICT', t => { const root = fixture(t); assert.equal(run(root).status, 0); rewriteAttempt(root, d => d.entries[0].attempt.questionId = 'tampered'); check(root, 'CONFLICT', 'ATTEMPT_DIGEST_MISMATCH'); });
test('12 valid-checksum journal order tamper -> CONFLICT', t => { const root = fixture(t); assert.equal(run(root, '', 2).status, 0); rewriteJournal(root, o => { o.entries[0].attemptId = 'other'; }); check(root, 'CONFLICT'); });
