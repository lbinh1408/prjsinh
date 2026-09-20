/**
 * ==========================================================
 * TS10 Learning Platform
 * components/multiChoice.js
 * ==========================================================
 */

class MultiQuestion {

    static render(step) {
        const component = document.createElement("div");
        component.className = "component multichoice-component";

        const data = step.data || step;
        const titleText = data.title || "";
        const content = data.content || {};
        const questions = content.questions || [];

        let questionsHtml = "";

        questions.forEach((q, index) => {
            let optionsHtml = "";
            const letters = ["A", "B", "C", "D", "E", "F"];

            q.options.forEach((opt, optIndex) => {
                optionsHtml += `
                    <div class="mc-option" data-question="${index}" data-option="${optIndex}">
                        <div class="mc-option-letter">${letters[optIndex]}</div>
                        <div class="mc-option-text">${opt}</div>
                    </div>
                `;
            });

            questionsHtml += `
                <div class="mc-question-block" data-question-index="${index}">
                    <div class="mc-question-text">
                        <strong>Q${index + 1}.</strong> ${q.question}
                    </div>
                    <div class="mc-options-container">
                        ${optionsHtml}
                    </div>
                    <div class="mc-explanation" id="mc-expl-${index}" style="display: none;">
                        <div class="mc-expl-header">💡 Explication & Justification :</div>
                        <div class="mc-expl-body">${q.explanation || ""}</div>
                    </div>
                </div>
            `;
        });

        component.innerHTML = `
            <style>
                .multichoice-component {
                    font-family: Arial, sans-serif;
                    color: #333;
                }
                .multichoice-component .question-title {
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                    font-weight: bold;
                }
                .mc-question-block {
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #eee;
                }
                .mc-question-block:last-child {
                    border-bottom: none;
                }
                .mc-question-text {
                    font-size: 1.1rem;
                    margin-bottom: 15px;
                }
                .mc-options-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .mc-option {
                    display: flex;
                    align-items: center;
                    background: #f9f9f9;
                    border: 2px solid transparent;
                    border-radius: 8px;
                    padding: 10px 15px;
                    cursor: pointer;
                    flex: 1;
                    min-width: 200px;
                    transition: all 0.2s ease;
                }
                .mc-option:hover:not(.disabled) {
                    background: #f0f0f0;
                }
                .mc-option.disabled {
                    cursor: default;
                    opacity: 0.7;
                }
                .mc-option-letter {
                    background: #e2e8f0;
                    color: #475569;
                    font-weight: bold;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                .mc-option-text {
                    font-size: 0.95rem;
                }

                /* Correct State */
                .mc-option.correct {
                    background: #e6f4ea;
                    border-color: #34a853;
                }
                .mc-option.correct .mc-option-letter {
                    background: #34a853;
                    color: white;
                }

                /* Incorrect State */
                .mc-option.incorrect {
                    background: #fce8e6;
                    border-color: #ea4335;
                }
                .mc-option.incorrect .mc-option-letter {
                    background: #ea4335;
                    color: white;
                }

                .mc-explanation {
                    background: #fff8e1;
                    border-radius: 8px;
                    padding: 15px;
                    margin-top: 15px;
                    font-size: 0.95rem;
                }
                .mc-expl-header {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #b98a00;
                }
                .mc-expl-body {
                    color: #444;
                    line-height: 1.5;
                }

                .component-toolbar {
                    margin-top: 20px;
                    display: flex;
                    gap: 15px;
                }
            </style>
            
            <div class="component-header">
                ${titleText ? `<h2 class="question-title">${titleText}</h2>` : ""}
            </div>

            <div class="mc-questions-wrapper">
                ${questionsHtml}
            </div>

            ${this.renderAction()}
        `;

        this.bind(component, step);

        // Required for answering engine
        component.getValue = () => {
            if (component.dataset.completed === "true") {
                return { completed: true, score: parseInt(component.dataset.score) };
            }
            return null;
        };

        return component;
    }

    static renderAction() {
        return `
            <div class="component-toolbar">
                <button type="button" id="btn-next-step" class="btn primary" style="display: none;">
                    Tiếp tục →
                </button>
            </div>
        `;
    }

    static bind(component, step) {
        const data = step.data || step;
        const questions = (data.content && data.content.questions) ? data.content.questions : [];
        const btnNext = component.querySelector("#btn-next-step");

        let answeredQuestions = 0;
        let isCorrectList = new Array(questions.length).fill(false);

        const options = component.querySelectorAll('.mc-option');

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                if (opt.classList.contains('disabled')) return;

                const qIndex = parseInt(opt.getAttribute('data-question'));
                const optIndex = parseInt(opt.getAttribute('data-option'));
                const questionData = questions[qIndex];
                const expectedIndex = questionData.correct;

                // Disable all options for this question
                const siblings = component.querySelectorAll(`.mc-option[data-question="${qIndex}"]`);
                siblings.forEach(sib => sib.classList.add('disabled'));

                // Check if correct
                if (optIndex === expectedIndex) {
                    opt.classList.add('correct');
                    isCorrectList[qIndex] = true;
                } else {
                    opt.classList.add('incorrect');
                    isCorrectList[qIndex] = false;

                    // Highlight the correct one as well
                    const correctOpt = component.querySelector(`.mc-option[data-question="${qIndex}"][data-option="${expectedIndex}"]`);
                    if (correctOpt) {
                        correctOpt.classList.add('correct');
                    }
                }

                // Show explanation
                const expl = component.querySelector(`#mc-expl-${qIndex}`);
                if (expl && questionData.explanation) {
                    expl.style.display = 'block';
                }

                answeredQuestions++;

                // If all questions are answered, show next button and store state
                if (answeredQuestions === questions.length) {
                    btnNext.style.display = 'inline-block';
                    component.dataset.completed = "true";
                    component.dataset.score = isCorrectList.filter(x => x).length;
                }
            });
        });

        btnNext?.addEventListener("click", () => {
            if (window.engine) {
                window.engine.next();
            }
        });
    }

    static validator = {
        validate: (step, userAnswer) => {
            const data = step.data || step;
            const questions = (data.content && data.content.questions) ? data.content.questions : [];
            const maxScore = questions.length;

            if (userAnswer && userAnswer.completed) {
                return {
                    valid: true,
                    score: userAnswer.score || 0,
                    maxScore: maxScore,
                    message: "Hoàn thành",
                    explanation: ""
                };
            }

            return {
                valid: false,
                score: 0,
                maxScore: maxScore,
                message: "Vui lòng trả lời tất cả các câu hỏi.",
                explanation: ""
            };
        }
    };

    static getValidator() {
        return this.validator;
    }
}

export default MultiQuestion;
