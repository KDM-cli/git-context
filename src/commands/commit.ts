import { runGit } from "./run-git.js";

export function getCommit(cwd: string): string {
  return runGit(["rev-parse", "HEAD"], cwd);
}

export function getShortCommit(cwd: string): string {
  return runGit(["rev-parse", "--short", "HEAD"], cwd);
}
