import { runGit } from "./run-git.js";

export function isWorkingTreeDirty(cwd: string): boolean {
  return runGit(["status", "--porcelain=v1", "--untracked-files=normal"], cwd) !== "";
}
