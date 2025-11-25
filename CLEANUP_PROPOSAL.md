Repository cleanup proposal
==========================

Summary
-------
This document lists recommended cleanup and re-organization actions to reduce clutter and make the repository easier to navigate. I do not perform destructive actions; the commands below are suggested and can be run after review.

High-level recommendations
-------------------------
- Consolidate most short-lived or iterative planning documents into a single `docs/decisions/` or `archive/` folder.
- Move generated artifacts and outputs out of the repo or add them to `.gitignore` (coverage, runtime-output, tsc-output, demo-*.txt, lcov reports).
- Remove or archive obvious duplicates and stale drafts (files with `_OLD`, `*_SUMMARY_OLD.md`, or dated experiment outputs).
- Keep `README.md`, `CONTRIBUTING.md`, `QUICKSTART.md`, `API_REFERENCE.md`, and other active docs in `docs/`.

Candidates for archiving (suggested `archive/`)
-----------------------------------------------
- `OVERHAUL_SUMMARY_OLD.md`
- `demo-compare-output.txt`, `demo-output.txt`, `demo-remember-output.txt`
- `runtime-output.txt`, `tsc-output.txt`
- `EXPERIMENT_SUMMARY.md` (if superseded by other docs)
- Multiple `OVERHAUL_*`, `REFACTOR_*`, `PHASE2_*`, and `OPTIMIZATION_*` files — consolidate into `docs/overhaul/` and `docs/refactor/` or `archive/` as appropriate.

Files that look like generated reports (consider removing or ignoring)
------------------------------------------------------------------
- `coverage/` (keep off the main branch or store reports in CI artifact storage)
- `coverage/lcov.info` and `coverage/lcov-report/`

`.gitignore` suggestions
------------------------
Add these lines to `.gitignore` (adapt if you intentionally keep some files tracked):

```
coverage/
*.log
*.output
demo-*.txt
runtime-output.txt
tsc-output.txt
node_modules/
dist/
/.cache
/.parcel-cache
```

Suggested commands (preview changes before running)
---------------------------------------------------
Preview moves:

```
git mv OVERHAUL_SUMMARY_OLD.md archive/
git mv demo-*.txt archive/
git mv runtime-output.txt archive/
git mv tsc-output.txt archive/
```

Remove coverage from repo (if acceptable):

```
git rm -r --cached coverage || true
rm -rf coverage
```

Follow-ups I can perform next
----------------------------
- Create `archive/` and move the proposed files (requires your confirmation).
- Add the `.gitignore` entries and commit.
- Consolidate repetitive docs into `docs/overhaul.md` and `docs/refactor.md` as needed.

Notes
-----
I prepared this list by scanning the repository tree. If you want, I can execute the safe, non-destructive steps now: create `archive/`, move the candidate files into it, and commit the changes on a branch. Tell me whether to proceed and which files you want preserved explicitly.

-- Cleanup assistant
