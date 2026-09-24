import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GitAssertCriteria } from "./types.js";

export interface GitContextConfig {
  /** Default assertion criteria applied when calling git.assertFromConfig(). */
  readonly assertions?: GitAssertCriteria;
  /** Default output format for the CLI. */
  readonly format?: "table" | "json" | "minimal";
}

/**
 * Searches for a `.gitcontextrc.json` config file starting from `cwd` and walking
 * up to the filesystem root. Falls back to `package.json#gitContext` if no config
 * file is found. Returns undefined if no configuration exists.
 */
export function loadConfig(cwd: string): GitContextConfig | undefined {
  // 1. Look for .gitcontextrc.json
  let directory = cwd;
  while (true) {
    const configPath = join(directory, ".gitcontextrc.json");
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf8");
      return JSON.parse(raw) as GitContextConfig;
    }

    const parent = join(directory, "..");
    if (parent === directory) break;
    directory = parent;
  }

  // 2. Fall back to package.json#gitContext
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    if (typeof pkg["gitContext"] === "object" && pkg["gitContext"] !== null) {
      return pkg["gitContext"] as GitContextConfig;
    }
  }

  return undefined;
}
