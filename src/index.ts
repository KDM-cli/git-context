import { assertCleanContext } from "./assertions/clean.js";
import { requireBranchContext } from "./assertions/branch.js";
import { assertCriteria } from "./assertions/generic.js";
import { loadConfig } from "./config.js";
import { getGitContext } from "./git-context.js";
import { isRepository as checkRepository } from "./repository/discover.js";
import { createWatcher } from "./watch.js";
import type { GitApi, GitAssertCriteria, GitContext, GitOptions } from "./types.js";
import type { WatchOptions, GitWatcher } from "./watch.js";
import type { GitContextConfig } from "./config.js";

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

  assert(criteria: GitAssertCriteria, options?: GitOptions): void {
    assertCriteria(readContext(options), criteria);
  },

  assertFromConfig(options?: GitOptions): void {
    const cwd = getCwd(options);
    const config = loadConfig(cwd);
    if (config?.assertions !== undefined) {
      assertCriteria(readContext(options), config.assertions);
    }
  },

  loadConfig(options?: GitOptions): GitContextConfig | undefined {
    return loadConfig(getCwd(options));
  },

  watch(options?: WatchOptions): GitWatcher {
    return createWatcher(options);
  },
});

export {
  BranchMismatchError,
  DetachedHeadError,
  DirtyRepositoryError,
  GitCommandError,
  GitContextError,
  GitExecutableNotFoundError,
  RepositoryNotFoundError,
  TagMismatchError,
  UnpushedCommitsError,
} from "./errors/index.js";
export type { GitApi, GitAssertCriteria, GitContext, GitOptions, SubmoduleInfo } from "./types.js";
export type { WatchOptions, GitWatcher } from "./watch.js";
export type { GitContextConfig } from "./config.js";
