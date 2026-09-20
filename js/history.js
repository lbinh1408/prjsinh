/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * history.js
 * ==========================================================
 */

import Storage from "./storage.js";

function createHistoryEntry(answer, metadata = {}) {

    return {

        id: metadata.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,

        answer,

        createdAt: metadata.createdAt || new Date().toISOString()

    };

}

function ensureHistoryBucket(root, lessonId, stepId) {

    if(!root.history[lessonId]){

        root.history[lessonId] = {};

    }

    if(!root.history[lessonId][stepId]){

        root.history[lessonId][stepId] = [];

    }

    return root.history[lessonId][stepId];

}

function addHistoryEntry(root, lessonId, stepId, answer, metadata = {}) {

    const bucket = ensureHistoryBucket(root, lessonId, stepId);

    bucket.push(

        createHistoryEntry(answer, metadata)

    );

    return bucket[bucket.length - 1];

}

function getHistoryEntries(root, lessonId, stepId) {

    return root.history?.[lessonId]?.[stepId] || [];

}

function clearHistoryEntries(root, lessonId, stepId) {

    if(root.history?.[lessonId]?.[stepId]){

        delete root.history[lessonId][stepId];
    }

    return [];

}

function resetLessonHistory(root, lessonId) {

    if(root.history?.[lessonId]){

        delete root.history[lessonId];
    }

    return true;

}

class History {

    static save(lessonId, stepId, answer, metadata = {}) {
        const root = Storage.getRoot();
        const entry = addHistoryEntry(root, lessonId, stepId, answer, metadata);
        Storage.saveRoot(root);
        return entry;
    }

    static load(lessonId, stepId) {
        const root = Storage.getRoot();
        return getHistoryEntries(root, lessonId, stepId);
    }

    static clear(lessonId, stepId) {
        const root = Storage.getRoot();
        const entries = clearHistoryEntries(root, lessonId, stepId);
        Storage.saveRoot(root);
        return entries;
    }

    static resetLesson(lessonId) {
        const root = Storage.getRoot();
        resetLessonHistory(root, lessonId);
        Storage.saveRoot(root);
        return true;
    }
}

export {
    History,
    addHistoryEntry,
    clearHistoryEntries,
    createHistoryEntry,
    getHistoryEntries,
    resetLessonHistory
};

export default History;
