# 15_ARCHITECTURE_DECISIONS.md

# Architecture Decision Records (ADR)

## Purpose

This document records the architectural decisions that have been officially adopted for this project.

These decisions are considered **stable**.

Every future Sprint must respect these decisions unless a new Architecture Decision Record explicitly replaces them.

This document is intended for:

* Developers
* AI Coding Agents
* Code Reviewers
* Future Maintainers

---

# ADR-001

## Title

Framework-Free Architecture

## Status

Accepted

## Decision

The project shall remain a **Vanilla JavaScript** application.

No frontend framework shall be introduced.

Examples:

* React
* Vue
* Angular
* Svelte
* Next.js
* Nuxt

are intentionally excluded.

## Reason

The project is educational.

It must be easy to understand by students.

Small bundle size.

Simple deployment.

Minimal dependencies.

---

# ADR-002

## Title

Layered Architecture

## Status

Accepted

## Decision

The application shall follow the following layers.

Presentation

↓

Application

↓

Business

↓

Component

↓

Validation

↓

Persistence

↓

Utilities

↓

Data

Every module belongs to exactly one layer.

Business logic must never migrate into Presentation.

---

# ADR-003

## Title

Lesson Driven Architecture

## Status

Accepted

## Decision

Lessons are driven entirely by JSON.

Application code must not hardcode lesson content.

Every lesson is described using lesson JSON files.

## Reason

Allows teachers to create lessons without changing JavaScript.

---

# ADR-004

## Title

Component Factory Pattern

## Status

Accepted

## Decision

All interactive lesson types shall be created through ComponentFactory.

The factory is the single entry point for component creation.

## Constraints

Do not bypass ComponentFactory.

Do not instantiate components directly from Engine.

Backward compatibility must always be preserved.

---

# ADR-005

## Title

Independent Validators

## Status

Accepted

## Decision

Validation logic belongs only to Validator modules.

Components render UI.

Validators evaluate answers.

Business logic consumes validator results.

## Forbidden

Components performing score calculation.

Renderer performing validation.

---

# ADR-006

## Title

Engine Owns Lesson Flow

## Status

Accepted

## Decision

Engine controls:

* lesson lifecycle
* navigation
* transitions
* completion

Renderer only displays.

Components only interact.

---

# ADR-007

## Title

Storage Compatibility

## Status

Accepted

## Decision

LocalStorage schema must remain backward compatible.

Whenever storage changes:

* migrate
  or
* preserve compatibility

Never silently discard user progress.

---

# ADR-008

## Title

Backward Compatibility

## Status

Accepted

## Decision

Sprint 3 must never break Sprint 2 lessons.

Old lesson JSON files must continue working.

New features must be optional.

---

# ADR-009

## Title

No Large Refactoring During Sprint

## Status

Accepted

## Decision

Sprint implementation focuses on features.

Architecture redesign is prohibited during a Sprint.

Large refactoring requires a dedicated Sprint.

---

# ADR-010

## Title

One Commit — One Capability

## Status

Accepted

## Decision

Every commit introduces only one capability.

Examples

✔ History Service

✔ Timer

✔ Matching Component

✔ Flashcard Component

Not acceptable

✘ History + Timer

✘ Matching + Ordering

✘ Analytics + Unlock

---

# ADR-011

## Title

Public API Stability

## Status

Accepted

## Decision

Existing exported functions shall remain compatible.

Changing function signatures requires explicit approval.

If unavoidable,

stop implementation

and request confirmation.

---

# ADR-012

## Title

Minimal File Modification

## Status

Accepted

## Decision

Modify the minimum number of existing files.

Prefer creating new modules over rewriting existing ones.

Avoid touching unrelated files.

---

# ADR-013

## Title

Renderer Responsibilities

## Status

Accepted

## Renderer SHALL

* Render UI
* Update DOM
* Display Components

## Renderer SHALL NOT

* Validate answers
* Calculate scores
* Save storage
* Manage lesson progression

---

# ADR-014

## Title

Answer Engine Responsibilities

## Status

Accepted

## Answer Engine SHALL

* Collect answers
* Normalize answers
* Pass answers to Validators
* Pass results to Score Engine

## Answer Engine SHALL NOT

* Render UI
* Navigate lessons

---

# ADR-015

## Title

Score Engine Responsibilities

## Status

Accepted

## Score Engine SHALL

Calculate:

* Step Score
* Lesson Score
* Grade

## Score Engine SHALL NOT

Read DOM directly whenever a validator result is available.

---

# ADR-016

## Title

AI Development Rules

## Status

Accepted

## AI Agents MUST NOT

* redesign architecture
* rename folders
* rename modules
* move responsibilities
* replace working code
* introduce frameworks

AI Agents SHOULD

* preserve compatibility
* explain every modified file
* implement only the current commit
* stop if architectural changes become necessary

---

# ADR-017

## Title

Documentation First

## Status

Accepted

## Decision

Every Sprint must update documentation before implementation is considered complete.

Required updates include:

* Execution Plan (if approved changes occur)
* Checklist progress
* Project State
* README (if user-visible behavior changes)

---

# Future Decisions

Additional Architecture Decision Records shall be appended below.

Existing ADRs should never be modified unless officially superseded by a newer ADR.

When replacing an ADR:

* mark the previous ADR as "Superseded"
* reference the replacement ADR
* explain the reason for the change
