
export const knowledgeMap = {
        schemaVersion: "1.0.0",
        mapVersion: "1.0.0",
        clusters: [
            { id: "C01", name: "Cluster 1" }
        ],
        nodes: [
            {
                id: "K001",
                name: "Node 1",
                cluster: "C01",
                priority: "P1",
                targetMastery: "M2",
                dependencies: { D1: [], D2: [], D3: [] },
                leadsTo: ["K002"]
            },
            {
                id: "K002",
                name: "Node 2",
                cluster: "C01",
                priority: "P1",
                targetMastery: "M3",
                dependencies: { D1: ["K001"], D2: [], D3: [] },
                leadsTo: []
            }
        ]
    };
export const questions = [{
        id: "Q-A-K001-A-001",
        version: "1.0.0",
        nodes: ["K001"],
        primaryNode: "K001",
        evidence: "apply",
        difficulty: "D3",
        questionType: "mcq",
        mode: ["practice"],
        content: {
            stem: "Question stem",
            options: [
                { id: "A", text: "Option A", isCorrect: true },
                { id: "B", text: "Option B", isCorrect: false }
            ]
        },
        answer: {
            type: "single",
            value: "A"
        },
        scoring: {
            maxScore: 1
        },
        failureSignatures: ["concept_confusion"],
        explanation: {
            correct: "Explanation text"
        }
    }];
export const attempts = [{
        schemaVersion: "1.0.0",
        attemptId: "ATT-123456",
        studentId: "stu-001",
        sessionId: "sess-001",
        questionId: "Q-A-K001-A-001",
        startedAt: "2024-03-15T10:00:00.000Z",
        submittedAt: "2024-03-15T10:05:00.000Z",
        response: {
            type: "singleChoice",
            value: "A"
        },
        result: "correct",
        score: 1,
        attemptNumber: 1,
        hint: {
            used: false,
            count: 0
        },
        timing: {
            timeSpentSeconds: 300,
            activeTimeSeconds: 280,
            pausedTimeSeconds: 20
        },
        context: {
            learningMode: "HOC_NHANH",
            action: "PRACTICE",
            pathStage: "PRACTICE",
            nodeId: "K001",
            secondaryNodeIds: ["K002"],
            metaSkillIds: ["S001"]
        },
        diagnostic: {
            failureSignatureId: "concept_confusion",
            sourceNodeId: "K001",
            confidence: 0.8
        },
        evidence: {
            difficulty: "D3",
            primaryDimension: "apply",
            evidenceStrength: 0.9,
            independence: "independent"
        }
    }];
export const events = [{
        "schemaVersion": "1.0.0",
        "eventId": "evt-001",
        "eventType": "ANSWER_CORRECT",
        "timestamp": "2026-09-20T09:15:00Z",
        "studentId": "S123",
        "sessionId": "sess-456",
        "source": {
            "component": "QuestionEngine"
        },
        "context": {
            "learningMode": "HOC_NHANH",
            "nodeId": "K206",
            "questionId": "Q-A206-002"
        },
        "payload": {
            "result": "correct",
            "attemptNumber": 1
        },
        "correlation": {
            "attemptId": "att-001"
        }
    }];
export const studentState = {"schemaVersion":"1.1.0","stateId":"student-state-v1","stateType":"runtime","updatedAt":"2026-09-20T10:05:00+07:00","student":{"studentId":"student-001","displayName":"Học sinh 01","grade":11,"curriculum":"KNTT","target":{"mode":"ON_THI","exam":"THPT","subject":"Sinh học"}},"learning":{"currentMode":"HOC_NHANH","session":{"sessionId":"session-2026-09-20-001","startedAt":"2026-09-20T09:00:00+07:00","lastActivityAt":"2026-09-20T10:05:00+07:00","timeBudgetMinutes":60,"timeUsedMinutes":35,"runtimeSignals":{"consecutiveWrong":1,"consecutiveSkip":0,"consecutiveRemediation":0},"fatigue":{"level":"normal","signals":[]}},"current":{"clusterId":"C05","lessonId":"dna-to-trait-01","nodeId":"K206","action":"PRACTICE","contextId":null}},"knowledge":{"K013":{"mastery":"M4","status":"stable","evidence":{"know":0.96,"explain":0.91,"apply":0.88,"transfer":0.82},"overallEvidence":0.88,"confidence":"high","evidenceSufficiency":{"independentObservations":10,"distinctContexts":3,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":12,"correct":11,"wrong":1,"partial":0,"skipped":0},"weakEvidence":[],"signals":[],"lastAttemptAt":"2026-09-12T10:20:00+07:00","lastSuccessAt":"2026-09-12T10:20:00+07:00","lastFailure":null,"retest":{"attempted":true,"lastRetestAt":"2026-09-12T10:20:00+07:00","passed":true,"differentQuestion":true,"differentContext":true,"independent":true},"review":{"lastReviewedAt":"2026-09-12T10:20:00+07:00"}},"K200":{"mastery":"M4","status":"mastered","evidence":{"know":0.98,"explain":0.94,"apply":0.91,"transfer":0.76},"overallEvidence":0.89,"confidence":"high","evidenceSufficiency":{"independentObservations":8,"distinctContexts":2,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":10,"correct":9,"wrong":1,"partial":0,"skipped":0},"weakEvidence":[],"signals":[],"lastAttemptAt":"2026-09-18T09:30:00+07:00","lastSuccessAt":"2026-09-18T09:30:00+07:00","lastFailure":{"questionId":"Q-K200-004","failureType":"careless_error","sourceNodeId":null,"at":"2026-09-10T09:30:00+07:00"},"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":"2026-09-18T09:30:00+07:00"}},"K201":{"mastery":"M4","status":"mastered","evidence":{"know":0.95,"explain":0.89,"apply":0.84,"transfer":0.71},"overallEvidence":0.83,"confidence":"high","evidenceSufficiency":{"independentObservations":7,"distinctContexts":2,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":8,"correct":8,"wrong":0,"partial":0,"skipped":0},"weakEvidence":[],"signals":[],"lastAttemptAt":"2026-09-18T09:45:00+07:00","lastSuccessAt":"2026-09-18T09:45:00+07:00","lastFailure":null,"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":"2026-09-18T09:45:00+07:00"}},"K204":{"mastery":"M3","status":"developing","evidence":{"know":0.91,"explain":0.78,"apply":0.67,"transfer":0.42},"overallEvidence":0.66,"confidence":"medium","evidenceSufficiency":{"independentObservations":6,"distinctContexts":2,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":9,"correct":7,"wrong":2,"partial":0,"skipped":0},"weakEvidence":["apply","transfer"],"signals":["mechanism_confusion_observed"],"lastAttemptAt":"2026-09-19T09:10:00+07:00","lastSuccessAt":"2026-09-19T09:10:00+07:00","lastFailure":{"questionId":"Q-A204-003","failureType":"mechanism_confusion","sourceNodeId":null,"at":"2026-09-19T09:05:00+07:00"},"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":"2026-09-19T09:10:00+07:00"}},"K205":{"mastery":"M3","status":"developing","evidence":{"know":0.93,"explain":0.81,"apply":0.69,"transfer":0.48},"overallEvidence":0.69,"confidence":"medium","evidenceSufficiency":{"independentObservations":5,"distinctContexts":2,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":7,"correct":6,"wrong":1,"partial":0,"skipped":0},"weakEvidence":["apply","transfer"],"signals":[],"lastAttemptAt":"2026-09-19T09:20:00+07:00","lastSuccessAt":"2026-09-19T09:20:00+07:00","lastFailure":null,"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":"2026-09-19T09:20:00+07:00"}},"K206":{"mastery":"M2","status":"developing","evidence":{"know":0.82,"explain":0.42,"apply":0.2,"transfer":0},"overallEvidence":0.29,"confidence":"low","evidenceSufficiency":{"independentObservations":3,"distinctContexts":1,"observedEvidenceTypes":["know","explain","apply"]},"attemptStats":{"total":5,"correct":3,"wrong":2,"partial":0,"skipped":0},"weakEvidence":["explain","apply","transfer"],"signals":["repeated_failure_signature","source_knowledge_gap_detected"],"lastAttemptAt":"2026-09-20T09:55:00+07:00","lastSuccessAt":"2026-09-20T09:50:00+07:00","lastFailure":{"questionId":"Q-A206-002","failureType":"source_knowledge_gap","sourceNodeId":"K202","at":"2026-09-20T09:55:00+07:00"},"failureSummary":{"source_knowledge_gap":{"count":2,"sourceNodeId":"K202","lastAt":"2026-09-20T09:55:00+07:00"}},"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":null}},"K208":{"mastery":"M2","status":"developing","evidence":{"know":0.84,"explain":0.58,"apply":0.31,"transfer":0.1},"overallEvidence":0.39,"confidence":"low","evidenceSufficiency":{"independentObservations":2,"distinctContexts":1,"observedEvidenceTypes":["know","explain","apply","transfer"]},"attemptStats":{"total":4,"correct":2,"wrong":2,"partial":0,"skipped":0},"weakEvidence":["explain","apply","transfer"],"signals":["cross_node_reasoning_error_observed"],"lastAttemptAt":"2026-09-20T10:00:00+07:00","lastSuccessAt":"2026-09-20T09:58:00+07:00","lastFailure":{"questionId":"Q-T208-001","failureType":"cross_node_reasoning_error","sourceNodeId":"K206","at":"2026-09-20T10:00:00+07:00"},"failureSummary":{"cross_node_reasoning_error":{"count":1,"sourceNodeId":"K206","lastAt":"2026-09-20T10:00:00+07:00"}},"retest":{"attempted":false,"lastRetestAt":null,"passed":false,"differentQuestion":false,"differentContext":false,"independent":false},"review":{"lastReviewedAt":null}}},"metaSkills":{"S001":{"mastery":"M3","status":"developing","evidence":0.68,"confidence":"medium","attemptStats":{"total":6,"wrong":2},"weak":false,"signals":[],"lastFailure":null},"S002":{"mastery":"M2","status":"developing","evidence":0.45,"confidence":"medium","attemptStats":{"total":5,"wrong":3},"weak":true,"signals":["repeated_evidence_failure"],"lastFailure":{"questionId":"Q-S002-004","failureType":"data_interpretation_error","at":"2026-09-18T10:20:00+07:00"}},"S003":{"mastery":"M3","status":"developing","evidence":0.72,"confidence":"medium","attemptStats":{"total":4,"wrong":1},"weak":false,"signals":[],"lastFailure":null}},"failurePatterns":{"active":[{"failureType":"mechanism_confusion","nodeId":"K204","sourceNodeId":null,"count":1,"lastAt":"2026-09-19T09:05:00+07:00"},{"failureType":"source_knowledge_gap","nodeId":"K206","sourceNodeId":"K202","count":2,"lastAt":"2026-09-20T09:55:00+07:00"},{"failureType":"cross_node_reasoning_error","nodeId":"K208","sourceNodeId":"K206","count":1,"lastAt":"2026-09-20T10:00:00+07:00"}]},"remediation":{"lastResult":{"targetNodeId":"K202","sourceNodeId":"K202","triggerNodeId":"K206","failureType":"source_knowledge_gap","status":"completed","completedAt":"2026-09-20T09:58:00+07:00"},"activePlan":null},"adaptive":{"lastDecision":{"action":"PRACTICE","nodeId":"K206","reasonCodes":["mastery_M2","apply_evidence_low","source_remediation_completed"],"at":"2026-09-20T10:00:00+07:00"},"nextAction":{"action":"PRACTICE","nodeId":"K206","priority":145,"constraints":{"difficulty":["D2","D3"],"evidence":["explain","apply"]},"decidedAt":"2026-09-20T10:00:00+07:00"}},"history":{"recentActions":[{"action":"LEARN","nodeId":"K206","at":"2026-09-20T09:20:00+07:00"},{"action":"PRACTICE","nodeId":"K206","at":"2026-09-20T09:45:00+07:00"},{"action":"REMEDIATE","nodeId":"K202","at":"2026-09-20T09:55:00+07:00"},{"action":"PRACTICE","nodeId":"K206","at":"2026-09-20T10:00:00+07:00"}],"recentQuestions":["Q-K206-001","Q-E206-001","Q-A206-002","Q-K202-004","Q-A206-003"]},"progress":{"nodes":{"total":150,"unstarted":132,"developing":6,"mastered":9,"stable":3},"clusters":{"C01":{"status":"in_progress","progress":0.35},"C02":{"status":"not_started","progress":0},"C05":{"status":"in_progress","progress":0.48}}},"preferences":{"preferredSessionLength":"normal","preferredDifficulty":"adaptive","allowChallenge":true,"allowSkipKnown":true,"showDetailedFeedback":true}};
export const lessons = [{
        "id": "L204-01",
        "version": "1.0.0",
        "title": "Cơ chế phiên mã và dịch mã",
        "type": "mechanism",
        "deliveryModes": ["HOC_SAU", "ON_THI"],
        "knowledgeNodes": ["K204", "K205", "K206"],
        "primaryNodes": ["K204"],
        "supportingNodes": ["K205", "K206"],
        "prerequisites": ["K013"],
        "objectives": [
            {
                "id": "OBJ01",
                "node": "K204",
                "type": "explain",
                "description": "Giải thích được cơ chế phiên mã"
            }
        ],
        "estimatedMinutes": {
            "minimum": 15,
            "typical": 25,
            "maximum": 40
        },
        "difficulty": "D3",
        "entryDiagnostic": {
            "enabled": true,
            "purpose": ["assess_prior_knowledge"],
            "questionSelection": {
                "source": "BANK_01",
                "nodes": ["K204"], 
                "maxQuestions": 5
            },
            "outcomes": {
                "mastered": {
                    "action": "SKIP_TO_CHALLENGE"
                },
                "weak": {
                    "action": "START_FROM_PREREQUISITE"
                }
            }
        },
        "exitDiagnostic": {
            "enabled": true,
            "purpose": ["verify_mastery"],
            "questionSelection": {
                "source": "BANK_01",
                "selection": {
                    "nodes": ["K204"],
                    "failureSignature": "mechanism_confusion",
                    "count": 3
                }
            },
            "outcomes": {
                "pass": {
                    "action": "UPDATE_MASTERY"
                },
                "fail": {
                    "action": "REMEDIATE"
                }
            }
        },
        "sections": [
            {
                "id": "SEC_01",
                "type": "concept",
                "title": "Giới thiệu phiên mã",
                "nodes": ["K204"],
                "estimatedMinutes": 10,
                "content": {
                    "format": "markdown",
                    "contentRef": "ref_01",
                    "blocks": [
                        {
                            "type": "text",
                            "contentRef": "ref_02"
                        }
                    ]
                },
                "questionSet": {
                    "source": "BANK_01",
                    "adaptive": false,
                    "selection": {
                        "nodes": ["K204"],
                        "count": 2
                    }
                }
            }
        ]
    }];
