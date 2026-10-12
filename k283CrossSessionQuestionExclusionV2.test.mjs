import test from 'node:test';
import assert from 'node:assert/strict';
import { getPreviouslyObservedK283QuestionIds, applyK283InitialExclusions, applyK283SelectionExclusions, assertK283QuestionNotPreviouslyObserved } from './k283CrossSessionQuestionGuardV1.js';
import { createK283PersistentMultiTurnCoordinatorV1 } from './src/restoration/k283PersistentMultiTurnCoordinatorV1.js';
import { selectQuestion } from './src/engines/question/questionSelector.js';

// Mock question bank for K283
const mockQuestions = [
    { id: 'Q-A-K283-K-001', primaryNode: 'K283', nodes: ['K283'], evidence: 'know', difficulty: 'D1', questionType: 'mcq', mode: ['practice', 'challenge'] },
    { id: 'Q-A-K283-E-002', primaryNode: 'K283', nodes: ['K283'], evidence: 'explain', difficulty: 'D2', questionType: 'mcq', mode: ['practice', 'challenge'] },
    { id: 'Q-A-K283-A-003', primaryNode: 'K283', nodes: ['K283'], evidence: 'apply', difficulty: 'D3', questionType: 'mcq', mode: ['practice', 'challenge'] },
    { id: 'Q-A-K283-A-004', primaryNode: 'K283', nodes: ['K283'], evidence: 'apply', difficulty: 'D3', questionType: 'mcq', mode: ['practice', 'challenge'] },
    { id: 'Q-A-K283-A-005', primaryNode: 'K283', nodes: ['K283'], evidence: 'apply', difficulty: 'D4', questionType: 'mcq', mode: ['practice', 'challenge'] }
];

const mockQuestionBanks = [
    {
        bankId: 'c09',
        questions: mockQuestions
    }
];

const createMockCoordinator = ({ initialSession, priorQuestionIds, onSelect, onSubmit }) => {
    let revision = 0;
    let session = structuredClone(initialSession);
    let committedAttempts = [];
    let checkpoints = [];

    const authority = {
        inspect: () => ({ sessionId: session.runtime.sessionId, revision, session: structuredClone(session) }),
        mutate: ({ expectedRevision, apply }) => {
            assert.equal(expectedRevision, revision);
            session = apply(structuredClone(session));
            revision++;
        }
    };

    const coordination = {
        withWriter: ({ write }) => write({ epoch: 1 })
    };

    const attemptStore = {
        appendAttempt: ({ attempt }) => { committedAttempts.push(attempt); },
        getAttempt: ({ attemptId }) => committedAttempts.find(a => a.attemptId === attemptId) ?? null,
        listAttemptIds: () => committedAttempts.map(a => a.attemptId)
    };

    const journal = {
        prepare: () => {},
        markUnknown: () => {},
        reconcile: () => ({ status: 'COMMITTED', verification: 'ATTEMPT_MATCHED', externalAttemptCommitVerified: true }),
        read: () => committedAttempts.length === 0 ? null : {
            entries: committedAttempts.map(a => ({ attemptId: a.attemptId, state: 'COMMITTED' }))
        }
    };

    const durableCommit = {
        commit: ({ authority, expectedCheckpointRevision }) => {
            const chk = {
                checkpointRevision: expectedCheckpointRevision + 1,
                authorityRevision: authority.inspect().revision,
                sha256: 'mock-hash-' + (expectedCheckpointRevision + 1),
                checkpoint: { attemptIds: committedAttempts.map(a => a.attemptId) }
            };
            checkpoints.push(chk);
            return {
                durableCheckpointObserved: true,
                sha256: chk.sha256,
                checkpointRevision: chk.checkpointRevision,
                authorityRevision: chk.authorityRevision,
                checkpoint: chk.checkpoint
            };
        },
        read: () => checkpoints.at(-1) ? {
            ...checkpoints.at(-1),
            checkpoint: structuredClone(checkpoints.at(-1).checkpoint)
        } : null,
        audit: () => ({ status: 'CHECKPOINT_MATCHED', authorityRevision: revision })
    };

    const select = ({ session: incomingSession, now }) => {
        const sessionWithExclusions = applyK283SelectionExclusions(incomingSession, priorQuestionIds);
        if (onSelect) return onSelect(sessionWithExclusions, now);

        const selection = selectQuestion({
            adaptiveDecision: sessionWithExclusions.currentDecision,
            questionBanks: mockQuestionBanks,
            history: { recentActions: [], recentQuestions: [] },
            now: now ?? '2026-10-12T00:00:00.000Z'
        });

        const next = structuredClone(sessionWithExclusions);
        next.currentSelection = selection;
        next.currentQuestion = selection.status === 'SELECTED' ? selection.selected.question : null;
        return {
            session: next,
            selection,
            question: next.currentQuestion
        };
    };

    const submit = onSubmit ?? (({ session: s, attemptId }) => {
        const attempt = { attemptId, sessionId: s.runtime.sessionId, questionId: s.currentQuestion?.id };
        const next = structuredClone(s);
        next.attempts.push(attempt);
        // Adaptive engine decision after submit: action CHALLENGE targeting D3/apply
        next.currentDecision = {
            decisionId: 'DECISION-CHALLENGE-2',
            action: 'CHALLENGE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5', preferred: 'D3' },
                excludeQuestionIds: [s.currentQuestion?.id] // AdaptiveEngine only has current session's recent question
            }
        };
        next.currentSelection = null;
        next.currentQuestion = null;
        return { session: next, attempt };
    });

    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId: session.runtime.sessionId,
        authority,
        coordination,
        attemptStore,
        journal,
        durableCommit,
        contentRefs: { test: { id: 'test' } },
        select,
        submit,
        now: () => '2026-10-12T00:00:00.000Z'
    });

    return { coordinator, getSession: () => session, getCheckpoints: () => checkpoints, getAttempts: () => committedAttempts };
};

test('1. Initial PRACTICE does not select previously answered question', () => {
    const priorQuestionIds = ['Q-A-K283-K-001', 'Q-A-K283-E-002'];
    const initialSession = {
        runtime: { sessionId: 'test-session-1' },
        attempts: [],
        masteryRuntime: { evidenceHistoryByNode: { K283: { know: [{ questionId: 'Q-A-K283-K-001' }], explain: [{ questionId: 'Q-A-K283-E-002' }], apply: [], transfer: [] } } },
        currentDecision: {
            decisionId: 'DECISION-1',
            action: 'PRACTICE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5' },
                excludeQuestionIds: []
            }
        }
    };

    const { coordinator } = createMockCoordinator({ initialSession, priorQuestionIds });
    const selectionResult = coordinator.selectNext();

    assert.equal(selectionResult.selection.status, 'SELECTED');
    assert.ok(!priorQuestionIds.includes(selectionResult.question.id));
    assert.doesNotThrow(() => assertK283QuestionNotPreviouslyObserved(selectionResult.question.id, priorQuestionIds));
});

test('2. CHALLENGE after submit does not select question from previous session', () => {
    // Q-A-K283-A-003 was done in a prior session
    const priorQuestionIds = ['Q-A-K283-A-003'];
    const initialSession = {
        runtime: { sessionId: 'test-session-2' },
        attempts: [],
        masteryRuntime: { evidenceHistoryByNode: { K283: { know: [], explain: [], apply: [{ questionId: 'Q-A-K283-A-003' }], transfer: [] } } },
        currentDecision: {
            decisionId: 'DECISION-PRACTICE-1',
            action: 'PRACTICE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5' },
                excludeQuestionIds: []
            }
        }
    };

    const { coordinator } = createMockCoordinator({ initialSession, priorQuestionIds });

    // Turn 1: Selects an eligible question other than Q-A-K283-A-003
    const turn1 = coordinator.selectNext();
    assert.equal(turn1.selection.status, 'SELECTED');
    assert.notEqual(turn1.question.id, 'Q-A-K283-A-003');
    priorQuestionIds.push(turn1.question.id);

    // Submit Turn 1: Triggers CHALLENGE
    const submit1 = coordinator.submitSelected({ attemptId: 'att-1' });
    assert.equal(submit1.status, 'CHECKPOINT_OBSERVED');

    // Turn 2: CHALLENGE targets D3/apply. In mock questions, D3/apply are Q-A-K283-A-003 and Q-A-K283-A-004.
    // Because Q-A-K283-A-003 was in prior session, it MUST NOT be chosen.
    const turn2 = coordinator.selectNext();
    assert.equal(turn2.selection.status, 'SELECTED');
    assert.notEqual(turn2.question.id, 'Q-A-K283-A-003');
    // Guard assertion succeeds
    assert.doesNotThrow(() => assertK283QuestionNotPreviouslyObserved(turn2.question.id, priorQuestionIds));
});

test('3. Does not re-select question answered within the same session', () => {
    const priorQuestionIds = [];
    const initialSession = {
        runtime: { sessionId: 'test-session-3' },
        attempts: [],
        masteryRuntime: { evidenceHistoryByNode: { K283: { know: [], explain: [], apply: [], transfer: [] } } },
        currentDecision: {
            decisionId: 'DECISION-PRACTICE-1',
            action: 'PRACTICE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5' },
                excludeQuestionIds: []
            }
        }
    };

    const { coordinator } = createMockCoordinator({ initialSession, priorQuestionIds });

    // Turn 1
    const turn1 = coordinator.selectNext();
    assert.equal(turn1.selection.status, 'SELECTED');
    const firstQId = turn1.question.id;
    priorQuestionIds.push(firstQId);
    coordinator.submitSelected({ attemptId: 'att-1' });

    // Turn 2
    const turn2 = coordinator.selectNext();
    assert.equal(turn2.selection.status, 'SELECTED');
    assert.notEqual(turn2.question.id, firstQId);
    priorQuestionIds.push(turn2.question.id);
    coordinator.submitSelected({ attemptId: 'att-2' });

    // Turn 3
    const turn3 = coordinator.selectNext();
    assert.equal(turn3.selection.status, 'SELECTED');
    assert.notEqual(turn3.question.id, firstQId);
    assert.notEqual(turn3.question.id, turn2.question.id);
});

test('4. Exclusions generated by AdaptiveEngine are preserved and merged', () => {
    const session = {
        attempts: [{ questionId: 'Q-ATTEMPT-1' }],
        currentDecision: {
            decisionId: 'DECISION-ADAPTIVE-4',
            action: 'CHALLENGE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5', preferred: 'D3' },
                requireDifferentContext: true,
                excludeQuestionIds: ['Q-ADAPTIVE-EXCLUDED']
            }
        }
    };

    const merged = applyK283SelectionExclusions(session, ['Q-PRIOR-1', 'Q-PRIOR-2']);

    // Original session is untouched
    assert.deepEqual(session.currentDecision.selectionCriteria.excludeQuestionIds, ['Q-ADAPTIVE-EXCLUDED']);

    // Criteria are preserved
    assert.equal(merged.currentDecision.selectionCriteria.targetNodeId, 'K283');
    assert.deepEqual(merged.currentDecision.selectionCriteria.difficulty, { min: 'D1', max: 'D5', preferred: 'D3' });
    assert.equal(merged.currentDecision.selectionCriteria.requireDifferentContext, true);

    // Exclusions contain AdaptiveEngine's exclusions, prior exclusions, and attempt exclusions
    assert.deepEqual(
        merged.currentDecision.selectionCriteria.excludeQuestionIds,
        ['Q-ADAPTIVE-EXCLUDED', 'Q-ATTEMPT-1', 'Q-PRIOR-1', 'Q-PRIOR-2'].sort()
    );
});

test('5. When no matching questions remain, stops safely with NO_MATCH without inventing fallback', () => {
    // Exclude all questions in the bank
    const priorQuestionIds = mockQuestions.map(q => q.id);
    const initialSession = {
        runtime: { sessionId: 'test-session-5' },
        attempts: [],
        masteryRuntime: { evidenceHistoryByNode: { K283: { know: [], explain: [], apply: [], transfer: [] } } },
        currentDecision: {
            decisionId: 'DECISION-PRACTICE-5',
            action: 'PRACTICE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5' },
                excludeQuestionIds: []
            }
        }
    };

    const { coordinator } = createMockCoordinator({ initialSession, priorQuestionIds });
    const selectionResult = coordinator.selectNext();

    assert.equal(selectionResult.selection.status, 'NO_MATCH');
    assert.equal(selectionResult.question, null);
    // Coordinator is NOT awaiting submit because status was NO_MATCH
    assert.equal(coordinator.inspect().awaitingSubmit, false);
});

test('6. Evidence History and checkpoints remain unchanged when selection is rejected / NO_MATCH', () => {
    const priorQuestionIds = mockQuestions.map(q => q.id);
    const initialEvidenceHistory = { K283: { know: [{ questionId: 'Q-ORIG' }], explain: [], apply: [], transfer: [] } };
    const initialSession = {
        runtime: { sessionId: 'test-session-6' },
        attempts: [],
        masteryRuntime: { evidenceHistoryByNode: structuredClone(initialEvidenceHistory) },
        currentDecision: {
            decisionId: 'DECISION-PRACTICE-6',
            action: 'PRACTICE',
            target: { primaryNodeId: 'K283', nodeIds: ['K283'] },
            selectionCriteria: {
                targetNodeId: 'K283',
                difficulty: { min: 'D1', max: 'D5' },
                excludeQuestionIds: []
            }
        }
    };

    const { coordinator, getCheckpoints, getAttempts, getSession } = createMockCoordinator({ initialSession, priorQuestionIds });
    const selectionResult = coordinator.selectNext();

    assert.equal(selectionResult.selection.status, 'NO_MATCH');
    // Checkpoints count is 0
    assert.equal(getCheckpoints().length, 0);
    // Attempts count is 0
    assert.equal(getAttempts().length, 0);
    // Evidence History remains identical
    assert.deepEqual(getSession().masteryRuntime.evidenceHistoryByNode, initialEvidenceHistory);
    // Trying to submit throws NO_SELECTION
    assert.throws(() => coordinator.submitSelected({ attemptId: 'att-fail' }), /K283_MULTI_NO_SELECTION/);
});
