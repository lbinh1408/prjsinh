const fs = require('fs');

const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/03-trinh-bay-doan-van.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const newFormat = {
    "id": "viet-doan-van-04-cac-cach-trinh-bay-doan-van",
    "title": data.title || "Các cách trình bày đoạn văn",
    "type": "skill_lesson",
    "version": "1.0.0",
    "meta": {
        "module": "viet-doan-van",
        "lessonNumber": data.lessonNumber || 5,
        "durationMinutes": 25,
        "difficulty": "beginner",
        "skill": "trinh-bay",
        "description": data.description || ""
    },
    "learningGoals": data.learningGoal?.skills || [],
    "completion": {
        "requiredSections": data.lessonCompletion?.requiredSteps || [
            "story",
            "observe",
            "discover",
            "teach",
            "guided_practice",
            "mini_challenge",
            "reflection",
            "cheat_sheet",
            "final_challenge"
        ],
        "action": "completeLesson",
        "message": "🎉 Em đã hoàn thành bài Các cách trình bày đoạn văn!"
    },
    "steps": (data.steps || []).map(step => {
        // extract id and type
        const { id, type, step: stepNum, ...restData } = step;
        
        let normalizedType = type;
        if (type === 'writing_challenge') normalizedType = 'finalChallenge';
        if (type === 'guided_practice') normalizedType = 'guidedPractice';
        if (type === 'mini_challenge') normalizedType = 'miniChallenge';
        if (type === 'cheat_sheet') normalizedType = 'cheatSheet';
        
        return {
            id: id + '_01',
            type: normalizedType,
            data: restData
        };
    })
};

fs.writeFileSync(path, JSON.stringify(newFormat, null, 4));
console.log("Transformation complete.");
