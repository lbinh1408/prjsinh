/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/definition.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Definition {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {

        const component = document.createElement("div");

        component.className = "component definition-component";

        // Inject the CSS specifically for the cards layout
        const styleHtml = `
            <style>
                .definition-component {
                    --card-bg: #ffffff;
                    --text-main: #1e293b;
                    --common-noun: #16a34a;
                    --proper-noun: #0284c7;
                    --abstract-noun: #9333ea;
                    --border-radius: 12px;
                }
                .definition-component .cards-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                    margin-bottom: 24px;
                    margin-top: 20px;
                }
                .definition-component .def-card {
                    background: var(--card-bg);
                    border-radius: var(--border-radius);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .definition-component .def-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                }
                .definition-component .def-card-header {
                    padding: 18px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    background-color: #ffffff;
                    font-weight: 600;
                    font-size: 18px;
                    color: #0f172a;
                }
                .definition-component .def-card-header span.icon-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .definition-component .arrow-icon {
                    transition: transform 0.3s ease;
                    color: #94a3b8;
                }
                .definition-component .def-card.active .arrow-icon {
                    transform: rotate(180deg);
                }
                .definition-component .def-card-body {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
                    padding: 0 20px;
                    background-color: #fafafa;
                    border-top: 1px solid transparent;
                    color: var(--text-main);
                }
                .definition-component .def-card.active .def-card-body {
                    max-height: 1000px;
                    padding: 20px;
                    border-top-color: #e2e8f0;
                }
                /* Tags */
                .definition-component .tag-common {
                    color: var(--common-noun);
                    font-weight: 600;
                    background: #f0fdf4;
                    padding: 2px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                .definition-component .tag-proper {
                    color: var(--proper-noun);
                    font-weight: 600;
                    background: #f0f9ff;
                    padding: 2px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                .definition-component .tag-concrete {
                    color: #0f172a;
                    font-weight: 600;
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                .definition-component .tag-abstract {
                    color: var(--abstract-noun);
                    font-weight: 600;
                    background: #faf5ff;
                    padding: 2px 8px;
                    border-radius: 6px;
                    display: inline-block;
                }
                /* Example Grid */
                .definition-component .example-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 10px;
                    margin-top: 12px;
                }
                .definition-component .example-item {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 16px;
                }
                .definition-component .example-item .emoji {
                    font-size: 24px;
                    display: block;
                    margin-bottom: 4px;
                }
                /* Custom Layout for Text + Examples */
                .definition-component .def-custom-card { margin-bottom: 24px; font-family: 'Inter', sans-serif; }
                .definition-component .def-top-box { background: #f4f5fc; border: 1px solid #e6e8f4; border-radius: 12px; padding: 24px; margin-bottom: 20px; font-size: 16px; color: #334155; line-height: 1.6; }
                .definition-component .def-top-box b { color: #5648d4; font-size: 22px; display: block; margin-bottom: 8px; }
                .definition-component .def-top-box br { display: none; }
                .definition-component .def-example-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .definition-component .def-example-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
                .definition-component .def-example-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; color: #1e293b; margin-bottom: 12px; }
                .definition-component .def-example-word { color: #475569; font-size: 16px; }
                .definition-component .def-note-box { background: #fef9c3; border: 1px solid #fef08a; border-radius: 12px; padding: 20px; color: #422006; font-size: 16px; line-height: 1.6; }
            </style>
        `;

        component.innerHTML = `
            ${styleHtml}
            <div class="component-header">
                <h2 class="question-title">
                    ${(step.data && step.data.instruction) || step.instruction || ""}
                </h2>
            </div>
            ${this.renderContent(step)}
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
        const contents = data.contents || step.contents;
        const content = data.content || step.content;

        // Handle the new 'contents' array with cards layout
        if (contents && Array.isArray(contents)) {
            let cardsHtml = contents.map(card => this.renderCard(card)).join("");

            return `
                <div class="cards-grid">
                    ${cardsHtml}
                </div>
            `;
        }

        // Fallback for old 'content' structure
        if (content) {
            let contentHtml = "";
            if (Array.isArray(content)) {
                contentHtml = content.map(p => p ? `<p>${p}</p>` : "<br/>").join("");
            } else {
                contentHtml = `<p>${content}</p>`;
            }

            return `
                <div class="definition-content observe-content">
                    ${contentHtml}
                </div>
            `;
        }

        return "";
    }

    static renderCard(card) {
        // Custom layout for cards with top-level text and examples (e.g., card-1)
        if (card.text && card.content && card.content.examples) {
            let examplesHtml = card.content.examples.map(ex => `
                <div class="def-example-card">
                    <div class="def-example-header">
                        <span class="def-example-emoji">${ex.emoji}</span>
                        <span>${ex.category}</span>
                    </div>
                    <div class="def-example-word">${ex.word}</div>
                </div>
            `).join("");

            let noteHtml = card.content.note ? `
                <div class="def-note-box">
                    ${card.content.note}
                </div>
            ` : "";

            return `
                <div class="def-custom-card" id="${card.id}">
                    <div class="def-top-box">
                        ${card.text}
                    </div>
                    <div class="def-example-grid">
                        ${examplesHtml}
                    </div>
                    ${noteHtml}
                </div>
            `;
        }

        const isActive = card.active ? "active" : "";
        let bodyHtml = "";

        if (card.content) {
            // Case 1: text & examples (card-1)
            if (card.content.text && card.content.examples) {
                bodyHtml += `<p>${card.content.text}</p>`;
                let examplesHtml = card.content.examples.map(ex => `
                    <div class="example-item">
                        <span class="emoji">${ex.emoji}</span>${ex.category}<br>
                        <i>(${ex.word})</i>
                    </div>
                `).join("");
                bodyHtml += `<div class="example-grid">${examplesHtml}</div>`;
            }
            // Case 2: items array (card-2, card-3)
            else if (card.content.items) {
                bodyHtml += card.content.items.map((item, index) => {
                    const tagClass = item.type ? `tag-${item.type}` : "tag-concrete";
                    const defHtml = `<p><span class="${tagClass}">${item.label}:</span> ${item.definition} <br>👉 <em>Ví dụ: ${item.examples.join(", ")}...</em></p>`;
                    const separator = index < card.content.items.length - 1 ? '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;">' : '';
                    return defHtml + separator;
                }).join("");
            }
            // Case 3: combination & roles (card-4)
            else if (card.content.combination) {
                bodyHtml += ` <p><strong>Khả năng kết hợp:</strong> ${card.content.combination.description}</p>
                <p>👉 <em>Ví dụ: ${card.content.combination.examples.join(", ")}...</em></p>
                `;
            } else if (card.content.roles) {
                bodyHtml += `
                    <p><strong>Vai trò trong câu:</strong> Thường làm <strong>${card.content.roles.join(", ")}</strong>.</p>
                `;
            }
        }

        return `
            <div class="def-card ${isActive}" id="${card.id}">
                <div class="def-card-header" data-card-id="${card.id}">
                    <span class="icon-title">${card.icon || ''} ${card.title}</span>
                    <span class="arrow-icon">▼</span>
                </div>
                <div class="def-card-body">
                    ${bodyHtml}
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
                    id="definition-done"
                    class="btn btn-primary">

                    Đã hiểu

                </button>

            </div>

        `;

    }

    /**
     * ======================================================
     * EVENT
     * ======================================================
     */

    static bind(component) {

        // Accordion functionality for cards
        const cardHeaders = component.querySelectorAll(".def-card-header");
        const allCards = component.querySelectorAll(".def-card");

        cardHeaders.forEach(header => {
            header.addEventListener("click", () => {
                const cardId = header.getAttribute("data-card-id");
                const card = component.querySelector(`#${cardId}`);

                if (card) {
                    const isCurrentlyActive = card.classList.contains("active");

                    // Close all cards
                    allCards.forEach(c => c.classList.remove("active"));

                    // Open the clicked card if it was not already open
                    if (!isCurrentlyActive) {
                        card.classList.add("active");
                    }
                }
            });
        });

        // "Đã hiểu" button
        component
            .querySelector("#definition-done")
            ?.addEventListener(
                "click",
                () => {
                    component.dataset.completed = "true";
                    const btnNext = document.getElementById("btn-next");
                    if (btnNext) btnNext.click();
                }
            );

    }

    static validator = getValidator("definition");

    static getValidator() {
        return this.validator;
    }

}

export default Definition;
