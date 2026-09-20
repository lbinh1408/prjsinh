/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * summary.js
 * ==========================================================
 */

import ScoreEngine from "./scoreEngine.js";
import Storage from "./storage.js";
import State from "./state.js";
import Timer from "./timer.js";

class Summary {

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(){

        const container =
            document.getElementById(
                "lesson-container"
            );

        if(!container)
            return;

        const score =
            ScoreEngine.export();

        const lesson =
            State.lesson();

        container.innerHTML = `
            <style>
                .result-card { text-align: center; max-width: 800px; margin: 40px auto; background: var(--surface, #ffffff); border-radius: 28px; padding: 50px 40px; box-shadow: 0 8px 30px rgba(31, 41, 55, 0.05); border: 1px solid #e4e8f0; font-family: 'Inter', sans-serif; }
                .result-icon { width: 84px; height: 84px; margin: 0 auto 18px; background: #eaf8f1; color: #16855b; border-radius: 26px; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; }
                .section-kicker { color: #4f46e5; font-size: 14px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 10px; }
                .result-card h2 { font-size: 32px; margin: 0 0 15px; color: #172033; font-weight: 800; }
                .result-card .description { color: #667085; font-size: 16px; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6; }
                .skills { display: flex; flex-direction: column; gap: 18px; text-align: left; margin-bottom: 40px; padding: 0 20px; }
                .skill { display: grid; grid-template-columns: 180px 1fr 50px; gap: 15px; align-items: center; }
                .skill-name { font-size: 15px; font-weight: 700; color: #172033; }
                .skill-track { height: 10px; background: #e9edf5; border-radius: 99px; overflow: hidden; }
                .skill-fill { height: 100%; background: #4f46e5; border-radius: 99px; }
                .skill-percent { text-align: right; font-size: 14px; color: #667085; font-weight: 600; }
                .next-skill { background: #fff7df; border-radius: 16px; padding: 30px; text-align: left; margin: 0 20px; }
                .next-skill strong { font-size: 16px; color: #172033; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-weight: 800; }
                .next-skill p { color: #172033; margin: 0 0 25px; font-size: 15px; line-height: 1.6; }
                .next-skill .btn-secondary { background: #eff2f6; border: none; color: #172033; padding: 14px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 15px; }
                .next-skill .btn-secondary:hover { background: #e4e8f0; }
                .restart-btn-container { text-align: center; margin-top: 40px; }
                .btn-primary { background: #4f46e5; color: white; border: none; padding: 15px 30px; border-radius: 14px; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); display: inline-flex; align-items: center; gap: 8px; }
                .btn-primary:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(79, 70, 229, 0.25); }
                
                @media (max-width: 600px) {
                    .skill { grid-template-columns: 1fr; gap: 8px; }
                    .skill-percent { text-align: left; }
                    .result-card { padding: 30px 20px; }
                    .skills, .next-skill { padding: 0; margin-left: 0; margin-right: 0; }
                }
            </style>
            
            <section class="lesson-summary">
                <div class="result-card">
                    <div class="result-icon">✓</div>
                    <div class="section-kicker">🎉 Hoàn thành</div>
                    <h2>Em đã khám phá được Danh từ</h2>
                    <p class="description">
                        Quan trọng hơn việc nhớ định nghĩa, em đã thử nhận ra và sử dụng danh từ trong ngữ cảnh.
                    </p>
                    
                    <div class="skills">
                        <div class="skill">
                            <div class="skill-name">Nhận biết</div>
                            <div class="skill-track"><div class="skill-fill" style="width:90%"></div></div>
                            <div class="skill-percent">90%</div>
                        </div>
                        <div class="skill">
                            <div class="skill-name">Hiểu bản chất</div>
                            <div class="skill-track"><div class="skill-fill" style="width:80%"></div></div>
                            <div class="skill-percent">80%</div>
                        </div>
                        <div class="skill">
                            <div class="skill-name">Sử dụng</div>
                            <div class="skill-track"><div class="skill-fill" style="width:70%"></div></div>
                            <div class="skill-percent">70%</div>
                        </div>
                        <div class="skill">
                            <div class="skill-name">Trong ngữ cảnh</div>
                            <div class="skill-track"><div class="skill-fill" style="width:60%"></div></div>
                            <div class="skill-percent">60%</div>
                        </div>
                        <div class="skill">
                            <div class="skill-name">Vận dụng khi viết</div>
                            <div class="skill-track"><div class="skill-fill" style="width:80%"></div></div>
                            <div class="skill-percent">80%</div>
                        </div>
                    </div>
                    
                    <div class="next-skill">
                        <strong>🔎 Kỹ năng nên luyện tiếp</strong>
                        <p>
                            Em đã hiểu danh từ là gì. Bước tiếp theo là luyện khả năng nhận diện từ loại khi từ xuất hiện trong những ngữ cảnh dễ nhầm.
                        </p>
                        <button class="btn btn-secondary" onclick="alert('Trong hệ thống thật, nút này sẽ mở bài học rèn luyện kỹ năng tương ứng.')">
                            Luyện đúng kỹ năng này →
                        </button>
                    </div>
                    
                    <div class="restart-btn-container">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            ↻ Học lại bài
                        </button>
                    </div>
                </div>
            </section>
        `;

    }

    /**
     * ======================================================
     * HEADER
     * ======================================================
     */

    static header(lesson){

        return `

            <div class="summary-header">

                <h1>

                    🎉 Hoàn thành bài học

                </h1>

                <p>

                    ${lesson?.title || ""}

                </p>

            </div>

        `;

    }

    /**
     * ======================================================
     * SCORE
     * ======================================================
     */

    static score(result){

        return `

            <div class="summary-score">

                <div class="summary-score-value">

                    ${result.score}

                </div>

                <div class="summary-score-max">

                    / ${result.max}

                </div>

                <div class="summary-percent">

                    ${result.percent}%

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * STATISTICS
     * ======================================================
     */

    static statistics(result){

        const total =
            result.details.length;

        const correct =
            result.details.filter(

                item => item.score >= item.max

            ).length;

        const lesson = State.lesson();

        const timer = Timer.load(lesson?.id);

        const elapsedSeconds = timer?.seconds || 0;

        return `

            <div class="summary-statistics">

                <div class="stat-box">

                    <div class="stat-number">

                        ${total}

                    </div>

                    <div class="stat-label">

                        Tổng bước

                    </div>

                </div>

                <div class="stat-box">

                    <div class="stat-number">

                        ${correct}

                    </div>

                    <div class="stat-label">

                        Hoàn thành

                    </div>

                </div>

                <div class="stat-box">

                    <div class="stat-number">

                        ${result.percent}%

                    </div>

                    <div class="stat-label">

                        Chính xác

                    </div>

                </div>

                <div class="stat-box">

                    <div class="stat-number">

                        ${elapsedSeconds}s

                    </div>

                    <div class="stat-label">

                        Thời gian

                    </div>

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * DETAIL TABLE
     * ======================================================
     */

    static details(result){

        let html = `

            <table class="summary-table">

                <thead>

                    <tr>

                        <th>Bước</th>

                        <th>Loại</th>

                        <th>Điểm</th>

                    </tr>

                </thead>

                <tbody>

        `;

        result.details.forEach(item=>{

            html += `

                <tr>

                    <td>${item.id}</td>

                    <td>${item.type}</td>

                    <td>

                        ${item.score}/${item.max}

                    </td>

                </tr>

            `;

        });

        html += `

                </tbody>

            </table>

        `;

        return html;

    }

    /**
     * ======================================================
     * EXPORT
     * ======================================================
     */

    static export(){

        return {

            lesson:State.lesson(),

            score:ScoreEngine.export(),

            storage:Storage.statistics()

        };

    }

}

export default Summary;