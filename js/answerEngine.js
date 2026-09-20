/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * answerEngine.js
 * ==========================================================
 */

class AnswerEngine {

    /**
     * validate() has been removed.
     * Validation is now handled via ComponentFactory.getValidator(step).validate(step, answer)
     * See lessonEngine.js → validate()
     */

    /**
     * ======================================================
     * COLLECT ANSWER
     * ======================================================
     */

    static collect(step) {

        switch (step.type) {

            case "observe":
                return this.collectObserve();

            case "identify":
            case "choice":
            case "trueFalse":
                return this.collectChoice();

            case "explain":
            case "reflection":
                return this.collectTextarea();

            case "fillBlank":
                return this.collectBlank();

            case "matching":
                return this.collectMatching(step);

            case "ordering":
            case "timeline":
                return this.collectOrdering(step);

            case "highlight":
                return this.collectHighlight(step);

            case "dragDrop":
                return this.collectDragDrop(step);

            case "flashcard":
                return true; // Simple participation

            case "challenge":
            case "miniChallenge":
            case "finalChallenge": {
                const layout = step.data?.ui?.layout || step.ui?.layout;
                if (layout === "single_choice") return this.collectChoice();
                return null;
            }

            case "multiChoice":
                return this.collectMultiQuestion();

            default:
                return null;

        }

    }

    /**
     * ======================================================
     * RESTORE
     * ======================================================
     */

    static restore(step, data) {

        switch (step.type) {

            case "identify":
            case "choice":
            case "trueFalse":
                this.restoreChoice(data);
                break;

            case "fillBlank":
                this.restoreBlank(data);
                break;

            case "explain":
            case "reflection":
                this.restoreTextarea(data);
                break;

            case "matching":
                this.restoreMatching(data);
                break;

            case "ordering":
            case "timeline":
                this.restoreOrdering(data);
                break;

            case "highlight":
                this.restoreHighlight(data);
                break;

            case "dragDrop":
                this.restoreDragDrop(data);
                break;

            case "multiChoice":
                this.restoreMultiQuestion(data);
                break;

        }

    }

    /**
     * ======================================================
     * OBSERVE
     * ======================================================
     */

    static validateObserve() {

        return true;

    }

    static collectObserve() {

        return {

            viewed: true,

            time: Date.now()

        };

    }

    /**
     * ======================================================
     * IDENTIFY
     * ======================================================
     */

    static validateChoice() {

        return document.querySelector(

            ".identify-option.selected"

        ) !== null;

    }

    static collectChoice() {

        const selected = document.querySelector(

            ".identify-option.selected"

        );

        return selected
            ? selected.dataset.value
            : null;

    }

    static restoreChoice(value) {

        document
            .querySelectorAll(".identify-option")
            .forEach(item => {

                item.classList.remove("selected");

                if (item.dataset.value == value) {

                    item.classList.add("selected");

                }

            });

    }

    /**
     * ======================================================
     * TEXTAREA
     * ======================================================
     */

    static validateTextarea() {

        const textarea = document.querySelector("textarea");

        if (!textarea)
            return true;

        return textarea.value.trim().length > 0;

    }

    static collectTextarea() {

        const textarea = document.querySelector("textarea");

        return textarea
            ? textarea.value.trim()
            : "";

    }

    static restoreTextarea(text) {

        const textarea = document.querySelector("textarea");

        if (textarea) {

            textarea.value = text;

        }

    }

    /**
     * ======================================================
     * FILL BLANK
     * ======================================================
     */

    static validateBlank() {

        const blanks = document.querySelectorAll(

            ".blank-input"

        );

        for (const input of blanks) {

            if (input.value.trim() === "") {

                return false;

            }

        }

        return true;

    }

    static collectBlank() {

        return [...document.querySelectorAll(

            ".blank-input"

        )].map(

            item => item.value.trim()

        );

    }

    static restoreBlank(values = []) {

        const blanks = document.querySelectorAll(

            ".blank-input"

        );

        blanks.forEach((input, index) => {

            input.value = values[index] || "";

        });

    }

    /**
     * ======================================================
     * CLEAR
     * ======================================================
     */

    static clear() {

        document
            .querySelectorAll("input")
            .forEach(

                input => input.value = ""

            );

        document
            .querySelectorAll("textarea")
            .forEach(

                textarea => textarea.value = ""

            );

        document
            .querySelectorAll(".selected")
            .forEach(

                item => item.classList.remove("selected")

            );

    }

    /**
     * ======================================================
     * COMPARE ANSWERS
     * ======================================================
     */

    static isSameAnswer(previous, next) {

        if (previous === next)
            return true;

        if (previous === null || next === null)
            return false;

        if (typeof previous !== typeof next)
            return false;

        if (Array.isArray(previous) && Array.isArray(next)) {

            if (previous.length !== next.length)
                return false;

            return previous.every((item, index) => {

                return this.isSameAnswer(item, next[index]);

            });

        }

        if (typeof previous === "object") {

            const previousKeys = Object.keys(previous);

            const nextKeys = Object.keys(next);

            if (previousKeys.length !== nextKeys.length)
                return false;

            return previousKeys.every(key => {

                return this.isSameAnswer(

                    previous[key],

                    next[key]

                );

            });

        }

        return false;

    }

    /**
     * ======================================================
     * NEW COMPONENTS
     * ======================================================
     */

    static validateMatching(step) {
        const leftItems = document.querySelectorAll(".prompt-item");
        for (const item of leftItems) {
            if (!item.dataset.match) return false;
        }
        return leftItems.length > 0;
    }

    static collectMatching(step) {
        const leftItems = document.querySelectorAll(".prompt-item");
        const answer = {};
        leftItems.forEach(item => {
            if (item.dataset.match) {
                answer[item.dataset.id] = item.dataset.match;
            }
        });
        return answer;
    }

    static restoreMatching(data) {
        const leftItems = document.querySelectorAll(".prompt-item");
        leftItems.forEach(item => {
            const id = item.dataset.id;
            if (data && data[id] !== undefined) {
                item.dataset.match = data[id];
            }
        });

        // Trigger line drawing if the component is mounted
        const component = document.querySelector(".matching-component");
        if (component && component.drawAllLines) {
            component.drawAllLines();
        }
    }

    static validateOrdering(step) {
        const orderContainer = document.querySelector(".ordering-items");
        if (orderContainer) return true;

        // Timeline uses DOM order directly
        const timelineContainer = document.querySelector(".timeline-container");
        return !!timelineContainer;
    }

    static collectOrdering(step) {
        const items = document.querySelectorAll(".ordering-item");
        if (items.length > 0) {
            return Array.from(items).map(el => el.dataset.itemId);
        }

        // Timeline
        const events = document.querySelectorAll(".timeline-event");
        if (events.length > 0) {
            return Array.from(events).map(el => el.dataset.eventId);
        }

        return null;
    }

    static restoreOrdering(data) {
        if (!data) return;

        const items = document.querySelectorAll(".ordering-item");
        if (items.length > 0 && Array.isArray(data)) {
            const containers = document.querySelectorAll(".ordering-item-container");
            const itemArray = Array.from(items);

            data.forEach((id, index) => {
                const item = itemArray.find(e => String(e.dataset.itemId) === String(id));
                if (item && containers[index]) {
                    containers[index].appendChild(item);
                }
            });
        }

        // Timeline
        const container = document.querySelector(".timeline-container");
        if (container && Array.isArray(data)) {
            const events = Array.from(container.querySelectorAll(".timeline-event"));
            data.forEach(id => {
                const event = events.find(e => String(e.dataset.eventId) === String(id));
                if (event) {
                    container.appendChild(event);
                }
            });
        }
    }

    static validateHighlight(step) {
        const selected = document.querySelectorAll(".highlight-word.selected");
        return selected.length > 0;
    }

    static collectHighlight(step) {
        const words = Array.from(document.querySelectorAll(".highlight-word.selected"));
        const phrases = [];
        let currentPhrase = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            currentPhrase.push(word.innerText.trim());

            const nextWord = words[i + 1];
            let isConnected = false;

            if (nextWord) {
                let sibling = word.nextSibling;
                let validConnection = false;

                isConnected = true;
                while (sibling && sibling !== nextWord) {
                    if (sibling.nodeType === 1 && sibling.classList.contains("highlight-sep") && sibling.classList.contains("selected")) {
                        validConnection = true;
                    } else if (sibling.nodeType === 3 && sibling.textContent.trim() === "") {
                        // Unwrapped text node with spaces breaks connection
                        isConnected = false;
                        break;
                    } else {
                        // Unselected separator or other node breaks connection
                        isConnected = false;
                        break;
                    }
                    sibling = sibling.nextSibling;
                }

                // Immediately adjacent nodes are connected
                if (word.nextSibling === nextWord) validConnection = true;

                if (!validConnection) isConnected = false;
            }

            if (!isConnected) {
                phrases.push(currentPhrase.join(" "));
                currentPhrase = [];
            }
        }

        return phrases;
    }

    static restoreHighlight(data) {
        if (!Array.isArray(data)) return;
        const words = document.querySelectorAll(".highlight-word");
        words.forEach(word => {
            if (data.includes(word.dataset.wordId) || data.includes(word.innerText)) {
                word.classList.add("selected");
            }
        });
    }

    static validateDragDrop(step) {
        // Valid when no draggable items remain in the source container
        const source = document.querySelector(".dragdrop-items");
        if (!source) return false;
        return source.querySelectorAll(".dragdrop-item").length === 0;
    }

    static collectDragDrop(step) {
        const targets = document.querySelectorAll(".zone-target");
        const answer = {};
        targets.forEach(target => {
            const zoneId = target.dataset.zoneId;
            target.querySelectorAll(".dragdrop-item").forEach(item => {
                answer[item.dataset.itemId] = zoneId;
            });
        });
        return answer;
    }

    static restoreDragDrop(data) {
        if (!data) return;
        const targets = document.querySelectorAll(".zone-target");
        const items = document.querySelectorAll(".dragdrop-item");

        targets.forEach(target => {
            const zoneId = target.dataset.zoneId;
            const itemId = data[zoneId];
            if (itemId !== undefined) {
                const item = Array.from(items).find(i => String(i.dataset.itemId) === String(itemId));
                if (item) {
                    target.appendChild(item);
                }
            }
        });
    }

    static collectMultiQuestion() {
        const mcComponent = document.querySelector(".multichoice-component");
        if (mcComponent && typeof mcComponent.getValue === 'function') {
            return mcComponent.getValue();
        }
        return null;
    }

    static restoreMultiQuestion(data) { }

    static current(step) {

        return this.collect(step);

    }

}

export default AnswerEngine;