import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { parseRun, runLocal } from "../server/runner.ts";
test("request and script errors never report a passing suite", () => {
  assert.equal(
    parseRun({
      run: {
        stats: { assertions: { total: 2, failed: 0 }, requests: { failed: 1 } },
      },
    }).state,
    "error",
  );
  assert.equal(
    parseRun({ stats: { assertions: { total: 0, failed: 0 } } }).state,
    "no-tests",
  );
  assert.equal(parseRun({}).state, "error");
});
test("Endpoint runner emits real request and assertion events", async () => {
  const server = createServer((_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end('{"ok":true}');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  try {
    const events: any[] = [];
    const result = await runLocal(
      {
        info: {
          name: "Postmod local verification",
          schema:
            "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Health",
            request: {
              method: "GET",
              url: `http://127.0.0.1:${address.port}/health`,
            },
            event: [
              {
                listen: "test",
                script: {
                  type: "text/javascript",
                  exec: [
                    'pm.test("status",()=>pm.response.to.have.status(200));',
                    'pm.test("body",()=>pm.expect(pm.response.json().ok).to.eql(true));',
                  ],
                },
              },
            ],
          },
        ],
      },
      undefined,
      undefined,
      (rows) => events.push(structuredClone(rows)),
    );
    assert.ok(events.some((rows) => rows[0].state === "running"));
    assert.equal(events.at(-1)[0].passed, 2);
    assert.equal(events.at(-1)[0].state, "passed");
    assert.equal(result.state, "passed");
    assert.equal(result.passed, 2);
    assert.equal(result.failed, 0);
  } finally {
    server.close();
  }
});
test("endpoint states distinguish partial failures, no tests, and script errors", async () => {
  const server = createServer((_req, res) => res.end("ok"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  try {
    let last: any[] = [];
    const result = await runLocal(
      {
        info: {
          name: "Status matrix",
          schema:
            "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "partial",
            request: { url: `http://127.0.0.1:${port}`, method: "GET" },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    'pm.test("pass",()=>pm.expect(true).to.eql(true));',
                    'pm.test("fail",()=>pm.expect(true).to.eql(false));',
                  ],
                },
              },
            ],
          },
          {
            name: "untested",
            request: { url: `http://127.0.0.1:${port}`, method: "GET" },
          },
          {
            name: "script error",
            request: { url: `http://127.0.0.1:${port}`, method: "GET" },
            event: [
              {
                listen: "test",
                script: { exec: ['throw new Error("broken script");'] },
              },
            ],
          },
        ],
      },
      undefined,
      undefined,
      (e) => {
        last = structuredClone(e);
      },
    );
    assert.equal(last[0].state, "failed");
    assert.equal(last[0].passed, 1);
    assert.equal(last[0].failed, 1);
    assert.equal(last[1].state, "no-tests");
    assert.equal(last[2].state, "error");
    assert.equal(result.state, "error");
  } finally {
    server.close();
  }
});
