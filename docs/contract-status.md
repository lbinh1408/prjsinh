# CONTRACT STATUS

> **Project:** Sinh học THPT — Adaptive Learning System
> **Phase:** 0 — Contract Audit
> **Status:** AUDIT COMPLETED — REVISION REQUIRED BEFORE ENGINE IMPLEMENTATION
> **Purpose:** Xác định contract nào đã đủ ổn định, contract nào cần sửa trước khi bắt đầu xây Engine.

---

## 1. Mục tiêu của Contract Audit

Contract Audit nhằm trả lời 5 câu hỏi:

1. Các thành phần của hệ thống có đang nói cùng một ngôn ngữ dữ liệu không?
2. Mỗi object có đúng một trách nhiệm rõ ràng không?
3. Các dependency có tạo thành DAG hợp lệ không?
4. Các schema hiện tại có khớp với dữ liệu thực tế không?
5. Có thể xây Engine mà không phải hỗ trợ đồng thời nhiều contract khác nhau không?

### Nguyên tắc

> **Không xây Engine trên một contract chưa ổn định.**

Nếu contract chưa thống nhất, Engine sẽ phải chứa logic tương thích ngược, dẫn đến:

* code phức tạp;
* khó test;
* khó debug;
* khó mở rộng;
* dễ tạo vòng phụ thuộc;
* khó xác định lỗi nằm ở Data hay Engine.

---

# 2. Trạng thái tổng quan

| Contract / Data       | File                                        | Status         | Mức độ |
| --------------------- | ------------------------------------------- | -------------- | ------ |
| Knowledge Map         | `data/knowledge/knowledge-map-v4.json`      | LOCKED.        | Medium |
| Question Schema       | `data/questions/schema.json`                | LOCKED         | High   |
| Question Data         | `data/questions/knowledge/K206.json`        | LOCKED.        | High   |
| Lesson Schema         | `data/lessons/schema.json`                  | LOCKED*        | Low    |
| Mastery Evidence      | `data/mastery/evidence.json`                | LOCKED.        | High   |
| Mastery Update        | `data/mastery/mastery-update.schema.json`   | LOCKED         | —      |
| Mastery Rules         | `data/mastery/rules.json`                   | LOCKED.        | Low    |
| Remediation           | `data/remediation/remediation.schema.json`  | LOCKED         | —      |
| Adaptive Rules        | `data/adative/rules.json`                   | LOCKED.        | Low    |
| Adaptive Paths        | `data/adative/paths.json`                   | LOCKED.        | Low    |
| Next Action           | `data/adative/next-action.schema.json`      | LOCKED         | —      |
| Attempt               | `data/runtime/attempt.schema.json`          | LOCKED         | —      |
| Learning Context      | `data/runtime/learning-context.schema.json` | LOCKED         | —      |
| Student State Schema  | `data/runtime/student-state.schema.json`    | LOCKED         | —      |
| Student State Fixture | `data/student/student-state.json`           | LOCKED         | Medium |
| Analytics Event       | `data/analytics/event.schema.json`          | LOCKED         | —      |
      
* `lessons/schema.json` chỉ được đánh giá ở mức schema. Chưa có lesson instance thực tế trong dữ liệu audit để xác nhận end-to-end.

---

# 3. Contract Architecture

Hệ thống sử dụng các object chính sau:

```text
KnowledgeNode
     ↓
Question
     ↓
Attempt
     ↓
MasteryUpdate
     ↓
NextAction
```

Khi có lỗi:

```text
Attempt
   ↓
Failure
   ↓
RemediationPlan
   ↓
Mini Practice
   ↓
Mini Probe
   ↓
Return to original node
```

Analytics ghi nhận toàn bộ quá trình:

```text
Student / Session
        ↓
      Event
        ↓
Analytics
```

---

# 4. Responsibility của từng contract

## 4.1 KnowledgeNode

Trả lời:

> Học sinh cần học **cái gì** và kiến thức đó phụ thuộc vào đâu?

Nguồn:

```text
data/knowledge/knowledge-map-v4.json
```

Chứa:

* `id`
* `name`
* `cluster`
* `priority`
* `targetMastery`
* `dependencies`
* `leadsTo`

Không chứa:

* mastery hiện tại;
* câu hỏi;
* điểm;
* adaptive decision;
* remediation;
* student state.

---

# 5. Dependency Graph Audit

## 5.1 Quy tắc

`dependencies` phải tạo thành **DAG — Directed Acyclic Graph**.

Nghĩa là:

```text
A → B → C
```

được phép.

Nhưng:

```text
A → B → C → A
```

không được phép.

Một node không được trở thành prerequisite của chính nó thông qua một chuỗi dependency.

---

## 5.2 Phân biệt `dependencies` và `leadsTo`

Đây là điểm quan trọng.

### `dependencies`

Có ý nghĩa:

> Muốn học node B, cần nền tảng từ node A.

Ví dụ:

```text
K201 → K203
```

nghĩa là:

```text
Gene → Nhân đôi DNA
```

Dependency graph **bắt buộc phải là DAG**.

### `leadsTo`

Có ý nghĩa:

> Kiến thức này liên quan / dẫn đến / được sử dụng trong các node khác.

`leadsTo` là graph quan hệ khái niệm.

Nó **không phải prerequisite graph**.

Do đó:

```text
dependencies = DAG requirement
leadsTo = conceptual relationship
```

Không được dùng `leadsTo` để kiểm tra prerequisite cycle.

---

## 5.3 Kết quả audit hiện tại

Các reference trong Knowledge Map hiện không có dangling reference.

Tất cả node được tham chiếu đều tồn tại.

Tuy nhiên, cần thực hiện kiểm tra riêng:

```text
D1 dependency graph
D2 dependency graph
D3 dependency graph
```

để xác nhận không có cycle trong prerequisite graph.

Các cycle được phát hiện khi phân tích toàn bộ quan hệ bao gồm những dạng như:

```text
K014 → K041 → K014
K014 → K040 → K041 → K014
K034 → K070 → K034
K072 → K074 → K073 → K072
```

Các cycle này có thể xuất hiện do kết hợp `dependencies` với `leadsTo`.

### Decision

Không kết luận Knowledge Map sai chỉ dựa trên các cycle của combined graph.

### Required action

Kiểm tra:

```text
dependencies only
```

theo từng loại:

```text
D1
D2
D3
```

và xác nhận prerequisite graph là DAG.

---

# 6. Knowledge Map — Cluster Contract

Knowledge Map hiện sử dụng cluster ID dạng:

```text
C01
C02
C03
...
C15
```

Trong khi Question data hiện sử dụng dạng:

```text
cluster-03
```

Đây là **cross-contract inconsistency**.

Ví dụ:

```text
Knowledge Map:
K206 → C05
```

nhưng Question data:

```text
K206 → cluster-03
```

Hai hệ thống đang có hai nguồn biểu diễn cluster.

### Decision

**Knowledge Map là source of truth cho cluster.**

Question không cần lưu cluster ID như một nguồn dữ liệu độc lập.

Nếu Question cần cluster:

```text
Question
   ↓
primaryNode / secondaryNodes
   ↓
Knowledge Map
   ↓
cluster
```

### Required action

Migration Question data:

```text
cluster-03
```

không được dùng làm source-of-truth.

---

# 7. Question Contract

## Status

```text
NEEDS_REVISION
```

### Severity

```text
HIGH
```

Đây là contract inconsistency quan trọng nhất hiện tại.

---

# 8. Canonical Question Contract

Question contract chuẩn của hệ thống là:

```json
{
  "id": "Q-A-K283-A-001",
  "version": "1.0.0",

  "nodes": ["K283"],
  "primaryNode": "K283",
  "secondaryNodes": ["K281", "K282"],

  "evidence": "apply",
  "difficulty": "D3",

  "questionType": "mcq",
  "mode": ["practice", "diagnostic"],

  "prerequisites": ["K281", "K282"],
  "skills": ["S008"],

  "content": {
    "stem": "...",
    "context": null,
    "options": [],
    "media": [],
    "data": null
  },

  "answer": {
    "type": "single",
    "value": "B"
  },

  "scoring": {
    "maxScore": 1,
    "partialCredit": false,
    "rubric": null
  },

  "failureSignatures": [
    "recombination-rate-calculation",
    "linked-gamete-confusion"
  ],

  "explanation": {
    "correct": "...",
    "incorrect": {}
  }
}
```

---

# 9. Question Data hiện tại

Question data thực tế trong:

```text
data/questions/knowledge/K206.json
```

vẫn sử dụng contract cũ.

Ví dụ các field cũ:

```text
questionId
type
status
targets
response
correctAnswer
diagnostics
feedback
hints
quality
```

Trong khi canonical contract sử dụng:

```text
id
nodes
primaryNode
secondaryNodes
evidence
questionType
mode
prerequisites
skills
answer.value
failureSignatures
explanation
```

Đây không phải khác biệt nhỏ về tên field.

Đây là **hai contract khác nhau**.

---

# 10. Quyết định về Question Contract

Không xây Question Engine để hỗ trợ cả hai format.

Không làm:

```text
if old format
    ...
else if new format
    ...
```

trong Question Engine.

Thay vào đó:

```text
OLD QUESTION DATA
        ↓
   MIGRATION
        ↓
CANONICAL QUESTION
        ↓
QUESTION ENGINE
```

### Decision

Canonical Question Contract là **source of truth**.

Old Question Contract được xem là:

```text
DEPRECATED
```

sau migration.

---

# 11. Question Contract — các nguyên tắc cần giữ

## `primaryNode`

Node chính được đo bởi câu hỏi.

```text
primaryNode = node whose mastery is primarily measured
```

## `secondaryNodes`

Các node hỗ trợ hoặc được sử dụng trong câu hỏi.

Không tự động đưa toàn bộ prerequisite vào `nodes`.

## `nodes`

Danh sách node liên quan trực tiếp đến câu hỏi.

Không phải danh sách toàn bộ dependency.

## `evidence`

Chỉ một trong:

```text
know
explain
apply
transfer
```

## `questionType`

Loại câu hỏi:

```text
mcq
multipleChoice
trueFalse
shortText
numeric
...
```

Cần thống nhất với `answer.type`.

## `mode`

Là context sử dụng câu hỏi:

```text
practice
diagnostic
challenge
retest
...
```

Không nhầm với:

```text
HOC_NHANH
HOC_SAU
ON_THI
```

Đây là learning mode của student/session.

---

# 12. Diagnostic Question

`Q-D` là câu hỏi chẩn đoán.

Nó trả lời:

> Học sinh có thể đang yếu ở đâu?

Nó không trực tiếp tạo mastery evidence.

Do đó:

```text
Q-D
 ↓
diagnostic evidence
 ↓
failure/source hypothesis
```

không phải:

```text
Q-D
 ↓
increase know
increase explain
increase apply
increase transfer
```

---

# 13. Mastery Evidence Audit

## Status

```text
NEEDS_REVISION
```

## Severity

```text
HIGH
```

Hiện tại `evidence.json` đang cho phép:

```text
Q-D → know
Q-D → explain
Q-D → apply
Q-D → transfer
```

Điều này không phù hợp với nguyên tắc:

> Diagnostic evidence dùng để định tuyến/chẩn đoán, không trực tiếp cập nhật mastery dimensions.

---

# 14. Evidence Mapping chuẩn

| Evidence dimension | Question |
| ------------------ | -------- |
| `know`             | Q-K      |
| `explain`          | Q-E      |
| `apply`            | Q-A      |
| `transfer`         | Q-T      |
| diagnostic         | Q-D      |

Q-D:

```text
updatedDimension = "none"
```

nhưng vẫn có thể tạo:

```text
failure signature
source node hypothesis
meta skill hypothesis
confidence signal
```

---

# 15. Mastery Update Contract

## Status

```text
LOCKED
```

`mastery-update.schema.json` đã tách đúng:

```text
Attempt
   ↓
Mastery Engine
   ↓
MasteryUpdate
```

MasteryUpdate không quyết định:

```text
NextAction
```

Đó là trách nhiệm của Adaptive Engine.

---

# 16. Mastery Rules

## Status

```text
NEAR_LOCKED
```

Các nguyên tắc chính đã thống nhất:

```text
M0 = Chưa biết
M1 = Nhận biết
M2 = Thông hiểu
M3 = Vận dụng
M4 = Chuyển giao
```

Không có:

```text
M5
```

### Mastered

```text
M4
```

### Stable

```text
M4 + successful retest
```

---

# 17. Evidence Dimensions

Canonical dimensions:

```text
know
explain
apply
transfer
```

Trọng số:

```text
know     = 0.15
explain  = 0.25
apply    = 0.30
transfer = 0.30
```

Mastery không chỉ dựa vào weighted average.

Phải đồng thời thỏa:

```text
weighted evidence
+
dimension thresholds
```

Điều này ngăn việc một học sinh đạt điểm cao nhờ chỉ giỏi một loại câu hỏi.

---

# 18. Remediation Contract

## Status

```text
LOCKED
```

Remediation Engine nhận:

```text
failure
```

và tạo:

```text
RemediationPlan
```

Nó không:

* cập nhật mastery;
* chọn next action;
* tự quyết định student state.

Flow:

```text
Attempt
  ↓
Failure
  ↓
Remediation Engine
  ↓
RemediationPlan
```

---

# 19. Adaptive Contract

## Status

```text
NEAR_LOCKED
```

Adaptive Engine quyết định:

```text
LEARN
PRACTICE
CHALLENGE
REMEDIATE
RETEST
REVIEW
SKIP
```

Adaptive Engine không:

* chấm câu trả lời;
* cập nhật mastery;
* tạo remediation diagnosis;
* chọn nội dung câu hỏi cụ thể.

Nó tạo:

```text
NextAction
```

với selection criteria.

---

# 20. Adaptive Paths

## Status

```text
NEAR_LOCKED
```

Paths mô tả:

> Hệ thống đi từ trạng thái/path stage này sang trạng thái/path stage khác như thế nào?

Paths không phải nơi chứa:

* mastery calculation;
* question content;
* student state;
* failure diagnosis.

---

# 21. Adaptive Directory Naming

Hiện tại:

```text
data/adative/
```

Đây là typo.

Tên canonical nên là:

```text
data/adaptive/
```

### Required action

Đổi:

```text
data/adative/
```

thành:

```text
data/adaptive/
```

trước khi bắt đầu import rộng rãi trong code.

Không giữ typo để tránh:

```text
adative
adaptive
```

cùng tồn tại.

---

# 22. Attempt Contract

## Status

```text
LOCKED
```

Attempt đại diện cho:

> Một lần học sinh thực sự tương tác với một câu hỏi.

Flow:

```text
Question
   ↓
Student response
   ↓
Attempt
```

Attempt không phải Question.

Question là static content.

Attempt là runtime interaction.

---

# 23. Learning Context

## Status

```text
LOCKED
```

LearningContext đại diện cho:

> Học sinh hiện đang ở đâu trong phiên học hiện tại?

Ví dụ:

```text
mode = HOC_NHANH
cluster = C05
node = K206
action = PRACTICE
pathStage = PRACTICE
```

LearningContext không thay thế Student State.

---

# 24. Student State

## Production Schema

```text
data/runtime/student-state.schema.json
```

Status:

```text
LOCKED
```

## Prototype Fixture

```text
data/student/student-state.json
```

Status:

```text
NEEDS_REVISION
```

### Lý do

Production schema hiện yêu cầu:

```text
schemaVersion
studentId
profile
target
learning
knowledge
metaSkills
failurePatterns
progress
preferences
timestamps
```

Prototype fixture hiện có cấu trúc khác:

```text
student
learning
knowledge
metaSkills
failurePatterns
history
adaptive
progress
preferences
```

### Decision

Không sửa production schema chỉ để phù hợp fixture.

Prototype fixture sẽ được migrate sau.

---

# 25. Analytics Event

## Status

```text
LOCKED
```

Analytics Event là immutable event log.

Analytics Engine:

```text
observe
record
aggregate
report
```

Analytics Engine không được trở thành một Adaptive Engine thứ hai.

Không để Analytics tự quyết định:

```text
next action
mastery
remediation
```

---

# 26. Lesson Contract

## Status

```text
LOCKED*
```

Schema đã có cấu trúc đủ để Lesson Engine sử dụng.

Tuy nhiên:

> Chưa có lesson instance thực tế trong dataset được audit.

Do đó status này có nghĩa:

```text
schema-level locked
```

chứ chưa phải:

```text
end-to-end validated
```

### Required action

Khi bắt đầu Phase 9:

```text
Lesson Engine
```

phải tạo ít nhất một lesson instance thật và chạy validation.

---

# 27. Contract Dependency Graph

Contract-level dependency phải giữ chiều:

```text
Knowledge
    ↓
Question
    ↓
Attempt
    ↓
MasteryUpdate
    ↓
Adaptive Decision
```

Remediation có thể xuất hiện sau failure:

```text
Attempt
   ↓
Failure
   ↓
RemediationPlan
   ↓
Mini Probe
   ↓
Adaptive
```

Analytics quan sát toàn bộ:

```text
          ┌──────────────┐
          │   Analytics  │
          └──────┬───────┘
                 ↑
                 │ events
                 │
Knowledge → Question → Attempt → Mastery
                              ↓
                         Remediation
                              ↓
                           Adaptive
```

---

# 28. Không được tạo dependency ngược

Ví dụ không được:

```text
Knowledge Engine
      ↓
Adaptive Engine
      ↓
Knowledge Engine
```

hoặc:

```text
Mastery Engine
      ↓
Adaptive Engine
      ↓
Mastery Engine
```

Adaptive có thể **đọc** mastery.

Nhưng Adaptive không được gọi Mastery để tự cập nhật mastery.

Correct:

```text
Attempt
  ↓
Mastery Engine
  ↓
MasteryUpdate
  ↓
Adaptive Engine
  ↓
NextAction
```

---

# 29. Engine Boundary

## Knowledge Engine

### Owns

```text
knowledge graph
dependencies
node metadata
cluster relationships
```

### Does NOT own

```text
mastery
questions
adaptive decisions
remediation
```

---

## Question Engine

### Owns

```text
question retrieval
question validation
question selection based on criteria
```

### Does NOT own

```text
mastery
failure diagnosis
next action
```

---

## Mastery Engine

### Owns

```text
evidence update
mastery calculation
confidence
status
retest result
```

### Does NOT own

```text
next action
question selection
remediation plan
```

---

## Remediation Engine

### Owns

```text
failure diagnosis
source-node identification
repair strategy
probe design
return target
```

### Does NOT own

```text
mastery update
adaptive decision
```

---

## Adaptive Engine

### Owns

```text
next action
priority
path
constraints
selection criteria
```

### Does NOT own

```text
answer evaluation
mastery calculation
remediation diagnosis
```

---

## Lesson Engine

### Owns

```text
learning experience
lesson flow
activity orchestration
```

### Does NOT own

```text
mastery calculation
adaptive policy
question correctness logic
```

---

## Analytics Engine

### Owns

```text
event recording
metrics
observability
analysis
```

### Does NOT own

```text
learning decision
mastery
remediation
```

---

# 30. Phase 0 Required Changes

Trước khi xây Engine, phải hoàn thành các thay đổi sau:

### P0-01 — Validate dependency DAG

Kiểm tra riêng:

```text
dependencies.D1
dependencies.D2
dependencies.D3
```

Không gộp `leadsTo` vào prerequisite graph.

---

### P0-02 — Finalize Question Contract

Chọn canonical contract:

```text
id
nodes
primaryNode
secondaryNodes
evidence
difficulty
questionType
mode
prerequisites
skills
content
answer
scoring
failureSignatures
explanation
```

---

### P0-03 — Migrate K206 Question Data

Chuyển:

```text
questionId
type
targets
response
diagnostics
feedback
...
```

sang canonical Question contract.

Không sửa Question Engine để hỗ trợ format cũ.

---

### P0-04 — Remove cluster duplication

Không dùng:

```text
cluster-03
```

làm source-of-truth trong Question.

Cluster phải được xác định từ:

```text
primaryNode
↓
Knowledge Map
↓
cluster
```

---

### P0-05 — Fix Diagnostic Evidence

Sửa:

```text
Q-D
```

thành diagnostic-only.

Không cho Q-D trực tiếp tăng:

```text
know
explain
apply
transfer
```

---

### P0-06 — Rename Adaptive Directory

Đổi:

```text
data/adative/
```

thành:

```text
data/adaptive/
```

---

### P0-07 — Migrate Student State Fixture

Không thay đổi production schema.

Thay đổi:

```text
data/student/student-state.json
```

để conform:

```text
data/runtime/student-state.schema.json
```

---

# 31. Migration Order

Không sửa tất cả cùng lúc.

Thứ tự:

```text
1. Dependency DAG validation
          ↓
2. Question contract
          ↓
3. K206 question migration
          ↓
4. Evidence contract
          ↓
5. Adaptive directory rename
          ↓
6. Student-state fixture migration
          ↓
7. Full schema validation
          ↓
8. Vertical slice test
```

---

# 32. Vertical Slice bắt buộc

Không bắt đầu bằng toàn bộ 184 nodes.

Slice đầu tiên:

```text
K281
 ↓
K282
 ↓
K283
```

Mục tiêu:

```text
LEARN
  ↓
PRACTICE
  ↓
ANSWER
  ↓
ATTEMPT
  ↓
MASTERY UPDATE
  ↓
FAILURE DETECTION
  ↓
REMEDIATION
  ↓
MINI PROBE
  ↓
RETEST
  ↓
NEXT ACTION
```

---

# 33. Definition of Done — Contract Phase

Phase 0 chỉ được xem là hoàn thành khi:

### Contract

* [ ] Knowledge Node contract ổn định
* [ ] Question contract canonical
* [ ] Attempt contract canonical
* [ ] MasteryUpdate contract canonical
* [ ] RemediationPlan contract canonical
* [ ] NextAction contract canonical
* [ ] LearningContext contract canonical
* [ ] StudentState schema canonical
* [ ] Analytics Event canonical

### Graph

* [ ] Dependency graph là DAG
* [ ] Không có dangling dependency
* [ ] Không có self-dependency
* [ ] D1/D2/D3 được phân biệt rõ
* [ ] `leadsTo` không bị dùng như prerequisite

### Question

* [ ] Không còn old question contract trong production data
* [ ] `primaryNode` xác định rõ
* [ ] `secondaryNodes` xác định rõ
* [ ] `evidence` canonical
* [ ] `Q-D` diagnostic-only
* [ ] Cluster không bị duplicate source-of-truth

### Runtime

* [ ] Attempt validation chạy được
* [ ] MasteryUpdate validation chạy được
* [ ] NextAction validation chạy được
* [ ] RemediationPlan validation chạy được
* [ ] LearningContext validation chạy được
* [ ] StudentState validation chạy được

### Integration

* [ ] K281 → K282 → K283 load được
* [ ] Question load được
* [ ] Attempt tạo được
* [ ] MasteryUpdate tạo được
* [ ] Failure tạo được
* [ ] RemediationPlan tạo được
* [ ] Mini Probe chạy được
* [ ] NextAction tạo được

---

# 34. Final Phase 0 Decision

## Current decision

```text
DO NOT START ENGINE IMPLEMENTATION YET
```

Lý do chính không phải vì hệ thống thiếu Engine.

Lý do là một số **contract quan trọng vẫn chưa thống nhất**, đặc biệt:

```text
Question
Mastery Evidence
Knowledge dependency graph
Student State fixture
```

Nếu xây Engine ngay lúc này, Engine sẽ phải hấp thụ những bất nhất này.

Điều đó làm tăng coupling và khiến việc sửa contract sau này trở nên đắt đỏ.

---

# 35. Target State

Sau khi Phase 0 hoàn tất, hệ thống phải đạt:

```text
                    ┌─────────────────┐
                    │ Knowledge Map   │
                    │     DAG         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Question     │
                    │  Canonical      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Attempt     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Mastery Update  │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
       ┌────────────────┐       ┌────────────────┐
       │  Remediation   │       │    Adaptive    │
       │     Plan       │       │   NextAction   │
       └───────┬────────┘       └───────┬────────┘
               │                        │
               └────────────┬───────────┘
                            ▼
                     Next Learning Step
```

---

# 36. Principle to Carry Forward

> **Contract trước — Engine sau.**

> **Data model là source of truth; Engine không được sửa sai cho data.**

> **Mỗi object có một trách nhiệm chính.**

> **Mastery quyết định học sinh đã biết đến đâu; Adaptive quyết định học tiếp gì; Remediation quyết định sửa nguyên nhân nào và bằng cách nào.**

> **Không dùng một Engine để giải quyết vấn đề thuộc về Engine khác.**

> **Không mở rộng toàn hệ thống trước khi vertical slice K281 → K282 → K283 chạy end-to-end.**

---

## Phase 0 Exit Condition

```text
CONTRACT_STATUS = READY
```

chỉ được set khi toàn bộ mục bắt buộc trong Section 33 đã được kiểm tra và pass.

Cho đến lúc đó:

```text
CONTRACT_STATUS = AUDIT_COMPLETED
IMPLEMENTATION_STATUS = BLOCKED_BY_CONTRACT_REVISION
```
