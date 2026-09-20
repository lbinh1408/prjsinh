export default class EditorBoss {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component editor-boss-wrapper";

        const stages = (data.ui && data.ui.stages) ? data.ui.stages : [];
        const detectStage = stages.find(s => s.id === 'detect') || {};
        const repairStage = stages.find(s => s.id === 'repair') || {};
        const sentences = (detectStage.interaction && detectStage.interaction.sentences) ? detectStage.interaction.sentences : [];

        const analysis = data.ai_analysis || data.aiAnalysis || {};
        const report = analysis.report || {};
        const metrics = report.metrics || [];
        const example = report.example || {};

        const isStrategyFirst = data.ui && data.ui.showStrategyBeforeWriting;
        const stratQ = data.strategyQuestion || '';
        const stratChoices = data.choices || [];
        const stratExpected = data.expected || {};

        component.innerHTML = `
            <style>
                .editor-boss-wrapper { padding: 20px 0; }
                .editor-boss-wrapper .ey { font-size: 12px; font-weight: 800; letter-spacing: .12em; color: #6d5dfc; margin-bottom: 10px; text-transform: uppercase; }
                .editor-boss-wrapper h2 { font-size: 29px; margin: 0 0 20px 0; color: #172033; }
                .editor-boss-wrapper .final { background: #e6e6e6; color: #171616ff; border-radius: 24px; padding: 28px; }
                .editor-boss-wrapper .muted { color: #4c5b8d; line-height: 1.65; }
                .editor-boss-wrapper .text { font-size: 18px; line-height: 1.8; margin: 20px 0; }
                .editor-boss-wrapper .btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; margin-bottom: 20px; }
                .editor-boss-wrapper .tool { border: 1px solid #39405a; border-radius: 12px; padding: 10px 15px; background: transparent; color: #6a5389; cursor: pointer; font-weight: 700; transition: all 0.2s; }
                .editor-boss-wrapper .tool:hover, .editor-boss-wrapper .tool.sel { border-color: #6d5dfc; background: #6d5dfc; color: #fff; }
                .editor-boss-wrapper textarea { background: #cdd1dfff; color: #673d6e; border-color: #39405a; width: 100%; min-height: 150px; padding: 14px; border: 1px solid #39405a; border-radius: 14px; font: inherit; line-height: 1.6; box-sizing: border-box; resize: vertical; margin-bottom: 15px; }
                .editor-boss-wrapper textarea:focus { outline: none; border-color: #6d5dfc; }
                .editor-boss-wrapper .btn { border: 0; font-weight: 800; border-radius: 12px; padding: 14px 24px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
                .editor-boss-wrapper .primary { background: #6d5dfc; color: #fff; }
                .editor-boss-wrapper .primary:hover { background: #5b4be8; }
                .editor-boss-wrapper .feedback { display: none; margin-top: 20px; background: #eef2ff; border-radius: 16px; padding: 18px; border: 1px solid #c7d2fe; color: #312e81; animation: fadeIn 0.4s; }
                .editor-boss-wrapper .feedback.show { display: block; }
                .editor-boss-wrapper .feedback h3 { margin-top: 0; margin-bottom: 10px; color: #312e81; font-size: 1.2rem; }
                .editor-boss-wrapper .strat-choice { display: block; width: 100%; text-align: left; padding: 15px; margin-bottom: 10px; border: 2px solid #cbd5e1; border-radius: 12px; background: white; color: #334155; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .editor-boss-wrapper .strat-choice:hover { border-color: #94a3b8; background: #f8fafc; }
                .editor-boss-wrapper .strat-choice.sel { border-color: #6d5dfc; background: #f3f1ff; color: #6d5dfc; }
                .editor-boss-wrapper .strat-feedback { display: none; margin-top: 15px; padding: 15px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-weight: 500; margin-bottom: 20px; }
                .editor-boss-wrapper .strat-feedback.wrong { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            
            <div class="editor-boss-wrapper">
                <div class="ey">❾ FINAL BOSS</div>
                ${promptText ? `<h2>${promptText}</h2>` : ''}
                
                <div class="final">
                    <h3 style="margin-top:0;">📝 Đề bài</h3>
                    <p style="font-size:1.2rem; font-style:italic; margin-bottom:20px; border-left:4px solid #6d5dfc; padding-left:15px;">${data.prompt || ''}</p>
                    
                    ${isStrategyFirst ? `
                        <div id="eb-strategy-stage">
                            <h3 style="margin-top:0; font-size:1.3rem;">🎯 ${stratQ}</h3>
                            <div class="strat-options" style="margin-top: 20px;">
                                ${stratChoices.map((c, i) => {
                                    const text = typeof c === 'string' ? c : c.text || c.label;
                                    const val = typeof c === 'string' ? c : c.id || c.value || text;
                                    const escapedVal = val.replace(/"/g, '&quot;');
                                    return `<button class="strat-choice" data-val="${escapedVal}">${text}</button>`;
                                }).join('')}
                            </div>
                            <div class="strat-feedback" id="eb-strat-feedback"></div>
                            <button class="btn primary" id="eb-btn-start-writing" style="display:none; width:100%; margin-top:10px;">Bắt đầu viết →</button>
                        </div>
                        
                        <div id="eb-writing-stage" style="display:none;">
                            <textarea id="eb-final-textarea" placeholder="${data.editor?.placeholder || 'Viết đoạn văn của em...'}"></textarea>
                            
                            <div class="btns">
                                <button class="btn primary" id="eb-btn-submit" style="width: 100%; margin-top: 10px;">Phân tích AI</button>
                            </div>
                        </div>
                        
                        <div class="feedback" id="eb-feedback">
                            <h3>🤖 AI Analysis</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                                ${(analysis.sections || []).map(sec => `
                                    <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #c7d2fe;">
                                        <b style="color: #4338ca;">${sec}</b>
                                        <p class="fb-sec" style="margin: 5px 0 0 0; color: #475569; font-size: 0.95rem;">Đang phân tích...</p>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="margin-top: 20px; text-align: center;">
                                <p style="color: #4338ca; font-weight: bold;">Hoàn thành xuất sắc! 🏆</p>
                            </div>
                        </div>
                        <button class="btn primary" id="eb-btn-finish" style="display:none; margin-top:20px; width:100%;">Kết thúc Lesson 08 🏆</button>
                    ` : (sentences.length > 0 ? `
                        <p class="muted">${detectStage.instruction || 'Không cho đáp án. Không cho category. Em là người biên tập.'}</p>
                        
                        <div class="text">
                            ${sentences.map((s, i) => {
            const text = typeof s === 'string' ? s : s.text;
            const isCorrect = typeof s === 'string' ? false : s.isCorrect;
            return `<span class="eb-sentence" data-idx="${i}" data-correct="${isCorrect ? 'true' : 'false'}" style="cursor:pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.2s;">${text}</span>`;
        }).join(' ')}
                        </div>
                        
                        <div id="eb-repair-area" style="display:none; margin-top:30px;">
                            <h3 style="color:#6d5dfc; margin-top:0;">🔧 Sửa lại câu này:</h3>
                            <p id="eb-repair-original" style="font-style:italic; color:#4c5b8d; margin-bottom:15px; padding-left: 10px; border-left: 3px solid #4c5b8d;"></p>
                            <textarea id="eb-repair-input" placeholder="Viết lại cho hay hơn..."></textarea>
                            <button class="btn primary" id="eb-btn-submit-repair" style="margin-top:15px;">Chốt câu →</button>
                        </div>
    
                        <div class="feedback" id="eb-feedback">
                            <h3>🤖 AI Analysis</h3>
                            <p><b>Điểm mạnh:</b> ${(example.strengths || []).join(', ')}</p>
                            <p><b>Điểm cần cải thiện:</b> ${(example.improvements || []).join(', ')}</p>
                            <p><b>Độ mượt:</b> ${example.score || 8}/${example.max || 10}</p>
                        </div>
                        
                        <button class="btn primary" id="eb-btn-finish" style="display:none; margin-top:20px;">Hoàn thành bài học 🏆</button>
                    ` : `
                        <div id="eb-writing-stage">
                            <textarea id="eb-final-textarea" placeholder="${data.editor?.placeholder || 'Viết bài làm của em tại đây...'}" style="width: 100%; min-height: 250px; font-size: 1.1rem; padding: 20px;"></textarea>
                            
                            <div class="btns">
                                <button class="btn primary" id="eb-btn-submit-simple" style="width: 100%; margin-top: 10px;">Nộp bài</button>
                            </div>
                        </div>
                        
                        <div class="feedback" id="eb-feedback">
                            <h3 style="color: #10b981; font-size: 1.3rem;">✅ Đã ghi nhận bài làm</h3>
                            <p style="color: #475569; font-size: 1.05rem; line-height: 1.6;">Bài viết của em đã được lưu vào hệ thống. Trợ giảng AI sẽ phân tích và gửi lại kết quả chi tiết.</p>
                        </div>
                        <button class="btn primary" id="eb-btn-finish" style="display:none; margin-top:20px; width:100%; background: #10b981; border-color: #10b981;">Chuyển sang phần tiếp theo →</button>
                    `)}
                </div>
            </div>
        `;

        setTimeout(() => {
            const btnFinish = component.querySelector('#eb-btn-finish');

            if (isStrategyFirst) {
                const choices = component.querySelectorAll('.strat-choice');
                const fb = component.querySelector('#eb-strat-feedback');
                const btnStart = component.querySelector('#eb-btn-start-writing');
                const btnSubmit = component.querySelector('#eb-btn-submit');
                const fbArea = component.querySelector('#eb-feedback');
                let answered = false;

                choices.forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (answered) return;
                        const val = btn.dataset.val;
                        choices.forEach(b => b.classList.remove('sel'));
                        btn.classList.add('sel');

                        if (val === stratExpected.primary) {
                            fb.className = 'strat-feedback';
                            fb.innerHTML = `✨ <b>Chính xác!</b> ${stratExpected.reason || ''}`;
                            fb.style.display = 'block';
                            btnStart.style.display = 'block';
                            answered = true;
                        } else {
                            fb.className = 'strat-feedback wrong';
                            fb.innerHTML = `❌ Chưa phù hợp. Đề bài yêu cầu "trình bày suy nghĩ", em hãy xem lại nhé.`;
                            fb.style.display = 'block';
                        }
                    });
                });

                btnStart.addEventListener('click', () => {
                    component.querySelector('#eb-strategy-stage').style.display = 'none';
                    component.querySelector('#eb-writing-stage').style.display = 'block';
                });

                btnSubmit.addEventListener('click', () => {
                    btnSubmit.innerHTML = "Đang phân tích...";
                    btnSubmit.disabled = true;
                    setTimeout(() => {
                        btnSubmit.style.display = 'none';
                        fbArea.classList.add('show');
                        btnFinish.style.display = 'block';

                        // Fake AI response update
                        const pTags = fbArea.querySelectorAll('.fb-sec');
                        if (pTags.length >= 4) {
                            pTags[0].innerHTML = "Rõ ràng, thuyết phục.";
                            pTags[1].innerHTML = `<b>${stratExpected.primary}</b> - Rất tốt!`;
                            pTags[2].innerHTML = `Có kết hợp <b>${(stratExpected.acceptableCombination || [])[0] || 'Miêu tả'}</b>.`;
                            pTags[3].innerHTML = "Logic, có chiều sâu.";
                        }
                    }, 1500);
                });

            } else {
                if (sentences.length > 0) {
                    // Old logic for detect and repair
                    let errorFoundCount = 0;
                    let currentRepairIndex = 0;
                    const errorIndices = sentences.map((s, i) => {
                        const isCorrect = typeof s === 'string' ? false : s.isCorrect;
                        return !isCorrect ? i : -1;
                    }).filter(i => i !== -1);

                    const sEls = component.querySelectorAll('.eb-sentence');
                    const repairArea = component.querySelector('#eb-repair-area');
                    const repairOriginal = component.querySelector('#eb-repair-original');
                    const repairInput = component.querySelector('#eb-repair-input');
                    const btnSubmitRepair = component.querySelector('#eb-btn-submit-repair');
                    const fbArea = component.querySelector('#eb-feedback');

                    sEls.forEach(el => {
                        el.addEventListener('click', () => {
                            if (repairArea.style.display === 'block') return; // đang sửa

                            const isCorrect = el.dataset.correct === 'true';
                            if (!isCorrect) {
                                el.style.background = '#fecaca'; // đỏ nhạt
                                el.style.color = '#991b1b';

                                setTimeout(() => {
                                    // Mở form sửa
                                    repairArea.style.display = 'block';
                                    repairOriginal.innerText = sentences[el.dataset.idx].text;
                                    repairInput.value = "";
                                }, 500);
                            } else {
                                el.style.background = '#dcfce7'; // xanh nhạt
                                el.style.color = '#166534';
                                setTimeout(() => {
                                    el.style.background = 'transparent';
                                    el.style.color = 'inherit';
                                }, 1000);
                            }
                        });
                    });

                    btnSubmitRepair.addEventListener('click', () => {
                        if (repairInput.value.trim().length > 3) {
                            repairArea.style.display = 'none';
                            errorFoundCount++;

                            if (errorFoundCount >= errorIndices.length) {
                                // Xong hết, hiện AI Analysis
                                setTimeout(() => {
                                    fbArea.classList.add('show');
                                    btnFinish.style.display = 'block';
                                }, 1000);
                            }
                        }
                    });
                } else {
                    // Simple essay mode
                    const btnSubmitSimple = component.querySelector('#eb-btn-submit-simple');
                    const fbArea = component.querySelector('#eb-feedback');
                    if (btnSubmitSimple) {
                        btnSubmitSimple.addEventListener('click', () => {
                            const ta = component.querySelector('#eb-final-textarea');
                            if (!ta || ta.value.trim().length < 5) {
                                ta?.focus();
                                return;
                            }
                            btnSubmitSimple.innerHTML = "Đang lưu bài...";
                            btnSubmitSimple.disabled = true;
                            setTimeout(() => {
                                btnSubmitSimple.style.display = 'none';
                                fbArea.classList.add('show');
                                if (btnFinish) btnFinish.style.display = 'block';
                                if (ta) ta.disabled = true;
                            }, 1000);
                        });
                    }
                }
            }

            if (btnFinish) {
                btnFinish.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                });
            }
        }, 0);

        return component;
    }
}
