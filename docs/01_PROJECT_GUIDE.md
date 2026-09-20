# 01_PROJECT_GUIDE.md

# Project Guide

Version: 2.0

Status: Active

---

# Project Overview

TS10 Learning is a browser-based Vietnamese Literature Learning Platform designed to help students prepare for the Grade 10 Entrance Examination.

The platform focuses on learning through interaction rather than passive reading or traditional multiple-choice testing.

The project is implemented entirely with vanilla JavaScript and follows a modular architecture.

No frontend framework is used.

No backend service is required.

---

# Project Goals

The project aims to create an engaging learning experience by combining structured lessons, interactive exercises, immediate feedback, and long-term learning analytics.

Primary goals include:

- Improve student understanding rather than memorization.
- Encourage active learning.
- Support gradual skill development.
- Track learning progress over time.
- Keep the system extensible for future lesson types.

---

# Learning Philosophy

Every lesson should help the learner:

Observe

↓

Identify

↓

Explain

↓

Practice

↓

Reflect

Learning should emphasize understanding before assessment.

The platform is designed as a Learning Experience Platform (LXP), not merely an examination system.

---

# Core Learning Flow

Each lesson follows a consistent lifecycle.

Lesson

↓

Load lesson JSON

↓

Render current step

↓

Collect learner answer

↓

Validate answer

↓

Calculate score

↓

Provide feedback

↓

Save progress

↓

Move to next step

↓

Generate lesson summary

---

# Architecture Philosophy

The project follows these principles:

- Modular design
- Single responsibility
- Separation of concerns
- Data-driven lessons
- Reusable components
- Independent validators
- Backward compatibility

Business logic should remain independent from UI rendering.

Lesson content should remain independent from implementation code.

---

# Project Scope

Current scope includes:

- Lesson navigation
- Interactive learning
- Progress tracking
- Answer validation
- Lesson scoring
- Feedback system
- Local persistence
- Learning analytics
- Unlock progression
- Interactive learning components

Future versions may introduce:

- User accounts
- Cloud synchronization
- Teacher dashboard
- Online assessments
- AI-assisted learning

These are outside the current Sprint scope.

---

# Sprint Overview

Sprint 1

Established the initial project structure and basic lesson rendering.

Sprint 2

Completed the stable learning engine foundation, including:

- lesson engine
- renderer
- router
- component factory
- storage
- progress
- feedback
- hint
- sidebar
- five core learning components
- three foundational validators

Sprint 2 is considered stable.

Sprint 3 extends Sprint 2 without changing its architecture.

---

# Sprint 3 Philosophy

Sprint 3 introduces richer learning capabilities while preserving the existing architecture.

Sprint 3 is organized by **modules**, not by commits.

Each module represents one architectural responsibility.

Examples include:

- History
- Timer
- Scoring
- Summary
- Analytics
- Progress & Unlock
- Assessment Components
- Interactive Components
- Learning Components

One module may require multiple Git commits.

Commits are implementation details.

Modules are the planning and review unit.

---

# Project Constraints

The following constraints must always be respected.

Do not change the folder structure.

Do not rewrite Sprint 2.

Do not break backward compatibility.

Do not move responsibilities between layers.

Do not couple business logic with UI rendering.

Keep validators independent.

Keep lesson JSON data-driven.

---

# Technology Stack

Language

- JavaScript (ES Modules)

Frontend

- HTML5
- CSS3
- Vanilla JavaScript

Storage

- LocalStorage

Lesson Format

- JSON

No frameworks are used.

No backend server is required.

---

# Success Criteria

The project is considered successful when it provides:

- Stable lesson rendering
- Reliable answer validation
- Accurate scoring
- Smooth lesson progression
- Meaningful learner feedback
- Reliable progress persistence
- Rich interactive learning experiences
- Clean modular architecture
- Easy extensibility
- Backward compatibility

---

# Related Documentation

After reading this document, continue with:

1. 02_ARCHITECTURE.md

2. 03_ROADMAP.md

3. 04_CODING_STYLE.md

4. 05_ARCHITECTURE_DECISIONS.md

5. 06_PROJECT_STATE.md

6. 07_AI_HANDOVER.md

7. 08_SPRINT3_MODULE_SPEC.md