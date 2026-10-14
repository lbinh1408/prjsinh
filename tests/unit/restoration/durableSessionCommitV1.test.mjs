import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { computeLegacyInfeasibleFingerprintV1, computePolicyErrorFingerprintV1 } from '../../../src/engines/orchestration/remediationStopFingerprint.js';
import { createDurableSessionCommitV1 } from '../../../src/restoration/durableSessionCommitV1.js';
const ref = { lesson: { id: 'lesson', version: '1', sha256: 'a'.repeat(64) } };
const session = () => ({ runtime: { name: 'StudySession', version: '1', sessionId: 's', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', status: 'ACTIVE' }, config: {}, state: {}, currentDecision: {}, currentSelection: null, currentQuestion: null, lessonRuntime: { currentItem: null, progress: { completedSectionIds: [], skippedSectionIds: [] } }, activeRemediationPlan: null, attempts: [{ attemptId: 'a', sessionId: 's', answer: 'A' }], history: [], masteryRuntime: { evidenceHistoryByNode: {} } });
function fixture({ failpoint = null } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-commit-v1-'));
    let current = session(), revision = 1;
    const authority = { inspect: () => ({ sessionId: 's', revision, session: structuredClone(current) }) };
    const store = { getAttempt: ({ attemptId }) => attemptId === 'a' ? structuredClone(current.attempts[0]) : null, listAttemptIds: () => current.attempts.map(a => a.attemptId) };
    const journal = { read: () => ({ entries: [{ attemptId: 'a', state: 'COMMITTED' }] }), reconcile: () => ({ status: 'COMMITTED', verification: 'ATTEMPT_MATCHED', externalAttemptCommitVerified: true }) };
    const make = () => createDurableSessionCommitV1({ rootDir: root, attemptStore: store, journal, failpoint });
    return { root, authority, store, journal, make, update: (s, r) => { current = s; revision = r }, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
const args = f => ({ authority: f.authority, sessionId: 's', expectedAuthorityRevision: 1, expectedCheckpointRevision: 0, contentRefs: ref, savedAt: '2026-01-01T00:00:00Z' });
test('1 durable checkpoint and read', () => { const f = fixture(); try { const v = f.make().commit(args(f)); assert.equal(v.checkpointRevision, 1); assert.deepEqual(v.checkpoint.attemptIds, ['a']); } finally { f.cleanup() } });
test('2 restart read', () => { const f = fixture(); try { f.make().commit(args(f)); assert.equal(f.make().read({ sessionId: 's' }).checkpointRevision, 1); } finally { f.cleanup() } });
test('3 audit matches journal', () => { const f = fixture(); try { f.make().commit(args(f)); assert.equal(f.make().audit({ sessionId: 's' }).status, 'CHECKPOINT_MATCHED'); } finally { f.cleanup() } });
test('4 no resume authorization', () => { const f = fixture(); try { const r = f.make().commit(args(f)); assert.equal(r.resumeAuthorized, false); assert.equal(r.durableSessionCommitProven, false); } finally { f.cleanup() } });
test('5 stale checkpoint CAS', () => { const f = fixture(); try { f.make().commit(args(f)); assert.throws(() => f.make().commit(args(f)), { code: 'SESSION_COMMIT_REVISION_CONFLICT' }); } finally { f.cleanup() } });
test('6 authority revision mismatch', () => { const f = fixture(); try { assert.throws(() => f.make().commit({ ...args(f), expectedAuthorityRevision: 2 }), { code: 'SESSION_COMMIT_AUTHORITY_CONFLICT' }); } finally { f.cleanup() } });
test('7 temp fsync failure preserves absence', () => { const f = fixture({ failpoint: 'afterTempFsync' }); try { assert.throws(() => f.make().commit(args(f)), { code: 'SESSION_COMMIT_INJECTED_FAILURE' }); assert.equal(f.make().read({ sessionId: 's' }), null); } finally { f.cleanup() } });
test('8 after rename ambiguous, re-read', () => { const f = fixture({ failpoint: 'afterRename' }); try { assert.throws(() => f.make().commit(args(f)), { code: 'SESSION_COMMIT_INJECTED_FAILURE' }); assert.equal(f.make().read({ sessionId: 's' }).checkpointRevision, 1); } finally { f.cleanup() } });
test('9 no checkpoint audit', () => { const f = fixture(); try { assert.equal(f.make().audit({ sessionId: 's' }).status, 'NO_CHECKPOINT'); } finally { f.cleanup() } });
test('10 corrupted checkpoint rejected', () => { const f = fixture(); try { f.make().commit(args(f)); const file = fs.readdirSync(f.root).find(x => x.endsWith('.json')); fs.writeFileSync(path.join(f.root, file), '{}'); assert.throws(() => f.make().read({ sessionId: 's' }), { code: 'SESSION_COMMIT_CORRUPT' }); } finally { f.cleanup() } });
test('11 next checkpoint revision after session mutation', () => { const f = fixture(); try { f.make().commit(args(f)); const s = session(); s.history = ['later']; f.update(s, 2); const v = f.make().commit({ ...args(f), expectedAuthorityRevision: 2, expectedCheckpointRevision: 1 }); assert.equal(v.checkpointRevision, 2); } finally { f.cleanup() } });
test('12 invalid session identity rejected', () => { const f = fixture(); try { assert.throws(() => f.make().commit({ ...args(f), sessionId: 'other' }), { code: 'SESSION_COMMIT_AUTHORITY_CONFLICT' }); } finally { f.cleanup() } });

const digest = value => createHash('sha256').update(value).digest('hex');
const canonicalJson = value => JSON.stringify(value, function (key, item) {
    return item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(Object.keys(item).sort().map(k => [k, item[k]])) : item;
});
function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
function stopFixture(kind) {
    const generationInputs = {
        resolverVersion: '1.0.0', targetNodeId: 'K283',
        bankIdentity: { bankId: 'bank', version: '1' },
        questionBank: { bankId: 'bank', version: '1', primaryNode: 'K283', questions: [] },
        selectorConstraints: {}, config: { timeBudget: 60 },
        generationRules: { adaptiveRules: {}, adaptivePaths: {}, knowledgeMap: {}, failureSignatures: {}, remediationRules: {} },
        ...(kind === 'POLICY_ERROR' ? { policy: { policyId: 'policy', policyVersion: '1' } } : {})
    };
    const fingerprint = (kind === 'INFEASIBLE' ? computeLegacyInfeasibleFingerprintV1 : computePolicyErrorFingerprintV1)(generationInputs);
    const stop = { schemaVersion: '1.0.0', status: kind, reasonCode: 'TEST_STOP', triggerAttemptId: 'a',
        targetNodeId: 'K283', bankId: 'bank', bankVersion: '1', configFingerprint: fingerprint,
        ...(kind === 'POLICY_ERROR' ? { policyId: 'policy', policyVersion: '1' } : {}) };
    const s = session();
    s.extensions = { [kind === 'INFEASIBLE' ? 'remediationGenerationStop' : 'remediationPolicyErrorStop']: stop };
    // Deliberately different from the generation-time capture.
    s.config = { timeBudget: 999 };
    return { s, stop, capture: freeze({ stopKind: kind, stopFingerprint: fingerprint, targetNodeId: 'K283',
        triggerAttemptId: 'a', generationInputs }) };
}
const wrapperPath = f => path.join(f.root, digest('s') + '.json');
const rawWrapper = f => JSON.parse(fs.readFileSync(wrapperPath(f), 'utf8'));
const writeWrapper = (f, wrapper) => fs.writeFileSync(wrapperPath(f), canonicalJson(wrapper));

for (const kind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`${kind}: captured inputs round-trip with checkpoint bindings and no replay`, () => {
        const f = fixture();
        try {
            const { s, capture } = stopFixture(kind); f.update(s, 1);
            const before = f.authority.inspect();
            const result = f.make().commit({ ...args(f), remediationStopCapture: capture });
            const wrapper = rawWrapper(f), p = result.remediationStopProvenance;
            assert.deepEqual(p.generationInputs, capture.generationInputs);
            assert.equal(p.sessionId, 's'); assert.equal(p.checkpointRevision, 1);
            assert.equal(p.checkpointPayloadSha256, digest(wrapper.checkpointPayload));
            assert.equal(wrapper.sha256, p.checkpointPayloadSha256);
            assert.equal(p.fingerprintContract, 'V1'); assert.equal(p.participation, null);
            assert.deepEqual(f.authority.inspect(), before);
            assert.equal(Object.hasOwn(result.checkpoint.extensions, 'remediationStopProvenance'), false);
            // Durable read must not consult/replay Attempts or reconcile the journal.
            f.store.getAttempt = f.store.listAttemptIds = f.journal.read = f.journal.reconcile = () => { throw Error('unexpected replay/store access'); };
            const reread = f.make().read({ sessionId: 's' });
            assert.deepEqual(reread, result);
            for (const flag of ['resumeAuthorized', 'retryAuthorized', 'executable', 'crossStoreAtomicityProven', 'durableSessionCommitProven']) assert.equal(reread[flag], false);
        } finally { f.cleanup(); }
    });

    test(`${kind}: invalid supplied capture never downgrades or replaces existing wrapper`, () => {
        const f = fixture();
        try {
            f.make().commit(args(f)); const original = fs.readFileSync(wrapperPath(f), 'utf8');
            const { s, capture } = stopFixture(kind); f.update(s, 2);
            const variants = [null, undefined, {}, structuredClone(capture)];
            for (const field of Object.keys(capture)) { const c = structuredClone(capture); delete c[field]; variants.push(freeze(c)); }
            for (const field of ['stopKind', 'stopFingerprint', 'targetNodeId', 'triggerAttemptId']) {
                variants.push(freeze({ ...structuredClone(capture), [field]: 'wrong' }));
            }
            for (const mutate of [
                c => { c.extra = true; },
                c => { c.generationInputs.bankIdentity.version = 'wrong'; },
                c => { c.generationInputs.questionBank.bankId = 'wrong'; },
                c => { c.generationInputs.config.timeBudget = 10; },
                c => { delete c.generationInputs.generationRules; },
                c => { c.generationInputs.config.bad = undefined; },
                ...(kind === 'POLICY_ERROR' ? [c => { c.generationInputs.policy.policyId = 'wrong'; }] : [])
            ]) { const c = structuredClone(capture); mutate(c); variants.push(freeze(c)); }
            for (const c of variants) {
                assert.throws(() => f.make().commit({ ...args(f), expectedAuthorityRevision: 2, expectedCheckpointRevision: 1,
                    remediationStopCapture: c }), { code: 'SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID' });
                assert.equal(fs.readFileSync(wrapperPath(f), 'utf8'), original);
                assert.deepEqual(fs.readdirSync(f.root), [path.basename(wrapperPath(f))]);
            }
            s.attempts[0].sessionId = 'other'; f.update(s, 2);
            assert.throws(() => f.make().commit({ ...args(f), expectedAuthorityRevision: 2, expectedCheckpointRevision: 1,
                remediationStopCapture: capture }), { code: 'SESSION_COMMIT_REMEDIATION_CAPTURE_INVALID' });
        } finally { f.cleanup(); }
    });

    test(`${kind}: present corrupt provenance and checkpoint bindings fail closed`, () => {
        const f = fixture();
        try {
            const { s, capture } = stopFixture(kind); f.update(s, 1);
            f.make().commit({ ...args(f), remediationStopCapture: capture }); const original = rawWrapper(f);
            const changes = [
                w => { w.remediationStopProvenance = null; },
                ...Object.keys(original.remediationStopProvenance).map(field => w => { delete w.remediationStopProvenance[field]; }),
                ...['sessionId', 'checkpointRevision', 'checkpointPayloadSha256', 'stopKind', 'stopFingerprint', 'inputSha256', 'fingerprintContract', 'participation'].map(field => w => { w.remediationStopProvenance[field] = field === 'checkpointRevision' ? 2 : 'wrong'; }),
                w => { w.remediationStopProvenance.generationInputs.config.timeBudget++; },
                w => { w.remediationStopProvenance.extra = true; }
            ];
            // Rehash the checkpoint AND update the provenance payload binding: metadata checks must still reject.
            for (const field of ['triggerAttemptId', 'targetNodeId', 'bankId', 'bankVersion', ...(kind === 'POLICY_ERROR' ? ['policyId', 'policyVersion'] : [])]) {
                changes.push(w => {
                    const checkpoint = JSON.parse(w.checkpointPayload);
                    Object.values(checkpoint.extensions)[0][field] = 'wrong';
                    w.checkpointPayload = canonicalJson(checkpoint); w.sha256 = digest(w.checkpointPayload);
                    w.remediationStopProvenance.checkpointPayloadSha256 = w.sha256;
                });
            }
            for (const change of changes) {
                const w = structuredClone(original); change(w); writeWrapper(f, w);
                assert.throws(() => f.make().read({ sessionId: 's' }), { code: 'SESSION_COMMIT_CORRUPT' });
            }
            // Entire-member deletion is explicitly NOT detectable under legacy compatibility.
            const legacy = structuredClone(original); delete legacy.remediationStopProvenance; writeWrapper(f, legacy);
            assert.equal(Object.hasOwn(f.make().read({ sessionId: 's' }), 'remediationStopProvenance'), false);
        } finally { f.cleanup(); }
    });

    test(`${kind}: legacy bytes unchanged and no automatic provenance carry-forward`, () => {
        const f = fixture();
        try {
            const { s, capture } = stopFixture(kind); f.update(s, 1);
            const legacy = f.make().commit(args(f)); const w = rawWrapper(f);
            assert.deepEqual(Object.keys(w).sort(), ['authorityRevision', 'checkpointPayload', 'checkpointRevision', 'format', 'sessionId', 'sha256'].sort());
            assert.equal(fs.readFileSync(wrapperPath(f), 'utf8'), canonicalJson({ format: 'durable-session-commit-v1', sessionId: 's',
                authorityRevision: 1, checkpointRevision: 1, checkpointPayload: canonicalJson(legacy.checkpoint), sha256: digest(canonicalJson(legacy.checkpoint)) }));
            f.make().commit({ ...args(f), expectedCheckpointRevision: 1, remediationStopCapture: capture });
            const next = f.make().commit({ ...args(f), expectedCheckpointRevision: 2 });
            assert.equal(Object.hasOwn(next, 'remediationStopProvenance'), false);
            assert.equal(Object.hasOwn(rawWrapper(f), 'remediationStopProvenance'), false);
        } finally { f.cleanup(); }
    });

    for (const failpoint of ['afterTempFsync', 'afterRename']) for (const replacing of [false, true]) {
        test(`${kind}: ${failpoint}, replacing=${replacing}, checkpoint/provenance stay together`, () => {
            const f = fixture();
            try {
                const { s, capture } = stopFixture(kind); f.update(s, 1);
                if (replacing) f.make().commit({ ...args(f), remediationStopCapture: capture });
                const previous = replacing ? fs.readFileSync(wrapperPath(f), 'utf8') : null;
                const failing = createDurableSessionCommitV1({ rootDir: f.root, attemptStore: f.store, journal: f.journal, failpoint });
                assert.throws(() => failing.commit({ ...args(f), expectedCheckpointRevision: replacing ? 1 : 0,
                    remediationStopCapture: capture }), { code: 'SESSION_COMMIT_INJECTED_FAILURE' });
                const observed = f.make().read({ sessionId: 's' });
                if (failpoint === 'afterTempFsync') {
                    if (replacing) assert.equal(fs.readFileSync(wrapperPath(f), 'utf8'), previous);
                    else assert.equal(observed, null);
                } else {
                    assert.equal(observed.checkpointRevision, replacing ? 2 : 1);
                    assert.equal(observed.remediationStopProvenance.checkpointRevision, observed.checkpointRevision);
                    assert.equal(observed.remediationStopProvenance.checkpointPayloadSha256, observed.sha256);
                    assert.deepEqual(observed.remediationStopProvenance.generationInputs, capture.generationInputs);
                    assert.equal(observed.retryAuthorized, false);
                }
                assert.equal(fs.readdirSync(f.root).some(name => name.endsWith('.tmp') || name.endsWith('.lock')), false);
            } finally { f.cleanup(); }
        });
    }
}
