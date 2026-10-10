import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleGuardedFixture, compareRealContinuation } from './runPersistedReconstructionIntegration.mjs';
import { createLiveSessionRevisionAuthority } from '../src/restoration/liveSessionRevisionAuthority.js';
import { commitFencedDurableCapture, readFencedDurableCapture } from '../src/restoration/fencedAuthenticatedDurableIntegration.js';
import { validateRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
import { compareGuardedCandidateToLive } from '../src/restoration/trustedRestorationAdapter.js';

const validateEnvelope = e => {
    assert.equal(e?.executable, false);
    assert.equal(e.binding?.sessionId, e.checkpoint?.runtime?.sessionId);
    assert.equal(e.binding?.revision, e.checkpoint?.revision);
    validateRestorationSnapshotExtension({ checkpoint: e.checkpoint, extension: e.extension });
};
if (!process.argv[2]) throw Error('Usage: node scripts/runFencedAuthenticatedDurableIntegration.mjs ./src/engines/orchestration/studySession.js');
try {
    const api = await import(pathToFileURL(resolve(process.argv[2])).href);
    const lesson = { id: 'c3-fixture-lesson', sections: [{ id: 'section-1', type: 'content', content: 'Fixture content' }] };
    const live = api.createStudySession({ sessionId: 'c3-fenced-durable-integration', studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
    const authority = createLiveSessionRevisionAuthority({ initialSession: live, initialRevision: 1 });
    const capture = authority.capture({ expectedRevision: 1, readSnapshot: session => api.getSessionSnapshot(session) });
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c3-fenced-durable-'));
    const key = randomBytes(32), keyId = 'local-test-key';
    const options = { authority, capture, assembleFixture: (snapshot, { revision }) => assembleGuardedFixture(snapshot, revision), rootDir, key, keyId, expectedRevision: 0, validateEnvelope };
    try {
        const saved = commitFencedDurableCapture(options);
        assert.equal(saved.fenceValidAfterCommit, true);
        assert.equal(saved.receipt.status, 'committed');
        console.log('PASS: fenced capture committed through REAL Durable Store with HMAC + manifest binding');
        const read = () => readFencedDurableCapture({ rootDir, sessionId: capture.sessionId, validateEnvelope, resolveKey: id => id === keyId ? key : null });
        const loaded = read();
        assert.equal(loaded.authenticatedEnvelopeVerified, true);
        assert.equal(loaded.manifestDigest, saved.manifestDigest);
        assert.equal(compareGuardedCandidateToLive({ guarded: loaded.guarded, liveSnapshot: capture.snapshot }).equal, true);
        console.log('PASS: new store instance reads authenticated guarded candidate matching live snapshot');
        compareRealContinuation({ api, snapshot: capture.snapshot, guarded: loaded.guarded });
        console.log('PASS: real StudySession continuation equivalent (one synthetic lesson step)');
        assert.throws(() => readFencedDurableCapture({ rootDir, sessionId: capture.sessionId, validateEnvelope, resolveKey: () => randomBytes(32) }), e => e.code === 'AUTH_TAG_MISMATCH');
        console.log('PASS: wrong HMAC key rejected before reconstruction');
        authority.mutate({ expectedRevision: 1, apply: s => s });
        assert.throws(() => commitFencedDurableCapture(options), e => e.code === 'FENCE_STALE_CAPTURE');
        console.log('PASS: stale capture rejected before disk persistence');
        assert.equal(loaded.executable, false);
        console.log('STATUS: FENCED AUTHENTICATED DURABLE GUARDED INTEGRATION; SINGLE-PROCESS COOPERATIVE FENCE; NO GLOBAL ATOMICITY OR EXECUTION PERMIT');
    } finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
} catch (e) { console.error('FAIL:', e.stack ?? e); process.exitCode = 1; }
