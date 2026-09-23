import { git } from "git-context";

// Express-style middleware that attaches Git context to every response header.
// Useful for debugging which version of the app is deployed.

import { createServer } from "node:http";

const context = git();

const server = createServer((_req, res) => {
  res.setHeader("X-Git-Branch", context.branch ?? "detached");
  res.setHeader("X-Git-Commit", context.shortCommit);
  res.setHeader("X-Git-Dirty", context.dirty ? "true" : "false");

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    version: context.shortCommit,
    branch: context.branch,
  }));
});

server.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
  console.log(`Serving commit ${context.shortCommit} from branch ${context.branch ?? "detached HEAD"}`);
});
