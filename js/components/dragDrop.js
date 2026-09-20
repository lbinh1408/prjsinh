/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/dragDrop.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class DragDrop {

    static render(step) {

        const component = document.createElement("div");

        component.className = "component dragDrop-component";

        component.innerHTML = `

            <div class="component-header">

                <h2 class="question-title">
                 ${step.question || (step.data && step.data.question) || step.instruction || "Hãy kéo thả các mục vào đúng vị trí."}
                </h2>

                <p class="question-text">

                 
                </p>

            </div>

            ${this.renderDropZones(step)}
            
            ${this.renderDragItems(step)}

            ${this.renderAction()}
            
            <div class="dragdrop-feedback" style="display:none; margin-top: 15px; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center;"></div>

        `;

        this.bind(component, step);

        return component;

    }

    static renderDropZones(step) {
        const data = step.data || step;
        const zones = data.targets || data.zones || step.targets || step.zones;
        if (!zones) return "";

        return `

            <div class="dragdrop-zones">

                ${zones.map((zone, index) => {
            const label = (typeof zone === 'object') ? (zone.label ?? zone.id) : zone;
            const zoneId = (typeof zone === 'object') ? (zone.id ?? index) : zone;
            return `
                    <div class="dragdrop-zone" data-zone-id="${zoneId}">
                        <div class="zone-label">${label}</div>
                        <div class="zone-target" data-zone-id="${zoneId}"></div>
                    </div>
                    `;
        }).join("")}

            </div>

        `;

    }

    static renderDragItems(step) {
        const data = step.data || step;
        const items = data.draggables || data.items || step.draggables || step.items;
        if (!items) return "";

        return `

            <div class="dragdrop-items" id="dragdrop-source-${step.id}">

                ${items.map((item, index) => {
            const text = (typeof item === 'object') ? (item.text ?? item.id) : item;
            const id = (typeof item === 'object') ? (item.id ?? index) : item;
            return `
                    <div 
                        class="dragdrop-item" 
                        draggable="true" 
                        data-item-id="${id}">
                        ${text}
                    </div>
                    `;
        }).join("")}

            </div>

        `;

    }

    static renderAction() {

        return `

            <div class="component-toolbar">

                <button
                    type="button"
                    id="btn-clear-dragdrop"
                    class="btn">

                    Làm lại

                </button>

            </div>

        `;

    }

    static bind(component, step) {

        const items = component.querySelectorAll(".dragdrop-item");
        const targets = component.querySelectorAll(".zone-target");
        const sourceContainer = component.querySelector(".dragdrop-items");
        const fbDiv = component.querySelector(".dragdrop-feedback");

        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener("dragstart", (e) => {
                draggedItem = item;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", item.dataset.itemId);
                setTimeout(() => item.classList.add("dragging"), 0);
            });

            item.addEventListener("dragend", () => {
                draggedItem = null;
                item.classList.remove("dragging");
            });
        });

        targets.forEach(target => {
            target.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                target.classList.add("drag-over");
            });

            target.addEventListener("dragleave", () => {
                target.classList.remove("drag-over");
            });

            target.addEventListener("drop", (e) => {
                e.preventDefault();
                target.classList.remove("drag-over");
                if (draggedItem) {
                    // Allow multiple items per zone - just append
                    target.appendChild(draggedItem);
                    
                    if (step.validateMode === "oneByOne") {
                        const itemId = draggedItem.dataset.itemId;
                        const zoneId = target.dataset.zoneId;
                        const data = step.data || step;
                        const answer = data.answer || {};
                        const text = draggedItem.innerText.trim();
                        
                        const correctAnswer = answer[itemId] || answer[text];
                        
                        if (correctAnswer === zoneId) {
                            if (fbDiv) {
                                fbDiv.style.display = 'block';
                                fbDiv.style.backgroundColor = '#dcfce7';
                                fbDiv.style.color = '#15803d';
                                fbDiv.style.border = '1px solid #22c55e';
                                fbDiv.innerText = '✅ ' + (data.feedback?.correct || 'Chính xác!');
                            }
                            draggedItem.style.border = '2px solid #22c55e';
                            draggedItem.style.backgroundColor = '#f0fdf4';
                        } else {
                            if (fbDiv) {
                                fbDiv.style.display = 'block';
                                fbDiv.style.backgroundColor = '#fee2e2';
                                fbDiv.style.color = '#b91c1c';
                                fbDiv.style.border = '1px solid #ef4444';
                                fbDiv.innerText = '❌ ' + (data.feedback?.incorrect || 'Chưa đúng!');
                            }
                            draggedItem.style.border = '2px solid #ef4444';
                            draggedItem.style.backgroundColor = '#fef2f2';
                        }
                    }
                }
            });
        });

        // Allow dropping back to source container
        if (sourceContainer) {
            sourceContainer.addEventListener("dragover", (e) => {
                e.preventDefault();
            });
            sourceContainer.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedItem) {
                    sourceContainer.appendChild(draggedItem);
                }
            });
        }

        component
            .querySelector("#btn-clear-dragdrop")
            ?.addEventListener("click", () => {
                items.forEach(item => {
                    sourceContainer?.appendChild(item);
                    item.style.border = '';
                    item.style.backgroundColor = '';
                });
                if (fbDiv) fbDiv.style.display = 'none';
            });

    }

    static validator = getValidator("dragValidator");

    static getValidator() {
        return this.validator;
    }


}

export default DragDrop;
