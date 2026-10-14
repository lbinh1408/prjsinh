
/**
 * Phase 3.2 — Checkpoint Codec V1 Unit Tests
 *
 * Scope:
 * - JSON round-trip
 * - Required fields and version validation
 * - Content reference validation
 * - Attempt durability guard
 * - Evidence fidelity
 * - Active question fidelity
 * - Input immutability
 * - Exclusion of runtime dependencies
 *
 * Does NOT test:
 * - StudySession hydration
 * - Durable storage
 * - Atomic commits
 * - Real content hash verification
 * - Student State schema validation
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHECKPOINT_CODEC_INFO,
    encodeCheckpoint,
    decodeCheckpoint,
    validateCheckpoint,
    getCheckpointCodecInfo
} from '../../../src/persistence/checkpointCodec.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

const SAVED_AT = '2026-10-08T10:00:00.000Z';

function makeContentRefs() {
    return {
        knowledgeMap: {
            id: 'knowledge-map-v4',
            version: '4.0.0',
            sha256: HASH_A
        },
        questionBank: {
            id: 'k283-question-bank',
            version: '1.0.0',
            sha256: HASH_B
        }
    };
}

function makeSession({
    withAttempt = false,
    withActiveQuestion = false,
    withEvidence = false
} = {}) {
    const session = {
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId: 'session-k283-test',
            startedAt: SAVED_AT,
            lastActivityAt: SAVED_AT,
            status: 'active'
        },

        config: {
            learningMode: 'practice',
            timeBudget: 30,
            clusterId: 'C09',
            lessonId: 'lesson-k283',
            contextId: 'test-context',
            historyLimit: 20
        },

        dependencies: {
            questionBanks: [
                {
                    id: 'mock-question-bank',
                    questions: []
                }
            ],
            knowledgeMap: {
                id: 'mock-knowledge-map'
            }
        },

        state: {
            schemaVersion: '1.2.0',
            studentId: 'student-test',
            mastery: {
                K283: 'M3'
            }
        },

        currentDecision: {
            action: 'practice',
            targetNode: 'K283'
        },

        currentSelection: null,
        currentQuestion: null,

        lessonRuntime: {
            plan: {
                id: 'generated-plan',
                sections: []
            },
            currentItem: null,
            progress: {
                completedSectionIds: [],
                skippedSectionIds: []
            }
        },

        activeRemediationPlan: null,
        attempts: [],
        history: [],

        masteryRuntime: {
            evidenceHistoryByNode: {}
        },

        lastFlowResult: {
            diagnostic: 'excluded-from-checkpoint'
        }
    };

    if (withActiveQuestion) {
        session.currentSelection = {
            questionId: 'Q-A-K283-A-010',
            primaryNode: 'K283'
        };

        session.currentQuestion = {
            id: 'Q-A-K283-A-010',
            questionType: 'numeric',
            context: {
                contextId:
                    'c09-k283-transfer-gamete-counts-03'
            },
            content: {
                stem: 'Test question',
                answer: 25
            }
        };

        session.lessonRuntime.currentItem = {
            sectionId: 'S08',
            type: 'question_set'
        };
    }

    if (withAttempt) {
        session.attempts = [
            {
                attemptId: 'attempt-k283-001',
                questionId: 'Q-A-K283-A-010',
                response: 25,
                isCorrect: true
            }
        ];

        session.history = [
            {
                questionId: 'Q-A-K283-A-010',
                primaryNode: 'K283'
            }
        ];
    }

    if (withEvidence) {
        session.masteryRuntime.evidenceHistoryByNode = {
            K283: {
                transfer: [
                    {
                        questionId: 'Q-A-K283-A-010',
                        contextId:
                            'c09-k283-transfer-gamete-counts-03',
                        questionType: 'numeric',
                        score: 1,
                        reliabilityWeight: 1,
                        independent: true
                    }
                ]
            }
        };
    }

    return session;
}

function encode(session, overrides = {}) {
    return encodeCheckpoint({
        session,
        contentRefs: makeContentRefs(),
        revision: 1,
        savedAt: SAVED_AT,
        persistedAttemptIds:
            session.attempts.map(attempt => attempt.attemptId),
        ...overrides
    });
}

/* ============================================================
 * A. BASIC CONTRACT
 * ============================================================ */

test('P3.2-C01: codec metadata is correct', () => {
    const info = getCheckpointCodecInfo();

    assert.equal(info.name, 'StudySessionCheckpointCodec');
    assert.equal(info.version, '1.0.0-draft');
    assert.equal(info.supportsHydration, false);
    assert.equal(info.supportsPersistence, false);

    assert.deepStrictEqual(info, CHECKPOINT_CODEC_INFO);
});

test('P3.2-C02: encode creates a valid checkpoint', () => {
    const session = makeSession();

    const checkpoint = encode(session);

    assert.equal(validateCheckpoint(checkpoint), true);

    assert.equal(
        checkpoint.schemaVersion,
        '1.0.0-draft'
    );

    assert.equal(
        checkpoint.runtime.sessionId,
        'session-k283-test'
    );

    assert.equal(checkpoint.revision, 1);
    assert.equal(checkpoint.savedAt, SAVED_AT);
});

test('P3.2-C03: JSON encode/decode round-trip preserves checkpoint', () => {
    const session = makeSession({
        withAttempt: true,
        withEvidence: true
    });

    const checkpoint = encode(session);

    const serialized = JSON.stringify(checkpoint);

    const decoded = decodeCheckpoint(serialized);

    assert.deepStrictEqual(decoded, checkpoint);
});

test('P3.2-C04: decode accepts object input', () => {
    const checkpoint = encode(makeSession());

    const decoded = decodeCheckpoint(checkpoint);

    assert.deepStrictEqual(decoded, checkpoint);

    assert.notStrictEqual(decoded, checkpoint);
});

/* ============================================================
 * B. PROJECTION AND IMMUTABILITY
 * ============================================================ */

test('P3.2-C05: checkpoint excludes dependencies and attempts', () => {
    const session = makeSession({
        withAttempt: true
    });

    const checkpoint = encode(session);

    assert.equal(
        Object.hasOwn(checkpoint, 'dependencies'),
        false
    );

    assert.equal(
        Object.hasOwn(checkpoint, 'attempts'),
        false
    );

    assert.equal(
        Object.hasOwn(checkpoint, 'lastFlowResult'),
        false
    );

    assert.equal(
        Object.hasOwn(checkpoint.lessonRuntime, 'plan'),
        false
    );

    assert.deepStrictEqual(
        checkpoint.attemptIds,
        ['attempt-k283-001']
    );
});

test('P3.2-C06: encode does not mutate the session', () => {
    const session = makeSession({
        withAttempt: true,
        withEvidence: true,
        withActiveQuestion: true
    });

    const before = structuredClone(session);

    encode(session);

    assert.deepStrictEqual(session, before);
});

test('P3.2-C07: checkpoint is detached from original session', () => {
    const session = makeSession({
        withEvidence: true
    });

    const checkpoint = encode(session);

    checkpoint.masteryRuntime
        .evidenceHistoryByNode.K283.transfer[0].score = 0;

    assert.equal(
        session.masteryRuntime
            .evidenceHistoryByNode.K283.transfer[0].score,
        1
    );
});

/* ============================================================
 * C. RUNTIME FIDELITY
 * ============================================================ */

test('P3.2-C08: evidence history is preserved exactly', () => {
    const session = makeSession({
        withAttempt: true,
        withEvidence: true
    });

    const checkpoint = encode(session);

    assert.deepStrictEqual(
        checkpoint.masteryRuntime.evidenceHistoryByNode,
        session.masteryRuntime.evidenceHistoryByNode
    );

    const observation =
        checkpoint.masteryRuntime
            .evidenceHistoryByNode.K283.transfer[0];

    assert.equal(
        observation.contextId,
        'c09-k283-transfer-gamete-counts-03'
    );

    assert.equal(observation.questionType, 'numeric');

    // Codec must not fabricate an attemptId.
    assert.equal(
        Object.hasOwn(observation, 'attemptId'),
        false
    );
});

test('P3.2-C09: pending active question is preserved', () => {
    const session = makeSession({
        withActiveQuestion: true
    });

    const checkpoint = encode(session);

    assert.deepStrictEqual(
        checkpoint.currentQuestion,
        session.currentQuestion
    );

    assert.deepStrictEqual(
        checkpoint.currentSelection,
        session.currentSelection
    );

    assert.deepStrictEqual(
        checkpoint.lessonRuntime.currentItem,
        session.lessonRuntime.currentItem
    );
});

test('P3.2-C10: lesson progress and selection history are preserved', () => {
    const session = makeSession({
        withAttempt: true
    });

    session.lessonRuntime.progress.completedSectionIds = [
        'S01',
        'S02',
        'S08'
    ];

    session.lessonRuntime.progress.skippedSectionIds = [
        'S03'
    ];

    const checkpoint = encode(session);

    assert.deepStrictEqual(
        checkpoint.lessonRuntime.progress,
        session.lessonRuntime.progress
    );

    assert.deepStrictEqual(
        checkpoint.history,
        session.history
    );
});

/* ============================================================
 * D. VALIDATION
 * ============================================================ */

test('P3.2-C11: unsupported checkpoint version is rejected', () => {
    const checkpoint = encode(makeSession());

    checkpoint.schemaVersion = '2.0.0';

    assert.throws(
        () => validateCheckpoint(checkpoint),
        /unsupported schemaVersion/
    );
});

test('P3.2-C12: missing required field is rejected', () => {
    const checkpoint = encode(makeSession());

    delete checkpoint.masteryRuntime;

    assert.throws(
        () => validateCheckpoint(checkpoint),
        /masteryRuntime/
    );
});

test('P3.2-C13: invalid content hash is rejected', () => {
    const session = makeSession();

    const refs = makeContentRefs();

    refs.knowledgeMap.sha256 = 'not-a-sha256';

    assert.throws(
        () => encode(session, { contentRefs: refs }),
        /SHA-256/
    );
});

test('P3.2-C14: empty content refs are rejected', () => {
    const session = makeSession();

    assert.throws(
        () => encode(session, { contentRefs: {} }),
        /contentRefs/
    );
});

test('P3.2-C15: invalid revision is rejected', () => {
    const session = makeSession();

    assert.throws(
        () => encode(session, { revision: -1 }),
        /revision/
    );

    assert.throws(
        () => encode(session, { revision: 1.5 }),
        /revision/
    );
});

test('P3.2-C16: invalid savedAt is rejected', () => {
    const session = makeSession();

    assert.throws(
        () => encode(session, { savedAt: 'invalid-date' }),
        /savedAt/
    );
});

test('P3.2-C17: malformed JSON is rejected', () => {
    assert.throws(
        () => decodeCheckpoint('{bad json'),
        /malformed JSON/
    );
});

test('P3.2-C18: excluded runtime fields are rejected', () => {
    const checkpoint = encode(makeSession());

    checkpoint.dependencies = {};

    assert.throws(
        () => validateCheckpoint(checkpoint),
        /excluded runtime data/
    );
});

/* ============================================================
 * E. ATTEMPT DURABILITY
 * ============================================================ */

test('P3.2-C19: unpersisted attempt is rejected', () => {
    const session = makeSession({
        withAttempt: true
    });

    assert.throws(
        () => encode(session, {
            persistedAttemptIds: []
        }),
        /durably persisted/
    );
});

test('P3.2-C20: persisted attempt order must match', () => {
    const session = makeSession({
        withAttempt: true
    });

    session.attempts.push({
        attemptId: 'attempt-k283-002',
        questionId: 'Q-A-K283-A-011',
        response: 20,
        isCorrect: true
    });

    assert.throws(
        () => encode(session, {
            persistedAttemptIds: [
                'attempt-k283-002',
                'attempt-k283-001'
            ]
        }),
        /durably persisted/
    );
});

test('P3.2-C21: duplicate attempt IDs are rejected', () => {
    const session = makeSession({
        withAttempt: true
    });

    session.attempts.push({
        attemptId: 'attempt-k283-001',
        questionId: 'Q-A-K283-A-011',
        response: 20,
        isCorrect: true
    });

    assert.throws(
        () => encode(session),
        /unique nonempty strings/
    );
});

/* ============================================================
 * F. JSON SAFETY
 * ============================================================ */

test('P3.2-C22: undefined nested values are rejected', () => {
    const session = makeSession();

    session.currentDecision.invalidValue = undefined;

    assert.throws(
        () => encode(session),
        /loses information/
    );
});

test('P3.2-C23: NaN values are rejected', () => {
    const session = makeSession();

    session.currentDecision.score = NaN;

    assert.throws(
        () => encode(session),
        /loses information/
    );
});

test('P3.2-C24: Infinity values are rejected', () => {
    const session = makeSession();

    session.currentDecision.score = Infinity;

    assert.throws(
        () => encode(session),
        /loses information/
    );
});

test('P3.2-C25: functions are rejected', () => {
    const session = makeSession();

    session.currentDecision.callback = () => { };

    assert.throws(
        () => encode(session),
        /loses information/
    );
});

test('P3.2-C26: sparse arrays are rejected', () => {
    const session = makeSession();

    session.history = new Array(2);

    assert.throws(
        () => encode(session),
        /loses information/
    );
});

test('P3.2-C27: cyclic structures are rejected', () => {
    const session = makeSession();

    session.currentDecision.self =
        session.currentDecision;

    assert.throws(
        () => encode(session),
        /not JSON-serializable/
    );
});

/* ============================================================
 * G. DECODE SAFETY
 * ============================================================ */

test('P3.2-C28: decode rejects missing required fields', () => {
    const checkpoint = encode(makeSession());

    delete checkpoint.currentDecision;

    assert.throws(
        () => decodeCheckpoint(checkpoint),
        /currentDecision/
    );
});

test('P3.2-C29: decode returns an independent object', () => {
    const checkpoint = encode(makeSession());

    const decoded = decodeCheckpoint(checkpoint);

    decoded.runtime.sessionId = 'changed-session';

    assert.equal(
        checkpoint.runtime.sessionId,
        'session-k283-test'
    );
});

test('P3.2-C30: decode does not hydrate StudySession', () => {
    const checkpoint = encode(makeSession());

    const decoded = decodeCheckpoint(checkpoint);

    assert.equal(
        Object.hasOwn(decoded, 'dependencies'),
        false
    );

    assert.equal(
        Object.hasOwn(decoded, 'attempts'),
        false
    );

    assert.equal(
        Object.hasOwn(decoded, 'lastFlowResult'),
        false
    );
});

/* ============================================================
 * H. REMEDIATION GENERATION STOP EXTENSION V1
 * ============================================================ */

const REMEDIATION_GENERATION_STOP = {
    schemaVersion: '1.0.0',
    status: 'INFEASIBLE',
    reasonCode: 'NO_ELIGIBLE_BANK_QUESTION',
    triggerAttemptId: 'attempt-k283-stop-001',
    targetNodeId: 'K283',
    bankId: 'k283-question-bank',
    bankVersion: '1.0.0',
    configFingerprint: 'c'.repeat(64)
};

test('P4c.3b: generation-stop extension round-trips without changing the checkpoint boundary', () => {
    const session = makeSession({ withAttempt: true });
    const extensions = {
        remediationGenerationStop: REMEDIATION_GENERATION_STOP,
        unrelatedSupportedExtension: { revision: 2 }
    };
    const checkpoint = encode(session, { extensions });
    const decoded = decodeCheckpoint(JSON.stringify(checkpoint));

    assert.deepStrictEqual(decoded.extensions, extensions);
    assert.equal(decoded.currentSelection, null);
    assert.equal(decoded.currentQuestion, null);
    assert.deepStrictEqual(decoded.history, checkpoint.history);
    assert.deepStrictEqual(decoded.attemptIds, checkpoint.attemptIds);
    assert.deepStrictEqual(decoded.state, checkpoint.state);
});

test('P4c.3b: legacy checkpoints without extensions remain valid', () => {
    const checkpoint = encode(makeSession());
    assert.equal(Object.hasOwn(checkpoint, 'extensions'), false);
    assert.equal(validateCheckpoint(decodeCheckpoint(checkpoint)), true);
});

test('P4c.3b: repeated extension encoding has deterministic serialization', () => {
    const session = makeSession();
    const args = {
        extensions: {
            remediationGenerationStop: REMEDIATION_GENERATION_STOP
        }
    };

    assert.equal(
        JSON.stringify(encode(session, args)),
        JSON.stringify(encode(session, args))
    );
});

test('P4c.3b: malformed, unsupported and partial stop extensions are rejected', () => {
    const invalidStops = [
        null,
        { ...REMEDIATION_GENERATION_STOP, schemaVersion: '2.0.0' },
        { ...REMEDIATION_GENERATION_STOP, status: 'FEASIBLE' },
        { ...REMEDIATION_GENERATION_STOP, reasonCode: 'bad code' },
        { ...REMEDIATION_GENERATION_STOP, configFingerprint: 'not-a-digest' },
        Object.fromEntries(
            Object.entries(REMEDIATION_GENERATION_STOP)
                .filter(([field]) => field !== 'bankVersion')
        ),
        { ...REMEDIATION_GENERATION_STOP, extra: true }
    ];

    for (const stop of invalidStops) {
        const checkpoint = encode(makeSession());
        checkpoint.extensions = { remediationGenerationStop: stop };
        assert.throws(
            () => validateCheckpoint(checkpoint),
            /remediationGenerationStop/
        );
        assert.throws(
            () => decodeCheckpoint(checkpoint),
            /remediationGenerationStop/
        );
    }
});

test('P4c.3b: invalid extension container is rejected', () => {
    const checkpoint = encode(makeSession());
    checkpoint.extensions = [];
    assert.throws(
        () => validateCheckpoint(checkpoint),
        /extensions must be an object/
    );
});

/* ============================================================
 * I. REMEDIATION POLICY ERROR STOP EXTENSION V1
 * ============================================================ */

const REMEDIATION_POLICY_ERROR_STOP = {
    schemaVersion: '1.0.0',
    status: 'POLICY_ERROR',
    reasonCode: 'UNSUPPORTED_POLICY_VERSION',
    triggerAttemptId: 'attempt-k283-policy-error-001',
    targetNodeId: 'K283',
    bankId: 'k283-question-bank',
    bankVersion: '1.0.0',
    policyId: 'probe-authoring-policy',
    policyVersion: '1.2.0',
    configFingerprint: 'd'.repeat(64)
};

test('P4d.2e: policy-error stop round-trips with unrelated extension and post-submit boundary', () => {
    const session = makeSession({ withAttempt: true });
    const extensions = {
        remediationPolicyErrorStop: REMEDIATION_POLICY_ERROR_STOP,
        unrelatedSupportedExtension: { revision: 3 }
    };
    const checkpoint = encode(session, { extensions });
    const decoded = decodeCheckpoint(JSON.stringify(checkpoint));

    assert.deepStrictEqual(decoded.extensions, extensions);
    assert.equal(decoded.currentSelection, null);
    assert.equal(decoded.currentQuestion, null);
    assert.deepStrictEqual(decoded.attemptIds, ['attempt-k283-001']);
    assert.deepStrictEqual(decoded.history, checkpoint.history);
});

test('P4d.2e: legacy checkpoints and generation-stop extension remain valid', () => {
    const legacy = encode(makeSession());
    assert.equal(Object.hasOwn(legacy, 'extensions'), false);
    assert.equal(validateCheckpoint(decodeCheckpoint(legacy)), true);

    const generationStop = encode(makeSession(), {
        extensions: { remediationGenerationStop: REMEDIATION_GENERATION_STOP }
    });
    assert.deepStrictEqual(
        decodeCheckpoint(generationStop).extensions.remediationGenerationStop,
        REMEDIATION_GENERATION_STOP
    );
});

test('P4d.2e: policy-error stop serialization is deterministic', () => {
    const session = makeSession();
    const args = {
        extensions: {
            remediationPolicyErrorStop: REMEDIATION_POLICY_ERROR_STOP,
            unrelatedSupportedExtension: { revision: 3 }
        }
    };

    assert.equal(
        JSON.stringify(encode(session, args)),
        JSON.stringify(encode(session, args))
    );
});

test('P4d.2e: malformed, partial, extra-field and unsupported policy stops are rejected', () => {
    const invalidStops = [
        null,
        { ...REMEDIATION_POLICY_ERROR_STOP, schemaVersion: '2.0.0' },
        { ...REMEDIATION_POLICY_ERROR_STOP, status: 'INFEASIBLE' },
        { ...REMEDIATION_POLICY_ERROR_STOP, reasonCode: 'bad code' },
        { ...REMEDIATION_POLICY_ERROR_STOP, policyId: '' },
        { ...REMEDIATION_POLICY_ERROR_STOP, configFingerprint: 'not-a-digest' },
        Object.fromEntries(
            Object.entries(REMEDIATION_POLICY_ERROR_STOP)
                .filter(([field]) => field !== 'policyVersion')
        ),
        { ...REMEDIATION_POLICY_ERROR_STOP, extra: true }
    ];

    for (const stop of invalidStops) {
        const checkpoint = encode(makeSession());
        checkpoint.extensions = { remediationPolicyErrorStop: stop };
        assert.throws(
            () => validateCheckpoint(checkpoint),
            /remediationPolicyErrorStop/
        );
        assert.throws(
            () => decodeCheckpoint(checkpoint),
            /remediationPolicyErrorStop/
        );
    }
});

test('P4d.2e: checkpoints cannot contain both active stop extensions', () => {
    const checkpoint = encode(makeSession());
    checkpoint.extensions = {
        remediationGenerationStop: REMEDIATION_GENERATION_STOP,
        remediationPolicyErrorStop: REMEDIATION_POLICY_ERROR_STOP
    };
    assert.throws(
        () => validateCheckpoint(checkpoint),
        /cannot contain both remediationGenerationStop and remediationPolicyErrorStop/
    );
});

test('P4d.2e: policy-error stop requires null post-submit selection and question', () => {
    const checkpoint = encode(makeSession({ withActiveQuestion: true }));
    checkpoint.extensions = {
        remediationPolicyErrorStop: REMEDIATION_POLICY_ERROR_STOP
    };
    assert.throws(
        () => validateCheckpoint(checkpoint),
        /requires currentSelection and currentQuestion to be null/
    );
});
