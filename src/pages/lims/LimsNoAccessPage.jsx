import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "antd";
import {
  getClinicCity,
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  trackEvent,
} from "../../utils/utils";
import { isReceptionistSession } from "../../utils/receptionistSession";
import styles from "./LimsNoAccessPage.module.css";
import {
  buildFeatureInterestPayload,
  getFeatureInterestStatus,
  submitFeatureInterest,
} from "../monetization/utils/featureInterestService";

export default function LimsNoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isReceptionist = isReceptionistSession(location.search);
  const { profile } = useSelector((state) => state.doctors);
  const [submitted, setSubmitted] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const doctorId = useMemo(() => {
    const built = buildFeatureInterestPayload({
      feature: "lims",
      profile,
      isReceptionist,
      search: location.search,
    });
    return built.doctorId !== "-" ? built.doctorId : "";
  }, [profile, isReceptionist, location.search]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!doctorId) {
        if (!isMounted) return;
        setSubmitted(false);
        setIsStatusLoading(false);
        return;
      }

      setIsStatusLoading(true);
      try {
        const status = await getFeatureInterestStatus({
          feature: "lims",
          doctorId: String(doctorId).trim(),
        });
        if (!isMounted) return;
        setSubmitted(Boolean(status?.submitted));
      } catch (e) {
        console.error("Feature interest status fetch failed", e);
        if (!isMounted) return;
        setSubmitted(false);
      } finally {
        if (!isMounted) return;
        setIsStatusLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  const handleRequestAccess = useCallback(async () => {
    if (submitted || submitting || !doctorId) return;

    const clinic_name = getClinicName(profile?.hospital_data);
    const clinic_city = getClinicCity(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    const urlParams = new URLSearchParams(location.search);

    trackEvent("TP_LIMS_RequestAccess", {
      mobile_no: tokenData?.mobile_no,
      hospital_business_id: tokenData?.hospital_business_id,
      clinic_id: tokenData?.clinic_id,
      clinic_name: isReceptionist
        ? urlParams.get("clinicName") || clinic_name
        : clinic_name,
      center_city: isReceptionist
        ? urlParams.get("centerCity") || clinic_city
        : clinic_city,
      former_page: "lims",
      feature: "lims",
      ...(isReceptionist
        ? {
            receptionist_id: tokenData?.user_id,
            receptionist_name: urlParams.get("receptionistName"),
          }
        : {
            doctor_id: tokenData?.doctor_unique_id || profile?.doctor_unique_id,
            doctor_name: profile?.um_name,
          }),
      ...deviceSdkData,
    });

    setSubmitting(true);
    try {
      const { payload } = buildFeatureInterestPayload({
        feature: "lims",
        profile,
        isReceptionist,
        search: location.search,
      });

      const result = await submitFeatureInterest({ feature: "lims", payload });
      // Backend returns submitted:true for both fresh submit and alreadySubmitted
      if (result?.submitted) setSubmitted(true);
    } catch (e) {
      console.error("Feature interest submit failed", e);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitted,
    submitting,
    doctorId,
    profile,
    isReceptionist,
    location.search,
  ]);

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        {!isReceptionist && (
          <>
            <button type="button" className={styles.backButton} onClick={() => navigate("/")}>
              <i className="icon-right" />
            </button>
            <div className={styles.headerDivider} />
          </>
        )}
        <span className={styles.headerTitle}>LIMS</span>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9.5 2v6.4L4.7 18.2A2 2 0 006.5 21h11a2 2 0 001.8-2.8L14.5 8.4V2"
                stroke="#4b4ad5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 2h6M7.5 15h9"
                stroke="#4b4ad5"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className={styles.title}>You don&apos;t have access to LIMS</h1>
          <p className={styles.description}>
            Laboratory Information Management is not enabled for your account yet.
            If you&apos;re interested, let us know and our team will reach out to help you get started.
          </p>
          <div className={styles.actions}>
            <Button
              type="primary"
              className="btn btn-primary3 btn-41 px-4"
              onClick={handleRequestAccess}
              disabled={submitted || isStatusLoading || submitting || !doctorId}
            >
              {submitted ? "Interest submitted" : "I'm interested"}
            </Button>
            {!isReceptionist && (
              <Button type="link" onClick={() => navigate("/")}>
                Go back
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
