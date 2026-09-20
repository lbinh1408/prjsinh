/**
 * ==========================================================
 * TS10 Learning Platform
 * components/layouts/MultiSelectBuilder.js
 * ==========================================================
 */

export default class MultiSelectBuilder {
    /**
     * Renders a list of choices using the standard multi-select UI.
     * @param {Array} choices - Array of {id/value, text} objects or strings.
     * @returns {string} HTML string
     */
    static render(choices) {
        if (!choices || !choices.length) return "";

        return `
            <div class="multi-select-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                ${choices.map((option, index) => `
                    <label class="ms-choice-label" style="display: flex; align-items: center; justify-content: flex-start; padding: 15px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; background: #f8fafc;">
                        <input type="checkbox" class="ms-checkbox" value="${option.value ?? option.id ?? option}" style="margin: 0 15px 0 0; padding: 0; transform: scale(1.3); accent-color: #6d5dfc; flex-shrink: 0; width: auto; display: inline-block;">
                        <span class="ms-option-text" style="font-size: 1.05em; color: #334155; font-weight: 600; flex-grow: 1; text-align: left;">
                            ${option.text ?? option.label ?? option}
                        </span>
                    </label>
                `).join("")}
            </div>
        `;
    }

    /**
     * Binds click/change events to the rendered choices.
     * @param {HTMLElement} container - The container holding the multi-select-options
     * @param {Function} onChange - Callback when a choice is toggled: onChange(selectedValuesArray)
     */
    static bind(container, onChange) {
        const labels = container.querySelectorAll(".ms-choice-label");
        const checkboxes = container.querySelectorAll(".ms-checkbox");
        
        // Add dynamic styling on change
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (container.classList.contains('locked')) {
                    cb.checked = !cb.checked; // Revert
                    return;
                }

                const label = cb.closest('.ms-choice-label');
                if (cb.checked) {
                    label.style.borderColor = '#6d5dfc';
                    label.style.backgroundColor = '#eff6ff';
                } else {
                    label.style.borderColor = '#e2e8f0';
                    label.style.backgroundColor = '#f8fafc';
                }

                if (onChange) {
                    const selected = Array.from(checkboxes)
                        .filter(c => c.checked)
                        .map(c => c.value);
                    onChange(selected);
                }
            });
            
            // Add hover effect
            const label = cb.closest('.ms-choice-label');
            label.addEventListener('mouseenter', () => {
                if (!cb.checked && !container.classList.contains('locked')) {
                    label.style.borderColor = '#94a3b8';
                    label.style.backgroundColor = 'white';
                }
            });
            label.addEventListener('mouseleave', () => {
                if (!cb.checked && !container.classList.contains('locked')) {
                    label.style.borderColor = '#e2e8f0';
                    label.style.backgroundColor = '#f8fafc';
                }
            });
        });
    }

    /**
     * Clears the current selection
     * @param {HTMLElement} container 
     */
    static clearSelection(container) {
        const checkboxes = container.querySelectorAll(".ms-checkbox");
        checkboxes.forEach(cb => {
            cb.checked = false;
            const label = cb.closest('.ms-choice-label');
            if (label) {
                label.style.borderColor = '#e2e8f0';
                label.style.backgroundColor = '#f8fafc';
            }
        });
    }
}
