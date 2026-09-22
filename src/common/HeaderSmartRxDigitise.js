import RxWorkflowHeader from './prescription-header/RxWorkflowHeader';
import { headerIcon } from './prescription-header/prescriptionHeaderActions';
import { Button as TesseractButton } from '@dhspl-tatvacare/tesseract-ui';
import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import {
  Button,
  Dropdown,
  Tooltip,
  Popover,
  Input,
  Spin,
  Tabs,
  Select,
  Drawer,
  message,
  Divider,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";

import CashManagerContext from "../context/CashManagerContext";
import ProfilePopover from "./ProfilePopover";
import CommonModal from "./CommonModal";

import api from "../api/services/axiosService";

import { errorMessage, removeBeforeWhiteSpace } from "../utils/utils";

import { useSelector, useDispatch } from "react-redux";

import VideoModal from "./VideoModal";
import { getDecodedToken } from "../utils/localStorage";
import { env } from "../EnvironmentConfig";
import {
  RX_DIGITIZATION,
  IS_RX_DIGI_API_CALL,
  S_RX_DIGITIZATION,
  GB_ZYDUS_USER,
} from "../utils/constants";
import ReconnectingWebSocket from "reconnectingwebsocket";
import { GB_SMARTSYNC_CONNECT } from "../utils/constants";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import {
  getClinic,
  getTokenData,
} from "../utils/utils";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import LoopingVideo from "../components/common/LoopingVideo";
import VideoConsultButton from "../components/VideoConsultButton";
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  icReload: reload,
  tutorial,
  tubeIcon: playIcons,
  intersect: zydusDataEngineIcon,
  grow: growIcon,
  accuracy: accuracyIcon,
  healthCare: healthIcon,
  newGif_3: tagNewWebm,
  newGif_2: tagNewMp4,
} = ASSETS.images;

function HeaderSmartRxDigitise({ onSave, patient_data, isSnapRx = false, isSmartRx = false, isDigitiseRxLoading = false, tcm_id, handleVideoConsult, isVideoConsultLoading, onBackToPreview, isSaveLoading = false }) {
  const { profile } = useSelector(
      (state) => state.doctors
    );
  const { templates, loading } = useSelector((state) => state.caseManager);
  const { videoList } = useSelector((state) => state.doctors);
  const [videoLink, setVideoLink] = useState(null);
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [shouldShowVideo, setShowVideo] = useState(false);
  const decodedToken = getDecodedToken();
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const tokenData = decodedToken?.result;
  const isGroundingAccessableForZydus = 
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  const groundingVideoLink = {
    link: "https://www.youtube.com/embed/mAZ7Sa86PnQ",
    thumbnail: "https://i.ytimg.com/vi/mAZ7Sa86PnQ/hqdefault.jpg",
  };

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);
  const handleSaveDigitiseRx = async () => {
        const tokenData = getTokenData();
        const clinic = getClinic(profile?.hospital_data);
        window.Moengage?.track_event?.("TP_SubmitDigitizedRx", {
        patient_id: patient_data?.patient_unique_id || "",
        patient_name: patient_data?.pm_fullname || "",
        doctor_id: profile?.doctor_unique_id,
        doctor_name: profile?.um_name,
        doctor_specialty: profile?.dp_name,
        clinic_id: tokenData?.clinic_id,
        clinic_name: clinic?.hm_name,
        rx_id: tcm_id || patient_data?.tcm_id || "",
        source: "Patient Details page",
        device_details: navigator.userAgent
      });
    onSave();
  };

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common-digitised lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList
            ?.filter((e) => e.category_id === 9)[0]
            ?.video?.map((item1, i1) => {
              return (
                <div
                  key={i1}
                  className={`d-flex ${
                    i1 !==
                      videoList?.filter((e) => e.category_id === 9)[0]?.video
                        ?.length -
                        1 && "pb-3 mb-15 border-bottom"
                  }`}
                >
                  <div className="tutorial-play me-14">
                    <button type="button" onClick={() => setVideoLink(item1)}>
                      <img src={playIcons} />
                    </button>
                    <span className="tutorial-thumb">
                      <img src={item1.thumbnail} />
                    </span>
                  </div>
                  <div>
                    <h3 className="title-common-digitised text-welcome">
                      {item1?.tmv_title}
                    </h3>
                    <div className="fs-12 fontroboto fw-normal text-main">
                      {item1?.tmv_description}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOverVideo]);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  return <>
    <RxWorkflowHeader variant={isSnapRx ? 'snap-rx-review' : 'smart-rx-review'} patient={patient_data} onBack={showHideBackModal} aria-label={isSnapRx ? 'SnapRx review header' : 'Smart prescription review header'} actions={{
      tutorial: isSnapRx ? { key: 'tutorial', ariaLabel: 'Play tutorial', active: popOverVideo, icon: <img src={ASSETS.images.tutorial2} width={42} height={42} alt="" />, variant: 'ghost', style: { padding: 0, border: 0 },
        wrap: node => <Popover open={popOverVideo} onOpenChange={showHideVideoListPopover} content={VIDEO_CONTENT} trigger="click" overlayClassName="pop-430 pp-0 videoTutorial" placement="bottom">{node}</Popover> } : undefined,
      extras: !isSnapRx && !isSmartRx ? [{ key: 'trial', type: 'node', node: <FreeTrialButton title={S_RX_DIGITIZATION} showHideSubModal={showHideSubModal} /> }] : [],
      tools: isGroundingAccessableForZydus ? [{ key: 'grounding', node: <Tooltip
                      placement="bottomRight"
                      overlayClassName="groundingTooltip"
                      title={
                        <div style={{ padding: "12px" }}>
                          <div>
                            <span
                              className="semi-bold-text fs-21"
                              style={{ lineHeight: "18px" }}
                            >
                              Zydus Data Engine
                            </span>
                            <LoopingVideo
                              className="img-fluid"
                              width={39}
                              height={16}
                              style={{ marginLeft: 10, marginBottom: 5 }}
                              webm={tagNewWebm}
                              mp4={tagNewMp4}
                              ariaLabel="New"
                            />
                          </div>
                          <Divider style={{ margin: "15px 0px" }} />
                          <div>
                            <span>What is Zydus Data Engine?</span>
                            <span>
                              {" "}With a curated list of{" "}
                              <span className="semi-bold-text">medicines</span>{" "}
                              and{" "}
                              <span className="semi-bold-text">lab tests</span>
                              from the{" "}
                              <span className="semi-bold-text">
                                Zydus Data Engine
                              </span>
                              , our AI adapts to your prescribing style,
                              surfacing the most
                              <span className="semi-bold-text">
                                relevant suggestions
                              </span>{" "}
                              while you prescribe, and helps to
                            </span>
                            <div className="d-flex align-items-center gap-3 mt-3">
                              <div
                                className="d-flex align-items-center gap-1 p-2 rounded-20px fs-12"
                                style={{
                                  background: "rgba(220, 186, 246, 0.4)",
                                }}
                              >
                                <img src={healthIcon} alt="health-icon" />
                                Boosting Patient Fulfilment
                                <img src={growIcon} alt="grow-icon" />
                              </div>
                              <div
                                className="d-flex align-items-center gap-1 p-2 rounded-20px fs-12"
                                style={{
                                  background: "rgba(220, 186, 246, 0.4)",
                                }}
                              >
                                <img src={accuracyIcon} alt="accuracy-icon" />
                                Improve Rx Accuracy by{" "}
                                <span className="semi-bold-text">80%</span>
                              </div>
                            </div>

                            {/* <div
                              style={{
                                width: "503px",
                                height: "239px",
                                marginTop: "12px",
                              }}
                            >
                              <div
                                className="d-flex align-items-center justify-content-center"
                                style={{
                                  background: `url(${groundingVideoLink?.thumbnail})`,
                                  width: "503px",
                                  height: "239px",
                                  borderRadius: 24,
                                  cursor: "pointer",
                                  backgroundSize: "cover",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                }}
                                onClick={() => setShowVideo(true)}
                              >
                                <img
                                  width={55}
                                  height={55}
                                  src={playIcons}
                                  alt="play-icon"
                                />
                              </div>
                            </div> */}
                          </div>
                        </div>
                      }
                    >
                      <TesseractButton variant="tonal" theme="secondary" size="md" leftIcon={<img src={zydusDataEngineIcon} width={20} height={20} alt="" />}>Zydus Data Engine</TesseractButton>
                    </Tooltip> }] : [],
      smart: [{ key: 'review-title', node: <span className="rx-header-title">Review Digital Rx</span> }, ...(handleVideoConsult ? [{ key: 'video', ariaLabel: 'Video consultation', icon: headerIcon('video'), onClick: handleVideoConsult, loading: isVideoConsultLoading }] : [])],
      primary: { label: 'Save Digitised Rx', onClick: handleSaveDigitiseRx, loading: loading || isSaveLoading, disabled: isDigitiseRxLoading },
    }}>
      <CommonModal
                    isModalOpen={isBackModalOpen}
                    onCancel={showHideBackModal}
                    modalWidth={500}
                    title={"You may lose your data"}
                    modalBody={
                      <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                          <div className="d-flex align-items-center">
                            <img
                              className="me-3"
                              src={alertIcon}
                              alt="Warning"
                            />
                            <span>
                              Are you sure you want to leave? <br />
                              You will permanently lose your data.
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="d-flex align-items-center mt-2 justify-content-end">
                            <div
                              onClick={() => {
                                if (typeof onBackToPreview === "function") {
                                  onBackToPreview();
                                } else {
                                  navigate(-1);
                                }
                                showHideBackModal();
                              }}
                              className="me-4 text-decoration-underline btn p-0 text-main"
                            >
                              Yes Leave
                            </div>
                            <Button
                              onClick={showHideBackModal}
                              className="lh-lg btn btn-primary3 btn-41 px-4"
                            >
                              <span>No, Stay</span>
                            </Button>
                          </div>
                        </div>
                      </>
                    }
                  />
      {videoLink && <VideoModal videoLink={videoLink} onCancel={() => setVideoLink(null)} />}
    </RxWorkflowHeader>
    <ExpiredSubModal title={S_RX_DIGITIZATION} isSubModalOpen={isSubModalOpen} showHideSubModal={showHideSubModal} />
    {shouldShowVideo && <VideoModal videoLink={groundingVideoLink} onCancel={() => setShowVideo(false)} />}
  </>;
}
export default React.memo(HeaderSmartRxDigitise);
