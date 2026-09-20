const fs = require('fs');
const path = '/Users/doducqunynhtram/Documents/projects/prjvan/data/lessons/tu-loai/13-danh-sach-tu-loai.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// If it already has steps, do nothing
if (data.steps && data.steps.length > 0) {
    console.log("Already has steps");
} else {
    // Extract root properties that belong to the lesson definition
    const { id, title, type, version, meta, learningGoals, usageGuide, map, wordTypes, comparison, contextMicroscope, commonTraps, examStrategy, miniPractice, quickClassifier, navigation, quickNote, reflection } = data;

    // We keep the lesson metadata at the root, and move the specific content into steps[0].data
    const newData = {
        id: id,
        title: title,
        type: type, // lesson type
        version: version,
        meta: meta,
        learningGoals: learningGoals,
        steps: [
            {
                id: "step_1",
                type: "reference", // component type
                data: {
                    usageGuide,
                    map,
                    wordTypes,
                    comparison,
                    contextMicroscope,
                    commonTraps,
                    examStrategy,
                    miniPractice,
                    quickClassifier,
                    navigation,
                    quickNote,
                    reflection
                }
            }
        ]
    };

    fs.writeFileSync(path, JSON.stringify(newData, null, 4));
    console.log("Fixed JSON structure");
}
