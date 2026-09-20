/**
 * ==========================================================
 * TS10 Learning Platform
 * components/challenge.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import ConnectionMap from "./connectionMap.js";
import RepairStudio from "./layouts/RepairStudio.js";
import ConnectionBoss from "./layouts/ConnectionBoss.js";
import EditorBoss from "./layouts/EditorBoss.js";
import MultiStageChallenge from "./layouts/MultiStageChallenge.js";
import Choice from "./choice.js";
import ChoiceBuilder from "./layouts/ChoiceBuilder.js";

class Challenge {

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component challenge-component";

        const isBoss = step.type === 'final_challenge' || step.type === 'finalChallenge' || data.difficulty === 'boss';

        if (data.ui && data.ui.layout === 'single_choice') {
            return Choice.render(step);
        }

        if (data.ui && data.ui.layout === 'repair_studio') {
            return RepairStudio.render(step);
        }

        if (data.ui && data.ui.layout === 'connection_boss') {
            return ConnectionBoss.render(step);
        }

        if (data.ui && data.ui.layout === 'boss') {
            return EditorBoss.render(step);
        }

        if (data.ui && (data.ui.component === 'multi_stage_boss' || data.ui.component === 'multi_stage_challenge')) {
            return MultiStageChallenge.render(step);
        }

        if (data.ui && data.ui.layout === 'strategy_choice') {
            const ui = data.ui;
            const choices = data.choices || [];

            component.innerHTML = `
                <style>
                    .chal-sc-wrapper { padding: 20px 0; max-width: 800px; margin: 0 auto; }
                    .chal-sc-hero { text-align: center; margin-bottom: 30px; }
                    .chal-sc-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                    .chal-sc-hero h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 10px; }
                    .chal-sc-hero p { color: #64748b; font-size: 1.1rem; }
                    
                    .chal-sc-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; }
                    .chal-sc-label { display: inline-block; padding: 4px 10px; border-radius: 6px; background: #e2e8f0; color: #475569; font-weight: 700; font-size: 0.85rem; margin-bottom: 15px; letter-spacing: 0.05em; }
                    .chal-sc-prompt { font-size: 1.4rem; color: #1e293b; font-weight: bold; margin-bottom: 20px; line-height: 1.5; font-style: italic; border-left: 4px solid #6d5dfc; padding-left: 15px; }
                    
                    .chal-sc-question { font-size: 1.2rem; color: #1e293b; font-weight: bold; margin-bottom: 20px; text-align: center; }
                    
                    .chal-sc-choices { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }
                    .chal-sc-choice { text-align: left; padding: 16px 20px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; color: #475569; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
                    .chal-sc-choice:hover { border-color: #94a3b8; background: #f8fafc; }
                    .chal-sc-choice.selected { border-color: #6d5dfc; background: #f3f1ff; color: #6d5dfc; }
                    
                    .chal-sc-reason { display: none; animation: fadeIn 0.4s; }
                    .chal-sc-reason textarea { width: 100%; min-height: 100px; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 1.1rem; resize: vertical; margin-bottom: 15px; outline: none; transition: border-color 0.2s; }
                    .chal-sc-reason textarea:focus { border-color: #6d5dfc; }
                    
                    .chal-sc-actions { text-align: center; margin-top: 20px; }
                    .chal-sc-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; }
                    .chal-sc-btn:hover { background: #5b4be8; }
                </style>
                
                <div class="chal-sc-wrapper">
                    <div class="chal-sc-hero">
                        <div class="emoji">🎯</div>
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                        <p>${ui.noHints ? 'Không cho sẵn kiểu. Em phải tự quyết định.' : ''}</p>
                    </div>
                    
                    <div class="chal-sc-card">
                        <div class="chal-sc-label">ĐỀ BÀI</div>
                        <div class="chal-sc-prompt">${data.prompt || ''}</div>
                        
                        <div class="chal-sc-question">🧠 ${data.question || 'Em muốn đoạn này chủ yếu...'}</div>
                        
                        <div class="chal-sc-choices">
                            ${choices.map((c, i) => `
                                <button class="chal-sc-choice" data-idx="${i}">
                                    <span>${c.text}</span>
                                    <span class="chal-sc-check" style="display:none;">✓</span>
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="chal-sc-reason" id="sreason">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #334155;">${data.reasonQuestion || 'Vì sao em chọn cách này?'}</div>
                            <textarea id="reason-text" placeholder="Ghi chú nhanh suy nghĩ của em..."></textarea>
                        </div>
                    </div>
                    
                    <div class="chal-sc-actions">
                        <button class="chal-sc-btn" id="sbtn-next">Tiếp tục →</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const choiceBtns = component.querySelectorAll('.chal-sc-choice');
                const reasonBox = component.querySelector('#sreason');
                const btnNext = component.querySelector('#sbtn-next');
                const reasonText = component.querySelector('#reason-text');

                let selectedIdx = -1;

                choiceBtns.forEach((btn, idx) => {
                    btn.addEventListener('click', () => {
                        choiceBtns.forEach(b => {
                            b.classList.remove('selected');
                            b.querySelector('.chal-sc-check').style.display = 'none';
                        });
                        btn.classList.add('selected');
                        btn.querySelector('.chal-sc-check').style.display = 'inline';
                        selectedIdx = idx;

                        if (ui.showReasonAfterChoice) {
                            reasonBox.style.display = 'block';
                        } else {
                            btnNext.style.display = 'inline-block';
                        }
                    });
                });

                reasonText.addEventListener('input', () => {
                    if (reasonText.value.trim().length > 5 && selectedIdx !== -1) {
                        btnNext.style.display = 'inline-block';
                    } else {
                        btnNext.style.display = 'none';
                    }
                });

                btnNext.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                });
            }, 0);

            return component;
        }

        if (data.ui && data.ui.layout === 'challenge') {
            const ui = data.ui;
            const editor = ui.editor || {};
            const submit = ui.submit || {};
            const aiFeedback = data.ai_feedback || {};
            const metrics = aiFeedback.metrics || [];
            const ex = aiFeedback.example || {};

            component.innerHTML = `
                <style>
                    .challenge-mc-wrapper { padding: 20px 0; }
                    .challenge-mc-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .challenge-mc-wrapper h2 { font-size: 29px; margin-bottom: 20px; color: #172033; }
                    .challenge-mc-wrapper .card.challenge { background: linear-gradient(135deg, #f2f0ff, #fff); padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; box-shadow: 0 8px 28px #18203a0b; }
                    .challenge-mc-wrapper .pill { display: inline-block; padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5b4be8; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
                    .challenge-mc-wrapper h3 { margin: 0 0 10px 0; font-size: 1.2em; color: #172033; }
                    .challenge-mc-wrapper .text { font-size: 18px; line-height: 1.8; margin-bottom: 20px; color: #172033; }
                    .challenge-mc-wrapper textarea { width: 100%; min-height: 150px; padding: 14px; border: 1px solid #d9ddea; border-radius: 14px; font: inherit; line-height: 1.6; resize: vertical; margin-bottom: 15px; }
                    .challenge-mc-wrapper textarea:focus { outline: none; border-color: #6d5dfc; }
                    .challenge-mc-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
                    .challenge-mc-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                    .challenge-mc-wrapper .primary { background: #6d5dfc; color: #fff; }
                    .challenge-mc-wrapper .primary:hover { background: #5b4be8; }
                    .challenge-mc-wrapper .feedback { display: none; margin-top: 20px; background: #fff; border-radius: 16px; padding: 18px; border: 1px solid #e5e7eb; animation: fadeIn 0.4s; }
                    .challenge-mc-wrapper .feedback.show { display: block; }
                    .challenge-mc-wrapper .tag { display: inline-block; padding: 6px 9px; margin: 3px 5px 10px 0; border-radius: 9px; background: #eaf9f1; color: #18764e; font-size: 13px; font-weight: 700; }
                    .challenge-mc-wrapper .tag.warn { background: #fff4df; color: #986214; }
                    .challenge-mc-wrapper .meter { height: 10px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin: 10px 0; }
                    .challenge-mc-wrapper .meter i { display: block; height: 100%; background: #897cff; }
                    .challenge-mc-wrapper .muted { color: #697386; line-height: 1.65; margin: 10px 0 0 0; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                <div class="challenge-mc-wrapper">
                    <div class="ey">❻ MINI CHALLENGE</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    
                    <div class="card challenge">
                        <span class="pill">${ui.badge || 'NO HINTS'}</span>
                        <h3>${ui.title || 'Mix lại đoạn văn'}</h3>
                        <p class="text">${ui.source || ''}</p>
                        
                        <textarea placeholder="${editor.placeholder || 'Phiên bản của em...'}"></textarea>
                        
                        <div class="btns">
                            <button class="btn primary" id="mc-btn-submit">${submit.label || 'Nghe & phân tích'}</button>
                        </div>
                        
                        <div class="feedback" id="mc-feedback">
                            <div>
                                ${metrics.map(m => {
                const isWarn = m.id === 'rhythm';
                return `<span class="tag ${isWarn ? 'warn' : ''}">${m.label} ${isWarn ? '△' : '✓'}</span>`;
            }).join('')}
                            </div>
                            <h3 style="margin-top: 5px;">${ex.title || '🎵 Độ mượt'}: ${ex.score || 8}/${ex.max || 10}</h3>
                            <div class="meter"><i style="width: ${(ex.score / ex.max) * 100 || 80}%"></i></div>
                            ${(ex.strengths || []).map(s => `<p style="color:#16a34a; font-weight:bold; margin:5px 0;">✓ ${s}</p>`).join('')}
                            ${(ex.improvements || []).map(s => `<p class="muted">△ ${s}</p>`).join('')}
                        </div>
                    </div>
                    
                    <button class="btn primary" id="mc-btn-next" style="display:none; margin-top:20px;">🎧 Reflection →</button>
                </div>
            `;

            setTimeout(() => {
                const btnSubmit = component.querySelector('#mc-btn-submit');
                const feedback = component.querySelector('#mc-feedback');
                const btnNext = component.querySelector('#mc-btn-next');
                const textarea = component.querySelector('textarea');

                btnSubmit.addEventListener('click', () => {
                    if (!textarea.value.trim()) {
                        textarea.focus();
                        return;
                    }
                    btnSubmit.style.display = 'none';
                    feedback.classList.add('show');
                    btnNext.style.display = 'block';
                    component.dataset.completed = "true";
                });

                btnNext.addEventListener('click', () => {
                    window.engine && window.engine.next();
                });
            }, 0);

            return component;
        }

        if (data.ui && data.ui.layout === 'connection_lab') {
            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <p class="question-text">${data.instruction || step.instruction || ""}</p>
                </div>
            `;
            const mapEl = ConnectionMap.render(data.connectionData);
            component.appendChild(mapEl);

            const btnContainer = document.createElement("div");
            btnContainer.style.cssText = "text-align: center; margin-top: 30px;";
            btnContainer.innerHTML = `<button class="btn btn-primary" onclick="window.engine && window.engine.next()">Hoàn thành</button>`;
            component.appendChild(btnContainer);

            return component;
        }

        if (data.ui && data.ui.layout === 'strategy_builder') {
            const content = data.content || {};

            // UI elements
            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <p class="question-text" style="color: #475569; font-style: italic; font-size: 1.1em;">Đề bài: "${data.task?.prompt || ''}"</p>
                </div>
                
                <div class="strategy-builder-container" style="max-width: 800px; margin: 0 auto;">
                    
                    <!-- Step 1: Strategy Selection -->
                    <div id="c-step-strategy" class="c-step" style="display: block; animation: fadeIn 0.5s;">
                        <div style="font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 20px; text-align: center;">
                            ${data.strategySelection?.question || "Em muốn tổ chức đoạn như thế nào?"}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                            ${(data.strategySelection?.options || []).map(opt => `
                                <button class="btn-strategy-opt" data-id="${opt.id}" style="width: 100%; max-width: 400px; padding: 15px 20px; border-radius: 12px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; font-size: 1.1em; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left;">
                                    ${opt.label}
                                </button>
                            `).join('')}
                        </div>
                        <div style="margin-top: 30px; text-align: center;">
                            <button id="btn-to-reason" class="btn btn-primary" style="display: none; padding: 12px 30px; border-radius: 8px;">Tiếp tục →</button>
                        </div>
                    </div>

                    <!-- Step 2: Reasoning -->
                    <div id="c-step-reason" class="c-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">
                                ${data.reasoning?.title || "Vì sao em chọn cách này?"}
                            </div>
                            <div style="color: #3b82f6; font-weight: bold; margin-bottom: 25px; font-size: 1.1em;">
                                Chiến lược đã chọn: <span id="c-selected-strategy" style="text-transform: uppercase;">...</span>
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 15px; align-items: stretch; max-width: 500px; margin: 0 auto;">
                                ${ChoiceBuilder.render(data.reasoning?.choices || [])}
                                
                                ${data.reasoning?.freeText?.enabled ? `
                                    <div style="margin-top: 15px; text-align: left;">
                                        <div style="font-size: 0.9em; font-weight: bold; color: #64748b; margin-bottom: 8px;">Hoặc tự giải thích:</div>
                                        <textarea id="c-reason-text" placeholder="${data.reasoning.freeText.placeholder}" style="width: 100%; padding: 15px; border: 2px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical; min-height: 80px;"></textarea>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div style="margin-top: 30px;">
                                <button id="btn-to-build" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px;">Xác nhận →</button>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Build -->
                    <div id="c-step-build" class="c-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="display: flex; gap: 20px; align-items: flex-start;">
                            <div style="flex: 2; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px;">
                                <div style="font-weight: bold; font-size: 1.2em; color: #0f172a; margin-bottom: 25px; text-align: center;">
                                    ${data.builder?.title || "Xây đoạn"}
                                </div>
                                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 25px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                                    Chiến lược: <span id="c-build-strategy" style="text-transform: uppercase;">...</span>
                                </div>
                                
                                <div style="display: flex; flex-direction: column; gap: 20px;">
                                    ${(data.builder?.sections || []).map((sec, i, arr) => `
                                        <div class="c-build-section" data-section="${sec.id}" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                                            <div style="background: #f1f5f9; padding: 12px 20px; font-weight: bold; color: #334155;">
                                                ${sec.label}
                                            </div>
                                            <div style="padding: 15px; background: #fafafa; display: flex; flex-direction: column; gap: 10px;">
                                                <div class="c-sentence-list" style="display: flex; flex-direction: column; gap: 10px;">
                                                    <!-- Sentences go here -->
                                                    <!-- Sentences go here -->
                                                </div>
                                                ${data.builder?.interaction?.allowAdd ? `
                                                    <div style="display: flex; gap: 10px;">
                                                        <input type="text" class="c-sentence-input" placeholder="Thêm ý..." style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none;">
                                                        <button class="btn-add-sentence" style="background: #e2e8f0; color: #475569; border: none; padding: 0 15px; border-radius: 6px; font-weight: bold; cursor: pointer;">+</button>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${i < arr.length - 1 ? '<div style="text-align: center; color: #94a3b8; font-weight: bold; font-size: 1.5em; margin: -5px 0;">↓</div>' : ''}
                                    `).join('')}
                                </div>
                                
                                <div style="margin-top: 30px; text-align: center;">
                                    <button id="btn-to-feedback" class="btn btn-primary" style="padding: 12px 40px; border-radius: 8px; font-size: 1.1em; font-weight: bold;">🚀 Nộp bài</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: AI Feedback -->
                    <div id="c-step-feedback" class="c-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                            <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-weight: bold; font-size: 1.2em;">
                                ${data.aiFeedback?.title || "CHIẾN LƯỢC CỦA EM"}
                            </div>
                            
                            <div style="padding: 30px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <div style="color: #64748b; font-weight: bold; margin-bottom: 10px;">CHIẾN LƯỢC</div>
                                    <div id="c-feedback-strategy" style="font-size: 1.5em; font-weight: bold; color: #3b82f6; text-transform: uppercase;">...</div>
                                </div>
                                
                                <div style="text-align: center; margin-bottom: 25px;">
                                    <div style="background: #e2e8f0; height: 12px; border-radius: 6px; overflow: hidden; width: 80%; margin: 0 auto; display: flex;">
                                        <div style="background: #10b981; width: 85%; height: 100%;"></div>
                                    </div>
                                    <div style="font-weight: bold; color: #10b981; margin-top: 5px; font-size: 1.1em;">85%</div>
                                </div>
                                
                                <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                                    <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
                                        <div style="font-weight: bold; color: #166534; margin-bottom: 15px;">✓ ĐIỂM TỐT</div>
                                        <ul style="margin: 0; padding-left: 20px; color: #15803d; line-height: 1.6;">
                                            <li>Phù hợp với mục đích em đã chọn.</li>
                                            <li>Ý chính được đặt đúng vị trí theo chiến lược.</li>
                                            <li>Cấu trúc đoạn rõ ràng, dễ theo dõi.</li>
                                        </ul>
                                    </div>
                                    
                                    <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px;">
                                        <div style="font-weight: bold; color: #b45309; margin-bottom: 15px;">💡 CÓ THỂ CẢI THIỆN</div>
                                        <div style="color: #92400e; line-height: 1.6;">
                                            → Các câu triển khai cần tập trung hơn vào câu chủ đề để tránh bị loãng ý.
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                                    <div style="font-weight: bold; color: #1d4ed8; margin-bottom: 10px;">🔎 HỆ THỐNG NHẬN THẤY</div>
                                    <div style="color: #334155; line-height: 1.6;">
                                        Mục đích em chọn và cấu trúc em sử dụng rất phù hợp với nhau. Em đã hiểu cách chọn chiến lược để đạt được hiệu quả giao tiếp.
                                    </div>
                                </div>
                                
                                <div style="text-align: center;">
                                    <button id="c-done" class="btn btn-primary" style="padding: 12px 40px; border-radius: 8px; font-weight: bold;">Hoàn thành</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <style>
                    .btn-strategy-opt:hover { background: #f8fafc !important; border-color: #94a3b8 !important; }
                    .reason-choice-label:has(input:checked) { border-color: #3b82f6 !important; background: #eff6ff !important; }
                </style>
            `;
            this.bindStrategyBuilder(component, data);
            return component;
        }

        if (data.ui && data.ui.layout === 'writing_arena') {
            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                </div>
                
                <div class="writing-arena-container" style="max-width: 900px; margin: 0 auto;">
                    
                    <!-- Intro -->
                    <div id="wa-step-intro" class="wa-step" style="display: block; text-align: center; animation: fadeIn 0.5s;">
                        <div style="background: #1e293b; color: white; border-radius: 16px; padding: 50px 30px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                            <div style="font-size: 3em; margin-bottom: 20px;">🏆</div>
                            <h2 style="font-size: 2.5em; margin-top: 0; margin-bottom: 20px; color: #f8fafc;">${data.intro?.title || "FINAL BOSS"}</h2>
                            <p style="font-size: 1.2em; color: #94a3b8; max-width: 600px; margin: 0 auto 40px auto; line-height: 1.6;">
                                ${data.intro?.subtitle || "Lần này không có thẻ ý. Không có cấu trúc gợi ý. Em phải tự quyết định."}
                            </p>
                            <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 12px; margin-bottom: 40px; border: 1px solid rgba(255,255,255,0.2);">
                                <div style="font-weight: bold; color: #cbd5e1; margin-bottom: 10px; text-transform: uppercase;">Đề bài</div>
                                <div style="font-size: 1.2em; color: white;">"${data.task?.prompt}"</div>
                            </div>
                            <button id="btn-wa-start" class="btn" style="background: #ef4444; color: white; border: none; padding: 15px 50px; font-size: 1.3em; font-weight: bold; border-radius: 30px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4);">
                                ${data.intro?.action?.label || "🚀 Bắt đầu"}
                            </button>
                        </div>
                    </div>
                    
                    <!-- Choose Strategy -->
                    <div id="wa-step-strategy" class="wa-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 10px; letter-spacing: 2px;">BƯỚC 1 / 2</div>
                            <h3 style="font-size: 1.8em; color: #0f172a; margin: 0;">${data.strategy?.title || "Chọn cấu trúc"}</h3>
                        </div>
                        
                        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                            <div style="font-size: 1.2em; font-weight: bold; color: #334155; margin-bottom: 30px;">
                                ${data.strategy?.question || "Em muốn tổ chức đoạn văn như thế nào?"}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                                ${(data.strategy?.options || []).map(opt => `
                                    <button class="btn-wa-opt" data-id="${opt.id}" data-label="${opt.label}" style="width: 100%; max-width: 450px; padding: 18px 25px; border-radius: 12px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; font-size: 1.1em; cursor: pointer; transition: all 0.2s; text-align: left; display: flex; align-items: center; justify-content: space-between;">
                                        <span>${opt.label}</span>
                                        <span style="color: #94a3b8; font-size: 1.2em;">→</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Writing Area -->
                    <div id="wa-step-write" class="wa-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 10px; letter-spacing: 2px;">BƯỚC 2 / 2</div>
                            <h3 style="font-size: 1.8em; color: #0f172a; margin: 0;">${data.writing?.title || "Viết đoạn văn"}</h3>
                        </div>
                        
                        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                            <div style="background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.9em; color: #64748b; font-weight: bold; margin-bottom: 5px;">CHIẾN LƯỢC ĐÃ CHỌN:</div>
                                    <div id="wa-selected-strategy" style="font-weight: bold; color: #2563eb;">...</div>
                                </div>
                                <button id="btn-wa-change" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 15px; color: #475569; font-weight: 500; cursor: pointer;">Đổi</button>
                            </div>
                            
                            <div style="padding: 20px; background: #fefce8; border-bottom: 1px solid #e2e8f0;">
                                <div style="font-weight: bold; color: #854d0e; margin-bottom: 5px;">ĐỀ BÀI:</div>
                                <div style="color: #713f12;">${data.task?.prompt}</div>
                            </div>
                            
                            <div style="padding: 30px;">
                                <textarea id="wa-textarea" placeholder="${data.writing?.editor?.placeholder || 'Bắt đầu viết...'}" style="width: 100%; min-height: 250px; padding: 20px; border: 2px solid #cbd5e1; border-radius: 12px; font-family: inherit; font-size: 1.1em; line-height: 1.6; resize: vertical; outline: none;"></textarea>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                                    <div id="wa-word-count" style="color: #64748b; font-weight: bold;">0 từ</div>
                                    <button id="btn-wa-submit" class="btn btn-primary" style="padding: 12px 40px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
                                        ${data.writing?.submitLabel || "🚀 Nộp bài"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- AI Analysis -->
                    <div id="wa-step-analysis" class="wa-step" style="display: none; animation: fadeIn 0.5s;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h3 style="font-size: 1.8em; color: #0f172a; margin: 0;">${data.aiAnalysis?.title || "AI phân tích"}</h3>
                        </div>
                        
                        <div style="display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap;">
                            <div style="flex: 2; min-width: 300px; background: white; border: 2px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                                <div style="background: #1e293b; padding: 15px 20px; color: white; font-weight: bold; display: flex; justify-content: space-between;">
                                    <span>BÀI LÀM CỦA EM</span>
                                    <span style="color: #94a3b8; font-weight: normal; font-size: 0.9em;">Đã phân tích cấu trúc</span>
                                </div>
                                <div id="wa-analyzed-text" style="padding: 25px; line-height: 1.8; font-size: 1.1em; color: #334155; min-height: 200px;">
                                    <!-- Highlighted text will appear here -->
                                </div>
                            </div>
                            
                            <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 20px;">
                                <div style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                                    <div style="font-weight: bold; color: #0f172a; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">🏆 Hồ sơ kiến trúc sư</div>
                                    <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 15px;">
                                        <li style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="color: #475569;">🧩 Chọn cấu trúc</span>
                                            <span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.9em;">Tốt</span>
                                        </li>
                                        <li style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="color: #475569;">🏗️ Tổ chức ý</span>
                                            <span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.9em;">Tốt</span>
                                        </li>
                                        <li style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="color: #475569;">🎯 Phù hợp mục đích</span>
                                            <span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.9em;">Tốt</span>
                                        </li>
                                    </ul>
                                </div>
                                
                                <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 16px; padding: 25px;">
                                    <div style="font-weight: bold; color: #166534; margin-bottom: 10px;">⭐ NHẬN XÉT</div>
                                    <div style="color: #15803d; line-height: 1.6;">
                                        Em đã vận dụng rất tốt cấu trúc đã chọn. Ý chính rõ ràng, các ý phụ hỗ trợ tốt và mạch lạc.
                                    </div>
                                </div>
                                
                                <button id="wa-done" class="btn btn-primary" style="width: 100%; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1em; background: #10b981; border: none; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">
                                    Hoàn thành Bài học 🎉
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .btn-wa-opt:hover { background: #f8fafc !important; border-color: #3b82f6 !important; transform: translateX(5px); }
                    #wa-textarea:focus { border-color: #3b82f6 !important; }
                </style>
            `;
            this.bindWritingArena(component, data);
            return component;
        }

        if (data.ui && (data.ui.layout === 'simple_builder' || data.ui.layout === 'simple_idea_builder' || data.ui.layout === 'final_boss')) {
            const layout = data.ui.layout;
            const content = data.content || {};

            let builderHtml = '';
            let brainstormHtml = '';
            let progressHtml = '';

            if (layout === 'final_boss' && data.ui.progress) {
                progressHtml = `
                    <div class="challenge-progress" style="display: flex; justify-content: center; gap: 40px; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                        ${data.ui.progress.map((p, i) => `
                            <div class="c-progress-node node-${i} ${i === 0 ? 'active' : ''}" style="display: flex; align-items: center; gap: 10px; opacity: ${i === 0 ? '1' : '0.5'}; transition: all 0.3s;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${i === 0 ? '#ef4444' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${i + 1}</div>
                                <div style="font-weight: bold; color: ${i === 0 ? '#1e293b' : '#64748b'};">${p}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            let seedIdeaHtml = '';
            if (content.seedIdea) {
                seedIdeaHtml = `
                    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                        <div style="font-weight: bold; color: #475569; margin-bottom: 10px;">💡 Ý cần phát triển</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b;">${content.seedIdea.text}</div>
                    </div>
                `;
            }

            // Brainstorm view for final boss step 1
            if (layout === 'final_boss') {
                brainstormHtml = `
                    <div class="boss-step-1" style="display: block; animation: fadeIn 0.4s;">
                        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
                            <h3 style="color: #475569; margin-top: 0;">Kho ý tưởng của em</h3>
                            <div style="display: flex; gap: 10px; max-width: 500px; margin: 0 auto 30px auto;">
                                <input type="text" id="boss-idea-input" placeholder="Viết một ý tưởng..." style="flex: 1; padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 1.05em; outline: none;">
                                <button id="btn-boss-add" class="btn" style="background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 8px; font-weight: bold;">Thêm</button>
                            </div>
                            <div id="boss-ideas-container" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; min-height: 100px;">
                                <div class="empty-state" style="color: #94a3b8; font-style: italic; width: 100%; align-self: center;">Chưa có ý tưởng nào. Hãy thêm một vài ý!</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <button id="btn-boss-next" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px; background: #ef4444; border: none;">Xây dàn ý →</button>
                        </div>
                    </div>
                `;
            }

            // Builder view
            const sections = layout === 'final_boss' ? (content.workflow?.step_02?.workspace?.sections || []) :
                (content.workspace?.sections || content.builder?.sections || []);
            builderHtml = `
                <div class="${layout === 'final_boss' ? 'boss-step-2' : 'simple-builder'}" style="display: ${layout === 'final_boss' ? 'none' : 'block'}; animation: fadeIn 0.4s;">
                    <div style="display: flex; gap: 20px;">
                        ${layout === 'final_boss' ? `
                            <div class="boss-ideas-pool-col" style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; max-height: 500px; overflow-y: auto;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px; position: sticky; top: 0; background: #f8fafc; padding-bottom: 10px;">Ý tưởng đã tìm:</div>
                                <div id="boss-pool" style="display: flex; flex-direction: column; gap: 10px; min-height: 200px;"></div>
                            </div>
                        ` : ''}
                        
                        <div style="flex: 2; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                ${sections.map(sec => `
                                    <div class="builder-section" data-section="${sec.id}" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                                        <div style="background: #f1f5f9; padding: 10px 15px; font-weight: bold; color: #334155;">
                                            ${sec.title}
                                        </div>
                                        <div class="section-slots" style="padding: 15px; background: #fafafa; display: flex; flex-direction: column; gap: 10px; min-height: 60px;">
                                            ${(layout === 'simple_builder' || layout === 'simple_idea_builder') ? `
                                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                                    <input type="text" class="simple-idea-input" placeholder="${content.workspace?.sections?.[0]?.placeholder || 'Thêm ý vào phần này...'}" style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none;">
                                                    <button class="btn btn-simple-add" style="background: #e2e8f0; color: #475569; border: none; padding: 0 15px; border-radius: 6px; font-weight: bold; cursor: pointer;">+</button>
                                                </div>
                                            ` : ''}
                                            <div class="slots-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button id="btn-submit-builder" class="btn btn-primary" style="padding: 15px 40px; font-size: 1.2em; border-radius: 30px; font-weight: bold; background: ${isBoss ? '#ef4444' : '#3b82f6'}; border: none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
                            ${data.ui.submit || "Nộp bài"}
                        </button>
                    </div>
                </div>
            `;

            component.innerHTML = `
                <div class="component-header" style="text-align: center; margin-bottom: 25px;">
                    <h2 class="question-title" style="font-size: 2em; color: ${isBoss ? '#b91c1c' : '#0f172a'}; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        ${promptText ? `${isBoss ? '🔥' : '🎯'} ${promptText}` : ''}
                    </h2>
                    ${content.task ? `
                        <div style="color: #1e293b; font-size: 1.15em; max-width: 700px; margin: 0 auto; background: ${isBoss ? '#fef2f2' : '#f8fafc'}; padding: 20px; border-radius: 12px; border: 2px dashed ${isBoss ? '#fca5a5' : '#cbd5e1'};">
                            <strong style="color: ${isBoss ? '#991b1b' : '#334155'};">Đề bài:</strong> 
                            <span style="font-weight: 500;">${content.task.prompt}</span>
                            ${content.task.instruction ? `
                                <div style="margin-top: 10px; font-size: 0.9em; color: #64748b; font-style: italic;">
                                    👉 ${content.task.instruction}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="builder-workspace" style="max-width: 900px; margin: 0 auto;">
                    ${progressHtml}
                    ${seedIdeaHtml}
                    ${brainstormHtml}
                    ${builderHtml}
                </div>
                
                <!-- AI Evaluation Modal -->
                <div id="ai-evaluation-modal" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.8); z-index: 1000; align-items: center; justify-content: center;">
                    <div style="background: white; width: 90%; max-width: 600px; border-radius: 16px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 1.5em; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
                            🤖 Đánh giá từ AI
                        </h3>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <div style="font-size: 4em; margin-bottom: 10px;">${isBoss ? '🏆' : '🌟'}</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #15803d;">Tuyệt vời! Dàn ý rất chắc chắn.</div>
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <div style="font-weight: bold; margin-bottom: 15px; color: #334155;">Chi tiết tiêu chí:</div>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${(data.evaluation?.criteria || []).map(c => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px; border-radius: 8px;">
                                        <span>${typeof c === 'string' ? c : c.label}</span>
                                        <span style="color: #166534; font-weight: bold;">✅ Đạt</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <button id="btn-close-modal" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px;">
                                Hoàn thành bài học
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .b-idea-card { animation: popIn 0.3s; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 15px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: move; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                    .b-idea-card.dragging { opacity: 0.5; transform: scale(1.02); border-color: #3b82f6; }
                    .section-slots.drag-over { background: #eff6ff !important; border-color: #3b82f6 !important; }
                    @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                </style>
            `;

            this.bindBuilder(component, data, layout);
            return component;
        }

        // Old legacy layout
        component.innerHTML = `
            <div class="component-header" style="text-align: center; margin-bottom: 25px;">
                <h2 class="question-title" style="font-size: 2em; color: ${isBoss ? '#b91c1c' : '#0f172a'}; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    ${promptText ? `${isBoss ? '🔥' : '🎯'} ${promptText}` : ''}
                </h2>
                ${data.task ? `
                    <div style="color: #1e293b; font-size: 1.15em; max-width: 700px; margin: 0 auto; background: ${isBoss ? '#fef2f2' : '#f8fafc'}; padding: 20px; border-radius: 12px; border: 2px dashed ${isBoss ? '#fca5a5' : '#cbd5e1'};">
                        <strong style="color: ${isBoss ? '#991b1b' : '#334155'};">Đề bài:</strong> 
                        <span style="font-weight: 500;">${data.task.prompt}</span>
                        <div style="margin-top: 10px; font-size: 0.9em; color: #64748b; font-style: italic;">
                            👉 ${data.task.instruction}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="brainstorm-board" style="background: #f1f5f9; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; min-height: 400px; display: flex; flex-direction: column;">
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="new-idea-input" placeholder="Nhập một ý tưởng mới..." style="flex: 1; padding: 12px 15px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 1.05em; outline: none; transition: border-color 0.2s;">
                    <button id="btn-add-idea" class="btn" style="background: #3b82f6; color: white; border: none; padding: 0 25px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        + Thêm ý
                    </button>
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="background: #1e293b; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        🌟 Chủ đề: ${data.workspace?.center?.text || "Chủ đề"}
                    </span>
                </div>
                
                <div id="ideas-container" style="flex: 1; display: flex; flex-wrap: wrap; gap: 15px; align-content: flex-start;">
                    <!-- Ideas will be added here -->
                    <div class="empty-state" style="width: 100%; text-align: center; color: #94a3b8; font-style: italic; margin-top: 40px;">
                        Bảng đang trống. Hãy nhập ý tưởng của em vào ô bên trên!
                    </div>
                </div>
                
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button id="btn-submit-challenge" class="btn btn-primary" style="padding: 15px 40px; font-size: 1.2em; border-radius: 30px; font-weight: bold; background: ${isBoss ? '#ef4444' : '#3b82f6'}; border: none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
                    ${data.submission?.action?.text || "Hoàn thành"}
                </button>
            </div>
            
            <!-- AI Evaluation Modal (Hidden by default) -->
            <div id="ai-evaluation-modal" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.8); z-index: 1000; align-items: center; justify-content: center;">
                <div style="background: white; width: 90%; max-width: 600px; border-radius: 16px; padding: 30px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto;">
                    <h3 style="margin-top: 0; color: #1e293b; font-size: 1.5em; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
                        🤖 Đánh giá từ AI
                    </h3>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 4em; margin-bottom: 10px;">🏆</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: #15803d;">Tuyệt vời! Em đã hoàn thành xuất sắc.</div>
                        <div style="color: #475569; margin-top: 10px;">Em đã có thể tự tìm, chọn và tổ chức ý tưởng.</div>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <div style="font-weight: bold; margin-bottom: 15px; color: #334155;">Chi tiết tiêu chí:</div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${(data.aiEvaluation?.criteria || data.aiReview?.criteria || []).map(c => `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px; border-radius: 8px;">
                                    <span>${c.label}</span>
                                    <span style="color: #166534; font-weight: bold;">✅ Tốt</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button id="btn-close-modal" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px;">
                            Tiếp tục bài học →
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                #new-idea-input:focus { border-color: #3b82f6 !important; }
                .idea-card { animation: popIn 0.3s; }
                @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            </style>
        `;

        this.bind(component, data);
        return component;
    }

    static bindBuilder(component, data, layout) {
        const modal = component.querySelector("#ai-evaluation-modal");
        const btnCloseModal = component.querySelector("#btn-close-modal");
        const btnSubmit = component.querySelector("#btn-submit-builder");

        let ideasCount = 0;

        const createIdeaNode = (text) => {
            const el = document.createElement('div');
            el.className = 'b-idea-card';
            el.setAttribute('draggable', 'true');
            el.innerHTML = `
                <span style="color: #334155; font-weight: 500;">${text}</span>
                <span class="delete-btn" style="color: #ef4444; cursor: pointer; font-weight: bold; font-size: 1.2em;" title="Xóa">×</span>
            `;
            el.querySelector('.delete-btn').addEventListener('click', () => {
                el.remove();
            });
            return el;
        };

        if (layout === 'final_boss') {
            const input = component.querySelector('#boss-idea-input');
            const btnAdd = component.querySelector('#btn-boss-add');
            const container = component.querySelector('#boss-ideas-container');
            const btnNext = component.querySelector('#btn-boss-next');

            const addBossIdea = () => {
                const text = input.value.trim();
                if (!text) return;

                if (ideasCount === 0) {
                    const empty = container.querySelector('.empty-state');
                    if (empty) empty.remove();
                }

                container.appendChild(createIdeaNode(text));
                input.value = '';
                input.focus();
                ideasCount++;
            };

            btnAdd.addEventListener('click', addBossIdea);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addBossIdea();
            });

            btnNext.addEventListener('click', () => {
                if (ideasCount === 0) {
                    alert("Hãy tìm ít nhất một ý tưởng trước khi qua bước Xây dàn ý!");
                    return;
                }

                // Move ideas to pool
                const pool = component.querySelector('#boss-pool');
                const ideas = container.querySelectorAll('.b-idea-card');
                ideas.forEach(idea => pool.appendChild(idea));

                // Switch view
                component.querySelector('.boss-step-1').style.display = 'none';
                component.querySelector('.boss-step-2').style.display = 'block';

                // Update progress
                const p1 = component.querySelector('.node-0');
                const p2 = component.querySelector('.node-1');
                if (p1 && p2) {
                    p1.style.opacity = '0.5';
                    p1.querySelector('div').style.background = '#cbd5e1';
                    p2.style.opacity = '1';
                    p2.querySelector('div').style.background = '#ef4444';
                }
            });

            // Setup drag and drop for pool -> slots
            const slots = component.querySelectorAll('.section-slots');
            slots.forEach(slot => {
                slot.addEventListener('dragover', e => {
                    e.preventDefault();
                    slot.classList.add('drag-over');
                });
                slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
                slot.addEventListener('drop', e => {
                    e.preventDefault();
                    slot.classList.remove('drag-over');
                    const dragged = document.querySelector('.b-idea-card.dragging');
                    if (dragged) {
                        slot.querySelector('.slots-container').appendChild(dragged);
                    }
                });
            });

            // pool is also a dropzone to put ideas back
            const poolZone = component.querySelector('#boss-pool');
            if (poolZone) {
                poolZone.addEventListener('dragover', e => e.preventDefault());
                poolZone.addEventListener('drop', e => {
                    e.preventDefault();
                    const dragged = document.querySelector('.b-idea-card.dragging');
                    if (dragged) poolZone.appendChild(dragged);
                });
            }

            document.addEventListener('dragstart', e => {
                if (e.target.classList && e.target.classList.contains('b-idea-card')) {
                    setTimeout(() => e.target.classList.add('dragging'), 0);
                }
            });

            document.addEventListener('dragend', e => {
                if (e.target.classList && e.target.classList.contains('b-idea-card')) {
                    e.target.classList.remove('dragging');
                }
            });

        } else if (layout === 'simple_builder' || layout === 'simple_idea_builder') {
            const sections = component.querySelectorAll('.builder-section');
            sections.forEach(sec => {
                const input = sec.querySelector('.simple-idea-input');
                if (!input) return; // sometimes simple_idea_builder might not have input if we didn't render it

                const btnAdd = sec.querySelector('.btn-simple-add');
                const container = sec.querySelector('.slots-container');

                const addSimpleIdea = () => {
                    const text = input.value.trim();
                    if (!text) return;
                    const node = createIdeaNode(text);
                    node.removeAttribute('draggable'); // simple mode doesn't need D&D
                    node.style.cursor = 'default';
                    container.appendChild(node);
                    input.value = '';
                    input.focus();
                };

                btnAdd.addEventListener('click', addSimpleIdea);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') addSimpleIdea();
                });
            });
        }

        btnSubmit.addEventListener("click", () => {
            if (data.ui?.confirmBeforeSubmit || layout === 'final_boss') {
                if (!confirm(`Em có chắc chắn nộp dàn ý này không?`)) {
                    return;
                }
            }
            modal.style.display = 'flex';
        });

        btnCloseModal.addEventListener("click", () => {
            modal.style.display = 'none';
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }

    static bind(component, data) {
        const input = component.querySelector("#new-idea-input");
        const btnAdd = component.querySelector("#btn-add-idea");
        const container = component.querySelector("#ideas-container");
        const btnSubmit = component.querySelector("#btn-submit-challenge");
        const modal = component.querySelector("#ai-evaluation-modal");
        const btnCloseModal = component.querySelector("#btn-close-modal");

        let ideasCount = 0;

        const addIdea = () => {
            const text = input.value.trim();
            if (!text) return;

            if (ideasCount === 0) {
                const emptyState = container.querySelector(".empty-state");
                if (emptyState) emptyState.remove();
            }

            const ideaId = 'idea_' + Date.now();
            const ideaEl = document.createElement('div');
            ideaEl.className = 'idea-card';
            ideaEl.style.cssText = `
                background: white; border: 2px solid #bae6fd; border-radius: 8px; padding: 12px 20px; 
                display: flex; align-items: center; gap: 10px; cursor: move; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            `;
            ideaEl.innerHTML = `
                <span style="color: #0284c7; font-weight: 500;">${text}</span>
                <span class="delete-btn" style="color: #ef4444; cursor: pointer; font-weight: bold; margin-left: 10px;" title="Xóa">×</span>
            `;

            ideaEl.querySelector('.delete-btn').addEventListener('click', () => {
                ideaEl.remove();
                ideasCount--;
                if (ideasCount === 0) {
                    container.innerHTML = '<div class="empty-state" style="width: 100%; text-align: center; color: #94a3b8; font-style: italic; margin-top: 40px;">Bảng đang trống. Hãy nhập ý tưởng của em vào ô bên trên!</div>';
                }
            });

            container.appendChild(ideaEl);
            input.value = '';
            input.focus();
            ideasCount++;
        };

        btnAdd.addEventListener("click", addIdea);
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") addIdea();
        });

        btnSubmit.addEventListener("click", () => {
            const existingError = component.querySelector('.chal-inline-error');
            if (existingError) existingError.remove();

            if (ideasCount === 0) {
                const errDiv = document.createElement('div');
                errDiv.className = 'chal-inline-error';
                errDiv.style.cssText = 'color: #ef4444; background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 600; animation: fadeIn 0.3s;';
                errDiv.innerText = "Em cần nhập ít nhất 1 ý tưởng trước khi hoàn thành!";
                btnSubmit.parentNode.insertBefore(errDiv, btnSubmit);
                return;
            }

            if (data.submission?.confirm?.enabled) {
                if (!confirm(`${data.submission.confirm.title}\n${data.submission.confirm.message}`)) {
                    return;
                }
            }

            // Show AI Evaluation Mockup
            modal.style.display = 'flex';
        });

        btnCloseModal.addEventListener("click", () => {
            modal.style.display = 'none';
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }

    static bindStrategyBuilder(component, data) {
        const stepStrategy = component.querySelector('#c-step-strategy');
        const stepReason = component.querySelector('#c-step-reason');
        const stepBuild = component.querySelector('#c-step-build');
        const stepFeedback = component.querySelector('#c-step-feedback');

        let selectedStrategy = '';
        let selectedStrategyLabel = '';

        // Step 1: Strategy Selection
        const strategyOpts = component.querySelectorAll('.btn-strategy-opt');
        const btnToReason = component.querySelector('#btn-to-reason');

        strategyOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                strategyOpts.forEach(b => {
                    b.style.borderColor = '#cbd5e1';
                    b.style.background = 'white';
                    b.innerHTML = b.innerHTML.replace(' ✓', '');
                });
                btn.style.borderColor = '#3b82f6';
                btn.style.background = '#f8fafc';
                btn.innerHTML += ' <span style="color: #3b82f6; float: right;">✓</span>';

                selectedStrategy = btn.dataset.id;
                selectedStrategyLabel = btn.innerText.replace(' ✓', '');
                btnToReason.style.display = 'inline-block';
            });
        });

        btnToReason.addEventListener('click', () => {
            component.querySelector('#c-selected-strategy').innerText = selectedStrategyLabel;
            component.querySelector('#c-build-strategy').innerText = selectedStrategyLabel;
            component.querySelector('#c-feedback-strategy').innerText = selectedStrategyLabel;

            stepStrategy.style.display = 'none';
            stepReason.style.display = 'block';
        });

        // Step 2: Reasoning
        const reasonText = component.querySelector('#c-reason-text');
        const btnToBuild = component.querySelector('#btn-to-build');
        
        let selectedReason = null;
        ChoiceBuilder.bind(stepReason, (val) => {
            selectedReason = val;
        });

        btnToBuild.addEventListener('click', () => {
            let hasReason = false;
            if (selectedReason) hasReason = true;
            if (reasonText && reasonText.value.trim() !== '') hasReason = true;

            if (!hasReason && component.querySelector('.choice-options')) {
                alert('Em hãy chọn một lý do hoặc tự giải thích nhé!');
                return;
            }

            stepReason.style.display = 'none';
            stepBuild.style.display = 'block';
        });

        // Step 3: Build
        const btnAddSentenceList = component.querySelectorAll('.btn-add-sentence');

        btnAddSentenceList.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const text = input.value.trim();
                if (text) {
                    const list = btn.closest('.c-build-section').querySelector('.c-sentence-list');
                    const div = document.createElement('div');
                    div.style.cssText = 'background: white; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;';
                    div.innerHTML = `<span>${text}</span> <span style="color: #ef4444; cursor: pointer; font-weight: bold;" onclick="this.parentElement.remove()">×</span>`;
                    list.appendChild(div);
                    input.value = '';
                }
            });
        });

        component.querySelector('#btn-to-feedback').addEventListener('click', () => {
            let hasSentences = false;
            component.querySelectorAll('.c-sentence-list').forEach(list => {
                if (list.children.length > 0) hasSentences = true;
            });

            if (!hasSentences) {
                alert('Em cần viết ít nhất một câu cho đoạn văn của mình!');
                return;
            }

            stepBuild.style.display = 'none';
            stepFeedback.style.display = 'block';
        });

        // Step 4: Feedback
        component.querySelector('#c-done').addEventListener('click', () => {
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }

    static bindWritingArena(component, data) {
        const stepIntro = component.querySelector('#wa-step-intro');
        const stepStrategy = component.querySelector('#wa-step-strategy');
        const stepWrite = component.querySelector('#wa-step-write');
        const stepAnalysis = component.querySelector('#wa-step-analysis');

        // Intro
        component.querySelector('#btn-wa-start').addEventListener('click', () => {
            stepIntro.style.display = 'none';
            stepStrategy.style.display = 'block';
        });

        // Strategy
        let selectedStrategyLabel = '';
        const strategyOpts = component.querySelectorAll('.btn-wa-opt');
        strategyOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedStrategyLabel = btn.dataset.label;
                component.querySelector('#wa-selected-strategy').innerText = selectedStrategyLabel;

                stepStrategy.style.display = 'none';
                stepWrite.style.display = 'block';
            });
        });

        component.querySelector('#btn-wa-change').addEventListener('click', () => {
            stepWrite.style.display = 'none';
            stepStrategy.style.display = 'block';
        });

        // Write
        const textarea = component.querySelector('#wa-textarea');
        const wordCount = component.querySelector('#wa-word-count');
        const btnSubmit = component.querySelector('#btn-wa-submit');

        textarea.addEventListener('input', () => {
            const text = textarea.value.trim();
            const count = text ? text.split(/\s+/).length : 0;
            wordCount.innerText = `${count} từ`;
        });

        btnSubmit.addEventListener('click', () => {
            const text = textarea.value.trim();
            const count = text ? text.split(/\s+/).length : 0;

            if (count < (data.writing?.editor?.minWords || 10)) {
                alert(`Đoạn văn của em hơi ngắn (${count} từ). Hãy viết chi tiết hơn một chút nhé!`);
                return;
            }

            // Generate mock analyzed text
            const analyzedText = text.split('. ').map((s, i) => {
                if (!s) return '';
                if (i === 0) return `<span style="background: #fef08a; padding: 2px 5px; border-radius: 4px; border-bottom: 2px solid #ca8a04;">${s}</span>`; // Topic sentence
                return `<span>${s}</span>`;
            }).join('. ');

            component.querySelector('#wa-analyzed-text').innerHTML = analyzedText + '.';

            stepWrite.style.display = 'none';
            stepAnalysis.style.display = 'block';
        });

        // Analysis Done
        component.querySelector('#wa-done').addEventListener('click', () => {
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }

    static validator = {
        name: "NullValidator",
        validate: () => ({ valid: true, score: 1, maxScore: 1 })
    };

    static getValidator(step) {
        if (step) {
            const data = step.data || step;
            if (data.ui && data.ui.layout === 'single_choice') {
                return Choice.getValidator();
            }
        }
        return this.validator;
    }
}

export default Challenge;
