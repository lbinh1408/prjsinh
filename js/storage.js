/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2
 * storage.js
 * ==========================================================
 */

import {

    createDefaultStorageRoot,
    migrateStorageRoot

} from "./storageMigration.js";

class Storage {

    static PREFIX = "ts10-learning";

    /**
     * ======================================================
     * INIT
     * ======================================================
     */

    static init(){

        const existing = localStorage.getItem(this.PREFIX);

        if(!existing){

            localStorage.setItem(

                this.PREFIX,

                JSON.stringify(createDefaultStorageRoot())

            );

            return;

        }

        try{

            const parsed = JSON.parse(existing);

            if(!parsed || typeof parsed !== "object"){

                localStorage.setItem(

                    this.PREFIX,

                    JSON.stringify(createDefaultStorageRoot())

                );

                return;

            }

            const migrated = migrateStorageRoot(parsed);

            localStorage.setItem(

                this.PREFIX,

                JSON.stringify(migrated)

            );

        }
        catch(e){

            localStorage.setItem(

                this.PREFIX,

                JSON.stringify(createDefaultStorageRoot())

            );

        }

    }

    /**
     * ======================================================
     * ROOT
     * ======================================================
     */

    static getRoot(){

        return JSON.parse(

            localStorage.getItem(this.PREFIX)

        );

    }

    static saveRoot(data){

        localStorage.setItem(

            this.PREFIX,

            JSON.stringify(data)

        );

    }

    /**
     * ======================================================
     * ANSWER
     * ======================================================
     */

    static saveAnswer(

        lessonId,

        stepId,

        answer

    ){

        const root = this.getRoot();

        if(!root.answers[lessonId]){

            root.answers[lessonId] = {};

        }

        root.answers[lessonId][stepId] = answer;

        this.saveRoot(root);

    }

    static loadAnswer(

        lessonId,

        stepId

    ){

        const root = this.getRoot();

        return root.answers?.[lessonId]?.[stepId] ?? null;

    }

    static removeAnswer(

        lessonId,

        stepId

    ){

        const root = this.getRoot();

        if(

            root.answers?.[lessonId]

        ){

            delete root.answers[lessonId][stepId];

        }

        this.saveRoot(root);

    }

    /**
     * ======================================================
     * LESSON
     * ======================================================
     */

    static completeLesson(

        lessonId,

        score

    ){

        const root = this.getRoot();

        if(!root.lessons){

            root.lessons = {};

        }

        root.lessons[lessonId] = {

            completed:true,

            score,

            completedAt:new Date().toISOString()

        };

        this.saveRoot(root);

    }

    static lessonStatus(

        lessonId

    ){

        const lesson =

            this.getRoot()

            .lessons[lessonId];

        if(!lesson){

            return "new";

        }

        return lesson.completed

            ? "completed"

            : "learning";

    }

    static lessonScore(

        lessonId

    ){

        return (

            this.getRoot()

            .lessons[lessonId]?.score

        ) || 0;

    }

    static resetLesson(

        lessonId

    ){

        const root = this.getRoot();

        delete root.answers[lessonId];

        delete root.lessons[lessonId];

        delete root.progress[lessonId];

        if(root.history?.[lessonId]){
            delete root.history[lessonId];
        }

        this.clearTimer(lessonId);

        this.saveRoot(root);

    }

    /**
     * ======================================================
     * PROGRESS
     * ======================================================
     */

    static saveProgress(

        lessonId,

        currentStep

    ){

        const root = this.getRoot();

        root.progress[lessonId] = {

            step:currentStep,

            updated:new Date().toISOString()

        };

        this.saveRoot(root);

    }

    static lessonProgress(

        lessonId

    ){

        return (

            this.getRoot()

            .progress[lessonId]?.step

        ) || 0;

    }

    /**
     * ======================================================
     * TIMER
     * ======================================================
     */

    static saveTimer(

        lessonId,

        timerData

    ){

        const root = this.getRoot();

        root.timer[lessonId] = timerData;

        this.saveRoot(root);

        return root.timer[lessonId];

    }

    static loadTimer(lessonId){

        const root = this.getRoot();

        return root.timer?.[lessonId] || null;

    }

    static clearTimer(lessonId){

        const root = this.getRoot();

        if(root.timer?.[lessonId]){

            delete root.timer[lessonId];

            this.saveRoot(root);

        }

    }

    /**
     * ======================================================
     * SETTINGS
     * ======================================================
     */

    static setSetting(

        key,

        value

    ){

        const root = this.getRoot();

        root.settings[key] = value;

        this.saveRoot(root);

    }

    static getSetting(

        key,

        defaultValue=null

    ){

        const root = this.getRoot();

        return root.settings[key]

            ?? defaultValue;

    }

    /**
     * ======================================================
     * STATISTICS
     * ======================================================
     */

    static statistics(){

        const root = this.getRoot();

        return {

            lessons:

                Object.keys(

                    root.lessons

                ).length,

            answers:

                Object.keys(

                    root.answers

                ).length,

            progress:

                Object.keys(

                    root.progress

                ).length

        };

    }

    /**
     * ======================================================
     * ANALYTICS
     * ======================================================
     */

    static saveAnalytics(
        lessonId,
        analyticsData
    ){
        const root = this.getRoot();
        root.analytics[lessonId] = analyticsData;
        this.saveRoot(root);
    }

    static loadAnalytics(lessonId){
        const root = this.getRoot();
        return root.analytics?.[lessonId] || null;
    }

    /**
     * ======================================================
     * EXPORT
     * ======================================================
     */

    static export(){

        return JSON.stringify(

            this.getRoot(),

            null,

            2

        );

    }

    /**
     * ======================================================
     * IMPORT
     * ======================================================
     */

    static import(json){

        try{

            localStorage.setItem(

                this.PREFIX,

                json

            );

            return true;

        }

        catch(e){

            return false;

        }

    }

    /**
     * ======================================================
     * CLEAR ALL
     * ======================================================
     */

    static clear(){

        localStorage.removeItem(

            this.PREFIX

        );

        this.init();

    }

}

export default Storage;