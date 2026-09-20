export default class DecisionLab {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component decision-lab";

        const tasks = data.tasks || [];
        const ui = data.ui || {};

        component.innerHTML = `
            <style>
                .dlab-wrapper { max-width: 800px; margin: 0 auto; padding: 20px 0; }
                .dlab-hero { text-align: center; margin-bottom: 30px; }
                .dlab-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                .dlab-hero h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 10px; }
                
                .dlab-task-container { display: none; animation: fadeIn 0.4s; }
                .dlab-task-container.active { display: block; }
                
                .dlab-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; text-align: center; }
                .dlab-prompt { font-size: 1.4rem; color: #1e293b; font-weight: bold; margin-bottom: 30px; line-height: 1.5; font-style: italic; }
                
                .dlab-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .dlab-choice { padding: 16px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; color: #475569; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .dlab-choice:hover { border-color: #94a3b8; background: #f8fafc; }
                .dlab-choice.correct { background: #10b981; color: white; border-color: #10b981; }
                .dlab-choice.wrong { background: #ef4444; color: white; border-color: #ef4444; }
                
                .dlab-feedback { display: none; margin-top: 25px; padding: 15px; border-radius: 12px; font-size: 1.1rem; line-height: 1.5; text-align: left; animation: fadeIn 0.4s; }
                .dlab-feedback.correct { background: #dcfce7; border: 1px solid #bbf7d0; color: #15803d; display: block; }
                .dlab-feedback.wrong { background: #fee2e2; border: 1px solid #fecaca; color: #b91c1c; display: block; }
                
                .dlab-progress { text-align: center; color: #64748b; font-weight: bold; margin-bottom: 20px; }
                
                .dlab-actions { text-align: center; margin-top: 20px; }
                .dlab-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; }
                .dlab-btn:hover { background: #5b4be8; }
            </style>
            
            <div class="dlab-wrapper">
                <div class="dlab-hero">
                    <div class="emoji">🏗️</div>
                    ${promptText ? `<h1>${promptText}</h1>` : ''}
                </div>
                
                <div class="dlab-progress">Nhiệm vụ <span id="dt-curr">1</span>/${tasks.length}</div>
                
                <div id="dlab-tasks">
                    ${tasks.map((t, i) => `
                        <div class="dlab-task-container ${i === 0 ? 'active' : ''}" data-idx="${i}" data-ans="${t.answer}">
                            <div class="dlab-card">
                                <div class="dlab-prompt">“${t.prompt}”</div>
                                <div class="dlab-choices">
                                    ${t.choices.map(c => `<button class="dlab-choice" data-val="${c}">${c}</button>`).join('')}
                                </div>
                                <div class="dlab-feedback">
                                    <div class="fb-icon" style="font-size:1.5rem; margin-bottom: 10px;"></div>
                                    <div class="fb-text"></div>
                                    <div class="fb-exp" style="margin-top: 10px; font-style: italic; color: #475569;">${t.explanation || ''}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="dlab-actions">
                    <button class="dlab-btn" id="dbtn-next-task">Tiếp tục nhiệm vụ →</button>
                    <button class="dlab-btn" id="dbtn-finish">Hoàn thành →</button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const containers = component.querySelectorAll('.dlab-task-container');
            const btnNextTask = component.querySelector('#dbtn-next-task');
            const btnFinish = component.querySelector('#dbtn-finish');
            const currEl = component.querySelector('#dt-curr');
            let currIdx = 0;

            const setupTask = (container) => {
                const answer = container.dataset.ans;
                const choices = container.querySelectorAll('.dlab-choice');
                const feedback = container.querySelector('.dlab-feedback');
                const fbIcon = container.querySelector('.fb-icon');
                const fbText = container.querySelector('.fb-text');
                let answered = false;

                choices.forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (answered) return;
                        
                        choices.forEach(b => b.classList.remove('wrong', 'correct'));
                        const val = btn.dataset.val;
                        
                        if (val === answer) {
                            answered = true;
                            btn.classList.add('correct');
                            feedback.className = 'dlab-feedback correct';
                            fbIcon.innerHTML = '✨ CHÍNH XÁC!';
                            fbText.innerHTML = `Kiểu đoạn: <b>${answer}</b>`;
                            
                            choices.forEach(b => { if (b !== btn) b.style.opacity = '0.5'; b.style.cursor = 'default'; });
                            
                            if (currIdx < tasks.length - 1) {
                                btnNextTask.style.display = 'inline-block';
                            } else {
                                btnFinish.style.display = 'inline-block';
                                component.dataset.completed = "true";
                            }
                        } else {
                            btn.classList.add('wrong');
                            feedback.className = 'dlab-feedback wrong';
                            fbIcon.innerHTML = '❌ CHƯA ĐÚNG';
                            fbText.innerHTML = `Mục đích chính chưa phù hợp. Hãy thử lại!`;
                        }
                    });
                });
            };

            containers.forEach(setupTask);

            btnNextTask.addEventListener('click', () => {
                containers[currIdx].classList.remove('active');
                btnNextTask.style.display = 'none';
                currIdx++;
                currEl.innerText = currIdx + 1;
                containers[currIdx].classList.add('active');
            });

            btnFinish.addEventListener('click', () => {
                window.engine && window.engine.next();
            });
        }, 0);

        return component;
    }
}
