/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/dragValidator.js
 * ==========================================================
 *
 * Validates drag-and-drop exercises.
 *
 * step.answer  : { [itemId]: targetZoneId, ... }
 * userAnswer   : { [itemId]: targetZoneId, ... }
 */

import ValidatorInterface from "./ValidatorInterface.js";

class DragValidator extends ValidatorInterface {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const expected  = step.answer  || {};
        const actual    = userAnswer   || {};
        const maxScore  = step.score   || 1;
        const itemIds   = Object.keys(expected);

        // ── Validity – every draggable must be placed ────────
        const valid = itemIds.length > 0 &&
            itemIds.every(id => actual[id] !== undefined && actual[id] !== "");

        if (!valid){
            return this.result({
                valid:    false,
                score:    0,
                maxScore,
                message:  "Em cần kéo tất cả các mục vào đúng vị trí.",
                expected,
                actual
            });
        }

        // ── Scoring ──────────────────────────────────────────
        let correct = 0;
        const details = {};

        itemIds.forEach(id => {
            const ok = this.normalize(actual[id]) === this.normalize(expected[id]);
            if (ok) correct++;
            details[id] = { expected: expected[id], actual: actual[id], correct: ok };
        });

        const total     = itemIds.length || 1;
        const score     = (correct / total) * maxScore;
        const isCorrect = correct === total;

        return this.result({
            valid:       true,
            score,
            maxScore,
            message:     isCorrect ? "Chính xác!" : `Đúng ${correct}/${total} mục.`,
            explanation: step.explanation || "",
            expected,
            actual:      details
        });

    }

}

export default DragValidator;
