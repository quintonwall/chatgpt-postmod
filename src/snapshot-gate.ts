// Once initialized, only a reply to an explicit panel action may replace state.
export function acceptsSnapshot(
  initialized: boolean,
  expectedRequestId: string | undefined,
  incomingRequestId: string | undefined,
) {
  if (expectedRequestId) return incomingRequestId === expectedRequestId;
  return !initialized;
}
