export default class SlotBuilder {
    static render(step) {
        const component = document.createElement("div");
        component.className = "component slot-builder-wrapper";

        const data = step.data || step;
        const ui = data.ui || {};
        const content = data.content || {};
        
        // Normalize cards/toolbox
        const items = content.cards || content.toolbox || data.cards || data.toolbox || [];
        const slots = content.slots || data.slots || [];
        
        const promptText = content.prompt || data.prompt;
        const titleHtml = promptText ? `<div class="sb-title">${promptText}</div>` : '';
        
        component.innerHTML = `
            <style>
                .sb-wrapper { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; position: relative; }
                .sb-header { text-align: center; margin-bottom: 30px; }
                .sb-title { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
                .sb-question { font-size: 1.1rem; color: #475569; }
                .sb-container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                
                .sb-pool { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; min-height: 300px; }
                .sb-slots { display: flex; flex-direction: column; gap: 15px; }
                
                .sb-item { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; cursor: pointer; font-weight: 600; color: #334155; transition: all 0.2s; user-select: none; }
                .sb-item:hover { border-color: #94a3b8; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .sb-item.selected { border-color: #6d5dfc; background: #e0e7ff; color: #3730a3; transform: scale(1.02); }
                .sb-item.used { opacity: 0.6; pointer-events: none; border-color: #22c55e; background: #f0fdf4; color: #166534; }
                
                .sb-slot { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; min-height: 80px; display: flex; flex-direction: column; justify-content: center; transition: all 0.2s; cursor: pointer; position: relative; }
                .sb-slot-hint { color: #94a3b8; font-size: 0.95rem; font-style: italic; }
                .sb-slot-label { font-weight: 800; color: #6d5dfc; font-size: 0.85rem; margin-bottom: 8px; letter-spacing: 1px; }
                .sb-slot.highlight { border-color: #6d5dfc; background: #f5f3ff; }
                .sb-slot.filled { border-color: #22c55e; background: #f0fdf4; }
                .sb-slot.wrong, .sb-item.wrong { border-color: #ef4444; background: #fef2f2; animation: shake 0.4s; }
                
                .sb-slot .sb-item-filled { font-weight: 600; color: #166534; font-size: 1.05rem; line-height: 1.5; }
                
                .sb-actions { text-align: center; margin-top: 30px; }
                .sb-next { padding: 14px 32px; background: #6d5dfc; color: white; border: none; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; transition: background 0.2s; }
                .sb-next:hover { background: #5b4be8; }
                
                .sb-feedback { margin-top: 20px; padding: 15px; border-radius: 12px; background: #dcfce7; color: #166534; font-weight: bold; display: none; text-align: center; }
                .sb-feedback-error { background: #fef2f2; color: #991b1b; }
                
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                
                @media (max-width: 768px) {
                    .sb-container { grid-template-columns: 1fr; }
                    .sb-pool { min-height: auto; flex-direction: row; flex-wrap: wrap; }
                    .sb-item { flex: 1 1 auto; text-align: center; }
                }
                
                /* Tooltip Styles */
                .sb-tooltip { position: absolute; background: white; border-radius: 12px; padding: 15px; width: 300px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; z-index: 1000; display: none; flex-direction: column; opacity: 0; transition: opacity 0.2s, transform 0.2s; transform: translateY(-10px); }
                .sb-tooltip.show { display: flex; opacity: 1; transform: translateY(0); }
                .sb-tooltip::before { content: ''; position: absolute; top: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 12px; height: 12px; background: white; border-top: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; }
                .sb-tooltip-input { width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #334155; margin-bottom: 8px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
                .sb-tooltip-input:focus { border-color: #6d5dfc; }
                .sb-tooltip-hint { font-size: 0.85rem; color: #64748b; font-style: italic; text-align: center; }
            </style>
            
            <div class="sb-wrapper">
                <div class="sb-header">
                    ${titleHtml}
                    <div class="sb-question">${ui.question || data.instruction || data.question || 'Hãy ghép nối các ô với nhau'}</div>
                </div>
                
                <div class="sb-container">
                    <div class="sb-pool" id="sb-pool">
                        ${items.map(item => `
                            <div class="sb-item" data-id="${item.id}" data-target="${item.target !== undefined ? item.target : (item.correctSlot !== undefined ? item.correctSlot : item.id)}" data-text="${item.text || item.label}" data-slot-text="${item.slotText || ''}" data-feedback="${item.feedback || ''}">
                                ${item.text || item.label}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="sb-slots">
                        ${slots.map(slot => `
                            <div class="sb-slot" data-id="${slot.id}">
                                ${slot.label ? `<div class="sb-slot-label">${slot.label}</div>` : ''}
                                <div class="sb-slot-content">
                                    <span class="sb-slot-hint">${slot.hint || 'Chạm để điền vào đây...'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="sb-feedback" id="sb-feedback">
                    ${data.feedback?.success || 'Hoàn thành xuất sắc!'}
                </div>
                
                <div class="sb-actions">
                    <button class="sb-next" id="sb-btn-next">${step.mode === 'stage' ? 'Tiếp tục →' : 'Kiểm tra kết quả →'}</button>
                </div>
                
                <div class="sb-tooltip" id="sb-tooltip">
                    <input type="text" class="sb-tooltip-input" id="sb-tooltip-input" placeholder="Gõ câu trả lời vào đây, ấn Enter..." autocomplete="off" />
                    <div class="sb-tooltip-hint" id="sb-tooltip-hint"></div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const poolItems = component.querySelectorAll('.sb-item');
            const slotEls = component.querySelectorAll('.sb-slot');
            const nextBtn = component.querySelector('#sb-btn-next');
            const feedbackEl = component.querySelector('#sb-feedback');
            
            const tooltip = component.querySelector('#sb-tooltip');
            const tooltipInput = component.querySelector('#sb-tooltip-input');
            const tooltipHint = component.querySelector('#sb-tooltip-hint');
            const wrapper = component.querySelector('.sb-wrapper');
            
            let selectedItem = null;
            let filledCount = 0;
            let pendingItem = null;
            let pendingSlot = null;
            
            const closeTooltip = () => {
                tooltip.classList.remove('show');
                pendingItem = null;
                pendingSlot = null;
            };
            
            const placeItemInSlot = (item, targetSlot, customText = null) => {
                targetSlot.classList.add('filled');
                targetSlot.dataset.filledId = item.dataset.id;
                
                const textToDisplay = customText || item.dataset.slotText || item.dataset.text;
                targetSlot.querySelector('.sb-slot-content').innerHTML = `<div class="sb-item-filled">${textToDisplay}</div>`;
                
                // Keep original item visible but mark as used
                item.classList.add('used');
                item.classList.remove('wrong');
                
                // Show feedback for the correct card if available
                if (item.dataset.feedback) {
                    feedbackEl.innerHTML = item.dataset.feedback;
                    feedbackEl.className = "sb-feedback";
                    feedbackEl.style.display = 'block';
                } else {
                    feedbackEl.style.display = 'none';
                    feedbackEl.className = "sb-feedback";
                }
                
                filledCount++;
                if (filledCount === slots.length) {
                    feedbackEl.innerHTML = (item.dataset.feedback ? item.dataset.feedback + '<br><br>' : '') + `🎉 ${data.feedback?.success || 'Hoàn thành xuất sắc!'}`;
                    feedbackEl.style.display = 'block';
                    nextBtn.style.display = 'inline-block';
                }
            };
            
            // Tooltip Events
            if (tooltip) {
                // Submit or Cancel via keyboard
                tooltipInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        closeTooltip();
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!pendingItem || !pendingSlot) return;
                        
                        const typedText = tooltipInput.value.trim();
                        if (!typedText) {
                            closeTooltip();
                            return;
                        }
                        
                        placeItemInSlot(pendingItem, pendingSlot, typedText);
                        closeTooltip();
                    }
                });
                
                // Close if clicked outside
                document.addEventListener('click', (e) => {
                    if (tooltip.classList.contains('show') && !tooltip.contains(e.target) && pendingItem && !pendingItem.contains(e.target)) {
                        closeTooltip();
                    }
                });
            }

            // Handle pool item selection
            poolItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (item.classList.contains('used')) return; // Already placed somewhere
                    
                    const safeTarget = String(item.dataset.target || '').trim();
                    const isDistractor = safeTarget === 'null' || safeTarget === 'undefined' || !item.dataset.target;
                    
                    if (isDistractor) {
                        // Show error feedback for distractor
                        if (item.dataset.feedback) {
                            feedbackEl.innerHTML = `❌ ${item.dataset.feedback}`;
                            feedbackEl.className = "sb-feedback sb-feedback-error";
                            feedbackEl.style.display = "block";
                        }
                        
                        // Shake the item to show it's invalid
                        item.classList.add('wrong');
                        setTimeout(() => item.classList.remove('wrong'), 400);
                        return;
                    }
                    
                    // Auto-place into correct slot
                    let targetSlot = null;
                    slotEls.forEach(s => {
                        if (String(s.dataset.id).trim() === safeTarget || String(s.dataset.id).trim() === String(item.dataset.id).trim()) {
                            targetSlot = s;
                        }
                    });
                    
                    if (targetSlot && !targetSlot.classList.contains('filled')) {
                        if (ui.interaction === 'type_to_place') {
                            pendingItem = item;
                            pendingSlot = targetSlot;
                            tooltipHint.innerHTML = `<em>Gợi ý: ${item.dataset.slotText || item.dataset.text}</em>`;
                            tooltipInput.value = '';
                            
                            // Calculate position relative to wrapper
                            const wrapperRect = wrapper.getBoundingClientRect();
                            const itemRect = item.getBoundingClientRect();
                            
                            tooltip.style.top = (itemRect.bottom - wrapperRect.top + 10) + 'px';
                            // Center horizontally relative to item
                            let leftPos = (itemRect.left - wrapperRect.left + (itemRect.width / 2) - 150);
                            
                            // Prevent going out of bounds
                            if (leftPos < 10) leftPos = 10;
                            if (leftPos + 300 > wrapperRect.width - 10) leftPos = wrapperRect.width - 310;
                            
                            tooltip.style.left = leftPos + 'px';
                            tooltip.classList.add('show');
                            setTimeout(() => tooltipInput.focus(), 100);
                        } else {
                            placeItemInSlot(item, targetSlot);
                        }
                    }
                    

                });
            });

            // Handle slot click
            slotEls.forEach(slot => {
                slot.addEventListener('click', () => {
                    // Auto-placement logic removed from here, only keeping removal logic
                    if (slot.classList.contains('filled')) {
                        const itemId = slot.dataset.filledId;
                        slot.classList.remove('filled');
                        slot.removeAttribute('data-filled-id');
                        slot.querySelector('.sb-slot-content').innerHTML = `<span class="sb-slot-hint">${slots.find(s => s.id === slot.dataset.id)?.hint || 'Chạm để điền vào đây...'}</span>`;
                        
                        const origItem = component.querySelector(`.sb-item[data-id="${itemId}"]`);
                        if (origItem) {
                            origItem.classList.remove('used');
                        }
                        filledCount--;
                        nextBtn.style.display = 'none';
                        feedbackEl.style.display = 'none';
                    }
                });
            });

            nextBtn.addEventListener('click', () => {
                component.dataset.completed = "true";
                if (step.mode === 'stage') {
                    const results = {};
                    slotEls.forEach(slot => {
                        results[slot.dataset.id] = slot.dataset.filledId;
                    });
                    if (step.onComplete) step.onComplete({ type: 'card_to_slot', slots: results });
                } else {
                    window.engine && window.engine.next();
                }
            });

        }, 0);

        return component;
    }
}
