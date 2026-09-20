# 17_AI_HANDOVER.md

# AI Handover Document

> **Purpose**
>
> This document is used to transfer project context from one AI Coding Agent to another.
>
> It records:
>
> * Current implementation status
> * Completed work
> * Current focus
> * Pending tasks
> * Known issues
> * Important reminders
>
> Every new AI Coding Agent should read this document before writing any code.

---

# Current Project Snapshot

Project

Vietnamese Literature Learning Platform

Architecture

Framework-Free Vanilla JavaScript

Current Sprint

Sprint 3

Project Status

Sprint 2 Completed

Sprint 3 In Progress (Commit 04 completed)

Current Branch

main

---

# Current Commit

Commit ID

Commit 04

Title

Timer Persistence

Status

Completed

---

# Completed Work

The following work has already been completed.

## Sprint 1

Completed

---

## Sprint 2

Completed

Including:

* Core Architecture
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
* Observe
* Identify
* Explain
* FillBlank
* Reflection
* Validators
* Lesson JSON
* Assets JSON
* Roadmap JSON

---

# Current Objective

Continue Sprint 3 implementation from Commit 02.

Follow the approved Sprint 3 Execution Plan exactly.

Do not redesign architecture.

Do not change folder structure.

---

# Current Focus

Commit 04 is now complete.

The current work should focus on

Commit 05

Step Score

---

# Completed Commits

Commit 00 — Storage Migration

Commit 01 — History Service

Commit 02 — History Integration

Commit 03 — Timer Core

Commit 04 — Timer Persistence

---

# Next Commits

Commit 05

Step Score

...

Follow the approved execution order.

---

# Documents That Must Be Read

Before implementing anything, read:

1.

00_READ_FIRST.md

2.

01_PROJECT_GUIDE.md

3.

02_ARCHITECTURE.md

4.

15_ARCHITECTURE_DECISIONS.md

5.

13_SPRINT3_EXECUTION_PLAN.md

6.

14_SPRINT3_CHECKLIST.md

7.

16_PROJECT_STATE.md

---

# Files That Must Remain Stable

Do not modify unless explicitly required.

* app.js
* router.js
* engine.js
* renderer.js
* lessonEngine.js
* componentFactory.js
* progress.js
* state.js

---

# Current Risks

* Storage migration must preserve old data.
* Existing Sprint 2 lessons must continue to work.
* Validators must remain independent.
* Public APIs should remain unchanged.

---

# Known Issues

Current project limitations before Sprint 3.

* No History
* No Timer
* No Retry
* No Analytics
* No Unlock
* Limited Components
* Storage schema version 2 is now active after Commit 00

---

# AI Working Rules

The AI Coding Agent MUST

* follow the execution plan
* implement one commit at a time
* preserve backward compatibility
* explain modified files
* run the commit checklist
* stop if architecture changes become necessary

---

# AI MUST NOT

* redesign architecture
* introduce frameworks
* rename folders
* merge multiple commits
* modify files outside the approved scope
* change public APIs without approval
* silently change JSON format

---

# Before Declaring a Commit Complete

Verify that:

* All checklist items are completed.
* Tests pass.
* No console errors exist.
* Documentation is updated.
* Rollback is possible.

---

# Handover Notes

This section should be updated whenever AI work stops.

Template

Previous AI

Name

Date

Current Commit

Summary

Files Modified

Pending Work

Known Problems

Suggested Next Step

---

# Example

Previous AI

GitHub Copilot Agent

Date

2026-07-16

Current Commit

Commit 03

Summary

Implemented Timer Core.

Files Modified

* engine.js
* lessonEngine.js

Files Created

* timer.js

Pending Work

Timer persistence has not yet been implemented.

Known Problems

None

Suggested Next Step

Start Commit 04 according to the Sprint 3 Execution Plan.

---

# Update Policy

Update this document whenever:

* AI session ends.
* AI quota is exhausted.
* Development is handed over to another AI.
* A commit is completed but the Sprint is not finished.

This document should always describe the latest handover status of the project.
