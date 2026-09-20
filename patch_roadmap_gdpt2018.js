const fs = require('fs');
const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/roadmap.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Add 'giai-ma-van-ban' to 'kien-thuc-van-hoc' module
const ktvhModule = data.modules.find(m => m.id === 'kien-thuc-van-hoc');
if (ktvhModule && ktvhModule.subjects) {
    if (!ktvhModule.subjects.find(s => s.id === 'giai-ma-van-ban')) {
        ktvhModule.subjects.push({
            "id": "giai-ma-van-ban",
            "name": "Giải mã văn bản (GDPT 2018)",
            "icon": "🕵️",
            "color": "#9C27B0",
            "description": "Bộ công cụ vạn năng để phân tích thơ và truyện ngoài SGK",
            "folder": "lessons/kien-thuc-van-hoc/",
            "enabled": true,
            "lessons": [
                {
                    "id": "kien-thuc.05-giai-ma-tho-hien-dai",
                    "title": "Giải mã Thơ hiện đại",
                    "file": "05-giai-ma-tho-hien-dai.json",
                    "difficulty": 3,
                    "estimated": 30,
                    "enabled": true
                },
                {
                    "id": "kien-thuc.06-giai-ma-van-xuoi",
                    "title": "Giải mã Truyện ngắn",
                    "file": "06-giai-ma-van-xuoi.json",
                    "difficulty": 3,
                    "estimated": 30,
                    "enabled": true
                }
            ]
        });
    }
}

// 2. Add 'kho-dan-chung' to 'viet-doan-van' module
const vdvModule = data.modules.find(m => m.id === 'viet-doan-van');
if (vdvModule && vdvModule.subjects) {
    // Insert it before the first subject so it's prominent, or just unshift
    if (!vdvModule.subjects.find(s => s.id === 'kho-dan-chung')) {
        vdvModule.subjects.unshift({
            "id": "kho-dan-chung",
            "name": "Trạm Sạc Dẫn Chứng",
            "icon": "🔋",
            "color": "#FF5722",
            "description": "Kho dẫn chứng NLXH đa năng",
            "folder": "lessons/viet-doan-van/",
            "enabled": true,
            "lessons": [
                {
                    "id": "viet-doan-van.01-dan-chung-da-nang",
                    "title": "Dẫn chứng đa năng 1",
                    "file": "01-dan-chung-da-nang.json",
                    "difficulty": 1,
                    "estimated": 20,
                    "enabled": true
                }
            ]
        });
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Roadmap patched successfully.');
