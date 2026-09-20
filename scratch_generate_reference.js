const fs = require('fs');

const htmlPath = '/Users/doducqunynhtram/Documents/projects/prjvan/sotaytuloai.html';
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const cssContent = styleMatch ? styleMatch[1] : '';

const jsContent = `
import { getValidator } from "../validators/index.js";

class ReferenceComponent {
    static render(step) {
        const component = document.createElement("div");
        component.className = "component reference-component";
        
        // Ensure data exists
        const data = step.data || {};
        
        // Fallbacks for data structures
        const wordTypes = data.wordTypes || [];
        const comparisonPairs = (data.comparison && data.comparison.pairs) ? data.comparison.pairs : [];
        const microscopeSamples = (data.contextMicroscope && data.contextMicroscope.samples) ? data.contextMicroscope.samples : [];

        // 1. Inject CSS
        const style = document.createElement("style");
        style.innerHTML = \`${cssContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        component.appendChild(style);

        // 2. Generate Type Grid HTML
        let typeGridHTML = "";
        wordTypes.forEach((type, index) => {
            const numStr = (index + 1).toString().padStart(2, '0');
            const tagsHTML = (type.quickTest || []).slice(0, 3).map(tag => \`<span class="tag">\${tag}</span>\`).join("");
            
            typeGridHTML += \`
                <div class="type-card" data-id="\${type.id}">
                    <div class="type-number">\${numStr}</div>
                    <div class="type-icon">\${type.icon || '📌'}</div>
                    <h3>\${type.name}</h3>
                    <p>\${type.coreFact}</p>
                </div>
            \`;
        });

        // 3. Generate Microscope HTML
        let microscopeHTML = "";
        if (microscopeSamples.length > 0) {
            // Just take the first sample for the main view as in the example, or iterate them
            const sample = microscopeSamples[0];
            const sentenceHTML = sample.sentence.replace(new RegExp(sample.focus, 'gi'), \`<span class="word" data-focus="\${sample.focus}">$&</span>\`);
            
            microscopeHTML = \`
                <div class="sentence-box">
                    \${sentenceHTML}
                </div>
                <div id="analysis-box" class="analysis-box">
                    <div class="analysis-label">PHÂN TÍCH</div>
                    <h3>“\${sample.focus}” → \${sample.answer}</h3>
                    <p>\${sample.analysis}</p>
                </div>
            \`;
        }

        // 4. Generate Compare HTML
        let compareHTML = "";
        comparisonPairs.forEach(pair => {
            compareHTML += \`
                <div class="compare-card">
                    <h3>\${pair.left} ↔ \${pair.right}</h3>
                    <div class="compare-row">
                        <div class="compare-label">\${pair.left}</div>
                        <div>\${pair.ruleOfThumb.split('→')[0].trim()}</div>
                    </div>
                    <div class="compare-row">
                        <div class="compare-label">\${pair.right}</div>
                        <div>\${pair.ruleOfThumb.split('→')[1] ? pair.ruleOfThumb.split('→')[1].trim() : ''}</div>
                    </div>
                    <div class="example">
                        <strong>Câu hỏi:</strong> \${pair.question}
                    </div>
                </div>
            \`;
        });

        // 5. Generate Cheat Sheet HTML
        let cheatSheetHTML = "";
        wordTypes.forEach(type => {
            cheatSheetHTML += \`
                <tr>
                    <td><strong>\${type.name}</strong></td>
                    <td>\${type.essence ? type.essence.question : ''}</td>
                    <td>\${type.recognition ? type.recognition[0] : ''}</td>
                </tr>
            \`;
        });

        component.innerHTML += \`
            <div style="width: 100%; background: #f5f7fb;">
                <header>
                    <div class="header-inner">
                        <div class="brand">
                            <div class="brand-icon">📒</div>
                            <div>
                                <h1>Sổ tay Từ loại</h1>
                                <p>Ngữ văn 9 · Ôn thi vào lớp 10</p>
                            </div>
                        </div>
                        <div class="search">
                            <input type="text" placeholder="🔎 Tìm từ loại, ví dụ, lỗi dễ nhầm...">
                        </div>
                    </div>
                </header>

                <main>
                    <section class="hero">
                        <div class="hero-label">📚 CẨM NANG TRA CỨU</div>
                        <h2>Từ này thuộc từ loại nào?</h2>
                        <p>Không cần học thuộc lòng tất cả cùng lúc. Hãy tra cứu, quan sát ví dụ, so sánh và kiểm tra ngay trong ngữ cảnh.</p>
                    </section>

                    <section class="quick-tools">
                        <div class="tool-card" data-target="microscope">
                            <div class="tool-icon">🔬</div>
                            <h3>Kính hiển vi từ loại</h3>
                            <p>Nhìn một từ trong câu và tìm hiểu nó thuộc từ loại nào, vì sao.</p>
                        </div>
                        <div class="tool-card" data-target="compare">
                            <div class="tool-icon">⚖️</div>
                            <h3>So sánh dễ nhầm</h3>
                            <p>Phân biệt những trường hợp học sinh thường nhận diện sai.</p>
                        </div>
                        <div class="tool-card" data-target="cheat">
                            <div class="tool-icon">⚡</div>
                            <h3>Tờ phao 30 giây</h3>
                            <p>Ôn nhanh đặc điểm chính của các từ loại trước khi làm bài.</p>
                        </div>
                    </section>

                    <section class="section">
                        <div class="section-heading">
                            <div>
                                <h2>🗺️ Bản đồ từ loại</h2>
                                <p>Chọn một từ loại để mở trang kiến thức.</p>
                            </div>
                        </div>
                        <div class="type-grid">
                            \${typeGridHTML}
                        </div>
                    </section>

                    <section class="section" id="microscope">
                        <div class="microscope">
                            <div class="microscope-header">
                                <div class="microscope-icon">🔬</div>
                                <div>
                                    <h2>Kính hiển vi từ loại</h2>
                                    <p>Đừng chỉ nhìn từng từ riêng lẻ. Hãy nhìn từ trong câu.</p>
                                </div>
                            </div>
                            \${microscopeHTML}
                        </div>
                    </section>

                    <section class="section" id="compare">
                        <div class="section-heading">
                            <div>
                                <h2>⚖️ Những cặp dễ nhầm</h2>
                                <p>Tập trung vào những chỗ dễ mất điểm.</p>
                            </div>
                        </div>
                        <div class="compare-grid">
                            \${compareHTML}
                        </div>
                    </section>

                    <section class="section" id="cheat">
                        <div class="cheat">
                            <div class="section-heading">
                                <div>
                                    <h2>⚡ Tờ phao 30 giây</h2>
                                    <p>Bảng tóm tắt nhanh dùng trước khi làm bài thi.</p>
                                </div>
                            </div>
                            <table class="cheat-table">
                                <thead>
                                    <tr>
                                        <th>Từ loại</th>
                                        <th>Câu hỏi nhận diện</th>
                                        <th>Dấu hiệu nhận biết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${cheatSheetHTML}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
                
                <footer>
                    Tài liệu lưu hành nội bộ — Hệ thống học tập AntiGravity
                </footer>

                <!-- MODAL -->
                <div id="typeModal" class="modal">
                    <div class="modal-content">
                        <button class="modal-close" id="closeModal">✕</button>
                        <div class="modal-icon" id="modalIcon"></div>
                        <h2 id="modalTitle"></h2>
                        <p style="color: #667085" id="modalDesc"></p>

                        <div class="knowledge-block">
                            <h3>🔍 Bản chất</h3>
                            <p id="modalDefinition"></p>
                        </div>

                        <div class="knowledge-block">
                            <h3>✅ Cách nhận biết nhanh</h3>
                            <p id="modalRecognize"></p>
                        </div>

                        <div class="knowledge-block">
                            <h3>📝 Ví dụ thực tế</h3>
                            <div id="modalExamples"></div>
                        </div>

                        <div class="knowledge-block">
                            <h3>⚠️ Dễ nhầm lẫn</h3>
                            <p style="color: #d97706" id="modalConfuse"></p>
                        </div>

                        <div class="knowledge-block">
                            <h3>💡 Câu hỏi tự kiểm tra</h3>
                            <div class="example" style="border-color: #f59e0b" id="modalQuestion"></div>
                        </div>
                    </div>
                </div>
            </div>
        \`;

        this.bind(component, data);
        return component;
    }

    static bind(component, data) {
        // Quick tools scrolling
        component.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetId = card.getAttribute('data-target');
                const targetEl = component.querySelector(\`#\${targetId}\`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Microscope analysis box
        const words = component.querySelectorAll('.word');
        const analysisBox = component.querySelector('#analysis-box');
        words.forEach(word => {
            word.addEventListener('click', () => {
                if (analysisBox) {
                    analysisBox.classList.add('active');
                }
            });
        });

        // Modal logic
        const modal = component.querySelector('#typeModal');
        const closeModal = component.querySelector('#closeModal');

        component.querySelectorAll('.type-card').forEach(card => {
            card.addEventListener('click', () => {
                const typeId = card.getAttribute('data-id');
                const typeData = (data.wordTypes || []).find(t => t.id === typeId);
                
                if (typeData) {
                    component.querySelector('#modalIcon').textContent = typeData.icon || '📌';
                    component.querySelector('#modalTitle').textContent = typeData.name;
                    component.querySelector('#modalDesc').textContent = typeData.coreFact;
                    component.querySelector('#modalDefinition').innerHTML = \`<strong>Câu hỏi:</strong> \${typeData.essence ? typeData.essence.question : ''}<br><strong>Trả lời:</strong> \${typeData.essence ? typeData.essence.answer : ''}\`;
                    
                    component.querySelector('#modalRecognize').innerHTML = (typeData.recognition || []).map(r => \`- \${r}<br>\`).join("");
                    
                    component.querySelector('#modalExamples').innerHTML = (typeData.examples || []).map(ex => \`<div class="example"><strong>\${ex.sentence}</strong><br>→ "\${ex.word}": \${ex.analysis}</div>\`).join("");
                    
                    component.querySelector('#modalConfuse').innerHTML = (typeData.confusableWith || []).map(c => \`- Với \${c.type}: \${c.difference}<br>\`).join("");
                    
                    component.querySelector('#modalQuestion').innerHTML = (typeData.quickTest || []).map(q => \`- \${q}<br>\`).join("");
                    
                    modal.classList.add('active');
                }
            });
        });

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    static validator = getValidator("observe");
    static getValidator() { return this.validator; }
}

export default ReferenceComponent;
`;

fs.writeFileSync('/Users/doducqunynhtram/Documents/projects/prjvan/js/components/reference.js', jsContent);

// Add to index.js
const indexPath = '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

if (!indexContent.includes('ReferenceComponent')) {
    indexContent = indexContent.replace(
        'import EvidenceGallery from "./evidenceGallery.js";',
        'import EvidenceGallery from "./evidenceGallery.js";\nimport ReferenceComponent from "./reference.js";'
    );
    indexContent = indexContent.replace(
        'evidenceGallery: EvidenceGallery',
        'evidenceGallery: EvidenceGallery,\n    reference: ReferenceComponent'
    );
    fs.writeFileSync(indexPath, indexContent);
}

