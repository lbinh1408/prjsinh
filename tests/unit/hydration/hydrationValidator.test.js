
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHydrationSnapshot } from '../../../src/hydration/hydrationValidator.js';
import { HydrationError, HYDRATION_ERROR_CODES as C } from '../../../src/hydration/hydrationContract.js';

const sessionId = 'S1';
const refs = {
    map: { id: 'K283', version: '4', sha256: 'a'.repeat(64) }
};
const copy = x => JSON.parse(JSON.stringify(x));

function fixture() {
    const checkpoint = {
        schemaVersion: '1.0.0-draft',
        revision: 1,
        savedAt: '2026-10-08T00:00:00Z',
        runtime: {
            name: 'StudySession',
            version: '0.2.0',
            sessionId,
            startedAt: '2026-10-08T00:00:00Z',
            lastActivityAt: '2026-10-08T00:00:00Z',
            status: 'active'
        },
        config: {
            historyLimit: 50,
            learningMode: 'HOC_SAU',
            timeBudget: 30,
            clusterId: null,
            lessonId: null,
            contextId: null
        },
        contentRefs: copy(refs),
        state: {
            schemaVersion: '1.2.0',
            learning: { session: { sessionId } },
            knowledge: {}
        },
        currentDecision: { action: 'LEARN' },
        currentSelection: null,
        currentQuestion: null,
        lessonRuntime: {
            currentItem: null,
            progress: {
                completedSectionIds: [],
                skippedSectionIds: []
            }
        },
        activeRemediationPlan: null,
        history: [],
        masteryRuntime: { evidenceHistoryByNode: {} },
        attemptIds: ['A1']
    };

    return {
        snapshot: {
            sessionId,
            revision: 1,
            checkpoint,
            attemptIds: ['A1'],
            attempts: [{ attemptId: 'A1', sessionId }]
        },
        options: {
            sessionId,
            expectedContentRefs: copy(refs)
        }
    };
}

function rejects(code, change) {
    const { snapshot, options } = fixture();
    change(snapshot, options);
    assert.throws(
        () => validateHydrationSnapshot(snapshot, options),
        e => e instanceof HydrationError && e.code === code
    );
}

test('HYV-01 valid candidate', () => {
    const { snapshot, options } = fixture();
    assert.equal(validateHydrationSnapshot(snapshot, options), true);
});

test('HYV-02 invalid input', () =>
    assert.throws(
        () => validateHydrationSnapshot(null, null),
        e => e.code === C.INVALID_REQUEST
    )
);

test('HYV-03 malformed codec checkpoint', () =>
    rejects(C.INVALID_CHECKPOINT, s => {
        delete s.checkpoint.savedAt;
    })
);

test('HYV-04 session mismatch', () =>
    rejects(C.SESSION_MISMATCH, s => {
        s.checkpoint.runtime.sessionId = 'other';
    })
);

test('HYV-05 revision mismatch', () =>
    rejects(C.REVISION_MISMATCH, s => {
        s.revision = 2;
    })
);

test('HYV-06 orphan attempt', () =>
    rejects(C.ATTEMPT_SEQUENCE_MISMATCH, s => {
        s.attemptIds.push('A2');
        s.attempts.push({ attemptId: 'A2' });
    })
);

test('HYV-07 wrong payload ID', () =>
    rejects(C.ATTEMPT_PAYLOAD_MISMATCH, s => {
        s.attempts[0].attemptId = 'WRONG';
    })
);

test('HYV-08 wrong payload session', () =>
    rejects(C.ATTEMPT_PAYLOAD_MISMATCH, s => {
        s.attempts[0].sessionId = 'OTHER';
    })
);

test('HYV-09 absent payload session ID permitted', () => {
    const { snapshot, options } = fixture();
    delete snapshot.attempts[0].sessionId;
    assert.equal(validateHydrationSnapshot(snapshot, options), true);
});

test('HYV-10 content mismatch', () =>
    rejects(C.CONTENT_MISMATCH, (s, o) => {
        o.expectedContentRefs.map.version = '5';
    })
);

test('HYV-11 case-insensitive hash', () => {
    const { snapshot, options } = fixture();
    options.expectedContentRefs.map.sha256 = 'A'.repeat(64);
    assert.equal(validateHydrationSnapshot(snapshot, options), true);
});

test('HYV-12 runtime unsupported', () =>
    rejects(C.UNSUPPORTED_VERSION, s => {
        s.checkpoint.runtime.version = '9.0.0';
    })
);

test('HYV-13 student state unsupported', () =>
    rejects(C.UNSUPPORTED_VERSION, s => {
        s.checkpoint.state.schemaVersion = '9.0.0';
    })
);

test('HYV-14 schema unsupported', () =>
    rejects(C.UNSUPPORTED_VERSION, s => {
        s.checkpoint.schemaVersion = '9.0.0';
    })
);

test('HYV-15 missing config', () =>
    rejects(C.INCOMPLETE_STATE, s => {
        delete s.checkpoint.config.historyLimit;
    })
);

test('HYV-16 overlapping sections', () =>
    rejects(C.INCOMPLETE_STATE, s => {
        s.checkpoint.lessonRuntime.progress.completedSectionIds = ['x'];
        s.checkpoint.lessonRuntime.progress.skippedSectionIds = ['x'];
    })
);

test('HYV-17 overlong history', () =>
    rejects(C.INCOMPLETE_STATE, s => {
        s.checkpoint.config.historyLimit = 1;
        s.checkpoint.history = [{}, {}];
    })
);

test('HYV-18 state session mismatch', () =>
    rejects(C.INCOMPLETE_STATE, s => {
        s.checkpoint.state.learning.session.sessionId = 'OTHER';
    })
);

test('HYV-19 empty attempt list valid', () => {
    const { snapshot, options } = fixture();
    snapshot.checkpoint.attemptIds = [];
    snapshot.attemptIds = [];
    snapshot.attempts = [];
    assert.equal(validateHydrationSnapshot(snapshot, options), true);
});

test('HYV-20 input not mutated', () => {
    const { snapshot, options } = fixture();
    const before = copy([snapshot, options]);
    validateHydrationSnapshot(snapshot, options);
    assert.deepEqual([snapshot, options], before);
});
