/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * engine.js
 * ==========================================================
 */

import LessonEngine from "./lessonEngine.js";
import Renderer from "./renderer.js";
import Progress from "./progress.js";
import Sidebar from "./sidebar.js";
import Feedback from "./feedback.js";
import Hint from "./hint.js";
import State from "./state.js";
import Storage from "./storage.js";
import Timer from "./timer.js";
import Summary from "./summary.js";
import Unlock from "./unlock.js";
import Analytics from "./analytics.js";
import ScoreEngine from "./scoreEngine.js";
import ComponentFactory from "./componentFactory.js";
import AnswerEngine from "./answerEngine.js";

class Engine {

    constructor() {

        this.lesson = null;

        this.steps = [];

        this.currentStep = 0;

        this.lessonEngine = new LessonEngine();

        this.timer = new Timer();

        this.roadmap = null;

    }

    /**
     * ======================================================
     * START
     * ======================================================
     */

    async start(lesson, roadmap = null) {

        if (!lesson)
            return;

        this.lesson = lesson;
        this.roadmap = roadmap;

        this.lessonEngine.setLesson(lesson);

        this.steps = lesson.steps || [];

        this.currentStep = 0;

        const topicEl = document.getElementById("today-topic");
        if (topicEl) {
            let subject;
            for (const mod of this.roadmap?.modules || []) {
                subject = (mod.subjects || []).find(s => s.id === lesson.module);
                if (subject) break;
            }
            topicEl.innerText = subject ? subject.name : "TS10 Learning";
        }

        this.lessonEngine.reset();

        this.timer.reset();

        this.timer.start();

        State.setLesson(lesson);
        this.isFinished = false;

        this.render();

    }

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    render() {

        if (!this.steps.length)
            return;

        const step =
            this.steps[this.currentStep];

        this.lessonEngine.setStep(step);

        Renderer.render(step);

        Progress.update(

            this.currentStep + 1,

            this.steps.length

        );

        Sidebar.update(

            this.currentStep,

            this.steps.length

        );

        // Toggle btn-check visibility based on validator presence and review mode
        const validator = ComponentFactory.getValidator(step);
        const btnCheck = document.getElementById("btn-check");
        if (btnCheck) {
            const reviewMode = this.lesson?.reviewMode || "instant";
            if (validator && validator.name !== "NullValidator" && reviewMode === "instant") {
                btnCheck.style.display = "inline-block";
            } else {
                btnCheck.style.display = "none";
            }
        }

    }

    /**
     * ======================================================
     * CHECK ANSWER
     * ======================================================
     */

    checkAnswer(fromNext = false) {

        if (!this.lessonEngine.step) return false;

        const step = this.lessonEngine.step;
        const validator = ComponentFactory.getValidator(step);

        if (!validator || validator.name === "NullValidator") return true;

        const userAnswer = AnswerEngine.collect(step);
        const result = validator.validate(step, userAnswer);

        if (result.valid) {
            let badgeHtml = "";
            if (result.score === result.maxScore) {
                const msg = validator.name === "TextValidator" ? "Đã trả lời" : (result.message || "Chính xác!");
                if (!fromNext) Feedback.success(msg);
                badgeHtml = `<span style="background: #dcfce7; color: #166534; padding: 5px 15px; border-radius: 99px; font-weight: bold; font-size: 14px; border: 1px solid #22c55e;">✅ ${msg}</span>`;
            } else if (result.score > 0) {
                if (!fromNext) Feedback.info(result.message || `Đúng một phần: ${result.score}/${result.maxScore}`);
                badgeHtml = `<span style="background: #fef9c3; color: #854d0e; padding: 5px 15px; border-radius: 99px; font-weight: bold; font-size: 14px; border: 1px solid #eab308;">⚠️ Đúng một phần (${result.score}/${result.maxScore})</span>`;
            } else {
                if (!fromNext) Feedback.error(result.message || "Chưa chính xác. Hãy thử lại!");
                badgeHtml = `<span style="background: #fee2e2; color: #991b1b; padding: 5px 15px; border-radius: 99px; font-weight: bold; font-size: 14px; border: 1px solid #ef4444;">❌ Chưa chính xác</span>`;
            }
            const badgeEl = document.getElementById("lesson-validation-badge");
            if (badgeEl) badgeEl.innerHTML = badgeHtml;
            return true;
        } else {
            Feedback.warning(result.message || "Vui lòng hoàn thành câu trả lời trước khi kiểm tra.");
            return false;
        }

    }

    /**
     * ======================================================
     * NEXT
     * ======================================================
     */

    next() {
        if(this.isFinished){
            const nextLessonId = Unlock.nextLesson(this.lesson.id, this.roadmap);
            if(nextLessonId){
                window.location.hash = "#/lesson?id=" + nextLessonId;
            } else {
                Feedback.success("🎉 Bạn đã hoàn thành lộ trình!");
            }
            return;
        }

        if (!this.lessonEngine.validate()){
            Feedback.warning("Bạn chưa hoàn thành bước này.");
            return;
        }

        const step = this.lessonEngine.step;
        const validator = ComponentFactory.getValidator(step);
        const needsCheck = validator && validator.name !== "NullValidator";

        if (needsCheck && !this.stepChecked) {
            const checked = this.checkAnswer(true);
            if (checked) {
                this.stepChecked = true;
                const btnNext = document.getElementById("btn-next");
                if (btnNext) btnNext.style.opacity = "0.5";
                
                setTimeout(() => {
                    if (this.stepChecked) {
                        this.next();
                    }
                }, 1500);
            }
            return;
        }

        this.lessonEngine.score();
        this.stepChecked = false;
        const btnNext = document.getElementById("btn-next");
        if (btnNext) {
            btnNext.innerText = "Tiếp →";
            btnNext.style.opacity = "1";
        }

        if (

            this.currentStep >=
            this.steps.length - 1

        ){

            this.finish();

            return;

        }

        this.save();

        this.currentStep++;

        this.render();

    }

    /**
     * ======================================================
     * PREVIOUS
     * ======================================================
     */

    previous() {

        if (this.currentStep <= 0)
            return;

        this.stepChecked = false;
        const btnNext = document.getElementById("btn-next");
        if (btnNext) btnNext.innerText = "Tiếp →";

        this.currentStep--;

        this.render();

    }

    /**
     * ======================================================
     * SHOW HINT
     * ======================================================
     */

    showHint() {

        const step =
            this.steps[this.currentStep];

        Hint.show(step);

    }

    /**
     * ======================================================
     * RETRY
     * ======================================================
     */

    retry() {

        this.lessonEngine.clear();

        this.render();

    }

    /**
     * ======================================================
     * SAVE
     * ======================================================
     */

    save() {

        this.lessonEngine.save();
        if (this.lesson?.id) {
            Progress.save(this.lesson.id);
        }

    }

    /**
     * ======================================================
     * FINISH
     * ======================================================
     */

    finish() {

        this.isFinished = true;
        const elapsedMilliseconds = this.timer.stop();

        const elapsedSeconds = Math.floor(

            elapsedMilliseconds / 1000

        );

        if (this.lesson?.id) {

            Timer.save(

                this.lesson.id,

                elapsedSeconds

            );

        }

        this.lessonEngine.finish();

        if (this.lesson?.id) {
            const scoreExport = ScoreEngine.export();
            Analytics.recordLessonAttempt(
                this.lesson.id,
                scoreExport.percent,
                elapsedSeconds
            );
        }

        if (this.lesson?.id && this.roadmap) {
            Unlock.unlockNext(this.lesson.id, this.roadmap);
        }

        Summary.render();

        Feedback.success(

            "🎉 Bạn đã hoàn thành bài học."

        );

    }

    /**
     * ======================================================
     * RELOAD
     * ======================================================
     */

    reload() {

        this.render();

    }

    /**
     * ======================================================
     * GOTO
     * ======================================================
     */

    goTo(index) {

        if (

            index < 0 ||

            index >= this.steps.length

        ){

            return;

        }

        this.currentStep = index;

        this.render();

    }

    /**
     * ======================================================
     * GET CURRENT STEP
     * ======================================================
     */

    current() {

        return this.steps[this.currentStep];

    }

    /**
     * ======================================================
     * STEP COUNT
     * ======================================================
     */

    total() {

        return this.steps.length;

    }

}

export default Engine;