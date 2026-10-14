import test from 'node:test';
import assert from 'node:assert/strict';
import { createK283PersistentMultiTurnCoordinatorV1 } from '../../../src/restoration/k283PersistentMultiTurnCoordinatorV1.js';
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from '../../../src/engines/orchestration/remediationStopFingerprint.js';

function freezeDeep(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freezeDeep);
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
    return freezeDeep({
        stopKind, stopFingerprint, targetNodeId: 'K283',
        triggerAttemptId: attemptId, generationInputs
    });
}

function fixture({ captureFactory, failCommit = false } = {}) {
    const sessionId = 'capture-session';
    let revision = 0;
    let session = {
        runtime: { sessionId }, attempts: [], currentSelection: null, currentQuestion: null
    };
    const attempts = [];
    const journalEntries = [];
    let checkpoint = null;
    let commitMetadata;
    const authority = {
        inspect: () => ({ sessionId, revision, session: structuredClone(session) }),
        mutate: ({ expectedRevision, apply }) => {
            assert.equal(expectedRevision, revision);
            session = apply(structuredClone(session));
            revision += 1;
        }
    };
    const attemptStore = {
        appendAttempt: ({ attempt }) => attempts.push(structuredClone(attempt)),
        getAttempt: ({ attemptId }) => attempts.find(item => item.attemptId === attemptId) ?? null,
        listAttemptIds: () => attempts.map(item => item.attemptId)
    };
    const journal = {
        prepare: ({ attempt }) => journalEntries.push({ attemptId: attempt.attemptId, state: 'PREPARED' }),
        markUnknown: ({ attemptId }) => { journalEntries.at(-1).state = 'UNKNOWN'; },
        reconcile: ({ attemptId }) => {
            const entry = journalEntries.find(item => item.attemptId === attemptId);
            if (entry) entry.state = 'COMMITTED';
            return {
                status: 'COMMITTED', verification: 'ATTEMPT_MATCHED',
                externalAttemptCommitVerified: true, attemptId
            };
        },
        read: () => journalEntries.length ? { entries: structuredClone(journalEntries) } : null
    };
    const durableCommit = {
        commit: args => {
            commitMetadata = args.remediationStopCapture;
            if (failCommit) throw new Error('commit failed');
            checkpoint = {
                checkpointRevision: args.expectedCheckpointRevision + 1,
                authorityRevision: args.expectedAuthorityRevision,
                durableCheckpointObserved: true,
                checkpoint: { attemptIds: attempts.map(item => item.attemptId) }
            };
            return checkpoint;
        },
        read: () => checkpoint,
        audit: () => ({
            status: 'CHECKPOINT_MATCHED',
            authorityRevision: checkpoint.authorityRevision
        })
    };
    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId, authority, coordination: { withWriter: ({ write }) => write() },
        attemptStore, journal, durableCommit,
        contentRefs: { bank: { id: 'bank', version: '1', sha256: 'a'.repeat(64) } },
        select: ({ session: current }) => {
            const selection = { status: 'SELECTED' };
            const question = { id: 'Q1' };
            return {
                session: { ...current, currentSelection: selection, currentQuestion: question },
                selection, question
            };
        },
        submit: ({ session: current, attemptId }) => {
            const capture = captureFactory?.(attemptId) ?? null;
            const stop = capture
                ? {
                    status: capture.stopKind, triggerAttemptId: capture.triggerAttemptId,
                    targetNodeId: capture.targetNodeId, bankId: capture.generationInputs.bankIdentity.bankId,
                    bankVersion: capture.generationInputs.bankIdentity.version,
                configFingerprint: capture.stopFingerprint,
                ...(capture.stopKind === 'POLICY_ERROR'
                    ? {
                        policyId: capture.generationInputs.policy.policyId,
                        policyVersion: capture.generationInputs.policy.policyVersion
                    }
                    : {})
            }
                : null;
            const stopField = capture?.stopKind === 'INFEASIBLE'
                ? 'remediationGenerationStop'
                : 'remediationPolicyErrorStop';
            return {
                session: {
                    ...current,
                    attempts: [...current.attempts, { sessionId, attemptId }],
                    currentSelection: null,
                    currentQuestion: null,
                    ...(capture ? { extensions: { [stopField]: stop } } : {})
                },
                attempt: { sessionId, attemptId },
                flowResult: {
                    remediationGeneration: capture
                        ? {
                            status: capture.stopKind,
                            targetNodeId: capture.targetNodeId,
                            triggerAttemptId: capture.triggerAttemptId
                        }
                        : null
                },
                ...(capture ? { remediationStopCapture: capture } : {})
            };
        },
        now: () => '2026-10-10T00:00:00.000Z'
    });
    return { coordinator, get commitMetadata() { return commitMetadata; }, attempts };
}

for (const stopKind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`${stopKind} capture is bound and passed to the durable commit boundary unchanged`, () => {
        const capture = makeCapture(stopKind, 'attempt-1');
        const x = fixture({ captureFactory: () => capture });
        x.coordinator.selectNext();
        const committed = x.coordinator.submitSelected({ attemptId: 'attempt-1' });
        assert.equal(committed.status, 'CHECKPOINT_OBSERVED');
        assert.equal(x.commitMetadata, capture);
        assert.equal(x.attempts.length, 1);
        assert.equal(committed.result.session.currentQuestion, null);
        assert.equal(committed.result.remediationStopCapture, capture);
    });
}

test('mismatched trigger capture is rejected before Attempt journal or durable writes', () => {
    const capture = makeCapture('INFEASIBLE', 'old-attempt');
    const x = fixture({ captureFactory: () => capture });
    x.coordinator.selectNext();
    assert.throws(
        () => x.coordinator.submitSelected({ attemptId: 'attempt-1' }),
        { code: 'K283_MULTI_REMEDIATION_CAPTURE_BINDING_MISMATCH' }
    );
    assert.equal(x.attempts.length, 0);
    assert.equal(x.commitMetadata, undefined);
    assert.equal(x.coordinator.inspect().poisoned, true);
});

test('submissions without a capture retain the existing durable commit arguments', () => {
    const x = fixture();
    x.coordinator.selectNext();
    x.coordinator.submitSelected({ attemptId: 'attempt-1' });
    assert.equal(x.commitMetadata, undefined);
});

test('failed durable commit poisons the writer after consuming its capture', () => {
    const capture = makeCapture('POLICY_ERROR', 'attempt-1');
    const x = fixture({ captureFactory: () => capture, failCommit: true });
    x.coordinator.selectNext();
    assert.throws(
        () => x.coordinator.submitSelected({ attemptId: 'attempt-1' }),
        /commit failed/
    );
    assert.equal(x.commitMetadata, capture);
    assert.equal(x.coordinator.inspect().poisoned, true);
});
