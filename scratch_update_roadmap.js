const fs = require('fs');

const roadmapPath = '/Users/doducqunynhtram/Documents/projects/prjvan/data/roadmap.json';
const roadmapData = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

let tuLoaiModule;
for (const module of roadmapData.modules) {
    if (module.subjects) {
        tuLoaiModule = module.subjects.find(s => s.id === "tu-loai");
        if (tuLoaiModule) break;
    }
}

if (tuLoaiModule) {
    const newLesson = {
        "id": "tu-loai.13-danh-sach-tu-loai",
        "title": "Sổ tay từ loại",
        "file": "13-danh-sach-tu-loai.json",
        "difficulty": 2,
        "estimated": 15,
        "enabled": true
    };
    
    // Avoid duplicate
    if (!tuLoaiModule.lessons.some(l => l.id === newLesson.id)) {
        tuLoaiModule.lessons.push(newLesson);
        fs.writeFileSync(roadmapPath, JSON.stringify(roadmapData, null, 2));
        console.log("Updated roadmap.json");
    } else {
        console.log("Already exists in roadmap.json");
    }
} else {
    console.log("Could not find tu-loai module");
}
