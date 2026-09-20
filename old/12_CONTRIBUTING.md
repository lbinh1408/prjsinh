# TS10 Learning Platform

# Contributing Guide

Version: Sprint 2

Status: Active

---

# Welcome

Cảm ơn bạn đã đóng góp cho TS10 Learning.

Trước khi viết code, hãy đọc toàn bộ tài liệu trong thư mục **docs/**.

---

# Documentation Order

Đọc theo đúng thứ tự.

1.

PROJECT_GUIDE.md

↓

2.

ARCHITECTURE.md

↓

3.

ROADMAP.md

↓

4.

CODING_STYLE.md

↓

5.

SPRINT1.md

↓

6.

SPRINT2.md

↓

7.

SPRINT3.md

↓

8.

FILE_MAP.md

↓

9.

DEPENDENCY_GRAPH.md

↓

10.

DATA_SPECIFICATION.md

↓

11.

AI_DEVELOPMENT_GUIDE.md

---

# Development Workflow

Mọi tính năng mới đều theo quy trình.

```
Read Docs

↓

Understand

↓

Plan

↓

Implement

↓

Self Review

↓

Testing

↓

Commit

↓

Update Docs
```

Không được bỏ qua bước nào.

---

# Current Project Status

Current Sprint

```
Sprint 2 Completed
```

Current Target

```
Sprint 3
```

Không được triển khai Sprint 4 hoặc Sprint 5 nếu chưa có yêu cầu.

---

# Branch Naming

Sử dụng.

Feature

```
feature/history-service
```

```
feature/lesson-summary
```

Bug

```
fix/router-navigation
```

```
fix/storage-loading
```

Refactor

```
refactor/component-factory
```

Document

```
docs/update-roadmap
```

---

# Commit Message

Một commit chỉ giải quyết một vấn đề.

Ví dụ.

```
Add History Service
```

```
Implement Lesson Timer
```

```
Fix Renderer Navigation
```

```
Update Lesson JSON
```

Không sử dụng.

```
Fix everything
```

```
Update project
```

```
Final version
```

---

# Pull Request Checklist

Trước khi merge.

- Đọc tài liệu.
- Không thay đổi kiến trúc.
- Không tạo circular dependency.
- Không đổi format JSON.
- Không thêm framework.
- Không đổi lesson flow.
- Không gây lỗi console.
- Không phá lesson cũ.

---

# Architecture Rules

Sprint 2 được xem là kiến trúc chuẩn.

Không được.

- đổi cấu trúc thư mục
- đổi tên module
- gộp module
- chia module
- thay đổi Layer

Nếu thật sự cần,

phải cập nhật.

ARCHITECTURE.md

FILE_MAP.md

DEPENDENCY_GRAPH.md

---

# File Responsibility

Mỗi file chỉ có một trách nhiệm.

Ví dụ.

Renderer

Render UI

Engine

Điều phối

Storage

Lưu dữ liệu

Validator

Kiểm tra dữ liệu

Không được chuyển logic giữa các file.

---

# Folder Rules

Không tự ý tạo thư mục mới.

Nếu cần.

Phải giải thích lý do.

---

# New File Rules

Mỗi file mới.

- Có Purpose rõ ràng.
- Không trùng chức năng.
- Được cập nhật vào FILE_MAP.md.

---

# JSON Rules

Mọi JSON.

- UTF-8
- Double Quotes
- Không comment
- Không trailing comma

Sau khi sửa.

Phải kiểm tra JSON hợp lệ.

---

# Coding Rules

Tuân thủ.

CODING_STYLE.md

Không ngoại lệ.

---

# Dependency Rules

Tuân thủ.

DEPENDENCY_GRAPH.md

Không được.

- Circular Dependency
- Cross Layer Dependency
- Hidden Dependency

---

# Testing Checklist

Trước khi commit.

Kiểm tra.

- Website khởi động.
- Không lỗi Console.
- Lesson tải thành công.
- Navigation hoạt động.
- Progress hoạt động.
- Storage hoạt động.
- Component hoạt động.
- Validator hoạt động.

---

# Documentation Rules

Nếu thay đổi.

Architecture

↓

Cập nhật

ARCHITECTURE.md

---

Nếu thêm file.

↓

Cập nhật

FILE_MAP.md

---

Nếu thay đổi dependency.

↓

Cập nhật

DEPENDENCY_GRAPH.md

---

Nếu thay đổi JSON.

↓

Cập nhật

DATA_SPECIFICATION.md

---

Nếu hoàn thành Sprint.

↓

Cập nhật.

SPRINT3.md

ROADMAP.md

README.md

---

# AI Contributor Rules

Nếu contributor là AI.

Phải.

- Đọc toàn bộ docs.
- Giữ nguyên kiến trúc.
- Chỉ sửa file cần thiết.
- Giải thích file sẽ sửa.
- Tự review trước khi trả lời.

Không được.

- Refactor toàn bộ project.
- Đổi framework.
- Đổi cấu trúc thư mục.
- Viết lại module đang ổn định.

---

# Code Review Checklist

Reviewer cần kiểm tra.

- Coding Style.
- Architecture.
- Dependency.
- Naming.
- JSON.
- Backward Compatibility.
- Console Error.
- Performance.
- Readability.

Mọi bug được báo cáo phải kèm theo:

Execution trace (call chain)
Expected behavior
Actual behavior
Root cause
Impact
Fix proposal (không bắt buộc ở vòng review đầu)
---

# Definition of Done

Một feature chỉ hoàn thành khi.

- Code chạy.
- Không lỗi Console.
- Đã test.
- Đã review.
- Đã cập nhật tài liệu (nếu cần).
- Không phá kiến trúc.
- Có thể merge.

---

# Long-term Principles

TS10 Learning hướng tới.

- Clean Architecture.
- Modular Design.
- High Maintainability.
- High Readability.
- Low Coupling.
- High Cohesion.
- JSON Driven Content.
- Vanilla JavaScript First.

Mọi đóng góp cần tôn trọng các nguyên tắc này.

---

End of Document