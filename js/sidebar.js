/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * sidebar.js
 * ==========================================================
 */

class Sidebar {

    static roadmap = [];

    static lesson = null;

    static expandedSubject = null;

    static currentLessonId = null;

    /**
     * ======================================================
     * INIT
     * ======================================================
     */

    static init(roadmap = []) {

        this.roadmap = roadmap;

        const hash = window.location.hash;
        const match = hash.match(/id=([^&]+)/);
        if (match) {
            this.currentLessonId = match[1];
            let subjectFound = null;
            for (const mod of this.roadmap) {
                subjectFound = (mod.subjects || []).find(s => s.lessons && s.lessons.some(l => l.id === this.currentLessonId));
                if (subjectFound) break;
            }
            if (subjectFound) {
                this.expandedSubject = subjectFound.id;
            }
        } else if (this.roadmap.length > 0 && this.roadmap[0].subjects && this.roadmap[0].subjects.length > 0) {
            this.expandedSubject = this.roadmap[0].subjects[0].id;
        }

        this.renderRoadmap();

    }

    /**
     * ======================================================
     * SET LESSON
     * ======================================================
     */

    static setLesson(lesson) {

        this.lesson = lesson;

        this.renderLesson();

    }

    /**
     * ======================================================
     * UPDATE
     * ======================================================
     */

    static update(current, total) {
        this.updateProgress(current, total);
        // Step highlighting is removed in Sprint 3 as Sidebar only shows lessons.
    }

    /**
     * ======================================================
     * ROADMAP
     * ======================================================
     */

    static renderRoadmap() {

        const container =
            document.getElementById(
                "roadmap-panel"
            );

        if (!container)
            return;

        container.innerHTML =
            this.roadmap.map((mod, modIndex) => {
                let subjectsHtml = (mod.subjects || []).map((subject, index) => {
                    const isExpanded = this.expandedSubject === subject.id;
                    let lessonsHtml = "";
                    if (isExpanded && subject.lessons && subject.lessons.length > 0) {
                        lessonsHtml = `
                            <div class="lesson-list subject-lessons">
                                ${subject.lessons.map(lesson => {
                            const isCurrent = this.currentLessonId === lesson.id;
                            let stateIcon = "●";
                            let cssClass = "lesson-item";

                            if (lesson.enabled === false) {
                                stateIcon = "🔒";
                                cssClass += " locked";
                            } else if (lesson.completed) {
                                stateIcon = "✔";
                                cssClass += " completed";
                            }

                            if (isCurrent) cssClass += " active";

                            return `
                                        <div class="${cssClass}" onclick="Sidebar.selectLesson('${lesson.id}', ${lesson.enabled !== false})">
                                            <span class="lesson-state-icon">${stateIcon}</span>
                                            <span>${lesson.title}</span>
                                        </div>
                                    `;
                        }).join("")}
                            </div>
                        `;
                    }
                    return `
                        <div class="subject-container">
                            <div
                                class="roadmap-item ${isExpanded ? 'expanded' : ''}"
                                data-index="${index}"
                                onclick="Sidebar.toggleSubject('${subject.id}')">
                                <div class="roadmap-icon">
                                    ${subject.icon || "📘"}
                                </div>
                                <div class="roadmap-content">
                                    <div class="roadmap-name">
                                        ${subject.name}
                                    </div>
                                    ${subject.description ? `<div class="roadmap-desc">${subject.description}</div>` : ""}
                                </div>
                            </div>
                            ${lessonsHtml}
                        </div>
                    `;
                }).join("");

                return `
                    <div class="module-container" style="margin-bottom: 20px;">
                        <div class="module-header" style="font-weight: 800; color: #475569; font-size: 0.9rem; padding: 10px 15px; background: #f1f5f9; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #6d5dfc;">
                            ${mod.name}
                        </div>
                        ${subjectsHtml}
                    </div>
                `;
            }).join("");

    }

    static toggleSubject(subjectId) {

        if (this.expandedSubject === subjectId) {
            this.expandedSubject = null;
        } else {
            this.expandedSubject = subjectId;
        }
        this.renderRoadmap();

    }

    static selectLesson(lessonId, isEnabled) {

        if (!isEnabled) return;
        this.highlightLesson(lessonId);
        window.location.hash = "#/lesson?id=" + lessonId;

    }

    static highlightLesson(lessonId) {
        this.currentLessonId = lessonId;
        let subject = null;
        for (const mod of this.roadmap) {
            subject = (mod.subjects || []).find(s => s.lessons && s.lessons.some(l => l.id === this.currentLessonId));
            if (subject) break;
        }
        if (subject) {
            this.expandedSubject = subject.id;
        }
        this.renderRoadmap();
    }

    /**
     * ======================================================
     * LESSON
     * ======================================================
     */

    static renderLesson() {

        const container =

            document.getElementById(

                "lesson-list"

            );

        if (

            !container ||

            !this.lesson

        ) {

            return;

        }

        container.innerHTML =

            this.lesson.steps.map(

                (step, index) => `

                <div
                    class="lesson-item"
                    data-step="${index}">

                    <span>

                        ${step.icon || "📄"}

                    </span>

                    <span>

                        ${step.name}

                    </span>

                </div>

            `).join("");

    }

    /**
     * ======================================================
     * PROGRESS
     * ======================================================
     */

    static updateProgress(current, total) {

        const text =

            document.getElementById(

                "sidebar-progress-text"

            );

        if (text) {

            text.innerHTML =

                `${current + 1}/${total}`;

        }

        const bar =

            document.getElementById(

                "sidebar-progress-bar"

            );

        if (bar) {

            bar.style.width =

                `${((current + 1) / total) * 100}%`;

        }

    }

    /**
     * ======================================================
     * HIGHLIGHT
     * ======================================================
     */

    static highlightStep(current) {

        document

            .querySelectorAll(

                ".lesson-item"

            )

            .forEach(

                item => item.classList.remove(

                    "active"

                )

            );

        const currentItem =

            document.querySelector(

                `.lesson-item[data-step="${current}"]`

            );

        if (currentItem) {

            currentItem.classList.add(

                "active"

            );

        }

    }

    /**
     * ======================================================
     * COMPLETE STEP
     * ======================================================
     */

    static complete(index) {

        const item =

            document.querySelector(

                `.lesson-item[data-step="${index}"]`

            );

        if (item) {

            item.classList.add(

                "completed"

            );

        }

    }

    /**
     * ======================================================
     * LOCK STEP
     * ======================================================
     */

    static lock(index) {

        const item =

            document.querySelector(

                `.lesson-item[data-step="${index}"]`

            );

        if (item) {

            item.classList.add(

                "locked"

            );

        }

    }

    /**
     * ======================================================
     * UNLOCK STEP
     * ======================================================
     */

    static unlock(index) {

        const item =

            document.querySelector(

                `.lesson-item[data-step="${index}"]`

            );

        if (item) {

            item.classList.remove(

                "locked"

            );

        }

    }

    /**
     * ======================================================
     * COLLAPSE
     * ======================================================
     */

    static collapse() {

        document

            .getElementById("sidebar")

            ?.classList.add(

                "collapsed"

            );

    }

    /**
     * ======================================================
     * EXPAND
     * ======================================================
     */

    static expand() {

        document

            .getElementById("sidebar")

            ?.classList.remove(

                "collapsed"

            );

    }

    /**
     * ======================================================
     * TOGGLE
     * ======================================================
     */

    static toggle() {

        document

            .getElementById("sidebar")

            ?.classList.toggle(

                "collapsed"

            );

    }

}

window.Sidebar = Sidebar;
export default Sidebar;