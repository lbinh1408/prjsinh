quay lại bức tranh tổng thể của Learning System thì hiện tại chúng ta đã thống nhất một kiến trúc gồm 7 engine chính.

1. Tổng thể Learning System
                    ┌──────────────────────┐
                    │   KNOWLEDGE ENGINE   │
                    │  "Học cái gì?"       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    LESSON ENGINE     │
                    │ "Dạy như thế nào?"   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   QUESTION ENGINE    │
                    │ "Hỏi câu nào?"       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   MASTERY ENGINE     │
                    │ "Đã biết đến đâu?"   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   ADAPTIVE ENGINE    │
                    │ "Tiếp theo làm gì?"  │
                    └──────────┬───────────┘
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
       ┌──────────────────────┐   ┌──────────────────────┐
       │ REMEDIATION ENGINE   │   │   ANALYTICS ENGINE   │
       │ "Sai ở đâu? Vì sao?" │   │ "Hệ thống đang diễn  │
       │ "Sửa từ đâu?"        │   │  ra như thế nào?"    │
       └──────────────────────┘   └──────────────────────┘

Nhưng cần lưu ý: 7 engine không có nghĩa là 7 module code độc lập ngay từ đầu. Đây trước hết là 7 trách nhiệm logic của hệ thống.

2. Knowledge Engine — Học cái gì?

Đây là nguồn sự thật về kiến thức.

Nó đọc:

knowledge-map-v4.json

và biết:

Có những knowledge node nào?
Mỗi node là kiến thức gì?
Node thuộc cluster nào?
Priority P1/P2?
Prerequisite là gì?
D1/D2/D3 dependency?
Node liên kết với node nào?
Node có tính chất nền tảng hay chuyển giao?

Ví dụ:

K206 — Dịch mã

D1:
K202 — Mã di truyền
K205 — Các loại RNA

D3:
K208 — DNA → RNA → protein → tính trạng
Knowledge Engine trả lời:

"Nếu học sinh muốn học K206 thì cần biết gì trước?"

Nó không quyết định học sinh hôm nay phải làm câu nào.

3. Lesson Engine — Dạy như thế nào?

Lesson Engine biến knowledge thành trải nghiệm học.

Ví dụ cluster:

DNA → RNA → Protein

Lesson Engine có thể tổ chức:

Observation
↓
Concept
↓
Mechanism
↓
Worked Example
↓
Guided Practice
↓
Practice
↓
Cross-node
↓
Reflection

Một lesson có thể dạy nhiều node:

K200
K201
K204
K205
K202
K206
K208

Điểm quan trọng chúng ta đã thống nhất:

Lesson không quyết định học sinh cần học gì.

Knowledge Map + Adaptive Engine mới quyết định.

Lesson chỉ quyết định:

"Nếu cần học phần này, tôi sẽ dạy nó như thế nào?"

4. Question Engine — Hỏi câu nào?

Question Engine làm việc với:

questions/schema.json
questions/knowledge/
questions/diagnostic/
questions/transfer/
questions/retest/

Nó nhận yêu cầu kiểu:

{
  "action": "PRACTICE",
  "nodeIds": ["K206"],
  "difficulty": ["D2", "D3"],
  "evidenceDimensions": [
    "explain",
    "apply"
  ]
}

rồi chọn câu phù hợp.

Ví dụ:

K206
mastery M2
explain yếu
apply yếu

→ không nên chọn câu nhận biết đơn giản.

Nó sẽ ưu tiên:

Q-E
Q-A
Question Engine trả lời:

"Câu hỏi nào phù hợp nhất với mục tiêu hiện tại?"

Nó không quyết định mastery.

5. Mastery Engine — Học sinh đã biết đến đâu?

Đây là một trong những engine quan trọng nhất.

Nó nhận:

Student Answer
        +
Question
        +
Attempt

và cập nhật evidence:

know
explain
apply
transfer

Sau đó xác định:

M0
M1
M2
M3
M4

và:

developing
mastered
stable
weak

Ví dụ:

K206

know     0.82
explain  0.65
apply    0.48
transfer 0.20

→ chưa thể coi là M4 mặc dù know rất tốt.

Mastery Engine phải nhìn profile nhiều chiều, không chỉ điểm tổng.

6. Adaptive Engine — Tiếp theo học sinh nên làm gì?

Đây là bộ não điều phối.

Nó đọc:

Knowledge Map
+
Student State
+
Mastery
+
Question availability
+
Lesson availability
+
Adaptive Rules
+
Paths

rồi quyết định:

LEARN
PRACTICE
CHALLENGE
REMEDIATE
RETEST
REVIEW
SKIP

Ví dụ:

K206 = M2
        ↓
apply thấp
        ↓
PRACTICE

Hoặc:

K206 = M3
apply tốt
        ↓
CHALLENGE

Hoặc:

K206 = M4
retest đến hạn
        ↓
RETEST

Hoặc:

K206 = M4
chưa đến hạn
HOC_NHANH
        ↓
SKIP
Adaptive Engine trả lời:

"Ngay lúc này, học sinh nên làm gì tiếp theo?"

Đây chính là engine tạo nên tính adaptive của hệ thống.

7. Remediation Engine — Sai ở đâu và sửa từ đâu?

Đây là engine mà mình nghĩ rất quan trọng với mục tiêu của hệ thống chúng ta.

Ví dụ:

Học sinh làm K206 sai

Không kết luận ngay:

"Học sinh yếu K206."

Remediation Engine phải tìm:

Sai vì gì?

Có thể là:

concept_confusion
mechanism_confusion
calculation_error
source_knowledge_gap
cross_node_reasoning_error
meta_skill_gap
careless_error

Ví dụ:

K206 sai
    ↓
source_knowledge_gap
    ↓
K202 yếu
    ↓
REMEDIATE K202
    ↓
mini practice
    ↓
mini probe
    ↓
quay lại K206
Remediation Engine trả lời:

"Không chỉ biết học sinh sai; phải tìm nguyên nhân gốc và sửa đúng chỗ."

8. Analytics Engine — Hệ thống đang diễn ra như thế nào?

Engine này không trực tiếp quyết định kiến thức.

Nó ghi nhận:

student_started_lesson
question_answered
question_failed
hint_used
mastery_changed
remediation_started
remediation_completed
retest_passed
retest_failed
node_skipped
session_completed

Từ đó có thể biết:

Ở cấp học sinh
Tiến độ
Mastery
Weakness
Failure patterns
Study time
Retention
Transfer ability
Ở cấp hệ thống

Ví dụ:

K206
85% học sinh sai Q-A206-002

→ có thể câu hỏi có vấn đề.

Hoặc:

K206 → K202
rất nhiều remediation

→ dependency hoặc cách dạy có thể cần xem lại.

Analytics Engine trả lời:

"Điều gì đang xảy ra trong quá trình học?"

9. Quan hệ giữa 7 engine

Nếu rút gọn thành một vòng lặp học tập:

             ┌─────────────────┐
             │ KNOWLEDGE       │
             │ ENGINE          │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ LESSON          │
             │ ENGINE          │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ QUESTION        │
             │ ENGINE          │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ MASTERY         │
             │ ENGINE          │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ ADAPTIVE        │
             │ ENGINE          │
             └──────┬──┬───────┘
                    │  │
             ┌──────┘  └────────┐
             ▼                  ▼
       REMEDIATION           NEXT ACTION
         ENGINE
             │
             └──────────┐
                        ▼
                    học tiếp

Analytics Engine chạy song song để quan sát toàn bộ vòng đời.

10. Một cách phân biệt rất dễ nhớ
Engine	Câu hỏi nó trả lời
Knowledge Engine	Học cái gì?
Lesson Engine	Dạy như thế nào?
Question Engine	Hỏi câu nào?
Mastery Engine	Đã biết đến đâu?
Adaptive Engine	Tiếp theo làm gì?
Remediation Engine	Sai ở đâu, vì sao, sửa từ đâu?
Analytics Engine	Hệ thống đang diễn ra như thế nào?

Và có một nguyên tắc kiến trúc rất đáng ghim lại:

Không engine nào nên ôm trách nhiệm của engine khác.

Ví dụ:

Lesson Engine
❌ không quyết định mastery

Question Engine
❌ không quyết định học sinh yếu

Mastery Engine
❌ không quyết định câu hỏi tiếp theo

Remediation Engine
❌ không tự quyết định toàn bộ learning path

Adaptive Engine
❌ không tự định nghĩa kiến thức

Mỗi engine có một trách nhiệm rõ ràng, sau đó phối hợp thông qua các contract/data đã xây.

Trạng thái hiện tại của project

Chúng ta đã có nền cho:

✅ Knowledge Engine      → knowledge-map-v4
✅ Lesson Engine         → lessons/schema + sample lesson
🟡 Question Engine       → questions/schema + K206 sample
🟡 Mastery Engine        → mastery/evidence
🟡 Adaptive Engine       → adaptive/rules + paths
🟡 Remediation Engine    → logic đã định nghĩa, cần contract/implementation
🟡 Analytics Engine      → logic đã định nghĩa, cần contract/implementation

Chưa nên code tất cả 7 engine cùng lúc. Bước tiếp theo hợp lý là đóng contract của từng engine, rồi mới triển khai engine theo một vòng khép kín nhỏ: Question → Attempt → Mastery → Adaptive → Remediation → quay lại học.