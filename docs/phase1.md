Phase 1 phải là DATA VALIDATION LAYER, và đặt nó trước các engine là hợp lý.

Kiến trúc lúc này nên là:

PHASE 0 — CONTRACTS / DATA MODEL
              ✅ LOCKED
                   │
                   ▼
PHASE 1 — DATA VALIDATION LAYER
                   │
                   ▼
PHASE 2 — ENGINE IMPLEMENTATION

Mục tiêu Phase 1 :

DATA
 ↓
READ
 ↓
CHECK
 ↓
REPORT
 ↓
VALID / INVALID

Validator tuyệt đối không sửa dữ liệu. Ví dụ thấy:

{
  "primaryNode": "K999"
}

mà K999 không tồn tại, validator chỉ trả kiểu:

{
  "valid": false,
  "errors": [
    {
      "code": "QUESTION_PRIMARY_NODE_NOT_FOUND",
      "path": "primaryNode",
      "value": "K999",
      "message": "primaryNode K999 does not exist in knowledge map."
    }
  ]
}

chứ không được tự đổi node, bỏ field hay đoán node thay thế.

Phase 1 nên chia thành 3 tầng validation
                    DATA
                      │
          ┌───────────▼───────────┐
          │ 1. SCHEMA VALIDATION  │
          └───────────┬───────────┘
                      │
          ┌───────────▼────────────┐
          │ 2. REFERENCE VALIDATION│
          └───────────┬────────────┘
                      │
          ┌───────────▼───────────┐
          │ 3. CONTRACT VALIDATION│
          └───────────┬───────────┘
                      │
                  REPORT

Schema validation kiểm tra hình dạng dữ liệu: required field, type, enum, format, additional properties... Ví dụ difficulty: "D9" hoặc thiếu primaryNode.

Reference validation kiểm tra quan hệ giữa các file: primaryNode có tồn tại không, prerequisite có tồn tại không, skill ID có tồn tại không, failure signature có thuộc canonical registry không.

Contract validation kiểm tra những quy tắc mà JSON Schema đơn thuần khó diễn đạt. Ví dụ:

primaryNode ∈ nodes

secondaryNodes ∩ nodes = ∅   (nếu contract của mình quy định vậy)

diagnostic ∈ mode
diagnostic ∉ evidence

evidence ∈ {
  know,
  explain,
  apply,
  transfer
}

answer.value phải tham chiếu option hợp lệ

failureSignature phải thuộc canonical registry

Đây chính là lớp giúp bảo vệ engine.

Ví dụ:

questions/K206.json
       │
       ▼
Question Validator
       │
       ├── schema          ✓
       ├── references      ✓
       └── contracts       ✓
                │
                ▼
             VALID
                │
                ▼
         Question Engine

Nếu INVALID:

questions/K206.json
       │
       ▼
Validator
       │
       X
    INVALID
       │
       ▼
validation-report.json

Engine KHÔNG được nhận data này.
Scope Phase 1

Ta không xây một validator khổng lồ ngay. Đi theo dependency:

1. Knowledge Map Validator
        ↓
2. Lesson Validator
        ↓
3. Question Validator
        ↓
4. Attempt Validator
        ↓
5. Student State Validator
        ↓
6. Cross-file / Contract Validator
        ↓
7. Validation Runner
        ↓
8. Validation Report
        ↓
9. Test fixtures

Trong đó Knowledge validator rất quan trọng vì nhiều thứ khác reference nó. Nó cần bắt cả:

duplicate node ID
missing dependency
self dependency
DAG cycle
invalid leadsTo
invalid cluster
invalid skill
invalid priority
invalid targetMastery

Question Validator thì kiểm tra mạnh hơn:

schema
primaryNode exists
primaryNode ∈ nodes
all nodes exist
secondaryNodes exist
prerequisites exist
skills exist
evidence canonical
difficulty canonical
mode canonical
answer ↔ options
failureSignature canonical

Attempt Validator lại không được đánh giá đúng/sai thay Question Engine. Nó chỉ kiểm tra attempt có hợp lệ về contract hay không.

Điểm này nên LOCK ngay:

Validation xác nhận data có hợp lệ để engine xử lý hay không; validation không thực hiện business logic của engine.

Vậy roadmap hiện tại chính xác phải là:

PHASE 0
FOUNDATION / CONTRACTS
        ✅ COMPLETE + LOCKED
              │
              ▼
PHASE 1
DATA VALIDATION LAYER       ← CHÚNG TA ĐANG Ở ĐÂY
              │
              ▼
PHASE 2
ENGINE IMPLEMENTATION
              │
              ▼
PHASE 3
INTEGRATION / ORCHESTRATION
              │
              ▼
...

 Phase 0 đã thống nhất failure taxonomy, evidence semantics, engine ownership và Student State, nên Phase 1 không thiết kế lại contract nữa. Nó chỉ biến những contract đó thành các phép kiểm tra máy có thể thực thi.

Bước đầu tiên của Phase 1 nên là thiết kế validation-report.schema.json + chuẩn error code. Sau đó mọi validator (knowledgeValidator, questionValidator, attemptValidator...) đều trả về cùng một report contract. Làm vậy sẽ tránh sau này mỗi validator trả một kiểu lỗi khác nhau.