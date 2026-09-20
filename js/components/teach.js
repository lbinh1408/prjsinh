/**
 * ==========================================================
 * TS10 Learning Platform
 * components/teach.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import ConnectionMap from "./connectionMap.js";

class Teach {

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component teach-component";

        // Add component specific state to the element
        component.dataset.currentStep = "0";
        const stepsCount = data.presentation && data.presentation.steps ? data.presentation.steps.length : 0;

        if (data.ui && data.ui.component === 'vertical_map') {
            const ui = data.ui;
            const nodes = data.nodes || [];
            
            component.innerHTML = `
                <style>
                    .teach-vm-wrapper { padding: 20px 0; max-width: 800px; margin: 0 auto; text-align: center; font-family: 'Inter', sans-serif; }
                    .teach-vm-hero { margin-bottom: 40px; }
                    .teach-vm-hero h1 { font-size: 2.2rem; color: #1e293b; line-height: 1.2; margin-bottom: 10px; }
                    .teach-vm-hero p { color: #64748b; font-size: 1.1rem; }
                    
                    .teach-vm-container { display: flex; flex-direction: column; gap: 20px; position: relative; }
                    /* Vertical line connecting nodes */
                    .teach-vm-container::before {
                        content: ''; position: absolute; left: 50%; top: 20px; bottom: 20px;
                        width: 4px; background: #e2e8f0; transform: translateX(-50%); z-index: 0;
                    }
                    
                    .teach-vm-node { position: relative; z-index: 1; background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: left; transition: all 0.2s; cursor: pointer; width: 80%; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
                    .teach-vm-node:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1; }
                    .teach-vm-node.active { border-color: #6d5dfc; box-shadow: 0 0 0 4px #eff2ff; }
                    
                    .teach-vm-header { display: flex; align-items: center; gap: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15px; }
                    .teach-vm-icon { font-size: 2rem; background: #f8fafc; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid #e2e8f0; }
                    .teach-vm-title-wrap { flex: 1; }
                    .teach-vm-title { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
                    .teach-vm-short { font-size: 1rem; color: #64748b; font-weight: 500; }
                    
                    .teach-vm-detail { display: none; padding-top: 15px; animation: slideDown 0.3s ease-out; }
                    .teach-vm-node.active .teach-vm-detail { display: block; }
                    .teach-vm-question { color: #475569; font-size: 1.1rem; margin-bottom: 15px; font-weight: 600; }
                    .teach-vm-example { background: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #6d5dfc; font-style: italic; color: #334155; }
                    
                    .teach-vm-actions { margin-top: 40px; }
                    .teach-vm-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; transition: background 0.2s; }
                    .teach-vm-btn:hover { background: #5b4be8; }
                    
                    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                
                <div class="teach-vm-wrapper">
                    <div class="teach-vm-hero">
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                        ${data.importantNote ? `<p style="color: #b45309; font-weight:600; background: #fef3c7; padding: 15px; border-radius:12px; font-size: 1rem; margin-top:20px;">${data.importantNote}</p>` : ''}
                    </div>
                    
                    <div class="teach-vm-container">
                        ${nodes.map((n, i) => `
                            <div class="teach-vm-node" data-idx="${i}">
                                <div class="teach-vm-header">
                                    <div class="teach-vm-icon">${n.icon || ''}</div>
                                    <div class="teach-vm-title-wrap">
                                        <div class="teach-vm-title">${n.title || ''}</div>
                                        <div class="teach-vm-short">${n.short || ''}</div>
                                    </div>
                                </div>
                                <div class="teach-vm-detail">
                                    ${n.question ? `<div class="teach-vm-question">${n.question}</div>` : ''}
                                    ${n.example ? `<div class="teach-vm-example">${n.example}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="teach-vm-actions">
                        <button class="teach-vm-btn" id="btn-vm-next">Đã hiểu →</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const nodeEls = component.querySelectorAll('.teach-vm-node');
                const btnNext = component.querySelector('#btn-vm-next');
                let viewedNodes = new Set();
                
                nodeEls.forEach(node => {
                    node.addEventListener('click', () => {
                        const idx = parseInt(node.dataset.idx);
                        
                        // Toggle active state
                        if (node.classList.contains('active')) {
                            node.classList.remove('active');
                        } else {
                            nodeEls.forEach(n => n.classList.remove('active'));
                            node.classList.add('active');
                            viewedNodes.add(idx);
                        }
                        
                        if (viewedNodes.size === nodes.length) {
                            btnNext.style.display = 'inline-block';
                        }
                    });
                });
                
                btnNext.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                });
                
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'paragraph_type_map') {
            const ui = data.ui;
            const types = data.types || [];
            
            component.innerHTML = `
                <style>
                    .teach-ptm-wrapper { padding: 20px 0; max-width: 900px; margin: 0 auto; text-align: center; }
                    .teach-ptm-hero { margin-bottom: 30px; }
                    .teach-ptm-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                    .teach-ptm-hero h1 { font-size: 2.2rem; color: #1e293b; line-height: 1.2; margin-bottom: 10px; }
                    .teach-ptm-hero p { color: #64748b; font-size: 1.1rem; }
                    
                    .teach-ptm-map { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
                    .teach-ptm-node { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .teach-ptm-node:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1; }
                    .teach-ptm-node.active { border-color: #6d5dfc; background: #faf9ff; }
                    .teach-ptm-node .big { font-size: 2.5rem; margin-bottom: 10px; }
                    .teach-ptm-node b { display: block; font-size: 1.2rem; color: #1e293b; margin-bottom: 5px; text-transform: uppercase; }
                    .teach-ptm-node .muted { color: #64748b; font-size: 0.9rem; }
                    
                    .teach-ptm-detail { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); min-height: 200px; margin-bottom: 30px; }
                    .teach-ptm-detail h3 { font-size: 1.5rem; color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
                    .teach-ptm-detail .purpose { font-size: 1.1rem; color: #334155; margin-bottom: 20px; font-weight: 500; }
                    .teach-ptm-detail h4 { font-size: 1.1rem; color: #475569; margin-bottom: 10px; }
                    .teach-ptm-detail ul { padding-left: 20px; margin-bottom: 20px; color: #475569; line-height: 1.6; }
                    .teach-ptm-detail .example { background: #f8fafc; border-left: 4px solid #6d5dfc; padding: 15px; border-radius: 0 8px 8px 0; font-style: italic; color: #334155; line-height: 1.6; }
                    
                    .teach-ptm-actions { margin-top: 20px; }
                    .teach-ptm-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .teach-ptm-btn:hover { background: #5b4be8; }
                </style>
                
                <div class="teach-ptm-wrapper">
                    <div class="teach-ptm-hero">
                        <div class="emoji">🧠</div>
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                        <p>${ui.centerTitle || 'Bắt đầu từ mục đích, rồi mới gọi tên kiểu đoạn.'}</p>
                    </div>
                    
                    <div class="teach-ptm-map">
                        ${types.map((t, i) => `
                            <div class="teach-ptm-node" data-idx="${i}">
                                <div class="big">${t.icon || ''}</div>
                                <b>${t.name || ''}</b>
                                <span class="muted">${t.purpose ? t.purpose.substring(0, 20) + '...' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="teach-ptm-detail" id="tdetail">
                        <div style="text-align:center; color: #64748b; margin-top: 50px;">
                            <b>Chạm một node để xem chi tiết.</b>
                        </div>
                    </div>
                    
                    <div class="teach-ptm-actions">
                        <button class="teach-ptm-btn" id="btn-ptm-next" style="display:none;">Tiếp tục →</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const nodes = component.querySelectorAll('.teach-ptm-node');
                const detailEl = component.querySelector('#tdetail');
                const btnNext = component.querySelector('#btn-ptm-next');
                
                let viewedNodes = new Set();
                
                const updateDetail = (idx) => {
                    const t = types[idx];
                    detailEl.innerHTML = `
                        <h3>${t.icon || ''} ${t.name || ''}</h3>
                        <div class="purpose">${t.purpose || ''}</div>
                        ${t.whenToUse && t.whenToUse.length > 0 ? `
                            <h4>Khi nào dùng?</h4>
                            <ul>
                                ${t.whenToUse.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${t.example ? `
                            <h4>Ví dụ minh họa:</h4>
                            <div class="example">“${t.example}”</div>
                        ` : ''}
                    `;
                };
                
                nodes.forEach(node => {
                    node.addEventListener('click', () => {
                        nodes.forEach(n => n.classList.remove('active'));
                        node.classList.add('active');
                        
                        const idx = parseInt(node.dataset.idx);
                        updateDetail(idx);
                        viewedNodes.add(idx);
                        
                        if (viewedNodes.size === types.length) {
                            btnNext.style.display = 'inline-block';
                            component.dataset.completed = "true";
                        }
                    });
                });
                
                btnNext.addEventListener('click', () => {
                    window.engine && window.engine.next();
                });
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'connection_map') {
            const ui = data.ui;
            const tools = ui.tools || [];
            const ex = data.example || {};
            const diag = data.diagnostic_question || {};
            const options = diag.options || [];

            component.innerHTML = `
                <style>
                    .teach-sp-wrapper {
                        padding: 20px 0;
                    }
                    .teach-sp-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .teach-sp-wrapper h2 { font-size: 29px; margin-bottom: 10px; color: #172033; }
                    .teach-sp-wrapper .muted { color: #697386; line-height: 1.65; margin-bottom: 20px; }
                    .teach-sp-wrapper .map { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
                    .teach-sp-wrapper .node { padding: 14px; border: 1px solid #ddd; border-radius: 13px; background: #fff; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .teach-sp-wrapper .arrow { color: #6d5dfc; font-size: 22px; font-weight: bold; }
                    .teach-sp-wrapper .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 20px; }
                    .teach-sp-wrapper .beforeafter { display: grid; grid-template-columns: 1fr auto 1fr; gap: 15px; align-items: center; }
                    .teach-sp-wrapper .pill { display: inline-block; padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5b4be8; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
                    .teach-sp-wrapper .text { font-size: 18px; line-height: 1.8; margin: 0; }
                    .teach-sp-wrapper .after { padding: 14px; border-radius: 13px; background: #effbf5; }
                    .teach-sp-wrapper .editor { background: #e6e6e6; color: #fff; border-radius: 22px; padding: 26px; margin-bottom: 20px; }
                    .teach-sp-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
                    .teach-sp-wrapper .tool { border: 1px solid #d9ddea; border-radius: 12px; padding: 12px 15px; background: #fff; cursor: pointer; text-align: left; transition: all 0.2s; font-weight: bold; color: #172033; }
                    .teach-sp-wrapper .tool:hover, .teach-sp-wrapper .tool.sel { border-color: #6d5dfc; background: #f3f1ff; color: #6d5dfc; }
                    .teach-sp-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                    .teach-sp-wrapper .primary { background: #6d5dfc; color: #fff; }
                    .teach-sp-wrapper .primary:hover { background: #5b4be8; }
                </style>
                <div class="teach-sp-wrapper">
                    <div class="ey">❹ TEACH</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    <p class="muted">${data.objective || 'Bốn thao tác: biết câu đang cần gì, rồi sửa.'}</p>
                    
                    <div class="map">
                        ${tools.map((t, i) => `
                            <div class="node">${t.icon} <b>${t.title}</b><br><small>${t.description}</small></div>
                            ${i < tools.length - 1 ? '<div class="arrow">→</div>' : ''}
                        `).join('')}
                    </div>
                    
                    <div class="card">
                        <div class="beforeafter">
                            <div><span class="pill">TRƯỚC</span>
                                <p class="text">${ex.before || ''}</p>
                            </div>
                            <div class="arrow">→</div>
                            <div><span class="pill">SAU</span>
                                <p class="after text">${ex.after || ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="editor">
                        <b style="color:  #6760ad;">🎧 Diagnostic Question</b>
                        <p>${diag.text || ''}</p>
                        <div class="btns">
                            ${options.map(opt => `<button class="tool">${opt.text}</button>`).join('')}
                        </div>
                    </div>
                    
                    <div class="btns">
                        <button class="btn primary" id="ts-btn-next" style="display:none;">Vào phòng sửa câu →</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const toolsBtns = component.querySelectorAll('.tool');
                const btnNext = component.querySelector('#ts-btn-next');
                toolsBtns.forEach(b => {
                    b.addEventListener('click', () => {
                        b.classList.toggle('sel');
                        btnNext.style.display = 'block';
                        component.dataset.completed = "true";
                    });
                });

                btnNext.addEventListener('click', () => {
                    window.engine && window.engine.next();
                });
            }, 0);

            return component;
        }

        if (data.ui && data.ui.layout === 'connection_lab') {
            const diagData = data.content?.diagnosticQuestion?.diagnosticData;

            // Outer container for state management
            component.innerHTML = `
                <div class="teach-main-view">
                    <div class="component-header">
                        ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                        <p class="question-text">${data.instruction || step.instruction || "Khám phá 4 công cụ tạo liên kết."}</p>
                    </div>
                    <div class="map-container" style="margin-bottom: 20px;"></div>
                    <div class="detail-panel" style="display: none; background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; max-width: 650px; margin: 0 auto 30px; box-shadow: 0 10px 25px -5px rgba(59,130,246,0.2); text-align: left; animation: fadeIn 0.4s;"></div>
                    <div class="btn-to-diagnostic-container" style="display: none; text-align: center; margin-top: 30px;">
                        <button class="btn btn-primary btn-to-diagnostic">Thực hành chẩn đoán</button>
                    </div>
                </div>
                
                <div class="teach-diagnostic-view" style="display: none; max-width: 700px; margin: 0 auto; text-align: center;">
                    <div style="background: white; border-radius: 12px; border: 2px solid #e2e8f0; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="font-size: 1.5em; font-weight: bold; color: #1e293b; margin-bottom: 10px;">
                            ${data.content?.diagnosticQuestion?.title || "🧠 DIAGNOSTIC"}
                        </div>
                        <div style="font-size: 1.1em; color: #475569; margin-bottom: 30px;">
                            ${data.content?.diagnosticQuestion?.text || "Câu sau đang nối với câu trước bằng cách nào?"}
                        </div>
                        
                        <div class="diag-sentences" style="font-size: 1.2em; line-height: 1.6; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: left;">
                            ${(diagData?.sentences || []).map((s, i) => `<div style="${i === 1 ? 'font-weight: bold; color: #1e3a8a; margin-top: 10px;' : ''}">${s}</div>`).join('')}
                        </div>
                        
                        <div style="font-weight: bold; color: #64748b; margin-bottom: 15px;">🔍 HÃY TÌM ĐƯỜNG NỐI</div>
                        <div class="diag-options" style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-bottom: 30px;"></div>
                        
                        <div class="diag-result" style="display: none; margin-top: 20px; animation: fadeIn 0.4s;">
                            <div style="color: #16a34a; font-weight: bold; font-size: 1.2em; margin-bottom: 10px;">✓ CHÍNH XÁC</div>
                            <div style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                                ${diagData?.explanation || ""}
                            </div>
                            
                            <div class="diag-followup" style="border-top: 2px dashed #cbd5e1; padding-top: 30px; text-align: left;">
                                <div style="font-size: 1.1em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">
                                    ⭐ ${diagData?.followUp?.question || "Nếu bỏ đường nối này, điều gì xảy ra?"}
                                </div>
                                
                                <div style="display: flex; background: #e2e8f0; padding: 5px; border-radius: 12px; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
                                    <button class="toggle-connected active" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: #1e293b;">🔗 Có liên kết</button>
                                    <button class="toggle-broken" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background: transparent; font-weight: bold; cursor: pointer; color: #64748b;">⛓️ Đứt liên kết</button>
                                </div>
                                
                                <div class="followup-text" style="font-size: 1.1em; line-height: 1.6; background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; min-height: 100px; white-space: pre-line;">
                                    ${diagData?.followUp?.connectedText || ""}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="btn-to-next-container" style="display: none; text-align: center; margin-top: 30px;">
                        <button class="btn btn-primary" onclick="window.engine && window.engine.next()">Tiếp tục</button>
                    </div>
                </div>
                
                <!-- Floating Skill Bar -->
                <div style="position: fixed; bottom: 30px; right: 30px; background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 15px 20px; box-shadow: 0 10px 25px -5px rgba(59,130,246,0.3); z-index: 1000; max-width: 300px; animation: slideInRight 0.5s;">
                    <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 5px; font-size: 0.9em; text-transform: uppercase;">🔗 CONNECTION SKILL</div>
                    <div style="color: #334155; font-size: 0.95em;">Câu sau đang dựa vào câu trước bằng cách nào?</div>
                </div>
            `;

            const mainView = component.querySelector('.teach-main-view');
            const diagView = component.querySelector('.teach-diagnostic-view');

            // Map
            const mapContainer = component.querySelector('.map-container');
            const mapEl = ConnectionMap.render(data.connectionData);
            mapContainer.appendChild(mapEl);

            const detailPanel = component.querySelector('.detail-panel');
            const btnDiagContainer = component.querySelector('.btn-to-diagnostic-container');

            // Interaction logic
            const methods = data.content?.methods || [];
            const viewedMethods = new Set();

            requestAnimationFrame(() => {
                const badges = mapContainer.querySelectorAll('.link-badge');
                badges.forEach((badge, index) => {
                    const method = methods[index];
                    if (!method) return;

                    badge.style.cursor = "pointer";
                    badge.style.padding = "10px 20px";
                    badge.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";

                    badge.addEventListener('mouseover', () => {
                        badge.style.transform = "translate(-50%, -50%) scale(1.1)";
                        badge.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
                    });
                    badge.addEventListener('mouseout', () => {
                        badge.style.transform = "translate(-50%, -50%) scale(1)";
                        badge.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                    });

                    badge.addEventListener('click', () => {
                        badges.forEach(b => {
                            b.style.background = "white";
                            b.style.color = b.style.borderColor;
                        });

                        badge.style.background = badge.style.borderColor;
                        badge.style.color = "white";

                        viewedMethods.add(index);

                        detailPanel.style.display = "block";
                        detailPanel.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                                <div style="font-size: 2.5em;">${method.icon}</div>
                                <div>
                                    <div style="font-size: 1.4em; font-weight: bold; color: #1e293b;">${method.name}</div>
                                    <div style="color: #64748b; font-size: 0.95em; font-family: monospace; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">Mẫu: ${method.pattern}</div>
                                </div>
                            </div>
                            <div style="margin-bottom: 20px;">
                                <div style="font-weight: bold; color: #334155; margin-bottom: 8px;">Khái niệm:</div>
                                <div style="color: #475569; line-height: 1.5; font-size: 1.1em;">${method.definition}</div>
                            </div>
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                <div style="font-weight: bold; color: #334155; margin-bottom: 8px;">Ví dụ:</div>
                                <div style="color: #475569; margin-bottom: 5px;">"${method.example?.sentence1}"</div>
                                <div style="color: #1e3a8a; font-weight: 500;">"${method.example?.sentence2}"</div>
                            </div>
                            <div>
                                <div style="font-weight: bold; color: #334155; margin-bottom: 8px;">Khi nào nên dùng?</div>
                                <div style="color: #475569; line-height: 1.5;">${method.whenToUse}</div>
                            </div>
                        `;

                        if (viewedMethods.size >= methods.length && diagData) {
                            btnDiagContainer.style.display = "block";
                        }

                        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });
                });
            });

            // Transition to Diagnostic
            const btnToDiag = component.querySelector('.btn-to-diagnostic');
            btnToDiag?.addEventListener('click', () => {
                mainView.style.display = "none";
                diagView.style.display = "block";
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Diagnostic Flow
            if (diagData) {
                const diagOptions = component.querySelector('.diag-options');
                const diagResult = component.querySelector('.diag-result');
                const btnNextContainer = component.querySelector('.btn-to-next-container');

                diagData.options.forEach(opt => {
                    const btn = document.createElement("button");
                    btn.style.cssText = "padding: 10px 20px; border: 2px solid #cbd5e1; border-radius: 8px; background: white; color: #334155; font-weight: bold; cursor: pointer; transition: all 0.2s;";
                    btn.innerText = opt;

                    btn.addEventListener('click', () => {
                        if (opt === diagData.correctOption) {
                            btn.style.borderColor = "#22c55e";
                            btn.style.background = "#dcfce7";
                            btn.style.color = "#166534";

                            // disable others
                            Array.from(diagOptions.children).forEach(b => {
                                if (b !== btn) {
                                    b.style.opacity = "0.5";
                                    b.style.pointerEvents = "none";
                                }
                            });

                            diagResult.style.display = "block";
                            btnNextContainer.style.display = "block";

                            setTimeout(() => diagResult.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                        } else {
                            btn.style.borderColor = "#ef4444";
                            btn.style.background = "#fee2e2";
                            btn.style.color = "#991b1b";
                            btn.style.transform = "translate(5px)";
                            setTimeout(() => btn.style.transform = "translate(-5px)", 50);
                            setTimeout(() => btn.style.transform = "translate(0)", 100);
                        }
                    });

                    diagOptions.appendChild(btn);
                });

                // Follow up Toggle
                const btnConnected = component.querySelector('.toggle-connected');
                const btnBroken = component.querySelector('.toggle-broken');
                const followupText = component.querySelector('.followup-text');

                btnConnected?.addEventListener('click', () => {
                    btnConnected.classList.add('active');
                    btnConnected.style.background = "white";
                    btnConnected.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    btnConnected.style.color = "#1e293b";

                    btnBroken.classList.remove('active');
                    btnBroken.style.background = "transparent";
                    btnBroken.style.boxShadow = "none";
                    btnBroken.style.color = "#64748b";

                    followupText.innerText = diagData.followUp?.connectedText || "";
                    followupText.style.borderLeft = "4px solid #3b82f6";
                });

                btnBroken?.addEventListener('click', () => {
                    btnBroken.classList.add('active');
                    btnBroken.style.background = "white";
                    btnBroken.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    btnBroken.style.color = "#1e293b";

                    btnConnected.classList.remove('active');
                    btnConnected.style.background = "transparent";
                    btnConnected.style.boxShadow = "none";
                    btnConnected.style.color = "#64748b";

                    followupText.innerText = diagData.followUp?.brokenText || "";
                    followupText.style.borderLeft = "4px solid #ef4444";
                });
            }

            return component;
        }

        if (data.ui && data.ui.layout === 'structure_map') {
            const content = data.content || {};

            // CUSTOM LAYOUT for "5 cách tổ chức đoạn văn"
            let mapHtml = '';
            if (content.title === "🧩 CÁCH TRÌNH BÀY ĐOẠN VĂN" || content.map?.root === "CÁCH TRÌNH BÀY") {
                const getStruct = (name) => {
                    const struct = content.structures.find(s => s.name.toUpperCase() === name || s.name.toUpperCase().includes(name) || name.includes(s.name.toUpperCase()));
                    if (!struct) return '';
                    return `
                        <button class="btn-structure-node" data-id="${struct.id}" style="background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 12px 15px; font-weight: bold; color: #1e3a8a; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; gap: 5px; width: 140px; text-align: center; margin: 0 auto; z-index: 10; position: relative;">
                            <span style="font-size: 1.5em;">${struct.icon}</span>
                            <span style="font-size: 0.9em;">${struct.name}</span>
                        </button>
                    `;
                };

                mapHtml = `
                    <div class="custom-structure-map" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px 20px; margin-bottom: 40px; position: relative; overflow-x: auto;">
                        <div style="min-width: 900px;">
                            <!-- ROOT -->
                            <div style="text-align: center; margin-bottom: 30px; position: relative;">
                                <div style="font-weight: bold; font-size: 1.4em; color: #1e293b; background: white; border: 2px solid #e2e8f0; padding: 10px 30px; border-radius: 20px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); z-index: 10; position: relative;">CÁCH TRÌNH BÀY</div>
                                <div style="width: 2px; height: 30px; background: #94a3b8; margin: 0 auto;"></div>
                            </div>
                            
                            <!-- LEVEL 1 -->
                            <div style="position: relative; width: 80%; margin: 0 auto 30px auto;">
                                <!-- HORIZONTAL LINE CONNECTING LEVEL 1 -->
                                <div style="position: absolute; top: 0; left: 16.66%; width: 66.66%; height: 2px; background: #94a3b8; z-index: 1;"></div>
                                
                                <div style="display: flex; justify-content: space-between; position: relative; z-index: 10;">
                                    <!-- Branch 1 -->
                                    <div style="flex: 1; text-align: center;">
                                        <div style="width: 2px; height: 30px; background: #94a3b8; margin: 0 auto;"></div>
                                        <div style="font-weight: bold; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd; padding: 8px 15px; border-radius: 20px; display: inline-block;">Ý CHÍNH</div>
                                    </div>
                                    <!-- Branch 2 -->
                                    <div style="flex: 1; text-align: center;">
                                        <div style="width: 2px; height: 30px; background: #94a3b8; margin: 0 auto;"></div>
                                        <div style="font-weight: bold; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd; padding: 8px 15px; border-radius: 20px; display: inline-block;">QUAN HỆ</div>
                                    </div>
                                    <!-- Branch 3 -->
                                    <div style="flex: 1; text-align: center;">
                                        <div style="width: 2px; height: 30px; background: #94a3b8; margin: 0 auto;"></div>
                                        <div style="font-weight: bold; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd; padding: 8px 15px; border-radius: 20px; display: inline-block;">LIÊN KẾT</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- LEVEL 2 & 3 -->
                            <div style="display: flex; justify-content: space-between; width: 80%; margin: 0 auto; position: relative;">
                                <!-- Column 1: Ý CHÍNH -->
                                <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                    <div style="width: 2px; height: 30px; background: #94a3b8;"></div>
                                    <div style="width: 155px; height: 2px; background: #94a3b8;"></div>
                                    
                                    <div style="display: flex; gap: 15px;">
                                        <!-- Diễn dịch -->
                                        <div style="display: flex; flex-direction: column; align-items: center; width: 140px;">
                                            <div style="width: 2px; height: 20px; background: #94a3b8;"></div>
                                            ${getStruct('DIỄN DỊCH')}
                                            <div style="width: 2px; height: 30px; background: #94a3b8;"></div>
                                        </div>
                                        <!-- Quy nạp -->
                                        <div style="display: flex; flex-direction: column; align-items: center; width: 140px;">
                                            <div style="width: 2px; height: 20px; background: #94a3b8;"></div>
                                            ${getStruct('QUY NẠP')}
                                            <div style="width: 2px; height: 30px; background: #94a3b8;"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Tổng phân hợp connecting both Diễn dịch and Quy nạp -->
                                    <div style="width: 155px; height: 2px; background: #94a3b8;"></div>
                                    <div style="width: 2px; height: 20px; background: #94a3b8;"></div>
                                    
                                    ${getStruct('TỔNG – PHÂN – HỢP')}
                                </div>
                                
                                <!-- Column 2: QUAN HỆ -->
                                <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                    <div style="width: 2px; height: 50px; background: #94a3b8;"></div>
                                    ${getStruct('SONG HÀNH')}
                                </div>
                                
                                <!-- Column 3: LIÊN KẾT -->
                                <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                    <div style="width: 2px; height: 50px; background: #94a3b8;"></div>
                                    ${getStruct('MÓC XÍCH')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Fallback standard layout
                mapHtml = content.map ? `
                    <div class="structure-map" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px 20px; margin-bottom: 40px; position: relative;">
                        <div style="text-align: center; font-weight: bold; font-size: 1.4em; color: #1e293b; background: white; border: 2px solid #e2e8f0; padding: 10px 30px; border-radius: 20px; display: inline-block; position: absolute; top: -20px; left: 50%; transform: translateX(-50%); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">${content.map.root}</div>
                        
                        <div style="display: flex; gap: 40px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                            ${content.map.branches.map(branch => `
                                <div class="map-branch" style="flex: 1; min-width: 250px; max-width: 350px; display: flex; flex-direction: column; align-items: center;">
                                    <div style="font-weight: bold; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd; padding: 8px 20px; border-radius: 20px; margin-bottom: 20px; position: relative;">
                                        ${branch.label}
                                        <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background: #cbd5e1;"></div>
                                    </div>
                                    
                                    <div style="display: flex; flex-direction: column; gap: 15px; width: 100%; align-items: center; border-top: 2px solid #cbd5e1; padding-top: 20px; position: relative;">
                                        ${branch.children.map(childName => {
                    const struct = content.structures.find(s => s.name.toUpperCase() === childName || childName.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(childName));
                    if (!struct) return '';
                    return `
                                                <button class="btn-structure-node" data-id="${struct.id}" style="width: 100%; background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 15px; font-weight: bold; color: #1e3a8a; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left; display: flex; align-items: center; justify-content: space-between;">
                                                    <span>${struct.icon} ${struct.name}</span>
                                                    <span style="color: #94a3b8; font-size: 1.2em;">+</span>
                                                </button>
                                            `;
                }).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '';
            }

            // Panel for details (hidden by default) rendered below map
            const detailPanelHtml = `
                <div id="structure-detail-panel" style="display: none; background: white; border: 2px solid #3b82f6; border-radius: 16px; padding: 30px; margin: 40px auto; max-width: 700px; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2); position: relative; scroll-margin-top: 20px;">
                    <div id="panel-content" style="text-align: left;">
                        <!-- injected content -->
                    </div>
                </div>
            `;

            // Decision Table
            const decisionTableHtml = content.decisionTable ? `
                <div class="decision-table-area" style="display: none; margin-top: 40px; margin-bottom: 40px; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                ${content.decisionTable.columns.map(c => `<th style="padding: 15px; text-align: left; color: #475569;">${c}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${content.decisionTable.rows.map((row, idx) => `
                                <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? 'white' : '#f8fafc'};">
                                    ${row.map((cell, i) => `<td style="padding: 15px; ${i === 0 ? 'font-weight: bold; color: #0f172a;' : 'color: #334155;'}">${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '';

            // Core Rule
            const coreRuleHtml = content.coreRule ? `
                <div class="core-rule-area" style="display: none; background: #fffbeb; border: 2px solid #fde68a; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 1.2em; font-weight: bold; color: #b45309; margin-bottom: 10px;">${content.coreRule.title}</div>
                    <div style="font-size: 1.1em; color: #92400e;">${content.coreRule.text}</div>
                </div>
            ` : '';

            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                </div>
                <div class="structure-map-container" style="max-width: 900px; margin: 0 auto; padding: 20px; text-align: center;">
                    ${mapHtml}
                    
                    <button id="btn-show-summary" class="btn btn-outline" style="padding: 12px 30px; border-radius: 8px; border: 2px solid #cbd5e1; font-weight: bold; color: #475569; background: white; cursor: pointer; display: none;">
                        Xem bảng tổng hợp
                    </button>

                    ${decisionTableHtml}
                    ${coreRuleHtml}
                    
                    <div style="margin-top: 30px;">
                        <button id="teach-done" class="btn btn-primary" style="padding: 12px 40px; border-radius: 8px; font-weight: bold; font-size: 1.1em; display: none;">Tiếp tục →</button>
                    </div>
                </div>
                ${detailPanelHtml}
                <style>
                    .btn-structure-node:hover { background: #eff6ff !important; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important; }
                    .btn-structure-node.viewed { border-color: #cbd5e1 !important; color: #64748b !important; }
                </style>
            `;

            // Store structures data in the component to access it during bind
            component.data_structures = content.structures;

            this.bind(component, step);
            return component;
        }

        if (data.ui && data.ui.layout === 'visual_teach') {
            const content = data.content || {};

            // Tier 1: Animation Overview
            let overviewHtml = '';
            if (content.mainVisual && content.mainVisual.type === 'idea_tree') {
                overviewHtml = `
                    <div class="teach-overview" style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 40px; text-align: center; border: 2px dashed #cbd5e1;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #475569; margin-bottom: 30px;">CÁC CÁCH ĐÀO SÂU MỘT Ý</div>
                        <div class="idea-tree-container" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                            <div class="tree-root" style="background: #fef08a; padding: 15px 30px; border-radius: 20px; font-weight: bold; font-size: 1.3em; border: 2px solid #facc15;">
                                ${content.mainVisual.center.icon} ${content.mainVisual.center.label}
                            </div>
                            <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                                ${content.mainVisual.branches.map((b, i) => `
                                    <div class="tree-branch b-${i}" style="display: flex; flex-direction: column; align-items: center; gap: 10px; opacity: 0; transform: translateY(20px); transition: all 0.5s;">
                                        <div style="width: 2px; height: 30px; background: #94a3b8;"></div>
                                        <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; width: 150px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                            <div style="font-size: 1.5em; margin-bottom: 5px;">${b.icon}</div>
                                            <div style="font-size: 0.9em; font-weight: bold; color: #475569; margin-bottom: 5px;">${b.question}</div>
                                            <div style="font-size: 0.9em; color: #3b82f6; font-weight: 500;">${b.skill}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                overviewHtml = `
                    <div class="teach-overview" style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 40px; text-align: center; border: 2px dashed #cbd5e1;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #475569; margin-bottom: 20px;">QUY TRÌNH LẬP DÀN Ý</div>
                        <div class="animation-container" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <div class="anim-step step-0" style="font-size: 24px; opacity: 0; transform: translateY(-10px);">💡 💡 💡 💡 💡</div>
                            <div class="anim-step step-1" style="font-size: 20px; color: #94a3b8; opacity: 0; transform: translateY(-10px);">↓</div>
                            <div class="anim-step step-2" style="background: #3b82f6; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; opacity: 0; transform: translateY(-10px);">CHỌN</div>
                            <div class="anim-step step-3" style="font-size: 20px; color: #94a3b8; opacity: 0; transform: translateY(-10px);">↓</div>
                            <div class="anim-step step-4" style="background: #3b82f6; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; opacity: 0; transform: translateY(-10px);">GOM</div>
                            <div class="anim-step step-5" style="font-size: 20px; color: #94a3b8; opacity: 0; transform: translateY(-10px);">↓</div>
                            <div class="anim-step step-6" style="background: #3b82f6; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; opacity: 0; transform: translateY(-10px);">SẮP XẾP</div>
                            <div class="anim-step step-7" style="font-size: 20px; color: #94a3b8; opacity: 0; transform: translateY(-10px);">↓</div>
                            <div class="anim-step step-8" style="background: #3b82f6; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; opacity: 0; transform: translateY(-10px);">KIỂM TRA</div>
                            <div class="anim-step step-9" style="font-size: 20px; color: #94a3b8; opacity: 0; transform: translateY(-10px);">↓</div>
                            <div class="anim-step step-10" style="font-size: 30px; font-weight: bold; color: #0f172a; margin-top: 10px; opacity: 0; transform: translateY(-10px);">🏗️ DÀN Ý</div>
                        </div>
                    </div>
                `;
            }

            // Tier 2: Skill Cards
            let skillsHtml = '';
            if (content.skills && content.skills.length > 0) {
                skillsHtml = `
                    <div class="teach-skills" style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-bottom: 30px; opacity: 0; transition: opacity 1s;">
                        ${(content.skills || []).map((skill, idx) => `
                            <div class="skill-card" data-idx="${idx}" style="flex: 1; min-width: 200px; max-width: 250px; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden;">
                                <div style="font-size: 0.9em; color: #64748b; font-weight: bold; margin-bottom: 10px;">BƯỚC ${skill.number}</div>
                                <div style="font-size: 1.5em; font-weight: bold; color: #1e293b; margin-bottom: 15px;">${skill.title}</div>
                                <div class="skill-question" style="color: #3b82f6; font-weight: 500;">
                                    ${skill.question}
                                </div>
                                <div class="skill-overlay" style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.9); color: white; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; font-weight: bold; opacity: 0; transition: opacity 0.3s;">
                                    Đã xem
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            let importantNoteHtml = '';
            if (content.importantNote) {
                importantNoteHtml = `
                    <div class="important-note" style="display: none; background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 30px; border-radius: 4px; animation: fadeIn 0.5s;">
                        <div style="font-size: 1.1em; font-weight: bold; color: #991b1b; margin-bottom: 5px;">${content.importantNote.icon} ${content.importantNote.title}</div>
                        <div style="color: #7f1d1d;">${content.importantNote.message}</div>
                    </div>
                `;
            }

            component.innerHTML = `
                <div class="component-header" style="text-align: center; margin-bottom: 20px;">
                    ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                </div>
                
                ${overviewHtml}
                ${skillsHtml}
                ${importantNoteHtml}
                
                <div class="teach-takeaway" style="display: none; margin-top: 20px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 25px; text-align: center; animation: fadeIn 0.5s;">
                    <div style="font-size: 24px; margin-bottom: 10px;">💡</div>
                    <div style="font-size: 1.15em; font-weight: bold; color: #065f46;">
                        ${content.keyMessage}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button id="btn-teach-done" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 8px; display: none;">
                        Đã hiểu quy trình →
                    </button>
                </div>
                
                <style>
                    @keyframes slideDownIn { to { opacity: 1; transform: translateY(0); } }
                    .anim-step.animate { animation: slideDownIn 0.5s forwards; }
                    .skill-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #3b82f6; }
                    .skill-card.viewed .skill-overlay { opacity: 1; }
                </style>
            `;

            this.bind(component, -1, 'visual_teach');
        } else {
            // Old format
            let cardsHtml = "";
            if (data.presentation && data.presentation.steps) {
                cardsHtml = data.presentation.steps.map((s, index) => `
                    <div class="teach-card" data-index="${index}" style="display: ${index === 0 ? 'block' : 'none'}; animation: fadeIn 0.5s;">
                        <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <h3 style="margin-top: 0; color: #1e293b; font-size: 1.3em; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 20px;">
                                ${s.title}
                            </h3>
                            
                            <div class="teach-visual" style="margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 8px; min-height: 200px; display: flex; align-items: center; justify-content: center;">
                                ${this.renderVisual(s.visual)}
                            </div>
                            
                            <div class="teach-explanation" style="font-size: 1.1em; color: #334155; line-height: 1.6; background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0;">
                                💡 ${s.explanation}
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            let takeawayHtml = "";
            if (data.keyTakeaway) {
                takeawayHtml = `
                    <div class="teach-takeaway" style="display: none; margin-top: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; animation: fadeIn 0.5s;">
                        <h3 style="margin-top: 0; color: #b45309; display: flex; align-items: center; gap: 10px;">
                            ⭐ ${data.keyTakeaway.title}
                        </h3>
                        <div style="font-size: 1.15em; font-weight: bold; color: #92400e; text-align: center; padding: 15px; background: white; border-radius: 8px;">
                            ${data.keyTakeaway.text}
                        </div>
                    </div>
                `;
            }

            component.innerHTML = `
                <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                    ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                    ${data.goal ? `<div style="color: #64748b; font-size: 1.1em;">🎯 ${data.goal}</div>` : ''}
                </div>
                
                <div class="teach-progress" style="display: flex; gap: 5px; margin-bottom: 20px; justify-content: center;">
                    ${Array.from({ length: stepsCount }).map((_, i) => `
                        <div class="progress-dot" data-dot-index="${i}" style="width: 30px; height: 6px; border-radius: 3px; background: ${i === 0 ? '#3b82f6' : '#e2e8f0'}; transition: background 0.3s;"></div>
                    `).join('')}
                </div>
                
                <div class="teach-cards-container" style="position: relative; margin-bottom: 30px;">
                    ${cardsHtml}
                    ${takeawayHtml}
                </div>
                
                <div class="teach-controls" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    <button id="btn-teach-prev" class="btn" style="visibility: hidden; background: #f1f5f9; color: #475569; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                        ← Quay lại
                    </button>
                    <button id="btn-teach-next" class="btn btn-primary" style="padding: 10px 30px; border-radius: 8px; font-weight: bold;">
                        Tiếp tục →
                    </button>
                </div>
                
                <style>
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
            `;

            this.bind(component, stepsCount, 'carousel');
        }
        return component;
    }

    static renderVisual(visual) {
        if (!visual) return '';

        switch (visual.type) {
            case 'textHighlight':
                let text = visual.content;
                let legendHtml = '';
                if (visual.highlights) {
                    legendHtml = '<div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 0.9em; text-align: left;">';
                    visual.highlights.forEach((h, i) => {
                        const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'];
                        const color = colors[i % colors.length];
                        text = text.replace(h.text, `<mark style="background: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${h.text}</mark>`);
                        legendHtml += `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 15px; height: 15px; background: ${color}; border-radius: 3px;"></div>
                                <span style="color: #475569;"><strong>${h.text}</strong>: ${h.meaning}</span>
                            </div>
                        `;
                    });
                    legendHtml += '</div>';
                }
                return `
                    <div style="text-align: center; width: 100%;">
                        <div style="font-size: 1.3em; color: #1e293b; padding: 20px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px;">
                            ${text}
                        </div>
                        ${legendHtml}
                    </div>
                `;

            case 'mindMap':
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                        <div style="background: #3b82f6; color: white; padding: 15px 25px; border-radius: 30px; font-weight: bold; margin-bottom: 30px; position: relative; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.5); z-index: 2;">
                            ${visual.center}
                        </div>
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; width: 100%; position: relative;">
                            ${visual.branches ? visual.branches.map(b => `
                                <div style="background: white; border: 2px solid #bfdbfe; border-radius: 12px; padding: 15px; min-width: 150px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="font-weight: bold; color: #1d4ed8; margin-bottom: 10px; border-bottom: 1px solid #e0f2fe; padding-bottom: 5px;">${b.label}</div>
                                    <ul style="margin: 0; padding: 0; list-style: none; color: #475569; font-size: 0.9em; display: flex; flex-direction: column; gap: 5px;">
                                        ${b.items ? b.items.map(i => `<li>• ${i}</li>`).join('') : ''}
                                    </ul>
                                </div>
                            `).join('') : ''}
                        </div>
                    </div>
                `;

            case 'ideaFilter':
                return `
                    <div style="display: flex; flex-direction: column; gap: 15px; width: 100%; max-width: 400px;">
                        ${visual.ideas ? visual.ideas.map(idea => `
                            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid ${idea.status === 'keep' ? '#86efac' : '#fca5a5'};">
                                <div style="font-size: 24px;">${idea.status === 'keep' ? '✅' : '❌'}</div>
                                <div style="color: ${idea.status === 'keep' ? '#166534' : '#991b1b'}; text-decoration: ${idea.status === 'remove' ? 'line-through' : 'none'};">${idea.text}</div>
                            </div>
                        `).join('') : ''}
                    </div>
                `;

            case 'flow':
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%;">
                        ${visual.nodes ? visual.nodes.map((node, index) => `
                            <div style="background: white; border: 2px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; font-weight: 500; color: #334155; text-align: center; width: 80%; max-width: 300px;">
                                ${node.text}
                            </div>
                            ${index < visual.nodes.length - 1 ? '<div style="color: #94a3b8; font-size: 20px;">↓</div>' : ''}
                        `).join('') : ''}
                    </div>
                `;

            case 'pipeline':
                return `
                    <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; width: 100%;">
                        ${visual.stages ? visual.stages.map((stage, index) => `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="background: ${index === visual.stages.length - 1 ? '#3b82f6' : 'white'}; color: ${index === visual.stages.length - 1 ? 'white' : '#334155'}; border: 2px solid #3b82f6; padding: 10px 15px; border-radius: 20px; font-weight: bold; font-size: 0.9em; white-space: nowrap;">
                                    ${stage}
                                </div>
                                ${index < visual.stages.length - 1 ? '<div style="color: #3b82f6; font-weight: bold;">→</div>' : ''}
                            </div>
                        `).join('') : ''}
                    </div>
                `;

            default:
                return `<div>Visual type '${visual.type}' chưa được hỗ trợ.</div>`;
        }
    }

    static bind(component, stepOrStepsCount, layoutType) {
        if (component.querySelector('.structure-map-container')) {
            const nodes = component.querySelectorAll('.btn-structure-node');
            const panel = component.querySelector('#structure-detail-panel');
            const panelContent = component.querySelector('#panel-content');

            const btnSummary = component.querySelector('#btn-show-summary');
            const decisionTable = component.querySelector('.decision-table-area');
            const coreRule = component.querySelector('.core-rule-area');
            const doneBtn = component.querySelector('#teach-done');

            let viewedNodesCount = 0;
            const structures = component.data_structures || [];

            nodes.forEach(node => {
                node.addEventListener('click', () => {
                    const structId = node.dataset.id;
                    const struct = structures.find(s => s.id === structId);

                    if (struct) {
                        // Generate structure diagram based on pattern
                        let diagramHtml = '';
                        if (struct.id === 'dien_dich') {
                            diagramHtml = `
                                <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">Ý CHÍNH</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="color: #64748b; margin-bottom: 5px;">TRIỂN KHAI</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="color: #64748b;">VÍ DỤ</div>
                            `;
                        } else if (struct.id === 'quy_nap') {
                            diagramHtml = `
                                <div style="color: #64748b; margin-bottom: 5px;">CHI TIẾT</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="color: #64748b; margin-bottom: 5px;">PHÂN TÍCH</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="font-weight: bold; color: #334155;">Ý CHÍNH</div>
                            `;
                        } else if (struct.id === 'tong_phan_hop') {
                            diagramHtml = `
                                <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">Ý KHÁI QUÁT</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="color: #64748b; margin-bottom: 5px;">PHÂN TÍCH / TRIỂN KHAI</div>
                                <div style="color: #94a3b8; margin-bottom: 5px;">↓</div>
                                <div style="font-weight: bold; color: #334155;">KHẲNG ĐỊNH LẠI</div>
                            `;
                        } else if (struct.id === 'song_hanh') {
                            diagramHtml = `
                                <div style="display: flex; justify-content: center; align-items: center; gap: 10px; color: #334155;">
                                    <div style="font-weight: bold;">Ý A</div>
                                    <div style="color: #94a3b8;">↔</div>
                                    <div style="font-weight: bold;">Ý B</div>
                                    <div style="color: #94a3b8;">↔</div>
                                    <div style="font-weight: bold;">Ý C</div>
                                </div>
                            `;
                        } else if (struct.id === 'moc_xich') {
                            diagramHtml = `
                                <div style="display: flex; justify-content: center; align-items: center; gap: 10px; color: #334155;">
                                    <div style="font-weight: bold;">Ý 1</div>
                                    <div style="color: #94a3b8;">→</div>
                                    <div style="font-weight: bold;">Ý 2</div>
                                    <div style="color: #94a3b8;">→</div>
                                    <div style="font-weight: bold;">Ý 3</div>
                                </div>
                            `;
                        } else {
                            diagramHtml = `<div style="font-weight: bold; color: #3b82f6;">${struct.pattern}</div>`;
                        }

                        panelContent.innerHTML = `
                            <div style="text-align: center; margin-bottom: 25px;">
                                <div style="font-size: 2em; margin-bottom: 10px;">${struct.icon} ${struct.name.toUpperCase()}</div>
                                <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; font-size: 1.1em;">
                                    ${diagramHtml}
                                </div>
                            </div>
                            
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 20px;">
                                <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">🧠 ĐẶC ĐIỂM</div>
                                <div style="color: #475569; font-size: 1.1em; line-height: 1.5;">${struct.description}</div>
                            </div>
                            
                            <div style="background: #fefce8; border: 2px solid #fef08a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <div style="font-weight: bold; color: #854d0e; font-size: 1.2em; margin-bottom: 10px;">💡 KHI NÀO NÊN DÙNG?</div>
                                <div style="color: #a16207; font-size: 1.2em; font-weight: bold;">${struct.whenToUse}</div>
                                ${struct.name === 'Diễn dịch' ? '<div style="color: #ca8a04; margin-top: 5px;">→ Muốn người đọc biết ngay mình đang nói gì? Chọn Diễn dịch.</div>' : ''}
                                ${struct.name === 'Quy nạp' ? '<div style="color: #ca8a04; margin-top: 5px;">→ Muốn dẫn dắt người đọc rồi mới đưa ra kết luận? Chọn Quy nạp.</div>' : ''}
                                ${struct.name === 'Tổng – phân – hợp' ? '<div style="color: #ca8a04; margin-top: 5px;">→ Muốn nêu ý → phân tích → nhấn mạnh lại? Chọn Tổng – phân – hợp.</div>' : ''}
                                ${struct.name === 'Song hành' ? '<div style="color: #ca8a04; margin-top: 5px;">→ Muốn trình bày nhiều phương diện ngang hàng? Chọn Song hành.</div>' : ''}
                            </div>
                            
                            ${struct.example ? `
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">👀 VÍ DỤ</div>
                                    <div style="color: #475569; font-style: italic; background: #f1f5f9; padding: 15px; border-radius: 8px;">"${struct.example}"</div>
                                </div>
                            ` : ''}
                        `;

                        // Show and scroll to panel
                        panel.style.display = 'block';
                        setTimeout(() => {
                            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 50);

                        // Active state styling
                        nodes.forEach(n => n.classList.remove('active-node'));
                        node.classList.add('active-node');

                        if (!node.classList.contains('viewed')) {
                            node.classList.add('viewed');
                            viewedNodesCount++;

                            if (viewedNodesCount === nodes.length) {
                                btnSummary.style.display = 'inline-block';
                            }
                        }
                    }
                });
            });

            btnSummary?.addEventListener('click', () => {
                btnSummary.style.display = 'none';
                if (decisionTable) decisionTable.style.display = 'block';
                if (coreRule) coreRule.style.display = 'block';
                if (doneBtn) doneBtn.style.display = 'inline-block';

                // Scroll to summary
                decisionTable?.scrollIntoView({ behavior: 'smooth' });
            });

            doneBtn?.addEventListener('click', () => {
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            });

            return;
        }

        if (layoutType === 'visual_teach') {
            // Animation for bird's eye view
            const animSteps = component.querySelectorAll('.anim-step');
            const treeBranches = component.querySelectorAll('.tree-branch');
            let animDuration = 0;

            if (animSteps.length > 0) {
                animSteps.forEach((step, idx) => {
                    setTimeout(() => {
                        step.classList.add('animate');
                    }, 500 + (idx * 300));
                });
                animDuration = 500 + (animSteps.length * 300) + 500;
            } else if (treeBranches.length > 0) {
                treeBranches.forEach((branch, idx) => {
                    setTimeout(() => {
                        branch.style.opacity = '1';
                        branch.style.transform = 'translateY(0)';
                    }, 500 + (idx * 400));
                });
                animDuration = 500 + (treeBranches.length * 400) + 500;
            } else {
                animDuration = 500;
            }

            // Skill cards interaction
            const skillCards = component.querySelectorAll('.skill-card');
            const btnDone = component.querySelector('#btn-teach-done');
            let viewedCount = 0;
            const totalSkills = skillCards.length;

            // Show cards after animation
            setTimeout(() => {
                const skillsContainer = component.querySelector('.teach-skills');
                if (skillsContainer) skillsContainer.style.opacity = '1';

                const importantNote = component.querySelector('.important-note');
                if (importantNote) importantNote.style.display = 'block';
            }, animDuration);

            skillCards.forEach(card => {
                card.addEventListener('click', () => {
                    if (!card.classList.contains('viewed')) {
                        card.classList.add('viewed');
                        viewedCount++;

                        // Small bounce effect
                        card.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            card.style.transform = '';
                        }, 150);

                        if (viewedCount === totalSkills) {
                            setTimeout(() => {
                                const takeaway = component.querySelector('.teach-takeaway');
                                if (takeaway) takeaway.style.display = 'block';

                                if (btnDone) btnDone.style.display = 'inline-block';
                            }, 500);
                        }
                    }
                });
            });

            if (btnDone) {
                btnDone.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }

            return;
        }

        // Old layout logic
        const btnPrev = component.querySelector("#btn-teach-prev");
        const btnNext = component.querySelector("#btn-teach-next");
        const takeaway = component.querySelector(".teach-takeaway");
        const stepsCount = component.querySelectorAll(".teach-card").length;

        let current = 0;

        const updateView = () => {
            // Update cards
            component.querySelectorAll(".teach-card").forEach((card, index) => {
                card.style.display = index === current ? 'block' : 'none';
            });

            // Update dots
            component.querySelectorAll(".progress-dot").forEach((dot, index) => {
                dot.style.background = index <= current ? '#3b82f6' : '#e2e8f0';
            });

            // Update Prev button visibility
            btnPrev.style.visibility = current > 0 ? 'visible' : 'hidden';

            // Update Next button state & Takeaway
            if (current === stepsCount - 1) {
                if (takeaway) takeaway.style.display = 'block';
                btnNext.innerHTML = 'Đã hiểu & Hoàn thành ✓';
                btnNext.classList.remove('btn-primary');
                btnNext.classList.add('btn-success');
                btnNext.style.background = '#10b981';
                btnNext.style.color = 'white';
            } else {
                if (takeaway) takeaway.style.display = 'none';
                btnNext.innerHTML = 'Tiếp tục →';
                btnNext.classList.add('btn-primary');
                btnNext.classList.remove('btn-success');
                btnNext.style.background = ''; // reset to default css
                btnNext.style.color = '';
            }
        };

        btnPrev?.addEventListener("click", () => {
            if (current > 0) {
                current--;
                updateView();
            }
        });

        btnNext?.addEventListener("click", () => {
            if (current < stepsCount - 1) {
                current++;
                updateView();
            } else {
                // Done
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            }
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

export default Teach;
