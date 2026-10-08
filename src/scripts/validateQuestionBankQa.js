import fs from "node:fs";
import path from "node:path";

import {
    validateQuestion
} from "../validators/questionValidator.js";

import {
    validateQuestionContent
} from "../validators/contentQaValidator.js";


const targetPath = process.argv[2];

if (!targetPath) {
    console.error(
        "Usage: node validateQuestionBankQa.js <path/to/question-bank.json>"
    );
    process.exit(1);
}


/* =========================================================
 * CONFIG
 * ========================================================= */

const KNOWLEDGE_MAP_PATH =
    "../../data/knowledge/knowledge-map-v4.json";

const FAILURE_REGISTRY_PATH =
    "../../data/remediation/failure-signatures.json";


/* =========================================================
 * HELPERS
 * ========================================================= */

function readJsonFile(filePath) {
    const content = fs.readFileSync(
        filePath,
        "utf-8"
    );

    return JSON.parse(content);
}

function resolveFromScript(relativePath) {
    return new URL(
        relativePath,
        import.meta.url
    );
}


/* =========================================================
 * LOAD FILES
 * ========================================================= */

const resolvedTargetPath =
    path.resolve(
        process.cwd(),
        targetPath
    );

if (!fs.existsSync(resolvedTargetPath)) {
    console.error(
        `Error: File not found at ${resolvedTargetPath}`
    );

    process.exit(1);
}


try {
    const bank =
        readJsonFile(resolvedTargetPath);

    const knowledgeMap =
        readJsonFile(
            resolveFromScript(
                KNOWLEDGE_MAP_PATH
            )
        );

    const rawFailureRegistry =
        readJsonFile(
            resolveFromScript(
                FAILURE_REGISTRY_PATH
            )
        );

    /*
     * Adapter:
     *
     * Canonical failure-signatures.json may use:
     *
     * {
     *   "signatures": {
     *      "concept_confusion": {...}
     *   }
     * }
     *
     * QuestionValidator V1.1 can consume
     * object-based failureSignatures.
     *
     * Do NOT modify canonical registry.
     */
    const failureRegistry =
        rawFailureRegistry?.signatures &&
            !Array.isArray(
                rawFailureRegistry.signatures
            )
            ? {
                ...rawFailureRegistry,

                failureSignatures:
                    rawFailureRegistry.signatures
            }
            : rawFailureRegistry;


    const questions =
        bank.questions ??
        (Array.isArray(bank)
            ? bank
            : [bank]);


    console.log(
        `Validating + QA: ${targetPath}`
    );

    if (bank.bankId) {
        console.log(
            `Bank: ${bank.bankId}`
        );
    }

    console.log(
        `Questions: ${questions.length}`
    );

    console.log(
        "Knowledge Map: loaded"
    );

    console.log(
        "Failure Registry: loaded\n"
    );


    /* =====================================================
     * COUNTERS
     * ===================================================== */

    let contractPassed = 0;
    let qaPassed = 0;

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;
    let totalReviewFlags = 0;

    let biologyReviewRequired = 0;


    /* =====================================================
     * VALIDATE
     * ===================================================== */

    for (
        let index = 0;
        index < questions.length;
        index++
    ) {
        const question =
            questions[index];

        const questionPath =
            `/questions/${index}`;


        /* -------------------------------------------------
         * Gate 1:
         * Question Contract
         * ------------------------------------------------- */

        const contractReport =
            validateQuestion(
                question,
                {
                    knowledgeMap,
                    failureRegistry,
                    path: questionPath
                }
            );


        /* -------------------------------------------------
         * Gate 2:
         * Content QA
         * ------------------------------------------------- */

        const qaReport =
            validateQuestionContent(
                question,
                {
                    knowledgeMap,
                    path: questionPath
                }
            );


        if (contractReport.valid) {
            contractPassed++;
        }

        if (qaReport.valid) {
            qaPassed++;
        }


        totalErrors +=
            qaReport.summary.errorCount;

        totalWarnings +=
            qaReport.summary.warningCount;

        totalInfo +=
            qaReport.summary.infoCount;

        totalReviewFlags +=
            qaReport.summary.reviewFlagCount;


        if (qaReport.review.required) {
            biologyReviewRequired++;
        }


        /* -------------------------------------------------
         * PRINT QUESTION
         * ------------------------------------------------- */

        if (
            contractReport.valid &&
            qaReport.valid
        ) {
            console.log(
                `✅ PASS  ${question.id}`
            );
        } else {
            console.log(
                `❌ FAIL  ${question.id}`
            );
        }


        /* -------------------------------------------------
         * CONTRACT ISSUES
         * ------------------------------------------------- */

        if (!contractReport.valid) {
            for (
                const issue
                of contractReport.issues
            ) {
                console.log(
                    `   [CONTRACT:${issue.severity}] ` +
                    `${issue.code}` +
                    `${issue.path ? ` @ ${issue.path}` : ""}: ` +
                    `${issue.message}`
                );
            }
        }


        /* -------------------------------------------------
         * QA ISSUES
         * ------------------------------------------------- */

        for (
            const issue
            of qaReport.issues
        ) {
            const icon =
                issue.severity === "error"
                    ? "❌"
                    : issue.severity === "warning"
                        ? "⚠️"
                        : "ℹ️";

            console.log(
                `   ${icon} [QA:${issue.severity}] ` +
                `${issue.code}` +
                `${issue.path ? ` @ ${issue.path}` : ""}: ` +
                `${issue.message}`
            );
        }


        /* -------------------------------------------------
         * REVIEW FLAGS
         * ------------------------------------------------- */

        if (qaReport.review.required) {
            console.log(
                `   🔬 Biology review required ` +
                `(${qaReport.review.flags.length} flags)`
            );

            for (
                const flag
                of qaReport.review.flags
            ) {
                console.log(
                    `      - ${flag.code}: ` +
                    `${flag.message}`
                );
            }
        }


        console.log("");
    }


    /* =====================================================
     * SUMMARY
     * ===================================================== */

    console.log(
        "--------------------------------"
    );

    console.log(
        `Questions        : ${questions.length}`
    );

    console.log(
        `Contract passed  : ${contractPassed}/${questions.length}`
    );

    console.log(
        `QA passed        : ${qaPassed}/${questions.length}`
    );

    console.log(
        `QA errors        : ${totalErrors}`
    );

    console.log(
        `QA warnings      : ${totalWarnings}`
    );

    console.log(
        `QA info          : ${totalInfo}`
    );

    console.log(
        `Review flags     : ${totalReviewFlags}`
    );

    console.log(
        `Biology review   : ${biologyReviewRequired}/${questions.length}`
    );

    console.log(
        "--------------------------------"
    );


    /* =====================================================
     * EXIT POLICY
     * ===================================================== */

    const contractFailed =
        contractPassed !==
        questions.length;

    const qaFailed =
        totalErrors > 0;


    if (
        contractFailed ||
        qaFailed
    ) {
        console.log(
            "❌ QUESTION BANK QA FAILED"
        );

        process.exit(1);
    }


    console.log(
        "✅ AUTOMATED QA PASSED"
    );

    if (biologyReviewRequired > 0) {
        console.log(
            "🔬 BIOLOGY CONTENT REVIEW STILL REQUIRED"
        );
    }

} catch (error) {
    console.error(
        "Error processing file:",
        error.message
    );

    process.exit(1);
}