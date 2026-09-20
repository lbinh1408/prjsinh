/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * feedback.js
 * ==========================================================
 */

class Feedback {

    /**
     * ======================================================
     * SUCCESS
     * ======================================================
     */

    static success(message, title = "Chính xác!") {

        this.toast({

            type: "success",

            title,

            message

        });

    }

    /**
     * ======================================================
     * ERROR
     * ======================================================
     */

    static error(message, title = "Chưa đúng") {

        this.toast({

            type: "error",

            title,

            message

        });

    }

    /**
     * ======================================================
     * WARNING
     * ======================================================
     */

    static warning(message, title = "Lưu ý") {

        this.toast({

            type: "warning",

            title,

            message

        });

    }

    /**
     * ======================================================
     * INFO
     * ======================================================
     */

    static info(message, title = "Thông tin") {

        this.toast({

            type: "info",

            title,

            message

        });

    }

    /**
     * ======================================================
     * TOAST
     * ======================================================
     */

    static toast({

        type = "info",

        title = "",

        message = "",

        duration = 3000

    }) {

        const container = document.getElementById("toast");

        if (!container)
            return;

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        toast.innerHTML = `

            <div class="toast-icon">

                ${this.icon(type)}

            </div>

            <div class="toast-content">

                <div class="toast-title">

                    ${title}

                </div>

                <div class="toast-message">

                    ${message}

                </div>

            </div>

            <div class="toast-close">

                ✕

            </div>

        `;

        container.appendChild(toast);

        toast.querySelector(".toast-close")
            .addEventListener(

                "click",

                () => this.remove(toast)

            );

        setTimeout(() => {

            this.remove(toast);

        }, duration);

    }

    /**
     * ======================================================
     * REMOVE
     * ======================================================
     */

    static remove(toast) {

        if (!toast)
            return;

        toast.style.opacity = 0;

        toast.style.transform = "translateX(40px)";

        setTimeout(() => {

            toast.remove();

        }, 250);

    }

    /**
     * ======================================================
     * ICON
     * ======================================================
     */

    static icon(type) {

        switch (type) {

            case "success":

                return "✅";

            case "error":

                return "❌";

            case "warning":

                return "⚠️";

            case "info":

                return "ℹ️";

            default:

                return "💬";

        }

    }

    /**
     * ======================================================
     * RESULT PANEL
     * ======================================================
     */

    static render(panel) {

        const container = document.getElementById(

            "feedback-panel"

        );

        if (!container)
            return;

        container.innerHTML = panel;

    }

    /**
     * ======================================================
     * CLEAR
     * ======================================================
     */

    static clear() {

        const panel = document.getElementById(

            "feedback-panel"

        );

        if (panel) {

            panel.innerHTML = "";

        }

    }

    /**
     * ======================================================
     * SHOW SCORE
     * ======================================================
     */

    static showScore(score, max) {

        this.render(`

            <div class="feedback-panel feedback-info">

                <div class="feedback-title">

                    Kết quả

                </div>

                <div class="feedback-score">

                    <div class="feedback-score-value">

                        ${score}/${max}

                    </div>

                </div>

            </div>

        `);

    }

    /**
     * ======================================================
     * SHOW EXPLANATION
     * ======================================================
     */

    static explanation(text) {

        this.render(`

            <div class="feedback-panel">

                <div class="feedback-title">

                    Giải thích

                </div>

                <div class="feedback-explanation">

                    ${text}

                </div>

            </div>

        `);

    }

}

export default Feedback;