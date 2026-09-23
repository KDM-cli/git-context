#!/usr/bin/env node

import { getGitContext } from "./git-context.js";
import { GitContextError } from "./errors/index.js";

function printUsage(): void {
  const lines = [
    "Usage: git-context [options]",
    "",
    "Print the Git repository state for the current directory.",
    "",
    "Options:",
    "  --json       Output as JSON",
    "  --help, -h   Show this help message",
    "  --version    Show version number",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function printVersion(): void {
  // Read from package.json at build time is not available in a pure-ESM
  // single-file CLI, so the version is kept in sync manually.
  process.stdout.write("0.4.0\n");
}

function formatHumanOutput(context: {
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
}): string {
  const lines: string[] = [
    `Branch:       ${context.branch ?? "(detached HEAD)"}`,
    `Commit:       ${context.shortCommit} (${context.commit})`,
    `Dirty:        ${context.dirty ? "yes" : "no"}`,
    `Detached:     ${context.detached ? "yes" : "no"}`,
    `Author:       ${context.author} <${context.email}>`,
    `Root:         ${context.root}`,
  ];

  if (context.remote !== undefined) {
    lines.push(`Remote:       ${context.remote}`);
  }

  if (context.remoteUrl !== undefined) {
    lines.push(`Remote URL:   ${context.remoteUrl}`);
  }

  return lines.join("\n");
}

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

  const jsonMode = args.includes("--json");

  // Reject unknown flags
  const unknownFlags = args.filter(
    (arg) => arg !== "--json" && arg !== "--help" && arg !== "-h" && arg !== "--version",
  );
  if (unknownFlags.length > 0) {
    process.stderr.write(`Unknown option: ${unknownFlags[0]}\n`);
    process.stderr.write("Run git-context --help for usage.\n");
    process.exitCode = 1;
    return;
  }

  try {
    const context = getGitContext(process.cwd());

    if (jsonMode) {
      process.stdout.write(JSON.stringify(context, null, 2) + "\n");
    } else {
      process.stdout.write(formatHumanOutput(context) + "\n");
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
