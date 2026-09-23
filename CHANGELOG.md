# Changelog

## 0.4.0 - 2026-09-24

Compatibility hardening and project maturity.

- Added compatibility tests: shallow clones, missing Git executable, multiple remotes, frozen context immutability.
- Added ESLint with typescript-eslint strict rules.
- Added performance benchmarks (`npm run bench`).
- Added `npm pack --dry-run` package validation to CI.
- Added lint step to CI pipeline.
- Added Express, CI guard, and release examples.
- Added `CONTRIBUTING.md` with project structure and development workflow.
- Total test count: 29 (7 library + 14 CLI + 8 compatibility).

## 0.3.0 - 2026-09-24

CLI release.

- Added `npx git-context` CLI with human-readable output.
- Added `--json` flag for machine-parseable JSON output.
- Added `--help` / `-h` and `--version` flags.
- Added 14 CLI integration tests covering output formats, nested discovery, and error paths.
- Fixed macOS `/var` → `/private/var` symlink mismatch in library test fixtures.

## 0.1.0 - 2026-09-24

Initial build.

- Added `git()` context snapshots with repository root, branch, commits, dirty state, commit author, and optional remote details.
- Added repository detection and clean/branch safety guards.
- Added exported, actionable error classes.
- Added integration coverage using real temporary Git repositories.
