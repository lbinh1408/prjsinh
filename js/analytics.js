/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * analytics.js
 * ==========================================================
 */

import Storage from "./storage.js";

class Analytics {

    /**
     * ======================================================
     * RECORD LESSON ATTEMPT
     * ======================================================
     */

    static recordLessonAttempt(lessonId, accuracyPercent, elapsedSeconds){

        let data = Storage.loadAnalytics(lessonId);

        if (!data) {
            data = {
                attempts: 0,
                studyTime: 0,
                averageAccuracy: 0,
                history: []
            };
        }

        data.attempts += 1;
        data.studyTime += elapsedSeconds;

        data.history.push({
            accuracy: accuracyPercent,
            time: elapsedSeconds,
            date: new Date().toISOString()
        });

        // Calculate average accuracy over all attempts
        const totalAccuracy = data.history.reduce(
            (sum, item) => sum + item.accuracy, 0
        );
        data.averageAccuracy = Math.round(totalAccuracy / data.attempts);

        Storage.saveAnalytics(lessonId, data);

    }

}

export default Analytics;
