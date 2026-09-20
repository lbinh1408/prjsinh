/**
 * ==========================================================
 * TS10 Learning Platform
 * components/multiChoice.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class MultiChoice {

    static render(step) {
        const component = document.createElement("div");
        component.className = "component multichoice-component";

        const data = step.data || step;
        const titleText = data.title || "";
        const instructionText = data.instruction || "";
        const questionText = data.question || "";
        const options = data.options || [];

        component.innerHTML = `
            <div class="component-header">
              
                ${instructionText ? `<div style="font-weight: bold; margin-bottom: 15px; font-size: 1.1em; color: #1e293b;">${instructionText}</div>` : ""}
                ${questionText ? `<div style="color: #64748b; margin-bottom: 20px;">${questionText}</div>` : ""}
            </div>

            <div class="multichoice-options" style="display: flex; flex-direction: column; gap: 10px;">
                ${options.map((opt, index) => `
                    <div class="multichoice-option" data-value="${opt}" style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        ${opt}
                    </div>
                `).join("")}
            </div>

            <div class="component-toolbar" style="margin-top: 20px;">
                <button type="button" id="btn-clear-choice" class="btn">Chọn lại</button>
            </div>
        `;

        this.bind(component, step);

        return component;
    }

    static bind(component, step) {
        const options = component.querySelectorAll(".multichoice-option");
        const data = step?.data || step || {};
        const validateMode = step?.validateMode || data.validateMode;
        const answer = data.answer || [];
        const feedback = data.feedback || {};

        let feedbackContainer = component.querySelector('.multichoice-feedback');
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'multichoice-feedback';
            feedbackContainer.style.cssText = 'margin-top: 20px; padding: 15px; border-radius: 8px; display: none; line-height: 1.6;';
            const toolbar = component.querySelector('.component-toolbar');
            if (toolbar) {
                toolbar.parentNode.insertBefore(feedbackContainer, toolbar);
            } else {
                component.appendChild(feedbackContainer);
            }
        }

        let selectedItems = new Set();

        const checkCompletion = () => {
            const allCorrectSelected = answer.every(a => selectedItems.has(a));
            const noIncorrectSelected = Array.from(selectedItems).every(a => answer.includes(a));
            return allCorrectSelected && noIncorrectSelected;
        };

        options.forEach(option => {
            option.addEventListener("click", () => {
                if (component.classList.contains('locked')) return;

                const value = option.dataset.value;
                const isCorrect = answer.includes(value);

                if (validateMode === "oneByOne") {
                    if (selectedItems.has(value)) {
                        selectedItems.delete(value);
                        option.style.borderColor = "#e2e8f0";
                        option.style.backgroundColor = "transparent";
                        option.style.color = "inherit";
                    } else {
                        selectedItems.add(value);
                        feedbackContainer.style.display = 'block';

                        if (isCorrect) {
                            option.style.borderColor = "#22c55e";
                            option.style.backgroundColor = "#f0fdf4";
                            option.style.color = "#166534";

                            feedbackContainer.style.backgroundColor = '#f0fdf4';
                            feedbackContainer.style.border = '1px solid #bbf7d0';
                            feedbackContainer.style.color = '#166534';

                            const correctSelectedCount = answer.filter(a => selectedItems.has(a)).length;
                            const totalCorrect = answer.length;

                            if (checkCompletion()) {
                                feedbackContainer.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 5px;">✨ Hoàn thành! (${correctSelectedCount}/${totalCorrect})</div>
                                    <div>${feedback.correct || 'Bạn đã tìm đủ các đáp án đúng.'}</div>
                                `;
                            } else if (correctSelectedCount === totalCorrect) {
                                feedbackContainer.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 5px; color: #b45309;">⚠️ Gần đúng! (${correctSelectedCount}/${totalCorrect})</div>
                                    <div>Bạn đã tìm đủ các danh từ, nhưng có vẻ bạn đã chọn dư một từ sai nào đó. Hãy kiểm tra và bỏ chọn từ sai nhé!</div>
                                `;
                            } else {
                                feedbackContainer.innerHTML = `
                                    <div style="font-weight: bold; margin-bottom: 5px;">✨ Chính xác! (${correctSelectedCount}/${totalCorrect})</div>
                                    <div>${feedback.partial || feedback.correct || 'Bạn đã trả lời đúng.'}</div>
                                `;
                            }
                        } else {
                            option.style.borderColor = "#2563eb";
                            option.style.backgroundColor = "#fff1f2";
                            option.style.color = "#000000";

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
                } else {
                    if (selectedItems.has(value)) {
                        selectedItems.delete(value);
                        option.classList.remove("selected");
                        option.style.borderColor = "#e2e8f0";
                        option.style.backgroundColor = "transparent";
                    } else {
                        selectedItems.add(value);
                        option.classList.add("selected");
                        option.style.borderColor = "#2563eb";
                        option.style.backgroundColor = "#f8fafc";
                    }
                }
            });
        });

        component.querySelector("#btn-clear-choice")?.addEventListener("click", () => {
            if (component.classList.contains('locked')) return;
            selectedItems.clear();
            options.forEach(item => {
                item.classList.remove("selected");
                item.style.borderColor = "#e2e8f0";
                item.style.backgroundColor = "transparent";
                item.style.color = "inherit";
            });
            if (feedbackContainer) {
                feedbackContainer.style.display = 'none';
            }
        });
    }

    static validator = getValidator("multiChoiceValidator") || getValidator("choiceValidator");

    static getValidator() {
        return this.validator;
    }
}

export default MultiChoice;
