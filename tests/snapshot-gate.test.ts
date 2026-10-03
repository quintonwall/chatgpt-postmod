import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptsSnapshot } from "../src/snapshot-gate.ts";

test("browsing does not accept host replays or unsolicited selected snapshots", () => {
  assert.equal(acceptsSnapshot(false, undefined, undefined), true);
  assert.equal(acceptsSnapshot(true, undefined, undefined), false);
  assert.equal(
    acceptsSnapshot(true, undefined, "unsolicited-workspace"),
    false,
  );
});
test("explicit actions accept only their matching result, never stale replies", () => {
  assert.equal(acceptsSnapshot(true, "run-2", "run-1"), false);
  assert.equal(acceptsSnapshot(true, "run-2", undefined), false);
  assert.equal(acceptsSnapshot(true, "run-2", "run-2"), true);
  assert.equal(acceptsSnapshot(true, undefined, "run-2"), false);
});
