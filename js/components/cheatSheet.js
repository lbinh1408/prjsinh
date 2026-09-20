/**
 * ==========================================================
 * TS10 Learning Platform
 * components/cheatSheet.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class CheatSheet {

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component cheat-sheet-component";
        
        if (data.ui && data.ui.component === 'card_list') {
            const ui = data.ui;
            const items = data.items || [];
            
            component.innerHTML = `
                <style>
                    .cs-cl-wrapper { padding: 20px; max-width: 700px; margin: 0 auto; font-family: 'Inter', sans-serif; }
                    .cs-cl-header { text-align: center; margin-bottom: 30px; }
                    .cs-cl-title { font-size: 2.2rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
                    
                    .cs-cl-container { background: white; border: 2px solid #e2e8f0; border-radius: 20px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 30px; display: flex; flex-direction: column; gap: 15px; position: relative; }
                    
                    /* Vertical line */
                    .cs-cl-container::before { content: ''; position: absolute; left: 45px; top: 40px; bottom: 40px; width: 4px; background: #e2e8f0; z-index: 0; }
                    
                    .cs-cl-item { position: relative; z-index: 1; display: flex; align-items: center; gap: 20px; background: white; padding: 15px; border-radius: 12px; transition: transform 0.2s; }
                    .cs-cl-item:hover { transform: translateX(5px); background: #f8fafc; }
                    
                    .cs-cl-icon { font-size: 1.8rem; width: 50px; height: 50px; background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    .cs-cl-content { flex: 1; border-left: 2px solid transparent; padding-left: 10px; }
                    .cs-cl-item-title { font-weight: 800; color: #1e293b; font-size: 1.2rem; margin-bottom: 5px; }
                    .cs-cl-item-q { color: #64748b; font-size: 1.05rem; }
                    
                    .cs-cl-msg { margin-top: 20px; padding: 15px; border-radius: 12px; background: #eff6ff; color: #1d4ed8; text-align: center; font-weight: 600; font-size: 1.1rem; }
                    .cs-cl-note { margin-top: 15px; padding: 15px; border-radius: 12px; background: #fef3c7; color: #b45309; font-size: 0.95rem; font-style: italic; text-align: center; }
                    
                    .cs-cl-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 30px; }
                    .cs-cl-btn { border: 0; font-weight: bold; border-radius: 99px; padding: 14px 30px; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; }
                    .cs-cl-btn-outline { background: white; color: #475569; border: 2px solid #cbd5e1; }
                    .cs-cl-btn-outline:hover { border-color: #94a3b8; background: #f8fafc; }
                    .cs-cl-btn-primary { background: #6d5dfc; color: white; border: 2px solid #6d5dfc; }
                    .cs-cl-btn-primary:hover { background: #5b4be8; border-color: #5b4be8; }
                </style>
                
                <div class="cs-cl-wrapper">
                    <div class="cs-cl-header">
                        ${promptText ? `<div class="cs-cl-title">📜 ${promptText}</div>` : ''}
                    </div>
                    
                    <div class="cs-cl-container">
                        ${items.map(it => `
                            <div class="cs-cl-item">
                                <div class="cs-cl-icon">${it.icon || '📌'}</div>
                                <div class="cs-cl-content">
                                    <div class="cs-cl-item-title">${it.title}</div>
                                    <div class="cs-cl-item-q">${it.question || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                        
                        ${data.keyMessage ? `<div class="cs-cl-msg">${data.keyMessage}</div>` : ''}
                        ${data.note ? `<div class="cs-cl-note">Lưu ý: ${data.note}</div>` : ''}
                    </div>
                    
                    <div class="cs-cl-actions">
                        ${ui.actions && ui.actions.includes('save') ? `<button class="cs-cl-btn cs-cl-btn-outline">🔖 Lưu Card</button>` : ''}
                        ${ui.actions && ui.actions.includes('download') ? `<button class="cs-cl-btn cs-cl-btn-outline">⬇️ Tải về</button>` : ''}
                        <button class="cs-cl-btn cs-cl-btn-primary" id="btn-cl-next">${data.practiceButton?.label || 'Tiếp tục →'}</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const btnNext = component.querySelector('#btn-cl-next');
                if (btnNext) {
                    btnNext.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                }
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'decision_card' && data.card) {
            const ui = data.ui;
            const cards = data.card || [];
            
            component.innerHTML = `
                <style>
                    .cs-dc-wrapper { padding: 20px 0; max-width: 800px; margin: 0 auto; text-align: center; }
                    .cs-dc-hero { margin-bottom: 30px; }
                    .cs-dc-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                    .cs-dc-hero h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 10px; }
                    
                    .cs-dc-container { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 30px; }
                    .cs-dc-row { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px; font-size: 1.2rem; }
                    .cs-dc-question { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 12px; font-weight: bold; color: #475569; width: 300px; text-align: center; }
                    .cs-dc-arrow { color: #94a3b8; font-weight: bold; font-size: 1.5rem; }
                    .cs-dc-answer { background: #eef2ff; border: 2px solid #a5b4fc; padding: 15px 20px; border-radius: 12px; font-weight: bold; color: #4338ca; width: 200px; text-align: center; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1); }
                    
                    .cs-dc-note { margin-top: 30px; padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; color: #b45309; font-weight: bold; }
                    
                    .cs-dc-actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
                    .cs-dc-btn { border: 0; font-weight: bold; border-radius: 99px; padding: 14px 24px; cursor: pointer; font-size: 1.1rem; transition: all 0.2s; }
                    .cs-dc-btn-soft { background: #e2e8f0; color: #475569; }
                    .cs-dc-btn-soft:hover { background: #cbd5e1; }
                    .cs-dc-btn-primary { background: #6d5dfc; color: white; }
                    .cs-dc-btn-primary:hover { background: #5b4be8; }
                </style>
                
                <div class="cs-dc-wrapper">
                    <div class="cs-dc-hero">
                        <div class="emoji">🗺️</div>
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                    </div>
                    
                    <div class="cs-dc-container">
                        ${cards.map(c => `
                            <div class="cs-dc-row">
                                <div class="cs-dc-question">${c.question}</div>
                                <div class="cs-dc-arrow">→</div>
                                <div class="cs-dc-answer">${c.answer}</div>
                            </div>
                        `).join('')}
                        
                        ${data.note ? `<div class="cs-dc-note">${data.note}</div>` : ''}
                    </div>
                    
                    <div class="cs-dc-actions">
                        ${ui.saveButton ? `<button class="cs-dc-btn cs-dc-btn-soft">🔖 Lưu Card</button>` : ''}
                        ${ui.downloadButton ? `<button class="cs-dc-btn cs-dc-btn-soft">⬇️ Tải về</button>` : ''}
                        ${ui.practiceButton ? `<button class="cs-dc-btn cs-dc-btn-primary" id="cs-btn-next">🏆 Thử thách cuối →</button>` : ''}
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const btnNext = component.querySelector('#cs-btn-next');
                if (btnNext) {
                    btnNext.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                } else {
                    // if no next button, just mark completed
                    component.dataset.completed = "true";
                }
            }, 0);
            
            return component;
        }

        if (data.ui && (data.ui.layout === 'simple' || data.ui.layout === 'card')) {
            const cheat = data.ui || data.data || {};
            const items = cheat.items || data.items || [];
            
            component.innerHTML = `
                <style>
                    .cs-simple-wrapper { padding: 20px 0; }
                    .cs-simple-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .cs-simple-wrapper h2 { font-size: 29px; margin-bottom: 20px; color: #172033; }
                    .cs-simple-wrapper .cheat { padding: 32px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 20px; }
                    .cs-simple-wrapper .cheat h2 { text-align: center; color: #172033; margin-bottom: 20px; font-size: 24px; }
                    .cs-simple-wrapper .ci { display: flex; gap: 15px; margin-bottom: 15px; font-size: 18px; color: #172033; }
                    .cs-simple-wrapper .ci b { color: #5b4be8; min-width: 100px; }
                    .cs-simple-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
                    .cs-simple-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                    .cs-simple-wrapper .soft { background: #eef0f5; color: #172033; }
                    .cs-simple-wrapper .primary { background: #6d5dfc; color: #fff; }
                    .cs-simple-wrapper .primary:hover { background: #5b4be8; }
                </style>
                <div class="cs-simple-wrapper">
                    <div class="ey">❽ CHEAT SHEET</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    
                    <div class="cheat">
                        <h2>${cheat.title || ''}</h2>
                        ${items.map(item => `
                            <div class="ci"><b>${item.title || item.label || ''}</b><span>${item.text || item.description || ''}</span></div>
                        `).join('')}
                        <p style="text-align:center; margin-top: 25px;"><b>${cheat.subtitle || ''}</b></p>
                    </div>
                    
                    <div class="btns">
                        <button class="btn soft">🔖 Lưu</button>
                        <button class="btn soft">⬇️ Tải</button>
                        <button class="btn primary" id="cs-btn-next">🏆 Final Boss →</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const btnNext = component.querySelector('#cs-btn-next');
                btnNext.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                });
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'connection_card') {
            const methods = data.methods || [];
            const testQ = data.testQuestion;
            
            let html = `
                <div class="connection-card-container" style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                        <h1 style="margin: 0 0 10px 0; color: #0f172a; font-size: 1.8em; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            ${promptText || ''}
                        </h1>
                    </div>
                    
                    <div class="cs-methods-list" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px;">
            `;
            
            methods.forEach((m, idx) => {
                html += `
                    <div class="cs-method-card" style="border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #f8fafc; transition: border-color 0.2s;">
                        <div style="padding: 15px 20px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 1.5em; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${m.icon}</div>
                                <div>
                                    <div style="font-weight: bold; font-size: 1.1em; color: #1e293b; margin-bottom: 4px;">${m.name}</div>
                                    <div style="color: #64748b; font-size: 0.95em;">${m.shortRule}</div>
                                </div>
                            </div>
                            <button class="cs-btn-example" data-idx="${idx}" style="background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; color: #3b82f6; cursor: pointer; transition: all 0.2s;">
                                Ví dụ →
                            </button>
                        </div>
                        
                        <div class="cs-example-panel" id="cs-ex-${idx}" style="display: none; padding: 15px 20px; background: white; border-top: 1px dashed #cbd5e1;">
                            <div style="color: #475569; font-style: italic; line-height: 1.5;">${m.example}</div>
                            <div style="text-align: right; margin-top: 10px;">
                                <button class="cs-btn-close-example" data-idx="${idx}" style="background: transparent; border: none; color: #94a3b8; font-size: 0.85em; cursor: pointer;">Thu gọn ↑</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
            `;
            
            if (data.diagnostic || testQ) {
                html += `
                    <div style="background: #fffbeb; border: 2px dashed #fcd34d; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                        <div style="font-weight: bold; color: #b45309; font-size: 1.1em; margin-bottom: 15px;">
                            ${data.diagnostic?.icon || '⭐'} ${data.diagnostic?.title || 'CÂU SAU ĐANG DỰA VÀO CÂU TRƯỚC BẰNG CÁCH NÀO?'}
                        </div>
                        <button id="cs-btn-test" style="background: #f59e0b; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-weight: bold; font-size: 1.05em; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.4); transition: transform 0.2s;">
                            🛠️ THỬ KIỂM TRA
                        </button>
                    </div>
                `;
            }
            
            html += `
                    <div style="display: flex; gap: 15px; justify-content: center; border-top: 2px solid #f1f5f9; padding-top: 25px;">
                        <button class="btn btn-outline" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; cursor: pointer;">🔖 Lưu</button>
                        <button class="btn btn-outline" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; cursor: pointer;">⬇️ Tải</button>
                        <button id="cs-next-conn" class="btn btn-primary" style="padding: 10px 30px; border-radius: 8px; background: #3b82f6; color: white; border: none; font-weight: bold; cursor: pointer;">Tiếp tục →</button>
                    </div>
                </div>
            `;
            
            if (testQ) {
                html += `
                    <div id="cs-test-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                        <div style="background: white; border-radius: 16px; width: 90%; max-width: 500px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: popIn 0.3s ease-out;">
                            <div style="background: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-weight: bold; color: #334155; font-size: 1.1em;">🛠️ THỬ KIỂM TRA</div>
                                <button id="cs-close-modal" style="background: transparent; border: none; font-size: 1.5em; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
                            </div>
                            
                            <div style="padding: 30px 25px;">
                                <div style="font-size: 1.15em; color: #1e293b; line-height: 1.6; margin-bottom: 25px; padding: 15px; background: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0;">
                                    ${testQ.text}
                                </div>
                                
                                <div class="cs-test-options" style="display: flex; flex-wrap: wrap; gap: 10px;">
                                    ${testQ.options.map(opt => `
                                        <button class="cs-test-opt-btn" data-id="${opt.id}" style="flex: 1; min-width: 45%; padding: 12px; background: white; border: 2px solid #e2e8f0; border-radius: 8px; font-weight: bold; color: #475569; cursor: pointer; transition: all 0.2s;">
                                            ${opt.label}
                                        </button>
                                    `).join('')}
                                </div>
                                
                                <div id="cs-test-feedback" style="display: none; margin-top: 20px; text-align: center; font-weight: bold; font-size: 1.1em; padding: 15px; border-radius: 8px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <style>
                        @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                        .cs-test-opt-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
                        .cs-test-opt-btn.selected-correct { background: #f0fdf4 !important; border-color: #22c55e !important; color: #15803d !important; }
                        .cs-test-opt-btn.selected-wrong { background: #fef2f2 !important; border-color: #ef4444 !important; color: #b91c1c !important; }
                    </style>
                `;
            }
            
            component.innerHTML = html;
            
            // Bindings
            setTimeout(() => {
                // Expand / Collapse examples
                const exampleBtns = component.querySelectorAll('.cs-btn-example');
                exampleBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = e.target.dataset.idx;
                        const panel = component.querySelector('#cs-ex-' + idx);
                        const card = panel.closest('.cs-method-card');
                        
                        if (panel.style.display === 'none') {
                            panel.style.display = 'block';
                            e.target.style.display = 'none'; // hide 'Ví dụ ->'
                            card.style.borderColor = '#3b82f6';
                        }
                    });
                });
                
                const closeExBtns = component.querySelectorAll('.cs-btn-close-example');
                closeExBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = e.target.dataset.idx;
                        const panel = component.querySelector('#cs-ex-' + idx);
                        const openBtn = component.querySelector('.cs-btn-example[data-idx="' + idx + '"]');
                        const card = panel.closest('.cs-method-card');
                        
                        panel.style.display = 'none';
                        openBtn.style.display = 'block';
                        card.style.borderColor = '#e2e8f0';
                    });
                });
                
                // Modal Logic
                if (testQ) {
                    const testBtn = component.querySelector('#cs-btn-test');
                    const modal = component.querySelector('#cs-test-modal');
                    const closeBtn = component.querySelector('#cs-close-modal');
                    const optBtns = component.querySelectorAll('.cs-test-opt-btn');
                    const feedback = component.querySelector('#cs-test-feedback');
                    
                    testBtn.addEventListener('click', () => {
                        modal.style.display = 'flex';
                    });
                    
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                    
                    optBtns.forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const selectedId = e.target.dataset.id;
                            optBtns.forEach(b => b.className = 'cs-test-opt-btn'); // reset classes
                            
                            if (selectedId === testQ.correct) {
                                e.target.classList.add('selected-correct');
                                feedback.style.display = 'block';
                                feedback.style.background = '#dcfce7';
                                feedback.style.color = '#166534';
                                feedback.innerHTML = '✨ Chính xác! Em đã nắm được bài rất tốt.';
                                
                                setTimeout(() => {
                                    modal.style.display = 'none';
                                }, 2000);
                            } else {
                                e.target.classList.add('selected-wrong');
                                feedback.style.display = 'block';
                                feedback.style.background = '#fee2e2';
                                feedback.style.color = '#991b1b';
                                feedback.innerHTML = '❌ Chưa chính xác. Em thử kiểm tra lại xem!';
                            }
                        });
                    });
                }
                
                // Next step
                component.querySelector('#cs-next-conn').addEventListener('click', () => {
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                });
            }, 0);
            
            return component;
        }
        
        if (data.ui && data.ui.layout === 'decision_card' && data.decisionTree) {
            const decisionTree = data.decisionTree || [];
            const takeaway = data.takeaway || {};
            const actions = data.actions || [];
            
            component.innerHTML = `
                <div class="decision-card-container" style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: center;">
                    <div style="margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                        <h1 style="margin: 0 0 10px 0; color: #0f172a; font-size: 2em; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            ${promptText || ''}
                        </h1>
                        <div style="color: #64748b; font-size: 1.1em;">Em muốn tổ chức ý như thế nào?</div>
                    </div>
                    
                    <div class="cs-decision-tree" style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; position: relative;">
                        <!-- Center line -->
                        <div style="position: absolute; left: 50%; top: 20px; bottom: 40px; width: 4px; background: #e2e8f0; transform: translateX(-50%); z-index: 0;"></div>
                        
                        ${decisionTree.map((item, idx) => `
                            <div class="cs-decision-node" style="position: relative; z-index: 1;">
                                <div style="background: white; border: 2px solid #cbd5e1; border-radius: 30px; padding: 10px 20px; font-weight: bold; color: #475569; display: inline-block; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    ${item.question}
                                </div>
                                <div style="color: #cbd5e1; font-size: 1.5em; line-height: 1; margin-bottom: 10px;">↓</div>
                                
                                <div class="cs-answer-card" data-idx="${idx}" style="background: #f8fafc; border: 2px solid #93c5fd; border-radius: 12px; padding: 15px 25px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: inline-block; min-width: 250px;">
                                    <div style="font-size: 1.2em; font-weight: bold; color: #1d4ed8; display: flex; align-items: center; justify-content: center; gap: 10px;">
                                        <span>${item.answer.icon}</span> ${item.answer.name}
                                    </div>
                                </div>
                                
                                <!-- Mini Card Detail (Hidden initially) -->
                                <div id="cs-minicard-${idx}" class="cs-minicard" style="display: none; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-top: 15px; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto; animation: fadeIn 0.3s;">
                                    <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 8px;">${item.answer.structure}</div>
                                    <div style="font-size: 0.9em; color: #3b82f6; display: flex; gap: 5px;">
                                        <span>💡</span>
                                        <span><strong>Dùng khi:</strong> ${item.answer.whenToUse}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: left;">
                        <div style="font-weight: bold; color: #b45309; font-size: 1.1em; line-height: 1.5;">
                            ${takeaway.icon} ${takeaway.text}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: center; border-top: 2px solid #f1f5f9; padding-top: 25px;">
                        ${actions.map(action => `
                            <button class="btn btn-outline" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                ${action.label}
                            </button>
                        `).join('')}
                        <button id="cs-next" class="btn btn-primary" style="padding: 10px 30px; border-radius: 8px; background: #3b82f6; color: white; border: none; font-weight: bold; cursor: pointer;">
                            Tiếp tục →
                        </button>
                    </div>
                </div>
                
                <style>
                    .cs-answer-card:hover { transform: translateY(-2px); box-shadow: 0 6px 8px -1px rgba(0,0,0,0.1); background: #eff6ff !important; border-color: #3b82f6 !important; }
                    .cs-answer-card.active { background: #dbeafe !important; border-color: #2563eb !important; }
                </style>
            `;
            
            const cards = component.querySelectorAll('.cs-answer-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.dataset.idx;
                    const miniCard = component.querySelector(`#cs-minicard-${idx}`);
                    
                    if (miniCard.style.display === 'block') {
                        miniCard.style.display = 'none';
                        card.classList.remove('active');
                    } else {
                        // Close others
                        component.querySelectorAll('.cs-minicard').forEach(m => m.style.display = 'none');
                        cards.forEach(c => c.classList.remove('active'));
                        
                        miniCard.style.display = 'block';
                        card.classList.add('active');
                    }
                });
            });
            
            component.querySelector('#cs-next').addEventListener('click', () => {
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            });
            
            return component;
        }

        if (data.ui && (data.ui.layout === 'vertical_steps' || data.ui.layout === 'blueprint_card')) {
            const content = data.content || {};
            
            let stepsHtml = "";
            if (content.steps) {
                stepsHtml = `
                    <div class="cs-flow" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; position: relative;">
                        <div style="position: absolute; left: 20px; top: 20px; bottom: 20px; width: 4px; background: #e2e8f0; z-index: 0;"></div>
                        ${content.steps.map((s, idx) => `
                            <div style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; background: white; padding: 15px 25px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2em; flex-shrink: 0; box-shadow: 0 0 0 4px white;">
                                    ${idx + 1}
                                </div>
                                <div style="font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 5px;">
                                    ${typeof s === 'string' ? s.replace(/^\d+\.\s*/, '') : (s.title + ': ' + (s.question || s.description || ''))}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            let keyRuleHtml = "";
            if (content.keyRule) {
                keyRuleHtml = `
                    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #b45309; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            💡 GHI NHỚ
                        </div>
                        <div style="color: #92400e; font-size: 1.1em; line-height: 1.5;">
                            ${content.keyRule}
                        </div>
                    </div>
                `;
            }

            component.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                        <div style="font-size: 50px; margin-bottom: 10px;">🎒</div>
                        ${promptText ? `<h1 style="margin: 0 0 5px 0; color: #0f172a; font-size: 2.2em; letter-spacing: 2px;">${promptText}</h1>` : ''}
                    </div>
                    
                    ${stepsHtml}
                    ${keyRuleHtml}
                    
                    <div style="text-align: center; border-top: 2px solid #f1f5f9; padding-top: 25px; margin-top: 10px;">
                        <button id="cs-next" class="btn btn-primary" style="padding: 12px 40px; font-size: 1.1em; border-radius: 30px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3);">
                            Hoàn thành bài học →
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Old format
            const design = data.design || {};
            
            let headerHtml = "";
            if (design.header) {
                headerHtml = `
                    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
                        <div style="font-size: 50px; margin-bottom: 10px;">${design.header.icon}</div>
                        <h1 style="margin: 0 0 5px 0; color: #0f172a; font-size: 2.2em; letter-spacing: 2px;">${design.header.title}</h1>
                        <div style="color: #64748b; font-size: 1.1em;">${design.header.subtitle}</div>
                    </div>
                `;
            }
            
            let flowHtml = "";
            if (design.flow && design.flow.steps) {
                flowHtml = `
                    <div class="cs-flow" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; position: relative;">
                        <!-- Vertical line connecting steps -->
                        <div style="position: absolute; left: 35px; top: 20px; bottom: 20px; width: 4px; background: #e2e8f0; z-index: 0;"></div>
                        
                        ${design.flow.steps.map(s => `
                            <div style="display: flex; align-items: flex-start; gap: 20px; position: relative; z-index: 1; background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div style="width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2em; flex-shrink: 0; box-shadow: 0 0 0 4px white;">
                                    ${s.number}
                                </div>
                                <div>
                                    <div style="font-weight: bold; font-size: 1.1em; color: #1e293b; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                                        <span>${s.icon}</span> ${s.title}
                                    </div>
                                    <div style="color: #475569; font-size: 0.95em; line-height: 1.5;">
                                        ${s.description}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            let keyRuleHtml = "";
            if (design.keyRule) {
                keyRuleHtml = `
                    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #b45309; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            ${design.keyRule.icon} ${design.keyRule.title}
                        </div>
                        <div style="color: #92400e; font-size: 1.05em; line-height: 1.5;">
                            ${design.keyRule.text}
                        </div>
                    </div>
                `;
            }
            
            let formulaHtml = "";
            if (design.quickFormula) {
                formulaHtml = `
                    <div style="text-align: center; background: #f0fdf4; padding: 20px; border: 2px dashed #22c55e; border-radius: 12px; margin-bottom: 30px;">
                        <div style="font-size: 0.9em; font-weight: bold; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                            ${design.quickFormula.label}
                        </div>
                        <div style="font-size: 1.3em; font-weight: bold; color: #166534;">
                            ${design.quickFormula.text}
                        </div>
                    </div>
                `;
            }
            
            let actionsHtml = "";
            if (data.actions) {
                actionsHtml = `
                    <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                        ${data.actions.save && data.actions.save.enabled ? `
                            <button class="btn" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                🔖 ${data.actions.save.label}
                            </button>
                        ` : ''}
                        ${data.actions.download && data.actions.download.enabled ? `
                            <button class="btn" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                ⬇️ ${data.actions.download.label}
                            </button>
                        ` : ''}
                    </div>
                `;
            }

            component.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                    ${headerHtml}
                    ${flowHtml}
                    ${keyRuleHtml}
                    ${formulaHtml}
                    ${actionsHtml}
                    
                    <div style="text-align: center; border-top: 2px solid #f1f5f9; padding-top: 25px; margin-top: 10px;">
                        <button id="cs-next" class="btn btn-primary" style="padding: 12px 40px; font-size: 1.1em; border-radius: 30px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3);">
                            Hoàn thành ôn tập →
                        </button>
                    </div>
                </div>
            `;
        }

        this.bind(component);
        return component;
    }

    static bind(component) {
        // Just advance to the next step when done
        component.querySelector("#cs-next")?.addEventListener("click", () => {
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
        
        // Mock save/download actions
        const actionBtns = component.querySelectorAll('.btn:not(.btn-primary)');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Đã xử lý';
                btn.style.background = '#dcfce7';
                btn.style.color = '#166534';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '#f1f5f9';
                    btn.style.color = '#334155';
                }, 2000);
            });
        });
    }

    static validator = {
        name: "NullValidator",
        validate: () => ({ valid: true, score: 1, maxScore: 1 })
    };

    static getValidator() {
        return this.validator;
    }
}

export default CheatSheet;
