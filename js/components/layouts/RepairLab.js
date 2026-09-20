import ConnectionMap from "../connectionMap.js";

export default class RepairLab {
    static render(step) {
        const data = step.data || step;
        const component = document.createElement("div");
        component.className = "component guided-practice-component";
        
        const links = data.connectionData?.links || [];
        const totalWeak = links.filter(l => l.status === 'weak' || l.status === 'broken').length;
        let repairedCount = 0;
        
        component.innerHTML = `
            <div class="component-header">
                <h2 class="question-title">${data.task?.title || "Repair Lab"}</h2>
                <p class="question-text">${data.task?.instruction || ""}</p>
            </div>
            
            <div class="repair-progress" style="background: #1e293b; color: white; text-align: center; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 1.1em; letter-spacing: 1px; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: background 0.5s;">
                🔗 <span id="repair-count">0</span> / ${totalWeak} ĐƯỜNG NỐI ĐÃ SỬA
            </div>
            
            <div class="map-container" style="margin-bottom: 20px; padding: 20px; transition: all 0.5s;"></div>
            
            <div class="final-reflection-container" style="display: none; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-top: 20px; animation: fadeIn 0.5s;">
                <div style="font-weight: bold; font-size: 1.1em; color: #166534; margin-bottom: 15px; text-align: center;">
                    ✨ ${data.finalReflection?.question || "Bây giờ đoạn văn đã liền mạch hơn chưa? Vì sao?"}
                </div>
                <div class="reflection-options" style="display: flex; flex-direction: column; gap: 10px;">
                    ${(data.finalReflection?.options || []).map(opt => `
                        <button class="ref-opt-btn" style="padding: 12px; text-align: left; background: white; border: 1px solid #bbf7d0; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 1em; color: #166534;">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="btn-to-next-container" style="display: none; text-align: center; margin-top: 30px;">
                <button class="btn btn-primary" onclick="window.engine && window.engine.next()">Hoàn thành & Tiếp tục</button>
            </div>
        `;
        
        const mapContainer = component.querySelector('.map-container');
        const progressText = component.querySelector('#repair-count');
        const progressContainer = component.querySelector('.repair-progress');
        const btnNext = component.querySelector('.btn-to-next-container');
        const reflectionContainer = component.querySelector('.final-reflection-container');
        
        const context = {
            onUpdate: (linkId, status, answer) => {
                if (status === 'correct') {
                    repairedCount++;
                    progressText.innerText = repairedCount;
                    const linkData = links.find(l => l.id === linkId);
                    if (linkData && linkData.interactiveConfig?.correctSentence) {
                        const sentenceEl = mapContainer.querySelector(`[data-id="${linkData.to}"]`);
                        if (sentenceEl) {
                            sentenceEl.innerHTML = linkData.interactiveConfig.correctSentence;
                            sentenceEl.style.background = "#eff6ff"; 
                            sentenceEl.style.transition = "background 0.5s";
                            setTimeout(() => { sentenceEl.style.background = "white"; }, 1000);
                        }
                    }
                    
                    if (repairedCount >= totalWeak) {
                        progressContainer.style.background = "#16a34a";
                        progressContainer.innerHTML = `✨ ĐOẠN VĂN ĐÃ HOÀN THIỆN! ✨`;
                        
                        // Light up the map
                        mapContainer.style.background = "#f8fafc";
                        mapContainer.style.borderRadius = "16px";
                        mapContainer.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.2)";
                        mapContainer.style.border = "1px solid #bbf7d0";
                        
                        if (data.finalReflection) {
                            reflectionContainer.style.display = "block";
                            setTimeout(() => {
                                reflectionContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            }, 500);
                            
                            const refBtns = reflectionContainer.querySelectorAll('.ref-opt-btn');
                            refBtns.forEach(btn => {
                                btn.addEventListener('click', () => {
                                    if (btn.innerText.trim() === data.finalReflection.correct) {
                                        btn.style.background = "#22c55e";
                                        btn.style.color = "white";
                                        refBtns.forEach(b => {
                                            if (b !== btn) {
                                                b.style.opacity = "0.5";
                                                b.style.pointerEvents = "none";
                                            }
                                        });
                                        btnNext.style.display = "block";
                                        setTimeout(() => btnNext.scrollIntoView({ behavior: 'smooth', block: 'end' }), 500);
                                    } else {
                                        btn.style.background = "#fee2e2";
                                        btn.style.borderColor = "#ef4444";
                                        btn.style.color = "#ef4444";
                                        btn.style.transform = "translate(5px)";
                                        setTimeout(() => btn.style.transform = "translate(-5px)", 50);
                                        setTimeout(() => btn.style.transform = "translate(0)", 100);
                                    }
                                });
                            });
                        } else {
                            btnNext.style.display = "block";
                            setTimeout(() => {
                                btnNext.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            }, 500);
                        }
                    }
                }
            }
        };
        
        const mapEl = ConnectionMap.render(data.connectionData, context);
        mapContainer.appendChild(mapEl);
        
        // Highlight weak links
        requestAnimationFrame(() => {
            const badges = mapContainer.querySelectorAll('.link-badge');
            badges.forEach((badge, index) => {
                const linkData = links[index];
                if (linkData && (linkData.status === 'weak' || linkData.status === 'broken')) {
                    badge.style.cursor = "pointer";
                    badge.style.border = "2px solid #f59e0b";
                    badge.style.color = "#d97706";
                    
                    const lineWrap = badge.closest('.c-sentence-link');
                    if (lineWrap) {
                        const parts = lineWrap.querySelectorAll('div[style*="width: 4px"]');
                        parts.forEach(p => p.style.backgroundColor = "#f59e0b");
                    }
                }
            });
        });
        
        return component;
    }
}
