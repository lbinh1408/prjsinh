const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || path.join(__dirname, '../data/lessons/cau');

function migrateFile(filePath) {
    console.log(`Migrating: ${filePath}`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(rawData);
    } catch (e) {
        console.error(`Error parsing JSON for ${filePath}: ${e.message}`);
        return;
    }

    // 1. Create meta object if missing
    if (!data.meta) {
        data.meta = {};
    }

    // 2. Move root metadata to meta object
    const fieldsToMove = ['module', 'difficulty', 'xp', 'stars', 'description', 'prerequisite', 'unlock', 'reviewMode'];
    fieldsToMove.forEach(field => {
        if (data[field] !== undefined) {
            data.meta[field] = data[field];
            delete data[field];
        }
    });

    // Handle estimatedTime -> durationMinutes
    if (data.estimatedTime !== undefined) {
        data.meta.durationMinutes = data.estimatedTime;
        delete data.estimatedTime;
    }

    // 3. Rename objectives to learningGoals
    if (data.objectives !== undefined) {
        data.learningGoals = data.objectives;
        delete data.objectives;
    }

    // 4. Migrate steps
    if (Array.isArray(data.steps)) {
        data.steps = data.steps.map(step => {
            if (!step.data) {
                step.data = {};
            }
            
            ['title', 'instruction', 'score', 'question'].forEach(field => {
                if (step[field] !== undefined) {
                    step.data[field] = step[field];
                    delete step[field];
                }
            });

            return step;
        });
    }

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Done: ${filePath}`);
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    files.forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.json')) {
            migrateFile(fullPath);
        }
    });
}

processDirectory(targetDir);
console.log('Migration complete for directory:', targetDir);
