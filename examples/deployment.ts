import { git } from "git-context";

async function deploy(): Promise<void> {
  // Deploy the application here.
}

git.requireCleanBranch("main");
await deploy();
