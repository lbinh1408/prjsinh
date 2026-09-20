const fs = require('fs');
const filePath = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/05-dien-dat-hay.json';
const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const stepsArray = json.steps || json.lesson_plan;

const normalized = {
    id: "viet-doan-van-06",
    title: json.title || "Diễn đạt hay và tránh lỗi",
    type: "skill",
    version: "1.0.0",
    meta: {
        module: "viet-doan-van",
        lessonNumber: 6,
        durationMinutes: 20,
        difficulty: "intermediate",
        skill: "dien-dat",
        description: json.description || json.subtitle || "Học cách viết câu gọn, rõ, đúng và mượt."
    },
    learningGoals: [
        "Nhận ra một câu đúng có thể chưa hay.",
        "Biết cách bắt lỗi câu văn.",
        "Biết cách làm gọn, làm rõ, làm đúng và mượt câu văn."
    ],
    completion: {
        requiredSections: [
            "story",
            "observe",
            "discover",
            "teach",
            "guidedPractice",
            "miniChallenge",
            "reflection",
            "cheatSheet",
            "finalChallenge"
        ],
        action: "completeLesson",
        message: "🎉 Em đã hoàn thành bài Diễn đạt hay!"
    },
    steps: stepsArray.map((step, index) => {
        let newType = step.type;
        if (newType === 'guidedPractice') newType = 'guided_practice';
        if (newType === 'miniChallenge') newType = 'mini_challenge';
        if (newType === 'finalChallenge') newType = 'final_challenge';
        if (newType === 'cheatSheet') newType = 'cheat_sheet';
        
        const newStep = {
            id: step.id || (newType + "_" + index),
            type: newType,
            data: {}
        };
        for (const key in step) {
            if (key !== 'id' && key !== 'type' && key !== 'data') {
                newStep.data[key] = step[key];
            }
        }
        // If data was already nested, merge it
        if (step.data) {
            Object.assign(newStep.data, step.data);
        }
        return newStep;
    })
};

fs.writeFileSync(filePath, JSON.stringify(normalized, null, 4));
console.log('Normalized!');
