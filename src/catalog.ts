import type { Snapshot } from "../server/host-contract";
import type { Summary } from "../server/types";

// Coverage describes collections, not an execution environment. Reuse it locally.
export function workspaceData(
  snapshot: Snapshot | undefined,
  id: string,
): Summary | undefined {
  if (!id || !snapshot) return undefined;
  const summary =
    snapshot.summary?.workspace.id === id ? snapshot.summary : undefined;
  const workspace = snapshot.workspaces.find((item) => item.id === id);
  const catalog = snapshot.catalogs.find((item) => item.workspaceId === id);
  if (!workspace || !catalog) return summary;
  return {
    workspace,
    environments: catalog.environments,
    collections: [
      ...catalog.collections,
      ...(summary?.collections.filter(
        (item) => !catalog.collections.some((known) => known.id === item.id),
      ) ?? []),
    ].map((collection) => {
      const details = summary?.collections.find(
        (item) => item.id === collection.id,
      );
      return details ? { ...collection, ...details } : collection;
    }),
    updatedAt: summary?.updatedAt ?? catalog.updatedAt ?? "",
    warnings: [
      ...(catalog.error ? [catalog.error] : []),
      ...(summary?.warnings ?? []),
    ],
    mode: "host",
  };
}
