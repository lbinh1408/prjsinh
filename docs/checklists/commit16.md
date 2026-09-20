# Commit 16 - Unlock UI
## Commit Information
- Commit ID: Commit 16
- Commit Name: Unlock UI
- Goal: Render trạng thái unlock trên sidebar hoặc UI lesson list.

- Dependency: Commit 15

---
## Preconditions
- [ ] Unlock logic đã hoạt động.

---
## Postconditions
- [ ] UI hiển thị đúng trạng thái locked/unlocked cho bài tiếp theo.

---
## Files Allowed To Modify
- [ ] sidebar.js

---
## Files NOT Allowed To Modify
- [ ] storage.js
- [ ] progress.js
- [ ] renderer.js
- [ ] answerEngine.js
- [ ] summary.js

---
## Files To Create
- [ ] None

---
## Implementation Checklist
- [ ] Implement the capability described by the goal for Unlock UI.
- [ ] Keep the change scoped to the approved files only.

---
## Validation Checklist
- [ ] Bài chưa unlock hiển thị trạng thái locked.
- [ ] Bài đã unlock hiển thị trạng thái unlocked.
- [ ] Không làm lỗi layout cũ.

---
## Definition of Done
- [ ] UI cho unlock có thể render đúng mà không ảnh hưởng tới flow cũ.

---
## Rollback Plan
- [ ] Tắt render unlock trên UI, giữ lại logic cũ.

---
## Notes

