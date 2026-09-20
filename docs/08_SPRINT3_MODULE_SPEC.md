# 18_SPRINT3_MODULE_SPEC.md

# Sprint 3 Module Specification

Version: 2.0

Status: Active

---

# Purpose

Sprint 3 is organized by **modules**, not commits.

Each module represents one architectural capability.

A module is considered complete only after:

- implementation
- architecture review
- runtime review
- lifecycle review
- integration review
- regression review

have all passed.

Reviewers must evaluate modules **only against the requirements defined in this document**.

Do not introduce additional requirements based solely on personal preference or best practices.

---

# Review Rule

A review may report:

✅ PASS

⚠ Improvement

❌ FAIL

A module receives **FAIL only if it violates**:

- Functional Requirements
- Architecture Decisions (ADR)
- Coding Style
- Existing Sprint 2 compatibility

Missing optional improvements should be reported as:

⚠ Improvement

not FAIL.

---

# MODULE 1

## History

### Objective

Store learner answer history for every lesson step.

---

### Functional Requirements

- Save answer history.
- Restore answer history.
- Support answer updates.
- Preserve Sprint 2 compatibility.

---

### Non Functional Requirements

- No circular dependency.
- No duplicated persistence logic.
- History module owns history only.

---

### Non Requirements

History module is **NOT** required to:

- implement undo
- implement redo
- display history UI
- synchronize across devices

---

### Files

New

history.js

Modify

storage.js

answerEngine.js

lessonEngine.js

---

### Integration Points

Storage

Lesson Engine

Answer Engine

---

### Acceptance Criteria

History is correctly stored.

History survives page reload.

History restoration works.

---

### Review Scope

Architecture

Runtime

Lifecycle

Integration

Regression

---

### Definition of Done

History works.

Reviews passed.

Documentation updated.

---

# MODULE 2

## Timer

### Objective

Measure lesson duration.

---

### Functional Requirements

- Start timer when lesson starts.
- Stop timer when lesson ends.
- Save elapsed lesson time.
- Summary can display elapsed time.

---

### Non Functional Requirements

- Timer logic independent from UI.
- Persistence separated from runtime.
- No impact on lesson flow.

---

### Non Requirements

Timer is **NOT** required to:

- resume after page refresh
- synchronize across browser tabs
- continue running while browser is closed
- save every second
- support pause/resume

---

### Files

New

timer.js

Modify

engine.js

storage.js

summary.js

---

### Integration Points

Engine

Storage

Summary

---

### Acceptance Criteria

Timer starts.

Timer stops.

Elapsed time saved.

Summary displays time.

---

### Review Scope

Do NOT fail because:

- timer resets after refresh
- timer does not auto resume
- timer is not continuously persisted

Those are optional future improvements.

---

### Definition of Done

Timer works.

Reviews passed.

Documentation updated.

---

# MODULE 3

## Retry & Reset

### Objective

Allow learners to retry the current step.

---

### Functional Requirements

- Retry current step.
- Reset current answer.
- Preserve other steps.

---

### Non Requirements

Not required to:

- undo multiple steps
- restore deleted answers
- version answers

---

# MODULE 4

## Scoring

### Objective

Calculate lesson scores.

---

### Functional Requirements

- Calculate score per step.
- Calculate lesson total.
- Support current component types.
- Preserve Sprint 2 scoring.

---

### Non Requirements

Not required to:

- grading system
- XP
- achievements
- leaderboard

---

# MODULE 5

## Summary

### Objective

Display lesson summary.

---

### Functional Requirements

- Display score.
- Display elapsed time.
- Display completion.
- Display accuracy.

---

### Non Requirements

Not required to:

- printable report
- PDF export
- charts

---

# MODULE 6

## Progress & Unlock

### Objective

Track learning progress.

---

### Functional Requirements

- Update progress.
- Mark lesson complete.
- Unlock next lesson.

---

### Non Requirements

Not required to:

- cloud sync
- multi-device sync
- teacher dashboard

---

# MODULE 7

## Analytics

### Objective

Collect learner statistics.

---

### Functional Requirements

- Store attempts.
- Store accuracy.
- Store study time.

---

### Non Requirements

Not required to:

- charts
- AI recommendation
- predictive analytics

---

# MODULE 8

## Assessment Components

Modules

Choice

True / False

Matching

Ordering

---

### Functional Requirements

Each component shall:

- render correctly
- collect answer
- integrate with validator
- integrate with answer engine

---

### Non Requirements

Not required to:

- animations
- accessibility optimization
- keyboard shortcuts

---

# MODULE 9

## Interactive Components

Modules

Highlight

Drag & Drop

Timeline

Flashcard

---

### Functional Requirements

Each component shall:

- render correctly
- collect interaction
- save answer
- validate answer

---

### Non Requirements

Not required to:

- touch gestures
- mobile optimization
- complex animation

---

# Review Workflow

Each completed module must pass:

Architecture Review

↓

Runtime Review

↓

Lifecycle Review

↓

Integration Review

↓

Regression Review

↓

Documentation Update

↓

Module Complete

Only then may the next module begin.

---

# Documentation Update

After a module is completed, update only:

- 06_PROJECT_STATE.md
- 07_AI_HANDOVER.md

Do not modify the remaining project documentation unless the project architecture or long-term decisions have changed.