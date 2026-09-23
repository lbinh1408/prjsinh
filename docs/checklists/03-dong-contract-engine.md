đóng contract trước khi code engine. Mình sẽ giữ đúng kiến trúc 7 engine hiện tại, không thêm engine mới, và phân biệt rõ:

Input: engine được phép đọc gì
Output: engine được phép tạo gì
Responsibility: nó được quyền quyết định gì
Non-responsibility: nó tuyệt đối không quyết định gì
Contract: cấu trúc dữ liệu giao tiếp với engine khác

Mục tiêu là sau bước này, chúng ta có thể bắt đầu code mà không tiếp tục “đẻ” architecture.

I. Bức tranh contract tổng thể
                           ┌──────────────────────┐
                           │   KNOWLEDGE ENGINE    │
                           │      HỌC CÁI GÌ?     │
                           └──────────┬───────────┘
                                      │
                              KnowledgeContext
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │    LESSON ENGINE     │
                           │   DẠY NHƯ THẾ NÀO?  │
                           └──────────┬───────────┘
                                      │
                               LearningContext
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │   QUESTION ENGINE    │
                           │      HỎI CÂU NÀO?   │
                           └──────────┬───────────┘
                                      │
                                Question
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │    MASTERY ENGINE    │
                           │  ĐÃ BIẾT ĐẾN ĐÂU?    │
                           └──────────┬───────────┘
                                      │
                              MasteryUpdate
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │    ADAPTIVE ENGINE   │
                           │  TIẾP THEO LÀM GÌ?  │
                           └──────┬────────┬──────┘
                                  │        │
                         Remediation       │ NextAction
                                  │        │
                                  ▼        │
                       ┌────────────────┐  │
                       │ REMEDIATION    │  │
                       │ ENGINE         │  │
                       └───────┬────────┘  │
                               │           │
                               └─────┬─────┘
                                     ▼
                                  Continue

          ┌──────────────────────────────────────────────┐
          │              ANALYTICS ENGINE                │
          │     quan sát events từ toàn bộ hệ thống      │
          └──────────────────────────────────────────────┘

Điểm quan trọng:

Student State là dữ liệu trung tâm, nhưng không phải một engine.

Các engine đọc/ghi những phần được phép của state thông qua contract.

II. Contract 1 — Knowledge Engine
1. Responsibility

Knowledge Engine quản lý knowledge graph / knowledge map.

Nó trả lời:

"Node này là gì? Nó phụ thuộc vào gì? Nó liên quan đến gì?"

Nguồn chính:

data/knowledge/knowledge-map-v4.json
2. Input
KnowledgeMap
KnowledgeNode
Dependency
Cluster

Ví dụ:

{
  "nodeId": "K206"
}
3. Output
{
  "nodeId": "K206",
  "node": {},
  "prerequisites": [],
  "dependencies": [],
  "dependents": [],
  "clusters": []
}
4. API contract
getNode(nodeId)

getPrerequisites(nodeId)

getDependents(nodeId)

getDependencies(nodeId)

getCluster(clusterId)

getNodesByCluster(clusterId)

checkDependency(nodeA, nodeB)

getLearningContext(nodeId)
5. Không được làm

Knowledge Engine không được:

❌ đọc điểm học sinh để quyết định mastery
❌ chọn câu hỏi
❌ chọn lesson
❌ quyết định LEARN/PRACTICE/CHALLENGE
❌ tự remediation

Nó chỉ trả lời:

"Cấu trúc tri thức nói gì?"

III. Contract 2 — Lesson Engine
Responsibility

Lesson Engine biến knowledge node/cluster thành learning experience.

Input:

nodeIds
clusterIds
learningMode
lessonId
section requirements

Output:

LessonInstance

Ví dụ:

{
  "lessonId": "dna-to-trait-01",
  "nodes": [
    "K200",
    "K201",
    "K204",
    "K205",
    "K202",
    "K206",
    "K208"
  ],
  "sections": [
    "orientation",
    "concept",
    "mechanism",
    "workedExample",
    "guidedPractice",
    "practice",
    "crossNode",
    "reflection"
  ]
}
Lesson Engine được phép
✓ sắp xếp section
✓ bỏ section không cần thiết
✓ tạo learning context
✓ yêu cầu Question Engine cung cấp câu hỏi
✓ nhận mastery để điều chỉnh presentation

Nhưng:

Lesson Engine
        ↓
không được tự nói:
"K206 đã M4"

Nó chỉ nhận kết quả từ Mastery Engine.

API
loadLesson(lessonId)

buildLessonContext(nodeIds, studentContext)

getSections(lessonId)

resolveSection(sectionId)

requestPracticeQuestions(criteria)

requestChallengeQuestions(criteria)
IV. Contract 3 — Question Engine

Đây là contract chúng ta vừa bắt đầu kiểm chứng bằng K206.

Responsibility

Question Engine:

Chọn / cung cấp question phù hợp với learning decision.

Input:

{
  "action": "PRACTICE",
  "nodeIds": ["K206"],
  "difficulty": ["D2", "D3"],
  "evidenceDimensions": [
    "explain",
    "apply"
  ]
}

Output:

{
  "questionId": "Q-A206-002",
  "question": {}
}
API
getQuestion(questionId)

selectQuestions(selectionCriteria)

getDiagnosticQuestions(nodeIds)

getRetestQuestions(nodeIds)

validateQuestion(question)

excludeQuestions(questionIds)
Question Engine không được:
❌ update mastery
❌ thay đổi evidence
❌ quyết định student weak
❌ quyết định remediation
❌ quyết định next action

Nó chỉ:

"Đây là câu hỏi phù hợp."

V. Contract 4 — Mastery Engine

Đây là engine quan trọng nhất về mặt evidence.

Input

Mastery Engine nhận:

Question
+
Attempt
+
Current Mastery
+
Mastery Rules

Ví dụ:

{
  "questionId": "Q-A206-002",
  "result": "incorrect",
  "score": 0,
  "hintUsed": false,
  "timeSpentSeconds": 38
}
Output
{
  "nodeId": "K206",

  "evidence": {
    "know": 0.82,
    "explain": 0.42,
    "apply": 0.13,
    "transfer": 0.00
  },

  "mastery": "M2",

  "status": "weak",

  "confidence": "medium",

  "failure": {
    "signature": "source_knowledge_gap",
    "sourceNodeId": "K202"
  }
}
Mastery Engine chịu trách nhiệm
✓ evidence update
✓ mastery level
✓ confidence
✓ status
✓ failure evidence
✓ retest result
✓ stable/mastered
Không được
❌ chọn lesson
❌ chọn question
❌ quyết định learning path

Đặc biệt:

Mastery Engine không nói "bây giờ học sinh phải học K202".

Nó chỉ nói:

"Bằng chứng cho thấy có source gap ở K202."

Adaptive/Remediation mới xử lý tiếp.

VI. Contract 5 — Adaptive Engine

Đây là decision engine.

Input
Student State
+
Mastery
+
Knowledge Graph
+
Adaptive Rules
+
Adaptive Paths
+
Current Session
+
Learning Mode

Ví dụ:

{
  "nodeId": "K206",
  "mastery": "M2",
  "evidence": {
    "know": 0.82,
    "explain": 0.42,
    "apply": 0.20,
    "transfer": 0
  },
  "failure": {
    "signature": "source_knowledge_gap",
    "sourceNodeId": "K202"
  },
  "mode": "HOC_SAU"
}
Output
{
  "action": "REMEDIATE",

  "target": {
    "nodeId": "K202"
  },

  "reason": {
    "code": "SOURCE_KNOWLEDGE_GAP",
    "priority": 92
  },

  "path": {
    "id": "remediation-source-gap"
  }
}
Action contract

Chỉ có 7 action chính:

LEARN
PRACTICE
CHALLENGE
REMEDIATE
RETEST
REVIEW
SKIP

Các trạng thái như:

DIAGNOSTIC
MINI_PROBE
CROSS_NODE
TRANSFER

không trở thành action thứ 8, 9, 10.

Chúng là stage/path state.

Adaptive Engine không được
❌ tự chấm câu
❌ tự update mastery
❌ tự sửa knowledge map
❌ tự xác định failure signature từ câu trả lời

Nó dùng kết quả của các engine khác để ra quyết định.

VII. Contract 6 — Remediation Engine

Remediation Engine nhận failure evidence.

Ví dụ:

{
  "failedNode": "K206",

  "failure": {
    "signature": "source_knowledge_gap",
    "sourceNodeId": "K202"
  },

  "currentMastery": {
    "K206": "M2",
    "K202": "M1"
  }
}
Output
{
  "remediationId": "REM-K206-K202-001",

  "sourceNode": "K202",

  "targetNode": "K206",

  "strategy": {
    "action": "REMEDIATE",
    "depth": 1
  },

  "steps": [
    {
      "type": "LEARN",
      "nodeId": "K202"
    },
    {
      "type": "PRACTICE",
      "nodeId": "K202"
    },
    {
      "type": "PROBE",
      "nodeId": "K202"
    }
  ]
}
Remediation Engine phải biết
failure signature
↓
source node
↓
source mastery
↓
remediation depth
↓
mini practice
↓
mini probe
↓
return target
Nhưng không được
❌ tự thay đổi mastery
❌ tự xác nhận student đã mastered
❌ tự chọn toàn bộ learning path

Mastery Engine xác nhận mastery.

Adaptive Engine quyết định đường đi.

VIII. Contract 7 — Analytics Engine

Analytics Engine khác 6 engine còn lại.

Nó chủ yếu là event consumer.

Input:

Learning Events

Ví dụ:

{
  "eventId": "evt-001",
  "type": "QUESTION_ANSWERED",

  "studentId": "student-001",
  "questionId": "Q-A206-002",
  "nodeId": "K206",

  "result": "incorrect",

  "timestamp": "2026-09-20T14:30:00+07:00"
}
Output

Analytics có thể tạo:

progress metrics
learning metrics
mastery trends
failure trends
question quality signals
session metrics

Ví dụ:

{
  "nodeId": "K206",

  "metrics": {
    "attempts": 12,
    "accuracy": 0.67,
    "averageTime": 42,
    "remediationRate": 0.25,
    "retestPassRate": 0.75
  }
}
Analytics Engine không được
❌ thay đổi mastery
❌ chọn question
❌ quyết định remediation
❌ thay đổi adaptive decision

Analytics quan sát, không điều khiển.

IX. Contract quan trọng nhất: Attempt

Để 7 engine không bị dính chặt vào nhau, mình đề nghị coi Attempt là một contract trung tâm.

{
  "attemptId": "ATT-001",

  "studentId": "student-001",

  "questionId": "Q-A206-002",

  "nodeId": "K206",

  "startedAt": "2026-09-20T14:30:00+07:00",
  "submittedAt": "2026-09-20T14:30:38+07:00",

  "response": 300,

  "result": "incorrect",

  "score": 0,

  "hintUsed": true,
  "hintLevel": 1,

  "retry": false,

  "timeSpentSeconds": 38
}

Sau khi evaluation:

{
  "failure": {
    "signature": "calculation_error",
    "sourceNodeId": "K202"
  }
}

Attempt là bằng chứng của một interaction, không phải question.

Đây là distinction chúng ta vừa kiểm tra với K206.

X. Contract quan trọng thứ hai: MasteryUpdate

Mastery Engine không nên trả về cả một student-state.json khổng lồ.

Nó chỉ trả:

{
  "studentId": "student-001",

  "nodeId": "K206",

  "previous": {
    "mastery": "M2",
    "status": "developing"
  },

  "current": {
    "mastery": "M2",
    "status": "weak"
  },

  "evidence": {
    "know": 0.82,
    "explain": 0.42,
    "apply": 0.13,
    "transfer": 0.00
  },

  "confidence": "medium",

  "failure": {
    "signature": "source_knowledge_gap",
    "sourceNodeId": "K202"
  }
}

Adaptive Engine lấy cái này để quyết định.

XI. Contract quan trọng thứ ba: NextAction

Adaptive Engine chỉ cần trả một object kiểu:

{
  "action": "REMEDIATE",

  "target": {
    "type": "knowledge",
    "id": "K202"
  },

  "reason": {
    "code": "SOURCE_KNOWLEDGE_GAP"
  },

  "pathId": "remediation-source-gap",

  "selectionCriteria": {
    "nodeIds": [
      "K202"
    ],
    "questionTypes": [
      "Q-K",
      "Q-E",
      "Q-A"
    ],
    "difficulty": [
      "D1",
      "D2"
    ]
  }
}

Sau đó engine khác mới thực thi action.

Ví dụ:

Adaptive
   ↓
REMEDIATE K202
   ↓
Lesson Engine / Question Engine
   ↓
thực hiện

Đây là điểm giúp architecture không bị biến thành một God Engine.

XII. Contract cuối cùng: Event

Tất cả engine có thể phát event:

LESSON_STARTED
LESSON_COMPLETED

QUESTION_PRESENTED
QUESTION_ANSWERED

MASTERY_UPDATED

FAILURE_DETECTED

REMEDIATION_STARTED
REMEDIATION_COMPLETED

RETEST_STARTED
RETEST_PASSED
RETEST_FAILED

NODE_SKIPPED

SESSION_STARTED
SESSION_COMPLETED

Analytics Engine nghe các event này.

Ví dụ:

Question Engine
      │
      └── QUESTION_PRESENTED
                   ↓
             Analytics

Mastery Engine
      │
      └── MASTERY_UPDATED
                   ↓
             Analytics
XIII. Bảng "quyền hạn" của 7 engine

Đây là bảng mình khuyên ghim trong architecture docs:

Engine	Được quyết định	Không được quyết định
Knowledge	cấu trúc kiến thức, dependency	mastery, next action
Lesson	cách trình bày kiến thức	mastery, adaptive decision
Question	câu hỏi phù hợp	mastery, remediation
Mastery	evidence, mastery, confidence, failure evidence	next action
Adaptive	action tiếp theo, path	mastery, answer evaluation
Remediation	source/strategy sửa lỗi	mastery
Analytics	metrics/insights	learning decision
XIV. Luồng hoàn chỉnh sau khi đóng contract

Một session thực tế sẽ chạy như sau:

Student
   │
   ▼
Adaptive Engine
   │
   │  "PRACTICE K206"
   ▼
Question Engine
   │
   │  Q-A206-002
   ▼
Student answers
   │
   ▼
Attempt
   │
   ▼
Mastery Engine
   │
   ├── evidence update
   ├── mastery update
   └── failure detection
            │
            ▼
      Adaptive Engine
            │
            ├───────────────┐
            │               │
            ▼               ▼
       CONTINUE        REMEDIATION
                            │
                            ▼
                    Remediation Engine
                            │
                            ▼
                         K202
                            │
                            ▼
                       mini probe
                            │
                            ▼
                    Mastery Engine
                            │
                            ▼
                    Adaptive Engine
                            │
                            ▼
                         K206

Trong toàn bộ quá trình:

Analytics Engine
       ↑
       │
   nhận events
       │
       └──── từ tất cả engine
XV. Bộ contract chúng ta nên "đóng" thành file

Sau bước này, cấu trúc contract nên là:

data/
├── knowledge/
│   └── knowledge-map-v4.json
│
├── lessons/
│   └── schema.json
│
├── questions/
│   └── schema.json
│
├── mastery/
│   ├── evidence.json
│   └── mastery-update.schema.json
│
├── adaptive/
│   ├── rules.json
│   ├── paths.json
│   └── next-action.schema.json
│
├── remediation/
│   └── remediation.schema.json
│
└── analytics/
    └── event.schema.json

Và ở tầng runtime:

runtime/
├── attempt.schema.json
├── learning-context.schema.json
└── student-state.schema.json

student-state.json hiện tại vẫn chỉ là TEST/PROTOTYPE như chúng ta đã ghim trước đó; chưa lấy nó làm contract production.

Một quyết định kiến trúc mình khuyên chốt ngay

Chúng ta nên coi 4 object sau là "xương sống" của hệ thống:

KnowledgeNode
      ↓
Question
      ↓
Attempt
      ↓
MasteryUpdate
      ↓
NextAction

Trong đó:

Question    = nội dung tĩnh
Attempt     = bằng chứng tương tác
Mastery     = trạng thái hiểu biết
NextAction  = quyết định tiếp theo

Nếu 4 contract này ổn, phần còn lại của Learning System sẽ dễ triển khai hơn rất nhiều.

Bước tiếp theo nên là viết thành file contract JSON thật, theo thứ tự mastery-update.schema.json → next-action.schema.json → remediation.schema.json → event.schema.json → attempt.schema.json, rồi dùng bộ K206 vừa tạo để chạy một closed-loop test xuyên suốt 7 engine.