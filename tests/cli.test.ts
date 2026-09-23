import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { afterEach, test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { realpathSync } from "node:fs";

const temporaryDirectories: string[] = [];

/** Resolve the real path so macOS /var → /private/var symlinks don't break assertions. */
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
  const root = createTemporaryDirectory("git-context-cli-");
  runGit(root, ["init", "--initial-branch=main"]);
  runGit(root, ["config", "user.name", "Test Author"]);
  runGit(root, ["config", "user.email", "test.author@example.com"]);
  writeFileSync(join(root, "README.md"), "# Fixture\n");
  runGit(root, ["add", "README.md"]);
  runGit(root, ["commit", "-m", "Initial fixture"]);

  return { root, commit: runGit(root, ["rev-parse", "HEAD"]) };
}

/** Run the CLI via tsx, returning stdout, stderr, and exit code. */
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

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory !== undefined) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

// ────────────────────────────────────────────────────────────────────────
// Help and version
// ────────────────────────────────────────────────────────────────────────

test("--help prints usage and exits 0", () => {
  const result = runCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: git-context/);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--help/);
});

test("-h is an alias for --help", () => {
  const result = runCli(["-h"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: git-context/);
});

test("--version prints a version string and exits 0", () => {
  const result = runCli(["--version"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

// ────────────────────────────────────────────────────────────────────────
// Human-readable output
// ────────────────────────────────────────────────────────────────────────

test("prints human-readable context for a clean repository", () => {
  const { root } = createRepository();
  const shortCommit = runGit(root, ["rev-parse", "--short", "HEAD"]);

  const result = runCli([], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Branch:\s+main/);
  assert.match(result.stdout, new RegExp(`Commit:\\s+${shortCommit}`));
  assert.match(result.stdout, /Dirty:\s+no/);
  assert.match(result.stdout, /Detached:\s+no/);
  assert.match(result.stdout, /Author:\s+Test Author <test\.author@example\.com>/);
  assert.match(result.stdout, new RegExp(`Root:\\s+${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("shows dirty:yes when the working tree has changes", () => {
  const { root } = createRepository();
  writeFileSync(join(root, "uncommitted.txt"), "dirty\n");

  const result = runCli([], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Dirty:\s+yes/);
});

test("shows detached HEAD without a branch name", () => {
  const { root } = createRepository();
  runGit(root, ["checkout", "--detach"]);

  const result = runCli([], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Branch:\s+\(detached HEAD\)/);
  assert.match(result.stdout, /Detached:\s+yes/);
});

test("shows remote when present", () => {
  const { root } = createRepository();
  runGit(root, ["remote", "add", "origin", "https://example.com/repo.git"]);

  const result = runCli([], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Remote:\s+origin/);
  assert.match(result.stdout, /Remote URL:\s+https:\/\/example\.com\/repo\.git/);
});

test("omits remote lines when no remote exists", () => {
  const { root } = createRepository();

  const result = runCli([], { cwd: root });

  assert.equal(result.exitCode, 0);
  assert.ok(!result.stdout.includes("Remote:"));
  assert.ok(!result.stdout.includes("Remote URL:"));
});

// ────────────────────────────────────────────────────────────────────────
// JSON output
// ────────────────────────────────────────────────────────────────────────

test("--json outputs valid, complete JSON", () => {
  const { root, commit } = createRepository();
  runGit(root, ["remote", "add", "origin", "https://example.com/repo.git"]);

  const result = runCli(["--json"], { cwd: root });

  assert.equal(result.exitCode, 0);

  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed["branch"], "main");
  assert.equal(parsed["commit"], commit);
  assert.equal(typeof parsed["shortCommit"], "string");
  assert.equal(parsed["dirty"], false);
  assert.equal(parsed["detached"], false);
  assert.equal(parsed["author"], "Test Author");
  assert.equal(parsed["email"], "test.author@example.com");
  assert.equal(parsed["root"], root);
  assert.equal(parsed["remote"], "origin");
  assert.equal(parsed["remoteUrl"], "https://example.com/repo.git");
});

test("--json reflects dirty state", () => {
  const { root } = createRepository();
  writeFileSync(join(root, "uncommitted.txt"), "dirty\n");

  const result = runCli(["--json"], { cwd: root });

  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed["dirty"], true);
});

// ────────────────────────────────────────────────────────────────────────
// Nested and worktree discovery
// ────────────────────────────────────────────────────────────────────────

test("works from a nested monorepo directory", () => {
  const { root } = createRepository();
  const nested = join(root, "apps", "api", "src");
  mkdirSync(nested, { recursive: true });

  const result = runCli(["--json"], { cwd: nested });

  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(parsed["root"], root);
  assert.equal(parsed["branch"], "main");
});

// ────────────────────────────────────────────────────────────────────────
// Error handling
// ────────────────────────────────────────────────────────────────────────

test("exits 1 with a clear message outside a Git repository", () => {
  const outside = createTemporaryDirectory("git-context-no-repo-");

  const result = runCli([], { cwd: outside });

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /No Git repository/);
});

test("exits 1 for --json outside a Git repository", () => {
  const outside = createTemporaryDirectory("git-context-no-repo-json-");

  const result = runCli(["--json"], { cwd: outside });

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /No Git repository/);
});

test("exits 1 for unknown flags", () => {
  const result = runCli(["--bogus"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown option: --bogus/);
});
