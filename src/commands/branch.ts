import { runGit } from "./run-git.js";

export interface BranchState {
  readonly branch: string | null;
  readonly detached: boolean;
}

export function getBranchState(cwd: string): BranchState {
  const branch = runGit(["branch", "--show-current"], cwd);

  return branch === ""
    ? { branch: null, detached: true }
    : { branch, detached: false };
}
