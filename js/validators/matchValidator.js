/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/matchValidator.js
 * ==========================================================
 *
 * Validates matching exercises.
 *
 * step.answer  : { [leftItem]: rightItem, ... }
 * userAnswer   : { [leftItem]: rightItem, ... }
 */

import ValidatorInterface from "./ValidatorInterface.js";

class MatchValidator extends ValidatorInterface {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const expected  = step.answer  || {};
        const actual    = userAnswer   || {};
        const maxScore  = step.score   || 1;
        const pairs     = Object.keys(expected);

        // ── Validity ────────────────────────────────────────
        const valid = pairs.length > 0 &&
            pairs.every(k => actual[k] !== undefined && actual[k] !== "");

        if (!valid){
            return this.result({
                valid:    false,
                score:    0,
                maxScore,
                message:  "Em cần nối đủ tất cả các cặp.",
                expected,
                actual
            });
        }

        // ── Scoring ──────────────────────────────────────────
        let correct = 0;
        const details = {};

        pairs.forEach(k => {
            const ok = this.normalize(actual[k]) === this.normalize(expected[k]);
            if (ok) correct++;
            details[k] = { expected: expected[k], actual: actual[k], correct: ok };
        });

        const total     = pairs.length || 1;
        const score     = (correct / total) * maxScore;
        const isCorrect = correct === total;

        return this.result({
            valid:       true,
            score,
            maxScore,
            message:     isCorrect ? "Chính xác!" : `Đúng ${correct}/${total} cặp.`,
            explanation: step.explanation || "",
            expected,
            actual:      details
        });

    }

}

export default MatchValidator;
