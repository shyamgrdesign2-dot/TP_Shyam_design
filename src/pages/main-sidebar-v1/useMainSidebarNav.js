import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { isChrome, isMobile, isSafari } from "react-device-detect";
import moment from "moment";
import { TPIcon } from "@dhspl-tatvacare/tesseract-ui";

import config from "../../config";
import { useLocalStorage, getDecodedToken } from "../../utils/localStorage";
import {
  FREE,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  S_ASK_TATVA,
  S_IPD,
  S_OPD_BILLING,
  S_PHARMACY,
  S_BILLING,
  TRIAL,
  S_TATVA_PRACTICE,
  PERSISTANT_STORAGE_KEY_EXTRA,
  FAILED_VERIFICATION,
  GB_NEW_IPD,
  GB_NEW_IPD_HOS_BUSINESS_ID,
  GB_CVT_EXT_HOS,
  GB_LIMS,
} from "../../utils/constants";
import { errorMessage, getClinicName, sendMessageToParent, shouldMonetizationDisabled, trackEvent } from "../../utils/utils";
import {
  canShowMissionAnalyticsNav,
  canShowNonCvtDataAnalyticsNav,
  isMissionAnalyticsOnlyUser,
  resolveDataAnalyticsDestination,
} from "../data-analytics/data/analyticsAccess";
import { useOpdBilling } from "../opdBilling/useOpdBilling";
import { checkCredits } from "../../redux/monetizationSlice";
import { services } from "../../redux/doctorsSlice";
import { EVENTS } from "../../utils/events";
import {
  buildPharmacyLaunchPayload,
  fetchPharmacyStatus,
  getPharmacyAccessState,
  resolvePharmacySidebarAction,
} from "../monetization/utils/pharmacyInterest";

/* ── Nav catalog ────────────────────────────────────────────────────────
 * Static data + tiny pure helpers that describe the rail. Kept co-located
 * with the hook that consumes them because they have no other reader.
 */

const NAV_IDS = {
  APPOINTMENT: "appointment",
  DATA_ANALYTICS: "data_analytics",
  ASK_TATVA: "ask_tatva",
  OPD_BILLING: S_OPD_BILLING,
  ALL_PATIENTS: "all_patients",
  FOLLOW_UP: "dr_followup_appointment",
  PHARMACY: S_PHARMACY,
  IPD: S_IPD,
  APOLLO: "apollo",
  MESSAGES: "messages",
  LIMS: "lims",
};

// Icon name (or {inactive, active} when the two states are different drawings).
// The rail picks bulk vs linear itself.
const MODULE_ICONS = {
  [NAV_IDS.APPOINTMENT]: { inactive: "time:calendar", active: "time:calendar-2" },
  [NAV_IDS.DATA_ANALYTICS]: "business:graph",
  [NAV_IDS.ASK_TATVA]: "ai:ai-chat",
  [NAV_IDS.OPD_BILLING]: "money:receipt-text",
  [NAV_IDS.ALL_PATIENTS]: "users:profile-2user",
  [NAV_IDS.FOLLOW_UP]: "love:calendar-love",
  [NAV_IDS.PHARMACY]: "shop:shop",
  [NAV_IDS.IPD]: "medical:hospital-bed",
  [NAV_IDS.APOLLO]: "chart:chart-2",
  [NAV_IDS.MESSAGES]: "programming:message-programming",
  [NAV_IDS.LIMS]: "ai:ai-flask",
};

const HIDDEN_MODULE_TYPES = new Set(["MyT_patient", "dis_patient", "data_analytics"]);

const iconFor = (type) => {
  const entry = MODULE_ICONS[type] || MODULE_ICONS[NAV_IDS.APPOINTMENT];
  return typeof entry === "string" ? entry : entry.inactive;
};

/* Four tag states, one visual family (gradient pill, white glyph). Colour
 * is the only carrier of meaning:
 *   new (success), beta (violet), trial (warning),  → word pills
 *   locked (error)                                  → padlock pill
 */
const LockPill = ({ base }) => (
  <span
    aria-label="Locked"
    title="Locked"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 18,
      borderRadius: "999px 0 0 999px",
      backgroundImage: `linear-gradient(257.32deg, ${base} 0%, color-mix(in srgb, ${base} 65%, #fff) 47.22%, ${base} 94.44%)`,
      color: "var(--tesseract-slate-0)",
    }}
  >
    <TPIcon name="security:padlock" variant="bold" size={14} color="var(--tesseract-slate-0)" />
  </span>
);
const TAG = { variant: "gradient", sticky: "right" };
const TAGS = {
  new:    { ...TAG, text: "New",   color: "success" },
  beta:   { ...TAG, text: "Beta",  color: "violet"  },
  trial:  { ...TAG, text: "Trial", color: "warning" },
  locked: <LockPill base="var(--tesseract-error-500)" />,
};

// Any of: TAGS key, number, raw badge object, or null. Unknown falls through
// to a neutral soft badge rather than disappearing.
const resolveBadge = (badge) => {
  if (badge == null || badge === false || badge === "") return undefined;
  if (typeof badge === "object") return badge;
  if (typeof badge === "number") {
    return { text: String(badge), variant: "soft", color: "primary", sticky: "right" };
  }
  const key = String(badge).trim().toLowerCase();
  return TAGS[key] || { text: String(badge), variant: "soft", color: "primary", sticky: "right" };
};

const navItem = ({ id, label, badge, href, icon, children }) => {
  const resolved = resolveBadge(badge);
  const kids = Array.isArray(children) && children.length
    ? children.map((c) => navItem({ ...c, icon: c.icon || iconFor(c.id) }))
    : undefined;
  return {
    id,
    label,
    icon: icon || iconFor(id),
    ...(resolved && { badge: resolved }),
    ...(href && { href }),
    ...(kids && { children: kids }),
  };
};

const tagFromModuleData = (item) => item?.tag ?? item?.badge ?? item?.label_tag;

const childrenFromModuleData = (item) => {
  const raw = item?.children ?? item?.sub_modules ?? item?.features;
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((c) => c?.type || c?.id)
    .map((c) => ({ id: c.id || c.type, label: c.title || c.label, badge: tagFromModuleData(c) }));
};

// Both EMR + module on TRIAL → trial; EMR paid + module still TRIAL → locked.
const monetizationBadge = (moduleType, { emrTier, pharmacyTier, ipdTier, billingTier, monetizationOn }) => {
  if (!monetizationOn) return undefined;
  const tierFor = {
    [S_PHARMACY]: pharmacyTier,
    [S_IPD]: ipdTier,
    ipd: ipdTier,
    [S_OPD_BILLING]: billingTier,
  }[moduleType];
  if (tierFor === undefined) return undefined;
  if (emrTier === TRIAL && tierFor === TRIAL) return "trial";
  if (emrTier !== TRIAL && tierFor === TRIAL) return "locked";
  return undefined;
};

const isHiddenModule = (type) => HIDDEN_MODULE_TYPES.has(type);

const ROUTE_TO_NAV = {
  "/billing-dashboard": NAV_IDS.OPD_BILLING,
  "/all_patients": NAV_IDS.ALL_PATIENTS,
  "/apollo-consultations": NAV_IDS.APOLLO,
  "/bulk_messages": NAV_IDS.MESSAGES,
  "/mission-analytics": NAV_IDS.DATA_ANALYTICS,
  "/data-analytics-x": NAV_IDS.DATA_ANALYTICS,
};

const activeIdFromPath = (pathname, { analyticsOnly } = {}) => {
  if (ROUTE_TO_NAV[pathname]) return ROUTE_TO_NAV[pathname];
  if (pathname?.startsWith("/lims")) return NAV_IDS.LIMS;
  if (analyticsOnly && (pathname === "/" || pathname === "")) return NAV_IDS.DATA_ANALYTICS;
  return NAV_IDS.APPOINTMENT;
};

export default function useMainSidebarNav() {
  const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
  const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(GB_NEW_IPD_HOS_BUSINESS_ID);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isLimsAccessableFromGB = useFeatureIsOn(GB_LIMS);
  const isApolloConsultationsEnabled = useFeatureIsOn("apollo-consultations");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpdBillingAccessable } = useOpdBilling();

  const { servicesList, profile } = useSelector((state) => state.doctors);
  const ASK_TATVA_planDetails = servicesList?.find((e) => e.service_name === S_ASK_TATVA);
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const EMR_planDetails = service_mappings?.find((e) => e.service_name === S_TATVA_PRACTICE);
  const IPD_planDetails = service_mappings?.find((e) => e.service_name === S_IPD);
  const BILLING_planDetails = service_mappings?.find((e) => e.service_name === S_BILLING);
  const PHARMACY_planDetails = service_mappings?.find((e) => e.service_name === S_PHARMACY);

  const tp_monetization_enable = !shouldMonetizationDisabled();
  const [getToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [askTatvaKnowMoreDrawer, setAskTatvaKnowMoreDrawer] = useState(false);
  const [iPDKnowMoreDrawer, setIPDKnowMoreDrawer] = useState(false);
  const [pharmacyKnowMoreDrawer, setPharmacyKnowMoreDrawer] = useState(false);
  /* Opened when a pharmacy_new launch reports missing or editable details.
     The same gate the previous sidebar runs: this rail replaces it on the
     pages inside the shell, so it has to route pharmacy the same way. */
  const [pharmacySetupOpen, setPharmacySetupOpen] = useState(false);
  const [pharmacyMissingFields, setPharmacyMissingFields] = useState([]);
  const [subModalData, setSubModalData] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const baseUrl = config.tatvaAi_api_url;
  const tatvaAiURL = config.tatvaAi_url;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const token = await getToken();
      if (token === undefined) return;
      try {
        const decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        console.log(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const tokenResult = tokenData || getDecodedToken()?.result;
  const showMissionAnalytics = canShowMissionAnalyticsNav(tokenResult, profile);
  const analyticsOnlySidebar = isMissionAnalyticsOnlyUser(tokenResult);
  const hasDataAnalyticsModule = !!profile?.module_data?.some((m) => m?.type === "data_analytics");
  const showNonCvtDataAnalytics = canShowNonCvtDataAnalyticsNav({
    tokenResult,
    hasModuleData: hasDataAnalyticsModule,
  });

  useEffect(() => {
    if (!analyticsOnlySidebar) return;
    if (location.pathname === "/mission-analytics") {
      navigate("/", { replace: true });
    }
  }, [analyticsOnlySidebar, location.pathname, navigate]);

  const handleAskTatvaKnowMore = () => setAskTatvaKnowMoreDrawer((prev) => !prev);
  const handleIPDKnowMore = () => setIPDKnowMoreDrawer((prev) => !prev);
  const handlePharmacyKnowMore = () => setPharmacyKnowMoreDrawer((prev) => !prev);
  const showHideSubModal = () => setIsSubModalOpen((prev) => !prev);

  const isFirstClickOfDay = (key) => {
    try {
      const localStorageExtraData = localStorage.getItem(PERSISTANT_STORAGE_KEY_EXTRA);
      const jsonData = localStorageExtraData ? JSON.parse(localStorageExtraData) : {};
      const today = moment().format("YYYY-MM-DD");
      if (jsonData[`${key}_date`] !== today) {
        jsonData[`${key}_date`] = today;
        localStorage.setItem(PERSISTANT_STORAGE_KEY_EXTRA, JSON.stringify(jsonData));
        return true;
      }
      return false;
    } catch {
      return true;
    }
  };

  const SSO_TO_PM = async () => {
    try {
      const sendData = {
        doctor_unique_id: tokenData.doctor_unique_id,
        mobile_no: tokenData.mobile_no,
        clinic_id: tokenData.clinic_id,
        hm_business_id: tokenData.hospital_business_id,
        from: "app",
      };
      const formData = new FormData();
      Object.keys(sendData).forEach((key) => formData.append(key, sendData[key]));
      const response = await axios.post(config.sso_to_pm_url, formData, {
        auth: { username: config.sso_to_pm_username, password: config.sso_to_pm_password },
      });
      return response.data;
    } catch (err) {
      console.log(err.message);
    }
  };

  const check_SSO = async (moduleName) => {
    SSO_TO_PM().then(async (data) => {
      if (moduleName === "ipd" && (isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB)) {
        const token = await getToken();
        window.location.href = `${config.ipd_portal_url}/?redirectTo=ipd/inPatients&authToken=${token}`;
      } else if (moduleName === "opd_billing" && isOpdBillingAccessable) {
        navigate("/billing-dashboard");
      } else if (moduleName === "all_patients") {
        navigate("/all_patients");
        trackEvent("TP_AllPatients_Click", {
          clinic_name: getClinicName(profile?.hospital_data),
          clinic_id: tokenData?.result?.clinic_id,
          doctor_id: profile?.doctor_unique_id,
          doctor_name: profile?.um_name,
          doctor_mobile_no: profile?.um_contact,
          device_details: isMobile ? "Tab" : "Web",
        });
      } else if (data?.success === 200) {
        if (!isChrome && !isSafari) {
          sendMessageToParent(EVENTS.REDIRECT, {
            url: `${data?.url}&module=${moduleName}`,
            module: moduleName,
          });
        } else {
          await window.open(`${data.url}&module=${moduleName}`);
        }
      }
    });
  };

  const redirectToPharmacyUrl = (url) => {
    if (!isChrome && !isSafari) {
      sendMessageToParent(EVENTS.REDIRECT, { url });
    } else {
      window.location.href = url;
    }
  };

  /**
   * Paid pharmacy_new: check status first.
   * - isSetup + redirectUrl -> redirect (already provisioned)
   * - not setup -> open the setup form, then launch on submit
   */
  const handlePharmacyNewEntry = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const status = await fetchPharmacyStatus(token);

      if (status.isSetup) {
        if (status.redirectUrl) {
          trackEvent("TP_Pharmacy_Launch", {
            clinic_name: getClinicName(profile?.hospital_data),
            doctor_unique_id: profile?.doctor_unique_id,
            hospital_business_id: tokenData?.hospital_business_id,
            clinic_id: tokenData?.clinic_id,
            is_new_pharmacy: false,
            from_status: true,
          });
          setLoading(false);
          redirectToPharmacyUrl(status.redirectUrl);
          return;
        }
        /* Setup claimed but no URL: launch to obtain the login URL. */
        await handlePharmacyLaunch();
        return;
      }

      setPharmacyMissingFields(status.fields);
      setPharmacySetupOpen(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Pharmacy status error:", error);
      errorMessage(
        error?.response?.data?.message ||
          "We could not check your pharmacy status right now. Please try again."
      );
    }
  };

  const handlePharmacyLaunch = async (overrides = {}) => {
    try {
      setLoading(true);
      const token = await getToken();
      const clinicName = getClinicName(profile?.hospital_data);
      const launchPayload = buildPharmacyLaunchPayload(profile, overrides, clinicName);

      const response = await axios.post(
        `${config.monetization_url}/api/v1/pm/pharmacy/launch`,
        launchPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { loginUrl, credentialsEmailSent, isNewPharmacy } = response?.data?.body || {};

      if (!loginUrl) {
        throw new Error("Pharmacy login URL was not returned.");
      }

      trackEvent("TP_Pharmacy_Launch", {
        clinic_name: clinicName,
        doctor_unique_id: profile?.doctor_unique_id,
        hospital_business_id: tokenData?.hospital_business_id,
        clinic_id: tokenData?.clinic_id,
        is_new_pharmacy: !!isNewPharmacy,
      });

      if (isNewPharmacy && credentialsEmailSent === false) {
        errorMessage(
          "Your pharmacy is ready, but we could not email your password. On the login page, use 'Forgot password' with your registered mobile number."
        );
      }

      setLoading(false);
      setPharmacySetupOpen(false);
      redirectToPharmacyUrl(loginUrl);
    } catch (error) {
      setLoading(false);

      const missingFields = error?.response?.data?.fields;
      if (
        error?.response?.status === 400 &&
        error?.response?.data?.error === "MISSING_DOCTOR_DETAILS" &&
        Array.isArray(missingFields)
      ) {
        setPharmacyMissingFields(missingFields);
        setPharmacySetupOpen(true);
        return;
      }

      console.error("Pharmacy launch error:", error);
      errorMessage(
        error?.response?.data?.message ||
          "We could not open your pharmacy right now. Please try again."
      );
    }
  };

  const clickOldModule = async (moduleName) => {
    if (moduleName === "data_analytics") {
      const dest = resolveDataAnalyticsDestination({ tokenResult, profile });
      if (dest === "mission") {
        const onlyAnalytics = isMissionAnalyticsOnlyUser(tokenResult);
        return navigate(onlyAnalytics ? "/" : "/mission-analytics");
      }
      if (dest === "native") return navigate("/data-analytics-x");
      if (dest === "none") return;
      return check_SSO(moduleName);
    }

    if (moduleName === "ipd") return check_SSO(moduleName);

    if (tp_monetization_enable && (moduleName === S_PHARMACY || moduleName === S_IPD)) {
      setSubModalData({ service_name: moduleName });
      if (moduleName === S_PHARMACY) {
        /* pharmacy_new paid goes through the status gate and the launch call;
           legacy paid is still plain SSO; anything else is the intro. */
        const action = resolvePharmacySidebarAction(planDetails);
        if (action === "launch_new") {
          handlePharmacyNewEntry();
        } else if (action === "sso_legacy") {
          check_SSO(moduleName);
        } else if (
          getPharmacyAccessState(planDetails).segment === "trial_active" ||
          getPharmacyAccessState(planDetails).segment === "trial_expired" ||
          getPharmacyAccessState(planDetails).segment === "locked"
        ) {
          handlePharmacyKnowMore();
        } else {
          navigate("/pharmacy");
        }
      } else if (moduleName === S_IPD && EMR_planDetails?.plan_tier === TRIAL && IPD_planDetails?.plan_tier === TRIAL) {
        if (isFirstClickOfDay(moduleName)) handleIPDKnowMore();
        else check_SSO(moduleName);
      } else if (moduleName === S_IPD && EMR_planDetails?.plan_tier !== TRIAL && IPD_planDetails?.plan_tier !== TRIAL) {
        check_SSO(moduleName);
      } else if (moduleName === S_IPD && EMR_planDetails?.plan_tier !== TRIAL && IPD_planDetails?.plan_tier === TRIAL) {
        handleIPDKnowMore();
      } else {
        check_SSO(moduleName);
      }
    } else {
      check_SSO(moduleName);
    }
  };

  const handleTatvaAi = async () => {
    try {
      setLoading(true);
      window.Moengage.track_event("TP_TatvaAI_Open", {
        Doctor_Name: profile?.um_name,
        Doctor_Number: profile?.um_contact,
        Doctor_Unique_Id: profile?.doctor_unique_id,
        Doctor_Um_Id: tokenData?.user_id,
        Payment_Status: planDetails?.currentPlanStatus,
      });
      const token = await getToken();
      const response = await axios.post(
        `${baseUrl}/api/v1/practice/tatva-ai-token`,
        { mobileNumber: `91${profile?.um_contact}` },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const tatvaAitoken = response.data.data.token;
      const newUrl = `${tatvaAiURL}/login?authToken=${tatvaAitoken}&app=ask_tatva`;
      setLoading(false);
      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.REDIRECT, { url: newUrl });
      } else {
        await window.open(newUrl, "_blank");
      }
    } catch (error) {
      setLoading(false);
      console.error("API Error:", error);
      errorMessage(error.message);
    }
  };

  const checkTatvaAiPurchased = async () => {
    setSubModalData({ service_name: S_ASK_TATVA });
    if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance <= 0) {
      showHideSubModal();
    } else if (ASK_TATVA_planDetails?.plan_tier === FAILED_VERIFICATION) {
      showHideSubModal();
    } else {
      const sendData = { b2c_id: profile?.b2c, service_name: S_ASK_TATVA };
      const action = await dispatch(checkCredits(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (action?.payload?.hasOwnProperty("service_name")) {
          if (action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
            if (action?.payload?.credit_balance !== ASK_TATVA_planDetails?.credit_balance) {
              await dispatch(services(sendData?.b2c_id));
            }
            showHideSubModal();
          } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal();
          } else {
            handleTatvaAi();
          }
        } else {
          typeof action?.payload?.data?.error === "object"
            ? errorMessage(action?.payload?.data?.error?.description)
            : errorMessage(action?.payload?.data?.message);
        }
      } else {
        errorMessage(action.payload.message);
      }
    }
  };

  const tatvaAiRedirectOrDrawer = () => {
    if (tp_monetization_enable) {
      if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance > 0) {
        if (isFirstClickOfDay(S_ASK_TATVA)) handleAskTatvaKnowMore();
        else checkTatvaAiPurchased();
      } else if (ASK_TATVA_planDetails?.plan_tier !== FREE) {
        checkTatvaAiPurchased();
      } else if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance <= 0) {
        handleAskTatvaKnowMore();
      }
    } else {
      handleTatvaAi();
    }
  };

  const badgeCtx = {
    emrTier: EMR_planDetails?.plan_tier,
    pharmacyTier: PHARMACY_planDetails?.plan_tier,
    ipdTier: IPD_planDetails?.plan_tier,
    billingTier: BILLING_planDetails?.plan_tier,
    monetizationOn: tp_monetization_enable,
  };

  const activeId = activeIdFromPath(location.pathname, { analyticsOnly: analyticsOnlySidebar });

  const liveItems = useMemo(() => {
    const items = [];
    if (!analyticsOnlySidebar) {
      items.push(navItem({ id: NAV_IDS.APPOINTMENT, label: "Appointment" }));
    }

    if (!isCvtExtHosAccessableFromGB && !analyticsOnlySidebar) {
      /*
       * Order by how often a doctor reaches for each module during a real day:
       * daily patient work first (All Patients, OPD Billing, Follow Up), then
       * inpatient / pharmacy, then reporting (Data/Apollo Analytics), then
       * peripheral (Messages, LIMS), and Ask Tatva sits last as an assistive
       * shortcut rather than a workflow entry. `module_data` from the profile
       * is re-sorted against this priority; anything the backend adds without
       * a known type falls in after the ranked block but before Ask Tatva.
       */
      const MODULE_PRIORITY = {
        all_patients: 1,
        opd_billing: 2,
        dr_followup_appointment: 3,
        ipd: 4,
        pharmacy: 5,
      };
      const rankedModules = (profile?.module_data || [])
        .filter((item) => item?.type && !isHiddenModule(item.type))
        .slice()
        .sort((a, b) => {
          const ra = MODULE_PRIORITY[a.type] ?? 99;
          const rb = MODULE_PRIORITY[b.type] ?? 99;
          return ra - rb;
        });
      rankedModules.forEach((item) => {
        items.push(
          navItem({
            id: item.type,
            label: item.title,
            badge: tagFromModuleData(item) ?? monetizationBadge(item.type, badgeCtx),
            children: childrenFromModuleData(item),
          })
        );
      });
    }

    if (showMissionAnalytics) {
      items.push(navItem({ id: NAV_IDS.DATA_ANALYTICS, label: "Analytics" }));
    } else if (showNonCvtDataAnalytics) {
      const strippedTitle = (
        profile?.module_data?.find((m) => m?.type === "data_analytics")?.title || "Analytics"
      ).replace(/^data\s+/i, "");
      const analyticsTitle = strippedTitle.charAt(0).toUpperCase() + strippedTitle.slice(1);
      items.push(navItem({ id: NAV_IDS.DATA_ANALYTICS, label: analyticsTitle }));
    }

    if (!isCvtExtHosAccessableFromGB && !analyticsOnlySidebar) {
      if (isApolloConsultationsEnabled) {
        items.push(navItem({ id: NAV_IDS.APOLLO, label: "Apollo analytics" }));
      }
      if (profile?.ownerDoctor === 1) {
        items.push(navItem({ id: NAV_IDS.MESSAGES, label: "Messages" }));
      }
      if (!isLimsAccessableFromGB) {
        items.push(navItem({ id: NAV_IDS.LIMS, label: "LIMS" }));
      }
      items.push(navItem({ id: NAV_IDS.ASK_TATVA, label: "Ask Tatva" }));
    }

    return items;
    // badgeCtx is a fresh object each render; depend on the primitive tiers instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    analyticsOnlySidebar,
    showMissionAnalytics,
    showNonCvtDataAnalytics,
    isCvtExtHosAccessableFromGB,
    isApolloConsultationsEnabled,
    isLimsAccessableFromGB,
    profile,
    tp_monetization_enable,
    EMR_planDetails?.plan_tier,
    PHARMACY_planDetails?.plan_tier,
    IPD_planDetails?.plan_tier,
    BILLING_planDetails?.plan_tier,
  ]);

  const items = liveItems;

  const onSelect = useCallback(
    (id) => {
      if (id === NAV_IDS.APPOINTMENT) return navigate("/");
      if (id === NAV_IDS.DATA_ANALYTICS) return clickOldModule("data_analytics");
      if (id === NAV_IDS.ASK_TATVA) return tatvaAiRedirectOrDrawer();
      if (id === NAV_IDS.APOLLO) return navigate("/apollo-consultations");
      if (id === NAV_IDS.MESSAGES) return navigate("/bulk_messages");
      if (id === NAV_IDS.LIMS) return navigate("/lims");

      if (id === NAV_IDS.OPD_BILLING && isOpdBillingAccessable) {
        return navigate("/billing-dashboard");
      }
      if (id === "all_patients") {
        trackEvent("TP_AllPatients_Click", {
          clinic_name: getClinicName(profile?.hospital_data),
          clinic_id: tokenResult?.clinic_id,
          doctor_id: profile?.doctor_unique_id,
          doctor_name: profile?.um_name,
          doctor_mobile_no: profile?.um_contact,
          device_details: isMobile ? "Tab" : "Web",
        });
        return navigate("/all_patients");
      }

      return clickOldModule(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      navigate,
      isOpdBillingAccessable,
      tokenResult,
      profile,
      tp_monetization_enable,
      ASK_TATVA_planDetails,
      EMR_planDetails,
      IPD_planDetails,
      planDetails,
      tokenData,
    ]
  );

  return {
    items,
    activeId,
    onSelect,
    loading,
    askTatvaKnowMoreDrawer,
    handleAskTatvaKnowMore,
    checkTatvaAiPurchased,
    iPDKnowMoreDrawer,
    handleIPDKnowMore,
    pharmacyKnowMoreDrawer,
    handlePharmacyKnowMore,
    subModalData,
    isSubModalOpen,
    showHideSubModal,
    check_SSO,
    pharmacySetupOpen,
    pharmacyMissingFields,
    closePharmacySetup: () => setPharmacySetupOpen(false),
    handlePharmacyLaunch,
    pharmacyDefaultName: getClinicName(profile?.hospital_data),
  };
}
