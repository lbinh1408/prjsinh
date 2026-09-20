/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * renderer.js
 * ==========================================================
 */

import ComponentFactory from "./componentFactory.js";
import Animation from "./animation.js";
import State from "./state.js";

class Renderer {

    /**
     * ======================================================
     * Render One Step
     * ======================================================
     */

    static render(step) {

        const container =
            document.getElementById(
                "lesson-container"
            );

        if (!container)
            return;

        container.innerHTML = "";

        const lesson =
            this.createLesson(step);

        container.appendChild(lesson);

        Animation.play("lesson-transition", lesson);

    }

    /**
     * ======================================================
     * Lesson Wrapper
     * ======================================================
     */

    static createLesson(step) {

        const wrapper =
            document.createElement("div");

        wrapper.className = "lesson";

        wrapper.appendChild(

            this.createHeader(step)

        );

        wrapper.appendChild(

            this.createBody(step)

        );

        return wrapper;

    }

    /**
     * ======================================================
     * Header
     * ======================================================
     */

    static createHeader(step) {

        const header =
            document.createElement("section");

        header.className = "lesson-header";

        const lesson = State.lesson() || {};
        const currentStep = State.currentStep();
        const totalSteps = State.totalSteps();
        const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

        header.innerHTML = `
            <div style="display:inline-flex; width: 100%; justify-content: space-between; align-items: center;">
                <div style="display:inline-flex;">
                    <div class="lesson-topic">
                        ${lesson.title || ""}
                    </div>
                    <div class="lesson-description">
                        ${lesson.description || ""}
                    </div>
                </div>
                <div id="lesson-validation-badge" style="font-size: 1.1em;"></div>
            </div>
   
            <div class="lesson-progress-bar">
                <div class="lesson-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
        `;

        return header;

    }

    /**
     * ======================================================
     * Body
     * ======================================================
     */

    static createBody(step) {

        const body =
            document.createElement("section");

        body.className = "lesson-step";
        
        // Remove card constraints for full-page components
        if (step.type === "reference") {
            body.style.padding = "0";
            body.style.border = "none";
            body.style.background = "transparent";
            body.style.boxShadow = "none";
        } else {
            body.appendChild(
                this.createStepHeader(step)
            );
        }

        body.appendChild(
            ComponentFactory.create(step)
        );

        return body;

    }

    /**
     * ======================================================
     * Step Header
     * ======================================================
     */

    static createStepHeader(step) {

        const header =
            document.createElement("div");

        header.className = "step-header";

        header.innerHTML = `

            <div class="step-icon">

                ${step.icon || "📖"}

            </div>

            <div>

                <div class="step-title">

                    ${step.title || step.type}

                </div>

                <div class="step-subtitle">

                    ${step.goal || ""}

                </div>

            </div>

        `;

        return header;

    }

    /**
     * ======================================================
     * Empty
     * ======================================================
     */

    static empty(message = "Không có dữ liệu.") {

        const container =
            document.getElementById(
                "lesson-container"
            );

        if (!container)
            return;

        container.innerHTML = `

            <div class="lesson-empty">

                <h2>${message}</h2>

            </div>

        `;

    }

    /**
     * ======================================================
     * Loading
     * ======================================================
     */

    static loading() {

        const container =
            document.getElementById(
                "lesson-container"
            );

        if (!container)
            return;

        container.innerHTML = `

            <div class="component-loading">

                <div class="spinner"></div>

            </div>

        `;

    }

    /**
     * ======================================================
     * Summary
     * ======================================================
     */

    static summary(html) {

        const container =
            document.getElementById(
                "lesson-container"
            );

        if (!container)
            return;

        container.innerHTML = html;

    }

    /**
     * ======================================================
     * Replace Component
     * ======================================================
     */

    static replace(component) {

        const body =
            document.querySelector(
                ".lesson-step"
            );

        if (!body)
            return;

        const old =
            body.querySelector(".component");

        if (old) {

            old.replaceWith(component);

        } else {

            body.appendChild(component);

        }

    }

}

export default Renderer;