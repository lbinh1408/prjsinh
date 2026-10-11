/** New-session progress continuation, NOT same-session recovery. */
import fs from 'node:fs';
import path from 'node:path';
import { createDurableAttemptStore } from './src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from './src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from './src/restoration/durableSessionCommitV1.js';

export function findLatestVerifiedK283Progress({ rootDir, contentRefs } = {}) {
    const dir = path.join(rootDir, 'checkpoints');
    if (!fs.existsSync(dir)) return null;
    const attemptStore = createDurableAttemptStore({ rootDir: path.join(rootDir, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(rootDir, 'journal'), attemptStore });
    const durable = createDurableSessionCommitV1({ rootDir: dir, attemptStore, journal });
    const candidates = [];
    for (const name of fs.readdirSync(dir)) {
        if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
        // Discovery only: authoritative verification is durable.read + audit below.
        const wrapper = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        if (typeof wrapper.sessionId !== 'string' || !wrapper.sessionId.startsWith('LIVE-K283-')) continue;
        const record = durable.read({ sessionId: wrapper.sessionId });
        if (durable.audit({ sessionId: wrapper.sessionId }).status !== 'CHECKPOINT_MATCHED') throw new Error('K283_PREVIOUS_SESSION_NOT_AUDITED');
        if (!record.checkpoint.state || !record.checkpoint.masteryRuntime?.evidenceHistoryByNode) throw new Error('K283_CHECKPOINT_MISSING_PROGRESS');
        candidates.push(record);
    }
    candidates.sort((a, b) => b.checkpoint.savedAt.localeCompare(a.checkpoint.savedAt));
    const latest = candidates[0];
    if (!latest) return null;
    // Compare content against the newest VERIFIED checkpoint only. An older
    // checkpoint may refer to an earlier version of the question bank.
    if (JSON.stringify(latest.checkpoint.contentRefs) !== JSON.stringify(contentRefs)) {
        const previous = latest.checkpoint.contentRefs ?? {};
        const current = contentRefs ?? {};
        const changed = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
            .filter(key => JSON.stringify(previous[key]) !== JSON.stringify(current[key]));
        throw new Error(`K283_LATEST_CONTENT_CHANGED_CONTINUATION_BLOCKED: session=${latest.sessionId}; changedRefs=${changed.join(',') || 'unknown'}`);
    }
    return {
        fromSessionId: latest.sessionId,
        savedAt: latest.checkpoint.savedAt,
        studentState: structuredClone(latest.checkpoint.state.studentState),
        evidenceHistoryByNode: structuredClone(latest.checkpoint.masteryRuntime.evidenceHistoryByNode)
    };
}
