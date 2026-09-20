const fs = require('fs');
const path = require('path');

// 1. Rewrite JSON
const jsonPath = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/dan-chung-nlxh/03-danh-sach-dan-chung.json';
let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
if (Array.isArray(data)) {
    const newJson = {
        "id": "dan-chung-nlxh.03-danh-sach-dan-chung",
        "title": "Kho dẫn chứng NLXH",
        "type": "skill",
        "version": "1.0.0",
        "meta": {
            "module": "dan-chung-nlxh",
            "lessonNumber": 3,
            "durationMinutes": 45,
            "difficulty": "intermediate",
            "skill": "danh-sach-dan-chung",
            "description": "Kho dữ liệu dẫn chứng."
        },
        "learningGoals": [
            "Tra cứu và tham khảo dẫn chứng."
        ],
        "completion": {
            "requiredSections": ["gallery_01"],
            "action": "completeLesson",
            "message": "Em đã hoàn thành bài Kho dẫn chứng NLXH."
        },
        "steps": [
            {
                "id": "gallery_01",
                "type": "evidenceGallery",
                "data": {
                    "evidences": data
                }
            }
        ]
    };
    fs.writeFileSync(jsonPath, JSON.stringify(newJson, null, 4));
}

// 2. Create evidenceGallery.js
const htmlFile = '/Users/doducqunynhtram/Documents/projects/prjvan/khodulieutest.html';
const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Extract CSS
const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const cssContent = styleMatch ? styleMatch[1] : '';

const jsContent = `
import { getValidator } from "../validators/index.js";

class EvidenceGallery {
    static render(step) {
        const component = document.createElement("div");
        component.className = "component evidence-gallery-component";

        // Inject CSS
        const style = document.createElement("style");
        style.innerHTML = \`${cssContent.replace(/`/g, '\\`')}\`;
        component.appendChild(style);

        const data = step.data || step;
        const evidenceData = data.evidences || [];

        component.innerHTML += \`
            <div class="page" style="padding: 0; width: 100%;">
                <section class="stats">
                    <div class="stat-card">
                        <div class="stat-label">Tổng dẫn chứng</div>
                        <div class="stat-value" id="totalEvidence">0</div>
                        <div class="stat-note">Trong kho dữ liệu</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Nhóm vấn đề</div>
                        <div class="stat-value" id="totalCategories">0</div>
                        <div class="stat-note">Có thể khai thác</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Đã kiểm chứng</div>
                        <div class="stat-value" id="verifiedEvidence">0</div>
                        <div class="stat-note">Có nguồn xác thực</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Có thể tái sử dụng</div>
                        <div class="stat-value" id="reusableEvidence">0</div>
                        <div class="stat-note">Dùng cho nhiều vấn đề</div>
                    </div>
                </section>

                <section class="search-panel">
                    <div class="search-box">
                        <input id="searchInput" class="search-input" type="text" placeholder="Tìm theo tên, từ khóa, vấn đề..." />
                        <button id="searchButton" class="search-button" type="button">🔍 Tìm kiếm</button>
                    </div>
                    <div class="filters">
                        <button class="filter-button active" data-filter="all">Tất cả</button>
                        <button class="filter-button" data-filter="nghi-luc">Nghị lực</button>
                        <button class="filter-button" data-filter="kien-tri">Kiên trì</button>
                        <button class="filter-button" data-filter="vuot-kho">Vượt khó</button>
                        <button class="filter-button" data-filter="tu-hoc">Tự học</button>
                        <button class="filter-button" data-filter="nhan-ai">Nhân ái</button>
                        <button class="filter-button" data-filter="trach-nhiem">Trách nhiệm</button>
                        <button class="filter-button" data-filter="uoc-mo">Ước mơ</button>
                    </div>
                </section>

                <section class="content-grid">
                    <aside class="sidebar" style="position: static; top: auto;">
                        <div class="sidebar-title">Nhóm dẫn chứng</div>
                        <ul class="category-list">
                            <li><button class="category-item active" data-filter="all"><span>Tất cả</span><span class="category-count" id="count-all">0</span></button></li>
                            <li><button class="category-item" data-filter="nghi-luc"><span>💪 Nghị lực</span><span class="category-count" id="count-nghi-luc">0</span></button></li>
                            <li><button class="category-item" data-filter="kien-tri"><span>🔁 Kiên trì</span><span class="category-count" id="count-kien-tri">0</span></button></li>
                            <li><button class="category-item" data-filter="vuot-kho"><span>🧗 Vượt khó</span><span class="category-count" id="count-vuot-kho">0</span></button></li>
                            <li><button class="category-item" data-filter="tu-hoc"><span>📚 Tự học</span><span class="category-count" id="count-tu-hoc">0</span></button></li>
                            <li><button class="category-item" data-filter="nhan-ai"><span>❤️ Nhân ái</span><span class="category-count" id="count-nhan-ai">0</span></button></li>
                            <li><button class="category-item" data-filter="trach-nhiem"><span>🫱 Trách nhiệm</span><span class="category-count" id="count-trach-nhiem">0</span></button></li>
                            <li><button class="category-item" data-filter="uoc-mo"><span>🌟 Ước mơ</span><span class="category-count" id="count-uoc-mo">0</span></button></li>
                        </ul>
                    </aside>
                    <div>
                        <div class="evidence-header">
                            <h3>Dẫn chứng trong kho</h3>
                            <span class="result-count" id="resultCount">0 dẫn chứng</span>
                        </div>
                        <div id="evidenceGrid" class="evidence-grid"></div>
                    </div>
                </section>
                
                <div id="evidenceModal" class="modal">
                    <div class="modal-card">
                        <div class="modal-header">
                            <h3 id="modalName">Dẫn chứng</h3>
                            <button id="closeModal" class="close-button" type="button">×</button>
                        </div>
                        <div id="modalContent"></div>
                    </div>
                </div>
            </div>
        \`;

        this.bind(component, evidenceData);

        return component;
    }

    static bind(component, evidenceData) {
        let currentFilter = "all";
        let currentSearch = "";

        const evidenceGrid = component.querySelector("#evidenceGrid");
        const searchInput = component.querySelector("#searchInput");
        const resultCount = component.querySelector("#resultCount");
        const totalEvidence = component.querySelector("#totalEvidence");
        const totalCategories = component.querySelector("#totalCategories");
        const verifiedEvidence = component.querySelector("#verifiedEvidence");
        const reusableEvidence = component.querySelector("#reusableEvidence");
        const modal = component.querySelector("#evidenceModal");
        const modalName = component.querySelector("#modalName");
        const modalContent = component.querySelector("#modalContent");

        function getAllCategories() {
            const categories = new Set();
            evidenceData.forEach(evidence => {
                (evidence.usableFor || []).forEach(category => {
                    categories.add(category);
                });
            });
            return [...categories];
        }

        function getCategoryLabel(id) {
            const labels = {
                "nghi-luc": "Nghị lực",
                "kien-tri": "Kiên trì",
                "vuot-kho": "Vượt khó",
                "tu-hoc": "Tự học",
                "nhan-ai": "Nhân ái",
                "trach-nhiem": "Trách nhiệm",
                "uoc-mo": "Ước mơ",
                "hoc-tap": "Học tập"
            };
            return labels[id] || id;
        }

        function updateStatistics() {
            totalEvidence.textContent = evidenceData.length;
            totalCategories.textContent = getAllCategories().length;
            verifiedEvidence.textContent = evidenceData.filter(e => e.verified).length;
            reusableEvidence.textContent = evidenceData.filter(e => (e.usableFor || []).length >= 2).length;

            component.querySelector("#count-all").textContent = evidenceData.length;

            getAllCategories().forEach(category => {
                const element = component.querySelector(\`#count-\${category}\`);
                if (element) {
                    element.textContent = evidenceData.filter(e => (e.usableFor || []).includes(category)).length;
                }
            });
        }

        function filterEvidence() {
            const keyword = currentSearch.trim().toLowerCase();
            return evidenceData.filter(evidence => {
                const matchesCategory = currentFilter === "all" || (evidence.usableFor || []).includes(currentFilter);
                const searchableText = [
                    evidence.name,
                    evidence.coreFact,
                    ...(evidence.keywords || []),
                    ...(evidence.usableFor || [])
                ].join(" ").toLowerCase();
                const matchesSearch = !keyword || searchableText.includes(keyword);
                return matchesCategory && matchesSearch;
            });
        }

        function renderEvidence() {
            const results = filterEvidence();
            resultCount.textContent = \`\${results.length} dẫn chứng\`;

            if (!results.length) {
                evidenceGrid.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-icon">🔎</div>
                        <strong>Chưa tìm thấy dẫn chứng phù hợp</strong>
                        <p>Hãy thử một từ khóa hoặc nhóm vấn đề khác.</p>
                    </div>\`;
                return;
            }
            
            evidenceGrid.innerHTML = results.map(renderEvidenceCard).join("");
            
            // Re-attach event listeners for detail buttons
            evidenceGrid.querySelectorAll(".detail-button").forEach(btn => {
                btn.addEventListener("click", () => {
                    openEvidence(btn.getAttribute("data-id"));
                });
            });
        }

        function renderEvidenceCard(evidence) {
            const firstIssue = (evidence.usableFor || [])[0];
            const analysis = (evidence.analysis || {})[firstIssue] || "Chưa có góc phân tích.";
            const verifiedHTML = evidence.verified
                ? \`<span class="verified">✓ Đã kiểm chứng</span>\`
                : \`<span class="verified" style="color:#9ca3af">○ Chưa kiểm chứng</span>\`;
            
            const tagsHTML = (evidence.keywords || []).map(keyword => \`<span class="tag">\${keyword}</span>\`).join("");

            return \`
                <article class="evidence-card">
                    <div class="card-top">
                        <span class="evidence-type">\${evidence.type === "person" ? "NHÂN VẬT" : "SỰ KIỆN"}</span>
                        \${verifiedHTML}
                    </div>
                    <h4 class="evidence-name">\${evidence.name}</h4>
                    <p class="core-fact">\${evidence.coreFact}</p>
                    <div class="tags">\${tagsHTML}</div>
                    <div class="card-divider"></div>
                    <div class="analysis-label">Góc phân tích</div>
                    <p class="analysis">\${analysis}</p>
                    <div class="card-footer">
                        <span class="usable-label">Dùng cho \${(evidence.usableFor || []).length} vấn đề</span>
                        <button class="detail-button" data-id="\${evidence.id}">Xem chi tiết →</button>
                    </div>
                </article>\`;
        }

        function openEvidence(id) {
            const evidence = evidenceData.find(item => item.id === id);
            if (!evidence) return;
            
            modalName.textContent = evidence.name;
            const analysisHTML = (evidence.usableFor || []).map(issue => {
                const analysis = (evidence.analysis || {})[issue];
                if (!analysis) return "";
                return \`
                    <div class="analysis-item">
                        <strong>\${getCategoryLabel(issue)}</strong>
                        <span>\${analysis}</span>
                    </div>\`;
            }).join("");
            
            const keywordsHTML = (evidence.keywords || []).map(keyword => \`<span class="tag">\${keyword}</span>\`).join("");

            modalContent.innerHTML = \`
                <div class="detail-section">
                    <h4>Sự kiện cốt lõi</h4>
                    <p>\${evidence.coreFact}</p>
                </div>
                <div class="detail-section">
                    <h4>Từ khóa</h4>
                    <div class="tags">\${keywordsHTML}</div>
                </div>
                <div class="detail-section">
                    <h4>Có thể sử dụng cho</h4>
                    <p>\${(evidence.usableFor || []).map(getCategoryLabel).join(" · ")}</p>
                </div>
                <div class="detail-section">
                    <h4>Góc phân tích</h4>
                    <div class="analysis-list">\${analysisHTML}</div>
                </div>
                <div class="detail-section">
                    <h4>Nguồn</h4>
                    <div class="source-box">\${evidence.source || 'N/A'}</div>
                </div>\`;
                
            modal.classList.add("show");
        }

        function closeModal() {
            modal.classList.remove("show");
        }

        component.querySelector("#closeModal").addEventListener("click", closeModal);
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal();
        });

        searchInput.addEventListener("input", event => {
            currentSearch = event.target.value;
            renderEvidence();
        });
        component.querySelector("#searchButton").addEventListener("click", renderEvidence);

        component.querySelectorAll(".filter-button, .category-item").forEach(button => {
            button.addEventListener("click", () => {
                currentFilter = button.dataset.filter;
                component.querySelectorAll(".filter-button").forEach(item => {
                    item.classList.toggle("active", item.dataset.filter === currentFilter);
                });
                component.querySelectorAll(".category-item").forEach(item => {
                    item.classList.toggle("active", item.dataset.filter === currentFilter);
                });
                renderEvidence();
            });
        });

        updateStatistics();
        renderEvidence();
    }

    static validator = getValidator("observe"); // Fallback validator

    static getValidator() {
        return this.validator;
    }
}

export default EvidenceGallery;
`;

fs.writeFileSync('/Users/doducqunynhtram/Documents/projects/prjvan/js/components/evidenceGallery.js', jsContent);

// 3. Update js/components/index.js
const indexPath = '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/index.js';
let indexContent = fs.readFileSync(indexPath, 'utf8');

if (!indexContent.includes('EvidenceGallery')) {
    indexContent = indexContent.replace(
        'import Flashcard from "./flashcard.js";',
        'import Flashcard from "./flashcard.js";\nimport EvidenceGallery from "./evidenceGallery.js";'
    );
    indexContent = indexContent.replace(
        'flashcard: Flashcard',
        'flashcard: Flashcard,\n    evidenceGallery: EvidenceGallery'
    );
    fs.writeFileSync(indexPath, indexContent);
}

console.log("SUCCESS");

