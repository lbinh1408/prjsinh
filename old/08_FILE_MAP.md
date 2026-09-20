# TS10 Learning Platform

# File Responsibility Map

Version: Sprint 2

Status: Stable

---

# Purpose

Tài liệu này mô tả trách nhiệm của từng file trong dự án.

AI phải đọc tài liệu này trước khi sửa code.

Mỗi file chỉ có **một trách nhiệm chính**.

Không được chuyển trách nhiệm giữa các file nếu không có yêu cầu.

---

# Root

---

## index.html

### Purpose

Entry point của website.

### Responsibilities

- Load CSS
- Load JavaScript
- Tạo layout chính
- Khởi động ứng dụng

### Forbidden

- Không chứa business logic.
- Không xử lý dữ liệu.
- Không validate.

### Used By

Browser

### Status

Stable

---

# js/

---

## app.js

### Purpose

Khởi tạo toàn bộ ứng dụng.

### Responsibilities

- Start application
- Load Router
- Load Roadmap
- Khởi tạo Service

### Allowed Dependencies

router.js

storage.js

sidebar.js

### Forbidden

- Không render HTML.
- Không validate.
- Không tính điểm.

### Status

Stable

Sprint 3:

Mở rộng để khởi tạo

- Analytics
- Timer
- Unlock

---

## router.js

### Purpose

Điều hướng.

### Responsibilities

- Route
- Lesson navigation
- Page navigation

### Forbidden

- Không render.
- Không lưu dữ liệu.

### Status

Stable

---

## engine.js

### Purpose

Coordinator của toàn bộ Lesson.

### Responsibilities

- Điều phối Lesson
- Điều phối Renderer
- Điều phối Progress

### Forbidden

- Không render HTML.
- Không validate.
- Không thao tác DOM trực tiếp.

### Status

Stable

Sprint 3:

Mở rộng Answer Flow.

---

## lessonEngine.js

### Purpose

Điều khiển Lesson.

### Responsibilities

- Load Lesson
- Next Step
- Previous Step
- Restart Lesson

### Forbidden

- Không render.
- Không lưu Storage.

### Status

Stable

---

## renderer.js

### Purpose

Render giao diện.

### Responsibilities

- Render Component
- Update DOM
- Refresh UI

### Forbidden

- Không validate.
- Không tính điểm.
- Không lưu dữ liệu.

### Status

Stable

---

## componentFactory.js

### Purpose

Factory tạo Component.

### Responsibilities

- Đăng ký Component
- Khởi tạo Component

### Forbidden

- Không render.
- Không validate.

### Status

Stable

Sprint 3:

Đăng ký thêm

- Matching
- Choice
- Flashcard

---

## answerEngine.js

### Purpose

Quản lý câu trả lời.

### Responsibilities

- Save Answer
- Load Answer
- Update Answer

### Forbidden

- Không render.
- Không validate.

### Status

Developing

Sprint 3:

Hoàn thiện.

---

## scoreEngine.js

### Purpose

Quản lý điểm.

### Responsibilities

- Step Score
- Lesson Score
- Module Score

### Forbidden

- Không render.

### Status

Developing

Sprint 3:

Hoàn thiện.

---

## storage.js

### Purpose

Lưu dữ liệu.

### Responsibilities

- Save
- Load
- Remove

### Forbidden

- Không render.
- Không validate.

### Status

Stable

---

## progress.js

### Purpose

Theo dõi tiến trình.

### Responsibilities

- Lesson Progress
- Module Progress

### Forbidden

- Không render.

### Status

Stable

Sprint 3:

Unlock Lesson.

---

## state.js

### Purpose

Quản lý trạng thái hiện tại.

### Responsibilities

- Current Lesson
- Current Step
- Current Component

### Forbidden

- Không lưu localStorage.

### Status

Stable

---

## feedback.js

### Purpose

Hiển thị phản hồi.

### Responsibilities

- Correct
- Wrong
- Partial

### Forbidden

- Không validate.

### Status

Stable

---

## hint.js

### Purpose

Hiển thị gợi ý.

### Responsibilities

- Hint
- Suggestion

### Status

Stable

---

## summary.js

### Purpose

Hiển thị tổng kết.

### Responsibilities

- Lesson Summary

### Status

Developing

Sprint 3:

Hoàn thiện.

---

## keyboard.js

### Purpose

Keyboard Shortcut.

### Responsibilities

- Enter
- Arrow
- ESC

### Status

Stable

---

## sidebar.js

### Purpose

Sidebar.

### Responsibilities

- Lesson List
- Progress
- Navigation

### Status

Stable

Sprint 3:

Unlock UI.

---

## animation.js

### Purpose

Animation.

### Responsibilities

- Correct Animation
- Wrong Animation

### Status

Stable

---

## utils.js

### Purpose

Utility Functions.

### Responsibilities

Các hàm dùng chung.

### Forbidden

Không phụ thuộc module khác.

### Status

Stable

---

# components/

---

## observe.js

Purpose

Observe Component.

Status

Stable

---

## identify.js

Purpose

Identify Component.

Status

Stable

---

## explain.js

Purpose

Explain Component.

Status

Stable

---

## fillBlank.js

Purpose

Fill Blank Component.

Status

Stable

---

## reflection.js

Purpose

Reflection Component.

Status

Stable

---

## index.js

Purpose

Đăng ký toàn bộ Component.

Status

Stable

Sprint 3:

Đăng ký thêm Component mới.

---

# validators/

---

## textValidator.js

Purpose

Text Validation.

Status

Stable

---

## choiceValidator.js

Purpose

Choice Validation.

Status

Stable

---

## blankValidator.js

Purpose

Blank Validation.

Status

Stable

---

# data/

---

## roadmap.json

Purpose

Roadmap.

Status

Stable

Sprint 3:

Thêm prerequisite.

---

## assets.json

Purpose

Asset Mapping.

Status

Stable

---

# lessons/

---

## lesson01.json

Purpose

Lesson Demo.

Status

Stable

---

## lesson02.json

Purpose

Lesson Demo.

Status

Stable

---

## lesson03.json

Purpose

Lesson Demo.

Status

Stable

---

# Sprint 3 New Files

Các file sau sẽ được thêm.

history.js

timer.js

analytics.js

unlock.js

choice.js

matching.js

dragDrop.js

timeline.js

flashcard.js

dragValidator.js

matchValidator.js

orderValidator.js

essayValidator.js

---

# AI Rules

AI phải tuân thủ:

- Không đổi Purpose của file.
- Không chuyển Responsibility sang file khác.
- Không refactor kiến trúc.
- Chỉ mở rộng theo Sprint 3.
- Nếu cần sửa nhiều file, phải giữ đúng Responsibility của từng file.

---

End of Document