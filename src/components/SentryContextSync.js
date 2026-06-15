import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDecodedToken } from "../utils/localStorage";
import {
  applySentryPatientContext,
  applySentryUserContext,
} from "../utils/sentryContext";

const SentryContextSync = () => {
  const location = useLocation();
  const { profile, userId } = useSelector((state) => state.doctors);
  const patientData = location.state?.patient_data;

  const tokenData = useMemo(() => getDecodedToken()?.result, [location.key]);

  useEffect(() => {
    applySentryUserContext({ profile, tokenData, userId });
  }, [profile, tokenData, userId]);

  useEffect(() => {
    applySentryPatientContext(patientData);
  }, [patientData]);

  return null;
};

export default SentryContextSync;
