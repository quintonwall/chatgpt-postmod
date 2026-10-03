import { z } from "zod";
const ref = z.object({ id: z.string(), name: z.string() });
const count = z.number().int().nonnegative();
const collection = ref.extend({
  requests: count.nullable().default(null),
  pre: count.nullable().default(null),
  tests: count.nullable().default(null),
  spec: z.boolean().nullable().default(null),
  error: z.string().optional(),
});
const states = z.enum([
  "queued",
  "running",
  "passed",
  "failed",
  "error",
  "no-tests",
  "interrupted",
]);
const endpoint = z.object({
  id: z.string(),
  name: z.string(),
  method: z.string(),
  state: states,
  passed: count,
  failed: count,
  skipped: count,
  statusCode: count.optional(),
  durationMs: z.number().nonnegative().optional(),
  error: z.string().optional(),
});
export const snapshotSchema = z
  .object({
    requestId: z.string().optional(),
    workspaces: z.array(ref).max(1000),
    catalogs: z
      .array(
        z.object({
          workspaceId: z.string(),
          environments: z.array(ref).max(1000),
          collections: z.array(collection).max(1000),
          updatedAt: z.string().optional(),
          error: z.string().optional(),
        }),
      )
      .max(1000)
      .default([]),
    connected: z.boolean(),
    canRun: z.boolean(),
    workspaceId: z.string().default(""),
    environmentId: z.string().default(""),
    source: z.string().default("all"),
    environments: z.array(ref).max(1000).default([]),
    summary: z
      .object({
        workspace: ref,
        environments: z.array(ref),
        collections: z
          .array(
            ref.extend({
              requests: count.nullable(),
              pre: count.nullable(),
              tests: count.nullable(),
              spec: z.boolean().nullable(),
              error: z.string().optional(),
            }),
          )
          .max(1000),
        updatedAt: z.string(),
        warnings: z.array(z.string()),
        mode: z.literal("host"),
      })
      .optional(),
    job: z
      .object({
        id: z.string(),
        requestId: z.string(),
        workspaceId: z.string(),
        environmentId: z.string().optional(),
        mode: z.literal("host"),
        state: z.enum(["running", "completed", "interrupted"]),
        rows: z.array(
          ref.extend({
            state: states,
            passed: count.optional(),
            failed: count.optional(),
            error: z.string().optional(),
            endpoints: z.array(endpoint).optional(),
          }),
        ),
        createdAt: z.string(),
      })
      .optional(),
    error: z.string().optional(),
  })
  .superRefine((s, ctx) => {
    if (
      s.summary &&
      (!s.workspaceId ||
        !s.environmentId ||
        s.summary.workspace.id !== s.workspaceId)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Summary requires a matching selected workspace and an explicitly selected environment (none is allowed).",
      });
    if (
      s.job &&
      (s.job.workspaceId !== s.workspaceId ||
        (s.job.environmentId ?? "none") !== s.environmentId)
    )
      ctx.addIssue({
        code: "custom",
        message: "Run must match the selected workspace and environment.",
      });
  });
export type Snapshot = z.infer<typeof snapshotSchema>;
export const emptySnapshot: Snapshot = {
  workspaces: [],
  catalogs: [],
  connected: false,
  canRun: false,
  workspaceId: "",
  environmentId: "",
  source: "all",
  environments: [],
};
export function renderSnapshot(input: unknown) {
  return { mode: "host", ...snapshotSchema.parse(input) };
}
export const hostInstructions = `Postmod is a display for the user's separately connected Postman plugin. You, the host assistant, must call that plugin's tools using the user's existing authorization. Postmod has no Postman credentials. For initial discovery list workspace names and IDs only. Immediately call open_postmod with those workspaces, workspaceId empty, environmentId empty, source all, and no inventory. Do not ask which workspace in chat or choose the first workspace. Wait for a workspace dial request before fetching inventory. Fetch environment and collection IDs/names ONLY for that selected workspace using workspace detail or workspace-filtered listing tools, paginating only within that workspace. Never inventory all workspaces. Include its catalogs entry and selected workspaceId; leave environmentId empty and source all. Never read environment values or full collection bodies merely to populate dials. Only include observed coverage; omitted metrics default to null. Workspace dial changes request a fresh inventory for exactly the requested workspaceId, resetting environment, source, summary, and run. Environment and collection dials are local and require no host request. Preserve the workspace list and supplied catalogs, replacing the requested catalog. If rate limited, stop, report the error and retry-after guidance, and do not automatically retry or broaden the scan. Include actionable catalog errors rather than silently presenting failed reads as empty lists. Use available workspace/environment/collection read tools for selected IDs. Return only observed normalized metadata via render_postmod; never tokens, variables, request bodies, or secrets. Unknown metrics must be null, not zero. Preserve all workspaces and selected IDs in each complete snapshot. Set mode host on summary/jobs. Use environmentId none for explicitly selected no-environment. Never invent data or endpoint progress. Set canRun true only if an actual connected execution tool is available. Execute only following explicit user intent for the stated collection IDs/environment; never rerun a write to refresh status. If a tool or authorization is unavailable, return connected false or an actionable error and explain in chat. Correlate dial requests with the exact requestId. For dial responses use render_postmod, never open_postmod again. Update the existing panel when the host supports routing tool results to it. Do not ask the user to reopen the panel. Full snapshots must still restore selection if the host creates a new panel instance. Postmod does not itself execute the actions described by its render tools.`;
