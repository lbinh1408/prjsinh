Mình nên đóng một roadmap cập nhật ngay lúc này để tránh tình trạng đang xây lại nảy thêm schema/engine/UI rồi lệch khỏi mục tiêu ban đầu.
Mục tiêu từ giờ không phải “xây một nền tảng adaptive learning thật hoàn hảo”. Mục tiêu là:
Đưa hệ thống vào sử dụng để em học Sinh thật càng sớm càng tốt, rồi dùng chính quá trình học để hoàn thiện hệ thống.

MASTER PLAN cập nhật — Study MVP
Đích đến
                 MỤC TIÊU CUỐI
          Học Sinh THPT → hướng tới 10 điểm
                       │
                       ▼
             ADAPTIVE STUDY SYSTEM
                       │
       ┌───────────────┴───────────────┐
       │                               │
    HỌC THẬT                       XÂY HỆ THỐNG
       │                               │
       └───────────────┬───────────────┘
                       ▼
                DATA HỌC THẬT
                       │
                       ▼
               cải thiện hệ thống

Giai đoạn đã hoàn thành — không quay lại tùy tiện
PHASE 0 — CONTRACTS / DATA MODEL              ✅ COMPLETE
PHASE 1 — DATA VALIDATION                     ✅ COMPLETE

Phase 1:
validation-report.schema.json                 🔒
error-codes.json                              🔒

knowledgeValidator.js                         🔒
questionValidator.js V1.1                     🔒
attemptValidator.js                           🔒
studentStateValidator.js V1.0                 🔒
lessonValidator.js V1.0.1                     🔒
eventValidator.js V1.0.0                      🔒
crossContractValidator.js V1.0.0              🔒
validationRunner.js V1.0.0                    🔒

Quy tắc từ đây:
KHÔNG reopen Phase 0/1
chỉ vì engine mới muốn code dễ hơn.

Chỉ reopen nếu:
implementation
      ↓
phát hiện representational gap thật
      ↓
xác định contract owner
      ↓
version change
      ↓
update contract
      ↓
update validator

PHASE 2A — STUDY MVP 🚀
Đây là phase hiện tại.
Target: khoảng 7–10 ngày nếu em dành nhiều thời gian mỗi ngày.
Mục tiêu duy nhất:
Student
   ↓
Learn
   ↓
Question
   ↓
Attempt
   ↓
Mastery
   ↓
Adaptive
   ↓
Remediation nếu cần
   ↓
Retest
   ↓
Continue

Một cluster Sinh chạy được vòng này là Study MVP đầu tiên.
Ngày 1–3 — Mastery Engine
Viết
masteryEngine.js

Input chủ yếu:
Attempt
+
previous Student State
+
mastery/rules.json
+
mastery/evidence.json

Output:
evidence update
mastery level M0–M4
confidence
status
weakness signals
failure evidence

Mastery Engine không được:
❌ chọn bài tiếp theo
❌ trả LEARN/PRACTICE/REVIEW
❌ quyết định remediation
❌ schedule retest

Đó là Adaptive/Remediation.
Test tối thiểu
correct answer
incorrect answer
partial
diagnostic weight
know evidence
explain evidence
apply evidence
transfer evidence
rolling update
wrong decay
evidence sufficiency
M0 → M1
M1 → M2
M2 → M3
M3 → M4
confidence
weakness
không downgrade vì 1 câu sai

Mốc hoàn thành
Attempt
   ↓
Mastery Engine
   ↓
Student mastery state

Ngày 4–5 — Adaptive Engine
Đây mới là nơi trả lời:
“Học sinh nên làm gì tiếp theo?”

Input:
Knowledge Map
+
Mastery State
+
confidence
+
weakness
+
prerequisites
+
learning context
+
adaptive/rules.json

Output canonical:
LEARN
PRACTICE
CHALLENGE
REMEDIATE
RETEST
REVIEW
SKIP

Ví dụ:
K205 = M3
confidence cao
evidence đủ
        ↓
CHALLENGE

K205 = M1
apply yếu
        ↓
PRACTICE

K205 sai
vì prerequisite K013 yếu
        ↓
REMEDIATE

M4 + evidence đủ
        ↓
SKIP / chuyển node

Không cần Adaptive V1 thông minh tuyệt đối.
Rule-based, deterministic, explainable trước.
AI recommendation để sau.
Ngày 6–7 — Remediation MVP
Đây là nơi trả lời:
“Tại sao em sai và sửa như thế nào?”

Pipeline:
Incorrect Attempt
       ↓
failureType
       ↓
failureSignature
       ↓
sourceNode
       ↓
remediation depth
       ↓
strategy
       ↓
mini lesson
       ↓
mini practice
       ↓
mini probe
       ↓
RETEST

Ví dụ:
K283 — Hoán vị gene
        ↓
sai câu vận dụng
        ↓
failure:
mechanism_confusion
        ↓
source:
K281
        ↓
ôn mechanism ngắn
        ↓
2 câu mini practice
        ↓
1 mini probe
        ↓
RETEST K283

V1 không cần remediation AI phức tạp.
Ngày 8 — Nối pipeline
Lúc này mới nối các engine.
Question Engine
      │
      ▼
   Question
      │
      ▼
    Attempt
      │
      ▼
 Mastery Engine
      │
      ├──────────────→ Student State
      │
      ▼
 Adaptive Engine
      │
      ├── PRACTICE
      ├── CHALLENGE
      ├── REVIEW
      ├── RETEST
      │
      └── REMEDIATE
              │
              ▼
       Remediation Engine
              │
              ▼
          mini probe
              │
              ▼
           Attempt
              │
              └────────→ Mastery...

Đây là vòng lặp quan trọng nhất toàn hệ thống.
Ngày 9–10 — Biology Vertical Slice
Không tiếp tục xây framework.
Chọn 1 cluster Sinh thật.
Anh thiên về một cluster có dependency rõ và đủ loại câu hỏi, chẳng hạn:
DNA / Gene
    ↓
Phiên mã
    ↓
Dịch mã
    ↓
Protein
    ↓
Biểu hiện tính trạng

Hoặc một cluster trong chương em đang học ở trường tại thời điểm đó.
Cho cluster đó đủ:
Knowledge nodes          ✓
Dependencies             ✓
Lesson                   ✓
Questions D1–D5          ✓
Diagnostic               ✓
Practice                 ✓
Apply                    ✓
Transfer                 ✓
Failure signatures       ✓
Remediation              ✓
Retest                   ✓

Rồi em trở thành student #1.
PHASE 2B — Học thật + phát triển thật
Từ đây thay đổi cách làm.
Không còn:
CODE CODE CODE CODE
       ↓
2 tháng sau
       ↓
mới bắt đầu học

Mà:
HỌC
 ↓
phát hiện vấn đề
 ↓
sửa engine/content
 ↓
HỌC
 ↓
thu được attempt thật
 ↓
đánh giá Mastery/Adaptive
 ↓
sửa
 ↓
HỌC tiếp

Đây có thể kéo dài khoảng 1–3 tháng, nhưng em đã học trong toàn bộ thời gian đó.
Content mở rộng theo nhu cầu học
Không nhập toàn bộ Sinh 10–12 cùng lúc.
Dùng chiến lược just-in-time content.
Ví dụ tuần tới cần học:
Trao đổi chất

thì ưu tiên hoàn thiện cluster đó.
Tuần sau cần:
Cảm ứng

thì mở cluster đó.
Dần dần:
Cluster 1 ██████████
Cluster 2 ██████████
Cluster 3 ██████████
Cluster 4 ██████████
Cluster 5 ██████████
...
               ↓
        Biology Knowledge Base

Như vậy viết content cũng chính là học Sinh.
PHASE 3 — Analytics
Chỉ làm sau khi đã có attempt/event thật.
Lúc đó Analytics mới có ý nghĩa:
Events
  ↓
Analytics Engine
  ↓
accuracy
mastery distribution
weak nodes
failure patterns
time spent
retention
retest performance
transfer performance

Không cần làm dashboard analytics khi database còn chưa có học sinh học thật.
PHASE 4 — Productization
Để sau.
UI polish
animations
gamification
admin CMS
teacher dashboard
multi-user
social
leaderboard
AI tutor nâng cao
recommendation ML
mobile app
...

Những thứ này không giúp em hiểu Sinh tốt hơn trong tuần tới, nên hiện tại không ưu tiên.
Phân bổ 6–8 giờ/ngày
Trong khoảng 7 ngày đầu:
Hoạt động	Thời gian
Xây Study MVP	3–4h
Học Sinh thật	3–4h
Tổng	6–8h


Sau khi Study MVP chạy:
Hoạt động	Thời gian
Học Sinh	4–5h
Content cho hệ thống	1–2h
Code/fix engine	1h
Tổng	6–8h


Đặc biệt, content không hoàn toàn là thời gian code. Khi em tự xây lesson/câu hỏi cho một node Sinh, nếu làm đúng cách thì đó đồng thời là active learning.
Quy tắc chống over-engineering
Từ giờ trước mỗi feature mình hỏi:
Feature này có giúp em:

1. học kiến thức?
2. luyện câu hỏi?
3. phát hiện mình yếu đâu?
4. sửa chỗ yếu?
5. biết nên học gì tiếp?

             │
        ┌────┴────┐
       CÓ        KHÔNG
        │           │
        ▼           ▼
     làm sớm      BACKLOG

Ví dụ:
Mastery Engine             → NOW
Adaptive Engine            → NOW
Remediation                → NOW
Question selection         → NOW

Fancy dashboard            → LATER
Achievement badge          → LATER
Animation                  → LATER
Social ranking             → LATER
Mobile app                 → LATER
AI chatbot                 → LATER
Microservices              → LATER
ML recommendation          → MUCH LATER

Roadmap rút gọn để mình luôn nhìn lại
╔════════════════════════════════════════════════════╗
║         ADAPTIVE BIOLOGY — STUDY ROADMAP          ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║ PHASE 0  Contracts                    ✅ LOCKED    ║
║        ↓                                           ║
║ PHASE 1  Validation                   ✅ LOCKED    ║
║        ↓                                           ║
║ ─────────────── WE ARE HERE ───────────────────   ║
║        ↓                                           ║
║ Mastery Engine                        ← NEXT       ║
║        ↓                                           ║
║ Adaptive Engine                                    ║
║        ↓                                           ║
║ Remediation MVP                                    ║
║        ↓                                           ║
║ End-to-End Integration                             ║
║        ↓                                           ║
║ Biology Vertical Slice                             ║
║        ↓                                           ║
║ 🚀 START USING SYSTEM TO STUDY                     ║
║        ↓                                           ║
║ ┌──────────────────────────────────────────────┐   ║
║ │              REAL STUDY LOOP                │   ║
║ │                                              │   ║
║ │ Learn → Question → Attempt → Mastery        │   ║
║ │   ↑                          ↓               │   ║
║ │ Retest ← Remediation ← Adaptive             │   ║
║ │                                              │   ║
║ └──────────────────────────────────────────────┘   ║
║        ↓                                           ║
║ Expand Biology content while studying              ║
║        ↓                                           ║
║ Analytics                                          ║
║        ↓                                           ║
║ Productization                                     ║
║                                                    ║
╚════════════════════════════════════════════════════╝

Mốc số 1 của mình bây giờ không phải hoàn thành website. Mốc số 1 là trong khoảng 7–10 ngày có một cluster Sinh chạy được trọn vòng và em bắt đầu dùng nó để học thật.
Và ngay bước tiếp theo, mình quay về Mastery Engine. Nhưng trước khi viết masteryEngine.js, mình sẽ khóa input → processing → output → ownership boundary của nó dựa trên mastery/rules.json + mastery/evidence.json hiện có. Sau đó mới code, để tránh kiểu viết engine trước rồi lại phải sửa contract.