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
import VideoModal from "../../common/VideoModal";
import { ASSETS } from "../../assets";
import {
  buildFeatureInterestPayload,
  getFeatureInterestStatus,
  submitFeatureInterest,
} from "../monetization/utils/featureInterestService";
import styles from "./FeatureIntroNoAccessPage.module.css";

const playIcon = ASSETS.images.tubeIcon;

/**
 * Simple intro / lead-gen no-access card:
 * icon → Introducing + title → description → video thumbnail → interest CTA.
 */
export default function FeatureIntroNoAccessPage({
  feature,
  headerTitle,
  introTitle,
  introDescription,
  video = { link: "", thumbnail: "" },
  icon,
  trackEventName,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isReceptionist = new URLSearchParams(location.search).has("receptionist");
  const { profile } = useSelector((state) => state.doctors);

  const [submitted, setSubmitted] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const hasVideo = Boolean(video?.link);
  const hasThumbnail = Boolean(video?.thumbnail);

  const { statusActorId } = useMemo(() => {
    const built = buildFeatureInterestPayload({
      feature,
      profile,
      isReceptionist,
      search: location.search,
    });
    const nextDoctorId = built.doctorId !== "-" ? built.doctorId : "";
    const nextReceptionistId =
      built.receptionistId && built.receptionistId !== "-"
        ? built.receptionistId
        : "";
    return {
      // CTA/submit gate: receptionistId when receptionist, else doctorId.
      statusActorId: isReceptionist ? nextReceptionistId : nextDoctorId,
    };
  }, [feature, profile, isReceptionist, location.search]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsStatusLoading(true);
      try {
        const status = await getFeatureInterestStatus({ feature });
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
  }, [feature]);

  const handleRequestAccess = useCallback(async () => {
    if (submitted || submitting || !statusActorId) return;

    const clinic_name = getClinicName(profile?.hospital_data);
    const clinic_city = getClinicCity(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    const urlParams = new URLSearchParams(location.search);

    trackEvent(trackEventName, {
      mobile_no: tokenData?.mobile_no,
      hospital_business_id: tokenData?.hospital_business_id,
      clinic_id: tokenData?.clinic_id,
      clinic_name: isReceptionist
        ? urlParams.get("clinicName") || clinic_name
        : clinic_name,
      center_city: isReceptionist
        ? urlParams.get("centerCity") || clinic_city
        : clinic_city,
      former_page: feature,
      feature,
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
        feature,
        profile,
        isReceptionist,
        search: location.search,
      });

      const result = await submitFeatureInterest({ feature, payload });
      if (result?.submitted) setSubmitted(true);
    } catch (e) {
      console.error("Feature interest submit failed", e);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitted,
    submitting,
    statusActorId,
    profile,
    isReceptionist,
    location.search,
    trackEventName,
    feature,
  ]);

  return (
    <div
      className={[styles.shell, isReceptionist ? styles.shellReceptionist : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.header}>
        {!isReceptionist && (
          <>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/")}
            >
              <i className="icon-right" />
            </button>
            <div className={styles.headerDivider} />
          </>
        )}
        <span className={styles.headerTitle}>{headerTitle}</span>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrap} aria-hidden="true">
            {icon}
          </div>

          <div className={styles.kicker}>Introducing</div>
          <h1 className={styles.title}>{introTitle}</h1>
          <p className={styles.description}>{introDescription}</p>

          <button
            type="button"
            className={[
              styles.videoThumb,
              hasThumbnail && !hasVideo ? styles.videoThumbPreview : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              hasThumbnail
                ? { backgroundImage: `url(${video.thumbnail})` }
                : undefined
            }
            onClick={() => {
              if (hasVideo) setIsVideoOpen(true);
            }}
            disabled={!hasVideo}
            aria-label={hasVideo ? "Play video" : "Feature preview"}
          >
            {hasVideo && (
              <img
                width={isReceptionist ? 40 : 55}
                height={isReceptionist ? 40 : 55}
                src={playIcon}
                alt=""
              />
            )}
          </button>

          <div className={styles.actions}>
            <Button
              type="primary"
              className="btn btn-primary3 btn-41 px-4"
              style={{ width: "40%" }}
              onClick={handleRequestAccess}
              disabled={
                submitted || isStatusLoading || submitting || !statusActorId
              }
            >
              {submitted ? "Interest submitted" : "I'm interested"}
            </Button>
          </div>
        </div>
      </main>

      {isVideoOpen && hasVideo && (
        <VideoModal
          videoLink={video}
          onCancel={() => setIsVideoOpen(false)}
        />
      )}
    </div>
  );
}
