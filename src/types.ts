/** A read-only snapshot of the Git repository containing the current directory. */
export interface GitContext {
  /** Current branch, or `null` when `HEAD` is detached. */
  readonly branch: string | null;
  /** Full SHA for the checked-out commit. */
  readonly commit: string;
  /** Git's abbreviated SHA for the checked-out commit. */
  readonly shortCommit: string;
  /** Whether tracked, staged, or untracked files are present. */
  readonly dirty: boolean;
  /** Whether `HEAD` points directly at a commit instead of a branch. */
  readonly detached: boolean;
  /** Author name of `HEAD`. */
  readonly author: string;
  /** Author email address of `HEAD`. */
  readonly email: string;
  /** Absolute filesystem path to the repository's top-level directory. */
  readonly root: string;
  /** Preferred remote name (`origin` when it exists). */
  readonly remote?: string;
  /** URL of the preferred remote. */
  readonly remoteUrl?: string;
}

/**
 * Optional override for scripts which intentionally inspect a repository other
 * than their own working directory. Calling `git()` with no argument remains
 * the zero-configuration path.
 */
export interface GitOptions {
  readonly cwd?: string;
}

export interface GitApi {
  (options?: GitOptions): GitContext;
  isRepository(options?: GitOptions): boolean;
  assertClean(options?: GitOptions): void;
  requireBranch(expectedBranch: string, options?: GitOptions): void;
  requireCleanBranch(expectedBranch: string, options?: GitOptions): void;
}
