/**
 * ==========================================================
 * TS10 Learning Platform
 * components/sentenceLink.js
 * ==========================================================
 */

export default class SentenceLink {
    static render(data, context = {}) {
        const component = document.createElement("div");
        component.className = "c-sentence-link";
        component.dataset.id = data.id || "";
        component.dataset.type = data.type || "unknown";
        component.dataset.status = data.status || "default";

        // Constants for styles
        const colors = {
            default: '#94a3b8',
            interactive: '#3b82f6',
            correct: '#10b981',
            broken: '#ef4444',
            weak: '#f59e0b'
        };

        const icons = {
            repetition: '🔁',
            substitution: '🔄',
            connective: '➡️',
            association: '🌱',
            unknown: '?'
        };

        const color = colors[data.status] || colors.default;
        const icon = (data.status === 'broken' && !data.label) ? '❌' :
            (icons[data.type] || icons.unknown);

        component.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
            padding: 10px 0;
            position: relative;
            z-index: 1000;
            min-height: 50px;
        `;

        // The line going down
        const lineStyles = `
            width: 4px;
            height: 80px;
            background-color: ${color};
            transition: all 0.3s ease;
            position: relative;
        `;

        let lineHTML = `<div class="link-line" style="${lineStyles}"></div>`;
        if (data.status === 'broken') {
            lineHTML = `
                <div class="link-line-container" style="display: flex; flex-direction: column; align-items: center; height: 80px; justify-content: center;">
                    <div class="link-line-part" style="width: 4px; height: 35px; background-color: ${color};"></div>
                    <div class="link-line-break" style="font-size: 1.2em; line-height: 10px; color: ${color}; font-weight: bold; margin: 5px 0;">✕</div>
                    <div class="link-line-part" style="width: 4px; height: 35px; background-color: ${color};"></div>
                </div>
            `;
        }

        // The badge in the middle of the line
        let badgeHTML = '';
        if (data.status !== 'broken' || data.label) {
            let labelText = data.label ? data.label : icon;
            if (data.label && icon !== '?' && icon !== '❌') {
                labelText = `${icon} ${data.label}`;
            }

            badgeHTML = `
                <div class="link-badge" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border: 2px solid ${color};
                    border-radius: 20px;
                    padding: 5px 15px;
                    font-weight: bold;
                    color: ${color};
                    font-size: 0.95em;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    cursor: ${data.status === 'interactive' || data.status === 'weak' ? 'pointer' : 'default'};
                    transition: all 0.2s ease;
                ">
                    ${labelText}
                </div>
            `;
        }

        component.innerHTML = `
            ${lineHTML}
            ${badgeHTML}
        `;

        // Interaction logic
        if ((data.status === 'interactive' || data.status === 'weak') && data.interactiveConfig) {
            const badge = component.querySelector('.link-badge');

            badge.addEventListener('mouseover', () => {
                badge.style.transform = 'translate(-50%, -50%) scale(1.05)';
                badge.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            });
            badge.addEventListener('mouseout', () => {
                badge.style.transform = 'translate(-50%, -50%) scale(1)';
                badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            });

            badge.addEventListener('click', () => {
                // Toggle popup logic
                let popup = component.querySelector('.custom-link-popup');
                if (popup) {
                    popup.remove();
                    return;
                }

                // Create custom inline popup
                popup = document.createElement("div");
                popup.className = "custom-link-popup";
                popup.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 100%;
                    margin-left: 45px;
                    transform: translateY(-50%);
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 15px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                    z-index: 50;
                    width: max-content;
                    max-width: 250px;
                    text-align: left;
                `;

                // Arrow for popup
                const arrow = document.createElement("div");
                arrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: -6px;
                    transform: translateY(-50%) rotate(45deg);
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-left: 1px solid #e2e8f0;
                    border-bottom: 1px solid #e2e8f0;
                `;
                popup.appendChild(arrow);

                if (data.interactiveConfig.question) {
                    const title = document.createElement("div");
                    title.style.cssText = "font-size: 0.9em; color: #1e293b; font-weight: 500; margin-bottom: 10px;";
                    title.innerText = data.interactiveConfig.question;
                    popup.appendChild(title);
                }

                if (data.interactiveConfig.options) {
                    const btnGroup = document.createElement("div");
                    btnGroup.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

                    if (data.interactiveConfig.type !== "edit_word") {
                        btnGroup.style.flexDirection = "row";
                    }

                    data.interactiveConfig.options.forEach(opt => {
                        const btn = document.createElement("button");
                        btn.style.cssText = `
                            flex: 1;
                            padding: 8px 12px;
                            border-radius: 6px;
                            border: 1px solid #cbd5e1;
                            background: #f8fafc;
                            color: #334155;
                            cursor: pointer;
                            font-size: 0.9em;
                            font-weight: 500;
                            transition: all 0.2s;
                            text-align: left;
                        `;

                        if (data.interactiveConfig.type !== "edit_word") {
                            btn.style.textAlign = "center";
                        }

                        btn.innerText = opt;

                        btn.addEventListener('mouseover', () => btn.style.background = '#e2e8f0');
                        btn.addEventListener('mouseout', () => btn.style.background = '#f8fafc');

                        btn.addEventListener('click', (e) => {
                            e.stopPropagation(); // prevent triggering badge click
                            popup.remove();

                            const ans = opt;
                            const isCorrect = data.interactiveConfig.type === 'edit_word' ?
                                ans === data.interactiveConfig.correctText :
                                ans.toLowerCase() === data.interactiveConfig.correctAnswer?.toLowerCase();

                            if (isCorrect) {
                                if (data.interactiveConfig.actionOnCorrect === 'break') {
                                    badge.innerHTML = `✕`;
                                    badge.style.borderColor = colors.broken;
                                    badge.style.color = colors.broken;

                                    // Re-render the broken line effect
                                    const lineContainer = component.querySelector('.link-line');
                                    if (lineContainer) {
                                        lineContainer.outerHTML = `
                                            <div class="link-line-container" style="display: flex; flex-direction: column; align-items: center; height: 80px; justify-content: center;">
                                                <div class="link-line-part" style="width: 4px; height: 35px; background-color: ${colors.broken};"></div>
                                                <div class="link-line-break" style="font-size: 1.2em; line-height: 10px; color: ${colors.broken}; font-weight: bold; margin: 5px 0;">✕</div>
                                                <div class="link-line-part" style="width: 4px; height: 35px; background-color: ${colors.broken};"></div>
                                            </div>
                                        `;
                                    }

                                    component.dataset.status = 'broken';
                                    if (context.onUpdate) context.onUpdate(data.id, 'broken', ans);
                                } else {
                                    const textToShow = data.interactiveConfig.type === 'edit_word' ? ans : (icons[data.interactiveConfig.correctAnswer] || ans);
                                    badge.innerHTML = `✓ ${textToShow}`;
                                    badge.style.borderColor = colors.correct;
                                    badge.style.color = colors.correct;

                                    const line = component.querySelector('.link-line');
                                    if (line) line.style.backgroundColor = colors.correct;

                                    // Make line interactive after repair if it was weak
                                    if (data.status === 'weak') {
                                        const parts = component.querySelectorAll('div[style*="width: 4px"]');
                                        parts.forEach(p => p.style.backgroundColor = colors.correct);
                                    }

                                    component.dataset.status = 'correct';
                                    if (context.onUpdate) context.onUpdate(data.id, 'correct', ans);
                                }
                            } else {
                                // Wrong answer shake effect
                                badge.style.transform = 'translate(-50%, -50%) rotate(5deg)';
                                setTimeout(() => badge.style.transform = 'translate(-50%, -50%) rotate(-5deg)', 50);
                                setTimeout(() => badge.style.transform = 'translate(-50%, -50%) scale(1)', 100);
                            }
                        });
                        btnGroup.appendChild(btn);
                    });

                    popup.appendChild(btnGroup);
                } else if (data.interactiveConfig.type === 'edit_word' || data.interactiveConfig.type === 'add_link') {
                    // Fallback quick repair without options
                    const correctText = data.interactiveConfig.correctText;
                    if (correctText) {
                        badge.innerHTML = `✓ ${correctText}`;
                        badge.style.borderColor = colors.correct;
                        badge.style.color = colors.correct;
                        const part = component.querySelector('div[style*="width: 4px"]');
                        if (part) part.style.backgroundColor = colors.correct;
                        component.dataset.status = 'correct';

                        if (context.onUpdate) context.onUpdate(data.id, 'correct', correctText);
                    }
                    popup.remove();
                }

                component.appendChild(popup);
            });
        }

        return component;
    }
}
