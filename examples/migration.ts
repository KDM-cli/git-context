import { git } from "git-context";

async function migrateDatabase(): Promise<void> {
  // Run migrations here.
}

git.requireCleanBranch("main");
await migrateDatabase();
