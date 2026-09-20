/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/highlightValidator.js
 * ==========================================================
 *
 * Validates highlight / text-selection exercises.
 *
 * step.answer  : string[]  – correct words / phrases to highlight
 * userAnswer   : string[]  – words / phrases the student selected
 *
 * Scoring:
 *   +1 per correctly selected item
 *   -1 per incorrectly selected item (wrong guess)
 *   score is clamped to [0, maxScore]
 */

import ValidatorInterface from "./ValidatorInterface.js";

class HighlightValidator extends ValidatorInterface {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const expected  = (step.answer || []).map(v => this.normalize(v));
        const actual    = (Array.isArray(userAnswer) ? userAnswer : []).map(v => this.normalize(v));
        const maxScore  = step.score || 1;

        // ── Validity ─────────────────────────────────────────
        const valid = actual.length > 0;

        if (!valid){
            return this.result({
                valid:    false,
                score:    0,
                maxScore,
                message:  "Em cần chọn ít nhất một từ/cụm từ.",
                expected: step.answer,
                actual:   userAnswer
            });
        }

        // ── Scoring (with penalty for wrong selections) ──────
        let correct = 0;
        let wrong   = 0;

        actual.forEach(sel => {
            const hit = expected.some(exp => exp === sel);
            if (hit) correct++;
            else     wrong++;
        });

        const total      = expected.length || 1;
        const rawScore   = correct - wrong;
        const score      = Math.max(0, (rawScore / total) * maxScore);
        const isCorrect  = correct === total && wrong === 0;

        return this.result({
            valid:       true,
            score,
            maxScore,
            message:     isCorrect
                ? "Chính xác!"
                : `Đúng ${correct}/${total}${wrong > 0 ? `, sai ${wrong}` : ""}.`,
            explanation: step.explanation || "",
            expected:    step.answer,
            actual:      userAnswer
        });

    }

}

export default HighlightValidator;
