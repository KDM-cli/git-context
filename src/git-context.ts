import { getCommitAuthor } from "./commands/author.js";
import { getBranchState } from "./commands/branch.js";
import { getCommit, getShortCommit } from "./commands/commit.js";
import { getRemoteInfo } from "./commands/remote.js";
import { isWorkingTreeDirty } from "./commands/status.js";
import { discoverRepository } from "./repository/discover.js";
import type { GitContext } from "./types.js";

/** Reads a current, uncached snapshot so safety checks cannot use stale dirty state. */
export function getGitContext(cwd: string): GitContext {
  const root = discoverRepository(cwd);
  const { branch, detached } = getBranchState(root);
  const { author, email } = getCommitAuthor(root);
  const remote = getRemoteInfo(root);

  return Object.freeze({
    branch,
    commit: getCommit(root),
    shortCommit: getShortCommit(root),
    dirty: isWorkingTreeDirty(root),
    detached,
    author,
    email,
    root,
    ...remote,
  });
}
