/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/matching.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Matching {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component matching-component";

        const data = step.data || step;
        const questionText = data.question || step.question || step.instruction || "";
        const textContent = typeof data.content === 'string' ? data.content : (data.text || "");
        const format = data.format || "sentence";
        const formatStyle = (format === "essay" || format === "paragraph") ? "text-indent: 30px;" : "";

        component.innerHTML = `

            <div class="component-header">

                ${questionText ? `<h2 class="question-title" style="margin-bottom: 15px;">${questionText}</h2>` : ""}

                ${textContent ? `
                <div class="matching-content format-${format}" style="padding: 15px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 20px; font-size: 1.1em; line-height: 1.6; color: #334155; ${formatStyle}">
                    ${textContent}
                </div>
                ` : ""}

            </div>

            ${this.renderPairs(step)}

            ${this.renderAction()}

        `;

        this.bind(component, step);

        return component;

    }

    static renderPairs(step) {
        const data = step.data || step;
        const pairs = data.pairs || data.left || step.pairs || step.left || [];
        const optionsData = data.options || data.right || step.options || step.right || [];

        if (!pairs.length || !optionsData.length)
            return "";

        return `
            <div class="matching-pairs" id="matching-container">
                <svg class="matching-lines-svg" id="matching-svg"></svg>
                <div class="matching-column left-column">
                    ${pairs.map((pair) => {
                        const prompt = pair.prompt ?? pair;
                        const id = pair.id ?? pair;
                        return `<div class="matching-item prompt-item" data-id="${id}" data-type="left">${prompt}</div>`;
                    }).join("")}
                </div>
                <div class="matching-column right-column">
                    ${optionsData.map((opt) => {
                        const value = opt.value ?? opt.id ?? opt;
                        const text = opt.text ?? opt;
                        return `<div class="matching-item option-item" data-value="${value}" data-type="right">${text}</div>`;
                    }).join("")}
                </div>
            </div>
        `;

    }

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    type="button"
                    id="btn-clear-matching"
                    class="btn">

                    Xóa chọn

                </button>

            </div>

        `;

    }

    static bind(component, step) {
        
        const container = component.querySelector("#matching-container");
        const svg = component.querySelector("#matching-svg");
        const leftItems = component.querySelectorAll(".prompt-item");
        const rightItems = component.querySelectorAll(".option-item");
        const clearBtn = component.querySelector("#btn-clear-matching");
        
        const data = step?.data || step || {};
        const validateMode = step?.validateMode || data.validateMode;
        const answer = data.answer || {};
        const feedback = data.feedback || {};
        
        let feedbackContainer = component.querySelector('.matching-feedback');
        if (!feedbackContainer) {
            feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'matching-feedback';
            feedbackContainer.style.cssText = 'margin-top: 20px; padding: 15px; border-radius: 8px; display: none; line-height: 1.6;';
            const toolbar = component.querySelector('.component-toolbar');
            if (toolbar) {
                toolbar.parentNode.insertBefore(feedbackContainer, toolbar);
            } else {
                component.appendChild(feedbackContainer);
            }
        }
        
        let selectedLeft = null;
        
        const drawAllLines = () => {
            if(!svg) return;
            svg.innerHTML = "";
            
            leftItems.forEach(leftItem => {
                leftItem.style.borderColor = "";
                leftItem.style.backgroundColor = "";
                
                const matchValue = leftItem.dataset.match;
                if(matchValue) {
                    const rightItem = Array.from(rightItems).find(r => r.dataset.value === matchValue);
                    if(rightItem) {
                        const id = leftItem.dataset.id;
                        let isCorrect = null;
                        
                        if (validateMode === "oneByOne") {
                            isCorrect = (answer[id] === matchValue);
                            if (isCorrect) {
                                leftItem.style.borderColor = "#22c55e";
                                leftItem.style.backgroundColor = "#f0fdf4";
                            } else {
                                leftItem.style.borderColor = "#ef4444";
                                leftItem.style.backgroundColor = "#fef2f2";
                            }
                        }
                        
                        drawLine(leftItem, rightItem, isCorrect);
                        leftItem.classList.add("matched");
                        rightItem.classList.add("matched");
                    }
                } else {
                    leftItem.classList.remove("matched");
                }
            });
            
            rightItems.forEach(rightItem => {
                const isMatched = Array.from(leftItems).some(l => l.dataset.match === rightItem.dataset.value);
                if(isMatched) {
                    rightItem.classList.add("matched");
                } else {
                    rightItem.classList.remove("matched");
                }
            });
        };
        
        const drawLine = (el1, el2, isCorrect) => {
            const containerRect = container.getBoundingClientRect();
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();
            
            const x1 = rect1.right - containerRect.left;
            const y1 = rect1.top + rect1.height / 2 - containerRect.top;
            
            const x2 = rect2.left - containerRect.left;
            const y2 = rect2.top + rect2.height / 2 - containerRect.top;
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            
            if (isCorrect === true) {
                line.style.stroke = "#22c55e";
                line.style.strokeWidth = "3px";
            } else if (isCorrect === false) {
                line.style.stroke = "#ef4444";
                line.style.strokeWidth = "3px";
                line.style.strokeDasharray = "5,5";
            }
            
            svg.appendChild(line);
        };
        
        const evaluateFeedback = (lastMatchIsCorrect) => {
            if (validateMode !== "oneByOne") return;
            
            const totalMatches = Object.keys(answer).length;
            const correctCount = Array.from(leftItems).filter(item => {
                const id = item.dataset.id;
                const match = item.dataset.match;
                return match && answer[id] === match;
            }).length;
            
            const matchedCount = Array.from(leftItems).filter(item => item.dataset.match).length;
            
            feedbackContainer.style.display = 'block';
            
            if (correctCount === totalMatches) {
                feedbackContainer.style.backgroundColor = '#f0fdf4';
                feedbackContainer.style.border = '1px solid #bbf7d0';
                feedbackContainer.style.color = '#166534';
                feedbackContainer.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px;">✨ Hoàn thành! (${correctCount}/${totalMatches})</div>
                    <div>${feedback.correct || 'Bạn đã ghép đúng tất cả các cặp!'}</div>
                `;
            } else if (matchedCount === totalMatches && correctCount < totalMatches) {
                feedbackContainer.style.backgroundColor = '#fff1f2';
                feedbackContainer.style.border = '1px solid #fecdd3';
                feedbackContainer.style.color = '#000000';
                feedbackContainer.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 5px; color: #b45309;">⚠️ Gần đúng! (${correctCount}/${totalMatches})</div>
                    <div>Bạn đã nối xong nhưng vẫn có cặp bị sai. Hãy sửa lại những đường nét đứt màu đỏ nhé!</div>
                `;
            } else {
                if (lastMatchIsCorrect) {
                    feedbackContainer.style.backgroundColor = '#f0fdf4';
                    feedbackContainer.style.border = '1px solid #bbf7d0';
                    feedbackContainer.style.color = '#166534';
                    feedbackContainer.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 5px;">✨ Chính xác! (${correctCount}/${totalMatches})</div>
                        <div>${feedback.partial || feedback.correct || 'Bạn đã nối đúng cặp này!'}</div>
                    `;
                } else {
                    feedbackContainer.style.backgroundColor = '#fff1f2';
                    feedbackContainer.style.border = '1px solid #fecdd3';
                    feedbackContainer.style.color = '#000000';
                    
                    let incorrectText = feedback.incorrect || 'Chưa đúng rồi. Bạn hãy thử lại nhé!';
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
        };
        
        leftItems.forEach(item => {
            item.addEventListener("click", () => {
                if(item.dataset.match) {
                    delete item.dataset.match;
                    drawAllLines();
                    if (validateMode === "oneByOne") {
                        feedbackContainer.style.display = 'none';
                    }
                }
                
                leftItems.forEach(i => i.classList.remove("selected"));
                item.classList.add("selected");
                selectedLeft = item;
            });
        });
        
        rightItems.forEach(item => {
            item.addEventListener("click", () => {
                if(selectedLeft) {
                    const id = selectedLeft.dataset.id;
                    const matchValue = item.dataset.value;
                    selectedLeft.dataset.match = matchValue;
                    selectedLeft.classList.remove("selected");
                    selectedLeft = null;
                    drawAllLines();
                    
                    if (validateMode === "oneByOne") {
                        const isCorrect = (answer[id] === matchValue);
                        evaluateFeedback(isCorrect);
                    }
                }
            });
        });
        
        clearBtn?.addEventListener("click", () => {
            leftItems.forEach(item => {
                delete item.dataset.match;
                item.classList.remove("selected", "matched");
                item.style.borderColor = "";
                item.style.backgroundColor = "";
            });
            rightItems.forEach(item => {
                item.classList.remove("selected", "matched");
            });
            selectedLeft = null;
            if (feedbackContainer) feedbackContainer.style.display = 'none';
            drawAllLines();
        });
        
        window.addEventListener("resize", drawAllLines);
        
        component.drawAllLines = drawAllLines;
        
        // Timeout to ensure DOM is rendered before calculating bounding box
        setTimeout(drawAllLines, 100);
    }

    static validator = getValidator("matchValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Matching;
