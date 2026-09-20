import ChoiceBuilder from "./ChoiceBuilder.js";
import MultiSelectBuilder from "./MultiSelectBuilder.js";

export default class DefaultLayout {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";
        
        component.dataset.currentStep = "0";
        const steps = data.steps || [];
        const stepsCount = steps.length;
        
        let stepsHtml = steps.map((s, index) => {
            return `
                <div class="gp-step-card" data-index="${index}" style="display: ${index === 0 ? 'block' : 'none'}; animation: slideInRight 0.4s;">
                    <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
                            <h3 style="margin: 0; color: #1e293b; font-size: 1.3em;">
                                Bước ${index + 1}: ${s.title}
                            </h3>
                            <span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85em; font-weight: bold;">
                                ${index + 1} / ${stepsCount}
                            </span>
                        </div>
                        
                        <div style="font-size: 1.1em; color: #334155; margin-bottom: 25px; font-weight: 500;">
                            ${s.instruction}
                        </div>
                        
                        <div class="gp-interaction-area" style="margin-bottom: 25px;">
                            ${this.renderInteraction(s.interaction, s.id)}
                        </div>
                        
                        <div class="gp-feedback-area" id="feedback-${s.id}" style="display: none; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                            <div style="font-weight: bold; color: #15803d; margin-bottom: 5px;">🧑‍🏫 Nhận xét:</div>
                            <div class="feedback-text" style="color: #166534;">${s.feedback ? s.feedback.success : ''}</div>
                        </div>
                        
                        <div style="text-align: right;">
                            <button class="btn btn-primary btn-check" data-step-id="${s.id}" style="padding: 10px 25px; border-radius: 8px;">
                                ${index === stepsCount - 1 ? 'Hoàn thành' : 'Kiểm tra & Tiếp tục'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let coachHtml = "";
        if (data.coach && data.coach.enabled) {
            coachHtml = `
                <div class="gp-coach" style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; background: #fffbeb; padding: 15px; border-radius: 12px; border: 1px solid #fde68a;">
                    <div style="font-size: 40px;">👩‍🏫</div>
                    <div style="font-style: italic; color: #92400e; font-size: 1.05em;">
                        "${data.coach.messages?.find(m => m.trigger === 'step_start')?.text || 'Hãy làm theo từng bước nhé.'}"
                    </div>
                </div>
            `;
        }

        component.innerHTML = `
            <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                ${data.task ? `
                    <div style="color: #475569; font-size: 1.1em; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <strong>Đề bài:</strong> ${data.task.prompt}
                    </div>
                ` : ''}
            </div>
            
            ${coachHtml}
            
            <div class="gp-steps-container" style="position: relative; max-width: 700px; margin: 0 auto;">
                ${stepsHtml}
            </div>
            
            <style>
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .gp-choice-label:hover { background: #f8fafc; }
                .gp-choice-label:has(input:checked) { border-color: #3b82f6; background: #eff6ff; }
                .gp-drag-item { cursor: grab; }
                .gp-drag-item:active { cursor: grabbing; }
            </style>
        `;

        this.bind(component, stepsCount);
        return component;
    }

    static renderInteraction(interaction, stepId) {
        if (!interaction) return '';
        
        switch (interaction.type) {
            case 'choice':
                let optionsArr = interaction.choices || interaction.options || [];
                return ChoiceBuilder.render(optionsArr);

            case 'multiSelect':
                let msOptionsArr = interaction.choices || interaction.options || [];
                return MultiSelectBuilder.render(msOptionsArr);

            case 'dragDrop':
                return `
                    <div style="display: flex; gap: 20px; align-items: flex-start;">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 5px;">Kéo các ý này:</div>
                            ${interaction.source.map(src => `
                                <div class="gp-drag-item" draggable="true" style="padding: 12px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #334155;">
                                    :: ${src.text}
                                </div>
                            `).join('')}
                        </div>
                        <div style="flex: 1; min-height: 200px; background: #f8fafc; border: 2px dashed #94a3b8; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 10px;" class="gp-dropzone">
                            <div style="font-weight: bold; color: #475569; text-align: center; margin-bottom: 10px;">
                                📥 ${interaction.target.label}
                            </div>
                            <div style="color: #94a3b8; text-align: center; margin-top: 30px; font-style: italic;">
                                Thả vào đây...
                            </div>
                        </div>
                    </div>
                `;
                
            case 'ideaBuilder':
                return `
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">
                        ${interaction.options.map(opt => `
                            <label style="cursor: pointer;">
                                <input type="checkbox" style="display: none;" class="idea-builder-cb">
                                <div class="idea-pill" style="padding: 10px 20px; background: white; border: 2px solid #e2e8f0; border-radius: 30px; color: #475569; font-weight: 500; transition: all 0.2s;">
                                    ${opt}
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    <style>
                        .idea-builder-cb:checked + .idea-pill {
                            background: #3b82f6 !important;
                            border-color: #3b82f6 !important;
                            color: white !important;
                        }
                    </style>
                `;

            case 'mindMap':
                return `
                    <div style="background: #f0f9ff; padding: 30px; border-radius: 12px; border: 1px dashed #7dd3fc; display: flex; flex-direction: column; align-items: center;">
                        <div style="background: #0284c7; color: white; padding: 12px 25px; border-radius: 20px; font-weight: bold; margin-bottom: 20px;">
                            ${interaction.center}
                        </div>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                            ${interaction.branches.map(b => `
                                <div style="background: white; border: 1px solid #bae6fd; padding: 10px 20px; border-radius: 8px; color: #0369a1; font-weight: 500;">
                                    ${b.label} <span style="color: #10b981;">✓</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

            default:
                return `<div>Chưa hỗ trợ dạng interaction: ${interaction.type}</div>`;
        }
    }

    static bind(component, stepsCount) {
        let current = 0;
        
        ChoiceBuilder.bind(component);
        MultiSelectBuilder.bind(component);
        
        // Handle drag and drop visuals
        const dragItems = component.querySelectorAll('.gp-drag-item');
        const dropzone = component.querySelector('.gp-dropzone');
        if (dropzone) {
            dragItems.forEach(item => {
                item.addEventListener('click', () => {
                    // Click to move to dropzone for easy interaction on mobile/desktop without actual drag implementation
                    if (item.parentElement === dropzone) {
                        // Move back (would need original container, simplistic implementation here)
                        item.style.opacity = '0.5';
                    } else {
                        dropzone.appendChild(item);
                    }
                });
            });
        }
        
        const updateView = () => {
            component.querySelectorAll(".gp-step-card").forEach((card, index) => {
                card.style.display = index === current ? 'block' : 'none';
            });
        };

        const checkBtns = component.querySelectorAll(".btn-check");
        checkBtns.forEach((btn, index) => {
            btn.addEventListener("click", () => {
                const stepId = btn.getAttribute("data-step-id");
                const feedbackDiv = component.querySelector(`#feedback-${stepId}`);
                
                // Show feedback
                if (feedbackDiv && feedbackDiv.style.display === 'none') {
                    feedbackDiv.style.display = 'block';
                    btn.innerHTML = index === stepsCount - 1 ? 'Hoàn thành bài tập' : 'Tiếp tục →';
                } else {
                    // Advance to next step
                    if (current < stepsCount - 1) {
                        current++;
                        updateView();
                    } else {
                        component.dataset.completed = "true";
                        document.getElementById("btn-next")?.click();
                    }
                }
            });
        });
    }
}
