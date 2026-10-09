// Tester "fresh data" mode for the Data Analytics reports.
//
// Report responses are cached in Pm-Core's Redis (~5 min TTL) plus a 30s client
// dedup cache, so a data change only shows up after the cache expires. When this
// mode is ON, report requests carry the `X-Refresh-Cache` header — Pm-Core then
// recomputes from the DB instead of serving the cached value (and refreshes the
// cache) — and the client-side apiCache is bypassed too.
//
// Toggle without a rebuild:
//   • URL:          ?freshData=1  (turn on, persisted)  /  ?freshData=0  (turn off)
//   • Console:      localStorage.setItem('pmFreshData','1')  /  removeItem('pmFreshData')
const KEY = "pmFreshData";

/** True when the tester enabled fresh-data mode (URL param is sticky via localStorage). */
export function isFreshDataMode() {
  try {
    const q = new URLSearchParams(window.location.search).get("freshData");
    if (q === "1") window.localStorage.setItem(KEY, "1");
    else if (q === "0") window.localStorage.removeItem(KEY);
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** axios per-request config fragment: adds the cache-bypass header when fresh mode is on. */
export function refreshHeaders() {
  return isFreshDataMode() ? { headers: { "X-Refresh-Cache": "1" } } : {};
}
