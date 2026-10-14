import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmitCheckpointIntegrationV1 } from '../../../src/restoration/submitCheckpointIntegrationV1.js';
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from '../../../src/engines/orchestration/remediationStopFingerprint.js';

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}

function makeCapture(stopKind, attemptId) {
    const generationInputs = {
        resolverVersion: '1.0.0',
        targetNodeId: 'K283',
        bankIdentity: { bankId: 'QB-K283', version: '1.0.0' },
        questionBank: { bankId: 'QB-K283', version: '1.0.0', primaryNode: 'K283', questions: [{ id: 'Q1' }] },
        selectorConstraints: {},
        config: { learningMode: 'HOC_SAU', timeBudget: 60 },
        generationRules: {
            adaptiveRules: {}, adaptivePaths: {}, knowledgeMap: {}, failureSignatures: {}, remediationRules: {}
        },
        ...(stopKind === 'POLICY_ERROR'
            ? { policy: { policyId: 'policy-1', policyVersion: '1.0.0', content: { enabled: true } } }
            : {})
    };
    const stopFingerprint = stopKind === 'INFEASIBLE'
        ? computeLegacyInfeasibleFingerprintV1(generationInputs)
        : computePolicyErrorFingerprintV1(generationInputs);
    return deepFreeze({
        stopKind,
        stopFingerprint,
        targetNodeId: 'K283',
        triggerAttemptId: attemptId,
        generationInputs
    });
}

function fixture({ failAt = null, existing = false, captureFactory = null } = {}) {
    const sessionId = 'session-1';
    let revision = 0, count = 0, saved = null, entries = [], sessionExtensions;
    let commitCapture;
    const authority = {
        inspect: () => ({
            sessionId, revision,
            session: {
                runtime: { sessionId },
                attempts: entries.map(e => ({ attemptId: e.attemptId, sessionId })),
                ...(sessionExtensions ? { extensions: sessionExtensions } : {})
            }
        })
    };
    const journal = { read: () => existing ? { entries: [] } : entries.length ? { entries: entries.map(e => ({ ...e })) } : null };
    const integration = {
        inspect: () => ({ phase: 'IDLE', completed: count, ownedRevision: revision }),
        submitOnce: ({ expectedRevision, attemptId }) => {
            if (failAt === 'upstream') throw Error('upstream');
            assert.equal(expectedRevision, revision);
            entries.push({ attemptId, state: 'COMMITTED' }); revision++; count++;
            const capture = captureFactory?.(attemptId, count) ?? null;
            if (capture) {
                const stopField = capture.stopKind === 'INFEASIBLE'
                    ? 'remediationGenerationStop'
                    : 'remediationPolicyErrorStop';
                sessionExtensions = {
                    [stopField]: {
                        status: capture.stopKind,
                        triggerAttemptId: capture.triggerAttemptId,
                        targetNodeId: capture.targetNodeId,
                        bankId: capture.generationInputs.bankIdentity.bankId,
                        bankVersion: capture.generationInputs.bankIdentity.version,
                        configFingerprint: capture.stopFingerprint,
                        ...(capture.stopKind === 'POLICY_ERROR'
                            ? {
                                policyId: capture.generationInputs.policy.policyId,
                                policyVersion: capture.generationInputs.policy.policyVersion
                            }
                            : {})
                    }
                };
            }
            return {
                status: 'COMMITTED', attemptId, revision,
                attemptStoreVerifiedBeforeSessionMutation: true,
                ...(capture ? { remediationStopCapture: capture } : {})
            };
        }
    };
    const durableCommit = {
        read: () => saved ? structuredClone(saved) : null,
        commit: ({ expectedAuthorityRevision, expectedCheckpointRevision, remediationStopCapture }) => {
            commitCapture = remediationStopCapture;
            if (failAt === 'commit') throw Error('disk');
            assert.equal(expectedAuthorityRevision, revision);
            assert.equal(expectedCheckpointRevision, saved?.checkpointRevision ?? 0);
            saved = {
                checkpointRevision: expectedCheckpointRevision + 1, authorityRevision: revision, sha256: `hash-${revision}`,
                durableCheckpointObserved: true, checkpoint: { attemptIds: entries.map(e => e.attemptId) }
            };
            return structuredClone(saved);
        },
        audit: () => {
            if (failAt === 'audit') throw Error('audit');
            return saved ? { status: 'CHECKPOINT_MATCHED', checkpointRevision: saved.checkpointRevision, authorityRevision: saved.authorityRevision } : { status: 'NO_CHECKPOINT' };
        }
    };
    const create = () => createSubmitCheckpointIntegrationV1({
        integration, authority, durableCommit, journal,
        contentRefs: { biology: { id: 'bio', version: '1', sha256: 'a'.repeat(64) } }, now: () => '2026-10-10T00:00:00.000Z'
    });
    return { create, authority, journal, integration, durableCommit, get commitCapture() { return commitCapture; } };
}

test('1 fresh instance begins IDLE, zero checkpoints', () => { const x = fixture().create(); assert.equal(x.inspect().phase, 'IDLE'); assert.equal(x.inspect().checkpointRevision, 0) });
test('2 first submit commits checkpoint and remains non-executable', () => { const x = fixture().create(); const r = x.submitOnce({ expectedRevision: 0, attemptId: 'a1' }); assert.equal(r.checkpointRevision, 1); assert.equal(r.resumeAuthorized, false); assert.equal(r.executable, false) });
test('3 multiple sequential submits advance authority and checkpoint revisions', () => { const x = fixture().create(); for (let i = 0; i < 3; i++)assert.equal(x.submitOnce({ expectedRevision: i, attemptId: `a${i}` }).checkpointRevision, i + 1); assert.equal(x.inspect().completed, 3) });
test('4 stale revision rejected without invoking submit', () => { const x = fixture().create(); assert.throws(() => x.submitOnce({ expectedRevision: 1, attemptId: 'a' }), { code: 'SUBMIT_CHECKPOINT_REVISION_CONFLICT' }); assert.equal(x.inspect().phase, 'IDLE') });
test('5 upstream failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'upstream' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'b' }), { code: 'SUBMIT_CHECKPOINT_SUBMIT_BLOCKED' }) });
test('6 checkpoint failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'commit' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN'); assert.throws(() => x.submitOnce({ expectedRevision: 1, attemptId: 'b' }), { code: 'SUBMIT_CHECKPOINT_SUBMIT_BLOCKED' }) });
test('7 audit failure permanently blocks subsequent submit', () => { const x = fixture({ failAt: 'audit' }).create(); assert.throws(() => x.submitOnce({ expectedRevision: 0, attemptId: 'a' })); assert.equal(x.inspect().phase, 'COMMIT_UNKNOWN') });
test('8 existing journal blocks construction', () => assert.throws(() => fixture({ existing: true }).create(), { code: 'SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED' }));
test('9 existing checkpoint blocks new instance', () => { const f = fixture(); const x = f.create(); x.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.throws(() => f.create(), { code: 'SUBMIT_CHECKPOINT_EXISTING_DATA_BLOCKED' }) });
test('10 read-only audit does not authorize resume', () => { const x = fixture().create(); x.submitOnce({ expectedRevision: 0, attemptId: 'a' }); assert.equal(x.audit().resumeAuthorized, false); assert.equal(x.audit().status, 'CHECKPOINT_MATCHED') });
test('11 mismatched session ID audit rejected', () => { const x = fixture().create(); assert.throws(() => x.audit({ sessionId: 'other' }), { code: 'SUBMIT_CHECKPOINT_SESSION_CONFLICT' }) });
test('12 malformed dependency input rejected', () => assert.throws(() => createSubmitCheckpointIntegrationV1({}), { code: 'SUBMIT_CHECKPOINT_INVALID_OPTIONS' }));

for (const stopKind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`13 ${stopKind} capture reaches durable commit unchanged`, () => {
        const capture = makeCapture(stopKind, 'capture-attempt');
        const x = fixture({ captureFactory: attemptId => {
            assert.equal(attemptId, 'capture-attempt');
            return capture;
        } });
        const adapter = x.create();
        const result = adapter.submitOnce({ expectedRevision: 0, attemptId: 'capture-attempt' });
        assert.equal(result.status, 'CHECKPOINT_OBSERVED');
        assert.equal(x.commitCapture, capture);
        assert.equal(Object.isFrozen(x.commitCapture), true);
        assert.equal(Object.hasOwn(x.authority.inspect().session, 'remediationStopCapture'), false);
    });
}

test('14 no-capture submit preserves legacy commit arguments', () => {
    const x = fixture();
    x.create().submitOnce({ expectedRevision: 0, attemptId: 'plain-attempt' });
    assert.equal(x.commitCapture, undefined);
});

test('15 mismatched and reused captures fail closed without commit', () => {
    const stale = makeCapture('INFEASIBLE', 'first-attempt');
    const x = fixture({ captureFactory: () => stale });
    const adapter = x.create();
    adapter.submitOnce({ expectedRevision: 0, attemptId: 'first-attempt' });
    assert.throws(
        () => adapter.submitOnce({ expectedRevision: 1, attemptId: 'first-attempt' }),
        { code: 'SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_REUSED' }
    );
    assert.equal(adapter.inspect().phase, 'COMMIT_UNKNOWN');
    assert.equal(x.commitCapture, stale);
});

test('16 capture digest mismatch is rejected instead of being dropped', () => {
    const valid = makeCapture('POLICY_ERROR', 'bad-digest');
    const invalid = deepFreeze({ ...valid, stopFingerprint: 'f'.repeat(64) });
    const x = fixture({ captureFactory: () => invalid });
    const adapter = x.create();
    assert.throws(
        () => adapter.submitOnce({ expectedRevision: 0, attemptId: 'bad-digest' }),
        { code: 'SUBMIT_CHECKPOINT_REMEDIATION_CAPTURE_DIGEST_MISMATCH' }
    );
    assert.equal(adapter.inspect().phase, 'COMMIT_UNKNOWN');
    assert.equal(x.commitCapture, undefined);
});

test('17 durable commit failure consumes the one-submit capture and poisons the adapter', () => {
    const capture = makeCapture('INFEASIBLE', 'commit-failure');
    const x = fixture({ failAt: 'commit', captureFactory: () => capture });
    const adapter = x.create();
    assert.throws(
        () => adapter.submitOnce({ expectedRevision: 0, attemptId: 'commit-failure' }),
        /disk/
    );
    assert.equal(x.commitCapture, capture);
    assert.equal(adapter.inspect().phase, 'COMMIT_UNKNOWN');
    assert.throws(
        () => adapter.submitOnce({ expectedRevision: 1, attemptId: 'commit-failure-retry' }),
        { code: 'SUBMIT_CHECKPOINT_SUBMIT_BLOCKED' }
    );
});
