/**
 * Receptionist / Kea sessions are launched with `?receptionist` in the URL.
 * Internal navigations sometimes drop that query. Persist the flag for the
 * tab session so doctor-only boot flows (TnC, account-status → logout) stay off.
 */
const SESSION_KEY = "tp.session.isReceptionist";

export function markReceptionistSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignore quota / private-mode errors
  }
}

export function clearReceptionistSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * True when URL has `receptionist`, or this tab previously marked a receptionist session.
 */
export function isReceptionistSession(search) {
  try {
    const params = new URLSearchParams(
      search != null ? search : window.location.search
    );
    if (params.has("receptionist")) {
      markReceptionistSession();
      return true;
    }
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
