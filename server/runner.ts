import newman from "newman";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunRow, Endpoint, EndpointUpdate } from "./types.ts";
export function parseRun(
  r: any,
): Pick<RunRow, "state" | "passed" | "failed" | "error"> {
  const run = r.run ?? r;
  const stats = run.stats;
  const a = stats?.assertions;
  if (
    !a ||
    !Number.isFinite(a.total) ||
    !Number.isFinite(a.failed) ||
    a.total < 0 ||
    a.failed < 0 ||
    a.failed > a.total
  )
    return {
      state: "error",
      error: "Unsupported runner result; pass status could not be determined.",
    };
  const errors =
    (stats?.requests?.failed ?? 0) +
    (stats?.testScripts?.failed ?? 0) +
    (stats?.prerequestScripts?.failed ?? 0);
  return {
    state: errors
      ? "error"
      : a.failed
        ? "failed"
        : a.total
          ? "passed"
          : "no-tests",
    passed: a.total - a.failed,
    failed: a.failed,
    ...(errors
      ? { error: `${errors} request or script execution errors.` }
      : {}),
  };
}
export async function runLocal(
  source: any,
  environment?: any,
  globals?: any,
  onUpdate: EndpointUpdate = () => {},
) {
  const collection = structuredClone(source);
  const endpoints: Endpoint[] = [];
  function walk(node: any) {
    if (node.request) {
      node.id ||= randomUUID();
      endpoints.push({
        id: node.id,
        name: node.name ?? "Unnamed request",
        method: node.request.method ?? "GET",
        state: "queued",
        passed: 0,
        failed: 0,
        skipped: 0,
      });
    }
    for (const child of node.item ?? []) walk(child);
  }
  walk(collection);
  onUpdate(endpoints);
  const dir = await mkdtemp(join(tmpdir(), "postmod-runtime-"));
  let active: Endpoint | undefined;
  const emit = () => onUpdate(endpoints);
  const find = (args: any) =>
    endpoints.find((e) => e.id === args.item?.id) ?? active;
  try {
    return await new Promise<
      Pick<RunRow, "state" | "passed" | "failed" | "error">
    >((resolve, reject) => {
      const run = newman.run(
        {
          collection,
          environment,
          globals,
          reporters: [],
          timeout: 300000,
          timeoutRequest: 30000,
          timeoutScript: 10000,
          workingDir: dir,
          insecureFileRead: false,
        },
        (error: any, summary: any) => {
          if (error) {
            for (const e of endpoints)
              if (e.state === "running") {
                e.state = "error";
                e.error = "Runner stopped before endpoint completion.";
              }
            emit();
            reject(new Error("Collection execution failed."));
            return;
          }
          for (const e of endpoints)
            if (e.state === "queued") {
              e.state = "interrupted";
              e.error = "Request was not executed by the collection flow.";
            }
          emit();
          const parsed = parseRun(summary);
          const passed = endpoints.reduce((a, e) => a + e.passed, 0),
            failed = endpoints.reduce((a, e) => a + e.failed, 0);
          resolve({
            ...parsed,
            passed,
            failed,
            state: endpoints.some((e) => e.state === "error")
              ? "error"
              : failed
                ? "failed"
                : passed
                  ? "passed"
                  : parsed.state === "error"
                    ? "error"
                    : "no-tests",
          });
        },
      );
      run.on("beforeItem", (_err: any, args: any) => {
        active = find(args);
        if (active) {
          active.state = "running";
          emit();
        }
      });
      run.on("assertion", (_err: any, args: any) => {
        const e = find(args);
        if (!e) return;
        if (args.skipped) e.skipped++;
        else if (args.error || _err) e.failed++;
        else e.passed++;
        emit();
      });
      run.on("request", (err: any, args: any) => {
        const e = find(args);
        if (!e) return;
        e.statusCode = args.response?.code;
        e.durationMs = args.response?.responseTime;
        if (err) {
          e.error = "Request execution failed.";
        }
        emit();
      });
      run.on("script", (err: any, args: any) => {
        const e = find(args);
        if (e && (err || args.execution?.error)) {
          e.error = "Script execution failed.";
          emit();
        }
      });
      run.on("exception", () => {
        if (active) {
          active.error = "Script exception.";
          emit();
        }
      });
      run.on("item", (err: any, args: any) => {
        const e = find(args);
        if (!e) return;
        e.state =
          err || e.error
            ? "error"
            : e.failed
              ? "failed"
              : e.passed
                ? "passed"
                : "no-tests";
        emit();
        active = undefined;
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
