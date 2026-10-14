/**
 * k283ImmediateFeedbackV1.js
 *
 * Formats immediate instructional feedback after a question attempt
 * using authoritative question explanation and hint content only.
 * Never fabricates explanations; uses neutral fallback when missing.
 */

export function resolveQuestionFeedback(question, evaluation, userResponse = null) {
    const isCorrect = Boolean(
        evaluation?.correct ?? (evaluation?.result === 'correct')
    );

    // Resolve authoritative correct answer representation
    let correctValue = null;
    if (question?.answer !== undefined && question?.answer !== null) {
        if (typeof question.answer === 'object') {
            correctValue = question.answer.value ?? null;
        } else {
            correctValue = question.answer;
        }
    }
    if (correctValue === null || correctValue === undefined) {
        correctValue = question?.correctAnswer ?? question?.expectedAnswer ?? null;
    }

    let explanationText = null;
    let hintText = null;

    if (!isCorrect) {
        // 1. Authoritative question explanation lookup
        const explObj = question?.explanation;
        if (explObj && typeof explObj === 'object') {
            if (explObj.incorrect) {
                if (typeof explObj.incorrect === 'object') {
                    if (userResponse !== null && userResponse !== undefined && explObj.incorrect[userResponse]) {
                        explanationText = explObj.incorrect[userResponse];
                    } else if (explObj.incorrect.default) {
                        explanationText = explObj.incorrect.default;
                    }
                } else if (typeof explObj.incorrect === 'string') {
                    explanationText = explObj.incorrect;
                }
            }
            // Fallback to authoritative correct explanation if specific incorrect not found
            if (!explanationText && typeof explObj.correct === 'string') {
                explanationText = explObj.correct;
            }
        } else if (typeof explObj === 'string' && explObj.trim()) {
            explanationText = explObj.trim();
        } else if (typeof question?.content?.explanation === 'string' && question.content.explanation.trim()) {
            explanationText = question.content.explanation.trim();
        } else if (typeof question?.solution?.explanation === 'string' && question.solution.explanation.trim()) {
            explanationText = question.solution.explanation.trim();
        }

        // 2. Authoritative hint lookup
        if (question?.hint?.enabled && Array.isArray(question?.hint?.levels) && question.hint.levels.length > 0) {
            const firstLevel = question.hint.levels[0];
            if (typeof firstLevel?.text === 'string' && firstLevel.text.trim()) {
                hintText = firstLevel.text.trim();
            }
        }
    } else {
        // Correct answer feedback
        const explObj = question?.explanation;
        if (explObj && typeof explObj === 'object' && typeof explObj.correct === 'string') {
            explanationText = explObj.correct.trim();
        } else if (typeof explObj === 'string' && explObj.trim()) {
            explanationText = explObj.trim();
        } else if (typeof question?.content?.explanation === 'string' && question.content.explanation.trim()) {
            explanationText = question.content.explanation.trim();
        } else if (typeof question?.solution?.explanation === 'string' && question.solution.explanation.trim()) {
            explanationText = question.solution.explanation.trim();
        }
    }

    return {
        isCorrect,
        correctValue,
        explanationText: explanationText ? explanationText.trim() : null,
        hintText: hintText ? hintText.trim() : null,
        hasAuthoritativeExplanation: Boolean(explanationText && explanationText.trim())
    };
}

export function formatQuestionFeedbackLines(feedback) {
    const lines = [];

    if (!feedback.isCorrect) {
        if (feedback.correctValue !== null && feedback.correctValue !== undefined) {
            lines.push(`Correct answer: ${feedback.correctValue}`);
        }

        if (feedback.hasAuthoritativeExplanation) {
            lines.push(`Explanation   : ${feedback.explanationText}`);
        } else {
            lines.push('Explanation   : (No explanation available for this question)');
        }

        if (feedback.hintText) {
            lines.push(`Hint          : ${feedback.hintText}`);
        }
    } else {
        if (feedback.hasAuthoritativeExplanation) {
            lines.push(`Explanation   : ${feedback.explanationText}`);
        }
    }

    return lines;
}
