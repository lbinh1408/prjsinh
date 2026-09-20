/**
 * ==========================================================
 * TS10 Learning Platform
 * components/guidedPractice.js (Router)
 * ==========================================================
 */

import ConnectionLab from "./layouts/ConnectionLab.js";
import RepairLab from "./layouts/RepairLab.js";
import GuidedBuilder from "./layouts/GuidedBuilder.js";
import GuidedWorkspace from "./layouts/GuidedWorkspace.js";
import GuidedIdeaBuilder from "./layouts/GuidedIdeaBuilder.js";
import DefaultLayout from "./layouts/DefaultLayout.js";
import RepairStudio from "./layouts/RepairStudio.js";
import EditorLab from "./layouts/EditorLab.js";
import DecisionLab from "./layouts/DecisionLab.js";
import SlotBuilder from "./layouts/SlotBuilder.js";

class GuidedPractice {

    static render(step) {
        const data = step.data || step;
        const layout = data.ui?.layout || data.ui?.component;
        
        switch (layout) {
            case 'builder':
                return SlotBuilder.render(step);
            case 'connection_lab':
                return ConnectionLab.render(step);
            case 'repair_lab':
                return RepairLab.render(step);
            case 'repair_studio':
                return RepairStudio.render(step);
            case 'editor_lab':
                return EditorLab.render(step);
            case 'guided_builder':
                return GuidedBuilder.render(step);
            case 'guided_workspace':
                return GuidedWorkspace.render(step);
            case 'guided_idea_builder':
                return GuidedIdeaBuilder.render(step);
            case 'guided_decision':
                return DecisionLab.render(step);
            default:
                // Fallback to the old linear steps layout if no layout is specified
                return DefaultLayout.render(step);
        }
    }

    static validator = {
        name: "NullValidator",
        validate: () => ({ valid: true, score: 1, maxScore: 1 })
    };

    static getValidator() {
        return this.validator;
    }
}

export default GuidedPractice;
