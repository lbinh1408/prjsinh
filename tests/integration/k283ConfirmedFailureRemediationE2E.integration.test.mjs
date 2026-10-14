import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash as hash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDurableAttemptStore } from '../../src/persistence/durableAttemptStore.js';
import { createDurableSubmitJournalV3 } from '../../src/restoration/durableSubmitJournalV3.js';
import { createDurableSessionCommitV1 } from '../../src/restoration/durableSessionCommitV1.js';
import { createAtomicCaptureCoordinationV1 } from '../../src/restoration/atomicCaptureCoordinationV1.js';
import { createLiveSessionRevisionAuthority } from '../../src/restoration/liveSessionRevisionAuthority.js';
import { createK283PersistentMultiTurnCoordinatorV1 } from '../../src/restoration/k283PersistentMultiTurnCoordinatorV1.js';
import {
    createStudySession,
    submitAnswer
} from '../../src/engines/orchestration/studySession.js';
import { decideNextAction } from '../../src/engines/adaptive/adaptiveEngine.js';
import questionBank from '../../src/data/questions/c09/K283.question-bank.json' with { type: 'json' };
import knowledgeMap from '../../src/data/knowledge/knowledge-map-v4.json' with { type: 'json' };
import evidenceModel from '../../src/data/mastery/evidence.json' with { type: 'json' };
import masteryRules from '../../src/policies/mastery/rules.json' with { type: 'json' };
import adaptiveRules from '../../src/policies/adaptive/rules.json' with { type: 'json' };
import adaptivePaths from '../../src/policies/adaptive/paths.json' with { type: 'json' };
import failureSignatures from '../../src/data/remediation/failure-signatures.json' with { type: 'json' };
import studentStateBase from '../../src/data/student/student-state.json' with { type: 'json' };
import { prepareK283DiagnosticSubmission } from '../../k283A003DiagnosticConfirmationV1.js';

const SESSION_ID = 'K283-CONFIRMED-FAILURE-E2E';
const TARGET_NODE = 'K283';
const TARGET_QUESTIONS = ['Q-A-K283-A-003', 'Q-A-K283-A-004'];

function initialDecision(studentState, sessionId = SESSION_ID) {
    return decideNextAction({
        studentId: studentState.student.studentId,
        targetNodeId: TARGET_NODE,
        masteryState: studentState,
        knowledgeMap,
        adaptiveRules,
        adaptivePaths,
        recentResults: [],
        sessionContext: { sessionId, clusterId: 'C09', targetNodeId: TARGET_NODE },
        learningMode: 'HOC_SAU',
        timeBudget: 60,
        now: '2026-10-01T08:00:00.000Z'
    });
}

function questionById(id) {
    const question = questionBank.questions.find(item => item.id === id);
    assert.ok(question, `Missing question ${id}`);
    return question;
}

function contentRefs() {
    return Object.fromEntries(
        Object.entries({
            questionBank,
            knowledgeMap,
            masteryRules
        }).map(([name, value]) => {
            const serialized = JSON.stringify(value);
            return [name, {
                id: `${name}.json`,
                version: 'k283-e2e-v1',
                sha256: hash('sha256').update(serialized).digest('hex')
            }];
        })
    );
}

function createCoordinatorHarness({
    root,
    sessionId,
    bank = questionBank,
    activeRemediationPlan = null
}) {
    const studentState = structuredClone(studentStateBase);
    delete studentState.knowledge[TARGET_NODE];
    studentState.learning.session.sessionId = sessionId;
    studentState.learning.session.runtimeSignals = {
        consecutiveWrong: 0,
        consecutiveSkip: 0,
        consecutiveRemediation: 0
    };
    const session = createStudySession({
        sessionId,
        studentState,
        initialDecision: initialDecision(studentState, sessionId),
        questionBanks: { [TARGET_NODE]: bank },
        knowledgeMap,
        masteryRules,
        evidenceModel,
        adaptiveRules,
        adaptivePaths,
        failureSignatures,
        remediationRules: null,
        learningMode: 'HOC_SAU',
        timeBudget: 60,
        clusterId: 'C09',
        contextId: 'confirmed-failure-e2e',
        now: '2026-10-01T08:00:00.000Z'
    });
    if (activeRemediationPlan) {
        session.activeRemediationPlan = structuredClone(activeRemediationPlan);
    }

    const attemptStore = createDurableAttemptStore({ rootDir: path.join(root, 'attempts') });
    const journal = createDurableSubmitJournalV3({ rootDir: path.join(root, 'journal'), attemptStore });
    const durableCommit = createDurableSessionCommitV1({
        rootDir: path.join(root, 'checkpoints'),
        attemptStore,
        journal
    });
    const coordination = createAtomicCaptureCoordinationV1({
        rootDir: root,
        publisher: { publish: () => ({ status: 'PUBLISHED' }) },
        capture: () => ({ status: 'INCOMPLETE' })
    });
    const authority = createLiveSessionRevisionAuthority({ initialSession: session, sessionId });
    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId,
        authority,
        coordination,
        attemptStore,
        journal,
        durableCommit,
        contentRefs: contentRefs(),
        now: () => '2026-10-01T08:01:00.000Z',
        select: ({ session: current }) => {
            const index = Math.min(current.attempts.length, TARGET_QUESTIONS.length - 1);
            const question = questionById(TARGET_QUESTIONS[index]);
            const selection = {
                selectionId: `${sessionId}-selection-${current.attempts.length + 1}`,
                decisionId: current.currentDecision.decisionId,
                action: current.currentDecision.action,
                targetNodeId: TARGET_NODE,
                status: 'SELECTED',
                selected: { questionId: question.id, question }
            };
            return {
                session: { ...current, currentSelection: selection, currentQuestion: question },
                selection,
                question
            };
        },
        submit: submitAnswer
    });

    return { attemptStore, durableCommit, authority, coordinator };
}

function verifyMissingBankIdentityRetainsAttempt() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-missing-bank-id-'));
    const sessionId = 'K283-MISSING-BANK-IDENTITY';
    try {
        const bankWithoutIdentity = structuredClone(questionBank);
        delete bankWithoutIdentity.bankId;
        delete bankWithoutIdentity.version;
        const { attemptStore, durableCommit, coordinator } =
            createCoordinatorHarness({ root, sessionId, bank: bankWithoutIdentity });
        let result;

        for (let index = 0; index < TARGET_QUESTIONS.length; index++) {
            const selected = coordinator.selectNext();
            const prepared = prepareK283DiagnosticSubmission({
                question: selected.question,
                response: 'A',
                confirmation: index === 0 ? '1' : 'yes'
            });
            result = coordinator.submitSelected({
                attemptId: `${sessionId}-attempt-${index + 1}`,
                args: {
                    response: prepared.response,
                    diagnostic: prepared.diagnostic,
                    startedAt: '2026-10-01T08:00:00.000Z',
                    submittedAt: '2026-10-01T08:01:00.000Z'
                }
            });
        }

        assert.equal(
            result.result.flowResult.remediationGeneration.reasonCode,
            'BANK_CAPABILITY_UNAVAILABLE'
        );
        assert.equal(result.result.session.attempts.length, 2);
        assert.ok(result.result.flowResult.masteryUpdate);
        const committed = durableCommit.read({ sessionId }).checkpoint;
        assert.deepEqual(committed.attemptIds, [
            `${sessionId}-attempt-1`,
            `${sessionId}-attempt-2`
        ]);
        assert.equal(committed.history.length, 2);
        assert.equal(committed.state.knowledge[TARGET_NODE].attemptStats.total, 2);
        assert.equal(
            committed.state.knowledge[TARGET_NODE].failureSummary.calculation_error.count,
            2
        );
        assert.equal(Object.hasOwn(committed, 'extensions'), false);
        assert.equal(attemptStore.listAttemptIds({ sessionId }).length, 2);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function verifyLegacyActivePlanCheckpoint() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-legacy-active-plan-'));
    const sessionId = 'K283-LEGACY-ACTIVE-PLAN';
    const activeRemediationPlan = {
        remediationId: 'LEGACY-ACTIVE-PLAN-001',
        targetNodeId: TARGET_NODE,
        plan: { steps: [] },
        probe: { required: true, targetNodeId: TARGET_NODE }
    };
    try {
        const { durableCommit, coordinator } =
            createCoordinatorHarness({ root, sessionId, activeRemediationPlan });
        const selected = coordinator.selectNext();
        const submitted = coordinator.submitSelected({
            attemptId: `${sessionId}-attempt-1`,
            args: {
                response: selected.question.answer.value,
                startedAt: '2026-10-01T08:00:00.000Z',
                submittedAt: '2026-10-01T08:01:00.000Z'
            }
        });
        assert.deepEqual(submitted.result.session.activeRemediationPlan, activeRemediationPlan);
        const committed = durableCommit.read({ sessionId }).checkpoint;
        assert.deepEqual(committed.activeRemediationPlan, activeRemediationPlan);
        assert.equal(Object.hasOwn(committed, 'extensions'), false);
        assert.deepEqual(committed.attemptIds, [`${sessionId}-attempt-1`]);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('confirmed calculation failures durably commit an infeasibility stop exactly once', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'k283-confirmed-e2e-'));
    try {
        const {
            attemptStore,
            durableCommit,
            authority,
            coordinator
        } = createCoordinatorHarness({
            root,
            sessionId: SESSION_ID
        });

        for (const [index, questionId] of TARGET_QUESTIONS.entries()) {
            const selected = coordinator.selectNext();
            assert.equal(selected.question.id, questionId);
            const prepared = prepareK283DiagnosticSubmission({
                question: selected.question,
                response: 'A',
                confirmation: index === 0 ? '1' : 'yes'
            });
            assert.equal(prepared.diagnostic.failureSignatureId, 'calculation_error');
            const submitted = coordinator.submitSelected({
                attemptId: `${SESSION_ID}-attempt-${index + 1}`,
                args: {
                    response: prepared.response,
                    diagnostic: prepared.diagnostic,
                    startedAt: '2026-10-01T08:00:00.000Z',
                    submittedAt: '2026-10-01T08:01:00.000Z'
                }
            });



            assert.equal(submitted.result.attempt.diagnostic.failureSignatureId, 'calculation_error');
            assert.ok(submitted.result.flowResult.masteryUpdate);
            assert.equal(submitted.result.flowResult.projection.nodeState.attemptStats.total, index + 1);
        }

        let live = authority.inspect().session;
        const summary = live.state.knowledge[TARGET_NODE].failureSummary;
        assert.equal(live.attempts.length, 2);
        assert.equal(attemptStore.listAttemptIds({ sessionId: SESSION_ID }).length, 2);
        assert.equal(summary.calculation_error.count, 2);
        assert.equal(summary.calculation_error.failureSignatureId, 'calculation_error');
        assert.equal(live.currentDecision.action, 'REMEDIATE');
        assert.equal(live.activeRemediationPlan, null);
        const generationStop = live.extensions.remediationGenerationStop;
        assert.equal(generationStop.schemaVersion, '1.0.0');
        assert.equal(generationStop.status, 'INFEASIBLE');
        assert.equal(generationStop.triggerAttemptId, `${SESSION_ID}-attempt-2`);
        assert.equal(generationStop.targetNodeId, TARGET_NODE);
        assert.equal(generationStop.bankId, questionBank.bankId);
        assert.equal(generationStop.bankVersion, questionBank.version);
        assert.equal(generationStop.reasonCode, 'NO_ELIGIBLE_BANK_QUESTION');
        assert.match(generationStop.configFingerprint, /^[a-f0-9]{64}$/);

        const audit = durableCommit.audit({ sessionId: SESSION_ID });
        assert.equal(audit.status, 'CHECKPOINT_MATCHED');
        const committed = durableCommit.read({ sessionId: SESSION_ID });
        assert.deepEqual(committed.checkpoint.extensions.remediationGenerationStop, generationStop);
        assert.deepEqual(committed.checkpoint.attemptIds, [
            `${SESSION_ID}-attempt-1`,
            `${SESSION_ID}-attempt-2`
        ]);
        assert.equal(committed.checkpoint.currentSelection, null);
        assert.equal(committed.checkpoint.currentQuestion, null);
        assert.equal(committed.checkpoint.history.length, 2);
        assert.equal(committed.checkpoint.history.at(-1).attemptId, `${SESSION_ID}-attempt-2`);
        assert.equal(
            committed.checkpoint.state.knowledge[TARGET_NODE].failureSummary.calculation_error.count,
            2
        );
        assert.equal(committed.checkpoint.state.knowledge[TARGET_NODE].attemptStats.total, 2);

        const beforeReplay = committed;
        const replaySelection = coordinator.selectNext();
        assert.equal(replaySelection.selection.status, 'SELECTED');
        assert.throws(
            () => coordinator.submitSelected({
                attemptId: `${SESSION_ID}-attempt-2`,
                args: {
                    response: replaySelection.question.answer.value,
                    startedAt: '2026-10-01T08:06:00.000Z',
                    submittedAt: '2026-10-01T08:07:00.000Z'
                }
            }),
            error => error.code === 'K283_MULTI_INVALID_SUBMIT'
        );
        assert.equal(attemptStore.listAttemptIds({ sessionId: SESSION_ID }).length, 2);
        assert.deepEqual(
            durableCommit.read({ sessionId: SESSION_ID }).checkpoint,
            beforeReplay.checkpoint
        );
        verifyMissingBankIdentityRetainsAttempt();
        verifyLegacyActivePlanCheckpoint();
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
