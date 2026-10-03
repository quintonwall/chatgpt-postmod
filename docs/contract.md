# Host-mediated contract

Postmod exposes only `open_postmod({snapshot?})` and `render_postmod({snapshot})`. See `server/host-contract.ts` for the validated schema. Both are read-only, stateless render operations returning structured content with `ui://postmod/panel.html`.

ChatGPT performs upstream calls using its separately connected Postman plugin. Dial changes are local draft selections and do not send host messages or model-context updates. Before opening the panel, preload `catalogs`: an entry per workspace containing `workspaceId`, `environments`, and `collections`. Names and IDs are sufficient; coverage fields default to null. Dial choices derive from these catalogs independently of a summary or selected environment. Preserve catalogs in every render. Record catalog failures in `error` rather than claiming a successful empty listing. Full collection inspection is separate from discovery. UI requests use `ui/message`; no request is sent directly to Postman. Include requestId, real workspace/environment references, selections, nullable coverage metrics, and optional actual run results. Never include credentials or environment values. A complete snapshot allows a new iframe to restore the same selection.

Unknown metrics must be null. Summary requires a matching workspace and explicit environment (use `none` for no environment). Runs must match selection. Rendering does not verify the provenance of supplied data and never grants Postman access. No snapshots are persisted server-side.

The host may not deliver a render result to the same iframe. Real-account testing is required; a 90-second waiting message does not mean a tool failed, and execution requests must not be automatically retried.
