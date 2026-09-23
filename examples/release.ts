import { git } from "git-context";

// Release script: tag the current commit and log release metadata.
// Run after passing CI and before npm publish.

git.requireCleanBranch("main");

const context = git();
const version = process.argv[2];

if (!version) {
  console.error("Usage: npx tsx examples/release.ts <version>");
  process.exit(1);
}

console.log(`📦 Releasing v${version}`);
console.log(`   Commit:  ${context.commit}`);
console.log(`   Branch:  ${context.branch}`);
console.log(`   Author:  ${context.author} <${context.email}>`);
console.log(`   Root:    ${context.root}`);

if (context.remoteUrl) {
  console.log(`   Remote:  ${context.remoteUrl}`);
}

console.log();
console.log(`Run: git tag v${version} && git push origin v${version}`);
