import { acceptsSnapshot } from "./snapshot-gate";
import { App } from "@modelcontextprotocol/ext-apps";
import {
  emptySnapshot,
  snapshotSchema,
  type Snapshot,
} from "../server/host-contract";
export const embedded = window.parent !== window;
const app = new App(
  { name: "Postmod", version: "0.1.0" },
  {},
  { autoResize: true },
);
let latest: Snapshot = emptySnapshot;
let received = false;
let expectedRequestId: string | undefined;
const listeners = new Set<(s: Snapshot) => void>();
app.ontoolresult = (r) => {
  const parsed = snapshotSchema.safeParse(r.structuredContent);
  if (!parsed.success) return;
  if (!acceptsSnapshot(received, expectedRequestId, parsed.data.requestId))
    return;
  expectedRequestId = undefined;
  latest = parsed.data;
  received = true;
  for (const listener of listeners) listener(latest);
};
const ready = embedded ? app.connect() : Promise.resolve();
export function subscribeSnapshot(listener: (s: Snapshot) => void) {
  listeners.add(listener);
  if (received) listener(latest);
  return () => {
    listeners.delete(listener);
  };
}
export async function invoke(name: string, args: Record<string, unknown> = {}) {
  if (name === "open_postmod") {
    await ready;
    return latest;
  }
  throw new Error("Use the ChatGPT Postman connection to request data.");
}
export async function requestPostman(
  action: string,
  selection: Record<string, unknown>,
) {
  if (!embedded)
    throw new Error(
      "Open Postmod in ChatGPT with the Postman plugin enabled. This standalone page cannot access your ChatGPT connections.",
    );
  await ready;
  const requestId = crypto.randomUUID();
  expectedRequestId = requestId;
  const response = await app.sendMessage({
    role: "user",
    content: [
      {
        type: "text",
        text: `Postmod action: ${action}. Use my connected Postman plugin, not a separate API key. Update the existing Postmod panel using render_postmod; do not call open_postmod or ask which workspace in chat. Return a complete snapshot with requestId ${requestId}. Preserve all workspace catalogs, workspace list and selections. Only return real metadata; no secrets or invented coverage/progress. Current selection and request: ${JSON.stringify(selection)}. If unavailable, report the error via render_postmod and explain in chat. For a test request execute once only; refreshing must inspect the existing run, never execute again.`,
      },
    ],
  });
  if (response.isError)
    throw new Error(
      "ChatGPT did not accept the request. Ask in chat with both plugins enabled.",
    );
  return requestId;
}
