import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { afterEach, test } from "node:test";
import {
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { git } from "../src/index.js";
import { getStashCount } from "../src/commands/stash.js";
import { hasMergeConflict } from "../src/commands/merge-conflict.js";
import { getSubmodules } from "../src/commands/submodules.js";
import { loadConfig } from "../src/config.js";
import { createWatcher } from "../src/watch.js";

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
  const root = createTemporaryDirectory("git-context-v060-");
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
// Stash Count
// ────────────────────────────────────────────────────────────────────────

test("stashCount is 0 when no stashes exist", () => {
  const { root } = createRepository();
  assert.equal(getStashCount(root), 0);

  const context = git({ cwd: root });
  assert.equal(context.stashCount, 0);
});

test("stashCount reflects the number of stash entries", () => {
  const { root } = createRepository();

  // Create a change and stash it
  writeFileSync(join(root, "file1.txt"), "change 1\n");
  runGit(root, ["add", "file1.txt"]);
  runGit(root, ["stash", "push", "-m", "first stash"]);
  assert.equal(getStashCount(root), 1);

  // Stash another change
  writeFileSync(join(root, "file2.txt"), "change 2\n");
  runGit(root, ["add", "file2.txt"]);
  runGit(root, ["stash", "push", "-m", "second stash"]);
  assert.equal(getStashCount(root), 2);

  const context = git({ cwd: root });
  assert.equal(context.stashCount, 2);
});

// ────────────────────────────────────────────────────────────────────────
// Merge Conflict
// ────────────────────────────────────────────────────────────────────────

test("mergeConflict is false in a clean repository", () => {
  const { root } = createRepository();
  assert.equal(hasMergeConflict(root), false);

  const context = git({ cwd: root });
  assert.equal(context.mergeConflict, false);
});

test("mergeConflict is true when unmerged files exist", () => {
  const { root } = createRepository();

  // Create a branch with a conflicting change
  runGit(root, ["checkout", "-b", "feature"]);
  writeFileSync(join(root, "conflict.txt"), "feature content\n");
  runGit(root, ["add", "conflict.txt"]);
  runGit(root, ["commit", "-m", "feature commit"]);

  runGit(root, ["checkout", "main"]);
  writeFileSync(join(root, "conflict.txt"), "main content\n");
  runGit(root, ["add", "conflict.txt"]);
  runGit(root, ["commit", "-m", "main commit"]);

  // Attempt merge which will conflict
  try {
    runGit(root, ["merge", "feature"]);
  } catch {
    // Expected to fail due to conflict
  }

  assert.equal(hasMergeConflict(root), true);

  const context = git({ cwd: root });
  assert.equal(context.mergeConflict, true);
});

// ────────────────────────────────────────────────────────────────────────
// Submodules
// ────────────────────────────────────────────────────────────────────────

test("submodules is empty when no submodules are configured", () => {
  const { root } = createRepository();
  const subs = getSubmodules(root);
  assert.deepEqual(subs, []);

  const context = git({ cwd: root });
  assert.deepEqual(context.submodules, []);
});

test("submodules lists configured submodules", () => {
  const { root: submoduleRepo } = createRepository();
  const { root: parentRepo } = createRepository();

  // Add the first repo as a submodule
  runGit(parentRepo, ["-c", "protocol.file.allow=always", "submodule", "add", submoduleRepo, "libs/sub"]);
  runGit(parentRepo, ["commit", "-m", "add submodule"]);

  const subs = getSubmodules(parentRepo);
  assert.equal(subs.length, 1);
  assert.equal(subs[0]?.path, "libs/sub");
  assert.ok(typeof subs[0]?.commit === "string");
  assert.equal(subs[0]?.dirty, false);

  const context = git({ cwd: parentRepo });
  assert.equal(context.submodules.length, 1);
  assert.equal(context.submodules[0]?.path, "libs/sub");
});

// ────────────────────────────────────────────────────────────────────────
// Configuration File
// ────────────────────────────────────────────────────────────────────────

test("loadConfig returns undefined when no config file exists", () => {
  const { root } = createRepository();
  const config = loadConfig(root);
  assert.equal(config, undefined);
});

test("loadConfig reads .gitcontextrc.json", () => {
  const { root } = createRepository();
  const configContent = {
    assertions: { branch: "main", clean: true },
    format: "minimal",
  };
  writeFileSync(
    join(root, ".gitcontextrc.json"),
    JSON.stringify(configContent, null, 2),
  );

  const config = loadConfig(root);
  assert.ok(config !== undefined);
  assert.equal(config.format, "minimal");
  assert.deepEqual(config.assertions, { branch: "main", clean: true });
});

test("loadConfig falls back to package.json#gitContext", () => {
  const { root } = createRepository();
  const pkg = {
    name: "test-pkg",
    version: "1.0.0",
    gitContext: {
      assertions: { branch: "release" },
      format: "json",
    },
  };
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg, null, 2));

  const config = loadConfig(root);
  assert.ok(config !== undefined);
  assert.equal(config.format, "json");
  assert.deepEqual(config.assertions, { branch: "release" });
});

test("git.assertFromConfig uses .gitcontextrc.json assertions", () => {
  const { root } = createRepository();
  const configContent = {
    assertions: { branch: "main", clean: true },
  };
  writeFileSync(
    join(root, ".gitcontextrc.json"),
    JSON.stringify(configContent, null, 2),
  );
  runGit(root, ["add", ".gitcontextrc.json"]);
  runGit(root, ["commit", "-m", "add config"]);

  // Should not throw since we are on main and clean
  assert.doesNotThrow(() => {
    git.assertFromConfig({ cwd: root });
  });
});

test("git.assertFromConfig is a no-op when no config exists", () => {
  const { root } = createRepository();

  // Should not throw even without config
  assert.doesNotThrow(() => {
    git.assertFromConfig({ cwd: root });
  });
});

// ────────────────────────────────────────────────────────────────────────
// Watch Mode
// ────────────────────────────────────────────────────────────────────────

test("git.watch creates a watcher with initial context", () => {
  const { root } = createRepository();
  const watcher = createWatcher({ cwd: root, interval: 60000 });

  try {
    assert.ok(watcher.context !== null);
    assert.equal(watcher.context?.branch, "main");
    assert.equal(watcher.context?.dirty, false);
  } finally {
    watcher.stop();
  }
});

test("watcher emits change event when context changes", async () => {
  const { root } = createRepository();

  const events: string[] = [];
  const watcher = createWatcher({ cwd: root, interval: 200 });

  watcher.on("change", () => events.push("change"));
  watcher.on("dirty", () => events.push("dirty"));

  // Make the repo dirty to trigger change
  writeFileSync(join(root, "trigger.txt"), "trigger\n");

  // Wait for polling
  await new Promise((resolve) => setTimeout(resolve, 600));
  watcher.stop();

  assert.ok(events.includes("change"), "Expected 'change' event");
  assert.ok(events.includes("dirty"), "Expected 'dirty' event");
});

test("watcher.stop prevents further polling", () => {
  const { root } = createRepository();
  const watcher = createWatcher({ cwd: root, interval: 100 });
  watcher.stop();

  // Should not throw or leak
  assert.ok(watcher.context !== null);
});

// ────────────────────────────────────────────────────────────────────────
// Context includes new properties
// ────────────────────────────────────────────────────────────────────────

test("git() context includes stashCount, mergeConflict, and submodules", () => {
  const { root } = createRepository();
  const context = git({ cwd: root });

  assert.equal(typeof context.stashCount, "number");
  assert.equal(typeof context.mergeConflict, "boolean");
  assert.ok(Array.isArray(context.submodules));
});

// ────────────────────────────────────────────────────────────────────────
// CLI Features: Formats & Init
// ────────────────────────────────────────────────────────────────────────

function runCli(
  args: readonly string[],
  options?: { readonly cwd?: string },
): { readonly stdout: string; readonly stderr: string; readonly exitCode: number } {
  const cliPath = resolve(import.meta.dirname, "..", "src", "cli.ts");
  try {
    const stdout = execFileSync("npx", ["tsx", cliPath, ...args], {
      cwd: options?.cwd ?? process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const result = error as {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      status?: number | null;
    };
    return {
      stdout:
        typeof result.stdout === "string"
          ? result.stdout
          : result.stdout?.toString("utf8") ?? "",
      stderr:
        typeof result.stderr === "string"
          ? result.stderr
          : result.stderr?.toString("utf8") ?? "",
      exitCode: result.status ?? 1,
    };
  }
}

test("CLI --format=minimal prints compact single line", () => {
  const { root, commit } = createRepository();
  const result = runCli(["--format=minimal", "--no-color"], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, new RegExp(`main\\s+${commit.slice(0, 7)}`));
});

test("CLI --format=json prints JSON output", () => {
  const { root } = createRepository();
  const result = runCli(["--format=json"], { cwd: root });

  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed["branch"], "main");
  assert.equal(parsed["stashCount"], 0);
  assert.equal(parsed["mergeConflict"], false);
  assert.deepEqual(parsed["submodules"], []);
});

test("CLI rejects invalid format flag", () => {
  const { root } = createRepository();
  const result = runCli(["--format=xml"], { cwd: root });

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown format: xml/);
});

test("CLI init creates .gitcontextrc.json and deploy-guard.ts", () => {
  const { root } = createRepository();
  const result = runCli(["init"], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.ok(existsSync(join(root, ".gitcontextrc.json")));
  assert.ok(existsSync(join(root, "scripts", "deploy-guard.ts")));

  // Running init again fails because config already exists
  const secondResult = runCli(["init"], { cwd: root });
  assert.equal(secondResult.exitCode, 1);
  assert.match(secondResult.stderr, /already exists/);
});

