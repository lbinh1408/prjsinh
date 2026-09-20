class Intro {
    static render(step) {
        const data = step.data || {};
        const title = data.title || "Nhiệm vụ khám phá";
        // Fix typo in JSON description if it starts with 'rong ' instead of 'Trong '
        let description = data.description || "";
        if (description.startsWith("rong ")) {
            description = "T" + description;
        }

        const component = document.createElement("div");
        component.className = "component intro-component";

        // Define styles
        const style = document.createElement("style");
        style.innerHTML = `
            .intro-component {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100%;
                padding: 40px 20px;
                font-family: 'Inter', sans-serif;
            }
            .intro-card {
                background: white;
                border-radius: 24px;
                padding: 50px 40px;
                max-width: 700px;
                width: 100%;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(0, 0, 0, 0.02);
                border: 1px solid #f0f0f5;
            }
            .intro-icon-wrapper {
                width: 80px;
                height: 80px;
                background: #f4f5fc;
                border-radius: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0 auto 30px;
                font-size: 36px;
            }
            .intro-subtitle {
                color: #5d56c4;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 16px;
            }
            .intro-title {
                color: #1e202c;
                font-size: 44px;
                font-weight: 800;
                line-height: 1.2;
                margin-bottom: 24px;
                margin-top: 0;
            }
            .intro-description {
                color: #64748b;
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 35px;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            }
            .intro-tags {
                display: flex;
                justify-content: center;
                gap: 12px;
                margin-bottom: 40px;
                flex-wrap: wrap;
            }
            .intro-tag {
                background: #f4f5f9;
                color: #475569;
                padding: 8px 16px;
                border-radius: 100px;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .intro-tag-icon {
                font-size: 16px;
            }
            .intro-btn {
                background: #5648d4;
                color: white;
                border: none;
                padding: 16px 36px;
                border-radius: 12px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }
            .intro-btn:hover {
                background: #463bb5;
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(86, 72, 212, 0.2);
            }
            .intro-btn:active {
                transform: translateY(0);
            }
            
            @media (max-width: 600px) {
                .intro-title {
                    font-size: 32px;
                }
                .intro-card {
                    padding: 40px 20px;
                }
            }
        `;

        component.appendChild(style);

        const card = document.createElement("div");
        card.className = "intro-card";

        card.innerHTML = `
            <div class="intro-icon-wrapper">
                🔎
            </div>
            <div class="intro-subtitle">NHIỆM VỤ KHÁM PHÁ</div>
            <h1 class="intro-title">${title}</h1>
            <p class="intro-description">${description}</p>
            
            <div class="intro-tags">
                <div class="intro-tag">
                    <span class="intro-tag-icon">⏱</span> 15–20 phút
                </div>
                <div class="intro-tag">
                    <span class="intro-tag-icon">🧠</span> Khám phá
                </div>
                <div class="intro-tag">
                    <span class="intro-tag-icon">✍️</span> Thực hành
                </div>
            </div>
            
            <button class="intro-btn" id="intro-start-btn">
                Bắt đầu khám phá <span>→</span>
            </button>
        `;

        component.appendChild(card);

        // Bind event
        setTimeout(() => {
            const btn = component.querySelector("#intro-start-btn");
            if (btn) {
                btn.addEventListener("click", () => {
                    if (window.engine) {
                        window.engine.next();
                    }
                });
            }
        }, 0);

        return component;
    }
}

export default Intro;
