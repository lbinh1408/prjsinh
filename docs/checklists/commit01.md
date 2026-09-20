# Commit 01 - History Service
## Commit Information
- Commit ID: Commit 01
- Commit Name: History Service
- Goal: Thêm service lưu lịch sử đáp án riêng cho từng bước.

- Dependency: Commit 00

---
## Preconditions
- [ ] Storage đã hỗ trợ schema mới.

---
## Postconditions
- [ ] History có thể lưu và đọc được từ storage.

---
## Files Allowed To Modify
- [ ] storage.js

---
## Files NOT Allowed To Modify
- [ ] answerEngine.js
- [ ] lessonEngine.js
- [ ] engine.js

---
## Files To Create
- [ ] js/history.js

---
## Implementation Checklist
- [ ] Implement the capability described by the goal for History Service.
- [ ] Keep the change scoped to the approved files only.

---
## Validation Checklist
- [ ] Lưu được 1 history item.
- [ ] Đọc lại đúng dữ liệu.
- [ ] Không phá dữ liệu cũ.

---
## Definition of Done
- [ ] History service hoạt động độc lập với UI.

---
## Rollback Plan
- [ ] Xoá history module và bỏ các key liên quan.

---
## Notes

