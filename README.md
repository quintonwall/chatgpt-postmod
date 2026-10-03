# Postmod

A compact, amplifier-inspired Postman control panel built as an MCP App with OpenAI Plugin Extensions. Includes sidebar and conversation-panel entrypoints, segmented coverage meters, an animated equalizer, collection inspection, and persistent workspace test jobs.

See [INSTALL.md](INSTALL.md) for real-data setup, ChatGPT registration, and the distinction between Postman OAuth and this build’s API-key authentication.

## Run locally

Requires Node.js 22+ and npm. The event-driven Postman Newman runner is bundled as a dependency.

```sh
npm install
npm run build
npm start
```

Open http://127.0.0.1:4310. Postmod requires a real Postman connection. Without credentials it displays NOT CONNECTED and leaves the controls empty. No demo inventory or demo execution path is included.

## Connect your Postman account

Copy `.env.example` to `.env`, provide `POSTMAN_API_KEY` on the server. Never put the key in the UI or plugin manifest. Restart the server. Postmod connects to the Postman remote MCP server directly; a separately installed Postman plugin is not required.

The default upstream is `https://mcp.postman.com/mcp`. Configure `POSTMAN_MCP_URL` for the appropriate regional endpoint. No separately installed runner is required.

Live mode discovers tools and workspaces, pages collection results, fetches full collection payloads, and inspects explicit OpenAPI relationships. Individual unreadable collections and incomplete spec scans remain unknown. Collection/folder scripts are inherited. Static `pm.test` detection ignores comments and string literals; dynamic code and imported test packages are not fully analyzable. These measurements describe presence, not behavioral or backend code coverage.

## Execute tests

Dial workspace → environment → collections. The LCD waveforms show the selected inputs. The collection selector starts on **All collections**; its dial and +/− controls focus one collection. In live mode, **Run tests → Start run** executes the selected collections. Runs issue real API requests and may mutate the selected system. Collections execute sequentially.

Postmod fetches collections, environments and available workspace globals through MCP, then executes snapshots with the bundled Newman runtime. Its beforeItem, assertion, request, script, and item events drive the endpoint visualization. No reports are uploaded to Postman. Local-only vault secrets, certificates, external files, or account packages may require additional runner configuration and are not copied automatically.

Each equalizer bar represents one request endpoint. It pulses only between actual endpoint start/completion events. Height is passed assertions divided by passed plus failed assertions; green means all executed assertions passed, red means at least one failed, amber marks an execution error, and gray means no assertions yet. Skipped assertions are counted separately. Zero-percent failures keep a minimal red baseline for visibility. The UI polls current event-derived state every 200ms; very fast requests may finish between polls. Pages follow the active endpoint; clicking a bar shows its counts, status code, and response time. Reduced-motion preferences disable animation.

Sanitized run summaries persist in `.data/runs.json` (last 100). Refreshing/reopening the workspace restores its latest run. Restarted in-flight runs become interrupted; they are never replayed automatically.

## ChatGPT Plugin Extensions

- MCP endpoint: `http://127.0.0.1:4310/mcp`
- UI resource: `ui://postmod/panel.html`
- Entry tool: `open_postmod`, with `global` and `thread` entrypoints
- Model context: selected workspace and completed run summaries are shared through the supported host bridge
- Plugin source: `plugins/postmod/`

The HTML resource bundles its JS and CSS so it does not need external asset access in an MCP App iframe. The local plugin's `.mcp.json` points to the loopback server. Register/install it in a client that supports local HTTP MCP and Plugin Extensions. The browser preview works independently of a host.

**This build is a single-user local application, not a public deployment.** Public ChatGPT distribution requires a reachable HTTPS deployment, an authenticated per-user boundary, Postman account authorization and token storage, and registration of the deployed MCP endpoint. The shipped loopback host/origin checks deliberately prevent exposing your configured API key as an unauthenticated public service. It does not implement multi-user OAuth or auto-install another plugin. Live account integration and rendering inside an actual ChatGPT Extension host have not been verified without those connections.

## Verification

```sh
npm run build
npm test
```

Tests cover inherited script analysis, static test detection, workspace/environment validation, run idempotency, error sanitization, MCP entrypoint metadata, embedded HTML delivery, and real Newman runs against a temporary localhost HTTP fixture, including mixed assertions, no tests, and script exceptions. The MCP integration test starts its own server on port 4311. Tests require permission to open local sockets. No private workspace is used by the test suite.

Tool contract: [docs/contract.md](docs/contract.md).

Official references: [Plugin Extensions](https://developers.openai.com/plugins/build/extensions), [MCP App UI](https://developers.openai.com/plugins/build/chatgpt-ui), [Postman MCP](https://www.postman.com/product/mcp-server/).

## Dependency status

The pinned Newman dependency tree still has upstream npm advisories (11 total: 5 moderate and 6 high at verification). Compatible overrides remove the critical Handlebars issue and patch lodash, flatted, qs, and underscore. This is another reason to keep this build local and to review/replace the runner dependency chain before a production release.

## Panel layout

Open the gear (Panel settings) to show or hide coverage meters, the endpoint equalizer, and collection details. Details are hidden by default; the large channel table has been removed. Visibility is remembered in browser storage when available. Source selection defaults to the full workspace on load.
