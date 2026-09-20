/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/reflection.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import MultiSelectBuilder from "./layouts/MultiSelectBuilder.js";
import ChoiceBuilder from "./layouts/ChoiceBuilder.js";

class Reflection {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component reflection-component";

        if (data.ui && data.ui.component === 'checklist_free_text') {
            const choices = data.choices || [];
            const freeText = data.freeText || {};
            
            component.innerHTML = `
                <style>
                    .ref-cft-wrapper { padding: 20px; max-width: 800px; margin: 0 auto; font-family: 'Inter', sans-serif; }
                    .ref-cft-header { text-align: center; margin-bottom: 30px; }
                    .ref-cft-title { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
                    .ref-cft-question { font-size: 1.2rem; color: #475569; }
                    
                    .ref-cft-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 30px; }
                    
                    .ref-cft-choices { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
                    .ref-cft-label { display: flex; align-items: center; padding: 15px 20px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
                    .ref-cft-label:hover { border-color: #94a3b8; background: white; }
                    .ref-cft-label:has(input:checked) { border-color: #6d5dfc; background: #eff6ff; }
                    .ref-cft-checkbox { margin: 0 15px 0 0; padding: 0; transform: scale(1.3); accent-color: #6d5dfc; flex-shrink: 0; width: auto; display: inline-block; }
                    .ref-cft-text { font-size: 1.1rem; color: #334155; font-weight: 600; text-align: left; flex-grow: 1; }
                    
                    .ref-cft-ft-label { font-weight: bold; font-size: 1.1rem; color: #1e293b; margin-bottom: 10px; display: block; }
                    .ref-cft-textarea { width: 100%; box-sizing: border-box; min-height: 120px; padding: 15px; border: 2px solid #cbd5e1; border-radius: 12px; font-family: inherit; font-size: 1.05rem; resize: vertical; outline: none; transition: border 0.2s; }
                    .ref-cft-textarea:focus { border-color: #6d5dfc; }
                    
                    .ref-cft-actions { text-align: center; }
                    .ref-cft-btn { background: #6d5dfc; color: white; border: none; padding: 14px 40px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .ref-cft-btn:hover { background: #5b4be8; }
                    
                    .ref-cft-meta { display: none; margin-top: 30px; padding: 20px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; color: #b45309; text-align: center; animation: fadeIn 0.4s; }
                    .ref-cft-meta b { display: block; margin-bottom: 10px; font-size: 1.1rem; }
                    
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                
                <div class="ref-cft-wrapper">
                    <div class="ref-cft-header">
                        ${promptText ? `<div class="ref-cft-title">${promptText}</div>` : ''}
                        <div class="ref-cft-question">${data.question || ''}</div>
                    </div>
                    
                    <div class="ref-cft-card">
                        ${choices.length > 0 ? MultiSelectBuilder.render(choices) : ''}
                        
                        <div class="ref-cft-ft">
                            <label class="ref-cft-ft-label">${freeText.label || 'Ghi chú thêm:'}</label>
                            <textarea class="ref-cft-textarea" id="ref-cft-ta" placeholder="${freeText.placeholder || ''}"></textarea>
                        </div>
                    </div>
                    
                    <div class="ref-cft-actions">
                        <button class="ref-cft-btn" id="btn-cft-submit">Lưu suy nghĩ</button>
                    </div>
                    
                    ${data.metacognition ? `
                        <div class="ref-cft-meta" id="ref-cft-meta">
                            <b>🧠 Bài học rút ra</b>
                            <div>${data.metacognition}</div>
                            <button class="ref-cft-btn" id="btn-cft-next" style="margin-top:20px; background:#f59e0b;">Tiếp tục →</button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            setTimeout(() => {
                const btnSubmit = component.querySelector('#btn-cft-submit');
                const btnNext = component.querySelector('#btn-cft-next');
                const metaEl = component.querySelector('#ref-cft-meta');
                
                MultiSelectBuilder.bind(component, (selected) => {
                    // console.log("Selected choices: ", selected);
                });
                
                btnSubmit.addEventListener('click', () => {
                    btnSubmit.style.display = 'none';
                    if (metaEl) {
                        metaEl.style.display = 'block';
                    } else {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    }
                });
                
                if (btnNext) {
                    btnNext.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                }
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'text_validation') {
            const reqs = data.requirements || [];
            
            component.innerHTML = `
                <style>
                    .ref-tv-wrapper { padding: 20px; font-family: 'Inter', sans-serif; }
                    .ref-tv-title { font-size: 24px; font-weight: 800; color: #172033; margin-bottom: 10px; }
                    .ref-tv-instruction { color: #667085; font-size: 16px; margin-bottom: 20px; }
                    
                    .ref-tv-reqs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
                    .ref-tv-req { color: #667085; font-size: 15px; display: flex; align-items: center; gap: 8px; }
                    .ref-tv-req.done { color: #16855b; font-weight: 700; }
                    
                    .ref-tv-textarea { width: 100%; min-height: 150px; resize: vertical; border: 1px solid #e4e8f0; border-radius: 14px; padding: 16px; font-size: 16px; outline: none; transition: 0.2s; box-sizing: border-box; }
                    .ref-tv-textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08); }
                    
                    .ref-tv-feedback { display: none; margin-top: 22px; border-radius: 14px; padding: 18px; animation: fadeIn 0.25s ease; background: #eaf8f1; border: 1px solid #bfe8d3; }
                    .ref-tv-feedback.show { display: block; }
                    .ref-tv-feedback-title { font-weight: 800; margin-bottom: 5px; color: #16855b; }
                    .ref-tv-feedback-text { color: #16855b; }
                </style>
                <div class="ref-tv-wrapper">
                    <div class="ref-tv-title">${data.question || ''}</div>
                    <div class="ref-tv-instruction">${data.instruction || ''}</div>
                    
                    <div class="ref-tv-reqs">
                        ${reqs.map((req, i) => `
                            <div class="ref-tv-req" id="req-${i}">
                                <span class="req-icon">○</span>
                                <span class="req-label">${req.label}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <textarea class="ref-tv-textarea" placeholder="${data.placeholder || 'Viết câu của em vào đây...'}"></textarea>
                    
                    <div class="ref-tv-feedback">
                        <div class="ref-tv-feedback-title">✓ Hoàn thành</div>
                        <div class="ref-tv-feedback-text">${data.feedback?.correct || 'Câu của em đã đáp ứng yêu cầu.'}</div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const textarea = component.querySelector('.ref-tv-textarea');
                const feedback = component.querySelector('.ref-tv-feedback');
                
                textarea.addEventListener('input', () => {
                    const val = textarea.value.trim();
                    let allDone = true;
                    
                    reqs.forEach((req, i) => {
                        const el = component.querySelector(`#req-${i}`);
                        const icon = el.querySelector('.req-icon');
                        
                        let done = false;
                        if (val) {
                            try {
                                const regex = new RegExp(req.pattern, 'i');
                                done = regex.test(val);
                            } catch (e) {
                                console.error("Invalid regex in requirements: ", req.pattern);
                            }
                        }
                        
                        if (done) {
                            el.classList.add('done');
                            icon.textContent = '✓';
                        } else {
                            el.classList.remove('done');
                            icon.textContent = '○';
                            allDone = false;
                        }
                    });
                    
                    if (allDone && reqs.length > 0 && val) {
                        feedback.classList.add('show');
                        component.dataset.completed = "true";
                    } else {
                        feedback.classList.remove('show');
                        component.dataset.completed = "false";
                    }
                });
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'reflection_card') {
            // New UI for Debug Log
            const qs = data.questions || [];
            
            let html = `
                <div class="debug-log-header" style="background: #1e293b; color: white; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 6px solid #3b82f6; text-align: center;">
                    <div style="font-size: 1.5em; margin-bottom: 15px;">🧠 <strong>DEBUG LOG</strong></div>
                    ${promptText ? `<div style="font-size: 1.2em; color: #94a3b8; margin-bottom: 10px;">“${promptText}”</div>` : ''}
                    <div style="color: #cbd5e1; font-style: italic;">Hôm nay em đã học cách tìm những “đường nối” giữa các câu.</div>
                </div>
                
                <div class="reflection-questions" style="max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
            `;
            
            qs.forEach((q, i) => {
                html += `<div class="ref-q-card" id="q-card-${q.id}" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">`;
                
                if (q.type === 'multi_select') {
                    html += `
                        <div style="font-weight: bold; font-size: 1.2em; color: #0f172a; margin-bottom: 20px;">
                            <span style="color: #3b82f6; margin-right: 10px;">🔍 0${i+1}</span> ${q.question}
                        </div>
                        <div class="ref-options" style="display: flex; flex-direction: column; gap: 12px;" data-question-id="${q.id}">
                            ${MultiSelectBuilder.render(q.choices || q.options || [])}
                        </div>
                        <div class="ref-soft-feedback" style="display: none; margin-top: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; color: #166534; font-weight: 500;">
                            💡 Đúng hướng. Em đang chú ý đến mối quan hệ giữa các câu, không chỉ từng câu riêng lẻ.
                        </div>
                    `;
                } else if (q.type === 'free_text') {
                    html += `
                        <div style="font-weight: bold; font-size: 1.2em; color: #0f172a; margin-bottom: 20px;">
                            <span style="color: #eab308; margin-right: 10px;">🛠️</span> NẾU ĐOẠN VĂN CỦA EM BỊ RỜI RẠC...<br>
                            <span style="font-size: 0.85em; color: #64748b; font-weight: normal;">${q.question}</span>
                        </div>
                        <textarea id="ref-ft-${q.id}" placeholder="${q.placeholder || ''}" style="width: 100%; box-sizing: border-box; min-height: 120px; padding: 15px; border: 2px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 1.05em; resize: vertical; outline: none; transition: border 0.2s;"></textarea>
                    `;
                }
                
                html += `</div>`;
            });
            
            html += `
                </div>
                
                <div class="ref-submit-area" style="text-align: center; margin-top: 40px;">
                    <button id="btn-submit-debug" class="btn btn-primary" style="padding: 15px 40px; border-radius: 8px; font-size: 1.2em; font-weight: bold;">
                        ${data.completion?.button || "✓ Lưu suy nghĩ"}
                    </button>
                </div>
                
                <div class="ref-result-area" style="display: none; max-width: 700px; margin: 40px auto 0;">
                    <!-- The DEBUG RULE transforms here -->
                </div>
            `;
            
            component.innerHTML = html;
            
            setTimeout(() => {
                const msContainers = component.querySelectorAll('.ref-options');
                msContainers.forEach(container => {
                    MultiSelectBuilder.bind(container, (selected) => {
                        const qCard = container.closest('.ref-q-card');
                        const feedback = qCard.querySelector('.ref-soft-feedback');
                        if (selected.length > 0 && feedback) {
                            feedback.style.display = 'block';
                        }
                    });
                });
                
                const submitBtn = component.querySelector('#btn-submit-debug');
                submitBtn.addEventListener('click', () => {
                    const freeTextQ = qs.find(q => q.type === 'free_text');
                    const textValue = freeTextQ ? component.querySelector(`#ref-ft-${freeTextQ.id}`).value.trim() : "";
                    
                    component.querySelector('.reflection-questions').style.display = 'none';
                    component.querySelector('.ref-submit-area').style.display = 'none';
                    
                    const resultArea = component.querySelector('.ref-result-area');
                    resultArea.style.display = 'block';
                    
                    resultArea.innerHTML = `
                        <div style="background: white; border: 2px solid #8b5cf6; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.2);">
                            <div style="background: #8b5cf6; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 1.2em; letter-spacing: 1px;">
                                🧠 DEBUG RULE CỦA EM
                            </div>
                            <div style="padding: 30px; text-align: center;">
                                <div style="font-size: 1.3em; color: #4c1d95; font-style: italic; margin-bottom: 25px; line-height: 1.5;">
                                    "${textValue || 'Em sẽ kiểm tra xem các câu có liên quan với nhau không.'}"
                                </div>
                                <div style="color: #6366f1; font-weight: bold; font-size: 0.9em;">
                                    Gắn thẻ: #Tự_sửa_lỗi &nbsp;&nbsp; #Liên_kết
                                </div>
                            </div>
                        </div>
                        
                        ${data.metacognition?.enabled ? `
                            <div style="margin-top: 30px; padding: 25px; background: #fdf4ff; border-left: 4px solid #d946ef; border-radius: 0 12px 12px 0;">
                                <div style="font-weight: bold; color: #a21caf; margin-bottom: 10px; font-size: 1.1em;">${data.metacognition.feedback.title}</div>
                                <div style="color: #86198f; line-height: 1.6;">${data.metacognition.feedback.text}</div>
                            </div>
                        ` : ''}
                        
                        <div style="text-align: center; margin-top: 40px;">
                            <button class="btn btn-primary btn-next-step" style="padding: 12px 30px; border-radius: 8px;">Tiếp tục →</button>
                        </div>
                    `;
                    
                    resultArea.querySelector('.btn-next-step').addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                });
            }, 0);
            
            return component;
        }
        
        if ((data.ui && data.ui.layout === 'simple') || data.questions) {
            const qs = data.questions || data.data?.questions || [];
            
            component.innerHTML = `
                <style>
                    .ref-simple-wrapper { padding: 20px 0; }
                    .ref-simple-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .ref-simple-wrapper h2 { font-size: 29px; margin-bottom: 20px; color: #172033; }
                    .ref-simple-wrapper .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 20px; }
                    .ref-simple-wrapper h3 { margin: 0 0 15px 0; font-size: 1.2em; color: #172033; }
                    .ref-simple-wrapper .choices { display: flex; flex-wrap: wrap; gap: 10px; }
                    .ref-simple-wrapper .choice { border: 1px solid #d9ddea; border-radius: 12px; padding: 12px 15px; background: #fff; cursor: pointer; text-align: left; font-weight: bold; color: #172033; transition: all 0.2s; }
                    .ref-simple-wrapper .choice:hover, .ref-simple-wrapper .choice.sel { border-color: #6d5dfc; background: #f3f1ff; color: #6d5dfc; }
                    .ref-simple-wrapper textarea { width: 100%; min-height: 120px; padding: 14px; border: 1px solid #d9ddea; border-radius: 14px; font: inherit; line-height: 1.6; resize: vertical; box-sizing: border-box; }
                    .ref-simple-wrapper textarea:focus { outline: none; border-color: #6d5dfc; }
                    .ref-simple-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                    .ref-simple-wrapper .primary { background: #6d5dfc; color: #fff; }
                    .ref-simple-wrapper .primary:hover { background: #5b4be8; }
                </style>
                <div class="ref-simple-wrapper">
                    <div class="ey">❼ REFLECTION</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    
                    ${qs.map((q, i) => {
                        if (q.type === 'multiple_choice' || q.type === 'multi_select' || q.type === 'single_select' || q.type === 'single_choice' || q.type === 'multi_choice') {
                            return `
                                <div class="card">
                                    <h3>${q.question || q.text}</h3>
                                    <div class="choices">
                                        ${(q.options||q.choices||[]).map(opt => `<button class="choice ref-choice" data-id="${opt.id || ''}">${opt.label || opt.text || opt}</button>`).join('')}
                                    </div>
                                </div>
                            `;
                        }
                        if (q.type === 'free_text') {
                            return `
                                <div class="card">
                                    <h3>${q.question || q.text}</h3>
                                    <textarea placeholder="${q.placeholder || ''}" class="ref-textarea"></textarea>
                                </div>
                            `;
                        }
                        return '';
                    }).join('')}
                    
                    <button class="btn primary" id="ref-btn-next" style="display:none; margin-top:10px;">🔖 Lưu bí kíp →</button>
                </div>
            `;
            
            setTimeout(() => {
                const choices = component.querySelectorAll('.ref-choice');
                const textarea = component.querySelector('.ref-textarea');
                const btnNext = component.querySelector('#ref-btn-next');
                
                const checkReady = () => {
                    const hasChoice = Array.from(choices).some(c => c.classList.contains('sel'));
                    const hasText = textarea ? textarea.value.trim().length > 0 : true;
                    if (hasChoice && hasText) {
                        btnNext.style.display = 'block';
                        component.dataset.completed = "true";
                    } else {
                        btnNext.style.display = 'none';
                        component.dataset.completed = "false";
                    }
                };
                
                choices.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btn.classList.toggle('sel');
                        checkReady();
                    });
                });
                
                if (textarea) {
                    textarea.addEventListener('input', checkReady);
                }
                
                btnNext.addEventListener('click', () => {
                    window.engine && window.engine.next();
                });
            }, 0);
            
            return component;
        }

        if (data.prompts) {
            // New Format
            component.innerHTML = `
                <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                    <h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">
                        ${promptText || ''}
                    </h2>
                    ${data.intro ? `
                        <p class="question-text" style="color: #475569; font-size: 1.1em; max-width: 600px; margin: 0 auto;">
                            <strong>${data.intro.text}</strong><br>
                            <span style="font-size: 0.9em; opacity: 0.8;">${data.intro.subtext}</span>
                        </p>
                    ` : ''}
                </div>
                
                <div class="reflection-prompts-container" style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 25px;">
                    ${data.prompts.map(p => this.renderNewPrompt(p)).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button id="btn-save-reflection" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px; font-size: 1.1em;">
                        Lưu suy ngẫm
                    </button>
                </div>
            `;
        } else if (data.content && data.content.question_01) {
            // Format from 01-lap-dan-y and 02-trien-khai-y
            let prompts = [];
            
            // Render Before/After if exists
            let beforeAfterHtml = '';
            if (data.content.beforeAfter) {
                beforeAfterHtml = `
                    <div class="reflection-before-after" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 20px; text-align: center;">👀 Nhìn lại sự thay đổi</div>
                        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px; background: #fef2f2; border: 2px dashed #fca5a5; border-radius: 8px; padding: 15px;">
                                <div style="font-weight: bold; color: #991b1b; margin-bottom: 10px;">Lúc đầu:</div>
                                <div style="color: #7f1d1d; font-style: italic;">"${data.content.beforeAfter.before}"</div>
                            </div>
                            <div style="flex: 1; min-width: 200px; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 8px; padding: 15px;">
                                <div style="font-weight: bold; color: #166534; margin-bottom: 10px;">Sau khi phát triển:</div>
                                <div style="color: #14532d; font-style: italic;">"${data.content.beforeAfter.after}"</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Map all questions
            const questions = ['question_01', 'question_02', 'question_03', 'question_04'];
            questions.forEach(qKey => {
                if (data.content[qKey]) {
                    const qData = data.content[qKey];
                    let type = 'freeText';
                    if (qData.type === 'single_choice') type = 'singleChoice';
                    if (qData.type === 'multi_choice') type = 'multiChoice';
                    
                    prompts.push({
                        id: qData.id || qKey,
                        type: type,
                        question: qData.question,
                        options: (qData.options || []).map((text, idx) => ({ id: idx, text })),
                        placeholder: qData.placeholder || ''
                    });
                }
            });
            
            component.innerHTML = `
                <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                    <h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">
                        ${promptText || ''}
                    </h2>
                </div>
                
                <div class="reflection-prompts-container" style="max-width: 700px; margin: 0 auto; display: flex; flex-direction: column;">
                    ${beforeAfterHtml}
                    <div style="display: flex; flex-direction: column; gap: 25px;">
                        ${prompts.map(p => this.renderNewPrompt(p)).join('')}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button id="btn-save-reflection" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px; font-size: 1.1em;">
                        ${data.ui?.submit || "Lưu suy ngẫm"}
                    </button>
                </div>
            `;
        } else {
            // Old Format
            component.innerHTML = `
                <div class="component-header">
                    <h2 class="question-title">
                        ${data.question || ""}
                    </h2>
                    <p class="question-text"></p>
                </div>
                ${this.renderPrompt(data)}
                ${this.renderTextarea(data)}
                ${this.renderChecklist(data)}
                ${this.renderAction()}
            `;
        }

        this.bind(component, data);
        return component;
    }

    static renderNewPrompt(prompt) {
        if (prompt.type === 'freeText') {
            return `
                <div class="reflection-item" style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="font-weight: bold; font-size: 1.1em; color: #334155; margin-bottom: 10px;">${prompt.question}</div>
                    <textarea class="reflection-input" data-id="${prompt.id}" placeholder="${prompt.placeholder || ''}" style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 1em; resize: vertical; box-sizing: border-box;"></textarea>
                </div>
            `;
        } else if (prompt.type === 'singleChoice') {
            return `
                <div class="reflection-item" style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="font-weight: bold; font-size: 1.1em; color: #334155; margin-bottom: 15px;">${prompt.question}</div>
                    ${ChoiceBuilder.render(prompt.choices || prompt.options || [])}
                </div>
            `;
        } else if (prompt.type === 'multiChoice') {
            return `
                <div class="reflection-item" style="background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="font-weight: bold; font-size: 1.1em; color: #334155; margin-bottom: 15px;">${prompt.question}</div>
                    ${MultiSelectBuilder.render(prompt.choices || prompt.options || [], 'checkbox', `ref_${prompt.id}[]`)}
                </div>
            `;
        }
        return '';
    }

    static renderPrompt(step) {

        if (!step.prompt)
            return "";

        return `

            <div class="reflection-prompt">

                ${step.prompt}

            </div>

        `;

    }

    /**
     * ======================================================
     * TEXTAREA
     * ======================================================
     */

    static renderTextarea(step) {

        return `

            <div class="reflection-answer">

                <textarea
                    id="reflection-answer"
                    placeholder="${step.placeholder || "Viết suy nghĩ hoặc đoạn văn của em..."}"
                ></textarea>

                <div class="reflection-footer">

                    <span id="reflection-word-count">

                        0 từ

                    </span>

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * CHECKLIST
     * ======================================================
     */

    static renderChecklist(step) {

        if (!step.checklist)
            return "";

        return `

            <div class="reflection-checklist">

                <h3>

                    Gợi ý tự đánh giá

                </h3>

                <ul>

                    ${step.checklist.map(item => `

                        <li>

                            <label>

                                <input
                                    type="checkbox">

                                ${item}

                            </label>

                        </li>

                    `).join("")}

                </ul>

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
                    id="btn-clear-reflection"
                    class="btn">

                    Xóa nội dung

                </button>

            </div>

        `;

    }

    /**
     * ======================================================
     * EVENTS
     * ======================================================
     */

    static bind(component, data) {
        
        if (data.prompts || (data.content && data.content.question_01)) {
            // New Format & 01-lap-dan-y format binding
            const saveBtn = component.querySelector("#btn-save-reflection");
            saveBtn?.addEventListener("click", () => {
                // Here we would typically save the inputs to State/History
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            });

            // Bind MultiSelectBuilder for all multiChoice options
            component.querySelectorAll('.multi-select-options').forEach(container => {
                MultiSelectBuilder.bind(container, (selected) => {
                    // Do nothing for now, just need it to trigger UI updates
                });
            });

            // Bind ChoiceBuilder for all singleChoice options
            component.querySelectorAll('.choice-options').forEach(container => {
                ChoiceBuilder.bind(container, (selected) => {
                    // Do nothing for now, just need it to trigger UI updates
                });
            });

        } else {
            // Old Format binding
            const textarea = component.querySelector("#reflection-answer");
            const counter = component.querySelector("#reflection-word-count");

            if (textarea && counter) {
                textarea.addEventListener("input", () => {
                    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
                    counter.textContent = `${words} từ`;
                });
            }

            component.querySelector("#btn-clear-reflection")?.addEventListener("click", () => {
                if (textarea) textarea.value = "";
                if (counter) counter.textContent = "0 từ";
                component.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            });
        }
    }

    static validator = getValidator("textValidator");

    static getValidator() {
        return this.validator;
    }


}

export default Reflection;