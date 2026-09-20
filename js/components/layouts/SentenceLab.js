export default class SentenceLab {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component sentence-lab-wrapper";

        const ui = data.ui || {};
        const elements = ui.elements || [];

        let labelText = "SENTENCE LAB";
        let sentenceTokens = [];
        let punctuation = ".";

        elements.forEach(el => {
            if (el.type === 'label') labelText = el.text;
            if (el.type === 'interactive_sentence') {
                sentenceTokens = el.tokens || [];
                punctuation = el.punctuation || ".";
            }
        });

        const question = data.question || {};
        const correctIds = question.correct || [];
        const reveal = data.reveal || {};

        component.innerHTML = `
            <style>
                .sentence-lab-wrapper {
                    padding: 20px 0;
                }
                .sentence-lab-wrapper .ey {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: .12em;
                    color: #6d5dfc;
                    margin-bottom: 10px;
                }
                .sentence-lab-wrapper h2 {
                    font-size: 29px;
                    margin: 0 0 10px 0;
                    color: #172033;
                }
                .sentence-lab-wrapper .muted {
                    color: #697386;
                    line-height: 1.65;
                    margin-bottom: 20px;
                }
                .sentence-lab-wrapper .editor {
                    background: #e6e6e6;
                    color: #fff;
                    border-radius: 22px;
                    padding: 26px;
                    margin-bottom: 20px;
                }
                .sentence-lab-wrapper .word {
                    padding: 4px 6px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .sentence-lab-wrapper .word:hover,
                .sentence-lab-wrapper .word.bad {
                    background: #ffe5e5;
                    color: #a33;
                }
                .sentence-lab-wrapper .reveal {
                    display: none;
                    margin-top: 14px;
                    padding: 15px;
                    border-radius: 14px;
                    background: #effbf5;
                    border: 1px solid #c8efd9;
                    color: #172033;
                }
                .sentence-lab-wrapper .reveal.show {
                    display: block;
                    animation: fadeIn 0.4s;
                }
                .sentence-lab-wrapper .text {
                    font-size: 18px;
                    line-height: 1.8;
                }
                .sentence-lab-wrapper .btns {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 20px;
                }
                .sentence-lab-wrapper .btn {
                    border: 0;
                    font-weight: 800;
                    border-radius: 12px;
                    padding: 12px 20px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 16px;
                    transition: all 0.2s;
                }
                .sentence-lab-wrapper .primary {
                    background: #6d5dfc;
                    color: #fff;
                }
                .sentence-lab-wrapper .primary:hover {
                    background: #5b4be8;
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            
            <div class="ey">❸ DISCOVER</div>
            ${promptText ? `<h2>${promptText}</h2>` : ''}
            <p class="muted">${question.text || 'Tìm chỗ khiến em thấy “vướng”.'}</p>
            
            <div class="editor">
                <div style="color:#6760ad;font-weight:800;font-size:12px;margin-bottom:15px">${labelText}</div>
                <p class="text">
                    ${sentenceTokens.map(t => {
            if (t.target) {
                return `<span class="word" data-id="${t.id}">${t.text}</span>`;
            }
            return t.text;
        }).join(' ')}${punctuation}
                </p>
                <div class="reveal" id="sl-reveal">✨ ${reveal.text}</div>
            </div>
            
            <div class="btns">
                <button class="btn primary" id="sl-btn-next" style="display:none">Tiếp tục →</button>
            </div>
        `;

        setTimeout(() => {
            const words = component.querySelectorAll('.word');
            const revealBox = component.querySelector('#sl-reveal');
            const btnNext = component.querySelector('#sl-btn-next');

            let foundCount = 0;
            const requiredCount = correctIds.length;

            words.forEach(w => {
                w.addEventListener('click', () => {
                    if (!w.classList.contains('bad')) {
                        w.classList.add('bad');
                        const id = w.dataset.id;
                        if (correctIds.includes(id)) {
                            foundCount++;
                            // Even if they found just one of the correct ones, reveal the hint as in the prototype
                            // The prototype reveals on 'hay' click. Let's reveal on any correct click.
                            if (reveal.after_correct) {
                                revealBox.classList.add('show');
                            }

                            // Enable next if all found, or if just 1 found depending on strictness.
                            // The prototype allowed moving on. We will let them move on after finding at least 1.
                            btnNext.style.display = 'block';
                            component.dataset.completed = "true";
                        }
                    }
                });
            });

            btnNext.addEventListener('click', () => {
                window.engine && window.engine.next();
            });

        }, 0);

        return component;
    }
}
