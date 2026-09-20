# Sprint 3 - Module: Roadmap & Lesson Loading

---

## Objective

Implement a dynamic lesson loading mechanism.

The application MUST NOT hardcode lesson paths anywhere in the UI or Engine.

All lessons must be discovered through `data/roadmap.json`.

---

# Scope

Implement the complete lesson loading flow.

```
Dashboard
    ↓
Select Module
    ↓
Select Lesson
    ↓
Router
    ↓
Roadmap Service
    ↓
Lesson Loader
    ↓
Engine
```

---

# Functional Requirements

## FR-01 Load roadmap

The application shall load:

```
data/roadmap.json
```

only once during application startup.

---

## FR-02 Dynamic Dashboard

The dashboard shall render all modules dynamically from roadmap.json.

Do not hardcode module names.

Example:

```
Từ loại

Cấu tạo từ

Nghĩa của từ

Biện pháp tu từ

...
```

must all come from roadmap.json.

---

## FR-03 Dynamic Lesson List

When a module is selected,

the application shall render its lesson list dynamically.

Example

```
Danh từ

Động từ

Tính từ
```

must be loaded from roadmap.json.

---

## FR-04 Lesson Selection

When a lesson is clicked,

the UI shall pass only

```
module id

lesson id
```

to the Router.

The UI MUST NOT know the lesson file path.

---

## FR-05 Roadmap Service

Create a Roadmap Service responsible for querying roadmap.json.

Suggested API

```javascript
getModules()

getModule(moduleId)

getLessons(moduleId)

getLesson(moduleId, lessonId)

getNextLesson(currentLesson)

getPreviousLesson(currentLesson)
```

---

## FR-06 Lesson Loader

Create a Lesson Loader.

Suggested API

```javascript
loadLesson(file)
```

Responsibilities

- fetch lesson json

- validate json

- return parsed lesson

---

## FR-07 Engine Integration

Engine.start()

shall receive

```
Lesson Object
```

NOT

```
file path
```

Example

```
GOOD

Engine.start(lesson)

BAD

Engine.start("lesson01.json")
```

---

## FR-08 Dynamic Step Count

The UI shall render

- progress bar

- step indicators

- summary

based on

```
lesson.steps.length
```

The number of steps MUST NOT be hardcoded.

---

## FR-09 Dynamic Navigation

Next Lesson

Previous Lesson

shall be resolved using

Roadmap Service,

NOT hardcoded lesson filenames.

---

## FR-10 Error Handling

If lesson loading fails,

display

```
Lesson not found.
```

If roadmap loading fails,

display

```
Unable to load roadmap.
```

Do not crash the application.

---

# Architecture

```
Dashboard

        │

        ▼

Router

        │

        ▼

Roadmap Service

        │

        ▼

Lesson Loader

        │

        ▼

Engine

        │

        ▼

Renderer
```

---

# Allowed Files

May Modify

```
js/app.js

js/router.js

js/utils.js
```

May Create

```
js/roadmap.js

js/lessonLoader.js
```

May Modify

```
data/roadmap.json
```

Must NOT Modify

```
lessonEngine.js

answerEngine.js

scoreEngine.js

storage.js

feedback.js

timer.js
```

---

# Definition of Done

✓ Dashboard is fully dynamic.

✓ Lesson list is fully dynamic.

✓ No hardcoded lesson filenames.

✓ Engine receives lesson object only.

✓ Lesson loading uses Lesson Loader.

✓ Roadmap Service is the single source of truth.

✓ Existing lessons continue to work.

✓ No regression introduced.