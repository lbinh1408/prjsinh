# 06_UI_GUIDELINES.md

# UI Development Guidelines

Version: 1.0

Applies to:

- Sidebar
- Dashboard
- Lesson View
- Summary
- History
- Settings
- Future UI modules

---

# Purpose

This document defines the UI architecture used throughout the project.

All UI components MUST follow these rules.

---

# 1. UI Responsibilities

The UI layer is responsible only for

- displaying data
- collecting user interaction
- dispatching events

The UI layer MUST NOT contain business logic.

---

# 2. Single Responsibility

Each UI component has exactly one responsibility.

Examples

Sidebar

- display roadmap
- select lesson

Dashboard

- display learning progress

Summary

- display lesson result

History

- display learning history

A component MUST NOT perform another component's responsibility.

---

# 3. Data Source

UI components MUST NOT hardcode data.

All data must come from:

roadmap.json

lesson.json

storage.js

history.js

analytics.js

or other service modules.

---

# 4. UI Must Not Know Business Logic

Incorrect

```
if(score > 80){

unlockLesson();

}
```

Correct

```
const result = Unlock.canAccess(id);

render(result);
```

Business logic belongs to service modules.

---

# 5. UI Must Not Modify Engine State

Forbidden

```
Engine.currentLesson = ...

Engine.score = ...

Engine.step = ...
```

UI communicates only through public APIs.

---

# 6. Navigation

Navigation is performed only through Router.

Correct

```
Router.navigateLesson(id)
```

Incorrect

```
loadLesson()

Engine.start()

render()

```

---

# 7. Storage Access

UI MUST NOT read LocalStorage directly.

Incorrect

```
localStorage.getItem(...)
```

Correct

```
Storage.loadProgress()

Storage.saveProgress()

```

---

# 8. Rendering

Rendering should always use data models.

Incorrect

```
div.innerHTML =
"<h1>Từ loại</h1>"
```

Correct

```
renderSubject(subject)
```

---

# 9. Component Communication

Preferred

```
Sidebar

↓

Router

↓

LessonLoader

↓

Engine

↓

Renderer
```

Avoid

```
Sidebar

↓

Engine

↓

Renderer
```

---

# 10. State Ownership

UI owns only

- selected tab
- expanded subject
- current scroll position
- temporary input

Business state belongs to Engine.

---

# 11. Styling

Use existing CSS files.

Do NOT create duplicate styles.

Example

sidebar.css

summary.css

dashboard.css

component.css

Avoid inline styles.

---

# 12. Icons

Icons should come from

assets/icons/

Avoid emoji unless explicitly required.

---

# 13. Responsive Design

All UI must support

Desktop

Tablet

Mobile

without changing business logic.

---

# 14. Accessibility

Buttons should have

- labels
- keyboard support
- visible focus

Avoid click-only interaction.

---

# 15. Error Handling

If data cannot be loaded

display

Loading...

or

Unable to load data.

Do NOT crash the application.

---

# 16. Performance

Avoid unnecessary rendering.

Render only when state changes.

Avoid rebuilding the entire page for small updates.

---

# 17. File Responsibilities

sidebar.js

Roadmap navigation only.

dashboard.js

Dashboard only.

summary.js

Lesson summary only.

history.js

History only.

Never mix responsibilities.

---

# 18. Dependency Rules

UI

↓

Router

↓

Service

↓

Engine

↓

Storage

Never reverse this dependency.

---

# 19. Allowed Dependencies

UI may use

Router

Storage

History

Analytics

Roadmap Service

Lesson Loader

UI must NOT directly depend on

Engine internals

Score internals

Answer internals

Lesson internals

---

# 20. Definition of Good UI

A UI module is considered complete when

✓ No hardcoded data

✓ Uses service layer

✓ Uses Router

✓ Single Responsibility

✓ Responsive

✓ Accessible

✓ No duplicated logic

✓ No business logic

✓ No direct storage access

✓ No direct engine manipulation

✓ Reusable

✓ Easy to maintain

---

# Golden Rule

UI displays information.

Services make decisions.

Engine executes lessons.

Storage persists data.

Each layer has exactly one responsibility.