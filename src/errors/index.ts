/** Base class for all errors thrown by git-context. */
export class GitContextError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Git repository discovery failed for the supplied directory. */
export class RepositoryNotFoundError extends GitContextError {
  readonly cwd: string;

  constructor(cwd: string) {
    super(
      `No Git repository was found from:\n${cwd}\n\n` +
        "Run this command inside a Git working tree, or pass a repository cwd.",
    );
    this.cwd = cwd;
  }
}

/** Git could not be found on the process PATH. */
export class GitExecutableNotFoundError extends GitContextError {
  constructor() {
    super(
      "Git executable was not found.\n\n" +
        "Install Git and ensure the `git` command is available on PATH before using git-context.",
    );
  }
}

/** A Git subprocess failed unexpectedly. */
export class GitCommandError extends GitContextError {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly stderr: string;

  constructor(args: readonly string[], cwd: string, exitCode: number | null, stderr: string) {
    const detail = stderr.trim() || "Git did not provide an error message.";
    super(`Git command failed: git ${args.join(" ")}\n\n${detail}`);
    this.args = [...args];
    this.cwd = cwd;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/** A safety guard detected uncommitted repository changes. */
export class DirtyRepositoryError extends GitContextError {
  constructor() {
    super(
      "Working tree is dirty.\n\n" +
        "Commit or stash your changes before continuing.",
    );
  }
}

/** A safety guard detected that the current branch differs from the required branch. */
export class BranchMismatchError extends GitContextError {
  readonly expected: string;
  readonly actual: string | null;

  constructor(expected: string, actual: string | null) {
    super(
      "Branch requirement failed.\n\n" +
        `Current branch:\n${actual ?? "detached HEAD"}\n\n` +
        `Required:\n${expected}`,
    );
    this.expected = expected;
    this.actual = actual;
  }
}
