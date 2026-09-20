const fs = require('fs');
const filePath = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/viet-doan-van/06-viet-cac-kieu-doan-van.json';
const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

if (json.steps) {
    json.steps = json.steps.map(step => {
        // If it already has data wrapper and not much else, skip it, but let's assume it needs wrapping
        // Check if there are other fields besides id, type, and data
        const keys = Object.keys(step);
        const hasOtherFields = keys.some(k => !['id', 'type', 'data'].includes(k));
        
        if (hasOtherFields) {
            const newStep = {
                id: step.id,
                type: step.type,
                data: {}
            };
            
            for (const key of keys) {
                if (key !== 'id' && key !== 'type') {
                    newStep.data[key] = step[key];
                }
            }
            
            // Special cases where type was not provided but can be inferred from id, or if data is already present but other fields are outside
            if (step.data) {
                 // merge step.data into newStep.data if it existed
                 Object.assign(newStep.data, step.data);
                 delete newStep.data.data;
            }
            
            return newStep;
        }
        return step;
    });
}

// ensure root data field doesn't have duplicate or wrong structure
fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
console.log('Normalized 06-viet-cac-kieu-doan-van.json');
