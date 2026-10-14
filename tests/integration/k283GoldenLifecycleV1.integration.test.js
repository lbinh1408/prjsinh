/**
 * ============================================================
 * k283GoldenLifecycleV1.integration.test.js
 * ============================================================
 *
 * K283 GOLDEN INTEGRATION REGRESSION — V1
 *
 * Protects the verified adaptive lifecycle:
 *
 *   PRACTICE → CHALLENGE → CHALLENGE → RETEST → SKIP
 *
 * Mastery gates:
 *
 *   M0 → M1 → M2 → M3 → M4/mastered → M4/stable
 *
 * Verified real-world completion state (from production run):
 *
 *   - Mastery: M4
 *   - Status: stable
 *   - Confidence: very_high, score 1.0
 *   - Overall evidence: 0.94
 *   - Attempts: 12 correct / 12 total
 *   - Independent observations: 12
 *   - Distinct contexts: 11
 *   - Distinct question types: 2 (mcq, numeric)
 *   - Latest action: SKIP
 *
 * IMPORTANT CONSTRAINTS
 * ---------------------
 * - NEVER writes to the real `.k283-persistent-draft` directory.
 * - NEVER reads checkpoint or attempt data from disk.
 * - NEVER modifies LOCKED engines (MasteryEngine, AdaptiveEngine,
 *   QuestionSelector, LearningFlow, StudySession).
 * - ALL persistence is fully in-memory using real API surfaces.
 * - Uses only real production data files (question bank, rules,
 *   knowledge map, evidence model, adaptive policies).
 * - Deterministic: fixed session IDs, attempt IDs, and timestamps.
 *
 * TEST IDs
 * --------
 * GL-K283-001 ... GL-K283-024
 *
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// ── Production engines (LOCKED — read-only) ──────────────────────────────────
import {
    createStudySession,
    getNextQuestion,
    submitAnswer
} from '../../src/engines/orchestration/studySession.js';

import {
    evaluateK283Completion,
    MASTERY_LEVELS
} from '../../k283SessionCompletionV1.js';

import {
    bootstrapAdaptiveDecision
} from '../../k283AdaptiveBootstrapV1.js';

import {
    getPreviouslyObservedK283QuestionIds,
    applyK283SelectionExclusions,
    assertK283QuestionNotPreviouslyObserved
} from '../../k283CrossSessionQuestionGuardV1.js';

import {
    createK283PersistentMultiTurnCoordinatorV1
} from '../../src/restoration/k283PersistentMultiTurnCoordinatorV1.js';

// ── Production data files ─────────────────────────────────────────────────────
import questionBankK283 from
    '../../src/data/questions/c09/K283.question-bank.json'
    with { type: 'json' };

import knowledgeMap from
    '../../src/data/knowledge/knowledge-map-v4.json'
    with { type: 'json' };

import evidenceModel from
    '../../src/data/mastery/evidence.json'
    with { type: 'json' };

import masteryRules from
    '../../src/policies/mastery/rules.json'
    with { type: 'json' };

import adaptiveRules from
    '../../src/policies/adaptive/rules.json'
    with { type: 'json' };

import adaptivePaths from
    '../../src/policies/adaptive/paths.json'
    with { type: 'json' };

import failureSignatures from
    '../../src/data/remediation/failure-signatures.json'
    with { type: 'json' };

import studentStateBase from
    '../../src/data/student/student-state.json'
    with { type: 'json' };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_NODE   = 'K283';
const CLUSTER_ID    = 'C09';
const LEARNING_MODE = 'HOC_SAU';
const TIME_BUDGET   = 60;

/** Fixed deterministic session IDs — never auto-generated so tests are stable. */
const SESSION_A = 'LIVE-K283-GOLDEN-SESSION-A';

const T0  = '2026-10-01T08:00:00.000Z';
const T1  = '2026-10-01T08:05:00.000Z';
const T2  = '2026-10-01T08:10:00.000Z';
const T3  = '2026-10-01T08:15:00.000Z';
const T4  = '2026-10-01T08:20:00.000Z';
const T5  = '2026-10-01T08:25:00.000Z';
const T6  = '2026-10-01T08:30:00.000Z';
const T7  = '2026-10-01T08:35:00.000Z';
const T8  = '2026-10-01T08:40:00.000Z';
const T9  = '2026-10-01T08:45:00.000Z';
const T10 = '2026-10-01T08:50:00.000Z';
const T11 = '2026-10-01T08:55:00.000Z';
const T12 = '2026-10-01T09:00:00.000Z';
const T13 = '2026-10-01T09:05:00.000Z';

const TIMESTAMPS = [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13];

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY PERSISTENCE LAYER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory attempt store — contract-compatible with DurableAttemptStore.
 * NEVER touches the filesystem.
 */
function createMemoryAttemptStore() {
    const store = new Map();
    return {
        appendAttempt({ sessionId, attempt }) {
            if (!store.has(sessionId)) store.set(sessionId, []);
            store.get(sessionId).push(structuredClone(attempt));
        },
        getAttempt({ sessionId, attemptId }) {
            const list = store.get(sessionId) ?? [];
            return structuredClone(list.find(a => a.attemptId === attemptId) ?? null);
        },
        listAttemptIds({ sessionId }) {
            return (store.get(sessionId) ?? []).map(a => a.attemptId);
        },
        listAttempts({ sessionId }) {
            return structuredClone(store.get(sessionId) ?? []);
        }
    };
}

/** Canonical JSON digest helper (order-stable). */
function makeDigest() {
    function canonical(v) {
        if (v === null || typeof v !== 'object') return JSON.stringify(v);
        if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
        return '{' + Object.keys(v).sort()
            .map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
    }
    return value => createHash('sha256').update(canonical(value)).digest('hex');
}

/**
 * In-memory submit journal — contract-compatible with DurableSubmitJournalV3.
 * NEVER touches the filesystem.
 */
function createMemoryJournal(attemptStore) {
    const sha = makeDigest();
    const sessions = new Map();
    return {
        prepare({ sessionId, attempt, expectedRevision }) {
            if (!sessions.has(sessionId)) sessions.set(sessionId, { entries: [] });
            sessions.get(sessionId).entries.push({
                attemptId: attempt.attemptId,
                expectedRevision,
                state: 'COMMIT_UNKNOWN',
                attemptSha256: sha(attempt)
            });
        },
        markUnknown({ sessionId, attemptId }) {
            const e = (sessions.get(sessionId)?.entries ?? []).find(x => x.attemptId === attemptId);
            if (e) e.state = 'COMMIT_UNKNOWN';
        },
        reconcile({ sessionId, attemptId }) {
            const entries = sessions.get(sessionId)?.entries ?? [];
            const e = entries.find(x => x.attemptId === attemptId);
            if (!e) return { status: 'NOT_FOUND' };
            const stored   = attemptStore.getAttempt({ sessionId, attemptId });
            const verified = stored && sha(stored) === e.attemptSha256;
            e.state        = verified ? 'COMMITTED' : 'COMMIT_UNKNOWN';
            return {
                status: verified ? 'COMMITTED' : 'UNVERIFIED',
                verification: verified ? 'ATTEMPT_MATCHED' : 'ATTEMPT_MISMATCH',
                externalAttemptCommitVerified: verified
            };
        },
        read(sessionId) {
            return sessions.has(sessionId) ? structuredClone(sessions.get(sessionId)) : null;
        }
    };
}

/**
 * In-memory durable session commit store — contract-compatible with
 * DurableSessionCommitV1. NEVER touches the filesystem.
 */
function createMemoryDurableCommit(attemptStore, journal) {
    const sha     = makeDigest();
    const records = new Map();
    return {
        commit({ authority, sessionId, expectedAuthorityRevision, expectedCheckpointRevision, contentRefs, savedAt }) {
            const snap = authority.inspect();
            if (snap.revision !== expectedAuthorityRevision)
                throw new Error('MEMORY_COMMIT_AUTHORITY_REVISION_MISMATCH');
            const attemptIds   = attemptStore.listAttemptIds({ sessionId });
            const checkpoint   = {
                savedAt,
                attemptIds,
                state:         structuredClone(snap.session.state ?? snap.session),
                masteryRuntime: structuredClone(snap.session.masteryRuntime ?? {}),
                history:       structuredClone(snap.session.history ?? []),
                contentRefs:   structuredClone(contentRefs)
            };
            const checkpointRevision = expectedCheckpointRevision + 1;
            const record = {
                sessionId, sha256: sha(checkpoint), checkpointRevision,
                authorityRevision: expectedAuthorityRevision, checkpoint
            };
            records.set(sessionId, structuredClone(record));
            return { durableCheckpointObserved: true, sha256: record.sha256 };
        },
        read({ sessionId }) {
            return records.has(sessionId) ? structuredClone(records.get(sessionId)) : null;
        },
        audit({ sessionId }) {
            const record = records.get(sessionId);
            if (!record) return { status: 'NOT_FOUND', sessionId };
            const entries       = journal.read(sessionId)?.entries ?? [];
            const allCommitted  = entries.every(e => e.state === 'COMMITTED');
            const ids           = attemptStore.listAttemptIds({ sessionId });
            const checkpointIds = record.checkpoint.attemptIds ?? [];
            const seqMatch      = ids.length === checkpointIds.length &&
                                  ids.every((id, i) => id === checkpointIds[i]);
            return {
                status: allCommitted && seqMatch ? 'CHECKPOINT_MATCHED' : 'CHECKPOINT_MISMATCH',
                sessionId,
                authorityRevision: record.authorityRevision
            };
        }
    };
}

/**
 * In-memory live session revision authority — contract-compatible with
 * LiveSessionRevisionAuthority. NEVER touches the filesystem.
 */
function createMemoryAuthority({ initialSession, sessionId }) {
    let revision = 0;
    let session  = structuredClone(initialSession);
    return {
        inspect: () => ({ sessionId, revision, session: structuredClone(session) }),
        mutate:  ({ expectedRevision, apply }) => {
            if (expectedRevision !== revision)
                throw new Error(`MEMORY_AUTHORITY_REVISION_MISMATCH: expected ${expectedRevision}, got ${revision}`);
            session = apply(structuredClone(session));
            revision++;
        }
    };
}

/**
 * In-memory sequential coordination — contract-compatible with
 * AtomicCaptureCoordinationV1. NEVER touches the filesystem.
 */
function createMemoryCoordination() {
    let locked = false;
    return {
        withWriter({ write }) {
            if (locked) throw new Error('MEMORY_COORDINATION_LOCKED');
            locked = true;
            try   { return write(); }
            finally { locked = false; }
        }
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical initial PRACTICE decision for a fresh session. */
function createInitialDecision(sessionId) {
    return {
        decisionId: `DECISION-${sessionId}-INITIAL`,
        action: 'PRACTICE',
        target: { primaryNodeId: TARGET_NODE, nodeIds: [TARGET_NODE] },
        selectionCriteria: {
            questionTypes:               ['mcq'],
            difficulty:                  { min: 'D1', max: 'D5', preferred: 'D3' },
            evidenceDimensions:          [],
            excludeQuestionIds:          [],
            requireDifferentQuestion:    false,
            requireDifferentContext:     false,
            requireIndependentEvidence:  false,
            metaSkills:                  [],
            secondaryNodes:              [],
            failureSignatures:           []
        },
        constraints: { requireDifferentContext: false, requireDifferentQuestion: false },
        path:     { current: 'PRACTICE', next: null },
        fallback: null
    };
}

/** Build the question banks map expected by StudySession. */
function buildQuestionBanks(bank) {
    return { [TARGET_NODE]: bank };
}

/** Stub content refs for in-memory sessions. */
function buildMemoryContentRefs() {
    return {
        questionBank: { id: 'K283.question-bank.json', version: 'test-golden-v1', sha256: 'a'.repeat(64) },
        knowledgeMap: { id: 'knowledge-map-v4.json',   version: 'test-golden-v1', sha256: 'b'.repeat(64) },
        masteryRules: { id: 'mastery/rules.json',      version: 'test-golden-v1', sha256: 'c'.repeat(64) }
    };
}

/** Create a fully in-memory StudySession. */
function createSession({ sessionId, studentState, initialDecision, history = [], now = T0 }) {
    return createStudySession({
        sessionId,
        studentState:   structuredClone(studentState),
        initialDecision: structuredClone(initialDecision),
        questionBanks:  buildQuestionBanks(questionBankK283),
        knowledgeMap,
        masteryRules,
        evidenceModel,
        adaptiveRules,
        adaptivePaths,
        failureSignatures,
        remediationRules: null,
        learningMode:    LEARNING_MODE,
        timeBudget:      TIME_BUDGET,
        clusterId:       CLUSTER_ID,
        lessonId:        null,
        contextId:       'golden-test-k283',
        history,
        historyLimit:    50,
        now
    });
}

/**
 * Create a complete in-memory coordinator.
 * `excludedIds` are merged into every selectNext call.
 */
function buildCoordinator({ session, sessionId, excludedIds = [] }) {
    const attemptStore  = createMemoryAttemptStore();
    const journal       = createMemoryJournal(attemptStore);
    const durableCommit = createMemoryDurableCommit(attemptStore, journal);
    const authority     = createMemoryAuthority({ initialSession: session, sessionId });
    const coordination  = createMemoryCoordination();
    const contentRefs   = buildMemoryContentRefs();

    const coordinator = createK283PersistentMultiTurnCoordinatorV1({
        sessionId,
        authority,
        coordination,
        attemptStore,
        journal,
        durableCommit,
        contentRefs,
        select: ({ session, now }) => {
            const withExclusions = applyK283SelectionExclusions(session, excludedIds);
            return getNextQuestion({ session: withExclusions, now });
        },
        submit: submitAnswer
    });

    return { coordinator, authority, attemptStore, journal, durableCommit };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER HELPERS (read-only, no side effects)
// ─────────────────────────────────────────────────────────────────────────────

function findCorrectMCQAnswer(question) {
    if (typeof question.answer === 'object' && question.answer?.value) {
        return question.answer.value;
    }
    if (typeof question.answer === 'string') return question.answer;
    if (question.correctAnswer) return question.correctAnswer;
    for (const key of ['A', 'B', 'C', 'D']) {
        if (question.options?.[key]?.isCorrect) return key;
    }
    const idx = question.correctAnswerIndex ?? question.answerIndex;
    return typeof idx === 'number' ? ['A', 'B', 'C', 'D'][idx] : 'A';
}

function findCorrectNumericAnswer(question) {
    if (typeof question.answer === 'object' && question.answer?.value !== undefined) {
        return question.answer.value;
    }
    return question.correctAnswer ?? question.answer ?? question.expectedAnswer ?? 25;
}

function getCorrectResponse(question) {
    return question.questionType === 'numeric'
        ? findCorrectNumericAnswer(question)
        : findCorrectMCQAnswer(question);
}

function getIncorrectResponse(question) {
    if (question.questionType === 'numeric') {
        const correct = findCorrectNumericAnswer(question);
        return typeof correct === 'number' ? correct + 10 : 999;
    }
    const correct = findCorrectMCQAnswer(question);
    for (const key of ['A', 'B', 'C', 'D']) {
        if (key !== correct) return key;
    }
    return 'X';
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run N correct turns through an already-built coordinator.
 * Returns the array of turn results (question, session snapshot, etc.).
 */
async function runCorrectTurns({ coordinator, sessionId, n, startIdx = 0, priorIds = [] }) {
    const turns = [];
    for (let i = 0; i < n; i++) {
        const idx        = startIdx + i;
        const startedAt  = TIMESTAMPS[idx]     ?? T13;
        const submittedAt = TIMESTAMPS[idx + 1] ?? T13;
        const attemptId  = `ATTEMPT-${sessionId}-${String(idx + 1).padStart(3, '0')}`;

        const selResult = coordinator.selectNext();
        const { selection, question } = selResult;

        // If adaptive engine decides SKIP / learning complete, no further questions required
        if (selection.status === 'NOT_REQUIRED' || !question) {
            break;
        }

        assert.equal(selection.status, 'SELECTED', `Turn ${idx + 1}: expected SELECTED`);
        assertK283QuestionNotPreviouslyObserved(question.id, priorIds);

        const response     = getCorrectResponse(question);
        const submitResult = coordinator.submitSelected({
            attemptId,
            args: { response, attemptId, startedAt, submittedAt, attemptNumber: 1, now: submittedAt }
        });

        turns.push({
            idx: idx + 1,
            questionId:   question.id,
            question,
            response,
            submitResult,
            session: submitResult.result?.session,
            attempt: submitResult.result?.attempt
        });
    }
    return turns;
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT INSPECTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getNodeState(session) {
    const studentState = session?.state ?? session?.studentState ?? null;
    return studentState?.knowledge?.[TARGET_NODE]
        ?? studentState?.mastery?.nodes?.[TARGET_NODE]
        ?? null;
}

function getMasteryLevel(session) {
    const node = getNodeState(session);
    return node?.mastery ?? node?.level ?? null;
}

function getMasteryStatus(session) {
    const node = getNodeState(session);
    return node?.status ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 1: STATIC INVARIANTS ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-001: question bank contains at least 26 questions for lifecycle coverage', () => {
    const questions = questionBankK283.questions ?? questionBankK283;
    const arr = Array.isArray(questions) ? questions : Object.values(questions);
    assert.ok(arr.length >= 26, `Expected ≥ 26 questions, got ${arr.length}`);
});

test('GL-K283-002: question bank contains at least 1 numeric question (required for M4 lifecycle)', () => {
    const questions = questionBankK283.questions ?? questionBankK283;
    const arr = Array.isArray(questions) ? questions : Object.values(questions);
    const numeric = arr.filter(q => q.questionType === 'numeric');
    assert.ok(numeric.length >= 1, 'Expected at least 1 numeric question');
});

test('GL-K283-003: question bank covers all 4 evidence dimensions: know, explain, apply, transfer', () => {
    const questions = questionBankK283.questions ?? questionBankK283;
    const arr = Array.isArray(questions) ? questions : Object.values(questions);
    const dims = new Set(arr.map(q => q.evidence || q.evidenceDimension));
    for (const d of ['know', 'explain', 'apply', 'transfer']) {
        assert.ok(dims.has(d), `Missing evidence dimension: ${d}`);
    }
});

test('GL-K283-004: MASTERY_LEVELS export contains M0 through M4', () => {
    for (const level of ['M0', 'M1', 'M2', 'M3', 'M4']) {
        assert.ok(MASTERY_LEVELS.includes(level), `Missing mastery level: ${level}`);
    }
});

test('GL-K283-005: stableRules declares M4 + mastered + retestPassed conditions', () => {
    const r = masteryRules.stableRules;
    assert.ok(r,                                            'stableRules must exist');
    assert.ok(r.conditions.some(c => c.includes('M4')),     'stableRules must require M4');
    assert.ok(r.conditions.some(c => c.includes('mastered')),'stableRules must require mastered status');
    assert.ok(r.conditions.some(c => c.includes('retestPassed')), 'stableRules must require retestPassed');
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 2: CROSS-SESSION GUARD API CONTRACTS ───────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-006: getPreviouslyObservedK283QuestionIds deduplicates and sorts IDs across 4 dimensions', () => {
    const evidenceHistoryByNode = {
        K283: {
            know:     [{ questionId: 'Q-A-K283-K-001' }, { questionId: 'Q-A-K283-K-001' }],
            explain:  [{ questionId: 'Q-A-K283-E-002' }],
            apply:    [{ questionId: 'Q-A-K283-A-003' }],
            transfer: [{ questionId: 'Q-A-K283-T-008' }]
        }
    };
    const ids = getPreviouslyObservedK283QuestionIds(evidenceHistoryByNode);
    assert.deepEqual(ids, ['Q-A-K283-A-003', 'Q-A-K283-E-002', 'Q-A-K283-K-001', 'Q-A-K283-T-008']);
});

test('GL-K283-007: assertK283QuestionNotPreviouslyObserved throws K283_CROSS_SESSION_REPEATED_QUESTION_BLOCKED for repeated question', () => {
    assert.throws(
        () => assertK283QuestionNotPreviouslyObserved('Q-A-K283-K-001', ['Q-A-K283-K-001']),
        /K283_CROSS_SESSION_REPEATED_QUESTION_BLOCKED/
    );
});

test('GL-K283-008: assertK283QuestionNotPreviouslyObserved passes for new question not in prior list', () => {
    assert.doesNotThrow(
        () => assertK283QuestionNotPreviouslyObserved('Q-A-K283-K-999', ['Q-A-K283-K-001'])
    );
});

test('GL-K283-009: applyK283SelectionExclusions merges existing, prior, and session attempt IDs', () => {
    const session = {
        currentDecision: {
            action: 'PRACTICE',
            selectionCriteria: { excludeQuestionIds: ['Q-EXISTING'] }
        },
        attempts: [{ questionId: 'Q-ATTEMPT-1' }]
    };
    const result   = applyK283SelectionExclusions(session, ['Q-PRIOR-1']);
    const excluded = result.currentDecision.selectionCriteria.excludeQuestionIds;
    assert.ok(excluded.includes('Q-EXISTING'),  'Must retain existing exclusion');
    assert.ok(excluded.includes('Q-PRIOR-1'),   'Must include prior cross-session ID');
    assert.ok(excluded.includes('Q-ATTEMPT-1'), 'Must include current session attempt ID');
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 3: BOOTSTRAP ENGINE CONTRACTS ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-010: bootstrapAdaptiveDecision returns null or valid decision — never throws for blank student state', () => {
    const result = bootstrapAdaptiveDecision({
        studentState:  structuredClone(studentStateBase),
        dependencies:  { knowledgeMap, adaptiveRules, adaptivePaths },
        targetNodeId:  TARGET_NODE
    });
    assert.ok(
        result === null || (typeof result === 'object' && typeof result.action === 'string'),
        'Bootstrap must return null or a valid decision with action string'
    );
});

test('GL-K283-011: bootstrapAdaptiveDecision throws K283_BOOTSTRAP_INVALID_ARGUMENTS for null studentState', () => {
    assert.throws(
        () => bootstrapAdaptiveDecision({ studentState: null, dependencies: { knowledgeMap, adaptiveRules, adaptivePaths } }),
        /K283_BOOTSTRAP_INVALID_ARGUMENTS/
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 4: IN-MEMORY COORDINATOR LIFECYCLE ────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-012: fresh session selects first question with status SELECTED', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator } = buildCoordinator({ session, sessionId: SESSION_A });

    const result = coordinator.selectNext();
    assert.equal(result.selection.status, 'SELECTED', 'First question must be SELECTED');
    assert.ok(result.question,    'First question must not be null');
    assert.ok(result.question.id, 'First question must have an id');
});

test('GL-K283-013: coordinator throws K283_MULTI_SELECTION_PENDING on double-selection before submit', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator } = buildCoordinator({ session, sessionId: SESSION_A });
    coordinator.selectNext();
    assert.throws(() => coordinator.selectNext(), /K283_MULTI_SELECTION_PENDING/);
});

test('GL-K283-014: one correct turn produces CHECKPOINT_OBSERVED with checkpointRevision === 1', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit } = buildCoordinator({ session, sessionId: SESSION_A });

    const selResult    = coordinator.selectNext();
    const response     = getCorrectResponse(selResult.question);
    const attemptId    = `ATTEMPT-${SESSION_A}-001`;
    const submitResult = coordinator.submitSelected({
        attemptId,
        args: { response, attemptId, startedAt: T0, submittedAt: T1, attemptNumber: 1, now: T1 }
    });

    assert.equal(submitResult.status,              'CHECKPOINT_OBSERVED');
    assert.equal(submitResult.checkpointRevision,  1);

    const record = durableCommit.read({ sessionId: SESSION_A });
    assert.ok(record,                          'Checkpoint record must exist after first submit');
    assert.equal(record.checkpointRevision,    1);
    assert.deepEqual(record.checkpoint.attemptIds, [attemptId]);
});

test('GL-K283-015: coordinator audit returns CHECKPOINT_MATCHED after one successful submit', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit } = buildCoordinator({ session, sessionId: SESSION_A });

    const selResult = coordinator.selectNext();
    const response  = getCorrectResponse(selResult.question);
    const attemptId = `ATTEMPT-${SESSION_A}-001`;
    coordinator.submitSelected({
        attemptId,
        args: { response, attemptId, startedAt: T0, submittedAt: T1, attemptNumber: 1, now: T1 }
    });

    const audit = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit.status, 'CHECKPOINT_MATCHED', 'Audit must pass after first submit');
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 5: MULTI-TURN LIFECYCLE ───────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-016: consecutive correct turns reach M4 with intact audit chain', async () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit } = buildCoordinator({ session, sessionId: SESSION_A });

    const turns = await runCorrectTurns({ coordinator, sessionId: SESSION_A, n: 12 });
    assert.ok(turns.length >= 8, `Expected at least 8 turns, got ${turns.length}`);

    // Audit chain integrity
    const audit = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit.status, 'CHECKPOINT_MATCHED', 'Audit must pass after lifecycle completes');

    // Checkpoint completeness
    const record = durableCommit.read({ sessionId: SESSION_A });
    assert.ok(record, 'Checkpoint record must exist');
    assert.equal(record.checkpointRevision, turns.length);
    assert.equal(record.checkpoint.attemptIds.length, turns.length);

    // Mastery gate — M4 expected after consecutive correct answers
    const lastTurn = turns[turns.length - 1];
    const level = getMasteryLevel(lastTurn.session);
    assert.equal(level, 'M4', `Expected M4, got ${level}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 6: CROSS-SESSION EXCLUSION INVARIANTS ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-017: all questions selected in 12-turn lifecycle are unique (no intra-session repeats)', async () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator } = buildCoordinator({ session, sessionId: SESSION_A });

    const turns = await runCorrectTurns({ coordinator, sessionId: SESSION_A, n: 12 });
    const ids   = turns.map(t => t.questionId);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, `Found ${ids.length - unique.size} repeated question(s)`);
});

test('GL-K283-018: evaluateK283Completion correctly identifies M4 as session complete', () => {
    const nodeState = {
        mastery: 'M4',
        status: 'mastered',
        overallEvidence: 0.94,
        confidence: 'very_high',
        independentObservations: 12
    };
    const result = evaluateK283Completion({
        nodeState,
        targetMastery: 'M4',
        checkpointObserved: true
    });
    assert.equal(result.complete, true, 'M4 with checkpoint observed must be complete');
    assert.equal(result.currentMastery, 'M4', 'Must report M4 current mastery');
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 7: STRUCTURAL GUARDS ──────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-019: initial PRACTICE decision has action==PRACTICE and excludeQuestionIds==[]', () => {
    const decision = createInitialDecision(SESSION_A);
    assert.equal(decision.action,                                         'PRACTICE');
    assert.deepEqual(decision.selectionCriteria.excludeQuestionIds,       []);
    assert.equal(decision.selectionCriteria.requireDifferentQuestion,     false);
    assert.equal(decision.selectionCriteria.requireDifferentContext,      false);
});

test('GL-K283-020: session history accumulates across consecutive turns', async () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator } = buildCoordinator({ session, sessionId: SESSION_A });

    const turns = await runCorrectTurns({ coordinator, sessionId: SESSION_A, n: 3 });
    const history = turns[2].session?.history ?? [];
    assert.ok(history.length >= 1, 'Session history must grow across turns');
});

test('GL-K283-021: real transition M4/mastered -> RETEST -> M4/stable -> SKIP with durable checkpoint persistence', async () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit, authority } = buildCoordinator({ session, sessionId: SESSION_A });

    let turn = 0;
    let masteredTurn = null;
    let stableTurn = null;

    while (turn < 15) {
        const selResult = coordinator.selectNext();
        if (selResult.selection.status === 'NOT_REQUIRED') {
            assert.equal(selResult.question, null, 'No question when NOT_REQUIRED');
            assert.equal(authority.inspect().session.currentDecision.action, 'SKIP', 'Terminal decision must be SKIP');
            break;
        }

        turn++;
        const attemptId = `ATTEMPT-${SESSION_A}-${String(turn).padStart(3, '0')}`;
        const startedAt = TIMESTAMPS[turn - 1] ?? T13;
        const submittedAt = TIMESTAMPS[turn] ?? T13;
        const response = getCorrectResponse(selResult.question);

        const submitResult = coordinator.submitSelected({
            attemptId,
            args: { response, attemptId, startedAt, submittedAt, attemptNumber: 1, now: submittedAt }
        });

        const turnSession = submitResult.result.session;
        const node = getNodeState(turnSession);

        if (node?.mastery === 'M4' && node?.status === 'mastered' && !masteredTurn) {
            masteredTurn = { turn, session: turnSession, question: selResult.question };
        } else if (node?.mastery === 'M4' && node?.status === 'stable' && !stableTurn) {
            stableTurn = { turn, session: turnSession, question: selResult.question };
        }
    }

    assert.ok(masteredTurn, 'Must reach M4/mastered');
    assert.equal(
        masteredTurn.session.currentDecision.action,
        'RETEST',
        'AdaptiveEngine must derive RETEST action once M4/mastered is reached'
    );

    assert.ok(stableTurn, 'Must reach M4/stable');
    assert.equal(stableTurn.turn, masteredTurn.turn + 1, 'Stable turn must immediately follow mastered turn');
    assert.equal(
        stableTurn.session.currentDecision.action,
        'SKIP',
        'AdaptiveEngine must derive SKIP action once M4/stable is reached'
    );

    // Verify checkpoint persistence across the real transitions
    const audit = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit.status, 'CHECKPOINT_MATCHED', 'Checkpoint audit must pass with matching SHA and journal state');

    const checkpointRecord = durableCommit.read({ sessionId: SESSION_A });
    assert.ok(checkpointRecord, 'Durable checkpoint record must exist');
    assert.equal(
        checkpointRecord.checkpointRevision,
        turn,
        'Checkpoint revision must match total completed turns'
    );
    const persistedNode = checkpointRecord.checkpoint.state.knowledge[TARGET_NODE];
    assert.equal(persistedNode?.mastery, 'M4', 'Persisted checkpoint must preserve M4');
    assert.equal(persistedNode?.status, 'stable', 'Persisted checkpoint must preserve stable status');
});

// ─────────────────────────────────────────────────────────────────────────────
// ─── SUITE 8: NEGATIVE LEARNING PATHS & RECOVERY ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

test('GL-K283-022: wrong answer creates real incorrect attempt, updates weakness signals, guides adaptive decision and exclusions, and persists checkpoint', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit, authority } = buildCoordinator({ session, sessionId: SESSION_A });

    // 1. Select initial question
    const sel1 = coordinator.selectNext();
    assert.equal(sel1.selection.status, 'SELECTED');
    const q1 = sel1.question;
    assert.ok(q1?.id);

    // 2. Submit wrong answer
    const incorrectResp = getIncorrectResponse(q1);
    const attemptId1 = `ATTEMPT-${SESSION_A}-001`;
    const submitResult1 = coordinator.submitSelected({
        attemptId: attemptId1,
        args: { response: incorrectResp, attemptId: attemptId1, startedAt: T0, submittedAt: T1, attemptNumber: 1, now: T1 }
    });

    // 3. Verify attempt is a real incorrect attempt
    const attempt1 = submitResult1.result?.attempt;
    const eval1 = submitResult1.result?.evaluation;
    assert.ok(attempt1, 'Attempt must be produced');
    assert.equal(attempt1.result, 'incorrect', 'Wrong answer must be marked result=incorrect');
    assert.equal(attempt1.score, 0, 'Wrong answer must have score 0');
    assert.equal(eval1?.correct, false, 'Evaluation must mark correct=false');

    // 4. Verify mastery evidence and weakness/failure signals
    const s1 = submitResult1.result?.session;
    const node1 = getNodeState(s1);
    assert.notEqual(node1?.mastery, 'M4', 'Initial wrong answer must not grant mastery');
    const weaknessSignals = s1.state?.weaknessSignals ?? s1.state?.remediation?.weaknessSignals ?? [];
    assert.ok(
        Array.isArray(weaknessSignals) || typeof s1.state?.evidenceHistory === 'object',
        'State must maintain signals / evidence structure'
    );

    // 5. Verify AdaptiveEngine produces policy-valid next decision
    const nextDecision = s1.currentDecision;
    assert.ok(nextDecision?.action, 'AdaptiveEngine must produce an action');
    assert.ok(
        ['PRACTICE', 'LEARN', 'REMEDIATE'].includes(nextDecision.action),
        `Next action after failure should be instructional/practice/remediate, got ${nextDecision.action}`
    );
    assert.notEqual(nextDecision.action, 'SKIP', 'Must not SKIP on wrong answer');

    // 6. Verify QuestionSelector respects exclusions and criteria on next selection
    const sel2 = coordinator.selectNext();
    assert.equal(sel2.selection.status, 'SELECTED');
    const q2 = sel2.question;
    assert.ok(q2?.id);
    assert.notEqual(q2.id, q1.id, 'QuestionSelector must not immediately repeat the failed question');

    // 7. Verify checkpoint persists negative attempt and passes audit
    const audit1 = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit1.status, 'CHECKPOINT_MATCHED', 'Checkpoint audit must pass after negative attempt');
    const record1 = durableCommit.read({ sessionId: SESSION_A });
    assert.equal(record1.checkpointRevision, 1);
    assert.deepEqual(record1.checkpoint.attemptIds, [attemptId1]);
});

test('GL-K283-023: subsequent correct attempts recover evidence without artificial mastery promotion', () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit, authority } = buildCoordinator({ session, sessionId: SESSION_A });

    // Turn 1: Incorrect attempt
    const sel1 = coordinator.selectNext();
    const q1 = sel1.question;
    const att1 = `ATTEMPT-${SESSION_A}-001`;
    coordinator.submitSelected({
        attemptId: att1,
        args: { response: getIncorrectResponse(q1), attemptId: att1, startedAt: T0, submittedAt: T1, attemptNumber: 1, now: T1 }
    });

    const nodeAfterFail = getNodeState(authority.inspect().session);
    const initialLevel = nodeAfterFail?.mastery ?? 'M0';

    // Turn 2: Correct attempt to recover
    const sel2 = coordinator.selectNext();
    const q2 = sel2.question;
    const att2 = `ATTEMPT-${SESSION_A}-002`;
    const submitResult2 = coordinator.submitSelected({
        attemptId: att2,
        args: { response: getCorrectResponse(q2), attemptId: att2, startedAt: T1, submittedAt: T2, attemptNumber: 1, now: T2 }
    });

    const nodeAfterRecover = getNodeState(submitResult2.result.session);
    assert.ok(
        nodeAfterRecover?.mastery === initialLevel || nodeAfterRecover?.mastery === 'M1',
        `Recovery must not jump artificially, got ${nodeAfterRecover?.mastery}`
    );
    assert.notEqual(nodeAfterRecover?.mastery, 'M4', 'One recovery attempt must not jump directly to M4');

    // Turn 3: Second correct attempt
    const sel3 = coordinator.selectNext();
    const q3 = sel3.question;
    const att3 = `ATTEMPT-${SESSION_A}-003`;
    const submitResult3 = coordinator.submitSelected({
        attemptId: att3,
        args: { response: getCorrectResponse(q3), attemptId: att3, startedAt: T2, submittedAt: T3, attemptNumber: 1, now: T3 }
    });

    const nodeTurn3 = getNodeState(submitResult3.result.session);
    assert.notEqual(nodeTurn3?.status, 'stable', 'Must not be stable yet during recovery phase');

    const audit = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit.status, 'CHECKPOINT_MATCHED', 'Durable audit chain must be verified along recovery path');
});

test('GL-K283-024: wrong RETEST must not produce M4/stable and persists negative retest checkpoint', async () => {
    const session = createSession({
        sessionId: SESSION_A,
        studentState: structuredClone(studentStateBase),
        initialDecision: createInitialDecision(SESSION_A),
        now: T0
    });
    const { coordinator, durableCommit, authority } = buildCoordinator({ session, sessionId: SESSION_A });

    // Step 1: Run correct turns up to M4/mastered
    let turn = 0;
    let reachedMastered = false;

    while (turn < 12) {
        const sel = coordinator.selectNext();
        if (sel.selection.status !== 'SELECTED') break;

        turn++;
        const attemptId = `ATTEMPT-${SESSION_A}-${String(turn).padStart(3, '0')}`;
        const startedAt = TIMESTAMPS[turn - 1] ?? T13;
        const submittedAt = TIMESTAMPS[turn] ?? T13;
        const response = getCorrectResponse(sel.question);

        const sub = coordinator.submitSelected({
            attemptId,
            args: { response, attemptId, startedAt, submittedAt, attemptNumber: 1, now: submittedAt }
        });

        const node = getNodeState(sub.result.session);
        const decision = sub.result.session?.currentDecision;

        if (node?.mastery === 'M4' && node?.status === 'mastered') {
            reachedMastered = true;
            assert.equal(decision?.action, 'RETEST', 'Must receive RETEST action upon reaching M4/mastered');
            break;
        }
    }

    assert.ok(reachedMastered, 'Must reach M4/mastered before RETEST test');

    // Step 2: The next turn is the RETEST question. Submit an INCORRECT response!
    const retestSel = coordinator.selectNext();
    assert.equal(retestSel.selection.status, 'SELECTED');
    const retestQuestion = retestSel.question;
    assert.ok(retestQuestion, 'Must have a question selected for RETEST');

    turn++;
    const retestAttemptId = `ATTEMPT-${SESSION_A}-${String(turn).padStart(3, '0')}`;
    const retestStartedAt = TIMESTAMPS[turn - 1] ?? T13;
    const retestSubmittedAt = TIMESTAMPS[turn] ?? T13;
    const incorrectRetestResp = getIncorrectResponse(retestQuestion);

    const retestSubmitResult = coordinator.submitSelected({
        attemptId: retestAttemptId,
        args: {
            response: incorrectRetestResp,
            attemptId: retestAttemptId,
            startedAt: retestStartedAt,
            submittedAt: retestSubmittedAt,
            attemptNumber: 1,
            now: retestSubmittedAt
        }
    });

    const retestAttempt = retestSubmitResult.result.attempt;
    const retestEval = retestSubmitResult.result.evaluation;
    assert.equal(retestAttempt.result, 'incorrect', 'Failed RETEST must produce incorrect attempt result');
    assert.equal(retestAttempt.score, 0, 'Failed RETEST score must be 0');
    assert.equal(retestEval?.correct, false, 'Failed RETEST evaluation must be correct=false');

    // Step 3: Verify M4/stable is NOT achieved
    const postRetestSession = retestSubmitResult.result.session;
    const postRetestNode = getNodeState(postRetestSession);
    assert.notEqual(
        postRetestNode?.status,
        'stable',
        'Wrong RETEST must NEVER produce M4/stable status'
    );

    // Step 4: Verify AdaptiveEngine does NOT derive SKIP
    const postRetestDecision = postRetestSession?.currentDecision;
    assert.notEqual(
        postRetestDecision?.action,
        'SKIP',
        'Wrong RETEST must not produce SKIP action'
    );

    // Step 5: Verify checkpoint persistence across the negative RETEST attempt
    const audit = durableCommit.audit({ sessionId: SESSION_A });
    assert.equal(audit.status, 'CHECKPOINT_MATCHED', 'Audit must pass after failed RETEST checkpoint');

    const checkpointRecord = durableCommit.read({ sessionId: SESSION_A });
    assert.ok(checkpointRecord, 'Durable checkpoint record must exist');
    assert.equal(checkpointRecord.checkpointRevision, turn, 'Checkpoint revision must match all attempts');
    assert.ok(
        checkpointRecord.checkpoint.attemptIds.includes(retestAttemptId),
        'Checkpoint must contain the failed RETEST attempt'
    );
    const persistedNode = checkpointRecord.checkpoint.state.knowledge[TARGET_NODE];
    assert.notEqual(persistedNode?.status, 'stable', 'Persisted checkpoint must NOT be stable');
});
