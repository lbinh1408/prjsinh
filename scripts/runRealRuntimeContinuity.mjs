import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareSessionContinuations } from '../src/restoration/behavioralEquivalence.js';

const modulePath = process.argv[2];
if (!modulePath) {
    console.error('Usage: node scripts/runRealRuntimeContinuity.mjs ./src/session/studySession.js');
    process.exitCode = 2;
} else {
    try {
        const api = await import(pathToFileURL(resolve(modulePath)).href);
        for (const name of ['createStudySession', 'getSessionSnapshot', 'getStudentState', 'completeLessonItem']) {
            assert.equal(typeof api[name], 'function', `Missing StudySession export ${name}`);
        }
        const started = '2026-10-09T08:00:00.000Z';
        const original = api.createStudySession({
            sessionId: 'real-runtime-continuity-fixture',
            studentState: { schemaVersion: '1.2.0', studentId: 'fixture-student', knowledge: {} },
            initialDecision: { action: 'LEARN', target: { primaryNodeId: 'n1' } },
            questionBanks: {}, lesson: { id: 'lesson-fixture', sections: [] }, now: started
        });
        const snap = api.getSessionSnapshot(original);
        assert.notStrictEqual(snap, original);
        assert.deepEqual(api.getStudentState(original), original.state);
        // This is a control branch copied from the SAME LIVE runtime, NOT restoration.
        const control = structuredClone(snap);
        const first = structuredClone(snap);
        first.lessonRuntime.currentItem = { kind: 'content', sectionId: 'section-1' };
        const second = structuredClone(control);
        second.lessonRuntime.currentItem = { kind: 'content', sectionId: 'section-1' };
        const advance = ({ session, input, now }) => api.completeLessonItem({ session, sectionId: input.sectionId, skipped: input.skipped, now });
        const steps = [{ now: '2026-10-09T08:01:00.000Z', input: { sectionId: 'section-1', skipped: false } }];
        const pass = compareSessionContinuations({ original: first, restored: second, steps, advance });
        assert.equal(pass.equivalent, true);
        assert.equal(pass.executable, false);
        const altered = structuredClone(second);
        altered.lastFlowResult = { adaptiveDecision: { action: 'REMEDIATE' } };
        const fail = compareSessionContinuations({ original: first, restored: altered, steps, advance });
        assert.equal(fail.equivalent, false);
        assert.ok(fail.mismatches.some(x => x.field === 'lastFlowResult'));
        const changed = structuredClone(second);
        changed.masteryRuntime.evidenceHistoryByNode.n1 = { evidence: 1 };
        const evidenceFail = compareSessionContinuations({ original: first, restored: changed, steps, advance });
        assert.equal(evidenceFail.equivalent, false);
        assert.ok(evidenceFail.mismatches.some(x => x.field === 'masteryRuntime'));
        console.log('PASS: actual StudySession V0.2.0 API imported');
        console.log('PASS: live session snapshot and Student State projection');
        console.log('PASS: real completeLessonItem() continuation equivalent');
        console.log('PASS: lastFlowResult drift detected');
        console.log('PASS: masteryRuntime drift detected');
        console.log('PASS: executable remains false');
        console.log('STATUS: CONTROL-BRANCH SMOKE ONLY; NO RESTORATION ADAPTER PROVEN');
    } catch (error) {
        console.error('FAIL: real-runtime smoke test:', error?.message ?? String(error));
        process.exitCode = 1;
    }
}
