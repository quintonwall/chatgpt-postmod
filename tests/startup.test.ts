import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("serverless entrypoint loads in native Node without the development loader", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./api/mcp.ts')"],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env, NODE_OPTIONS: "" },
    },
  );
  assert.equal(
    result.status,
    0,
    result.stderr || result.error?.message || "Native startup failed",
  );
});
