/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * scoreEngine.js
 * ==========================================================
 */

import AnswerEngine from "./answerEngine.js";

class ScoreEngine {

    static score = 0;

    static maxScore = 0;

    static history = [];

    /**
     * ======================================================
     * RECORD SCORE
     * ======================================================
     */
    static record(step, point, max) {
        const existing = this.history.find(item => item.id === step.id);
        if (existing) {
            this.score = this.score - existing.score + point;
            this.maxScore = this.maxScore - existing.max + max;
            existing.score = point;
            existing.max = max;
        } else {
            this.score += point;
            this.maxScore += max;
            this.history.push({
                id: step.id,
                type: step.type,
                score: point,
                max: max
            });
        }
    }

    /**
     * ======================================================
     * RESET
     * ======================================================
     */

    static reset(){

        this.score = 0;

        this.maxScore = 0;

        this.history = [];

    }

    /**
     * ======================================================
     * CALCULATE
     * ======================================================
     */

    static calculate(step, answer = null){

        if(!step)
            return 0;

        let point = 0;

        switch(step.type){

            case "observe":

                point = this.observe(step, answer);

                break;

            case "identify":

                point = this.identify(step, answer);

                break;

            case "fillBlank":

                point = this.fillBlank(step, answer);

                break;

            case "ordering":

                point = this.ordering(step, answer);

                break;

            case "explain":

                point = this.explain(step, answer);

                break;

            case "reflection":

                point = this.reflection(step, answer);

                break;

            case "choice":
            case "trueFalse":
                point = this.identify(step, answer);
                break;

            case "matching":
                point = this.matching(step, answer);
                break;

            case "highlight":
                point = this.highlight(step, answer);
                break;

            case "dragDrop":
                point = this.matching(step, answer);
                break;

            case "timeline":
                point = this.ordering(step, answer);
                break;
            
            case "flashcard":
                point = step.score || 1;
                break;

            default:
                point = 0;

        }

        this.score += point;

        this.maxScore += step.score || 1;

        this.history.push({

            id:step.id,

            type:step.type,

            score:point,

            max:step.score || 1

        });

        return point;

    }

    /**
     * ======================================================
     * OBSERVE
     * ======================================================
     */

    static observe(step){

        return step.score || 1;

    }

    static getAnswer(step, answer = null){

        if(answer !== null && answer !== undefined)
            return answer;

        if(typeof document === "undefined")
            return null;

        return AnswerEngine.current(step);

    }

    /**
     * ======================================================
     * IDENTIFY
     * ======================================================
     */

    static identify(step, answer = null){

        const selected = this.getAnswer(step, answer);

        if(selected === null || selected === undefined || selected === "")
            return 0;

        return String(selected) === String(step.answer)
            ? (step.score || 1)
            : 0;

    }

    /**
     * ======================================================
     * FILL BLANK
     * ======================================================
     */

    static fillBlank(step, answer = null){

        const expected = Array.isArray(step.answer)
            ? step.answer
            : [step.answer];

        if(!expected.length)
            return 0;

        const values = this.getAnswer(step, answer);

        const blanks = Array.isArray(values)
            ? values
            : [values];

        let correct = 0;

        blanks.forEach((value,index)=>{

            if(

                String(value)

                .trim()

                .toLowerCase() ===

                String(expected[index] || "")

                .trim()

                .toLowerCase()

            ){

                correct++;

            }

        });

        return (

            correct /

            expected.length

        ) * (step.score || 1);

    }

    /**
     * ======================================================
     * EXPLAIN
     * ======================================================
     */

    static explain(step, answer = null){

        const text = this.getAnswer(step, answer);

        if(typeof text !== "string")
            return 0;

        const words = text

            .trim()

            .split(/\s+/)

            .filter(Boolean)

            .length;

        const minimumWords = step.minWords || 15;

        const fullScoreWords = step.fullScoreWords || 40;

        if(words < minimumWords)
            return 0;

        if(words < fullScoreWords)
            return (step.score || 1) * 0.5;

        return step.score || 1;

    }

    /**
     * ======================================================
     * REFLECTION
     * ======================================================
     */

    static reflection(step, answer = null){

        return this.explain(step, answer);

    }

    /**
     * ======================================================
     * TOTAL
     * ======================================================
     */

    static total(){

        return Number(

            this.score.toFixed(2)

        );

    }

    /**
     * ======================================================
     * NEW SPRINT 3 COMPONENTS
     * ======================================================
     */

    static ordering(step, answer = null){
        const expected = step.answer;
        const provided = this.getAnswer(step, answer);
        if (!provided) return 0;
        let correct = 0;

        if (Array.isArray(expected)) {
            let providedArray = [];
            if (Array.isArray(provided)) {
                providedArray = provided;
            } else if (typeof provided === 'object') {
                const items = step.items || [];
                const entries = Object.entries(provided)
                    .map(([itemId, order]) => ({
                        item: (items[itemId] && items[itemId].id) ? items[itemId].id : (items[itemId] ?? itemId),
                        order: parseInt(order, 10)
                    }))
                    .sort((a, b) => a.order - b.order);
                providedArray = entries.map(e => e.item);
            }

            let total = expected.length || 1;
            for(let i=0; i<expected.length; i++){
                const expectedItem = expected[i].id ?? expected[i];
                if(String(providedArray[i]) === String(expectedItem)) correct++;
            }
            return (correct / total) * (step.score || 1);
        } else {
            const expectedObj = expected || {};
            const providedObj = provided || {};
            let total = Object.keys(expectedObj).length || 1;
            for (const [itemId, expectedOrder] of Object.entries(expectedObj)) {
                if (String(providedObj[itemId]) === String(expectedOrder)) correct++;
            }
            return (correct / total) * (step.score || 1);
        }
    }

    static highlight(step, answer = null){
        let expectedRaw = step.answer || [];
        const providedRaw = this.getAnswer(step, answer) || [];
        if (typeof expectedRaw === 'string') expectedRaw = [expectedRaw];
        
        const normalize = (str) => String(str).toLowerCase().trim().replace(/[.,;?!]+$/, "");
        const expected = expectedRaw.map(normalize);
        const provided = providedRaw.map(normalize);
        
        let correct = 0;
        provided.forEach(val => {
            // Check if this single word is contained in any expected phrase
            if (expected.includes(val) || expected.some(phrase => phrase.includes(val) || val.includes(phrase))) {
                correct++;
            }
        });

        const total = expected.length || 1;
        const penalty = Math.max(0, provided.length - correct);
        const finalCorrect = Math.max(0, correct - penalty);
        return (finalCorrect / total) * (step.score || 1);
    }

    static matching(step, answer = null){
        const expected = step.answer || {};
        const provided = this.getAnswer(step, answer) || {};
        let correct = 0;
        let total = Object.keys(expected).length || 1;
        for (const [pairId, expectedValue] of Object.entries(expected)) {
            if (String(provided[pairId]) === String(expectedValue)) correct++;
        }
        return (correct / total) * (step.score || 1);
    }

    /**
     * ======================================================
     * MAX
     * ======================================================
     */

    static maximum(){

        return this.maxScore;

    }

    /**
     * ======================================================
     * PERCENT
     * ======================================================
     */

    static percent(){

        if(this.maxScore === 0)
            return 0;

        return Math.round(

            this.score /

            this.maxScore *

            100

        );

    }

    /**
     * ======================================================
     * HISTORY
     * ======================================================
     */

    static details(){

        return this.history;

    }

    /**
     * ======================================================
     * EXPORT
     * ======================================================
     */

    static export(){

        return {

            score:this.total(),

            max:this.maximum(),

            percent:this.percent(),

            details:this.details()

        };

    }

}

export default ScoreEngine;