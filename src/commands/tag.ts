import { GitCommandError } from "../errors/index.js";
import { runGit } from "./run-git.js";

/**
 * Returns the exact Git tag pointing at HEAD, or undefined if HEAD has no exact tag.
 * When requestedTag is provided, checks if that specific tag points at HEAD.
 */
export function getExactTag(cwd: string, requestedTag?: string): string | undefined {
  if (requestedTag !== undefined) {
    try {
      const tagRef = runGit(
        ["rev-parse", "-q", "--verify", `refs/tags/${requestedTag}^{commit}`],
        cwd,
      );
      const headRef = runGit(["rev-parse", "-q", "--verify", "HEAD^{commit}"], cwd);
      return tagRef.length > 0 && tagRef === headRef ? requestedTag : undefined;
    } catch (error: unknown) {
      if (error instanceof GitCommandError) {
        if (error.exitCode === 1 && !error.stderr.trim()) {
          return undefined;
        }
      }
      throw error;
    }
  }

  try {
    const tag = runGit(["describe", "--tags", "--exact-match"], cwd);
    return tag.length > 0 ? tag : undefined;
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      const stderr = error.stderr.toLowerCase();
      if (
        stderr.includes("no names found") ||
        stderr.includes("no tag exactly matches")
      ) {
        return undefined;
      }
    }
    throw error;
  }
}
