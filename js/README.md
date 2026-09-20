# TS10 Learning Platform

> Sprint 2 Architecture

Website học Ngữ văn tuyển sinh lớp 10 theo mô hình **Learning Experience** (Observe → Identify → Explain → Fill Blank → Reflection).

---

# Mục tiêu

Thay vì làm website chỉ gồm:

```
Lý thuyết
↓

Bài tập
↓

Đáp án
```

TS10 Learning hướng tới:

```
Quan sát

↓

Nhận biết

↓

Thông hiểu

↓

Vận dụng

↓

Phản tư
```

Học sinh sẽ **tự xây dựng kiến thức**, không học thuộc.

---

# Sprint 2

Sprint 2 hoàn thiện kiến trúc nền.

Bao gồm

- Router
- Lesson Engine
- Renderer
- Component Factory
- Answer Engine
- Score Engine
- Progress
- Storage
- Sidebar
- Feedback
- Keyboard Shortcut
- Animation
- Validator

---

# Cấu trúc thư mục

```
ts10-learning/

│
├── index.html
│
├── css/
│      app.css
│      lesson.css
│      component.css
│      animation.css
│      layout.css
│      sidebar.css
│      feedback.css
│      responsive.css
│
├── js/
│      app.js
│      router.js
│      engine.js
│      lessonEngine.js
│      answerEngine.js
│      scoreEngine.js
│      renderer.js
│      componentFactory.js
│      storage.js
│      progress.js
│      state.js
│      feedback.js
│      hint.js
│      summary.js
│      keyboard.js
│      sidebar.js
│      animation.js
│      utils.js
│
├── components/
│      observe.js
│      identify.js
│      explain.js
│      fillBlank.js
│      reflection.js
│      index.js
│
├── validators/
│      textValidator.js
│      choiceValidator.js
│      blankValidator.js
│
├── data/
│      roadmap.json
│
├── lessons/
│
│   ├── tu-loai/
│   │      lesson01.json
│   │      lesson02.json
│   │      lesson03.json
│   │
│   ├── cau-tao-tu/
│   ├── nghia-tu/
│   ├── bptt/
│   ├── cau/
│   ├── doc-hieu/
│   └── nlxh/
│
├── assets/
│      images/
│      icons/
│      audio/
│      animation/
│
├── assets.json
│
└── README.md
```

---

# Luồng hoạt động

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

observe
identify
explain
fillBlank
reflection
```

---

# Kiến trúc dữ liệu

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

↓

answer

↓

score
```

---

# Luồng xử lý

```
Load Lesson

↓

Render Step

↓

User Answer

↓

Validator

↓

Score Engine

↓

Progress

↓

Storage

↓

Next Step
```

---

# Các loại Component hiện có

| Component | Chức năng |
|-----------|-----------|
| Observe | Quan sát |
| Identify | Nhận biết |
| Explain | Thông hiểu |
| FillBlank | Điền khuyết |
| Reflection | Vận dụng cao |

Sprint 3 sẽ bổ sung thêm:

- Choice
- Drag & Drop
- Matching
- Highlight
- Sort
- Timeline
- Flashcard
- Mindmap
- Paragraph Builder
- Essay Editor

---

# Các Validator

| File | Mục đích |
|------|----------|
| textValidator | Kiểm tra câu trả lời dạng văn bản |
| choiceValidator | Trắc nghiệm |
| blankValidator | Điền khuyết |

Sprint 3 sẽ bổ sung:

- orderValidator
- dragValidator
- paragraphValidator
- essayValidator

---

# Các Engine

| Engine | Vai trò |
|---------|----------|
| LessonEngine | Nạp bài học |
| AnswerEngine | Quản lý đáp án |
| ScoreEngine | Chấm điểm |
| Renderer | Hiển thị giao diện |
| Progress | Theo dõi tiến trình |

---

# Dữ liệu được lưu

LocalStorage

```
Lesson Progress

Current Step

Answers

Score

Settings
```

---

# Sprint 2 đã hoàn thành

✅ Kiến trúc thư mục

✅ Router

✅ Lesson Engine

✅ Component Factory

✅ Renderer

✅ Progress

✅ Storage

✅ Sidebar

✅ Validator

✅ Summary

✅ Keyboard Shortcut

✅ Animation

✅ 5 Component đầu tiên

---

# Sprint 3

Mục tiêu của Sprint 3:

- Hoàn thiện Answer Engine
- Chấm điểm tự động
- Điều hướng bài học
- Component Drag Drop
- Component Matching
- Component Highlight
- Component Timeline
- Component Mindmap
- Component Essay
- Dashboard học tập
- Learning Analytics
- Gamification (ở mức nhẹ)

---

# Sprint 4

- CMS tạo bài học trực quan
- Import từ Word / Excel
- AI hỗ trợ sinh bài học
- Dashboard giáo viên
- Theo dõi học sinh
- Cloud Sync
- Đóng gói thành nền tảng học trực tuyến

---

© TS10 Learning Platform