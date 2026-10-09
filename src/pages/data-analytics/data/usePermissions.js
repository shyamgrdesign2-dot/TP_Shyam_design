import { useEffect, useMemo, useState } from "react";
import ApiReporting from "../../../api/services/ApiReporting";
import { cached } from "./apiCache";
import useCapabilities from "./useCapabilities";

// Per-user, per-hospital report grants, resolved by Pm-Core from the SAME
// tables the legacy PHP admin panel's "Role Assignment" screen writes
// (user_hospital_master module CSV + user_assignment role rows). This is the
// dynamic replacement for env-var / hardcoded gating: an admin granting a
// sub-user a report in the admin panel shows up here within Pm-Core's cache
// TTL (~2 min) — no redeploy, no re-login.
//
// Failure posture (deliberate, matches Pm-Core's shadow-mode rollout):
//   · admins (and owner doctors) always see everything — legacy auto-grants
//     them every role, so a missing row must never blank the owner's screen;
//   · endpoint error / timeout → fail OPEN (tiles render as today) so a
//     Pm-Core blip can never kill the Reports tab;
//   · a sub-user with ZERO granted roles → fail OPEN too, for parity with
//     current behavior (today such users see all tiles). Flip GATE_EMPTY to
//     true in the enforce phase, together with REPORTS_PERMISSIONS_MODE=
//     enforce on Pm-Core, so both layers cut over at once.
const GATE_EMPTY = true;

export default function usePermissions(clinicId) {
  const { isAdmin } = useCapabilities();
  const [state, setState] = useState({ loading: true, roles: null, hasAnalytics: true });

  useEffect(() => {
    let alive = true;
    const params = clinicId ? { hospitalId: Number(clinicId) } : {};
    cached("permissions/me", params, () => ApiReporting.myPermissions(params))
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res ?? {};
        setState({
          loading: false,
          roles: Array.isArray(data.roles) ? data.roles.map(Number) : null,
          hasAnalytics: data.hasAnalytics !== false,
        });
      })
      .catch(() => {
        if (!alive) return;
        setState({ loading: false, roles: null, hasAnalytics: true }); // fail open
      });
    return () => {
      alive = false;
    };
  }, [clinicId]);

  return useMemo(() => {
    const roleSet = state.roles ? new Set(state.roles) : null;
    const gated = !isAdmin && roleSet !== null && (GATE_EMPTY || roleSet.size > 0);
    return {
      loading: state.loading,
      hasAnalytics: state.hasAnalytics,
      // canView(roleId): may this user open the tile gated by this legacy
      // role id? Ungated states (admin, fetch failure, empty grants during
      // the shadow phase) always return true.
      canView: (roleId) => {
        if (!gated || roleId == null) return true;
        return roleSet.has(Number(roleId));
      },
    };
  }, [state, isAdmin]);
}
