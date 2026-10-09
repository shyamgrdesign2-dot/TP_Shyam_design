import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import ApiAppointments from "../api/services/ApiAppointments";
import { PERSISTANT_STORAGE_KEY_BILL_TOKEN } from "../utils/constants";

const clinicSwitchRequests = new Map();

const isAuthTokenPreservePath = (pathname = "") =>
  pathname === "/our-offerings" ||
  pathname === "/abha-standalone" ||
  pathname === "/lims" ||
  pathname.startsWith("/lims/") ||
  pathname === "/pharmacy" ||
  pathname.startsWith("/pharmacy/");

const removeSensitiveUrlParams = (search) => {
  const params = new URLSearchParams(search);
  params.delete("authToken");
  params.delete("clinic_id");
  return params;
};

const getTokenDoctorId = (token) => {
  try {
    const decoded = jwtDecode(token);
    return {
      clinicId: decoded?.result?.clinic_id,
      doctorId:
        decoded?.result?.doctor_unique_id ?? decoded?.result?.user_id ?? null,
    };
  } catch (_) {
    console.warn("[TP Medeco] Failed to decode authToken");
    return { clinicId: null, doctorId: null };
  }
};

const getClinicIdFromToken = (token) => {
  try {
    return jwtDecode(token)?.result?.clinic_id;
  } catch (_) {
    console.warn("[TP Medeco] Failed to decode switched clinic token");
    return null;
  }
};

export const useUrlAuthClinicSwitch = ({
  authToken,
  clinicId,
  mrnNo,
  isReceptionist,
  setToken,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isClinicSwitchPending, setIsClinicSwitchPending] = useState(false);
  const [isUrlAuthReady, setIsUrlAuthReady] = useState(!authToken);
  const clinicSwitchPendingRef = useRef(false);
  const clinicSwitchFailedRef = useRef(false);
  const processedAuthClinicKeyRef = useRef(null);
  const setTokenRef = useRef(setToken);

  useEffect(() => {
    setTokenRef.current = setToken;
  }, [setToken]);

  const redirectHomeAfterClinicSwitchFailure = useCallback(() => {
    const params = removeSensitiveUrlParams(window.location.search);
    params.delete("mrnNo");
    setIsUrlAuthReady(true);
    navigate(
      {
        pathname: "/",
        search: params.toString(),
      },
      { replace: true }
    );
  }, [navigate]);

  useEffect(() => {
    if (!authToken) return;
    const authClinicKey = `${authToken}:${clinicId || ""}`;
    if (processedAuthClinicKeyRef.current === authClinicKey) return;
    processedAuthClinicKeyRef.current = authClinicKey;

    let isEffectActive = true;

    const syncProfileForAuthToken = async () => {
      if (clinicId) {
        clinicSwitchFailedRef.current = false;
        setIsUrlAuthReady(false);
      }

      setTokenRef.current(authToken);
      localStorage.removeItem(PERSISTANT_STORAGE_KEY_BILL_TOKEN);

      if (isReceptionist) return;

      let shouldClearProfile = false;
      const tokenData = getTokenDoctorId(authToken);

      if (
        clinicId &&
        String(tokenData.clinicId ?? "") !== String(clinicId)
      ) {
        clinicSwitchPendingRef.current = true;
        clinicSwitchFailedRef.current = false;
        setIsClinicSwitchPending(true);
      } else if (clinicId) {
        setIsUrlAuthReady(true);
      }

      try {
        const [{ store }, { clearDoctorProfile, getProfile }] =
          await Promise.all([
            import("../redux/store"),
            import("../redux/doctorsSlice"),
          ]);

        if (!isEffectActive) return;

        if (clinicSwitchPendingRef.current) {
          const switchRequestKey = `${authToken}:${clinicId}`;
          if (!clinicSwitchRequests.has(switchRequestKey)) {
            clinicSwitchRequests.set(
              switchRequestKey,
              ApiAppointments.changeHospital({ clinic_id: clinicId })
            );
          }
          const switchResult = await clinicSwitchRequests.get(switchRequestKey);

          if (!isEffectActive) return;

          if (switchResult?.status && switchResult?.token) {
            const switchedClinicId = getClinicIdFromToken(switchResult.token);

            if (String(switchedClinicId ?? "") === String(clinicId)) {
              setTokenRef.current(switchResult.token);
              shouldClearProfile = true;
              setIsUrlAuthReady(true);
            } else {
              clinicSwitchFailedRef.current = true;
              console.warn("[TP Medeco] Clinic switch token mismatch", {
                requestedClinicId: clinicId,
                switchedClinicId,
              });
              redirectHomeAfterClinicSwitchFailure();
              return;
            }
          } else {
            clinicSwitchFailedRef.current = true;
            console.warn(
              "[TP Medeco] Failed to switch clinic for authToken",
              switchResult?.error
            );
            redirectHomeAfterClinicSwitchFailure();
            return;
          }
        }

        const currentProfile = store.getState()?.doctors?.profile;
        const currentDoctorId =
          currentProfile?.doctor_unique_id ?? currentProfile?.user_id ?? null;
        const isSameUser =
          tokenData.doctorId &&
          currentDoctorId &&
          String(tokenData.doctorId) === String(currentDoctorId);

        if (!isSameUser || shouldClearProfile) {
          store.dispatch(clearDoctorProfile());
          store.dispatch(getProfile());
        }

        setIsUrlAuthReady(true);
      } catch (error) {
        console.warn("[TP Medeco] Failed to sync profile for authToken", error);
        setIsUrlAuthReady(true);
      } finally {
        clinicSwitchPendingRef.current = false;
        if (isEffectActive) {
          setIsClinicSwitchPending(false);
        }
      }
    };

    syncProfileForAuthToken();

    return () => {
      isEffectActive = false;
    };
  }, [
    authToken,
    clinicId,
    isReceptionist,
    redirectHomeAfterClinicSwitchFailure,
  ]);

  useEffect(() => {
    if (!authToken || isReceptionist) return;
    if (!isUrlAuthReady) return;
    if (clinicSwitchPendingRef.current || isClinicSwitchPending) return;
    if (clinicSwitchFailedRef.current) return;

    const params = removeSensitiveUrlParams(location.search);
    const mrnNoParam = mrnNo || params.get("mrnNo");
    const afterSearch = params.toString();

    if (location.pathname === "/patient_details" && mrnNoParam) {
      navigate(
        {
          pathname: "/patient_details",
          search: afterSearch,
        },
        { replace: true, state: { mrnNo: mrnNoParam } }
      );
      return;
    }

    if (!isAuthTokenPreservePath(location.pathname)) {
      navigate(
        {
          pathname: "/",
          search: afterSearch,
        },
        { replace: true }
      );
    }
  }, [
    authToken,
    clinicId,
    isUrlAuthReady,
    navigate,
    location.pathname,
    location.search,
    isReceptionist,
    mrnNo,
    isClinicSwitchPending,
  ]);

  return {
    shouldWaitForUrlAuth: authToken && !isReceptionist && !isUrlAuthReady,
  };
};
