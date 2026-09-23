
Hệ thống học được thiết kế theo hướng học cấp tốc nhưng sâu: không đi tuần tự SGK, mà hệ thống tự gom các node có quan hệ thành cụm học, chẩn đoán nhanh, học đúng lỗ hổng rồi quay lại bài gốc.

1. Kiến trúc Learning System
                    KNOWLEDGE MAP V4
                          │
                          ▼
                 ┌──────────────────┐
                 │ Knowledge Engine │
                 └────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
         Lesson        Question      Mastery
         Engine        Engine        Engine
             │            │            │
             └────────────┼────────────┘
                          ▼
                  Adaptive Engine
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
          Learn        Remediate     Retest
             │            │            │
             └────────────┼────────────┘
                          ▼
                    Student Model
                          │
                          ▼
                      Analytics

Điểm quan trọng:

Lesson không quyết định học sinh cần học gì.

Knowledge Map V4 quyết định.

Lesson chỉ là cách truyền đạt knowledge node.

2. Các layer của hệ thống
gồm 7 engine/layer:

Layer	Nhiệm vụ
Knowledge Engine	đọc V4, dependency, prerequisite
Lesson Engine	dạy kiến thức
Question Engine	tạo/chọn câu hỏi
Mastery Engine	xác định mức độ nắm
Adaptive Engine	quyết định bước học tiếp theo
Remediation Engine	tìm và sửa lỗ hổng
Analytics Engine	theo dõi tiến bộ

Không cần thêm engine thứ 8 chỉ để làm cho kiến trúc phức tạp hơn.

3. Student Model

Đây là trái tim của Learning System.

Mỗi học sinh sẽ có một Knowledge State.

Ví dụ:

{
  "studentId": "student-001",

  "knowledge": {
    "K013": {
      "mastery": "M4",
      "status": "stable",
      "evidence": {
        "know": 0.96,
        "explain": 0.91,
        "apply": 0.88,
        "transfer": 0.82
      }
    },

    "K200": {
      "mastery": "M3",
      "status": "mastered",
      "evidence": {
        "know": 0.95,
        "explain": 0.83,
        "apply": 0.79,
        "transfer": 0.55
      }
    },

    "K203": {
      "mastery": "M1",
      "status": "developing",
      "evidence": {
        "know": 0.82,
        "explain": 0.42,
        "apply": 0.20,
        "transfer": 0
      }
    }
  }
}

Hệ thống nhìn vào đây sẽ biết:

Học sinh không cần học lại DNA từ đầu.

Vấn đề nằm ở:

K203 – Nhân đôi DNA
4. Lesson không còn là “bài 1, bài 2, bài 3”

Đây là thay đổi rất quan trọng.

Thay vì:

Bài 1: DNA
Bài 2: Gene
Bài 3: Nhân đôi
Bài 4: Phiên mã
Bài 5: Dịch mã

ta có:

Knowledge Cluster
      │
      ├── K013
      ├── K200
      ├── K201
      ├── K203
      ├── K204
      ├── K205
      ├── K206
      └── K208

Hệ thống có thể tạo:

Learning Path: Từ DNA đến tính trạng

nhưng bên trong lesson vẫn map chính xác từng node.

5. Lesson Schema

Mỗi lesson sẽ có dạng:

{
  "id": "dna-to-trait-01",
  "title": "Từ DNA đến tính trạng",

  "type": "cluster",

  "knowledgeNodes": [
    "K200",
    "K201",
    "K204",
    "K205",
    "K202",
    "K206",
    "K208"
  ],

  "entryDiagnostic": {
    "enabled": true,
    "questions": [
      "Q-K...",
      "Q-E...",
      "Q-A..."
    ]
  },

  "sections": [
    {
      "type": "concept",
      "nodes": ["K200", "K201"]
    },
    {
      "type": "mechanism",
      "nodes": ["K204", "K205"]
    },
    {
      "type": "guidedPractice",
      "nodes": ["K202", "K206"]
    },
    {
      "type": "transfer",
      "nodes": ["K208"]
    }
  ],

  "exitDiagnostic": {
    "enabled": true
  }
}

Một lesson có thể dạy nhiều node.

Một node có thể xuất hiện trong nhiều lesson.

6. Một lesson thực tế sẽ chạy thế nào?

Ví dụ học sinh chọn:

DNA → Protein → Tính trạng

Hệ thống không lập tức giảng.

Nó chạy:

ENTRY DIAGNOSTIC
       ↓
Có nền chưa?
       ↓
┌──────┼───────┐
↓      ↓       ↓
Có    Thiếu    Rất yếu
↓      ↓       ↓
Learn Remediate Foundation

Ví dụ:

K200 = M4
K201 = M4
K204 = M2
K205 = M1
K206 = M0

Hệ thống sẽ không bắt học lại K200/K201.

Nó đi:

K205
 ↓
mini lesson
 ↓
mini probe
 ↓
K206
 ↓
lesson
 ↓
practice
 ↓
K208
7. Diagnostic Engine

Diagnostic không phải một bài kiểm tra dài.

Nó là:

đo nhanh để xác định vị trí bắt đầu.

Mỗi node có thể có:

Q-K → biết không?
Q-E → hiểu không?
Q-A → làm được không?
Q-T → chuyển giao được không?
Q-D → chẩn đoán lỗi

Ví dụ K283:

Q-K
"Hoán vị gene là gì?"

Q-E
"Vì sao xuất hiện giao tử tái tổ hợp?"

Q-A
"Cho tỉ lệ giao tử → tính tần số hoán vị."

Q-T
"Đọc sơ đồ gene và suy luận khoảng cách."

Q-D
"Bạn A tính 20% nhưng đáp án là 10%.
Sai ở bước nào?"
8. Mastery Engine

Mastery Engine nhận:

Question Result
       ↓
Knowledge Node
       ↓
Evidence Type
       ↓
Difficulty
       ↓
Current Mastery
       ↓
Update Mastery

Ví dụ:

{
  "questionId": "Q283-A-04",
  "node": "K283",
  "evidence": "apply",
  "result": "wrong",
  "failureSignature": "recombination-rate-calculation"
}

Engine không đơn giản:

wrong → mastery -1

mà:

wrong
 ↓
failure signature
 ↓
K282?
 ↓
K282 mastery

Nếu K282 yếu:

Lỗi ở nền tảng.

Nếu K282 mạnh:

Có thể là lỗi tính toán → S008.

9. Remediation Engine

Đây là phần làm hệ thống thông minh hơn một website luyện đề bình thường.

Luồng:

Sai
 ↓
Phân loại lỗi
 ↓
Xác định source node
 ↓
Kiểm tra mastery source node
 ↓
Remediation
 ↓
Mini probe
 ↓
Quay lại câu ban đầu

Ví dụ:

Sai K283
       ↓
"Không hiểu giao tử tái tổ hợp"
       ↓
K282 = M1
       ↓
Học K282
       ↓
3 câu mini probe
       ↓
K282 = M2
       ↓
quay lại K283
10. Adaptive Engine

Adaptive Engine sẽ quyết định:

“Bây giờ học sinh nên làm gì?”

Nó có 6 hành động:

LEARN
PRACTICE
REMEDIATE
CHALLENGE
RETEST
REVIEW

Decision tree:

Node chưa học?
      │
      ├── Có prerequisite đủ?
      │       │
      │       ├── Không → REMEDIATE
      │       │
      │       └── Có → LEARN
      │
      └── Đã học
            │
            ├── M0–M1 → LEARN
            ├── M2 → PRACTICE
            ├── M3 → CHALLENGE
            ├── M4 → RETEST
            └── STABLE → REVIEW định kỳ
11. Unlock Engine

Không mở khóa theo:

“đã hoàn thành bài trước”.

Mà theo Knowledge Map V4.

Ví dụ:

K281
   ↓
K282
   ↓
K283

Muốn unlock K283:

K281 >= M2
K282 >= M2

Không cần hoàn thành 100% lesson K281.

12. Nhưng hệ thống phải cho phép “đi tắt”

Đây rất quan trọng với mục tiêu học cấp tốc.

Ví dụ học sinh làm diagnostic:

K200 → M4
K201 → M4
K204 → M4
K205 → M3
K206 → M3
K208 → M3

Hệ thống không bắt:

“Bạn chưa học lesson 1 → phải học lesson 1.”

Mà:

SKIP
 ↓
Practice
 ↓
Challenge

Đây chính là Accelerated Learning Mode.

13. Ba chế độ học

Tôi đề nghị hệ thống có 3 mode.

MODE A — HỌC NHANH

Dành cho học sinh muốn hoàn thành chương trình nhanh.

Diagnostic
 ↓
Skip known
 ↓
Learn gaps
 ↓
Practice
 ↓
Mastery
MODE B — HỌC SÂU
Concept
 ↓
Mechanism
 ↓
Apply
 ↓
Transfer
 ↓
Cross-node
 ↓
Retest
MODE C — ÔN THI
Question
 ↓
Wrong
 ↓
Diagnose
 ↓
Remediate
 ↓
Question again

Ba mode dùng chung Knowledge Map + Mastery State.

Không tạo ba hệ thống riêng.

14. Knowledge Cluster

Đây là chìa khóa cho việc học 5 tháng.

Thay vì 100+ bài rời rạc, hệ thống tạo khoảng các cluster kiến thức lớn.

Ví dụ:

Cluster 01 — Nền tảng tế bào
K007
K012
K013
K014
K021
K030
K032
K035
K042
Cluster 02 — Năng lượng
K014
K040
K042
K050
K051
K054
K055
K060
K062
K064
Cluster 03 — DNA → Protein
K013
K200
K201
K202
K203
K204
K205
K206
K208
Cluster 04 — Phân bào → Mendel
K230
K231
K232
K240
K250
K253
K254
K255
K260
K263
K264
K265
K266
Cluster 05 — Di truyền nâng cao
K270
K275
K281
K282
K283
K284
K285
K286
K290
K291
K292
K300
K301
K310
K312
Cluster 06 — Tiến hóa
K400–K411
Cluster 07 — Sinh thái
K500–K513
Cluster 08 — Sinh lý
K070–K078
K100–K181
15. Cross-Cluster Learning

Sau khi các cluster đủ mạnh, hệ thống bắt đầu cho câu:

Liên kết nhiều chương

Ví dụ:

K014 ATP
+
K030 màng
+
K032 gradient
+
K035 vận chuyển chủ động

hoặc:

K200 DNA
+
K203 nhân đôi
+
K250 giảm phân
+
K263 phân li
+
K264 xác suất

Đây là lúc S009/S010/S011 hoạt động mạnh.

16. Question Engine

Mỗi câu hỏi phải có metadata.

{
  "id": "Q-K283-A-001",

  "nodes": [
    "K283"
  ],

  "primaryNode": "K283",

  "evidence": "apply",

  "difficulty": 3,

  "questionType": "mcq",

  "failureSignatures": [
    "recombination-rate-calculation",
    "linked-gamete-confusion"
  ],

  "prerequisites": [
    "K281",
    "K282"
  ],

  "skill": [
    "S008"
  ]
}

Nhờ vậy một câu hỏi không chỉ có đáp án đúng/sai.

Nó có thể nói:

Em sai câu này vì K282 chưa chắc.

17. Question Difficulty

Không dùng đơn giản:

easy
medium
hard

mà:

D1 — Recognition
D2 — Understanding
D3 — Application
D4 — Transfer
D5 — Integrated

Ví dụ:

K283
D1 → định nghĩa
D2 → giải thích
D3 → tính toán
D4 → suy luận từ dữ liệu
D5 → liên kết K281 + K282 + S008
18. Session Engine

Mỗi phiên học không nhất thiết là “một bài”.

Ví dụ:

SESSION
│
├── 2 phút Diagnostic
│
├── 10 phút Learn
│
├── 10 phút Guided Practice
│
├── 10 phút Apply
│
├── 5 phút Transfer
│
└── 2 phút Reflection

Nhưng nếu học sinh đã M3:

Diagnostic
 ↓
Skip lesson
 ↓
Challenge
 ↓
Transfer
19. Retest

Sau khi M4:

M4
 ↓
Retest
 ↓
Stable

Retest không nên giống hệt câu cũ.

Ví dụ lần đầu:

Tính tần số hoán vị.

Retest:

Cho bảng dữ liệu giao tử → suy luận tần số hoán vị.

Như vậy mới kiểm tra khả năng chuyển giao.

20. Spaced Review

Knowledge State có:

{
  "mastery": "M4",
  "status": "stable",

  "review": {
    "nextReview": "2026-10-02",
    "interval": 7,
    "reviewCount": 2
  }
}

Nếu retest sai:

stable
 ↓
mastered

Không reset về M0.

Hệ thống giảm mức tin cậy và đưa node vào review/remediation.

21. Dashboard học sinh

Dashboard không nên chỉ hiện:

65% hoàn thành.

Nó phải hiện:

Knowledge Map
🟢 Stable       32
🟢 Mastered     18
🟡 Developing   21
🔴 Weak         11
⚪ Not learned  30
Current weaknesses
1. K282 — Giao tử liên kết/tái tổ hợp
2. K256 — Tính DNA/NST trong giảm phân
3. S008 — Tính toán chuỗi
Next action

Học K282 — 12 phút

Thay vì:

“Bài tiếp theo: Bài 17”.

22. Teacher/Parent view

Nếu sau này cần, hệ thống có thể hiển thị:

Knowledge
     ↓
Mastery
     ↓
Weakness
     ↓
Intervention

Ví dụ:

Học sinh đã hiểu khái niệm gene nhưng còn yếu ở việc liên hệ gene → protein → tính trạng.

Đây hữu ích hơn điểm 7.5/10.

23. Data flow hoàn chỉnh

Đây là flow cuối cùng:

             KNOWLEDGE MAP V4
                     │
                     ▼
              Student Model
                     │
                     ▼
               DIAGNOSTIC
                     │
                     ▼
            Adaptive Decision
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
     LEARN       REMEDIATE      PRACTICE
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  QUESTION
                     │
                     ▼
                  RESULT
                     │
                     ▼
              Failure Analysis
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Mastery               Weak Node
          │                     │
          ▼                     ▼
       Update              Remediation
          │                     │
          └──────────┬──────────┘
                     ▼
                  RETEST
                     │
                     ▼
                 MASTERY
                     │
                     ▼
                  STABLE
                     │
                     ▼
               NEXT NODE
24. Cấu trúc JSON cuối cùng

Tôi sẽ không nhét tất cả vào một JSON khổng lồ.

Tách dữ liệu theo trách nhiệm:

data/
│
├── knowledge/
│   └── knowledge-map-v4.json
│
├── lessons/
│   ├── clusters/
│   │   ├── cell-foundation.json
│   │   ├── energy.json
│   │   ├── dna-protein.json
│   │   ├── genetics.json
│   │   ├── evolution.json
│   │   ├── ecology.json
│   │   └── physiology.json
│   │
│   └── remediation/
│
├── questions/
│   ├── knowledge/
│   ├── diagnostic/
│   ├── transfer/
│   └── retest/
│
├── mastery/
│   ├── rules.json
│   └── evidence.json
│
├── adaptive/
│   ├── rules.json
│   └── paths.json
│
└── analytics/
    └── events.json

V4 vẫn là nguồn dữ liệu gốc.

Các file khác chỉ tham chiếu ID của V4.

25. Một ví dụ hoàn chỉnh từ đầu đến cuối

Giả sử học sinh học:

Tần số hoán vị gene — K283

Bước 1

System kiểm tra:

K281 = M3
K282 = M1
K253 = M3
Bước 2

K283 chưa đủ prerequisite.

Không cho học toàn bộ lesson.

Adaptive Engine:

→ Remediate K282
Bước 3

Học sinh học mini lesson:

Giao tử liên kết vs tái tổ hợp.

Bước 4

Mini probe:

Q1 — Know       ✓
Q2 — Explain    ✓
Q3 — Apply      ✓

K282:

M1 → M2
Bước 5

Unlock K283.

Bước 6

Học K283:

concept
→ example
→ guided calculation
→ independent calculation
→ data interpretation
Bước 7

Mastery:

E-K 95%
E-E 90%
E-A 84%
E-T 72%

→ K283 = M4.

Bước 8

Sau vài ngày:

Retest

Câu mới, ngữ cảnh mới.

→ Stable.

Đây chính là trải nghiệm học mà hệ thống cần tạo ra.

Và như vậy chúng ta đã chốt 2 tầng
LAYER 1
KNOWLEDGE MAP V4
"Học cái gì + phụ thuộc cái gì + mastery thế nào"

                    ↓

LAYER 2
LEARNING SYSTEM
"Dạy thế nào + kiểm tra thế nào
+ sửa sai thế nào + đi tiếp thế nào"

Từ đây không cần thêm phiên bản kiến trúc. Bước triển khai hợp lý tiếp theo là xây data contract thực tế cho 6 file lõi:

knowledge-map-v4.json → mastery/rules.json → questions schema → lesson schema → adaptive/rules.json → student-state.json

Sau đó mới bắt đầu viết Cluster 01 và chạy thử toàn bộ vòng diagnostic → learn → practice → remediation → mastery → retest trên dữ liệu thật.