const fs = require('fs');
const f1 = require('./data/lessons/ly-luan-van-hoc/01-gia-tri-hien-thuc-nhan-dao.json');
const f2 = require('./data/lessons/ly-luan-van-hoc/01b-gia-tri-hien-thuc-nhan-dao 2.json');

console.log("f1 steps: ", f1.steps.length);
console.log("f2 steps: ", f2.steps.length);

for (let i = 0; i < Math.min(f1.steps.length, 3); i++) {
    console.log(`\nStep ${i} - f1 type:`, f1.steps[i].type, "- f2 type:", f2.steps[i].type);
    console.log("f1 data keys:", Object.keys(f1.steps[i].data));
    console.log("f2 data keys:", Object.keys(f2.steps[i].data));
}
