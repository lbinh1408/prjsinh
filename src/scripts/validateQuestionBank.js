import fs from "node:fs";
import path from "node:path";

import { validateQuestion } from "../validators/questionValidator.js";


/* =========================================================
 * CONFIG
 * ======================================================= */

/**
 * Canonical registries used by QuestionValidator.
 *
 * Change ONLY these paths if the project structure changes.
 */
const KNOWLEDGE_MAP_PATH =
    "../../data/knowledge/knowledge-map-v4.json";

const FAILURE_REGISTRY_PATH =
    "../../data/remediation/failure-signatures.json";


/* =========================================================
 * CLI INPUT
 * ======================================================= */

const targetPath = process.argv[2];

if (!targetPath) {

    console.error(
        "Usage: node validateQuestionBank.js <path/to/question-bank.json>"
    );

    process.exit(1);
}


/* =========================================================
 * PATH HELPERS
 * ======================================================= */

/**
 * Resolve a path relative to THIS script file.
 *
 * This is safer than relying on process.cwd()
 * for canonical project files.
 */
function resolveFromScript(relativePath) {

    return new URL(
        relativePath,
        import.meta.url
    );
}


/**
 * Target question bank remains relative to
 * the directory from which the CLI command is executed.
 *
 * This preserves the behavior of the original runner.
 */
const resolvedTargetPath =
    path.resolve(
        process.cwd(),
        targetPath
    );


/* =========================================================
 * FILE HELPERS
 * ======================================================= */

function readJsonFile(filePath, label) {

    try {

        const content =
            fs.readFileSync(
                filePath,
                "utf-8"
            );

        return JSON.parse(content);

    } catch (error) {

        console.error(
            `❌ Failed to load ${label}:`
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
}


/* =========================================================
 * TARGET CHECK
 * ======================================================= */

if (!fs.existsSync(resolvedTargetPath)) {

    console.error(
        `Error: File not found at ${resolvedTargetPath}`
    );

    process.exit(1);
}


/* =========================================================
 * LOAD CANONICAL REGISTRIES
 * ======================================================= */

const knowledgeMap =
    readJsonFile(
        resolveFromScript(
            KNOWLEDGE_MAP_PATH
        ),
        "Knowledge Map"
    );


const failureRegistry =
    readJsonFile(
        resolveFromScript(
            FAILURE_REGISTRY_PATH
        ),
        "Failure Signature Registry"
    );


/* =========================================================
 * VALIDATION
 * ======================================================= */

try {

    const fileContent =
        fs.readFileSync(
            resolvedTargetPath,
            "utf-8"
        );


    const data =
        JSON.parse(fileContent);


    /**
     * Supports:
     *
     * 1. Question Bank
     *    {
     *      "questions": [...]
     *    }
     *
     * 2. Raw array
     *    [...]
     *
     * 3. Single Question object
     *    {...}
     */
    const questions =
        data.questions ??
        (
            Array.isArray(data)
                ? data
                : [data]
        );


    /* -----------------------------------------------------
     * HEADER
     * --------------------------------------------------- */

    console.log(
        `Validating: ${targetPath}`
    );


    if (data.bankId) {

        console.log(
            `Bank: ${data.bankId}`
        );
    }


    console.log(
        `Questions: ${questions.length}`
    );


    console.log(
        "Knowledge Map: loaded"
    );


    console.log(
        "Failure Registry: loaded"
    );


    console.log("");


    /* -----------------------------------------------------
     * VALIDATE EACH QUESTION
     * --------------------------------------------------- */

    let allValid = true;

    let validCount = 0;

    let errorCount = 0;

    let warningCount = 0;


    for (
        let index = 0;
        index < questions.length;
        index++
    ) {

        const q =
            questions[index];


        /**
         * IMPORTANT:
         *
         * QuestionValidator V1.1 receives:
         *
         * validateQuestion(
         *     question,
         *     {
         *         knowledgeMap,
         *         failureRegistry,
         *         path
         *     }
         * )
         *
         * The runner does NOT duplicate validation logic.
         */
        const report =
            validateQuestion(
                q,
                {
                    knowledgeMap,
                    failureRegistry,

                    path:
                        `/questions/${index}`
                }
            );


        /* -------------------------------------------------
         * COUNT ISSUES
         * ----------------------------------------------- */

        const issues =
            Array.isArray(report.issues)
                ? report.issues
                : [];


        const questionErrors =
            issues.filter(
                issue =>
                    issue.severity === "error"
            );


        const questionWarnings =
            issues.filter(
                issue =>
                    issue.severity === "warning"
            );


        errorCount +=
            questionErrors.length;


        warningCount +=
            questionWarnings.length;


        /* -------------------------------------------------
         * REPORT QUESTION
         * ----------------------------------------------- */

        if (!report.valid) {

            allValid = false;


            console.log(
                `❌ FAIL  ${q?.id ?? "Unknown"}`
            );


            for (const issue of issues) {

                console.log(
                    `   [${issue.severity}] ${issue.code}` +
                    `${issue.path ? ` @ ${issue.path}` : ""}` +
                    `: ${issue.message}`
                );
            }


            console.log("");

        } else {

            validCount++;


            if (
                questionWarnings.length > 0
            ) {

                console.log(
                    `⚠️  PASS  ${q.id} (${questionWarnings.length} warning)`
                );


                for (
                    const issue
                    of questionWarnings
                ) {

                    console.log(
                        `   [${issue.severity}] ${issue.code}` +
                        `${issue.path ? ` @ ${issue.path}` : ""}` +
                        `: ${issue.message}`
                    );
                }

            } else {

                console.log(
                    `✅ PASS  ${q.id}`
                );
            }
        }
    }


    /* =====================================================
     * FINAL REPORT
     * =================================================== */

    console.log(
        "\n--------------------------------"
    );


    console.log(
        `Questions : ${questions.length}`
    );


    console.log(
        `Passed    : ${validCount}`
    );


    console.log(
        `Errors    : ${errorCount}`
    );


    console.log(
        `Warnings  : ${warningCount}`
    );


    console.log(
        "--------------------------------"
    );


    if (allValid) {

        console.log(
            `✅ ALL PASS (${validCount}/${questions.length})`
        );

    } else {

        console.log(
            `❌ FAILED (${validCount}/${questions.length} passed)`
        );

        process.exit(1);
    }


} catch (error) {

    console.error(
        "Error processing file:",
        error.message
    );

    process.exit(1);
}