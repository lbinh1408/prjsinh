/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/choice.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import ChoiceBuilder from "./layouts/ChoiceBuilder.js";

class Choice {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component choice-component";

        const data = step.data || step;
        const titleText = data.prompt || data.title || "";
        const questionText = data.question || step.question || step.instruction || "";
        const textContent = typeof data.content === 'string' ? data.content : (data.text || "");
        const format = data.format || "sentence";
        const formatStyle = (format === "essay" || format === "paragraph") ? "text-indent: 80px;" : "";

        let questionHtml = "";
        if (questionText) {
            if (typeof questionText === 'object' && questionText.left && questionText.right) {
                questionHtml = `
                    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                        <div style="flex: 1; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #475569;">Đoạn A</div>
                            <div style="line-height: 1.6; color: #334155; font-size: 1.05em;">${questionText.left}</div>
                        </div>
                        <div style="flex: 1; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #475569;">Đoạn B</div>
                            <div style="line-height: 1.6; color: #334155; font-size: 1.05em;">${questionText.right}</div>
                        </div>
                    </div>
                `;
            } else if (typeof questionText === 'string') {
                questionHtml = `<h3 class="question-subtitle" style="margin-bottom: 15px; font-weight: normal; color: #475569;">${questionText}</h3>`;
            }
        }

        component.innerHTML = `

            <div class="component-header">

                ${titleText ? `<h2 class="question-title" style="margin-bottom: 15px;">${titleText}</h2>` : ""}
                ${questionHtml}

                ${textContent ? `
                <div class="choice-content format-${format}" style="padding: 15px; background: #f8fafc; border-radius: 4px; margin-bottom: 20px; font-size: 1.1em; line-height: 1.6; color: #334155; ${formatStyle}">
                    ${textContent}
                </div>
                ` : ""}

            </div>

            ${this.renderOptions(step)}

            ${this.renderAction()}

        `;

        this.bind(component, step);

        return component;

    }

    static renderOptions(step) {
        const data = step.data || step;
        const content = data.content || data;
        const options = content.choices || content.options || data.choices || data.options || step.choices || step.options || [];
        
        return ChoiceBuilder.render(options);
    }

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    type="button"
                    id="btn-clear-choice"
                    class="btn">

                    Chọn lại

                </button>
                
                <button
                    type="button"
                    id="btn-next-step"
                    class="btn primary"
                    style="display: none;">

                    Tiếp tục →

                </button>

            </div>

        `;

    }

    static bind(component, step) {
        let feedbackContainer = component.querySelector('.choice-feedback');

        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'choice-feedback';
            feedbackContainer.style.cssText = 'margin-top: 20px; padding: 15px; border-radius: 12px; font-weight: bold; display: none; text-align: center;';
            const toolbar = component.querySelector('.component-toolbar');
            if (toolbar) {
                toolbar.parentNode.insertBefore(feedbackContainer, toolbar);
            } else {
                component.appendChild(feedbackContainer);
            }
        }

        ChoiceBuilder.bind(component);

        const btnClear = component.querySelector("#btn-clear-choice");
        if (btnClear) {
            btnClear.addEventListener("click", () => {
                if (component.classList.contains('locked')) return;
                ChoiceBuilder.clearSelection(component);
            });
        };

        component.querySelector("#btn-next-step")?.addEventListener("click", () => {
            if (window.engine) window.engine.next();
        });
    }

    static validator = getValidator("choiceValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Choice;
