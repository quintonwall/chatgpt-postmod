import { test } from "node:test";
import assert from "node:assert/strict";
import { emptySnapshot, renderSnapshot } from "../server/host-contract.ts";
test("renderer rejects mismatched workspace data and run environment", () => {
  assert.throws(() =>
    renderSnapshot({
      ...emptySnapshot,
      workspaceId: "a",
      environmentId: "none",
      summary: {
        workspace: { id: "b", name: "Other" },
        environments: [],
        collections: [],
        updatedAt: "now",
        warnings: [],
        mode: "host",
      },
    }),
  );
  assert.throws(() =>
    renderSnapshot({
      ...emptySnapshot,
      workspaceId: "a",
      environmentId: "staging",
      job: {
        id: "run",
        requestId: "r",
        workspaceId: "a",
        environmentId: "production",
        mode: "host",
        state: "completed",
        rows: [],
        createdAt: "now",
      },
    }),
  );
});
test("renderer strips extraneous fields and preserves unknown metrics", () => {
  const s = renderSnapshot({
    ...emptySnapshot,
    connected: true,
    workspaceId: "a",
    environmentId: "none",
    token: "not-a-real-token",
    summary: {
      workspace: { id: "a", name: "Fixture" },
      environments: [],
      collections: [
        {
          id: "c",
          name: "Fixture",
          requests: null,
          pre: null,
          tests: null,
          spec: null,
        },
      ],
      updatedAt: "now",
      warnings: [],
      mode: "host",
    },
  });
  assert.equal("token" in s, false);
  assert.equal(s.summary?.collections[0].tests, null);
  assert.deepEqual(renderSnapshot(emptySnapshot).workspaces, []);
});
