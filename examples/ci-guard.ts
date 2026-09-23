import { git } from "git-context";

// CI guard: prevent accidental deploys from wrong branches or dirty trees.
// Add this as a step before your deploy command in any CI pipeline.

try {
  git.requireCleanBranch("main");
  const context = git();
  console.log(`✅ CI check passed: deploying ${context.shortCommit} from ${context.branch}`);
  process.exitCode = 0;
} catch (error: unknown) {
  console.error(`❌ CI check failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
