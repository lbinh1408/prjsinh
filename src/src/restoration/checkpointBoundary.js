/** Phase 3.3-C — checkpoint boundary preflight. Pure; never resumes sessions. */
export const BOUNDARY_INFO = Object.freeze({ version: '1.0.0', executable: false, scope: 'post-submitAnswer-only' });
const rec = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const fail = (code) => Object.freeze({ status: 'rejected', code, eligible: false, executable: false });
/**
 * Checks whether a hydrated candidate is structurally consistent with a post-submitAnswer boundary.
 * This does not establish authenticity, atomicity, completeness of excluded fields, or behavioral equivalence.
 */
export function inspectCheckpointBoundary(candidate) {
    if (!rec(candidate) || !rec(candidate.checkpoint)) return fail('BOUNDARY_INVALID_CANDIDATE');
    const c = candidate.checkpoint;
    if (!rec(c.runtime) || c.runtime.name !== 'StudySession' || c.runtime.version !== '0.2.0' || c.runtime.status !== 'active' ||
        !nonempty(c.runtime.sessionId) || c.runtime.sessionId !== candidate.sessionId ||
        !Number.isSafeInteger(c.revision) || c.revision < 0 || c.revision !== candidate.revision) return fail('BOUNDARY_RUNTIME_MISMATCH');
    if (c.currentSelection !== null || c.currentQuestion !== null || !rec(c.lessonRuntime) ||
        c.lessonRuntime.currentItem !== null || !rec(c.lessonRuntime.progress) ||
        !Array.isArray(c.lessonRuntime.progress.completedSectionIds) || !Array.isArray(c.lessonRuntime.progress.skippedSectionIds)) return fail('BOUNDARY_PENDING_DELIVERY');
    const completed = c.lessonRuntime.progress.completedSectionIds;
    const skipped = c.lessonRuntime.progress.skippedSectionIds;
    if (completed.some(x => !nonempty(x)) || skipped.some(x => !nonempty(x)) ||
        new Set(completed).size !== completed.length || new Set(skipped).size !== skipped.length ||
        completed.some(x => skipped.includes(x))) return fail('BOUNDARY_INVALID_PROGRESS');
    if (!rec(c.currentDecision) || !nonempty(c.currentDecision.action) ||
        !rec(c.state) || c.state.learning?.session?.sessionId !== c.runtime.sessionId ||
        !rec(c.masteryRuntime) || !rec(c.masteryRuntime.evidenceHistoryByNode)) return fail('BOUNDARY_STATE_MISMATCH');
    if (!Array.isArray(c.attemptIds) || c.attemptIds.length === 0 || new Set(c.attemptIds).size !== c.attemptIds.length ||
        !Array.isArray(c.history) || c.history.length === 0) return fail('BOUNDARY_MISSING_LAST_TURN');
    const last = c.history.at(-1);
    if (!rec(last) || !nonempty(last.attemptId) || !nonempty(last.nextAction) ||
        last.attemptId !== c.attemptIds.at(-1) || last.nextAction !== c.currentDecision.action) return fail('BOUNDARY_ACTION_MISMATCH');
    if (!Array.isArray(candidate.attempts) || candidate.attempts.length !== c.attemptIds.length ||
        candidate.attempts.some((a, i) => !rec(a) || a.attemptId !== c.attemptIds[i] || a.sessionId !== c.runtime.sessionId)) return fail('BOUNDARY_ATTEMPTS_MISMATCH');
    if ('plan' in c.lessonRuntime || 'lastFlowResult' in c || 'dependencies' in c || 'attempts' in c) return fail('BOUNDARY_UNEXPECTED_FIELDS');
    return Object.freeze({
        status: 'boundary-candidate', eligible: true, executable: false,
        sessionId: c.runtime.sessionId, revision: c.revision,
        previousActionCandidate: c.currentDecision.action,
        previousActionCorroboratedByHistory: true,
        runtimeContinuityVerified: false, atomicSnapshotGuaranteed: false,
        missing: Object.freeze(['trusted dependency provenance', 'lastFlowResult reconstruction proof', 'behavioral equivalence proof'])
    });
}
