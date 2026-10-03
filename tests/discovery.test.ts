import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverySelection } from "../src/discovery.ts";

test("inventory requests require one workspace and reset dependent selections", () => {
  assert.throws(() => discoverySelection(""));
  assert.deepEqual(discoverySelection("workspace-b"), {
    workspaceId: "workspace-b",
    environmentId: "",
    source: "all",
  });
});
