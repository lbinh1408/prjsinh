import fs from "node:fs";

import {
    validateQuestion
} from "./src/contracts/validators/questionValidator.js";


const bankPath =
    "./src/data/questions/c09/K283.question-bank.json";


const bank =
    JSON.parse(
        fs.readFileSync(
            bankPath,
            "utf8"
        )
    );


const question =
    bank.questions.find(
        q =>
            q.id ===
            "Q-A-K283-T-010"
    );


if (!question) {

    console.error(
        "❌ Không tìm thấy Q-A-K283-T-010 trong bank."
    );

    process.exit(1);
}


const report =
    validateQuestion(
        question,
        {
            environment:
                "test",

            path:
                bankPath
        }
    );


console.log(
    JSON.stringify(
        report,
        null,
        2
    )
);


if (report.valid) {

    console.log(
        "\n✅ Q-A-K283-T-010 VALID"
    );

} else {

    console.log(
        "\n❌ Q-A-K283-T-010 INVALID"
    );

    process.exitCode = 1;
}