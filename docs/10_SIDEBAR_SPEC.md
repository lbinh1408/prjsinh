# Sprint 3 - Module: Sidebar Navigation

---

# Objective

Implement a simple sidebar navigation for the learning system.

The sidebar shall display all learning subjects and their lessons using data from `data/roadmap.json`.

This module is responsible only for navigation.

Do NOT implement analytics, search, filters, achievements, or advanced progress.

---

# Scope

Implement:

- Subject list
- Expand / Collapse subjects
- Lesson list
- Current lesson highlight
- Completed lesson indicator
- Locked lesson indicator
- Lesson selection

Nothing more.

---

# UI Structure

```
📚 Lộ trình

▼ Từ loại

    ● Danh từ

    ✔ Động từ

    🔒 Tính từ

▶ Cấu tạo từ

▶ Nghĩa của từ

▶ Biện pháp tu từ

▶ Câu

▶ Đọc hiểu

▶ Nghị luận xã hội
```

Only one subject is expanded at a time.

---

# Functional Requirements

## FR-01 Load Roadmap

Load

```
data/roadmap.json
```

through Roadmap Service.

The sidebar MUST NOT hardcode any subject or lesson.

---

## FR-02 Render Subjects

Render every subject found in roadmap.json.

Display

- icon
- title
- description (optional)

Example

```
📚 Từ loại

🧩 Cấu tạo từ

📖 Đọc hiểu
```

---

## FR-03 Expand / Collapse

Each subject can be expanded.

When expanded,

its lesson list becomes visible.

Only ONE subject shall be expanded at a time.

---

## FR-04 Render Lessons

Render lessons belonging to the expanded subject.

Display

- lesson title
- lesson state

Do NOT display lesson description.

---

## FR-05 Current Lesson

Highlight the currently opened lesson.

Example

```
● Danh từ
```

Only one lesson can be current.

---

## FR-06 Completed Lesson

Completed lessons shall display

```
✔
```

before the title.

Example

```
✔ Danh từ
```

---

## FR-07 Locked Lesson

Locked lessons shall display

```
🔒
```

Locked lessons cannot be clicked.

---

## FR-08 Lesson Selection

Clicking an unlocked lesson shall

```
Router.navigateLesson(lessonId)
```

The sidebar MUST NOT load lesson files directly.

---

## FR-09 State Persistence

After navigation,

the sidebar shall automatically

- keep current subject expanded
- highlight current lesson

---

# Architecture

```
Sidebar

        │

        ▼

Roadmap Service

        │

        ▼

Router

        │

        ▼

Lesson Loader

        │

        ▼

Engine
```

Sidebar MUST NOT communicate directly with Engine.

---

# Allowed Files

May Modify

```
js/sidebar.js

css/sidebar.css

js/router.js

js/app.js
```

May Read

```
data/roadmap.json
```

Must NOT Modify

```
lessonEngine.js

answerEngine.js

scoreEngine.js

renderer.js

storage.js

timer.js
```

---

# Out of Scope

Do NOT implement

- XP
- Search
- Filter
- Achievement
- Statistics
- Analytics
- Drag & Drop
- Recent Lessons
- Favorite Lessons
- Multi Expand
- Infinite Tree

These belong to future sprints.

---

# Definition of Done

✓ Subjects are loaded dynamically.

✓ Lessons are loaded dynamically.

✓ One subject expanded at a time.

✓ Current lesson highlighted.

✓ Completed lessons display ✔.

✓ Locked lessons display 🔒.

✓ Clicking lesson navigates correctly.

✓ No hardcoded subjects.

✓ No hardcoded lessons.

✓ Existing lesson flow continues to work.

✓ No regression introduced.