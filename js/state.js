/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * state.js
 * ==========================================================
 */

class State {

    static data = {

        lesson: null,

        step: 0,

        totalSteps: 0,

        completed: false,

        score: 0,

        answers: {},

        flags: {}

    };

    /**
     * ======================================================
     * LESSON
     * ======================================================
     */

    static setLesson(lesson){

        this.data.lesson = lesson;

        this.data.step = 0;

        this.data.totalSteps = lesson?.steps?.length || 0;

        this.data.completed = false;

        this.data.score = 0;

        this.data.answers = {};

    }

    static lesson(){

        return this.data.lesson;

    }

    /**
     * ======================================================
     * STEP
     * ======================================================
     */

    static setStep(index){

        this.data.step = index;

    }

    static nextStep(){

        if(this.data.step < this.data.totalSteps-1){

            this.data.step++;

        }

    }

    static previousStep(){

        if(this.data.step>0){

            this.data.step--;

        }

    }

    static currentStep(){

        return this.data.step;

    }

    static current(){

        return this.data.lesson?.steps?.[this.data.step] || null;

    }

    static totalSteps(){

        return this.data.totalSteps;

    }

    /**
     * ======================================================
     * ANSWERS
     * ======================================================
     */

    static setAnswer(

        stepId,

        answer

    ){

        this.data.answers[stepId] = answer;

    }

    static answer(stepId){

        return this.data.answers[stepId];

    }

    static answers(){

        return this.data.answers;

    }

    static clearAnswers(){

        this.data.answers = {};

    }

    /**
     * ======================================================
     * SCORE
     * ======================================================
     */

    static setScore(score){

        this.data.score = score;

    }

    static addScore(point){

        this.data.score += point;

    }

    static score(){

        return this.data.score;

    }

    /**
     * ======================================================
     * STATUS
     * ======================================================
     */

    static finishLesson(){

        this.data.completed = true;

    }

    static completed(){

        return this.data.completed;

    }

    /**
     * ======================================================
     * FLAGS
     * ======================================================
     */

    static setFlag(

        key,

        value

    ){

        this.data.flags[key] = value;

    }

    static flag(key){

        return this.data.flags[key];

    }

    static removeFlag(key){

        delete this.data.flags[key];

    }

    static clearFlags(){

        this.data.flags = {};

    }

    /**
     * ======================================================
     * RESET
     * ======================================================
     */

    static reset(){

        this.data = {

            lesson:null,

            step:0,

            totalSteps:0,

            completed:false,

            score:0,

            answers:{},

            flags:{}

        };

    }

    /**
     * ======================================================
     * EXPORT
     * ======================================================
     */

    static export(){

        return structuredClone(this.data);

    }

    /**
     * ======================================================
     * IMPORT
     * ======================================================
     */

    static import(data){

        this.data = structuredClone(data);

    }

}

export default State;