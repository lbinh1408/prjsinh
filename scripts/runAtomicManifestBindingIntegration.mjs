import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleGuardedFixture, compareRealContinuation } from './runPersistedReconstructionIntegration.mjs';
import { persistBoundCapture, readBoundCapture } from '../src/restoration/atomicManifestBinding.js';
import { validateRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
import { compareGuardedCandidateToLive } from '../src/restoration/trustedRestorationAdapter.js';
const validateEnvelope = e => {
    assert.equal(e?.executable, false);
    assert.equal(e.binding?.sessionId, e.checkpoint?.runtime?.sessionId);
    assert.equal(e.binding?.revision, e.checkpoint?.revision);
    validateRestorationSnapshotExtension({ checkpoint: e.checkpoint, extension: e.extension });
};
if (!process.argv[2]) throw Error('Usage: node scripts/runAtomicManifestBindingIntegration.mjs ./src/engines/orchestration/studySession.js');
const api = await import(pathToFileURL(resolve(process.argv[2])).href);
const lesson = { id: 'c3-fixture-lesson', sections: [{ id: 'section-1', type: 'content', content: 'Fixture content' }] };
const live = api.createStudySession({ sessionId: 'c3-atomic-manifest-integration', studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
const snapshot = api.getSessionSnapshot(live);
const fixture = assembleGuardedFixture(snapshot);
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c3-manifest-integration-'));
try {
    const saved = persistBoundCapture({ rootDir, fixture, expectedRevision: 0, validateEnvelope });
    const loaded = readBoundCapture({ rootDir, sessionId: snapshot.runtime.sessionId, validateEnvelope });
    assert.equal(loaded.manifestDigest, saved.manifestDigest);
    assert.equal(loaded.read.envelope.captureBinding.manifestSha256, saved.manifestDigest);
    console.log('PASS: manifest SHA-256 atomically bound inside committed envelope');
    const compared = compareGuardedCandidateToLive({ guarded: loaded.guarded, liveSnapshot: snapshot });
    assert.equal(compared.equal, true, JSON.stringify(compared));
    console.log('PASS: disk-loaded guarded candidate structurally matches real StudySession');
    compareRealContinuation({ api, snapshot, guarded: loaded.guarded });
    console.log('PASS: real StudySession continuation equivalent (synthetic step)');
    assert.equal(loaded.executable, false);
    assert.equal(loaded.authenticatedCaptureProven, false);
    console.log('STATUS: MANIFEST BOUND; EXTERNAL AUTHENTICATION AND LIVE CAPTURE ATOMICITY NOT PROVEN; executable=false');
} finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
