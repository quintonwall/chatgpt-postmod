# Postmod tool contract

All tools return structuredContent and a text fallback. IDs are opaque strings.

- open_postmod: returns connection status, mode, accessible workspaces, and runner capability; attaches the UI resource and global/thread extension entrypoints.
- get_workspace_summary({workspaceId}): returns workspace metadata, environments, collection metrics, scan errors and timestamp. Counts reflect all paginated collection results. Unknown collection metrics are null, never zero.
- start_workspace_run({workspaceId, collectionIds, environmentId?, confirmed, requestId}): requires an explicit execution action and an idempotency key. Validates membership against the workspace. Returns a job with queued collection rows.
- get_run_status({runId}): returns current job state and per-collection results. No credentials or raw response bodies.

HTTP development transport: POST /api/tools/:name with the same JSON arguments. MCP transport: POST /mcp. Local-only, single-user deployment; no public authentication boundary is supplied by this prototype.

Metrics: pre-request script presence and statically detectable pm.test definitions propagate from ancestors; they are not behavioral or code coverage. Linked OpenAPI counts only verified spec relationships. No-test runs are not passing tests. Jobs execute sequentially and persist sanitized results to .data/runs.json; interrupted jobs are marked interrupted on restart. Demo inventory is synthetic, but runs execute actual local HTTP fixtures. Run rows include endpoint records with queued/running/final state, passed/failed/skipped assertions, status code and duration. The bundled Newman runtime drives these values from execution events.
