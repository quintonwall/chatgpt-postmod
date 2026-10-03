import { runLocal } from "./runner.ts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { analyzeCollection } from "./coverage.ts";
import type { Summary, RunRow, EndpointUpdate } from "./types.ts";
let pending: Promise<Client> | undefined;
let names = new Set<string>();
async function client() {
  if (!pending)
    pending = (async () => {
      if (!process.env.POSTMAN_API_KEY)
        throw new Error(
          "Set POSTMAN_API_KEY on the server to connect Postman.",
        );
      const c = new Client({ name: "postmod", version: "0.1.0" });
      await c.connect(
        new StreamableHTTPClientTransport(
          new URL(process.env.POSTMAN_MCP_URL ?? "https://mcp.postman.com/mcp"),
          {
            requestInit: {
              headers: {
                Authorization: `Bearer ${process.env.POSTMAN_API_KEY}`,
              },
            },
          },
        ),
      );
      let cursor: string | undefined;
      do {
        const page = await c.listTools({ cursor });
        for (const t of page.tools) names.add(t.name);
        cursor = page.nextCursor;
      } while (cursor);
      return c;
    })();
  try {
    return await pending;
  } catch (e) {
    pending = undefined;
    throw e;
  }
}
function unwrap(result: any): any {
  if (result.isError)
    throw new Error(
      "Postman rejected the operation. Check account access and tool availability.",
    );
  if (result.structuredContent) return result.structuredContent;
  const text = (result.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Postman returned an unsupported result format.");
  }
}
async function call(name: string, args: Record<string, unknown>) {
  const c = await client();
  if (!names.has(name))
    throw new Error(`Connected Postman server does not expose ${name}.`);
  return unwrap(
    await c.callTool({ name, arguments: args }, undefined, { timeout: 300000 }),
  );
}
export async function capabilities() {
  await client();
  return {
    mode: "live",
    canRun: names.has("getCollection"),
    workspaces: await workspaces(),
  };
}
async function workspaces() {
  let cursor;
  const all: any[] = [];
  do {
    const r = await call("getWorkspaces", {
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...(r.workspaces ?? r.data ?? []));
    cursor = r.meta?.nextCursor;
  } while (cursor);
  return all.map((w) => ({ id: w.id, name: w.name }));
}
export async function workspaceChannels(workspaceId: string) {
  const result = await call("getWorkspace", { workspaceId });
  const workspace = result.workspace ?? result;
  return {
    environments: (workspace.environments ?? []).map((e: any) => ({
      id: e.uid ?? e.id,
      name: e.name,
    })),
  };
}
export async function summary(workspaceId: string): Promise<Summary> {
  const w = await call("getWorkspace", { workspaceId });
  const workspace = w.workspace ?? w;
  const listed: any[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await call("getCollections", {
      workspace: workspaceId,
      limit: 100,
      offset,
    });
    const items = page.collections ?? page.data ?? [];
    listed.push(...items);
    if (items.length < 100) break;
  }
  const linked = new Set<string>();
  const warnings: string[] = [];
  let specKnown = true;
  try {
    let cursor;
    do {
      const page = await call("getAllSpecs", {
        workspaceId,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      for (const spec of page.specs ?? page.data ?? []) {
        if (!/openapi/i.test(spec.type ?? spec.specificationType ?? ""))
          continue;
        let next;
        do {
          const rel = await call("getSpecCollections", {
            specId: spec.id,
            elementType: "collection",
            limit: 100,
            ...(next ? { cursor: next } : {}),
          });
          for (const c of rel.collections ?? rel.data ?? [])
            linked.add(c.uid ?? c.id);
          next = rel.meta?.nextCursor;
        } while (next);
      }
      cursor = page.meta?.nextCursor;
    } while (cursor);
  } catch {
    specKnown = false;
    warnings.push("Spec associations could not be fully verified.");
  }
  const collections = [];
  for (const c of listed) {
    const id = c.uid ?? c.id;
    try {
      const r = await call("getCollection", {
        collectionId: id,
        model: "full",
      });
      collections.push({
        id,
        name: c.name,
        ...analyzeCollection(r.collection ?? r),
        spec: linked.has(id) ? true : specKnown ? false : null,
      });
    } catch {
      collections.push({
        id,
        name: c.name,
        requests: null,
        pre: null,
        tests: null,
        spec: linked.has(id) ? true : null,
        error: "Collection could not be inspected.",
      });
    }
  }
  return {
    workspace: { id: workspaceId, name: workspace.name },
    collections,
    environments: (workspace.environments ?? []).map((e: any) => ({
      id: e.uid ?? e.id,
      name: e.name,
    })),
    warnings,
    updatedAt: new Date().toISOString(),
    mode: "live",
  };
}
export async function execute(
  id: string,
  environmentId?: string,
  workspaceId?: string,
  onUpdate?: EndpointUpdate,
): Promise<Pick<RunRow, "state" | "passed" | "failed" | "error">> {
  await client();
  const response = await call("getCollection", {
    collectionId: id,
    model: "full",
  });
  const environment = environmentId
    ? await call("getEnvironment", { environmentId })
    : undefined;
  const globals =
    workspaceId && names.has("getWorkspaceGlobalVariables")
      ? await call("getWorkspaceGlobalVariables", { workspaceId })
      : undefined;
  return runLocal(
    response.collection ?? response,
    environment?.environment ?? environment,
    globals?.globals ?? globals,
    onUpdate,
  );
}
