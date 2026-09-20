/**
 * ==========================================================
 * TS10 Learning Platform
 * components/layouts/ChoiceBuilder.js
 * ==========================================================
 */

export default class ChoiceBuilder {
    /**
     * Renders a list of choices using the standard UI.
     * @param {Array} choices - Array of {id/value, text} objects or strings.
     * @returns {string} HTML string
     */
    static render(choices) {
        if (!choices || !choices.length) return "";

        return `
            <div class="choice-options">
                ${choices.map((option, index) => `
                    <div
                        class="choice-option identify-option"
                        data-value="${option.value ?? option.id ?? option}">
                        <span class="option-label">
                            ${String.fromCharCode(65 + index)}.
                        </span>
                        <span class="option-text">
                            ${option.text ?? option}
                        </span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    /**
     * Binds click events to the rendered choices.
     * @param {HTMLElement} container - The container holding the choice-options
     * @param {Function} onChange - Callback when a choice is selected: onChange(selectedValue)
     */
    static bind(container, onChange) {
        const options = container.querySelectorAll(".choice-option");
        
        options.forEach(option => {
            option.addEventListener("click", () => {
                // If container is locked, do not allow changes
                if (container.classList.contains('locked')) return;

                options.forEach(item => {
                    item.classList.remove("selected");
                    item.classList.remove("correct");
                    item.classList.remove("wrong");
                    item.style.borderColor = "";
                    item.style.backgroundColor = "";
                });

                option.classList.add("selected");
                
                if (onChange) {
                    onChange(option.dataset.value);
                }
            });
        });
    }

    /**
     * Clears the current selection
     * @param {HTMLElement} container 
     */
    static clearSelection(container) {
        const options = container.querySelectorAll(".choice-option");
        options.forEach(item => {
            item.classList.remove("selected");
        });
    }
}
