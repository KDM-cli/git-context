# Contributing to git-context

Thank you for your interest in contributing! This document covers the setup, development workflow, and guidelines for the project.

## Prerequisites

- **Node.js 20+**
- **Git** available on PATH
- **npm** (comes with Node.js)

## Getting started

```bash
git clone https://github.com/utkarsh232005/git-context.git
cd git-context
npm install
```

## Development workflow

### Available scripts

| Command | Description |
|---|---|
| `npm run typecheck` | Run TypeScript type checking (no emit) |
| `npm test` | Run all integration tests |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run check` | Run typecheck → test → build in sequence |
| `npm run lint` | Run ESLint |
| `npm run bench` | Run performance benchmarks |

### Running checks before committing

Always run the full check before pushing:

```bash
npm run check
```

This runs typecheck, tests, and build in sequence. CI runs the same pipeline.

## Project structure

```
src/
├── index.ts              # Public API entry point
├── cli.ts                # CLI entry point (npx git-context)
├── git-context.ts        # Core context assembly
├── types.ts              # TypeScript interfaces
├── commands/             # Individual Git command wrappers
│   ├── run-git.ts        # Safe execFile abstraction
│   ├── author.ts         # Commit author/email
│   ├── branch.ts         # Branch state
│   ├── commit.ts         # Commit SHA
│   ├── remote.ts         # Remote discovery
│   └── status.ts         # Dirty state
├── assertions/           # Safety guards
│   ├── branch.ts         # Branch requirement
│   └── clean.ts          # Clean working tree
├── errors/               # Error class hierarchy
│   └── index.ts
└── repository/           # Repository discovery
    └── discover.ts

tests/                    # Integration tests (real Git repos)
benchmarks/               # Performance benchmarks
examples/                 # Usage examples
```

## Writing tests

Tests use Node.js built-in test runner (`node:test`) and create real temporary Git repositories. No mocking is used — every test exercises actual Git commands.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { git } from "../src/index.js";

test("my test", () => {
  // Create a temp repo, exercise git(), assert results
});
```

Run a single test file:

```bash
npx tsx --test tests/compatibility.test.ts
```

## Design principles

1. **Read-only** — never modify repository state
2. **No shell** — all Git commands use `execFileSync` with argument arrays
3. **No dependencies** — zero runtime dependencies
4. **Fresh snapshots** — `git()` always reads current state, never caches dirty state
5. **Actionable errors** — every failure throws a typed, descriptive error

## Code style

- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- ESM-only (`"type": "module"`)
- No default exports
- Preserve existing comments and docstrings

## Submitting changes

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `npm run check` to verify
5. Open a pull request against `main`

CI will automatically run typecheck, lint, tests, and build on your PR.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
