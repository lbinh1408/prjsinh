export default class GuidedIdeaBuilder {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";
        
        const content = data.content || {};
        const steps = content.steps || [];
        const progress = data.ui?.progress || [];
        
        const progressHtml = `
            <div class="gp-workspace-progress" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; position: relative;">
                <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 0; transform: translateY(-50%);"></div>
                ${progress.map((p, i) => `
                    <div class="progress-node builder-node-${i} ${i === 0 ? 'active' : ''}" style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div class="node-circle" style="width: 30px; height: 30px; border-radius: 50%; background: ${i === 0 ? '#3b82f6' : 'white'}; border: 2px solid ${i === 0 ? '#3b82f6' : '#cbd5e1'}; color: ${i === 0 ? 'white' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.3s;">${i + 1}</div>
                        <div class="node-label" style="font-size: 0.9em; font-weight: 600; color: ${i === 0 ? '#1e293b' : '#94a3b8'};">${p}</div>
                    </div>
                `).join('')}
            </div>
        `;

        const stepsHtml = steps.map((s, index) => {
            let innerHtml = '';
            
            if (s.id === 'assemble') {
                innerHtml = `
                    <div class="step-assemble" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #475569; margin-bottom: 10px;">Chỉnh sửa đoạn văn của em:</div>
                        <textarea id="builder-final-text" style="width: 100%; min-height: 150px; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; font-size: 1.1em; line-height: 1.6; resize: vertical;"></textarea>
                    </div>
                `;
            } else {
                innerHtml = `
                    <div class="step-write" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                        <div style="font-weight: bold; font-size: 1.1em; color: #3b82f6;">❓ ${s.question}</div>
                        <textarea class="builder-input input-step-${index}" placeholder="${s.placeholder}" style="width: 100%; min-height: 80px; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 1.1em; resize: vertical;"></textarea>
                    </div>
                `;
            }

            return `
                <div class="builder-step step-${index}" style="display: ${index === 0 ? 'block' : 'none'}; animation: fadeIn 0.4s;">
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.3em;">${s.title}</h3>
                        <div style="font-size: 1.1em; color: #334155; font-weight: 500;">${s.instruction}</div>
                    </div>
                    <div class="step-content-area">
                        ${innerHtml}
                    </div>
                    <div style="text-align: right; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                        <button class="btn btn-primary btn-builder-next" data-index="${index}" style="padding: 10px 30px; border-radius: 8px;">
                            ${index === steps.length - 1 ? 'Hoàn thành' : 'Tiếp tục →'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        component.innerHTML = `
            <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                <div style="color: #475569; font-size: 1.1em; max-width: 600px; margin: 0 auto;">${content.task?.prompt || ''}</div>
            </div>
            
            <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                ${data.ui?.showIdeaAtTop ? `
                    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                        <div style="font-weight: bold; color: #475569; margin-bottom: 10px;">${data.ui.ideaBadge}</div>
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b;">${content.seedIdea?.text || ''}</div>
                    </div>
                ` : ''}
                
                ${progressHtml}
                <div class="builder-steps-container">
                    ${stepsHtml}
                </div>
            </div>
            <style>@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }</style>
        `;
        
        this.bindBuilder(component, data);
        return component;
    }

    static bindBuilder(component, data) {
        const steps = data.content.steps;
        const nextBtns = component.querySelectorAll('.btn-builder-next');
        const finalTextArea = component.querySelector('#builder-final-text');
        
        let userInputs = [];

        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const stepIndex = parseInt(btn.dataset.index);
                const currentStep = component.querySelector(`.builder-step.step-${stepIndex}`);
                
                // If it's a writing step, grab the text
                const textarea = currentStep.querySelector('.builder-input');
                if (textarea) {
                    const text = textarea.value.trim();
                    if (!text) {
                        alert("Em cần viết gì đó trước khi đi tiếp nhé!");
                        return;
                    }
                    userInputs[stepIndex] = text;
                }

                currentStep.style.display = 'none';
                
                // Update progress node
                const currNode = component.querySelector(`.builder-node-${stepIndex}`);
                if (currNode) {
                    const circle = currNode.querySelector('.node-circle');
                    circle.style.background = '#10b981'; // green
                    circle.style.borderColor = '#10b981';
                    circle.innerHTML = '✓';
                }

                if (stepIndex < steps.length - 1) {
                    const nextStepIndex = stepIndex + 1;
                    const nextStep = component.querySelector(`.builder-step.step-${nextStepIndex}`);
                    nextStep.style.display = 'block';
                    
                    const nextNode = component.querySelector(`.builder-node-${nextStepIndex}`);
                    if (nextNode) {
                        const circle = nextNode.querySelector('.node-circle');
                        circle.style.background = '#3b82f6';
                        circle.style.borderColor = '#3b82f6';
                        circle.style.color = 'white';
                        const label = nextNode.querySelector('.node-label');
                        label.style.color = '#1e293b';
                    }

                    // If next step is assemble, pre-fill the final text area
                    if (steps[nextStepIndex].id === 'assemble' && finalTextArea) {
                        finalTextArea.value = userInputs.filter(t => t).join(' ');
                    }
                } else {
                    // Done
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                }
            });
        });
    }
}
