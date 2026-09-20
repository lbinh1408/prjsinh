export default class GuidedWorkspace {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";
        
        const content = data.content || {};
        const steps = content.steps || [];
        const progress = data.ui?.progress || [];

        // Render progress bar
        const progressHtml = `
            <div class="gp-workspace-progress" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; position: relative;">
                <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 0; transform: translateY(-50%);"></div>
                ${progress.map((p, i) => `
                    <div class="progress-node node-${i} ${i === 0 ? 'active' : ''}" style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div class="node-circle" style="width: 30px; height: 30px; border-radius: 50%; background: ${i === 0 ? '#3b82f6' : 'white'}; border: 2px solid ${i === 0 ? '#3b82f6' : '#cbd5e1'}; color: ${i === 0 ? 'white' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.3s;">${i + 1}</div>
                        <div class="node-label" style="font-size: 0.9em; font-weight: 600; color: ${i === 0 ? '#1e293b' : '#94a3b8'};">${p}</div>
                    </div>
                `).join('')}
            </div>
        `;

        const stepsHtml = steps.map((s, index) => {
            let innerHtml = '';
            
            if (s.id === 'select') {
                innerHtml = `
                    <div class="step-select" style="display: flex; gap: 20px;">
                        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                            <div style="font-weight: bold; color: #475569; margin-bottom: 15px;">Kho ý tưởng</div>
                            <div class="ideas-pool" style="display: flex; flex-direction: column; gap: 10px; min-height: 200px;">
                                ${s.ideas.map(idea => `
                                    <div class="idea-item" data-id="${idea.id}" data-relevant="${idea.relevant}" draggable="true" style="background: white; border: 1px solid #cbd5e1; padding: 12px 15px; border-radius: 8px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-weight: 500;">
                                        ${idea.text}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                            ${s.interaction.targets.map(t => `
                                <div class="drop-target" data-target="${t.id}" style="flex: 1; background: white; border: 2px dashed ${t.id === 'keep' ? '#3b82f6' : '#94a3b8'}; border-radius: 12px; padding: 20px; display: flex; flex-direction: column;">
                                    <div style="font-weight: bold; color: ${t.id === 'keep' ? '#1d4ed8' : '#475569'}; margin-bottom: 15px; text-align: center;">📥 ${t.label}</div>
                                    <div class="target-pool" style="flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 100px;"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (s.id === 'group') {
                innerHtml = `
                    <div class="step-group">
                        <div style="margin-bottom: 20px;">
                            <div style="font-weight: bold; color: #475569; margin-bottom: 10px;">Các ý đã DÙNG:</div>
                            <div class="group-ideas-pool" style="display: flex; flex-wrap: wrap; gap: 10px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; min-height: 60px;">
                                <!-- Filled dynamically by JS -->
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            ${s.groups.map(g => `
                                <div class="drop-group" data-group="${g.id}" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; display: flex; flex-direction: column;">
                                    <div style="font-weight: bold; color: #0f172a; margin-bottom: 15px; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">${g.title}</div>
                                    <div class="group-pool" style="flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 100px;"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (s.id === 'build') {
                innerHtml = `
                    <div class="step-build" style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #475569; margin-bottom: 10px;">Các nhóm ý:</div>
                            <div class="build-groups-pool" style="display: flex; flex-direction: column; gap: 10px;">
                                <!-- Filled dynamically -->
                            </div>
                        </div>
                        <div style="flex: 2; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                            <div style="font-weight: bold; font-size: 1.2em; color: #0f172a; margin-bottom: 20px; text-align: center;">📝 DÀN Ý CỦA EM</div>
                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                ${s.outline.sections.map(sec => `
                                    <div class="outline-section" data-section="${sec.id}" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                                        <div style="background: #f1f5f9; padding: 10px 15px; font-weight: bold; color: #334155; display: flex; justify-content: space-between;">
                                            <span>${sec.title}</span>
                                        </div>
                                        <div class="section-slots" style="padding: 15px; background: #fafafa; display: flex; flex-direction: column; gap: 10px; min-height: 60px;">
                                            ${sec.slots.map(slot => `
                                                <div class="build-slot" data-slot="${slot}" style="border: 2px dashed #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">
                                                    Thả phần "${slot}" vào đây
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else if (s.id === 'test') {
                innerHtml = `
                    <div class="step-test">
                        <div class="test-question" style="background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; color: #b45309; font-weight: bold; margin-bottom: 20px; text-align: center;">
                            🎯 ${s.question} (Bấm vào các ý bên dưới để xóa thử)
                        </div>
                        <div class="test-outline-view" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                            <!-- Filled dynamically with the outline from step 3 -->
                        </div>
                        <div class="test-feedback" style="display: none; margin-top: 20px; padding: 15px; border-radius: 8px; font-weight: 500;"></div>
                    </div>
                `;
            }

            return `
                <div class="workspace-step step-${index}" style="display: ${index === 0 ? 'block' : 'none'}; animation: fadeIn 0.4s;">
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.3em;">${s.title}</h3>
                        <div style="font-size: 1.1em; color: #334155; font-weight: 500;">${s.instruction || s.question || ''}</div>
                    </div>
                    <div class="step-content-area">
                        ${innerHtml}
                    </div>
                    
                    <div style="text-align: right; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                        <div class="step-error-msg" style="color: #ef4444; font-weight: bold; margin-bottom: 10px; display: none;"></div>
                        <button class="btn btn-primary btn-ws-next" data-index="${index}" style="padding: 10px 30px; border-radius: 8px;">
                            ${index === steps.length - 1 ? 'Hoàn thành' : 'Tiếp tục →'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        component.innerHTML = `
            <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                ${content.task ? `
                    <div style="color: #475569; font-size: 1.1em; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <strong>Đề bài:</strong> ${content.task.prompt}
                    </div>
                ` : ''}
            </div>
            
            <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                ${progressHtml}
                <div class="workspace-steps-container">
                    ${stepsHtml}
                </div>
            </div>
            
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .idea-item.dragging { opacity: 0.5; transform: scale(1.05); }
                .drop-target.drag-over, .drop-group.drag-over, .build-slot.drag-over { background: #eff6ff !important; border-color: #3b82f6 !important; }
                .build-slot.filled { border-style: solid; background: white; padding: 5px; }
                .test-idea { cursor: pointer; transition: all 0.2s; }
                .test-idea:hover { transform: scale(1.02); box-shadow: 0 2px 4px rgba(0,0,0,0.1); background: #fef2f2 !important; border-color: #fca5a5 !important; }
                .test-idea.removed { opacity: 0.3; text-decoration: line-through; pointer-events: none; }
            </style>
        `;

        this.bindWorkspace(component, data);
        return component;
    }

    static bindWorkspace(component, data) {
        const content = data.content || {};
        const steps = content.steps || [];
        
        let currentStep = 0;
        let selectedIdeas = []; // IDs of ideas marked as 'keep'
        let groupedIdeas = {}; // group_id -> array of idea html strings
        
        const updateProgress = () => {
            component.querySelectorAll('.progress-node').forEach((node, i) => {
                const circle = node.querySelector('.node-circle');
                const label = node.querySelector('.node-label');
                if (i <= currentStep) {
                    node.classList.add('active');
                    circle.style.background = '#3b82f6';
                    circle.style.borderColor = '#3b82f6';
                    circle.style.color = 'white';
                    label.style.color = '#1e293b';
                } else {
                    node.classList.remove('active');
                    circle.style.background = 'white';
                    circle.style.borderColor = '#cbd5e1';
                    circle.style.color = '#64748b';
                    label.style.color = '#94a3b8';
                }
            });
        };
        
        const showStep = (idx) => {
            component.querySelectorAll('.workspace-step').forEach((el, i) => {
                el.style.display = i === idx ? 'block' : 'none';
            });
            updateProgress();
            setupStepInteractions(idx);
        };
        
        const setupDragAndDrop = (draggables, dropzones, onDrop) => {
            let dragged = null;
            
            draggables.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    dragged = item;
                    setTimeout(() => item.classList.add('dragging'), 0);
                });
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                    dragged = null;
                });
            });
            
            dropzones.forEach(zone => {
                zone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    zone.classList.add('drag-over');
                });
                zone.addEventListener('dragleave', () => {
                    zone.classList.remove('drag-over');
                });
                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('drag-over');
                    if (dragged) {
                        zone.querySelector('.target-pool, .group-pool, .section-slots')?.appendChild(dragged) || zone.appendChild(dragged);
                        if (onDrop) onDrop(dragged, zone);
                    }
                });
            });
        };
        
        const setupStepInteractions = (idx) => {
            const stepData = steps[idx];
            if (!stepData) return;
            
            const stepEl = component.querySelector(`.step-${idx}`);
            const errorMsg = stepEl.querySelector('.step-error-msg');
            if (errorMsg) errorMsg.style.display = 'none';
            
            if (stepData.id === 'select') {
                const ideas = stepEl.querySelectorAll('.idea-item');
                const targets = stepEl.querySelectorAll('.drop-target');
                setupDragAndDrop(ideas, targets);
            } else if (stepData.id === 'group') {
                // Populate used ideas
                const pool = stepEl.querySelector('.group-ideas-pool');
                pool.innerHTML = '';
                const selectStep = component.querySelector('.step-0');
                if (selectStep) {
                    const keepZone = selectStep.querySelector('.drop-target[data-target="keep"] .target-pool');
                    if (keepZone) {
                        const keptIdeas = keepZone.querySelectorAll('.idea-item');
                        keptIdeas.forEach(idea => {
                            const clone = idea.cloneNode(true);
                            clone.setAttribute('draggable', 'true');
                            pool.appendChild(clone);
                        });
                    }
                }
                
                const draggables = stepEl.querySelectorAll('.idea-item');
                const dropGroups = stepEl.querySelectorAll('.drop-group');
                setupDragAndDrop(draggables, dropGroups);
            } else if (stepData.id === 'build') {
                // Populate groups
                const pool = stepEl.querySelector('.build-groups-pool');
                pool.innerHTML = '';
                
                const groupStep = component.querySelector('.step-1');
                if (groupStep) {
                    const groups = groupStep.querySelectorAll('.drop-group');
                    groups.forEach(g => {
                        const groupId = g.getAttribute('data-group');
                        const groupTitle = g.querySelector('div').innerText;
                        const ideaCount = g.querySelectorAll('.idea-item').length;
                        
                        const groupBlock = document.createElement('div');
                        groupBlock.className = 'build-group-item';
                        groupBlock.setAttribute('draggable', 'true');
                        groupBlock.setAttribute('data-group', groupId);
                        groupBlock.style.cssText = 'background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; cursor: grab; font-weight: bold; color: #1d4ed8;';
                        groupBlock.innerHTML = `📦 ${groupTitle} (${ideaCount} ý)`;
                        pool.appendChild(groupBlock);
                        
                        // save grouped ideas html for later use in test step
                        groupedIdeas[groupId] = Array.from(g.querySelectorAll('.idea-item')).map(el => ({ id: el.getAttribute('data-id'), text: el.innerText }));
                    });
                }
                
                const draggables = stepEl.querySelectorAll('.build-group-item');
                const slots = stepEl.querySelectorAll('.build-slot');
                setupDragAndDrop(draggables, slots, (dragged, zone) => {
                    zone.classList.add('filled');
                });
            } else if (stepData.id === 'test') {
                // Render the built outline
                const testView = stepEl.querySelector('.test-outline-view');
                const buildStep = component.querySelector('.step-2');
                let outlineHtml = '';
                
                if (buildStep) {
                    const sections = buildStep.querySelectorAll('.outline-section');
                    sections.forEach(sec => {
                        const title = sec.querySelector('span').innerText;
                        outlineHtml += `<div style="margin-bottom: 20px;"><div style="font-weight: bold; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">${title}</div>`;
                        
                        const slots = sec.querySelectorAll('.build-slot');
                        slots.forEach(slot => {
                            const groupItem = slot.querySelector('.build-group-item');
                            if (groupItem) {
                                const groupId = groupItem.getAttribute('data-group');
                                const ideasList = groupedIdeas[groupId] || [];
                                outlineHtml += `
                                    <div style="margin-bottom: 10px; padding-left: 15px; border-left: 3px solid #3b82f6;">
                                        <div style="font-weight: bold; color: #3b82f6; margin-bottom: 5px;">${groupItem.innerText}</div>
                                        <ul style="margin: 0; padding-left: 20px;">
                                            ${ideasList.map(idea => `
                                                <li class="test-idea" data-idea-id="${idea.id}" style="color: #475569; padding: 5px; border-radius: 4px;">
                                                    ${idea.text}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                `;
                            }
                        });
                        outlineHtml += `</div>`;
                    });
                }
                testView.innerHTML = outlineHtml;
                
                // Add click events to test ideas
                const feedbackDiv = stepEl.querySelector('.test-feedback');
                const tests = stepData.tests || [];
                
                stepEl.querySelectorAll('.test-idea').forEach(ideaEl => {
                    ideaEl.addEventListener('click', () => {
                        ideaEl.classList.add('removed');
                        
                        // find feedback
                        const ideaId = ideaEl.getAttribute('data-idea-id');
                        const ideaText = ideaEl.innerText.trim();
                        const testInfo = tests.find(t => t.id === ideaId || t.idea === ideaText);
                        
                        if (testInfo) {
                            feedbackDiv.style.display = 'block';
                            if (testInfo.impact === 'high') {
                                feedbackDiv.style.background = '#fef2f2';
                                feedbackDiv.style.borderLeft = '4px solid #ef4444';
                                feedbackDiv.style.color = '#b91c1c';
                                feedbackDiv.innerHTML = `❌ <strong>Cảnh báo:</strong> ${testInfo.feedback}`;
                            } else {
                                feedbackDiv.style.background = '#f0fdf4';
                                feedbackDiv.style.borderLeft = '4px solid #22c55e';
                                feedbackDiv.style.color = '#15803d';
                                feedbackDiv.innerHTML = `✅ <strong>An toàn:</strong> ${testInfo.feedback}`;
                            }
                        }
                    });
                });
            }
        };
        
        const validateStep = (idx) => {
            const stepData = steps[idx];
            if (!stepData) return true;
            
            const stepEl = component.querySelector(`.step-${idx}`);
            const errorMsg = stepEl.querySelector('.step-error-msg');
            
            if (stepData.id === 'select') {
                const ideas = stepEl.querySelectorAll('.ideas-pool .idea-item');
                if (ideas.length > 0) {
                    errorMsg.innerText = "Vui lòng phân loại tất cả các ý tưởng.";
                    errorMsg.style.display = 'block';
                    return false;
                }
                
                // Basic validation: Check if 'keep' has wrong items (optional, depending on strictness)
                const kept = stepEl.querySelectorAll('.drop-target[data-target="keep"] .idea-item');
                let hasWrong = false;
                kept.forEach(item => {
                    if (item.getAttribute('data-relevant') === 'false') hasWrong = true;
                });
                if (hasWrong) {
                    errorMsg.innerText = "Có vẻ bạn đã chọn nhầm một số ý không liên quan. Hãy kiểm tra lại!";
                    errorMsg.style.display = 'block';
                    return false;
                }
            } else if (stepData.id === 'group') {
                const pool = stepEl.querySelectorAll('.group-ideas-pool .idea-item');
                if (pool.length > 0) {
                    errorMsg.innerText = "Vui lòng phân loại tất cả các ý vào các nhóm.";
                    errorMsg.style.display = 'block';
                    return false;
                }
            } else if (stepData.id === 'build') {
                const pool = stepEl.querySelectorAll('.build-groups-pool .build-group-item');
                if (pool.length > 0) {
                    errorMsg.innerText = "Vui lòng kéo tất cả các nhóm vào dàn ý.";
                    errorMsg.style.display = 'block';
                    return false;
                }
            }
            
            return true;
        };
        
        component.querySelectorAll('.btn-ws-next').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                
                if (!validateStep(idx)) return;
                
                if (idx < steps.length - 1) {
                    currentStep = idx + 1;
                    showStep(currentStep);
                } else {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                }
            });
        });
        
        // Init first step
        showStep(0);
    }
}
