export default class MultiStageChallenge {
    static render(step) {
        const data = step.data || step;
        const stages = data.stages || [];
        const promptText = (data.content && data.content.prompt) || data.prompt;

        const component = document.createElement("div");
        component.className = "component multi-stage-challenge";

        // Define the state as requested by the user
        const state = {
            currentStageIndex: 0,
            context: {},
            completedStages: []
        };

        const questionData = (data.content && data.content.question) || data.question;
        let heroHtml = '';
        if (questionData) {
            if (Array.isArray(questionData)) {
                heroHtml = `
                    <div style="text-align: left; background: #f8fafc; padding: 20px 30px; border-radius: 16px; border: 2px dashed #cbd5e1; display: inline-block; max-width: 100%;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 1.3rem; margin-bottom: 15px; text-align: center;">🎯 Yêu cầu:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 1.1rem; line-height: 1.6; text-align: left;">
                            ${questionData.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else {
                heroHtml = `<h1>${questionData}</h1>`;
            }
        } else if (promptText) {
            heroHtml = `<h1>${promptText}</h1>`;
        }

        component.innerHTML = `
            <style>
                .msc-wrapper { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
                .msc-hero { text-align: center; margin-bottom: 30px; }
                .msc-hero h1 { font-size: 2.2rem; color: #1e293b; margin-bottom: 10px; }
                
                .msc-prompt { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; font-size: 1.2rem; font-weight: bold; color: #1e293b; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .msc-prompt-label { font-size: 0.9rem; color: #6d5dfc; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }
                
                .msc-stage-container { animation: fadeIn 0.4s; }
                
                /* Common Stage Styles */
                .msc-stage-card { background: white; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 30px; margin-bottom: 20px; }
                .msc-stage-title { font-size: 1.5rem; color: #334155; margin-bottom: 10px; font-weight: 800; }
                .msc-stage-q { color: #64748b; font-size: 1.1rem; margin-bottom: 20px; }
                
                /* Buttons */
                .msc-actions { text-align: center; margin-top: 30px; }
                .msc-btn { background: #6d5dfc; color: white; border: none; padding: 14px 40px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                .msc-btn:hover:not(:disabled) { background: #5b4be8; }
                .msc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                /* Choice Styles */
                .msc-choices { display: flex; flex-direction: column; gap: 10px; }
                .msc-choice-btn { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; font-size: 1.1rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; text-align: left; }
                .msc-choice-btn:hover { border-color: #94a3b8; }
                .msc-choice-btn.selected { border-color: #9287f2ff; background: #e0e7ff; color: #8b87c6ff; }
                
                /* Scaffold Styles */
                .msc-scaffold { display: flex; flex-direction: column; gap: 15px; }
                .msc-scaffold-row { display: flex; gap: 15px; align-items: flex-start; }
                .msc-scaffold-label { width: 140px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 700; color: #475569; text-align: right; font-size: 0.95rem; flex-shrink: 0; }
                .msc-scaffold-input { flex: 1; min-height: 50px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 1.05rem; resize: vertical; outline: none; transition: border 0.2s; }
                .msc-scaffold-input:focus { border-color: #6d5dfc; }
                
                /* Editor */
                .msc-editor-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .msc-textarea { width: 100%; box-sizing: border-box; min-height: 250px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 1.15rem; line-height: 1.7; resize: vertical; outline: none; transition: all 0.2s; }
                .msc-textarea:focus { border-color: #6d5dfc; box-shadow: 0 0 0 4px #eff2ff; }
                
                /* Analysis */
                .msc-analysis-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-top: 30px; }
                .msc-analysis-title { font-size: 1.4rem; color: #1e293b; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                .msc-metrics { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
                .msc-metric { display: flex; align-items: center; gap: 15px; background: white; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .msc-metric-label { font-weight: 700; color: #475569; width: 120px; }
                .msc-metric-bar-wrap { flex: 1; height: 12px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
                .msc-metric-bar { height: 100%; background: #22c55e; border-radius: 99px; transition: width 1s; }
                .msc-metric-status { font-size: 1.2rem; }
                .msc-feedback-box { background: white; border-left: 4px solid #6d5dfc; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .msc-fb-text { color: #334155; font-size: 1.1rem; line-height: 1.6; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                @media (max-width: 600px) {
                    .msc-scaffold-row { flex-direction: column; gap: 5px; }
                    .msc-scaffold-label { width: auto; text-align: left; background: none; border: none; padding: 0; }
                }
            </style>
            
            <div class="msc-wrapper">
                <div class="msc-hero">
                    ${heroHtml}
                </div>
                
                ${data.prompt ? `
                <div class="msc-prompt">
                    <div class="msc-prompt-label">ĐỀ BÀI</div>
                    ${data.prompt}
                </div>` : ''}
                
                <div id="msc-stage-container" class="msc-stage-container"></div>
            </div>
        `;

        const container = component.querySelector('#msc-stage-container');

        const renderCurrentStage = () => {
            container.innerHTML = '';
            if (state.currentStageIndex >= stages.length) {
                component.dataset.completed = "true";
                if (window.engine) window.engine.next();
                return;
            }

            const stage = stages[state.currentStageIndex];

            if (stage.type === 'single_choice') {
                container.appendChild(renderSingleChoice(stage));
            } else if (stage.type === 'multi_select') {
                container.appendChild(renderMultiSelect(stage));
            } else if (stage.type === 'card_to_slot') {
                import('./SlotBuilder.js').then(module => {
                    const SlotBuilder = module.default;
                    const el = SlotBuilder.render({
                        data: stage,
                        mode: 'stage',
                        onComplete: (result) => nextStage(stage.key, result)
                    });
                    container.appendChild(el);
                });
            } else if (stage.type === 'scaffold') {
                container.appendChild(renderScaffold(stage));
            } else if (stage.type === 'editor') {
                container.appendChild(renderEditor(stage));
            } else if (stage.type === 'analysis') {
                container.appendChild(renderAnalysis(stage));
            } else {
                console.warn("Unknown stage type:", stage.type);
            }
        };

        const nextStage = (key, result) => {
            if (key) {
                state.context[key] = result;
                if (!state.completedStages.includes(key)) {
                    state.completedStages.push(key);
                }
            }
            state.currentStageIndex++;
            renderCurrentStage();
        };

        const renderSingleChoice = (stage) => {
            const wrapper = document.createElement('div');
            let selectedValue = null;
            let hasSubmitted = false;

            wrapper.innerHTML = `
                <div class="msc-stage-card">
                    ${stage.title ? `<div class="msc-stage-title">${stage.title}</div>` : ''}
                    ${stage.question ? `<div class="msc-stage-q">${stage.question}</div>` : ''}
                    <div class="msc-choices">
                        ${(stage.choices || stage.options || []).map((choice, i) => `
                            <button class="msc-choice-btn" data-value="${choice.value || choice.id || choice}">${choice.label || choice.text || choice}</button>
                        `).join('')}
                    </div>
                    <div class="msc-feedback" style="display: none; margin-top: 20px; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.05rem;"></div>
                </div>
                <div class="msc-actions">
                    <button class="msc-btn" id="btn-next" disabled>Tiếp tục →</button>
                </div>
            `;

            const btns = wrapper.querySelectorAll('.msc-choice-btn');
            const nextBtn = wrapper.querySelector('#btn-next');
            const feedbackEl = wrapper.querySelector('.msc-feedback');

            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (hasSubmitted) return;
                    btns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedValue = btn.dataset.value;
                    nextBtn.disabled = false;
                });
            });

            nextBtn.addEventListener('click', () => {
                if (!hasSubmitted && stage.feedback) {
                    hasSubmitted = true;
                    const selectedChoice = (stage.choices || stage.options || []).find(c => (c.value || c.id || c) == selectedValue);
                    const isCorrect = selectedChoice && selectedChoice.correct;
                    
                    feedbackEl.style.display = 'block';
                    if (isCorrect) {
                        feedbackEl.style.backgroundColor = '#dcfce7';
                        feedbackEl.style.color = '#166534';
                        feedbackEl.innerHTML = stage.feedback.correct || '✓ Chính xác!';
                    } else {
                        feedbackEl.style.backgroundColor = '#fee2e2';
                        feedbackEl.style.color = '#991b1b';
                        feedbackEl.innerHTML = stage.feedback.incorrect || '△ Chưa chính xác!';
                    }
                    
                    nextBtn.innerText = (state.currentStageIndex === stages.length - 1) ? 'Hoàn thành →' : 'Tiếp tục →';
                } else {
                    nextStage(stage.key, { type: "single_choice", value: selectedValue });
                }
            });

            return wrapper;
        };

        const renderMultiSelect = (stage) => {
            const wrapper = document.createElement('div');
            let selectedValues = [];
            let hasSubmitted = false;
            const minSel = stage.minSelections || 1;
            const maxSel = stage.maxSelections || 99;

            wrapper.innerHTML = `
                <div class="msc-stage-card">
                    ${stage.title ? `<div class="msc-stage-title">${stage.title}</div>` : ''}
                    ${stage.question || stage.instruction ? `<div class="msc-stage-q">${stage.question || stage.instruction} (Đã chọn <span id="sel-count">0</span>/${maxSel})</div>` : ''}
                    <div class="msc-choices">
                        ${(stage.choices || stage.cards || stage.options || []).map((card, i) => `
                            <button class="msc-choice-btn" data-id="${card.id}">${card.text || card.label}</button>
                        `).join('')}
                    </div>
                    <div class="msc-feedback" style="display: none; margin-top: 20px; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.05rem;"></div>
                </div>
                <div class="msc-actions">
                    <button class="msc-btn" id="btn-next" disabled>Tiếp tục →</button>
                </div>
            `;

            const btns = wrapper.querySelectorAll('.msc-choice-btn');
            const nextBtn = wrapper.querySelector('#btn-next');
            const countLabel = wrapper.querySelector('#sel-count');
            const feedbackEl = wrapper.querySelector('.msc-feedback');

            btns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (hasSubmitted) return;
                    const id = btn.dataset.id;
                    if (selectedValues.includes(id)) {
                        selectedValues = selectedValues.filter(v => v !== id);
                        btn.classList.remove('selected');
                    } else {
                        if (selectedValues.length >= maxSel) return;
                        selectedValues.push(id);
                        btn.classList.add('selected');
                    }

                    if (countLabel) countLabel.innerText = selectedValues.length;
                    nextBtn.disabled = selectedValues.length < minSel;
                });
            });

            nextBtn.addEventListener('click', () => {
                if (!hasSubmitted && stage.feedback) {
                    hasSubmitted = true;
                    let isCorrect = true;
                    if (stage.correctValues) {
                        isCorrect = stage.correctValues.length === selectedValues.length && 
                                    stage.correctValues.every(v => selectedValues.includes(v));
                    }
                    
                    feedbackEl.style.display = 'block';
                    if (isCorrect) {
                        feedbackEl.style.backgroundColor = '#dcfce7';
                        feedbackEl.style.color = '#166534';
                        feedbackEl.innerHTML = stage.feedback.correct || '✓ Chính xác!';
                    } else {
                        feedbackEl.style.backgroundColor = '#fee2e2';
                        feedbackEl.style.color = '#991b1b';
                        feedbackEl.innerHTML = stage.feedback.incorrect || '△ Chưa chính xác!';
                    }
                    
                    nextBtn.innerText = (state.currentStageIndex === stages.length - 1) ? 'Hoàn thành →' : 'Tiếp tục →';
                } else {
                    nextStage(stage.key, { type: "multi_select", values: selectedValues });
                }
            });

            return wrapper;
        };

        const renderScaffold = (stage) => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <div class="msc-stage-card">
                    ${stage.title ? `<div class="msc-stage-title">${stage.title}</div>` : ''}
                    ${stage.question ? `<div class="msc-stage-q">${stage.question}</div>` : ''}
                    <div class="msc-scaffold">
                        ${(stage.scaffold || []).map(s => `
                            <div class="msc-scaffold-row">
                                <div class="msc-scaffold-label">${s.label}</div>
                                <textarea class="msc-scaffold-input" data-id="${s.id}" placeholder="${s.hint || ''}"></textarea>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="msc-actions">
                    <button class="msc-btn" id="btn-next">Tiếp tục →</button>
                </div>
            `;

            const nextBtn = wrapper.querySelector('#btn-next');
            nextBtn.addEventListener('click', () => {
                const results = {};
                wrapper.querySelectorAll('textarea').forEach(ta => {
                    results[ta.dataset.id] = ta.value;
                });
                nextStage(stage.key, { type: "scaffold", data: results });
            });

            return wrapper;
        };

        const renderEditor = (stage) => {
            const wrapper = document.createElement('div');
            
            const hasHints = stage.hints && stage.hints.length > 0;
            
            let html = ``;
            if (hasHints) {
                html += `
                <style>
                    .msc-editor-layout { display: flex; gap: 20px; align-items: stretch; }
                    .msc-editor-main { flex: 1; display: flex; flex-direction: column; }
                    .msc-editor-sidebar { width: 280px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 15px; display: flex; flex-direction: column; }
                    .msc-hint-title { font-weight: 800; color: #1e293b; margin-bottom: 12px; font-size: 1.1rem; text-align: center; }
                    .msc-hint-group { margin-bottom: 15px; }
                    .msc-hint-label { font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
                    .msc-hint-words { display: flex; flex-wrap: wrap; gap: 6px; }
                    .msc-hint-word { background: white; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 0.9rem; color: #3b82f6; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                    .msc-hint-word:hover { background: #eff6ff; border-color: #bfdbfe; }
                    
                    @media (max-width: 768px) {
                        .msc-editor-layout { flex-direction: column; }
                        .msc-editor-sidebar { width: 100%; order: -1; }
                    }
                </style>
                <div class="msc-editor-layout">
                    <div class="msc-editor-main">
                        <div class="msc-editor-card" style="height: 100%; display: flex; flex-direction: column;">
                            ${stage.title ? `<div class="msc-stage-title">${stage.title}</div>` : ''}
                            ${stage.question || stage.instruction ? `<div class="msc-stage-q" style="margin-bottom:15px;">${stage.question || stage.instruction}</div>` : ''}
                            <textarea class="msc-textarea" id="msc-editor" placeholder="${stage.placeholder || 'Viết đoạn văn của em...'}" spellcheck="false" style="flex: 1; min-height: 200px; resize: vertical;"></textarea>
                        </div>
                    </div>
                    <div class="msc-editor-sidebar">
                        <div class="msc-hint-title">💡 Gợi ý từ vựng</div>
                        ${stage.hints.map(h => `
                            <div class="msc-hint-group">
                                <div class="msc-hint-label">${h.label}</div>
                                <div class="msc-hint-words">
                                    ${h.words.map(w => `<div class="msc-hint-word">${w}</div>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                `;
            } else {
                html += `
                <div class="msc-editor-card">
                    ${stage.title ? `<div class="msc-stage-title">${stage.title}</div>` : ''}
                    ${stage.question || stage.instruction ? `<div class="msc-stage-q" style="margin-bottom:15px;">${stage.question || stage.instruction}</div>` : ''}
                    <textarea class="msc-textarea" id="msc-editor" placeholder="${stage.placeholder || 'Viết đoạn văn của em...'}" spellcheck="false"></textarea>
                </div>
                `;
            }
            
            html += `
                <div class="msc-feedback" style="display: none; margin-top: 20px; padding: 15px; border-radius: 8px; font-weight: 500; font-size: 1.05rem; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; line-height: 1.5;"></div>
                <div class="msc-actions">
                    <button class="msc-btn" id="btn-submit">${stage.submit?.label || 'Nộp bài'}</button>
                </div>
            `;
            
            wrapper.innerHTML = html;

            if (hasHints) {
                const textarea = wrapper.querySelector('#msc-editor');
                wrapper.querySelectorAll('.msc-hint-word').forEach(wordEl => {
                    wordEl.addEventListener('click', () => {
                        const word = wordEl.innerText;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const after = text.substring(end);
                        
                        // Add spacing smartly
                        let insertText = word;
                        if (before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')) insertText = ' ' + insertText;
                        if (after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n') && !after.startsWith('.')) insertText = insertText + ' ';
                        
                        textarea.value = before + insertText + after;
                        textarea.focus();
                        textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
                    });
                });
            }

            const btnSubmit = wrapper.querySelector('#btn-submit');
            const feedbackEl = wrapper.querySelector('.msc-feedback');
            let hasSubmitted = false;

            btnSubmit.addEventListener('click', () => {
                const editorText = wrapper.querySelector('#msc-editor').value.trim();
                
                if (hasSubmitted) {
                    nextStage(stage.key, { type: "editor", text: editorText });
                    return;
                }

                if (editorText.length < (stage.minCharacters || 10)) {
                    alert('Hãy viết dài hơn một chút nhé!');
                    return;
                }
                btnSubmit.innerText = 'Đang phân tích...';
                btnSubmit.disabled = true;

                setTimeout(() => {
                    if (stage.submit && stage.submit.feedback) {
                        hasSubmitted = true;
                        feedbackEl.style.display = 'block';
                        feedbackEl.innerHTML = '💡 <strong>Phản hồi:</strong> ' + stage.submit.feedback;
                        btnSubmit.innerText = 'Tiếp tục →';
                        btnSubmit.disabled = false;
                    } else {
                        nextStage(stage.key, { type: "editor", text: editorText });
                    }
                }, 1000);
            });

            return wrapper;
        };

        const renderAnalysis = (stage) => {
            // Note: Analysis is a terminal stage, no "nextStage" call.
            const wrapper = document.createElement('div');
            const metrics = stage.metrics || (stage.dimensions || []); // support both 07 and 08 json format

            wrapper.innerHTML = `
                <div class="msc-analysis-card">
                    <div class="msc-analysis-title">
                        🧠 ${stage.title || 'AI PHÂN TÍCH'}
                    </div>
                    <div class="msc-metrics">
                        ${metrics.map(m => `
                            <div class="msc-metric">
                                <div class="msc-metric-label">${m.label}</div>
                                <div class="msc-metric-bar-wrap">
                                    <div class="msc-metric-bar" style="width: 0%" data-target="${Math.random() > 0.3 ? (70 + Math.random() * 30) : (20 + Math.random() * 30)}%"></div>
                                </div>
                                <div class="msc-metric-status">🔍</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="msc-feedback-box">
                        <div class="msc-fb-text">
                            ${stage.feedbackRules ? stage.feedbackRules[0].feedback : (stage.sampleFeedback ? stage.sampleFeedback.strengths[0] : 'Đoạn văn của em đã có hướng đi. Hãy luyện tập thêm để cấu trúc lập luận chặt chẽ hơn.')}
                        </div>
                    </div>
                    
                    <div class="msc-actions" style="margin-top:20px;">
                        <button class="msc-btn" id="btn-finish" style="background:#22c55e;">Hoàn thành chặng →</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const bars = wrapper.querySelectorAll('.msc-metric-bar');
                bars.forEach(bar => {
                    bar.style.width = bar.dataset.target;
                    const status = bar.parentElement.nextElementSibling;
                    if (parseFloat(bar.dataset.target) > 60) {
                        status.innerText = '✅';
                    } else {
                        status.innerText = '⚠️';
                    }
                });
            }, 300);

            wrapper.querySelector('#btn-finish').addEventListener('click', () => {
                component.dataset.completed = "true";
                window.engine && window.engine.next();
            });

            return wrapper;
        };

        setTimeout(renderCurrentStage, 0);
        return component;
    }
}
