/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/flashcard.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Flashcard {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component flashcard-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                    ${step.question || (step.data && step.data.question) || "Hãy lật thẻ để xem nội dung chi tiết."}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderCards(step)}

            ${this.renderAction()}

        `;

        this.bind(component);

        return component;

    }

    static renderCards(step) {
        const data = step.data || step;

        // Support single card via step.front/back OR multi-card via step.cards[]
        let cards = data.cards || step.cards;
        if (!cards && data.front !== undefined) {
            cards = [{ id: 0, front: data.front, back: data.back }];
        } else if (!cards && step.front !== undefined) {
            cards = [{ id: 0, front: step.front, back: step.back }];
        }

        if (!cards) return "";

        return `

            <div class="flashcards-container">

                ${cards.map((card, index) => `

                    <div class="flashcard" data-card-id="${card.id ?? index}">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                ${card.front ?? "Mặt trước"}
                            </div>
                            <div class="flashcard-back">
                                ${card.back ?? "Mặt sau"}
                            </div>
                        </div>
                    </div>

                `).join("")}

            </div>

        `;

    }

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    id="btn-clear-flashcard"
                    class="btn">

                    Lật lại tất cả

                </button>

            </div>

        `;

    }

    static bind(component) {

        const cards = component.querySelectorAll(".flashcard");

        cards.forEach(card => {
            card.addEventListener("click", () => {
                card.classList.toggle("flipped");
            });
        });

        component
            .querySelector("#btn-clear-flashcard")
            ?.addEventListener("click", () => {
                cards.forEach(card => {
                    card.classList.remove("flipped");
                });
            });

    }

    static validator = getValidator("observe");

    static getValidator() {
        return this.validator;
    }


}

export default Flashcard;
