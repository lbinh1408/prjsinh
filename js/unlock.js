/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * unlock.js
 * ==========================================================
 */

import Storage from "./storage.js";

class Unlock {

    /**
     * ======================================================
     * NEXT LESSON
     * ======================================================
     */

    static nextLesson(currentLessonId, roadmap){

        if(!roadmap || !roadmap.modules) return null;

        let found = false;
        
        for (const mod of roadmap.modules) {
            for(const subject of (mod.subjects || [])){

                if(!subject.lessons) continue;

                for(const lesson of subject.lessons){

                    if(found){

                        return lesson.id;

                    }

                    if(lesson.id === currentLessonId){

                        found = true;

                    }

                }

            }
        }

        return null;

    }

    /**
     * ======================================================
     * UNLOCK NEXT
     * ======================================================
     */

    static unlockNext(currentLessonId, roadmap){

        const nextId = this.nextLesson(currentLessonId, roadmap);

        if(nextId){

            Storage.setSetting(`unlocked_${nextId}`, true);

        }

    }

    /**
     * ======================================================
     * IS UNLOCKED
     * ======================================================
     */

    static isUnlocked(lessonId){

        return Storage.getSetting(`unlocked_${lessonId}`, false);

    }

}

export default Unlock;
