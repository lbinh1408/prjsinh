/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * components/index.js
 * ==========================================================
 */

import Observe from "./observe.js";
import Identify from "./identify.js";
import Explain from "./explain.js";
import FillBlank from "./fillBlank.js";
import Reflection from "./reflection.js";
import Definition from "./definition.js";
import Story from "./story.js";
import Discover from "./discover.js";
import Teach from "./teach.js";
import GuidedPractice from "./guidedPractice.js";
import CheatSheet from "./cheatSheet.js";
import Challenge from "./challenge.js";
import Intro from "./intro.js";

import Choice from "./choice.js";
import MultiChoice from "./multiChoice.js";
import MultiQuestion from "./multiQuestion.js";
import TrueFalse from "./trueFalse.js";
import Matching from "./matching.js";
import Ordering from "./ordering.js";

import Highlight from "./highlight.js";
import DragDrop from "./dragDrop.js";
import Timeline from "./timeline.js";
import Flashcard from "./flashcard.js";
import EvidenceGallery from "./evidenceGallery.js";
import ReferenceComponent from "./reference.js";
import MicroscopeComponent from "./microscope.js";
import LibraryComponent from "./library.js";

const Components = {

    intro: Intro,

    observe: Observe,

    identify: Identify,

    explain: Explain,

    fillBlank: FillBlank,

    reflection: Reflection,

    definition: Definition,

    story: Story,

    discover: Discover,

    teach: Teach,

    guidedPractice: GuidedPractice,
    guided_practice: GuidedPractice,

    cheatSheet: CheatSheet,
    cheat_sheet: CheatSheet,

    miniChallenge: Challenge,
    mini_challenge: Challenge,

    finalChallenge: Challenge,
    final_challenge: Challenge,

    choice: Choice,
    multiChoice: MultiChoice,
    multiQuestion: MultiQuestion,

    trueFalse: TrueFalse,

    matching: Matching,

    ordering: Ordering,

    highlight: Highlight,

    dragDrop: DragDrop,

    timeline: Timeline,

    flashcard: Flashcard,
    evidenceGallery: EvidenceGallery,

    reference: ReferenceComponent,

    microscope: MicroscopeComponent,

    library: LibraryComponent

};

/**
 * ==========================================================
 * Get Component
 * ==========================================================
 */

export function getComponent(type) {

    return Components[type] || null;

}

/**
 * ==========================================================
 * Render Component
 * ==========================================================
 */

export function renderComponent(step) {

    const component = getComponent(step.type);

    if (!component) {

        const div = document.createElement("div");

        div.className = "component component-error";

        div.innerHTML = `

            <h2>Component không tồn tại</h2>

            <p>Type: ${step.type}</p>

        `;

        return div;

    }

    return component.render(step);

}

/**
 * ==========================================================
 * Register Component
 * (Sprint 3 mở rộng plugin)
 * ==========================================================
 */

export function registerComponent(type, component) {

    Components[type] = component;

}

/**
 * ==========================================================
 * All Components
 * ==========================================================
 */

export default Components;