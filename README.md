# Postmod

A stereo-inspired Postman control panel inside ChatGPT. Dial into a workspace, choose an environment and collection, inspect coverage, and request tests using your own Postman connection. No demo data or shared credentials.

## Quickstart — hosted Postmod

**Before you start, update the ChatGPT desktop app to the latest available version and restart it.** Open **Plugins** directly from the left sidebar. Older versions may show **Customize → Plugins** instead; update first if your navigation differs.

Use [hosted Postmod](https://chatgpt-postmod.vercel.app/) with the MCP endpoint below. **No local server, repository clone, or Vercel setup is needed.** Add it in ChatGPT to use your Postman connection; opening the website alone does not connect your account.

### 1. Connect Postman

Follow the [official plugin installation docs](https://learn.chatgpt.com/docs/plugins) to install the **Postman** plugin, then connect your account through its sign-in flow.

If the Postman plugin isn't available, follow the [Postman remote MCP setup docs](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server) for connection and authentication instructions.

### 2. Add Postmod

Follow the [official connection setup docs](https://developers.openai.com/plugins/deploy/connect-chatgpt) for the current developer-mode and MCP connection steps. Use these Postmod values:

| Field | Value |
| --- | --- |
| Name | Postmod |
| MCP URL | `https://chatgpt-postmod.vercel.app/api/mcp` |
| Authentication | None |
| Icon | [Download PNG (under 10 KB)](https://raw.githubusercontent.com/quintonwall/chatgpt-postmod/main/plugins/postmod/assets/icon.png?version=under-10kb) |

Download the icon and upload it in the form. Create and enable the connection. **No ZIP or marketplace installation is required.** Account/workspace policies may restrict developer mode.

### 3. Open your control panel

Start a new Work chat with **both Postman and Postmod enabled**, then ask:

> Open Postmod with my connected Postman account. Preload environment and collection names for my workspaces, then open Postmod without asking me to choose first. Don’t run tests.

ChatGPT preloads environment and collection names for your created workspaces , then opens Postmod without a workspace question. All three dials select locally. Dial changes never request new inventory or a new panel. Full collection bodies are not fetched for discovery, so coverage can remain unknown. If rate limited, discovery stops and reports unfinished workspace inventories instead of retrying or broadening the scan.

## Using Postmod

- **Dials:** drag, use +/−, or use keyboard arrows. Environment and collection choices use the loaded catalog locally.
- **Meters:** inspect OpenAPI links and script/test presence. Unknown values remain unknown; these aren't code-coverage measurements.
- **Run tests:** choose your scope, activate the switch, then confirm. Actual requests may change API data. Execution requires a supported Postman tool.
- **Equalizer:** shows real endpoint results when provided. A final-summary-only response cannot supply live animation.
- **Gear:** show or hide panel sections.

Postman sign-in stays in ChatGPT. Postmod doesn't receive your credentials. Sanitized metadata and results pass through its rendering server and conversation.

## Need help?

Enable both plugins in the same chat and verify Postman can list your workspaces. If a dial is waiting, check the conversation for approvals, errors, or a refreshed panel. **Don't rerun tests just to retrieve results.** The standalone website cannot access your ChatGPT connections.

Host behavior still needs verification in your account; same-panel updates and live endpoint progress aren't guaranteed.

Hosting your own copy? See [INSTALL.md](INSTALL.md) for Vercel deployment and verification.

By [@quintonwall](https://quintonwall.com).

Workspace choices exclude organization-wide visibility alone. Discovery first resolves the current user and lists workspaces they created; this is labeled explicitly and is not a complete membership list. Only workspaces created by the current user are included. If a joined workspace is missing, provide its name or ID for a targeted membership check. Discovery never falls back to an organization-wide list or bulk role scan.
