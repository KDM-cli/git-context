import { runGit } from "./run-git.js";

export interface RemoteInfo {
  readonly remote?: string;
  readonly remoteUrl?: string;
}

export function getRemoteInfo(cwd: string): RemoteInfo {
  const remotes = runGit(["remote"], cwd)
    .split("\n")
    .filter((remote) => remote.length > 0);
  const remote = remotes.includes("origin") ? "origin" : remotes[0];

  if (remote === undefined) {
    return {};
  }

  return {
    remote,
    remoteUrl: runGit(["remote", "get-url", remote], cwd),
  };
}
