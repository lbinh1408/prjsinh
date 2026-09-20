# Commit 15 - Unlock Logic
## Commit Information
- Commit ID: Commit 15
- Commit Name: Unlock Logic
- Goal: Thêm logic unlock cho bài tiếp theo mà không chạm đến UI.

- Dependency: Commit 06

---
## Preconditions
- [ ] Progress cơ bản đã chạy.

---
## Postconditions
- [ ] Logic unlock có thể đánh dấu một lesson là unlockable hoặc locked dựa trên trạng thái hoàn thành.

---
## Files Allowed To Modify
- [ ] storage.js
- [ ] progress.js

---
## Files NOT Allowed To Modify
- [ ] sidebar.js
- [ ] renderer.js
- [ ] answerEngine.js
- [ ] summary.js

---
## Files To Create
- [ ] js/unlock.js

---
## Implementation Checklist
- [ ] Implement the capability described by the goal for Unlock Logic.
- [ ] Keep the change scoped to the approved files only.

---
## Validation Checklist
- [ ] Hoàn thành lesson cũ làm unlock logic thay đổi.
- [ ] Không làm sai progress cũ.
- [ ] Không crash khi storage rỗng.

---
## Definition of Done
- [ ] Unlock logic hoạt động đúng ở layer data/state mà không cần UI.

---
## Rollback Plan
- [ ] Tắt logic unlock và giữ lại trạng thái cũ của progress.

---
## Notes

