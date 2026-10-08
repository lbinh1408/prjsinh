/**
 * Validate lesson-k283.json
 *
 * Usage:
 *   node scripts/validateLessonK283.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    validateLesson
} from "../src/contracts/validators/lessonValidator.js";


/* -------------------------------------------------------------------------- */
/* Resolve paths                                                              */
/* -------------------------------------------------------------------------- */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

/*
 * Sửa path này nếu lesson-k283.json của em nằm chỗ khác.
 *
 * Ví dụ hiện tại:
 *
 * project/
 * ├── scripts/
 * │   └── validateLessonK283.js
 * ├── src/
 * │   └── validators/
 * │       └── lessonValidator.js
 * └── data/
 *     └── lessons/
 *         └── lesson-k283.json
 */
const LESSON_PATH =
    path.resolve(
        __dirname,
        "../src//data/lessons/c09/lesson-k283.json"
    );


/* -------------------------------------------------------------------------- */
/* Load JSON                                                                  */
/* -------------------------------------------------------------------------- */

function loadJson(filePath) {
    const raw =
        fs.readFileSync(
            filePath,
            "utf8"
        );

    return JSON.parse(raw);
}


/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

function main() {
    console.log(
        "\n=== Validate lesson-k283.json ===\n"
    );

    console.log(
        `File: ${LESSON_PATH}\n`
    );

    let lesson;

    try {
        lesson =
            loadJson(
                LESSON_PATH
            );
    } catch (error) {
        console.error(
            "❌ Cannot load lesson JSON."
        );

        console.error(
            error.message
        );

        process.exitCode = 1;
        return;
    }

    let report;

    try {
        report =
            validateLesson(
                lesson
            );
    } catch (error) {
        console.error(
            "❌ lessonValidator threw an exception."
        );

        console.error(
            error
        );

        process.exitCode = 1;
        return;
    }

    console.dir(
        report,
        {
            depth: null,
            colors: true
        }
    );

    console.log();

    if (report.valid) {
        console.log(
            "✅ PASS — lesson-k283.json is valid."
        );

        process.exitCode = 0;
        return;
    }

    console.error(
        "❌ FAIL — lesson-k283.json is invalid."
    );

    if (
        report.summary
    ) {
        console.log(
            "\nSummary:"
        );

        console.dir(
            report.summary,
            {
                depth: null,
                colors: true
            }
        );
    }

    if (
        Array.isArray(report.issues) &&
        report.issues.length > 0
    ) {
        console.log(
            "\nIssues:"
        );

        for (
            const issue of
            report.issues
        ) {
            console.log(
                [
                    `- [${issue.severity}]`,
                    issue.code,
                    issue.path
                        ? `@ ${issue.path}`
                        : "",
                    issue.message
                ]
                    .filter(Boolean)
                    .join(" ")
            );
        }
    }

    process.exitCode = 1;
}


main();