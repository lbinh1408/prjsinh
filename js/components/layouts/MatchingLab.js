export default class MatchingLab {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component matching-lab";

        const items = data.items || [];
        const labels = data.labels || [];
        const ui = data.ui || {};

        component.innerHTML = `
            <style>
                .mlab-wrapper { max-width: 800px; margin: 0 auto; padding: 20px 0; }
                .mlab-hero { text-align: center; margin-bottom: 40px; }
                .mlab-hero .emoji { font-size: 3rem; margin-bottom: 10px; }
                .mlab-hero h2 { font-size: 2.2rem; color: #1e293b; margin-bottom: 10px; }
                .mlab-hero p { color: #64748b; font-size: 1.1rem; }
                
                .mlab-item-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .mlab-item-text { font-size: 1.2rem; color: #1e293b; font-weight: 500; margin-bottom: 20px; font-style: italic; }
                
                .mlab-labels { display: flex; flex-wrap: wrap; gap: 10px; }
                .mlab-label-btn { padding: 10px 18px; border-radius: 8px; border: 2px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .mlab-label-btn:hover { background: #e2e8f0; }
                .mlab-label-btn.selected { background: #6d5dfc; color: white; border-color: #6d5dfc; }
                .mlab-label-btn.correct { background: #10b981; color: white; border-color: #10b981; }
                .mlab-label-btn.wrong { background: #ef4444; color: white; border-color: #ef4444; }
                
                .mlab-feedback { display: none; margin-top: 15px; padding: 12px; border-radius: 8px; font-weight: 500; animation: fadeIn 0.3s; }
                .mlab-feedback.correct { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; display: block; }
                .mlab-feedback.wrong { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; display: block; }
                
                .mlab-reveal { display: none; margin-top: 30px; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 16px; padding: 24px; text-align: center; animation: fadeIn 0.5s; }
                .mlab-actions { margin-top: 30px; text-align: center; }
                .mlab-btn { background: #6d5dfc; color: white; border: none; padding: 14px 32px; border-radius: 99px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: none; }
                .mlab-btn:hover { background: #5b4be8; }
            </style>
            
            <div class="mlab-wrapper">
                <div class="mlab-hero">
                    <div class="emoji">🧩</div>
                    ${promptText ? `<h2>${promptText}</h2>` : ''}
                    <p>${ui.question || ''}</p>
                </div>
                
                <div class="mlab-items">
                    ${items.map((item, i) => `
                        <div class="mlab-item-card" data-idx="${i}" data-answer="${item.answer}">
                            <div class="mlab-item-text">“${item.text}”</div>
                            <div class="mlab-labels">
                                ${labels.map(l => `<button class="mlab-label-btn" data-val="${l.id}">${l.text}</button>`).join('')}
                            </div>
                            <div class="mlab-feedback"></div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mlab-reveal" id="mreveal">
                    <b>💡 ${data.reveal || ''}</b>
                </div>
                
                <div class="mlab-actions">
                    <button class="mlab-btn" id="mbtn-next">Tiếp tục →</button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const cards = component.querySelectorAll('.mlab-item-card');
            const reveal = component.querySelector('#mreveal');
            const btnNext = component.querySelector('#mbtn-next');
            let correctCount = 0;

            cards.forEach(card => {
                const answer = card.dataset.answer;
                const btns = card.querySelectorAll('.mlab-label-btn');
                const feedback = card.querySelector('.mlab-feedback');
                let solved = false;

                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (solved) return;
                        const val = btn.dataset.val;
                        
                        btns.forEach(b => b.classList.remove('selected', 'wrong'));
                        
                        if (val === answer) {
                            btn.classList.add('correct');
                            feedback.className = 'mlab-feedback correct';
                            feedback.innerHTML = '✨ Chính xác!';
                            solved = true;
                            correctCount++;
                            
                            // disable other buttons
                            btns.forEach(b => { if (b !== btn) b.style.opacity = '0.5'; b.style.cursor = 'default'; });
                            
                            if (correctCount === items.length) {
                                reveal.style.display = 'block';
                                btnNext.style.display = 'inline-block';
                                component.dataset.completed = "true";
                            }
                        } else {
                            btn.classList.add('wrong');
                            feedback.className = 'mlab-feedback wrong';
                            feedback.innerHTML = '❌ Chưa đúng, thử lại xem!';
                        }
                    });
                });
            });

            btnNext.addEventListener('click', () => {
                window.engine && window.engine.next();
            });
        }, 0);

        return component;
    }
}
