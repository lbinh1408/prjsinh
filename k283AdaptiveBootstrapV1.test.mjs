import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
    bootstrapAdaptiveDecision,
    acceptBootstrapRemediationProvenance,
    resolveBootstrapRemediationGenerationStop,
    restoreBootstrapRemediationGenerationStop,
    resolveBootstrapRemediationPolicyErrorStop,
    restoreBootstrapRemediationPolicyErrorStop
} from './k283AdaptiveBootstrapV1.js';
import {
    computeRemediationConfigFingerprint,
    getNextQuestion
} from './src/engines/orchestration/studySession.js';
import {
    computeLegacyInfeasibleFingerprintV1,
    computePolicyErrorFingerprintV1
} from './src/engines/orchestration/remediationStopFingerprint.js';
import { PROBE_FEASIBILITY_RESOLVER_VERSION } from './src/engines/remediation/probeFeasibilityResolver.js';
import { createDurableAttemptStore } from './src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from './src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from './src/restoration/durableSessionCommitV1.js';
import { createLiveSessionRevisionAuthority } from './src/restoration/liveSessionRevisionAuthority.js';
import { findLatestVerifiedK283Progress } from './k283ProgressContinuationV1.js';
import { createRuntimeSession } from './liveStudyK283PersistentMultiTurnV1.js';
import { resolveProbeAuthoringPolicy } from './src/engines/remediation/probeAuthoringPolicyResolver.js';
import { createRemediationStopProvenance } from './src/engines/orchestration/remediationStopProvenance.js';

function handoffFixture(kind) {
    const f = kind === 'POLICY_ERROR' ? makePolicyErrorFixture() : makeCheckpoint();
    const checkpoint = f.checkpoint;
    checkpoint.state = { student: { id: 'handoff-test' }, knowledge: {} };
    const stop = Object.values(checkpoint.extensions)[0];
    const inputs = kind === 'POLICY_ERROR'
        ? policyErrorFingerprintInput({ dependencies: f.dependencies, bank: f.questionBank, config: STOP_CONFIG, policy: f.policy })
        : { resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION, targetNodeId: 'K283',
            bankIdentity: { bankId: f.questionBank.bankId, version: f.questionBank.version }, questionBank: f.questionBank,
            selectorConstraints: {}, config: STOP_CONFIG, generationRules: Object.fromEntries(
                ['adaptiveRules', 'adaptivePaths', 'knowledgeMap', 'failureSignatures', 'remediationRules'].map(k => [k, f.dependencies[k]])) };
    const source = { sessionId: checkpoint.runtime.sessionId, checkpointRevision: checkpoint.revision,
        checkpointPayloadSha256: createHash('sha256').update(JSON.stringify(canonicalize(checkpoint))).digest('hex') };
    const provenance = createRemediationStopProvenance({ ...source, stopKind: kind, stopFingerprint: stop.configFingerprint,
        fingerprintContract: 'V1', participation: null, generationInputs: inputs });
    const progress = { fromSessionId: source.sessionId, checkpoint, studentState: checkpoint.state, history: checkpoint.history,
        remediationGenerationStop: checkpoint.extensions.remediationGenerationStop ?? null,
        remediationPolicyErrorStop: checkpoint.extensions.remediationPolicyErrorStop ?? null,
        remediationProvenance: { status: 'VERIFIED', source, provenance } };
    return { progress, policy: f.policy };
}

for (const kind of ['INFEASIBLE', 'POLICY_ERROR']) {
    test(`${kind}: CLI hands verified immutable evidence to bootstrap without changing decisions`, () => {
        const { progress, policy } = handoffFixture(kind);
        const before = structuredClone(progress);
        const runtime = createRuntimeSession(progress, policy);
        assert.deepEqual(runtime.remediationProvenance, progress.remediationProvenance);
        assert.deepEqual(progress, before);
        assert.ok(Object.isFrozen(runtime.remediationProvenance.source));
        assert.ok(Object.isFrozen(runtime.remediationProvenance.provenance.generationInputs));
        const legacy = structuredClone(progress); delete legacy.remediationProvenance;
        const oldRuntime = createRuntimeSession(legacy, policy);
        assert.equal(Object.hasOwn(oldRuntime, 'remediationProvenance'), false);
        assert.deepEqual(runtime.remediationGenerationStop, oldRuntime.remediationGenerationStop);
        assert.deepEqual(runtime.remediationPolicyErrorStop, oldRuntime.remediationPolicyErrorStop);
        assert.deepEqual(runtime.session.currentDecision, oldRuntime.session.currentDecision);
        assert.deepEqual(runtime.session.state.knowledge, oldRuntime.session.state.knowledge);
        assert.deepEqual(runtime.session.masteryRuntime, oldRuntime.session.masteryRuntime);
        assert.deepEqual(runtime.session.attempts, []);
        if (kind === 'POLICY_ERROR') assert.equal(getNextQuestion({ session: runtime.session }).selection.status, 'NO_MATCH');
    });
}
test('bootstrap preserves explicit absence and legacy missing metadata', () => {
    const { progress } = handoffFixture('INFEASIBLE');
    progress.remediationProvenance.status = 'ABSENT_UNVERIFIED'; progress.remediationProvenance.provenance = null;
    assert.deepEqual(createRuntimeSession(progress).remediationProvenance, progress.remediationProvenance);
    delete progress.remediationProvenance;
    assert.equal(acceptBootstrapRemediationProvenance(progress), undefined);
    assert.equal(acceptBootstrapRemediationProvenance(null), undefined);
});
test('bootstrap payload binding uses durable lexical ordering for numeric object keys', () => {
    const { progress } = handoffFixture('INFEASIBLE');
    progress.checkpoint.state.numericKeys = { 2: 'two', 10: 'ten' };
    const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
        : value && typeof value === 'object' ? '{' + Object.keys(value).sort()
            .map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
    const metadata = progress.remediationProvenance;
    metadata.status = 'ABSENT_UNVERIFIED'; metadata.provenance = null;
    metadata.source.checkpointPayloadSha256 = createHash('sha256').update(canonical(progress.checkpoint)).digest('hex');
    assert.deepEqual(acceptBootstrapRemediationProvenance(progress), metadata);
});
test('CLI rejects malformed, swapped and stale handoff metadata before runtime initialization', () => {
    const { progress } = handoffFixture('POLICY_ERROR');
    for (const mutate of [
        p => { p.remediationProvenance = undefined; }, p => { p.remediationProvenance = null; },
        p => { p.remediationProvenance.status = 'UNKNOWN'; },
        p => { p.remediationProvenance.status = 'ABSENT_UNVERIFIED'; },
        p => { p.remediationProvenance.provenance = null; },
        p => { delete p.remediationProvenance.source; },
        p => { p.remediationProvenance.source.sessionId = 'other'; },
        p => { p.fromSessionId = 'other'; },
        p => { p.remediationProvenance.source.checkpointRevision++; },
        p => { p.remediationProvenance.source.checkpointPayloadSha256 = 'a'.repeat(64); },
        p => { p.checkpoint.history.push('changed'); },
        p => { p.remediationPolicyErrorStop.triggerAttemptId = 'other'; },
        p => { p.remediationProvenance.provenance.inputSha256 = 'a'.repeat(64); },
        p => { p.remediationProvenance.provenance.generationInputs.config.timeBudget++; }
    ]) {
        const changed = structuredClone(progress); mutate(changed);
        assert.throws(() => createRuntimeSession(changed), /K283_BOOTSTRAP_PROVENANCE_INVALID/);
    }
});

const PATHS = {
    questionBank: './src/data/questions/c09/K283.question-bank.json',
    knowledgeMap: './src/data/knowledge/knowledge-map-v4.json',
    masteryRules: './src/policies/mastery/rules.json',
    evidenceModel: './src/data/mastery/evidence.json',
    adaptiveRules: './src/policies/adaptive/rules.json',
    adaptivePaths: './src/policies/adaptive/paths.json',
    failureSignatures: './src/data/remediation/failure-signatures.json',
    studentState: './src/data/student-state.json'
};

function loadDeps() {
    return {
        questionBank: JSON.parse(fs.readFileSync(PATHS.questionBank, 'utf8')),
        knowledgeMap: JSON.parse(fs.readFileSync(PATHS.knowledgeMap, 'utf8')),
        masteryRules: JSON.parse(fs.readFileSync(PATHS.masteryRules, 'utf8')),
        evidenceModel: JSON.parse(fs.readFileSync(PATHS.evidenceModel, 'utf8')),
        adaptiveRules: JSON.parse(fs.readFileSync(PATHS.adaptiveRules, 'utf8')),
        adaptivePaths: JSON.parse(fs.readFileSync(PATHS.adaptivePaths, 'utf8')),
        failureSignatures: JSON.parse(fs.readFileSync(PATHS.failureSignatures, 'utf8')),
        remediationRules: {}
    };
}

test('bootstrapAdaptiveDecision returns null when studentState has no progress on node', () => {
    const deps = loadDeps();
    const rawStudentState = { student: { id: 'STUDENT-1' }, mastery: { nodes: {} } };
    const decision = bootstrapAdaptiveDecision({
        studentState: rawStudentState,
        dependencies: deps,
        targetNodeId: 'K283'
    });
    assert.equal(decision, null);
});

test('bootstrapAdaptiveDecision derives RETEST when restored state is M4/mastered', () => {
    const deps = loadDeps();
    const studentStateMastered = {
        student: { id: 'STUDENT-1' },
        knowledge: {
            K283: {
                mastery: 'M4',
                status: 'mastered',
                overallEvidence: 0.94,
                confidence: 'very_high',
                independentObservations: 11
            }
        }
    };

    const decision = bootstrapAdaptiveDecision({
        studentState: studentStateMastered,
        dependencies: deps,
        targetNodeId: 'K283',
        clusterId: 'C09',
        learningMode: 'HOC_SAU'
    });

    assert.ok(decision, 'Should produce an adaptive decision');
    assert.equal(decision.action, 'RETEST');
    assert.equal(decision.target.primaryNodeId, 'K283');
    assert.ok(Array.isArray(decision.selectionCriteria.evidenceDimensions));
    assert.ok(decision.selectionCriteria.evidenceDimensions.includes('apply') || decision.selectionCriteria.evidenceDimensions.includes('transfer'));
});

test('bootstrapAdaptiveDecision preserves SKIP when restored state is M4/stable', () => {
    const deps = loadDeps();
    const stableStudentState = {
        student: { id: 'STUDENT-1' },
        knowledge: {
            K283: {
                mastery: 'M4',
                status: 'stable',
                overallEvidence: 0.94,
                confidence: 'very_high',
                independentObservations: 11
            }
        }
    };
    const decision = bootstrapAdaptiveDecision({
        studentState: stableStudentState,
        dependencies: deps,
        targetNodeId: 'K283',
        clusterId: 'C09',
        learningMode: 'HOC_SAU'
    });

    assert.ok(decision, 'Should produce an adaptive decision');
    assert.equal(decision.action, 'SKIP');
    assert.equal(decision.target.primaryNodeId, 'K283');
});

const STOP_CONFIG = {
    learningMode: 'HOC_SAU',
    timeBudget: 60,
    clusterId: 'C09',
    lessonId: null,
    contextId: 'live-study-k283',
    historyLimit: 50
};

function makeCheckpoint({
    dependencies = loadDeps(),
    bank,
    config = STOP_CONFIG,
    stop = true
} = {}) {
    const questionBank = bank ?? JSON.parse(fs.readFileSync(PATHS.questionBank, 'utf8'));
    const bankIdentity = {
        bankId: questionBank.bankId,
        version: questionBank.version
    };
    const remediationGenerationStop = {
        schemaVersion: '1.0.0',
        status: 'INFEASIBLE',
        reasonCode: 'NO_ELIGIBLE_BANK_QUESTION',
        triggerAttemptId: 'attempt-original-001',
        targetNodeId: 'K283',
        bankId: bankIdentity.bankId,
        bankVersion: bankIdentity.version,
        configFingerprint: computeRemediationConfigFingerprint({
            targetNodeId: 'K283',
            bankIdentity,
            questionBank,
            selectorConstraints: {},
            config,
            dependencies
        })
    };

    const checkpoint = {
        schemaVersion: '1.0.0-draft',
        revision: 1,
        savedAt: '2026-10-01T08:00:00.000Z',
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId: 'LIVE-K283-ISOLATED',
            startedAt: '2026-10-01T08:00:00.000Z',
            lastActivityAt: '2026-10-01T08:00:00.000Z',
            status: 'active'
        },
        config,
        contentRefs: {
            questionBank: {
                id: 'K283.question-bank.json',
                version: bankIdentity.version,
                sha256: createHash('sha256').update(JSON.stringify(questionBank)).digest('hex')
            }
        },
        state: {},
        currentDecision: { action: 'REMEDIATE' },
        currentSelection: null,
        currentQuestion: null,
        lessonRuntime: {
            currentItem: null,
            progress: { completedSectionIds: [], skippedSectionIds: [] }
        },
        activeRemediationPlan: null,
        history: [{ attemptId: 'attempt-original-001' }],
        masteryRuntime: { evidenceHistoryByNode: {} },
        attemptIds: ['attempt-original-001'],
        ...(stop ? { extensions: { remediationGenerationStop } } : {})
    };
    return { checkpoint, questionBank, dependencies, remediationGenerationStop };
}

function makePolicyErrorFixture({
    dependencies = loadDeps(),
    bank = dependencies.questionBank,
    config = STOP_CONFIG,
    policy = {
        schemaVersion: '1.0.0',
        policyId: 'k283-policy',
        policyVersion: '1.0.0',
        failureSignatureDefaults: {
            concept_confusion: {
                difficulty: 'D2',
                evidenceDimension: 'explain'
            }
        }
    }
} = {}) {
    const fixture = makeCheckpoint({ dependencies, bank, config, stop: false });
    const remediationPolicyErrorStop = {
        schemaVersion: '1.0.0',
        status: 'POLICY_ERROR',
        reasonCode: 'QUESTION_TYPE_CONFLICT',
        triggerAttemptId: 'attempt-policy-error-001',
        targetNodeId: 'K283',
        bankId: bank.bankId,
        bankVersion: bank.version,
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
        configFingerprint: policyErrorFingerprint({
            dependencies,
            bank,
            config,
            policy
        })
    };
    fixture.checkpoint.attemptIds = [remediationPolicyErrorStop.triggerAttemptId];
    fixture.checkpoint.history = [{ attemptId: remediationPolicyErrorStop.triggerAttemptId }];
    fixture.checkpoint.extensions = { remediationPolicyErrorStop };
    return { ...fixture, policy, remediationPolicyErrorStop };
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value).sort()
                .filter(key => value[key] !== undefined)
                .map(key => [key, canonicalize(value[key])])
        );
    }
    return value;
}

function policyErrorFingerprintInput({ dependencies, bank, config, policy }) {
    const failureSignature = Object.keys(policy.failureSignatureDefaults).sort()[0];
    const canonicalPolicy = resolveProbeAuthoringPolicy({
        policy,
        targetNodeId: 'K283',
        failureSignature
    }).canonicalPolicy;
    return {
        resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
        targetNodeId: 'K283',
        bankIdentity: { bankId: bank.bankId, version: bank.version },
        questionBank: bank,
        selectorConstraints: {},
        config,
        policy: canonicalPolicy,
        generationRules: {
            adaptiveRules: dependencies.adaptiveRules,
            adaptivePaths: dependencies.adaptivePaths,
            knowledgeMap: dependencies.knowledgeMap,
            failureSignatures: dependencies.failureSignatures,
            remediationRules: dependencies.remediationRules
        }
    };
}

function policyErrorFingerprint(input) {
    const canonicalInput = canonicalize({
        semanticsVersion: 'remediation-policy-error-stop-fingerprint-v1',
        ...policyErrorFingerprintInput(input)
    });
    return createHash('sha256')
        .update(JSON.stringify(canonicalInput), 'utf8')
        .digest('hex');
}

test('bootstrap restores a matching V1 stop as an immutable, read-only result', () => {
    const fixture = makeCheckpoint();
    const result = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        targetNodeId: 'K283',
        config: STOP_CONFIG
    });

    assert.equal(result.status, 'PROBE_GENERATION_INFEASIBLE');
    assert.equal(result.reasonCode, fixture.remediationGenerationStop.reasonCode);
    assert.equal(
        result.currentFingerprint,
        computeLegacyInfeasibleFingerprintV1({
            resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
            targetNodeId: 'K283',
            bankIdentity: {
                bankId: fixture.questionBank.bankId,
                version: fixture.questionBank.version
            },
            questionBank: fixture.questionBank,
            selectorConstraints: {},
            config: STOP_CONFIG,
            generationRules: {
                adaptiveRules: fixture.dependencies.adaptiveRules,
                adaptivePaths: fixture.dependencies.adaptivePaths,
                knowledgeMap: fixture.dependencies.knowledgeMap,
                failureSignatures: fixture.dependencies.failureSignatures,
                remediationRules: fixture.dependencies.remediationRules
            }
        })
    );
    assert.equal(result.stop.triggerAttemptId, 'attempt-original-001');
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.stop));
    const restoredSession = restoreBootstrapRemediationGenerationStop({
        currentDecision: { action: 'REMEDIATE' },
        currentSelection: null,
        currentQuestion: null
    }, result);
    assert.equal(
        restoredSession.extensions.remediationGenerationStop.triggerAttemptId,
        'attempt-original-001'
    );
    assert.equal(Object.getOwnPropertyDescriptor(restoredSession, 'extensions').writable, false);
    assert.equal(fixture.checkpoint.attemptIds.length, 1);
    assert.equal(fixture.checkpoint.currentSelection, null);
    assert.equal(fixture.checkpoint.currentQuestion, null);
});

test('verified durable bootstrap path carries and validates the stored stop extension', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-bootstrap-stop-'));
    const sessionId = 'LIVE-K283-BOOTSTRAP-ISOLATED';
    const fixture = makeCheckpoint();
    const checkpoint = structuredClone(fixture.checkpoint);
    checkpoint.runtime.sessionId = sessionId;
    checkpoint.state = { knowledge: {} };
    const attempt = {
        attemptId: 'attempt-original-001',
        sessionId,
        result: 'wrong'
    };
    const session = {
        runtime: checkpoint.runtime,
        config: checkpoint.config,
        state: checkpoint.state,
        currentDecision: checkpoint.currentDecision,
        currentSelection: null,
        currentQuestion: null,
        lessonRuntime: checkpoint.lessonRuntime,
        activeRemediationPlan: null,
        attempts: [attempt],
        history: checkpoint.history,
        masteryRuntime: checkpoint.masteryRuntime,
        extensions: checkpoint.extensions
    };
    const contentRefs = checkpoint.contentRefs;
    try {
        const attemptStore = createDurableAttemptStore({
            rootDir: path.join(rootDir, 'attempts')
        });
        const journal = createDurableSubmitJournalV3({
            rootDir: path.join(rootDir, 'journal'),
            attemptStore
        });
        const durableCommit = createDurableSessionCommitV1({
            rootDir: path.join(rootDir, 'checkpoints'),
            attemptStore,
            journal
        });
        const authority = createLiveSessionRevisionAuthority({ initialSession: session, sessionId });

        journal.prepare({ sessionId, attempt, expectedRevision: 0 });
        journal.markUnknown({ sessionId, attemptId: attempt.attemptId });
        attemptStore.appendAttempt({ sessionId, attempt });
        assert.equal(
            journal.reconcile({ sessionId, attemptId: attempt.attemptId }).status,
            'COMMITTED'
        );
        durableCommit.commit({
            authority,
            sessionId,
            expectedAuthorityRevision: 0,
            expectedCheckpointRevision: 0,
            contentRefs,
            savedAt: checkpoint.savedAt
        });

        const progress = findLatestVerifiedK283Progress({ rootDir, contentRefs });
        assert.equal(progress.remediationGenerationStop.triggerAttemptId, attempt.attemptId);
        assert.deepEqual(
            progress.checkpoint.extensions.remediationGenerationStop,
            fixture.remediationGenerationStop
        );
        assert.deepEqual(progress.checkpoint.attemptIds, [attempt.attemptId]);
        assert.equal(progress.checkpoint.currentSelection, null);
        assert.equal(progress.checkpoint.currentQuestion, null);
        const restored = resolveBootstrapRemediationGenerationStop({
            checkpoint: progress.checkpoint,
            dependencies: fixture.dependencies,
            questionBank: fixture.questionBank,
            config: STOP_CONFIG
        });
        assert.equal(restored.status, 'PROBE_GENERATION_INFEASIBLE');
    } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
    }
});

test('bootstrap reports RETRY_ELIGIBLE on changed fingerprint without retrying', () => {
    const fixture = makeCheckpoint();
    const changedConfig = { ...STOP_CONFIG, contextId: 'changed-context' };
    const result = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        targetNodeId: 'K283',
        config: changedConfig
    });
    assert.equal(result.status, 'RETRY_ELIGIBLE');
    assert.equal(result.reasonCode, 'CONFIGURATION_FINGERPRINT_CHANGED');
    assert.equal(result.stop.triggerAttemptId, 'attempt-original-001');
    assert.notEqual(result.currentFingerprint, fixture.remediationGenerationStop.configFingerprint);

    const changedBank = {
        ...fixture.questionBank,
        version: 'changed-bank-version'
    };
    const changedBankResult = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: changedBank,
        targetNodeId: 'K283',
        config: STOP_CONFIG
    });
    assert.equal(changedBankResult.status, 'RETRY_ELIGIBLE');
});

test('bootstrap fails closed when current bank identity is missing or checkpoint stop is invalid', () => {
    const fixture = makeCheckpoint();
    const missingIdentityBank = { ...fixture.questionBank };
    delete missingIdentityBank.bankId;
    const missingBankResult = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: missingIdentityBank,
        config: STOP_CONFIG
    });
    assert.equal(missingBankResult.status, 'FAIL_CLOSED');
    assert.equal(missingBankResult.reasonCode, 'CURRENT_BANK_OR_CONFIG_UNAVAILABLE');

    const missingConfigResult = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank
    });
    assert.equal(missingConfigResult.status, 'FAIL_CLOSED');
    assert.equal(missingConfigResult.reasonCode, 'CURRENT_BANK_OR_CONFIG_UNAVAILABLE');

    const malformed = structuredClone(fixture.checkpoint);
    malformed.extensions.remediationGenerationStop.schemaVersion = '2.0.0';
    const invalidStopResult = resolveBootstrapRemediationGenerationStop({
        checkpoint: malformed,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        config: STOP_CONFIG
    });
    assert.equal(invalidStopResult.status, 'FAIL_CLOSED');
    assert.equal(invalidStopResult.reasonCode, 'INVALID_CHECKPOINT');
});

test('bootstrap leaves legacy checkpoints without stop metadata unchanged', () => {
    const fixture = makeCheckpoint({ stop: false });
    const result = resolveBootstrapRemediationGenerationStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        config: STOP_CONFIG
    });
    assert.equal(result.status, 'NONE');
    assert.equal(result.stop, null);
});

test('policy-error bootstrap matches fingerprint and restores a guarded null-boundary stop', () => {
    const fixture = makePolicyErrorFixture();
    const result = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: fixture.policy,
        config: STOP_CONFIG
    });
    assert.equal(result.status, 'POLICY_ERROR');
    assert.equal(result.reasonCode, 'QUESTION_TYPE_CONFLICT');
    assert.equal(result.stop.triggerAttemptId, 'attempt-policy-error-001');
    assert.ok(Object.isFrozen(result.stop));
    assert.equal(
        result.currentFingerprint,
        computePolicyErrorFingerprintV1({
            ...policyErrorFingerprintInput({
                dependencies: fixture.dependencies,
                bank: fixture.questionBank,
                config: STOP_CONFIG,
                policy: fixture.policy
            })
        })
    );

    const existingPlan = { remediationId: 'existing-plan' };
    const restored = restoreBootstrapRemediationPolicyErrorStop({
        currentSelection: { status: 'SELECTED' },
        currentQuestion: { id: 'pending' },
        activeRemediationPlan: existingPlan
    }, result);
    assert.equal(restored.currentSelection, null);
    assert.equal(restored.currentQuestion, null);
    assert.equal(
        restored.extensions.remediationPolicyErrorStop.triggerAttemptId,
        'attempt-policy-error-001'
    );
    assert.equal(Object.getOwnPropertyDescriptor(restored, 'extensions').writable, false);
    assert.equal(restored.activeRemediationPlan, existingPlan);
});

test('policy-error bootstrap reports changed fingerprint as RETRY_ELIGIBLE without retrying', () => {
    const fixture = makePolicyErrorFixture();
    const changedPolicy = structuredClone(fixture.policy);
    changedPolicy.policyVersion = '1.1.0';
    const result = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: changedPolicy,
        config: STOP_CONFIG
    });
    assert.equal(result.status, 'RETRY_ELIGIBLE');
    assert.equal(result.reasonCode, 'CONFIGURATION_FINGERPRINT_CHANGED');
    assert.equal(result.stop.triggerAttemptId, 'attempt-policy-error-001');

    const restored = restoreBootstrapRemediationPolicyErrorStop({
        currentSelection: null,
        currentQuestion: null
    }, result);
    assert.equal(restored.currentSelection, null);
    assert.equal(restored.currentQuestion, null);
});

test('policy-error policy-content change with unchanged identity is RETRY_ELIGIBLE', () => {
    const fixture = makePolicyErrorFixture();
    const changedPolicy = structuredClone(fixture.policy);
    changedPolicy.failureSignatureDefaults.concept_confusion.difficulty = 'D3';
    assert.equal(changedPolicy.policyVersion, fixture.policy.policyVersion);

    const result = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: changedPolicy,
        config: STOP_CONFIG
    });

    assert.equal(result.status, 'RETRY_ELIGIBLE');
    assert.equal(result.reasonCode, 'CONFIGURATION_FINGERPRINT_CHANGED');
    assert.notEqual(
        result.currentFingerprint,
        fixture.remediationPolicyErrorStop.configFingerprint
    );
    assert.equal(result.stop.triggerAttemptId, fixture.remediationPolicyErrorStop.triggerAttemptId);
});

test('policy-error bootstrap fails closed for unavailable fingerprint inputs', () => {
    const fixture = makePolicyErrorFixture();
    const unavailablePolicy = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: null,
        config: STOP_CONFIG
    });
    assert.equal(unavailablePolicy.status, 'FAIL_CLOSED');
    assert.equal(unavailablePolicy.reasonCode, 'CURRENT_POLICY_BANK_OR_CONFIG_UNAVAILABLE');

    const missingBank = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: { ...fixture.questionBank, bankId: '' },
        policy: fixture.policy,
        config: STOP_CONFIG
    });
    assert.equal(missingBank.status, 'FAIL_CLOSED');

    const missingConfig = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: fixture.policy
    });
    assert.equal(missingConfig.status, 'FAIL_CLOSED');
});

test('verified durable continuation restores and suppresses matching policy-error stop', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-policy-stop-'));
    const sessionId = 'LIVE-K283-POLICY-STOP-ISOLATED';
    const fixture = makePolicyErrorFixture();
    const checkpoint = structuredClone(fixture.checkpoint);
    checkpoint.runtime.sessionId = sessionId;
    checkpoint.state = { knowledge: {} };
    const attempt = {
        attemptId: fixture.remediationPolicyErrorStop.triggerAttemptId,
        sessionId,
        result: 'wrong'
    };
    const session = {
        runtime: checkpoint.runtime,
        config: checkpoint.config,
        state: checkpoint.state,
        currentDecision: checkpoint.currentDecision,
        currentSelection: null,
        currentQuestion: null,
        lessonRuntime: checkpoint.lessonRuntime,
        activeRemediationPlan: null,
        attempts: [attempt],
        history: checkpoint.history,
        masteryRuntime: checkpoint.masteryRuntime,
        extensions: checkpoint.extensions
    };
    const contentRefs = checkpoint.contentRefs;
    try {
        const attemptStore = createDurableAttemptStore({
            rootDir: path.join(rootDir, 'attempts')
        });
        const journal = createDurableSubmitJournalV3({
            rootDir: path.join(rootDir, 'journal'),
            attemptStore
        });
        const durableCommit = createDurableSessionCommitV1({
            rootDir: path.join(rootDir, 'checkpoints'),
            attemptStore,
            journal
        });
        const authority = createLiveSessionRevisionAuthority({ initialSession: session, sessionId });
        journal.prepare({ sessionId, attempt, expectedRevision: 0 });
        journal.markUnknown({ sessionId, attemptId: attempt.attemptId });
        attemptStore.appendAttempt({ sessionId, attempt });
        assert.equal(
            journal.reconcile({ sessionId, attemptId: attempt.attemptId }).status,
            'COMMITTED'
        );
        durableCommit.commit({
            authority,
            sessionId,
            expectedAuthorityRevision: 0,
            expectedCheckpointRevision: 0,
            contentRefs,
            savedAt: checkpoint.savedAt
        });

        const progress = findLatestVerifiedK283Progress({ rootDir, contentRefs });
        assert.deepEqual(
            progress.remediationPolicyErrorStop,
            fixture.remediationPolicyErrorStop
        );
        assert.deepEqual(progress.checkpoint.attemptIds, [attempt.attemptId]);
        assert.equal(progress.checkpoint.currentSelection, null);
        assert.equal(progress.checkpoint.currentQuestion, null);
        const changedContentRefs = structuredClone(contentRefs);
        changedContentRefs.questionBank.version = '2.0.0';
        changedContentRefs.questionBank.sha256 = 'f'.repeat(64);
        const changedContentProgress = findLatestVerifiedK283Progress({
            rootDir,
            contentRefs: changedContentRefs
        });
        assert.deepEqual(
            changedContentProgress.remediationPolicyErrorStop,
            fixture.remediationPolicyErrorStop
        );
        const changedBankResult = resolveBootstrapRemediationPolicyErrorStop({
            checkpoint: changedContentProgress.checkpoint,
            dependencies: fixture.dependencies,
            questionBank: { ...fixture.questionBank, version: '2.0.0' },
            policy: fixture.policy,
            config: STOP_CONFIG
        });
        assert.equal(changedBankResult.status, 'RETRY_ELIGIBLE');

        const runtime = createRuntimeSession(progress, fixture.policy);
        const next = getNextQuestion({ session: runtime.session });
        assert.equal(next.selection.status, 'NO_MATCH');
        assert.equal(next.selection.reasonCode, 'REMEDIATION_POLICY_ERROR_STOP');
        assert.equal(next.question, null);
        assert.equal(next.session.currentSelection, null);
        assert.equal(next.session.currentQuestion, null);
        assert.equal(next.session.attempts.length, 0);
        assert.equal(
            next.session.extensions.remediationPolicyErrorStop.triggerAttemptId,
            attempt.attemptId
        );
    } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
    }
});

test('policy-error bootstrap rejects checkpoint with both stop extensions', () => {
    const fixture = makePolicyErrorFixture();
    const infeasible = makeCheckpoint().remediationGenerationStop;
    fixture.checkpoint.extensions.remediationGenerationStop = infeasible;
    const result = resolveBootstrapRemediationPolicyErrorStop({
        checkpoint: fixture.checkpoint,
        dependencies: fixture.dependencies,
        questionBank: fixture.questionBank,
        policy: fixture.policy,
        config: STOP_CONFIG
    });
    assert.equal(result.status, 'FAIL_CLOSED');
    assert.equal(result.reasonCode, 'INVALID_CHECKPOINT');
});
