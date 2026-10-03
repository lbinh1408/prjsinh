import { updateMastery } from './masterEngine.js';
const state = {
    mastery: "M3",
    status: "developing",
    evidence: { know: 0.9, explain: 0.9, apply: 0.9, transfer: 0.7 },
    overallEvidence: 0,
    confidence: { level: "high", score: 0.9, attemptCount: 8 },
    evidenceSufficiency: {
        independentObservations: 5,
        distinctContexts: 2,
        observedEvidenceTypes: ["know", "explain", "apply", "transfer"],
        contextIds: ["C1", "C2"]
    },
    attemptStats: { total: 0, correct: 0, wrong: 0, partial: 0, skipped: 0 },
    signals: [],
    failureSummary: {}
};
const attempt = { nodeId: "K1", primaryDimension: "transfer", result: "correct", contextId: "C3" };
const result = updateMastery({ attempt, currentState: state });
console.log("Mastery:", result.current.mastery);
console.log("Supported Level:", result.decision.supportedLevel);
console.log("Overall Evidence:", result.current.overallEvidence);
console.log("Sufficiency:", JSON.stringify(result.current.evidenceSufficiency));
