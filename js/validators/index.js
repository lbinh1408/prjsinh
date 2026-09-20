/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/index.js
 * ==========================================================
 *
 * Central registry for all validators.
 *
 * Usage:
 *   import { getValidator } from "./validators/index.js";
 *   const validator = getValidator(step.validator || step.type);
 *   const result    = validator.validate(step, userAnswer);
 */

import BlankValidator     from "./blankValidator.js";
import ChoiceValidator    from "./choiceValidator.js";
import TextValidator      from "./textValidator.js";
import MatchValidator     from "./matchValidator.js";
import OrderValidator     from "./orderValidator.js";
import HighlightValidator from "./highlightValidator.js";
import DragValidator      from "./dragValidator.js";
import TrueFalseValidator from "./trueFalseValidator.js";

/**
 * Registry: maps validator key → class
 *
 * Keys are checked in this order:
 *  1. step.validator  (explicit override from JSON)
 *  2. step.type       (implicit fallback)
 */
const Registry = {

    // ── Explicit names (step.validator) ──────────────────────
    blankValidator:     BlankValidator,
    choiceValidator:    ChoiceValidator,
    textValidator:      TextValidator,
    matchValidator:     MatchValidator,
    orderValidator:     OrderValidator,
    highlightValidator: HighlightValidator,
    dragValidator:      DragValidator,
    trueFalseValidator: TrueFalseValidator,

    // ── Implicit fallbacks (step.type) ───────────────────────
    fillBlank:          BlankValidator,
    identify:           ChoiceValidator,
    choice:             ChoiceValidator,
    trueFalse:          TrueFalseValidator,
    explain:            TextValidator,
    reflection:         TextValidator,
    matching:           MatchValidator,
    ordering:           OrderValidator,
    timeline:           OrderValidator,
    highlight:          HighlightValidator,
    dragDrop:           DragValidator,

};

/**
 * Returns the validator class for a given key.
 * Falls back to a no-op validator if no match found.
 */
export function getValidator(key){

    return Registry[key] || NullValidator;

}

/**
 * No-op validator – used when a component type has no registered validator.
 * Always returns valid = true so the lesson can proceed.
 */
class NullValidator {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        return {
            valid:       true,
            score:       step.score || 1,
            maxScore:    step.score || 1,
            message:     "",
            explanation: "",
            details:     { expected: null, actual: userAnswer }
        };

    }

}

export {
    BlankValidator,
    ChoiceValidator,
    TextValidator,
    MatchValidator,
    OrderValidator,
    HighlightValidator,
    DragValidator,
    TrueFalseValidator,
};

export default Registry;
