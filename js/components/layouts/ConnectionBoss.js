export default class ConnectionBoss {
    static render(step) {
        const data = step.data || step;
        const component = document.createElement("div");
        component.className = "component connection-boss";
        
        let currentPhase = 1;
        const totalPhases = 4;
        
        // Data sources
        const task = data.task || {};
        const sentences = (task.paragraph && task.paragraph.sentences) ? task.paragraph.sentences : [];
        const s1 = data.stage1 || {};
        const s2 = data.stage2 || {};
        const s3 = data.stage3 || {};
        const s4 = data.stage4 || {};
        
        // State
        const detectedIds = new Set();
        const repairedSentences = {};
        const explainedMethods = new Set();
        sentences.forEach(s => repairedSentences[s.id] = s.text);
        
        // UI
        component.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column;">
                
                <!-- Header & Progress -->
                <div style="background: #1e293b; padding: 20px 30px; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 1.4em; color: #f8fafc; display: flex; align-items: center; gap: 10px;">
                            ${data.intro?.title || '🏆 PARAGRAPH REPAIR BOSS'}
                        </h2>
                        <div style="background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 0.9em; color: #cbd5e1;">
                            PHASE <span id="cb-phase-text">1</span>/4
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; position: relative;">
                        <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1); transform: translateY(-50%); z-index: 0;"></div>
                        ${[
                            {id: 1, icon: '🔍', label: 'Detect'},
                            {id: 2, icon: '🛠️', label: 'Repair'},
                            {id: 3, icon: '🧠', label: 'Explain'},
                            {id: 4, icon: '🤖', label: 'Analysis'}
                        ].map(p => `
                            <div id="cb-step-${p.id}" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 1; opacity: ${p.id === 1 ? 1 : 0.4}; transition: opacity 0.3s;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${p.id === 1 ? '#3b82f6' : '#334155'}; display: flex; align-items: center; justify-content: center; font-size: 0.9em; border: 2px solid ${p.id === 1 ? '#60a5fa' : '#475569'}; box-shadow: 0 0 0 4px #1e293b;">
                                    ${p.icon}
                                </div>
                                <div style="font-size: 0.75em; font-weight: bold; color: ${p.id === 1 ? '#93c5fd' : '#94a3b8'}; text-transform: uppercase; letter-spacing: 1px;">${p.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Workspace Content -->
                <div id="cb-workspace" style="padding: 30px; background: #f8fafc; min-height: 400px; position: relative;">
                    
                    <!-- Phase 1: Detect -->
                    <div id="cb-phase-1" style="display: block; animation: fadeIn 0.4s;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #334155; margin-bottom: 5px;">${s1.title || '🔍 01 DETECT'}</div>
                        <div style="color: #64748b; margin-bottom: 25px;">${s1.question || 'Tìm những chỗ đoạn văn chưa liên kết tốt.'}</div>
                        
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            ${sentences.map((s, idx) => `
                                <div class="cb-detect-sentence" data-id="${s.id}" style="padding: 12px 15px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; display: flex; gap: 15px; align-items: flex-start;">
                                    <div style="background: #e2e8f0; color: #475569; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8em; font-weight: bold; flex-shrink: 0; margin-top: 2px;">
                                        ${idx + 1}
                                    </div>
                                    <div style="flex: 1; font-size: 1.1em; color: #1e293b; line-height: 1.5;">${s.text}</div>
                                    <div class="cb-detect-warning" style="opacity: 0; font-size: 1.2em; transition: opacity 0.2s;">⚠️</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Phase 2: Repair -->
                    <div id="cb-phase-2" style="display: none; animation: fadeIn 0.4s;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #334155; margin-bottom: 5px;">${s2.title || '🛠️ 02 REPAIR'}</div>
                        <div style="color: #64748b; margin-bottom: 25px;">${s2.instruction || 'Hãy sửa những chỗ em phát hiện.'}</div>
                        
                        <div id="cb-repair-list" style="display: flex; flex-direction: column; gap: 15px;">
                            ${sentences.map((s, idx) => `
                                <div class="cb-repair-card" data-id="${s.id}" style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative; border-left: 4px solid #cbd5e1;">
                                    <div style="display: flex; gap: 15px; align-items: flex-start;">
                                        <div style="color: #94a3b8; font-weight: bold; width: 24px; flex-shrink: 0;">${idx + 1}</div>
                                        <div style="flex: 1;">
                                            <div id="cb-repair-text-${s.id}" style="font-size: 1.1em; color: #1e293b; margin-bottom: 10px; line-height: 1.5;">${s.text}</div>
                                            <div id="cb-repair-editor-${s.id}" style="display: none; margin-bottom: 10px;">
                                                <textarea id="cb-repair-input-${s.id}" style="width: 100%; min-height: 60px; padding: 10px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 1.05em; font-family: inherit; resize: vertical; box-sizing: border-box;">${s.text}</textarea>
                                                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                                                    <button class="cb-btn-cancel-edit" data-id="${s.id}" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Hủy</button>
                                                    <button class="cb-btn-save-edit" data-id="${s.id}" style="padding: 6px 15px; border-radius: 6px; border: none; background: #22c55e; color: white; font-weight: bold; cursor: pointer;">✓ Xong</button>
                                                </div>
                                            </div>
                                            <button class="cb-btn-edit" data-id="${s.id}" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 12px; border-radius: 15px; font-size: 0.85em; font-weight: bold; color: #475569; cursor: pointer; display: none;">
                                                ✏️ Sửa câu
                                            </button>
                                        </div>
                                    </div>
                                    <div class="cb-repair-warning" id="cb-repair-warn-${s.id}" style="position: absolute; top: -10px; right: 10px; background: white; border: 1px solid #fef08a; padding: 2px 8px; border-radius: 10px; font-size: 0.85em; font-weight: bold; color: #ca8a04; display: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                        ⚠️ Cần sửa
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Phase 3: Explain -->
                    <div id="cb-phase-3" style="display: none; animation: fadeIn 0.4s;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #334155; margin-bottom: 5px;">${s3.title || '🧠 03 EXPLAIN'}</div>
                        <div style="color: #64748b; margin-bottom: 25px;">${s3.question || 'Em đã dùng những cách nào để liên kết các câu?'}</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                                    ĐOẠN VĂN ĐÃ SỬA
                                </div>
                                <div id="cb-phase-3-paragraph" style="display: flex; flex-direction: column; gap: 8px;">
                                    <!-- populated dynamically -->
                                </div>
                            </div>
                            
                            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    ${(s3.options || []).map(opt => `
                                        <label style="display: flex; align-items: center; gap: 12px; padding: 12px 15px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s;" class="cb-explain-opt">
                                            <input type="checkbox" value="${opt.id}" style="width: 18px; height: 18px; accent-color: #3b82f6;">
                                            <span style="font-size: 1.1em; font-weight: bold; color: #334155;">${opt.label.replace('☐', '').trim()}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Phase 4: Analysis -->
                    <div id="cb-phase-4" style="display: none; animation: fadeIn 0.4s;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="font-size: 1.8em; font-weight: bold; color: #1e293b; margin-bottom: 10px;">${s4.exampleResult?.title || '🤖 HỒ SƠ LIÊN KẾT'}</div>
                            <div style="display: inline-flex; align-items: center; gap: 10px; background: #f0fdf4; border: 2px solid #86efac; padding: 10px 20px; border-radius: 30px;">
                                <span style="font-size: 1.5em;">📊</span>
                                <span style="font-weight: bold; font-size: 1.2em; color: #166534;">MỨC ĐỘ LIÊN KẾT: ${s4.exampleResult?.score?.value || 82}%</span>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <!-- Left Col: Link Map -->
                            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <div style="font-weight: bold; color: #475569; margin-bottom: 20px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                                    🗺️ Link Map
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
                                    ${(s4.exampleResult?.linkMap || []).map((link, idx) => {
                                        let color = link.status === 'good' ? '#22c55e' : link.status === 'bad' ? '#ef4444' : '#f59e0b';
                                        let lineStyle = link.status === 'bad' ? 'dashed' : 'solid';
                                        return `
                                            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 8px; width: 100%; text-align: left; position: relative; z-index: 2; box-sizing: border-box;">
                                                <div style="font-size: 0.8em; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">${link.from}</div>
                                                <div id="cb-link-from-${idx}" style="font-size: 0.95em; color: #1e293b;"></div>
                                            </div>
                                            <div style="height: 40px; width: 2px; background: transparent; border-left: 2px ${lineStyle} ${color}; position: relative; margin: 5px 0;">
                                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2px 8px; border-radius: 12px; border: 1px solid ${color}; font-size: 0.8em; font-weight: bold; color: ${color}; white-space: nowrap; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                                    ${link.icon || ''} ${link.method}
                                                </div>
                                            </div>
                                            ${idx === s4.exampleResult.linkMap.length - 1 ? `
                                                <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 8px; width: 100%; text-align: left; position: relative; z-index: 2; box-sizing: border-box;">
                                                    <div style="font-size: 0.8em; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">${link.to}</div>
                                                    <div id="cb-link-to-${idx}" style="font-size: 0.95em; color: #1e293b;"></div>
                                                </div>
                                            ` : ''}
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            
                            <!-- Right Col: Feedback -->
                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <div style="font-weight: bold; color: #475569; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px;">
                                        ✨ Điểm mạnh
                                    </div>
                                    <ul style="margin: 0; padding-left: 20px; color: #166534; font-weight: bold; line-height: 1.5;">
                                        ${(s4.exampleResult?.strengths || []).map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                                    </ul>
                                </div>
                                
                                <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <div style="font-weight: bold; color: #475569; margin-bottom: 15px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px;">
                                        🎯 Cần cải thiện
                                    </div>
                                    <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-weight: bold; line-height: 1.5;">
                                        ${(s4.exampleResult?.improvements || []).map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                                    </ul>
                                </div>
                                
                                <div style="background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe; padding: 20px;">
                                    <div style="font-weight: bold; color: #1d4ed8; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                                        💡 Gợi ý của AI
                                    </div>
                                    <div style="color: #1e3a8a; line-height: 1.5;">
                                        ${s4.exampleResult?.suggestion || ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer Action -->
                <div style="padding: 20px 30px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div id="cb-action-hint" style="color: #64748b; font-weight: bold; font-size: 0.95em;">Hãy click vào câu có vấn đề.</div>
                    <button id="cb-btn-next" style="background: #3b82f6; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);">
                        TIẾP TỤC →
                    </button>
                </div>
                
            </div>
            
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .cb-detect-sentence:hover { border-color: #cbd5e1; background: white; }
                .cb-detect-sentence.selected { border-color: #f59e0b; background: #fffbeb; }
                .cb-explain-opt:hover { border-color: #93c5fd; background: #f8fafc; }
                .cb-explain-opt.selected { border-color: #3b82f6; background: #eff6ff; }
            </style>
        `;
        
        // Logic
        setTimeout(() => {
            const btnNext = component.querySelector('#cb-btn-next');
            const phaseText = component.querySelector('#cb-phase-text');
            const hintText = component.querySelector('#cb-action-hint');
            
            // Phase 1 Logic
            const detectSentences = component.querySelectorAll('.cb-detect-sentence');
            detectSentences.forEach(el => {
                el.addEventListener('click', () => {
                    const id = el.dataset.id;
                    if (detectedIds.has(id)) {
                        detectedIds.delete(id);
                        el.classList.remove('selected');
                        el.querySelector('.cb-detect-warning').style.opacity = '0';
                    } else {
                        detectedIds.add(id);
                        el.classList.add('selected');
                        el.querySelector('.cb-detect-warning').style.opacity = '1';
                    }
                });
            });
            
            // Phase 2 Logic
            const btnEdits = component.querySelectorAll('.cb-btn-edit');
            const btnCancelEdits = component.querySelectorAll('.cb-btn-cancel-edit');
            const btnSaveEdits = component.querySelectorAll('.cb-btn-save-edit');
            
            btnEdits.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    component.querySelector(`#cb-repair-text-${id}`).style.display = 'none';
                    component.querySelector(`#cb-repair-editor-${id}`).style.display = 'block';
                    btn.style.display = 'none';
                });
            });
            
            btnCancelEdits.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    component.querySelector(`#cb-repair-text-${id}`).style.display = 'block';
                    component.querySelector(`#cb-repair-editor-${id}`).style.display = 'none';
                    component.querySelector(`.cb-btn-edit[data-id="${id}"]`).style.display = 'inline-block';
                    // Reset text
                    component.querySelector(`#cb-repair-input-${id}`).value = repairedSentences[id];
                });
            });
            
            btnSaveEdits.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const newText = component.querySelector(`#cb-repair-input-${id}`).value;
                    repairedSentences[id] = newText;
                    
                    const textEl = component.querySelector(`#cb-repair-text-${id}`);
                    textEl.textContent = newText;
                    textEl.style.display = 'block';
                    
                    component.querySelector(`#cb-repair-editor-${id}`).style.display = 'none';
                    component.querySelector(`.cb-btn-edit[data-id="${id}"]`).style.display = 'inline-block';
                    
                    // Mark as fixed
                    component.querySelector(`#cb-repair-warn-${id}`).style.display = 'none';
                    const card = component.querySelector(`.cb-repair-card[data-id="${id}"]`);
                    card.style.borderLeftColor = '#22c55e';
                    card.style.background = '#f0fdf4';
                });
            });
            
            // Phase 3 Logic
            const explainOpts = component.querySelectorAll('.cb-explain-opt');
            explainOpts.forEach(lbl => {
                const cb = lbl.querySelector('input');
                cb.addEventListener('change', () => {
                    if (cb.checked) {
                        lbl.classList.add('selected');
                        explainedMethods.add(cb.value);
                    } else {
                        lbl.classList.remove('selected');
                        explainedMethods.delete(cb.value);
                    }
                });
            });
            
            // Navigation Logic
            btnNext.addEventListener('click', () => {
                if (currentPhase < totalPhases) {
                    // Hide current phase
                    component.querySelector(`#cb-phase-${currentPhase}`).style.display = 'none';
                    component.querySelector(`#cb-step-${currentPhase}`).style.opacity = '0.4';
                    component.querySelector(`#cb-step-${currentPhase}`).querySelector('div').style.background = '#334155';
                    component.querySelector(`#cb-step-${currentPhase}`).querySelector('div').style.borderColor = '#475569';
                    component.querySelector(`#cb-step-${currentPhase}`).querySelectorAll('div')[1].style.color = '#94a3b8';
                    
                    currentPhase++;
                    
                    // Show next phase
                    component.querySelector(`#cb-phase-${currentPhase}`).style.display = 'block';
                    phaseText.textContent = currentPhase;
                    
                    // Update header progress
                    const stepEl = component.querySelector(`#cb-step-${currentPhase}`);
                    stepEl.style.opacity = '1';
                    stepEl.querySelector('div').style.background = '#3b82f6';
                    stepEl.querySelector('div').style.borderColor = '#60a5fa';
                    stepEl.querySelectorAll('div')[1].style.color = '#93c5fd';
                    
                    // Phase-specific initialization
                    if (currentPhase === 2) {
                        hintText.textContent = "Sửa trực tiếp vào câu có vấn đề.";
                        // Apply warnings from Phase 1
                        detectedIds.forEach(id => {
                            component.querySelector(`#cb-repair-warn-${id}`).style.display = 'block';
                            component.querySelector(`.cb-btn-edit[data-id="${id}"]`).style.display = 'inline-block';
                            component.querySelector(`.cb-repair-card[data-id="${id}"]`).style.borderLeftColor = '#f59e0b';
                        });
                        btnNext.innerHTML = 'XÁC NHẬN SỬA →';
                    } else if (currentPhase === 3) {
                        hintText.textContent = "Chọn các phép liên kết em đã sử dụng.";
                        btnNext.innerHTML = 'XEM KẾT QUẢ PHÂN TÍCH →';
                        
                        // Populate repaired paragraph
                        const pContainer = component.querySelector('#cb-phase-3-paragraph');
                        pContainer.innerHTML = '';
                        sentences.forEach((s, idx) => {
                            const isEdited = detectedIds.has(s.id);
                            const textColor = isEdited ? '#ca8a04' : '#1e293b';
                            const bgColor = isEdited ? '#fefce8' : 'transparent';
                            pContainer.innerHTML += `
                                <div style="display: flex; gap: 10px; align-items: flex-start; padding: 5px 8px; border-radius: 6px; background: ${bgColor};">
                                    <div style="color: #94a3b8; font-size: 0.85em; font-weight: bold; margin-top: 3px;">${idx + 1}</div>
                                    <div style="font-size: 1.05em; color: ${textColor};">${repairedSentences[s.id]}</div>
                                </div>
                            `;
                        });
                    } else if (currentPhase === 4) {
                        hintText.textContent = "Hồ sơ của em đã được lưu lại.";
                        btnNext.innerHTML = 'HOÀN THÀNH BÀI HỌC 🚀';
                        btnNext.style.background = '#22c55e';
                        btnNext.style.boxShadow = '0 4px 6px -1px rgba(34, 197, 94, 0.4)';
                        
                        // Populate link map texts
                        if (s4.exampleResult?.linkMap) {
                            s4.exampleResult.linkMap.forEach((link, idx) => {
                                // "Câu X" means index X-1. We know from is idx, to is idx+1
                                component.querySelector(`#cb-link-from-${idx}`).textContent = repairedSentences[sentences[idx].id];
                                if (idx === s4.exampleResult.linkMap.length - 1) {
                                    component.querySelector(`#cb-link-to-${idx}`).textContent = repairedSentences[sentences[idx+1].id];
                                }
                            });
                        }
                    }
                } else {
                    // Done
                    component.dataset.completed = "true";
                    window.engine && window.engine.next();
                }
            });
            
        }, 0);
        
        return component;
    }
}
