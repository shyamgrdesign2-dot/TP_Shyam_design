import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { jwtDecode } from "jwt-decode";
import { isChrome, isSafari, isMobile, isTablet } from "react-device-detect";
import { useReactToPrint } from "react-to-print";
import axios from "axios";
import jsQR from "jsqr";
import moment from "moment";

import config from "../../config";
import { ASSETS } from "../../assets";
import { env } from "../../EnvironmentConfig";
import ApiAbha from "../../api/services/ApiAbha";
import { createAbhaPrintHandlerConfig, createAbhaDownloadHandler } from "../../common/abhaQrHelper";
import { useQrPrintDownloadHandlers } from "../../common/qrPrintDownloadHelper";
import { useLocalStorage, clearLocalStorage, getDecodedToken } from "../../utils/localStorage";
import {
  TRIAL,
  GB_ZYDUS_USER,
  OPD_API_KEY,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  S_TATVA_PRACTICE,
  PERSISTANT_STORAGE_KEY_BILL_TOKEN,
  FROM_NATIVE_APP,
  GB_CVT_EXT_HOS,
} from "../../utils/constants";
import {
  errorMessage,
  getClinicName,
  shouldMonetizationDisabled,
  getTokenData,
  getDeviceSdkData,
  sendMessageToParent,
} from "../../utils/utils";
import { EVENTS } from "../../utils/events";
import { useIsDentalEnabled } from "../../hooks/useIsDentalEnabled";
import { verifyAndAddDentalModule, verifyAndAddDentalPrintOptions } from "../../utils/dentalModuleUtils";
import {
  getProfile,
  changeHospital,
  customizedPad,
  swtichLayout,
  navigatetoTatvaPedia,
  changeLogoStatus,
  showMedicineTime,
  showMedicineFrequency,
  getMedicineType,
  getDefaultPrintsettings,
  listVideo,
  zydusRefIds,
  campaigns,
  clearDoctorProfile,
} from "../../redux/doctorsSlice";
import { clearTeleconsultNotification } from "../../redux/teleconsultNotificationSlice";
import { viewDoctorWebsite } from "../../redux/doctorWebsiteSlice";
import { generateBillToken } from "../opdBilling/service";
import { useOpdBilling } from "../opdBilling/useOpdBilling";
import { useAiReceptionist } from "../../hooks/useAiReceptionist";

const CUSTOMIZED_PAD_SENDDATA = { data: { default: false, reset: true } };

/**
 * Every piece of behaviour behind the homepage top bar.
 *
 * This is the header's half of the parallel-shell split that `useMainSidebarNav`
 * already does for the rail: `src/common/Header.js` stays exactly where it is and
 * keeps working, and this hook carries the same profile, clinic, tutorial, plan,
 * SSO, QR and logout logic so `MainHeaderV1` can be pure composition.
 *
 * Nothing here is new behaviour. Endpoints, payloads, MoEngage event names and
 * the order of every await are the ones the live header already fires.
 */
export default function useMainHeaderV1({ locationPath } = {}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isOpdPlansAccessableFromGB = useFeatureIsOn("opd-plans");
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isAbhaQRAccessableFromGB = useFeatureIsOn("abha-qr");
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isDentalEnabled = useIsDentalEnabled();
  const { isOpdBillingAccessable } = useOpdBilling();
  const {
    canShow: canShowAiReceptionist,
    menuLabel: aiReceptionistLabel,
    openAiReceptionist,
  } = useAiReceptionist();
  const tp_monetization_enable = !shouldMonetizationDisabled();

  const decodedToken = getDecodedToken();
  const apiUrl = env.opd_encryption_url;
  const opdVisitUrl = env.opd_visit_url;

  const { profile, loading, videoList, hasLocation, defaultPrintSettings } = useSelector(
    (state) => state.doctors
  );
  const { planDetails } = useSelector((state) => state.subscription);

  const [getToken, setToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const [, setBillToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_BILL_TOKEN);
  const [getFromNative] = useLocalStorage(FROM_NATIVE_APP);

  const [clinicOptions, setClinicOptions] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [popOver, setPopOver] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoDrawer, setvideoDrawer] = useState(false);
  const [videoLink, setVideoLink] = useState(null);

  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchCheckbox, setSwitchCheckbox] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoCheckbox, setLogoCheckbox] = useState(false);
  const [logoConfirmCheckbox, setLogoConfirmCheckbox] = useState(false);

  const [isQRCodeVisible, setQRCodeVisible] = useState(false);
  const [opdPlansUrl, setOpdPlansUrl] = useState(null);
  const [isAbhaQRCodeVisible, setAbhaQRCodeVisible] = useState(false);
  const [abhaQRCodeData, setAbhaQRCodeData] = useState(null);
  const [isLoadingAbhaQR, setIsLoadingAbhaQR] = useState(false);

  const [aiModal, setAiModal] = useState(false);
  const [medEcoKnowMoreDrawer, setMedEcoKnowMoreDrawer] = useState(false);

  const printRef = useRef();
  const abhaQRCodeRef = useRef();
  const moengageUserIdRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  useEffect(() => {
    if (!isReceptionist) {
      dispatch(getProfile());
      dispatch(customizedPad(CUSTOMIZED_PAD_SENDDATA)).then(() => {
        const userId = decodedToken?.result?.user_id;
        if (userId) {
          dispatch(verifyAndAddDentalModule(userId, isDentalEnabled));
        }
      });
      dispatch(showMedicineTime());
      dispatch(showMedicineFrequency());
      dispatch(getMedicineType());
      dispatch(getDefaultPrintsettings({ default: false }));
      dispatch(listVideo());
    }

    const claims = decodedToken?.result;
    if (claims?.hospital_business_id == env.zydus_business_id && isZydusUserAccessableFromGB) {
      dispatch(zydusRefIds());
    }
  }, [isZydusUserAccessableFromGB]);

  useEffect(() => {
    if (!isReceptionist && isDentalEnabled && defaultPrintSettings?.prescription) {
      dispatch(verifyAndAddDentalPrintOptions(isDentalEnabled));
    }
  }, [isReceptionist, isDentalEnabled, defaultPrintSettings, dispatch]);

  useEffect(() => {
    if (profile && hasLocation === false && !isReceptionist) {
      const clinicDetails = profile?.hospital_data?.find((e) => e.hm_id == tokenData?.clinic_id);
      navigate("/final-setup?noLocation=true", { replace: true, state: { clinicDetails } });
    }
  }, [hasLocation, navigate, isReceptionist, profile]);

  useEffect(() => {
    dispatch(campaigns());
  }, []);

  useEffect(() => {
    if (!profile) return;

    const moengageUserId = profile?.b2c || profile?.doctor_unique_id || profile?.user_id;
    const normalizedMoengageUserId = moengageUserId ? String(moengageUserId) : "";
    if (normalizedMoengageUserId && moengageUserIdRef.current !== normalizedMoengageUserId) {
      moengageUserIdRef.current = normalizedMoengageUserId;
      Promise.resolve(window.Moengage?.add_unique_user_id?.(normalizedMoengageUserId))
        .then(() => {
          window.Moengage?.add_user_attribute?.("doctor_unique_id", profile?.doctor_unique_id || "");
          window.Moengage?.add_user_attribute?.("b2c", profile?.b2c || "");
          window.Moengage?.add_user_attribute?.("doctor_name", profile?.um_name || "");
          window.Moengage?.add_user_attribute?.("user_id", profile?.user_id || "");
          if (profile?.um_name) {
            window.Moengage?.add_first_name?.(profile.um_name);
            window.Moengage?.add_user_name?.(profile.um_name);
          }
          if (profile?.um_contact) {
            window.Moengage?.add_mobile?.(`+91${profile.um_contact}`);
          }
          if (profile?.um_email) {
            window.Moengage?.add_email?.(profile.um_email);
          }
        })
        .catch(() => {
          moengageUserIdRef.current = null;
        });
    }

    setPopOver(profile.NavigatetoTatvaPedia == 0 ? true : false);
    setClinicOptions(
      profile.hospital_data?.map((e) => ({ value: e.hm_id, label: e.hm_name }))
    );
  }, [profile]);

  useEffect(() => {
    if (!(clinicOptions?.length > 0)) return;

    const getStorageData = async () => {
      const token = await getToken();
      if (token === undefined) return;
      try {
        const decoded = jwtDecode(token);
        setTokenData(decoded.result);
        const index = clinicOptions.findIndex((e) => e.value == decoded.result.clinic_id);
        index !== -1 ? setSelectedHospital(parseInt(decoded.result.clinic_id)) : setSelectedHospital(null);
      } catch (e) {
        console.log(e);
      }
    };
    getStorageData();
  }, [clinicOptions]);

  /* Clinic switch — same token swap, bill-token mint and reload as the live header. */
  const onClinicChange = useCallback(
    async (value) => {
      const action = await dispatch(changeHospital({ clinic_id: value }));
      if (action.meta.requestStatus !== "fulfilled") return;

      await setToken(action.payload.token);
      try {
        const decoded = jwtDecode(action.payload.token);
        setTokenData(decoded.result);
        const billToken = await generateBillToken();
        setBillToken(billToken);
      } catch (e) {
        console.log(e);
      }

      if (locationPath == "/") {
        if (!isChrome && !isSafari) {
          navigate("/?authToken=" + action.payload.token, { replace: true });
          navigate(0, { replace: true });
        } else {
          navigate("/", { replace: true });
          navigate(0, { replace: true });
        }
      } else {
        navigate(0, { replace: true });
      }
    },
    [dispatch, locationPath, navigate, setBillToken, setToken]
  );

  const showHideLogoModal = useCallback(() => {
    setIsLogoModalOpen((prev) => !prev);
  }, []);

  const handleRedirectToOffering = useCallback(() => {
    navigate("/our-offerings?from=home");
  }, [navigate]);

  const showHideSwitchModal = useCallback(() => {
    setIsSwitchModalOpen((prev) => !prev);
  }, []);

  const onSwitchChange = useCallback((e) => {
    setSwitchCheckbox(e.target.checked);
  }, []);

  const SSO_TO_PM = useCallback(
    async (flag) => {
      try {
        const sendData = { doctor_unique_id: tokenData.doctor_unique_id };
        let URL;

        if (flag === 1) {
          sendData["mobile_no"] = tokenData.mobile_no;
          sendData["clinic_id"] = tokenData.clinic_id;
          sendData["hm_business_id"] = tokenData.hospital_business_id;
          sendData["from"] = "app";
          URL = config.sso_to_pm_url;
        } else if (flag === 2) {
          sendData["hospital_business_id"] = tokenData.hospital_business_id;
          URL = config.sso_to_pm_admin_url;
        }

        const formData = new FormData();
        Object.keys(sendData).forEach((key) => {
          formData.append(key, sendData[key]);
        });

        const response = await axios.post(URL, formData, {
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
    },
    [tokenData]
  );

  const onSwitchLayoutClick = useCallback(
    async (flag) => {
      const action = await dispatch(swtichLayout({ from: "app", dont_show: flag }));
      if (action.meta.requestStatus !== "fulfilled") {
        errorMessage(action.error);
        return;
      }

      flag == 0 && showHideSwitchModal();

      if (getFromNative() && getFromNative() === "true") {
        SSO_TO_PM(1).then(async (data) => {
          if (data.success == 200) {
            navigate("/", { replace: true });
            clearLocalStorage();
            await window.open(data.url, "_self");
          }
        });
      } else if (!isChrome && !isSafari) {
        setTimeout(() => {
          sendMessageToParent(EVENTS.REDIRECT, { url: "/?switch_layout=old" });
        }, 500);
      } else {
        SSO_TO_PM(1).then(async (data) => {
          if (data.success == 200) {
            navigate("/", { replace: true });
            clearLocalStorage();
            await window.open(data.url, "_self");
          }
        });
      }
    },
    [SSO_TO_PM, dispatch, getFromNative, navigate, showHideSwitchModal]
  );

  /* Doctors who ticked "don't show this again" skip the confirm and switch straight away. */
  const checkModalOpenOrClose = useCallback(() => {
    if (profile && profile.switchtoOld != 0) {
      onSwitchLayoutClick(1);
    } else {
      showHideSwitchModal();
    }
    window.Moengage.track_event("TP_Flow_changed", {
      clinic_name: getClinicName(profile?.hospital_data),
    });
  }, [onSwitchLayoutClick, profile, showHideSwitchModal]);

  const showHideNavigateToTatvaPedia = useCallback(() => {
    setPopOver((prev) => !prev);
  }, []);

  const onLogoChange = useCallback((e) => {
    setLogoCheckbox(e.target.checked);
  }, []);

  const onLogoClick = useCallback(async () => {
    const action = await dispatch(navigatetoTatvaPedia());
    if (action.meta.requestStatus === "fulfilled") {
      await dispatch(changeLogoStatus());
      showHideNavigateToTatvaPedia();
    } else {
      errorMessage(action.error);
    }
  }, [dispatch, showHideNavigateToTatvaPedia]);

  const onLogoConfirmChange = useCallback((checked) => {
    setLogoConfirmCheckbox(checked);
  }, []);

  const onBrandClick = useCallback(() => {
    if (isCvtExtHosAccessableFromGB) return;
    window.Moengage.track_event("TP_Tatvapedia_clicked");
    try {
      if (localStorage.getItem("tp_logo_confirm_skip") === "1") {
        handleRedirectToOffering();
        return;
      }
    } catch (_) {}
    showHideLogoModal();
  }, [isCvtExtHosAccessableFromGB, handleRedirectToOffering, showHideLogoModal]);

  const handleDrawervideo = useCallback(() => {
    window.Moengage.track_event("video_library_button_clicked");
    setvideoDrawer((prev) => !prev);
  }, []);

  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo((prev) => !prev);
  }, []);

  const trackTutorialViewed = useCallback(
    (tutorialType) => {
      window.Moengage.track_event("TP_Tutorial_Viewed", {
        clinic_name: getClinicName(profile?.hospital_data),
        tutorial_type: tutorialType,
      });
    },
    [profile]
  );

  const setUpWebsiteUrl = useCallback(
    async (flag) => {
      const action = await dispatch(viewDoctorWebsite());
      if (action.meta.requestStatus === "fulfilled") {
        flag === 1
          ? navigate("/doctor_profile", { state: { websiteData: { ...action.payload } } })
          : navigate("/doctor_website_setting", { state: { websiteData: { ...action.payload } } });
      } else {
        errorMessage(action.error);
      }
    },
    [dispatch, navigate]
  );

  const accountSettings = useCallback(async () => {
    SSO_TO_PM(2).then(async (data) => {
      if (data.success != 200) return;
      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.REDIRECT, { url: data?.url });
        navigate(0, { replace: true });
      } else {
        await window.open(data.url);
      }
    });
  }, [SSO_TO_PM, navigate]);

  const myAvailability = useCallback(async () => {
    SSO_TO_PM(1).then(async (data) => {
      if (data.success != 200) return;
      if (!isChrome && !isSafari) {
        sendMessageToParent(EVENTS.REDIRECT, { url: data?.url, module: "my_availability" });
      } else {
        await window.open(`${data.url}&module=my_availability`);
      }
    });
  }, [SSO_TO_PM]);

  const handleShowQRCode = useCallback(() => {
    setQRCodeVisible(true);
  }, []);

  const showHideBackModal = useCallback(() => {
    setQRCodeVisible(false);
  }, []);

  const opdEncryptionApiCall = useCallback(
    async (data) => {
      const headers = {
        "api-key": OPD_API_KEY,
        tatvapractice: "true",
        "Content-Type": "application/json",
      };
      try {
        const response = await axios.post(apiUrl, data, { headers });
        return response.data;
      } catch (error) {
        console.error("Error:", error);
      }
    },
    [apiUrl]
  );

  const clickOpdPlans = useCallback(async () => {
    const encryptedCata = await opdEncryptionApiCall({
      d_id: decodedToken?.result?.doctor_unique_id,
      clinic_Id: decodedToken?.result?.clinic_id,
    });
    setOpdPlansUrl(`${opdVisitUrl}/tatva-care?p_id=${encryptedCata}`);
  }, [decodedToken, opdEncryptionApiCall, opdVisitUrl]);

  useEffect(() => {
    if (isQRCodeVisible && !opdPlansUrl) {
      clickOpdPlans();
    }
  }, [isQRCodeVisible]);

  const decodeQRFromImage = useCallback(async (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          resolve(code.data);
        } else {
          reject(new Error("Failed to decode QR code"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64Image;
    });
  }, []);

  const fetchAbhaQRCode = useCallback(async () => {
    setIsLoadingAbhaQR(true);
    try {
      const response = await ApiAbha.getPHRQrScannerData();
      const qrCodeData = response.data || response;

      if (!qrCodeData?.qrCode) {
        errorMessage("Failed to fetch ABHA QR Code: Invalid response");
        return;
      }

      const base64Image = `data:image/png;base64,${qrCodeData.qrCode}`;
      try {
        const decodedQRValue = await decodeQRFromImage(base64Image);
        setAbhaQRCodeData({
          qrValue: decodedQRValue,
          abhaNumber: profile?.um_contact || "N/A",
          clinicName: getClinicName(profile?.hospital_data) || "Clinic",
        });
        setAbhaQRCodeVisible(true);
      } catch (decodeError) {
        console.error("Error decoding QR code:", decodeError);
        errorMessage("Failed to decode QR code. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching ABHA QR Code:", error);
      if (error.code === "ERR_NETWORK" || error.message?.includes("CORS")) {
        errorMessage("CORS error: Please check if the API endpoint allows cross-origin requests.");
      } else {
        errorMessage(
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            "Failed to fetch ABHA QR Code. Please try again."
        );
      }
      setAbhaQRCodeVisible(false);
    } finally {
      setIsLoadingAbhaQR(false);
    }
  }, [decodeQRFromImage, profile]);

  const handleShowAbhaQRCode = useCallback(async () => {
    if (!abhaQRCodeData) {
      await fetchAbhaQRCode();
    } else {
      setAbhaQRCodeVisible(true);
    }
  }, [abhaQRCodeData, fetchAbhaQRCode]);

  const handleCloseAbhaQRCode = useCallback(() => {
    setAbhaQRCodeVisible(false);
  }, []);

  const handlePrintAbhaQRCode = useReactToPrint(createAbhaPrintHandlerConfig(abhaQRCodeRef));

  const handleDownloadAbhaQRCode = createAbhaDownloadHandler({
    contentRef: abhaQRCodeRef,
    abhaCenterLogo: ASSETS.images.abhaSvg,
    profile,
    errorMessage,
  });

  const { handlePrint, handleDownload } = useQrPrintDownloadHandlers({
    printRef,
    fileName: "OPD-Plans",
  });

  const openUrlsSilently = useCallback(async (urls) => {
    return Promise.all(
      urls.map((url) => {
        return new Promise((resolve, reject) => {
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          iframe.style.visibility = "hidden";

          // Reject rather than hang if the logout endpoint never answers.
          const timeoutId = setTimeout(() => {
            reject({ url, status: "timeout" });
          }, 5000);

          iframe.onload = () => {
            clearTimeout(timeoutId);
            resolve({ url, status: "success" });
          };

          iframe.onerror = () => {
            clearTimeout(timeoutId);
            reject({ url, status: "error" });
          };

          document.body.appendChild(iframe);

          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 3000);
        });
      })
    );
  }, []);

  const handleLogout = useCallback(async () => {
    const urlsToOpen = [config.pedia_logout_url, config.tatvaAi_logout_url];

    try {
      if (window.isLoggingOut) return;
      window.isLoggingOut = true;

      setIsLoading(true);
      dispatch(clearTeleconsultNotification());

      setTimeout(async () => {
        try {
          const urlStatuses = await openUrlsSilently(urlsToOpen);
          console.log("Logout URL statuses:", urlStatuses);
        } catch (error) {
          console.error("Error opening logout URLs:", error);
        }
      }, 1000);

      // Clearing the profile is what makes the next login re-run getProfile().
      dispatch(clearDoctorProfile());

      localStorage.clear();
      sessionStorage.clear();
      import("../data-analytics/data/doctorList")
        .then((m) => m.clearDoctorListCache())
        .catch(() => {});

      sendMessageToParent(EVENTS.LOGOUT);
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      dispatch(clearDoctorProfile());
      localStorage.clear();
      sessionStorage.clear();
      import("../data-analytics/data/doctorList")
        .then((m) => m.clearDoctorListCache())
        .catch(() => {});

      sendMessageToParent(EVENTS.LOGOUT);
      navigate("/login");
    } finally {
      setIsLoading(false);
      window.isLoggingOut = false;
    }
  }, [dispatch, navigate, openUrlsSilently]);

  const clickBuyNow = useCallback(() => {
    navigate("/get-unlimited-access");
  }, [navigate]);

  const handleUpgradeClick = useCallback(() => {
    window.Moengage.track_event("BuyPlanNow_Click", {
      doctor_id: profile?.doctor_unique_id,
      clinic_name: getClinicName(profile?.hospital_data),
    });
    clickBuyNow();
  }, [clickBuyNow, profile]);

  const handleAiSuite = useCallback(() => {
    setAiModal((prev) => !prev);
    const claims = getTokenData();
    window.Moengage.track_event("TP_Monetization_AISuite", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: claims?.user_id,
      clinic_id: claims?.clinic_id,
      clinic_Name: getClinicName(profile?.hospital_data),
      payment_Status: planDetails?.currentPlanStatus,
      ...getDeviceSdkData(),
    });
  }, [planDetails, profile]);

  const handleMedEcoKnowMore = useCallback(() => {
    setMedEcoKnowMoreDrawer((prev) => !prev);
  }, []);

  const handeProfileDD = useCallback(
    (e) => {
      e.preventDefault();
      const claims = getTokenData();
      window.Moengage.track_event("TP_Profile_Section", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        clinic_id: claims?.clinic_id,
        um_id: claims?.user_id,
        ...getDeviceSdkData(),
      });
    },
    [profile]
  );

  const handleNotificationClick = useCallback(() => {
    window.Moengage.track_event("announcement_button_clicked");
  }, []);

  /*
   * Plan state, read once here so the shell never has to know the shape of
   * `planDetails`. `isPremium` is what puts the gold ring on the avatar.
   */
  const emrPlan = planDetails?.service_mappings?.find((e) => e.service_name === S_TATVA_PRACTICE);
  const isPremium = planDetails?.currentPlanStatus === "PAID";
  const isTrialPlan = emrPlan?.plan_tier === TRIAL;
  const remainingTrialDays = isTrialPlan
    ? moment(planDetails?.plan_expiry_date).diff(moment().format("YYYY-MM-DD"), "days")
    : 0;
  // The trial banner is the one menu row that has no room on a phone.
  const canShowTrialBanner = !(isMobile && !isTablet);

  const showSwitchToOld =
    !!profile &&
    profile.SwitchGrowthBook != 0 &&
    tokenData?.hospital_business_id != env.zydus_business_id &&
    !isZydusUserAccessableFromGB;

  /*
   * How the tutorial control behaves is a function of the route, exactly as it is
   * today: the homepage and bulk messages open the full video drawer, billing has
   * its own category, everything else gets the general list.
   */
  const tutorial = useMemo(() => {
    if (locationPath == "/" || locationPath == "/bulk_messages") {
      return { mode: "drawer", categoryId: null };
    }
    return { mode: "popover", categoryId: locationPath == "/billing-dashboard" ? 16 : 3 };
  }, [locationPath]);

  return {
    // data
    profile,
    planDetails,
    videoList,
    videoLink,
    tokenData,
    clinicOptions,
    selectedHospital,
    tutorial,

    // plan / entitlement
    isPremium,
    isTrialPlan,
    remainingTrialDays,
    canShowTrialBanner,
    showSwitchToOld,
    tp_monetization_enable,
    isOpdPlansAccessableFromGB,
    isAbhaQRAccessableFromGB,
    isCvtExtHosAccessableFromGB,
    isOpdBillingAccessable,

    // transient UI state
    loading,
    isLoading,
    popOver,
    popOverVideo,
    videoDrawer,
    isLogoModalOpen,
    logoCheckbox,
    logoConfirmCheckbox,
    isSwitchModalOpen,
    switchCheckbox,
    isQRCodeVisible,
    opdPlansUrl,
    isAbhaQRCodeVisible,
    abhaQRCodeData,
    isLoadingAbhaQR,
    aiModal,
    medEcoKnowMoreDrawer,

    // refs
    printRef,
    abhaQRCodeRef,

    // handlers
    onClinicChange,
    onBrandClick,
    showHideLogoModal,
    handleRedirectToOffering,
    showHideNavigateToTatvaPedia,
    onLogoChange,
    onLogoConfirmChange,
    onLogoClick,
    showHideSwitchModal,
    onSwitchChange,
    onSwitchLayoutClick,
    checkModalOpenOrClose,
    handleDrawervideo,
    showHideVideoListPopover,
    setVideoLink,
    trackTutorialViewed,
    setUpWebsiteUrl,
    accountSettings,
    myAvailability,
    handleShowQRCode,
    showHideBackModal,
    handlePrint,
    handleDownload,
    handleShowAbhaQRCode,
    handleCloseAbhaQRCode,
    handlePrintAbhaQRCode,
    handleDownloadAbhaQRCode,
    handleLogout,
    clickBuyNow,
    handleUpgradeClick,
    handleAiSuite,
    handleMedEcoKnowMore,
    handeProfileDD,
    handleNotificationClick,
    navigate,

    // AI Receptionist
    canShowAiReceptionist,
    aiReceptionistLabel,
    openAiReceptionist,
  };
}
