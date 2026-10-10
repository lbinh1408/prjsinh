# Real Reconstruction Integration V1.1 — Lesson Fixture Fix

The previous runner created `lesson:null`, then called `completeLessonItem()`, which requires a configured lesson. This patch changes only the integration runner and its tests; no LOCKED engines or restoration implementation files are changed.

The lesson is configured at `createStudySession()` time and reconstructed through the content bundle. A synthetic `currentItem` is still injected into both detached branches **after** reconstruction to exercise one content-completion call. Thus this is NOT evidence of resumed real pending delivery, authenticated capture, or execution permission.

Run:
```
node --test tests/unit/restoration/realReconstructionIntegration.test.mjs
node scripts/runRealReconstructionIntegration.mjs ./src/engines/orchestration/studySession.js
```
If StudySession rejects the fixture's lesson section shape, capture the underlying error and adjust the fixture to your actual LessonEngine contract; do not change LOCKED engines.
