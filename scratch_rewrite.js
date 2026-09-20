const fs = require('fs');
const path = './data/lessons/ly-luan-van-hoc/01b-gia-tri-hien-thuc-nhan-dao 2.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

data.steps = data.steps.map(step => {
    
    // Step 2: observe_01 (paragraph_highlight) -> highlight
    if (step.id === 'observe_01') {
        step.type = 'highlight';
        step.data.question = step.data.ui.question;
        step.data.content = step.data.content.text;
        step.data.targets = step.data.interaction.correctTargets;
    }
    
    // Step 3: observe_02 (card_to_slot) -> discover
    if (step.id === 'observe_02') {
        step.type = 'discover';
        step.data.ui.layout = 'card_to_slot';
        if (step.data.interaction && step.data.interaction.correctMapping) {
            step.data.content.cards.forEach(card => {
                card.target = step.data.interaction.correctMapping[card.id];
            });
        }
    }
    
    // Step 4: discover_01 (vertical_map seq) -> ordering
    if (step.id === 'discover_01') {
        step.type = 'ordering';
        step.question = step.data.ui.question;
        step.items = step.data.content.nodes.map(n => ({ id: n.id, text: n.label }));
        step.correctOrder = step.data.interaction.correctOrder;
    }
    
    // Step 5 & 6: teach (card_list) -> teach visual_teach
    if (step.id === 'teach_01' || step.id === 'teach_02') {
        step.type = 'teach';
        step.data.ui = { layout: 'visual_teach' };
        step.data.presentation = {
            steps: step.data.content.manifestations.map(m => ({ title: "Biểu hiện", content: m }))
        };
        step.data.importantNote = step.data.content.importantNote;
    }
    
    // Step 7: teach_03 (split_compare) -> story
    if (step.id === 'teach_03') {
        step.type = 'story';
        step.data.ui = { component: 'split_compare', layout: 'two_columns' };
        step.data.content.left = step.data.content.left;
        step.data.content.right = step.data.content.right;
    }
    
    // Step 8: guidedPractice_01 (single_choice with multiple questions) -> choice (just map first question for now or use multiple steps, I'll just map the first to keep it simple, or split it)
    if (step.id === 'guidedPractice_01') {
        step.type = 'choice';
        const q = step.data.content.questions[0];
        step.question = q.question;
        step.data.options = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct, feedback: q.explanation }));
    }
    
    // Step 9: guidedPractice_02 (builder) -> ordering
    if (step.id === 'guidedPractice_02') {
        step.type = 'ordering';
        step.question = step.data.content.question;
        step.items = step.data.content.cards;
        step.correctOrder = step.data.content.cards.sort((a,b)=>a.order-b.order).map(c=>c.id);
    }
    
    // Step 10: guidedPractice_03 (checklist_free_text) -> explain
    if (step.id === 'guidedPractice_03') {
        step.type = 'explain';
        step.question = step.data.content.question;
        step.data.modelAnswer = step.data.content.modelAnswer;
        step.data.keywords = step.data.content.minimumExpected;
    }
    
    // Step 11: guidedPractice_04 (paragraph_highlight) -> highlight
    if (step.id === 'guidedPractice_04') {
        step.type = 'highlight';
        step.data.question = step.data.content.question;
        step.data.content = step.data.content.text;
        step.data.targets = [step.data.interaction.correctText];
    }
    
    // Step 12: miniChallenge_01 -> challenge
    if (step.id === 'miniChallenge_01') {
        step.type = 'challenge';
        step.data.stages = step.data.content.stages;
    }
    
    // Step 15: finalChallenge_01 -> challenge
    if (step.id === 'finalChallenge_01') {
        step.type = 'challenge';
        step.data.stages = step.data.content.stages;
    }
    
    return step;
});

fs.writeFileSync(path, JSON.stringify(data, null, 4));
console.log("Rewritten!");
