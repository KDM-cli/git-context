import { execFileSync } from "node:child_process";

import { GitCommandError, GitExecutableNotFoundError } from "../errors/index.js";

/**
 * Executes Git without a shell. All package commands go through this function
 * so arguments are always passed as an array rather than interpolated text.
 */
export function runGit(args: readonly string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }).trimEnd();
  } catch (error: unknown) {
    const result = error as {
      code?: string;
      status?: number | null;
      stderr?: string | Buffer;
    };

    if (result.code === "ENOENT") {
      throw new GitExecutableNotFoundError();
    }

    const stderr =
      typeof result.stderr === "string"
        ? result.stderr
        : result.stderr?.toString("utf8") ?? "";

    throw new GitCommandError(args, cwd, result.status ?? null, stderr);
  }
}
