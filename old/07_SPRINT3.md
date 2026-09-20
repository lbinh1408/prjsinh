# TS10 Learning Platform

# Sprint 3 Planning

Version: Sprint 3

Status: Planned

Previous Sprint: Sprint 2

---

# 1. Sprint Goal

Sprint 3 tập trung vào việc hoàn thiện trải nghiệm học tập.

Sau Sprint 2, project đã có kiến trúc ổn định.

Sprint 3 sẽ bổ sung các tính năng còn thiếu để website trở thành một MVP (Minimum Viable Product) hoàn chỉnh.

Sprint này **không thay đổi kiến trúc thư mục**.

---

# 2. Main Objectives

Hoàn thành các nhóm chức năng sau.

- Answer Management
- Score Management
- Lesson Progress
- Lesson Summary
- Analytics
- Unlock System
- New Components
- New Validators

---

# 3. Folder Structure

Sprint 3 giữ nguyên cấu trúc thư mục của Sprint 2.

Không được:

- đổi tên file
- đổi tên thư mục
- refactor kiến trúc

Chỉ:

- thêm file
- mở rộng chức năng
- sửa lỗi

---

# 4. New JavaScript Files

Sẽ bổ sung.

```
history.js

timer.js

analytics.js

unlock.js
```

---

# 5. New Components

Thêm các Component mới.

```
choice.js

trueFalse.js

matching.js

ordering.js

highlight.js

dragDrop.js

timeline.js

flashcard.js
```

---

# 6. New Validators

Thêm.

```
dragValidator.js

orderValidator.js

matchValidator.js

essayValidator.js
```

---

# 7. Existing Files To Update

Các file sẽ được mở rộng.

Core

- app.js
- router.js
- engine.js
- lessonEngine.js
- answerEngine.js
- scoreEngine.js
- renderer.js
- componentFactory.js

Services

- storage.js
- progress.js
- feedback.js
- hint.js
- summary.js
- sidebar.js
- keyboard.js
- animation.js
- utils.js

Components

- observe.js
- identify.js
- explain.js
- fillBlank.js
- reflection.js
- index.js

Validators

- textValidator.js
- choiceValidator.js
- blankValidator.js

Data

- roadmap.json
- lesson01.json
- lesson02.json
- lesson03.json
- assets.json

README.md

---

# 8. Features

## Answer Engine

- Save Answer
- Update Answer
- Retry
- Reset
- History

---

## Score Engine

- Step Score
- Lesson Score
- Module Score
- Percentage
- Grade

---

## Lesson Progress

- Completed Step
- Completed Lesson
- Completed Module
- Unlock Lesson

---

## Summary

Hiển thị.

- Score
- Accuracy
- Correct
- Wrong
- Time
- Recommendation

---

## Analytics

Thống kê.

- Learning Time
- Attempts
- Weak Topics
- Accuracy

---

## Animation

Thêm.

- Correct Animation
- Wrong Animation
- Progress Animation
- Completion Animation

---

# 9. JSON Improvements

Roadmap.

Thêm.

- prerequisite
- unlock
- stars
- xp

Lesson.

Thêm.

- difficulty
- timer
- reward
- hint
- feedback

---

# 10. Commit Plan

Sprint 3 chia thành khoảng 25 commit nhỏ.

Mỗi commit chỉ hoàn thành một nhiệm vụ.

Ví dụ.

```
Commit 01

History Service
```

```
Commit 02

Timer Service
```

```
Commit 03

Analytics Service
```

...

```
Commit 25

Sprint 3 Final Review
```

---


# 11. Expected Result

Sau Sprint 3.

Website có thể.

- học hoàn chỉnh
- chấm điểm
- lưu tiến trình
- mở khóa bài học
- thống kê
- hiển thị tổng kết
- hỗ trợ nhiều loại bài tập

---

# 12. Out of Scope

Sprint 3 sẽ không thực hiện.

- Backend
- Database
- Login
- CMS
- Teacher Dashboard
- AI Generate Lesson
- Online Sync

Các chức năng này thuộc Sprint 4 hoặc Sprint 5.

---

# 13. Definition of Done

Sprint 3 được coi là hoàn thành khi.

- Tất cả lesson hiện có vẫn hoạt động.
- Không phát sinh lỗi JavaScript.
- Không thay đổi kiến trúc.
- Các component mới hoạt động.
- Validator hoạt động đúng.
- Chấm điểm chính xác.
- Progress lưu thành công.
- Summary hiển thị đúng.
- Analytics ghi nhận dữ liệu.
- Unlock hoạt động.

---

# 14. Risks

Các rủi ro cần tránh.

- Thay đổi cấu trúc thư mục.
- Refactor quá sớm.
- Tăng độ phụ thuộc giữa các module.
- Component xử lý quá nhiều logic.
- Validator phụ thuộc Renderer.
- JSON không tương thích với Sprint 2.

---

# 15. Next Sprint Preview

Sau khi hoàn thành Sprint 3.

Sprint 4 sẽ tập trung vào.

- CMS
- Lesson Editor
- Dashboard
- AI Support
- Content Management
- Teacher Tools

---
# Approved Exception #001

Sprint: 3
Commit: 04

Reason:
Architecture review discovered a timer persistence flaw that could not be
correctly fixed within the originally planned file scope.

Approved additional files:
- storage.js
- summary.js

Approved by:
Tech Lead

Status:
Closed
End of Document