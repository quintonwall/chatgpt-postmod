import "dotenv/config";
import express from "express";
import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { OpenAIExtensions } from "@openai/mcp-extensions/server";
import { z } from "zod";
import {
  emptySnapshot,
  renderSnapshot,
  snapshotSchema,
  hostInstructions,
} from "./host-contract.ts";
const schemas = {
  open_postmod: z.object({ snapshot: snapshotSchema.optional() }),
  render_postmod: z.object({ snapshot: snapshotSchema }),
};
type Tool = keyof typeof schemas;
async function dispatch(name: Tool, args: unknown) {
  const a = schemas[name].parse(args);
  return renderSnapshot(a.snapshot ?? emptySnapshot);
}
const uri = "ui://postmod/panel.html";
const descriptions: Record<Tool, string> = {
  open_postmod:
    "Open Postmod. First use the connected Postman getWorkspaces tool if authorized, and provide its real workspace metadata in snapshot.",
  render_postmod:
    "Render a complete Postmod snapshot after using connected Postman tools to satisfy the user's panel request. This tool only renders supplied data.",
};
function mcp() {
  const server = new McpServer(
    { name: "postmod", version: "0.1.1" },
    { instructions: hostInstructions },
  );
  new OpenAIExtensions(server);
  registerAppResource(server, "Postmod", uri, {}, async () => ({
    contents: [
      {
        uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: await readFile("dist/index.html", "utf8"),
        _meta: {
          "openai/ui": {
            preferredDisplayMode: "inline",
            availableDisplayModes: ["inline", "fullscreen"],
          },
        },
      },
    ],
  }));
  for (const name of Object.keys(schemas) as Tool[]) {
    registerAppTool(
      server,
      name,
      {
        title: name === "open_postmod" ? "Postmod" : name.replaceAll("_", " "),
        description: descriptions[name],
        inputSchema: schemas[name].shape,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
        _meta:
          name === "open_postmod"
            ? {
                securitySchemes: [{ type: "noauth" }],
                ui: { resourceUri: uri },
                "openai/ui": {
                  entrypoints: [{ type: "global" }, { type: "thread" }],
                },
              }
            : {
                securitySchemes: [{ type: "noauth" }],
                ui: { resourceUri: uri, visibility: ["model"] },
              },
      },
      async (args: any) => {
        try {
          const data = await dispatch(name, args);
          return {
            structuredContent: data,
            content: [{ type: "text" as const, text: JSON.stringify(data) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text:
                  error instanceof Error ? error.message : "Operation failed.",
              },
            ],
          };
        }
      },
    );
  }
  return server;
}
const app = express();
app.use(express.json({ limit: "128kb" }));
// Log discovery progress only: never log arguments, snapshots, headers or credentials.
app.use((req, res, next) => {
  if (["/mcp", "/api/mcp"].includes(req.path)) {
    const known = new Set([
      "initialize",
      "notifications/initialized",
      "tools/list",
      "resources/list",
      "resources/templates/list",
      "resources/read",
      "tools/call",
      "ping",
    ]);
    const method = known.has(req.body?.method) ? req.body.method : "other";
    res.on("finish", () =>
      console.info(
        JSON.stringify({
          event: "mcp_request",
          httpMethod: req.method,
          rpcMethod: method,
          status: res.statusCode,
          build: "registration-v2",
        }),
      ),
    );
  }
  next();
});
// Stateless renderer: allow the known ChatGPT host on MCP routes, not arbitrary origins.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isMcp = ["/mcp", "/api/mcp"].includes(req.path);
  const chatgptOrigin = isMcp && origin === "https://chatgpt.com";
  if (
    origin &&
    !chatgptOrigin &&
    ![`http://${req.headers.host}`, `https://${req.headers.host}`].includes(
      origin,
    )
  ) {
    res.status(403).json({ error: "Origin denied" });
    return;
  }
  const host = req.hostname;
  if (
    !process.env.VERCEL &&
    !["127.0.0.1", "localhost", "::1"].includes(host)
  ) {
    res.status(403).json({ error: "Host denied" });
    return;
  }
  if (isMcp && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "MCP-Session-Id, MCP-Protocol-Version",
    );
  }
  if (isMcp && req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.post("/api/tools/:name", async (req, res) => {
  const name = req.params.name as Tool;
  if (!Object.hasOwn(schemas, name)) {
    res.status(404).json({ error: "Unknown tool" });
    return;
  }
  try {
    res.json(await dispatch(name, req.body));
  } catch (e) {
    res
      .status(400)
      .json({ error: e instanceof Error ? e.message : "Operation failed" });
  }
});
app.post(["/mcp", "/api/mcp"], async (req, res) => {
  const server = mcp();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
// Stateless transport has no standalone SSE stream or session to delete.
app.all(["/mcp", "/api/mcp"], (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(405).json({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32000,
      message: "Method not allowed; use Streamable HTTP POST.",
    },
  });
});
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static("dist"));

export default app;
