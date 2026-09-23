# git-context development plan

> A zero-configuration Node.js/TypeScript library that gives an application awareness of the Git repository in which it is running.

## Product goal

Expose repository state as a small runtime context rather than a general-purpose Git wrapper. The library must be TypeScript-first, read-only, dependency-light, quiet by default, secure against shell injection, and reliable from nested directories, monorepos, detached `HEAD`s, and worktrees.

The primary experience is:

```ts
import { git } from "git-context";

const context = git();
git.requireCleanBranch("main");
```

## Initial public API

```ts
interface GitContext {
  branch: string | null;
  commit: string;
  shortCommit: string;
  dirty: boolean;
  detached: boolean;
  author: string;
  email: string;
  root: string;
  remote?: string;
  remoteUrl?: string;
}

git(): GitContext;
git.isRepository(): boolean;
git.assertClean(): void;
git.requireBranch(branch: string): void;
git.requireCleanBranch(branch: string): void;
```

`git()` must use Git's repository discovery rather than assume `process.cwd()` is the repository root. Git commands are isolated behind one `runGit(args)` abstraction using `execFile`/an equivalent non-shell execution mechanism. The implementation must never change repository state, send telemetry, or interpolate input into a shell command.

## Git data sources

- Root: `git rev-parse --show-toplevel`
- Branch: `git branch --show-current`
- Commit: `git rev-parse HEAD`
- Short commit: `git rev-parse --short HEAD`
- Dirty state: `git status --porcelain`
- Author and email: `git log -1 --format=%an` and `%ae`
- Remotes: `git remote`, preferring `origin` when present, then `git remote get-url <remote>`

## Delivery phases

1. **Project setup** — strict TypeScript package, exports, no runtime dependencies, license, changelog, documentation.
2. **Git discovery** — nested-directory, monorepo, and worktree-safe discovery through Git itself.
3. **Context API** — immutable `GitContext` with branch, commit, status, author, repository root, and optional remote data.
4. **Safety APIs** — actionable dedicated errors for dirty repositories and branch mismatches.
5. **Tests** — real temporary repositories, covering clean/dirty state, nested paths, missing repositories/remotes, detached `HEAD`, multiple remotes, worktrees, and exported error types.
6. **CLI (v0.3)** — `npx git-context` with human-readable and `--json` output plus tests.
7. **Compatibility hardening (v0.4)** — shallow clone and CI coverage, performance measurement, cache strategy that does not return stale dirty state, and missing-Git coverage.
8. **CI/CD** — supported Node matrix, typecheck, lint, tests, build, package validation, release workflow.
9. **Documentation** — independently understandable basic, deployment, migration, release, Express, and CI examples; security and edge-case docs.
10. **Release** — npm publication, semantic versioning, GitHub release, changelog discipline, and 1.0 security/performance review.

## Explicitly deferred features

Do not build a GitHub/GitLab client, a mutating Git wrapper, Git push/pull/checkout/commit/branch creation, authentication, telemetry, a cloud dashboard, complex configuration, CI-provider detection, build metadata injection, or the proposed generic `git.assert({...})` API before the small core is stable.

## Definition of done for the first public release

From a nested directory such as `project/apps/api/src`, with Git metadata at `project/.git`, this must correctly report branch, short commit, and clean/dirty state. `git.requireCleanBranch("main")` must fail safely and clearly for a wrong branch or uncommitted work. A 1.0 release additionally requires stable APIs, broad integration tests, documented Node support, benchmarks, security review, examples, changelog, CI, npm packaging, and semantic versioning.
