// UI draft switch. On for local development, on the hosted design preview
// (a *.vercel.app address, sample data only), and on any host where
// localStorage["tp-archived-records"] is "1" (for demos on dev/UAT).
// Replace with a GrowthBook key when the feature gets a backend.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const PREVIEW_HOST = /\.vercel\.app$/;

export function isArchivedRecordsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const override = window.localStorage.getItem("tp-archived-records");
    if (override === "0") return false;
    if (override === "1") return true;
  } catch (error) {
    // storage blocked: fall through to the host check
  }
  const host = window.location.hostname;
  return LOCAL_HOSTS.includes(host) || PREVIEW_HOST.test(host);
}
