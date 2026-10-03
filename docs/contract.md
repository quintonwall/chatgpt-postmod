# Host-mediated contract

Postmod exposes only `open_postmod({snapshot?})` and `render_postmod({snapshot})`. See `server/host-contract.ts` for the validated schema. Both are read-only, stateless render operations returning structured content with `ui://postmod/panel.html`.

ChatGPT lists workspace names/IDs and presents choices in chat before opening a panel. After the user selects, fetch only that workspace's inventory into `catalogs` and call open_postmod with workspaceId selected. Opening without a selected workspace and matching catalog is rejected. Never scan all workspaces.

The workspace dial is locked. Environment and collection dials are local. Power cycle sends a chat message requesting workspace choices, without waiting for a snapshot or starting a data timeout. After a new user choice, open a fresh panel with its catalog and reset selections/results. Existing-workspace results use render_postmod. Preserve request IDs on result updates. Stop on rate limits and never retry automatically. No credentials or environment values enter snapshots.


Unknown metrics must be null. Summary requires a matching workspace and explicit environment (use `none` for no environment). Runs must match selection. Rendering does not verify the provenance of supplied data and never grants Postman access. No snapshots are persisted server-side.

The panel applies tool-result snapshots in place without navigating or remounting. Dial replies must use render_postmod rather than open_postmod. The host may still not deliver a render result to the same iframe. Real-account testing is required; a 90-second waiting message does not mean a tool failed, and execution requests must not be automatically retried.
