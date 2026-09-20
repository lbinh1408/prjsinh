/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * timer.js
 * ==========================================================
 */

import Storage from "./storage.js";

class Timer {

    constructor() {

        this.elapsed = 0;

        this.running = false;

        this.startedAt = null;

    }

    start() {

        if (this.running)
            return;

        this.running = true;

        this.startedAt = Date.now();

    }

    stop() {

        if (!this.running)
            return this.elapsed;

        this.elapsed += Date.now() - this.startedAt;

        this.startedAt = null;

        this.running = false;

        return this.elapsed;

    }

    reset() {

        this.elapsed = 0;

        this.running = false;

        this.startedAt = null;

        return this.elapsed;

    }

    getElapsed() {

        if (!this.running || this.startedAt === null)
            return this.elapsed;

        return this.elapsed + (Date.now() - this.startedAt);

    }

    getSeconds() {

        return Math.floor(this.getElapsed() / 1000);

    }

    /**
     * ======================================================
     * PERSISTENCE (STATIC)
     * ======================================================
     */

    static save(lessonId, seconds) {
        
        Storage.saveTimer(lessonId, {
            seconds: Number.isFinite(seconds) ? seconds : 0,
            updated: new Date().toISOString()
        });
        
        return this.load(lessonId);
    }

    static load(lessonId) {
        
        return Storage.loadTimer(lessonId);
        
    }

    static clear(lessonId) {
        
        Storage.clearTimer(lessonId);
        
    }

}

export default Timer;
