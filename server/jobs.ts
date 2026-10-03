import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import type { Job, Summary, RunRow, EndpointUpdate } from "./types.ts";
export class Jobs {
  private jobs = new Map<string, Job>();
  constructor(
    private execute: (
      id: string,
      environment?: string,
      workspaceId?: string,
      onUpdate?: EndpointUpdate,
    ) => Promise<Pick<RunRow, "state" | "passed" | "failed" | "error">>,
    private path?: string,
  ) {
    if (path) {
      try {
        const saved = JSON.parse(readFileSync(path, "utf8"));
        for (const j of saved) {
          if (j.state === "running") {
            j.state = "interrupted";
            for (const row of j.rows)
              if (["running", "queued"].includes(row.state)) {
                row.state = "interrupted";
                for (const e of row.endpoints ?? [])
                  if (["running", "queued"].includes(e.state))
                    e.state = "interrupted";
              }
          }
          this.jobs.set(j.id, j);
        }
      } catch {}
    }
  }
  private save() {
    if (this.path) {
      mkdirSync(".data", { recursive: true });
      writeFileSync(
        this.path + ".tmp",
        JSON.stringify([...this.jobs.values()].slice(-100)),
        { mode: 0o600 },
      );
      renameSync(this.path + ".tmp", this.path);
    }
  }
  latest(workspaceId: string, mode: string) {
    return [...this.jobs.values()]
      .filter((j) => j.workspaceId === workspaceId && j.mode === mode)
      .at(-1);
  }
  get(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Run not found.");
    return job;
  }
  start(
    s: Summary,
    ids: string[],
    environmentId: string | undefined,
    requestId: string,
  ) {
    const duplicate = [...this.jobs.values()].find(
      (j) => j.requestId === requestId,
    );
    if (duplicate) {
      if (
        duplicate.workspaceId !== s.workspace.id ||
        duplicate.environmentId !== environmentId ||
        duplicate.rows.map((r) => r.id).join() !== ids.join()
      )
        throw new Error("Request ID already used for a different run.");
      return duplicate;
    }
    if (
      !ids.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !s.collections.some((c) => c.id === id))
    )
      throw new Error("Select valid collections from this workspace.");
    if (environmentId && !s.environments.some((e) => e.id === environmentId))
      throw new Error("Environment does not belong to this workspace.");
    if ([...this.jobs.values()].some((j) => j.state === "running"))
      throw new Error("A run is already active.");
    const job: Job = {
      id: randomUUID(),
      requestId,
      workspaceId: s.workspace.id,
      environmentId,
      mode: s.mode,
      state: "running",
      createdAt: new Date().toISOString(),
      rows: ids.map((id) => ({
        id,
        name: s.collections.find((c) => c.id === id)!.name,
        state: "queued",
      })),
    };
    this.jobs.set(job.id, job);
    this.save();
    void this.run(job);
    return job;
  }
  private async run(job: Job) {
    for (const row of job.rows) {
      row.state = "running";
      this.save();
      try {
        Object.assign(
          row,
          await this.execute(
            row.id,
            job.environmentId,
            job.workspaceId,
            (endpoints) => {
              row.endpoints = endpoints.map((e) => ({ ...e }));
              row.passed = endpoints.reduce((a, e) => a + e.passed, 0);
              row.failed = endpoints.reduce((a, e) => a + e.failed, 0);
              this.save();
            },
          ),
        );
      } catch {
        row.state = "error";
        row.error =
          "Execution failed. Check Postman connectivity and runner permissions.";
      }
      this.save();
    }
    job.state = "completed";
    this.save();
  }
}
