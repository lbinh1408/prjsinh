/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/trueFalseValidator.js
 * ==========================================================
 *
 * Validates true/false exercises.
 *
 * step.answer  : boolean | "true" | "false"
 * userAnswer   : boolean | "true" | "false" | string
 */

import ValidatorInterface from "./ValidatorInterface.js";

class TrueFalseValidator extends ValidatorInterface {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const expected = this.toBool(step.answer);
        const maxScore = step.score || 1;

        // ── Validity ─────────────────────────────────────────
        const valid = userAnswer !== null    &&
                      userAnswer !== undefined &&
                      userAnswer !== "";

        if (!valid){
            return this.result({
                valid:    false,
                score:    0,
                maxScore,
                message:  "Em chưa chọn Đúng hoặc Sai.",
                expected: step.answer,
                actual:   userAnswer
            });
        }

        // ── Scoring ──────────────────────────────────────────
        const actual    = this.toBool(userAnswer);
        const isCorrect = actual === expected;

        return this.result({
            valid:       true,
            score:       isCorrect ? maxScore : 0,
            maxScore,
            message:     isCorrect ? "Chính xác!" : "Chưa đúng.",
            explanation: step.explanation || "",
            expected:    step.answer,
            actual:      userAnswer
        });

    }

    /**
     * Normalize any truthy/falsy value to a strict boolean.
     */
    static toBool(value){

        if (typeof value === "boolean") return value;

        const s = String(value).trim().toLowerCase();

        return s === "true" || s === "1" || s === "yes" || s === "đúng";

    }

}

export default TrueFalseValidator;
