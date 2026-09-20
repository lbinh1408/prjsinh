/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * componentFactory.js
 * ==========================================================
 */

import { getComponent } from "./components/index.js";
import { getValidator  } from "./validators/index.js";

class ComponentFactory {

    /**
     * ======================================================
     * Create Component (returns DOM Element)
     * ======================================================
     */

    static create(step){

        if(!step) return this.empty();

        const componentClass = getComponent(step.type);

        if (componentClass) {
            return componentClass.render(step);
        }

        return this.unsupported(step.type);

    }

    /**
     * ======================================================
     * Get Component Class
     * ======================================================
     * Returns the component class itself (not a DOM node)
     * so the engine can call class-level methods.
     *
     * Usage:
     *   const cls    = ComponentFactory.getComponentClass(step);
     *   const result = cls.getValidator().validate(step, userAnswer);
     */

    static getComponentClass(step){

        if(!step) return null;

        return getComponent(step.type) || null;

    }

    /**
     * ======================================================
     * Get Validator for a step
     * ======================================================
     * Preferred lookup order:
     *  1. step.validator key  (explicit override from JSON)
     *  2. component.getValidator() (declared on the class)
     *  3. registry fallback by step.type
     */

    static getValidator(step){

        // 1. Explicit override in JSON
        if (step.validator) {
            return getValidator(step.validator);
        }

        // 2. Ask the component class
        const cls = this.getComponentClass(step);
        if (cls && typeof cls.getValidator === "function") {
            return cls.getValidator(step);
        }

        // 3. Fallback by type
        return getValidator(step.type);

    }

    /**
     * ======================================================
     * Empty Component
     * ======================================================
     */

    static empty(){

        const div = document.createElement("div");

        div.className = "empty-component component";

        div.innerHTML = `
            <h2>Không có dữ liệu</h2>
            <p>Bài học chưa được tạo.</p>
        `;

        return div;

    }

    /**
     * ======================================================
     * Unsupported Component
     * ======================================================
     */

    static unsupported(type){

        const div = document.createElement("div");

        div.className = "component warning-box";

        div.innerHTML = `
            <h2>Component chưa được hỗ trợ</h2>
            <p>Type: <strong>${type}</strong></p>
        `;

        return div;

    }

    /**
     * ======================================================
     * Register New Component  (Sprint 3+)
     * ======================================================
     */

    static register(type, renderer){

        this.components ??= {};
        this.components[type] = renderer;

    }

}

export default ComponentFactory;