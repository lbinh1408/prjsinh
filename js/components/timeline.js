/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/timeline.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Timeline {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component timeline-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                    ${step.question || step.instruction || "Hãy sắp xếp các sự kiện theo trình tự thời gian."}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderTimeline(step)}

            ${this.renderAction()}

        `;

        this.bind(component);

        return component;

    }

    static renderTimeline(step) {

        if (!step.events)
            return "";

        // Give them an initial sequential order
        const events = step.events.map((evt, index) => ({
            id: evt.id ?? index,
            text: evt.label ?? evt.text ?? evt
        }));

        return `

            <div class="timeline-container">

                ${events.map((evt, index) => `

                    <div class="timeline-event" data-event-id="${evt.id}">
                        <div class="timeline-controls">
                            <button class="btn-timeline-up" aria-label="Lên trên">▲</button>
                            <button class="btn-timeline-down" aria-label="Xuống dưới">▼</button>
                        </div>
                        <div class="timeline-content">
                            ${evt.text}
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
                    id="btn-clear-timeline"
                    class="btn">

                    Sắp xếp lại

                </button>

            </div>

        `;

    }

    static bind(component) {

        const container = component.querySelector(".timeline-container");

        // Setup initial order backup for reset
        let initialOrder = [];
        if (container) {
            initialOrder = Array.from(container.children);
        }

        component.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-timeline-up")) {
                const eventNode = e.target.closest(".timeline-event");
                if (eventNode.previousElementSibling) {
                    container.insertBefore(eventNode, eventNode.previousElementSibling);
                }
            }
            if (e.target.classList.contains("btn-timeline-down")) {
                const eventNode = e.target.closest(".timeline-event");
                if (eventNode.nextElementSibling) {
                    container.insertBefore(eventNode, eventNode.nextElementSibling.nextElementSibling);
                }
            }
        });

        component
            .querySelector("#btn-clear-timeline")
            ?.addEventListener("click", () => {
                initialOrder.forEach(node => {
                    container.appendChild(node);
                });
            });

    }

    static validator = getValidator("orderValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Timeline;
