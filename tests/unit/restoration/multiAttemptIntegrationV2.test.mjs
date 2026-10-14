import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMultiAttemptIntegrationV2 } from '../../../src/restoration/multiAttemptIntegrationV2.js';
import { createLiveSessionRevisionAuthority } from '../../../src/restoration/liveSessionRevisionAuthority.js';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
function fixture({ failpoint, submitOverride } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-v2-'));
    const session = n => ({ runtime: { name: 'StudySession', sessionId: 's1' }, currentSelection: { status: 'SELECTED' }, currentQuestion: { id: 'q' + n }, count: n });
    const authority = createLiveSessionRevisionAuthority({ initialSession: session(0) });
    const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, 'attempts'), failpoint });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore });
    const submit = submitOverride ?? (({ session: s, attemptId }) => ({ session: session(s.count + 1), attempt: { sessionId: 's1', attemptId, questionId: s.currentQuestion.id } }));
    const create = () => createMultiAttemptIntegrationV2({ authority, attemptStore, journal, submit });
    return { root, authority, attemptStore, journal, create, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
function run(f, id, rev) { return f.submitOnce({ attemptId: id, expectedRevision: rev }); }
test('1 two consecutive attempts in same session', () => { const x = fixture(); try { const f = x.create(); assert.equal(run(f, 'a', 0).revision, 1); assert.equal(run(f, 'b', 1).revision, 2); assert.equal(x.journal.list({ sessionId: 's1' }).length, 2); assert.equal(x.attemptStore.countAttempts({ sessionId: 's1' }), 2); } finally { x.cleanup(); } });
test('2 three attempts remain individually auditable', () => { const x = fixture(); try { const f = x.create(); for (let i = 0; i < 3; i++)run(f, 'a' + i, i); for (let i = 0; i < 3; i++)assert.equal(f.reconcile({ attemptId: 'a' + i }).verification, 'ATTEMPT_MATCHED'); } finally { x.cleanup(); } });
test('3 duplicate attempt blocks instance', () => { const x = fixture(); try { const f = x.create(); run(f, 'a', 0); assert.throws(() => run(f, 'a', 1)); assert.equal(f.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => run(f, 'b', 1)); } finally { x.cleanup(); } });
test('4 stale revision does not mutate', () => { const x = fixture(); try { const f = x.create(); run(f, 'a', 0); assert.throws(() => run(f, 'b', 0), { code: 'MULTI_V2_REVISION_CONFLICT' }); assert.equal(x.authority.inspect().revision, 1); } finally { x.cleanup(); } });
test('5 crash-like failure after Attempt rename blocks and reconciles', () => { const x = fixture({ failpoint: 'afterRename' }); try { const f = x.create(); assert.throws(() => run(f, 'a', 0), { code: 'ATTEMPT_STORE_INJECTED_FAILURE' }); assert.equal(f.inspect().phase, 'COMMIT_UNKNOWN'); assert.equal(f.reconcile({ attemptId: 'a' }).verification, 'ATTEMPT_MATCHED'); assert.equal(x.authority.inspect().revision, 0); assert.throws(() => run(f, 'b', 0)); } finally { x.cleanup(); } });
test('6 after temp fsync, attempt absent and retry still blocked', () => { const x = fixture({ failpoint: 'afterTempFsync' }); try { const f = x.create(); assert.throws(() => run(f, 'a', 0)); assert.equal(f.reconcile({ attemptId: 'a' }).verification, 'ATTEMPT_NOT_FOUND'); assert.equal(f.inspect().retryAuthorized, false); } finally { x.cleanup(); } });
test('7 new instance refuses pre-existing journal even committed', () => { const x = fixture(); try { run(x.create(), 'a', 0); assert.throws(() => x.create(), { code: 'MULTI_V2_EXISTING_JOURNAL_REQUIRES_RECOVERY_PROOF' }); } finally { x.cleanup(); } });
test('8 authority drift is refused', () => { const x = fixture(); try { const f = x.create(); x.authority.mutate({ expectedRevision: 0, apply: s => s }); assert.throws(() => run(f, 'a', 1), { code: 'MULTI_V2_AUTHORITY_DRIFT' }); } finally { x.cleanup(); } });
test('9 submit callback failure blocks', () => { const x = fixture({ submitOverride: () => { throw Error('oops') } }); try { const f = x.create(); assert.throws(() => run(f, 'a', 0)); assert.equal(f.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => run(f, 'b', 0)); } finally { x.cleanup(); } });
test('10 asynchronous submit is rejected', () => { const x = fixture({ submitOverride: () => Promise.resolve({}) }); try { assert.throws(() => run(x.create(), 'a', 0), { code: 'MULTI_V2_ASYNC_UNSUPPORTED' }); } finally { x.cleanup(); } });
test('11 capture allowed only while idle', () => { const x = fixture(); try { const f = x.create(); assert.equal(f.capturePreSubmit({ expectedRevision: 0, readSnapshot: s => ({ n: s.count }) }).snapshot.n, 0); run(f, 'a', 0); assert.equal(f.capturePreSubmit({ expectedRevision: 1, readSnapshot: s => ({ n: s.count }) }).snapshot.n, 1); } finally { x.cleanup(); } });
test('12 result never authorizes resume/retry', () => { const x = fixture(); try { const f = x.create(); const r = run(f, 'a', 0); assert.equal(r.resumeAuthorized, false); assert.equal(r.retryAuthorized, false); assert.equal(r.durableSessionCommitProven, false); assert.equal(r.crossStoreAtomicityProven, false); } finally { x.cleanup(); } });
test('13 transient remediation capture is forwarded unchanged', () => {
    const capture = Object.freeze({ stopKind: 'INFEASIBLE', stopFingerprint: 'a'.repeat(64), targetNodeId: 'K283', triggerAttemptId: 'a', generationInputs: Object.freeze({ targetNodeId: 'K283' }) });
    const x = fixture({
        submitOverride: ({ session: s, attemptId }) => ({
            session: { ...s, count: s.count + 1, currentSelection: null, currentQuestion: null, attempts: [{ sessionId: 's1', attemptId }] },
            attempt: { sessionId: 's1', attemptId, questionId: s.currentQuestion.id },
            remediationStopCapture: capture
        })
    });
    try {
        const result = run(x.create(), 'a', 0);
        assert.equal(result.remediationStopCapture, capture);
        assert.equal(x.authority.inspect().session.remediationStopCapture, undefined);
    } finally { x.cleanup(); }
});
test('14 explicitly undefined capture is rejected instead of silently dropped', () => {
    const x = fixture({
        submitOverride: ({ session: s, attemptId }) => ({
            session: { ...s, count: s.count + 1, currentSelection: null, currentQuestion: null },
            attempt: { sessionId: 's1', attemptId, questionId: s.currentQuestion.id },
            remediationStopCapture: undefined
        })
    });
    try {
        assert.throws(() => run(x.create(), 'a', 0), { code: 'MULTI_V2_REMEDIATION_CAPTURE_INVALID' });
        assert.equal(x.attemptStore.countAttempts({ sessionId: 's1' }), 0);
    } finally { x.cleanup(); }
});
