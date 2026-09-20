# TS10 Learning Platform

# AI Development Guide

Version: Sprint 2

Status: Active

---

# 1. Purpose

This document defines how AI coding assistants must work on this project.

Supported assistants include:

- GitHub Copilot
- GitHub Copilot Agent
- Continue
- Cursor
- ChatGPT Desktop
- Other AI coding agents

The goal is to ensure all code changes are:

- predictable
- incremental
- architecture-safe
- easy to review

---

# 2. Before Writing Code

Before changing any file, ALWAYS read the following documents in order.

1.

PROJECT_GUIDE.md

2.

ARCHITECTURE.md

3.

ROADMAP.md

4.

CODING_STYLE.md

5.

SPRINT2.md

6.

SPRINT3.md

7.

FILE_MAP.md

8.

DEPENDENCY_GRAPH.md

9.

DATA_SPECIFICATION.md

Do not start coding before reading them.

---

# 3. Understand First

Before implementing anything, AI must understand:

- current sprint
- architecture
- folder structure
- lesson flow
- component system
- validator system
- data format

If any information is unclear,

STOP

and ask for clarification.

Never guess.

---

# 4. Sprint Policy

Current state

Sprint 2

Completed

Current target

Sprint 3

Do NOT implement Sprint 4 features.

Do NOT implement Sprint 5 features.

---

# 5. Architecture Freeze

Sprint 2 architecture is considered stable.

AI must NOT

- rename folders
- rename files
- replace architecture
- merge modules
- split modules
- introduce frameworks

Only extend existing architecture.

---

# 6. One Commit = One Feature

Each implementation should represent one logical commit.

Examples.

Good

```
Commit 01

history.js
```

Good

```
Commit 02

timer.js
```

Bad

```
Implement entire Sprint 3
```

---

# 7. Minimal Changes

Modify only files required.

If implementing

history.js

Do NOT modify

renderer.js

unless necessary.

---

# 8. Explain File Changes

Before editing,

AI should explain

which files will change

and why.

Example.

```
Files

history.js

new service

answerEngine.js

integrate history

No other files required.
```

---

# 9. Respect Responsibilities

Every file has one responsibility.

Do NOT move logic between modules.

Example.

Renderer

must never calculate score.

Validator

must never update DOM.

Storage

must never render UI.

---

# 10. Dependency Rules

Never create

circular dependency.

Respect

DEPENDENCY_GRAPH.md.

---

# 11. Coding Rules

Follow

CODING_STYLE.md

without exception.

---

# 12. JSON Rules

All JSON must remain compatible.

Never

change existing lesson format

without updating

DATA_SPECIFICATION.md.

---

# 13. Backward Compatibility

Sprint 3

must support

all Sprint 2 lessons.

Never break old lessons.

---

# 14. Feature Checklist

Before implementation.

AI should ask internally.

Does this already exist?

Can it reuse existing service?

Can it extend instead of replace?

---

# 15. New Files

Before creating a file.

Check

FILE_MAP.md.

If similar functionality exists,

extend existing module.

Do not duplicate logic.

---

# 16. Error Handling

Never ignore errors.

Every async call

should have

error handling.

Every JSON load

should validate existence.

---

# 17. Review Before Finish

Before returning code,

review

Architecture

Dependencies

Unused imports

Unused variables

Naming

JSON

ES Modules

Console errors

---

# 18. Never Do

Never

rewrite project

replace architecture

change folder structure

change lesson flow

change JSON format

introduce framework

replace Vanilla JS

---

# 19. Preferred Workflow

Step 1

Read docs.

↓

Step 2

Understand architecture.

↓

Step 3

Explain implementation plan.

↓

Step 4

Implement.

↓

Step 5

Self review.

↓

Step 6

Return result.

---

# 20. If Unsure

When uncertain,

ask.

Never invent architecture.

Never invent file responsibilities.

Never assume hidden features.

---

# 21. Pull Request Style

Every implementation should include.

Summary

Files changed

Reason

Possible risks

Testing performed

---

# 22. Code Quality

Prefer

readability

over

clever code.

Prefer

small functions

over

large functions.

---

# 23. Performance

Avoid

premature optimization.

Optimize

only when necessary.

---

# 24. Testing

Every feature should be tested.

Minimum.

- loads correctly
- no console error
- lesson still works
- navigation still works

---

# 25. AI Golden Rules

Always.

Read documentation first.

Preserve architecture.

Keep commits small.

Modify minimum files.

Respect responsibilities.

Respect dependencies.

Maintain backward compatibility.

If uncertain,

ask first.

---

End of Document