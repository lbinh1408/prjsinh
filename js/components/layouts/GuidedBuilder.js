export default class GuidedBuilder {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";
        
        const content = data.content || data.steps || [];
        
        // UI elements
        component.innerHTML = `
            <div class="component-header">
                ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                <p class="question-text" style="color: #475569; font-style: italic; font-size: 1.1em;">Đề bài: "${data.task?.prompt || ''}"</p>
            </div>
            
            <div class="guided-builder-container" style="max-width: 800px; margin: 0 auto;">
                
                <!-- Step 1: Decision -->
                <div id="gp-step-decision" class="gp-step" style="display: block; animation: fadeIn 0.5s;">
                    <div style="font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 20px; text-align: center;">
                        ${content[0]?.question || "Em muốn người đọc tiếp nhận ý của mình như thế nào?"}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                        ${(content[0]?.options || []).map(opt => `
                            <button class="btn-decision-opt" data-maps-to="${opt.mapsTo}" style="width: 100%; max-width: 400px; padding: 15px 20px; border-radius: 12px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; font-size: 1.1em; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                ${opt.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Step 2: Build -->
                <div id="gp-step-build" class="gp-step" style="display: none; animation: fadeIn 0.5s;">
                    <div style="text-align: center; font-size: 1.2em; font-weight: bold; color: #0284c7; margin-bottom: 20px;">
                        → <span id="recommended-structure" style="color: #1e3a8a; text-transform: uppercase;">...</span>
                    </div>
                    
                    <div style="display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 250px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 10px; text-align: center;">KHO Ý TƯỞNG</div>
                            <div id="gp-source-zone" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 15px; min-height: 200px; display: flex; flex-direction: column; gap: 10px;">
                                ${(content[1]?.cards || []).map(c => `
                                    <div class="gp-draggable" draggable="true" data-id="${c.id}" data-correct="${c.correctSlot}" style="background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; cursor: grab; user-select: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        ${c.text}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="flex: 1; min-width: 250px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 10px; text-align: center;">CẤU TRÚC ĐOẠN</div>
                            <div id="gp-target-zone" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 15px;">
                                ${(content[1]?.example?.slots || []).map((slot, i, arr) => `
                                    <div class="gp-slot" data-slot-id="${slot.id}" style="border: 2px dashed #93c5fd; background: rgba(255,255,255,0.5); border-radius: 8px; min-height: 50px; display: flex; flex-direction: column; position: relative;">
                                        <div style="position: absolute; top: -10px; left: 15px; background: #dbeafe; color: #1e3a8a; font-size: 0.8em; font-weight: bold; padding: 2px 8px; border-radius: 10px;">${slot.label}</div>
                                        <div class="gp-slot-content" style="padding: 20px 10px 10px 10px; flex: 1;"></div>
                                    </div>
                                    ${i < arr.length - 1 ? '<div style="text-align: center; color: #94a3b8; font-weight: bold; font-size: 1.2em; margin: -5px 0;">↓</div>' : ''}
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div id="gp-build-feedback" style="display: none; text-align: center; color: #166534; font-weight: bold; font-size: 1.1em; background: #dcfce7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        ✓ Các ý đã được đặt đúng vị trí.
                    </div>
                </div>

                <!-- Step 3: Check -->
                <div id="gp-step-check" class="gp-step" style="display: none; animation: fadeIn 0.5s;">
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 25px;">
                            🤔 ${content[2]?.question || "Cách này có giúp người đọc nhanh chóng biết em muốn nói gì?"}
                        </div>
                        <div style="display: flex; justify-content: center; gap: 20px;">
                            ${(content[2]?.options || []).map(opt => `
                                <button class="btn-check-opt" data-id="${opt.id}" style="padding: 12px 30px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; font-weight: bold; color: #475569; font-size: 1.1em; cursor: pointer;">
                                    ${opt.label}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div id="gp-check-feedback" style="display: none; margin-top: 25px; padding: 15px; background: #f0fdf4; color: #166534; font-weight: 500; border-radius: 8px; text-align: left;">
                            💡 Đúng với mục đích em đã chọn: ý chính xuất hiện ngay từ đầu.
                        </div>
                        
                        <div style="margin-top: 25px; text-align: right;">
                            <button id="btn-to-compare" class="btn btn-primary" style="display: none;">Tiếp tục →</button>
                        </div>
                    </div>
                </div>

                <!-- Step 4: Compare -->
                <div id="gp-step-compare" class="gp-step" style="display: none; animation: fadeIn 0.5s;">
                    <div style="text-align: center; font-size: 1.2em; font-weight: bold; color: #0f172a; margin-bottom: 25px;">
                        🔄 ${content[3]?.title || "Thử một cấu trúc khác"}
                    </div>
                    
                    <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
                        ${(content[3]?.structures || []).map((struct, idx) => `
                            <div style="flex: 1; max-width: 300px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center;">
                                <div style="font-weight: bold; color: #334155; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">CÁCH ${idx === 0 ? 'A' : 'B'}</div>
                                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 15px;">${struct.label}</div>
                                <div style="font-size: 0.9em; color: #64748b; display: flex; flex-direction: column; gap: 10px;">
                                    ${idx === 0 ? 'Ý chính<br>↓<br>Lợi ích 1<br>↓<br>Lợi ích 2' : 'Lợi ích 1<br>↓<br>Lợi ích 2<br>↓<br>Ý chính'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; background: white; border: 2px solid #e2e8f0; padding: 25px; border-radius: 12px;">
                        <div style="font-size: 1.1em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">
                            ${content[3]?.question || "Cách nào phù hợp hơn với mục đích của em?"}
                        </div>
                        <div style="display: flex; justify-content: center; gap: 15px;">
                            <button class="btn-compare-opt" data-choice="a" style="padding: 10px 30px; border-radius: 8px; border: 2px solid #cbd5e1; font-weight: bold; background: white; cursor: pointer;">CÁCH A</button>
                            <button class="btn-compare-opt" data-choice="b" style="padding: 10px 30px; border-radius: 8px; border: 2px solid #cbd5e1; font-weight: bold; background: white; cursor: pointer;">CÁCH B</button>
                        </div>
                        
                        <div id="gp-compare-feedback" style="display: none; margin-top: 25px; padding: 15px; background: #ecfdf5; color: #065f46; border-left: 4px solid #10b981; font-weight: 500; text-align: left;">
                            🎯 <strong>Phù hợp hơn.</strong> Vì mục đích ban đầu của em là giúp người đọc biết ngay ý chính. (Học sinh đang học: Mục đích → cấu trúc)
                        </div>
                        
                        <div style="margin-top: 25px; text-align: right;">
                            <button id="gp-done" class="btn btn-primary" style="display: none;">Hoàn thành</button>
                        </div>
                    </div>
                </div>

            </div>
            
            <style>
                .btn-decision-opt:hover, .btn-check-opt:hover, .btn-compare-opt:hover { background: #f8fafc !important; }
                .gp-draggable.dragging { opacity: 0.5; border-color: #3b82f6; }
                .gp-slot.drag-over { background: #dbeafe !important; border-color: #3b82f6 !important; }
            </style>
        `;
        
        this.bind(component, step);
        return component;
    }

    static bind(component, step) {
        const stepDecision = component.querySelector('#gp-step-decision');
        const stepBuild = component.querySelector('#gp-step-build');
        const stepCheck = component.querySelector('#gp-step-check');
        const stepCompare = component.querySelector('#gp-step-compare');
        
        // Step 1: Decision
        const decisionOpts = component.querySelectorAll('.btn-decision-opt');
        const recommendedStructure = component.querySelector('#recommended-structure');
        let selectedStrategy = '';

        decisionOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedStrategy = btn.dataset.mapsTo;
                // Mock structure names
                if (selectedStrategy === 'dien_dich') recommendedStructure.innerText = 'Diễn dịch phù hợp.';
                else if (selectedStrategy === 'quy_nap') recommendedStructure.innerText = 'Quy nạp phù hợp.';
                else recommendedStructure.innerText = selectedStrategy + ' phù hợp.';
                
                stepDecision.style.display = 'none';
                stepBuild.style.display = 'block';
            });
        });

        // Step 2: Build
        const draggables = component.querySelectorAll('.gp-draggable');
        const slots = component.querySelectorAll('.gp-slot');
        const buildFeedback = component.querySelector('#gp-build-feedback');
        let draggedItem = null;
        let correctPlacements = 0;

        draggables.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                if (draggedItem) {
                    const correctSlot = draggedItem.dataset.correct;
                    const currentSlot = slot.dataset.slotId;
                    
                    if (correctSlot === currentSlot) {
                        slot.querySelector('.gp-slot-content').appendChild(draggedItem);
                        draggedItem.setAttribute('draggable', 'false'); // Lock it in
                        draggedItem.style.cursor = 'default';
                        draggedItem.style.border = '2px solid #22c55e';
                        
                        correctPlacements++;
                        if (correctPlacements === draggables.length) {
                            buildFeedback.style.display = 'block';
                            setTimeout(() => {
                                stepBuild.style.display = 'none';
                                stepCheck.style.display = 'block';
                            }, 1500);
                        }
                    } else {
                        // Flash red
                        const origBg = draggedItem.style.background;
                        draggedItem.style.background = '#fef2f2';
                        setTimeout(() => {
                            draggedItem.style.background = origBg;
                        }, 500);
                    }
                }
            });
        });

        // Step 3: Check
        const checkOpts = component.querySelectorAll('.btn-check-opt');
        const checkFeedback = component.querySelector('#gp-check-feedback');
        const btnToCompare = component.querySelector('#btn-to-compare');

        checkOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                checkOpts.forEach(b => {
                    b.style.background = 'white';
                    b.style.color = '#475569';
                });
                btn.style.background = '#3b82f6';
                btn.style.color = 'white';
                
                checkFeedback.style.display = 'block';
                btnToCompare.style.display = 'inline-block';
            });
        });

        btnToCompare.addEventListener('click', () => {
            stepCheck.style.display = 'none';
            stepCompare.style.display = 'block';
        });

        // Step 4: Compare
        const compareOpts = component.querySelectorAll('.btn-compare-opt');
        const compareFeedback = component.querySelector('#gp-compare-feedback');
        const btnDone = component.querySelector('#gp-done');

        compareOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                compareOpts.forEach(b => {
                    b.style.background = 'white';
                    b.style.color = '#475569';
                });
                btn.style.background = '#3b82f6';
                btn.style.color = 'white';
                
                compareFeedback.style.display = 'block';
                btnDone.style.display = 'inline-block';
            });
        });

        btnDone.addEventListener('click', () => {
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }
}
