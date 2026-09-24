#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getGitContext } from "./git-context.js";
import { GitContextError } from "./errors/index.js";
import type { GitContext } from "./types.js";

// ────────────────────────────────────────────────────────────────────────
// ANSI Color Helpers
// ────────────────────────────────────────────────────────────────────────

const NO_COLOR = !process.stdout.isTTY || !!process.env["NO_COLOR"];

function color(code: string, text: string, forceNoColor: boolean): string {
  if (forceNoColor || NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bold(text: string, noColor: boolean): string {
  return color("1", text, noColor);
}

function green(text: string, noColor: boolean): string {
  return color("32", text, noColor);
}

function red(text: string, noColor: boolean): string {
  return color("31", text, noColor);
}

function yellow(text: string, noColor: boolean): string {
  return color("33", text, noColor);
}

function cyan(text: string, noColor: boolean): string {
  return color("36", text, noColor);
}

function dim(text: string, noColor: boolean): string {
  return color("2", text, noColor);
}

// ────────────────────────────────────────────────────────────────────────
// Output Formatters
// ────────────────────────────────────────────────────────────────────────

function formatTableOutput(context: GitContext, noColor: boolean): string {
  const label = (l: string) => bold(`${l}:`.padEnd(14), noColor);
  const lines: string[] = [
    `${label("Branch")}${context.branch ? cyan(context.branch, noColor) : yellow("(detached HEAD)", noColor)}`,
    `${label("Commit")}${dim(context.shortCommit, noColor)} ${dim(`(${context.commit})`, noColor)}`,
    `${label("Date")}${context.commitDate}`,
    `${label("Dirty")}${context.dirty ? red("yes", noColor) : green("no", noColor)}`,
    `${label("Detached")}${context.detached ? yellow("yes", noColor) : "no"}`,
    `${label("Author")}${context.author} <${context.email}>`,
    `${label("Root")}${context.root}`,
  ];

  if (context.tag !== undefined) {
    lines.push(`${label("Tag")}${green(context.tag, noColor)}`);
  }

  if (context.remote !== undefined) {
    lines.push(`${label("Remote")}${context.remote}`);
  }

  if (context.remoteUrl !== undefined) {
    lines.push(`${label("Remote URL")}${dim(context.remoteUrl, noColor)}`);
  }

  if (context.ahead !== undefined || context.behind !== undefined) {
    const aheadStr = context.ahead !== undefined && context.ahead > 0
      ? yellow(`${context.ahead} ahead`, noColor)
      : `${context.ahead ?? 0} ahead`;
    const behindStr = context.behind !== undefined && context.behind > 0
      ? yellow(`${context.behind} behind`, noColor)
      : `${context.behind ?? 0} behind`;
    lines.push(`${label("Tracking")}${aheadStr}, ${behindStr}`);
  }

  if (context.stashCount > 0) {
    lines.push(`${label("Stash")}${yellow(String(context.stashCount), noColor)} ${context.stashCount === 1 ? "entry" : "entries"}`);
  }

  if (context.mergeConflict) {
    lines.push(`${label("Conflict")}${red("merge conflict detected", noColor)}`);
  }

  if (context.submodules.length > 0) {
    lines.push(`${label("Submodules")}${context.submodules.length}`);
    for (const sub of context.submodules) {
      const dirtyMark = sub.dirty ? red(" (dirty)", noColor) : "";
      lines.push(`  ${dim("└", noColor)} ${sub.path} ${dim(sub.commit.slice(0, 7), noColor)}${dirtyMark}`);
    }
  }

  return lines.join("\n");
}

function formatMinimalOutput(context: GitContext, noColor: boolean): string {
  const branch = context.branch ?? "HEAD";
  const dirty = context.dirty ? red("*", noColor) : "";
  const tag = context.tag !== undefined ? ` ${green(context.tag, noColor)}` : "";
  const tracking = context.ahead !== undefined
    ? ` [${context.ahead}↑${context.behind ?? 0}↓]`
    : "";
  const conflict = context.mergeConflict ? red(" CONFLICT", noColor) : "";
  return `${cyan(branch, noColor)}${dirty} ${dim(context.shortCommit, noColor)}${tag}${tracking}${conflict}`;
}

// ────────────────────────────────────────────────────────────────────────
// CLI Usage & Version
// ────────────────────────────────────────────────────────────────────────

function printUsage(): void {
  const lines = [
    "Usage: git-context [options]",
    "",
    "Print the Git repository state for the current directory.",
    "",
    "Options:",
    "  --json              Output as JSON",
    "  --format=<format>   Output format: table (default), json, minimal",
    "  --no-color          Disable colored output",
    "  --help, -h          Show this help message",
    "  --version           Show version number",
    "",
    "Commands:",
    "  init                Generate a .gitcontextrc.json config file",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function printVersion(): void {
  process.stdout.write("0.6.1\n");
}

// ────────────────────────────────────────────────────────────────────────
// Init Command
// ────────────────────────────────────────────────────────────────────────

function runInit(): void {
  const configPath = join(process.cwd(), ".gitcontextrc.json");
  if (existsSync(configPath)) {
    process.stderr.write(`.gitcontextrc.json already exists at ${configPath}\n`);
    process.exitCode = 1;
    return;
  }

  const defaultConfig = {
    $schema: "https://github.com/KDM-cli/git-context",
    assertions: {
      branch: "main",
      clean: true,
      detached: false,
    },
    format: "table",
  };

  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + "\n");
  process.stdout.write(`Created ${configPath}\n`);

  // Also generate a sample deploy guard
  const guardPath = join(process.cwd(), "scripts", "deploy-guard.ts");
  const scriptsDir = join(process.cwd(), "scripts");
  if (!existsSync(scriptsDir)) {
    mkdirSync(scriptsDir, { recursive: true });
  }

  if (!existsSync(guardPath)) {
    const guardContent = `#!/usr/bin/env npx tsx
import { git } from "git-context";

// Reads assertions from .gitcontextrc.json
git.assert({
  branch: "main",
  clean: true,
  detached: false,
  unpushed: true,
});

console.log("✅ All deployment checks passed.");
`;
    writeFileSync(guardPath, guardContent);
    process.stdout.write(`Created ${guardPath}\n`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

function run(argv: readonly string[]): void {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (args.includes("--version")) {
    printVersion();
    return;
  }

  if (args.includes("init")) {
    runInit();
    return;
  }

  const noColor = args.includes("--no-color");

  // Determine format
  let format: "table" | "json" | "minimal" = "table";
  if (args.includes("--json")) {
    format = "json";
  }
  const formatArg = args.find((a) => a.startsWith("--format="));
  if (formatArg !== undefined) {
    const value = formatArg.split("=")[1];
    if (value === "table" || value === "json" || value === "minimal") {
      format = value;
    } else {
      process.stderr.write(`Unknown format: ${value}\nValid formats: table, json, minimal\n`);
      process.exitCode = 1;
      return;
    }
  }

  // Reject unknown flags
  const knownFlags = new Set([
    "--json", "--help", "-h", "--version", "--no-color", "init",
  ]);
  const unknownFlags = args.filter(
    (arg) => !knownFlags.has(arg) && !arg.startsWith("--format="),
  );
  if (unknownFlags.length > 0) {
    process.stderr.write(`Unknown option: ${unknownFlags[0]}\n`);
    process.stderr.write("Run git-context --help for usage.\n");
    process.exitCode = 1;
    return;
  }

  try {
    const context = getGitContext(process.cwd());

    switch (format) {
      case "json":
        process.stdout.write(JSON.stringify(context, null, 2) + "\n");
        break;
      case "minimal":
        process.stdout.write(formatMinimalOutput(context, noColor) + "\n");
        break;
      case "table":
      default:
        process.stdout.write(formatTableOutput(context, noColor) + "\n");
        break;
    }
  } catch (error: unknown) {
    if (error instanceof GitContextError) {
      process.stderr.write(error.message + "\n");
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

run(process.argv);
