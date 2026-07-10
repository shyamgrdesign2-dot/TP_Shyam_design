import React, { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "antd";
import {
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  trackEvent,
} from "../../utils/utils";
import styles from "./LimsNoAccessPage.module.css";

export default function LimsNoAccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReceptionist = searchParams.has("receptionist");
  const { profile } = useSelector((state) => state.doctors);
  const [submitted, setSubmitted] = useState(false);

  const handleRequestAccess = useCallback(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();

    trackEvent("TP_LIMS_RequestAccess", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_name,
      former_page: "lims",
      feature: "lims",
      ...deviceSdkData,
    });

    setSubmitted(true);
  }, [profile]);

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
              disabled={submitted}
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
