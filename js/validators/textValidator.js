/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 2 (updated Sprint 3)
 * validators/textValidator.js
 * ==========================================================
 */

import ValidatorInterface from "./ValidatorInterface.js";

class TextValidator extends ValidatorInterface {

    /**
     * ======================================================
     * VALIDATE
     * ======================================================
     */

    static validate(step, userAnswer = "") {
        if(step && step.data) { step = { ...step, ...step.data }; }

        const text     = String(userAnswer ?? "").trim();
        const rule     = step;          // step IS the rule (has score, minWords, etc.)
        const maxScore = step.score || 1;
        const valid    = this.isValid(text, rule);
        const score    = this.score(text, rule);

        return this.result({
            valid,
            score,
            maxScore,
            message:     this.message(text, rule),
            explanation: step.sampleAnswer ? `Gợi ý: ${Array.isArray(step.sampleAnswer) ? step.sampleAnswer.join(' hoặc ') : step.sampleAnswer}` : "",
            expected:    step.sampleAnswer || null,
            actual:      userAnswer
        });

    }

    /**
     * ======================================================
     * IS VALID
     * ======================================================
     */

    static isValid(text, rule) {

        const isRequired = rule.required !== false;
        if (isRequired && text.length === 0) {

            return false;

        }

        if (rule.minLength) {

            if (text.length < rule.minLength) {

                return false;

            }

        }

        if (rule.maxLength) {

            if (text.length > rule.maxLength) {

                return false;

            }

        }

        if (rule.minWords) {

            if (this.wordCount(text) < rule.minWords) {

                return false;

            }

        }

        return true;

    }

    /**
     * ======================================================
     * SCORE
     * ======================================================
     */

    static score(text, rule) {

        if (!this.isValid(text, rule))

            return 0;

        let score = rule.score || 1;

        if (rule.keywords) {

            let matched = 0;

            rule.keywords.forEach(keyword => {

                if (

                    text

                        .toLowerCase()

                        .includes(

                            keyword.toLowerCase()

                        )

                ) {

                    matched++;

                }

            });

            score *=

                matched /

                rule.keywords.length;

        }

        return Number(

            score.toFixed(2)

        );

    }

    /**
     * ======================================================
     * MESSAGE
     * ======================================================
     */

    static message(text, rule) {

        const isRequired = rule.required !== false;
        if (isRequired && text.length === 0) {

            return "Em chưa nhập câu trả lời.";

        }

        if (rule.minLength) {

            if (text.length < rule.minLength) {

                return `Cần ít nhất ${rule.minLength} ký tự.`;

            }

        }

        if (rule.minWords) {

            if (

                this.wordCount(text)

                < rule.minWords

            ) {

                return `Cần ít nhất ${rule.minWords} từ.`;

            }

        }

        return "Hợp lệ.";

    }

    /**
     * ======================================================
     * WORD COUNT
     * ======================================================
     */

    static wordCount(text) {

        if (text.trim() === "")

            return 0;

        return text

            .trim()

            .split(/\s+/)

            .length;

    }

    /**
     * ======================================================
     * NORMALIZE
     * ======================================================
     */

    static normalize(text) {

        return text

            .trim()

            .replace(/\s+/g, " ")

            .toLowerCase();

    }

}

export default TextValidator;