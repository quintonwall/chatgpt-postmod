# Deploy Postmod on Vercel

This guide is for the person hosting Postmod. For connecting Postman and installing/using the extension in ChatGPT, see [README.md](README.md).

## What Vercel runs

One project serves:

- The React/Vite UI build in `dist`.
- A stateless Node MCP function at `/api/mcp`, implemented in `api/mcp.ts` and `server/app.ts`.

The MCP function exposes `open_postmod` and `render_postmod`, validates supplied snapshots, and serves `ui://postmod/panel.html`. It does **not** call Postman, execute collections, store account credentials, or maintain user jobs. ChatGPT performs Postman actions using each user's separately connected Postman plugin.

No Postman API key, OAuth callback, token database, or shared Postman account belongs in this Vercel deployment.

## Prerequisites

- The current repository connected to your Vercel project.
- Node.js 22 or a compatible newer Vercel-supported version.
- Permission to deploy the project and configure its public endpoint.
- A ChatGPT account with developer-mode permission for installation testing.

## 1. Configure the project

Use these Vercel settings:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`.`), not a `web` directory |
| Framework Preset | Vite, not Next.js |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 22 or compatible newer supported version |

The included `vercel.json` declares the Vite build and the MCP function's 30-second maximum duration. It includes `dist/index.html` in the function bundle because MCP serves that built UI resource.

The build bundles JavaScript and CSS into the MCP HTML resource and type-checks the source. No separate UI deployment is necessary.

### Environment variables

**None are required for Postman authentication.** If earlier setup instructions led you to add `POSTMAN_API_KEY`, `POSTMOD_MODE`, or user OAuth tokens to Vercel, remove them from this project. Never expose credentials through `VITE_*` variables.

`PORT` is only used by the local development server; Vercel manages the hosted function's listener. A Vercel account login has no relationship to a user's Postman authorization.

## 2. Build and deploy

Optionally validate locally first:

```sh
npm ci
npm run build
npm test
```

Commit and push the current files through your connected repository workflow, or deploy through your established Vercel process. Ensure the deployment includes:

```text
api/mcp.ts
server/app.ts
server/host-contract.ts
src/
scripts/inline.mjs
package.json
package-lock.json
vercel.json
```

Do not set the Vercel start command to `npm start`. That command starts the loopback Express server for local development; the hosted entry point is the function export in `api/mcp.ts`.

After deployment, record a stable HTTPS production domain. The connection URL is:

```text
https://YOUR-POSTMOD-DOMAIN/api/mcp
```

The root URL displays the standalone shell. It cannot access a user's ChatGPT-connected Postman tools, so opening the homepage alone is not an integration test.

[Vercel's MCP deployment documentation](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel).

## 3. Verify the MCP endpoint

Start MCP Inspector:

```sh
npx @modelcontextprotocol/inspector@latest
```

Using the inspector's local instructions/token, connect via **Streamable HTTP** to your deployed `/api/mcp` URL. Verify:

1. Initialization succeeds.
2. Tools include only `open_postmod` and `render_postmod`.
3. Calling `open_postmod` with `{}` returns an empty, disconnected snapshot—not demo data.
4. Reading `ui://postmod/panel.html` returns the bundled HTML.
5. Independent calls do not retain a previous caller's snapshot.

The implementation accepts MCP POST requests. Opening `/api/mcp` in a browser with GET is not a substitute for the protocol test.

ChatGPT must be able to reach this endpoint without an interactive Vercel login page. Review Deployment Protection for the domain you register and configure access according to your policy. The renderer has no private-account access; nevertheless, do not log supplied snapshot bodies or credentials, and apply hosting rate limits as appropriate.

## 4. Register the plugin and validate real use

In ChatGPT, use **Customize → Plugins → Add**, choose **MCP**, and follow the [README quickstart](README.md#2-add-postmod), giving users the deployed `/api/mcp` URL. Postmod's renderer uses no authentication. Each user independently connects the **Postman** plugin through OAuth in ChatGPT and enables both plugins in the same conversation.

Test these before sharing the deployment:

- Two independent ChatGPT users receive only their own Postman-accessible workspaces.
- Workspace and environment requests result in genuine Postman calls, followed by a Postmod render snapshot.
- Selection is restored when the host opens a new panel instead of updating the old iframe.
- Unsupported tools, unknown coverage, and authorization failures appear explicitly.
- A safe, explicitly approved test runs once, and status refresh does not re-execute it.

Local tests pass, but this repository has not been verified against your deployed Vercel project or your ChatGPT/Postman accounts. Public directory distribution is a separate submission/review process; the README describes personal developer-mode installation.

[OpenAI's connection and test guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## 5. Updates and packaging

For later changes:

1. Run the build and tests.
2. Push/redeploy.
3. Check the deployed MCP resource and tools.
4. Refresh the Postmod connection's metadata in ChatGPT and start a new conversation.

To create a source/build archive:

```sh
npm run package
```

This also runs verification and writes a ZIP and SHA-256 checksum under `releases/`. It requires the `zip` command. The archive includes this guide, README, Vercel configuration, plugin skill, source, and built UI. Credentials, dependencies, saved runs, and Git history are excluded. The archive's `local` suffix means it was built locally; Vercel deployment does not require end users to run a local server.

## Local development

```sh
npm ci
npm run build
npm start
```

- UI: `http://127.0.0.1:4310`
- Local MCP: `http://127.0.0.1:4310/mcp`
- No Postman credentials required.

The local shell has no access to ChatGPT's connectors. Use a compatible host to test message-driven actions. Legacy runner utilities remain only for regression tests; they are not imported by the deployed renderer. Their dependency tree still contains known upstream advisories and is not the production test-execution path.

## Deployment troubleshooting

| Symptom | Check |
| --- | --- |
| `/api/mcp` returns 404 | Correct root directory; `api/mcp.ts` and `vercel.json` included; inspect build output for the function |
| Inspector receives HTML | Wrong endpoint, deployment login page, or an overly broad rewrite to `index.html` |
| MCP UI resource fails | Confirm `npm run build` completed and `dist/index.html` is included in the function bundle |
| Homepage loads but cannot connect Postman | Expected outside ChatGPT; enable both plugins in a host conversation |
| Old API-key instructions appear | Deploy current code, refresh ChatGPT metadata, start a new chat |
| Panel waits after a dial action | Inspect the chat for tool availability, approvals, errors, or a refreshed panel |
| Everyone sees the same data | Verify the host is using each user's own Postman connection and has not reused a stale supplied snapshot |

Postmod does not persist snapshots. Metadata still passes through the rendering function and conversation; their platform retention policies apply. Only send the metadata and sanitized test results needed by the panel.
