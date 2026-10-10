import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleGuardedFixture, compareRealContinuation } from './runPersistedReconstructionIntegration.mjs';
import { persistPreAuthenticatedCapture, readPreAuthenticatedPersistedCapture } from '../src/restoration/authenticatedPersistedIntegration.js';
import { validateRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
import { compareGuardedCandidateToLive } from '../src/restoration/trustedRestorationAdapter.js';
const validateEnvelope = e => { assert.equal(e?.executable, false); assert.equal(e.binding?.sessionId, e.checkpoint?.runtime?.sessionId); assert.equal(e.binding?.revision, e.checkpoint?.revision); validateRestorationSnapshotExtension({ checkpoint: e.checkpoint, extension: e.extension }); };
if (!process.argv[2]) throw Error('Usage: node scripts/runAuthenticatedPersistedIntegration.mjs ./src/engines/orchestration/studySession.js');
try {
    const api = await import(pathToFileURL(resolve(process.argv[2])).href);
    const lesson = { id: 'c3-fixture-lesson', sections: [{ id: 'section-1', type: 'content', content: 'Fixture content' }] };
    const live = api.createStudySession({ sessionId: 'c3-auth-persisted-integration', studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
    const snapshot = api.getSessionSnapshot(live), fixture = assembleGuardedFixture(snapshot);
    const key = randomBytes(32), rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c3-auth-persisted-'));
    try {
        const saved = persistPreAuthenticatedCapture({ rootDir, fixture, expectedRevision: 0, validateEnvelope, key, keyId: 'local-test-key' });
        const read = () => readPreAuthenticatedPersistedCapture({ rootDir, sessionId: snapshot.runtime.sessionId, validateEnvelope, resolveKey: id => id === 'local-test-key' ? key : null });
        const loaded = read();
        assert.equal(loaded.manifestDigest, saved.manifestDigest);
        assert.equal(loaded.authenticatedEnvelopeVerified, true);
        assert.equal(loaded.read.envelope.captureBinding.manifestSha256, saved.manifestDigest);
        console.log('PASS: persisted envelope includes HMAC over atomic manifest binding');
        const compared = compareGuardedCandidateToLive({ guarded: loaded.guarded, liveSnapshot: snapshot });
        assert.equal(compared.equal, true, JSON.stringify(compared));
        console.log('PASS: pre-authenticated disk candidate matches real StudySession snapshot');
        compareRealContinuation({ api, snapshot, guarded: loaded.guarded });
        console.log('PASS: real StudySession continuation equivalent (one synthetic step)');
        assert.throws(() => readPreAuthenticatedPersistedCapture({ rootDir, sessionId: snapshot.runtime.sessionId, validateEnvelope, resolveKey: () => randomBytes(32) }), e => e.code === 'AUTH_TAG_MISMATCH');
        console.log('PASS: wrong key rejected before reconstruction');
        assert.equal(loaded.executable, false); assert.equal(loaded.atomicityProven, false);
        console.log('STATUS: AUTHENTICATED GUARDED RECONSTRUCTION; LIVE CAPTURE ATOMICITY AND EXECUTION PERMIT NOT PROVEN; executable=false');
    } finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
} catch (e) { console.error('FAIL:', e.stack ?? e); process.exitCode = 1; }
