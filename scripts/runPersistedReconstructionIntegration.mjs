import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { persistGuardedCapture, readPersistedGuardedCapture } from '../src/restoration/persistedReconstructionIntegration.js';
import { validateRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
const validateEnvelope = e => { if (e?.executable !== false || !e?.checkpoint || !e?.extension || e.binding?.sessionId !== e.checkpoint.runtime?.sessionId || e.binding?.revision !== e.checkpoint.revision) throw Error('INVALID_ENVELOPE'); validateRestorationSnapshotExtension({ checkpoint: e.checkpoint, extension: e.extension }); };
import { pathToFileURL } from 'node:url';
import { captureRestorationSnapshotExtension } from '../src/restoration/restorationSnapshotExtension.js';
import { reconstructGuardedStudySession, compareGuardedCandidateToLive } from '../src/restoration/trustedRestorationAdapter.js';
import { REQUIRED_RUNTIME_DEPENDENCIES } from '../src/restoration/dependencyCoverageValidator.js';
import { compareSessionContinuations } from '../src/restoration/behavioralEquivalence.js';

const hash = x => createHash('sha256').update(x).digest('hex');
const canonical = x => JSON.stringify(x);
function sorted(x) { if (Array.isArray(x)) return x.map(sorted); if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, sorted(x[k])])); return x; }
const digest = x => hash(JSON.stringify(sorted(x)));
export function assembleGuardedFixture(snapshot, revision = 1) {
    const cp = { revision, runtime: structuredClone(snapshot.runtime), config: structuredClone(snapshot.config), state: structuredClone(snapshot.state), currentDecision: structuredClone(snapshot.currentDecision), currentSelection: structuredClone(snapshot.currentSelection), currentQuestion: structuredClone(snapshot.currentQuestion), lessonRuntime: structuredClone(snapshot.lessonRuntime), activeRemediationPlan: structuredClone(snapshot.activeRemediationPlan), history: structuredClone(snapshot.history), masteryRuntime: structuredClone(snapshot.masteryRuntime), attemptIds: snapshot.attempts.map(a => a.attemptId), contentRefs: {} };
    const contentBundle = {}, bindings = {};
    for (const key of REQUIRED_RUNTIME_DEPENDENCIES) {
        if (key === 'lesson' && snapshot.dependencies.lesson === null) { bindings[key] = null; continue; }
        const bytes = Buffer.from(canonical(snapshot.dependencies[key]), 'utf8');
        cp.contentRefs[key] = { id: key, version: '1', sha256: hash(bytes) };
        contentBundle[key] = { id: key, version: '1', bytes }; bindings[key] = key;
    }
    const extension = captureRestorationSnapshotExtension({ checkpoint: cp, liveSnapshot: snapshot });
    const envelope = { schemaVersion: '1.0.0', checkpoint: cp, extension, binding: { sessionId: cp.runtime.sessionId, revision, checkpointSha256: digest(cp), extensionSha256: digest(extension) }, executable: false };
    return { envelope, contentBundle, bindings };
}
export function runGuardedComparison({ snapshot, fixture }) {
    const guarded = reconstructGuardedStudySession(fixture);
    const comparison = compareGuardedCandidateToLive({ guarded, liveSnapshot: snapshot });
    assert.equal(comparison.equal, true, JSON.stringify(comparison));
    assert.equal(guarded.executable, false);
    assert.equal(comparison.executable, false);
    return { guarded, comparison };
}
export function compareRealContinuation({ api, snapshot, guarded }) {
    // Deliberately synthetic lesson item, as in prior smoke test; this is NOT an actual resumed delivery.
    const original = structuredClone(snapshot), restored = structuredClone(guarded.candidate);
    assert.ok(original.dependencies.lesson, 'Original must have configured lesson');
    assert.deepEqual(restored.dependencies.lesson, original.dependencies.lesson, 'Restored lesson must come from verified dependency bytes');
    assert.ok(original.dependencies.lesson.sections.some(x => x.id === 'section-1'), 'Fixture section must exist in configured lesson');
    // Synthetic delivery is used only for continuation smoke; checkpoint has no pending delivery.
    for (const s of [original, restored]) s.lessonRuntime.currentItem = { kind: 'content', sectionId: 'section-1' };
    const advance = ({ session, input, now, branch }) => {
        try { return api.completeLessonItem({ session, sectionId: input.sectionId, skipped: false, now }); }
        catch (error) { console.error(`CONTINUATION FAILED [${branch ?? 'unknown'}]:`, error?.stack ?? error); throw error; }
    };
    const steps = [{ now: '2026-10-09T08:01:00.000Z', input: { sectionId: 'section-1' } }];
    const result = compareSessionContinuations({ original, restored, steps, advance });
    assert.equal(result.equivalent, true, JSON.stringify(result));
    assert.equal(result.executable, false);
    const altered = structuredClone(restored); altered.lastFlowResult = { adaptiveDecision: { action: 'REMEDIATE' } };
    const drift = compareSessionContinuations({ original, restored: altered, steps, advance });
    assert.equal(drift.equivalent, false);
    assert.ok(drift.mismatches.some(m => m.field === 'lastFlowResult'));
    return { result, drift };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
    try {
        assert.ok(process.argv[2], 'Usage: node scripts/runRealReconstructionIntegration.mjs ./src/engines/orchestration/studySession.js');
        const api = await import(pathToFileURL(resolve(process.argv[2])).href);
        for (const k of ['createStudySession', 'getSessionSnapshot', 'completeLessonItem']) assert.equal(typeof api[k], 'function', k);
        // A real configured lesson is required by completeLessonItem(); no post-reconstruction dependency injection.
        const lesson = { id: 'c3-fixture-lesson', sections: [{ id: 'section-1', type: 'content', content: 'Fixture content' }] };
        const session = api.createStudySession({ sessionId: 'c3-reconstruction-integration', studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
        const snapshot = api.getSessionSnapshot(session);
        const fixture = assembleGuardedFixture(snapshot);
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c3-persisted-'));
        const { manifestDigest } = persistGuardedCapture({ rootDir: temp, fixture, expectedRevision: 0, validateEnvelope });
        const recovered = readPersistedGuardedCapture({ rootDir: temp, sessionId: snapshot.runtime.sessionId, manifestDigest, validateEnvelope });
        const guarded = recovered.guarded;
        runGuardedComparison({ snapshot, fixture: { ...fixture, envelope: recovered.read.envelope } });
        assert.deepEqual(guarded.candidate, snapshot);
        fs.rmSync(temp, { recursive: true, force: true });
        console.log('PASS: persisted envelope read from new durable store instance + verified dependency bytes');
        console.log('PASS: full structural comparison with live snapshot');
        const { result } = compareRealContinuation({ api, snapshot, guarded });
        console.log(`PASS: real StudySession completeLessonItem continuation (${result.stepsCompared} synthetic step)`);
        console.log('PASS: lastFlowResult drift detected; executable=false');
        console.log('STATUS: PERSISTED GUARDED INTEGRATION ONLY; MANIFEST DIGEST EXTERNAL, NO AUTHENTICATED CAPTURE OR EXECUTION PERMIT');
    } catch (e) { console.error('FAIL:', e?.stack || e); process.exitCode = 1; }
}
