export default class RepairStudio {
    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component guided-practice-component repair-studio-layout";
        
        const sentences = JSON.parse(JSON.stringify(data.connectionData?.sentences || []));
        const links = JSON.parse(JSON.stringify(data.connectionData?.links || []));
        
        let currentSentences = [...sentences];
        let currentLinks = [...links]; // Links represent the connectors

        // UI Wrapper
        component.innerHTML = `
            <div class="component-header" style="text-align: center; margin-bottom: 30px;">
                ${promptText ? `<h2 class="question-title" style="font-size: 1.8em; color: #0f172a; margin-bottom: 10px;">${promptText}</h2>` : ''}
                ${data.task ? `
                    <div style="color: #475569; font-size: 1.1em; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <strong>Đề bài:</strong> ${data.task.prompt}
                    </div>
                ` : ''}
            </div>
            
            <div class="repair-studio-container" style="display: flex; gap: 30px; max-width: 1000px; margin: 0 auto;">
                
                <!-- Workspace Zone -->
                <div class="rs-workspace" style="flex: 2; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 25px; position: relative;">
                    <div style="font-weight: bold; color: #64748b; margin-bottom: 20px; text-align: center; font-size: 1.1em;">🛠️ BÀN LÀM VIỆC</div>
                    <div class="rs-sentences-list" style="display: flex; flex-direction: column; gap: 10px;">
                        <!-- Rendered by JS -->
                    </div>
                </div>
                
                <!-- Preview & Submit Zone -->
                <div class="rs-preview-zone" style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); flex: 1;">
                        <div style="font-weight: bold; color: #3b82f6; margin-bottom: 15px; text-align: center; font-size: 1.1em;">👀 XEM TRƯỚC (PREVIEW)</div>
                        <div class="rs-preview-text" style="color: #334155; font-size: 1.15em; line-height: 1.8; min-height: 150px; padding: 15px; background: #eff6ff; border-radius: 8px;">
                            <!-- Live update -->
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-rs-submit" style="width: 100%; padding: 15px; font-size: 1.2em; border-radius: 12px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">
                        ${data.submission?.button || "🚀 Nộp bài"}
                    </button>
                    
                    <div class="rs-feedback" style="display: none; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; text-align: left; animation: fadeIn 0.5s;">
                        <!-- AI Mock Feedback -->
                    </div>
                    
                    <button class="btn btn-primary btn-rs-next" style="display: none; width: 100%; padding: 15px; font-size: 1.1em; border-radius: 12px;">
                        Tiếp tục →
                    </button>
                </div>
            </div>
            
            <style>
                .rs-sentence-node { background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s; position: relative; }
                .rs-sentence-node:hover { border-color: #94a3b8; transform: translateX(5px); }
                .rs-add-link-btn { align-self: center; background: #e0e7ff; color: #4f46e5; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; font-size: 1.2em; transition: all 0.2s; z-index: 10; margin: -5px 0; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .rs-add-link-btn:hover { background: #4f46e5; color: white; transform: scale(1.1); }
                .rs-connector-node { text-align: center; padding: 5px; color: #0284c7; font-weight: bold; background: #e0f2fe; border-radius: 4px; display: inline-block; margin: 0 auto; cursor: pointer; }
                .rs-action-menu { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; z-index: 100; overflow: hidden; min-width: 120px; }
                .rs-action-btn { padding: 10px 15px; background: none; border: none; text-align: left; cursor: pointer; color: #475569; transition: background 0.2s; font-size: 0.9em; border-bottom: 1px solid #f1f5f9; }
                .rs-action-btn:hover { background: #f8fafc; color: #1e293b; }
                .rs-action-btn.delete { color: #ef4444; }
                .rs-action-btn.delete:hover { background: #fef2f2; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;
        
        const listContainer = component.querySelector('.rs-sentences-list');
        const previewText = component.querySelector('.rs-preview-text');
        
        let activeMenu = null;
        let activeLinkMenu = null;
        
        const closeMenus = () => {
            if (activeMenu) { activeMenu.remove(); activeMenu = null; }
            if (activeLinkMenu) { activeLinkMenu.remove(); activeLinkMenu = null; }
        };
        
        // Render loop
        const renderWorkspace = () => {
            listContainer.innerHTML = '';
            closeMenus();
            
            currentSentences.forEach((s, i) => {
                // Sentence Node
                const sNode = document.createElement('div');
                sNode.className = 'rs-sentence-node';
                sNode.innerText = s.text;
                
                sNode.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeMenus();
                    
                    const menu = document.createElement('div');
                    menu.className = 'rs-action-menu';
                    menu.style.top = '40px';
                    
                    const editBtn = document.createElement('button');
                    editBtn.className = 'rs-action-btn';
                    editBtn.innerHTML = '✏️ Chỉnh sửa';
                    editBtn.onclick = (e) => {
                        e.stopPropagation();
                        closeMenus();
                        sNode.innerHTML = '';
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = s.text;
                        input.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #3b82f6; border-radius: 4px; font-size: 1em; outline: none;';
                        sNode.appendChild(input);
                        input.focus();
                        
                        const saveOnEnter = (ev) => {
                            if (ev.key === 'Enter') {
                                s.text = input.value.trim();
                                renderWorkspace();
                            }
                        };
                        input.addEventListener('keydown', saveOnEnter);
                        input.addEventListener('blur', () => { s.text = input.value.trim(); renderWorkspace(); });
                    };
                    
                    const moveUpBtn = document.createElement('button');
                    moveUpBtn.className = 'rs-action-btn';
                    moveUpBtn.innerHTML = '⬆️ Chuyển lên';
                    moveUpBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (i > 0) {
                            [currentSentences[i - 1], currentSentences[i]] = [currentSentences[i], currentSentences[i - 1]];
                            renderWorkspace();
                        }
                    };
                    
                    const moveDownBtn = document.createElement('button');
                    moveDownBtn.className = 'rs-action-btn';
                    moveDownBtn.innerHTML = '⬇️ Chuyển xuống';
                    moveDownBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (i < currentSentences.length - 1) {
                            [currentSentences[i], currentSentences[i + 1]] = [currentSentences[i + 1], currentSentences[i]];
                            renderWorkspace();
                        }
                    };
                    
                    menu.appendChild(editBtn);
                    if (i > 0) menu.appendChild(moveUpBtn);
                    if (i < currentSentences.length - 1) menu.appendChild(moveDownBtn);
                    
                    sNode.appendChild(menu);
                    activeMenu = menu;
                });
                
                listContainer.appendChild(sNode);
                
                // Link Node (if not last)
                if (i < currentSentences.length - 1) {
                    const nextId = currentSentences[i+1].id;
                    const existingLink = currentLinks.find(l => l.from === s.id && l.to === nextId && l.text);
                    
                    const linkWrapper = document.createElement('div');
                    linkWrapper.style.cssText = 'display: flex; flex-direction: column; position: relative;';
                    
                    if (existingLink) {
                        const connNode = document.createElement('div');
                        connNode.className = 'rs-connector-node';
                        connNode.innerText = existingLink.text;
                        connNode.title = "Click để xóa từ nối này";
                        connNode.onclick = (e) => {
                            e.stopPropagation();
                            currentLinks = currentLinks.filter(l => l !== existingLink);
                            renderWorkspace();
                        };
                        linkWrapper.appendChild(connNode);
                    } else {
                        const addBtn = document.createElement('div');
                        addBtn.className = 'rs-add-link-btn';
                        addBtn.innerText = '+';
                        
                        addBtn.onclick = (e) => {
                            e.stopPropagation();
                            closeMenus();
                            
                            // Find link options from original data
                            const originalLink = links.find(l => l.from === s.id && l.to === nextId) || links[0];
                            const options = originalLink?.interactiveConfig?.options || ["vì vậy", "tuy nhiên", "nhờ đó", "ngoài ra"];
                            
                            const linkMenu = document.createElement('div');
                            linkMenu.className = 'rs-action-menu';
                            linkMenu.style.left = '50%';
                            linkMenu.style.transform = 'translateX(-50%)';
                            linkMenu.style.top = '100%';
                            linkMenu.style.zIndex = '1000';
                            
                            options.forEach(opt => {
                                const optBtn = document.createElement('button');
                                optBtn.className = 'rs-action-btn';
                                optBtn.style.textAlign = 'center';
                                optBtn.innerText = opt;
                                optBtn.onclick = (eOpt) => {
                                    eOpt.stopPropagation();
                                    currentLinks.push({ from: s.id, to: nextId, text: opt });
                                    renderWorkspace();
                                };
                                linkMenu.appendChild(optBtn);
                            });
                            
                            // Custom input option
                            const customInputWrapper = document.createElement('div');
                            customInputWrapper.style.padding = '8px';
                            customInputWrapper.style.borderTop = '1px solid #f1f5f9';
                            
                            const customInput = document.createElement('input');
                            customInput.type = 'text';
                            customInput.placeholder = 'Nhập từ khác...';
                            customInput.style.cssText = 'width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.9em; outline: none; text-align: center;';
                            
                            customInput.onclick = (eOpt) => eOpt.stopPropagation(); // prevent menu from closing when clicking input
                            
                            customInput.addEventListener('keydown', (ev) => {
                                if (ev.key === 'Enter') {
                                    ev.stopPropagation();
                                    const val = customInput.value.trim();
                                    if (val) {
                                        currentLinks.push({ from: s.id, to: nextId, text: val });
                                        renderWorkspace();
                                    }
                                }
                            });
                            
                            customInputWrapper.appendChild(customInput);
                            linkMenu.appendChild(customInputWrapper);
                            
                            linkWrapper.appendChild(linkMenu);
                            activeLinkMenu = linkMenu;
                        };
                        linkWrapper.appendChild(addBtn);
                    }
                    
                    listContainer.appendChild(linkWrapper);
                }
            });
            
            // Update Preview
            let previewString = "";
            currentSentences.forEach((s, i) => {
                if (i > 0) {
                    const prevId = currentSentences[i-1].id;
                    const link = currentLinks.find(l => l.from === prevId && l.to === s.id && l.text);
                    if (link) {
                        previewString += ` <span style="color:#0284c7; font-weight:bold;">${link.text}</span>, `;
                    } else {
                        previewString += " ";
                    }
                }
                
                let text = s.text;
                // auto lowercase if there's a connector before it (simple logic)
                if (i > 0) {
                    const prevId = currentSentences[i-1].id;
                    const link = currentLinks.find(l => l.from === prevId && l.to === s.id && l.text);
                    if (link && text.length > 0) {
                        text = text.charAt(0).toLowerCase() + text.slice(1);
                    }
                }
                previewString += text;
            });
            
            previewText.innerHTML = previewString;
        };
        
        component.addEventListener('click', closeMenus);
        renderWorkspace();
        
        // Handle Submit
        const submitBtn = component.querySelector('.btn-rs-submit');
        const feedbackContainer = component.querySelector('.rs-feedback');
        const nextBtn = component.querySelector('.btn-rs-next');
        
        submitBtn.addEventListener('click', () => {
            const accepted = data.submission?.acceptedTexts || [];
            
            submitBtn.style.opacity = '0.5';
            submitBtn.innerText = 'Đang phân tích...';
            
            setTimeout(() => {
                submitBtn.style.display = 'none';
                feedbackContainer.style.display = 'block';
                
                // --- MOCK AI VALIDATION ---
                // We check if the preview text contains some of the accepted patterns
                const currentText = previewText.innerText.toLowerCase();
                let matchCount = 0;
                accepted.forEach(acc => {
                    // Remove punctuation for looser matching
                    const cleanAcc = acc.toLowerCase().replace(/[.,]/g, '');
                    const cleanCurrent = currentText.replace(/[.,]/g, '');
                    if (cleanCurrent.includes(cleanAcc)) {
                        matchCount++;
                    }
                });
                
                const isSuccess = matchCount >= 2; // Arbitrary threshold for mock

                if (isSuccess && data.aiFeedback) {
                    feedbackContainer.innerHTML = `
                        <div style="font-size: 1.2em; font-weight: bold; color: #166534; margin-bottom: 15px; text-align: center;">${data.aiFeedback.title}</div>
                        <div style="display: flex; gap: 10px; flex-direction: column;">
                            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0;">
                                <strong style="color: #22c55e;">ĐIỂM SÁNG:</strong> ${data.aiFeedback.example?.strengths.join('<br>') || 'Các câu đã được kết nối logic hơn.'}
                            </div>
                            ${data.aiFeedback.example?.weaknesses ? `
                                <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #fecaca;">
                                    <strong style="color: #ef4444;">GỢI Ý CẢI THIỆN:</strong> ${data.aiFeedback.example.weaknesses.join('<br>')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                    nextBtn.style.display = 'block';
                } else {
                    feedbackContainer.innerHTML = `
                        <div style="text-align: center; color: #b91c1c; font-weight: bold;">
                            ❌ Đoạn văn có vẻ chưa được liên kết tốt. Em hãy thử dùng thêm từ nối hoặc sửa lại các câu nhé!
                        </div>
                    `;
                    feedbackContainer.style.background = '#fef2f2';
                    feedbackContainer.style.borderColor = '#ef4444';
                    
                    // Allow retry
                    submitBtn.style.display = 'block';
                    submitBtn.style.opacity = '1';
                    submitBtn.innerText = data.submission?.button || '🚀 Nộp bài';
                }
                
                if (isSuccess) {
                    setTimeout(() => nextBtn.scrollIntoView({ behavior: 'smooth', block: 'end' }), 200);
                }
            }, 1500);
        });
        
        nextBtn.addEventListener('click', () => {
            window.engine && window.engine.next();
        });
        
        return component;
    }
}
