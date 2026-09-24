import { GitCommandError } from "../errors/index.js";
import { runGit } from "./run-git.js";

/**
 * Returns the exact Git tag pointing at HEAD, or undefined if HEAD has no exact tag.
 */
export function getExactTag(cwd: string): string | undefined {
  try {
    const tag = runGit(["describe", "--tags", "--exact-match"], cwd);
    return tag.length > 0 ? tag : undefined;
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      return undefined;
    }
    throw error;
  }
}
