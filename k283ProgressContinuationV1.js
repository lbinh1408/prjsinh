/** New-session progress continuation, NOT same-session recovery. */
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createDurableAttemptStore } from './src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from './src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from './src/restoration/durableSessionCommitV1.js';
import { decodeCheckpoint } from './src/persistence/checkpointCodec.js';

function freezeTree(value) {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(freezeTree);
        Object.freeze(value);
    }
    return value;
}

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
        const audit = durable.audit({ sessionId: wrapper.sessionId });
        if (audit.status !== 'CHECKPOINT_MATCHED') throw new Error('K283_PREVIOUS_SESSION_NOT_AUDITED');
        // Reconciliation must refer to the same source snapshot we transport.
        // This detects observed drift; it is not a cross-store transaction or recovery proof.
        const afterAudit = durable.read({ sessionId: wrapper.sessionId });
        if (!record || audit.checkpointRevision !== record.checkpointRevision ||
            audit.authorityRevision !== record.authorityRevision || !isDeepStrictEqual(record, afterAudit)) {
            throw new Error('K283_PREVIOUS_CHECKPOINT_CHANGED_DURING_AUDIT');
        }
        if (!record.checkpoint.state || !record.checkpoint.masteryRuntime?.evidenceHistoryByNode) throw new Error('K283_CHECKPOINT_MISSING_PROGRESS');
        candidates.push(record);
    }
    candidates.sort((a, b) => b.checkpoint.savedAt.localeCompare(a.checkpoint.savedAt));
    const latest = candidates[0];
    if (!latest) return null;
    const checkpoint = decodeCheckpoint(latest.checkpoint);
    // A policy-error stop must reach bootstrap so its fingerprint can classify
    // changed content as RETRY_ELIGIBLE; other continuation remains strict.
    const changed = diffK283ContentRefs(latest.checkpoint.contentRefs, contentRefs);
    const hasPolicyErrorStop =
        latest.checkpoint.extensions?.remediationPolicyErrorStop !== undefined;
    if (changed.length > 0 && !hasPolicyErrorStop) {
        throw new Error(`K283_LATEST_CONTENT_CHANGED_CONTINUATION_BLOCKED: session=${latest.sessionId}; changedRefs=${changed.join(',')}`);
    }
    return {
        // Presence here means durable.read verified the envelope, never merely the checkpoint.
        // Missing provenance remains unverified, including indistinguishable whole-member deletion.
        // Detached immutable evidence only: no retry/resume/migration authorization.
        remediationProvenance: freezeTree({
            status: Object.hasOwn(latest, 'remediationStopProvenance') ? 'VERIFIED' : 'ABSENT_UNVERIFIED',
            source: {
                sessionId: latest.sessionId,
                checkpointRevision: latest.checkpointRevision,
                checkpointPayloadSha256: latest.sha256
            },
            provenance: Object.hasOwn(latest, 'remediationStopProvenance')
                ? structuredClone(latest.remediationStopProvenance) : null
        }),
        fromSessionId: latest.sessionId,
        savedAt: latest.checkpoint.savedAt,
        studentState: structuredClone(checkpoint.state.studentState ?? checkpoint.state),
        evidenceHistoryByNode: structuredClone(checkpoint.masteryRuntime.evidenceHistoryByNode),
        history: structuredClone(checkpoint.history ?? []),
        checkpoint,
        remediationGenerationStop: checkpoint.extensions?.remediationGenerationStop
            ? structuredClone(checkpoint.extensions.remediationGenerationStop)
            : null,
        remediationPolicyErrorStop: checkpoint.extensions?.remediationPolicyErrorStop
            ? structuredClone(checkpoint.extensions.remediationPolicyErrorStop)
            : null
    };
}

/** Order-independent strict identity check. Missing/extra refs and fields fail closed. */
export function diffK283ContentRefs(previous, current) {
    if (!previous || !current || typeof previous !== 'object' || typeof current !== 'object' ||
        Array.isArray(previous) || Array.isArray(current)) return ['invalidContentRefs'];
    const keys = [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort();
    if (keys.length === 0) return ['emptyContentRefs'];
    return keys.filter(key => {
        const a = previous[key];
        const b = current[key];
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object' ||
            Array.isArray(a) || Array.isArray(b)) return true;
        const fields = ['id', 'version', 'sha256'];
        if (Object.keys(a).length !== 3 || Object.keys(b).length !== 3) return true;
        return fields.some(field => typeof a[field] !== 'string' || !a[field] || a[field] !== b[field]);
    });
}
