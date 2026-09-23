# SYSTEM IMPLEMENTATION PLAN

# Hệ thống học Sinh học thích ứng — Mastery-Based Learning System

**Version:** 1.0
**Status:** Implementation Plan
**Purpose:** Định hướng toàn bộ quá trình xây dựng hệ thống
**Principle:** Contract trước → Engine sau → Runtime sau → UI sau

---

# 1. MỤC TIÊU CỐT LÕI CỦA HỆ THỐNG

## 1.1. Mục tiêu học tập

Hệ thống được xây dựng với mục tiêu chính:

> **Giúp học sinh ôn thi THPT môn Sinh học với mục tiêu đạt 10 điểm, đồng thời xây dựng nền tảng kiến thức Sinh học đủ sâu để hướng tới mục tiêu Đại học Y Dược TP.HCM.**

Lộ trình mục tiêu:

> **Cấp tốc khoảng 5 tháng — nhưng học chuyên sâu, không học tắt.**

"Cấp tốc" ở đây có nghĩa là tối ưu hóa **thời gian học**, không cắt giảm **độ sâu kiến thức**.

Hệ thống phải giúp học sinh:

* nắm chắc kiến thức nền tảng;
* hiểu bản chất và cơ chế sinh học;
* vận dụng kiến thức vào bài tập;
* xử lý dữ liệu, bảng, đồ thị và thí nghiệm;
* giải quyết câu hỏi phân hóa;
* liên kết nhiều kiến thức/cụm kiến thức;
* thực hiện suy luận ngược;
* xử lý các tình huống mới;
* phát hiện và sửa đúng lỗ hổng kiến thức;
* duy trì kiến thức qua retest và review.

---

# 1.2. BA MỤC TIÊU ĐỒNG THỜI

Hệ thống phải phục vụ đồng thời ba mục tiêu.

## Mục tiêu A — Ôn thi THPT

Mục tiêu:

> **10 điểm môn Sinh học.**

Hệ thống phải bao phủ:


Kiến thức nền
      ↓
Nhận biết
      ↓
Thông hiểu
      ↓
Vận dụng
      ↓
Vận dụng cao / phân hóa
      ↓
Dữ liệu / đồ thị / thí nghiệm
      ↓
Câu hỏi tổng hợp
      ↓
Chuyển giao


Không thiết kế hệ thống chỉ để học thuộc lý thuyết hoặc luyện số lượng câu hỏi lớn.

---

## Mục tiêu B — Chuẩn bị nền tảng cho Đại học Y Dược TP.HCM

Hệ thống phải hướng tới năng lực Sinh học sâu hơn mức:

> "biết đáp án của câu thi".

Học sinh cần có khả năng:

* giải thích cơ chế;
* liên kết cấu trúc và chức năng;
* hiểu quan hệ nguyên nhân → cơ chế → kết quả;
* suy luận từ dữ liệu;
* phân tích thí nghiệm;
* hiểu các quá trình sinh học theo chuỗi;
* liên kết kiến thức giữa các chương;
* chuyển kiến thức sang tình huống mới.

Đặc biệt, các chủ đề có tính nền tảng cao phải được xây dựng với mastery sâu, không chỉ đạt mức làm được câu hỏi cơ bản.

Ví dụ:


DNA
 ↓
Gene
 ↓
Phiên mã
 ↓
RNA
 ↓
Dịch mã
 ↓
Protein
 ↓
Tính trạng


hoặc:

Màng tế bào
 ↓
Gradient
 ↓
Vận chuyển
 ↓
Trao đổi chất
 ↓
Chuyển hóa
 ↓
Năng lượng


Hệ thống phải giúp học sinh hiểu được **chuỗi cơ chế**, không chỉ từng mảnh kiến thức riêng lẻ.

---

## Mục tiêu C — Hoàn thành nhanh trong khoảng 5 tháng

Thời gian mục tiêu:

> **Khoảng 5 tháng.**

Do đó hệ thống không được sử dụng mô hình:

Bài 1
→ Bài 2
→ Bài 3
→ ...
→ hết sách


một cách máy móc.

Thay vào đó:


Knowledge Map
      ↓
Prerequisite
      ↓
Knowledge Cluster
      ↓
Diagnostic
      ↓
Học phần chưa biết
      ↓
Practice
      ↓
Mastery
      ↓
Challenge
      ↓
Transfer
      ↓
Retest


---

# 1.3. TRIẾT LÝ "CẤP TỐC NHƯNG CHUYÊN SÂU"

Đây là nguyên tắc quan trọng nhất của hệ thống.

## Không phải:

> Học nhanh = học ít.

## Mà là:

> Học nhanh = loại bỏ thời gian học những thứ đã biết và tập trung thời gian vào những thứ chưa thành thạo.

Ví dụ:

Nếu học sinh đã đạt:


K200 DNA = M4
K201 Gene = M4


thì không bắt học lại toàn bộ hai node.

Hệ thống có thể:

SKIP
hoặc
SHORT REVIEW


và chuyển thời gian sang:


K204 Phiên mã = M2
K206 Dịch mã = M2


Ngược lại, nếu:


K206 = M2
source gap = K202


hệ thống phải quay về K202 thay vì bắt học sinh làm thêm hàng chục câu K206.

---

# 1.4. HỌC THEO CỤM KIẾN THỨC

Đơn vị tổ chức chính không phải chỉ là:

> "bài học trong SGK".

Mà là:

> **Knowledge Cluster + Knowledge Node + Dependency.**

Ví dụ:


Cụm DNA → Protein

K200 DNA
   ↓
K201 Gene
   ↓
K203 Nhân đôi

K204 Phiên mã
   ↓
K205 RNA
   ↓
K202 Mã di truyền
   ↓
K206 Dịch mã
   ↓
K208 DNA → RNA → Protein → tính trạng


Học sinh có thể học theo dependency thay vì thứ tự bài học trong sách.

---

# 1.5. MASTERY MỚI LÀ ĐƠN VỊ TIẾN BỘ

Không dùng:

```text
Đã học bài
```

làm tiêu chí hoàn thành.

Mà dùng:

```text
Đã đạt mastery
```

Hệ thống phải biết:

```text
M0 — chưa biết
M1 — nhận biết
M2 — thông hiểu
M3 — vận dụng
M4 — chuyển giao
```

M4 là mastery mục tiêu.

Sau đó:

```text
M4 + retest đạt
→ Stable
```

---

# 1.6. MỤC TIÊU CUỐI CỦA 5 THÁNG

Cuối lộ trình, hệ thống hướng tới trạng thái:

```text
Kiến thức trọng tâm
        ↓
Mastery cao
        ↓
Không còn prerequisite gap lớn
        ↓
Vận dụng ổn định
        ↓
Phân tích dữ liệu tốt
        ↓
Xử lý câu hỏi phân hóa
        ↓
Transfer tốt
        ↓
Retest ổn định
        ↓
Ôn thi tổng hợp
```

Đồng thời học sinh phải có khả năng:

```text
Gặp câu quen
→ giải được

Gặp câu biến đổi
→ suy luận được

Gặp dữ liệu mới
→ phân tích được

Gặp thí nghiệm mới
→ xác định được cơ chế

Gặp câu liên kết nhiều chương
→ truy ngược dependency

Gặp câu chưa từng gặp
→ dùng kiến thức để giải quyết
```

Đây mới là ý nghĩa của mục tiêu:

> **10 điểm + nền tảng Sinh học chuyên sâu hướng tới Đại học Y Dược TP.HCM.**

---

# 1.7. NGUYÊN TẮC THIẾT KẾ HỆ THỐNG

Mọi quyết định về Knowledge Engine, Lesson Engine, Question Engine, Mastery Engine, Adaptive Engine và Remediation Engine đều phải phục vụ đồng thời:


             10 ĐIỂM THI THPT
                    │
                    │
          ┌─────────┴─────────┐
          │                   │
     Tốc độ học          Độ sâu kiến thức
          │                   │
          └─────────┬─────────┘
                    │
             MASTERY SYSTEM
                    │
          ┌─────────┴─────────┐
          │                   │
     Ôn thi hiệu quả     Nền tảng chuyên sâu
          │                   │
          └─────────┬─────────┘
                    │
        HƯỚNG ĐẾN ĐH Y DƯỢC TP.HCM


**Không được hy sinh độ sâu để đạt tốc độ.**

**Không được hy sinh tốc độ bằng cách bắt học sinh học lại những thứ đã thành thạo.**

Hệ thống phải tối ưu cả hai.

Hệ thống không chỉ là:

> Question Bank + chấm điểm.

Mà là:

> Knowledge Map + Learning Content + Questions + Evidence + Mastery + Adaptation + Remediation.

---

# 2. NGUYÊN TẮC KIẾN TRÚC LỚN

## 2.1. Không code engine trước khi contract được khóa

Mọi engine phải được xây dựng dựa trên contract đã được xác định.

Thứ tự:

```text
Data Contract
      ↓
Schema
      ↓
Validation
      ↓
Engine
      ↓
Runtime
      ↓
UI
```

Không được làm ngược:

```text
UI
 ↓
Engine
 ↓
Tự đoán data
```

---

# 3. KIẾN TRÚC TỔNG THỂ

Hệ thống gồm 7 engine logic:

```text
1. Knowledge Engine
2. Lesson Engine
3. Question Engine
4. Mastery Engine
5. Adaptive Engine
6. Remediation Engine
7. Analytics Engine
```

Ngoài ra có các runtime/state contract:

```text
Student State
Learning Context
Attempt
Mastery Update
Next Action
Remediation Plan
Event
```

## 3.1. Student State không phải Engine

Student State là trạng thái dài hạn của học sinh.

Nó trả lời:

> "Học sinh hiện biết gì?"

Không chịu trách nhiệm quyết định bước tiếp theo.

---

## 3.2. Learning Context không phải Student State

Learning Context là trạng thái phiên học hiện tại.

Nó trả lời:

> "Học sinh hiện đang học gì, ở đâu, trong phiên nào?"

---

# 4. RANH GIỚI TRÁCH NHIỆM CỦA 7 ENGINE

## 4.1. Knowledge Engine

Trả lời:

> Học cái gì?

Chịu trách nhiệm:

* đọc Knowledge Map;
* truy xuất node;
* dependency;
* prerequisite;
* cluster;
* downstream nodes;
* kiểm tra tính hợp lệ của Knowledge Map.

Không chịu trách nhiệm:

* mastery;
* question selection;
* adaptive decision;
* remediation.

---

## 4.2. Lesson Engine

Trả lời:

> Dạy kiến thức đó như thế nào?

Chịu trách nhiệm:

* lesson;
* learning flow;
* explanation;
* examples;
* guided practice;
* mini challenge;
* reflection.

Không chịu trách nhiệm:

* tính mastery;
* quyết định node tiếp theo;
* chẩn đoán failure source.

---

## 4.3. Question Engine

Trả lời:

> Câu hỏi nào phù hợp với criteria đã được yêu cầu?

Chịu trách nhiệm:

* load question;
* validate question;
* index;
* tìm question;
* filter;
* candidate selection.

Không chịu trách nhiệm:

* chấm mastery;
* quyết định adaptive action;
* remediation.

---

## 4.4. Mastery Engine

Trả lời:

> Sau attempt này, bằng chứng về năng lực của học sinh thay đổi thế nào?

Chịu trách nhiệm:

* đọc Attempt;
* đọc question evidence;
* cập nhật evidence;
* cập nhật mastery;
* cập nhật confidence;
* xác định status;
* ghi nhận failure evidence;
* tạo MasteryUpdate.

Không chịu trách nhiệm:

* chọn question tiếp theo;
* quyết định REMEDIATE/CHALLENGE;
* xây dựng remediation plan.

---

## 4.5. Adaptive Engine

Trả lời:

> Tiếp theo học sinh nên làm gì?

Chịu trách nhiệm:

* đọc Student State;
* đọc Learning Context;
* đọc MasteryUpdate;
* đọc Knowledge Map;
* đọc Adaptive Rules;
* tạo NextAction.

Các action:

```text
LEARN
PRACTICE
CHALLENGE
REMEDIATE
RETEST
REVIEW
SKIP
```

Không chịu trách nhiệm:

* chấm answer;
* tính mastery;
* viết remediation plan;
* chọn một question cụ thể.

---

## 4.6. Remediation Engine

Trả lời:

> Học sinh sai ở đâu và cần sửa từ đâu?

Chịu trách nhiệm:

* phân tích failure evidence;
* xác định source node;
* xác định prerequisite gap;
* xác định remediation strategy;
* tạo RemediationPlan;
* tạo mini probe;
* xác định return target.

Không cập nhật mastery trực tiếp.

---

## 4.7. Analytics Engine

Trả lời:

> Hệ thống đã xảy ra chuyện gì?

Chịu trách nhiệm:

* ghi event;
* thống kê;
* quan sát learning behavior;
* đo hiệu quả;
* phát hiện system-level problems.

Không được tự quyết định learning path.

---

# 5. CÁC CONTRACT CỐT LÕI

Đây là phần quan trọng nhất của hệ thống.

Các contract phải ổn định trước khi triển khai engine hoàn chỉnh.

```text
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

runtime/
├── attempt.schema.json
├── learning-context.schema.json
└── student-state.schema.json
```

---

# 6. DATA CONTRACT PHẢI ĐƯỢC CHỐT THEO DATA THỰC TẾ

Không được lấy schema cũ rồi ép dữ liệu thực tế vào schema.

Ví dụ Question hiện tại của hệ thống là:

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

  "content": {},
  "answer": {},
  "scoring": {},
  "failureSignatures": [],
  "explanation": {}
}
```

Đây là contract thực tế.

Engine phải thích nghi với contract này.

Không tự thêm:

```text
targets
diagnostics
feedback
primaryDimension
secondaryDimensions
```

nếu các field đó không thuộc contract chính thức.

---

# 7. PHÂN BIỆT DATA TĨNH VÀ RUNTIME DATA

## 7.1. Static Data

```text
KnowledgeNode
Lesson
Question
AdaptiveRules
AdaptivePaths
EvidenceRules
```

Đây là dữ liệu được định nghĩa trước.

---

## 7.2. Runtime Data

```text
StudentState
LearningContext
Attempt
MasteryUpdate
NextAction
RemediationPlan
Event
```

Đây là dữ liệu phát sinh trong quá trình học.

---

# 8. FLOW CHÍNH CỦA HỆ THỐNG

Luồng học cốt lõi:

```text
Student State
      ↓
Adaptive Engine
      ↓
NextAction
      ↓
Question Engine / Lesson Engine
      ↓
Learning Activity
      ↓
Attempt
      ↓
Mastery Engine
      ↓
MasteryUpdate
      ↓
Remediation Engine
      ↓
RemediationPlan
      ↓
Adaptive Engine
      ↓
NextAction
```

Không phải mọi attempt đều cần Remediation Engine.

Ví dụ:

```text
correct
  ↓
MasteryUpdate
  ↓
Adaptive Engine
```

Trong khi:

```text
wrong
  ↓
MasteryUpdate
  ↓
failure evidence
  ↓
Remediation Engine
  ↓
RemediationPlan
  ↓
Adaptive Engine
```

---

# 9. THỨ TỰ TRIỂN KHAI CHÍNH THỨC

Không viết tất cả engine cùng lúc.

Thứ tự:

```text
PHASE 0
Contract Audit
      ↓
PHASE 1
Data Validation Layer
      ↓
PHASE 2
Knowledge Engine
      ↓
PHASE 3
Question Engine
      ↓
PHASE 4
Attempt / Evaluation Layer
      ↓
PHASE 5
Mastery Engine
      ↓
PHASE 6
Remediation Engine
      ↓
PHASE 7
Adaptive Engine
      ↓
PHASE 8
Learning Loop
      ↓
PHASE 9
Lesson Engine
      ↓
PHASE 10
Analytics Engine
      ↓
PHASE 11
UI Integration
      ↓
PHASE 12
Testing + Stabilization
```

---

# 10. PHASE 0 — CONTRACT AUDIT

Đây là bước phải làm lại trước tiên.

Mục tiêu:

> Xác định chính xác hệ thống hiện có, không đoán.

Kiểm tra:

### Knowledge

```text
knowledge-map-v4.json
```

Xác nhận:

* node structure;
* dependencies;
* leadsTo;
* cluster;
* priority;
* targetMastery.

### Questions

Lấy nhiều question thực tế, không chỉ một item.

Kiểm tra:

* MCQ;
* true/false;
* numeric;
* short text;
* partial credit;
* diagnostic;
* transfer;
* các dạng đặc biệt.

### Lessons

Kiểm tra lesson JSON thực tế.

### Student State

Kiểm tra state prototype hiện tại.

### Runtime

Kiểm tra:

* Attempt;
* LearningContext;
* các object runtime hiện có.

Kết quả của Phase 0:

```text
CONTRACT_STATUS.md
```

Trong đó phân loại:

```text
LOCKED
NEEDS_REVISION
UNUSED
DEPRECATED
UNKNOWN
```

---

# 11. PHASE 1 — DATA VALIDATION LAYER

Trước engine phải có validation.

Mục tiêu:

> Phát hiện data sai trước khi engine sử dụng.

Ví dụ:

```text
Question:
primaryNode không tồn tại
→ INVALID

answer.value không khớp option
→ INVALID

primaryNode không nằm trong nodes
→ INVALID

prerequisite không tồn tại
→ INVALID
```

Validation không sửa data.

Nó chỉ:

```text
READ
→ CHECK
→ REPORT
```

---

# 12. PHASE 2 — KNOWLEDGE ENGINE

Knowledge Engine là engine đầu tiên.

API tối thiểu:

```text
getNode()
hasNode()
getAllNodes()

getNodesByCluster()
getNodesByPriority()

getDependencies()
getHardPrerequisites()
getSupportingDependencies()
getTransferDependencies()

getLeadsTo()
getDependents()

checkPrerequisites()

getPrerequisiteChain()

validate()
```

Knowledge Engine không được đọc Student State để quyết định mastery.

---

# 13. PHASE 3 — QUESTION ENGINE

Sau khi Knowledge Engine ổn định mới xây Question Engine.

Mục tiêu:

```text
Question Data
      ↓
Question Engine
      ↓
Candidate Questions
```

API:

```text
getQuestion()
hasQuestion()
getAllQuestions()

getQuestionsByNode()
getQuestionsByPrimaryNode()
getQuestionsBySecondaryNode()

getQuestionsByEvidence()
getQuestionsByDifficulty()
getQuestionsByType()
getQuestionsByMode()
getQuestionsBySkill()
getQuestionsByPrerequisite()

filterQuestions()
selectCandidates()
selectQuestion()

validateQuestion()
validateAll()
```

V1 chưa làm adaptive ranking phức tạp.

---

# 14. PHASE 4 — ATTEMPT / EVALUATION

Đây là bước trước Mastery Engine.

Cần tách rõ:

```text
Question
```

với:

```text
Attempt
```

Question là static.

Attempt là một lần học sinh thực sự trả lời.

Ví dụ:

```text
Question:
Q-A-K283-A-001

Attempt:
student A
chọn C
incorrect
32 seconds
retry = false
```

Evaluation Layer xác định:

```text
correct
incorrect
partial
skipped
```

và tạo evidence/failure information cần thiết cho Mastery Engine.

---

# 15. PHASE 5 — MASTERY ENGINE

Mastery Engine nhận:

```text
Question
+
Attempt
+
Previous Student State
```

và tạo:

```text
MasteryUpdate
```

Ví dụ:

```text
M2
  ↓
attempt
  ↓
apply evidence tăng
  ↓
M2 vẫn giữ nguyên
```

Một câu sai không đồng nghĩa:

```text
M2 → M1
```

Mastery và failure là hai khái niệm khác nhau.

---

# 16. PHASE 6 — REMEDIATION ENGINE

Chỉ chạy khi có lý do cần sửa.

Ví dụ:

```text
K206
  ↓
wrong
  ↓
source_knowledge_gap
  ↓
source = K202
```

Remediation Engine tạo:

```text
RemediationPlan

K202
 ↓
MICRO_LEARN
 ↓
GUIDED_PRACTICE
 ↓
MINI_PROBE
 ↓
RETURN K206
```

Remediation không đánh dấu K206 mastered.

---

# 17. PHASE 7 — ADAPTIVE ENGINE

Adaptive Engine chỉ hoạt động sau khi:

```text
Knowledge
Question
Attempt
Mastery
Remediation
```

đã có contract ổn định.

Input:

```text
StudentState
KnowledgeMap
MasteryUpdate
LearningContext
AdaptiveRules
AdaptivePaths
```

Output:

```text
NextAction
```

Ví dụ:

```text
K206 = M2
apply weak
source gap = K202

→ REMEDIATE K202
```

hoặc:

```text
K206 = M3
apply >= threshold

→ CHALLENGE K206
```

---

# 18. PHASE 8 — HOÀN THIỆN LEARNING LOOP

Khi các engine đã hoạt động độc lập, ghép thành vòng lặp:

```text
START
 ↓
Adaptive
 ↓
NextAction
 ↓
Learn / Practice / Challenge
 ↓
Question
 ↓
Attempt
 ↓
Mastery
 ↓
Remediation nếu cần
 ↓
Adaptive
 ↓
NextAction
 ↓
...
```

Đây là **vertical slice đầu tiên** của hệ thống.

Không cần toàn bộ chương trình.

Chỉ cần một node chạy trọn vòng.

---

# 19. VERTICAL SLICE ĐẦU TIÊN

Không test toàn bộ Knowledge Map ngay.

Chọn một chuỗi nhỏ:

```text
K281
  ↓
K282
  ↓
K283
```

Ví dụ:

```text
K281 Liên kết gene
K282 Giao tử liên kết/tái tổ hợp
K283 Tần số hoán vị gene
```

Dùng một số question thật.

Test:

```text
Learn
 ↓
Practice
 ↓
Answer
 ↓
Attempt
 ↓
MasteryUpdate
 ↓
Adaptive
 ↓
NextAction
```

Sau đó test failure:

```text
K283
 ↓
wrong
 ↓
linked-gamete-confusion
 ↓
Remediation
 ↓
K282
 ↓
Mini Probe
 ↓
Return K283
```

Nếu vertical slice này chạy đúng, mới mở rộng.

---

# 20. PHASE 9 — LESSON ENGINE

Lesson Engine được tích hợp sau khi learning loop cơ bản ổn định.

Lesson Engine phục vụ:

```text
LEARN
```

và một phần:

```text
REMEDIATE
```

Lesson không tự quyết định:

```text
student đã mastered chưa
```

---

# 21. PHASE 10 — ANALYTICS ENGINE

Analytics phải quan sát toàn hệ thống.

Ví dụ event:

```text
session_started
question_started
answer_submitted
mastery_updated
failure_detected
remediation_started
remediation_completed
next_action_generated
retest_completed
review_completed
```

Analytics không được biến thành Adaptive Engine thứ hai.

---

# 22. PHASE 11 — UI INTEGRATION

Chỉ khi backend logic đã chạy được bằng test/script mới nối UI.

UI chỉ nên làm:

```text
Render
Input
Feedback
Navigation
Progress Display
```

UI không được tự tính:

```text
mastery
nextAction
remediation
```

---

# 23. PHASE 12 — TESTING

Mỗi engine phải có test độc lập.

## Knowledge Engine

```text
valid node
invalid node
dependency
D1
D2
D3
leadsTo
```

## Question Engine

```text
find
filter
mode
difficulty
evidence
node
exclude
validation
```

## Mastery Engine

```text
M0 → M1
M1 → M2
M2 → M3
M3 → M4
M4 → stable
failure without downgrade
```

## Remediation Engine

```text
source gap
concept confusion
mechanism confusion
calculation error
meta skill
deep remediation
```

## Adaptive Engine

```text
M0 → LEARN
M2 → PRACTICE
M3 → CHALLENGE
M4 → RETEST
weak → REMEDIATE
stable → REVIEW
D1 blocked
fatigue
anti-loop
```

---

# 24. QUY TẮC KHÔNG ĐƯỢC PHÁ VỠ

## Rule 1

Không sửa Knowledge Map chỉ để làm Engine dễ code hơn.

Nếu Engine không đọc được data:

> sửa Engine.

---

## Rule 2

Không thêm field vào contract chỉ vì Engine cần.

Trước tiên hỏi:

> Field này có thực sự thuộc domain object không?

Nếu không:

> đưa vào runtime/config/engine logic.

---

## Rule 3

Không để Engine làm việc của Engine khác.

Ví dụ:

```text
Question Engine
≠ Mastery Engine
```

```text
Mastery Engine
≠ Adaptive Engine
```

```text
Adaptive Engine
≠ Remediation Engine
```

---

## Rule 4

Không viết logic adaptive vào Question Engine.

Question Engine chỉ tìm câu phù hợp với criteria.

---

## Rule 5

Không viết mastery logic vào Attempt.

Attempt chỉ ghi:

> chuyện gì vừa xảy ra.

---

## Rule 6

Không để Student State chứa quyết định tạm thời.

Student State:

> học sinh hiện biết gì.

LearningContext:

> hiện đang làm gì.

NextAction:

> bước tiếp theo.

---

## Rule 7

Không mở rộng hệ thống khi vertical slice chưa chạy ổn.

---

# 25. NGUYÊN TẮC PHÁT TRIỂN CODE

Mỗi bước code phải nhỏ và rollback được.

Một commit nên tập trung vào một trách nhiệm:

```text
feat: add knowledge engine
feat: add question indexing
feat: add question validation
feat: add attempt evaluation
feat: add mastery update
feat: add remediation planning
feat: add adaptive decision
```

Không nên có:

```text
feat: build entire learning system
```

---

# 26. QUY TRÌNH CHO MỖI ENGINE

Trước khi code:

```text
1. Xác định input
2. Xác định output
3. Xác định responsibility
4. Xác định non-responsibility
5. Kiểm tra contract
6. Viết validation
7. Viết unit tests
8. Viết engine
9. Test engine độc lập
10. Integrate
```

---

# 27. DEFINITION OF DONE

Một engine chỉ được xem là hoàn thành khi:

```text
[ ] Contract rõ ràng
[ ] Input rõ ràng
[ ] Output rõ ràng
[ ] Không vượt boundary
[ ] Có validation
[ ] Có test
[ ] Chạy độc lập
[ ] Tích hợp được với engine liên quan
[ ] Không phá contract cũ
[ ] Có ví dụ runtime thực tế
```

---

# 28. TRẠNG THÁI TRIỂN KHAI HIỆN TẠI

## Đã thiết kế

```text
[✓] Knowledge Map
[✓] Mastery model
[✓] Adaptive rules
[✓] Adaptive paths
[✓] Question contract
[✓] MasteryUpdate contract
[✓] NextAction contract
[✓] RemediationPlan contract
[✓] Attempt contract
[✓] LearningContext contract
[✓] StudentState contract
[✓] Analytics Event contract
```

## Đã bắt đầu code

```text
[✓] Knowledge Engine V1
[✓] Question Engine V1
```

Nhưng:

> Code hiện tại chưa được xem là "production-ready".

Cần qua Contract Audit và Integration Test trước khi tiếp tục mở rộng.

---

# 29. VIỆC CẦN LÀM NGAY

Không viết thêm engine mới.

Thực hiện theo thứ tự:

```text
STEP 1
Audit toàn bộ contract hiện tại
        ↓
STEP 2
Audit data thực tế
        ↓
STEP 3
Đánh dấu contract nào LOCKED
        ↓
STEP 4
Sửa những contract chưa khớp data
        ↓
STEP 5
Ổn định Knowledge Engine
        ↓
STEP 6
Ổn định Question Engine
        ↓
STEP 7
Xây Attempt/Evaluation
        ↓
STEP 8
Xây Mastery Engine
        ↓
STEP 9
Xây Remediation Engine
        ↓
STEP 10
Xây Adaptive Engine
        ↓
STEP 11
Chạy vertical slice K281 → K282 → K283
        ↓
STEP 12
Mở rộng sang các cluster khác
```

---

# 30. NGUYÊN TẮC CUỐI CÙNG

Mục tiêu không phải:

> xây thật nhiều engine.

Mục tiêu là:

> xây được một vòng học thật sự hoạt động.

Vòng tối thiểu phải là:

```text
HỌC
 ↓
LÀM
 ↓
TRẢ LỜI
 ↓
GHI NHẬN EVIDENCE
 ↓
CẬP NHẬT MASTERY
 ↓
PHÁT HIỆN SAI
 ↓
SỬA ĐÚNG NGUYÊN NHÂN
 ↓
KIỂM TRA LẠI
 ↓
QUYẾT ĐỊNH BƯỚC TIẾP THEO
```

Khi vòng này chạy đúng trên một cụm kiến thức nhỏ, hệ thống mới được mở rộng.

---

# END OF SYSTEM IMPLEMENTATION PLAN
