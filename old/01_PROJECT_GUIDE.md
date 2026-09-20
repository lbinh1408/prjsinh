# TS10 Learning Platform

Version: Sprint 2
Status: Completed

---

# 1. Project Overview

TS10 Learning là nền tảng học Ngữ văn ôn thi tuyển sinh lớp 10.

Project được xây dựng theo mô hình **Learning Experience Platform (LXP)** thay vì LMS truyền thống.

Mục tiêu là giúp học sinh:

- Quan sát
- Tự phát hiện kiến thức
- Giải thích
- Luyện tập
- Phản tư

Thay vì:

```
Lý thuyết

↓

Bài tập

↓

Đáp án
```

TS10 Learning sử dụng quy trình:

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

---

# 2. Current Status

Current Sprint

```
Sprint 2
```

Completed

- Project Architecture
- Router
- Lesson Engine
- Renderer
- Component Factory
- Storage
- Progress
- Sidebar
- Feedback
- Hint
- Summary
- Keyboard
- Animation
- Validators
- Lesson JSON
- Roadmap JSON

Not Completed

- Multiple Choice
- Matching
- Drag Drop
- Highlight
- Timeline
- Flashcard
- Analytics
- Dashboard
- Unlock Lesson
- Gamification

---

# 3. Technology

Project sử dụng:

- HTML5
- CSS3
- Vanilla JavaScript (ES Module)

Không sử dụng

- React
- Vue
- Angular
- jQuery

Không sử dụng backend.

Dữ liệu lưu bằng

```
JSON
```

---

# 4. Folder Structure

```
index.html

css/

js/

components/

validators/

lessons/

data/

assets/
```

Không thay đổi cấu trúc thư mục trong Sprint 3.

---

# 5. Lesson Architecture

Một Lesson gồm nhiều Step.

```
Lesson

↓

Step

↓

Component

↓

Validator

↓

Answer

↓

Score
```

Ví dụ

```
lesson01.json

↓

step01

↓

observe

↓

step02

↓

identify

↓

step03

↓

explain

↓

step04

↓

fillBlank

↓

step05

↓

reflection
```

---

# 6. Component Types

Hiện tại

```
observe

identify

explain

fillBlank

reflection
```

Sprint 3 sẽ bổ sung

```
choice

trueFalse

matching

ordering

highlight

dragDrop

timeline

flashcard
```

---

# 7. Lesson Flow

Một bài học luôn đi theo thứ tự

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

↓

Summary
```

Không được thay đổi thứ tự này.

---

# 8. JSON Rules

Mọi lesson đều lưu bằng JSON.

Không được viết JavaScript object.

Không được comment trong JSON.

Không được xuống dòng trong string.

Sai

```json
"content": "
abc
xyz
"
```

Đúng

```json
"content":"abc\nxyz"
```

Hoặc

```json
"content":"abc<br>xyz"
```

---

# 9. Coding Rules

- ES Module
- Một file một nhiệm vụ
- Không dùng biến global
- Không dùng inline onclick
- Không dùng innerHTML khi có thể tránh
- Ưu tiên createElement()
- Hàm dưới 50 dòng nếu có thể
- Class dưới 300 dòng nếu có thể

---

# 10. Naming Convention

File

```
lessonEngine.js

answerEngine.js

scoreEngine.js
```

camelCase

Function

```
loadLesson()

renderStep()

validate()

saveAnswer()

nextStep()
```

Constant

```
MAX_SCORE

STEP_TYPES
```

---

# 11. Design Principles

Ưu tiên

- đơn giản
- dễ đọc
- dễ mở rộng

Không tối ưu sớm.

Không viết code thông minh nhưng khó hiểu.

---

# 12. Development Rules

Mỗi commit chỉ làm một nhiệm vụ.

Ví dụ

```
Add Summary

Fix Renderer

Update Progress

Create Matching Component
```

Không commit nhiều tính năng cùng lúc.

---

# 13. AI Rules

Khi AI sửa project này phải:

1. Đọc PROJECT_GUIDE.md trước.

2. Không đổi cấu trúc thư mục.

3. Không đổi tên file nếu không được yêu cầu.

4. Không đổi định dạng JSON.

5. Không đổi Lesson Flow.

6. Không thêm framework.

7. Chỉ sử dụng Vanilla JavaScript.

8. Luôn ưu tiên code đơn giản.

---

# 14. Current Sprint Goal

Sprint 2 đã hoàn thành.

Sprint tiếp theo là Sprint 3.

Sprint 3 sẽ tập trung vào:

- Answer Engine
- Score Engine
- Summary
- Progress
- Unlock Lesson
- Analytics
- Choice Component
- Matching Component
- Drag Drop Component
- Flashcard Component

Không refactor project trong Sprint 3.

---

# 15. Definition of Done

Một tính năng được coi là hoàn thành khi:

- Chạy không lỗi.
- Không làm hỏng lesson cũ.
- Không phá vỡ roadmap.
- Được render đúng.
- Validator hoạt động.
- Progress được cập nhật.
- Storage lưu thành công.

---

End of Document