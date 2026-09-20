/**
 * ==========================================================
 * TS10 Learning Platform
 * Sprint 3
 * validators/orderValidator.js
 * ==========================================================
 *
 * Validates ordering / timeline exercises.
 *
 * step.answer  : string[] – correct order of item ids/labels
 * userAnswer   : string[] – order as submitted by the student
 */

import ValidatorInterface from "./ValidatorInterface.js";

class OrderValidator extends ValidatorInterface {

    static validate(step, userAnswer){
        if(step && step.data) { step = { ...step, ...step.data }; }

        const expected = step.answer || [];
        let actual = [];

        if (Array.isArray(userAnswer)) {
            actual = userAnswer;
        } else if (typeof userAnswer === 'object' && userAnswer !== null) {
            const posArray = [];
            for (const [key, pos] of Object.entries(userAnswer)) {
                let itemValue = key;
                const itemObj = (step.items || []).find((it, idx) => String(it.id ?? idx) === String(key));
                if (itemObj !== undefined) {
                    itemValue = itemObj.id ?? itemObj.text ?? itemObj;
                }
                const posInt = parseInt(pos, 10);
                if (!isNaN(posInt)) {
                    posArray.push({ value: itemValue, pos: posInt });
                }
            }
            posArray.sort((a, b) => a.pos - b.pos);
            actual = posArray.map(p => p.value);
        }
        const maxScore = step.score || 1;

        // ── Validity ─────────────────────────────────────────
        const valid = actual.length > 0 && actual.length === expected.length;

        if (!valid){
            return this.result({
                valid:    false,
                score:    0,
                maxScore,
                message:  "Em cần sắp xếp đủ tất cả các mục.",
                expected,
                actual
            });
        }

        // ── Scoring ──────────────────────────────────────────
        let correct = 0;
        const details = expected.map((exp, i) => {
            const normalizedExp = this.normalize(String(exp.id ?? exp));
            const normalizedAct = this.normalize(String(actual[i] ?? ""));
            const ok = normalizedExp === normalizedAct;
            if (ok) correct++;
            return { position: i, expected: exp, actual: actual[i], correct: ok };
        });

        const total     = expected.length || 1;
        const score     = (correct / total) * maxScore;
        const isCorrect = correct === total;

        return this.result({
            valid:       true,
            score,
            maxScore,
            message:     isCorrect ? "Chính xác!" : `Đúng ${correct}/${total} vị trí.`,
            explanation: step.explanation || "",
            expected,
            actual:      details
        });

    }

}

export default OrderValidator;
