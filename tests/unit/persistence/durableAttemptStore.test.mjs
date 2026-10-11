import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
const withStore = fn => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attempt-v1-')); try { return fn(dir, createDurableAttemptStore({ rootDir: dir, lockTimeoutMs: 100 })); } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
const a = (id = 'a') => ({ attemptId: id, sessionId: 's', result: 'correct', context: { nodeId: 'n' } });
test('append, list, count and insertion order', () => withStore((_, s) => { s.appendAttempt({ sessionId: 's', attempt: a() }); s.appendAttempt({ sessionId: 's', attempt: a('b') }); assert.deepEqual(s.listAttemptIds({ sessionId: 's' }), ['a', 'b']); assert.equal(s.countAttempts({ sessionId: 's' }), 2); }));
test('restart reads durable attempts', () => withStore((dir, s) => { s.appendAttempt({ sessionId: 's', attempt: a() }); assert.deepEqual(createDurableAttemptStore({ rootDir: dir }).getAttempt({ sessionId: 's', attemptId: 'a' }), a()); }));
test('identical idempotent write', () => withStore((_, s) => { s.appendAttempt({ sessionId: 's', attempt: a() }); s.appendAttempt({ sessionId: 's', attempt: a() }); assert.equal(s.countAttempts({ sessionId: 's' }), 1); }));
test('conflicting payload and cross-session ownership fail', () => withStore((_, s) => { s.appendAttempt({ sessionId: 's', attempt: a() }); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: { ...a(), result: 'incorrect' } }), { code: 'ATTEMPT_CONFLICT' }); assert.throws(() => s.appendAttempt({ sessionId: 't', attempt: { attemptId: 'a', sessionId: 't' } }), { code: 'ATTEMPT_CONFLICT' }); }));
test('detached copies and invalid payload rejected', () => withStore((_, s) => { const attempt = a(); s.appendAttempt({ sessionId: 's', attempt }); attempt.result = 'incorrect'; const got = s.getAttempt({ sessionId: 's', attemptId: 'a' }); got.result = 'incorrect'; assert.equal(s.getAttempt({ sessionId: 's', attemptId: 'a' }).result, 'correct'); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: { attemptId: 'x', bad: undefined } }), { code: 'ATTEMPT_STORE_NON_JSON' }); }));
test('corruption fails closed', () => withStore((dir, s) => { s.appendAttempt({ sessionId: 's', attempt: a() }); fs.writeFileSync(path.join(dir, 'attempts.json'), '{}'); assert.throws(() => s.listAttempts({ sessionId: 's' }), { code: 'ATTEMPT_STORE_CORRUPT' }); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: a('b') }), { code: 'ATTEMPT_STORE_CORRUPT' }); }));
test('pre-rename crash does not commit', () => withStore((dir) => { const s = createDurableAttemptStore({ rootDir: dir, failpoint: 'afterTempFsync' }); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: a() }), { code: 'ATTEMPT_STORE_INJECTED_FAILURE' }); assert.equal(createDurableAttemptStore({ rootDir: dir }).hasAttempt({ sessionId: 's', attemptId: 'a' }), false); }));
test('post-rename error requires reconciliation by read', () => withStore((dir) => { const s = createDurableAttemptStore({ rootDir: dir, failpoint: 'afterRename' }); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: a() }), { code: 'ATTEMPT_STORE_INJECTED_FAILURE' }); assert.equal(createDurableAttemptStore({ rootDir: dir }).hasAttempt({ sessionId: 's', attemptId: 'a' }), true); }));
test('unknown live lock fails closed', () => withStore((dir, s) => { fs.mkdirSync(path.join(dir, 'attempts.lock')); assert.throws(() => s.appendAttempt({ sessionId: 's', attempt: a() }), { code: 'ATTEMPT_STORE_LOCK_TIMEOUT' }); }));
test('two concurrent processes serialize without losing attempts', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attempt-concurrent-'));
    try {
        const modulePath = new URL('../../../src/persistence/durableAttemptStore.js', import.meta.url).href;
        const script = `import {createDurableAttemptStore} from ${JSON.stringify(modulePath)}; const s=createDurableAttemptStore({rootDir:${JSON.stringify(dir)},lockTimeoutMs:5000});for(let i=0;i<20;i++)s.appendAttempt({sessionId:'s',attempt:{attemptId:process.argv[1]+'-'+i,sessionId:'s'}});`;
        const run = id => new Promise((resolve, reject) => { const child = spawn(process.execPath, ['--input-type=module', '-e', script, id]); let err = ''; child.stderr.on('data', d => err += d); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(err))); });
        await Promise.all([run('one'), run('two')]);
        assert.equal(createDurableAttemptStore({ rootDir: dir }).countAttempts({ sessionId: 's' }), 40);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
