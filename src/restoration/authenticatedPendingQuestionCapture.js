/** Phase 3.3-C — Pending Question Capture Preflight V1 (DRAFT).
 * No persistence, no restore, no submit authorization.
 * Requires the existing cooperative single-writer authority.
 */
import { isDeepStrictEqual } from 'node:util';
import { validateFencedCapture } from './liveSessionRevisionAuthority.js';
import { validatePendingQuestionCapture } from './pendingQuestionCaptureValidator.js';

const fail = code => { const e = new Error(code); e.code = code; throw e; };
const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Validate a detached fenced capture and its checkpoint projection.
 * checkpointFromSnapshot MUST be synchronous and pure. It is not trusted:
 * fields are checked against the actual captured snapshot before acceptance.
 */
export function preflightPendingQuestionCapture({ authority, capture, checkpointFromSnapshot } = {}) {
    if (!authority || !isRecord(capture) || typeof checkpointFromSnapshot !== 'function') fail('QUESTION_CAPTURE_INVALID_INPUT');
    const first = validateFencedCapture({ authority, capture });
    if (!isRecord(capture.snapshot)) fail('QUESTION_CAPTURE_INVALID_SNAPSHOT');
    const checkpoint = checkpointFromSnapshot(structuredClone(capture.snapshot), {
        sessionId: first.sessionId, revision: first.revision
    });
    if (checkpoint && typeof checkpoint.then === 'function') fail('QUESTION_CAPTURE_ASYNC_UNSUPPORTED');
    if (!isRecord(checkpoint)) fail('QUESTION_CAPTURE_INVALID_CHECKPOINT');
    if (checkpoint.runtime?.sessionId !== first.sessionId || checkpoint.revision !== first.revision) fail('QUESTION_CAPTURE_BINDING_MISMATCH');
    // Prevent a projection callback from substituting a different pending question,
    // plan, progress, decision or session state. Extra checkpoint fields are allowed.
    for (const field of ['runtime', 'currentDecision', 'currentSelection', 'currentQuestion', 'lessonRuntime', 'history']) {
        if (!isDeepStrictEqual(checkpoint[field], capture.snapshot[field])) fail('QUESTION_CAPTURE_PROJECTION_DRIFT');
    }
    if (!Array.isArray(capture.snapshot.attempts) || !Array.isArray(checkpoint.attemptIds) ||
        !isDeepStrictEqual(checkpoint.attemptIds, capture.snapshot.attempts.map(a => a?.attemptId))) {
        fail('QUESTION_CAPTURE_ATTEMPT_DRIFT');
    }
    const pending = validatePendingQuestionCapture(checkpoint);
    const second = validateFencedCapture({ authority, capture });
    if (second.revision !== first.revision || second.sessionId !== first.sessionId) fail('QUESTION_CAPTURE_STALE');
    return Object.freeze({
        status: 'pending-question-preflight-validated',
        sessionId: first.sessionId, revision: first.revision,
        sectionId: pending.sectionId, questionId: pending.questionId,
        cooperativeFenceVerified: true,
        inFlightSubmitExcluded: false,
        authenticatedEnvelopeVerified: false,
        durableCommitPerformed: false,
        submitAuthorized: false, executable: false
    });
}
