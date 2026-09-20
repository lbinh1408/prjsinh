const fs = require('fs');
const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/01-dan-chung-da-nang.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const ds2 = {
    "id": "discover_02",
    "type": "cheatSheet",
    "data": {
        "ui": { "component": "card_list" },
        "prompt": "THẺ DẪN CHỨNG ĐA NĂNG #2 (Tình Yêu Quê Hương & Trách Nhiệm)",
        "items": [
            { "icon": "🔥", "title": "Các chiến sĩ PCCC hy sinh", "question": "Những người lính cứu hỏa đã dũng cảm lao vào biển lửa cứu người, gác lại gia đình và tuổi trẻ phía sau." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Sự hy sinh thầm lặng, Tinh thần dũng cảm, Lòng yêu nước thời bình, Trách nhiệm xã hội." },
            { "icon": "🥇", "title": "Hoàng Xuân Vinh", "question": "Xạ thủ giành HCV Olympic đầu tiên cho Thể thao Việt Nam ở tuổi 42 sau bao lần thất bại." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Khát vọng cống hiến, Bản lĩnh vượt qua áp lực, Đam mê và Thành công." },
            { "icon": "🇻🇳", "title": "Chuyến bay giải cứu công dân mùa dịch", "question": "Những y bác sĩ, tiếp viên hàng không sẵn sàng đối mặt sinh tử để đưa đồng bào vùng dịch về nước." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Tinh thần đoàn kết, Tình đồng bào, Lòng nhân ái." }
        ],
        "keyMessage": "Với những chủ đề lớn lao về xã hội và quốc gia, hãy dùng những tấm gương bám sát thời sự!",
        "practiceButton": { "label": "Xem Thẻ dẫn chứng tiếp theo →" }
    }
};

const ds3 = {
    "id": "discover_03",
    "type": "cheatSheet",
    "data": {
        "ui": { "component": "card_list" },
        "prompt": "THẺ DẪN CHỨNG ĐA NĂNG #3 (Sự Tự Tin & Chấp Nhận Bản Thân)",
        "items": [
            { "icon": "👑", "title": "H'Hen Niê", "question": "Cô gái Ê-đê từ chối hủ tục lấy chồng sớm, vượt lên định kiến để lọt Top 5 Miss Universe thế giới." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Sự tự tin, Dám khác biệt, Phá bỏ định kiến, Tuổi trẻ và ước mơ." },
            { "icon": "🎵", "title": "Nhạc sĩ khiếm thị Hà Chương", "question": "Dù mất đi ánh sáng từ năm 2 tuổi nhưng bằng tình yêu âm nhạc, anh đã đỗ thủ khoa Nhạc viện." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Chấp nhận khiếm khuyết, Đam mê bùng cháy, Sống ý nghĩa." },
            { "icon": "🌱", "title": "Cậu bé Đỗ Nhật Nam", "question": "Trở thành dịch giả, tác giả sách từ khi còn rất nhỏ nhờ phương pháp giáo dục đúng đắn và tự học." },
            { "icon": "💡", "title": "Dùng cho đề bài:", "question": "Sự tự học, Tầm quan trọng của gia đình, Chủ động trong cuộc sống." }
        ],
        "keyMessage": "Ghi nhớ thêm 6 dẫn chứng mới này, kho vũ khí của em giờ đã đủ sức 'xuyên phá' mọi đề tài!",
        "practiceButton": { "label": "Vào bài thực hành →" }
    }
};

const discoverIndex = data.steps.findIndex(s => s.id === 'discover_01');
if (discoverIndex !== -1) {
    if (!data.steps.find(s => s.id === 'discover_02')) {
        data.steps.splice(discoverIndex + 1, 0, ds2, ds3);
        // Change button of discover_01
        data.steps[discoverIndex].data.practiceButton.label = "Xem Thẻ dẫn chứng tiếp theo →";
    }
}

// Add to requiredSections
if (data.completion && data.completion.requiredSections) {
    if (!data.completion.requiredSections.includes('discover_02')) {
        const d1Idx = data.completion.requiredSections.indexOf('discover_01');
        data.completion.requiredSections.splice(d1Idx + 1, 0, 'discover_02', 'discover_03');
    }
}

// Add to final hints
const finalChallenge = data.steps.find(s => s.id === 'finalChallenge_01');
if (finalChallenge && finalChallenge.data && finalChallenge.data.stages) {
    const writingStage = finalChallenge.data.stages.find(s => s.key === 'writing');
    if (writingStage) {
        // Expand the hints
        writingStage.hints = [
            { "label": "NGHỊ LỰC / VƯỢT KHÓ", "words": ["Nick Vujicic", "Hoàng Xuân Vinh", "nhạc sĩ Hà Chương"] },
            { "label": "TÌNH YÊU THƯƠNG / TRÁCH NHIỆM", "words": ["Quán cơm Nụ Cười", "chiến sĩ PCCC", "chuyến bay giải cứu"] },
            { "label": "TỰ TIN / ƯỚC MƠ", "words": ["H'Hen Niê", "Đỗ Nhật Nam"] },
            { "label": "TỪ CHUYỂN Ý", "words": ["Thật vậy,", "Minh chứng sống động nhất là", "Qua câu chuyện trên,"] }
        ];
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Dan chung JSON Patched successfully.');
