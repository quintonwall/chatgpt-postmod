export const workspaceDiscovery =
  "Fetch fresh environment and collection IDs/names ONLY for the selected workspaceId using workspace detail or workspace-filtered listing tools. Never scan other workspaces or use an account-wide inventory scan. Paginate only within this workspace. Preserve the known workspace list; replace this workspace's catalog and discard its old summary and run. Return workspaceId unchanged, environmentId empty, and source all. Never read environment values or fetch full collection bodies just for inventory. Do not run tests. On rate limits, stop and return an actionable error with any retry-after guidance; do not automatically retry or broaden the scan.";

export function discoverySelection(workspaceId: string) {
  if (!workspaceId)
    throw new Error("Choose a workspace before fetching its inventory.");
  return { workspaceId, environmentId: "", source: "all" };
}
