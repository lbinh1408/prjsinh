import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createDurableAttemptStore } from './src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from './src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from './src/restoration/durableSessionCommitV1.js';
import { computeLegacyInfeasibleFingerprintV1, computePolicyErrorFingerprintV1 } from './src/engines/orchestration/remediationStopFingerprint.js';
import { findLatestVerifiedK283Progress } from './k283ProgressContinuationV1.js';

test('fresh installation has no previous progress', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-new-'));
    try { assert.equal(findLatestVerifiedK283Progress({ rootDir: dir, contentRefs: {} }), null); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('malformed checkpoint discovery fails closed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-bad-'));
    try {
        fs.mkdirSync(path.join(dir, 'checkpoints'));
        fs.writeFileSync(path.join(dir, 'checkpoints', 'a'.repeat(64) + '.json'), '{bad');
        assert.throws(() => findLatestVerifiedK283Progress({ rootDir: dir, contentRefs: {} }));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const sha = s => createHash('sha256').update(s).digest('hex');
const refs = { lesson: { id: 'lesson', version: '1', sha256: 'a'.repeat(64) } };
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function persist(rootDir, { kind = 'INFEASIBLE', capture = true, id = 'LIVE-K283-transport', savedAt = '2026-01-01T00:00:00Z' } = {}) {
    const attemptStore = createDurableAttemptStore({ rootDir: path.join(rootDir, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(rootDir, 'journal'), attemptStore });
    const durable = createDurableSessionCommitV1({ rootDir: path.join(rootDir, 'checkpoints'), attemptStore, journal });
    const attempt = { attemptId: id + '-a', sessionId: id, answer: 'A' };
    const generationInputs = { resolverVersion: '1', targetNodeId: 'K283', bankIdentity: { bankId: 'bank', version: '1' },
        questionBank: { bankId: 'bank', version: '1', primaryNode: 'K283', questions: [] }, selectorConstraints: {}, config: {},
        generationRules: { adaptiveRules: {}, adaptivePaths: {}, knowledgeMap: {}, failureSignatures: {}, remediationRules: null },
        ...(kind === 'POLICY_ERROR' ? { policy: { policyId: 'p', policyVersion: '1' } } : {}) };
    const fingerprint = (kind === 'INFEASIBLE' ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1)(generationInputs);
    const stop = { schemaVersion: '1.0.0', status: kind, reasonCode: 'TEST_STOP', triggerAttemptId: id + '-a', targetNodeId: 'K283',
        bankId: 'bank', bankVersion: '1', configFingerprint: fingerprint,
        ...(kind === 'POLICY_ERROR' ? { policyId: 'p', policyVersion: '1' } : {}) };
    const session = { runtime: { name: 'StudySession', version: '1', sessionId: id, startedAt: savedAt, lastActivityAt: savedAt, status: 'ACTIVE' },
        config: {}, state: { knowledge: { K283: { level: 'M4' } } }, currentDecision: { action: 'SKIP' }, currentSelection: null,
        currentQuestion: null, lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } },
        activeRemediationPlan: null, attempts: [attempt], history: ['preserve'], masteryRuntime: { evidenceHistoryByNode: { K283: [] } },
        extensions: { [kind === 'INFEASIBLE' ? 'remediationGenerationStop' : 'remediationPolicyErrorStop']: stop } };
    journal.prepare({ sessionId: id, attempt, expectedRevision: 0 }); journal.markUnknown({ sessionId: id, attemptId: id + '-a' });
    attemptStore.appendAttempt({ sessionId: id, attempt }); journal.reconcile({ sessionId: id, attemptId: id + '-a' });
    const record = durable.commit({ authority: { inspect: () => ({ sessionId: id, revision: 0, session: structuredClone(session) }) },
        sessionId: id, expectedAuthorityRevision: 0, expectedCheckpointRevision: 0, contentRefs: refs, savedAt,
        ...(capture ? { remediationStopCapture: freeze({ stopKind: kind, stopFingerprint: fingerprint, targetNodeId: 'K283', triggerAttemptId: id + '-a', generationInputs }) } : {}) });
    return { record, attemptStore, journal, file: path.join(rootDir, 'checkpoints', sha(id) + '.json'), id };
}
function temporary(fn) {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-transport-'));
    try { return fn(rootDir); } finally { fs.rmSync(rootDir, { recursive: true, force: true }); }
}
for (const kind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`${kind}: selected checkpoint transports detached frozen verified evidence without recomputation`, () => temporary(rootDir => {
        persist(rootDir, { id: 'LIVE-K283-old', savedAt: '2025-01-01T00:00:00Z' });
        const f = persist(rootDir, { kind });
        const attemptsBefore = fs.readFileSync(path.join(rootDir, 'attempts', 'attempts.json'), 'utf8');
        const progress = findLatestVerifiedK283Progress({ rootDir, contentRefs: refs });
        const evidence = progress.remediationProvenance;
        assert.equal(evidence.status, 'VERIFIED');
        assert.deepEqual(evidence.source, { sessionId: f.id, checkpointRevision: f.record.checkpointRevision, checkpointPayloadSha256: f.record.sha256 });
        assert.deepEqual(evidence.provenance, f.record.remediationStopProvenance);
        assert.equal(evidence.provenance.generationInputs.generationRules.remediationRules, null);
        assert.equal(progress.fromSessionId, evidence.source.sessionId);
        assert.deepEqual(progress.checkpoint, f.record.checkpoint);
        assert.deepEqual(progress.studentState, f.record.checkpoint.state);
        assert.deepEqual(progress.evidenceHistoryByNode, f.record.checkpoint.masteryRuntime.evidenceHistoryByNode);
        assert.deepEqual(progress.history, f.record.checkpoint.history);
        assert.equal(fs.readFileSync(path.join(rootDir, 'attempts', 'attempts.json'), 'utf8'), attemptsBefore);
        assert.throws(() => { evidence.source.sessionId = 'other'; }, TypeError);
        assert.throws(() => { evidence.provenance.generationInputs.config.changed = true; }, TypeError);
        f.record.remediationStopProvenance.generationInputs.config.changed = true;
        assert.equal(evidence.provenance.generationInputs.config.changed, undefined);
        assert.deepEqual(findLatestVerifiedK283Progress({ rootDir, contentRefs: refs }).remediationProvenance, evidence);
        for (const flag of ['retryAuthorized', 'resumeAuthorized', 'migrationAuthorized']) assert.notEqual(evidence[flag], true);
    }));
}
test('legacy absence and whole-envelope removal are ABSENT_UNVERIFIED', () => temporary(rootDir => {
    const f = persist(rootDir, { capture: false });
    const result = findLatestVerifiedK283Progress({ rootDir, contentRefs: refs });
    assert.equal(result.remediationProvenance.status, 'ABSENT_UNVERIFIED');
    assert.equal(result.remediationProvenance.provenance, null);
    assert.equal(result.remediationProvenance.source.checkpointPayloadSha256, f.record.sha256);
    const newer = persist(rootDir, { id: 'LIVE-K283-new', savedAt: '2026-02-01T00:00:00Z' });
    const wrapper = JSON.parse(fs.readFileSync(newer.file, 'utf8')); delete wrapper.remediationStopProvenance;
    fs.writeFileSync(newer.file, JSON.stringify(wrapper));
    assert.equal(findLatestVerifiedK283Progress({ rootDir, contentRefs: refs }).remediationProvenance.status, 'ABSENT_UNVERIFIED');
}));
test('corrupt provenance remains fatal, including wrong source bindings', () => temporary(rootDir => {
    const f = persist(rootDir); const original = JSON.parse(fs.readFileSync(f.file, 'utf8'));
    for (const mutate of [
        w => { w.remediationStopProvenance = null; },
        w => { w.remediationStopProvenance.sessionId = 'LIVE-K283-other'; },
        w => { w.remediationStopProvenance.checkpointRevision++; },
        w => { w.remediationStopProvenance.checkpointPayloadSha256 = '0'.repeat(64); }
    ]) {
        const w = structuredClone(original); mutate(w); fs.writeFileSync(f.file, JSON.stringify(w));
        assert.throws(() => findLatestVerifiedK283Progress({ rootDir, contentRefs: refs }), { code: 'SESSION_COMMIT_CORRUPT' });
    }
}));
test('journal/Attempt sequence drift remains fatal instead of yielding evidence', () => temporary(rootDir => {
    const f = persist(rootDir);
    const attempt = { sessionId: f.id, attemptId: 'b' };
    f.journal.prepare({ sessionId: f.id, attempt, expectedRevision: 1 });
    f.journal.markUnknown({ sessionId: f.id, attemptId: 'b' });
    f.attemptStore.appendAttempt({ sessionId: f.id, attempt });
    assert.throws(() => findLatestVerifiedK283Progress({ rootDir, contentRefs: refs }), { code: 'SESSION_COMMIT_ATTEMPT_SEQUENCE_CONFLICT' });
}));
test('observed wrapper replacement during reconciliation is rejected', t => temporary(rootDir => {
    const f = persist(rootDir); const originalRead = fs.readFileSync; let reads = 0;
    t.mock.method(fs, 'readFileSync', function (name, ...args) {
        const raw = originalRead.call(this, name, ...args);
        if (String(name).endsWith(sha(f.id) + '.json') && String(name).includes('/checkpoints/') && ++reads === 4) {
            const w = JSON.parse(raw); w.authorityRevision++;
            return JSON.stringify(w);
        }
        return raw;
    });
    assert.throws(() => findLatestVerifiedK283Progress({ rootDir, contentRefs: refs }), /K283_PREVIOUS_CHECKPOINT_CHANGED_DURING_AUDIT/);
    t.mock.restoreAll();
}));
