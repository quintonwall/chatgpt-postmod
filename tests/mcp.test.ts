import { test } from "node:test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
test("MCP advertises extension entrypoints and serves a self-contained widget", async () => {
  const process = spawn(
    globalThis.process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: { ...globalThis.process.env, PORT: "4311", POSTMAN_API_KEY: "" },
      stdio: "ignore",
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4311/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  const client = new Client({ name: "postmod-test", version: "1.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:4311/mcp")),
  );
  try {
    const endpoint = "http://127.0.0.1:4311/api/mcp";
    const preflight = await fetch(endpoint, {
      method: "OPTIONS",
      headers: { Origin: "https://chatgpt.com" },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-origin"),
      "https://chatgpt.com",
    );
    const init = await fetch(endpoint, {
      method: "POST",
      headers: {
        Origin: "https://chatgpt.com",
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      }),
    });
    assert.equal(init.status, 200);
    assert.equal(
      (await fetch(endpoint, { headers: { Origin: "https://chatgpt.com" } }))
        .status,
      405,
    );
    assert.equal(
      (
        await fetch(endpoint, {
          method: "OPTIONS",
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
    const { tools } = await client.listTools();
    for (const tool of tools) {
      assert.deepEqual(tool._meta?.securitySchemes, [{ type: "noauth" }]);
      assert.ok((tool.description?.length ?? 0) < 500);
    }
    const open = tools.find((t) => t.name === "open_postmod")!;
    assert.deepEqual((open._meta?.["openai/ui"] as any).entrypoints, [
      { type: "global" },
      { type: "thread" },
    ]);
    const r = await client.callTool({ name: "open_postmod", arguments: {} });
    assert.equal(r.isError, undefined);
    assert.equal(
      (await fetch("http://127.0.0.1:4311/demo-api/test/1")).status,
      404,
    );
    const resource = await client.readResource({
      uri: "ui://postmod/panel.html",
    });
    assert.ok("text" in resource.contents[0]);
    const html = resource.contents[0].text as string;
    assert.ok(html.includes("postmod"));
    assert.ok(!html.includes('src="/assets/'));
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      "open_postmod",
      "render_postmod",
    ]);
    const rendered = await client.callTool({
      name: "render_postmod",
      arguments: {
        snapshot: {
          workspaces: [{ id: "test-workspace", name: "Fixture" }],
          connected: true,
          canRun: false,
        },
      },
    });
    assert.equal(
      (rendered.structuredContent as any).workspaces[0].id,
      "test-workspace",
    );
    const fresh = await client.callTool({
      name: "open_postmod",
      arguments: {},
    });
    assert.equal(fresh.isError, undefined);
    const opened = await client.callTool({
      name: "open_postmod",
      arguments: {
        snapshot: {
          connected: true,
          canRun: false,
          workspaceId: "test-workspace",
          workspaces: [{ id: "test-workspace", name: "Fixture" }],
          catalogs: [
            {
              workspaceId: "test-workspace",
              environments: [],
              collections: [],
            },
          ],
        },
      },
    });
    assert.equal(opened.isError, undefined);
    assert.equal(
      (opened.structuredContent as any).workspaceId,
      "test-workspace",
    );
  } finally {
    await client.close();
    process.kill();
  }
});
