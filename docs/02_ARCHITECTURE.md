# 02_ARCHITECTURE.md

# Architecture

Version: 2.0

Status: Active

---

# Purpose

This document describes the technical architecture of TS10 Learning.

It defines:

- system structure
- layer responsibilities
- runtime lifecycle
- lesson flow
- dependency rules
- module integration
- architectural constraints

All implementation must follow this architecture.

---

# Architecture Overview

TS10 Learning is a browser-based learning platform built with Vanilla JavaScript.

The project follows a layered architecture.

Each layer has a single responsibility.

Business logic is separated from rendering logic.

Lesson data is JSON-driven.

The architecture is intentionally simple, framework-independent, and highly extensible.

---

# High-Level Architecture

Browser

↓

Application Layer

↓

Routing Layer

↓

Lesson Layer

↓

Business Layer

↓

Rendering Layer

↓

Component Layer

↓

Validation Layer

↓

Persistence Layer

↓

Data Layer

---

# Folder Structure

index.html

css/

js/

components/

validators/

data/

lessons/

assets/

docs/

The folder structure is considered stable.

Sprint 3 extends the existing architecture without changing the folder layout.

---

# Layer Responsibilities

## Application Layer

Main entry point.

Responsibilities

- application startup
- initialization
- global configuration
- bootstrapping

Main file

app.js

---

## Routing Layer

Responsible for navigation.

Responsibilities

- route parsing
- lesson selection
- page navigation
- URL synchronization

Main file

router.js

---

## Lesson Layer

Coordinates lesson execution.

Responsibilities

- load lesson
- step navigation
- lesson lifecycle
- lesson completion

Main file

lessonEngine.js

---

## Business Layer

Contains learning logic.

Responsibilities

- answer handling
- scoring
- progress
- history
- timer
- analytics
- unlock
- feedback

Main files

answerEngine.js

scoreEngine.js

progress.js

history.js

timer.js

analytics.js

unlock.js

---

## Rendering Layer

Responsible for rendering UI.

Responsibilities

- render lesson
- render step
- update screen
- refresh UI

Main file

renderer.js

---

## Component Layer

Provides reusable interaction components.

Examples

Observe

Identify

Explain

Fill Blank

Reflection

Choice

True/False

Matching

Ordering

Highlight

Drag & Drop

Timeline

Flashcard

Components only render UI and collect user interaction.

---

## Validation Layer

Responsible only for validation.

Validators determine correctness.

Validators never:

- render UI
- access storage
- control navigation
- calculate total score

Validators are the single source of truth for answer validation.

---

## Persistence Layer

Responsible for saving data.

Responsibilities

- answers
- progress
- history
- timer
- analytics
- settings

Main file

storage.js

Storage never performs business logic.

---

## Data Layer

Contains static project data.

Examples

lesson JSON

roadmap

assets

settings

The Data Layer contains no executable logic.

---

# Dependency Rules

Dependencies always point downward.

Application

↓

Lesson

↓

Business

↓

Renderer

↓

Component

↓

Validator

↓

Storage

↓

Data

Higher layers may depend on lower layers.

Lower layers should never depend on higher layers.

Avoid circular dependencies.

---

# Runtime Lifecycle

Every lesson follows the same runtime lifecycle.

Application Start

↓

Router resolves lesson

↓

Lesson loads

↓

Renderer renders current step

↓

Component collects learner answer

↓

Answer Engine processes answer

↓

Validator validates answer

↓

Score Engine calculates score

↓

Feedback is generated

↓

Storage persists data

↓

Progress updates

↓

History records answer

↓

Analytics records activity

↓

Next step renders

↓

Lesson completes

↓

Summary renders

↓

Unlock next lesson

Every Sprint 3 module must integrate into this lifecycle where appropriate.

---

# Lesson Flow

Each lesson follows a consistent learning flow.

Load Lesson

↓

Render Step

↓

Observe

↓

Identify

↓

Explain

↓

Practice

↓

Reflect

↓

Feedback

↓

Save Progress

↓

Next Step

↓

Lesson Summary

This flow should remain consistent across all lesson types.

---

# Module Integration

Sprint 3 is organized by modules.

Each module represents one architectural responsibility.

Modules include:

History

Timer

Retry & Reset

Scoring

Summary

Progress & Unlock

Analytics

Assessment Components

Interactive Components

Learning Components

A module may modify multiple files.

Cross-module changes are acceptable when required for:

- runtime integration
- lifecycle integration
- architecture preservation
- dependency updates

Every additional file modification must have a technical justification.

---

# Architectural Principles

Single Responsibility

Every module should have one primary responsibility.

Separation of Concerns

Rendering, business logic, validation, and persistence remain independent.

Backward Compatibility

Sprint 2 lessons must continue to work.

Minimal Changes

Modify only the files required for the current module.

Data Driven

Lesson behaviour should be controlled by JSON whenever possible.

Extensibility

New lesson types should be added without rewriting existing modules.

---

# Common Anti-Patterns

❌ Component directly accesses Storage.

Correct approach

Component

↓

Answer Engine

↓

Storage

---

❌ Score Engine reads the DOM.

Correct approach

Component

↓

Answer

↓

Score Engine

---

❌ Validator modifies UI.

Correct approach

Validator

↓

Validation Result

↓

Renderer / Feedback

---

❌ Storage performs business logic.

Correct approach

Business Layer

↓

Storage

---

❌ Components control lesson navigation.

Correct approach

Component

↓

Answer Engine

↓

Lesson Engine

↓

Renderer

---

# Architectural Review Checklist

Every module review must verify:

Architecture

✓ Layer responsibilities remain correct

✓ Dependency direction is respected

✓ No circular dependency

✓ No duplicated responsibility

Runtime

✓ Feature is actually invoked

✓ No dead code

✓ No unreachable logic

Lifecycle

✓ Proper initialization

✓ Proper update

✓ Proper completion

✓ Proper reset

Persistence

✓ Data is correctly stored

✓ Data is correctly restored

Validation

✓ Validators remain independent

✓ Validation is centralized

Regression

✓ Sprint 2 lessons still work

✓ Existing components still function

✓ Existing validators still function

---

# Definition of Architectural Success

The architecture is considered healthy when:

- responsibilities remain clearly separated
- runtime lifecycle is complete
- business logic remains independent from UI
- validation remains centralized
- storage remains isolated
- dependency direction remains correct
- Sprint 2 compatibility is preserved
- new modules integrate without architectural changes

---

# Related Documentation

Continue reading:

- 03_ROADMAP.md
- 04_CODING_STYLE.md
- 05_ARCHITECTURE_DECISIONS.md
- 06_PROJECT_STATE.md
- 07_AI_HANDOVER.md
- 08_SPRINT3_MODULE_SPEC.md