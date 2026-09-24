import { runGit } from "./run-git.js";

/**
 * Returns the number of stash entries in the repository.
 */
export function getStashCount(cwd: string): number {
  const output = runGit(["stash", "list"], cwd);
  if (output.length === 0) {
    return 0;
  }
  return output.split("\n").length;
}
