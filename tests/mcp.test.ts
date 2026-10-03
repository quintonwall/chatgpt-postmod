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
    const { tools } = await client.listTools();
    const open = tools.find((t) => t.name === "open_postmod")!;
    assert.deepEqual((open._meta?.["openai/ui"] as any).entrypoints, [
      { type: "global" },
      { type: "thread" },
    ]);
    const r = await client.callTool({ name: "open_postmod", arguments: {} });
    assert.equal(r.isError, true);
    assert.match(JSON.stringify(r.content), /POSTMAN_API_KEY/);
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
    const bad = await client.callTool({
      name: "start_workspace_run",
      arguments: {
        workspaceId: "unconfigured",
        collectionIds: ["unconfigured-collection"],
        requestId: "invalid",
      },
    });
    assert.equal(bad.isError, true);
  } finally {
    await client.close();
    process.kill();
  }
});
