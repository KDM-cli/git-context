import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { afterEach, test } from "node:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  BranchMismatchError,
  DetachedHeadError,
  DirtyRepositoryError,
  TagMismatchError,
  UnpushedCommitsError,
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
  const root = createTemporaryDirectory("git-context-ext-");
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
// Commit Metadata & Tag Tests
// ────────────────────────────────────────────────────────────────────────

test("reads commitDate as an ISO 8601 formatted timestamp", () => {
  const { root } = createRepository();
  const context = git({ cwd: root });

  assert.ok(typeof context.commitDate === "string");
  // Check ISO 8601 format: YYYY-MM-DDTHH:MM:SS...
  assert.match(context.commitDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test("tag is undefined when commit is untagged", () => {
  const { root } = createRepository();
  const context = git({ cwd: root });

  assert.equal(context.tag, undefined);
});

test("tag resolves exact tag pointing at HEAD", () => {
  const { root } = createRepository();
  runGit(root, ["tag", "v1.2.3"]);

  const context = git({ cwd: root });
  assert.equal(context.tag, "v1.2.3");
});

test("tag is undefined if a tag exists on an older commit but not HEAD", () => {
  const { root } = createRepository();
  runGit(root, ["tag", "v1.0.0"]);

  writeFileSync(join(root, "file2.txt"), "second commit\n");
  runGit(root, ["add", "file2.txt"]);
  runGit(root, ["commit", "-m", "Second commit"]);

  const context = git({ cwd: root });
  assert.equal(context.tag, undefined);
});

// ────────────────────────────────────────────────────────────────────────
// Upstream Tracking Tests
// ────────────────────────────────────────────────────────────────────────

test("ahead and behind calculate correctly with an upstream tracking branch", () => {
  // Create bare remote repository
  const remoteDir = createTemporaryDirectory("git-context-remote-");
  runGit(remoteDir, ["init", "--bare", "--initial-branch=main"]);

  // Create local repository, push to remote, set upstream
  const { root } = createRepository();
  runGit(root, ["remote", "add", "origin", remoteDir]);
  runGit(root, ["push", "-u", "origin", "main"]);

  // Initially in sync: ahead 0, behind 0
  let context = git({ cwd: root });
  assert.equal(context.ahead, 0);
  assert.equal(context.behind, 0);

  // Commit locally: ahead 1, behind 0
  writeFileSync(join(root, "local.txt"), "local commit\n");
  runGit(root, ["add", "local.txt"]);
  runGit(root, ["commit", "-m", "Local commit"]);

  context = git({ cwd: root });
  assert.equal(context.ahead, 1);
  assert.equal(context.behind, 0);
});

// ────────────────────────────────────────────────────────────────────────
// Generic Assertions: git.assert()
// ────────────────────────────────────────────────────────────────────────

test("git.assert validates string branch requirement", () => {
  const { root } = createRepository();

  assert.doesNotThrow(() => {
    git.assert({ branch: "main" }, { cwd: root });
  });

  assert.throws(
    () => {
      git.assert({ branch: "release" }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof BranchMismatchError);
      assert.equal(error.expected, "release");
      assert.equal(error.actual, "main");
      return true;
    },
  );
});

test("git.assert validates array of acceptable branch names", () => {
  const { root } = createRepository();

  assert.doesNotThrow(() => {
    git.assert({ branch: ["main", "master", "develop"] }, { cwd: root });
  });

  assert.throws(
    () => {
      git.assert({ branch: ["release", "hotfix"] }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof BranchMismatchError);
      assert.equal(error.expected, "release, hotfix");
      assert.equal(error.actual, "main");
      return true;
    },
  );
});

test("git.assert enforces clean working tree", () => {
  const { root } = createRepository();

  assert.doesNotThrow(() => {
    git.assert({ clean: true }, { cwd: root });
  });

  writeFileSync(join(root, "dirty.txt"), "untracked change\n");

  assert.throws(
    () => {
      git.assert({ clean: true }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof DirtyRepositoryError);
      return true;
    },
  );
});

test("git.assert rejects detached HEAD when detached is false", () => {
  const { root, commit } = createRepository();

  assert.doesNotThrow(() => {
    git.assert({ detached: false }, { cwd: root });
  });

  runGit(root, ["checkout", commit]);

  assert.throws(
    () => {
      git.assert({ detached: false }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof DetachedHeadError);
      return true;
    },
  );
});

test("git.assert enforces tag requirements", () => {
  const { root } = createRepository();

  // Untagged repo fails tag: true
  assert.throws(
    () => {
      git.assert({ tag: true }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof TagMismatchError);
      assert.equal(error.expected, true);
      assert.equal(error.actual, null);
      return true;
    },
  );

  // Tag with v0.5.0
  runGit(root, ["tag", "v0.5.0"]);

  // Now tag: true passes
  assert.doesNotThrow(() => {
    git.assert({ tag: true }, { cwd: root });
  });

  // Specific tag match passes
  assert.doesNotThrow(() => {
    git.assert({ tag: "v0.5.0" }, { cwd: root });
  });

  // Different tag requirement fails
  assert.throws(
    () => {
      git.assert({ tag: "v1.0.0" }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof TagMismatchError);
      assert.equal(error.expected, "v1.0.0");
      assert.equal(error.actual, "v0.5.0");
      return true;
    },
  );
});

test("git.assert enforces unpushed commits check", () => {
  const remoteDir = createTemporaryDirectory("git-context-remote-");
  runGit(remoteDir, ["init", "--bare", "--initial-branch=main"]);

  const { root } = createRepository();
  runGit(root, ["remote", "add", "origin", remoteDir]);
  runGit(root, ["push", "-u", "origin", "main"]);

  // In sync -> passes unpushed: true
  assert.doesNotThrow(() => {
    git.assert({ unpushed: true }, { cwd: root });
  });

  // New local commit -> ahead 1 -> unpushed: true throws
  writeFileSync(join(root, "change.txt"), "some change\n");
  runGit(root, ["add", "change.txt"]);
  runGit(root, ["commit", "-m", "Change"]);

  assert.throws(
    () => {
      git.assert({ unpushed: true }, { cwd: root });
    },
    (error: unknown) => {
      assert.ok(error instanceof UnpushedCommitsError);
      assert.equal(error.ahead, 1);
      return true;
    },
  );
});
