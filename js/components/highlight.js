/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/highlight.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Highlight {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component highlight-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">

                    ${step.question || (step.data && step.data.question) || step.instruction || "Hãy đánh dấu các từ khóa quan trọng."}

                </h2>

                <p class="question-text">

                    

                </p>

            </div>

            ${this.renderText(step)}

            ${this.renderAction()}

        `;

        this.bind(component, step);

        return component;

    }

    static renderText(step) {
        const data = step.data || step;
        const text = data.text || data.content || step.text || step.content || "";
        if (!text) return "";

        let html = text;

        if (html.includes("[[")) {
            let idCounter = 0;
            html = html.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
                const id = idCounter++;
                return `<span class="highlight-word" data-word-id="${id}">${p1}</span>`;
            });
        } else {
            const words = html.split(/([\s.,;?!]+)/);
            html = words.map((chunk, index) => {
                if (/^[\s.,;?!]+$/.test(chunk)) {
                    return `<span class="highlight-sep" data-sep-id="${index}">${chunk}</span>`;
                }
                if (chunk.trim() === "") return chunk;
                return `<span class="highlight-word" data-word-id="${index}">${chunk}</span>`;
            }).join("");
        }

        return `
            <div class="highlight-content">
                ${html}
            </div>
        `;
    }

    static renderAction() {
        return `
            <div class="component-toolbar">

                <button
                    type="button"
                    id="btn-clear-highlight"
                    class="btn">

                    Xóa đánh dấu

                </button>
            </div>
        `;
    }

    static bind(component, step) {
        const words = component.querySelectorAll(".highlight-word");
        const seps = component.querySelectorAll(".highlight-sep");
        let isDragging = false;
        let isSelecting = true;
        let dragCurrentIndex = null;

        const data = step?.data || step || {};
        const validateMode = step?.validateMode || data.validateMode;
        const answer = data.answer || [];
        const feedback = data.feedback || {};

        let feedbackContainer = component.querySelector('.highlight-feedback');
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'highlight-feedback';
            feedbackContainer.style.cssText = 'margin-top: 20px; padding: 15px; border-radius: 8px; display: none; line-height: 1.6;';
            const toolbar = component.querySelector('.component-toolbar');
            if (toolbar) {
                toolbar.parentNode.insertBefore(feedbackContainer, toolbar);
            } else {
                component.appendChild(feedbackContainer);
            }
        }

        const showFeedback = (isCorrect) => {
            feedbackContainer.style.display = 'block';
            if (isCorrect) {
                feedbackContainer.style.backgroundColor = '#f0fdf4';
                feedbackContainer.style.border = '1px solid #bbf7d0';
                feedbackContainer.style.color = '#166534';
                feedbackContainer.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px;">✨ Chính xác!</div>
                    <div>${feedback.correct || 'Bạn đã đánh dấu đúng.'}</div>
                `;
            } else {
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
        };

        const validateWord = (wordEl) => {
            const wordText = wordEl.textContent.trim();
            const isCorrect = answer.includes(wordText);
            
            showFeedback(isCorrect);
            
            if (isCorrect) {
                wordEl.style.backgroundColor = "#f0fdf4";
                wordEl.style.color = "#166534";
            } else {
                wordEl.style.backgroundColor = "#fff1f2";
                wordEl.style.color = "#9f1239";
            }
        };

        const clearWordStyle = (wordEl) => {
            wordEl.style.backgroundColor = "";
            wordEl.style.color = "";
        };

        component.addEventListener('mousedown', (e) => {
            if(e.target.classList.contains('highlight-word') || e.target.classList.contains('highlight-sep')) {
                e.preventDefault();
            }
        });

        words.forEach(word => {
            word.addEventListener("mousedown", () => {
                isDragging = true;
                isSelecting = !word.classList.contains("selected");
                word.classList.toggle("selected", isSelecting);
                dragCurrentIndex = parseInt(word.dataset.wordId);
                
                if (validateMode === "oneByOne") {
                    if (isSelecting) {
                        validateWord(word);
                    } else {
                        clearWordStyle(word);
                        feedbackContainer.style.display = 'none';
                    }
                }
            });
            
            word.addEventListener("mouseenter", () => {
                if (isDragging && dragCurrentIndex !== null) {
                    const newIndex = parseInt(word.dataset.wordId);
                    const min = Math.min(dragCurrentIndex, newIndex);
                    const max = Math.max(dragCurrentIndex, newIndex);
                    
                    for (let i = min; i <= max; i++) {
                        const el = component.querySelector(`[data-word-id="${i}"]`);
                        if (el) {
                            const wasSelected = el.classList.contains("selected");
                            el.classList.toggle("selected", isSelecting);
                            
                            if (validateMode === "oneByOne") {
                                if (isSelecting && !wasSelected) {
                                    validateWord(el);
                                } else if (!isSelecting && wasSelected) {
                                    clearWordStyle(el);
                                }
                            }
                        }
                        const sepEl = component.querySelector(`[data-sep-id="${i}"]`);
                        if (sepEl) {
                            sepEl.classList.toggle("selected", isSelecting);
                        }
                    }
                    dragCurrentIndex = newIndex;
                }
            });
        });

        const container = component.querySelector(".highlight-content");
        if(container) {
            container.addEventListener("mouseup", () => { isDragging = false; });
            container.addEventListener("mouseleave", () => { isDragging = false; });
        }

        component.querySelector("#btn-clear-highlight")?.addEventListener("click", () => {
            words.forEach(word => {
                word.classList.remove("selected");
                clearWordStyle(word);
            });
            seps.forEach(sep => sep.classList.remove("selected"));
            if (feedbackContainer) {
                feedbackContainer.style.display = 'none';
            }
        });
    }

    static validator = getValidator("highlightValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Highlight;
