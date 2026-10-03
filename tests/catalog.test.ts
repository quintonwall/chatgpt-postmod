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

test("missing, mismatched, and duplicate inventories are rejected before rendering", () => {
  const base = {
    connected: true,
    canRun: false,
    workspaces: [{ id: "a", name: "A" }],
  };
  assert.throws(() => renderSnapshot(base), /Missing inventory/);
  assert.throws(
    () =>
      renderSnapshot({
        ...base,
        catalogs: [{ workspaceId: "other", environments: [], collections: [] }],
      }),
    /Missing inventory/,
  );
  const catalog = { workspaceId: "a", environments: [], collections: [] };
  assert.throws(
    () => renderSnapshot({ ...base, catalogs: [catalog, catalog] }),
    /Duplicate/,
  );
  const snapshot = renderSnapshot({
    ...base,
    catalogs: [{ ...catalog, error: "Permission denied" }],
  });
  assert.deepEqual(workspaceData(snapshot, "a")?.warnings, [
    "Permission denied",
  ]);
});

test("partial coverage cannot hide collections in the workspace inventory", () => {
  const snapshot = renderSnapshot({
    connected: true,
    canRun: false,
    workspaceId: "a",
    environmentId: "none",
    workspaces: [{ id: "a", name: "A" }],
    catalogs: [
      {
        workspaceId: "a",
        environments: [{ id: "env", name: "Env" }],
        collections: [
          { id: "one", name: "One" },
          { id: "two", name: "Two" },
        ],
      },
    ],
    summary: {
      workspace: { id: "a", name: "A" },
      environments: [],
      collections: [
        {
          id: "one",
          name: "One",
          requests: 3,
          tests: 2,
          pre: null,
          spec: null,
        },
      ],
      updatedAt: "now",
      warnings: [],
      mode: "host",
    },
  });
  const data = workspaceData(snapshot, "a")!;
  assert.deepEqual(
    data.collections.map((c) => c.id),
    ["one", "two"],
  );
  assert.equal(data.collections[0].tests, 2);
  assert.equal(data.collections[1].tests, null);
  assert.equal(data.environments[0].id, "env");
  snapshot.summary!.collections = [];
  assert.equal(workspaceData(snapshot, "a")?.collections.length, 2);
});

test("a failed inventory fetch does not hide already observed collection details", () => {
  const snapshot = renderSnapshot({
    connected: true,
    canRun: false,
    workspaceId: "a",
    environmentId: "none",
    workspaces: [{ id: "a", name: "A" }],
    catalogs: [
      {
        workspaceId: "a",
        environments: [],
        collections: [],
        error: "Collection inventory request was rate limited (429)",
      },
    ],
    summary: {
      workspace: { id: "a", name: "A" },
      environments: [],
      collections: [
        {
          id: "known",
          name: "Known collection",
          requests: 1,
          tests: 1,
          pre: null,
          spec: null,
        },
      ],
      updatedAt: "now",
      warnings: [],
      mode: "host",
    },
  });
  assert.equal(workspaceData(snapshot, "a")?.collections[0].id, "known");
  assert.match(workspaceData(snapshot, "a")!.warnings[0], /429/);
});
