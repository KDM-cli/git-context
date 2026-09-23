import { git } from "git-context";

const context = git();

console.log(`Running ${context.shortCommit} from ${context.branch ?? "detached HEAD"}`);
console.log(`Working tree is ${context.dirty ? "dirty" : "clean"}.`);
