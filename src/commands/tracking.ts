import { GitCommandError } from "../errors/index.js";
import { runGit } from "./run-git.js";

/**
 * Returns ahead and behind commit counts relative to the upstream tracking branch.
 * Returns empty object when no upstream tracking branch is configured or HEAD is detached.
 */
export function getTrackingStatus(cwd: string): {
  ahead?: number;
  behind?: number;
} {
  try {
    const output = runGit(
      ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
      cwd,
    );
    const parts = output.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
      const ahead = parseInt(parts[0], 10);
      const behind = parseInt(parts[1], 10);
      if (!Number.isNaN(ahead) && !Number.isNaN(behind)) {
        return { ahead, behind };
      }
    }
    return {};
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      const stderr = error.stderr.toLowerCase();
      if (
        stderr.includes("no upstream") ||
        stderr.includes("does not point to a branch") ||
        stderr.includes("not stored as a remote-tracking branch") ||
        stderr.includes("@{upstream}")
      ) {
        return {};
      }
    }
    throw error;
  }
}
