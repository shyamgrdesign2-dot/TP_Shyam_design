import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Tabs } from "antd";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import {
  getClinicCity,
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  trackEvent,
} from "../../../utils/utils";
import {
  buildFeatureInterestPayload,
  getFeatureInterestStatus,
  submitFeatureInterest,
} from "../utils/featureInterestService";

const { TabPane } = Tabs;

const PharmacyKnowMore = ({ handlePharmacyKnowMore }) => {
  const location = useLocation();
  const isReceptionist = new URLSearchParams(location.search).has("receptionist");
  const { profile } = useSelector((state) => state.doctors);

  const [videoLink, setVideoLink] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { statusActorId } = useMemo(() => {
    const built = buildFeatureInterestPayload({
      feature: "pharmacy",
      profile,
      isReceptionist,
      search: location.search,
    });
    const doctorId = built.doctorId !== "-" ? built.doctorId : "";
    const receptionistId =
      built.receptionistId && built.receptionistId !== "-"
        ? built.receptionistId
        : "";
    return {
      statusActorId: isReceptionist ? receptionistId : doctorId,
    };
  }, [profile, isReceptionist, location.search]);

  const buildBaseEventAttrs = useCallback(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const clinic_city = getClinicCity(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    const urlParams = new URLSearchParams(location.search);

    return {
      mobile_no: tokenData?.mobile_no,
      hospital_business_id: tokenData?.hospital_business_id,
      clinic_id: tokenData?.clinic_id,
      clinic_name: isReceptionist
        ? urlParams.get("clinicName") || clinic_name
        : clinic_name,
      center_city: isReceptionist
        ? urlParams.get("centerCity") || clinic_city
        : clinic_city,
      feature: "pharmacy",
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
    };
  }, [profile, isReceptionist, location.search]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsStatusLoading(true);
      try {
        const status = await getFeatureInterestStatus({
          feature: "pharmacy",
        });
        if (!isMounted) return;
        setInterestSubmitted(Boolean(status?.submitted));
      } catch (e) {
        console.error("Feature interest status fetch failed", e);
        if (!isMounted) return;
        setInterestSubmitted(false);
      } finally {
        if (!isMounted) return;
        setIsStatusLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestAccess = useCallback(async () => {
    if (interestSubmitted || submitting || !statusActorId) return;

    trackEvent("TP_Pharmacy_RequestAccess", buildBaseEventAttrs());
    setSubmitting(true);

    try {
      const { payload } = buildFeatureInterestPayload({
        feature: "pharmacy",
        profile,
        isReceptionist,
        search: location.search,
      });

      const result = await submitFeatureInterest({ feature: "pharmacy", payload });
      if (result?.submitted) setInterestSubmitted(true);
    } catch (e) {
      console.error("Feature interest submit failed", e);
    } finally {
      setSubmitting(false);
    }
  }, [
    interestSubmitted,
    submitting,
    statusActorId,
    buildBaseEventAttrs,
    profile,
    isReceptionist,
    location.search,
  ]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const video_link = {
    link: "https://www.youtube.com/embed//UgeyXlHItXI",
    thumbnail: "https://i.ytimg.com/vi/UgeyXlHItXI/maxresdefault.jpg",
  };

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div className="drawer-header-content justify-content-between border-bottom">
          <div className="d-flex align-items-center">
            <Button
              type="text"
              className="close-drawer-btn"
              onClick={handlePharmacyKnowMore}
            >
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">Pharmacy Management</div>
          </div>
        </div>

        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            <TabPane tab="Contact Support" key="contactSupport" />
          </Tabs>
        </div>
      </div>

      <div className="px-4 overflow-y-auto h-100">
        <div id="basicInfo" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">Basic Info</span>
          <div className="fw-semibold fs-20 text-black mb-3">
            What is Pharmacy Management?
          </div>
          <div className="rounded-4 p-4" style={{ background: "#A461D81A" }}>
            <span className="fw-semibold">Pharmacy Management</span> makes it
            easy to manage purchases, sales, stock, and master data in one
            place. Track invoices, returns, and analytics in real-time. Optimize
            operations with complete visibility across the purchase-to-sale
            workflow. Powerful reporting ensures you&apos;re always audit-ready.
          </div>
        </div>

        <ContactSupport />
      </div>

      <div className="position-sticky bottom-0 bg-white w-100 px-4 py-3">
        <Button
          className="btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex"
          onClick={handleRequestAccess}
          disabled={
            interestSubmitted || isStatusLoading || submitting || !statusActorId
          }
          aria-disabled={
            interestSubmitted || isStatusLoading || submitting || !statusActorId
          }
        >
          {interestSubmitted ? "Interest submitted" : "I'm interested"}
        </Button>
      </div>

      {videoLink && (
        <VideoModal
          videoLink={video_link}
          onCancel={() => setVideoLink(false)}
        />
      )}
    </div>
  );
};

export default React.memo(PharmacyKnowMore);
