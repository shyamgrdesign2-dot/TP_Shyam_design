export function getResponseRequestId(response) {
  return response?.headers?.get?.("x-request-id") || "";
}
