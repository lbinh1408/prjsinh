class LibraryComponent {

    static render(step) {
        const component = document.createElement("div");
        component.className = "component library-component";

        const poems = step.data?.poems || [];

        const style = document.createElement("style");
        style.innerHTML = `
        .library-component {
            font-family: Georgia, "Times New Roman", serif;
            background: #f7f5f0;
            color: #2d2a26;
            line-height: 1.7;
            padding-bottom: 50px;
        }

        .library-component button,
        .library-component input {
            font: inherit;
        }

        /* HERO */
        .library-hero {
            max-width: 1180px;
            margin: 0 auto;
            padding: 70px 30px 55px;
        }

        .library-hero-label {
            font-family: Arial, sans-serif;
            font-size: 13px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #887d6c;
            margin-bottom: 12px;
        }

        .library-hero h1 {
            font-size: 48px;
            line-height: 1.15;
            font-weight: normal;
            margin: 0 0 18px;
        }

        .library-hero p {
            max-width: 650px;
            font-size: 18px;
            color: #716b63;
            margin-bottom: 30px;
        }

        .library-search {
            max-width: 680px;
            position: relative;
        }

        .library-search input {
            width: 100%;
            border: 1px solid #d9d3c8;
            border-radius: 12px;
            padding: 16px 20px;
            background: white;
            outline: none;
            font-family: Arial, sans-serif;
        }

        .library-search input:focus {
            border-color: #9b9180;
        }

        /* MAIN */
        .library-main {
            max-width: 1180px;
            margin: auto;
            padding: 0 30px 80px;
        }

        .library-section {
            margin-bottom: 65px;
        }

        .library-section-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 20px;
        }

        .library-section h2 {
            font-size: 27px;
            font-weight: normal;
            margin: 0;
        }

        .library-section-header span {
            font-family: Arial, sans-serif;
            font-size: 13px;
            color: #888;
        }

        /* FEATURED */
        .library-featured {
            background: #ebe5d9;
            border-radius: 18px;
            min-height: 330px;
            padding: 45px;
            display: flex;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .library-featured::after {
            content: "“";
            position: absolute;
            right: 50px;
            top: -55px;
            font-size: 260px;
            color: rgba(255, 255, 255, .5);
        }

        .library-featured-content {
            max-width: 650px;
            position: relative;
            z-index: 2;
        }

        .library-featured .tag {
            display: inline-block;
            font-family: Arial, sans-serif;
            font-size: 12px;
            padding: 5px 10px;
            border-radius: 20px;
            background: rgba(255, 255, 255, .7);
            margin-bottom: 15px;
        }
            
        .library-featured .quote {
            font-size: 18px;
            font-style: italic;
            margin-bottom: 25px;
        }

        /* MOODS */
        .library-moods {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .library-mood {
            background: white;
            border: 1px solid #e3ded5;
            padding: 11px 18px;
            border-radius: 30px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-size: 14px;
            transition: .2s;
            color: grey;
        }
        .library-mood:hover, .library-mood.active {
            background: #eeeae2;
            border-color: #d1c9b8;
        }

        /* CARDS */
        .library-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }

        .library-card {
            background: #fffdf9;
            border: 1px solid #e5e0d6;
            border-radius: 15px;
            padding: 24px;
            min-height: 230px;
            display: flex;
            flex-direction: column;
            transition: .2s;
        }

        .library-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(70, 60, 45, .07);
        }

        .library-card .type {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #938878;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 18px;
        }

        .library-card h3 {
            font-size: 24px;
            font-weight: normal;
            margin: 0 0 5px;
        }

        .library-card .author {
            font-size: 14px;
            margin-bottom: 15px;
        }

        .library-card .description {
            font-size: 14px;
            color: #746f68;
            margin-bottom: 20px;
        }

        .library-card-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #888;
        }

        .library-read-link {
            color: #3d3933;
            text-decoration: none;
            font-weight: bold;
        }

        .library-btn {
            background: #332f29;
            color: #fffdf9;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-size: 14px;
            transition: .2s;
        }
        .library-btn:hover {
            background: #4a453c;
        }

        /* READER VIEW */
        .library-reader {
            display: none;
            background: #f7f5f0;
        }

        .library-reader-top {
            max-width: 900px;
            margin: auto;
            padding: 25px 30px;
            display: flex;
            justify-content: space-between;
            font-family: Arial, sans-serif;
        }

        .library-reader-top button {
            border: none;
            background: transparent;
            cursor: pointer;
            color: #6d665c;
        }

        .library-reader-content {
            max-width: 700px;
            margin: 45px auto 100px;
            padding: 0 30px;
        }

        .library-reader-meta {
            text-align: center;
            font-family: Arial, sans-serif;
            color: #918879;
            font-size: 13px;
            margin-bottom: 15px;
            text-transform: uppercase;
        }

        .library-reader-content h1 {
            text-align: center;
            font-size: 42px;
            font-weight: normal;
            margin-bottom: 5px;
        }

        .library-reader-author {
            text-align: center;
            color: #81796d;
            margin-bottom: 50px;
        }

        .library-poem {
            font-size: 20px;
            line-height: 2;
            text-align: center;
            white-space: pre-line;
        }

        .library-reader-divider {
            border: 0;
            border-top: 1px solid #dcd7ce;
            margin: 40px auto;
            width: 80%;
            max-width: 400px;
        }

        .library-section-title {
            text-align: center;
            font-size: 16px;
            font-family: Arial, sans-serif;
            color: #81796d;
            margin-bottom: 20px;
            letter-spacing: 1px;
        }

        .library-reader-slow {
            font-size: 18px;
            line-height: 1.8;
            color: #555;
            text-align: center;
            max-width: 500px;
            margin: 0 auto;
            white-space: pre-line;
        }

        .library-reader-inspiration {
            font-size: 17px;
            line-height: 1.8;
            color: #444;
            max-width: 550px;
            margin: 0 auto;
            list-style: none;
            padding: 0;
        }

        .library-reader-inspiration li {
            margin-bottom: 15px;
            position: relative;
            padding-left: 20px;
        }

        .library-reader-inspiration li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #999;
        }

        .library-reader-related {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .library-related-btn {
            background: #fffdf8;
            border: 1px solid #d9d3c8;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #555;
            cursor: pointer;
            text-decoration: none;
        }
        
        .library-related-btn:hover {
            background: #eeeae2;
        }

        .library-reader-actions {
            margin-top: 50px;
            padding-top: 25px;
            border-top: 1px solid #ddd7cd;
            display: flex;
            justify-content: center;
            gap: 10px;
        }

        .library-secondary-btn {
            background: white;
            border: 1px solid #d9d3c8;
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-family: Arial, sans-serif;
        }

        .library-microscope-view {
            display: none;
            background: #fdfbf7;
            border: 1px solid #ebdcc5;
            border-radius: 12px;
            padding: 30px;
            margin-top: 30px;
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }
        
        .library-microscope-view.active {
            display: block;
            animation: fadeIn 0.4s ease;
        }

        .library-microscope-title {
            font-family: Arial, sans-serif;
            font-weight: bold;
            color: #8c7b61;
            margin-bottom: 15px;
            font-size: 16px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 800px) {
            .library-hero h1 { font-size: 38px; }
            .library-grid { grid-template-columns: 1fr; }
            .library-featured { padding: 30px; }
        }
        `;

        const wrapper = document.createElement("div");
        wrapper.className = "library-wrapper";

        wrapper.innerHTML = `
            <div id="library-home-view">
                <section class="library-hero">
                <div class="library-hero-label">Một góc nhỏ để đọc</div>
                <h1>Có những lúc,<br>ta chỉ cần một bài thơ.</h1>
                <p>Đọc một chút khi muốn thư giãn. Đọc một chút khi cần cảm hứng. Hoặc đơn giản là tình cờ gặp một câu chữ khiến mình muốn dừng lại.</p>
                <div class="library-search">
                    <input type="text" id="library-search-input" placeholder="Tìm bài thơ, tác giả, chủ đề...">
                </div>
            </section>
            
            <main class="library-main">
                <section class="library-section" id="library-today-section" style="display:none;">
                    <div class="library-section-header">
                        <h2>🌿 Hôm nay đọc gì?</h2>
                        <span>Một lựa chọn ngẫu nhiên</span>
                    </div>
                    <div class="library-featured">
                        <div class="library-featured-content">
                            <div class="tag" id="library-today-tag"></div>
                            <h3 id="library-today-title" style="font-size: 32px; font-weight: normal; margin: 15px 0 5px;"></h3>
                            <div class="author" id="library-today-author" style="color: #666; margin-bottom: 20px;"></div>
                            <div class="quote" id="library-today-quote"></div>
                            <button class="library-btn" id="library-today-btn">
                                Đọc bài thơ →
                            </button>
                        </div>
                    </div>
                </section>
                
                <section class="library-section">
                    <div class="library-section-header">
                        <h2>💭 Em muốn đọc gì hôm nay?</h2>
                    </div>
                    <div class="library-moods">
                        <button class="library-mood active" data-keyword="">🌈 Tất cả</button>
                        <button class="library-mood" data-keyword="bình yên">🌧️ Một chút bình yên</button>
                        <button class="library-mood" data-keyword="tuổi trẻ">🌱 Tuổi trẻ</button>
                        <button class="library-mood" data-keyword="động lực">🔥 Động lực</button>
                        <button class="library-mood" data-keyword="buồn">🌙 Đọc khi buồn</button>
                        <button class="library-mood" data-keyword="quê hương">🏡 Quê hương</button>
                        <button class="library-mood" data-keyword="tình yêu">❤️ Tình yêu</button>
                        <button class="library-mood" data-keyword="thời gian">⏳ Thời gian</button>
                        <button class="library-mood" data-keyword="thiếu nhi">🧸 Thiếu nhi</button>
                        <button class="library-mood" data-keyword="ước mơ">✨ Ước mơ</button>
                    </div>
                </section>

                <section class="library-section">
                    <div class="library-section-header">
                        <h2>✨ Những bài thơ có thể em sẽ thích</h2>
                        <span>${poems.length} tác phẩm</span>
                    </div>
                    <div class="library-grid" id="library-poem-grid"></div>
                </section>
                
                <section class="library-section">
                    <div class="library-section-header">
                        <h2>✨ Góc cảm hứng</h2>
                    </div>
                    <div class="library-featured">
                        <div class="library-featured-content">
                            <div class="tag">Đọc một câu thôi</div>
                            <div class="quote">“Không phải mọi bài thơ đều cần được giải thích. Có những câu chữ chỉ cần được giữ lại trong lòng.”</div>
                        </div>
                    </div>
                </section>
            </main>
            </div>

            <!-- READER MODAL -->
            <section id="library-reader" class="library-reader">
                <div class="library-reader-top">
                    <button id="library-close-btn">← Quay lại thư viện</button>
                    <button>♡ Lưu bài thơ</button>
                </div>
                <div class="library-reader-content">
                    <div class="library-reader-meta" id="lib-reader-meta"></div>
                    <h1 id="lib-reader-title"></h1>
                    <div class="library-reader-author" id="lib-reader-author"></div>
                    
                    <hr class="library-reader-divider">
                    <div class="library-section-title">VĂN BẢN</div>
                    <div class="library-poem" id="lib-reader-poem"></div>
                    
                    <hr class="library-reader-divider">
                    <div class="library-section-title">💭 ĐỌC CHẬM MỘT CHÚT</div>
                    <div class="library-reader-slow" id="lib-reader-slow"></div>
                    
                    <hr class="library-reader-divider">
                    <div class="library-section-title">✨ GÓC CẢM HỨNG</div>
                    <ul class="library-reader-inspiration" id="lib-reader-inspiration"></ul>
                    
                    <hr class="library-reader-divider">
                    <div class="library-section-title">📚 CÓ THỂ LÀ</div>
                    <div class="library-reader-related" id="lib-reader-related"></div>

                    <div class="library-reader-actions">
                        <button class="library-secondary-btn">♡ Lưu</button>
                        <button class="library-secondary-btn">✨ Chia sẻ</button>
                        <button class="library-secondary-btn" id="lib-microscope-btn" style="border-color: #c9ba9c; color: #8c7b61;">
                            🔬 Soi một chút
                        </button>
                    </div>
                    
                    <div class="library-microscope-view" id="lib-microscope-view">
                        <div class="library-microscope-title" id="lib-microscope-title">🔬 Soi một chút</div>
                        <div class="library-reader-slow" style="text-align: left; max-width: 100%;" id="lib-microscope-content"></div>
                        <div style="margin-top: 20px; font-size: 14px; color: #777; font-style: italic;" id="lib-microscope-author"></div>
                    </div>
                </div>
            </section>
        `;

        component.appendChild(style);
        component.appendChild(wrapper);

        // Setup "Hôm nay đọc gì?"
        if (poems.length > 0) {
            const randomPoem = poems[Math.floor(Math.random() * poems.length)];
            const todaySection = wrapper.querySelector("#library-today-section");
            todaySection.style.display = "block";

            wrapper.querySelector("#library-today-tag").innerText = randomPoem.type || 'Thơ';
            wrapper.querySelector("#library-today-title").innerText = randomPoem.title;
            wrapper.querySelector("#library-today-author").innerText = randomPoem.author;
            // Use slowReading or description for the quote
            const quoteText = randomPoem.slowReading || randomPoem.description || "";
            wrapper.querySelector("#library-today-quote").innerText = "“" + quoteText.split('\\n')[0] + "”";

            const todayBtn = wrapper.querySelector("#library-today-btn");
            todayBtn.addEventListener("click", () => {
                this.openPoem(wrapper, poems, randomPoem.id);
            });
        }

        // Render Cards
        const grid = wrapper.querySelector("#library-poem-grid");
        poems.forEach(poem => {
            const article = document.createElement("article");
            article.className = "library-card";
            article.dataset.search = (poem.searchTerms || "").toLowerCase();
            article.innerHTML = `
                <div class="type">${poem.type || 'Thơ'}</div>
                <h3>${poem.title}</h3>
                <div class="author">${poem.author}</div>
                <div class="description">${poem.description}</div>
                <div class="library-card-footer">
                    <span>${poem.tag}</span>
                    <a href="#" class="library-read-link">Đọc →</a>
                </div>
            `;

            // Event listener to open reader
            const link = article.querySelector(".library-read-link");
            link.addEventListener("click", (e) => {
                e.preventDefault();
                this.openPoem(wrapper, poems, poem.id);
            });
            grid.appendChild(article);
        });

        // Search logic
        const searchInput = wrapper.querySelector("#library-search-input");
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            const cards = wrapper.querySelectorAll(".library-card");
            cards.forEach(card => {
                const text = card.dataset.search;
                if (text.includes(keyword)) {
                    card.style.display = "";
                } else {
                    card.style.display = "none";
                }
            });
        });

        // Mood filter logic
        const moodBtns = wrapper.querySelectorAll(".library-mood");
        moodBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                moodBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                searchInput.value = btn.dataset.keyword;
                searchInput.dispatchEvent(new Event("input"));
            });
        });

        // Sync mood buttons when typing in search
        searchInput.addEventListener("input", (e) => {
            if (e.isTrusted) { // Only user typing
                moodBtns.forEach(b => b.classList.remove("active"));
                if (e.target.value.trim() === "") {
                    wrapper.querySelector(".library-mood[data-keyword='']").classList.add("active");
                }
            }
        });

        // Modal close
        const closeBtn = wrapper.querySelector("#library-close-btn");
        closeBtn.addEventListener("click", () => {
            wrapper.querySelector("#library-reader").style.display = "none";
            wrapper.querySelector("#library-home-view").style.display = "block";
            const container = document.getElementById("lesson-container");
            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Toggle Microscope
        const microscopeBtn = wrapper.querySelector("#lib-microscope-btn");
        microscopeBtn.addEventListener("click", () => {
            wrapper.querySelector("#lib-microscope-view").classList.toggle("active");
        });

        return component;
    }

    static openPoem(wrapper, poems, poemId) {
        const poem = poems.find(p => p.id === poemId);
        if (!poem) return;

        wrapper.querySelector("#lib-reader-meta").innerText = `[ Chủ đề: ${poem.topics ? poem.topics.join(' · ') : ''} ]`;
        wrapper.querySelector("#lib-reader-title").innerText = poem.title;
        wrapper.querySelector("#lib-reader-author").innerText = `[ ${poem.author} ]`;
        wrapper.querySelector("#lib-reader-poem").innerText = poem.content;
        wrapper.querySelector("#lib-reader-slow").innerText = poem.slowReading;

        const ul = wrapper.querySelector("#lib-reader-inspiration");
        ul.innerHTML = "";
        if (poem.inspiration) {
            poem.inspiration.forEach(item => {
                const li = document.createElement("li");
                li.innerText = item;
                ul.appendChild(li);
            });
        }

        const related = wrapper.querySelector("#lib-reader-related");
        related.innerHTML = "";
        if (poem.related) {
            poem.related.forEach(rel => {
                const a = document.createElement("a");
                a.href = "#";
                a.className = "library-related-btn";
                a.innerText = `[ ${rel.title} ]`;
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.openPoem(wrapper, poems, rel.id);
                });
                related.appendChild(a);
            });
        }

        if (poem.microscope) {
            wrapper.querySelector("#lib-microscope-title").innerText = poem.microscope.title;
            wrapper.querySelector("#lib-microscope-content").innerText = poem.microscope.content;
            wrapper.querySelector("#lib-microscope-author").innerText = poem.microscope.authorInfo;
        }

        wrapper.querySelector("#lib-microscope-view").classList.remove("active");

        wrapper.querySelector("#library-home-view").style.display = "none";
        wrapper.querySelector("#library-reader").style.display = "block";
        const container = document.getElementById("lesson-container");
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export default LibraryComponent;
