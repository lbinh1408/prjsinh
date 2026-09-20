/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * lessonEngine.js
 * ==========================================================
 */

import Storage         from "./storage.js";
import ScoreEngine     from "./scoreEngine.js";
import AnswerEngine    from "./answerEngine.js";
import ComponentFactory from "./componentFactory.js";
import Feedback        from "./feedback.js";
import State           from "./state.js";
import History         from "./history.js";

class LessonEngine {

    constructor() {

        this.lesson = null;

        this.step = null;

    }

    /**
     * ======================================================
     * SET LESSON
     * ======================================================
     */

    setLesson(lesson){

        this.lesson = lesson;

    }

    /**
     * ======================================================
     * SET STEP
     * ======================================================
     */

    setStep(step){

        this.step = step;

    }

    /**
     * ======================================================
     * VALIDATE
     * ======================================================
     */

    validate(){

        if(!this.step) return true;

        // Collect current answer from DOM
        const userAnswer = AnswerEngine.collect(this.step);

        // Ask the component what its validator is, then check validity
        const validator = ComponentFactory.getValidator(this.step);
        const result    = validator.validate(this.step, userAnswer);

        return result.valid;

    }

    /**
     * ======================================================
     * SAVE ANSWER
     * ======================================================
     */

    save(){

        if(!this.step)
            return;

        const answer =
            AnswerEngine.collect(this.step);

        const previousAnswer =
            Storage.loadAnswer(

                this.lesson.id,

                this.step.id

            );

        Storage.saveAnswer(

            this.lesson.id,

            this.step.id,

            answer

        );

        if(!AnswerEngine.isSameAnswer(previousAnswer, answer)){

            History.save(

                this.lesson.id,

                this.step.id,

                answer,

                {

                    source:"answer"

                }

            );

        }

    }

    /**
     * ======================================================
     * LOAD ANSWER
     * ======================================================
     */

    load(){

        if(!this.step)
            return null;

        return Storage.loadAnswer(

            this.lesson.id,

            this.step.id

        );

    }

    /**
     * ======================================================
     * RESTORE
     * ======================================================
     */

    restore(){

        const answer =
            this.load();

        if(answer){

            AnswerEngine.restore(

                this.step,

                answer

            );

        }

    }

    /**
     * ======================================================
     * CLEAR CURRENT ANSWER
     * ======================================================
     */

    clear(){

        if(!this.step)
            return;

        Storage.removeAnswer(

            this.lesson.id,

            this.step.id

        );

    }

    score(){

        if(!this.step) return 0;

        const currentAnswer = AnswerEngine.collect(this.step);
        const savedAnswer   = this.load();

        const answer = this.hasAnswer(currentAnswer) ? currentAnswer : savedAnswer;

        // Use the component's validator for scoring
        const validator = ComponentFactory.getValidator(this.step);
        const result    = validator.validate(this.step, answer);

        ScoreEngine.record(this.step, result.score, result.maxScore);

        return result.score;

    }

    /**
     * ======================================================
     * FINISH LESSON
     * ======================================================
     */

    finish(){

        const score =
            ScoreEngine.total();

        Storage.completeLesson(

            this.lesson.id,

            score

        );

        State.finishLesson();

        Feedback.success(

            `Hoàn thành bài học (${score} điểm).`

        );

    }

    /**
     * ======================================================
     * RESET LESSON
     * ======================================================
     */

    reset(){

        Storage.resetLesson(

            this.lesson.id

        );

        ScoreEngine.reset();

    }

    /**
     * ======================================================
     * LESSON PROGRESS
     * ======================================================
     */

    progress(){

        return Storage.lessonProgress(

            this.lesson.id

        );

    }

    /**
     * ======================================================
     * LESSON SCORE
     * ======================================================
     */

    lessonScore(){

        return Storage.lessonScore(

            this.lesson.id

        );

    }

    /**
     * ======================================================
     * LESSON STATUS
     * ======================================================
     */

    status(){

        return Storage.lessonStatus(

            this.lesson.id

        );

    }

    hasAnswer(answer){

        if(answer === null || answer === undefined)
            return false;

        if(typeof answer === "string")
            return answer.trim() !== "";

        if(Array.isArray(answer))
            return answer.some(item => String(item).trim() !== "");

        return true;

    }

}

export default LessonEngine;