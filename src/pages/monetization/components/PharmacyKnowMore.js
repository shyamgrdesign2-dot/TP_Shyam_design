import React, { useCallback, useState } from "react";
import { Button, Tabs } from "antd";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import VideoModal from "../../../common/VideoModal";
import ContactSupport from "./ContactSupport";
import ExpiredText from "./ExpiredText";
import { S_PHARMACY } from "../../../utils/constants";
import FreeTrialButton from "./FreeTrialButton";
import ExpiredSubModal from "./ExpiredSubModal";
import { ASSETS } from "../../../assets";
import {
  getClinicCity,
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  trackEvent,
} from "../../../utils/utils";
import { isReceptionistSession } from "../../../utils/receptionistSession";
const playIcons = ASSETS.images.tubeIcon;

const { TabPane } = Tabs;

const PharmacyKnowMore = ({ handlePharmacyKnowMore, onRedirect }) => {
  const location = useLocation();
  const isReceptionist = isReceptionistSession(location.search);
  const { profile } = useSelector((state) => state.doctors);
  const [videoLink, setVideoLink] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const handleRequestAccess = useCallback(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const clinic_city = getClinicCity(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    const urlParams = new URLSearchParams(window.location.search);

    trackEvent("TP_Pharmacy_Request", {
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
    });

    setSubmitted(true);
  }, [profile, isReceptionist]);

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
            <Button type="text"
              className="close-drawer-btn"
              onClick={handlePharmacyKnowMore}>
              <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
            </Button>
            <div className="drawer-title">Pharmacy Management</div>
          </div>
          <FreeTrialButton title={S_PHARMACY} showHideSubModal={showHideSubModal} />
        </div>

        <div className="drawer-tabs">
          <Tabs defaultActiveKey="1" onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Basic Info" key="basicInfo" />
            {/* <TabPane tab="How it works" key="howItWorks" /> */}
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
          <div className="rounded-4 p-4" style={{ background: '#A461D81A' }}>
            <span className="fw-semibold">Pharmacy Management</span> makes it easy to manage purchases, sales, stock, and master data in one place. Track invoices, returns, and analytics in real-time. Optimize operations with complete visibility across the purchase-to-sale workflow. Powerful reporting ensures you're always audit-ready.
          </div>
        </div>

        {/* <div id="howItWorks" className="my-5">
          <span className="fs-12-1 fw-medium text-primary">How it works</span>
          <div className="fw-semibold fs-20 text-black mb-2">How Does Pharmacy Management Work?</div>
          <div className="fs-12-1 mb-2">Please watch this video to know how Pharmacy Management works👇</div>
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              background: `url(${video_link?.thumbnail})`,
              width: 447,
              height: 250,
              borderRadius: 24,
              cursor: "pointer",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
            onClick={() => {
              setVideoLink(true)
            }}
          >
            <img width={55} height={55} src={playIcons} />
          </div>
        </div> */}

        <ContactSupport />
      </div>

      <div className="position-sticky bottom-0 bg-white w-100 px-4 py-3">
        <Button
          className="btn btn-primary1 btn-41 align-items-center justify-content-center d-flex"
          onClick={submitted ? undefined : handleRequestAccess}
          aria-disabled={submitted}
          style={{
            backgroundColor: "#fff",
            ...(submitted ? { pointerEvents: "none" } : {}),
          }}
        >
          {submitted ? "Interest submitted" : "I'm interested"}
        </Button>
      </div>

      <ExpiredText title={S_PHARMACY} onRedirect={onRedirect} />

      <ExpiredSubModal
        title={S_PHARMACY}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal} />

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
