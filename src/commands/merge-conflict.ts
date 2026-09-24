import { runGit } from "./run-git.js";

/**
 * Returns true if the repository has unmerged files (merge conflict state).
 */
export function hasMergeConflict(cwd: string): boolean {
  const output = runGit(["ls-files", "--unmerged"], cwd);
  return output.length > 0;
}
