# 04_CODING_STYLE.md

# Coding Style Guide

Version: 2.0

Status: Active

---

# Purpose

This document defines the coding conventions and development rules for TS10 Learning.

All contributors and AI assistants must follow these guidelines to keep the codebase consistent, maintainable, and extensible.

---

# General Principles

Write simple code.

Write readable code.

Prefer clarity over cleverness.

Preserve existing architecture.

Keep modules loosely coupled.

Avoid unnecessary abstractions.

---

# Project Philosophy

Sprint 2 is the stable foundation.

Sprint 3 extends Sprint 2.

Do not rewrite working code.

Do not introduce complexity without clear benefits.

Every change should improve the project while preserving compatibility.

---

# File Organization

One file should have one primary responsibility.

Avoid creating utility files for only one or two helper functions.

Group related functionality together.

Do not move files between folders without architectural justification.

---

# Naming Conventions

## Files

Use camelCase.

Examples

answerEngine.js

lessonEngine.js

scoreEngine.js

dragValidator.js

timeline.js

---

## Classes

Use PascalCase.

Example

LessonEngine

ScoreEngine

AnswerEngine

Storage

---

## Functions

Use camelCase.

Function names should describe actions.

Examples

loadLesson()

saveAnswer()

calculateScore()

validate()

renderStep()

---

## Variables

Use descriptive names.

Prefer

currentLesson

currentStep

lessonScore

Instead of

a

b

tmp

x

---

## Constants

Use UPPER_SNAKE_CASE.

Example

DEFAULT_SCORE

MAX_RETRY

---

# Module Responsibilities

Every module should have one primary responsibility.

Example

Answer Engine

✓ collect answers

✓ normalize answers

✗ calculate score

✗ render UI

---

Score Engine

✓ calculate score

✓ grading

✗ read DOM

✗ manipulate UI

---

Validator

✓ validate answers

✗ save storage

✗ navigate lessons

---

Storage

✓ persist data

✗ calculate score

✗ validation

✗ rendering

---

# Function Design

Functions should be:

- short
- predictable
- easy to test

Prefer early return.

Avoid deeply nested conditions.

Keep functions focused on one task.

---

# Imports

Import only what is needed.

Avoid unused imports.

Avoid circular imports.

Prefer dependency direction defined in ARCHITECTURE.md.

---

# DOM Access Rules

Business modules should not directly access the DOM unless they are specifically responsible for rendering.

Preferred flow:

Component

↓

Answer

↓

Business Logic

Avoid:

Business Logic

↓

document.querySelector()

DOM access should remain inside rendering or component-related code whenever possible.

---

# State Management

Do not create duplicated state.

Each piece of information should have one source of truth.

Examples

Validation state

→ Validator

Score

→ Score Engine

Progress

→ Progress

History

→ History

Analytics

→ Analytics

---

# Error Handling

Fail gracefully.

Validate input.

Handle missing data.

Avoid silent failures.

Provide meaningful error messages when appropriate.

---

# JSON Rules

Lesson JSON should remain data-driven.

Do not embed executable logic inside JSON.

Keep schemas backward compatible.

New fields should remain optional whenever possible.

---

# Backward Compatibility

Existing Sprint 2 lessons must continue to work.

Existing validators must continue to work.

Existing components must continue to work.

Breaking changes require architectural approval.

---

# Development Workflow

Before coding:

- Understand the selected module.
- Identify integration points.
- Review architecture.
- Review current implementation.

During coding:

- Keep changes minimal.
- Preserve architecture.
- Add comments only when necessary.

After coding:

- Run self-review.
- Verify runtime flow.
- Verify lifecycle integration.
- Verify backward compatibility.

---

# AI Development Rules

The AI should:

- modify the minimum number of files necessary
- justify cross-module changes
- preserve architecture
- preserve backward compatibility
- avoid speculative refactoring

The AI should NOT:

- rewrite unrelated modules
- introduce new architecture
- move responsibilities between layers
- refactor for style only
- make unnecessary changes

---

# Code Review Checklist

Every implementation should verify:

Architecture

✓ responsibilities remain correct

✓ dependency direction is respected

✓ no circular dependency

Implementation

✓ feature works

✓ code is readable

✓ no duplicated logic

✓ no unused imports

Runtime

✓ feature is actually invoked

✓ no dead code

✓ lifecycle integration is complete

Persistence

✓ data is stored correctly

✓ data is restored correctly

Regression

✓ Sprint 2 functionality still works

---

# Documentation

When introducing a significant architectural change:

- update PROJECT_STATE.md if project status changes
- update AI_HANDOVER.md if future contributors need context
- update ARCHITECTURE_DECISIONS.md if an architectural decision is made

Do not modify documentation for implementation details that do not affect architecture.

---

# Related Documentation

- 02_ARCHITECTURE.md
- 05_ARCHITECTURE_DECISIONS.md
- 08_SPRINT3_MODULE_SPEC.md


----

# Documentation Maintenance

## Documentation Categories

The documentation is divided into two categories.

### Stable Documentation

These files describe the project itself and should change rarely.

- 01_PROJECT_GUIDE.md
- 02_ARCHITECTURE.md
- 03_ROADMAP.md
- 04_CODING_STYLE.md
- 05_ARCHITECTURE_DECISIONS.md

Only update these files when:

- project goals change
- architecture changes
- coding standards change
- long-term decisions change

---

### Working Documentation

These files describe the current implementation state.

- 06_PROJECT_STATE.md
- 07_AI_HANDOVER.md

Update these files whenever a module:

- starts
- completes
- becomes blocked
- changes status

---

## Documentation Rule

Do not modify the Stable Documentation after every module.

Normally, completing a module requires updating only:

- 06_PROJECT_STATE.md
- 07_AI_HANDOVER.md

The remaining documentation should remain unchanged unless a fundamental project decision has changed.