# 00_READ_FIRST.md

# READ THIS FIRST

Version: 2.0

Status: Active

---

# Purpose

This document is the entry point for every AI assistant working on this project.

Before reading any source code or implementing any feature, read this document completely.

Failure to follow this workflow may introduce architectural inconsistencies or regressions.

---

# About This Project

This project is a browser-based Vietnamese Literature Learning Platform for Grade 10 Entrance Exam preparation.

The project follows a modular architecture built with vanilla JavaScript.

Current project status:

- Sprint 1: Completed
- Sprint 2: Completed
- Sprint 3: In Progress

Sprint 2 is considered stable and is the architectural foundation of the project.

Sprint 3 extends Sprint 2 without rewriting it.

---

# Required Reading Order

Read the documentation in the following order.

1.
01_PROJECT_GUIDE.md

Understand the project goals and learning philosophy.

2.
02_ARCHITECTURE.md

Understand the architecture and module responsibilities.

3.
03_ROADMAP.md

Understand the long-term development roadmap.

4.
04_CODING_STYLE.md

Follow coding conventions.

5.
05_ARCHITECTURE_DECISIONS.md

Read all Architecture Decision Records (ADR).

6.
06_PROJECT_STATE.md

Understand the current implementation status.

7.
07_AI_HANDOVER.md

Understand previous implementation history and important notes.

8.
08_SPRINT3_MODULE_SPEC.md

This is the single source of truth for Sprint 3.

---

# Sprint 3 Development Strategy

Sprint 3 is organized by **modules**, NOT by commits.

A module represents one complete architectural responsibility.

Examples:

- History
- Timer
- Scoring
- Analytics
- Progress & Unlock
- Assessment Components
- Interactive Components

A module may require multiple Git commits.

Commits are implementation details.

Modules are the planning unit.

---

# Sprint 3 Workflow

For every new task:

Step 1

Read SPRINT3_MODULE_SPEC.md.

Step 2

Choose exactly ONE module.

Step 3

Understand:

- objective
- responsibilities
- deliverables
- architecture rules

Step 4

Inspect the existing implementation.

Do not assume documentation and implementation are identical.

Always verify the current code.

Step 5

Implement only the selected module.

Step 6

Perform self-review.

Step 7

Verify runtime integration.

Step 8

Verify lifecycle integration.

Step 9

Verify no regression.

Step 10

Only after the module passes review should implementation continue to the next module.

---

# Architecture Principles

Always preserve Sprint 2 architecture.

Do NOT rewrite the project.

Do NOT change folder structure.

Do NOT move responsibilities between modules.

Business logic must remain outside UI components.

Validators remain the single source of truth for validation.

Existing lesson JSON files must continue to work.

Backward compatibility is mandatory.

---

# File Modification Policy

There is NO fixed list of "allowed files".

Instead:

Modify the minimum number of files required to correctly implement the selected module.

Additional files may be modified when necessary for:

- lifecycle integration
- runtime integration
- architecture preservation
- regression fixes
- dependency updates

Every additional modified file must have a clear technical justification.

Avoid unnecessary changes.

---

# Before Writing Code

Always identify:

- which module is being implemented
- affected modules
- integration points
- lifecycle impact
- persistence impact
- backward compatibility impact

Never start coding before understanding these items.

---

# After Implementation

Every module must be reviewed for:

Architecture

- Layer separation
- Responsibility boundaries
- Dependency direction

Runtime

- Feature is actually invoked
- No dead code
- No unreachable logic

Lifecycle

- Proper initialization
- Proper update
- Proper completion
- Proper reset

Persistence

- Storage correctness
- Reload correctness

Regression

- Existing Sprint 2 lessons still work
- Existing components still function
- Existing validators still function

Code Quality

- No circular dependency
- No duplicated responsibility
- No unused imports
- No unnecessary complexity

---

# AI Responsibilities

The AI is expected to:

- preserve architecture
- preserve compatibility
- minimize code changes
- explain architectural decisions
- justify cross-module modifications
- report risks before implementation

Never silently change architecture.

Never silently move responsibilities.

Never silently introduce coupling.

---

# If Documentation and Code Differ

Treat the implementation as the current source of behavior.

Analyze the difference carefully.

If the implementation violates the documented architecture:

- report it
- explain it
- propose a fix

Do not rewrite large portions of the project without justification.

---

# Definition of Success

A Sprint 3 module is complete only when:

✓ Module objectives are satisfied.

✓ Runtime integration works.

✓ Lifecycle integration works.

✓ Persistence works.

✓ Existing Sprint 2 behavior remains unchanged.

✓ No architectural rules are violated.

✓ No critical regression exists.

Only then should the next module begin.

---

# Final Reminder

Think in modules.

Not commits.

Preserve architecture.

Keep changes minimal.

Always verify the complete runtime flow before considering a module finished.