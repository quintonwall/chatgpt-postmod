# Postmod

Postmod is a stereo-inspired control panel for your Postman workspaces inside ChatGPT. Tune workspace, environment, and collection dials; inspect collection coverage; and request tests using your connected Postman tools.

**Postman handles your account connection. Postmod displays the results.** Each user signs into Postman through ChatGPT. You never give Postmod or its hosting provider a Postman API key or OAuth token. There is no demo data.

Deploying Postmod yourself? See [INSTALL.md](INSTALL.md). The instructions below assume you have a deployed Postmod MCP URL from your administrator or your own deployment.

## 1. Add and connect Postman

1. Open the Plugins directory in ChatGPT and find the official **Postman** plugin. Verify the publisher, then install/enable it if available to your account.
2. Choose its Connect/Sign in action and complete Postman's OAuth login or your organization's SSO. Review the requested access.
3. Enable Postman in a new ChatGPT conversation and ask:

   > Use Postman's getWorkspaces to list my accessible workspaces.

4. Check that the returned workspaces belong to the account you intended to connect.

Each user completes this independently. Installing Postmod, owning its Vercel deployment, or being signed into ChatGPT does not grant access to a Postman account. Organization policies may require administrator approval.

### If you need to add Postman's MCP server manually

If the official plugin is unavailable and your account permits developer-mode connections:

1. Enable **Settings → Security and login → Developer mode**.
2. Go to **ChatGPT Plugins → +** and add `https://mcp.postman.com/mcp`, the Full Postman toolset.
3. Use OAuth when offered and follow the discovered sign-in flow. Do not add an API-key header or invent client credentials.
4. Enable this connection and repeat the workspace-listing check above.

Use either the official plugin or this manually registered connection; you do not need duplicate Postman connections. The US remote MCP supports OAuth. The EU remote server currently requires API keys, so this OAuth-only setup does not cover EU accounts; do not change regions to bypass that limitation. [Postman remote MCP documentation](https://learning.postman.com/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server).

## 2. Add Postmod to ChatGPT

This project is currently installed as a personal developer-mode plugin; it is not a published directory listing.

1. Enable **Settings → Security and login → Developer mode**, if permitted by your workspace.
2. Open **Plugins → +** and name the connection **Postmod**.
3. Enter the Postmod MCP URL supplied by your administrator, for example:

   ```text
   https://YOUR-POSTMOD-DOMAIN/api/mcp
   ```

   Replace the example domain. Use the MCP endpoint, not the website homepage or Postman's endpoint.
4. Select no authentication for Postmod's stateless rendering server. Postman authentication remains on your separate Postman connection.
5. Confirm ChatGPT discovers `open_postmod` and `render_postmod`. Install/enable the resulting personal plugin where offered.
6. Start a new Work chat with **both Postman and Postmod enabled**.

Plugin availability and settings labels can vary by account and workspace. See [OpenAI's connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### Optional: install the bundled workflow skill

Postmod's tools include instructions for coordinating with Postman. The included `plugins/postmod/skills/postmod/SKILL.md` adds a reusable workflow for desktop local-marketplace installations.

After registering Postmod, copy its actual `plugin_asdk_app...` ID from the connection URL. Ask Plugin Creator:

> Package this repository's plugins/postmod folder for my personal marketplace. Preserve its skill and branding. Map it to my registered Postmod connection ID through .app.json, replacing the localhost MCP connection rather than adding a duplicate server. Do not copy Postman credentials. I will enable my separately connected Postman plugin in the same chat.

Supply the real registered ID. Install from the resulting local source and start a new chat. The repository's `.mcp.json` points to localhost for development and is not the hosted configuration. [OpenAI packaging guide](https://developers.openai.com/plugins/build/plugins).

## 3. Open the control panel

With both plugins enabled, ask:

> Use my connected Postman plugin to call getWorkspaces, then open Postmod with the returned workspace metadata. Leave workspace and environment untuned. Use my existing Postman authorization.

You can also use **Load workspaces from Postman** in the panel. ChatGPT performs the Postman call and returns a structured snapshot for Postmod to display.

The **POSTMAN VIA CHATGPT** label means the host supplied Postman metadata. It is not an independent check of your OAuth session, and Postmod does not infer your account email. To change or disconnect accounts, use the Postman connection settings in ChatGPT.

## 4. Dial in your workspace

The three dials work in order:

| Dial | What it controls |
| --- | --- |
| Workspace | Chooses a workspace and requests its environments |
| Environment | Chooses the environment and requests collection/coverage metadata; explicitly choose No environment to use collection defaults |
| Collections | Starts on All collections; turn it to focus on an individual collection |

Use the dial, its +/− controls, or keyboard arrow keys. The colored LCD waveforms reflect the selected inputs. Data populates after workspace and environment are selected; changing workspace clears the previous selection.

Dial actions may take a ChatGPT turn. Check the conversation while the panel is waiting. Depending on the host, the result may update this panel or open a refreshed one with the selected dials restored.

Coverage meters show linked OpenAPI specs and the presence of pre-request/post-response scripts, including inherited scripts when inspected. These are presence measurements, not code coverage. Unknown data stays unknown.

Use the gear to show or hide coverage meters, the endpoint equalizer, and collection details.

## 5. Run tests

1. Select the workspace, environment, and collection scope you intend to test.
2. Activate **Run tests** and review the confirmation before choosing **Start run**.
3. ChatGPT uses an available Postman execution tool for those selected IDs. Real tests can change the target API's data.
4. Inspect the actual returned results. For a reported running job, **Refresh run status** requests its existing status instead of starting another run.

Execution is available only when a suitable connected Postman tool is confirmed. The switch returns to idle when a completed result reaches the panel.

The equalizer shows endpoint-level results only when the upstream tool provides them. Bars represent assertion pass rates: green for passing assertions, red for failures, amber for execution errors, and gray for no assertions. If Postman returns only a final collection summary, Postmod cannot manufacture a live endpoint stream.

A waiting timeout does not mean the run failed. Check the chat and any refreshed panel; **do not repeat execution just to retrieve results**.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| No Postman tools | Connect and enable Postman in the same chat; check workspace policy |
| No workspaces | Verify the Postman account's membership, region, and permissions |
| Website cannot load data | The standalone page cannot access ChatGPT connections; use the extension inside ChatGPT |
| ChatGPT asks for a Postmod API key | Refresh stale tool metadata/start a new chat; this renderer needs no Postman credentials |
| Dial result does not appear | Inspect the conversation for an error or a newly rendered panel |
| Test switch disabled | Finish tuning and verify that the connected Postman toolset supports execution |
| No live bars | The upstream tool may not return endpoint-level progress |

After an administrator updates the server, refresh the Postmod connection in ChatGPT and start a new chat.

## Data handling and current limits

Postman credentials remain with ChatGPT's Postman connection. Workspace metadata and sanitized results passed to Postmod travel through its rendering server and the conversation. Postmod does not persist them server-side; hosting and conversation retention policies still apply. Never include secrets, environment values, or sensitive request/response payloads in rendering snapshots.

The host-mediated flow is implemented and locally tested, but end-to-end ChatGPT + Postman + Vercel behavior still requires verification in your account. Same-panel delivery and live endpoint events are not guaranteed. The app does not automatically inherit another plugin's token or directly invoke its tools.
