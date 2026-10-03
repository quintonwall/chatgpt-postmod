export type Collection = {
  id: string;
  name: string;
  requests: number | null;
  pre: number | null;
  tests: number | null;
  spec: boolean | null;
  error?: string;
};
export type Summary = {
  workspace: { id: string; name: string };
  environments: { id: string; name: string }[];
  collections: Collection[];
  updatedAt: string;
  warnings: string[];
  mode: string;
};
export type RunRow = {
  endpoints?: Endpoint[];
  id: string;
  name: string;
  state:
    | "queued"
    | "running"
    | "passed"
    | "failed"
    | "error"
    | "no-tests"
    | "interrupted";
  passed?: number;
  failed?: number;
  error?: string;
};
export type Job = {
  id: string;
  requestId: string;
  workspaceId: string;
  environmentId?: string;
  mode: string;
  state: "running" | "completed" | "interrupted";
  rows: RunRow[];
  createdAt: string;
};
export type Endpoint = {
  id: string;
  name: string;
  method: string;
  state:
    | "queued"
    | "running"
    | "passed"
    | "failed"
    | "error"
    | "no-tests"
    | "interrupted";
  passed: number;
  failed: number;
  skipped: number;
  statusCode?: number;
  durationMs?: number;
  error?: string;
};
export type EndpointUpdate = (endpoints: Endpoint[]) => void;
