/**
 * ==========================================================
 * TS10 Learning Platform
 * components/connectionMap.js
 * ==========================================================
 */

import Sentence from "./sentence.js";
import SentenceLink from "./sentenceLink.js";

export default class ConnectionMap {
    static render(data, context = {}) {
        const component = document.createElement("div");
        component.className = "c-connection-map";
        component.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 30px 10px;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
        `;

        if (!data || !data.sentences) return component;

        const sentences = data.sentences;
        const links = data.links || [];

        // Build a basic linear sequence
        sentences.forEach((sentenceData, index) => {
            // Render the sentence
            const sentenceEl = Sentence.render(sentenceData);
            component.appendChild(sentenceEl);

            // If there's a next sentence, find the links between this and next
            if (index < sentences.length - 1) {
                const nextSentence = sentences[index + 1];
                const connectingLinks = links.filter(l => l.from === sentenceData.id && l.to === nextSentence.id);

                if (connectingLinks.length === 1) {
                    // Single link
                    const linkEl = SentenceLink.render(connectingLinks[0], context);
                    component.appendChild(linkEl);
                } else if (connectingLinks.length > 1) {
                    // Multiple links (Branching - e.g., Teach step)
                    const branchContainer = document.createElement("div");
                    branchContainer.style.cssText = `
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        margin: 20px 0;
                        position: relative;
                        width: 100%;
                    `;

                    connectingLinks.forEach(linkData => {
                        const linkWrap = document.createElement("div");
                        linkWrap.style.cssText = `
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            flex: 1;
                        `;
                        const linkEl = SentenceLink.render(linkData, context);
                        linkWrap.appendChild(linkEl);
                        branchContainer.appendChild(linkWrap);
                    });

                    component.appendChild(branchContainer);
                } else {
                    // No link found, but we still need spacing
                    const spacer = document.createElement("div");
                    spacer.style.height = "30px";
                    component.appendChild(spacer);
                }
            }
        });


        return component;
    }
}

