import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { captureRestorationSnapshotExtension } from '../../../src/restoration/restorationSnapshotExtension.js';
import { reconstructGuardedStudySession, compareGuardedCandidateToLive } from '../../../src/restoration/trustedRestorationAdapter.js';
import { REQUIRED_RUNTIME_DEPENDENCIES } from '../../../src/restoration/dependencyCoverageValidator.js';
const hash = x => createHash('sha256').update(x).digest('hex');
const canonical = x => JSON.stringify(x);
const digest = x => createHash('sha256').update(JSON.stringify(sort(x))).digest('hex');
function sort(x) { if (Array.isArray(x)) return x.map(sort); if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, sort(x[k])])); return x; }
function fixture() {
    const runtime = { name: 'StudySession', version: '0.2.0', status: 'active', sessionId: 's-1' };
    const config = { lessonId: null }; const lessonRuntime = { currentItem: null, progress: {}, plan: null };
    const dependencies = Object.fromEntries(REQUIRED_RUNTIME_DEPENDENCIES.map(k => [k, k === 'lesson' ? null : {}]));
    const contentRefs = {}, contentBundle = {}, bindings = {};
    for (const k of REQUIRED_RUNTIME_DEPENDENCIES) { if (k === 'lesson') { bindings[k] = null; continue; } const bytes = Buffer.from(canonical(dependencies[k])); contentRefs[k] = { id: k, version: '1', sha256: hash(bytes) }; contentBundle[k] = { id: k, version: '1', bytes }; bindings[k] = k; }
    const snapshot = { runtime, config, state: {}, currentDecision: null, currentSelection: null, currentQuestion: null, lessonRuntime, activeRemediationPlan: null, history: [], masteryRuntime: {}, dependencies, attempts: [], lastFlowResult: null };
    const cp = { revision: 1, runtime, config, state: {}, currentDecision: null, currentSelection: null, currentQuestion: null, lessonRuntime, activeRemediationPlan: null, history: [], masteryRuntime: {}, attemptIds: [], contentRefs };
    const ext = captureRestorationSnapshotExtension({ checkpoint: cp, liveSnapshot: snapshot });
    const envelope = { schemaVersion: '1.0.0', checkpoint: cp, extension: ext, binding: { sessionId: 's-1', revision: 1, checkpointSha256: digest(cp), extensionSha256: digest(ext) }, executable: false };
    return { envelope, contentBundle, bindings, snapshot };
}
const run = f => reconstructGuardedStudySession(f);
test('reconstructs all 13 StudySession fields', () => { const f = fixture(); const r = run(f); assert.equal(Object.keys(r.candidate).length, 13); assert.equal(compareGuardedCandidateToLive({ guarded: r, liveSnapshot: f.snapshot }).equal, true); });
test('never grants execution', () => { const r = run(fixture()); assert.equal(r.executable, false); assert.equal(r.runtimeContinuityVerified, false); assert.equal(r.externalProvenanceVerified, false); });
test('detached candidate does not mutate input', () => { const f = fixture(); const r = run(f); r.candidate.state.x = 1; assert.equal(f.snapshot.state.x, undefined); });
test('rejects forged envelope executable', () => { const f = fixture(); f.envelope.executable = true; assert.throws(() => run(f), /RECON_INVALID_ENVELOPE/); });
test('rejects checkpoint tamper', () => { const f = fixture(); f.envelope.checkpoint.state.foo = 1; assert.throws(() => run(f), /RECON_BINDING_MISMATCH/); });
test('rejects extension tamper', () => { const f = fixture(); f.envelope.extension.continuity.lessonPlan = { foo: 1 }; assert.throws(() => run(f), /RECON_BINDING_MISMATCH/); });
test('rejects content byte tamper', () => { const f = fixture(); f.contentBundle.questionBanks.bytes = Buffer.from('{"evil":true}'); assert.throws(() => run(f), /COVERAGE_DIGEST_MISMATCH/); });
test('rejects missing dependency', () => { const f = fixture(); delete f.bindings.questionBanks; assert.throws(() => run(f), /COVERAGE_MISSING_BINDING/); });
test('detects state drift', () => { const f = fixture(); const r = run(f); f.snapshot.state.changed = true; assert.deepEqual(compareGuardedCandidateToLive({ guarded: r, liveSnapshot: f.snapshot }).mismatches, ['state']); });
test('detects extra runtime field', () => { const f = fixture(); const r = run(f); f.snapshot.unknown = 1; assert.deepEqual(compareGuardedCandidateToLive({ guarded: r, liveSnapshot: f.snapshot }).unexpectedLiveFields, ['unknown']); });
test('comparison never grants execution', () => { const f = fixture(); const r = run(f); assert.equal(compareGuardedCandidateToLive({ guarded: r, liveSnapshot: f.snapshot }).executable, false); });
test('rejects malformed input', () => assert.throws(() => run({}), /RECON_INVALID_ENVELOPE/));
