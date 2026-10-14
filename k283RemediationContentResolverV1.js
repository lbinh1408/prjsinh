/**
 * k283RemediationContentResolverV1.js
 *
 * Minimal CLI-side remediation content resolver for K283.
 *
 * Resolves instructional content for step types:
 *   MICRO_LEARN, EXAMPLE, ERROR_ANALYSIS
 *
 * Content source: authoritative question.explanation + question.hint fields only.
 * Never fabricates content. Neutral fallback when no valid content exists.
 * Does NOT mutate plan, attempts, mastery, or checkpoints.
 * Does NOT modify engines, policies, schema, or question bank.
 */

/**
 * Supported instructional step types that this resolver handles.
 */
export const INSTRUCTIONAL_STEP_TYPES = Object.freeze([
    'MICRO_LEARN',
    'EXAMPLE',
    'ERROR_ANALYSIS',
]);

/**
 * Resolve instructional content for a single remediation step.
 *
 * @param {object} options
 * @param {object} options.step        - Remediation plan step ({ stepId, type, targetNodeIds, ... })
 * @param {object|null} options.question - Authoritative question object from question bank (may be null)
 * @param {string|null} options.chosenOption - The learner's chosen option key (for ERROR_ANALYSIS)
 * @returns {{ stepId, stepType, headline, body, hint, isAuthoritative }}
 */
export function resolveRemediationStepContent({ step, question = null, chosenOption = null } = {}) {
    const stepId   = step?.stepId   ?? 'unknown';
    const stepType = step?.type     ?? 'UNKNOWN';

    // Guard: only handle supported instructional types
    if (!INSTRUCTIONAL_STEP_TYPES.includes(stepType)) {
        return _fallback(stepId, stepType, `Step type ${stepType} is not an instructional type handled by this resolver.`);
    }

    // Guard: question must be a valid object
    if (!question || typeof question !== 'object') {
        return _fallback(stepId, stepType, '(No question reference available for this step)');
    }

    const expl = question.explanation ?? null;

    if (stepType === 'ERROR_ANALYSIS') {
        return _resolveErrorAnalysis({ stepId, stepType, question, expl, chosenOption });
    }

    if (stepType === 'MICRO_LEARN' || stepType === 'EXAMPLE') {
        return _resolveMicroLearnOrExample({ stepId, stepType, question, expl });
    }

    return _fallback(stepId, stepType, '(No content available for this step)');
}

/**
 * Format resolved content for CLI display.
 * Returns an array of non-empty strings.
 *
 * @param {object} resolved - Output of resolveRemediationStepContent
 * @returns {string[]}
 */
export function formatRemediationStepLines(resolved) {
    const lines = [];
    if (resolved.headline) lines.push(resolved.headline);
    if (resolved.body)     lines.push(resolved.body);
    if (resolved.hint)     lines.push(`Hint: ${resolved.hint}`);
    return lines.filter(l => typeof l === 'string' && l.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Internal resolvers
// ---------------------------------------------------------------------------

function _resolveErrorAnalysis({ stepId, stepType, question, expl, chosenOption }) {
    let body = null;

    // 1. Per-option incorrect explanation (most specific)
    if (expl && typeof expl === 'object' && expl.incorrect) {
        const incorrectMap = expl.incorrect;

        if (chosenOption !== null && chosenOption !== undefined) {
            const key = String(chosenOption);
            if (typeof incorrectMap[key] === 'string' && incorrectMap[key].trim()) {
                body = incorrectMap[key].trim();
            }
        }

        // 2. Fallback to incorrect.default
        if (!body && typeof incorrectMap.default === 'string' && incorrectMap.default.trim()) {
            body = incorrectMap.default.trim();
        }
    }

    // 3. Fallback to correct explanation (least specific but still authoritative)
    if (!body) {
        body = _resolveCorrectExpl(expl, question);
    }

    if (!body) {
        return _fallback(stepId, stepType, '(No error analysis content available for this question)');
    }

    return {
        stepId,
        stepType,
        headline: 'Error Analysis',
        body,
        hint: _resolveHint(question),
        isAuthoritative: true,
    };
}

function _resolveMicroLearnOrExample({ stepId, stepType, question, expl }) {
    // Primary: correct explanation (teaches the right concept)
    const body = _resolveCorrectExpl(expl, question);

    if (!body) {
        return _fallback(stepId, stepType, '(No explanation content available for this question)');
    }

    const headline = stepType === 'MICRO_LEARN' ? 'Review' : 'Example';

    return {
        stepId,
        stepType,
        headline,
        body,
        hint: _resolveHint(question),
        isAuthoritative: true,
    };
}

function _resolveCorrectExpl(expl, question) {
    if (expl && typeof expl === 'object' && typeof expl.correct === 'string' && expl.correct.trim()) {
        return expl.correct.trim();
    }
    if (typeof expl === 'string' && expl.trim()) {
        return expl.trim();
    }
    if (typeof question?.content?.explanation === 'string' && question.content.explanation.trim()) {
        return question.content.explanation.trim();
    }
    if (typeof question?.solution?.explanation === 'string' && question.solution.explanation.trim()) {
        return question.solution.explanation.trim();
    }
    return null;
}

function _resolveHint(question) {
    if (
        question?.hint?.enabled &&
        Array.isArray(question.hint.levels) &&
        question.hint.levels.length > 0
    ) {
        const first = question.hint.levels[0];
        if (typeof first?.text === 'string' && first.text.trim()) {
            return first.text.trim();
        }
    }
    return null;
}

function _fallback(stepId, stepType, message) {
    return {
        stepId,
        stepType,
        headline: null,
        body: message,
        hint: null,
        isAuthoritative: false,
    };
}
