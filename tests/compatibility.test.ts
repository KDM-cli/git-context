import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { afterEach, test } from "node:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  GitExecutableNotFoundError,
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
  const root = createTemporaryDirectory("git-context-compat-");
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

// ────────────────────────────────────────────────────────────────────────
// Shallow clone
// ────────────────────────────────────────────────────────────────────────

test("reads context from a shallow clone (depth=1)", () => {
  const { root: origin } = createRepository();
  const clone = createTemporaryDirectory("git-context-shallow-");
  rmSync(clone, { recursive: true, force: true });

  runGit(origin, ["clone", "--depth=1", `file://${origin}`, clone]);

  const context = git({ cwd: clone });

  assert.equal(context.branch, "main");
  assert.equal(typeof context.commit, "string");
  assert.equal(context.commit.length, 40);
  assert.equal(context.dirty, false);
  assert.equal(context.author, "Test Author");
  assert.equal(context.root, clone);
});

test("reports dirty state correctly in a shallow clone", () => {
  const { root: origin } = createRepository();
  const clone = createTemporaryDirectory("git-context-shallow-dirty-");
  rmSync(clone, { recursive: true, force: true });

  runGit(origin, ["clone", "--depth=1", `file://${origin}`, clone]);
  writeFileSync(join(clone, "untracked.txt"), "new file\n");

  assert.equal(git({ cwd: clone }).dirty, true);
});

// ────────────────────────────────────────────────────────────────────────
// Missing repository
// ────────────────────────────────────────────────────────────────────────

test("throws RepositoryNotFoundError for an empty temp directory", () => {
  const outside = createTemporaryDirectory("git-context-no-repo-compat-");

  assert.throws(() => git({ cwd: outside }), RepositoryNotFoundError);
});

test("isRepository returns false for a non-repository directory", () => {
  const outside = createTemporaryDirectory("git-context-no-repo-bool-");

  assert.equal(git.isRepository({ cwd: outside }), false);
});

// ────────────────────────────────────────────────────────────────────────
// Missing Git executable
// ────────────────────────────────────────────────────────────────────────

test("throws GitExecutableNotFoundError when git is not on PATH", () => {
  const { root } = createRepository();

  // Temporarily override PATH to exclude git
  const originalPath = process.env["PATH"];
  try {
    process.env["PATH"] = "";
    assert.throws(() => git({ cwd: root }), GitExecutableNotFoundError);
  } finally {
    process.env["PATH"] = originalPath;
  }
});

// ────────────────────────────────────────────────────────────────────────
// Multiple remotes
// ────────────────────────────────────────────────────────────────────────

test("prefers origin when multiple remotes exist", () => {
  const { root } = createRepository();
  runGit(root, ["remote", "add", "upstream", "https://example.com/upstream.git"]);
  runGit(root, ["remote", "add", "origin", "https://example.com/origin.git"]);

  const context = git({ cwd: root });

  assert.equal(context.remote, "origin");
  assert.equal(context.remoteUrl, "https://example.com/origin.git");
});

test("falls back to first remote when origin does not exist", () => {
  const { root } = createRepository();
  runGit(root, ["remote", "add", "deploy", "https://example.com/deploy.git"]);

  const context = git({ cwd: root });

  assert.equal(context.remote, "deploy");
  assert.equal(context.remoteUrl, "https://example.com/deploy.git");
});

// ────────────────────────────────────────────────────────────────────────
// Frozen context
// ────────────────────────────────────────────────────────────────────────

test("context object is frozen and immutable", () => {
  const { root } = createRepository();

  const context = git({ cwd: root });

  assert.equal(Object.isFrozen(context), true);
  assert.throws(() => {
    (context as unknown as Record<string, unknown>)["branch"] = "hacked";
  }, TypeError);
});
