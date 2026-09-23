import { DirtyRepositoryError } from "../errors/index.js";
import type { GitContext } from "../types.js";

export function assertCleanContext(context: GitContext): void {
  if (context.dirty) {
    throw new DirtyRepositoryError();
  }
}
