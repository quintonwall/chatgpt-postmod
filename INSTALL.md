# Install Postmod with real Postman data

Verified against official documentation on October 3, 2026.

Postmod is a local, single-user server with a ChatGPT Plugin Extension UI. **Local means the server runs on your computer; live mode uses real Postman data.** The archive includes the server, source, built UI, dependency lockfile, and local MCP plugin manifest. It is not a hosted service or a one-click OAuth-enabled public plugin.

## 1. Start the server with your Postman account

Requirements: Node.js 22+, npm, and a Postman API key belonging to the account that can access your intended workspaces. Obtain the key through Postman's account settings. Keep it on your machine; do not paste it into chat or the plugin manifest.

Extract the ZIP, open a terminal in the extracted folder, then run:

```sh
npm ci
cp .env.example .env
```

Edit `.env` locally:

```dotenv
POSTMAN_API_KEY=your_key_here
POSTMAN_MCP_URL=https://mcp.postman.com/mcp
PORT=4310
```

For an EU Postman account use `https://mcp.eu.postman.com/mcp`. Use the region that holds your data. Start Postmod:

```sh
npm start
```

Open `http://127.0.0.1:4310`. The header shows **POSTMAN · API KEY** after connection succeeds, or **NOT CONNECTED** if credentials are absent or rejected. Turn the workspace dial, then the environment dial. The collection dial defaults to all collections. “No environment” is an explicit option for collection defaults. Nothing is scanned until workspace and environment are selected. Missing access or unreadable data is reported rather than replaced with synthetic data.

The supplied build is already compiled. After changing source files, run `npm run build` and refresh. Restart the server after changing `.env`.

In live mode, Run tests opens a confirmation before sending actual API requests. The bundled Newman runtime executes collection snapshots obtained through Postman MCP. Runs can mutate your target API; no reports are uploaded to Postman. The switch returns to idle when the run completes. There is no demo mode or synthetic fallback.

## 2. Connect Postmod to ChatGPT

ChatGPT must reach **Postmod's `/mcp` endpoint**, not just Postman's endpoint. A web/cloud ChatGPT client cannot reach your computer by entering `127.0.0.1` as a public URL.

For this single-user build, use a private Secure MCP Tunnel if your account/workspace has access. Keep it restricted to your own testing identity: all calls use this server's one Postman API key. Do not share that connection with other users. The server intentionally accepts only loopback hosts and same-origin browser requests; do not remove those checks to expose it publicly.

1. In OpenAI Platform tunnel settings, create a tunnel associated with the intended ChatGPT workspace. Obtain the tunnel identity and runtime credentials. You need tunnel permissions as well as ChatGPT developer-mode access.
2. Obtain `tunnel-client` using the download link in the official setup guide. Run `tunnel-client help quickstart`, configure an HTTP profile targeting `http://127.0.0.1:4310/mcp`, and use your issued tunnel ID. Use `--mcp-server-url` for this HTTP target, not a stdio command. Supply runtime credentials through the documented environment/configuration mechanism, never in this package.
3. Run `tunnel-client doctor --profile postmod --explain`, then `tunnel-client run --profile postmod`. Keep both the tunnel client and Postmod server running. If you named the profile differently, substitute its name.

Follow the current [Secure MCP Tunnel setup reference](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for account-specific profile initialization. Tunnel access is not universally available; if unavailable, this build remains usable locally until an authenticated hosted deployment is implemented.

4. In ChatGPT, enable **Settings → Security and login → Developer mode**.
5. Open **Plugins**, select **+**, name the connection Postmod, and choose **Tunnel**. Select the configured tunnel or enter its ID.
6. Create the connection and review the discovered tools: `open_postmod`, `get_workspace_channels`, `get_workspace_summary`, `start_workspace_run`, and `get_run_status`.
7. Install the resulting personal plugin where offered, start a new Work chat with it enabled, and ask “Open Postmod.” The server advertises sidebar and conversation-panel entrypoints; availability depends on the host.
8. Verify the live connection badge and dial into a workspace you recognize before testing execution.

After server/tool changes, restart Postmod and use **Refresh** on the ChatGPT connection, then start a new conversation. See [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt) and the [plugin quickstart](https://developers.openai.com/plugins/quickstart).

This flow has not been verified against your ChatGPT account or a private Postman workspace. The archive alone cannot create the account-specific tunnel or ChatGPT registration.

### Optional desktop package registration

`plugins/postmod/` is a validated compatibility-format plugin for local HTTP MCP clients. Its `.mcp.json` points to loopback and does not start the server. Keep the server running separately.

For a ChatGPT desktop local-marketplace package, first complete the registered connection above. Copy its technical `plugin_asdk_app...` ID from the connection URL. Invoke Plugin Creator with:

> Create a personal-marketplace Postmod plugin from the bundled plugins/postmod folder, using my registered Postmod connection ID. Wire that registered connection through .app.json instead of adding a second loopback connection. Preserve the Postmod branding.

Supply the actual ID; none is fabricated in this archive. Then install from that local source in the Plugins Directory and open a new chat. [Official packaging instructions](https://developers.openai.com/plugins/build/plugins) explain this registered-connection mapping. Do not assume uploading a ZIP installs the backend.

## 3. Postman MCP OAuth: what works and what still needs integration

Postman's US remote MCP supports OAuth with automatic discovery, dynamic client registration, and PKCE. Its EU remote and local servers currently require API keys. Full mode uses `/mcp`. [Postman remote server documentation](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server).

To connect **Postman directly** in an OAuth-capable MCP host:

1. Add `https://mcp.postman.com/mcp` as the server URL.
2. Choose OAuth if prompted; omit a manually supplied Authorization header. Let the host discover the authorization endpoints rather than inventing client IDs or callback URLs.
3. Complete the Postman sign-in/SSO flow for the account with access to your organization. Review and approve the requested access.
4. Return to the host and verify that listing workspaces returns the expected account's resources. If policy blocks consent, contact your Postman administrator.

A host configuration commonly looks like:

```json
{"mcpServers":{"postman":{"url":"https://mcp.postman.com/mcp"}}}
```

**That authorizes the host's Postman connection, not Postmod.** This package's backend creates its own MCP client and currently sends `POSTMAN_API_KEY`. It has no OAuth callback, token persistence/refresh, per-user session, or account-switching implementation. Do not copy a host's OAuth token into `.env` as an API key.

For a future OAuth-enabled Postmod release, implement the backend's upstream OAuth client using discovery/PKCE, bind state to the initiating session, store tokens securely, refresh/revoke them, and isolate each user's data and jobs. A publicly hosted server also needs its own authenticated ChatGPT-to-Postmod boundary; upstream Postman OAuth alone does not provide that. These are engineering steps, not installation settings.

## 4. Connection indicator and account identity

The header now distinguishes:

- **CONNECTING:** initial connection check in progress.
- **POSTMAN · API KEY:** startup discovery succeeded using server credentials; this does not identify the ChatGPT user.
- **NOT CONNECTED:** initial connection failed; inspect the error and server settings.

This is a startup connection indicator, not continuous session monitoring. Later tool errors appear in the panel. An email would be useful in an account menu once returned by a verified Postman identity endpoint/OAuth identity flow. Do not use a configured label, the ChatGPT email, or a workspace name as proof of the Postman account. This build intentionally does not invent an email or show a sign-out button that cannot revoke authentication.

## Troubleshooting and release boundaries

- No credentials: the panel stays disconnected and empty until POSTMAN_API_KEY is configured. POSTMOD_MODE is no longer used.
- Connection error: verify key, account access, region, and network. Never share the key in screenshots or logs.
- No workspaces: check membership and account permissions. Authentication does not grant additional organization access.
- Tunnel absent: verify workspace association, tunnel role, and developer-mode permission. Host/origin rejection: inspect tunnel forwarding locally; do not disable the guard or publish this server unauthenticated.
- Switch unavailable: finish tuning first; live execution also requires collection-read capability.
- Known runner dependency advisories remain; see README. Review them before broader distribution. There is no multi-user isolation, hosted OAuth, or public-store approval in this release.

## Rebuild the package

```sh
npm run package
```

Requires the `zip` command. This builds, runs tests, and produces a ZIP plus SHA-256 file under `releases/`. It includes `CONTENTS.sha256` for the packaged files. `.env`, `node_modules`, saved runs, Git history, and account credentials are excluded by an explicit file allowlist.
