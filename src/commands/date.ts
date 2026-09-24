import { runGit } from "./run-git.js";

/**
 * Returns the ISO 8601 commit timestamp of HEAD.
 */
export function getCommitDate(cwd: string): string {
  return runGit(["log", "-1", "--format=%cI"], cwd);
}
