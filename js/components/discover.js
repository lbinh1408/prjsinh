/**
 * ==========================================================
 * TS10 Learning Platform
 * components/discover.js
 * ==========================================================
 */

import { getValidator } from "../validators/index.js";
import ConnectionMap from "./connectionMap.js";

import SentenceLab from "./layouts/SentenceLab.js";
import MatchingLab from "./layouts/MatchingLab.js";
import SlotBuilder from "./layouts/SlotBuilder.js";
import ChoiceBuilder from "./layouts/ChoiceBuilder.js";

class Discover {

    static render(step) {
        const data = step.data || step;
        const promptText = (data.content && data.content.prompt) || data.prompt;
        const component = document.createElement("div");
        component.className = "component discover-component";

        if (data.ui && (data.ui.layout === 'sentence_lab' || data.ui.component === 'sentence_lab')) {
            return SentenceLab.render(step);
        }

        if (data.ui && (data.ui.layout === 'card_to_slot' || data.ui.component === 'card_to_slot')) {
            return SlotBuilder.render(step);
        }

        if (data.ui && (data.ui.layout === 'matching_and_sorting' || data.ui.component === 'matching_and_sorting')) {
            return MatchingLab.render(step);
        }

        if (data.ui && (data.ui.layout === 'connection_lab' || data.ui.component === 'connection_lab')) {
            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <p class="question-text">${data.instruction || step.instruction || ""}</p>
                </div>
                <div class="activities-container" style="display: flex; flex-direction: column; gap: 40px; margin-top: 20px;"></div>
                <div class="reveal-container" style="display: none; margin-top: 40px; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.3em; font-weight: bold; color: #1e3a8a; margin-bottom: 20px;">
                        ${data.reveal?.title || "💡 Em vừa phát hiện 4 cách nối câu"}
                    </div>
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                        ${(data.reveal?.items || []).map(item => `
                            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 20px; font-weight: 500; color: #334155;">
                                ${item.icon} ${item.label}
                            </div>
                        `).join('')}
                    </div>
                    <div style="color: #475569; font-style: italic;">
                        ${data.reveal?.text || ""}
                    </div>
                </div>
                <div class="discover-next-container" style="display: none; text-align: center; margin-top: 30px;">
                    <button class="btn btn-primary" onclick="window.engine && window.engine.next()">Tiếp tục</button>
                </div>
            `;

            const activitiesContainer = component.querySelector('.activities-container');
            const revealContainer = component.querySelector('.reveal-container');
            const nextContainer = component.querySelector('.discover-next-container');
            const activities = data.activities || [];
            let currentActivityIndex = 0;

            const renderActivity = (index) => {
                if (index >= activities.length) {
                    // Show reveal
                    revealContainer.style.display = 'block';
                    nextContainer.style.display = 'block';
                    return;
                }

                const act = activities[index];
                const actWrap = document.createElement('div');
                actWrap.style.cssText = "opacity: 0; transform: translateY(20px); transition: all 0.5s ease;";

                const mapEl = ConnectionMap.render(act.connectionData, {
                    onUpdate: (linkId, status, ans) => {
                        if (status === 'correct') {
                            // Wait a bit, then render next
                            setTimeout(() => {
                                renderActivity(index + 1);
                            }, 1000);
                        }
                    }
                });

                actWrap.appendChild(mapEl);
                activitiesContainer.appendChild(actWrap);

                // Trigger animation
                requestAnimationFrame(() => {
                    actWrap.style.opacity = "1";
                    actWrap.style.transform = "translateY(0)";
                });

                // Auto scroll to new activity
                setTimeout(() => actWrap.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            };

            if (activities.length > 0) {
                renderActivity(0);
            }

            return component;
        }

        if (data.ui && data.ui.layout === 'drag_and_drop' && data.title === 'Tự tìm quy luật') {
            // CUSTOM DISCOVER_01 FLOW
            component.innerHTML = `
                <div class="discover-custom-flow" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                    <!-- SCREEN 1: INTRO -->
                    <div id="screen-1" class="discover-screen" style="display: block; text-align: center; margin-top: 50px;">
                        <div style="font-size: 3em; margin-bottom: 20px;">💡</div>
                        <h2 style="font-size: 2em; color: #1e293b; margin-bottom: 20px;">DISCOVER</h2>
                        <p style="font-size: 1.2em; color: #475569; margin-bottom: 10px;">Hãy thử tự xây dựng một đoạn văn.</p>
                        <p style="font-size: 1.1em; color: #64748b; margin-bottom: 40px;">Không cần biết tên của cách trình bày. Chỉ cần xem câu nào nên đứng trước, câu nào nên đứng sau.</p>
                        <button class="btn btn-primary btn-next-screen" style="font-size: 1.2em; padding: 15px 40px;">Bắt đầu</button>
                    </div>

                    <!-- SCREEN 2: ROUND 1 -->
                    <div id="screen-2" class="discover-screen" style="display: none;">
                        <h3 style="text-align: center; color: #1e293b; margin-bottom: 30px;">🧩 XẾP CÂU</h3>
                        <div style="display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 300px;">
                                <div style="font-weight: bold; color: #64748b; margin-bottom: 15px; text-align: center;">KHO CÂU VĂN</div>
                                <div class="source-zone-r1" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                    <div class="draggable-card-r1" draggable="true" data-id="main" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Đọc sách giúp mở rộng hiểu biết.</div>
                                    <div class="draggable-card-r1" draggable="true" data-id="sub1" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Mỗi cuốn sách mang đến những kiến thức mới.</div>
                                    <div class="draggable-card-r1" draggable="true" data-id="sub2" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Nhờ đọc sách, chúng ta hiểu thêm về lịch sử và cuộc sống.</div>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 300px;">
                                <div style="font-weight: bold; color: #64748b; margin-bottom: 15px; text-align: center;">KÉO VÀO ĐÂY</div>
                                <div class="target-zone-r1" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                </div>
                            </div>
                        </div>
                        <div class="q-area-r1" style="display: none; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; text-align: center;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">Câu nào là ý quan trọng nhất của đoạn?</div>
                            <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
                                <button class="btn-opt-r1" data-correct="true" style="color: darkblue; width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left;">Đọc sách giúp mở rộng hiểu biết.</button>
                                <button class="btn-opt-r1" data-correct="false" style="color: darkblue; width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left;">Mỗi cuốn sách mang đến những kiến thức mới.</button>
                                <button class="btn-opt-r1" data-correct="false" style="color: darkblue; width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left;">Nhờ đọc sách, chúng ta hiểu thêm về lịch sử và cuộc sống.</button>
                            </div>
                            <div class="fb-r1" style="display: none; margin-top: 20px; font-weight: bold; color: #059669; font-size: 1.1em;">✨ Em vừa xác định một câu có vai trò trung tâm.</div>
                            <button class="btn btn-primary btn-next-screen mt-4" style="display: none;">Tiếp tục →</button>
                        </div>
                    </div>

                    <!-- SCREEN 3: ROUND 2 -->
                    <div id="screen-3" class="discover-screen" style="display: none;">
                        <h3 style="text-align: center; color: #1e293b; margin-bottom: 10px;">🔄 Thử một cách khác</h3>
                        <p style="text-align: center; color: #64748b; font-size: 1.1em; margin-bottom: 30px;">Hãy đặt câu quan trọng nhất ở <b>cuối đoạn</b>.</p>
                        <div style="display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 300px;">
                                <div class="source-zone-r2" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                    <div class="draggable-card-r2" draggable="true" data-id="main" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Vì vậy, đọc sách giúp mở rộng hiểu biết.</div>
                                    <div class="draggable-card-r2" draggable="true" data-id="sub1" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Mỗi cuốn sách mang đến những kiến thức mới.</div>
                                    <div class="draggable-card-r2" draggable="true" data-id="sub2" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; user-select: none;">Nhờ đọc sách, chúng ta hiểu thêm về lịch sử và cuộc sống.</div>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 300px;">
                                <div class="target-zone-r2" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                </div>
                            </div>
                        </div>
                        <div class="q-area-r2" style="display: none; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; text-align: center;">
                            <div style="color: #475569; margin-bottom: 10px;">Hai đoạn đều có cùng nội dung. Nhưng vị trí của ý chính đã thay đổi.</div>
                            <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">Vậy điều gì đã thay đổi?</div>
                            <div style="display: flex; justify-content: center; gap: 15px;">
                                <button class="btn-opt-r2" data-correct="false" style="color:darkblue; padding: 12px 25px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer;">Nội dung</button>
                                <button class="btn-opt-r2" data-correct="true" style="color:darkblue; padding: 12px 25px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold;">Vị trí của ý chính</button>
                                <button class="btn-opt-r2" data-correct="false" style="color:darkblue; padding: 12px 25px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer;">Số lượng câu</button>
                            </div>
                            <div class="fb-r2" style="display: none; margin-top: 20px; font-weight: bold; color: #059669; font-size: 1.1em;">💡 Chính xác. Nhưng đây mới chỉ là một dấu hiệu.</div>
                            <button class="btn btn-primary btn-next-screen mt-4" style="display: none;">Tiếp tục →</button>
                        </div>
                    </div>

                    <!-- SCREEN 4: ROUND 3 -->
                    <div id="screen-4" class="discover-screen" style="display: none; text-align: center;">
                        <h3 style="color: #1e293b; margin-bottom: 20px;">Các câu có ngang hàng không?</h3>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; max-width: 600px; margin: 0 auto 30px; text-align: left; font-size: 1.1em; line-height: 1.8;">
                            <div>1. Đọc sách giúp mở rộng hiểu biết.</div>
                            <div>2. Đọc sách còn rèn luyện khả năng suy nghĩ.</div>
                            <div>3. Đọc sách cũng giúp tâm hồn phong phú hơn.</div>
                        </div>
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">Ba câu này có câu nào đang giải thích cho câu nào không?</div>
                        <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
                            <button class="btn-opt-r3" data-correct="false" style="width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left;">Có. Câu 2 giải thích câu 1.</button>
                            <button class="btn-opt-r3" data-correct="false" style="width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left;">Có. Câu 3 giải thích câu 2.</button>
                            <button class="btn-opt-r3" data-correct="true" style="width: 80%; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; text-align: left; font-weight: bold;">Không. Các câu cùng làm rõ một chủ đề.</button>
                        </div>
                        <div class="fb-r3" style="display: none; margin-top: 20px; font-weight: bold; color: #059669; font-size: 1.1em;">💡 Các câu này bình đẳng với nhau.</div>
                        <button class="btn btn-primary btn-next-screen mt-4" style="display: none;">Tiếp tục →</button>
                    </div>

                    <!-- SCREEN 5: ROUND 4 -->
                    <div id="screen-5" class="discover-screen" style="display: none; text-align: center;">
                        <h3 style="color: #1e293b; margin-bottom: 20px;">Móc xích</h3>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; max-width: 600px; margin: 0 auto 30px; text-align: left; font-size: 1.1em; line-height: 1.8;">
                            <div class="r4-s1">Đọc sách giúp mở rộng <span class="r4-w1" style="transition: all 0.3s;">hiểu biết</span>.</div>
                            <div class="r4-link1" style="text-align: center; color: #94a3b8; font-size: 1.5em; opacity: 0; height: 0; overflow: hidden; transition: all 0.3s;">🔗</div>
                            <div class="r4-s2"><span class="r4-w1b" style="transition: all 0.3s;">Hiểu biết</span> rộng giúp con người <span class="r4-w2" style="transition: all 0.3s;">tự tin</span> hơn.</div>
                            <div class="r4-link2" style="text-align: center; color: #94a3b8; font-size: 1.5em; opacity: 0; height: 0; overflow: hidden; transition: all 0.3s;">🔗</div>
                            <div class="r4-s3"><span class="r4-w2b" style="transition: all 0.3s;">Sự tự tin</span> giúp chúng ta chủ động hơn.</div>
                        </div>
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">Em có nhận thấy điều gì đặc biệt giữa câu này và câu tiếp theo?</div>
                        <button class="btn-connect-r4" style="padding: 15px 30px; border-radius: 8px; border: 2px dashed #0284c7; background: #e0f2fe; color: #0284c7; font-weight: bold; cursor: pointer; font-size: 1.1em;">👆 Chạm để tìm điểm kết nối giữa hai câu</button>
                        
                        <div class="fb-r4" style="display: none; margin-top: 20px; font-weight: bold; color: #059669; font-size: 1.1em;">💡 Mỗi câu dường như tạo điểm xuất phát cho câu tiếp theo.</div>
                        <button class="btn btn-primary btn-next-screen mt-4" style="display: none;">Tiếp tục →</button>
                    </div>

                    <!-- SCREEN 6: REVEAL -->
                    <div id="screen-6" class="discover-screen" style="display: none; text-align: center; padding-top: 30px;">
                        <div style="background: #fefce8; border: 2px solid #fef08a; border-radius: 12px; padding: 40px; max-width: 600px; margin: 0 auto;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #854d0e; margin-bottom: 25px;">💡 EM VỪA PHÁT HIỆN</div>
                            <div style="font-size: 1.1em; color: #a16207; line-height: 1.6; margin-bottom: 20px;">
                                Các đoạn văn có thể tổ chức các câu theo những cách khác nhau.
                            </div>
                            <div style="font-size: 1.1em; color: #a16207; line-height: 1.6; margin-bottom: 20px;">
                                Một dấu hiệu quan trọng là:<br>
                                <span style="font-weight: bold; font-size: 1.2em; color: #b45309;">📍 VỊ TRÍ Ý CHÍNH</span>
                            </div>
                            <div style="font-size: 1.1em; color: #a16207; line-height: 1.6; margin-bottom: 30px;">
                                Nhưng còn có những dấu hiệu khác:<br>
                                <b>🔗 Cách các câu liên kết</b><br>
                                <b>⚖️ Quan hệ giữa các ý</b>
                            </div>
                            <button id="discover-done" class="btn btn-primary" style="padding: 15px 40px; font-size: 1.2em; border-radius: 8px;">Hoàn thành khám phá</button>
                        </div>
                    </div>
                </div>
            `;
            this.bind(component, step);
            return component;
        } else if (data.ui && data.ui.layout === 'drag_and_drop') {

            const content = data.content || {};
            const example = content.example || {};
            const cards = example.cards || [];

            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <p class="question-text">${content.instruction || ""}</p>
                </div>
                <div class="drag-and-drop-container" style="max-width: 800px; margin: 0 auto; padding: 20px;">
                    <div style="display: flex; gap: 30px; margin-bottom: 40px; flex-wrap: wrap;">
                        
                        <!-- Source Cards -->
                        <div style="flex: 1; min-width: 300px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 15px; text-align: center;">KHO CÂU VĂN</div>
                            <div class="source-zone" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                ${cards.map(c => `
                                    <div class="draggable-card" draggable="true" data-id="${c.id}" style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.05); user-select: none;">
                                        ${c.text}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Target Paragraph -->
                        <div style="flex: 1; min-width: 300px;">
                            <div style="font-weight: bold; color: #64748b; margin-bottom: 15px; text-align: center;">ĐOẠN VĂN (${example.label})</div>
                            <div class="target-zone" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; gap: 10px;">
                                <div class="drop-placeholder" style="border: 2px dashed #93c5fd; border-radius: 8px; padding: 15px; text-align: center; color: #60a5fa;">Kéo câu văn vào đây</div>
                            </div>
                        </div>

                    </div>

                    <!-- Classification Form -->
                    <div class="classification-area" style="display: none; background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #1e293b; margin-bottom: 20px;">${content.classification?.question}</div>
                        <div style="display: flex; justify-content: center; gap: 15px;">
                            ${content.classification?.options?.map(opt => `
                                <button class="btn-classify" data-id="${opt.id}" style="padding: 12px 25px; border-radius: 8px; border: 2px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; color: #475569;">${opt.label}</button>
                            `).join('') || ''}
                        </div>
                    </div>

                    <!-- Reveal Section -->
                    <div class="reveal-area" style="display: none; background: #fefce8; border: 2px solid #fef08a; border-radius: 12px; padding: 25px; text-align: center;">
                        <div style="font-size: 1.3em; font-weight: bold; color: #854d0e; margin-bottom: 15px;">${data.reveal?.title}</div>
                        <div style="color: #a16207; line-height: 1.6; margin-bottom: 25px;">${data.reveal?.text}</div>
                        <button id="discover-done" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px; font-weight: bold;">Hoàn thành khám phá</button>
                    </div>
                </div>
            `;
            this.bind(component, step);
            return component;
        } else if (data.ui && data.ui.layout === 'idea_investigator') {
            const content = data.content || {};

            const seedHtml = `
                <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="font-size: 1.2em; font-weight: bold; color: #1e293b;">💡 Ý GỐC</div>
                    <div style="font-size: 1.3em; font-weight: bold; color: #0284c7; margin-top: 10px;">${content.seedIdea.text}</div>
                </div>
                
                <div class="investigator-drop-zone" style="border: 2px dashed #94a3b8; border-radius: 12px; padding: 20px; text-align: center; background: #f8fafc; margin-bottom: 30px; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100px;">
                    <span style="color: #64748b; font-weight: bold;">📥 Kéo một câu vào đây</span>
                </div>
                
                <div class="investigator-tree" style="display: none; flex-direction: column; gap: 10px; margin-bottom: 30px; border-left: 3px solid #cbd5e1; padding-left: 20px; margin-left: 20px;">
                    <!-- Successfully mapped sentences will go here -->
                </div>
            `;

            const cardsHtml = `
                <div class="investigator-cards" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 40px;">
                    <div style="text-align: center; font-weight: bold; color: #64748b; margin-bottom: 10px;">${content.instruction}</div>
                    ${content.cards.map(c => `
                        <div class="investigator-card" draggable="true" data-id="${c.id}" data-category="${c.category}" style="background: white; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 12px; cursor: grab; text-align: center; font-weight: 500; color: #334155; transition: all 0.2s;">
                            ${c.text}
                        </div>
                    `).join('')}
                </div>
            `;

            const categoriesHtml = `
                <div class="investigator-categories" style="display: none; flex-direction: column; align-items: center; background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                    <div style="font-weight: bold; font-size: 1.2em; color: #1e40af; margin-bottom: 10px;">📌 Câu này làm rõ ý</div>
                    <div style="margin-bottom: 15px;">👇</div>
                    <div style="width: 100%; font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 15px;">Câu này đang giúp em biết thêm điều gì?</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; width: 100%;">
                        ${content.categories.map(cat => `
                            <button class="investigator-cat-btn" data-id="${cat.id}" data-reveal="${cat.reveal}" style="flex: 1; min-width: 140px; padding: 12px; border: 2px solid #3b82f6; border-radius: 12px; background: white; color: #3b82f6; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                                ${cat.label}
                            </button>
                        `).join('')}
                        <button class="investigator-cat-btn" data-id="irrelevant" data-reveal="Không liên quan" style="flex: 1; min-width: 140px; padding: 12px; border: 2px solid #3b82f6; border-radius: 12px; background: white; color: #3b82f6; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                            Thông tin không liên quan
                        </button>
                    </div>
                </div>
            `;

            const trapHtml = `
                <div class="investigator-trap-question" style="display: none; flex-direction: column; align-items: center; background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                    <div style="font-weight: bold; font-size: 1.2em; color: #991b1b; margin-bottom: 15px;">Câu này có làm ý chính rõ hơn không?</div>
                    <div style="display: flex; gap: 20px;">
                        <button class="btn-trap-choice" data-correct="false" style="padding: 10px 30px; border-radius: 8px; border: 2px solid #94a3b8; background: white; font-weight: bold; cursor: pointer;">🟢 Có</button>
                        <button class="btn-trap-choice" data-correct="true" style="padding: 10px 30px; border-radius: 8px; border: 2px solid #94a3b8; background: white; font-weight: bold; cursor: pointer;">🔴 Chưa thật sự</button>
                    </div>
                </div>
            `;

            const feedbackHtml = `
                <div class="investigator-feedback" style="display: none; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                    <div class="feedback-text" style="font-size: 1.1em; font-weight: bold; color: #166534; margin-bottom: 15px;"></div>
                    <button class="btn btn-primary btn-continue-investigate" style="padding: 10px 20px; border-radius: 8px;">Tiếp tục</button>
                </div>
                <div class="investigator-trap-feedback" style="display: none; background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 1.1em; font-weight: bold; color: #991b1b; margin-bottom: 15px;">${content.trapFeedback}</div>
                    <button class="btn btn-primary btn-continue-investigate" style="padding: 10px 20px; border-radius: 8px; background: #ef4444; border-color: #ef4444;">Đã hiểu</button>
                </div>
                <div class="investigator-aha" style="display: none; background: #fffbeb; border: 2px solid #fde68a; border-radius: 12px; padding: 25px; text-align: center; margin-top: 30px;">
                    <div style="font-size: 1.5em; font-weight: bold; color: #b45309; margin-bottom: 15px;">${content.aha.title}</div>
                    <div style="font-size: 1.1em; color: #92400e; line-height: 1.6; margin-bottom: 20px;">${content.aha.message}</div>
                    <button id="discover-done" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 8px; font-weight: bold;">Tiếp tục</button>
                </div>
            `;

            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                </div>
                <div class="idea-investigator-container" style="max-width: 700px; margin: 0 auto; padding: 20px;">
                    ${seedHtml}
                    ${categoriesHtml}
                    ${trapHtml}
                    ${feedbackHtml}
                    ${cardsHtml}
                </div>
                <style>
                    .investigator-card.dragging { opacity: 0.5; border-color: #3b82f6; border-style: solid; }
                    .investigator-drop-zone.drag-over { background: #eff6ff !important; border-color: #3b82f6 !important; }
                    .investigator-cat-btn:hover { background: #eff6ff !important; }
                    .btn-trap-choice:hover { background: #f8fafc !important; }
                </style>
            `;
        } else if (data.ui && data.ui.layout === 'discovery') {
            const content = data.content || {};

            // Render ideas pool
            const ideasHtml = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-weight: bold; margin-bottom: 15px; color: #475569;">CÁC Ý TƯỞNG</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                        ${(content.ideas || []).map(idea => `
                            <div style="background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 20px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                ${idea.text}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Render frameworks
            const frameworksHtml = `
                <div style="display: flex; gap: 30px; justify-content: center; margin-bottom: 30px;">
                    ${(content.frameworks || []).map((fw, idx) => `
                        <div class="framework-card fw-${idx}" data-idx="${idx}" style="flex: 1; max-width: 250px; background: white; border: 2px solid #cbd5e1; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s;">
                            <div style="font-weight: bold; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; font-size: 1.1em;">
                                BỘ KHUNG ${fw.label}
                            </div>
                            <div class="framework-nodes" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                ${fw.structure.map((node, i) => `
                                    <div class="fw-node fw-node-${idx}-${i}" style="background: #f8fafc; padding: 10px; border-radius: 8px; width: 100%; text-align: center; font-weight: 500; opacity: 1; transition: opacity 0.3s;">
                                        ${node}
                                    </div>
                                    ${i < fw.structure.length - 1 ? `<div class="fw-arrow fw-arrow-${idx}-${i}" style="color: #94a3b8; opacity: 1; transition: opacity 0.3s;">↓</div>` : ''}
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                    <div style="text-align: center; margin-bottom: 20px; color: #64748b; font-style: italic;">
                        ${content.instruction || ''}
                    </div>
                </div>
                
                ${ideasHtml}
                ${frameworksHtml}
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-weight: bold; font-size: 1.2em; color: #1e293b;">
                        ${content.question || ''}
                    </div>
                </div>
                
                <div id="discover-reveal" style="display: none; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 25px; margin-top: 30px; text-align: center;">
                    <div style="font-size: 30px; margin-bottom: 10px;">💡</div>
                    <div id="reveal-text" style="color: #166534; font-size: 1.1em; line-height: 1.6; margin-bottom: 20px;">
                        <!-- Animated text goes here -->
                    </div>
                    <button id="discover-next" class="btn btn-primary" style="padding: 12px 30px; border-radius: 8px; display: none;">
                        Tiếp tục →
                    </button>
                </div>
                
                <style>
                    .framework-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                    .framework-card.selected { border-color: #3b82f6; background: #eff6ff; }
                    .fw-node.animate-in { animation: fadeInDown 0.5s forwards; }
                    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                </style>
            `;
        } else {
            // Old format
            let scenarioHtml = "";
            if (data.scenario && data.scenario.type === 'comparison') {
                scenarioHtml = `
                    <div class="discover-scenario" style="margin-bottom: 30px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-style: italic; color: #475569; margin-bottom: 20px; text-align: center; font-size: 1.1em;">
                            Đề bài: "${data.scenario.prompt}"
                        </div>
                        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                            ${data.scenario.participants.map(p => `
                                <div class="participant-card" style="flex: 1; min-width: 200px; text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
                                    <div style="font-size: 40px; margin-bottom: 10px;">${p.name === 'Lan' ? '👧' : '👦'}</div>
                                    <div style="font-weight: bold; font-size: 1.2em; color: #1e293b; margin-bottom: 10px;">${p.name}</div>
                                    <div style="color: #64748b; font-size: 0.95em;">
                                        ${p.strategy === 'no_brainstorm' ? 'Viết ngay' : 'Tìm ý'}
                                    </div>
                                    ${p.ideas ? `
                                        <div style="margin-top: 10px; font-size: 0.85em; color: #0ea5e9; font-weight: 500;">
                                            💡 ${p.ideas.length} ý
                                        </div>
                                    ` : `
                                        <div style="margin-top: 10px; font-size: 0.85em; color: #ef4444; font-weight: 500;">
                                            ✍️ Viết...
                                        </div>
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            let optionsHtml = "";
            let discoveryQuestion = data.discovery && data.discovery.question ? data.discovery.question : null;
            if (discoveryQuestion && (discoveryQuestion.choices || discoveryQuestion.options)) {
                let optionsArr = discoveryQuestion.choices || discoveryQuestion.options;
                optionsHtml = ChoiceBuilder.render(optionsArr);
            }

            let followUpHtml = "";
            if (data.discovery && data.discovery.followUp) {
                followUpHtml = `
                    <div class="discover-followup" style="margin-bottom: 30px;">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #334155;">${data.discovery.followUp.question}</div>
                        <textarea class="discover-reason" placeholder="${data.discovery.followUp.placeholder}" style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 1em; resize: vertical;"></textarea>
                    </div>
                `;
            }

            component.innerHTML = `
                <div class="component-header">
                    ${promptText ? `<h2 class="question-title">${promptText}</h2>` : ''}
                </div>
                
                ${scenarioHtml}
                
                <div class="discovery-section" style="background: #f1f5f9; padding: 25px; border-radius: 12px;">
                    <div style="font-weight: bold; font-size: 1.2em; margin-bottom: 20px; color: #0f172a; text-align: center;">
                        ${data.discovery ? data.discovery.question.text : ''}
                    </div>
                    
                    ${optionsHtml}
                    ${followUpHtml}
                    
                    <div id="discover-error-msg" style="color: #ef4444; font-weight: bold; font-size: 0.95em; text-align: center; margin-bottom: 15px; display: none;"></div>

                    <div style="text-align: center;">
                        <button id="discover-submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 1.1em; border-radius: 8px;">
                            Xác nhận
                        </button>
                    </div>
                </div>
                
                <div id="discover-feedback" style="display: none; margin-top: 30px; padding: 20px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: #065f46;">💡 Ghi nhận</h3>
                    <p style="color: #047857; line-height: 1.5; font-size: 1.1em;">
                        ${data.feedback && data.feedback.reveal ? data.feedback.reveal.text : ''}
                    </p>
                    <div style="text-align: right; margin-top: 15px;">
                        <button id="discover-next" class="btn btn-primary">Tiếp tục khám phá →</button>
                    </div>
                </div>
                
                <style>
                    .discover-option:hover { background: #f8fafc; }
                    .discover-option:has(input:checked) { border-color: #3b82f6; background: #eff6ff; }
                </style>
            `;
        }

        this.bind(component, step);
        return component;
    }

    static bind(component, step) {
        const data = step.data || step;

        // Custom Discover_01 flow interaction
        const customFlowContainer = component.querySelector('.discover-custom-flow');
        if (customFlowContainer) {
            let currentScreen = 1;
            const screens = [
                component.querySelector('#screen-1'),
                component.querySelector('#screen-2'),
                component.querySelector('#screen-3'),
                component.querySelector('#screen-4'),
                component.querySelector('#screen-5'),
                component.querySelector('#screen-6')
            ];

            const nextScreen = () => {
                if (currentScreen < 6) {
                    screens[currentScreen - 1].style.display = 'none';
                    screens[currentScreen].style.display = 'block';
                    currentScreen++;
                }
            };

            component.querySelectorAll('.btn-next-screen').forEach(btn => {
                btn.addEventListener('click', nextScreen);
            });

            // Round 1 Logic
            const draggablesR1 = component.querySelectorAll('.draggable-card-r1');
            const targetZoneR1 = component.querySelector('.target-zone-r1');
            let draggedR1 = null;
            draggablesR1.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    draggedR1 = item;
                    item.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                });
                item.addEventListener('dragend', () => {
                    item.style.opacity = '1';
                    if (targetZoneR1.children.length === 3) {
                        component.querySelector('.q-area-r1').style.display = 'block';
                    }
                });
            });
            targetZoneR1.addEventListener('dragover', (e) => { e.preventDefault(); });
            targetZoneR1.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedR1) targetZoneR1.appendChild(draggedR1);
            });

            component.querySelectorAll('.btn-opt-r1').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.correct === 'true') {
                        btn.style.background = '#dcfce7';
                        btn.style.borderColor = '#16a34a';
                        component.querySelector('.fb-r1').style.display = 'block';
                        component.querySelector('#screen-2 .btn-next-screen').style.display = 'inline-block';
                    } else {
                        btn.style.background = '#fee2e2';
                        btn.style.borderColor = '#dc2626';
                    }
                });
            });

            // Round 2 Logic
            const draggablesR2 = component.querySelectorAll('.draggable-card-r2');
            const targetZoneR2 = component.querySelector('.target-zone-r2');
            let draggedR2 = null;
            draggablesR2.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    draggedR2 = item;
                    item.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                });
                item.addEventListener('dragend', () => {
                    item.style.opacity = '1';
                    if (targetZoneR2.children.length === 3) {
                        component.querySelector('.q-area-r2').style.display = 'block';
                    }
                });
            });
            targetZoneR2.addEventListener('dragover', (e) => { e.preventDefault(); });
            targetZoneR2.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedR2) targetZoneR2.appendChild(draggedR2);
            });

            component.querySelectorAll('.btn-opt-r2').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.correct === 'true') {
                        btn.style.background = '#dcfce7';
                        btn.style.borderColor = '#16a34a';
                        component.querySelector('.fb-r2').style.display = 'block';
                        component.querySelector('#screen-3 .btn-next-screen').style.display = 'inline-block';
                    } else {
                        btn.style.background = '#fee2e2';
                        btn.style.borderColor = '#dc2626';
                    }
                });
            });

            // Round 3 Logic
            component.querySelectorAll('.btn-opt-r3').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.correct === 'true') {
                        btn.style.background = '#dcfce7';
                        btn.style.borderColor = '#16a34a';
                        component.querySelector('.fb-r3').style.display = 'block';
                        component.querySelector('#screen-4 .btn-next-screen').style.display = 'inline-block';
                    } else {
                        btn.style.background = '#fee2e2';
                        btn.style.borderColor = '#dc2626';
                    }
                });
            });

            // Round 4 Logic
            const connectBtn = component.querySelector('.btn-connect-r4');
            connectBtn?.addEventListener('click', () => {
                connectBtn.style.display = 'none';
                component.querySelector('.r4-link1').style.opacity = '1';
                component.querySelector('.r4-link1').style.height = 'auto';
                component.querySelector('.r4-link2').style.opacity = '1';
                component.querySelector('.r4-link2').style.height = 'auto';

                component.querySelector('.r4-w1').style.background = '#fef08a';
                component.querySelector('.r4-w1b').style.background = '#fef08a';
                component.querySelector('.r4-w2').style.background = '#bbf7d0';
                component.querySelector('.r4-w2b').style.background = '#bbf7d0';

                component.querySelector('.fb-r4').style.display = 'block';
                component.querySelector('#screen-5 .btn-next-screen').style.display = 'inline-block';
            });

            // Reveal Done
            const doneBtn = component.querySelector('#discover-done');
            if (doneBtn) {
                doneBtn.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }

            return;
        }

        // Drag and Drop layout interaction
        const dragDropContainer = component.querySelector('.drag-and-drop-container');
        if (dragDropContainer) {
            const draggables = component.querySelectorAll('.draggable-card');
            const targetZone = component.querySelector('.target-zone');
            const classificationArea = component.querySelector('.classification-area');
            const btnClassify = component.querySelectorAll('.btn-classify');
            const revealArea = component.querySelector('.reveal-area');
            const doneBtn = component.querySelector('#discover-done');

            let draggedItem = null;

            draggables.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    draggedItem = item;
                    item.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                });
                item.addEventListener('dragend', () => {
                    item.style.opacity = '1';

                    // Check if all items have been dropped
                    const itemsInTarget = targetZone.querySelectorAll('.draggable-card');
                    if (itemsInTarget.length === draggables.length) {
                        const placeholder = targetZone.querySelector('.drop-placeholder');
                        if (placeholder) placeholder.style.display = 'none';
                        classificationArea.style.display = 'block';
                    }
                });
            });

            targetZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                targetZone.style.background = '#e0f2fe';
            });
            targetZone.addEventListener('dragleave', () => {
                targetZone.style.background = '#eff6ff';
            });
            targetZone.addEventListener('drop', (e) => {
                e.preventDefault();
                targetZone.style.background = '#eff6ff';
                if (draggedItem) {
                    targetZone.appendChild(draggedItem);
                }
            });

            // Note: In a real app we would want sorting within targetZone as well,
            // but for minimal change we'll just allow them to drop in order.

            btnClassify.forEach(btn => {
                btn.addEventListener('click', () => {
                    btnClassify.forEach(b => {
                        b.style.background = 'white';
                        b.style.color = '#475569';
                    });
                    btn.style.background = '#3b82f6';
                    btn.style.color = 'white';

                    setTimeout(() => {
                        classificationArea.style.display = 'none';
                        revealArea.style.display = 'block';
                    }, 500);
                });
            });

            if (doneBtn) {
                doneBtn.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }
            return;
        }

        // Idea Investigator layout interaction
        const investigatorContainer = component.querySelector('.idea-investigator-container');
        if (investigatorContainer) {
            const cards = component.querySelectorAll('.investigator-card');
            const dropZone = component.querySelector('.investigator-drop-zone');
            const treeArea = component.querySelector('.investigator-tree');
            const categoriesArea = component.querySelector('.investigator-categories');
            const catBtns = component.querySelectorAll('.investigator-cat-btn');
            const feedbackArea = component.querySelector('.investigator-feedback');
            const trapArea = component.querySelector('.investigator-trap-question');
            const trapBtns = component.querySelectorAll('.btn-trap-choice');
            const trapFeedbackArea = component.querySelector('.investigator-trap-feedback');
            const ahaArea = component.querySelector('.investigator-aha');
            const doneBtn = component.querySelector('#discover-done');
            const continueBtns = component.querySelectorAll('.btn-continue-investigate');

            let draggedCard = null;
            let selectedCard = null;
            let mappedCount = 0;
            const targetCount = Array.from(cards).filter(c => c.dataset.category !== 'irrelevant').length;

            cards.forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    draggedCard = card;
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });

                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                });
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');

                if (draggedCard) {
                    selectedCard = draggedCard;
                    draggedCard.style.display = 'none'; // Hide from list
                    dropZone.style.display = 'none'; // Hide drop zone temporarily

                    const expectedCategory = selectedCard.dataset.category;

                    if (expectedCategory === 'irrelevant') {
                        trapArea.style.display = 'flex';
                    } else {
                        categoriesArea.style.display = 'flex';
                    }
                }
            });

            catBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!selectedCard) return;

                    const expectedCategory = selectedCard.dataset.category;
                    const clickedCategory = btn.dataset.id;

                    if (expectedCategory === 'irrelevant') {
                        return; // handled by trap question
                    }

                    if (expectedCategory === clickedCategory) {
                        categoriesArea.style.display = 'none';
                        feedbackArea.querySelector('.feedback-text').innerText = btn.dataset.reveal;
                        feedbackArea.style.display = 'block';

                        // Add to tree
                        treeArea.style.display = 'flex';
                        const treeNode = document.createElement('div');
                        treeNode.style.cssText = "background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 15px; position: relative;";
                        treeNode.innerHTML = `
                            <div style="font-size: 0.8em; font-weight: bold; color: #3b82f6; margin-bottom: 5px; text-transform: uppercase;">${btn.innerText}</div>
                            <div style="color: #334155;">${selectedCard.innerText}</div>
                        `;
                        treeArea.appendChild(treeNode);

                        mappedCount++;
                    } else {
                        // Wrong match, visual feedback
                        btn.style.background = '#fef2f2';
                        btn.style.borderColor = '#ef4444';
                        setTimeout(() => {
                            btn.style.background = 'white';
                            btn.style.borderColor = '#3b82f6';
                        }, 800);
                    }
                });
            });

            trapBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const isCorrect = btn.dataset.correct === 'true'; // 'Chưa thật sự' is correct
                    if (isCorrect) {
                        trapArea.style.display = 'none';
                        trapFeedbackArea.style.display = 'block';
                    } else {
                        btn.style.background = '#fef2f2';
                        btn.style.borderColor = '#ef4444';
                        setTimeout(() => {
                            btn.style.background = 'white';
                            btn.style.borderColor = '#94a3b8';
                        }, 800);
                    }
                });
            });

            continueBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    feedbackArea.style.display = 'none';
                    trapFeedbackArea.style.display = 'none';
                    selectedCard = null;

                    if (mappedCount >= targetCount) {
                        component.querySelector('.investigator-cards').style.display = 'none';
                        dropZone.style.display = 'none';
                        ahaArea.style.display = 'block';
                    } else {
                        dropZone.style.display = 'flex';
                    }
                });
            });

            if (doneBtn) {
                doneBtn.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }
            return;
        }

        // Discovery layout interaction
        const frameworkCards = component.querySelectorAll('.framework-card');
        if (frameworkCards.length > 0) {
            frameworkCards.forEach(card => {
                card.addEventListener('click', () => {
                    const idx = card.dataset.idx;

                    // Reset all
                    frameworkCards.forEach(c => {
                        c.classList.remove('selected');
                        c.querySelectorAll('.fw-node, .fw-arrow').forEach(el => {
                            el.classList.remove('animate-in');
                            el.style.opacity = '1';
                        });
                    });

                    card.classList.add('selected');

                    if (idx === '1') { // Framework B logic (assuming idx 1 is B)
                        // Animate nodes
                        const nodes = card.querySelectorAll('.fw-node, .fw-arrow');
                        nodes.forEach(n => n.style.opacity = '0');

                        nodes.forEach((n, i) => {
                            setTimeout(() => {
                                n.classList.add('animate-in');
                            }, i * 300);
                        });

                        // Show reveal after animation
                        setTimeout(() => {
                            const reveal = component.querySelector('#discover-reveal');
                            const textContainer = component.querySelector('#reveal-text');
                            const nextBtn = component.querySelector('#discover-next');

                            reveal.style.display = 'block';
                            // Hardcode the message for simplicity, or extract from dataset if passed
                            textContainer.innerHTML = `
                                <div>Dàn ý chính là cách tổ chức những ý tưởng thành một trình tự hợp lý trước khi viết.</div>
                            `;

                            setTimeout(() => {
                                nextBtn.style.display = 'inline-block';
                            }, 1000);
                        }, nodes.length * 300 + 500);
                    } else {
                        // If selected A, maybe just show a small prompt to try B
                        const reveal = component.querySelector('#discover-reveal');
                        const textContainer = component.querySelector('#reveal-text');
                        reveal.style.display = 'block';
                        textContainer.innerHTML = `
                            <div style="color: #ea580c;">Hãy thử xem Bộ khung B nhé, em sẽ thấy sự khác biệt!</div>
                        `;
                    }
                });
            });

            const nextBtn = component.querySelector('#discover-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    component.dataset.completed = "true";
                    document.getElementById("btn-next")?.click();
                });
            }
            return; // Skip old logic
        }

        // Old logic
        const submitBtn = component.querySelector("#discover-submit");
        const feedbackDiv = component.querySelector("#discover-feedback");
        const nextBtn = component.querySelector("#discover-next");
        const textarea = component.querySelector(".discover-reason");

        let selectedChoice = null;
        ChoiceBuilder.bind(component, (val) => {
            selectedChoice = val;
        });

        const errorMsg = component.querySelector("#discover-error-msg");

        submitBtn?.addEventListener("click", () => {
            if (errorMsg) errorMsg.style.display = 'none';

            if (!selectedChoice && component.querySelector('.choice-options')) {
                if (errorMsg) {
                    errorMsg.textContent = "Vui lòng chọn một đáp án!";
                    errorMsg.style.display = 'block';
                } else {
                    alert("Vui lòng chọn một đáp án!");
                }
                return;
            }
            if (textarea && textarea.value.trim() === '') {
                if (errorMsg) {
                    errorMsg.textContent = "Vui lòng viết lý do của em!";
                    errorMsg.style.display = 'block';
                } else {
                    alert("Vui lòng viết lý do của em!");
                }
                return;
            }

            // Lock inputs
            component.classList.add('locked');
            if (textarea) textarea.disabled = true;
            submitBtn.style.display = 'none';

            // Show feedback
            if (feedbackDiv) {
                feedbackDiv.style.display = 'block';
            } else {
                // If no feedback, just proceed
                component.dataset.completed = "true";
                document.getElementById("btn-next")?.click();
            }
        });

        nextBtn?.addEventListener("click", () => {
            component.dataset.completed = "true";
            document.getElementById("btn-next")?.click();
        });
    }

    static validator = {
        name: "NullValidator",
        validate: () => ({ valid: true, score: 1, maxScore: 1 })
    };

    static getValidator() {
        return this.validator;
    }
}

export default Discover;
