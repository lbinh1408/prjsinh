/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/ValidatorInterface.js
 * ==========================================================
 *
 * Base interface for all validators.
 * Every validator MUST conform to this contract.
 *
 * Usage:
 *   const result = SomeValidator.validate(step, userAnswer);
 *
 * Return shape (always):
 * {
 *   valid:       boolean  – user has provided a non-empty answer
 *   score:       number   – points earned
 *   maxScore:    number   – maximum possible points for this step
 *   message:     string   – short feedback shown to the student
 *   explanation: string   – longer explanation (may be empty)
 *   details: {
 *     expected: any       – correct answer from step schema
 *     actual:   any       – what the student submitted
 *   }
 * }
 */

class ValidatorInterface {

    /**
     * ======================================================
     * VALIDATE  (override in every concrete validator)
     * ======================================================
     */

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        throw new Error(
            `${this.name}.validate(step, userAnswer) must be implemented.`
        );

    }

    /**
     * ======================================================
     * RESULT BUILDER  (shared helper)
     * ======================================================
     * Use this in every concrete validator to guarantee
     * a consistent return shape.
     */

    static result({
        valid       = false,
        score       = 0,
        maxScore    = 1,
        message     = "",
        explanation = "",
        expected    = null,
        actual      = null
    } = {}){

        return {
            valid,
            score:       Number(Number(score).toFixed(2)),
            maxScore:    Number(maxScore),
            message,
            explanation,
            details: { expected, actual }
        };

    }

    /**
     * ======================================================
     * NORMALIZE  (shared text helper)
     * ======================================================
     */

    static normalize(text){

        return String(text ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    }

}

export default ValidatorInterface;
