/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * storageMigration.js
 * ==========================================================
 */

const DEFAULT_STORAGE_ROOT = Object.freeze({
    lessons: {},
    answers: {},
    progress: {},
    settings: {},
    history: {},
    analytics: {},
    timer: {},
    schemaVersion: 2
});

function ensureObject(value) {

    if (value && typeof value === "object" && !Array.isArray(value)) {

        return value;

    }

    return {};

}

function migrateStorageRoot(data = {}) {

    const source = ensureObject(data);

    const migratedRoot = {

        lessons: ensureObject(source.lessons),
        answers: ensureObject(source.answers),
        progress: ensureObject(source.progress),
        settings: ensureObject(source.settings),
        history: ensureObject(source.history),
        analytics: ensureObject(source.analytics),
        timer: ensureObject(source.timer),
        schemaVersion: source.schemaVersion || 2

    };

    return migratedRoot;

}

function createDefaultStorageRoot() {

    return migrateStorageRoot(DEFAULT_STORAGE_ROOT);

}

export {
    createDefaultStorageRoot,
    migrateStorageRoot
};

export default migrateStorageRoot;