# Host-mediated contract

Postmod exposes only `open_postmod({snapshot?})` and `render_postmod({snapshot})`. See `server/host-contract.ts` for the validated schema. Both are read-only, stateless render operations returning structured content with `ui://postmod/panel.html`.

ChatGPT performs upstream calls using its separately connected Postman plugin. Initially list workspace names/IDs and ask the user to select one before rendering. Fetch only that workspace's inventory into `catalogs` (workspaceId, environments, collections); set snapshot.workspaceId and leave environmentId empty. Never scan all workspaces. Names and IDs suffice; unknown coverage defaults to null.

Workspace changes are debounced for 900 ms and send a scoped `ui/message`. Power cycle fetches fresh inventory for the current workspace only. Both reset environment, source, summary, and run. Environment and collection dial changes remain local. No requests go directly to Postman. Preserve the workspace list, requestId, and catalogs in complete snapshots. Stop on rate limits, report retry guidance, and never automatically retry. Catalog errors distinguish unavailable data from empty inventory. Never include credentials or environment values. A complete snapshot lets a new iframe restore selection.

Unknown metrics must be null. Summary requires a matching workspace and explicit environment (use `none` for no environment). Runs must match selection. Rendering does not verify the provenance of supplied data and never grants Postman access. No snapshots are persisted server-side.

The host may not deliver a render result to the same iframe. Real-account testing is required; a 90-second waiting message does not mean a tool failed, and execution requests must not be automatically retried.
