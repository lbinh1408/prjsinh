import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
const worker = fileURLToPath(new URL('./multiProcessFencingV1.worker.mjs', import.meta.url));
const setup = t => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-fence-v1-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root };
function run(root, cmd, session = 's', arg = '') { const r = spawnSync(process.execPath, [worker, root, cmd, session, String(arg)], { encoding: 'utf8', timeout: 6000 }); return { code: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr, json: () => JSON.parse(r.stdout.trim()) } }
const good = r => { assert.equal(r.code, 0, JSON.stringify(r)); return r.json() };
function held(root, cmd, session = 's', arg = '') {
    const p = spawn(process.execPath, [worker, root, cmd, session, String(arg)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = ''; p.stderr.on('data', b => stderr += b);
    const ready = new Promise((resolve, reject) => { let out = ''; const timer = setTimeout(() => reject(Error('WORKER_READY_TIMEOUT')), 5000); p.stdout.on('data', b => { out += b; if (out.includes('_HELD')) { clearTimeout(timer); resolve() } }); p.once('exit', (code, signal) => { clearTimeout(timer); reject(Error(`EARLY_EXIT:${code}:${signal}:${stderr}`)) }) });
    return { p, ready };
}
const stop = async p => { if (p.exitCode !== null || p.signalCode !== null) return; p.kill('SIGKILL'); await new Promise(resolve => p.once('exit', resolve)) };
const store = root => createDurableAttemptStore({ rootDir: path.join(root, "attempts") });
test('01 cross-process token publication', t => { const r = setup(t), a = good(run(r, 'token')); const pub = good(run(r, 'publish', 's', a.epoch)); assert.equal(pub.status, 'PUBLISHED'); assert.equal(good(run(r, 'read')).generation, pub.generation) });
test('02 older process token is fenced by new process token', t => { const r = setup(t), a = good(run(r, 'token')), b = good(run(r, 'token')); assert.ok(b.epoch > a.epoch); assert.match(run(r, 'publish', 's', a.epoch).stderr, /STALE_PUBLISHER/); assert.equal(good(run(r, 'publish', 's', b.epoch)).status, 'PUBLISHED') });
test('03 cooperative real attempt write invalidates token', t => { const r = setup(t), a = good(run(r, 'token')); good(run(r, 'writer', 's', 'a1')); assert.match(run(r, 'publish', 's', a.epoch).stderr, /STALE_PUBLISHER/); assert.deepEqual(store(r).listAttemptIds({ sessionId: 's' }), ['a1']) });
test('04 real attempt store captured after cooperative write', t => { const r = setup(t); good(run(r, 'writer', 's', 'a1')); const a = good(run(r, 'token')); const pub = good(run(r, 'publish', 's', a.epoch)); assert.deepEqual(pub.observation.attemptIds, ['a1']) });
test('05 concurrent process cannot write during held writer', async t => { const r = setup(t), h = held(r, 'holdWriter'); t.after(() => h.p.kill('SIGKILL')); await h.ready; const q = run(r, 'writer', 's', 'a2'); assert.match(q.stderr, /CAPTURE_LOCK_BUSY/); await stop(h.p); assert.deepEqual(store(r).listAttemptIds({ sessionId: 's' }), []) });
test('06 SIGKILL writer leaves fail-closed coordination lock', async t => { const r = setup(t), h = held(r, 'holdWriter'); t.after(() => h.p.kill('SIGKILL')); await h.ready; await stop(h.p); assert.equal(good(run(r, 'inspect')).status, 'BUSY'); assert.match(run(r, 'token').stderr, /CAPTURE_LOCK_BUSY/) });
test('07 SIGKILL during capture preserves previous pointer', async t => { const r = setup(t), a = good(run(r, 'token')); const prior = good(run(r, 'publish', 's', a.epoch)); const b = good(run(r, 'token')); const h = held(r, 'holdCapture', 's', b.epoch); t.after(() => h.p.kill('SIGKILL')); await h.ready; await stop(h.p); assert.equal(good(run(r, 'read')).generation, prior.generation); assert.equal(good(run(r, 'inspect')).status, 'BUSY') });
test('08 publisher cannot enter while writer process holds lock', async t => { const r = setup(t), h = held(r, 'holdWriter'); t.after(() => h.p.kill('SIGKILL')); await h.ready; assert.match(run(r, 'token').stderr, /CAPTURE_LOCK_BUSY/); await stop(h.p) });
test('09 writer cannot enter while publisher process holds capture lock', async t => { const r = setup(t), a = good(run(r, 'token')), h = held(r, 'holdCapture', 's', a.epoch); t.after(() => h.p.kill('SIGKILL')); await h.ready; assert.match(run(r, 'writer', 's', 'a2').stderr, /CAPTURE_LOCK_BUSY/); await stop(h.p) });
test('10 sessions use independent process locks', async t => { const r = setup(t), h = held(r, 'holdWriter', 's'); t.after(() => h.p.kill('SIGKILL')); await h.ready; const b = good(run(r, 'writer', 'other', 'a2')); assert.equal(b.attempt.attemptId, 'a2'); await stop(h.p) });
test('11 no recovery authorization from multi-process published snapshot', t => { const r = setup(t), a = good(run(r, 'token')), pub = good(run(r, 'publish', 's', a.epoch)); for (const k of ['resumeAuthorized', 'retryAuthorized', 'executable', 'recoveryAuthorized', 'crossStoreAtomicityProven']) assert.equal(pub[k], false) });
test('12 non-cooperative direct write demonstrates unenforced boundary', t => { const r = setup(t), a = good(run(r, 'token')); good(run(r, 'directWrite', 's', 'bypass')); const pub = good(run(r, 'publish', 's', a.epoch)); assert.deepEqual(pub.observation.attemptIds, ['bypass']); assert.equal(pub.crossStoreAtomicityProven, false); assert.equal(pub.recoveryAuthorized, false) });
