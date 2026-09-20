
import { getValidator } from "../validators/index.js";

class EvidenceGallery {
    static render(step) {
        const component = document.createElement("div");
        component.className = "component evidence-gallery-component";

        // Inject CSS
        const style = document.createElement("style");
        style.innerHTML = `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Arial,
                sans-serif;

            background: #f6f7fb;
            color: #202124;
            line-height: 1.6;
        }

        button,
        input {
            font: inherit;
        }

        button {
            cursor: pointer;
        }

        /* =========================
       APP HEADER
    ========================= */

        .app-header {
            height: 64px;
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;

            display: flex;
            align-items: center;
            justify-content: space-between;

            padding: 0 32px;

            position: sticky;
            top: 0;
            z-index: 20;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-icon {
            width: 40px;
            height: 40px;

            border-radius: 10px;
            background: #eef2ff;

            display: flex;
            align-items: center;
            justify-content: center;

            font-size: 20px;
        }

        .brand-text h1 {
            font-size: 17px;
            font-weight: 700;
        }

        .brand-text p {
            font-size: 12px;
            color: #6b7280;
        }

        .header-badge {
            padding: 6px 12px;
            border-radius: 20px;

            background: #f3f4f6;
            color: #4b5563;

            font-size: 12px;
            font-weight: 600;
        }

        /* =========================
       PAGE
    ========================= */

        .page {
            max-width: 1400px;
            margin: 0 auto;
            padding: 32px;
        }

        /* =========================
       HERO
    ========================= */

        .hero {
            margin-bottom: 28px;
        }

        .hero h2 {
            font-size: 30px;
            line-height: 1.25;
            margin-bottom: 8px;
        }

        .hero p {
            color: #6b7280;
            max-width: 760px;
        }

        /* =========================
       STATS
    ========================= */

        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;

            margin-bottom: 28px;
        }

        .stat-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;

            padding: 18px 20px;
        }

        .stat-label {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 6px;
        }

        .stat-value {
            font-size: 26px;
            font-weight: 750;
        }

        .stat-note {
            margin-top: 4px;
            font-size: 12px;
            color: #9ca3af;
        }

        /* =========================
       SEARCH
    ========================= */

        .search-panel {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;

            padding: 20px;

            margin-bottom: 24px;
        }

        .search-box {
            display: flex;
            gap: 12px;
        }

        .search-input {
            flex: 1;

            height: 48px;

            border: 1px solid #d1d5db;
            border-radius: 10px;

            padding: 0 16px;

            outline: none;
            background: #ffffff;
        }

        .search-input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px #eef2ff;
        }

        .search-button {
            border: none;
            border-radius: 10px;

            padding: 0 22px;

            background: #4f46e5;
            color: #ffffff;

            font-weight: 600;
        }

        .search-button:hover {
            background: #4338ca;
        }

        /* =========================
       FILTERS
    ========================= */

        .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            margin-top: 16px;
        }

        .filter-button {
            border: 1px solid #e5e7eb;
            background: #ffffff;

            padding: 7px 13px;
            border-radius: 20px;

            font-size: 13px;
            color: #4b5563;
        }

        .filter-button:hover {
            border-color: #c7d2fe;
            background: #eef2ff;
        }

        .filter-button.active {
            background: #4f46e5;
            color: #ffffff;
            border-color: #4f46e5;
        }

        /* =========================
       MAIN GRID
    ========================= */

        .content-grid {
            display: grid;
            grid-template-columns: 240px minmax(0, 1fr);
            gap: 24px;
            align-items: start;
        }

        /* =========================
       SIDEBAR
    ========================= */

        .sidebar {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;

            padding: 18px;

            position: sticky;
            top: 88px;
        }

        .sidebar-title {
            font-size: 13px;
            font-weight: 700;
            color: #374151;

            margin-bottom: 12px;
        }

        .category-list {
            list-style: none;
        }

        .category-item {
            width: 100%;

            display: flex;
            align-items: center;
            justify-content: space-between;

            border: none;
            background: transparent;

            padding: 10px 8px;
            border-radius: 8px;

            text-align: left;
            color: #4b5563;
            font-size: 14px;
        }

        .category-item:hover {
            background: #f3f4f6;
        }

        .category-item.active {
            background: #eef2ff;
            color: #4338ca;
            font-weight: 600;
        }

        .category-count {
            font-size: 11px;
            color: #9ca3af;
        }

        /* =========================
       EVIDENCE AREA
    ========================= */

        .evidence-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            margin-bottom: 16px;
        }

        .evidence-header h3 {
            font-size: 18px;
        }

        .result-count {
            font-size: 13px;
            color: #6b7280;
        }

        .evidence-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }

        /* =========================
       EVIDENCE CARD
    ========================= */

        .evidence-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;

            padding: 20px;

            transition:
                transform 0.15s ease,
                box-shadow 0.15s ease,
                border-color 0.15s ease;
        }

        .evidence-card:hover {
            transform: translateY(-2px);
            border-color: #c7d2fe;

            box-shadow:
                0 8px 24px rgba(15, 23, 42, 0.07);
        }

        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

            margin-bottom: 12px;
        }

        .evidence-type {
            display: inline-flex;

            padding: 4px 9px;

            border-radius: 6px;

            background: #f3f4f6;
            color: #6b7280;

            font-size: 11px;
            font-weight: 600;
        }

        .verified {
            font-size: 11px;
            color: #15803d;

            display: flex;
            align-items: center;
            gap: 4px;
        }

        .evidence-name {
            font-size: 18px;
            font-weight: 700;

            margin-bottom: 8px;
        }

        .core-fact {
            font-size: 14px;
            color: #4b5563;

            margin-bottom: 14px;
        }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;

            margin-bottom: 16px;
        }

        .tag {
            background: #f5f3ff;
            color: #5b21b6;

            border-radius: 6px;

            padding: 4px 8px;

            font-size: 11px;
        }

        .card-divider {
            height: 1px;
            background: #f0f0f0;

            margin-bottom: 14px;
        }

        .analysis-label {
            font-size: 11px;
            text-transform: uppercase;

            letter-spacing: 0.05em;

            color: #9ca3af;

            margin-bottom: 6px;
        }

        .analysis {
            font-size: 13px;
            color: #374151;

            margin-bottom: 16px;
        }

        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .usable-label {
            font-size: 11px;
            color: #9ca3af;
        }

        .detail-button {
            border: none;
            background: transparent;

            color: #4f46e5;

            font-size: 13px;
            font-weight: 600;
        }

        .detail-button:hover {
            text-decoration: underline;
        }

        /* =========================
       EMPTY
    ========================= */

        .empty-state {
            background: #ffffff;

            border: 1px dashed #d1d5db;
            border-radius: 16px;

            padding: 60px 20px;

            text-align: center;

            color: #6b7280;
        }

        .empty-icon {
            font-size: 32px;
            margin-bottom: 12px;
        }

        /* =========================
       MODAL
    ========================= */

        .modal {
            position: fixed;
            inset: 0;

            background: rgba(15, 23, 42, 0.45);

            display: none;
            align-items: center;
            justify-content: center;

            padding: 20px;

            z-index: 100;
        }

        .modal.show {
            display: flex;
        }

        .modal-card {
            width: min(720px, 100%);

            max-height: 90vh;
            overflow-y: auto;

            background: #ffffff;
            border-radius: 18px;

            padding: 28px;

            box-shadow:
                0 20px 60px rgba(15, 23, 42, 0.2);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            gap: 20px;

            margin-bottom: 20px;
        }

        .modal-header h3 {
            font-size: 24px;
        }

        .close-button {
            width: 36px;
            height: 36px;

            border: none;
            border-radius: 8px;

            background: #f3f4f6;

            font-size: 18px;
        }

        .detail-section {
            margin-bottom: 20px;
        }

        .detail-section h4 {
            font-size: 13px;

            text-transform: uppercase;
            letter-spacing: 0.05em;

            color: #6b7280;

            margin-bottom: 7px;
        }

        .detail-section p {
            color: #374151;
        }

        .analysis-list {
            display: grid;
            gap: 10px;
        }

        .analysis-item {
            background: #f9fafb;

            border: 1px solid #f0f0f0;
            border-radius: 10px;

            padding: 12px;
        }

        .analysis-item strong {
            display: block;

            font-size: 12px;
            color: #4f46e5;

            margin-bottom: 3px;
        }

        .source-box {
            background: #f9fafb;

            border: 1px solid #e5e7eb;
            border-radius: 10px;

            padding: 12px;

            font-size: 13px;
            word-break: break-word;
        }

        /* =========================
       RESPONSIVE
    ========================= */

        @media (max-width: 1000px) {
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }

            .content-grid {
                grid-template-columns: 1fr;
            }

            .sidebar {
                position: static;
            }

            .category-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .category-item {
                width: auto;
            }
        }

        @media (max-width: 700px) {
            .page {
                padding: 20px;
            }

            .app-header {
                padding: 0 16px;
            }

            .hero h2 {
                font-size: 24px;
            }

            .stats {
                grid-template-columns: 1fr 1fr;
            }

            .search-box {
                flex-direction: column;
            }

            .search-button {
                height: 44px;
            }

            .evidence-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 480px) {
            .stats {
                grid-template-columns: 1fr;
            }

            .header-badge {
                display: none;
            }
        }
    `;
        component.appendChild(style);

        const data = step.data || step;
        const evidenceData = data.evidences || [];
        const categories = data.categories || [
            { id: "nghi-luc", label: "Nghị lực", icon: "💪" },
            { id: "kien-tri", label: "Kiên trì", icon: "🔁" },
            { id: "vuot-kho", label: "Vượt khó", icon: "🧗" },
            { id: "tu-hoc", label: "Tự học", icon: "📚" },
            { id: "nhan-ai", label: "Nhân ái", icon: "❤️" },
            { id: "trach-nhiem", label: "Trách nhiệm", icon: "🫱" },
            { id: "uoc-mo", label: "Ước mơ", icon: "🌟" }
        ];

        let filtersHTML = '<button class="filter-button active" data-filter="all">Tất cả</button>';
        categories.forEach(c => {
            filtersHTML += `<button class="filter-button" data-filter="${c.id}">${c.label}</button>`;
        });

        let sidebarHTML = '<li><button class="category-item active" data-filter="all"><span>Tất cả</span><span class="category-count" id="count-all">0</span></button></li>';
        categories.forEach(c => {
            sidebarHTML += `<li><button class="category-item" data-filter="${c.id}"><span>${c.icon || '📌'} ${c.label}</span><span class="category-count" id="count-${c.id}">0</span></button></li>`;
        });


        component.innerHTML += `
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
                    <div class="filters">${filtersHTML}</div>
                </section>

                <section class="content-grid">
                    <aside class="sidebar" style="position: static; top: auto;">
                        <div class="sidebar-title">Nhóm dẫn chứng</div>
                        <ul class="category-list">${sidebarHTML}</ul>
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
        `;

        this.bind(component, evidenceData, categories);

        return component;
    }

    static bind(component, evidenceData, categories) {
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
            const cat = categories.find(c => c.id === id);
            return cat ? cat.label : id;
        }


        function updateStatistics() {
            totalEvidence.textContent = evidenceData.length;
            totalCategories.textContent = getAllCategories().length;
            verifiedEvidence.textContent = evidenceData.filter(e => e.verified).length;
            reusableEvidence.textContent = evidenceData.filter(e => (e.usableFor || []).length >= 2).length;

            component.querySelector("#count-all").textContent = evidenceData.length;

            getAllCategories().forEach(category => {
                const element = component.querySelector(`#count-${category}`);
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
            resultCount.textContent = `${results.length} dẫn chứng`;

            if (!results.length) {
                evidenceGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔎</div>
                        <strong>Chưa tìm thấy dẫn chứng phù hợp</strong>
                        <p>Hãy thử một từ khóa hoặc nhóm vấn đề khác.</p>
                    </div>`;
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
                ? `<span class="verified">✓ Đã kiểm chứng</span>`
                : `<span class="verified" style="color:#9ca3af">○ Chưa kiểm chứng</span>`;
            
            const tagsHTML = (evidence.keywords || []).map(keyword => `<span class="tag">${keyword}</span>`).join("");

            return `
                <article class="evidence-card">
                    <div class="card-top">
                        <span class="evidence-type">${evidence.type === "person" ? "NHÂN VẬT" : "SỰ KIỆN"}</span>
                        ${verifiedHTML}
                    </div>
                    <h4 class="evidence-name">${evidence.name}</h4>
                    <p class="core-fact">${evidence.coreFact}</p>
                    <div class="tags">${tagsHTML}</div>
                    <div class="card-divider"></div>
                    <div class="analysis-label">Góc phân tích</div>
                    <p class="analysis">${analysis}</p>
                    <div class="card-footer">
                        <span class="usable-label">Dùng cho ${(evidence.usableFor || []).length} vấn đề</span>
                        <button class="detail-button" data-id="${evidence.id}">Xem chi tiết →</button>
                    </div>
                </article>`;
        }

        function openEvidence(id) {
            const evidence = evidenceData.find(item => item.id === id);
            if (!evidence) return;
            
            modalName.textContent = evidence.name;
            const analysisHTML = (evidence.usableFor || []).map(issue => {
                const analysis = (evidence.analysis || {})[issue];
                if (!analysis) return "";
                return `
                    <div class="analysis-item">
                        <strong>${getCategoryLabel(issue)}</strong>
                        <span>${analysis}</span>
                    </div>`;
            }).join("");
            
            const keywordsHTML = (evidence.keywords || []).map(keyword => `<span class="tag">${keyword}</span>`).join("");

            modalContent.innerHTML = `
                <div class="detail-section">
                    <h4>Sự kiện cốt lõi</h4>
                    <p>${evidence.coreFact}</p>
                </div>
                <div class="detail-section">
                    <h4>Từ khóa</h4>
                    <div class="tags">${keywordsHTML}</div>
                </div>
                <div class="detail-section">
                    <h4>Có thể sử dụng cho</h4>
                    <p>${(evidence.usableFor || []).map(getCategoryLabel).join(" · ")}</p>
                </div>
                <div class="detail-section">
                    <h4>Góc phân tích</h4>
                    <div class="analysis-list">${analysisHTML}</div>
                </div>
                <div class="detail-section">
                    <h4>Nguồn</h4>
                    <div class="source-box">${evidence.source || 'N/A'}</div>
                </div>`;
                
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
