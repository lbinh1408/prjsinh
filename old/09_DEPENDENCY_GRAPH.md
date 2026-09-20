# TS10 Learning Platform

# Dependency Graph

Version: Sprint 2

Status: Stable

---

# Purpose

Tài liệu này mô tả quan hệ phụ thuộc giữa các module.

Mục tiêu:

- tránh circular dependency
- tránh coupling quá cao
- giúp AI biết file nào được phép sửa
- giúp lập trình viên không đặt sai logic

---

# Architecture Layers

```
Presentation Layer

↓

Application Layer

↓

Business Layer

↓

Component Layer

↓

Validation Layer

↓

Persistence Layer

↓

Data Layer
```

---

# Layer Mapping

Presentation

```
index.html

css/*
```

---

Application

```
app.js

router.js
```

---

Business

```
engine.js

lessonEngine.js

answerEngine.js

scoreEngine.js
```

---

Component

```
renderer.js

componentFactory.js

components/*
```

---

Validation

```
validators/*
```

---

Persistence

```
storage.js

progress.js

state.js
```

---

Utility

```
feedback.js

hint.js

summary.js

keyboard.js

sidebar.js

animation.js

utils.js
```

---

Data

```
roadmap.json

lesson*.json

assets.json
```

---

# Dependency Graph

```
index.html

↓

app.js

↓

router.js

↓

lessonEngine.js

↓

engine.js

↓

renderer.js

↓

componentFactory.js

↓

components

↓

validators

↓

answerEngine.js

↓

scoreEngine.js

↓

progress.js

↓

storage.js
```

---

# Allowed Dependencies

## index.html

May call

```
app.js
```

---

## app.js

May call

```
router.js

storage.js

sidebar.js
```

---

## router.js

May call

```
lessonEngine.js
```

---

## lessonEngine.js

May call

```
engine.js

renderer.js
```

---

## engine.js

May call

```
renderer.js

answerEngine.js

progress.js

storage.js
```

---

## renderer.js

May call

```
componentFactory.js
```

---

## componentFactory.js

May call

```
components/index.js
```

---

## components

May call

```
validators
```

Không gọi trực tiếp engine.

---

## validators

Không gọi module nào khác.

Chỉ xử lý dữ liệu.

---

## answerEngine.js

May call

```
scoreEngine.js

storage.js
```

---

## scoreEngine.js

May call

```
storage.js
```

---

## progress.js

May call

```
storage.js
```

---

## storage.js

Không phụ thuộc module nào.

---

# Utility Dependencies

feedback.js

Có thể được gọi bởi

```
engine

renderer
```

---

hint.js

Có thể được gọi bởi

```
engine
```

---

summary.js

Có thể được gọi bởi

```
engine
```

---

sidebar.js

Có thể được gọi bởi

```
app

router
```

---

keyboard.js

Có thể được gọi bởi

```
app
```

---

animation.js

Có thể được gọi bởi

```
renderer

feedback
```

---

utils.js

Được phép gọi bởi tất cả module.

Không phụ thuộc module khác.

---

# Forbidden Dependencies

renderer.js

KHÔNG ĐƯỢC

```
storage.js

progress.js

scoreEngine.js
```

---

component

KHÔNG ĐƯỢC

```
router.js

engine.js

storage.js
```

---

validator

KHÔNG ĐƯỢC

```
renderer.js

engine.js

router.js
```

---

storage.js

KHÔNG ĐƯỢC

```
renderer.js

component
```

---

progress.js

KHÔNG render HTML.

---

answerEngine.js

KHÔNG render HTML.

---

scoreEngine.js

KHÔNG render HTML.

---

# Circular Dependency Rules

Không được tạo.

Ví dụ sai.

```
engine

↓

renderer

↓

engine
```

---

Sai.

```
renderer

↓

component

↓

renderer
```

---

Sai.

```
answerEngine

↓

scoreEngine

↓

answerEngine
```

---

# Data Flow

```
Lesson JSON

↓

Lesson Engine

↓

Engine

↓

Renderer

↓

Component

↓

User

↓

Validator

↓

Answer Engine

↓

Score Engine

↓

Progress

↓

Storage
```

---

# Event Flow

```
User Click

↓

Component

↓

Validator

↓

Answer

↓

Score

↓

Progress

↓

Next Step
```

---

# Sprint 3 New Dependencies

history.js

```
answerEngine
```

---

timer.js

```
lessonEngine
```

---

analytics.js

```
progress

storage
```

---

unlock.js

```
progress

storage
```

---

choice.js

```
validator
```

---

matching.js

```
validator
```

---

dragDrop.js

```
validator
```

---

timeline.js

```
validator
```

---

flashcard.js

Không phụ thuộc module khác.

---

# AI Dependency Rules

AI phải:

✓ Giữ nguyên Layer.

✓ Không tạo Circular Dependency.

✓ Không gọi Storage từ Component.

✓ Không gọi Renderer từ Validator.

✓ Không gọi Engine từ Component.

✓ Không render HTML trong Business Layer.

✓ Không tính điểm trong Renderer.

✓ Không validate trong Renderer.

✓ Không lưu Storage trong Component.

---

# Dependency Checklist

Trước khi commit.

Kiểm tra.

□ Có tạo dependency mới không?

□ Có circular dependency không?

□ Có module nào đang làm nhiều hơn một nhiệm vụ không?

□ Có file nào gọi sai Layer không?

□ Có Component gọi Storage không?

□ Có Renderer gọi Validator không?

□ Có Validator thao tác DOM không?

Nếu có bất kỳ câu trả lời nào là "Có", phải sửa trước khi merge.

---

# Architecture Freeze

Sau Sprint 2.

Kiến trúc được coi là ổn định.

Sprint 3 chỉ được:

- thêm module
- mở rộng module
- sửa lỗi

Không được:

- đổi Layer
- đổi Folder
- đổi Responsibility
- refactor kiến trúc

---

End of Document