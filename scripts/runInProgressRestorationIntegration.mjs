import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleGuardedFixture } from './runPersistedReconstructionIntegration.mjs';
import { createLiveSessionRevisionAuthority } from '../src/restoration/liveSessionRevisionAuthority.js';
import { commitFencedDurableCapture, readFencedDurableCapture } from '../src/restoration/fencedAuthenticatedDurableIntegration.js';
import { validateRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
import { compareGuardedCandidateToLive } from '../src/restoration/trustedRestorationAdapter.js';
import { assertRealPendingItem, compareMultiStepRealContinuation } from '../src/restoration/inProgressContinuation.js';

const validateEnvelope = e => {
    assert.equal(e.executable, false);
    assert.equal(e.binding?.sessionId, e.checkpoint?.runtime?.sessionId);
    assert.equal(e.binding?.revision, e.checkpoint?.revision);
    validateRestorationSnapshotExtension({ checkpoint: e.checkpoint, extension: e.extension });
};
if (!process.argv[2]) throw Error('Usage: node scripts/runInProgressRestorationIntegration.mjs ./src/engines/orchestration/studySession.js');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c3-inprogress-'));
try {
    const api = await import(pathToFileURL(resolve(process.argv[2])).href);
    for (const name of ['createStudySession', 'getSessionSnapshot', 'getNextStudyItem', 'completeLessonItem']) assert.equal(typeof api[name], 'function');
    const lesson = {
        id: 'c3-inprogress-lesson',
        version: '1.0.0',
        deliveryModes: ['HOC_SAU'],

        sections: [
            {
                id: 'section-1',
                type: 'concept',
                content: 'Cell membrane'
            },
            {
                id: 'section-2',
                type: 'mechanism',
                content: 'Membrane transport'
            },
            {
                id: 'section-3',
                type: 'summary',
                content: 'Osmosis'
            }
        ]
    };
    let live = api.createStudySession({ sessionId: 'c3-inprogress-real', studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
    // All pre-capture activity must originate in StudySession public APIs; never inject currentItem.
    let navigation = api.getNextStudyItem({ session: live, now: '2026-10-09T08:00:30.000Z' });
    live = navigation.session;
    assertRealPendingItem(api.getSessionSnapshot(live));
    const completion = api.completeLessonItem({
        session: live,
        sectionId: live.lessonRuntime.currentItem.sectionId,
        now: '2026-10-09T08:01:00.000Z'
    });

    assert.equal(completion.status, 'ITEM_COMPLETED');
    assert.ok(completion.session?.runtime);

    live = completion.session;
    navigation = api.getNextStudyItem({ session: live, now: '2026-10-09T08:01:30.000Z' });
    live = navigation.session;
    const before = api.getSessionSnapshot(live);
    assert.ok(before.lessonRuntime.progress.completedSectionIds.length >= 1, 'pre-capture real progress required');
    assertRealPendingItem(before);
    console.log('PASS: real StudySession generated completed progress and a pending item before capture');
    const authority = createLiveSessionRevisionAuthority({ initialSession: live, initialRevision: 1 });
    const capture = authority.capture({ expectedRevision: 1, readSnapshot: s => api.getSessionSnapshot(s) });
    const key = randomBytes(32), keyId = 'inprogress-local-test';
    const saved = commitFencedDurableCapture({ authority, capture, assembleFixture: (s, { revision }) => assembleGuardedFixture(s, revision), rootDir, key, keyId, expectedRevision: 0, validateEnvelope });
    assert.equal(saved.fenceValidAfterCommit, true);
    const loaded = readFencedDurableCapture({ rootDir, sessionId: capture.sessionId, validateEnvelope, resolveKey: id => id === keyId ? key : null });
    assert.equal(loaded.authenticatedEnvelopeVerified, true);
    assert.equal(compareGuardedCandidateToLive({ guarded: loaded.guarded, liveSnapshot: before }).equal, true);
    assert.deepEqual(loaded.guarded.candidate, before);
    console.log('PASS: authenticated durable reconstruction preserves actual in-progress state');
    const result = compareMultiStepRealContinuation({ api, original: before, restored: loaded.guarded.candidate, steps: 4 });
    assert.equal(result.executable, false);
    console.log('PASS: real StudySession multi-step continuation equivalent: ' + JSON.stringify(result.trace));
    const drift = structuredClone(loaded.guarded.candidate);
    drift.lastFlowResult = { adaptiveDecision: { action: 'REMEDIATE' } };
    assert.throws(() => compareMultiStepRealContinuation({ api, original: before, restored: drift, steps: 4 }), /reconstructed snapshot must match/);
    console.log('PASS: drift rejected before continuation');
    console.log('STATUS: IN-PROGRESS CONTENT-LESSON GUARDED TEST ONLY; NO QUESTION/ATTEMPT CONTINUITY OR EXECUTION PERMIT; executable=false');
} catch (error) { console.error('FAIL:', error.stack ?? error); process.exitCode = 1; }
finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
