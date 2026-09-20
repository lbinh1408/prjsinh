const fs = require('fs');
const path = require('path');

const dir = '.';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '01-danh-tu.json' && f !== '02-dong-tu.json');

const baseKeys = ['id', 'type', 'title', 'instruction', 'score', 'validator'];

files.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    let json;
    try {
        json = JSON.parse(content);
    } catch (e) {
        console.error('Failed to parse', file);
        return;
    }

    if (json.steps) {
        json.steps = json.steps.map(step => {
            // If already migrated, skip
            if (step.data !== undefined) {
                return step;
            }

            const newStep = {};
            const data = {};

            for (const key in step) {
                if (baseKeys.includes(key)) {
                    newStep[key] = step[key];
                } else {
                    data[key] = step[key];
                }
            }

            // Only add data if it has keys
            if (Object.keys(data).length > 0) {
                newStep.data = data;
            }

            return newStep;
        });
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf8');
    console.log('Migrated', file);
});
