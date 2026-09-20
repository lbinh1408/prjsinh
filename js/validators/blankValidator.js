/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2 (updated Sprint 3)
 * validators/blankValidator.js
 * ==========================================================
 */

import ValidatorInterface from "./ValidatorInterface.js";

class BlankValidator extends ValidatorInterface {

    /**
     * ======================================================
     * VALIDATE
     * ======================================================
     */

    static validate(step, userAnswer = []){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const rule     = step;      // step has answer, score, explanation
        const answers  = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const maxScore = step.score || 1;
        const valid    = this.isValid(answers);
        const correct  = this.isCorrect(answers, rule);
        const score    = this.score(answers, rule);

        return this.result({
            valid,
            score,
            maxScore,
            message:     this.message(answers, rule),
            explanation: step.explanation || "",
            expected:    step.answer,
            actual:      answers
        });

    }

    /**
     * ======================================================
     * IS VALID
     * ======================================================
     */

    static isValid(answers){

        if(!Array.isArray(answers))

            return false;

        return answers.every(answer =>

            String(answer).trim() !== ""

        );

    }

    /**
     * ======================================================
     * IS CORRECT
     * ======================================================
     */

    static isCorrect(answers, rule){

        if(!this.isValid(answers))

            return false;

        const correct = rule.answer || [];

        if(answers.length !== correct.length)

            return false;

        for(let i=0;i<correct.length;i++){

            if(

                this.normalize(answers[i])

                !==

                this.normalize(correct[i])

            ){

                return false;

            }

        }

        return true;

    }

    /**
     * ======================================================
     * SCORE
     * ======================================================
     */

    static score(answers, rule){

        const correct = rule.answer || [];

        const maxScore = rule.score || 1;

        if(correct.length === 0)

            return 0;

        let matched = 0;

        for(let i=0;i<correct.length;i++){

            if(

                this.normalize(answers[i])

                ===

                this.normalize(correct[i])

            ){

                matched++;

            }

        }

        return Number(

            (

                matched /

                correct.length *

                maxScore

            ).toFixed(2)

        );

    }

    /**
     * ======================================================
     * MESSAGE
     * ======================================================
     */

    static message(answers, rule){

        if(!this.isValid(answers))

            return "Em cần điền đầy đủ các ô trống.";

        if(this.isCorrect(answers, rule))

            return "Chính xác.";

        return rule.explanation ||

            "Một hoặc nhiều đáp án chưa đúng.";

    }

    /**
     * ======================================================
     * NORMALIZE
     * ======================================================
     */

    static normalize(text){

        return String(text)

            .trim()

            .toLowerCase()

            .replace(/\s+/g," ");

    }

    /**
     * ======================================================
     * DETAIL RESULT
     * ======================================================
     */

    static detail(answers, rule){

        const correct = rule.answer || [];

        return correct.map((item,index)=>({

            index,

            answer: answers[index] || "",

            correct: item,

            matched:

                this.normalize(

                    answers[index] || ""

                ) ===

                this.normalize(item)

        }));

    }

}

export default BlankValidator;