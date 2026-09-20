const fs = require('fs');
const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/07b-viet-doan-van-bieu-cam.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const vocabStep = {
    "id": "vocab_01",
    "type": "cheatSheet",
    "data": {
        "ui": { "component": "card_list" },
        "prompt": "Túi bảo bối từ vựng Biểu cảm",
        "items": [
            { "icon": "😢", "title": "Cảm xúc buồn, nuối tiếc", "question": "rưng rưng, nghẹn ngào, bâng khuâng, xót xa, tái tê, bùi ngùi" },
            { "icon": "😄", "title": "Cảm xúc vui vẻ, háo hức", "question": "hân hoan, rạo rực, khấp khởi, hồ hởi" },
            { "icon": "✨", "title": "Từ tượng hình (gợi tả)", "question": "heo hút, mờ ảo, hun hút, chót vót, ngoằn ngoèo" }
        ],
        "keyMessage": "Để bài văn biểu cảm không bị khô khan, em hãy 'bỏ túi' ngay những từ láy và tính từ gợi cảm xúc này nhé!",
        "practiceButton": { "label": "Vào thử thách viết →" }
    }
};

const finalChallengeIndex = data.steps.findIndex(s => s.id === 'finalChallenge_01');
if (finalChallengeIndex !== -1) {
    // Only insert if it doesn't already exist
    if (!data.steps.find(s => s.id === 'vocab_01')) {
        data.steps.splice(finalChallengeIndex, 0, vocabStep);
    }
}

const finalChallenge = data.steps.find(s => s.id === 'finalChallenge_01');
if (finalChallenge && finalChallenge.data && finalChallenge.data.stages) {
    const writingStage = finalChallenge.data.stages.find(s => s.key === 'writing');
    if (writingStage) {
        writingStage.hints = [
            { "label": "Cảm xúc buồn", "words": ["rưng rưng", "nghẹn ngào", "bâng khuâng", "xót xa"] },
            { "label": "Cảm xúc vui", "words": ["hân hoan", "rạo rực", "khấp khởi", "hồ hởi"] },
            { "label": "Từ tượng hình", "words": ["heo hút", "mờ ảo", "hun hút", "chót vót", "ngoằn ngoèo"] }
        ];
    }
}

// Add vocab_01 to requiredSections in completion block if it exists
if (data.completion && data.completion.requiredSections) {
    if (!data.completion.requiredSections.includes('vocab_01')) {
        data.completion.requiredSections.push('vocab_01');
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('JSON Patched successfully.');
