/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * components/ordering.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";

class Ordering {

    static render(step) {
        const component = document.createElement("div");
        component.className = "component ordering-component";

        component.innerHTML = `
            <div class="component-header">
                <h2 class="question-title">
                    ${step.question || ""}
                </h2>
                <p class="question-text"></p>
            </div>
            ${this.renderItems(step)}
        `;

        this.bind(component);
        return component;
    }

    static renderItems(step) {
        if (!step.items) return "";

        return `
            <div class="ordering-items">
                ${step.items.map((item, index) => {
                    const text = item.text ?? item;
                    const id = item.id ?? item ?? index;
                    return `
                    <div class="ordering-item-container">
                        <div class="ordering-number">${index + 1}.</div>
                        <div class="ordering-item" draggable="true" data-item-id="${id}">
                            <div class="item-text">${text}</div>
                        </div>
                    </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    static bind(component) {
        const container = component.querySelector(".ordering-items");
        if (!container) return;
        
        let dragSrcEl = null;

        const handleDragStart = (e) => {
            dragSrcEl = e.target.closest(".ordering-item");
            if(dragSrcEl) {
                dragSrcEl.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/html", dragSrcEl.innerHTML);
                e.dataTransfer.setData("text/id", dragSrcEl.dataset.itemId);
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const target = e.target.closest(".ordering-item");
            if (target && target !== dragSrcEl) {
                target.classList.add("drag-over");
            }
            return false;
        };

        const handleDragEnter = (e) => {
            const target = e.target.closest(".ordering-item");
            if (target && target !== dragSrcEl) {
                target.classList.add("drag-over");
            }
        };

        const handleDragLeave = (e) => {
            const target = e.target.closest(".ordering-item");
            if (target && target !== dragSrcEl) {
                target.classList.remove("drag-over");
            }
        };

        const handleDrop = (e) => {
            e.stopPropagation();
            const target = e.target.closest(".ordering-item");
            
            if (dragSrcEl && target && dragSrcEl !== target) {
                // Swap the innerHTML and data-item-id
                const srcHtml = dragSrcEl.innerHTML;
                const srcId = dragSrcEl.dataset.itemId;
                
                dragSrcEl.innerHTML = target.innerHTML;
                dragSrcEl.dataset.itemId = target.dataset.itemId;
                
                target.innerHTML = srcHtml;
                target.dataset.itemId = srcId;
            }
            
            if (target) {
                target.classList.remove("drag-over");
            }
            return false;
        };

        const handleDragEnd = (e) => {
            if(dragSrcEl) {
                dragSrcEl.classList.remove("dragging");
            }
            const items = component.querySelectorAll(".ordering-item");
            items.forEach(item => item.classList.remove("drag-over"));
        };

        // Touch event polyfill logic
        let touchSrcEl = null;
        let touchClone = null;

        const handleTouchStart = (e) => {
            const target = e.target.closest(".ordering-item");
            if(!target) return;
            
            // Prevent default scroll behavior on touch drag
            if(e.cancelable) e.preventDefault();
            
            touchSrcEl = target;
            touchSrcEl.classList.add("dragging");
            
            const rect = touchSrcEl.getBoundingClientRect();
            
            touchClone = touchSrcEl.cloneNode(true);
            touchClone.style.position = "fixed";
            touchClone.style.top = rect.top + "px";
            touchClone.style.left = rect.left + "px";
            touchClone.style.width = rect.width + "px";
            touchClone.style.height = rect.height + "px";
            touchClone.style.zIndex = "9999";
            touchClone.style.opacity = "0.9";
            touchClone.style.pointerEvents = "none"; // So we can find the element under it
            document.body.appendChild(touchClone);
        };

        const handleTouchMove = (e) => {
            if(!touchClone || !touchSrcEl) return;
            
            // Prevent default scroll behavior
            if(e.cancelable) e.preventDefault();
            
            const touch = e.touches[0];
            const rect = touchSrcEl.getBoundingClientRect();
            
            // Center the clone under finger
            touchClone.style.top = (touch.clientY - rect.height / 2) + "px";
            touchClone.style.left = (touch.clientX - rect.width / 2) + "px";
            
            // Highlight element under touch
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const target = elemBelow ? elemBelow.closest(".ordering-item") : null;
            
            const items = component.querySelectorAll(".ordering-item");
            items.forEach(item => {
                if(item !== target) item.classList.remove("drag-over");
            });
            
            if (target && target !== touchSrcEl) {
                target.classList.add("drag-over");
            }
        };

        const handleTouchEnd = (e) => {
            if(!touchClone || !touchSrcEl) return;
            
            const touch = e.changedTouches[0];
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const target = elemBelow ? elemBelow.closest(".ordering-item") : null;
            
            if (target && target !== touchSrcEl) {
                // Swap
                const srcHtml = touchSrcEl.innerHTML;
                const srcId = touchSrcEl.dataset.itemId;
                
                touchSrcEl.innerHTML = target.innerHTML;
                touchSrcEl.dataset.itemId = target.dataset.itemId;
                
                target.innerHTML = srcHtml;
                target.dataset.itemId = srcId;
            }
            
            touchSrcEl.classList.remove("dragging");
            if(touchClone.parentNode) {
                touchClone.parentNode.removeChild(touchClone);
            }
            
            touchSrcEl = null;
            touchClone = null;
            
            const items = component.querySelectorAll(".ordering-item");
            items.forEach(item => item.classList.remove("drag-over"));
        };

        const items = component.querySelectorAll(".ordering-item");
        items.forEach(item => {
            item.addEventListener("dragstart", handleDragStart, false);
            item.addEventListener("dragenter", handleDragEnter, false);
            item.addEventListener("dragover", handleDragOver, false);
            item.addEventListener("dragleave", handleDragLeave, false);
            item.addEventListener("drop", handleDrop, false);
            item.addEventListener("dragend", handleDragEnd, false);
            
            // Touch listeners
            item.addEventListener("touchstart", handleTouchStart, { passive: false });
            item.addEventListener("touchmove", handleTouchMove, { passive: false });
            item.addEventListener("touchend", handleTouchEnd, false);
        });
    }

    static validator = getValidator("orderValidator");

    static getValidator() {
        return this.validator;
    }
}

export default Ordering;
