# git-context

**Know your Git state from inside Node.js.**

`git-context` is a zero-configuration, read-only TypeScript library that exposes the Git repository state around an application, script, deployment, migration, or CI job. It intentionally is not a complete Git wrapper.

## Installation

```bash
npm install git-context
```

Node.js 20 or later and the `git` executable are required.

## Quick start

```ts
import { git } from "git-context";

const context = git();

console.log({
  branch: context.branch,
  commit: context.shortCommit,
  dirty: context.dirty,
});
```

`git()` finds the enclosing repository through Git itself, so it works from nested application directories and linked worktrees. It returns a fresh snapshot on every call; a deployment check will not accidentally use a stale clean/dirty result.

```ts
interface GitContext {
  readonly branch: string | null;
  readonly commit: string;
  readonly shortCommit: string;
  readonly dirty: boolean;
  readonly detached: boolean;
  readonly author: string;
  readonly email: string;
  readonly root: string;
  readonly remote?: string;
  readonly remoteUrl?: string;
}
```

When several remotes exist, `origin` is selected; otherwise the first listed remote is selected. Repositories without a remote omit both optional fields. Detached `HEAD` is represented as `branch: null` and `detached: true`.

## Safety guards

```ts
import { git } from "git-context";

git.requireCleanBranch("main");
await migrateDatabase();
```

- `git.isRepository()` returns whether the current directory is inside a Git repository.
- `git.assertClean()` throws `DirtyRepositoryError` when tracked, staged, or untracked changes exist.
- `git.requireBranch("main")` throws `BranchMismatchError` when the branch does not match.
- `git.requireCleanBranch("main")` checks both conditions using one context snapshot.

Every API accepts an optional `{ cwd }` when a script deliberately needs to inspect another checkout:

```ts
const releaseContext = git({ cwd: "/srv/release-checkout" });
git.requireCleanBranch("main", { cwd: "/srv/release-checkout" });
```

Errors are exported for precise handling: `GitContextError`, `RepositoryNotFoundError`, `GitExecutableNotFoundError`, `GitCommandError`, `DirtyRepositoryError`, and `BranchMismatchError`.

## Design and security

All Git commands are executed with Node's non-shell process API and an argument array. `git-context` never interpolates values into a shell command, changes Git configuration, modifies a repository, contacts a remote, or emits telemetry. It is quiet on success and communicates failures by throwing actionable errors.

## CLI

```bash
npx git-context
```

```
Branch:       main
Commit:       a1b2c3d (a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0)
Dirty:        no
Detached:     no
Author:       Jane Doe <jane@example.com>
Root:         /home/jane/project
Remote:       origin
Remote URL:   https://github.com/jane/project.git
```

Use `--json` for machine-parseable output:

```bash
npx git-context --json
```

Use `--help` and `--version` for usage and version information.

## Examples

See [examples/basic.ts](examples/basic.ts), [examples/deployment.ts](examples/deployment.ts), and [examples/migration.ts](examples/migration.ts).

## Current scope

The 0.3 release includes the library API, safety guards, and a CLI. Benchmarks, CI/release automation, build metadata, and advanced assertions are planned separately; see [plan.md](plan.md) and [checkpoint.md](checkpoint.md).

## License

[MIT](LICENSE)
