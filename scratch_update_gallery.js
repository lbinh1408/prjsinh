const fs = require('fs');

// 1. Rewrite evidenceGallery.js to be dynamic
const jsPath = '/Users/doducqunynhtram/Documents/projects/prjvan/js/components/evidenceGallery.js';
let jsContent = fs.readFileSync(jsPath, 'utf8');

const dynamicHTML = `
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
            filtersHTML += \`<button class="filter-button" data-filter="\${c.id}">\${c.label}</button>\`;
        });

        let sidebarHTML = '<li><button class="category-item active" data-filter="all"><span>Tất cả</span><span class="category-count" id="count-all">0</span></button></li>';
        categories.forEach(c => {
            sidebarHTML += \`<li><button class="category-item" data-filter="\${c.id}"><span>\${c.icon || '📌'} \${c.label}</span><span class="category-count" id="count-\${c.id}">0</span></button></li>\`;
        });
`;

jsContent = jsContent.replace(/<div class="filters">[\s\S]*?<\/div>/, '<div class="filters">${filtersHTML}</div>');
jsContent = jsContent.replace(/<ul class="category-list">[\s\S]*?<\/ul>/, '<ul class="category-list">${sidebarHTML}</ul>');

jsContent = jsContent.replace('const evidenceData = data.evidences || [];', 'const evidenceData = data.evidences || [];' + dynamicHTML);

// Also need to make getCategoryLabel dynamic
const getCategoryLabelReplacement = `
        function getCategoryLabel(id) {
            const cat = categories.find(c => c.id === id);
            return cat ? cat.label : id;
        }
`;

jsContent = jsContent.replace(/function getCategoryLabel[\s\S]*?return labels\[id\] \|\| id;\s*\}/, getCategoryLabelReplacement);
jsContent = jsContent.replace(/this\.bind\(component, evidenceData\);/, 'this.bind(component, evidenceData, categories);');
jsContent = jsContent.replace(/static bind\(component, evidenceData\) \{/, 'static bind(component, evidenceData, categories) {');

fs.writeFileSync(jsPath, jsContent);

// 2. Create 13-danh-sach-tu-loai.json
const tuLoaiData = {
    "id": "tu-loai.13-danh-sach-tu-loai",
    "title": "Sổ tay từ loại",
    "type": "skill",
    "version": "1.0.0",
    "meta": {
        "module": "tu-loai",
        "lessonNumber": 13,
        "durationMinutes": 30,
        "difficulty": "intermediate",
        "skill": "danh-sach-tu-loai",
        "description": "Sổ tay tra cứu các từ loại tiếng Việt."
    },
    "learningGoals": [
        "Tra cứu và ôn tập kiến thức về từ loại."
    ],
    "completion": {
        "requiredSections": ["gallery_01"],
        "action": "completeLesson",
        "message": "Em đã hoàn thành Sổ tay từ loại."
    },
    "steps": [
        {
            "id": "gallery_01",
            "type": "evidenceGallery",
            "data": {
                "categories": [
                    { "id": "danh-tu", "label": "Danh từ", "icon": "📦" },
                    { "id": "dong-tu", "label": "Động từ", "icon": "🏃" },
                    { "id": "tinh-tu", "label": "Tính từ", "icon": "✨" },
                    { "id": "dai-tu", "label": "Đại từ", "icon": "👤" },
                    { "id": "so-tu", "label": "Số từ", "icon": "🔢" },
                    { "id": "luong-tu", "label": "Lượng từ", "icon": "⚖️" },
                    { "id": "chi-tu", "label": "Chỉ từ", "icon": "👉" },
                    { "id": "quan-he-tu", "label": "Quan hệ từ", "icon": "🔗" },
                    { "id": "tinh-thai-tu", "label": "Tình thái từ", "icon": "🎭" }
                ],
                "evidences": [
                    {
                        "id": "danh-tu-chung",
                        "name": "Danh từ",
                        "keywords": ["sự vật", "người", "vật", "hiện tượng", "khái niệm"],
                        "coreFact": "Là những từ chỉ người, vật, hiện tượng, khái niệm...",
                        "usableFor": ["danh-tu"],
                        "analysis": {
                            "danh-tu": "Dấu hiệu nhận biết: Có thể kết hợp với các từ chỉ số lượng ở phía trước (những, các, một...) và các chỉ từ ở phía sau (này, kia, ấy...)."
                        },
                        "source": "Sách giáo khoa Ngữ văn",
                        "verified": true,
                        "type": "concept"
                    },
                    {
                        "id": "dong-tu-chung",
                        "name": "Động từ",
                        "keywords": ["hành động", "trạng thái"],
                        "coreFact": "Là những từ chỉ hành động, trạng thái của sự vật.",
                        "usableFor": ["dong-tu"],
                        "analysis": {
                            "dong-tu": "Dấu hiệu nhận biết: Thường kết hợp với các từ: đã, sẽ, đang, cũng, vẫn, hãy, đừng, chớ..."
                        },
                        "source": "Sách giáo khoa Ngữ văn",
                        "verified": true,
                        "type": "concept"
                    },
                    {
                        "id": "tinh-tu-chung",
                        "name": "Tính từ",
                        "keywords": ["đặc điểm", "tính chất"],
                        "coreFact": "Là những từ chỉ đặc điểm, tính chất của sự vật, hành động, trạng thái.",
                        "usableFor": ["tinh-tu"],
                        "analysis": {
                            "tinh-tu": "Dấu hiệu nhận biết: Thường kết hợp với các từ chỉ mức độ: rất, hơi, quá, lắm..."
                        },
                        "source": "Sách giáo khoa Ngữ văn",
                        "verified": true,
                        "type": "concept"
                    },
                    {
                        "id": "dai-tu-chung",
                        "name": "Đại từ",
                        "keywords": ["trỏ", "hỏi", "thay thế"],
                        "coreFact": "Dùng để trỏ người, sự vật, hoạt động, tính chất... hoặc dùng để hỏi.",
                        "usableFor": ["dai-tu"],
                        "analysis": {
                            "dai-tu": "Phân loại: Đại từ để trỏ (tôi, tao, tớ, bấy nhiêu...) và Đại từ để hỏi (ai, gì, nào, bao nhiêu...)."
                        },
                        "source": "Sách giáo khoa Ngữ văn",
                        "verified": true,
                        "type": "concept"
                    },
                    {
                        "id": "quan-he-tu-chung",
                        "name": "Quan hệ từ",
                        "keywords": ["nối", "biểu thị ý nghĩa"],
                        "coreFact": "Dùng để biểu thị các ý nghĩa quan hệ như sở hữu, so sánh, nhân quả... giữa các bộ phận của câu hay giữa câu với câu trong đoạn văn.",
                        "usableFor": ["quan-he-tu"],
                        "analysis": {
                            "quan-he-tu": "Ví dụ: và, với, hay, hoặc, nhưng, mà, thì, của, ở, tại, bằng, như, để, về..."
                        },
                        "source": "Sách giáo khoa Ngữ văn",
                        "verified": true,
                        "type": "concept"
                    }
                ]
            }
        }
    ]
};
fs.writeFileSync('/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/tu-loai/13-danh-sach-tu-loai.json', JSON.stringify(tuLoaiData, null, 4));

