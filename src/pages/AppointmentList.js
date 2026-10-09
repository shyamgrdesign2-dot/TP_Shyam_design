import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Welcome from "../common/Welcome";
import Appointment from "../components/AppointmentData";
import AppointmentDashboardMobile from "./mobile/AppointmentDashboard/AppointmentDashboard.js";
import AddNewPatient from "./AddNewPatient";
import EditNewPatient from "./EditNewPatient";
import WalkInConsultation from "./WalkInConsultation";
import MobileWalkInConsultation from "./mobile/WalkInConsultation/WalkInConsultation";
import MobileWalkInConsultationZydus from "./mobile/WalkInConsultationZydus/WalkInConsultationZydus";
import MessagesData from "./MessagesData";
import { useDeviceType } from "../utils/deviceDetection";
import { isReceptionistSession } from "../utils/receptionistSession";

import { useSelector, useDispatch } from "react-redux";
import WalkInConsultationZydus from "./WalkInConsultationZydus";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN, GB_CVT_EXT_HOS, APPOINTMENT_LISTING_V2_ENABLED } from "../utils/constants";
import { jwtDecode } from "jwt-decode";
import { setUserId } from "../redux/doctorsSlice";
import ExtendTrialModal from "./monetization/components/ExtendTrialModal";
import { getClinicName, getTokenData, trackEvent } from "../utils/utils";
import DocumentVerificationPopup from "../components/common/DocumentVerificationPopup";
import config from "../config";
import { getDecodedToken } from "../utils/localStorage";
import { fetchAgents } from "./appointmentAgent/service";
import VoiceRxPromoModal from "../components/VoiceRxPromoModal";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import NeoConsultationProvider from "../components/neo/NeoConsultationProvider";
import NeoConsultPage from "./neoConsult/NeoConsultPage";
import NeoGlobalCleanup from "../components/neo/NeoGlobalCleanup";
import { isNeoEnabled, isNeoSapienRoute } from "../utils/neoConsultationUtils";
import { isMissionAnalyticsOnlyUser } from "./data-analytics/data/analyticsAccess";
import { lazyRetry } from "../utils/lazyRetry";
import FullPageLoader from "./vaccination/components/Loader";

const MissionAnalyticsPage = lazy(() =>
  lazyRetry(() => import("./mission-analytics"))
);

function EmbeddedMissionAnalytics() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <MissionAnalyticsPage embedded />
    </Suspense>
  );
}

const AppointmentListingPage = lazy(() =>
  lazyRetry(() => import("./appointment-listing"))
);

function EmbeddedAppointmentListing() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <AppointmentListingPage />
    </Suspense>
  );
}

function AppointmentList() {
  const dispatch = useDispatch();
  let location = useLocation();
  const [locationPath, setLocationPath] = useState("/");
  const { profile } = useSelector((state) => state.doctors);
  // Match App.js: URL ?receptionist OR tab sessionStorage (query can drop
  // on internal navigations without ending the receptionist session).
  const isReceptionist = isReceptionistSession(location.search);
  const {hospital_business_id} = getTokenData() || {};
  const isZydus = hospital_business_id === config.ZYDUS_BUSINESS_ID;
  const isApollo = config.APOLLO_BUSINESS_IDS.includes(hospital_business_id);
  const [agentsData, setAgentsData] = useState(null);
  const { isMobile: isMobileDevice, isTablet } = useDeviceType();
  const shouldShowMobileDashboard = isMobileDevice && !isTablet && !isReceptionist;
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const analyticsOnlyHome = isMissionAnalyticsOnlyUser(getDecodedToken()?.result);

  
  useEffect(() => {
    setLocationPath(location.pathname);
  }, [location]);

  useEffect(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_Appointment_Page_Landing", {
      clinic_name,
    });
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    try {
      const decoded = jwtDecode(token);
      if (decoded?.result?.user_id) {
        dispatch(setUserId(decoded.result));
      }
    } catch (e) {
      console.error("Error while token decoding: ", e);
    }
  }, []);

  // APPOINTMENT_LISTING_V2_ENABLED in constants.js is the deploy kill switch
  // (no GrowthBook). Flip to false to keep legacy AppointmentData on `/`.
  const useNewAppointmentListing =
    APPOINTMENT_LISTING_V2_ENABLED &&
    !shouldShowMobileDashboard &&
    !analyticsOnlyHome &&
    !isReceptionist;

  const fetchAgentsData = async () => {
    if (!isReceptionist) {
      try {
        const decodedToken = getDecodedToken();
        const clinicId = String(decodedToken?.result?.clinic_id);
        const response = await fetchAgents(clinicId);
        if (response) {
          setAgentsData(response.length > 0 && response[response.length - 1]);
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    }
  };

  useEffect(() => {
    // New listing: Header's useAiReceptionist owns the CTA + fetch (Welcome
    // is hidden). Legacy / receptionist / mobile still need agents for
    // AppointmentData + MessagesData.
    if (!isReceptionist && !useNewAppointmentListing) {
      fetchAgentsData();
    }
  }, []);

  const hideWelcomeForMissionAnalytics =
    locationPath === "/mission-analytics" ||
    (analyticsOnlyHome && (locationPath === "/" || locationPath === ""));

  const hideWelcomeForNewAppointmentListing =
    useNewAppointmentListing && (locationPath === "/" || locationPath === "");

  const content = (
    <>
      {/* Chrome comes from MainShellV1 now: Header, sidebar and the content
          wrapper live there, so this page renders only its own content.
          Mobile dashboards and receptionist views skip that shell, so they
          keep the wrapper that sizes them. */}
      {shouldShowMobileDashboard || isReceptionist ? (
        <div
          className={`w-100 bg-body ${
            shouldShowMobileDashboard && locationPath === "/"
              ? ""
              : shouldShowMobileDashboard && locationPath != "/" && locationPath != "/bulk_messages"
                ? "vh-100"
                : "wrapper"
          }`}
        >
      {!shouldShowMobileDashboard && !isReceptionist && !hideWelcomeForMissionAnalytics && !hideWelcomeForNewAppointmentListing && (
        <Welcome
          locationPath={locationPath}
          appointmentAgentsData={agentsData}
          backVisible={locationPath == "/" || locationPath == "/bulk_messages" ? false : true}
        />
      )}
      <Routes>
        <Route 
          path="/" 
          element={
            shouldShowMobileDashboard ? (
              <AppointmentDashboardMobile />
            ) : analyticsOnlyHome ? (
              <EmbeddedMissionAnalytics />
            ) : useNewAppointmentListing ? (
              <EmbeddedAppointmentListing />
            ) : (
              <Appointment locationPath={locationPath} appointmentAgentsData={agentsData} />
            )
          } 
        />
        <Route path="mission-analytics" element={<EmbeddedMissionAnalytics />} />
        <Route 
          path="walk_in_consultation" 
          element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultation /> : <WalkInConsultation />} 
        />
        <Route 
          path="walk_in_consultation_zydus" 
          element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultationZydus /> : <WalkInConsultationZydus />} 
        />
        <Route path="add_patient" element={<AddNewPatient />} />
        <Route path="edit_patient" element={<EditNewPatient />} />
        <Route path="bulk_messages" element={<MessagesData appointmentAgentsData={agentsData} />} />
        {isNeoEnabled() && (
          <Route path="neo-consult" element={<NeoConsultPage />} />
        )}
      </Routes>
      {(!isZydus && !isApollo && !isCvtExtHosAccessableFromGB && !isNeoSapienRoute(locationPath)) && (
        <DocumentVerificationPopup />
      )}
      <VoiceRxPromoModal />
        </div>
      ) : (
        <>
      {!shouldShowMobileDashboard && !isReceptionist && !hideWelcomeForMissionAnalytics && !hideWelcomeForNewAppointmentListing && (
        <Welcome
          locationPath={locationPath}
          appointmentAgentsData={agentsData}
          backVisible={locationPath == "/" || locationPath == "/bulk_messages" ? false : true}
        />
      )}
      <Routes>
        <Route 
          path="/" 
          element={
            shouldShowMobileDashboard ? (
              <AppointmentDashboardMobile />
            ) : analyticsOnlyHome ? (
              <EmbeddedMissionAnalytics />
            ) : useNewAppointmentListing ? (
              <EmbeddedAppointmentListing />
            ) : (
              <Appointment locationPath={locationPath} appointmentAgentsData={agentsData} />
            )
          } 
        />
        <Route path="mission-analytics" element={<EmbeddedMissionAnalytics />} />
        <Route 
          path="walk_in_consultation" 
          element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultation /> : <WalkInConsultation />} 
        />
        <Route 
          path="walk_in_consultation_zydus" 
          element={(isMobileDevice && !isTablet) ? <MobileWalkInConsultationZydus /> : <WalkInConsultationZydus />} 
        />
        <Route path="add_patient" element={<AddNewPatient />} />
        <Route path="edit_patient" element={<EditNewPatient />} />
        <Route path="bulk_messages" element={<MessagesData appointmentAgentsData={agentsData} />} />
        {isNeoEnabled() && (
          <Route path="neo-consult" element={<NeoConsultPage />} />
        )}
      </Routes>
      {(!isZydus && !isApollo && !isCvtExtHosAccessableFromGB && !isNeoSapienRoute(locationPath)) && (
        <DocumentVerificationPopup />
      )}
      <VoiceRxPromoModal />
        </>
      )}

      {/* <ExtendTrialModal /> */}
    </>
  );

  if (isNeoEnabled()) {
    return (
      <NeoConsultationProvider>
        <NeoGlobalCleanup />
        {content}
      </NeoConsultationProvider>
    );
  }

  return content;
}

export default AppointmentList;
