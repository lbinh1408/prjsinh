import { getValidator } from '../validators/index.js';

class MicroscopeComponent {
    static render(data, stepIndex = 0) {
        const component = document.createElement('div');
        component.className = 'component microscope-component';

        // Destructure data
        const hero = data.hero || {};
        const stats = data.stats || [];
        const filters = data.filters || [];
        const texts = data.texts || [];
        const cheatSheet = data.cheatSheet || {};

        // Generate Stats HTML
        let statsHTML = '';
        stats.forEach(stat => {
            statsHTML += `
                <div class="stat">
                    <div class="stat-number">${stat.number}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `;
        });

        // Generate Filters HTML
        let filtersHTML = '';
        filters.forEach((filter, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            filtersHTML += `
                <button class="filter ${activeClass}">
                    ${filter}
                </button>
            `;
        });

        // Generate Texts HTML
        let textTabsHTML = '<div class="text-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">';
        let textsHTML = '';
        texts.forEach((text, tIdx) => {
            const activeTabClass = tIdx === 0 ? 'active' : '';
            textTabsHTML += `
                <button class="filter text-tab-btn ${activeTabClass}" data-tab-idx="${tIdx}">
                    ${text.title.replace('🔬 ', '')}
                </button>
            `;
            // Tags
            let tagsHTML = '';
            (text.tags || []).forEach(tag => {
                tagsHTML += `<span class="tag ${tag.color}">${tag.label}</span>`;
            });

            // Paragraphs
            let paragraphsHTML = '';
            (text.paragraphs || []).forEach(p => {
                let contentHTML = p.content;
                
                // Replace highlight markers with interactive spans
                if (text.highlights) {
                    Object.keys(text.highlights).forEach(key => {
                        const hl = text.highlights[key];
                        // E.g., {highlight:lang-le}
                        const marker = `{highlight:${key}}`;
                        if (contentHTML.includes(marker)) {
                            // Escape regex chars in hl.text
                            const escapedText = hl.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            // Match marker followed by optional whitespace and then the exact hl.text
                            const regex = new RegExp(`${marker}\\s*${escapedText}`, 'g');
                            
                            if (regex.test(contentHTML)) {
                                contentHTML = contentHTML.replace(regex, 
                                    `<span class="sentence highlight-marker" data-text-idx="${tIdx}" data-hl-key="${key}">${hl.text}</span>`
                                );
                            } else {
                                // Fallback if exact text doesn't follow marker
                                contentHTML = contentHTML.replace(marker, 
                                    `<span class="sentence highlight-marker" data-text-idx="${tIdx}" data-hl-key="${key}">${hl.text}</span>`
                                );
                            }
                        }
                    });
                }
                
                paragraphsHTML += `
                    <div class="paragraph">
                        <div class="paragraph-number">${p.number}</div>
                        ${contentHTML}
                    </div>
                `;
            });

            // Practice
            let practiceHTML = '';
            if (text.practice && text.practice.length > 0) {
                practiceHTML += `
                    <section class="section">
                        <div class="section-head">
                            <div>
                                <div class="section-title">✍️ Phòng thực hành</div>
                                <div class="section-desc">Không chỉ nhìn ra câu hay — hãy thử tạo một câu của chính mình.</div>
                            </div>
                        </div>
                        <div class="practice-grid">
                `;
                
                text.practice.forEach((p, pIdx) => {
                    practiceHTML += `<div class="practice-card">`;
                    practiceHTML += `<h3>${p.title}</h3>`;
                    practiceHTML += `<p>${p.question}</p>`;
                    
                    if (p.type === 'multiple-choice') {
                        (p.choices || []).forEach((choice, cIdx) => {
                            practiceHTML += `
                                <button class="choice pr-choice" data-correct="${choice.isCorrect}" data-feedback="${encodeURIComponent(choice.feedback || '')}">
                                    ${choice.text}
                                </button>
                            `;
                        });
                        practiceHTML += `<div class="feedback pr-feedback"></div>`;
                    } else if (p.type === 'writing') {
                        practiceHTML += `
                            <textarea class="pr-textarea" placeholder="${p.placeholder || ''}"></textarea>
                            <button class="primary-btn show-model-btn" data-model="${encodeURIComponent(p.modelAnswer || '')}">
                                Xem một cách phân tích
                            </button>
                            <div class="feedback pr-model"></div>
                        `;
                    }
                    
                    practiceHTML += `</div>`;
                });
                
                practiceHTML += `
                        </div>
                    </section>
                `;
            }

            textsHTML += `
                <div class="text-panel" id="text-panel-${tIdx}" style="${tIdx === 0 ? '' : 'display: none;'}">
                    <article class="text-card" id="text-card-${tIdx}">
                        <div class="text-card-head">
                            <div>
                                <div class="text-title">${text.title}</div>
                                <div class="text-meta">
                                    ${tagsHTML}
                                </div>
                            </div>
                            <div class="source-note">
                                ${text.sourceNote ? text.sourceNote.replace(/\n/g, '<br>') : ''}
                            </div>
                        </div>

                        ${text.prompt ? `
                            <div class="prompt">
                                <div class="prompt-label">Đề bài</div>
                                <div class="prompt-text">${text.prompt}</div>
                            </div>
                        ` : ''}

                        <div class="reading">
                            ${paragraphsHTML}
                        </div>
                        
                        <div class="microscope-container" style="display: none;">
                            <!-- Microscope panel will be injected here dynamically upon selection -->
                        </div>
                    </article>
                    
                    ${practiceHTML}
                </div>
            `;
        });
        textTabsHTML += '</div>';

        // Cheat Sheet
        let cheatSheetHTML = '';
        if (cheatSheet.items) {
            let cheatItemsHTML = '';
            cheatSheet.items.forEach(item => {
                cheatItemsHTML += `
                    <div class="cheat-item">
                        <strong>${item.title}</strong>
                        <span>${item.content}</span>
                    </div>
                `;
            });
            
            cheatSheetHTML = `
                <section class="section">
                    <div class="cheat">
                        <div class="section-title">${cheatSheet.title || ''}</div>
                        <div class="section-desc">${cheatSheet.description || ''}</div>
                        <div class="cheat-grid">
                            ${cheatItemsHTML}
                        </div>
                    </div>
                </section>
            `;
        }

        component.innerHTML = `
            <div class="content">
                <!-- HERO -->
                <section class="hero">
                    <div class="eyebrow">${hero.eyebrow || ''}</div>
                    <h1>${hero.title || ''}</h1>
                    <p>${hero.description || ''}</p>
                    ${hero.principle ? `
                        <div class="hero-principle">
                            <strong>Nguyên tắc của Microscope:</strong>
                            ${hero.principle}
                        </div>
                    ` : ''}
                </section>

                <!-- STATS -->
                <section class="stats">
                    ${statsHTML}
                </section>

                <!-- SECTION & FILTERS -->
                <section class="section">
                    <div class="section-head">
                        <div>
                            <div class="section-title">📕 Văn bản đang học</div>
                            <div class="section-desc">Đọc như một người viết, không chỉ như một người chấm bài.</div>
                        </div>
                    </div>
                    <div class="filters">
                        ${filtersHTML}
                    </div>

                    <div class="text-collections">
                        ${texts.length > 1 ? textTabsHTML : ''}
                        ${textsHTML}
                    </div>
                </section>

                <!-- CHEAT SHEET -->
                ${cheatSheetHTML}
                
                <section class="section">
                    <div class="complete" id="complete-box" style="display: none;">
                        <h3>🎉 Hoàn thành</h3>
                        <p>Bạn đã nắm bắt được các kỹ thuật văn phong điểm 10.</p>
                        <button class="primary-btn" id="nextStepBtn" style="margin-top: 15px;">Tiếp tục →</button>
                    </div>
                </section>
            </div>
        `;

        this.bind(component, data);
        return component;
    }

    static bind(component, data) {
        // Text Tabs toggle
        const tabBtns = component.querySelectorAll('.text-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tabIdx = btn.getAttribute('data-tab-idx');
                const panels = component.querySelectorAll('.text-panel');
                panels.forEach(panel => {
                    panel.style.display = 'none';
                });
                const activePanel = component.querySelector(`#text-panel-${tabIdx}`);
                if (activePanel) {
                    activePanel.style.display = 'block';
                }
            });
        });

        // Filters toggle
        const filters = component.querySelectorAll('.filters > .filter');
        filters.forEach(filter => {
            filter.addEventListener('click', () => {
                filters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
            });
        });

        // Highlights selection
        const sentences = component.querySelectorAll('.highlight-marker');
        sentences.forEach(sentence => {
            sentence.addEventListener('click', () => {
                // Remove selection from all
                sentences.forEach(s => s.classList.remove('selected'));
                // Add selection to current
                sentence.classList.add('selected');
                
                const tIdx = sentence.getAttribute('data-text-idx');
                const hlKey = sentence.getAttribute('data-hl-key');
                const textData = data.texts[tIdx];
                const hlData = textData.highlights[hlKey];
                
                const textCard = component.querySelector(`#text-card-${tIdx}`);
                const microscopeContainer = textCard.querySelector('.microscope-container');
                
                // Build microscope panel
                if (hlData) {
                    let lensTabs = '';
                    (hlData.lenses || []).forEach((lens, lIdx) => {
                        const activeClass = lIdx === 0 ? 'active' : '';
                        lensTabs += `
                            <button class="lens ${activeClass}" data-lens-idx="${lIdx}">
                                ${lens.name}
                            </button>
                        `;
                    });
                    
                    let beforeAfterHTML = '';
                    if (hlData.beforeAfter) {
                        beforeAfterHTML = `
                            <div class="before-after">
                                <div class="ba-card before">
                                    <div class="ba-label">❌ Cách viết đơn giản</div>
                                    <div class="ba-text">${hlData.beforeAfter.before}</div>
                                </div>
                                <div class="ba-card after">
                                    <div class="ba-label">⭐ Cách viết có sức gợi</div>
                                    <div class="ba-text">${hlData.beforeAfter.after}</div>
                                </div>
                            </div>
                        `;
                    }
                    
                    let takeawayHTML = '';
                    if (hlData.takeaway) {
                        takeawayHTML = `
                            <div class="takeaway">
                                <div class="takeaway-label">🎯 Kĩ thuật có thể học</div>
                                <div class="takeaway-text">${hlData.takeaway}</div>
                            </div>
                        `;
                    }
                    
                    const firstLens = hlData.lenses ? hlData.lenses[0] : {};
                    
                    microscopeContainer.innerHTML = `
                        <section class="microscope">
                            <div class="micro-head">
                                <div class="micro-title">
                                    <span style="font-size:25px">🔬</span>
                                    <div>
                                        <div>Microscope — Kính hiển vi</div>
                                        <div class="micro-sub">Bấm vào từng “kính” để xem câu văn được tạo ra như thế nào.</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="lens-tabs">
                                ${lensTabs}
                            </div>
                            
                            <div class="micro-body">
                                <div class="zoom-box">
                                    <div class="zoom-label">🔍 Điểm đang soi</div>
                                    <div class="zoom-text" id="zoomText">${firstLens.zoom || hlData.text}</div>
                                </div>
                                
                                <div class="analysis-grid">
                                    <div class="analysis-card">
                                        <h4>👀 Em nhìn thấy gì?</h4>
                                        <p id="obsText">${firstLens.observation || ''}</p>
                                    </div>
                                    <div class="analysis-card highlight">
                                        <h4>💡 Vì sao cách viết này hiệu quả?</h4>
                                        <p id="effText">${firstLens.effect || ''}</p>
                                    </div>
                                    <div class="analysis-card warning">
                                        <h4>⚠️ Nếu viết đơn giản hơn?</h4>
                                        <p id="simpText">${firstLens.simple || ''}</p>
                                    </div>
                                    <div class="analysis-card">
                                        <h4>🧠 Người viết đang làm gì?</h4>
                                        <p id="techText">${firstLens.technique || ''}</p>
                                    </div>
                                </div>
                                
                                ${beforeAfterHTML}
                                ${takeawayHTML}
                            </div>
                        </section>
                    `;
                    
                    microscopeContainer.style.display = 'block';
                    
                    // Bind lens change events
                    const lenses = microscopeContainer.querySelectorAll('.lens');
                    lenses.forEach(lens => {
                        lens.addEventListener('click', () => {
                            lenses.forEach(l => l.classList.remove('active'));
                            lens.classList.add('active');
                            
                            const lensIdx = lens.getAttribute('data-lens-idx');
                            const currentLensData = hlData.lenses[lensIdx];
                            
                            microscopeContainer.querySelector('#zoomText').textContent = currentLensData.zoom || hlData.text;
                            microscopeContainer.querySelector('#obsText').textContent = currentLensData.observation || '';
                            microscopeContainer.querySelector('#effText').textContent = currentLensData.effect || '';
                            microscopeContainer.querySelector('#simpText').textContent = currentLensData.simple || '';
                            microscopeContainer.querySelector('#techText').textContent = currentLensData.technique || '';
                        });
                    });
                    
                    // Scroll to microscope
                    setTimeout(() => {
                        microscopeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            });
        });
        
        // Practice MCQs
        const choiceBtns = component.querySelectorAll('.pr-choice');
        choiceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = btn.parentElement;
                const siblings = parent.querySelectorAll('.pr-choice');
                siblings.forEach(s => {
                    s.classList.remove('correct', 'wrong');
                });
                
                const isCorrect = btn.getAttribute('data-correct') === 'true';
                const feedbackText = decodeURIComponent(btn.getAttribute('data-feedback'));
                const feedbackEl = parent.querySelector('.pr-feedback');
                
                if (isCorrect) {
                    btn.classList.add('correct');
                    feedbackEl.style.color = "#047857";
                    feedbackEl.innerHTML = feedbackText || "✅ Chính xác.";
                } else {
                    btn.classList.add('wrong');
                    feedbackEl.style.color = "#b91c1c";
                    feedbackEl.innerHTML = feedbackText || "❌ Chưa đúng.";
                }
                
                checkCompletion(component);
            });
        });
        
        // Practice Writing
        const showModelBtns = component.querySelectorAll('.show-model-btn');
        showModelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.parentElement;
                const textarea = parent.querySelector('.pr-textarea');
                const modelEl = parent.querySelector('.pr-model');
                
                if (!textarea.value.trim()) {
                    modelEl.style.color = "#b91c1c";
                    modelEl.innerHTML = "✏️ Hãy thử viết câu của em trước rồi xem gợi ý.";
                    return;
                }
                
                const modelAnswer = decodeURIComponent(btn.getAttribute('data-model'));
                modelEl.style.color = "#047857";
                modelEl.innerHTML = modelAnswer;
                
                textarea.classList.add('submitted'); // Add flag for completion check
                checkCompletion(component);
            });
        });

        // Trigger completion logic immediately if there's no practice
        if (data.texts && data.texts.length > 0 && !data.texts[0].practice) {
            const completeBox = component.querySelector('#complete-box');
            if (completeBox) completeBox.style.display = 'block';
        }

        const nextBtn = component.querySelector('#nextStepBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('stepCompleted'));
            });
        }
    }
    
    static validator = getValidator("observe"); // Reuse observe validator for now (no required input)
    static getValidator() { return this.validator; }
}

function checkCompletion(component) {
    // Check if all MCQs have been attempted successfully and writings submitted
    // Simple heuristic: display complete box once any interaction happens for demo purposes.
    const completeBox = component.querySelector('#complete-box');
    if (completeBox) {
        completeBox.style.display = 'block';
    }
}

export default MicroscopeComponent;
