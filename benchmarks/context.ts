/**
 * Benchmark: measure how long git() context snapshots take.
 *
 * Run with: npx tsx benchmarks/context.ts
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { git } from "../src/index.js";

function createRepository(): string {
  const raw = mkdtempSync(join(tmpdir(), "git-context-bench-"));
  const root = realpathSync(raw);
  execFileSync("git", ["init", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Bench Author"], { cwd: root });
  execFileSync("git", ["config", "user.email", "bench@example.com"], { cwd: root });
  writeFileSync(join(root, "README.md"), "# Bench\n");
  execFileSync("git", ["add", "README.md"], { cwd: root });
  execFileSync("git", ["commit", "-m", "Initial bench commit"], { cwd: root });
  execFileSync("git", ["remote", "add", "origin", "https://example.com/bench.git"], { cwd: root });
  return root;
}

function bench(label: string, fn: () => void, iterations: number = 100): void {
  // Warmup
  for (let i = 0; i < 5; i++) {
    fn();
  }

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  const mean = times.reduce((s, t) => s + t, 0) / times.length;
  const min = times[0]!;
  const max = times[times.length - 1]!;

  console.log(`${label} (${iterations} iterations)`);
  console.log(`  min:    ${min.toFixed(2)}ms`);
  console.log(`  mean:   ${mean.toFixed(2)}ms`);
  console.log(`  median: ${median.toFixed(2)}ms`);
  console.log(`  p95:    ${p95.toFixed(2)}ms`);
  console.log(`  max:    ${max.toFixed(2)}ms`);
  console.log();
}

const root = createRepository();

try {
  bench("git() from root", () => {
    git({ cwd: root });
  });

  const nested = join(root, "apps", "api", "src");
  mkdirSync(nested, { recursive: true });
  bench("git() from nested directory", () => {
    git({ cwd: nested });
  });

  bench("git.isRepository()", () => {
    git.isRepository({ cwd: root });
  });
} finally {
  rmSync(root, { recursive: true, force: true });
}
