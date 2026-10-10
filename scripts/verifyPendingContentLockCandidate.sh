#!/usr/bin/env bash
set -euo pipefail
if [[ ! -f src/restoration/restorationSnapshotExtension.js ]]; then
  echo 'Run this script from the prjsinh repository root.' >&2
  exit 2
fi
node --test tests/unit/restoration/pendingContentRestorationSecurity.test.mjs
node --test tests/unit/restoration/*.test.mjs
node scripts/runInProgressRestorationIntegration.mjs ./src/engines/orchestration/studySession.js
git diff --check
printf '\n=== Git state ===\n'
git status --short
printf '\n=== Commit ===\n'
git rev-parse HEAD
printf '\n=== Candidate SHA-256 ===\n'
shasum -a 256 src/restoration/pendingContentCaptureValidator.js src/restoration/restorationSnapshotExtension.js tests/unit/restoration/pendingContentRestorationSecurity.test.mjs
printf '\nAll verification commands completed. Inspect git diff and error-code compatibility before LOCK.\n'
