---
applyTo: '**'
description: Repository Rules and Maintenance Guidelines
---

Repository Rules and Maintenance Guidelines
=========================================

Purpose
-------
This file documents the repository maintenance rules, conventions, and safe cleanup practices we've followed in this repo. Follow these rules to keep the tree clean, avoid accidental large commits of generated files, and make CI/pre-commit hooks reliable.

Branching & Changes
--------------------
- Create feature branches for any cleanup or refactor work (example: `cleanup/archive-candidates`).
- Do not commit large, destructive removals directly to `main` or `master`. Use a branch and a clear commit message.
- Use `CLEANUP_PROPOSAL.md` at repo root to propose non-trivial changes before moving or deleting files.

Non-destructive archiving
-------------------------
- Move stale or generated artifacts into `archive/` rather than deleting immediately. Example candidates: `coverage/`, `demo-*.txt`, `runtime-output.txt`, `tsc-output.txt`, and other one-off report files.
- Prefer `git mv <file> archive/` so history is preserved.
- If you want to remove tracked generated output entirely, run `git rm -r --cached coverage` then add `coverage/` to `.gitignore` and commit.

.gitignore and generated files
-----------------------------
- Keep generated outputs out of the repository. Common entries we use:

  coverage/
  demo-*.txt
  runtime-output.txt
  tsc-output.txt
  node_modules/
  dist/

- If a previously committed generated artifact exists, move it to `archive/` or untrack it with `git rm --cached` rather than leaving it in the tree.

Pre-commit hooks, linting and formatting
--------------------------------------
- This repository uses `husky` + `lint-staged` to run `eslint --fix` and `prettier --write` on staged files. Keep your working tree lint-clean before committing.
- If a pre-commit hook fails, fix the reported lint/format issues rather than using `--no-verify`, except in emergency situations.
- Common quick fixes we used in the codebase:
  - Replace unused catch variables with `void _e;` inside the `catch` block to satisfy `@typescript-eslint/no-unused-vars` while preserving the original error for human-readable code.
  - Remove or avoid creating unused assignments (e.g., `const e = _e;`) if the variable is not used.

Commands to locally reproduce the pipeline checks
-----------------------------------------------
- Install deps: `pnpm install` (or `npm install`/`pnpm install -w` as appropriate)
- Run lint: `pnpm run lint`
- Auto-fix lint + format: `pnpm run lint:fix && pnpm run format`
- Run tests: `pnpm run test`

Commit messages
---------------
- Use short, descriptive commit messages. For cleanup branches prefer messages like:
  - `Archive candidate files and add .gitignore`
  - `Fix ESLint no-unused-vars in catch blocks and remove unused assignments`

AI/Automation conventions (for repo assistants)
---------------------------------------------
- Use a todo/tracking mechanism when making multi-step changes. In this repo we keep a todo list via the maintainer assistant tool; when making significant edits, update the todo list and mark items as completed.
- Always create a `CLEANUP_PROPOSAL.md` for non-trivial reorganizations describing the proposed moves and commands to apply them. Do not perform destructive deletes without explicit confirmation.

Pushing and remote
-------------------
- Push feature/cleanup branches to remote for review: `git push origin <branch-name>`
- Open a pull request that explains the changes and links to `CLEANUP_PROPOSAL.md` when applicable.

When to revert or stash unrelated changes
----------------------------------------
- If you need a clean working tree to commit a small, focused change, stash unrelated edits with `git stash push -m "WIP: ..."` or restore with `git restore <file>`.

CI and artifacts
-----------------
- Do not commit coverage reports or lcov HTML output to the main branch; configure CI to publish coverage artifacts instead.

Questions / Exceptions
----------------------
- If you need an exception to any rule (e.g., keeping a generated demo file for demo purposes), document the reason in `CLEANUP_PROPOSAL.md` and get a review.

-- Repository Maintenance Bot
