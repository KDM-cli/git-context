import { assertCleanContext } from "./assertions/clean.js";
import { requireBranchContext } from "./assertions/branch.js";
import { getGitContext } from "./git-context.js";
import { isRepository as checkRepository } from "./repository/discover.js";
import type { GitApi, GitContext, GitOptions } from "./types.js";

function getCwd(options?: GitOptions): string {
  return options?.cwd ?? process.cwd();
}

function readContext(options?: GitOptions): GitContext {
  return getGitContext(getCwd(options));
}

const gitFunction = (options?: GitOptions): GitContext => readContext(options);

/**
 * Read Git repository state and enforce small, explicit deployment safeguards.
 * Calling `git()` uses `process.cwd()`; `cwd` is optional for multi-repository scripts.
 */
export const git: GitApi = Object.assign(gitFunction, {
  isRepository(options?: GitOptions): boolean {
    return checkRepository(getCwd(options));
  },

  assertClean(options?: GitOptions): void {
    assertCleanContext(readContext(options));
  },

  requireBranch(expectedBranch: string, options?: GitOptions): void {
    requireBranchContext(readContext(options), expectedBranch);
  },

  requireCleanBranch(expectedBranch: string, options?: GitOptions): void {
    const context = readContext(options);
    requireBranchContext(context, expectedBranch);
    assertCleanContext(context);
  },
});

export {
  BranchMismatchError,
  DirtyRepositoryError,
  GitCommandError,
  GitContextError,
  GitExecutableNotFoundError,
  RepositoryNotFoundError,
} from "./errors/index.js";
export type { GitApi, GitContext, GitOptions } from "./types.js";
