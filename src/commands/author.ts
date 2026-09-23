import { runGit } from "./run-git.js";

export interface CommitAuthor {
  readonly author: string;
  readonly email: string;
}

export function getCommitAuthor(cwd: string): CommitAuthor {
  return {
    author: runGit(["log", "-1", "--format=%an"], cwd),
    email: runGit(["log", "-1", "--format=%ae"], cwd),
  };
}
