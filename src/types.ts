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
  /** Exact tag pointing at `HEAD`, or undefined if `HEAD` is untagged. */
  readonly tag?: string;
  /** ISO 8601 commit timestamp of `HEAD`. */
  readonly commitDate: string;
  /** Number of commits ahead of upstream tracking branch, if configured. */
  readonly ahead?: number;
  /** Number of commits behind upstream tracking branch, if configured. */
  readonly behind?: number;
}

/**
 * Optional criteria for generic repository assertions via `git.assert()`.
 */
export interface GitAssertCriteria {
  /** Expected branch name, or array of acceptable branch names. */
  readonly branch?: string | readonly string[];
  /** When true, requires working tree to be clean. */
  readonly clean?: boolean;
  /** When false, rejects detached HEAD. When true, requires detached HEAD. */
  readonly detached?: boolean;
  /** When true, requires HEAD to have an exact tag. When a string, requires exact tag match. */
  readonly tag?: boolean | string;
  /** When true, requires local branch to not be ahead of remote (ahead === 0). */
  readonly unpushed?: boolean;
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
  assert(criteria: GitAssertCriteria, options?: GitOptions): void;
}
