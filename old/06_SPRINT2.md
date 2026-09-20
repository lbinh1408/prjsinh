# TS10 Learning Platform

# Sprint 2

Version: Sprint 2

Status: Completed

---

# 1. Sprint Goal

Sprint 2 tập trung vào việc xây dựng kiến trúc hoàn chỉnh cho hệ thống.

Đây là Sprint quan trọng nhất của nền tảng vì tất cả các Sprint sau sẽ phát triển dựa trên kiến trúc này.

Sprint 2 không tập trung vào số lượng tính năng mà tập trung vào khả năng mở rộng.

---

# 2. Objectives

Hoàn thành:

- Project Architecture
- Lesson Architecture
- Component Architecture
- Validator Architecture
- Router
- Renderer
- Engine
- Storage
- Progress
- Sidebar
- Lesson JSON
- Roadmap JSON

---

# 3. Folder Structure

Sau Sprint 2.

```
index.html

css/

js/

components/

validators/

data/

lessons/

assets/

docs/
```

Kiến trúc này sẽ được giữ nguyên trong Sprint 3.

---

# 4. CSS

Đã hoàn thành.

- app.css
- lesson.css
- component.css
- animation.css
- layout.css
- sidebar.css
- feedback.css
- responsive.css

---

# 5. JavaScript

Đã hoàn thành.

Core

- app.js
- router.js
- engine.js
- lessonEngine.js
- answerEngine.js
- scoreEngine.js
- renderer.js
- componentFactory.js
- storage.js
- progress.js
- state.js
- feedback.js
- hint.js
- summary.js
- keyboard.js
- sidebar.js
- animation.js
- utils.js

---

# 6. Components

Đã hoàn thành.

- Observe
- Identify
- Explain
- FillBlank
- Reflection

Đây là 5 component nền tảng của hệ thống.

---

# 7. Validators

Đã hoàn thành.

- Text Validator
- Choice Validator
- Blank Validator

Các validator hoạt động độc lập với Component.

---

# 8. Data

Đã hoàn thành.

```
roadmap.json

assets.json

lesson01.json

lesson02.json

lesson03.json
```

Lesson được mô tả hoàn toàn bằng JSON.

---

# 9. Lesson Flow

Sau Sprint 2.

```
Observe

↓

Identify

↓

Explain

↓

FillBlank

↓

Reflection
```

Flow này được coi là chuẩn của dự án.

---

# 10. Architecture

Đã hoàn thành.

```
App

↓

Router

↓

Lesson Engine

↓

Engine

↓

Renderer

↓

Component Factory

↓

Component

↓

Validator

↓

Storage
```

---

# 11. Current Capabilities

Website hiện có thể.

- Load roadmap.
- Load lesson.
- Render component.
- Điều hướng giữa các bước.
- Hiển thị sidebar.
- Đọc dữ liệu JSON.
- Kiểm tra dữ liệu cơ bản.
- Lưu tiến trình đơn giản.

---

# 12. Limitations

Sau Sprint 2 chưa có.

- Lesson Score
- Module Score
- Analytics
- Unlock Lesson
- Dashboard
- Multiple Choice
- Matching
- Drag Drop
- Flashcard
- Timeline
- Achievement
- Gamification

---

# 13. Technical Decisions

Trong Sprint 2 đã thống nhất.

## Vanilla JavaScript

Không sử dụng framework.

---

## ES Modules

Toàn bộ project sử dụng import/export.

---

## JSON First

Toàn bộ dữ liệu bài học được lưu bằng JSON.

Không hard-code dữ liệu.

---

## One File - One Responsibility

Mỗi file chỉ chịu trách nhiệm cho một chức năng.

---

## Layered Architecture

Project chia thành nhiều tầng độc lập.

---

# 14. Issues Resolved

Trong Sprint 2 đã xử lý.

- Chuẩn hóa cấu trúc thư mục.
- Chuẩn hóa Lesson JSON.
- Chuẩn hóa Roadmap JSON.
- Sửa lỗi JSON không hợp lệ.
- Đồng nhất tên file.
- Đồng nhất luồng render.

---

# 15. Definition of Done

Sprint 2 được coi là hoàn thành khi.

- Kiến trúc ổn định.
- Lesson render đúng.
- Router hoạt động.
- Component hoạt động.
- Validator hoạt động.
- JSON hợp lệ.
- Không còn lỗi kiến trúc.

---

# 16. Next Sprint

Sprint 3 sẽ tập trung vào việc hoàn thiện trải nghiệm học tập.

Các mục tiêu.

## Answer Engine

- Save Answer
- Retry
- History

## Score Engine

- Step Score
- Lesson Score
- Module Score

## Progress

- Unlock Lesson
- Statistics

## Summary

- Score
- Time
- Mistakes

## Analytics

- Study Time
- Accuracy
- Attempts

## Components

- Choice
- TrueFalse
- Matching
- Ordering
- Highlight
- DragDrop
- Timeline
- Flashcard

---

# 17. Sprint Summary

Sprint 2 đã hoàn thành mục tiêu quan trọng nhất của dự án:

- Xây dựng kiến trúc nền.
- Chuẩn hóa cấu trúc thư mục.
- Chuẩn hóa dữ liệu JSON.
- Xây dựng các module cốt lõi.
- Tạo nền tảng để phát triển Sprint 3.

Từ Sprint 3 trở đi, trọng tâm sẽ chuyển từ **xây dựng kiến trúc** sang **xây dựng tính năng**.

---

End of Document