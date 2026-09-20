const fs = require('fs');
const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-bai-van/10-viet-bai-van-mieu-ta.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const vocabStep = {
    "id": "vocab_01",
    "type": "cheatSheet",
    "data": {
        "ui": { "component": "card_list" },
        "prompt": "Túi bảo bối từ vựng Miêu tả",
        "items": [
            { "icon": "🔊", "title": "Từ tượng thanh (Âm thanh)", "question": "rào rào, lộp bộp, róc rách, xào xạc, vi vu, ầm ĩ, tí tách, đùng đoàng" },
            { "icon": "🖼️", "title": "Từ tượng hình (Hình ảnh)", "question": "ngoằn ngoèo, sừng sững, mênh mông, bát ngát, chót vót, um tùm, khẳng khiu, lấp lánh" },
            { "icon": "🌈", "title": "Màu sắc & Ánh sáng", "question": "rực rỡ, chói chang, ảm đạm, xám xịt, le lói, mờ ảo" }
        ],
        "keyMessage": "Bí quyết miêu tả sinh động là dùng thật nhiều từ tượng thanh và từ tượng hình để đánh thức các giác quan của người đọc!",
        "practiceButton": { "label": "Vào thử thách viết →" }
    }
};

const finalChallengeIndex = data.steps.findIndex(s => s.id === 'finalChallenge_01');
if (finalChallengeIndex !== -1) {
    if (!data.steps.find(s => s.id === 'vocab_01')) {
        data.steps.splice(finalChallengeIndex, 0, vocabStep);
    }
}

const finalChallenge = data.steps.find(s => s.id === 'finalChallenge_01');
if (finalChallenge && finalChallenge.data && finalChallenge.data.stages) {
    const writingStage = finalChallenge.data.stages.find(s => s.key === 'writing');
    if (writingStage) {
        writingStage.hints = [
            { "label": "Âm thanh", "words": ["rào rào", "lộp bộp", "xào xạc", "ầm ĩ", "tí tách", "đùng đoàng"] },
            { "label": "Hình ảnh", "words": ["ngoằn ngoèo", "sừng sững", "mênh mông", "chót vót", "um tùm", "khẳng khiu"] },
            { "label": "Ánh sáng, màu sắc", "words": ["rực rỡ", "chói chang", "xám xịt", "ảm đạm", "le lói"] }
        ];
    }
}

if (data.completion && data.completion.requiredSections) {
    if (!data.completion.requiredSections.includes('vocab_01')) {
        data.completion.requiredSections.push('vocab_01');
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Miêu tả JSON Patched successfully.');
