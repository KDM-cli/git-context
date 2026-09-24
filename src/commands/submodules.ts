import { GitCommandError } from "../errors/index.js";
import { runGit } from "./run-git.js";

export interface SubmoduleInfo {
  /** Relative path to the submodule directory. */
  readonly path: string;
  /** Current commit SHA of the submodule. */
  readonly commit: string;
  /** Whether the submodule working tree has uncommitted changes. */
  readonly dirty: boolean;
}

/**
 * Returns information about all configured submodules, or an empty array if none exist.
 */
export function getSubmodules(cwd: string): readonly SubmoduleInfo[] {
  try {
    // --recursive is intentionally omitted; we report top-level submodules only
    const output = runGit(["submodule", "status"], cwd);
    if (output.length === 0) {
      return [];
    }

    return output
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        // Format: " <commit> <path> (<describe>)" or "+<commit> <path> (<describe>)" for dirty
        const dirty = line.startsWith("+");
        const trimmed = line.replace(/^[+ -]/, "");
        const parts = trimmed.split(/\s+/);
        const commit = parts[0] ?? "";
        const path = parts[1] ?? "";
        return { path, commit, dirty };
      });
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      // Submodule command can fail if .gitmodules is missing or corrupt;
      // treat as no submodules rather than crashing
      return [];
    }
    throw error;
  }
}
