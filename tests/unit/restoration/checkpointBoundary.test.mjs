import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectCheckpointBoundary as inspect } from '../../../src/restoration/checkpointBoundary.js';
const base = () => ({ sessionId: 'S1', revision: 2, attempts: [{ attemptId: 'A1', sessionId: 'S1' }], checkpoint: { revision: 2, runtime: { name: 'StudySession', version: '0.2.0', status: 'active', sessionId: 'S1' }, currentSelection: null, currentQuestion: null, lessonRuntime: { currentItem: null, progress: { completedSectionIds: ['section1'], skippedSectionIds: [] } }, currentDecision: { action: 'REVIEW' }, state: { learning: { session: { sessionId: 'S1' } } }, masteryRuntime: { evidenceHistoryByNode: {} }, attemptIds: ['A1'], history: [{ attemptId: 'A1', nextAction: 'REVIEW' }] } });
const cases = [
    ['valid post-submit boundary', () => assert.deepEqual([inspect(base()).eligible, inspect(base()).executable], [true, false])],
    ['missing candidate', () => assert.equal(inspect(null).code, 'BOUNDARY_INVALID_CANDIDATE')],
    ['wrong runtime version', () => { const x = base(); x.checkpoint.runtime.version = '9'; assert.equal(inspect(x).code, 'BOUNDARY_RUNTIME_MISMATCH') }],
    ['revision mismatch', () => { const x = base(); x.revision = 3; assert.equal(inspect(x).code, 'BOUNDARY_RUNTIME_MISMATCH') }],
    ['pending question', () => { const x = base(); x.checkpoint.currentQuestion = {}; assert.equal(inspect(x).code, 'BOUNDARY_PENDING_DELIVERY') }],
    ['pending selection', () => { const x = base(); x.checkpoint.currentSelection = {}; assert.equal(inspect(x).code, 'BOUNDARY_PENDING_DELIVERY') }],
    ['pending lesson item', () => { const x = base(); x.checkpoint.lessonRuntime.currentItem = {}; assert.equal(inspect(x).code, 'BOUNDARY_PENDING_DELIVERY') }],
    ['overlapping progress', () => { const x = base(); x.checkpoint.lessonRuntime.progress.skippedSectionIds = ['section1']; assert.equal(inspect(x).code, 'BOUNDARY_INVALID_PROGRESS') }],
    ['state session mismatch', () => { const x = base(); x.checkpoint.state.learning.session.sessionId = 'other'; assert.equal(inspect(x).code, 'BOUNDARY_STATE_MISMATCH') }],
    ['no attempt boundary', () => { const x = base(); x.checkpoint.attemptIds = []; assert.equal(inspect(x).code, 'BOUNDARY_MISSING_LAST_TURN') }],
    ['action mismatch', () => { const x = base(); x.checkpoint.history[0].nextAction = 'LEARN'; assert.equal(inspect(x).code, 'BOUNDARY_ACTION_MISMATCH') }],
    ['attempt mismatch', () => { const x = base(); x.attempts[0].attemptId = 'other'; assert.equal(inspect(x).code, 'BOUNDARY_ATTEMPTS_MISMATCH') }],
    ['unexpected lastFlowResult', () => { const x = base(); x.checkpoint.lastFlowResult = {}; assert.equal(inspect(x).code, 'BOUNDARY_UNEXPECTED_FIELDS') }],
    ['no mutation', () => { const x = base(); const before = JSON.stringify(x); inspect(x); assert.equal(JSON.stringify(x), before) }],
    ['never grants executable', () => { const x = base(); assert.equal(inspect(x).runtimeContinuityVerified, false) }]
];
for (const [name, fn] of cases) test(name, fn);
