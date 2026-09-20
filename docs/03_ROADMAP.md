# 03_ROADMAP.md

# Project Roadmap

Version: 2.0

Status: Active

---

# Purpose

This document describes the long-term development roadmap of TS10 Learning.

It provides a high-level view of project evolution across all development sprints.

Implementation details are intentionally omitted.

Detailed implementation plans are documented separately.

For Sprint 3 implementation details, refer to:

SPRiNT3_MODULE_SPEC.md

---

# Development Philosophy

The project evolves incrementally.

Each sprint extends the previous sprint while preserving architectural stability.

Completed functionality should never be rewritten without strong technical justification.

Every sprint must remain backward compatible whenever possible.

---

# Overall Development Timeline

Sprint 1

↓

Sprint 2

↓

Sprint 3

↓

Sprint 4

↓

Future Releases

---

# Sprint 1

Status

Completed

Objective

Build the initial project foundation.

Major Deliverables

- Project structure
- HTML entry point
- CSS organization
- Basic lesson rendering
- Initial lesson JSON
- Core application startup

Outcome

The project became runnable and established its initial structure.

---

# Sprint 2

Status

Completed

Objective

Build the core learning engine.

Major Deliverables

Application

- App initialization
- Routing

Learning Engine

- Lesson engine
- Renderer
- Component factory

Learning Features

- Observe
- Identify
- Explain
- Fill Blank
- Reflection

Validation

- Text validator
- Choice validator
- Blank validator

Persistence

- Storage
- Progress

User Experience

- Feedback
- Hint
- Sidebar
- Keyboard support
- Animation

Outcome

Sprint 2 established the stable architectural foundation of the project.

All future development extends Sprint 2 rather than replacing it.

---

# Sprint 3

Status

In Progress

Objective

Transform the core learning engine into a richer interactive learning platform.

Sprint 3 is organized by modules rather than commits.

Each module represents one architectural responsibility.

Implementation details are documented in:

SPRINT3_MODULE_SPEC.md

Major Modules

Module 01

History

Module 02

Timer

Module 03

Retry & Reset

Module 04

Scoring

Module 05

Summary

Module 06

Progress & Unlock

Module 07

Analytics

Module 08

Assessment Components

Module 09

Interactive Components

Module 10

Learning Components

Expected Outcome

Sprint 3 should provide:

- richer lesson lifecycle
- richer assessment
- better learner feedback
- learning analytics
- lesson progression
- unlock system
- reusable interactive components

without changing the existing architecture.

---

# Sprint 4

Status

Planned

Possible Objectives

- Teacher dashboard
- Student profiles
- User accounts
- Cloud synchronization
- Lesson management
- Online assessments
- Performance dashboard

Sprint 4 planning has not yet started.

---

# Long-Term Vision

The platform should evolve into a complete Learning Experience Platform (LXP).

Possible future capabilities include:

Learning

- adaptive learning
- personalized recommendations
- spaced repetition

Analytics

- learner dashboard
- learning trends
- weak topic detection

Administration

- teacher portal
- content management
- lesson authoring tools

Infrastructure

- cloud storage
- authentication
- synchronization

These goals are outside the current sprint scope.

---

# Current Project Status

Sprint 1

Completed

Sprint 2

Completed

Sprint 3

In Progress

Sprint 4

Planned

---

# Roadmap Principles

The roadmap follows these principles.

Preserve architecture.

Extend instead of rewrite.

Keep lessons backward compatible.

Keep modules independent.

Maintain a modular codebase.

Deliver incremental value every sprint.

---

# Success Criteria

The roadmap is successful when:

- each sprint builds on the previous sprint
- architecture remains stable
- backward compatibility is preserved
- new capabilities integrate naturally
- future expansion remains possible

---

# Related Documentation

For architecture:

02_ARCHITECTURE.md

For Sprint 3 implementation:

08_SPRINT3_MODULE_SPEC.md

For current project status:

06_PROJECT_STATE.md