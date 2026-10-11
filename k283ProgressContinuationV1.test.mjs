import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findLatestVerifiedK283Progress } from './k283ProgressContinuationV1.js';

test('fresh installation has no previous progress', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-new-'));
    try { assert.equal(findLatestVerifiedK283Progress({ rootDir: dir, contentRefs: {} }), null); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('malformed checkpoint discovery fails closed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-bad-'));
    try {
        fs.mkdirSync(path.join(dir, 'checkpoints'));
        fs.writeFileSync(path.join(dir, 'checkpoints', 'a'.repeat(64) + '.json'), '{bad');
        assert.throws(() => findLatestVerifiedK283Progress({ rootDir: dir, contentRefs: {} }));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
