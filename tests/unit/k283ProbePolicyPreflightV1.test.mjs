import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
    K283ProbePolicyConfigurationError,
    preflightK283ProbeAuthoringPolicy
} from "../../k283ProbePolicyPreflightV1.js";
import { createRuntimeSession } from "../../liveStudyK283PersistentMultiTurnV1.js";
import { PROBE_FEASIBILITY_RESOLVER_VERSION } from "../../src/engines/remediation/probeFeasibilityResolver.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relativePath =>
    JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const dependencies = {
    questionBank: readJson("src/data/questions/c09/K283.question-bank.json"),
    knowledgeMap: readJson("src/data/knowledge/knowledge-map-v4.json"),
    adaptiveRules: readJson("src/policies/adaptive/rules.json"),
    adaptivePaths: readJson("src/policies/adaptive/paths.json"),
    failureSignatures: readJson("src/data/remediation/failure-signatures.json"),
    remediationRules: {}
};
const config = {
    learningMode: "HOC_SAU",
    timeBudget: 60,
    clusterId: "C09",
    lessonId: null,
    contextId: "live-study-k283",
    historyLimit: 50
};
const policy = () => ({
    schemaVersion: "1.0.0",
    policyId: "k283-runtime-probe-policy",
    policyVersion: "1.0.0",
    failureSignatureDefaults: {
        concept_confusion: {
            difficulty: "D2",
            evidenceDimension: "explain"
        }
    }
});

function canonicalize(value) {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value).sort()
                .filter(key => value[key] !== undefined)
                .map(key => [key, canonicalize(value[key])])
        );
    }
    return value;
}

function independentlyReconstructPreflightV1({
    dependencies: preflightDependencies,
    targetNodeId = "K283",
    config: preflightConfig,
    selectorConstraints = {}
}) {
    const questionBank = preflightDependencies.questionBank;
    const input = {
        resolverVersion: PROBE_FEASIBILITY_RESOLVER_VERSION,
        targetNodeId,
        bankIdentity: {
            bankId: questionBank.bankId,
            version: questionBank.version
        },
        questionBank,
        selectorConstraints,
        config: preflightConfig,
        generationRules: {
            adaptiveRules: preflightDependencies.adaptiveRules,
            adaptivePaths: preflightDependencies.adaptivePaths,
            knowledgeMap: preflightDependencies.knowledgeMap,
            failureSignatures: preflightDependencies.failureSignatures,
            remediationRules: preflightDependencies.remediationRules
        }
    };
    return createHash("sha256")
        .update(JSON.stringify(canonicalize(input)), "utf8")
        .digest("hex");
}

test("valid policy preflight binds validated identity to the current K283 bank and fingerprint", () => {
    const selectorConstraints = {
        requiredEvidenceDimension: "explain",
        questionTypes: ["mcq", "numeric"]
    };
    const result = preflightK283ProbeAuthoringPolicy({
        policy: policy(),
        dependencies,
        config,
        selectorConstraints
    });
    assert.equal(result.status, "VALIDATED");
    assert.deepEqual(result.policyIdentity, {
        policyId: "k283-runtime-probe-policy",
        policyVersion: "1.0.0"
    });
    assert.equal(result.canonicalPolicy.policyId, "k283-runtime-probe-policy");
    assert.match(result.configFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(
        result.configFingerprint,
        independentlyReconstructPreflightV1({
            dependencies,
            config,
            selectorConstraints
        })
    );

    const changedPolicy = policy();
    changedPolicy.failureSignatureDefaults.concept_confusion.difficulty = "D3";
    assert.equal(
        preflightK283ProbeAuthoringPolicy({
            policy: changedPolicy,
            dependencies,
            config,
            selectorConstraints
        }).configFingerprint,
        result.configFingerprint
    );
});

test("missing policy identity fails with a typed startup configuration error", () => {
    const invalid = policy();
    delete invalid.policyId;
    assert.throws(
        () => createRuntimeSession(null, invalid),
        error => error instanceof K283ProbePolicyConfigurationError &&
            error.code === "K283_PROBE_POLICY_CONFIGURATION_INVALID" &&
            error.reasonCode === "INVALID_POLICY"
    );
});

test("unsupported policy schema version fails before runtime session creation", () => {
    const invalid = policy();
    invalid.schemaVersion = "2.0.0";
    assert.throws(
        () => createRuntimeSession(null, invalid),
        error => error instanceof K283ProbePolicyConfigurationError &&
            error.reasonCode === "UNSUPPORTED_POLICY_VERSION"
    );
});

test("missing bank identity fails closed before runtime session creation", () => {
    const incompleteDependencies = {
        ...dependencies,
        questionBank: { ...dependencies.questionBank, version: "" }
    };
    assert.throws(
        () => preflightK283ProbeAuthoringPolicy({
            policy: policy(),
            dependencies: incompleteDependencies,
            config
        }),
        error => error instanceof K283ProbePolicyConfigurationError &&
            error.reasonCode === "BANK_IDENTITY_UNAVAILABLE"
    );
});

test("incomplete fingerprint configuration fails closed", () => {
    const incompleteConfig = { ...config };
    delete incompleteConfig.contextId;
    assert.throws(
        () => preflightK283ProbeAuthoringPolicy({
            policy: policy(),
            dependencies,
            config: incompleteConfig
        }),
        error => error instanceof K283ProbePolicyConfigurationError &&
            error.reasonCode === "FINGERPRINT_INPUTS_UNAVAILABLE"
    );
});

test("omitted policy preserves LEGACY preflight and runtime behavior", () => {
    const result = preflightK283ProbeAuthoringPolicy({ dependencies, config });
    assert.deepEqual(
        result,
        { status: "LEGACY", policy: null }
    );
    assert.equal(Object.hasOwn(result, "configFingerprint"), false);
    const runtime = createRuntimeSession();
    assert.equal(
        Object.hasOwn(runtime.session.dependencies, "probeAuthoringPolicy"),
        false
    );
});

test("valid preflight preserves verified-progress continuation without replay or plan generation", () => {
    const priorHistory = [{ kind: "prior-checkpoint-history" }];
    const priorCheckpoint = { revision: 7, extensions: {} };
    const runtime = createRuntimeSession({
        fromSessionId: "LIVE-K283-PRIOR",
        evidenceHistoryByNode: {},
        history: priorHistory,
        checkpoint: priorCheckpoint,
        remediationGenerationStop: null
    }, policy());

    assert.equal(runtime.session.dependencies.probeAuthoringPolicy.policyId,
        "k283-runtime-probe-policy");
    assert.deepEqual(runtime.session.history, priorHistory);
    assert.deepEqual(runtime.session.attempts, []);
    assert.equal(runtime.session.activeRemediationPlan, null);
    assert.deepEqual(priorCheckpoint, { revision: 7, extensions: {} });
});
