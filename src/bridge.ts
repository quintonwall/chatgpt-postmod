import { App } from "@modelcontextprotocol/ext-apps";
import { OpenAIExtensions } from "@openai/mcp-extensions/app";
export const embedded = window.parent !== window;
const app = new App(
  { name: "Postmod", version: "0.1.0" },
  {},
  { autoResize: true },
);
export const extensions = new OpenAIExtensions(app);
let initial: any;
let resolveInitial: (v: any) => void;
const initialResult = new Promise((r) => {
  resolveInitial = r;
});
app.ontoolresult = (r) => {
  initial = r.structuredContent;
  resolveInitial(initial);
};
const ready = embedded ? app.connect() : Promise.resolve();
export async function invoke(name: string, args: Record<string, unknown> = {}) {
  if (embedded) {
    await ready;
    if (name === "open_postmod") {
      const result =
        initial ??
        (await Promise.race([
          initialResult,
          new Promise((r) => setTimeout(() => r(null), 1000)),
        ]));
      if (result) return result;
    }
    const result = await app.callServerTool({ name, arguments: args });
    if (result.isError)
      throw new Error(
        result.content
          ?.filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join(" ") || "Operation failed",
      );
    return result.structuredContent;
  }
  const response = await fetch(`/api/tools/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
export async function shareContext(context: Record<string, unknown>) {
  if (!embedded) return;
  await ready;
  const params = {
    content: [{ type: "text" as const, text: JSON.stringify(context) }],
  };
  if (extensions.modelContext) await extensions.modelContext.update(params);
  else await app.updateModelContext(params);
}
