import { GitCommandError, RepositoryNotFoundError } from "../errors/index.js";
import { runGit } from "../commands/run-git.js";

const NOT_A_REPOSITORY = /not a git repository|not a gitdir/i;

/** Uses Git's own discovery logic, including support for nested directories and worktrees. */
export function discoverRepository(cwd: string): string {
  try {
    return runGit(["rev-parse", "--show-toplevel"], cwd);
  } catch (error: unknown) {
    if (error instanceof GitCommandError && NOT_A_REPOSITORY.test(error.stderr)) {
      throw new RepositoryNotFoundError(cwd);
    }

    throw error;
  }
}

export function isRepository(cwd: string): boolean {
  try {
    discoverRepository(cwd);
    return true;
  } catch (error: unknown) {
    if (error instanceof RepositoryNotFoundError) {
      return false;
    }

    throw error;
  }
}
