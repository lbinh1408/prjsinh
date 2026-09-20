# 05_ARCHITECTURE_DECISIONS.md

# Architecture Decision Records (ADR)

Version: 2.0

Status: Active

---

# Purpose

This document records the major architectural decisions made throughout the project.

Architecture decisions explain **why** a design choice was made.

They are long-term decisions and should remain stable.

Implementation details belong elsewhere.

---

# ADR-001

## Title

Vanilla JavaScript Architecture

### Status

Accepted

### Decision

The project uses Vanilla JavaScript (ES Modules).

No frontend framework will be introduced.

### Rationale

- lightweight
- easy to understand
- educational
- framework independent

---

# ADR-002

## Title

Layered Architecture

### Status

Accepted

### Decision

The project follows a layered architecture.

Application

↓

Lesson

↓

Business

↓

Rendering

↓

Component

↓

Validation

↓

Persistence

↓

Data

### Rationale

Provides separation of concerns.

Improves maintainability.

Reduces coupling.

---

# ADR-003

## Title

JSON-driven Lessons

### Status

Accepted

### Decision

Lessons are defined using JSON.

Lesson behavior is data-driven.

### Rationale

Allows non-programmers to create lesson content.

Simplifies maintenance.

Improves scalability.

---

# ADR-004

## Title

Independent Validators

### Status

Accepted

### Decision

Validators are responsible only for answer validation.

Validators never:

- render UI
- save data
- navigate lessons

### Rationale

Validation should remain centralized.

---

# ADR-005

## Title

Business Logic is UI Independent

### Status

Accepted

### Decision

Business modules should never depend directly on UI rendering.

### Rationale

Improves modularity.

Simplifies testing.

Allows UI evolution.

---

# ADR-006

## Title

Storage is Persistence Only

### Status

Accepted

### Decision

Storage only persists data.

Storage never performs:

- scoring
- validation
- rendering

### Rationale

Clear separation of responsibilities.

---

# ADR-007

## Title

Backward Compatibility

### Status

Accepted

### Decision

Sprint 2 lessons must continue to work.

Breaking existing lesson JSON is not allowed without a migration strategy.

### Rationale

Protects existing content.

Reduces regression risk.

---

# ADR-008

## Title

Components Render Only

### Status

Accepted

### Decision

Components are responsible only for:

- rendering
- collecting user interaction

Components never:

- score
- validate
- save storage
- navigate lessons

### Rationale

Keeps components reusable.

---

# ADR-009

## Title

Single Responsibility Principle

### Status

Accepted

### Decision

Each module should have one primary responsibility.

### Rationale

Improves readability.

Simplifies maintenance.

---

# ADR-010

## Title

Dependency Direction

### Status

Accepted

### Decision

Dependencies always point downward.

Lower layers must never depend on higher layers.

Circular dependencies are prohibited.

### Rationale

Prevents architecture erosion.

---

# ADR-011

## Title

Data-driven Extension

### Status

Accepted

### Decision

New lesson types should be added through JSON and reusable components whenever possible.

### Rationale

Minimizes code duplication.

---

# ADR-012

## Title

Minimal File Modification

### Status

Accepted

### Decision

Implementation should modify the minimum number of files necessary.

Additional file modifications are allowed only when required for:

- runtime integration
- lifecycle integration
- architecture preservation

### Rationale

Reduces unnecessary changes while allowing technically correct integration.

---

# ADR-013

## Title

Module-based Sprint Planning

### Status

Accepted

### Decision

Sprint 3 and future sprints are organized by modules rather than commits.

Modules represent architectural responsibilities.

Git commits are implementation details.

### Rationale

A single feature often spans multiple commits.

Modules are easier to review.

Modules better reflect software architecture.

---

# ADR-014

## Title

Integration Before Isolation

### Status

Accepted

### Decision

A feature is considered complete only after:

- runtime integration
- lifecycle integration
- persistence integration
- regression review

Implementation alone is insufficient.

### Rationale

Many defects only appear after integration.

Integration correctness has higher priority than isolated implementation.

---

# ADR-015

## Title

Review Before Completion

### Status

Accepted

### Decision

Every completed module must undergo:

- Architecture Review
- Runtime Review
- Lifecycle Review
- Integration Review
- Regression Review

before being considered finished.

### Rationale

Prevents hidden defects.

Ensures long-term maintainability.

---

# Future ADRs

When introducing a significant architectural decision:

1. Create a new ADR.

2. Never rewrite previous ADRs.

3. Reference related ADRs when appropriate.

Architecture evolves by adding decisions, not replacing history.

---

# Related Documentation

02_ARCHITECTURE.md

03_ROADMAP.md

08_SPRINT3_MODULE_SPEC.md