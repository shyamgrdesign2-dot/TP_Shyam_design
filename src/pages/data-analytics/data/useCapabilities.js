import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getDecodedToken } from "../../../utils/localStorage";
import {
  GB_VIDEO_CONSULT,
  GB_TELE_CONSULT,
  GB_SNAP_RX,
  GB_TAB_RX,
  GB_SMARTSYNC_CONNECT,
  GB_GYNEC_HISTORY,
} from "../../../utils/constants";

// What is this account actually configured for? Analytics must never show a
// metric for a feature the clinic/doctor doesn't have (spec §1.7). All of it
// resolves from data the app already holds at login — no extra API call:
//
//   role            JWT `result.admin` (src/utils/localStorage getDecodedToken)
//   self identity   JWT `result.user_id` + profile `um_name`
//   clinic          JWT `result.clinic_id` (+ profile `hospital_data` for name)
//   IPD             profile `module_data` contains type "ipd"
//   Data Analytics  profile `module_data` contains type "data_analytics"
//                   (admin OR this module → clinic-wide doctor filter)
//   ABDM/ABHA       profile `abhaEnable`
//   consult modes   GrowthBook flags (same flags that gate the live features):
//                   video-consult / tele-consult, snap-rx, tab-rx,
//                   smartsync-connect. Voice RX and Point & Click have no
//                   kill-switch flag — always available.
//   gynec/obstetric GrowthBook "obs-gynec-history" (gates the Rx-pad module)
export default function useCapabilities() {
  const profile = useSelector((s) => s.doctors?.profile) || {};

  const videoConsult = useFeatureIsOn(GB_VIDEO_CONSULT);
  const teleConsult = useFeatureIsOn(GB_TELE_CONSULT);
  const snapRx = useFeatureIsOn(GB_SNAP_RX);
  const tabRx = useFeatureIsOn(GB_TAB_RX);
  const smartSync = useFeatureIsOn(GB_SMARTSYNC_CONNECT);
  const gynecObstetric = useFeatureIsOn(GB_GYNEC_HISTORY);

  return useMemo(() => {
    const token = getDecodedToken()?.result || {};
    const isAdmin = Number(token.admin) === 1 || Number(profile.ownerDoctor) === 1;
    const clinics = Array.isArray(profile.hospital_data) ? profile.hospital_data : [];
    const modules = Array.isArray(profile.module_data) ? profile.module_data : [];
    // Prefer the clinic on the auth token (active login clinic); fall back to
    // the first hospital on the profile when the claim is missing.
    const selfClinicId =
      token.clinic_id != null
        ? String(token.clinic_id)
        : clinics[0]?.hm_id != null
          ? String(clinics[0].hm_id)
          : null;
    const selfClinic =
      clinics.find((h) => h?.hm_id != null && String(h.hm_id) === selfClinicId) || null;

    return {
      isAdmin,
      selfId: token.user_id != null ? String(token.user_id) : null,
      selfName: profile.um_name || null,
      selfClinicId,
      selfClinicName: selfClinic?.hm_name || null,
      // Clinic filter is read-only for everyone (token-scoped); keep the flag
      // for callers that still check singleClinic for lock UI.
      singleClinic: true,
      ipd: modules.some((m) => m?.type === "ipd"),
      hasAnalyticsModule: modules.some((m) => m?.type === "data_analytics"),
      abdm: profile.abhaEnable === true,
      gynecObstetric,
      modes: {
        video: videoConsult || teleConsult,
        snapRx,
        tabRx,
        smartSync,
        voiceRx: true,
        typeRx: true,
      },
    };
  }, [profile, videoConsult, teleConsult, snapRx, tabRx, smartSync, gynecObstetric]);
}
