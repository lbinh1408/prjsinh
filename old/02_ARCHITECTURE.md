# TS10 Learning Platform

# Architecture Document

Version: Sprint 2

Status: Completed

---

# 1. Overall Architecture

Project sử dụng kiến trúc nhiều tầng (Layered Architecture).

```
Browser
    │
    ▼
index.html
    │
    ▼
app.js
    │
    ▼
router.js
    │
    ▼
lessonEngine.js
    │
    ▼
engine.js
    │
    ▼
renderer.js
    │
    ▼
componentFactory.js
    │
    ▼
Component
    │
    ▼
Validator
    │
    ▼
Answer Engine
    │
    ▼
Score Engine
    │
    ▼
Progress
    │
    ▼
Storage
```

Mỗi tầng chỉ chịu trách nhiệm cho một nhiệm vụ.

---

# 2. Folder Architecture

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

Không có framework.

Không có backend.

---

# 3. Application Lifecycle

Khi website mở:

```
index.html

↓

app.start()

↓

router.init()

↓

load roadmap

↓

render sidebar

↓

wait user
```

---

# 4. Lesson Lifecycle

Khi học sinh chọn bài.

```
Click Lesson

↓

Router

↓

LessonEngine

↓

Load JSON

↓

Engine.start()

↓

Renderer

↓

Observe
```

---

# 5. Step Lifecycle

Mỗi Step luôn có cùng quy trình.

```
Render

↓

User Input

↓

Validate

↓

Feedback

↓

Save

↓

Next
```

---

# 6. Lesson Structure

Một Lesson.

```
Lesson

↓

Step

↓

Component

↓

Validator
```

Ví dụ

```
Lesson01

↓

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

# 7. Component Architecture

Mỗi Component chịu trách nhiệm render chính nó.

```
Component

↓

render()

↓

bind()

↓

getAnswer()

↓

destroy()
```

Component không tự lưu dữ liệu.

---

# 8. Validator Architecture

Validator độc lập với Component.

```
Component

↓

Answer

↓

Validator

↓

Result
```

Result

```
correct

wrong

partial
```

---

# 9. Answer Flow

```
User

↓

Answer

↓

Validator

↓

AnswerEngine

↓

ScoreEngine

↓

Progress
```

---

# 10. Score Flow

```
Answer

↓

Correct

↓

Step Score

↓

Lesson Score

↓

Module Score
```

Sprint 2 mới hoàn thiện phần khung.

Sprint 3 sẽ hoàn thiện logic.

---

# 11. Progress Flow

```
Lesson

↓

Completed Step

↓

Completed Lesson

↓

Completed Module
```

---

# 12. Storage Flow

Storage sử dụng

```
localStorage
```

Các dữ liệu lưu.

```
progress

answer

score

setting
```

---

# 13. Renderer

Renderer chỉ làm nhiệm vụ hiển thị.

Không xử lý logic.

```
Renderer

↓

Render Step

↓

Render Component

↓

Update UI
```

---

# 14. Component Factory

Factory quyết định component nào sẽ được tạo.

```
observe

↓

ObserveComponent
```

```
identify

↓

IdentifyComponent
```

...

Factory không render.

---

# 15. Lesson Engine

Lesson Engine chịu trách nhiệm

- Load JSON

- Parse

- Current Step

- Next Step

- Previous Step

Không render UI.

---

# 16. Engine

Engine là bộ điều phối.

```
Lesson

↓

Renderer

↓

Answer

↓

Progress

↓

Storage
```

Engine không trực tiếp tạo HTML.

---

# 17. State

State lưu trạng thái hiện tại.

```
currentLesson

currentStep

currentComponent

progress
```

Không lưu dữ liệu lâu dài.

---

# 18. Data Architecture

```
roadmap.json

↓

lesson01.json

↓

steps[]

↓

component

↓

validator
```

---

# 19. Assets

Assets chia thành.

```
images

icons

audio

animation
```

Không chứa dữ liệu bài học.

---

# 20. Dependency Rules

Component

KHÔNG được gọi trực tiếp

Storage

Progress

Router

Engine

---

Validator

KHÔNG render HTML.

---

Renderer

KHÔNG validate.

---

Storage

KHÔNG render.

---

Engine

KHÔNG tạo HTML.

---

# 21. Error Handling

Nếu lesson lỗi.

```
Load Error

↓

Renderer Error

↓

Message

↓

Back Home
```

Không để website crash.

---

# 22. Extension Points

Sprint 3 sẽ mở rộng.

Components

```
Choice

Matching

Timeline

Flashcard

DragDrop
```

Validators

```
DragValidator

MatchValidator

EssayValidator
```

Services

```
Analytics

Unlock

History

Timer
```

---

# 23. Design Principles

Project tuân theo.

Single Responsibility Principle

Một file chỉ có một nhiệm vụ.

Low Coupling

Các module ít phụ thuộc nhau.

High Cohesion

Các hàm trong cùng file phục vụ cùng một mục tiêu.

Open for Extension

Có thể thêm Component mới mà không cần sửa Engine.

---

# 24. Architecture Stability

Trong Sprint 3:

Không đổi cấu trúc thư mục.

Không đổi tên file.

Chỉ mở rộng chức năng.

Refactor kiến trúc chỉ thực hiện sau Sprint 4 khi project đủ lớn.

---

End of Document