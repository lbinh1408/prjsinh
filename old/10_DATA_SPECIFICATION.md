# TS10 Learning Platform

# Data Specification

Version: Sprint 2

Status: Stable

---

# Purpose

Tài liệu này mô tả toàn bộ cấu trúc dữ liệu của dự án.

Mọi JSON trong project phải tuân theo tài liệu này.

Không được tự ý thay đổi cấu trúc nếu không cập nhật tài liệu.

---

# Data Files

Hiện tại project có.

```
roadmap.json

assets.json

lesson01.json

lesson02.json

lesson03.json
```

Sprint 3 có thể bổ sung lesson mới.

---

# roadmap.json

## Purpose

Mô tả toàn bộ khóa học.

---

## Structure

```json
{
  "modules": []
}
```

---

## Module

```json
{
  "id": "",
  "title": "",
  "description": "",
  "icon": "",
  "lessons": []
}
```

---

## Lesson

```json
{
  "id": "",
  "title": "",
  "file": "",
  "difficulty": "",
  "estimatedTime": 0
}
```

---

## Rules

Module id phải duy nhất.

Lesson id phải duy nhất.

Lesson file phải tồn tại.

---

# lesson.json

## Purpose

Mô tả một bài học.

---

## Structure

```json
{
  "id": "",
  "title": "",
  "description": "",
  "steps": []
}
```

---

# Step

```json
{
  "id": "",
  "type": "",
  "title": "",
  "content": {}
}
```

---

# Step Types

Sprint 2.

```
observe

identify

explain

fillBlank

reflection
```

Sprint 3.

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

# Observe

```json
{
  "type":"observe",
  "content":{
      "text":""
  }
}
```

---

# Identify

```json
{
  "type":"identify",
  "content":{
      "question":"",
      "options":[]
  }
}
```

---

# Explain

```json
{
  "type":"explain",
  "content":{
      "question":"",
      "answer":""
  }
}
```

---

# FillBlank

```json
{
  "type":"fillBlank",
  "content":{
      "sentence":"",
      "answer":""
  }
}
```

---

# Reflection

```json
{
  "type":"reflection",
  "content":{
      "question":""
  }
}
```

---

# assets.json

## Purpose

Quản lý asset.

---

## Structure

```json
{
  "images": {},
  "icons": {},
  "audio": {},
  "animation": {}
}
```

---

# Naming Rules

Lesson.

```
lesson01.json

lesson02.json
```

Không dùng.

```
Lesson01.JSON
```

---

# ID Rules

Lesson.

```
lesson01
```

Step.

```
step01
```

Component.

```
observe01
```

Không trùng.

---

# JSON Rules

Không comment.

Không trailing comma.

Không xuống dòng trong string.

UTF-8.

Double Quotes.

---

# Compatibility

Sprint 3 phải tương thích dữ liệu Sprint 2.

Không được phá lesson cũ.

---

# Validation

AI phải kiểm tra.

- JSON hợp lệ.
- ID duy nhất.
- File tồn tại.
- Component tồn tại.
- Validator tồn tại.

---

# Future Extension

Sprint 3.

Có thể thêm.

```
difficulty

reward

xp

hint

feedback

timer

stars
```

Sprint 4.

Có thể thêm.

```
author

createdAt

updatedAt

tags

version
```

---

End of Document