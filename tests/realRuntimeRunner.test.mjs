import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareSessionContinuations } from '../src/restoration/behavioralEquivalence.js';

const source = readFileSync(new URL('../scripts/runRealRuntimeContinuity.mjs', import.meta.url), 'utf8');
const makeSession = () => ({
    runtime: { name: 'StudySession', version: '0.2.0', sessionId: 'test', status: 'active' },
    config: {}, state: { studentId: 'student' }, currentDecision: { action: 'LEARN' },
    currentSelection: null, currentQuestion: null,
    lessonRuntime: { plan: null, currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } },
    activeRemediationPlan: null, attempts: [], history: [],
    masteryRuntime: { evidenceHistoryByNode: {} }, lastFlowResult: null
});
const steps = [{ now: '2026-10-09T08:01:00.000Z', input: {} }];
const advance = ({ session }) => ({ session });

test('runner refers to public StudySession exports', () => {
    for (const n of ['createStudySession', 'getSessionSnapshot', 'getStudentState', 'completeLessonItem']) assert.ok(source.includes(n));
});
test('runner uses a fixed timestamp', () => assert.match(source, /2026-10-09T08:01:00\.000Z/));
test('behavioral harness detects lastFlowResult drift', () => {
    const original = makeSession(), restored = structuredClone(original);
    restored.lastFlowResult = { adaptiveDecision: { action: 'REMEDIATE' } };
    const result = compareSessionContinuations({ original, restored, steps, advance });
    assert.equal(result.equivalent, false);
    assert.ok(result.mismatches.some(x => x.field === 'lastFlowResult'));
});
test('behavioral harness detects masteryRuntime drift', () => {
    const original = makeSession(), restored = structuredClone(original);
    restored.masteryRuntime.evidenceHistoryByNode.n1 = { evidence: 1 };
    const result = compareSessionContinuations({ original, restored, steps, advance });
    assert.equal(result.equivalent, false);
    assert.ok(result.mismatches.some(x => x.field === 'masteryRuntime'));
});
test('equivalent branches remain non-executable', () => {
    const original = makeSession(), restored = structuredClone(original);
    const result = compareSessionContinuations({ original, restored, steps, advance });
    assert.equal(result.equivalent, true);
    assert.equal(result.executable, false);
});
test('runner explicitly distinguishes clone from restoration', () => {
    assert.match(source, /NOT restoration/);
    assert.match(source, /CONTROL-BRANCH SMOKE ONLY/);
});
