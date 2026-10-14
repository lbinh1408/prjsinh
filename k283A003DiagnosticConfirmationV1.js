const QUESTION_DIAGNOSTICS = Object.freeze({
    "Q-A-K283-A-003": Object.freeze({
        prompt:
            "\nWhich best describes your reasoning? " +
            "1) I understood 20% is shared by two recombinant types but divided/calculated it incorrectly. " +
            "2) I misunderstood what 20% represents (total recombinants vs one type, or parental vs recombinant). " +
            "Type 1, 2, or skip/other > ",
        responses: Object.freeze({
            "1": Object.freeze({
                failureType: "calculation_error",
                failureSignatureId: "calculation_error",
                evidence: "learner_confirmed:understood_two_recombinant_types_but_miscalculated"
            }),
            "2": Object.freeze({
                failureType: "concept_confusion",
                failureSignatureId: "concept_confusion",
                evidence: "learner_confirmed:misunderstood_total_recombinant_frequency_or_gamete_class"
            })
        })
    }),
    "Q-A-K283-A-004": Object.freeze({
        prompt:
            "\nFor this question, did you identify Ab and aB as the recombinant classes, " +
            "but make an arithmetic/addition error combining their 15% + 15%? " +
            "Type yes, no, or skip/unsure > ",
        responses: Object.freeze({
            "yes": Object.freeze({
                failureType: "calculation_error",
                failureSignatureId: "calculation_error",
                evidence: "learner_confirmed:identified_recombinant_classes_but_miscalculated_sum"
            })
        })
    })
});

export const K283_A003_REASONING_CONFIRMATION_PROMPT =
    QUESTION_DIAGNOSTICS["Q-A-K283-A-003"].prompt;

export const K283_A004_REASONING_CONFIRMATION_PROMPT =
    QUESTION_DIAGNOSTICS["Q-A-K283-A-004"].prompt;

export function prepareK283DiagnosticSubmission({ question, response, confirmation } = {}) {
    const questionConfig = QUESTION_DIAGNOSTICS[question?.id];
    const diagnostic =
        questionConfig &&
        response !== null &&
        response !== undefined &&
        response !== question?.answer?.value
            ? questionConfig.responses[String(confirmation ?? "").trim().toLowerCase()] ?? null
            : null;

    return {
        response,
        diagnostic: diagnostic ? { ...diagnostic } : null
    };
}

export async function submitK283DiagnosticAnswer({
    question,
    response,
    askConfirmation,
    submit
} = {}) {
    if (typeof submit !== "function") {
        throw new TypeError("submit must be a function.");
    }

    let confirmation = null;
    const questionConfig = QUESTION_DIAGNOSTICS[question?.id];
    if (
        questionConfig &&
        response !== null &&
        response !== undefined &&
        response !== question?.answer?.value &&
        typeof askConfirmation === "function"
    ) {
        confirmation = await askConfirmation(questionConfig.prompt);
    }

    return submit(
        prepareK283DiagnosticSubmission({ question, response, confirmation })
    );
}

export const prepareK283A003Submission = prepareK283DiagnosticSubmission;
export const submitK283A003Answer = submitK283DiagnosticAnswer;
