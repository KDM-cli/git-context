import { getCommitAuthor } from "./commands/author.js";
import { getBranchState } from "./commands/branch.js";
import { getCommit, getShortCommit } from "./commands/commit.js";
import { getCommitDate } from "./commands/date.js";
import { hasMergeConflict } from "./commands/merge-conflict.js";
import { getRemoteInfo } from "./commands/remote.js";
import { getStashCount } from "./commands/stash.js";
import { isWorkingTreeDirty } from "./commands/status.js";
import { getSubmodules } from "./commands/submodules.js";
import { getExactTag } from "./commands/tag.js";
import { getTrackingStatus } from "./commands/tracking.js";
import { discoverRepository } from "./repository/discover.js";
import type { GitContext } from "./types.js";

/** Reads a current, uncached snapshot so safety checks cannot use stale dirty state. */
export function getGitContext(cwd: string): GitContext {
  const root = discoverRepository(cwd);
  const { branch, detached } = getBranchState(root);
  const { author, email } = getCommitAuthor(root);
  const remote = getRemoteInfo(root);
  const tag = getExactTag(root);
  const tracking = getTrackingStatus(root);

  return Object.freeze({
    branch,
    commit: getCommit(root),
    shortCommit: getShortCommit(root),
    dirty: isWorkingTreeDirty(root),
    detached,
    author,
    email,
    root,
    commitDate: getCommitDate(root),
    stashCount: getStashCount(root),
    mergeConflict: hasMergeConflict(root),
    submodules: getSubmodules(root),
    ...(tag !== undefined ? { tag } : {}),
    ...tracking,
    ...remote,
  });
}

