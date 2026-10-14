import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { classifyRemediationStopV1 } from '../../../src/engines/orchestration/remediationStopClassifierV1.js';
import { createRemediationStopProvenance } from '../../../src/engines/orchestration/remediationStopProvenance.js';
import { computeLegacyInfeasibleFingerprintV1, computePolicyErrorFingerprintV1 } from '../../../src/engines/orchestration/remediationStopFingerprint.js';
import { encodeCheckpoint } from '../../../src/persistence/checkpointCodec.js';

const canonical = v => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
    : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v);
const sha = v => createHash('sha256').update(canonical(v)).digest('hex');
function freeze(v) { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function fixture(kind) {
    const inputs = { resolverVersion: '1.0.0', targetNodeId: 'K283', bankIdentity: { bankId: 'bank', version: '1' },
        questionBank: { bankId: 'bank', version: '1', primaryNode: 'K283', questions: [] }, selectorConstraints: {}, config: {},
        generationRules: { adaptiveRules: {}, adaptivePaths: {}, knowledgeMap: {}, failureSignatures: {}, remediationRules: null },
        ...(kind === 'POLICY_ERROR' ? { policy: { schemaVersion: '1.0.0', policyId: 'p', policyVersion: '1',
            failureSignatureDefaults: { calculation_error: { difficulty: 'D3', evidenceDimension: 'apply', questionTypes: ['mcq', 'numeric'] } } } } : {}) };
    const stop = { schemaVersion: '1.0.0', status: kind, reasonCode: 'TEST_STOP', triggerAttemptId: 'a', targetNodeId: 'K283',
        bankId: 'bank', bankVersion: '1', configFingerprint: (kind === 'INFEASIBLE' ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1)(inputs),
        ...(kind === 'POLICY_ERROR' ? { policyId: 'p', policyVersion: '1' } : {}) };
    const checkpoint = encodeCheckpoint({ session: { runtime: { name: 'StudySession', version: '1', sessionId: 's',
        startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', status: 'ACTIVE' }, config: {}, state: {},
        currentDecision: {}, currentSelection: null, currentQuestion: null, activeRemediationPlan: null,
        lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } },
        attempts: [{ attemptId: 'a', sessionId: 's' }], history: [], masteryRuntime: { evidenceHistoryByNode: {} },
        extensions: { [kind === 'INFEASIBLE' ? 'remediationGenerationStop' : 'remediationPolicyErrorStop']: stop } },
        revision: 1, savedAt: '2026-01-01T00:00:00Z', persistedAttemptIds: ['a'],
        contentRefs: { lesson: { id: 'lesson', version: '1', sha256: 'a'.repeat(64) } } });
    const source = { sessionId: 's', checkpointRevision: 1, checkpointPayloadSha256: sha(checkpoint) };
    const provenance = createRemediationStopProvenance({ ...source, stopKind: kind, stopFingerprint: stop.configFingerprint,
        fingerprintContract: 'V1', participation: null, generationInputs: inputs });
    return { checkpoint, remediationProvenance: { status: 'VERIFIED', source, provenance },
        currentGenerationInputs: structuredClone(inputs), comparisonSemantics: { fingerprintContract: 'V1', stopKind: kind, participation: null } };
}
const failClosed = input => {
    const r = classifyRemediationStopV1(input); assert.equal(r.status, 'FAIL_CLOSED');
    for (const key of ['retryAuthorized', 'resumeAuthorized', 'remediationGenerationAuthorized', 'migrationAuthorized', 'executable']) assert.equal(r[key], false);
};
for (const kind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`${kind}: matches, drift and deep immutability with explicit null`, () => {
        const f = fixture(kind), before = structuredClone(f);
        const r = classifyRemediationStopV1(freeze(f));
        assert.equal(r.status, 'CURRENT_MATCH'); assert.ok(Object.isFrozen(r)); assert.deepEqual(f, before);
        assert.equal(r.currentFingerprint, f.remediationProvenance.provenance.stopFingerprint);
        const changed = structuredClone(f); changed.currentGenerationInputs.config.timeBudget = 42;
        const drift = classifyRemediationStopV1(changed);
        assert.equal(drift.status, 'RETRY_ELIGIBLE'); assert.equal(drift.retryAuthorized, false);
        assert.equal(drift.currentFingerprint, (kind === 'INFEASIBLE' ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1)(changed.currentGenerationInputs));
        changed.currentGenerationInputs.generationRules.remediationRules = {};
        assert.equal(classifyRemediationStopV1(changed).status, 'RETRY_ELIGIBLE');
    });
    test(`${kind}: missing and invalid current rules are rejected independently`, () => {
        for (const value of [undefined, [], 'rules', 1, false]) {
            const f = fixture(kind); f.currentGenerationInputs.generationRules.remediationRules = value; failClosed(f);
        }
        const f = fixture(kind); delete f.currentGenerationInputs.generationRules.remediationRules; failClosed(f);
        for (const field of ['adaptiveRules', 'adaptivePaths', 'knowledgeMap', 'failureSignatures']) {
            const g = fixture(kind); g.currentGenerationInputs.generationRules[field] = null; failClosed(g);
        }
    });
    test(`${kind}: legacy, malformed, swapped and source/trigger binding failures`, () => {
        for (const mutate of [
            f => { f.remediationProvenance = undefined; },
            f => { f.remediationProvenance.status = 'ABSENT_UNVERIFIED'; f.remediationProvenance.provenance = null; },
            f => { f.remediationProvenance.source.sessionId = 'other'; },
            f => { f.remediationProvenance.source.checkpointRevision++; },
            f => { f.remediationProvenance.source.checkpointPayloadSha256 = '0'.repeat(64); },
            f => { f.remediationProvenance.provenance.sessionId = 'other'; },
            f => { f.remediationProvenance.provenance.checkpointRevision++; },
            f => { f.remediationProvenance.provenance.checkpointPayloadSha256 = '0'.repeat(64); },
            f => { f.remediationProvenance.provenance.stopKind = kind === 'INFEASIBLE' ? 'POLICY_ERROR' : 'INFEASIBLE'; },
            f => { f.remediationProvenance.provenance.inputSha256 = '0'.repeat(64); },
            f => { f.remediationProvenance.provenance.generationInputs.config.changed = true; },
            f => { f.checkpoint.revision++; },
            f => { f.currentGenerationInputs.targetNodeId = 'other'; },
            f => { f.currentGenerationInputs.resolverVersion = '2'; },
            f => { f.currentGenerationInputs.extra = true; }
        ]) { const f = fixture(kind); mutate(f); failClosed(f); }
        const f = fixture(kind); Object.values(f.checkpoint.extensions)[0].triggerAttemptId = 'missing';
        f.remediationProvenance.source.checkpointPayloadSha256 = sha(f.checkpoint);
        f.remediationProvenance.provenance.checkpointPayloadSha256 = sha(f.checkpoint); failClosed(f);
        for (const field of ['targetNodeId', 'bankId', 'bankVersion', ...(kind === 'POLICY_ERROR' ? ['policyId', 'policyVersion'] : [])]) {
            const g = fixture(kind); Object.values(g.checkpoint.extensions)[0][field] = 'wrong';
            g.remediationProvenance.source.checkpointPayloadSha256 = sha(g.checkpoint);
            g.remediationProvenance.provenance.checkpointPayloadSha256 = sha(g.checkpoint); failClosed(g);
        }
    });
    test(`${kind}: semantics are explicit, V1 only, with no inferred participation`, () => {
        for (const semantics of [undefined, {}, { fingerprintContract: 'V1', stopKind: kind },
            { fingerprintContract: 'V2', stopKind: kind, participation: 'AUTHORED' },
            ...['LEGACY', 'AUTHORED', 'unknown'].map(participation => ({ fingerprintContract: 'V1', stopKind: kind, participation }))]) {
            const f = fixture(kind); f.comparisonSemantics = semantics; failClosed(f);
        }
        const f = fixture(kind); f.remediationProvenance.provenance.participation = 'LEGACY'; failClosed(f);
        const g = fixture(kind); g.remediationProvenance.provenance.fingerprintContract = 'V2'; failClosed(g);
    });
}
test('INFEASIBLE does not accept policy fields outside its historical V1 semantics', () => {
    const f = fixture('INFEASIBLE'); f.currentGenerationInputs.policy = {}; failClosed(f);
});
test('POLICY_ERROR rejects invalid/noncanonical current policies and raw invalid historical policies', () => {
    for (const mutate of [p => { p.schemaVersion = '2.0.0'; }, p => { p.failureSignatureDefaults = {}; },
        p => { p.failureSignatureDefaults.calculation_error.questionTypes.reverse(); }]) {
        const f = fixture('POLICY_ERROR'); mutate(f.currentGenerationInputs.policy); failClosed(f);
        const g = fixture('POLICY_ERROR'); mutate(g.remediationProvenance.provenance.generationInputs.policy);
        const p = g.remediationProvenance.provenance;
        const fp = computePolicyErrorFingerprintV1(p.generationInputs);
        Object.values(g.checkpoint.extensions)[0].configFingerprint = fp;
        g.remediationProvenance.source.checkpointPayloadSha256 = sha(g.checkpoint);
        g.remediationProvenance.provenance = createRemediationStopProvenance({ ...p, stopFingerprint: fp, checkpointPayloadSha256: sha(g.checkpoint) });
        failClosed(g);
    }
});
test('POLICY_ERROR valid canonical policy content drift is informational only', () => {
    const f = fixture('POLICY_ERROR'); f.currentGenerationInputs.policy.failureSignatureDefaults.calculation_error.difficulty = 'D4';
    const r = classifyRemediationStopV1(f); assert.equal(r.status, 'RETRY_ELIGIBLE'); assert.equal(r.retryAuthorized, false);
});
test('missing and malformed arguments fail closed', () => {
    for (const value of [undefined, null, false, [], 'invalid']) failClosed(value);
});
