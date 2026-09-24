import { EventEmitter } from "node:events";
import { getGitContext } from "./git-context.js";
import type { GitContext } from "./types.js";

export interface WatchOptions {
  /** Polling interval in milliseconds. Default: 2000. */
  readonly interval?: number;
  /** Working directory to monitor. Default: process.cwd(). */
  readonly cwd?: string;
}

export interface GitWatcher extends EventEmitter {
  /** Stop watching and clean up. */
  stop(): void;
  /** The most recent context snapshot. */
  readonly context: GitContext | null;

  on(event: "change", listener: (context: GitContext, previous: GitContext) => void): this;
  on(event: "dirty" | "clean", listener: (context: GitContext) => void): this;
  on(event: "error", listener: (error: Error) => void): this;

  emit(event: "change", context: GitContext, previous: GitContext): boolean;
  emit(event: "dirty" | "clean", context: GitContext): boolean;
  emit(event: "error", error: Error): boolean;
}

/**
 * Creates a watcher that polls the Git repository state at a configurable
 * interval and emits events when the context changes.
 *
 * ```ts
 * const watcher = git.watch({ interval: 3000 });
 * watcher.on("change", (ctx, prev) => console.log("changed!", ctx.branch));
 * watcher.on("dirty",  (ctx)       => console.log("repo is now dirty"));
 * watcher.on("clean",  (ctx)       => console.log("repo is now clean"));
 * watcher.stop(); // clean up
 * ```
 */
export function createWatcher(options?: WatchOptions): GitWatcher {
  const interval = options?.interval ?? 2000;
  const cwd = options?.cwd ?? process.cwd();
  const emitter = new EventEmitter() as GitWatcher;

  let previousContext: GitContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function contextChanged(a: GitContext, b: GitContext): boolean {
    return (
      a.branch !== b.branch ||
      a.commit !== b.commit ||
      a.dirty !== b.dirty ||
      a.detached !== b.detached ||
      a.stashCount !== b.stashCount ||
      a.mergeConflict !== b.mergeConflict ||
      a.ahead !== b.ahead ||
      a.behind !== b.behind ||
      a.tag !== b.tag
    );
  }

  function poll(): void {
    try {
      const current = getGitContext(cwd);

      // Update context getter
      Object.defineProperty(emitter, "context", {
        value: current,
        writable: true,
        configurable: true,
      });

      if (previousContext !== null && contextChanged(current, previousContext)) {
        emitter.emit("change", current, previousContext);

        // Dirty state transitions
        if (current.dirty && !previousContext.dirty) {
          emitter.emit("dirty", current);
        } else if (!current.dirty && previousContext.dirty) {
          emitter.emit("clean", current);
        }
      }

      previousContext = current;
    } catch (error: unknown) {
      if (error instanceof Error) {
        emitter.emit("error", error);
      }
    }
  }

  // Initialize context property
  Object.defineProperty(emitter, "context", {
    value: null,
    writable: true,
    configurable: true,
  });

  emitter.stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  // Initial poll
  poll();

  // Start interval
  timer = setInterval(poll, interval);

  // Allow process to exit even if watcher is running
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  return emitter;
}
