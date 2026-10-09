// Lightweight request-deduplication cache for analytics API calls.
// Same URL+params within the TTL window returns the in-flight or settled
// promise — eliminates redundant fetches when switching sections that share
// hooks (Overview↔Billing, Overview↔Appointments, etc.).
//
// Failed requests are evicted so the next call retries.
// Call clearApiCache() on manual refresh to force a full reload.

import { isFreshDataMode } from "../../../utils/freshData";

const cache = new Map();
const TTL = 30_000; // 30 seconds

export function cached(label, params, fn) {
  // Tester "fresh data" mode: skip the client dedup cache so every call hits the
  // network (which also carries X-Refresh-Cache to bypass the backend cache).
  if (isFreshDataMode()) return fn();
  const key = `${label}|${JSON.stringify(params ?? {})}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.promise;
  const promise = fn();
  cache.set(key, { promise, ts: Date.now() });
  promise.catch(() => cache.delete(key));
  return promise;
}

export function clearApiCache() {
  cache.clear();
}
