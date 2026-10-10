import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createStudySession, getNextStudyItem, completeLessonItem, getSessionSnapshot } from '../../../src/engines/orchestration/studySession.js';
import { captureRestorationSnapshotExtension as capture, validateRestorationSnapshotExtension as verify, REQUIRED_DEPENDENCIES } from '../../../src/restoration/restorationSnapshotExtension.js';
import { validatePendingContentCapture as validate } from '../../../src/restoration/pendingContentCaptureValidator.js';
const clone = structuredClone;
const hash = createHash('sha256').update('pending-content-test-fixture').digest('hex');
function fixture() {
    const lesson = { id: 'security-lesson', version: '1.0.0', deliveryModes: ['HOC_SAU'], sections: [{ id: 's1', type: 'concept', content: 'Cell' }, { id: 's2', type: 'mechanism', content: 'Transport' }, { id: 's3', type: 'summary', content: 'Summary' }] };
    let live = createStudySession({ sessionId: 'security-session', studentState: { schemaVersion: '1.2.0', studentId: 'security-student', knowledge: {} }, initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } }, questionBanks: {}, lesson, lessonId: lesson.id, now: '2026-10-09T08:00:00.000Z' });
    live = getNextStudyItem({ session: live, now: '2026-10-09T08:00:30.000Z' }).session;
    live = completeLessonItem({ session: live, sectionId: live.lessonRuntime.currentItem.sectionId, now: '2026-10-09T08:01:00.000Z' }).session;
    live = getNextStudyItem({ session: live, now: '2026-10-09T08:01:30.000Z' }).session;
    const snapshot = getSessionSnapshot(live);
    const fields = ['runtime', 'config', 'state', 'currentDecision', 'currentSelection', 'currentQuestion', 'lessonRuntime', 'activeRemediationPlan', 'history', 'masteryRuntime'];
    const checkpoint = { schemaVersion: '1.0.0-draft', revision: 1 };
    for (const field of fields) checkpoint[field] = clone(snapshot[field]);
    checkpoint.attemptIds = snapshot.attempts.map(a => a.attemptId);
    checkpoint.contentRefs = Object.fromEntries(REQUIRED_DEPENDENCIES.map(k => [k, { id: k, version: '1.0.0', sha256: hash }]));
    assert.equal(snapshot.lessonRuntime.currentItem.kind, 'content');
    return { checkpoint, snapshot };
}
const make = () => { const x = fixture(); return { ...x, extension: capture({ checkpoint: x.checkpoint, liveSnapshot: x.snapshot }) } };
function mutateBoth(mutator) { const x = fixture(); mutator(x.checkpoint); x.snapshot.lessonRuntime = clone(x.checkpoint.lessonRuntime); x.snapshot.currentQuestion = clone(x.checkpoint.currentQuestion); x.snapshot.currentSelection = clone(x.checkpoint.currentSelection); return x; }
const rejected = (x, pattern) => assert.throws(() => capture({ checkpoint: x.checkpoint, liveSnapshot: x.snapshot }), pattern);
test('01 real pending content is navigation-consistent', () => assert.equal(validate(fixture().checkpoint).executable, false));
test('02 capture pending content with non-executable extension', () => assert.equal(make().extension.executable, false));
test('03 read validates authentic pending content', () => assert.equal(verify(make()).executable, false));
test('04 read rejects altered pending item before navigation', () => { const x = make(); x.checkpoint.lessonRuntime.currentItem = clone(x.checkpoint.lessonRuntime.plan.items[2]); assert.throws(() => verify(x), /SNAPSHOT_BINDING_MISMATCH/); });
// Tests 05-14 mutate checkpoint and matching live snapshot, so drift checking cannot hide navigation errors.
test('05 reject replay of completed section', () => rejected(mutateBoth(cp => { cp.lessonRuntime.currentItem = clone(cp.lessonRuntime.plan.items[0]); }), /PENDING_NAVIGATION_MISMATCH/));
test('06 reject jumping to later section', () => rejected(mutateBoth(cp => { cp.lessonRuntime.currentItem = clone(cp.lessonRuntime.plan.items[2]); }), /PENDING_NAVIGATION_MISMATCH/));
test('07 reject completed pending item', () => rejected(mutateBoth(cp => { cp.lessonRuntime.progress.completedSectionIds.push('s2'); }), /PENDING_NAVIGATION_MISMATCH|PENDING_ALREADY_RESOLVED/));
test('08 reject skipped pending item', () => rejected(mutateBoth(cp => { cp.lessonRuntime.progress.skippedSectionIds.push('s2'); }), /PENDING_NAVIGATION_MISMATCH|PENDING_ALREADY_RESOLVED/));
test('09 reject question-set pending item', () => rejected(mutateBoth(cp => { cp.lessonRuntime.currentItem.kind = 'question_set'; }), /PENDING_UNSUPPORTED_KIND/));
test('10 reject currentQuestion', () => rejected(mutateBoth(cp => { cp.currentQuestion = { id: 'q1' }; }), /PENDING_QUESTION_STATE/));
test('11 reject currentSelection', () => rejected(mutateBoth(cp => { cp.currentSelection = { id: 'q1' }; }), /PENDING_QUESTION_STATE/));
test('12 reject changed pending fields', () => rejected(mutateBoth(cp => { cp.lessonRuntime.currentItem.sectionType = 'comparison'; }), /PENDING_NAVIGATION_MISMATCH/));
test('13 reject duplicate plan section IDs', () => rejected(mutateBoth(cp => { cp.lessonRuntime.plan.items[2].sectionId = 's2'; }), /PENDING_AMBIGUOUS_SECTION/));
test('14 reject plan-complete with pending item', () => rejected(mutateBoth(cp => { cp.lessonRuntime.progress.completedSectionIds = ['s1', 's2', 's3']; }), /PENDING_NO_NEXT_ITEM/));
test('15 reject tampered checkpoint binding', () => { const x = make(); x.checkpoint.revision++; assert.throws(() => verify(x), /SNAPSHOT_BINDING_MISMATCH/); });
test('16 reject tampered continuity', () => { const x = make(); x.extension.continuity.lessonPlan = {}; assert.throws(() => verify(x), /SNAPSHOT_CONTINUITY_TAMPERED/); });
test('17 reject claimed execution permission', () => { const x = make(); x.extension.executable = true; assert.throws(() => verify(x), /SNAPSHOT_UNTRUSTED_CLAIM/); });
test('18 reject missing dependency', () => { const x = fixture(); delete x.snapshot.dependencies.lesson; rejected(x, /SNAPSHOT_MISSING_DEPENDENCIES/); });
test('19 read-side rejects question state after capture', () => { const x = make(); x.checkpoint.currentQuestion = { id: 'q1' }; assert.throws(() => verify(x), /SNAPSHOT_BINDING_MISMATCH/); });
test('20 successful capture does not mutate snapshot', () => { const x = fixture(); const original = clone(x.snapshot); capture({ checkpoint: x.checkpoint, liveSnapshot: x.snapshot }); assert.deepEqual(x.snapshot, original); });

// Rebinding only the unkeyed checkpoint digest must not bypass semantic read validation.
function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean' || typeof x === 'number') return JSON.stringify(x);
    if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
    return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
}
test('21 read rejects navigation replay even after recomputed checkpoint SHA-256', () => {
    const x = make();
    x.checkpoint.lessonRuntime.currentItem = clone(x.checkpoint.lessonRuntime.plan.items[2]);
    x.extension.checkpointBinding.sha256 = createHash('sha256').update(canonical(x.checkpoint), 'utf8').digest('hex');
    assert.throws(() => verify(x), /PENDING_NAVIGATION_MISMATCH/);
});
test('22 read rejects question delivery even after recomputed checkpoint SHA-256', () => {
    const x = make();
    x.checkpoint.currentQuestion = { id: 'q1' };
    x.extension.checkpointBinding.sha256 = createHash('sha256').update(canonical(x.checkpoint), 'utf8').digest('hex');
    assert.throws(() => verify(x), /PENDING_QUESTION_STATE/);
});
