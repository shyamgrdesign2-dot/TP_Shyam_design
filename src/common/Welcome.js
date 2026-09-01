import React, { useState, useCallback, useMemo } from "react";
import { Drawer } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";

import { getDecodedToken } from "../utils/localStorage";
import config from "../config";
import AvailableCredits from "../components/bulk_messages/AvailableCredits";
import { getClinicCity } from "../utils/utils";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CVT_EXT_HOS, GB_ZYDUS_USER } from "../utils/constants";
import { env } from "../EnvironmentConfig";
import useTabletViewport from "../hooks/useTabletViewport";
import { ASSETS } from "../assets";
import { isMissionAnalyticsOnlyUser } from "../pages/data-analytics/data/analyticsAccess";
import PageHeroBanner, { pageHeroBannerStyles } from "./PageHeroBanner";

const CreditImg = ASSETS.images.creditIcon;

function Welcome(props) {
  const { locationPath, backVisible, appointmentAgentsData } = props;

  const { userCreditObj } = useSelector((state) => state.bulkMessages);
  const { profile } = useSelector((state) => state.doctors);

  const navigate = useNavigate();
  const [availableCredit, setAvailableCredit] = useState(false);
  const decodedToken = getDecodedToken();
  const location = useLocation();
  const isFromAddAppointment = location.state?.from === "/add-appointment";

  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const analyticsOnlyHome = isMissionAnalyticsOnlyUser(decodedToken?.result);
  const isMissionAnalyticsView =
    locationPath === "/mission-analytics" ||
    (locationPath === "/" && analyticsOnlyHome);

  const isTablet = useTabletViewport();

  const clickWalkInConsultation = () => {
    const businessId = decodedToken?.result?.hospital_business_id;
    window.Moengage.track_event("walk_in_consultation_click", {
      doctor_id: profile?.doctor_unique_id,
      timestamp: new Date(),
    });
    if (businessId == config.zydus_business_id) {
      navigate("/walk_in_consultation_zydus");
    } else {
      navigate("/walk_in_consultation");
    }
  };

  const handleAvailableCredit = useCallback(() => {
    setAvailableCredit((open) => !open);
  }, []);

  const handleNewTemplate = () => {
    navigate("/create-campaign", { state: { setupData: appointmentAgentsData } });
    const clinic_city = getClinicCity(profile?.hospital_data);
    window.Moengage.track_event("TP_Choose_New_Template", {
      Doctor_specialty: profile?.dp_name,
      Doctor_unique_id: profile?.doctor_unique_id,
      clinic_city,
      Doctor_Name: profile?.um_name,
      Doctor_mobile_No: profile?.um_contact,
    });
  };

  const handleBack = () => {
    if (isFromAddAppointment) {
      navigate("/add-appointment", {
        replace: true,
        state: { ...location.state },
      });
      return;
    }
    navigate(-1);
  };

  const { title, subtitle } = useMemo(() => {
    if (locationPath === "/add_patient") return { title: "Add New Patient", subtitle: undefined };
    if (locationPath === "/edit_patient") return { title: "Edit Patient Details", subtitle: undefined };
    if (locationPath === "/walk_in_consultation" || locationPath === "/walk_in_consultation_zydus") {
      return { title: "Start Walk-In Consultation", subtitle: undefined };
    }
    if (locationPath === "/bulk_messages") {
      return {
        title: "Messages",
        subtitle: "Engage patients with timely updates and reminders",
      };
    }
    if (locationPath === "/billing-dashboard") return { title: "Bill History", subtitle: undefined };
    if (locationPath === "/neo-consult") {
      return {
        title: "Neo Consult",
        subtitle: "Review AI-segmented captures from your Tatva Pendant",
      };
    }
    const doctorName = profile?.um_name
      ?.split(/\s+/)
      .filter(
        (word) =>
          word.toLowerCase() !== "dr" && word.toLowerCase() !== "dr."
      )
      .join(" ");
    return {
      title: `Welcome Dr. ${doctorName || ""}!`,
      subtitle: isMissionAnalyticsView
        ? "OPD Analytics"
        : locationPath === "/"
          ? "Your Appointments"
          : undefined,
    };
  }, [locationPath, profile?.um_name, isMissionAnalyticsView]);

  const actions = (() => {
    if (locationPath === "/" && !isCvtExtHosAccessableFromGB) {
      return (
        <>
          {decodedToken?.result?.hospital_business_id != env.zydus_business_id &&
            !isZydusUserAccessableFromGB && (
              <Button
                variant="outline"
                theme="primary"
                surface="dark"
                className={pageHeroBannerStyles.outlineBtn}
                leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
                onClick={() => {
                  window.Moengage.track_event("TP_AddAppointment_addnewappointment", {
                    Doctor_specialty: profile?.dp_name,
                    Doctor_unique_id: profile?.doctor_unique_id,
                    Doctor_Name: profile?.um_name,
                    Doctor_mobile_No: profile?.um_contact,
                  });
                  navigate("/add-appointment");
                }}
              >
                {`Add ${isTablet ? "" : "New"} Appointment`}
              </Button>
            )}
          <Button
            variant="solid"
            theme="primary"
            surface="dark"
            className={pageHeroBannerStyles.solidBtn}
            leftIcon={<TPLibraryIcon name="flash" size={24} />}
            data-testid="start-walkin-consultation"
            onClick={clickWalkInConsultation}
          >
            {`Start Walk-in ${isTablet ? "" : "Consultation"}`}
          </Button>
        </>
      );
    }
    if (locationPath === "/bulk_messages") {
      return (
        <>
          <Button
            variant="outline"
            theme="primary"
            surface="dark"
            className={pageHeroBannerStyles.outlineBtn}
            leftIcon={<img src={CreditImg} width={19} alt="" style={{ filter: "brightness(0) invert(1)" }} />}
            onClick={handleAvailableCredit}
          >
            {`Available Credits: ${userCreditObj?.userCredit}`}
          </Button>
          <Button
            variant="solid"
            theme="primary"
            surface="dark"
            className={pageHeroBannerStyles.solidBtn}
            leftIcon={<TPLibraryIcon name="add" family="essential" size={20} />}
            onClick={handleNewTemplate}
          >
            Choose new Template
          </Button>
        </>
      );
    }
    return null;
  })();

  return (
    <>
      <PageHeroBanner
        title={title}
        subtitle={subtitle}
        showBackButton={Boolean(backVisible)}
        onBack={handleBack}
        actions={actions}
      />

      <Drawer
        className="modalWidth-645"
        width="auto"
        title="Buy Message Credits"
        placement="right"
        closable
        open={availableCredit}
        onClose={handleAvailableCredit}
      >
        <AvailableCredits handleAvailableCredit={handleAvailableCredit} />
      </Drawer>
    </>
  );
}

export default React.memo(Welcome);
