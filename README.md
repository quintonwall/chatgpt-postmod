# Postmod

A stereo-inspired Postman control panel inside ChatGPT. Dial into a workspace, choose an environment and collection, inspect coverage, and request tests using your own Postman connection. No demo data or shared credentials.

## Quickstart — hosted Postmod

Use [hosted Postmod](https://chatgpt-postmod.vercel.app/) with the MCP endpoint below. **No local server, repository clone, or Vercel setup is needed.** Add it in ChatGPT to use your Postman connection; opening the website alone does not connect your account.

### 1. Connect Postman

Open **Customize → Plugins → Add** in ChatGPT and install the official **Postman** plugin and connect your account through its sign-in flow.

If it isn't available, enable **Settings → Security and login → Developer mode**, then add an MCP connection using `https://mcp.postman.com/mcp` with **OAuth**. This OAuth path supports Postman's US remote server; EU currently requires API keys. [Postman setup details](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server).

### 2. Add Postmod

With developer mode enabled, open **Customize → Plugins → Add** and choose **MCP**:

| Field | Value |
| --- | --- |
| Name | Postmod |
| MCP URL | `https://chatgpt-postmod.vercel.app/api/mcp` |
| Authentication | None |
| Icon | [Download PNG (under 10 KB)](https://raw.githubusercontent.com/quintonwall/chatgpt-postmod/main/plugins/postmod/assets/icon.png?version=under-10kb) |

Download the icon and upload it in the form. Create and enable the connection. **No ZIP or marketplace installation is required.** Account/workspace policies may restrict developer mode.

### 3. Open your control panel

Start a new Work chat with **both Postman and Postmod enabled**, then ask:

> Use Postman's getWorkspaces, then open Postmod with my workspaces.

Turn the dials in order: **Workspace → Environment → Collections**. Data loads after selecting workspace and environment. Collections starts on **All collections**.

## Using Postmod

- **Dials:** drag, use +/−, or use keyboard arrows. ChatGPT fetches the requested Postman data; results may open a refreshed panel.
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
