// Single place that decides who the MoEngage user is.
//
// The bug this exists to prevent: identity used to be a fallback chain,
//   profile?.b2c || profile?.doctor_unique_id || profile?.user_id
// so whichever field happened to be populated on a given profile payload won. b2c is
// intermittently absent, so the same doctor was identified as their b2c id on some page
// loads and their doctor_unique_id on others. MoEngage treats a new unique id as a new
// person, so every doctor ended up with two profiles, both live, both collecting
// sessions. A fallback chain can never be an identity.
//
// Two MoEngage calls, and the difference is the whole fix:
//   add_unique_user_id(id)     names the CURRENT (anonymous) profile. Called when a
//                              profile is already identified as something else, it
//                              switches away and leaves the old one behind — that is how
//                              duplicates are born.
//   update_unique_user_id(id)  RENAMES the profile already identified on this browser.
//                              Same person, new id, one profile.
//
// So we remember the last id we set, and pick the right call:
//   nothing set yet  -> add_unique_user_id     (anonymous -> known)
//   set, different   -> update_unique_user_id  (rename, e.g. signup b2c -> doctor_unique_id)
//   set, same        -> nothing
const MOE_UID_KEY = "moe_uid";

function readPreviousId() {
  try {
    return localStorage.getItem(MOE_UID_KEY);
  } catch (_) {
    // Safari private mode and similar. Falling back to null means we call
    // add_unique_user_id, which is correct for a browser with no prior identity.
    return null;
  }
}

/**
 * Identify this browser as `rawId`, migrating from any previously set id.
 * Resolves true when MoEngage accepted the identity.
 *
 * Never pass a fallback value. If the canonical id is missing, pass nothing and stay
 * anonymous: MoEngage promotes an anonymous profile to a known one on the next
 * successful identify, so nothing is lost. Identifying with the wrong id cannot be undone.
 */
export function setMoengageIdentity(rawId) {
  const nextId = rawId ? String(rawId) : "";
  if (!nextId) return Promise.resolve(false);

  const moe = typeof window !== "undefined" ? window.Moengage : null;
  if (!moe) return Promise.resolve(false);

  const previousId = readPreviousId();
  if (previousId === nextId) return Promise.resolve(true);

  const call = previousId
    ? moe.update_unique_user_id?.(nextId)
    : moe.add_unique_user_id?.(nextId);

  return Promise.resolve(call)
    .then(() => {
      try {
        localStorage.setItem(MOE_UID_KEY, nextId);
      } catch (_) {}
      return true;
    })
    .catch(() => false);
}

/**
 * End the MoEngage session on logout.
 *
 * localStorage.clear() does not touch MoEngage's own session state, so without this the
 * next doctor to log in on a shared clinic machine inherits the previous doctor's
 * session and their events land on the wrong profile.
 */
export function clearMoengageIdentity() {
  try {
    localStorage.removeItem(MOE_UID_KEY);
  } catch (_) {}
  try {
    if (typeof window !== "undefined") window.Moengage?.destroy_session?.();
  } catch (e) {
    console.warn("[TP Medeco] MoEngage destroy_session failed", e);
  }
}
