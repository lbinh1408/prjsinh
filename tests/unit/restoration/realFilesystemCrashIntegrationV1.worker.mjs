import path from 'node:path';
import { createDurableAttemptStore } from '../../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../../src/restoration/durableSubmitJournalV3.js';
import { createLiveSessionRevisionAuthority } from '../../../src/restoration/liveSessionRevisionAuthority.js';
import { createMultiAttemptIntegrationV2 } from '../../../src/restoration/multiAttemptIntegrationV2.js';
import { createDurableSessionCommitV1 } from '../../../src/restoration/durableSessionCommitV1.js';
import { createSubmitCheckpointIntegrationV1 } from '../../../src/restoration/submitCheckpointIntegrationV1.js';
export const refs = { lesson: { id: 'lesson', version: '1', sha256: 'a'.repeat(64) } };
export function makeSession(n = 0) { return { runtime: { name: 'StudySession', version: '1', sessionId: 's1', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', status: 'ACTIVE' }, config: {}, state: {}, currentDecision: {}, currentSelection: { status: 'SELECTED' }, currentQuestion: { id: 'q' + n }, lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } }, activeRemediationPlan: null, attempts: Array.from({ length: n }, (_, i) => ({ sessionId: 's1', attemptId: 'a' + i, questionId: 'q' + i })), history: [], masteryRuntime: { evidenceHistoryByNode: {} } }; }
export function setup(root, { crash = '', failpoint = null } = {}) {
    const store = createDurableAttemptStore({ rootDir: path.join(root, 'attempts'), failpoint: crash === 'after-attempt-temp' ? 'afterTempFsync' : null, lockTimeoutMs: 60 });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore: store, lockTimeoutMs: 60 });
    const authority = createLiveSessionRevisionAuthority({ initialSession: makeSession() });
    const submit = ({ session, attemptId }) => { if (crash === 'before-attempt') process.exit(71); return { session: makeSession(session.attempts.length + 1), attempt: { sessionId: 's1', attemptId, questionId: session.currentQuestion.id } }; };
    const realStoreAppend = store.appendAttempt;
    const decoratedStore = Object.freeze({ ...store, appendAttempt(args) { const result = realStoreAppend(args); if (crash === 'after-attempt') process.exit(72); return result; } });
    const realMutate = authority.mutate;
    const decoratedAuthority = Object.freeze({ ...authority, mutate(args) { const result = realMutate(args); if (crash === 'after-authority') process.exit(73); return result; } });
    const multi = createMultiAttemptIntegrationV2({ authority: decoratedAuthority, submit, attemptStore: decoratedStore, journal });
    const commit = createDurableSessionCommitV1({ rootDir: path.join(root, 'checkpoints'), attemptStore: store, journal, lockTimeoutMs: 60, failpoint: crash === 'after-checkpoint-rename' ? 'afterRename' : crash === 'before-checkpoint-rename' ? 'afterTempFsync' : null });
    const realCommit = commit.commit;
    const decoratedCommit = Object.freeze({ ...commit, commit(args) { if (crash === 'before-checkpoint') process.exit(74); return realCommit(args); } });
    const coordinator = createSubmitCheckpointIntegrationV1({ integration: multi, authority: decoratedAuthority, durableCommit: decoratedCommit, journal, contentRefs: refs, now: () => '2026-01-01T00:00:00Z' });
    return { store, journal, authority, multi, commit, coordinator };
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
    const [root, crash, attempts = '1'] = process.argv.slice(2);
    const s = setup(root, { crash });
    for (let i = 0; i < Number(attempts); i++)s.coordinator.submitOnce({ expectedRevision: i, attemptId: 'a' + i });
}
