/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * progress.js
 * ==========================================================
 */

import Storage from "./storage.js";

class Progress {

    static current = 0;

    static total = 0;

    /**
     * ======================================================
     * INIT
     * ======================================================
     */

    static init(){

        this.current = 0;

        this.total = 0;

    }

    /**
     * ======================================================
     * UPDATE
     * ======================================================
     */

    static update(

        current,

        total

    ){

        this.current = current;

        this.total = total;

        this.render();

    }

    /**
     * ======================================================
     * RENDER
     * ======================================================
     */

    static render(){

        this.renderBar();

        this.renderText();

    }

    /**
     * ======================================================
     * PROGRESS BAR
     * ======================================================
     */

    static renderBar(){

        const bar = document.querySelector(

            ".lesson-progress-fill"

        );

        if(!bar)
            return;

        bar.style.width =

            `${this.percent()}%`;

    }

    /**
     * ======================================================
     * PROGRESS TEXT
     * ======================================================
     */

    static renderText(){

        const text = document.querySelector(

            ".lesson-progress"

        );

        if(!text)
            return;

        text.innerHTML =

            `Bước ${this.current}/${this.total}`;

    }

    /**
     * ======================================================
     * PERCENT
     * ======================================================
     */

    static percent(){

        if(this.total === 0)

            return 0;

        return Math.round(

            this.current /

            this.total *

            100

        );

    }

    /**
     * ======================================================
     * SAVE
     * ======================================================
     */

    static save(

        lessonId

    ){

        Storage.saveProgress(

            lessonId,

            this.current

        );

    }

    /**
     * ======================================================
     * LOAD
     * ======================================================
     */

    static load(

        lessonId

    ){

        this.current =

            Storage.lessonProgress(

                lessonId

            );

    }

    /**
     * ======================================================
     * RESET
     * ======================================================
     */

    static reset(){

        this.current = 0;

        this.total = 0;

        this.render();

    }

    /**
     * ======================================================
     * NEXT
     * ======================================================
     */

    static next(){

        if(

            this.current <

            this.total

        ){

            this.current++;

            this.render();

        }

    }

    /**
     * ======================================================
     * PREVIOUS
     * ======================================================
     */

    static previous(){

        if(

            this.current > 1

        ){

            this.current--;

            this.render();

        }

    }

    /**
     * ======================================================
     * FINISH
     * ======================================================
     */

    static finish(){

        this.current = this.total;

        this.render();

    }

    /**
     * ======================================================
     * GET
     * ======================================================
     */

    static get(){

        return {

            current:this.current,

            total:this.total,

            percent:this.percent()

        };

    }

}

export default Progress;