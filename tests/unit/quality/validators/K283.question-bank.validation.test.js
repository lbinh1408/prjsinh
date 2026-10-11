/**
 * K283.question-bank.validation.test.js
 *
 * Real-bank validation test for:
 *
 *   src/data/questions/c09/K283.question-bank.json
 *
 * Pipeline:
 *
 * K283 Question Bank
 *        ↓
 * ValidationRunner
 *        ↓
 * QuestionValidator
 *        ↓
 * CrossContractValidator
 *
 * Purpose:
 * - Validate every real K283 question.
 * - Verify Q001 → Q010 are present.
 * - Verify Q010 numeric question survives validation.
 * - Verify the complete bank passes individual validation.
 * - Verify cross-contract validation passes.
 *
 * Run from project root:
 *
 * node src/quality/validators/K283.question-bank.validation.test.js
 */

import fs from "node:fs";

import {
    runValidation
} from "../../../../src/quality/validators/validationRunner.js";


/* =========================================================
 * CONSTANTS
 * ======================================================= */

const BANK_PATH =
    "./src/data/questions/c09/K283.question-bank.json";


const EXPECTED_QUESTION_IDS = [

    "Q-A-K283-K-001",
    "Q-A-K283-E-002",

    "Q-A-K283-A-003",
    "Q-A-K283-A-004",
    "Q-A-K283-A-005",
    "Q-A-K283-A-006",
    "Q-A-K283-A-007",

    "Q-A-K283-T-008",
    "Q-A-K283-T-009",
    "Q-A-K283-T-010",

    "Q-A-K283-K-011",
    "Q-A-K283-K-012",
    "Q-A-K283-K-013",
    "Q-A-K283-K-014",
    "Q-A-K283-K-015",
    "Q-A-K283-K-016",
    "Q-A-K283-K-017",
    "Q-A-K283-K-018",

    "Q-A-K283-E-019",
    "Q-A-K283-E-020",
    "Q-A-K283-E-021",
    "Q-A-K283-E-022",
    "Q-A-K283-E-023",
    "Q-A-K283-E-024",
    "Q-A-K283-E-025",
    "Q-A-K283-E-026"
];


/* =========================================================
 * SMALL TEST HARNESS
 * ======================================================= */

let passed = 0;
let failed = 0;


function test(
    name,
    fn
) {

    try {

        fn();

        passed += 1;

        console.log(
            `✓ PASS — ${name}`
        );

    } catch (error) {

        failed += 1;

        console.error(
            `✗ FAIL — ${name}`
        );

        console.error(
            error?.stack ??
            error
        );
    }
}


function assert(
    condition,
    message
) {

    if (!condition) {

        throw new Error(
            message ??
            "Assertion failed."
        );
    }
}


function assertEqual(
    actual,
    expected,
    message = ""
) {

    if (actual !== expected) {

        throw new Error(
            message ||
            `Expected ${JSON.stringify(expected)}, ` +
            `received ${JSON.stringify(actual)}`
        );
    }
}


function assertDeepEqual(
    actual,
    expected,
    message = ""
) {

    const actualJson =
        JSON.stringify(actual);

    const expectedJson =
        JSON.stringify(expected);


    if (
        actualJson !==
        expectedJson
    ) {

        throw new Error(
            message ||
            `Expected ${expectedJson}, ` +
            `received ${actualJson}`
        );
    }
}


/* =========================================================
 * LOAD REAL BANK
 * ======================================================= */

if (
    !fs.existsSync(
        BANK_PATH
    )
) {

    console.error(
        `❌ Cannot find K283 question bank:\n${BANK_PATH}`
    );

    process.exit(1);
}


let bank;


try {

    bank =
        JSON.parse(
            fs.readFileSync(
                BANK_PATH,
                "utf8"
            )
        );

} catch (error) {

    console.error(
        "❌ Failed to parse K283 question bank JSON."
    );

    console.error(
        error?.stack ??
        error
    );

    process.exit(1);
}


/* =========================================================
 * BANK STRUCTURE
 * ======================================================= */

test(
    "bank primaryNode is K283",
    () => {

        assertEqual(
            bank.primaryNode,
            "K283"
        );
    }
);


test(
    "bank contains questions array",
    () => {

        assert(
            Array.isArray(
                bank.questions
            ),
            "bank.questions must be an array."
        );
    }
);


test(
    "bank contains exactly 26 questions",
    () => {

        assertEqual(
            bank.questions.length,
            26
        );
    }
);


test(
    "bank contains expected Q001-Q026 question IDs",
    () => {

        const ids =
            bank.questions.map(
                question =>
                    question.id
            );


        assertDeepEqual(
            ids,
            EXPECTED_QUESTION_IDS
        );
    }
);


test(
    "bank question IDs are unique",
    () => {

        const ids =
            bank.questions.map(
                question =>
                    question.id
            );


        const uniqueIds =
            new Set(
                ids
            );


        assertEqual(
            uniqueIds.size,
            ids.length,
            "Duplicate question IDs detected."
        );
    }
);


/* =========================================================
 * Q010 DESIGN-005 GUARDS
 * ======================================================= */

const q010 =
    bank.questions.find(
        question =>
            question.id ===
            "Q-A-K283-T-010"
    );


test(
    "Q010 exists",
    () => {

        assert(
            q010 != null,
            "Q-A-K283-T-010 is missing."
        );
    }
);


test(
    "Q010 is a genuine numeric question",
    () => {

        assertEqual(
            q010.questionType,
            "numeric"
        );

        assertEqual(
            q010.answer?.type,
            "number"
        );
    }
);


test(
    "Q010 measures transfer evidence",
    () => {

        assertEqual(
            q010.evidence,
            "transfer"
        );

        assertEqual(
            q010.difficulty,
            "D4"
        );
    }
);


test(
    "Q010 is eligible for challenge mode",
    () => {

        assert(
            Array.isArray(
                q010.mode
            ),
            "Q010.mode must be an array."
        );


        assert(
            q010.mode.includes(
                "challenge"
            ),
            "Q010 must support challenge mode."
        );
    }
);


test(
    "Q010 has its own semantic evidence context",
    () => {

        assertEqual(
            q010.context?.contextId,
            "c09-k283-transfer-gamete-counts-03"
        );

        assertEqual(
            q010.context?.contextType,
            "data_table"
        );
    }
);


/* =========================================================
 * QUESTION-TYPE DIVERSITY
 * ======================================================= */

test(
    "K283 bank now contains mcq and numeric question types",
    () => {

        const types =
            new Set(
                bank.questions.map(
                    question =>
                        question.questionType
                )
            );


        assert(
            types.has(
                "mcq"
            ),
            "K283 bank must contain mcq questions."
        );


        assert(
            types.has(
                "numeric"
            ),
            "K283 bank must contain numeric questions."
        );


        assertEqual(
            types.size,
            2,
            "Unexpected questionType set in K283 bank."
        );
    }
);


/* =========================================================
 * RUN REAL VALIDATION PIPELINE
 * ======================================================= */

const report =
    runValidation(
        {
            questions:
                bank.questions
        },
        {
            environment:
                "test",

            paths: {
                root:
                    BANK_PATH,

                questions:
                    bank.questions.map(
                        question =>
                            `${BANK_PATH}#${question.id}`
                    ),

                crossContract:
                    `${BANK_PATH}#cross-contract`
            },

            /**
             * Keep false.
             *
             * If one question fails individual validation,
             * we still want the runner to validate the
             * remaining valid questions and give us maximum
             * diagnostic coverage.
             */
            stopCrossContractOnIndividualFailure:
                false
        }
    );


/* =========================================================
 * INDIVIDUAL QUESTION VALIDATION
 * ======================================================= */

test(
    "runner executed 26 individual validators",
    () => {

        assertEqual(
            report.summary
                ?.individual
                ?.run,
            26
        );
    }
);


test(
    "all 26 individual question validations pass",
    () => {

        assertEqual(
            report.summary
                ?.individual
                ?.passed,
            26
        );


        assertEqual(
            report.summary
                ?.individual
                ?.failed,
            0
        );
    }
);


test(
    "artifact summary reports 26 valid questions",
    () => {

        assertEqual(
            report.summary
                ?.artifacts
                ?.questions
                ?.supplied,
            26
        );


        assertEqual(
            report.summary
                ?.artifacts
                ?.questions
                ?.valid,
            26
        );


        assertEqual(
            report.summary
                ?.artifacts
                ?.questions
                ?.invalid,
            0
        );
    }
);


test(
    "runner produced one validation report per question",
    () => {

        assert(
            Array.isArray(
                report.reports
                    ?.questions
            ),
            "report.reports.questions must be an array."
        );


        assertEqual(
            report.reports
                .questions
                .length,
            26
        );
    }
);


test(
    "every individual question report is valid",
    () => {

        const invalidReports =
            report.reports
                .questions
                .filter(
                    questionReport =>
                        questionReport
                            ?.valid !== true
                );


        if (
            invalidReports.length > 0
        ) {

            throw new Error(
                "Invalid question reports:\n" +
                JSON.stringify(
                    invalidReports,
                    null,
                    2
                )
            );
        }
    }
);


/* =========================================================
 * Q010 VALIDATION THROUGH RUNNER
 * ======================================================= */

test(
    "Q010 passes QuestionValidator through ValidationRunner",
    () => {

        const q010Report =
            report.reports
                .questions
                .find(
                    questionReport =>
                        questionReport
                            ?.target
                            ?.id ===
                        "Q-A-K283-T-010"
                );


        assert(
            q010Report != null,
            "Could not find Q010 validation report."
        );


        if (
            q010Report.valid !== true
        ) {

            throw new Error(
                "Q010 validation failed:\n" +
                JSON.stringify(
                    q010Report,
                    null,
                    2
                )
            );
        }
    }
);


/* =========================================================
 * CROSS-CONTRACT
 * ======================================================= */

test(
    "cross-contract validation executed",
    () => {

        assertEqual(
            report.summary
                ?.crossContract
                ?.run,
            true
        );


        assertEqual(
            report.summary
                ?.crossContract
                ?.skipped,
            false
        );
    }
);


test(
    "cross-contract validation passes",
    () => {

        if (
            report.summary
                ?.crossContract
                ?.valid !== true
        ) {

            throw new Error(
                "Cross-contract validation failed:\n" +
                JSON.stringify(
                    report.reports
                        ?.crossContract,
                    null,
                    2
                )
            );
        }
    }
);


/* =========================================================
 * OVERALL RUN
 * ======================================================= */

test(
    "complete K283 validation run is valid",
    () => {

        if (
            report.valid !== true
        ) {

            throw new Error(
                "Overall validation run failed:\n" +
                JSON.stringify(
                    report,
                    null,
                    2
                )
            );
        }
    }
);


/* =========================================================
 * FAILURE DIAGNOSTIC OUTPUT
 * ======================================================= */

/**
 * If anything failed, print compact diagnostics after all
 * tests instead of stopping on the first bad question.
 */

if (
    report.valid !== true
) {

    console.log(
        "\n============================================================"
    );

    console.log(
        "VALIDATION DIAGNOSTICS"
    );

    console.log(
        "============================================================"
    );


    const invalidQuestionReports =
        report.reports
            ?.questions
            ?.filter(
                questionReport =>
                    questionReport
                        ?.valid !== true
            ) ??
        [];


    if (
        invalidQuestionReports.length > 0
    ) {

        console.log(
            "\nInvalid questions:"
        );


        for (
            const questionReport
            of invalidQuestionReports
        ) {

            console.log(
                "\n" +
                JSON.stringify(
                    {
                        target:
                            questionReport
                                ?.target,

                        summary:
                            questionReport
                                ?.summary,

                        issues:
                            questionReport
                                ?.issues
                    },
                    null,
                    2
                )
            );
        }
    }


    if (
        report.reports
            ?.crossContract &&
        report.reports
            .crossContract
            .valid !== true
    ) {

        console.log(
            "\nCross-contract:"
        );

        console.log(
            JSON.stringify(
                {
                    summary:
                        report.reports
                            .crossContract
                            ?.summary,

                    issues:
                        report.reports
                            .crossContract
                            ?.issues
                },
                null,
                2
            )
        );
    }
}


/* =========================================================
 * SUMMARY
 * ======================================================= */

console.log(
    "\n============================================================"
);

console.log(
    "K283 Question Bank — Validation Tests"
);

console.log(
    "============================================================"
);

console.log(
    `Passed : ${passed}`
);

console.log(
    `Failed : ${failed}`
);

console.log(
    `Total  : ${passed + failed}`
);

console.log(
    "------------------------------------------------------------"
);

console.log(
    `Questions supplied : ${report.summary
        ?.artifacts
        ?.questions
        ?.supplied ??
    "?"
    }`
);

console.log(
    `Questions valid    : ${report.summary
        ?.artifacts
        ?.questions
        ?.valid ??
    "?"
    }`
);

console.log(
    `Questions invalid  : ${report.summary
        ?.artifacts
        ?.questions
        ?.invalid ??
    "?"
    }`
);

console.log(
    `Cross-contract     : ${report.summary
        ?.crossContract
        ?.valid === true
        ? "PASS"
        : "FAIL"
    }`
);

console.log(
    "============================================================"
);


if (
    failed > 0
) {

    process.exitCode = 1;

} else {

    console.log(
        "\n✓ K283 real question bank validation PASS"
    );
}