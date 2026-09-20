
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
        style.innerHTML = `
        .reference-component * {
            box-sizing: border-box;
        }

        .reference-component {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f5f7fb;
            color: #202733;
            line-height: 1.6;
        }

        /* =========================
       HEADER
    ========================== */

        .reference-component header {
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 22px 40px;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .header-inner {
            max-width: 1180px;
            margin: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .brand-icon {
            width: 46px;
            height: 46px;
            border-radius: 12px;
            background: #eef2ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 25px;
        }

        .brand h1 {
            margin: 0;
            font-size: 22px;
        }

        .brand p {
            margin: 2px 0 0;
            color: #6b7280;
            font-size: 14px;
        }

        .search {
            width: 310px;
        }

        .search input {
            width: 100%;
            padding: 11px 15px;
            border: 1px solid #d9dee8;
            border-radius: 10px;
            outline: none;
            font-size: 14px;
        }

        /* =========================
       MAIN
    ========================== */

        .reference-component main {
            max-width: 1180px;
            margin: 0 auto;
            padding: 40px 24px 80px;
        }

        .hero {
            margin-bottom: 40px;
        }

        .hero-label {
            color: #6366f1;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .hero h2 {
            font-size: 34px;
            margin: 0 0 10px;
        }

        .hero p {
            max-width: 720px;
            color: #667085;
            margin: 0;
        }

        /* =========================
       QUICK ACTIONS
    ========================== */

        .quick-tools {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 45px;
        }

        .tool-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 20px;
            cursor: pointer;
            transition: .2s;
        }

        .tool-card:hover {
            transform: translateY(-2px);
            border-color: #a5b4fc;
            box-shadow: 0 8px 20px rgba(0, 0, 0, .05);
        }

        .tool-icon {
            font-size: 25px;
            margin-bottom: 8px;
        }

        .tool-card h3 {
            margin: 0 0 5px;
            font-size: 17px;
        }

        .tool-card p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }

        /* =========================
       SECTION
    ========================== */

        .section {
            margin-top: 48px;
        }

        .section-heading {
            display: flex;
            justify-content: space-between;
            align-items: end;
            margin-bottom: 18px;
        }

        .section-heading h2 {
            margin: 0;
            font-size: 24px;
        }

        .section-heading p {
            margin: 3px 0 0;
            color: #6b7280;
            font-size: 14px;
        }

        /* =========================
       TYPE CARDS
    ========================== */

        .type-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }

        .type-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 20px;
            cursor: pointer;
            transition: .2s;
            min-height: 185px;
        }

        .type-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, .06);
        }

        .type-number {
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
        }

        .type-icon {
            font-size: 30px;
            margin: 8px 0;
        }

        .type-card h3 {
            margin: 0 0 6px;
            font-size: 18px;
        }

        .type-card p {
            margin: 0;
            color: #667085;
            font-size: 13px;
        }

        .tag-list {
            margin-top: 14px;
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .tag {
            background: #f3f4f6;
            border-radius: 20px;
            padding: 3px 8px;
            font-size: 11px;
            color: #667085;
        }

        /* =========================
       MICROSCOPE
    ========================== */

        .microscope {
            background: #111827;
            color: white;
            border-radius: 18px;
            padding: 28px;
        }

        .microscope-.reference-component header {
            display: flex;
            gap: 14px;
            align-items: center;
            margin-bottom: 20px;
        }

        .microscope-icon {
            font-size: 32px;
        }

        .microscope h2 {
            margin: 0;
            font-size: 22px;
        }

        .microscope p {
            margin: 2px 0 0;
            color: #cbd5e1;
            font-size: 14px;
        }

        .sentence-box {
            background: #1f2937;
            padding: 22px;
            border-radius: 12px;
            font-size: 19px;
            margin-bottom: 18px;
        }

        .word {
            background: #374151;
            border-radius: 6px;
            padding: 2px 5px;
            cursor: pointer;
        }

        .word:hover {
            background: #4f46e5;
        }

        .analysis-box {
            background: #ffffff;
            color: #202733;
            border-radius: 12px;
            padding: 20px;
            display: none;
        }

        .analysis-box.active {
            display: block;
        }

        .analysis-label {
            color: #6366f1;
            font-weight: bold;
            font-size: 13px;
        }

        .analysis-box h3 {
            margin: 5px 0;
        }

        /* =========================
       COMPARE
    ========================== */

        .compare-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }

        .compare-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 20px;
        }

        .compare-card h3 {
            margin-top: 0;
        }

        .compare-row {
            display: flex;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #f0f1f3;
        }

        .compare-row:last-child {
            border-bottom: none;
        }

        .compare-label {
            min-width: 90px;
            font-weight: bold;
            color: #6366f1;
        }

        /* =========================
       CHEAT SHEET
    ========================== */

        .cheat {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 28px;
        }

        .cheat-.reference-component table {
            width: 100%;
            border-collapse: collapse;
        }

        .cheat-table th,
        .cheat-table .reference-component td {
            text-align: left;
            padding: 13px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }

        .cheat-table .reference-component th {
            background: #f8fafc;
            font-size: 13px;
        }

        /* =========================
       MODAL
    ========================== */

        .modal {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, .55);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 20;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            width: min(760px, 100%);
            max-height: 85vh;
            overflow-y: auto;
            border-radius: 18px;
            padding: 30px;
        }

        .modal-close {
            float: right;
            border: none;
            background: #f3f4f6;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            cursor: pointer;
        }

        .modal-icon {
            font-size: 40px;
        }

        .modal h2 {
            margin: 8px 0;
        }

        .knowledge-block {
            margin-top: 22px;
        }

        .knowledge-block h3 {
            font-size: 16px;
            margin-bottom: 8px;
        }

        .example {
            background: #f8fafc;
            border-left: 4px solid #6366f1;
            padding: 12px 15px;
            margin: 8px 0;
            border-radius: 0 8px 8px 0;
        }

        /* =========================
       FOOTER
    ========================== */

        .reference-component footer {
            text-align: center;
            color: #98a2b3;
            font-size: 13px;
            padding: 30px;
        }

        @media(max-width: 850px) {
            .type-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .quick-tools {
                grid-template-columns: 1fr;
            }

            .compare-grid {
                grid-template-columns: 1fr;
            }

            .search {
                display: none;
            }
        }

        @media(max-width: 500px) {
            .type-grid {
                grid-template-columns: 1fr;
            }

            .reference-component header {
                padding: 16px 20px;
            }

            .hero h2 {
                font-size: 27px;
            }
        }
    `;
        component.appendChild(style);

        // 2. Generate Type Grid HTML
        let typeGridHTML = "";
        wordTypes.forEach((type, index) => {
            const numStr = (index + 1).toString().padStart(2, '0');
            const tagsHTML = (type.quickTest || []).slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join("");
            
            typeGridHTML += `
                <div class="type-card" data-id="${type.id}">
                    <div class="type-number">${numStr}</div>
                    <div class="type-icon">${type.icon || '📌'}</div>
                    <h3>${type.name}</h3>
                    <p>${type.coreFact}</p>
                </div>
            `;
        });

        // 3. Generate Microscope HTML
        let microscopeHTML = "";
        if (microscopeSamples.length > 0) {
            const sample = microscopeSamples[0];
            let sentenceHTML = sample.sentence;
            
            // Support multiple highlights for essay-level analysis
            if (sample.highlights && Array.isArray(sample.highlights)) {
                sample.highlights.forEach(hl => {
                    const safeText = hl.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    sentenceHTML = sentenceHTML.replace(
                        new RegExp(safeText, 'g'), 
                        `<span class="word" data-focus="${hl.text}" data-answer="${hl.answer}" data-analysis="${hl.analysis}">$&</span>`
                    );
                });
                
                microscopeHTML = `
                    <div class="sentence-box">
                        ${sentenceHTML}
                    </div>
                    <div id="analysis-box" class="analysis-box">
                        <div class="analysis-label">PHÂN TÍCH (Click vào các cụm từ được bôi màu để xem)</div>
                        <h3 id="analysis-title">“${sample.highlights[0].text}” → ${sample.highlights[0].answer}</h3>
                        <p id="analysis-desc">${sample.highlights[0].analysis}</p>
                    </div>
                `;
            } else if (sample.focus) {
                // Legacy format support
                const safeFocus = sample.focus.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                sentenceHTML = sentenceHTML.replace(
                    new RegExp(safeFocus, 'gi'), 
                    `<span class="word" data-focus="${sample.focus}" data-answer="${sample.answer}" data-analysis="${sample.analysis}">$&</span>`
                );
                
                microscopeHTML = `
                    <div class="sentence-box">
                        ${sentenceHTML}
                    </div>
                    <div id="analysis-box" class="analysis-box">
                        <div class="analysis-label">PHÂN TÍCH</div>
                        <h3 id="analysis-title">“${sample.focus}” → ${sample.answer}</h3>
                        <p id="analysis-desc">${sample.analysis}</p>
                    </div>
                `;
            }
        }

        // 4. Generate Compare HTML
        let compareHTML = "";
        comparisonPairs.forEach(pair => {
            compareHTML += `
                <div class="compare-card">
                    <h3>${pair.left} ↔ ${pair.right}</h3>
                    <div class="compare-row">
                        <div class="compare-label">${pair.left}</div>
                        <div>${pair.ruleOfThumb.split('→')[0].trim()}</div>
                    </div>
                    <div class="compare-row">
                        <div class="compare-label">${pair.right}</div>
                        <div>${pair.ruleOfThumb.split('→')[1] ? pair.ruleOfThumb.split('→')[1].trim() : ''}</div>
                    </div>
                    <div class="example">
                        <strong>Câu hỏi:</strong> ${pair.question}
                    </div>
                </div>
            `;
        });

        // 5. Generate Cheat Sheet HTML
        let cheatSheetHTML = "";
        wordTypes.forEach(type => {
            cheatSheetHTML += `
                <tr>
                    <td><strong>${type.name}</strong></td>
                    <td>${type.essence ? type.essence.question : ''}</td>
                    <td>${type.recognition ? type.recognition[0] : ''}</td>
                </tr>
            `;
        });

        // Fallbacks for text strings
        const mapTitleStr = data.map?.title?.toLowerCase() || '';
        const isBPTT = mapTitleStr.includes('biện pháp tu từ');
        const isPTBD = mapTitleStr.includes('phương thức biểu đạt');
        const isThuKhoa = mapTitleStr.includes('thủ khoa');
        
        let headerTitle = "Sổ tay Từ loại";
        let searchPlaceholder = "🔎 Tìm từ loại, ví dụ, lỗi dễ nhầm...";
        let heroTitle = "Từ này thuộc từ loại nào?";
        let tool1Title = "Kính hiển vi từ loại";
        let tool1Desc = "Nhìn một từ trong câu và tìm hiểu nó thuộc từ loại nào, vì sao.";
        let tool3Desc = "Ôn nhanh đặc điểm chính của các từ loại trước khi làm bài.";
        let defaultMapTitle = "🗺️ Bản đồ từ loại";
        let defaultMapDesc = "Chọn một từ loại để mở trang kiến thức.";

        if (isBPTT) {
            headerTitle = "Sổ tay Biện pháp tu từ";
            searchPlaceholder = "🔎 Tìm biện pháp tu từ, ví dụ...";
            heroTitle = "Đây là biện pháp tu từ gì?";
            tool1Title = "Kính hiển vi tu từ";
            tool1Desc = "Phân tích đặc điểm và tác dụng của từng biện pháp tu từ trong câu.";
            tool3Desc = "Ôn nhanh đặc điểm chính của các BPTT trước khi làm bài.";
            defaultMapTitle = "🗺️ Bản đồ Biện pháp tu từ";
            defaultMapDesc = "Chọn một BPTT để mở trang kiến thức.";
        } else if (isPTBD) {
            headerTitle = "Sổ tay Phương thức biểu đạt";
            searchPlaceholder = "🔎 Tìm phương thức biểu đạt, ví dụ...";
            heroTitle = "Văn bản này sử dụng PTBĐ nào?";
            tool1Title = "Kính hiển vi phương thức";
            tool1Desc = "Phân tích đặc điểm để xác định chính xác phương thức biểu đạt.";
            tool3Desc = "Ôn nhanh đặc điểm chính của 6 PTBĐ trước khi làm bài.";
            defaultMapTitle = "🗺️ Bản đồ Phương thức biểu đạt";
            defaultMapDesc = "Chọn một PTBĐ để mở trang kiến thức.";
        } else if (isThuKhoa) {
            headerTitle = "Sổ tay Văn phong Thủ khoa";
            searchPlaceholder = "🔎 Tìm điểm sáng văn phong, từ vựng đắt giá...";
            heroTitle = "Giải mã bài văn điểm 10";
            tool1Title = "Kính hiển vi Văn phong";
            tool1Desc = "Click vào từng cụm từ để xem cách thủ khoa dùng từ, lập luận và tạo cảm xúc.";
            tool3Desc = "Các công thức nâng cấp từ vựng từ mức Khá lên Xuất sắc.";
            defaultMapTitle = "🗺️ Các kỹ thuật viết nâng cao";
            defaultMapDesc = "Chọn một kỹ thuật để khám phá bí quyết đạt điểm 10.";
        }

        const textVars = {
            headerTitle: headerTitle,
            searchPlaceholder: searchPlaceholder,
            heroTitle: heroTitle,
            tool1Title: tool1Title,
            tool1Desc: tool1Desc,
            tool3Desc: tool3Desc,
            mapTitle: data.map?.title || defaultMapTitle,
            mapDesc: data.map?.description || defaultMapDesc
        };

        component.innerHTML += `
            <div style="width: 100%; background: #f5f7fb;">
                <header>
                    <div class="header-inner">
                        <div class="brand">
                            <div class="brand-icon">📒</div>
                            <div>
                                <h1>${textVars.headerTitle}</h1>
                                <p>Ngữ văn 9 · Ôn thi vào lớp 10</p>
                            </div>
                        </div>
                        <div class="search">
                            <input type="text" placeholder="${textVars.searchPlaceholder}">
                        </div>
                    </div>
                </header>

                <main>
                    <section class="hero">
                        <div class="hero-label">📚 CẨM NANG TRA CỨU</div>
                        <h2>${textVars.heroTitle}</h2>
                        <p>Không cần học thuộc lòng tất cả cùng lúc. Hãy tra cứu, quan sát ví dụ, so sánh và kiểm tra ngay trong ngữ cảnh.</p>
                    </section>

                    <section class="quick-tools">
                        <div class="tool-card" data-target="microscope">
                            <div class="tool-icon">🔬</div>
                            <h3>${textVars.tool1Title}</h3>
                            <p>${textVars.tool1Desc}</p>
                        </div>
                        <div class="tool-card" data-target="compare">
                            <div class="tool-icon">⚖️</div>
                            <h3>So sánh dễ nhầm</h3>
                            <p>Phân biệt những trường hợp học sinh thường nhận diện sai.</p>
                        </div>
                        <div class="tool-card" data-target="cheat">
                            <div class="tool-icon">⚡</div>
                            <h3>Tờ phao 30 giây</h3>
                            <p>${textVars.tool3Desc}</p>
                        </div>
                    </section>

                    <section class="section">
                        <div class="section-heading">
                            <div>
                                <h2>${textVars.mapTitle}</h2>
                                <p>${textVars.mapDesc}</p>
                            </div>
                        </div>
                        <div class="type-grid">
                            ${typeGridHTML}
                        </div>
                    </section>

                    <section class="section" id="microscope">
                        <div class="microscope">
                            <div class="microscope-header">
                                <div class="microscope-icon">🔬</div>
                                <div>
                                    <h2>${textVars.tool1Title}</h2>
                                    <p>Đừng chỉ nhìn từng từ riêng lẻ. Hãy nhìn từ trong câu.</p>
                                </div>
                            </div>
                            ${microscopeHTML}
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
                            ${compareHTML}
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
                                    ${cheatSheetHTML}
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
        `;

        this.bind(component, data);
        return component;
    }

    static bind(component, data) {
        // Quick tools scrolling
        component.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetId = card.getAttribute('data-target');
                const targetEl = component.querySelector(`#${targetId}`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Microscope analysis box
        const words = component.querySelectorAll('.word');
        const analysisBox = component.querySelector('#analysis-box');
        const analysisTitle = component.querySelector('#analysis-title');
        const analysisDesc = component.querySelector('#analysis-desc');
        
        words.forEach(word => {
            word.addEventListener('click', () => {
                // Dynamically update the analysis box based on the clicked word
                const focus = word.getAttribute('data-focus');
                const answer = word.getAttribute('data-answer');
                const analysis = word.getAttribute('data-analysis');
                
                if (analysisTitle && focus && answer) {
                    analysisTitle.innerHTML = `“${focus}” → ${answer}`;
                }
                if (analysisDesc && analysis) {
                    analysisDesc.innerHTML = analysis;
                }
                
                if (analysisBox) {
                    analysisBox.classList.add('active');
                    // Add a small bounce animation to draw attention
                    analysisBox.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        analysisBox.style.transform = 'scale(1)';
                    }, 200);
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
                    component.querySelector('#modalDefinition').innerHTML = `<strong>Câu hỏi:</strong> ${typeData.essence ? typeData.essence.question : ''}<br><strong>Trả lời:</strong> ${typeData.essence ? typeData.essence.answer : ''}`;
                    
                    component.querySelector('#modalRecognize').innerHTML = (typeData.recognition || []).map(r => `- ${r}<br>`).join("");
                    
                    component.querySelector('#modalExamples').innerHTML = (typeData.examples || []).map(ex => `<div class="example"><strong>${ex.sentence}</strong><br>→ "${ex.word}": ${ex.analysis}</div>`).join("");
                    
                    component.querySelector('#modalConfuse').innerHTML = (typeData.confusableWith || []).map(c => `- Với ${c.type}: ${c.difference}<br>`).join("");
                    
                    component.querySelector('#modalQuestion').innerHTML = (typeData.quickTest || []).map(q => `- ${q}<br>`).join("");
                    
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
