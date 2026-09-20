/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * hint.js
 * ==========================================================
 */

class Hint {

    static current = 0;

    /**
     * ======================================================
     * SHOW
     * ======================================================
     */

    static show(step){

        if(!step)
            return;

        const hints = step.hints || [];

        if(hints.length === 0){

            this.message("Bài này chưa có gợi ý.");

            return;

        }

        const hint = hints[
            Math.min(
                this.current,
                hints.length - 1
            )
        ];

        this.render(hint);

        if(this.current < hints.length - 1){

            this.current++;

        }

    }

    /**
     * ======================================================
     * RESET
     * ======================================================
     */

    static reset(){

        this.current = 0;

        this.clear();

    }

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(text){

        const panel =
            document.getElementById(
                "hint-panel"
            );

        if(!panel)
            return;

        panel.innerHTML = `

            <div class="feedback-panel feedback-info">

                <div class="feedback-title">

                    💡 Gợi ý

                </div>

                <div class="feedback-message">

                    ${text}

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * MESSAGE
     * ======================================================
     */

    static message(text){

        const panel =
            document.getElementById(
                "hint-panel"
            );

        if(!panel)
            return;

        panel.innerHTML = `

            <div class="feedback-panel">

                <div class="feedback-message">

                    ${text}

                </div>

            </div>

        `;

    }

    /**
     * ======================================================
     * CLEAR
     * ======================================================
     */

    static clear(){

        const panel =
            document.getElementById(
                "hint-panel"
            );

        if(panel){

            panel.innerHTML = "";

        }

    }

    /**
     * ======================================================
     * HAS HINT
     * ======================================================
     */

    static has(step){

        return !!(

            step &&

            step.hints &&

            step.hints.length

        );

    }

    /**
     * ======================================================
     * COUNT
     * ======================================================
     */

    static count(step){

        if(!this.has(step))
            return 0;

        return step.hints.length;

    }

    /**
     * ======================================================
     * REMAINING
     * ======================================================
     */

    static remaining(step){

        return Math.max(

            0,

            this.count(step) - this.current

        );

    }

    /**
     * ======================================================
     * HIDE
     * ======================================================
     */

    static hide(){

        const panel =
            document.getElementById(
                "hint-panel"
            );

        if(panel){

            panel.style.display = "none";

        }

    }

    /**
     * ======================================================
     * DISPLAY
     * ======================================================
     */

    static display(){

        const panel =
            document.getElementById(
                "hint-panel"
            );

        if(panel){

            panel.style.display = "block";

        }

    }

}

export default Hint;