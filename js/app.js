/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * app.js
 * ==========================================================
 */

import Router from "./router.js";
import Engine from "./engine.js";
import Storage from "./storage.js";
import Progress from "./progress.js";
import Sidebar from "./sidebar.js";
import Keyboard from "./keyboard.js";
import Animation from "./animation.js";

class App {

    constructor() {

        this.router = null;

        this.engine = null;

        this.lesson = null;

        this.roadmap = null;

        this.currentLesson = null;

    }

    async init() {

        this.showLoading();

        await this.loadData();

        this.initModules();

        this.bindEvents();

        await this.start();

        this.hideLoading();

    }

    async loadData() {

        const lessonResponse =
            await fetch("./data/lessons/tu-loai/01-danh-tu.json");

        this.lesson = await lessonResponse.json();

        const roadmapResponse =
            await fetch("./data/roadmap.json");

        this.roadmap =
            await roadmapResponse.json();

    }

    initModules() {

        Storage.init();

        Progress.init();

        Sidebar.init(this.roadmap.modules || []);

        Keyboard.init();

        Animation.init();

        this.router = new Router();

        this.engine = new Engine();
        window.engine = this.engine; // Expose globally for components

    }

    bindEvents() {

        window.addEventListener(

            "hashchange",

            () => this.navigate()

        );

        document
            .getElementById("btn-home")
            ?.addEventListener(

                "click",

                () => {

                    location.hash = "#/";

                }

            );

        document
            .getElementById("btn-next")
            ?.addEventListener(

                "click",

                () => {

                    this.engine.next();

                }

            );

        document
            .getElementById("btn-prev")
            ?.addEventListener(

                "click",

                () => {

                    this.engine.previous();

                }

            );

        document
            .getElementById("btn-hint")
            ?.addEventListener(

                "click",

                () => {

                    this.engine.showHint();

                }

            );

        document
            .getElementById("btn-retry")
            ?.addEventListener(

                "click",

                () => {

                    this.engine.retry();

                }

            );

        document
            .getElementById("btn-check")
            ?.addEventListener(

                "click",

                () => {

                    this.engine.checkAnswer();

                }

            );


    }

    async start() {

        await this.navigate();

    }

    async navigate() {

        const route =
            this.router.resolve();

        switch (route.page) {

            case "lesson":
                const lessonId = route.query.id;
                let foundLessonMeta = null;
                let subjectFolder = "";

                if (lessonId && this.roadmap && this.roadmap.modules) {
                    for (const mod of this.roadmap.modules) {
                        for (const subject of (mod.subjects || [])) {
                            if (subject.lessons) {
                                const found = subject.lessons.find(l => l.id === lessonId);
                                if (found) {
                                    foundLessonMeta = found;
                                    subjectFolder = subject.folder;
                                    break;
                                }
                            }
                        }
                        if (foundLessonMeta) break;
                    }
                }

                if (foundLessonMeta) {
                    Sidebar.highlightLesson(lessonId);
                    try {
                        this.showLoading();
                        const response = await fetch(`./data/${subjectFolder}${foundLessonMeta.file}`);
                        let loadedJson = await response.json();
                        if (loadedJson && loadedJson.steps) {
                            loadedJson.steps = loadedJson.steps.map(step => {
                                if (step.data) {
                                    return { ...step, ...step.data };
                                }
                                return step;
                            });
                        }
                        this.currentLesson = loadedJson;
                    } catch (e) {
                        console.error("Failed to load lesson", e);
                        this.currentLesson = this.lesson;
                    } finally {
                        this.hideLoading();
                    }
                } else {
                    this.currentLesson = this.lesson;
                }

                await this.engine.start(
                    this.currentLesson,
                    this.roadmap
                );
                break;

            default:

                this.currentLesson = this.lesson;

                await this.engine.start(

                    this.currentLesson,

                    this.roadmap

                );

        }

    }

    showLoading() {

        const loading =
            document.getElementById(

                "loading-screen"

            );

        if (loading)

            loading.style.display = "flex";

    }

    hideLoading() {

        const loading =
            document.getElementById(

                "loading-screen"

            );

        if (loading)

            loading.style.display = "none";

    }

}

window.addEventListener(

    "DOMContentLoaded",

    async () => {

        const app = new App();

        await app.init();

    }

);

export default App;