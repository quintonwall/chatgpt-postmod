# Host-mediated contract

Postmod exposes only `open_postmod({snapshot?})` and `render_postmod({snapshot})`. See `server/host-contract.ts` for the validated schema. Both are read-only, stateless render operations returning structured content with `ui://postmod/panel.html`.

Discovery follows `server/workspace-discovery.ts`: resolve the current user, list createdBy-filtered workspaces plus previously verified memberships, and preload their environment/collection references. Never fall back to organization-wide discovery. Open without asking a workspace question, with workspace/environment unselected. All dials select locally from catalogs. Power cycle refreshes the same narrowed inventory via a host request. Stop on rate limits and represent unfinished catalogs with errors; do not retry automatically. Never fetch full collection bodies or environment values merely for inventory.


Unknown metrics must be null. Summary requires a matching workspace and explicit environment (use `none` for no environment). Runs must match selection. Rendering does not verify the provenance of supplied data and never grants Postman access. No snapshots are persisted server-side.

The panel applies tool-result snapshots in place without navigating or remounting. Dial replies must use render_postmod rather than open_postmod. The host may still not deliver a render result to the same iframe. Real-account testing is required; a 90-second waiting message does not mean a tool failed, and execution requests must not be automatically retried.

Workspace choices exclude organization-wide visibility alone. Discovery first resolves the current user and lists workspaces they created; this is labeled explicitly and is not a complete membership list. Other workspaces are included only with verified membership. If a joined workspace is missing, provide its name or ID for a targeted membership check. Discovery never falls back to an organization-wide list or bulk role scan.

Snapshot validation rejects missing, duplicate, or mismatched workspace catalogs. Every listed workspace requires inventory or an explicit fetch error before rendering. Workspace selection never initiates a background request, so the UI reports missing inventory rather than waiting indefinitely.
