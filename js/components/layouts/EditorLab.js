export default class EditorLab {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component editor-lab-wrapper";

        const steps = data.ui?.steps || [];

        component.innerHTML = `
            <style>
                .editor-lab-wrapper { padding: 20px 0; }
                .editor-lab-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                .editor-lab-wrapper h2 { font-size: 29px; margin-bottom: 20px; color: #172033; }
                
                .editor-lab-wrapper .editor { background:  #efefe7; color: #fff; border-radius: 22px; padding: 26px; margin-bottom: 20px; }
                .editor-lab-wrapper .text { font-size: 18px; line-height: 1.8; margin-top: 10px; margin-bottom: 10px; }
                .editor-lab-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
                .editor-lab-wrapper .tool { border: 1px solid #d9ddea; border-radius: 12px; padding: 10px 15px; background: transparent; color: #6760ad; cursor: pointer; font-weight: bold; border-color: #39405a; transition: all 0.2s; }
                .editor-lab-wrapper .tool:hover, .editor-lab-wrapper .tool.sel { background: #c1bbf8ff; border-color: #c1bbf8ff; }
                
                .editor-lab-wrapper .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 20px; }
                .editor-lab-wrapper .pill { display: inline-block; padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5b4be8; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
                .editor-lab-wrapper textarea { width: 100%; min-height: 120px; padding: 14px; border: 1px solid #d9ddea; border-radius: 14px; font: inherit; line-height: 1.6; resize: vertical; margin-top: 10px; }
                .editor-lab-wrapper textarea:focus { outline: none; border-color: #6d5dfc; }
                
                .editor-lab-wrapper .feedback { display: none; margin-top: 15px; animation: fadeIn 0.4s; }
                .editor-lab-wrapper .feedback.show { display: block; }
                .editor-lab-wrapper .tag { display: inline-block; padding: 6px 9px; margin: 3px 5px 0 0; border-radius: 9px; background: #eaf9f1; color: #18764e; font-size: 13px; font-weight: 700; }
                
                .editor-lab-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                .editor-lab-wrapper .primary { background: #6d5dfc; color: #fff; }
                .editor-lab-wrapper .primary:hover { background: #5b4be8; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            
            <div class="ey">❺ GUIDED PRACTICE</div>
            ${promptText ? `<h2>${promptText}</h2>` : ''}
            
            ${steps.map((s, idx) => {
            if (s.actions) {
                return `
                        <div class="editor">
                            <b style="color:  #6760ad;">${s.label}</b>
                            <p class="text">${s.sentence}</p>
                            <div class="btns">
                                ${s.actions.map((act, i) => `<button class="tool step1-tool" data-idx="${i}">${act.label}</button>`).join('')}
                            </div>
                            <div class="feedback" id="el-feedback-1">
                                ${(s.feedback?.criteria || []).map(c => `<span class="tag">✓ ${c}</span>`).join('')}
                            </div>
                        </div>
                    `;
            } else if (s.type === 'free_text') {
                return `
                        <div class="card" id="el-step2" style="opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
                            <span class="pill">${s.label}</span>
                            <p class="text" style="color: #172033;">${s.sentence}</p>
                            <textarea placeholder="${s.placeholder || ''}" id="el-textarea"></textarea>
                        </div>
                    `;
            }
            return '';
        }).join('')}
            
            <div class="btns" style="justify-content: center; margin-top: 30px;">
                <button class="btn primary" id="el-btn-next" style="display:none;">🎵 Thử sức →</button>
            </div>
        `;

        setTimeout(() => {
            const step1Tools = component.querySelectorAll('.step1-tool');
            const feedback1 = component.querySelector('#el-feedback-1');
            const step2 = component.querySelector('#el-step2');
            const textarea = component.querySelector('#el-textarea');
            const btnNext = component.querySelector('#el-btn-next');

            step1Tools.forEach(btn => {
                btn.addEventListener('click', () => {
                    step1Tools.forEach(b => b.classList.remove('sel'));
                    btn.classList.add('sel');
                    feedback1.classList.add('show');

                    // Unlock step 2
                    if (step2) {
                        step2.style.opacity = '1';
                        step2.style.pointerEvents = 'auto';
                    }
                });
            });

            if (textarea) {
                textarea.addEventListener('input', () => {
                    if (textarea.value.trim().length > 0) {
                        btnNext.style.display = 'block';
                        component.dataset.completed = "true";
                    } else {
                        btnNext.style.display = 'none';
                        component.dataset.completed = "false";
                    }
                });
            } else {
                // If no step 2, button is handled by step 1
                step1Tools.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btnNext.style.display = 'block';
                        component.dataset.completed = "true";
                    });
                });
            }

            btnNext.addEventListener('click', () => {
                window.engine && window.engine.next();
            });

        }, 0);

        return component;
    }
}
