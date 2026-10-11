/** Process worker for Process Crash & Concurrency Hardening V1 DRAFT. Not a test entrypoint. */
import fs from 'node:fs';
import path from 'node:path';
const [mode, root, arg = ''] = process.argv.slice(2);
const signal = () => process.stdout.write('READY\n');
const stall = () => { signal(); while (true) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000); };
const error = e => { process.stderr.write((e.code || e.message) + '\n'); process.exitCode = 2; };
if (mode === 'hold-attempt-lock') {
    const dir = path.join(root, 'attempts', 'attempts.lock');
    fs.mkdirSync(path.dirname(dir), { recursive: true }); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, token: 'killed-owner' }));
    stall();
} else if (mode === 'hold-journal-lock' || mode === 'hold-checkpoint-lock') {
    const { createHash } = await import('node:crypto');
    const name = createHash('sha256').update('s1').digest('hex') + '.json';
    const dir = mode === 'hold-journal-lock' ? path.join(root, 'journal', name.replace(/\.json$/, '.lock')) : path.join(root, 'checkpoints', name + '.lock');
    fs.mkdirSync(path.dirname(dir), { recursive: true }); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({ pid: process.pid, token: 'killed-owner' }));
    stall();
} else {
    // Crash in the middle of the real filesystem write path, not an injected exception.
    if (mode === 'kill-before-attempt-rename' || mode === 'kill-after-attempt-rename' || mode === 'kill-after-journal-rename' || mode === 'kill-after-checkpoint-rename') {
        const original = fs.renameSync;
        fs.renameSync = function (from, to) {
            const target = String(to);
            const matching = mode.includes('attempt') ? target.endsWith('/attempts/attempts.json') : mode.includes('journal') ? target.includes('/journal/') && target.endsWith('.json') : target.includes('/checkpoints/') && target.endsWith('.json');
            if (matching && mode === 'kill-before-attempt-rename') process.kill(process.pid, 'SIGKILL');
            const result = original.apply(this, arguments);
            if (matching) process.kill(process.pid, 'SIGKILL');
            return result;
        };
    }
    const { createDurableAttemptStore } = await import('../../../src/persistence/durableAttemptStore.js');
    const { createDurableSubmitJournalV3 } = await import('../../../src/restoration/durableSubmitJournalV3.js');
    const { createLiveSessionRevisionAuthority } = await import('../../../src/restoration/liveSessionRevisionAuthority.js');
    const { createMultiAttemptIntegrationV2 } = await import('../../../src/restoration/multiAttemptIntegrationV2.js');
    const { createDurableSessionCommitV1 } = await import('../../../src/restoration/durableSessionCommitV1.js');
    const { createSubmitCheckpointIntegrationV1 } = await import('../../../src/restoration/submitCheckpointIntegrationV1.js');
    const store = createDurableAttemptStore({ rootDir: path.join(root, 'attempts'), lockTimeoutMs: 100, lockPollMs: 5 });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore: store, lockTimeoutMs: 100, lockPollMs: 5 });
    const checkpoint = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoints'), attemptStore: store, journal, lockTimeoutMs: 100, lockPollMs: 5 });
    const attempt = { sessionId: 's1', attemptId: arg || 'a0', questionId: mode === 'race-different' ? String(process.pid) : 'q0' };
    try {
        if (mode.startsWith('race-') || mode === 'probe-attempt') { store.appendAttempt({ sessionId: 's1', attempt }); }
        else if (mode === 'probe-journal') { journal.prepare({ sessionId: 's1', attempt, expectedRevision: 0 }); }
        else if (mode === 'probe-checkpoint') {
            checkpoint.commit({ sessionId: 's1', authority: { inspect() { return { sessionId: 's1', revision: 0, session: { runtime: { sessionId: 's1' }, attempts: [] } }; } }, expectedAuthorityRevision: 0, expectedCheckpointRevision: 0, contentRefs: {}, savedAt: '2026-01-01T00:00:00Z' });
        }
        else {
            const session = n => ({ runtime: { name: 'StudySession', version: '1', sessionId: 's1', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', status: 'ACTIVE' }, config: {}, state: {}, currentDecision: {}, currentSelection: { status: 'SELECTED' }, currentQuestion: { id: 'q' + n }, lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } }, activeRemediationPlan: null, attempts: Array.from({ length: n }, (_, i) => ({ sessionId: 's1', attemptId: 'a' + i, questionId: 'q' + i })), history: [], masteryRuntime: { evidenceHistoryByNode: {} } });
            const authority = createLiveSessionRevisionAuthority({ initialSession: session(0) });
            const multi = createMultiAttemptIntegrationV2({ authority, submit: ({ session: s, attemptId }) => ({ session: session(s.attempts.length + 1), attempt: { sessionId: 's1', attemptId, questionId: s.currentQuestion.id } }), attemptStore: store, journal });
            const coordinator = createSubmitCheckpointIntegrationV1({ integration: multi, authority, durableCommit: checkpoint, journal, contentRefs: { lesson: { id: 'lesson', version: '1', sha256: 'a'.repeat(64) } }, now: () => '2026-01-01T00:00:00Z' });
            coordinator.submitOnce({ expectedRevision: 0, attemptId: 'a0' });
        }
    } catch (e) { error(e); }
}
