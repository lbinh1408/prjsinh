/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/identify.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Identify {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {

        const component = document.createElement("div");

        component.className = "component identify-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                     ${step.question || (step.data && step.data.question) || ""}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderContent(step)}

            ${this.renderOptions(step)}

            ${this.renderAction()}

        `;

        this.bind(component, step);

        return component;

    }

    /**
     * ======================================================
     * CONTENT
     * ======================================================
     */

    static renderContent(step) {

        if (!step.content)
            return "";

        return `

            <div class="identify-content">

                ${step.content}

            </div>

        `;

    }

    /**
     * ======================================================
     * OPTIONS
     * ======================================================
     */

    static renderOptions(step) {
        const options = step.options || (step.data && step.data.options);

        if (!options)
            return "";

        return `

            <div class="identify-options">

                ${options.map((option, index) => `

                    <div
                        class="identify-option"
                        data-value="${option.value ?? option.id ?? option}">

                        <span class="option-label">

                            ${String.fromCharCode(65 + index)}.

                        </span>

                        <span class="option-text">

                            ${option.text ?? option}

                        </span>

                    </div>

                `).join("")}

            </div>

        `;

    }

    /**
     * ======================================================
     * ACTION
     * ======================================================
     */

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    type="button"
                    id="btn-clear-choice"
                    class="btn">

                    Chọn lại

                </button>

            </div>

        `;

    }

    /**
     * ======================================================
     * EVENT
     * ======================================================
     */

    static bind(component, step) {
        const options = component.querySelectorAll(".identify-option");
        const data = step?.data || step || {};
        const validateMode = step?.validateMode || data.validateMode;
        const answer = data.answer;
        const feedback = data.feedback || {};

        let feedbackContainer = component.querySelector('.identify-feedback');
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'identify-feedback';
            feedbackContainer.style.cssText = 'margin-top: 20px; padding: 15px; border-radius: 8px; display: none; line-height: 1.6;';
            const toolbar = component.querySelector('.component-toolbar');
            if (toolbar) {
                toolbar.parentNode.insertBefore(feedbackContainer, toolbar);
            } else {
                component.appendChild(feedbackContainer);
            }
        }

        options.forEach(option => {
            option.addEventListener("click", () => {
                if (component.classList.contains('locked')) return;

                options.forEach(item => {
                    item.classList.remove("selected");
                    item.style.borderColor = "";
                    item.style.backgroundColor = "";
                });

                option.classList.add("selected");

                if (validateMode === "oneByOne") {
                    const value = option.dataset.value;
                    const isCorrect = value === answer;

                    feedbackContainer.style.display = 'block';

                    if (isCorrect) {
                        option.style.borderColor = "#22c55e";
                        option.style.backgroundColor = "#f0fdf4";
                        feedbackContainer.style.backgroundColor = '#f0fdf4';
                        feedbackContainer.style.border = '1px solid #bbf7d0';
                        feedbackContainer.style.color = '#166534';
                        feedbackContainer.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 5px;">✨ Chính xác!</div>
                            <div>${feedback.correct || 'Bạn đã trả lời đúng.'}</div>
                        `;
                    } else {
                        option.style.borderColor = "#2563eb";
                        option.style.backgroundColor = "#fff1f2";
                        feedbackContainer.style.backgroundColor = '#fff1f2';
                        feedbackContainer.style.border = '1px solid #fecdd3';
                        feedbackContainer.style.color = '#000000';
                        
                        let incorrectText = feedback.incorrect || 'Chưa chính xác. Vui lòng thử lại.';
                        let firstSentence = incorrectText;
                        let remainingText = '';
                        
                        const splitIndex = incorrectText.indexOf('.');
                        if (splitIndex !== -1) {
                            firstSentence = incorrectText.substring(0, splitIndex + 1);
                            remainingText = incorrectText.substring(splitIndex + 1).trim();
                        }

                        feedbackContainer.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.2em;">🔎</span> ${firstSentence}
                            </div>
                            <div style="color: #334155;">${remainingText}</div>
                        `;
                    }
                }
            });
        });

        component.querySelector("#btn-clear-choice")?.addEventListener("click", () => {
            if (component.classList.contains('locked')) return;
            options.forEach(item => {
                item.classList.remove("selected");
                item.style.borderColor = "";
                item.style.backgroundColor = "";
            });
            if (feedbackContainer) {
                feedbackContainer.style.display = 'none';
            }
        });
    }

    static validator = getValidator("choiceValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Identify;