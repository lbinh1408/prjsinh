/** Read-only question reuse guard derived from verified mastery evidence history. */
const DIMENSIONS = ['know', 'explain', 'apply', 'transfer'];

export function getPreviouslyObservedK283QuestionIds(evidenceHistoryByNode) {
    const history = evidenceHistoryByNode?.K283;
    if (!history || typeof history !== 'object' || Array.isArray(history)) {
        throw new Error('K283_PRIOR_EVIDENCE_HISTORY_INVALID');
    }
    const ids = new Set();
    for (const dimension of DIMENSIONS) {
        const observations = history[dimension];
        if (!Array.isArray(observations)) {
            throw new Error(`K283_PRIOR_EVIDENCE_DIMENSION_INVALID: ${dimension}`);
        }
        for (const observation of observations) {
            if (!observation || typeof observation.questionId !== 'string' || !observation.questionId.trim()) {
                throw new Error(`K283_PRIOR_EVIDENCE_QUESTION_ID_MISSING: ${dimension}`);
            }
            ids.add(observation.questionId);
        }
    }
    return [...ids].sort();
}

export function applyK283InitialExclusions(session, priorQuestionIds) {
    if (!Array.isArray(priorQuestionIds) || priorQuestionIds.some(id => typeof id !== 'string' || !id.trim())) {
        throw new Error('K283_PRIOR_QUESTION_IDS_INVALID');
    }
    const decision = session?.currentDecision;
    if (!decision?.selectionCriteria || !Array.isArray(decision.selectionCriteria.excludeQuestionIds)) {
        throw new Error('K283_INITIAL_DECISION_INVALID');
    }
    const next = structuredClone(session);
    next.currentDecision.selectionCriteria.excludeQuestionIds = [...new Set([
        ...next.currentDecision.selectionCriteria.excludeQuestionIds,
        ...priorQuestionIds
    ])].sort();
    return next;
}

export function applyK283SelectionExclusions(session, priorQuestionIds = []) {
    if (!session || typeof session !== 'object') {
        throw new Error('K283_SESSION_INVALID');
    }
    if (!Array.isArray(priorQuestionIds) || priorQuestionIds.some(id => typeof id !== 'string' || !id.trim())) {
        throw new Error('K283_PRIOR_QUESTION_IDS_INVALID');
    }
    const decision = session.currentDecision;
    if (!decision || typeof decision !== 'object' || typeof decision.action !== 'string') {
        throw new Error('K283_DECISION_INVALID');
    }
    const next = structuredClone(session);
    if (!next.currentDecision.selectionCriteria || typeof next.currentDecision.selectionCriteria !== 'object') {
        next.currentDecision.selectionCriteria = {};
    }
    const existing = Array.isArray(next.currentDecision.selectionCriteria.excludeQuestionIds)
        ? next.currentDecision.selectionCriteria.excludeQuestionIds
        : [];
    const attemptQuestionIds = Array.isArray(session.attempts)
        ? session.attempts.map(a => a?.questionId).filter(id => typeof id === 'string' && id.trim())
        : [];
    next.currentDecision.selectionCriteria.excludeQuestionIds = [...new Set([
        ...existing,
        ...priorQuestionIds,
        ...attemptQuestionIds
    ])].sort();
    return next;
}

export function assertK283QuestionNotPreviouslyObserved(questionId, priorQuestionIds) {
    if (typeof questionId !== 'string' || !questionId.trim()) throw new Error('K283_SELECTED_QUESTION_ID_INVALID');
    if (priorQuestionIds.includes(questionId)) {
        throw new Error(`K283_CROSS_SESSION_REPEATED_QUESTION_BLOCKED: ${questionId}`);
    }
}

