import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeCollection, hasTests } from "../server/coverage.ts";
import { Jobs } from "../server/jobs.ts";
import type { Summary } from "../server/types.ts";
test("test detection ignores strings and comments", () => {
  assert.equal(
    hasTests('// pm.test("fake",()=>{})\nconst x = "pm.test()";'),
    false,
  );
  assert.equal(hasTests('pm["test"]("status",()=>{})'), true);
  assert.equal(hasTests('pm.environment.set("token", "x")'), false);
});
test("scripts inherit through folders; disabled events do not count", () => {
  const c = {
    event: [{ listen: "prerequest", script: { exec: ["const a=1"] } }],
    item: [
      {
        event: [{ listen: "test", script: { exec: ['pm.test("ok",()=>{})'] } }],
        item: [{ request: {} }, { request: {} }],
      },
      {
        request: {},
        event: [
          {
            listen: "test",
            disabled: true,
            script: { exec: ['pm.test("disabled",()=>{})'] },
          },
        ],
      },
    ],
  };
  assert.deepEqual(analyzeCollection(c), { requests: 3, pre: 3, tests: 2 });
});
const summary: Summary = {
  workspace: { id: "w", name: "Workspace" },
  environments: [{ id: "e", name: "Staging" }],
  collections: [
    { id: "a", name: "A", requests: 1, pre: 0, tests: 1, spec: true },
  ],
  mode: "demo",
  updatedAt: "",
  warnings: [],
};
test("job validates selection and environment before execution", () => {
  const jobs = new Jobs(async () => ({
    state: "passed",
    passed: 1,
    failed: 0,
  }));
  assert.throws(() => jobs.start(summary, ["outside"], undefined, "1"));
  assert.throws(() => jobs.start(summary, ["a"], "outside", "2"));
  assert.throws(() => jobs.start(summary, ["a", "a"], undefined, "3"));
});
test("idempotency prevents a second execution; failure is contained", async () => {
  let calls = 0;
  const jobs = new Jobs(async () => {
    calls++;
    throw new Error("secret upstream error");
  });
  const j = jobs.start(summary, ["a"], "e", "key");
  assert.equal(jobs.start(summary, ["a"], "e", "key").id, j.id);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(calls, 1);
  assert.equal(j.state, "completed");
  assert.equal(j.rows[0].state, "error");
  assert.ok(!j.rows[0].error?.includes("secret"));
  assert.throws(() => jobs.start(summary, ["a"], undefined, "key"));
});
