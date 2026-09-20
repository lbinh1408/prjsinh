# 16_PROJECT_STATE.md

# Project State

> This document represents the **current state of the project**.
>
> It must always reflect the latest implementation status.
>
> Every AI Coding Agent should read this file before making any changes.

---

# Project Information

Project Name

Vietnamese Literature Learning Platform

Architecture

Framework-Free Vanilla JavaScript

Current Branch

main

Development Model

Sprint-Based Development

Current Phase

Sprint 3

---

# Current Status

Sprint 1

✅ Completed

Sprint 2

✅ Completed

Sprint 3

In progress (Commit 04 completed)

Sprint 4

Not Started

---

# Current Commit

Commit ID

Commit 04

Title

Timer Persistence

Status

Completed

Description

Persisted lesson timer data into storage and surfaced it through the summary flow while preserving Sprint 2 compatibility.

---

# Next Commit

Commit 05

Step Score

---

# Sprint Progress

Current Sprint

Sprint 3

Progress

20%

Completed Commits

5

Remaining Commits

21

---

# Architecture Status

Architecture

Stable

Folder Structure

Stable

Public APIs

Stable

JSON Format

Stable

Storage Schema

Version 2

Migration Required

Completed (Commit 00)

---

# Features Completed

## Sprint 1

* Basic project structure
* Initial HTML/CSS
* Lesson loading
* Basic rendering

---

## Sprint 2

* Router
* Engine
* Lesson Engine
* Renderer
* Component Factory
* Answer Engine
* Score Engine
* Storage
* Progress
* Feedback
* Hint
* Summary
* Sidebar
* Keyboard
* Animation
* Utilities

Components

* Observe
* Identify
* Explain
* Fill Blank
* Reflection

Validators

* Text
* Choice
* Blank

JSON Lessons

* Roadmap
* Lesson01
* Lesson02
* Lesson03
* Assets

---

# Sprint 3 Planned Features

Foundation

* Storage Migration ✅ Completed
* History ✅ Completed
* Timer ✅ Completed
* Retry
* Reset

Scoring

* Step Score
* Lesson Score
* Grade

Summary

* Summary UI
* Statistics
* Recommendation

Analytics

* Attempts
* Accuracy
* Weak Topics
* Learning Time

Progress

* Unlock

Components

* Choice
* TrueFalse
* Matching
* Ordering
* Highlight
* DragDrop
* Timeline
* Flashcard

---

# Files Considered Stable

These files should only be modified if absolutely necessary.

app.js

router.js

engine.js

lessonEngine.js

renderer.js

componentFactory.js

storage.js

progress.js

state.js

---

# Files Under Active Development

These files are expected to change during Sprint 3.

answerEngine.js

scoreEngine.js

summary.js

feedback.js

hint.js

sidebar.js

animation.js

utils.js

validators/

components/

lessons/

---

# Architecture Constraints

The following rules MUST NOT be violated.

* Do not redesign the architecture.
* Do not introduce frontend frameworks.
* Do not rename folders.
* Do not move responsibilities between layers.
* Do not replace ComponentFactory.
* Do not bypass Validators.
* Do not break Sprint 2 lessons.
* Do not change public APIs without approval.

---

# Known Issues

Current known limitations.

* History integration implemented; follow-up polish remains optional.
* No retry mechanism.
* No timer.
* No analytics.
* No unlock logic.
* Limited scoring.
* Only five interactive components.
* Storage schema requires migration before Sprint 3.

---

# Current Risks

Medium

Reasons

* Storage migration affects existing user data.
* Component expansion increases integration complexity.
* New validators must remain compatible with current architecture.

---

# Definition of Success

Sprint 3 is considered complete when:

* All planned commits are merged.
* All Sprint 2 lessons remain functional.
* All new components work correctly.
* No architectural rules are violated.
* Documentation is updated.
* No critical bugs remain.

---

# Required Reading Order for New AI Agents

Before making any code changes, read these documents in order:

1. 00_READ_FIRST.md
2. 01_PROJECT_GUIDE.md
3. 02_ARCHITECTURE.md
4. 15_ARCHITECTURE_DECISIONS.md
5. 13_SPRINT3_EXECUTION_PLAN.md
6. 14_SPRINT3_CHECKLIST.md
7. This document (16_PROJECT_STATE.md)

Do not start implementation until all documents have been reviewed.

---

# Update Rules

After every completed commit:

Update:

* Current Commit
* Next Commit
* Sprint Progress
* Completed Commits
* Storage Schema Version (if changed)
* Known Issues (if resolved)
* Current Risks (if changed)

This document should always describe the latest state of the project.
