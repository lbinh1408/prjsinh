/**
 * ==========================================================
 * TS10 Learning Platform
 * components/story.js
 * ==========================================================
 */

import ConnectionMap from "./connectionMap.js";

class Story {

    static render(step) {
        const component = document.createElement("div");
        component.className = "component story-component";

        const data = step.data || {};
        const content = data.content || {};
        const scene = content.scene || {};
        const dialogue = scene.dialogue && scene.dialogue.length > 0 ? scene.dialogue[0] : null;
        const character = scene.character || { name: 'Học sinh' };
        
        let html = "";
        
        const promptText = content.prompt || data.prompt;
        
        if (data.ui && data.ui.component === 'split_compare') {
            const ui = data.ui;
            const left = content.left || {};
            const right = content.right || {};
            const interaction = data.interaction || {};
            const choices = interaction.choices || [];
            const fb = interaction.feedback || {};
            const reveal = data.reveal || {};

            component.innerHTML = `
                <style>
                    .sc-wrapper { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
                    .sc-header { text-align: center; margin-bottom: 30px; }
                    .sc-title { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
                    .sc-question { font-size: 1.2rem; color: #475569; }
                    .sc-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .sc-col { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .sc-label { font-weight: 800; color: #6d5dfc; margin-bottom: 15px; font-size: 0.9rem; letter-spacing: 1px; }
                    .sc-para { font-size: 1.1rem; line-height: 1.7; color: #334155; }
                    .sc-interaction { text-align: center; background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; }
                    .sc-choices { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; }
                    .sc-btn { padding: 12px 24px; border-radius: 99px; border: 2px solid #cbd5e1; background: white; color: #475569; font-weight: 600; font-size: 1.05rem; cursor: pointer; transition: all 0.2s; }
                    .sc-btn:hover { border-color: #94a3b8; background: #f1f5f9; }
                    .sc-btn.correct { background: #dcfce7; border-color: #22c55e; color: #166534; }
                    .sc-btn.wrong { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
                    .sc-feedback { padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 600; display: none; }
                    .sc-feedback.correct { background: #dcfce7; color: #166534; }
                    .sc-feedback.wrong { background: #fee2e2; color: #991b1b; }
                    .sc-reveal { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: left; display: none; margin-top: 20px; }
                    .sc-reveal h4 { color: #1d4ed8; margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; }
                    .sc-reveal p { color: #1e3a8a; margin: 0; font-size: 1.05rem; line-height: 1.6; }
                    .sc-next { margin-top: 20px; padding: 12px 30px; background: #6d5dfc; color: white; border: none; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; transition: background 0.2s; }
                    .sc-next:hover { background: #5b4be8; }
                </style>
                <div class="sc-wrapper">
                    ${promptText ? `<div class="sc-header"><div class="sc-title">${promptText}</div></div>` : ''}
                    <div class="sc-columns">
                        <div class="sc-col">
                            <div class="sc-label">${left.label || 'ĐOẠN A'}</div>
                            <div class="sc-para">${left.paragraph || ''}</div>
                        </div>
                        <div class="sc-col">
                            <div class="sc-label">${right.label || 'ĐOẠN B'}</div>
                            <div class="sc-para">${right.paragraph || ''}</div>
                        </div>
                    </div>
                    <div class="sc-interaction">
                        ${ui.question ? `<div class="sc-question" style="margin-bottom: 20px; font-weight: 700; color: #1e293b;">${ui.question}</div>` : ''}
                        <div class="sc-choices">
                            ${choices.map((c, i) => `
                                <button class="sc-btn" data-idx="${i}" data-correct="${c.correct}">${c.text}</button>
                            `).join('')}
                        </div>
                        <div class="sc-feedback" id="sc-fb"></div>
                        <div class="sc-reveal" id="sc-rev">
                            <h4>${reveal.title || '💡 Tìm hiểu'}</h4>
                            <p>${reveal.text || ''}</p>
                        </div>
                        <button class="sc-next" id="sc-btn-next">Tiếp tục →</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const btns = component.querySelectorAll('.sc-btn');
                const fbEl = component.querySelector('#sc-fb');
                const revEl = component.querySelector('#sc-rev');
                const nextBtn = component.querySelector('#sc-btn-next');
                let answered = false;

                if (choices.length === 0) {
                    if (reveal.text || reveal.title) {
                        revEl.style.display = 'block';
                    }
                    if (nextBtn) {
                        nextBtn.style.display = 'inline-block';
                    }
                } else {
                    btns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            if (answered) return;
                            const isCorrect = btn.dataset.correct === 'true';
                            
                            if (isCorrect) {
                                btn.classList.add('correct');
                                fbEl.className = 'sc-feedback correct';
                                fbEl.innerHTML = fb.correct || 'Chính xác!';
                                fbEl.style.display = 'block';
                                revEl.style.display = 'block';
                                nextBtn.style.display = 'inline-block';
                                answered = true;
                            } else {
                                btn.classList.add('wrong');
                                fbEl.className = 'sc-feedback wrong';
                                fbEl.innerHTML = fb.incorrect || 'Chưa đúng, thử lại nhé.';
                                fbEl.style.display = 'block';
                                
                                setTimeout(() => {
                                    btn.classList.remove('wrong');
                                    fbEl.style.display = 'none';
                                }, 2000);
                            }
                        });
                    });
                }

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
                    .story-fc-wrapper { padding: 20px 0; max-width: 900px; margin: 0 auto; text-align: center; }
                    .story-fc-hero { margin-bottom: 30px; }
                    .story-fc-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                    .story-fc-hero h1 { font-size: 2.2rem; color: #1e293b; line-height: 1.2; margin-bottom: 10px; }
                    .story-fc-hero p { color: #64748b; font-size: 1.1rem; }
                    .story-fc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
                    .story-fc-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s; }
                    .story-fc-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                    .story-fc-label { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; margin-bottom: 12px; }
                    .story-fc-quote { font-size: 1.05rem; color: #334155; line-height: 1.6; }
                    .story-fc-card:nth-child(1) .story-fc-label { background: #fee2e2; color: #b91c1c; }
                    .story-fc-card:nth-child(2) .story-fc-label { background: #dcfce7; color: #15803d; }
                    .story-fc-card:nth-child(3) .story-fc-label { background: #fef3c7; color: #b45309; }
                    .story-fc-card:nth-child(4) .story-fc-label { background: #e0e7ff; color: #4338ca; }
                    .story-fc-question { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 1.2rem; color: #1e293b; margin-bottom: 30px; }
                    .story-fc-actions { margin-top: 20px; }
                    .story-fc-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .story-fc-btn:hover { background: #5b4be8; }
                </style>
                <div class="story-fc-wrapper">
                    <div class="story-fc-hero">
                        <div class="emoji">🎬</div>
                        ${promptText ? `<h1>${promptText}</h1>` : ''}
                        <p>${data.subtitle || ''}</p>
                    </div>
                    <div class="story-fc-grid">
                        ${cards.map((c, i) => `
                            <div class="story-fc-card" style="animation: fadeIn 0.5s ease-out ${i * 0.1}s both;">
                                <div class="story-fc-label">${c.label || ''}</div>
                                <div class="story-fc-quote">${c.text || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="story-fc-question" style="animation: fadeIn 0.5s ease-out 0.6s both;">
                        <b>“${ui.question || ''}”</b>
                    </div>
                    <div class="story-fc-actions" style="animation: fadeIn 0.5s ease-out 0.8s both;">
                        <button class="story-fc-btn" id="btn-fc-next">${ui.buttonText || 'Tiếp tục →'}</button>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const btnNext = component.querySelector('#btn-fc-next');
                if (btnNext) {
                    btnNext.addEventListener('click', () => {
                        component.dataset.completed = "true";
                        window.engine && window.engine.next();
                    });
                }
            }, 0);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'hero') {
            const ui = data.ui;
            const elements = ui.elements || [];
            const question = data.question || {};
            const options = question.options || [];
            
            component.innerHTML = `
                <style>
                    .story-hero-wrapper { padding: 20px 0; }
                    .story-hero-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; }
                    .story-hero-wrapper .card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 8px 28px #18203a0b; margin-bottom: 16px; }
                    .story-hero-wrapper .hero { padding: 32px; }
                    .story-hero-wrapper .pill { display: inline-block; padding: 5px 9px; border-radius: 99px; background: #efedff; color: #5b4be8; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
                    .story-hero-wrapper h1 { font-size: 40px; line-height: 1.1; margin: 10px 0; color: #172033; }
                    .story-hero-wrapper .muted { color: #697386; line-height: 1.65; margin-bottom: 20px; }
                    .story-hero-wrapper .line { font-size: 19px; line-height: 2; color: #172033; }
                    .story-hero-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
                    .story-hero-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 12px 15px; cursor: pointer; text-align: center; transition: all 0.2s; }
                    .story-hero-wrapper .soft { background: #eef0f5; color: #172033; }
                    .story-hero-wrapper .primary { background: #6d5dfc; color: #fff; padding: 14px 24px; font-size: 16px; }
                    .story-hero-wrapper .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
                    .story-hero-wrapper .choice { border: 1px solid #d9ddea; border-radius: 12px; padding: 12px 15px; background: #fff; cursor: pointer; text-align: left; font-weight: bold; color: #172033; transition: all 0.2s; }
                    .story-hero-wrapper .choice:hover, .story-hero-wrapper .choice.sel { border-color: #6d5dfc; background: #f3f1ff; color: #6d5dfc; }
                    .story-hero-wrapper .reveal { display: none; margin-top: 14px; padding: 15px; border-radius: 14px; background: #effbf5; border: 1px solid #c8efd9; color: #172033; animation: fadeIn 0.4s; }
                    .story-hero-wrapper .reveal.show { display: block; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
                <div class="story-hero-wrapper">
                    <div class="ey">❶ STORY</div>
                    <div class="card hero">
                        ${elements.map(el => {
                            if (el.type === 'badge') return `<span class="pill">${el.icon} ${el.text}</span>`;
                            if (el.type === 'heading') return `<h1>${el.text}</h1>`;
                            if (el.type === 'text') return `<p class="muted">${el.text}</p>`;
                            if (el.type === 'paragraph') return el.lines.map(l => `<div class="line">${l}</div>`).join('');
                            if (el.type === 'audio_button') return `<div class="btns"><button class="btn soft">▶ ${el.label}</button></div>`;
                            return '';
                        }).join('')}
                    </div>
                    
                    <div class="card">
                        <b>${question.text || ''}</b>
                        <div class="choices">
                            ${options.map((opt, i) => `<button class="choice" data-idx="${i}">${opt.text}</button>`).join('')}
                        </div>
                        <div class="reveal" id="sh-reveal">✨ ${data.feedback?.text || ''}</div>
                        <div class="btns" style="margin-top:20px;">
                            <button class="btn primary" id="sh-btn-next" style="display:none;">🔎 Tìm xem vì sao →</button>
                        </div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                const choices = component.querySelectorAll('.choice');
                const revealBox = component.querySelector('#sh-reveal');
                const btnNext = component.querySelector('#sh-btn-next');
                
                choices.forEach(btn => {
                    btn.addEventListener('click', () => {
                        choices.forEach(b => b.classList.remove('sel'));
                        btn.classList.add('sel');
                        revealBox.classList.add('show');
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
            // Title
            if (promptText) {
                const title = document.createElement("h2");
                title.style.cssText = "text-align: center; color: #1e293b; margin-bottom: 20px;";
                title.innerText = "🔗 " + promptText;
                component.appendChild(title);
            }
            
            // Render Map
            const mapEl = ConnectionMap.render(data.connectionData);
            component.appendChild(mapEl);
            
            // Hook Question & Options
            const qContainer = document.createElement("div");
            qContainer.style.cssText = "text-align: center; margin-top: 40px; animation: fadeIn 0.5s;";
            
            const qTitle = document.createElement("div");
            qTitle.style.cssText = "font-size: 1.2em; font-weight: bold; color: #334155; margin-bottom: 20px;";
            qTitle.innerHTML = `🤔<br/>${data.content?.question?.text || "Em thấy thế nào?"}`;
            qContainer.appendChild(qTitle);
            
            const optionsGroup = document.createElement("div");
            optionsGroup.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 10px;";
            
            // Reveal Section (Hidden initially)
            const revealSection = document.createElement("div");
            revealSection.style.cssText = "display: none; text-align: center; margin-top: 40px; animation: fadeIn 1s;";
            revealSection.innerHTML = `
                <div style="font-size: 1.1em; color: #64748b; font-style: italic; margin-bottom: 20px;">
                    ${data.content?.hook || "Các câu đều đúng. Nhưng đoạn văn vẫn chưa ổn."}
                </div>
                <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; max-width: 500px; margin: 0 auto 30px;">
                    <div style="font-size: 1.3em; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">${data.reveal?.title || "💡"}</div>
                    <div style="color: #334155; line-height: 1.5;">${data.reveal?.text || ""}</div>
                </div>
                <div style="font-size: 1.1em; font-weight: bold; color: #475569; margin-bottom: 20px;">
                    ${data.transition?.text || ""}
                </div>
                <button class="btn btn-primary" style="font-size: 1.2em; padding: 12px 30px;" onclick="window.engine && window.engine.next()">
                    🔎 ${data.transition?.action || "TÌM HIỂU"}
                </button>
            `;

            const triggerBreakEffect = () => {
                optionsGroup.style.display = "none";
                revealSection.style.display = "block";
                
                // Break all links in the map
                const links = component.querySelectorAll('.c-sentence-link');
                links.forEach(link => {
                    const badge = link.querySelector('.link-badge');
                    if (badge) {
                        badge.innerHTML = `✕`;
                        badge.style.borderColor = '#ef4444';
                        badge.style.color = '#ef4444';
                    }
                    const lineContainer = link.querySelector('.link-line');
                    if (lineContainer) {
                        lineContainer.outerHTML = `
                            <div class="link-line-container" style="display: flex; flex-direction: column; align-items: center; height: 80px; justify-content: center;">
                                <div class="link-line-part" style="width: 4px; height: 35px; background-color: #ef4444;"></div>
                                <div class="link-line-break" style="font-size: 1.2em; line-height: 10px; color: #ef4444; font-weight: bold; margin: 5px 0;">✕</div>
                                <div class="link-line-part" style="width: 4px; height: 35px; background-color: #ef4444;"></div>
                            </div>
                        `;
                    }
                });
            };

            const options = data.content?.question?.options || [];
            options.forEach(opt => {
                const btn = document.createElement("button");
                btn.style.cssText = `
                    width: 100%;
                    max-width: 400px;
                    padding: 15px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    background: white;
                    color: #475569;
                    font-size: 1.1em;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                btn.innerText = "○ " + opt.label;
                btn.addEventListener('mouseover', () => btn.style.borderColor = '#94a3b8');
                btn.addEventListener('mouseout', () => btn.style.borderColor = '#e2e8f0');
                btn.addEventListener('click', triggerBreakEffect);
                optionsGroup.appendChild(btn);
            });
            
            qContainer.appendChild(optionsGroup);
            component.appendChild(qContainer);
            component.appendChild(revealSection);
            
            return component;
        }

        if (data.ui && data.ui.layout === 'story_hook') {
            const draftHtml = data.content.studentDraft.map(s => `<div>${s}</div>`).join('');
            html = `
                <div class="story-container story-hook-layout" style="text-align: center; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <!-- Phase 1: Typing & Timer -->
                    <div id="phase-1" style="min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="font-weight: bold; color: #64748b; margin-bottom: 20px;">✍️ 15 PHÚT TRƯỚC...</div>
                        
                        <div class="draft-paper" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%; min-height: 150px; padding: 20px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 20px; position: relative;">
                            <div class="typing-text" style="font-size: 1.1em; line-height: 1.6; color: #1e293b;"></div>
                            <span class="cursor" style="display: inline-block; width: 2px; height: 1.1em; background: #333; animation: blink 1s step-end infinite;"></span>
                        </div>
                        
                        <div class="timer" style="font-family: monospace; font-size: 1.5em; font-weight: bold; color: #475569;">
                            00:15:00
                        </div>
                        
                        <div class="thought" style="margin-top: 30px; font-weight: bold; font-size: 1.2em; color: #b91c1c; opacity: 0; transition: opacity 1s;">
                            😭 "${data.content.studentThought}"
                        </div>
                    </div>

                    <!-- Phase 2: Highlight & Action -->
                    <div id="phase-2" style="display: none; min-height: 300px; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; font-size: 1.2em; line-height: 1.6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); margin-bottom: 20px;">
                            ${draftHtml}
                        </div>
                        <div style="font-weight: bold; color: #475569; margin-bottom: 30px;">
                            ${data.content.hookQuestion}
                        </div>
                        <button id="btn-review" class="btn" style="background: #f1f5f9; border: 2px solid #cbd5e1; color: #334155; padding: 12px 30px; font-size: 1.1em; border-radius: 12px; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                            🔍 Xem lại ý của em
                        </button>
                    </div>

                    <!-- Phase 3: Reveal Idea -->
                    <div id="phase-3" style="display: none; min-height: 300px; flex-direction: column; align-items: center; justify-content: center;">
                        <div class="idea-reveal" style="font-size: 1.3em; font-weight: bold; color: #1e293b; background: #fef08a; padding: 15px 30px; border-radius: 20px; border: 2px solid #facc15; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            💡 ${data.content.studentDraft[0]}
                        </div>
                        <div style="font-size: 1.2em; color: #475569; margin-bottom: 40px;">
                            ${data.content.reveal}
                        </div>
                        <button id="story-done" class="btn btn-primary" style="padding: 12px 40px; font-size: 1.2em; border-radius: 12px; cursor: pointer; font-weight: bold; animation: pulse 2s infinite;">
                            👉 ${data.ui.action.label}
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes blink { 50% { opacity: 0; } }
                    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                </style>
            `;
        } else if (data.ui && data.ui.layout === 'story_card') {
            const ideasHtml = data.content.ideas.map((idea, idx) => 
                `<div class="floating-idea idea-${idx}" style="background: white; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 20px; font-size: 0.9em; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); opacity: 0; transform: translateY(20px);">${idea}</div>`
            ).join('');

            html = `
                <div class="story-container" style="text-align: center; max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${promptText ? `<div style="background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px; border-radius: 12px; margin-bottom: 30px; font-style: italic; color: #475569;">
                        📝 ${promptText}
                    </div>` : ''}

                    <div class="story-scene" style="position: relative; min-height: 250px; margin-bottom: 30px;">
                        <div class="character-avatar" style="font-size: 60px; margin-bottom: 15px; opacity: 0; animation: fadeIn 0.5s forwards 0.5s;">👦</div>
                        
                        <div class="ideas-container" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;">
                            ${ideasHtml}
                        </div>

                        <div class="character-thought" style="font-weight: bold; font-size: 1.2em; margin-bottom: 20px; color: #b91c1c; opacity: 0;">
                            "${data.content.thought}"
                        </div>
                        
                        <div class="reveal-message" style="background: #f0fdf4; border: 2px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-top: 20px; opacity: 0; display: none;">
                            <div style="font-weight: bold; color: #166534; font-size: 1.1em; margin-bottom: 10px;">${data.content.reveal.split('.')[0]}.</div>
                            <div style="color: #15803d;">${data.content.reveal.split('.').slice(1).join('.')}</div>
                            
                            <div style="margin-top: 20px; font-size: 3em;">🏗️</div>
                            <div style="font-weight: bold; font-size: 1.5em; color: #0f172a; margin-top: 10px;">DÀN Ý</div>
                            <div style="color: #475569;">Bộ khung giúp tổ chức các ý trước khi viết.</div>
                        </div>
                    </div>
                    
                    <div class="story-action" style="opacity: 0;">
                        <button id="story-done" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 12px; cursor: pointer; font-weight: bold;">
                            ${data.ui.action.label} ➔
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
                    .floating-idea.animate { animation: fadeIn 0.5s forwards; }
                    .idea-scatter {
                        position: absolute !important;
                        transition: all 1s ease-in-out;
                    }
                </style>
            `;
        } else if (data.ui && data.ui.layout === 'comparison') {
            const splitSentences = (text) => text.split(/(?<=\.)\s+/).filter(Boolean);
            
            html = `
                <div class="story-container comparison-layout" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                    <!-- Intro Screen -->
                    <div id="comp-intro" style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 2px solid #e2e8f0;">
                        <div style="font-size: 4em; margin-bottom: 20px;">📖</div>
                        <h2 style="color: #0f172a; font-size: 2em; letter-spacing: 1px; margin-bottom: 10px; line-height: 1.4;">
                            CÙNG MỘT Ý...<br>NHƯNG CÓ GÌ KHÁC?
                        </h2>
                        <button id="btn-comp-start" class="btn btn-primary" style="margin-top: 30px; padding: 12px 40px; font-size: 1.2em; border-radius: 30px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3);">
                            👀 Xem thử
                        </button>
                    </div>

                    <!-- Main Content Screen -->
                    <div id="comp-main" style="display: none; animation: fadeIn 0.5s;">
                        <div id="comp-instruction" style="text-align: center; margin-bottom: 20px; font-weight: bold; color: #b45309; font-size: 1.2em; background: #fef3c7; padding: 15px; border-radius: 12px; border: 2px dashed #f59e0b; animation: pulse 2s infinite;">
                            👆 Chạm vào câu quan trọng nhất trong mỗi đoạn
                        </div>
                        
                        <div style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;" id="comp-paragraphs">
                            ${content.paragraphs.map((p, idx) => `
                                <div class="comp-paragraph" data-idx="${idx}" style="flex: 1; min-width: 280px; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <div class="comp-label" style="display: none; font-weight: bold; color: #3b82f6; margin-bottom: 15px; text-align: center; text-transform: uppercase;">${p.label}</div>
                                    <div class="paragraph-content" style="line-height: 1.8; font-size: 1.1em; color: #334155;">
                                        ${splitSentences(p.text).map(s => `<span class="clickable-sentence" style="cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s; display: inline-block;">${s}</span>`).join(' ')}
                                    </div>
                                    
                                    <!-- Diagram container -->
                                    <div class="comp-diagram" style="display: none; flex-direction: column; align-items: center; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; animation: fadeIn 0.5s;">
                                        ${idx === 0 ? `
                                            <div style="background: #fef08a; padding: 5px 15px; border-radius: 8px; font-weight: bold; border: 2px solid #eab308; color: #854d0e;">[Ý chính]</div>
                                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                                            <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 8px; color: #475569; border: 1px solid #cbd5e1;">[Chi tiết]</div>
                                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                                            <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 8px; color: #475569; border: 1px solid #cbd5e1;">[Chi tiết]</div>
                                        ` : `
                                            <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 8px; color: #475569; border: 1px solid #cbd5e1;">[Chi tiết]</div>
                                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                                            <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 8px; color: #475569; border: 1px solid #cbd5e1;">[Chi tiết]</div>
                                            <div style="color: #94a3b8; font-weight: bold;">↓</div>
                                            <div style="background: #fef08a; padding: 5px 15px; border-radius: 8px; font-weight: bold; border: 2px solid #eab308; color: #854d0e;">[Ý chính]</div>
                                        `}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="story-questions" style="display: none; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px; animation: fadeIn 0.5s;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #1e40af; margin-bottom: 15px;">👀 EM VỪA PHÁT HIỆN GÌ?</div>
                            <div style="margin-bottom: 10px; color: #1e293b;">Hai đoạn đều nói về lợi ích của việc đọc sách. Nhưng câu quan trọng nhất nằm ở những vị trí khác nhau.</div>
                            <hr style="border: 0; border-top: 1px solid #bfdbfe; margin: 15px 0;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: #0f172a;">❓ Cách sắp xếp câu có ảnh hưởng đến cách người đọc tiếp nhận ý không?</div>
                            
                            <div class="story-think-actions" style="margin-top: 25px; display: flex; justify-content: center; gap: 15px;">
                                <button class="btn btn-outline story-think-btn" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #3b82f6; background: white; color: #3b82f6; font-weight: bold; cursor: pointer;">🤔 Nghĩ thử</button>
                            </div>
                            
                            <div class="story-options" style="display: none; margin-top: 20px; justify-content: center; gap: 15px;">
                                <button class="btn btn-outline story-opt-btn" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; color: #475569; font-weight: bold; cursor: pointer;">Có</button>
                                <button class="btn btn-outline story-opt-btn" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; color: #475569; font-weight: bold; cursor: pointer;">Không</button>
                                <button class="btn btn-outline story-opt-btn" style="padding: 10px 20px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; color: #475569; font-weight: bold; cursor: pointer;">Chưa chắc</button>
                            </div>
                        </div>
                        
                        <div class="story-transition" style="display: none; text-align: center; animation: fadeIn 0.5s;">
                            <div style="font-size: 1.1em; color: #047857; background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                💡 Thử nhìn lại vị trí của câu quan trọng nhất. Nó xuất hiện ở đâu trong mỗi đoạn?
                            </div>
                            <button id="story-done" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                🔍 Tìm hiểu
                            </button>
                        </div>
                    </div>
                </div>
                
                <style>
                    .clickable-sentence:hover { background: #f1f5f9; }
                    .clickable-sentence.highlighted { background: #fef08a; border-bottom: 2px solid #eab308; }
                </style>
            `;
        } else {
            // Old format
            html = `
                <div class="story-container" style="text-align: center; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div class="story-scene" style="margin-bottom: 40px;">
                        <div class="character-avatar" style="font-size: 60px; margin-bottom: 15px;">
                            ${character.name === 'Minh' ? '🧑' : '👧'}
                        </div>
                        <div class="character-name" style="font-weight: bold; font-size: 1.2em; margin-bottom: 20px; color: #4b5563;">
                            ${character.name}
                        </div>
                        ${dialogue ? `
                            <div class="dialogue-bubble" style="background: #f3f4f6; padding: 20px; border-radius: 16px; position: relative; font-style: italic; font-size: 1.1em; color: #1f2937; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                "${dialogue.text}"
                            </div>
                        ` : ''}
                    </div>
                    
                    <hr style="border: 0; border-top: 2px dashed #e5e7eb; margin: 30px 0;">
                    
                    <div class="story-question" style="margin-bottom: 40px;">
                        <div class="icon" style="font-size: 40px; margin-bottom: 15px;">🤔</div>
                        <div class="question-text" style="font-weight: bold; font-size: 1.3em; color: #1f2937; line-height: 1.5;">
                            ${content.question ? content.question.text : 'Theo em, vì sao bạn ấy chưa viết được?'}
                        </div>
                    </div>
                    
                    <div class="story-action">
                        <div style="font-size: 30px; margin-bottom: 15px; animation: bounce 2s infinite;">👇</div>
                        <button id="story-done" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 12px; cursor: pointer; font-weight: bold;">
                            🔍 ${content.cta ? content.cta.text : 'Cùng tìm hiểu'}
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-10px); }
                        60% { transform: translateY(-5px); }
                    }
                </style>
            `;
        }

        component.innerHTML = html;
        this.bind(component, data);

        return component;
    }

    static bind(component, data) {
        if (component.querySelector('.comparison-layout')) {
            const introDiv = component.querySelector('#comp-intro');
            const mainDiv = component.querySelector('#comp-main');
            const btnStart = component.querySelector('#btn-comp-start');
            const instructionDiv = component.querySelector('#comp-instruction');
            const questionsArea = component.querySelector('.story-questions');
            const transitionArea = component.querySelector('.story-transition');
            const thinkActions = component.querySelector('.story-think-actions');
            const thinkBtn = component.querySelector('.story-think-btn');
            const optionsArea = component.querySelector('.story-options');
            const optBtns = component.querySelectorAll('.story-opt-btn');
            const doneBtn = component.querySelector('#story-done');
            
            btnStart.addEventListener('click', () => {
                introDiv.style.display = 'none';
                mainDiv.style.display = 'block';
            });
            
            const paragraphs = component.querySelectorAll('.comp-paragraph');
            let selectedCount = 0;
            
            paragraphs.forEach(p => {
                const sentences = p.querySelectorAll('.clickable-sentence');
                let hasSelected = false;
                
                sentences.forEach(s => {
                    s.addEventListener('click', () => {
                        if (hasSelected) return; // Only select one per paragraph
                        
                        if (s.innerText.includes("mở rộng hiểu biết")) {
                            s.classList.add('highlighted');
                            hasSelected = true;
                            selectedCount++;
                            
                            // Show diagram for this paragraph
                            p.querySelector('.comp-diagram').style.display = 'flex';
                            p.querySelector('.comp-label').style.display = 'block';
                            
                            if (selectedCount === 2) {
                                instructionDiv.style.display = 'none';
                                setTimeout(() => {
                                    questionsArea.style.display = 'block';
                                }, 1500);
                            }
                        } else {
                            // Flash red
                            s.style.background = '#fee2e2';
                            setTimeout(() => s.style.background = '', 500);
                        }
                    });
                });
            });
            
            thinkBtn.addEventListener('click', () => {
                thinkActions.style.display = 'none';
                optionsArea.style.display = 'flex';
            });
            
            optBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    optBtns.forEach(b => {
                        b.style.background = 'white';
                        b.style.color = '#475569';
                        b.style.borderColor = '#cbd5e1';
                    });
                    btn.style.background = '#3b82f6';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#3b82f6';
                    
                    transitionArea.style.display = 'block';
                });
            });
            
            doneBtn.addEventListener('click', () => {
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            });
            
            return;
        }

        if (component.querySelector('.story-hook-layout')) {
            const draftLines = [];
            component.querySelectorAll('#phase-2 div > div').forEach(d => draftLines.push(d.innerText));
            
            const typingText = component.querySelector('.typing-text');
            const timerEl = component.querySelector('.timer');
            let fullText = draftLines.join('\\n');
            let charIdx = 0;
            
            const typeNext = () => {
                if (charIdx < fullText.length) {
                    typingText.innerText += fullText.charAt(charIdx);
                    charIdx++;
                    setTimeout(typeNext, 50);
                } else {
                    setTimeout(() => {
                        timerEl.innerText = '00:14:32';
                        timerEl.style.color = '#ef4444';
                        component.querySelector('.thought').style.opacity = '1';
                        
                        setTimeout(() => {
                            component.querySelector('#phase-1').style.display = 'none';
                            component.querySelector('#phase-2').style.display = 'flex';
                        }, 3000);
                    }, 1500);
                }
            };
            
            setTimeout(typeNext, 1000);

            component.querySelector('#btn-review')?.addEventListener('click', () => {
                component.querySelector('#phase-2').style.display = 'none';
                component.querySelector('#phase-3').style.display = 'flex';
            });
        }

        // Animation logic for story_card layout
        const ideas = component.querySelectorAll('.floating-idea');
        if (ideas.length > 0) {
            // Sequence 1: Ideas appear one by one
            ideas.forEach((idea, idx) => {
                setTimeout(() => {
                    idea.classList.add('animate');
                }, 1000 + (idx * 400));
            });

            // Sequence 2: Ideas scatter
            setTimeout(() => {
                const container = component.querySelector('.ideas-container');
                container.style.position = 'relative';
                container.style.height = '150px';
                
                ideas.forEach((idea) => {
                    idea.classList.add('idea-scatter');
                    const randomX = Math.floor(Math.random() * 200) - 100;
                    const randomY = Math.floor(Math.random() * 100) - 50;
                    idea.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${Math.random() * 20 - 10}deg)`;
                });
            }, 1000 + (ideas.length * 400) + 1000);

            // Sequence 3: Thought appears
            setTimeout(() => {
                const thought = component.querySelector('.character-thought');
                if (thought) thought.style.animation = 'fadeIn 1s forwards';
            }, 1000 + (ideas.length * 400) + 2500);

            // Sequence 4: Reveal concept
            setTimeout(() => {
                const reveal = component.querySelector('.reveal-message');
                if (reveal) {
                    reveal.style.display = 'block';
                    reveal.style.animation = 'fadeIn 1s forwards';
                }
                
                const action = component.querySelector('.story-action');
                if (action) action.style.animation = 'fadeIn 1s forwards';
            }, 1000 + (ideas.length * 400) + 4500);
        }

        component.querySelector("#story-done")?.addEventListener("click", () => {
            component.dataset.completed = "true";
            const btnNext = document.getElementById("btn-next");
            if (btnNext) btnNext.click();
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

export default Story;
