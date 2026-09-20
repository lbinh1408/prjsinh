/**
 * ==========================================================
 * TS10 Learning Platform
 * components/sentence.js
 * ==========================================================
 */

export default class Sentence {
    static render(data) {
        const component = document.createElement("div");
        component.className = "c-sentence-node";
        component.dataset.id = data.id;
        
        // Base styling for sentence
        component.style.cssText = `
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 20px;
            font-size: 1.15em;
            color: #334155;
            line-height: 1.6;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            max-width: 600px;
            margin: 0 auto;
            position: relative;
            z-index: 2;
            transition: all 0.3s ease;
        `;

        if (data.status === 'highlight') {
            component.style.borderColor = '#3b82f6';
            component.style.backgroundColor = '#eff6ff';
        }

        component.innerHTML = `<span>${data.text}</span>`;
        return component;
    }
}
