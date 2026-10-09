import React, { useState, useEffect } from "react";
import { Button, Drawer } from "antd";
import { isMobile, isChrome, isSafari } from "react-device-detect";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";

import config from "../config";
import { useLocalStorage, getDecodedToken } from "../utils/localStorage";
import { FREE, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, PERSISTANT_STORAGE_KEY_GENX_TOKEN, S_ASK_TATVA, S_IPD, S_PHARMACY, S_OPD_BILLING, S_BILLING, TRIAL, S_TATVA_PRACTICE, PERSISTANT_STORAGE_KEY_EXTRA, FAILED_VERIFICATION, GB_NEW_IPD, GB_NEW_IPD_HOS_BUSINESS_ID, GB_CVT_EXT_HOS, GB_LIMS, NATIVE_DATA_ANALYTICS_NAV_ENABLED } from "../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { errorMessage, getClinicName, sendMessageToParent, shouldMonetizationDisabled, trackEvent } from "../utils/utils";
import {
  canShowMissionAnalyticsNav,
  canShowNonCvtDataAnalyticsNav,
  isMissionAnalyticsOnlyUser,
  resolveDataAnalyticsDestination,
} from "../pages/data-analytics/data/analyticsAccess";
import FullPageLoader from "../pages/vaccination/components/Loader";
import { useOpdBilling } from "../pages/opdBilling/useOpdBilling";
import moment from "moment";
import { checkCredits } from "../redux/monetizationSlice";
import { services } from "../redux/doctorsSlice";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import IPDKnowMore from "../pages/monetization/components/IPDKnowMore";
import {
  buildPharmacyLaunchPayload,
  fetchPharmacyStatus,
  hasPharmacyPaidAccess,
  resolvePharmacySidebarAction,
} from "../pages/monetization/utils/pharmacyInterest";
import AskTatvaKnowMore from "../pages/monetization/components/AskTatvaKnowMore";
import PharmacySetupDetailsModal from "../pages/monetization/components/PharmacySetupDetailsModal";
import { EVENTS } from "../utils/events";
import { ASSETS } from "../assets";
import { isNeoEnabled } from "../utils/neoConsultationUtils";
import { NeoMicIcon } from "../components/neo/icons";

const {
  lockIcon: LockIcon,
  navbarIcons: ni,
} = ASSETS.images;

// Icon mapping constants — URLs from ASSETS (Azure)
const ICON_MAP = {
  inactive: {
    ipd: ni.hospitalBed,
    all_patients: ni.profile2user,
    data_analytics: ni.pieChart,
    apollo_analytics: ni.chart,
    pharmacy: ni.shop,
    opd_billing: ni.receiptText,
    dr_followup_appointment: ni.calendarTick,
    tatva_ai: ni.message2,
  },
  active: {
    ipd: ni.hospitalBedPrimary,
    all_patients: ni.profile2userPrimary,
    data_analytics: ni.pieChartPrimary,
    apollo_analytics: ni.chartPrimary,
    pharmacy: ni.shopPrimary,
    opd_billing: ni.receiptTextPrimary,
    dr_followup_appointment: ni.calendarTickPrimary,
    tatva_ai: ni.message2Primary,
  },
};

// Helper functions
const getIcon = (type, isHovered, isRouteActive = false) => {
  const shouldUseActiveIcon = isHovered || isRouteActive;
  const iconSet = shouldUseActiveIcon ? ICON_MAP.active : ICON_MAP.inactive;
  return iconSet[type] || "";
};

// Helper to check if a route is active based on module type
const isModuleRouteActive = (moduleType, location) => {
  const routeMap = {
    opd_billing: "/billing-dashboard",
    all_patients: "/all_patients",
    pharmacy: "/pharmacy",
    // Note: dr_followup_appointment, data_analytics, and ipd are external redirects
    // They open in new tabs, so they should not be in the routeMap
  };
  const route = routeMap[moduleType];
  return route ? location.pathname === route || location.pathname.startsWith(`${route}/`) : false;
};

function SidebarDoctor() {
  const isNewIPDAccessableFromGB = useFeatureIsOn(GB_NEW_IPD);
  const isNewIPDHosBusinessIdAccessableFromGB = useFeatureIsOn(
    GB_NEW_IPD_HOS_BUSINESS_ID
  );
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isLimsAccessableFromGB = useFeatureIsOn(GB_LIMS);

  const dispatch = useDispatch();
  const { servicesList } = useSelector((state) => state.doctors);
  const ASK_TATVA_planDetails = servicesList?.find(e => e.service_name === S_ASK_TATVA)

  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const EMR_planDetails = service_mappings?.find(e => e.service_name === S_TATVA_PRACTICE)
  const IPD_planDetails = service_mappings?.find(e => e.service_name === S_IPD)
  const BILLING_planDetails = service_mappings?.find(e => e.service_name === S_BILLING)

  const tp_monetization_enable = !shouldMonetizationDisabled();

  const [getToken, setToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_AUTH_TOKEN
  );
  const { profile } = useSelector((state) => state.doctors);
  const [tokenData, setTokenData] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tatvaHovered, SetTatvaHovered] = useState(null);
  const [isAppointmentHovered, setIsAppointmentHovered] = useState(false);
  const [isMessagesHovered, setIsMessagesHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  // Opened when a pharmacy_new launch reports missing/editable details (name, branch, email)
  // instead of failing outright — see handlePharmacyLaunch's MISSING_DOCTOR_DETAILS handling.
  const [pharmacySetupOpen, setPharmacySetupOpen] = useState(false);
  const [pharmacyMissingFields, setPharmacyMissingFields] = useState([]);

  const [askTatvaKnowMoreDrawer, setAskTatvaKnowMoreDrawer] = useState(false);
  const [iPDKnowMoreDrawer, setIPDKnowMoreDrawer] = useState(false);
  const [subModalData, setSubModalData] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const navigate = useNavigate();
  const { isOpdBillingAccessable } = useOpdBilling();

  const isApolloConsultationsEnabled = useFeatureIsOn("apollo-consultations");

  const location = useLocation();
  const sidebarRef = React.useRef(null);
  const baseUrl = config.tatvaAi_api_url;
  const tatvaAiURL = config.tatvaAi_url;

  // Scroll sidebar to top
  const scrollToTop = () => {
    if (sidebarRef.current) {
      // Check if SidebarDoctor itself is scrollable
      if (sidebarRef.current.scrollHeight > sidebarRef.current.clientHeight) {
        sidebarRef.current.scrollTop = 0;
      }
      // Also check for scrollable-content child element
      const scrollableContent = sidebarRef.current.querySelector('.scrollable-content');
      if (scrollableContent) {
        scrollableContent.scrollTop = 0;
      }
    }
  };

  useEffect(() => {
    if (profile) {
      const getStorageData = async () => {
        const token = await getToken();
        if (token !== undefined) {
          try {
            var decoded = jwtDecode(token);
            setTokenData(decoded.result);
            window.beamer_config = {
              ...window.beamer_config,
              product_id: "JBgEuAKX59541",
              filter: profile?.dp_name,
              user_firstname: profile?.um_name,
              user_lastname: "",
              user_id: decoded.result.user_id,
            };
          } catch (e) {
            console.log(e);
          }
        }
      };
      getStorageData();
    }
  }, [profile]);

  const handleAskTatvaKnowMore = () => {
    setAskTatvaKnowMoreDrawer((prev) => !prev);
  };

  const handleIPDKnowMore = () => {
    setIPDKnowMoreDrawer((prev) => !prev);
  };

  const showHideSubModal = () => {
    setIsSubModalOpen(!isSubModalOpen);
  }

  const isFirstClickOfDay = (key) => {
    const localStorageExtraData = localStorage.getItem(PERSISTANT_STORAGE_KEY_EXTRA);
    const jsonData = localStorageExtraData ? JSON.parse(localStorageExtraData) : {};
    const today = moment().format('YYYY-MM-DD');
    if (jsonData[`${key}_date`] !== today) {
      jsonData[`${key}_date`] = today;
      localStorage.setItem(PERSISTANT_STORAGE_KEY_EXTRA, JSON.stringify(jsonData));
      return true;
    } else {
      return false;
    }
  };

  const clickOldModule = async (moduleName) => {
    // Check if this is an external redirect module
    const isExternalModule = 
      moduleName === S_PHARMACY || 
      moduleName === S_IPD || 
      moduleName === "ipd" ||
      moduleName === "dr_followup_appointment" ||
      moduleName === "data_analytics";
    
    // For external redirect modules: scroll to top and clear hover states
    if (isExternalModule) {
      scrollToTop();
      setHoveredItem(null);
    }

    if (moduleName === S_PHARMACY) {
      return handlePharmacyClick();
    }

    // Data Analytics: Mission/CVT → /mission-analytics (admin/special only);
    // non-CVT → native page when release flag or allowlist; else legacy SSO.
    if (moduleName === "data_analytics") {
      const tokenResult = tokenData || getDecodedToken()?.result;
      const dest = resolveDataAnalyticsDestination({
        tokenResult,
        profile,
      });
      if (dest === "mission") {
        const onlyAnalytics = isMissionAnalyticsOnlyUser(tokenResult);
        return navigate(onlyAnalytics ? "/" : "/mission-analytics");
      }
      if (dest === "native") return navigate("/data-analytics-x");
      if (dest === "none") return;
      return check_SSO(moduleName);
    }

    if(moduleName === "ipd") {
      return check_SSO(moduleName);
    }
    // if (moment(planDetails?.plan_active_date).diff("2025-07-01", 'days') > 0) {
      if (tp_monetization_enable && moduleName === S_IPD) {
        setSubModalData({ service_name: moduleName })
        if (moduleName === S_IPD && EMR_planDetails?.plan_tier === TRIAL && IPD_planDetails?.plan_tier === TRIAL) {
          if (isFirstClickOfDay(moduleName)) {
            handleIPDKnowMore();
          } else {
            check_SSO(moduleName);
          }
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
    // } else {
    //   check_SSO(moduleName);
    // }

    // if (tp_monetization_enable && (moduleName === S_PHARMACY || moduleName === S_IPD)) {
    //   setSubModalData({ service_name: moduleName })
    //   if (moduleName === S_PHARMACY && EMR_planDetails?.plan_tier !== TRIAL && PHARMACY_planDetails?.plan_tier === TRIAL) {
    //     handlePharmacyKnowMore()
    //     showHideSubModal()
    //   } else if (moduleName === S_IPD && EMR_planDetails?.plan_tier !== TRIAL && IPD_planDetails?.plan_tier === TRIAL) {
    //     handleIPDKnowMore()
    //     showHideSubModal()
    //   } else {
    //     check_SSO(moduleName);
    //   }
    // } else {
    //   check_SSO(moduleName);
    // }

    // if (tp_monetization_enable && (moduleName === S_PHARMACY || moduleName === S_IPD)) {
    //   setSubModalData({ service_name: moduleName })
    //   if (moduleName === S_PHARMACY) {
    //     handlePharmacyKnowMore()
    //   } else if (moduleName === S_IPD) {
    //     handleIPDKnowMore()
    //   } else {
    //     check_SSO(moduleName);
    //   }
    // } else {
    //   check_SSO(moduleName);
    // }
  };

  /**
   * Single entry for sidebar pharmacy clicks — used by NavLink and clickOldModule.
   * pharmacy_new paid → status gate then launch/modal; legacy paid → SSO; otherwise → intro.
   *
   * @param {Event} [event] - when present (NavLink), prevent default for paid paths only
   */
  const handlePharmacyClick = (event) => {
    scrollToTop();
    setHoveredItem(null);

    const action = resolvePharmacySidebarAction(planDetails);

    if (action === "launch_new") {
      event?.preventDefault();
      handlePharmacyNewEntry();
      return;
    }

    if (action === "sso_legacy") {
      event?.preventDefault();
      check_SSO(S_PHARMACY);
      return;
    }

    if (!event) {
      navigate("/pharmacy");
    }
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
   * - isSetup + redirectUrl → redirect (already provisioned)
   * - not setup → open PharmacySetupDetailsModal, then launch on submit
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
        // Setup claimed but no URL — fall through to launch to obtain loginUrl.
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

  /**
   * Asks monetization to provision (first click) or recognise (every click after) the doctor's
   * pharmacy_new (SCM-backed) tenant, then sends the browser to the returned login URL.
   *
   * The provisioning transaction runs synchronously on the first click for a business, so the
   * full-page loader stays up for the whole round trip rather than flashing.
   *
   * @param {{organizationName?: string, branchName?: string, email?: string}} overrides - values
   *   confirmed/edited in PharmacySetupDetailsModal. Absent on the first, silent attempt; present
   *   only when retrying after that attempt reported missing/editable details.
   */
  const handlePharmacyLaunch = async (overrides = {}) => {
    try {
      setLoading(true);
      const token = await getToken();
      const clinicName = getClinicName(profile?.hospital_data);
      // Matches POST /api/v1/pm/pharmacy/launch — firstName/lastName (not fullName).
      // Tenancy (business/clinic ids) is read from the JWT server-side.
      const launchPayload = buildPharmacyLaunchPayload(
        profile,
        overrides,
        clinicName
      );

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

      const { loginUrl, credentialsEmailSent, isNewPharmacy } =
        response?.data?.body || {};

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

      // A brand-new pharmacy whose credentials email failed would otherwise leave the doctor at a
      // login screen with no password and no idea why. Point them at the mobile-OTP reset instead.
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

      // The pharmacy is about to be created for the first time and either a required field is
      // missing (most commonly email) or this is the moment to let the doctor name it. Open the
      // editable setup form instead of failing outright.
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

  async function check_SSO(moduleName) {
    SSO_TO_PM().then(async (data) => {
      if (
        moduleName === "ipd" &&
        (isNewIPDAccessableFromGB || isNewIPDHosBusinessIdAccessableFromGB)
      ) {
      const token = await getToken();
        // Carry the GenX session across origins too — the IPD portal stores the
        // `genrxToken` param into its own localStorage and strips it from the URL.
        // The stored value is a JSON-quoted string; unwrap to the raw JWT.
        let genxToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_GENX_TOKEN);
        if (genxToken) {
          try {
            const parsed = JSON.parse(genxToken);
            genxToken = typeof parsed === "string" ? parsed : genxToken;
          } catch (e) {
            // not JSON — use as is
          }
          genxToken = genxToken.replace(/^["']|["']$/g, "");
        }
        const genxParam = genxToken
          ? `&genrxToken=${encodeURIComponent(genxToken)}`
          : "";
        window.location.href = `${config.ipd_portal_url}/?redirectTo=ipd/inPatients&authToken=${token}${genxParam}`;
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
      } else {
        if (data.success == 200) {
          if (!isChrome && !isSafari) {
            // navigate(`/?url=${data.url}&module=${moduleName}&key=phpRedirect`, {
            //   replace: true,
            // });
            // navigate(0, { replace: true });
            sendMessageToParent(EVENTS.REDIRECT, {
              url: `${data?.url}&module=${moduleName}`,
              module: moduleName
            });
          } else {
            await window.open(`${data.url}&module=${moduleName}`);
          }
        }
      }
    });
  }

  async function SSO_TO_PM() {
    try {
      const sendData = {
        doctor_unique_id: tokenData.doctor_unique_id,
        mobile_no: tokenData.mobile_no,
        clinic_id: tokenData.clinic_id,
        hm_business_id: tokenData.hospital_business_id,
        from: "app",
      };

      const formData = new FormData();
      Object.keys(sendData).forEach((key) => {
        formData.append(key, sendData[key]);
      });

      const response = await axios.post(config.sso_to_pm_url, formData, {
        auth: {
          username: config.sso_to_pm_username,
          password: config.sso_to_pm_password,
        },
      });

      return response.data;
    } catch (err) {
      console.log(err.message);
      console.log(err.response.status);
    }
  }

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
        {
          mobileNumber: `91${profile?.um_contact}`,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Extract the token from the response
      const tatvaAitoken = response.data.data.token;

      // Construct the new URL with the token
      const newUrl = `${tatvaAiURL}/login?authToken=${tatvaAitoken}&app=ask_tatva`;

      setLoading(false);

      if (!isChrome && !isSafari) {
        // navigate(`/?url=${newUrl}&key=phpRedirect`, { replace: true });
        // navigate(0, { replace: true });
        sendMessageToParent(EVENTS.REDIRECT, {
          url: newUrl,
        });
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
    setSubModalData({ service_name: S_ASK_TATVA })
    if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance <= 0) {
      showHideSubModal()
    } else if (ASK_TATVA_planDetails?.plan_tier === FAILED_VERIFICATION) {
      showHideSubModal()
    } else {
      let sendData = {
        b2c_id: profile?.b2c,
        service_name: S_ASK_TATVA
      }
      const action = await dispatch(checkCredits(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (action?.payload?.hasOwnProperty("service_name")) {
          if (action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
            if (action?.payload?.credit_balance != ASK_TATVA_planDetails?.credit_balance) {
              await dispatch(services(sendData?.b2c_id))
            }
            showHideSubModal()
          } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal()
          } else {
            handleTatvaAi();
          }
        } else {
          typeof action?.payload?.data?.error === 'object' ?
            errorMessage(action?.payload?.data?.error?.description)
            :
            errorMessage(action?.payload?.data?.message)
        }
      } else {
        errorMessage(action.payload.message)
      }
    }
  }

  const tatvaAiRedirectOrDrawer = () => {
    // Scroll to top and clear hover state for Ask Tatva (external redirect)
    scrollToTop();
    SetTatvaHovered(false);

    if (tp_monetization_enable) {
      if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance > 0) {
        if (isFirstClickOfDay(S_ASK_TATVA)) {
          handleAskTatvaKnowMore();
        } else {
          checkTatvaAiPurchased();
        }
      } else if (ASK_TATVA_planDetails?.plan_tier !== FREE) {
        checkTatvaAiPurchased();
      } else if (ASK_TATVA_planDetails?.plan_tier === FREE && ASK_TATVA_planDetails?.credit_balance <= 0) {
        handleAskTatvaKnowMore();
      }
    } else {
      handleTatvaAi();
    }
  }

  const handleHover = (data) => {
    if (data) {
      setHoveredItem(null);
      SetTatvaHovered(true);
    } else {
      SetTatvaHovered(false);
    }
  };

  const tokenResult = tokenData || getDecodedToken()?.result;
  // Mission Analytics gated by JWT hospital_business_id (not GrowthBook).
  const showMissionAnalytics = canShowMissionAnalyticsNav(tokenResult, profile);
  const analyticsOnlySidebar = isMissionAnalyticsOnlyUser(tokenResult);
  const hasDataAnalyticsModule = !!profile?.module_data?.some(
    (m) => m?.type === "data_analytics"
  );
  const showNonCvtDataAnalytics = canShowNonCvtDataAnalyticsNav({
    tokenResult,
    hasModuleData: hasDataAnalyticsModule,
  });

  // Special Mission users stay on `/` with embedded analytics (no redirect loop).
  // Admin Mission users open `/mission-analytics` (also embedded in this shell).
  useEffect(() => {
    if (!analyticsOnlySidebar) return;
    if (location.pathname === "/mission-analytics") {
      navigate("/", { replace: true });
    }
  }, [analyticsOnlySidebar, location.pathname, navigate]);
  
  return (
    <>
      <div className="SidebarDoctor" ref={sidebarRef}>
        {/* <div className="scrollable-content"> */}
          {!analyticsOnlySidebar && (
          <NavLink
            to="/"
            replace={true}
            className={({ isActive, isPending }) => {
              // Appointment should be active when:
              // 1. On "/" route (default)
              // 2. When no other specific route is active (fallback to default)
              const isOnHomeRoute = location.pathname === "/";
              const hasNoActiveRoute = 
                location.pathname !== "/billing-dashboard" &&
                location.pathname !== "/all_patients" &&
                location.pathname !== "/apollo-consultations" &&
                location.pathname !== "/bulk_messages" &&
                location.pathname !== "/mission-analytics" &&
                location.pathname !== "/data-analytics-x" &&
                location.pathname !== "/pharmacy" &&
                !location.pathname.startsWith("/lims");
              
              if (isPending) return "pending";
              if (isOnHomeRoute || (hasNoActiveRoute && !isActive)) return "active";
              return isActive ? "active" : "";
            }}
            onMouseEnter={() => setIsAppointmentHovered(true)}
            onMouseLeave={() => setIsAppointmentHovered(false)}
          >
            <img
              src={
                (location.pathname === "/" || 
                 (location.pathname !== "/billing-dashboard" &&
                  location.pathname !== "/all_patients" &&
                  location.pathname !== "/apollo-consultations" &&
                  location.pathname !== "/bulk_messages" &&
                  location.pathname !== "/mission-analytics" &&
                  location.pathname !== "/data-analytics-x" &&
                  location.pathname !== "/pharmacy" &&
                  !location.pathname.startsWith("/lims"))) || 
                isAppointmentHovered
                  ? ni.calendarPrimary
                  : ni.calendar
              }
              alt="appointment"
            />
            <div className="mt-1 px-2">
              {isMobile ? (
                "Appt"
              ) : (
                <div className="text-truncate">Appointment</div>
              )}
            </div>
          </NavLink>
          )}

          {/* Mission/CVT: admin + special → /mission-analytics (no module_data required).
              Other CVT doctors: no Data Analytics.
              Non-CVT: release flag → native; else module_data → SSO (or allowlist native). */}
          {showMissionAnalytics ? (
            <NavLink
              replace={true}
              className={({ isPending }) =>
                isPending
                  ? "pending"
                  : hoveredItem === "mission_analytics" ||
                      location.pathname === "/mission-analytics" ||
                      (analyticsOnlySidebar && (location.pathname === "/" || location.pathname === ""))
                    ? "active"
                    : ""
              }
              onClick={(e) => {
                e.preventDefault();
                scrollToTop();
                setHoveredItem(null);
                // Special users already have analytics on `/`; admin opens dedicated path.
                navigate(analyticsOnlySidebar ? "/" : "/mission-analytics");
              }}
              onMouseEnter={() => setHoveredItem("mission_analytics")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <img
                src={getIcon(
                  "data_analytics",
                  hoveredItem === "mission_analytics" ||
                    location.pathname === "/mission-analytics" ||
                    (analyticsOnlySidebar && (location.pathname === "/" || location.pathname === "")),
                  false
                )}
                alt="data_analytics"
              />
              <div className="mt-1 px-2">
                <div className="text-truncate">Data Analytics</div>
              </div>
            </NavLink>
          ) : showNonCvtDataAnalytics ? (
            NATIVE_DATA_ANALYTICS_NAV_ENABLED ? (
              <NavLink
                replace={true}
                className={({ isPending }) =>
                  isPending
                    ? "pending"
                    : hoveredItem === "data_analytics" || location.pathname === "/data-analytics-x"
                      ? "active"
                      : ""
                }
                onClick={(e) => {
                  e.preventDefault();
                  setHoveredItem(null);
                  clickOldModule("data_analytics");
                }}
                onMouseEnter={() => setHoveredItem("data_analytics")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <img
                  src={getIcon(
                    "data_analytics",
                    hoveredItem === "data_analytics" || location.pathname === "/data-analytics-x",
                    false
                  )}
                  alt="data_analytics"
                />
                <div className="mt-1 px-2">
                  <div className="text-truncate">Data Analytics</div>
                </div>
              </NavLink>
            ) : (
              profile?.module_data
                ?.filter((item) => item?.type === "data_analytics")
                ?.map((item) => {
                  const hoverKey = "data_analytics";
                  const isHovered = hoveredItem === hoverKey;
                  return (
                    <div key={item.type} className="position-relative">
                      <NavLink
                        onClick={(e) => {
                          e.preventDefault();
                          setHoveredItem(null);
                          clickOldModule(item.type);
                        }}
                        replace={true}
                        className={({ isPending }) =>
                          isPending ? "pending" : isHovered ? "active" : ""
                        }
                        onMouseEnter={() => setHoveredItem(hoverKey)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <img
                          src={getIcon(item.type, isHovered, false)}
                          alt={`${item.type}`}
                        />
                        <div className="mt-1 px-2">{item.title}</div>
                      </NavLink>
                    </div>
                  );
                })
            )
          ) : null}

          {!isCvtExtHosAccessableFromGB && !analyticsOnlySidebar && (
          <>

          <NavLink
            replace={true}
            className={({ isActive, isPending }) =>
              // Ask Tatva should only show active on hover, not on click
              isPending ? "pending" : tatvaHovered ? "active" : ""
            }
          >
            <div
              className={`d-flex align-items-center flex-column ${
                tatvaHovered ? "hoveredColor" : ""
              }`}
              onMouseEnter={() => handleHover(true)} // Set the hovered item
              onMouseLeave={() => handleHover(false)} // Clear the hovered item
              onClick={(e) => {
                // Clear hover state immediately on click to prevent active styles
                SetTatvaHovered(false);
                tatvaAiRedirectOrDrawer();
              }}
            >
              <img src={getIcon("tatva_ai", tatvaHovered, false)} alt="tatva_ai" />
              <div
                className={`mt-1 px-2 ${tatvaHovered ? "hoveredColor" : ""}`}
                style={{ fontSize: "12px", fontWeight: "500" }}
              >
                Ask Tatva
              </div>
            </div>
          </NavLink>

          {profile &&
            profile?.module_data
              ?.filter(
                (item) =>
                  item?.type !== "MyT_patient" &&
                  item?.type !== "dis_patient" &&
                  item?.type !== "data_analytics"
              )
              ?.map((item, i) => {
                const isHovered = hoveredItem === i;
                const isRouteActive = isModuleRouteActive(item.type, location);
                // Modules that redirect to external tabs should not stay active
                // These include: IPD, Follow Up (Pharmacy no-access is in-app at /pharmacy)
                const isExternalRedirect = 
                  item.type === S_IPD || 
                  item.type === "ipd" ||
                  item.type === "dr_followup_appointment";
                // Only show active for this specific module when its route is active
                const shouldShowActive = isRouteActive && !isExternalRedirect && !isHovered;
                
                return (
                  <div key={i} className="position-relative">
                    <NavLink
                      to={item.type === S_PHARMACY ? "/pharmacy" : undefined}
                      onClick={(e) => {
                        if (item.type === S_PHARMACY) {
                          handlePharmacyClick(e);
                          return;
                        }
                        e.preventDefault();
                        // For external redirect modules, clear hover state immediately on click
                        if (isExternalRedirect) {
                          setHoveredItem(null);
                        }
                        clickOldModule(item.type);
                      }}
                      replace={true}
                      className={({ isPending }) => {
                        // For external redirect modules, only show active on hover, not on click
                        if (isExternalRedirect) {
                          return isPending ? "pending" : isHovered ? "active" : "";
                        }
                        
                        // Only show active when the route specifically matches this module
                        if (isRouteActive && !isHovered) {
                          return isPending ? "pending" : "active";
                        }
                        
                        // For hover state, don't show active className
                        if (isHovered) {
                          return isPending ? "pending" : "";
                        }
                        
                        // Default: not active
                        return isPending ? "pending" : "";
                      }}
                      onMouseEnter={() => setHoveredItem(i)} // Set the hovered item
                      onMouseLeave={() => setHoveredItem(null)} // Clear the hovered item
                    >
                      <img
                        src={getIcon(item.type, isHovered, shouldShowActive)}
                        alt={`${item.type}`}
                      />
                      <div className="mt-1 px-2">{item.title}</div>
                    </NavLink>
                    {/* {moment(planDetails?.plan_active_date).diff("2025-07-01", 'days') > 0 && */}
                    {tp_monetization_enable &&
                      (item.type === S_PHARMACY ? (
                        !hasPharmacyPaidAccess(planDetails) && (
                          <div className="trial-sidebar">
                            <img src={LockIcon} alt="Locked" />
                          </div>
                        )
                      ) : item.type === S_IPD ? (
                        <div className="trial-sidebar">
                          {EMR_planDetails?.plan_tier === TRIAL &&
                          IPD_planDetails?.plan_tier === TRIAL ? (
                            <span>Trial</span>
                          ) : (
                            EMR_planDetails?.plan_tier !== TRIAL &&
                            IPD_planDetails?.plan_tier === TRIAL && (
                              <img src={LockIcon} alt="Trial" />
                            )
                          )}
                        </div>
                      ) : (
                        item.type === S_OPD_BILLING && (
                          <div className="trial-sidebar">
                            {EMR_planDetails?.plan_tier === TRIAL &&
                            BILLING_planDetails?.plan_tier === TRIAL ? (
                              <span>Trial</span>
                            ) : (
                              EMR_planDetails?.plan_tier !== TRIAL &&
                              BILLING_planDetails?.plan_tier === TRIAL && (
                                <img src={LockIcon} alt="Trial" />
                              )
                            )}
                          </div>
                        )
                      ))}
                  </div>
                );
              })}

          {isNeoEnabled() && (
            <NavLink
              to="/neo-consult"
              replace
              className={({ isActive, isPending }) =>
                (isPending ? "pending" : isActive ? "active" : "")
              }
              onMouseEnter={() => setHoveredItem("neo_consult")}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NeoMicIcon
                size={22}
                color={location.pathname === "/neo-consult" || hoveredItem === "neo_consult" ? "#4b4ad5" : "#6b6b7a"}
              />
              <div className="mt-1 px-2">
                <div>Neo Consult</div>
              </div>
            </NavLink>
          )}

          {isApolloConsultationsEnabled && (
            <NavLink
              to="/apollo-consultations"
              replace={true}
              className={({ isActive, isPending }) => {
                // Apollo analytics should only be active when on its route, not when other external redirects are clicked
                // If we're on "/" or other routes, don't show as active
                if (location.pathname !== "/apollo-consultations") {
                  return isPending ? "pending" : "";
                }
                return isPending ? "pending" : isActive ? "active" : "";
              }}
              onMouseEnter={() => setHoveredItem("apollo")} // Set the hovered item with specific identifier
              onMouseLeave={() => setHoveredItem(null)} // Clear the hovered item
            >
              <img
                src={getIcon(
                  "apollo_analytics",
                  hoveredItem === "apollo",
                  location.pathname === "/apollo-consultations"
                )}
                alt="apollo"
              />
              <div className="mt-1 px-2">
                <div>Apollo analytics</div>
              </div>
            </NavLink>
          )}

          {profile?.ownerDoctor === 1 && (
            <NavLink
              to="/bulk_messages"
              replace={true}
              style={{ marginTop: "8px" }}
              className={({ isActive, isPending }) =>
                isPending ? "pending" : isActive ? "active" : ""
              }
              onMouseEnter={() => setIsMessagesHovered(true)}
              onMouseLeave={() => setIsMessagesHovered(false)}
            >
              <img
                src={
                  location.pathname === "/bulk_messages" || isMessagesHovered
                    ? ni.messageProgrammingPrimary
                    : ni.messageProgramming
                }
                alt="messages"
              />
              <div className="mt-1 px-2">
                {isMobile ? (
                  "Message"
                ) : (
                  <div className="text-truncate">Messages</div>
                )}
              </div>
            </NavLink>
          )}
          {!isLimsAccessableFromGB && (
            <div className="position-relative">
              <NavLink
                to="/lims"
                replace={true}
                className={({ isActive, isPending }) =>
                  isPending
                    ? "pending"
                    : isActive || location.pathname.startsWith("/lims")
                      ? "active"
                      : ""
                }
                onMouseEnter={() => setHoveredItem("lims")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.5 2v6.4L4.7 18.2A2 2 0 006.5 21h11a2 2 0 001.8-2.8L14.5 8.4V2"
                    stroke={
                      location.pathname.startsWith("/lims") || hoveredItem === "lims"
                        ? "#4b4ad5"
                        : "#6b6b7a"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 2h6M7.5 15h9"
                    stroke={
                      location.pathname.startsWith("/lims") || hoveredItem === "lims"
                        ? "#4b4ad5"
                        : "#6b6b7a"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="mt-1 px-2">LIMS</div>
              </NavLink>
              <div className="trial-sidebar">
                <img src={LockIcon} alt="Locked" />
              </div>
            </div>
          )}
          </>
          )}
        {/* </div> */}

        {loading && <FullPageLoader />}
        
      </div>

      <Drawer
        closeIcon={false}
        placement="right"
        open={askTatvaKnowMoreDrawer}
        onClose={handleAskTatvaKnowMore}
        className=".modalWidth-800"
        width={600}
      >
        <AskTatvaKnowMore
          handleAskTatvaKnowMore={handleAskTatvaKnowMore}
          onRedirect={checkTatvaAiPurchased}
        />
      </Drawer>

      <Drawer
        closeIcon={false}
        placement="right"
        open={iPDKnowMoreDrawer}
        onClose={handleIPDKnowMore}
        className=".modalWidth-800"
        width={600}
      >
        <IPDKnowMore
          handleIPDKnowMore={handleIPDKnowMore}
          onRedirect={() => check_SSO(subModalData?.service_name)}
        />
      </Drawer>

      <ExpiredSubModal
        title={
          subModalData &&
          subModalData?.hasOwnProperty("service_name") &&
          subModalData?.service_name
        }
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />

      <PharmacySetupDetailsModal
        open={pharmacySetupOpen}
        onClose={() => setPharmacySetupOpen(false)}
        onSubmit={handlePharmacyLaunch}
        submitting={loading}
        missingFields={pharmacyMissingFields}
        defaultName={getClinicName(profile?.hospital_data)}
      />
    </>
  );
}

export default React.memo(SidebarDoctor);
