/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/fillBlank.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class FillBlank {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {

        const component = document.createElement("div");

        component.className = "component fillblank-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                    ${step.question || ""}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderSentence(step)}

            ${this.renderWordBank(step)}

            ${this.renderAction()}

        `;

        this.bind(component);

        return component;

    }

    /**
     * ======================================================
     * SENTENCE
     * ======================================================
     */

    static renderSentence(step) {

        const template = step.template || step.sentence;
        if (!template)
            return "";

        let index = 0;

        const html = template.replace(
            /\[\]|_{3,}/g,
            () => `
                <input
                    class="blank-input"
                    data-index="${index++}"
                    type="text"
                    autocomplete="off">
            `
        );

        return `

            <div class="fillblank-sentence">

                ${html}

            </div>

        `;

    }

    /**
     * ======================================================
     * WORD BANK
     * ======================================================
     */

    static renderWordBank(step) {

        if (

            !step.words ||

            step.words.length === 0

        ) {

            return "";

        }

        return `

            <div class="word-bank">

                <div class="word-bank-title">

                    Gợi ý từ

                </div>

                <div class="word-list">

                    ${step.words.map(word => `

                        <button
                            class="word-item"
                            type="button">

                            ${word}

                        </button>

                    `).join("")}

                </div>

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
                    id="btn-clear-blank"
                    class="btn">

                    Xóa đáp án

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

        const blanks =

            component.querySelectorAll(

                ".blank-input"

            );

        let current = 0;

        blanks.forEach((input, index) => {

            input.addEventListener(

                "focus",

                () => {

                    current = index;

                }

            );

        });

        component

            .querySelectorAll(

                ".word-item"

            )

            .forEach(word => {

                word.addEventListener(

                    "click",

                    () => {

                        if (blanks[current]) {

                            blanks[current].value =

                                word.textContent.trim();

                            blanks[current].focus();

                        }

                    }

                );

            });

        component

            .querySelector(

                "#btn-clear-blank"

            )

            ?.addEventListener(

                "click",

                () => {

                    blanks.forEach(

                        input => input.value = ""

                    );

                    blanks[0]?.focus();

                }

            );

    }

    static validator = getValidator("blankValidator");

    static getValidator() {
        return this.validator;
    }


}

export default FillBlank;