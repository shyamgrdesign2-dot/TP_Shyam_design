import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { fetchAgents } from "../pages/appointmentAgent/service";
import { getDecodedToken } from "../utils/localStorage";
import { GB_APPOINTMENT_AGENT, GB_CVT_EXT_HOS } from "../utils/constants";
import {
  getClinic,
  getTokenData,
  shouldAppointmentAgentDisabled,
} from "../utils/utils";

/* Module cache so Header remounts (many routes) share one fetchAgents call. */
const agentsByClinic = new Map();

function loadAgentsForClinic(clinicId) {
  const existing = agentsByClinic.get(clinicId);
  if (existing?.result !== undefined) {
    return Promise.resolve(existing.result);
  }
  if (existing?.promise) {
    return existing.promise;
  }

  const entry = { promise: null, result: undefined };
  entry.promise = fetchAgents(clinicId)
    .then((response) => {
      const data =
        Array.isArray(response) && response.length > 0
          ? response[response.length - 1]
          : null;
      entry.result = data;
      entry.promise = null;
      return data;
    })
    .catch((error) => {
      entry.result = null;
      entry.promise = null;
      throw error;
    });
  agentsByClinic.set(clinicId, entry);
  return entry.promise;
}

export function useAiReceptionist() {
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const isAppointmentAgentFromGB = useFeatureIsOn(GB_APPOINTMENT_AGENT);

  const [agentsData, setAgentsData] = useState(null);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);

  const decodedToken = getDecodedToken();
  const userId = decodedToken?.result?.user_id;
  const isAdmin = decodedToken?.result?.admin;
  const clinicId = String(decodedToken?.result?.clinic_id ?? "");

  const isAppointmentAgentEnable =
    isAppointmentAgentFromGB ||
    (planDetails?.currentPlanStatus === "PAID" &&
      !shouldAppointmentAgentDisabled());

  const isUserInAgentsData =
    agentsData?.doctors?.some((doctor) => doctor.um_id === userId) ?? false;

  useEffect(() => {
    if (!isAppointmentAgentEnable || isCvtExtHosAccessableFromGB || !clinicId) {
      setIsAgentsLoading(false);
      setAgentsData(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsAgentsLoading(true);
      try {
        const data = await loadAgentsForClinic(clinicId);
        if (cancelled) return;
        setAgentsData(data);
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
    isEnabled: isAppointmentAgentEnable && !isCvtExtHosAccessableFromGB,
    isLoading: isAgentsLoading,
    hasAgent: !!agentsData,
    menuLabel: agentsData ? "Your AI Receptionist" : "Setup AI Receptionist",
    openAiReceptionist,
  };
}
