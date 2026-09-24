import {
  BranchMismatchError,
  DetachedHeadError,
  DirtyRepositoryError,
  GitContextError,
  TagMismatchError,
  UnpushedCommitsError,
} from "../errors/index.js";
import type { GitAssertCriteria, GitContext } from "../types.js";

/**
 * Validates repository state against generic assertion criteria.
 */
export function assertCriteria(
  context: GitContext,
  criteria: GitAssertCriteria,
): void {
  // 1. Branch check
  if (criteria.branch !== undefined) {
    if (typeof criteria.branch === "string") {
      if (context.branch !== criteria.branch) {
        throw new BranchMismatchError(criteria.branch, context.branch);
      }
    } else {
      if (context.branch === null || !criteria.branch.includes(context.branch)) {
        throw new BranchMismatchError(criteria.branch.join(", "), context.branch);
      }
    }
  }

  // 2. Working tree cleanliness check
  if (criteria.clean === true && context.dirty) {
    throw new DirtyRepositoryError();
  }

  // 3. Detached HEAD check
  if (criteria.detached !== undefined) {
    if (criteria.detached === false && context.detached) {
      throw new DetachedHeadError();
    }
    if (criteria.detached === true && !context.detached) {
      throw new GitContextError(
        `Expected detached HEAD, but repository is on branch "${context.branch ?? "unknown"}".`,
      );
    }
  }

  // 4. Tag check
  if (criteria.tag !== undefined) {
    if (criteria.tag === true) {
      if (context.tag === undefined) {
        throw new TagMismatchError(true, null);
      }
    } else if (typeof criteria.tag === "string") {
      if (context.tag !== criteria.tag) {
        throw new TagMismatchError(criteria.tag, context.tag ?? null);
      }
    }
  }

  // 5. Unpushed commits check
  if (criteria.unpushed === true) {
    if (context.ahead !== undefined && context.ahead > 0) {
      throw new UnpushedCommitsError(context.ahead);
    }
  }
}
