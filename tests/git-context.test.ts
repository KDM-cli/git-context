import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { afterEach, test } from "node:test";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  BranchMismatchError,
  DirtyRepositoryError,
  RepositoryNotFoundError,
  git,
} from "../src/index.js";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(prefix: string): string {
  const raw = mkdtempSync(join(tmpdir(), prefix));
  const directory = realpathSync(raw);
  temporaryDirectories.push(directory);
  return directory;
}

function runGit(cwd: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createRepository(): { readonly root: string; readonly commit: string } {
  const root = createTemporaryDirectory("git-context-repository-");
  runGit(root, ["init", "--initial-branch=main"]);
  runGit(root, ["config", "user.name", "Test Author"]);
  runGit(root, ["config", "user.email", "test.author@example.com"]);
  writeFileSync(join(root, "README.md"), "# Fixture\n");
  runGit(root, ["add", "README.md"]);
  runGit(root, ["commit", "-m", "Initial fixture"]);

  return { root, commit: runGit(root, ["rev-parse", "HEAD"]) };
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory !== undefined) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("reads the full context from a nested monorepo directory", () => {
  const { root, commit } = createRepository();
  const nestedDirectory = join(root, "apps", "api", "src");
  mkdirSync(nestedDirectory, { recursive: true });
  runGit(root, ["remote", "add", "upstream", "https://example.com/upstream.git"]);
  runGit(root, ["remote", "add", "origin", "https://example.com/origin.git"]);

  const context = git({ cwd: nestedDirectory });

  assert.deepEqual(context, {
    branch: "main",
    commit,
    shortCommit: commit.slice(0, context.shortCommit.length),
    dirty: false,
    detached: false,
    author: "Test Author",
    email: "test.author@example.com",
    root,
    remote: "origin",
    remoteUrl: "https://example.com/origin.git",
  });
  assert.equal(Object.isFrozen(context), true);
});

test("reports a repository without remotes", () => {
  const { root } = createRepository();

  const context = git({ cwd: root });

  assert.equal(context.remote, undefined);
  assert.equal(context.remoteUrl, undefined);
});

test("sees tracked and untracked changes on a fresh read", () => {
  const { root } = createRepository();
  writeFileSync(join(root, "new-file.txt"), "uncommitted\n");

  assert.equal(git({ cwd: root }).dirty, true);
  assert.throws(() => git.assertClean({ cwd: root }), DirtyRepositoryError);
});

test("enforces branch requirements with actionable error types", () => {
  const { root } = createRepository();

  assert.doesNotThrow(() => git.requireBranch("main", { cwd: root }));
  assert.throws(
    () => git.requireBranch("release", { cwd: root }),
    (error: unknown) => {
      assert.ok(error instanceof BranchMismatchError);
      assert.equal(error.expected, "release");
      assert.equal(error.actual, "main");
      assert.match(error.message, /Current branch:\nmain/);
      return true;
    },
  );

  writeFileSync(join(root, "uncommitted.txt"), "pending\n");
  assert.throws(
    () => git.requireCleanBranch("main", { cwd: root }),
    DirtyRepositoryError,
  );
});

test("identifies detached HEAD without inventing a branch", () => {
  const { root } = createRepository();
  runGit(root, ["checkout", "--detach"]);

  const context = git({ cwd: root });

  assert.equal(context.branch, null);
  assert.equal(context.detached, true);
});

test("uses Git discovery for linked worktrees", () => {
  const { root } = createRepository();
  const worktree = createTemporaryDirectory("git-context-worktree-");
  rmSync(worktree, { recursive: true, force: true });
  runGit(root, ["worktree", "add", "--detach", worktree, "HEAD"]);
  const nestedDirectory = join(worktree, "nested");
  mkdirSync(nestedDirectory);

  const context = git({ cwd: nestedDirectory });

  assert.equal(context.root, worktree);
  assert.equal(context.detached, true);
  assert.equal(context.branch, null);
});

test("detects missing repositories without hiding other Git errors", () => {
  const directory = createTemporaryDirectory("git-context-no-repository-");

  assert.equal(git.isRepository({ cwd: directory }), false);
  assert.throws(() => git({ cwd: directory }), RepositoryNotFoundError);
});
