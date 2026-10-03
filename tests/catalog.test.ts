import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSnapshot } from "../server/host-contract.ts";
import { workspaceData } from "../src/catalog.ts";

test("preloaded choices follow workspace selection without an environment or summary", () => {
  const snapshot = renderSnapshot({
    connected: true,
    canRun: false,
    workspaces: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    catalogs: [
      {
        workspaceId: "a",
        environments: [{ id: "dev", name: "Development" }],
        collections: [{ id: "one", name: "One" }],
      },
      {
        workspaceId: "b",
        environments: [],
        collections: [{ id: "two", name: "Two" }],
      },
    ],
  });
  assert.deepEqual(workspaceData(snapshot, "a")?.environments, [
    { id: "dev", name: "Development" },
  ]);
  assert.equal(workspaceData(snapshot, "a")?.collections[0].id, "one");
  assert.equal(workspaceData(snapshot, "b")?.collections[0].id, "two");
  assert.deepEqual(workspaceData(snapshot, "b")?.environments, []);
  assert.equal(workspaceData(snapshot, "a")?.collections[0].tests, null);
  assert.equal(workspaceData(snapshot, "missing"), undefined);
  assert.equal(workspaceData(snapshot, ""), undefined);
});

test("legacy snapshots and inaccessible catalogs do not invent choices", () => {
  const snapshot = renderSnapshot({
    connected: true,
    canRun: false,
    workspaces: [{ id: "a", name: "A" }],
  });
  assert.equal(workspaceData(snapshot, "a"), undefined);
  snapshot.catalogs.push({
    workspaceId: "a",
    environments: [],
    collections: [],
    error: "Permission denied",
  });
  assert.deepEqual(workspaceData(snapshot, "a")?.warnings, [
    "Permission denied",
  ]);
});
