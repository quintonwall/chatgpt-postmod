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
  capabilities,
  summary,
  execute,
  workspaceChannels,
} from "./postman.ts";
import { Jobs } from "./jobs.ts";
const jobs = new Jobs(execute, ".data/runs.json");
const schemas = {
  open_postmod: z.object({}),
  get_workspace_channels: z.object({ workspaceId: z.string().min(1).max(200) }),
  get_workspace_summary: z.object({ workspaceId: z.string().min(1).max(200) }),
  start_workspace_run: z.object({
    workspaceId: z.string().min(1),
    collectionIds: z.array(z.string()).min(1).max(1000),
    environmentId: z.string().optional(),
    confirmed: z.literal(true),
    requestId: z.string().min(1).max(100),
  }),
  get_run_status: z.object({ runId: z.string() }),
};
type Tool = keyof typeof schemas;
async function dispatch(name: Tool, args: unknown): Promise<any> {
  const a: any = schemas[name].parse(args);
  switch (name) {
    case "open_postmod":
      return capabilities();
    case "get_workspace_channels":
      return workspaceChannels(a.workspaceId);
    case "get_workspace_summary": {
      const s = await summary(a.workspaceId);
      return { ...s, latestRun: jobs.latest(a.workspaceId, s.mode) };
    }
    case "get_run_status":
      return jobs.get(a.runId);
    case "start_workspace_run": {
      const cap = await capabilities();
      if (!cap.canRun)
        throw new Error(
          "The connected Postman server must expose getCollection to run tests.",
        );
      return jobs.start(
        await summary(a.workspaceId),
        a.collectionIds,
        a.environmentId,
        a.requestId,
      );
    }
  }
}
const uri = "ui://postmod/panel.html";
const descriptions: Record<Tool, string> = {
  open_postmod: "Open Postmod workspace control panel.",
  get_workspace_channels:
    "List environments for a workspace before tuning the control panel.",
  get_workspace_summary:
    "Inspect collections, OpenAPI associations, and script/test presence in a Postman workspace.",
  start_workspace_run:
    "Execute selected Postman collections against the selected environment. Sends real API requests that may change data. Requires explicit user execution intent.",
  get_run_status: "Read a Postmod run and its collection results.",
};
function mcp() {
  const server = new McpServer({ name: "postmod", version: "0.1.0" });
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
          readOnlyHint: name !== "start_workspace_run",
          destructiveHint: name === "start_workspace_run",
          openWorldHint: true,
        },
        _meta:
          name === "open_postmod"
            ? {
                ui: { resourceUri: uri },
                "openai/ui": {
                  entrypoints: [{ type: "global" }, { type: "thread" }],
                },
              }
            : { ui: { visibility: ["app", "model"] } },
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
// This build is intentionally single-user and loopback-only. Reject foreign browser origins.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) {
    res.status(403).json({ error: "Origin denied" });
    return;
  }
  const host = req.hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    res.status(403).json({ error: "Host denied" });
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
app.post("/mcp", async (req, res) => {
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
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(express.static("dist"));
app.listen(Number(process.env.PORT ?? 4310), "127.0.0.1", () =>
  console.log("Postmod: http://127.0.0.1:" + (process.env.PORT ?? 4310)),
);
