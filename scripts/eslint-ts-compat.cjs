const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (request === "typescript") {
    return require("@typescript/typescript6");
  }
  if (request.startsWith("typescript/")) {
    const subpath = request.slice("typescript/".length);
    try {
      return require(`@typescript/typescript6/${subpath}`);
    } catch {
      // Fallback
    }
  }
  return originalLoad.apply(this, arguments);
};
