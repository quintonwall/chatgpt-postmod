import type { Snapshot } from "../server/host-contract";
import type { Summary } from "../server/types";

// Coverage describes collections, not an execution environment. Reuse it locally.
export function workspaceData(
  snapshot: Snapshot | undefined,
  id: string,
): Summary | undefined {
  if (!id || !snapshot) return undefined;
  if (snapshot.summary?.workspace.id === id) return snapshot.summary;
  const workspace = snapshot.workspaces.find((item) => item.id === id);
  const catalog = snapshot.catalogs.find((item) => item.workspaceId === id);
  if (!workspace || !catalog) return undefined;
  return {
    workspace,
    environments: catalog.environments,
    collections: catalog.collections,
    updatedAt: catalog.updatedAt ?? "",
    warnings: catalog.error ? [catalog.error] : [],
    mode: "host",
  };
}
