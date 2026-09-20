/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2 (updated Sprint 3)
 * validators/choiceValidator.js
 * ==========================================================
 */

import ValidatorInterface from "./ValidatorInterface.js";

class ChoiceValidator extends ValidatorInterface {

    /**
     * ======================================================
     * VALIDATE
     * ======================================================
     */

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const rule     = step;      // step has answer, score, explanation

        if (rule.answer === undefined && (rule.choices || rule.options)) {
            const choices = rule.choices || rule.options || [];
            if (Array.isArray(choices)) {
                // Determine if it is single or multiple choice based on the number of correct choices
                const correctChoices = choices.filter(c => c.correct);
                if (correctChoices.length === 1) {
                    rule.answer = correctChoices[0].id || correctChoices[0].value;
                } else if (correctChoices.length > 1) {
                    rule.answer = correctChoices.map(c => c.id || c.value);
                }
            }
        }

        const maxScore = step.score || 1;
        const valid    = this.isValid(userAnswer, rule);
        const correct  = this.isCorrect(userAnswer, rule);
        const score    = this.score(userAnswer, rule);

        return this.result({
            valid,
            score,
            maxScore,
            message:     this.message(userAnswer, rule),
            explanation: step.explanation || "",
            expected:    step.answer,
            actual:      userAnswer
        });

    }

    /**
     * ======================================================
     * IS VALID
     * ======================================================
     */

    static isValid(answer){

        return answer !== null &&
               answer !== undefined &&
               answer !== "";

    }

    /**
     * ======================================================
     * IS CORRECT
     * ======================================================
     */

    static isCorrect(answer, rule){

        if(!this.isValid(answer))

            return false;

        if(rule.answer === undefined)

            return false;

        return String(answer) === String(rule.answer);

    }

    /**
     * ======================================================
     * SCORE
     * ======================================================
     */

    static score(answer, rule){

        if(!this.isCorrect(answer, rule))

            return 0;

        return rule.score || 1;

    }

    /**
     * ======================================================
     * MESSAGE
     * ======================================================
     */

    static message(answer, rule){

        if(!this.isValid(answer))

            return "Em chưa chọn đáp án.";

        if(this.isCorrect(answer, rule))

            return "Chính xác.";

        return rule.explanation ||

               "Đáp án chưa chính xác.";

    }

    /**
     * ======================================================
     * NORMALIZE
     * ======================================================
     */

    static normalize(answer){

        if(answer === null || answer === undefined)

            return "";

        return String(answer)

            .trim()

            .toUpperCase();

    }

    /**
     * ======================================================
     * CHECK MULTIPLE CHOICE
     * ======================================================
     */

    static multiple(selected = [], rule = {}){

        const correct = rule.answer || [];

        if(selected.length !== correct.length){

            return {

                valid:true,

                correct:false,

                score:0

            };

        }

        const ok =

            [...selected]

            .sort()

            .join(",")

            ===

            [...correct]

            .sort()

            .join(",");

        return {

            valid:true,

            correct:ok,

            score: ok ? (rule.score || 1) : 0

        };

    }

}

export default ChoiceValidator;