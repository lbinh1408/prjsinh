# Pending Selected Question Restoration V1 — DRAFT

## Runtime evidence
- StudySession V0.2.0 stores `lessonRuntime.currentItem`, `currentSelection`, `currentQuestion` after `getNextStudyItem()` returns `QUESTION`.
- LessonEngine V1.0.0 uses lowercase `include` and `getNextLessonItem({plan,progress})`.
- QuestionSelector V1.0.0 stores selected `bankId`, `questionId`, and cloned `question`.
- AttemptBuilder V1.0.2 creates canonical attempts after evaluation, not unsent drafts.

## Validator scope
`validatePendingQuestionCapture(checkpoint)` validates internal shape, identity, decision linkage, and lesson navigation only. It does **not** prove external question-bank integrity, capture authenticity, absence of in-flight submit, exactly-once processing, or authority to execute. Its return is always `executable:false`, `submitAuthorized:false`, `inFlightSubmitExcluded:false`.

## Integration gate (NOT IMPLEMENTED)
Do not change locked `restorationSnapshotExtension.js` or `pendingContentCaptureValidator.js`. A separately versioned extension/dispatcher must first prove authenticated durable binding, immutable dependency provenance, live capture fence, and no in-flight submit. Capture/read-side tests must reject tampering and all unsupported statuses. Only then consider guarded reconstruction and behavioral equivalence.

## Explicit exclusions
Draft answers, submitted or in-flight attempts, legacy question-only sessions, replay/submit permission, global atomicity, automatic QuestionSelector re-selection. Phase 3.3-C remains DRAFT.
