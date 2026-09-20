/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/trueFalse.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class TrueFalse {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component trueFalse-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                    ${step.question || ""}

                </h2>

                <p class="question-text">

                   

                </p>

            </div>

            ${this.renderOptions()}

            ${this.renderAction()}

        `;

        this.bind(component);

        return component;

    }

    static renderOptions() {

        return `

            <div class="choice-options">

                <div
                    class="choice-option trueFalse-option identify-option"
                    data-value="true">

                    <span class="option-label">

                        A.

                    </span>

                    <span class="option-text">

                        Đúng

                    </span>

                </div>

                <div
                    class="choice-option trueFalse-option identify-option"
                    data-value="false">

                    <span class="option-label">

                        B.

                    </span>

                    <span class="option-text">

                        Sai

                    </span>

                </div>

            </div>

        `;

    }

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    id="btn-clear-choice"
                    class="btn">

                    Chọn lại

                </button>

            </div>

        `;

    }

    static bind(component) {

        const options =

            component.querySelectorAll(

                ".trueFalse-option"

            );

        options.forEach(option => {

            option.addEventListener(

                "click",

                () => {

                    options.forEach(item =>

                        item.classList.remove(

                            "selected"

                        )

                    );

                    option.classList.add(

                        "selected"

                    );

                }

            );

        });

        component

            .querySelector(

                "#btn-clear-choice"

            )

            ?.addEventListener(

                "click",

                () => {

                    options.forEach(item =>

                        item.classList.remove(

                            "selected"

                        )

                    );

                }

            );

    }

    static validator = getValidator("trueFalseValidator");

    static getValidator() {
        return this.validator;
    }


}

export default TrueFalse;
