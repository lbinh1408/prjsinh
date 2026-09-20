/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/explain.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Explain {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {

        const component = document.createElement("div");

        component.className = "component explain-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                     ${step.question || (step.data && step.data.question) || ""}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderContent(step)}

            ${this.renderTextarea(step)}

            ${this.renderSampleAnswers(step)}

            ${this.renderAction()}

        `;

        this.bind(component);

        return component;

    }

    /**
     * ======================================================
     * CONTENT
     * ======================================================
     */

    static renderContent(step) {
        const data = step.data || step;
        if (!data.content)
            return "";

        let htmlContent = "";
        if (Array.isArray(data.content)) {
            htmlContent = data.content.map(p => `<p style="margin-bottom:15px;">${p}</p>`).join("");
        } else if (typeof data.content === 'object' && data.content.text) {
            htmlContent = `<p>${data.content.text}</p>`;
        } else {
            htmlContent = data.content;
        }

        const isReadingLayout = data.ui && data.ui.layout === 'reading';
        const wrapperStyle = isReadingLayout 
            ? "font-size: 1.1rem; line-height: 1.7; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;" 
            : "";
        const titleHtml = isReadingLayout && data.title 
            ? `<h3 style="text-align:center; margin-bottom:20px; color:#1e293b;">${data.title}</h3>` 
            : "";

        return `
            <div class="explain-content" style="${wrapperStyle}">
                ${titleHtml}
                ${htmlContent}
            </div>
        `;
    }

    /**
     * ======================================================
     * TEXTAREA
     * ======================================================
     */

    static renderTextarea(step) {
        const data = step.data || step;

        return `

            <div class="explain-answer">

                <textarea
                    id="explain-answer"
                    placeholder="${data.placeholder || "Hãy giải thích theo suy nghĩ của em..."}"
                ></textarea>

                <div class="answer-info">

                    <span id="word-counter">

                        0 từ

                    </span>

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * SAMPLE ANSWERS
     * ======================================================
     */

    static renderSampleAnswers(step) {
        const data = step.data || step;
        if (!data.sampleAnswer || !Array.isArray(data.sampleAnswer)) {
            return "";
        }

        const answersHtml = data.sampleAnswer.map(ans => 
            `<div class="sample-answer-item" data-text="${ans.trim()}">${ans.trim()}</div>`
        ).join("");

        return `
            <div class="sample-answers-container" style="margin-top: 15px;">
                <p class="sample-answers-title" style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Gợi ý trả lời (nhấn để chọn):</p>
                <div class="sample-answers-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${answersHtml}
                </div>
            </div>
            <style>
                .sample-answer-item {
                    background-color: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 14px;
                    color: #334155;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .sample-answer-item:hover {
                    background-color: #e2e8f0;
                    border-color: #cbd5e1;
                }
            </style>
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
                    id="btn-clear-text"
                    class="btn">

                    Xóa

                </button>

            </div>

        `;

    }

    /**
     * ======================================================
     * EVENTS
     * ======================================================
     */

    static bind(component) {

        const textarea =

            component.querySelector(

                "#explain-answer"

            );

        const counter =

            component.querySelector(

                "#word-counter"

            );

        textarea.addEventListener(

            "input",

            () => {

                const words =

                    textarea.value

                        .trim()

                        .split(/\s+/)

                        .filter(Boolean)

                        .length;

                counter.textContent =

                    `${words} từ`;

            }

        );

        component

            .querySelector(

                "#btn-clear-text"

            )

            ?.addEventListener(

                "click",

                () => {

                    textarea.value = "";

                    counter.textContent = "0 từ";

                    textarea.focus();

                }

            );

        const sampleItems = component.querySelectorAll(".sample-answer-item");
        sampleItems.forEach(item => {
            item.addEventListener("click", () => {
                textarea.value = item.getAttribute("data-text");
                textarea.dispatchEvent(new Event("input"));
                textarea.focus();
            });
        });

    }

    static validator = getValidator("textValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Explain;