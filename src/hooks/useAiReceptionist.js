import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { fetchAgents } from "../pages/appointmentAgent/service";
import { getDecodedToken } from "../utils/localStorage";
import { GB_CVT_EXT_HOS } from "../utils/constants";
import {
  getClinic,
  getTokenData,
  shouldAppointmentAgentDisabled,
} from "../utils/utils";

export function useAiReceptionist() {
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  const [agentsData, setAgentsData] = useState(null);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);

  const decodedToken = getDecodedToken();
  const userId = decodedToken?.result?.user_id;
  const isAdmin = decodedToken?.result?.admin;
  const clinicId = String(decodedToken?.result?.clinic_id ?? "");

  const isAppointmentAgentWhitelistedClinic = clinicId === "368";
  const isAppointmentAgentEnable =
    isAppointmentAgentWhitelistedClinic ||
    (planDetails?.currentPlanStatus === "PAID" &&
      !shouldAppointmentAgentDisabled());

  const isUserInAgentsData =
    agentsData?.doctors?.some((doctor) => doctor.um_id === userId) ?? false;

  useEffect(() => {
    if (!isAppointmentAgentEnable || isCvtExtHosAccessableFromGB) {
      setIsAgentsLoading(false);
      setAgentsData(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsAgentsLoading(true);
      try {
        const response = await fetchAgents(clinicId);
        if (cancelled) return;
        setAgentsData(
          Array.isArray(response) && response.length > 0
            ? response[response.length - 1]
            : null
        );
      } catch (error) {
        console.error("Error fetching agents:", error);
        if (!cancelled) setAgentsData(null);
      } finally {
        if (!cancelled) setIsAgentsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, isAppointmentAgentEnable, isCvtExtHosAccessableFromGB]);

  const canShow =
    !isAgentsLoading &&
    isAppointmentAgentEnable &&
    (isUserInAgentsData || isAdmin) &&
    !isCvtExtHosAccessableFromGB;

  const openAiReceptionist = useCallback(() => {
    const tokenData = getTokenData();
    const clinic = getClinic(profile?.hospital_data);
    if (agentsData) {
      window.Moengage.track_event("TP_AG_YourAIReceptionist", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        um_id: tokenData?.user_id,
        clinic_name: clinic?.hm_name,
        agent: "true",
      });

      navigate("/appointment-agent/success", {
        state: {
          agentsData,
          setupData: {
            clinicId: agentsData.clinicId || profile?.clinicId,
            doctors:
              agentsData.doctors?.map((doctor) => ({
                um_id: doctor.um_id,
                dp_id: doctor.dp_id,
                um_name: doctor.um_name,
                speciality: doctor.speciality || "MBBS",
                slotsAvailable: doctor.slotsAvailable,
              })) || [],
            clinicData: clinic,
            useUploadLogo: agentsData.logo ? true : false,
            logo: agentsData.logo || null,
            clinicName: agentsData.clinicName || clinic?.hm_name,
            avatar: agentsData.avatarDetails || null,
            avatarId: agentsData.avatarId || null,
            googleLocation:
              agentsData.googleLocation?.address?.formatted || null,
            fullgoogleLocation: agentsData.googleLocation || null,
            receptionistName: agentsData.name || "",
            contact: agentsData.contact || "",
            email: agentsData.email || "",
            receptionId: agentsData.receptionId || null,
            appointmentLinkShared: agentsData.appointmentLinkShared || null,
            hospitalBusinessId: decodedToken?.result?.hospital_business_id,
          },
          appointment_booking_link: agentsData.appointmentLinkShared,
        },
      });
    } else {
      window.Moengage.track_event("TP_AG_YourAIReceptionist", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        um_id: tokenData?.user_id,
        clinic_name: clinic?.hm_name,
        agent: "false",
      });
      navigate("/appointment-agent", { state: { agentsData } });
    }
  }, [agentsData, decodedToken?.result?.hospital_business_id, navigate, profile]);

  return {
    canShow,
    menuLabel: agentsData ? "Your AI Receptionist" : "Setup AI Receptionist",
    openAiReceptionist,
  };
}
