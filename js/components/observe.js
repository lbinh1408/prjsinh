/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/observe.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import ConnectionMap from "./connectionMap.js";

class Observe {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;

        const format = (data.format) || (data.content && data.content.format) || (data.content && data.content.isParagraph ? "essay" : "sentence");
        const component = document.createElement("div");
        component.className = "component observe-component";

        if (data.words && Array.isArray(data.words)) {
            component.innerHTML = `
                <style>
                    .obs-word-wrapper { width: 100%; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
                    .obs-word-eyebrow { font-size: 13px; font-weight: 700; color: #5d56c4; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
                    .obs-word-title { font-size: 32px; font-weight: 800; color: #1e202c; margin: 0 0 10px 0; }
                    .obs-word-desc { font-size: 16px; color: #64748b; margin-bottom: 30px; }
                    
                    .obs-word-content { 
                        background: #fcfcfd; 
                        border-radius: 12px; 
                        padding: 30px 40px; 
                        font-size: 18px; 
                        line-height: 1.8; 
                        color: #334155; 
                        margin-bottom: 30px; 
                        border-left: 4px solid #5d56c4; 
                    }
                    
                    .obs-word-list { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 30px; }
                    .obs-word-chip {
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 12px 20px;
                        font-size: 16px;
                        color: #1e293b;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }
                    .obs-word-chip:hover { border-color: #cbd5e1; background: #f8fafc; }
                    .obs-word-chip.active { border-color: #5d56c4; border-width: 2px; color: #5d56c4; padding: 11px 19px; background: #f4f5fc; }
                    
                    .obs-word-feedback {
                        background: #fef9c3;
                        border: 1px solid #fef08a;
                        border-radius: 12px;
                        padding: 20px 24px;
                        font-size: 16px;
                        color: #422006;
                        margin-bottom: 30px;
                        display: none;
                        animation: fadeIn 0.3s ease;
                    }
                    .obs-word-feedback-title { font-weight: bold; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
                    
                    .obs-word-actions { display: flex; justify-content: flex-end; }
                    .obs-word-next {
                        background: #5648d4;
                        color: white;
                        border: none;
                        padding: 14px 28px;
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .obs-word-next:hover { background: #463bb5; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                <div class="obs-word-wrapper">
                    
                    <h1 class="obs-word-title">${data.instruction || 'Em nhìn thấy những từ nào?'}</h1>
                    <p class="obs-word-desc">${data.description || 'Hãy chọn những từ đang làm nhiệm vụ "gọi tên" người, vật, nơi chốn, sự việc hoặc khái niệm.'}</p>
                    
                    <div class="obs-word-content">
                        ${data.content}
                    </div>
                    
                    <div class="obs-word-list">
                        ${data.words.map((w, i) => `<button class="obs-word-chip" data-idx="${i}">${w}</button>`).join('')}
                    </div>
                    
                    <div class="obs-word-feedback" id="obs-word-fb">
                        <div class="obs-word-feedback-title">🔎 Chưa cần vội xem đáp án.</div>
                        <div>Hãy tự hỏi: <b>“${data.feedback || 'Từ này đang gọi tên cái gì?'}”</b></div>
                    </div>
                    
                    <div class="obs-word-actions">
                        <button class="obs-word-next" id="obs-word-btn-next">Tiếp tục <span>→</span></button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const chips = component.querySelectorAll('.obs-word-chip');
                const fbEl = component.querySelector('#obs-word-fb');
                const nextBtn = component.querySelector('#obs-word-btn-next');

                chips.forEach(chip => {
                    chip.addEventListener('click', () => {
                        chip.classList.toggle('active');
                        // Show feedback when any chip is clicked
                        fbEl.style.display = 'block';
                    });
                });

                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                }
            }, 0);

            return component;
        }

        if (data.ui && data.ui.component === 'paragraph_highlight') {
            const ui = data.ui;
            const paragraph = data.content.paragraph || [];

            component.innerHTML = `
                <style>
                    .ph-wrapper { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
                    .ph-header { text-align: center; margin-bottom: 30px; }
                    .ph-title { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
                    .ph-question { font-size: 1.2rem; color: #b45309; background: #fef3c7; border: 2px dashed #f59e0b; padding: 15px; border-radius: 12px; font-weight: 600; display: inline-block; }
                    .ph-content { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; line-height: 1.9; font-size: 1.2rem; color: #334155; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    
                    /* Chung cho phần tử con */
                    .ph-item { cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; border-bottom: 2px solid transparent; }
                    .ph-item:hover { background: #f1f5f9; border-bottom-color: #94a3b8; }
                    .ph-item.active { background: #e0e7ff; color: #3730a3; border-bottom-color: #6366f1; font-weight: 600; }
                    
                    /* Format 1: Đoạn văn nối tiếp */
                    .ph-content.format-paragraph { text-indent: 80px; }
                    .ph-content.format-paragraph .ph-item { display: inline; }
                    
                    /* Format 2: Bài văn nhiều đoạn */
                    .ph-content.format-essay .ph-item { display: block; text-indent: 80px; margin-bottom: 12px; }
                    
                    /* Format 3: Câu rời / Thơ */
                    .ph-content.format-poem .ph-item, .ph-content.format-sentence .ph-item { display: block; text-indent: 0; margin-bottom: 8px; }

                    .ph-feedback { display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 1.15rem; color: #0f172a; margin-bottom: 30px; text-align: center; font-weight: 600; animation: fadeIn 0.3s; }
                    .ph-next { padding: 14px 32px; background: #6d5dfc; color: white; border: none; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: block; margin: 0 auto; opacity: 0.5; pointer-events: none; transition: all 0.3s; }
                    .ph-next.ready { opacity: 1; pointer-events: auto; }
                    .ph-next.ready:hover { background: #5b4be8; transform: translateY(-2px); }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                <div class="ph-wrapper">
                    <div class="ph-header">
                        ${promptText ? `<div class="ph-title">${promptText}</div>` : ''}
                        <div class="ph-question">👆 ${ui.question || 'Hãy chạm vào từng câu'}</div>
                    </div>
                    <div class="ph-content format-${format}">
                        ${paragraph.map((s, i) => `
                            <span class="ph-item" data-idx="${i}" data-type="${s.type}">${s.text}</span>
                `).join(' ')}
                    </div>
                    <div class="ph-feedback" id="ph-fb"></div>
                    <button class="ph-next" id="ph-btn-next">Tiếp tục →</button>
                </div>
            `;

            setTimeout(() => {
                const sentences = component.querySelectorAll('.ph-item');
                const fbEl = component.querySelector('#ph-fb');
                const nextBtn = component.querySelector('#ph-btn-next');
                let clickedCount = 0;
                let clickedSet = new Set();

                sentences.forEach(el => {
                    el.addEventListener('click', () => {
                        const idx = parseInt(el.dataset.idx, 10);
                        const sData = paragraph[idx];

                        sentences.forEach(s => s.classList.remove('active'));
                        el.classList.add('active');

                        let titleHtml = sData.roleLabel;
                        if (sData.link) {
                            titleHtml = `<a href="#/lesson?id=${sData.link}" style="color:#6d5dfc; text-decoration: underline; display: inline-flex; align-items: center; gap: 5px;" title="Tới bài học này">${sData.roleLabel} <span style="font-size: 0.9em">🔗</span></a>`;
                        }

                        let fbHtml = sData.roleLabel ? `<div><b style="color:#6d5dfc;">${titleHtml}</b></div>` : '';

                        if (sData.feedback) {
                            fbHtml += `<div style="margin-top:5px; font-weight:normal; font-size:1.05rem;">${sData.feedback}</div>`;
                        }

                        fbEl.innerHTML = fbHtml;
                        fbEl.style.display = 'block';

                        if (!clickedSet.has(idx)) {
                            clickedSet.add(idx);
                            clickedCount++;
                            if (clickedCount >= sentences.length) {
                                nextBtn.classList.add('ready');
                            }
                        }
                    });
                });

                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                }
            }, 0);

            return component;
        }

        if (data.ui && data.ui.layout === 'four_cards') {
            const ui = data.ui;
            const cards = data.cards || [];

            component.innerHTML = `
                <style>
                    .observe-tc-wrapper { padding: 20px 0; max-width: 900px; margin: 0 auto; text-align: center; }
                    .observe-tc-hero { margin-bottom: 30px; }
                    .observe-tc-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                    .observe-tc-hero h1 { font-size: 2.2rem; color: #1e293b; line-height: 1.2; margin-bottom: 10px; }
                    .observe-tc-hero p { color: #64748b; font-size: 1.1rem; }
                    
                    .observe-tc-tabs { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
                    .observe-tc-tab { padding: 10px 20px; border-radius: 99px; background: #eef0f5; color: #475569; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
                    .observe-tc-tab:hover { background: #e2e8f0; }
                    .observe-tc-tab.active { background: #6d5dfc; color: white; box-shadow: 0 4px 10px rgba(109, 93, 252, 0.3); }
                    
                    .observe-tc-content { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); min-height: 180px; margin-bottom: 30px; }
                    .observe-tc-text { font-size: 1.2rem; color: #1e293b; line-height: 1.7; margin-bottom: 20px; }
                    .observe-tc-tags { display: flex; gap: 10px; flex-wrap: wrap; }
                    .observe-tc-tag { padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; }
                    .observe-tc-tag.tag-0 { background: #fee2e2; color: #b91c1c; }
                    .observe-tc-tag.tag-1 { background: #dcfce7; color: #15803d; }
                    .observe-tc-tag.tag-2 { background: #fef3c7; color: #b45309; }
                    .observe-tc-tag.tag-3 { background: #e0e7ff; color: #4338ca; }
                    
                    .observe-tc-question { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 1.2rem; color: #1e293b; margin-bottom: 20px; }
                    
                    .observe-tc-actions { margin-top: 20px; }
                    .observe-tc-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .observe-tc-btn:hover { background: #5b4be8; }
                </style>
                
                <div class="observe-tc-wrapper">
                    <div class="observe-tc-hero">
                        <div class="emoji">👀</div>
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                        <p>${ui.instruction || 'Chạm từng đoạn để nhìn thấy “việc” người viết đang làm.'}</p>
                    </div>
                    
                    <div class="observe-tc-tabs" id="otabs">
                        ${cards.map((c, i) => `
                            <div class="observe-tc-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                                ${c.id}. ${c.hiddenLabel || ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="observe-tc-content" id="ocontent">
                        <div class="observe-tc-text" id="otext"></div>
                        <div class="observe-tc-tags" id="otags"></div>
                    </div>
                    
                    <div class="observe-tc-question">
                        <b>“${ui.question || ''}”</b>
                        <p class="muted" style="color: #64748b; font-size: 0.95rem; margin-top: 10px;">${data.reveal || ''}</p>
                    </div>
                    
                    <div class="observe-tc-actions">
                        <button class="observe-tc-btn" id="btn-tc-next" style="display:none;">Tự tìm quy luật →</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const tabs = component.querySelectorAll('.observe-tc-tab');
                const textEl = component.querySelector('#otext');
                const tagsEl = component.querySelector('#otags');
                const btnNext = component.querySelector('#btn-tc-next');

                let viewedTabs = new Set();

                const updateContent = (idx) => {
                    const card = cards[idx];
                    textEl.innerHTML = card.text || '';
                    tagsEl.innerHTML = (card.highlight || []).map(h => `<div class="observe-tc-tag tag-${idx}">${h}</div>`).join('');
                };

                // Init first tab
                if (cards.length > 0) {
                    updateContent(0);
                    viewedTabs.add(0);
                }

                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        tabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');

                        const idx = parseInt(tab.dataset.idx);
                        updateContent(idx);
                        viewedTabs.add(idx);

                        // If all tabs are viewed, show next button
                        if (viewedTabs.size === cards.length) {
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

        if (data.ui && data.ui.layout === 'compare') {
            const ui = data.ui;
            const items = ui.items || [];
            const prompt = data.observation_prompt || {};

            component.innerHTML = `
                <style>
                    .observe-compare-wrapper { padding: 20px 0; }
                    .observe-compare-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .observe-compare-wrapper h2 { font-size: 29px; margin-bottom: 10px; color: #172033; }
                    .observe-compare-wrapper .muted { color: #697386; line-height: 1.65; margin-bottom: 20px; }
                    .observe-compare-wrapper .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                    .observe-compare-wrapper .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; cursor: pointer; transition: all 0.2s; }
                    .observe-compare-wrapper .card.sel { outline: 2px solid #6d5dfc; background: #faf9ff; }
                    .observe-compare-wrapper .pill { display: inline-block; padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5b4be8; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
                    .observe-compare-wrapper h3 { margin: 0 0 10px 0; color: #172033; font-size: 1.2em; }
                    .observe-compare-wrapper .text { font-size: 18px; line-height: 1.8; margin-bottom: 20px; color: #172033; }
                    .observe-compare-wrapper .soft { border: 1px solid #d9ddea; border-radius: 12px; padding: 12px 15px; background: #eef0f5; cursor: pointer; text-align: left; font-weight: bold; color: #172033; border: 0; width: auto; }
                    .observe-compare-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                    .observe-compare-wrapper .primary { background: #6d5dfc; color: #fff; }
                    .observe-compare-wrapper .primary:hover { background: #5b4be8; }
                </style>
                <div class="observe-compare-wrapper">
                    <div class="ey">❷ OBSERVE</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    <p class="muted">${ui.instruction || data.instruction || 'Chạm vào A hoặc B. Hãy chọn đoạn em muốn đọc tiếp.'}</p>
                    
                    <div class="compare">
                        ${items.map((item, i) => `
                            <div class="card" data-idx="${i}">
                                <span class="pill">${item.id}</span>
                                <h3>${item.label}</h3>
                                <p class="text">${item.text}</p>
                                ${item.audio ? `<button class="soft btn-audio">▶ Đọc ${item.id}</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="card" style="cursor:default;">
                        <b>💡 ${prompt.text || 'Điều gì khiến đoạn B tự nhiên hơn?'}</b>
                        <p class="muted">${data.hint?.text || ''}</p>
                    </div>
                    
                    <button class="btn primary" id="oc-btn-next" style="display:none; margin-top: 20px;">🕵️ Khám phá quy tắc →</button>
                </div>
            `;

            setTimeout(() => {
                const cards = component.querySelectorAll('.compare .card');
                const btnNext = component.querySelector('#oc-btn-next');

                cards.forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (e.target.classList.contains('btn-audio')) return;
                        cards.forEach(c => c.classList.remove('sel'));
                        card.classList.add('sel');
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
            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <p class="question-text">${data.instruction || step.instruction || ""}</p>
                </div>
                <div class="observe-comparison-toggle" style="margin-top: 20px; max-width: 600px; margin: 20px auto 0;">
                    <div style="display: flex; background: #e2e8f0; padding: 5px; border-radius: 12px; margin-bottom: 20px;">
                        <button class="toggle-btn toggle-a active" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s; color: #1e293b;">
                            🅰 ĐOẠN A (Rời rạc)
                        </button>
                        <button class="toggle-btn toggle-b" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: transparent; font-weight: bold; cursor: pointer; transition: all 0.2s; color: #64748b;">
                            🅱 ĐOẠN B (Liền mạch)
                        </button>
                    </div>
                    <div class="connection-map-a"></div>
                    <div class="connection-map-b" style="display: none;"></div>
                </div>
                <div class="observe-question-container" style="display: none; margin-top: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 600px; margin-left: auto; margin-right: auto; text-align: left;">
                    <div style="font-size: 1.1em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">
                        ⑤ ${data.question?.text || "Điều gì khiến đoạn B có cảm giác liền mạch hơn?"}
                    </div>
                    <div class="observe-options" style="display: flex; flex-direction: column; gap: 10px;">
                    </div>
                </div>
                <div class="observe-next-container" style="display: none; text-align: center; margin-top: 30px;">
                    <button class="btn btn-primary" onclick="window.engine && window.engine.next()">Tiếp tục</button>
                </div>
            `;

            const mapA = ConnectionMap.render(data.connectionData.A);
            const mapB = ConnectionMap.render(data.connectionData.B);

            component.querySelector('.connection-map-a').appendChild(mapA);
            component.querySelector('.connection-map-b').appendChild(mapB);

            const btnA = component.querySelector('.toggle-a');
            const btnB = component.querySelector('.toggle-b');
            const viewA = component.querySelector('.connection-map-a');
            const viewB = component.querySelector('.connection-map-b');
            const qContainer = component.querySelector('.observe-question-container');
            const optionsGroup = component.querySelector('.observe-options');
            const nextContainer = component.querySelector('.observe-next-container');

            // Populate options
            (data.question?.options || []).forEach((opt, idx) => {
                const btn = document.createElement("button");
                btn.style.cssText = `
                    text-align: left;
                    padding: 12px 15px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    background: white;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1em;
                `;
                btn.innerText = "☐ " + opt;
                btn.onclick = () => {
                    // Reset all
                    Array.from(optionsGroup.children).forEach(child => {
                        child.style.background = "white";
                        child.style.borderColor = "#cbd5e1";
                        child.style.color = "#475569";
                        child.innerText = "☐ " + child.innerText.substring(2);
                    });

                    if (idx === data.question.correct) {
                        btn.style.background = "#dcfce7";
                        btn.style.borderColor = "#22c55e";
                        btn.style.color = "#166534";
                        btn.innerText = "☑ " + opt;
                        nextContainer.style.display = "block"; // Show next when correct
                    } else {
                        btn.style.background = "#fee2e2";
                        btn.style.borderColor = "#ef4444";
                        btn.style.color = "#991b1b";
                        btn.innerText = "☒ " + opt;
                        // shake
                        btn.style.transform = "translate(5px)";
                        setTimeout(() => btn.style.transform = "translate(-5px)", 50);
                        setTimeout(() => btn.style.transform = "translate(0)", 100);
                    }
                };
                optionsGroup.appendChild(btn);
            });

            btnA.addEventListener('click', () => {
                btnA.classList.add('active');
                btnA.style.background = 'white';
                btnA.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                btnA.style.color = '#1e293b';

                btnB.classList.remove('active');
                btnB.style.background = 'transparent';
                btnB.style.boxShadow = 'none';
                btnB.style.color = '#64748b';

                viewA.style.display = 'block';
                viewB.style.display = 'none';
                qContainer.style.display = 'none';
            });

            btnB.addEventListener('click', () => {
                btnB.classList.add('active');
                btnB.style.background = 'white';
                btnB.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                btnB.style.color = '#1e293b';

                btnA.classList.remove('active');
                btnA.style.background = 'transparent';
                btnA.style.boxShadow = 'none';
                btnA.style.color = '#64748b';

                viewB.style.display = 'block';
                viewA.style.display = 'none';
                qContainer.style.display = 'block'; // Show question only in B mode
            });

            return component;
        }

        component.innerHTML = `
            <div class="component-header">
                ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ""}
                <p class="question-text">
                    ${data.instruction || step.instruction || data.question || step.question || ""}
                </p>
            </div>
            ${this.renderContent(step)}
            ${this.renderGuide(step)}
            ${this.renderAction(step)}
        `;

        this.bind(component, step);
        return component;
    }

    /**
     * ======================================================
     * CONTENT
     * ======================================================
     */

    static renderContent(step) {
        const data = step.data || step;

        if (data.ui && data.ui.layout === 'comparison' && data.content && data.content.comparison) {
            const comp = data.content.comparison;
            return `
                <div class="observe-comparison-toggle" style="margin-top: 20px; max-width: 600px; margin: 20px auto 0;">
                    
                    <div style="display: flex; background: #e2e8f0; padding: 5px; border-radius: 12px; margin-bottom: 20px;">
                        <button class="toggle-btn toggle-a active" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: white; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s; color: #1e293b;">
                            ${comp.optionA.label} - ${comp.optionA.title}
                        </button>
                        <button class="toggle-btn toggle-b" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: transparent; font-weight: bold; cursor: pointer; transition: all 0.2s; color: #64748b;">
                            ${comp.optionB.label} - ${comp.optionB.title}
                        </button>
                    </div>

                    <div class="content-view view-a" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; min-height: 250px;">
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            ${comp.optionA.content.map(txt => `
                                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #cbd5e1;">${txt}</div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="content-view view-b" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; min-height: 250px; display: none;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            ${comp.optionB.content.map(txt => {
                if (txt === '↓') {
                    return `<div class="b-line" style="color: #94a3b8; font-weight: bold; font-size: 1.2em; opacity: 0; transform: translateY(-10px); transition: all 0.5s;">↓</div>`;
                }
                return `
                                    <div class="b-line" style="background: #e0f2fe; color: #0284c7; padding: 12px 30px; border-radius: 20px; font-weight: bold; width: 80%; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #bae6fd; opacity: 0; transform: translateY(-10px); transition: all 0.5s;">
                                        ${txt}
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                </div>
                ${data.content.options ? `
                <div class="observe-options" style="margin-top: 30px; display: none; flex-direction: column; align-items: center; max-width: 600px; margin: 30px auto 0;">
                    <div style="font-weight: bold; font-size: 1.2em; margin-bottom: 20px; color: #1e293b;">
                        👀 Em thấy điều gì khác?
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
                        ${data.content.options.map(opt => `
                            <button class="opt-btn" data-id="${opt.id}" data-feedback="${opt.feedback}" style="padding: 10px 20px; border: 2px solid #cbd5e1; border-radius: 20px; background: white; cursor: pointer; font-weight: bold; color: #475569; transition: all 0.2s;">
                                ${opt.label}
                            </button>
                        `).join('')}
                    </div>
                    <div class="opt-feedback" style="background: #f8fafc; padding: 15px 25px; border-radius: 12px; border-left: 4px solid #3b82f6; font-style: italic; color: #334155; margin-bottom: 20px; display: none;"></div>
                </div>
                ` : ''}
            `;
        } else if (data.ui && data.ui.layout === 'interactive_examples') {
            const paragraphs = data.content.paragraphs || [];

            return `
                <div class="interactive-examples-container" style="max-width: 800px; margin: 0 auto; text-align: center;">
                    <!-- Intro Screen -->
                    <div id="obs-intro" style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 2px solid #e2e8f0; animation: fadeIn 0.5s;">
                        <div style="font-size: 3em; margin-bottom: 20px;">👀</div>
                        <h2 style="color: #0f172a; font-size: 2em; letter-spacing: 1px; margin-bottom: 20px;">OBSERVE</h2>
                        <div style="font-size: 1.2em; color: #475569; margin-bottom: 10px;">Những đoạn văn này đang được tổ chức như thế nào?</div>
                        <div style="font-size: 1.1em; color: #b45309; font-style: italic; background: #fef3c7; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-bottom: 30px;">
                            Không cần nhớ tên. Chỉ cần QUAN SÁT.
                        </div>
                        <br>
                        <button id="btn-obs-start" class="btn btn-primary" style="padding: 12px 40px; font-size: 1.2em; border-radius: 30px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3);">
                            👀 Bắt đầu
                        </button>
                    </div>

                    <!-- Main Carousel -->
                    <div id="obs-main" style="display: none; animation: fadeIn 0.5s;">
                        <div style="font-weight: bold; color: #64748b; margin-bottom: 15px; letter-spacing: 2px;" id="obs-progress">
                            ĐOẠN 1 / ${paragraphs.length}
                        </div>
                        
                        <div id="obs-instruction" style="background: #eff6ff; border: 2px solid #bfdbfe; color: #1d4ed8; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1em; margin-bottom: 25px; animation: pulse 2s infinite;">
                            👆 Nếu phải chọn một câu đang dẫn đường cho cả đoạn, em chọn câu nào?
                        </div>
                        
                        <div class="carousel-container" style="position: relative; overflow: hidden; min-height: 350px; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                            ${paragraphs.map((p, index) => {
                const splitSentences = (text) => text.split(/(?<=\.)\s+/).filter(Boolean);
                const sentences = splitSentences(p.text);
                const isFirst = index === 0;
                return `
                                    <div class="observe-slide slide-${index}" data-index="${index}" style="display: ${isFirst ? 'block' : 'none'}; animation: fadeIn 0.5s;">
                                        <div class="paragraph-content" style="line-height: 2; font-size: 1.2em; color: #334155; text-align: left; margin-bottom: 30px;">
                                            ${sentences.map((s, sIdx) => `
                                                <span class="interactive-sentence" data-paragraph-idx="${index}" data-sentence-idx="${sIdx}" style="cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.2s, border 0.2s; display: inline-block; border: 2px solid transparent;">${s.trim()}</span>
                                            `).join(' ')}
                                        </div>
                                        
                                        <div class="obs-feedback" style="display: none; margin-bottom: 20px; font-weight: bold; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
                                        </div>
                                        
                                        <div class="structure-visual" style="display: none; padding: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; min-height: 150px; flex-direction: column; align-items: center; justify-content: center; gap: 10px; animation: fadeIn 0.5s;">
                                            <!-- Visual injected here by JS -->
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                        
                        <div class="nav-controls" style="display: flex; justify-content: center; gap: 15px;">
                            <button class="btn btn-primary btn-next-slide" style="display: none; padding: 12px 30px; font-size: 1.1em; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3);">Tiếp tục →</button>
                        </div>
                    </div>

                    <!-- Pattern Wall (End of Observe) -->
                    <div id="obs-pattern-wall" style="display: none; animation: fadeIn 0.5s; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 2px solid #e2e8f0;">
                        <div style="font-size: 1.5em; font-weight: bold; color: #1e40af; margin-bottom: 30px;">👀 EM VỪA NHÌN THẤY GÌ?</div>
                        
                        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
                            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">ĐOẠN 1</div>
                                <div style="color: #64748b; font-weight: bold; font-size: 1.2em;">[1]<br>↓<br>[2]<br>↓<br>[3]</div>
                            </div>
                            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">ĐOẠN 2</div>
                                <div style="color: #64748b; font-weight: bold; font-size: 1.2em;">[1]<br>↓<br>[2]<br>↓<br>[3]</div>
                            </div>
                            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">ĐOẠN 3</div>
                                <div style="color: #64748b; font-weight: bold; font-size: 1.2em;">[1] → [2] → [3]</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 40px;">
                            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">ĐOẠN 4</div>
                                <div style="color: #64748b; font-weight: bold; font-size: 1.2em;">🔗<br>↓<br>🔗<br>↓<br>🔗</div>
                            </div>
                            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px;">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">ĐOẠN 5</div>
                                <div style="color: #64748b; font-weight: bold; font-size: 1.2em;">[1]<br>↓<br>[2+3]<br>↓<br>[4]</div>
                            </div>
                        </div>
                        
                        <div style="font-weight: bold; color: #334155; font-size: 1.2em; margin-bottom: 30px; background: #fef3c7; padding: 15px; border-radius: 8px; display: inline-block;">
                            ❓ Các đoạn văn có được tổ chức theo cùng một cách không?
                        </div>
                        
                        <div>
                            <button id="obs-done" class="btn btn-primary" style="padding: 12px 40px; font-size: 1.2em; border-radius: 8px; font-weight: bold;">
                                Đi tiếp
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
                    .interactive-sentence:hover { background: #f1f5f9; }
                </style>
            `;
        }

        if (data.image) {
            return `
                <div class="observe-image">
                    <img src="${data.image}" alt="observe">
                </div>
            `;
        }

        if (data.examples) {
            return `
                <div class="observe-examples">
                    ${data.examples.map(item => `
                        <div class="observe-card">${item}</div>
                    `).join("")}
                </div>
            `;
        }

        if (data.content) {
            if (typeof data.content === 'string') {
                const format = data.format || "sentence";
                const formatStyle = (format === "essay" || format === "paragraph") ? "text-indent: 80px;" : "";

                return `
                    <div class="observe-content format-${format}" style="padding: 10px; background: #f8f9fa; border-radius: 8px; line-height: 1.6; color: #333; ${formatStyle}">
                        ${data.content}
                    </div>
                `;
            } else if (data.content.type === 'comparison' && data.content.students) {
                let subPrompt = data.content.prompt || "";
                if (subPrompt && typeof subPrompt === 'object') subPrompt = subPrompt.text || "";

                return `
                    <div class="observe-comparison" style="margin-top: 20px;">
                        ${subPrompt ? `<div style="margin-bottom: 20px; font-style: italic; color: #666; text-align: center;">${subPrompt}</div>` : ''}
                        
                        <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                            ${data.content.students.map(student => `
                                <div class="student-card" style="flex: 1; min-width: 250px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                                        <div style="font-size: 30px;">${student.name === 'Lan' ? '👧' : '👦'}</div>
                                        <div>
                                            <div style="font-weight: bold; font-size: 1.1em;">${student.name}</div>
                                            <div style="font-size: 0.9em; color: #64748b;">${student.strategy === 'write_immediately' ? 'Viết ngay' : 'Tìm ý trước'}</div>
                                        </div>
                                    </div>
                                    <div class="student-steps">
                                        ${student.steps ? student.steps.map((s, idx) => `
                                            <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                                                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${idx === student.steps.length - 1 && student.strategy === 'write_immediately' ? '#fee2e2' : '#e0f2fe'}; color: ${idx === student.steps.length - 1 && student.strategy === 'write_immediately' ? '#ef4444' : '#0ea5e9'}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${idx + 1}</div>
                                                <div style="font-size: 0.95em; color: #334155;">${s}</div>
                                            </div>
                                        `).join('') : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }

        return "";
    }

    /**
     * ======================================================
     * GUIDE
     * ======================================================
     */

    static renderGuide(step) {
        const data = step.data || step;
        if (!data.guide) return "";

        return `
            <div class="observe-guide" style="margin-top: 0px; padding: 20px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #b45309; font-size: 1.1em;">Hãy chú ý</h3>
                <ul style="margin-bottom: 0; padding-left: 20px; color: #78350f;">
                    ${data.guide.map(item => `
                        <li style="margin-bottom: 8px;">${item}</li>
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

    static renderAction(step) {
        const data = step.data || step;
        return `
            <div class="component-toolbar" style="justify-content: space-between; width: 100%; margin-top: 30px;">
                <div class="observe-hint-wrapper" style="text-align: left; max-width: 70%;">
                    ${data.hint ? `
                        <span class="observe-hint-text" style="cursor: pointer; font-weight: 500; color: #2563eb; text-decoration: underline;"> Gợi ý </span>
                        <div class="observe-hint-content" style="display: none; margin-top: 8px; padding: 12px; background: #f8fbff; border-radius: 8px; border: 1px solid #e5e7eb; color: #333; font-size: 15px; line-height: 1.5;">
                            ${data.hint}
                        </div>
                    ` : ''}
                </div>

                <button
                    id="observe-done"
                    class="btn btn-primary">

                    Đã quan sát xong

                </button>

            </div>

        `;

    }

    /**
     * ======================================================
     * EVENT
     * ======================================================
     */

    static bind(component, stepData) {
        if (component.querySelector('.interactive-examples-container')) {
            const data = stepData?.data || stepData;
            const paragraphs = data?.content?.paragraphs || [];
            let currentSlide = 0;
            const slides = component.querySelectorAll('.observe-slide');

            const introDiv = component.querySelector('#obs-intro');
            const mainDiv = component.querySelector('#obs-main');
            const startBtn = component.querySelector('#btn-obs-start');
            const instructionDiv = component.querySelector('#obs-instruction');
            const progressDiv = component.querySelector('#obs-progress');

            const nextBtn = component.querySelector('.btn-next-slide');
            const patternWall = component.querySelector('#obs-pattern-wall');
            const doneBtn = component.querySelector('#obs-done');

            if (doneBtn) doneBtn.style.display = 'none'; // hide until wall is shown

            startBtn.addEventListener('click', () => {
                introDiv.style.display = 'none';
                mainDiv.style.display = 'block';
            });

            const updateNav = () => {
                slides.forEach((s, i) => s.style.display = i === currentSlide ? 'block' : 'none');
                progressDiv.innerText = `ĐOẠN ${currentSlide + 1} / ${paragraphs.length}`;

                // Hide next button until interaction
                nextBtn.style.display = 'none';

                // Custom instruction for paragraph 3
                if (currentSlide === 2) {
                    instructionDiv.innerText = "👆 Chạm thử vào một câu xem sao";
                } else {
                    instructionDiv.innerText = "👆 Nếu phải chọn một câu đang dẫn đường cho cả đoạn, em chọn câu nào?";
                }
            };

            nextBtn?.addEventListener('click', () => {
                if (currentSlide < slides.length - 1) {
                    currentSlide++;
                    updateNav();
                } else {
                    // Show pattern wall
                    mainDiv.style.display = 'none';
                    patternWall.style.display = 'block';
                    if (doneBtn) doneBtn.style.display = 'inline-block';
                }
            });

            component.querySelectorAll('.interactive-sentence').forEach(span => {
                span.addEventListener('click', () => {
                    const pIdx = parseInt(span.dataset.paragraphIdx);
                    const visualContainer = slides[pIdx].querySelector('.structure-visual');
                    const feedback = slides[pIdx].querySelector('.obs-feedback');

                    // Already interacted
                    if (visualContainer.style.display === 'flex') return;

                    // Highlight the clicked sentence
                    span.style.background = '#fef08a';
                    span.style.borderColor = '#eab308';

                    visualContainer.style.display = 'flex';
                    feedback.style.display = 'block';

                    let visualHtml = '';

                    if (pIdx === 0) {
                        feedback.innerText = "✓ Em đã chọn một câu có vai trò quan trọng. Câu 1 dường như đang dẫn các câu còn lại.";
                        visualHtml = `
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 1 ]</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 2 ]</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 3 ]</div>
                        `;
                    } else if (pIdx === 1) {
                        feedback.innerText = "✓ Ở đoạn này, ý quan trọng xuất hiện sau các chi tiết.";
                        visualHtml = `
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 1 ]</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 2 ]</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">[ CÂU 3 ]</div>
                        `;
                    } else if (pIdx === 2) {
                        feedback.innerHTML = "Câu này có vẻ quan trọng. Nhưng... <br>❓ Có câu nào thực sự 'đứng trên' các câu còn lại không? <br><br>💡 <i>Hình như 3 câu này ngang nhau.</i>";
                        visualHtml = `<div style="font-size: 1.2em; color: #64748b; font-weight: bold; letter-spacing: 2px;">[CÂU 1] = [CÂU 2] = [CÂU 3]</div>`;
                    } else if (pIdx === 3) {
                        feedback.innerText = "À, câu sau hình như nối từ câu trước.";
                        visualHtml = `
                            <div style="font-weight: bold; color: #334155;">Đọc sách</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="font-weight: bold; color: #334155;">Hiểu biết</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="font-weight: bold; color: #334155;">Tự tin</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="font-weight: bold; color: #334155;">Chủ động</div>
                        `;
                    } else if (pIdx === 4) {
                        feedback.innerText = "🔄 Đầu → triển khai → khẳng định";
                        visualHtml = `
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">CÂU 1</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">CÂU 2 + 3</div>
                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                            <div style="background: white; padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; color: #475569; font-weight: bold;">CÂU 4</div>
                        `;
                    }

                    visualContainer.innerHTML = visualHtml;

                    if (currentSlide === slides.length - 1) {
                        nextBtn.innerText = 'Hoàn thành xem →';
                    }
                    nextBtn.style.display = 'inline-block';
                });
            });

            if (doneBtn) {
                doneBtn.addEventListener("click", () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }
            return;
        }

        component

            .querySelector("#observe-done")

            ?.addEventListener(

                "click",

                () => {
                    component.dataset.completed = "true";
                    const btnNext = document.getElementById("btn-next");
                    if (btnNext) btnNext.click();
                }

            );

        const hintText = component.querySelector(".observe-hint-text");
        const hintContent = component.querySelector(".observe-hint-content");

        if (hintText && hintContent) {
            hintText.addEventListener("click", () => {
                if (hintContent.style.display === "none") {
                    hintContent.style.display = "block";
                } else {
                    hintContent.style.display = "none";
                }
            });
        }

        const toggleA = component.querySelector(".toggle-a");
        const toggleB = component.querySelector(".toggle-b");
        const viewA = component.querySelector(".view-a");
        const viewB = component.querySelector(".view-b");
        const observeOptions = component.querySelector(".observe-options");
        const optButtons = component.querySelectorAll(".opt-btn");
        const optFeedback = component.querySelector(".opt-feedback");
        const doneBtn = component.querySelector("#observe-done");

        if (toggleA && toggleB && viewA && viewB) {
            let optionBShown = false;

            toggleA.addEventListener("click", () => {
                toggleA.classList.add("active");
                toggleA.style.background = "white";
                toggleA.style.color = "#1e293b";
                toggleA.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

                toggleB.classList.remove("active");
                toggleB.style.background = "transparent";
                toggleB.style.color = "#64748b";
                toggleB.style.boxShadow = "none";

                viewA.style.display = "block";
                viewB.style.display = "none";
                if (observeOptions) observeOptions.style.display = "none";
            });

            toggleB.addEventListener("click", () => {
                toggleB.classList.add("active");
                toggleB.style.background = "white";
                toggleB.style.color = "#1e293b";
                toggleB.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

                toggleA.classList.remove("active");
                toggleA.style.background = "transparent";
                toggleA.style.color = "#64748b";
                toggleA.style.boxShadow = "none";

                viewA.style.display = "none";
                viewB.style.display = "block";

                if (observeOptions) observeOptions.style.display = "flex";

                if (!optionBShown) {
                    optionBShown = true;
                    const lines = viewB.querySelectorAll('.b-line');
                    lines.forEach((line, idx) => {
                        setTimeout(() => {
                            line.style.opacity = '1';
                            line.style.transform = 'translateY(0)';
                        }, idx * 800);
                    });
                }
            });

            if (optButtons.length > 0) {
                if (doneBtn) {
                    doneBtn.style.display = 'none'; // hide until interaction is done
                }
                optButtons.forEach(btn => {
                    btn.addEventListener("click", () => {
                        // Reset all buttons
                        optButtons.forEach(b => {
                            b.style.background = "white";
                            b.style.color = "#475569";
                            b.style.borderColor = "#cbd5e1";
                        });
                        // Highlight selected
                        btn.style.background = "#e0f2fe";
                        btn.style.color = "#0284c7";
                        btn.style.borderColor = "#0284c7";

                        // Show feedback
                        optFeedback.innerText = btn.dataset.feedback;
                        optFeedback.style.display = "block";

                        // Change Done button text if needed
                        if (doneBtn) {
                            doneBtn.style.display = 'block';
                            doneBtn.innerHTML = `👉 Khám phá tiếp`;
                        }
                    });
                });
            }
        }
    }

    static validator = {
        name: "NullValidator",
        validate: () => ({ valid: true, score: 1, maxScore: 1, message: "Hoàn thành" })
    };

    static getValidator() {
        return this.validator;
    }
}

export default Observe;