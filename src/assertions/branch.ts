import { BranchMismatchError } from "../errors/index.js";
import type { GitContext } from "../types.js";

export function requireBranchContext(context: GitContext, expectedBranch: string): void {
  if (context.branch !== expectedBranch) {
    throw new BranchMismatchError(expectedBranch, context.branch);
  }
}
