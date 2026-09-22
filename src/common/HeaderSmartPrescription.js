import { notifyPrescriptionAction } from './PrescriptionActionToast';
import RxWorkflowHeader, { RxFulfilmentToggle, rxClearAction } from './prescription-header/RxWorkflowHeader';
import { headerIcon, visitActionIcon } from './prescription-header/prescriptionHeaderActions';
import { TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import axios from "axios";
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
  Switch,
  Tour,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";

import CustomizeSetting from "./CustomizeSetting";

import CashManagerContext from "../context/CashManagerContext";
import ProfilePopover from "./ProfilePopover";
import CommonModal from "./CommonModal";

import api from "../api/services/axiosService";

import { errorMessage, removeBeforeWhiteSpace } from "../utils/utils";

import { useSelector, useDispatch } from "react-redux";

import { addCaseManager, editCaseManager } from "../redux/caseManagerSlice";
import VideoModal from "./VideoModal";
import { getDecodedToken } from "../utils/localStorage";
import { env } from "../EnvironmentConfig";
import {
  RX_DIGITIZATION,
  IS_RX_DIGI_API_CALL,
  WS_CONTROL_URL,
  MESSAGE_KEY,
  GB_PILLUP_MEDICINE,
  GB_CVT_EXT_HOS,
} from "../utils/constants";
import ReconnectingWebSocket from "reconnectingwebsocket";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_SMARTSYNC_CONNECT } from "../utils/constants";
import { upsertDoctorSettingFlag } from "../redux/doctorsSlice";
import { setDefaultCustomSyncPadTemplate } from "../pages/smartSync/services/uploadService";
import { assignCarePlan, updateCarePlanName } from "../pages/smartSync/services/carePlanService";
import {
  attachCrossConsultToCaseManagerPayload,
  syncCrossConsultReferral,
} from "../utils/crossConsultHelpers";
import VideoConsultButton from "../components/VideoConsultButton";
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  icReload: reload,
  tutorial,
  tubeIcon: playIcons,
  devicePad,
  smartSyncConnected,
  smartSyncDisconnected,
  tagNew,
  pillup: Pillup,
  eazydoseLogo: EazyDoseLogo,
  video: videoSvg,
} = ASSETS.images;

function HeaderPrescription({
  prescription,
  onClear,
  onSubmit,
  smartRxData,
  loader,
  isVaccinationEnabled,
  isGrowthChartEnabled,
  caseManagerData,
  isCustomSSRX,
  selectedTemplateId,
  prepareMetadataForSubmissionData,
  selectedCarePlan,
  hasExistingCarePlan = false,
  setBuildNumber,
  handleVideoConsult,
  isVideoConsultLoading,
  showTeleconsultIcon,
  onTeleconsultClick,
  isTeleconsultJoinLoading,
  isTeleconsultActive,
}) {
  const { templates, loading } = useSelector((state) => state.caseManager);
  const { profile, videoList } = useSelector((state) => state.doctors);
  const [videoLink, setVideoLink] = useState(null);

  const dispatch = useDispatch();

  const navigate = useNavigate();
  const {
    patient_data,
    tcmId,
    pamId,
    consultationDate,
    symptomsData,
    examinationData,
    surgeriesData,
    diagnosisData,
    adviceData,
    investigationData,
    medicationData,
    vitalsData,
    setVitalsData,
    medicalHistoryData,
    followUpDate,
    setFollowUpDate,
    additionalNote,
    referralData,
    pillupSwitch,
    setPillupSwitch,
    setMedicalHistoryData,
  } = useContext(CashManagerContext);

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isDisconnect, setIsDisconnect] = useState(null);
  const [showDiconnectPopup, setShowDiconnectPopup] = useState(false);
  const [status, setStatus] = useState(null);
  const [customizeDrawer, setCustomizeDrawer] = useState(false);
  const intervalRef = useRef(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [popOver3, setPopOver3] = useState(false);
  const [versionNumber, setVersionNumber] = useState("")

  const baseUrl = { customBaseUrl: env.rx_digitization };
  const isSmartSyncConnectAccessableFromGB =
    useFeatureIsOn(GB_SMARTSYNC_CONNECT);

  const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  const { isAutofillSelected, selectedSymptomsCollector } = useSelector(
    (state) => state.ddx
  );

  const items = [
    {
      label: <div onClick={onResetClick}>Clear</div>,
      key: "clear",
    },
  ];

  useEffect(() => {
    if (
      isAutofillSelected &&
      selectedSymptomsCollector?.medicalHistory &&
      selectedSymptomsCollector.medicalHistory.length > 0
    ) {
      // Create a new array to store the updated medical history
      let updatedMedicalHistory = [...medicalHistoryData];

      if (updatedMedicalHistory.length === 0) {
        updatedMedicalHistory = selectedSymptomsCollector.medicalHistory?.map(
          (e, i) => {
            return {
              title: e?.title,
              tmmhs_id: e?.tmmhs_id,
              no_know_history: false,
              tags: [],
            };
          }
        );
      }

      // Process each section from selectedSymptomsCollector
      selectedSymptomsCollector.medicalHistory.forEach((section) => {
        // Find the matching section in medicalHistoryData
        const sectionIndex = updatedMedicalHistory.findIndex(
          (item) => item.title.toLowerCase() === section.title.toLowerCase()
        );

        if (sectionIndex !== -1) {
          // Process each item in the section
          section.items.forEach((newItem) => {
            // Create tag based on section type
            const newTag = {
              tmmhst_id: Math.floor(Math.random() * 10000),
              title: newItem.name,
              pms_default: 0,
              enable: "Y",
              note: newItem.notes || "",
            };

            // Add specific fields based on section type
            switch (section.title) {
              case "Medical Condition":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.medication = "Yes";
                newTag.MonthYear = "April 2025"; // Or use dynamic date
                newTag.oldSince = newItem.duration || "";
                break;

              case "Allergies":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.MonthYear = "April 2025";
                newTag.oldSince = newItem.duration || "";
                break;

              case "Family History":
                newTag.relationship = newItem.relation || "";
                newTag.newSince = "";
                newTag.MonthYear = "";
                break;

              case "Lifestyle":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.MonthYear = "April 2025";
                newTag.oldSince = newItem.duration || "";
                break;

              case "Additional History":
                // Handle additional history items if needed
                break;
            }

            // Add the new tag to the section
            updatedMedicalHistory[sectionIndex].tags.push(newTag);
          });
        }
      });

      // Update the medical history state
      setMedicalHistoryData(updatedMedicalHistory);
    }
  }, [isAutofillSelected, selectedSymptomsCollector]);

  async function onResetClick() {
    setVitalsData([]);
    setFollowUpDate(null);
  }

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const showHideClearModal = useCallback(() => {
    setIsClearModalOpen(!isClearModalOpen);
  }, [isClearModalOpen]);

  const checkDataFillOrNot = () => {
    if (
      symptomsData.length > 0 ||
      examinationData.length > 0 ||
      surgeriesData.length > 0 ||
      diagnosisData.length > 0 ||
      medicationData.length > 0 ||
      adviceData.length > 0 ||
      investigationData.length > 0 ||
      vitalsData.length > 0 ||
      medicalHistoryData.length > 0
    ) {
      showHideBackModal();
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleClearClick = async () => {
    setIsClearModalOpen(!isClearModalOpen);
    await onClear();
    notifyPrescriptionAction('Prescription cleared');
  };

  const handleSubmitClick = async () => {
    if (!clicked) {
      onSubmit(versionNumber);
    }
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
            <div className="title-common lh-base">Video Tutorial</div>
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
                    <h3 className="title-common text-welcome">
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

  useEffect(() => {
    if (isSmartSyncConnectAccessableFromGB) {
      const ws = new ReconnectingWebSocket(WS_CONTROL_URL, null, {
        debug: true,
        reconnectInterval: 2000,
      });

      ws.onopen = () => {
        console.log("WebSocket connection opened");
        setSocket(ws);
        checkDeviceStatus(ws);
        checkAppVersion(ws);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setSocket(null);
      };

      ws.onmessage = (event) => {
        handleSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error", error);
        // this will be handle once all the user get migrated to new build(with 2 WS connection)
        setError("WebSocket connection error");
      };

      // Check device status every 5 seconds
      const intervalId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          checkDeviceStatus(ws);
        }
      }, 5000);

      return () => {
        ws.close();
        clearInterval(intervalId); // Clear the interval on cleanup
      };
    }
  }, [isSmartSyncConnectAccessableFromGB]);

  const checkDeviceStatus = (ws) => {
    ws.send("DeviceStatus");
  };

  const checkAppVersion = (ws) => {
    ws.send("AppVersion");
  };

  const wsError = (error) => {
    message.open({
      key: MESSAGE_KEY,
      type: "error",
      className: "error-red",
      content: (
        <div className="d-flex align-items-center">
          <div>
            <div className="title-common text-start fontroboto">{error}</div>
          </div>
        </div>
      ),
      duration: 3,
    });
  };

  const handleSocketMessage = (message) => {
    if (message.startsWith("DeviceStatus:")) {
      const statusMessage = message.split(":")[1];

      if (statusMessage === "True") {
        setIsConnected(true);
        setConnectLoading(false);
      } else {
        // Handle the case where additional information is provided in the message
        if (isDisconnect === true || isDisconnect === null) {
          setShowDiconnectPopup(false);
        } else {
          setShowDiconnectPopup(true);
        }
        setIsConnected(false);
        setConnectLoading(false);
        // wsError(`${statusMessage}`);
      }
    } else if (message.startsWith("DeviceConnect:")) {
      const statusMessage = message.split(":")[1] === "True";
      setIsConnected(statusMessage);
      setConnectLoading(false);
      if (!statusMessage)
        setError("Failed to connect device. Please try again.");
    } else if (message.startsWith("DeviceDisconnect:")) {
      const statusMessage = message.split(":")[1] === "True";
      setIsConnected(!statusMessage);
      setConnectLoading(false);
      if (!statusMessage) setError("Failed to disconnect device");
    } else if (message.startsWith("AppVersion")) {
      const versionMessage = message.split(":")[1];
      setVersionNumber(versionMessage);
    }
  };

  const handleConnectButtonClick = () => {
    if (!socket) {
      // this will be handle once all the user get migrated to new build(with 2 WS connection)
      setError("WebSocket connection is not established");
      return;
    }

    if (isConnected) {
      setIsDisconnect(true);
      return;
    }

    setConnectLoading(true);
    setError(null);
    setShowDiconnectPopup(false);
    const action = "DeviceConnect";
    socket.send(action);
  };

  const handleDisconnectConfirm = () => {
    if (!socket) {
      setError("WebSocket connection is not established");
      return;
    }

    setConnectLoading(true);
    setShowDiconnectPopup(false);
    setError(null);
    const action = "DeviceDisconnect";
    socket.send(action);
    setIsDisconnect(null);
  };

  const handleDisconnectPopup = () => {
    setIsDisconnect(true);
  };

  //Disconnect Modal function
  const showHideDisconnectModal = () => {
    setIsDisconnect(null);
    setShowDiconnectPopup(false);
  };

  // Effect to handle updated data from parent
  useEffect(() => {
    if (smartRxData?.length || vitalsData.length > 0 || followUpDate) {
      onEndVisitClick();
      setClicked(true);
      
      // Call setDefaultCustomSyncPadTemplate if selectedTemplateId is available
      if (selectedTemplateId && selectedTemplateId !== "none") {
        setDefaultCustomSyncPadTemplate(selectedTemplateId);
      }
    }
  }, [smartRxData]);

  // Handle the data upate and end the visit
  async function onEndVisitClick() {
    const smartRxFiles = smartRxData?.map((file) => file.name);
    const files = smartRxData?.map((file) => file);
    const sendData = {
      action: tcmId == 0 ? "add" : "edit",
      tcm_id: tcmId,
      patient_unique_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      pam_id:
        patient_data !== undefined
          ? patient_data.hasOwnProperty("pam_id")
            ? patient_data.pam_id
            : pamId
          : 0,
      consultation_date: consultationDate,
      symptoms: symptomsData,
      examination: examinationData,
      surgeries: surgeriesData,
      diagnosis: diagnosisData,
      medicine: medicationData.map(({ medicineUnit, ...rest }) => rest),
      advice: adviceData,
      investigation: investigationData,
      vitals: vitalsData,
      follow_up_date: followUpDate,
      visit_advice: additionalNote,
      medical_history: medicalHistoryData,
      smart_prescription_filename: smartRxFiles || [],
      pillup_fulfilment: isPillUpAccessableFromGB && pillupSwitch ? 1 : 0,
      isCustomSSRX: isCustomSSRX ? "1" : "0",
      custom_ss_data: prepareMetadataForSubmissionData?.custom_ss_data || null,
    };

    attachCrossConsultToCaseManagerPayload(sendData, referralData, {
      referredBy: profile?.um_name,
      pendingCrossConsult: patient_data,
    });

    const action =
      tcmId == 0
        ? await dispatch(addCaseManager(sendData))
        : await dispatch(editCaseManager(sendData));

    if (action.meta.requestStatus === "fulfilled") {
      // After we have a confirmed consultation, ensure care plan is synced with the generated tcm_id
      try {
        const decodedToken = getDecodedToken();
        const tokenData = decodedToken?.result;
        const generatedTcmId = action?.payload?.tcm_id ?? tcmId;

        if (generatedTcmId > 0 && selectedCarePlan) {
          if (hasExistingCarePlan && selectedCarePlan?.plan_name) {
            await updateCarePlanName(parseInt(generatedTcmId), selectedCarePlan.plan_name);
          } else if (
            !hasExistingCarePlan &&
            selectedCarePlan?.plan_id &&
            patient_data?.patient_unique_id &&
            tokenData?.user_id &&
            tokenData?.clinic_id
          ) {
            await assignCarePlan({
              plan_id: selectedCarePlan.plan_id,
              um_id: tokenData.user_id,
              patient_unique_id: patient_data.patient_unique_id,
              hm_id: tokenData.clinic_id,
              tcm_id: parseInt(generatedTcmId),
            });
          }
        }
      } catch (cpErr) {
        console.error('Care plan sync (assign/update) after SmartRx submit failed:', cpErr);
      }

      try {
        await syncCrossConsultReferral({
          tcmId: action?.payload?.tcm_id ?? tcmId,
          pendingCrossConsult: patient_data,
        });
      } catch (error) {
        console.error('Cross consult sync failed:', error);
      }

      navigate("/print-smart-rx", {
        replace: true,
        state: {
          ...action.payload,
          patient_data: patient_data,
          smartRxFile: (files && files.length > 0) ? files : smartRxFiles,
          page: "prescription",
        },
      });
    } else {
      errorMessage(action.error);
    }
  }

  // Handle Customize Drawer
  const handleDrawerCustomize = useCallback(() => {
    setCustomizeDrawer(!customizeDrawer);
  }, [customizeDrawer]);

  const CUSTOMIZE_CONTENT_TAB = useMemo(() => {
    return (
      <CustomizeSetting
        handleDrawerCustomize={handleDrawerCustomize}
        isVaccinationEnabled={isVaccinationEnabled}
        isGrowthChartEnabled={isGrowthChartEnabled}
        page="smart-rx-page"
      />
    );
  }, [customizeDrawer]);

    // Tour Pillup
    const tourRef = useRef(null);
  
    useEffect(() => {
      if(isPillUpAccessableFromGB && profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status !== 1){
        tourRef?.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          setTourOpen(true)
        }, 1000);
      }
    }, [isPillUpAccessableFromGB]);

    
  const PILLUP_CONTENT = useCallback(() => {
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;
    const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
    
    const serviceName = isZydusUser ? "eaZY Dose" : "PillUp";
    const serviceNameTitle = isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
    
    return (
      <div className="p-2">
        <div className="fs-18 fw-semibold text-black">{serviceNameTitle} <img className="img-fluid ms-2" src={tagNew} /></div>
        <div className="pt-1">You can now activate <b>{serviceName}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
      </div>
    );
  }, [popOver3]);

  //PopOver3 function
  const showHidePillUpPopover = useCallback(() => {
    setPopOver3(!popOver3);
  }, [popOver3]);

  const onTourHandle = () => {
    dispatch(upsertDoctorSettingFlag({ type: 'pillup', status: 1 }))
    setTourOpen(!tourOpen)
  }
  
    const steps = [
      {
        description:
          <>
            <div className="fs-18 fw-semibold pt-3 text-black">
              {(() => {
                const decodedToken = getDecodedToken();
                const tokenData = decodedToken?.result;
                const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                return isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
              })()} <img className="img-fluid ms-2" src={tagNew} />
            </div>
            <div className="pt-1">You can now activate <b>
              {(() => {
                const decodedToken = getDecodedToken();
                const tokenData = decodedToken?.result;
                const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                return isZydusUser ? "eaZY Dose" : "PillUp";
              })()}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
          </>,
        target: () => tourRef.current,
        nextButtonProps: {
          children: 'Okay',
          onClick: onTourHandle
        }
      }
    ];
  
    const pillUpChange = (checked) => {
      setPillupSwitch(checked)
    };

    useEffect(() => {
      if (caseManagerData !== undefined) {
        setPillupSwitch(caseManagerData?.pillup_fulfilment)
      }
    }, []);

  const isZydusFulfilment = getDecodedToken()?.result?.hospital_business_id == env.zydus_business_id;
  const actions = {
    tutorial: !isCvtExtHosAccessableFromGB ? { key: 'tutorial', ariaLabel: 'Play tutorial', active: popOverVideo,
      icon: <img src={ASSETS.images.tutorial2} width={42} height={42} alt="" />, variant: 'ghost', style: { padding: 0, border: 0 },
      wrap: node => <Popover open={popOverVideo} onOpenChange={showHideVideoListPopover} content={VIDEO_CONTENT} trigger="click" overlayClassName="pop-430 pp-0 videoTutorial" placement="bottom">{node}</Popover> } : undefined,
    tools: !isCvtExtHosAccessableFromGB ? [{ key: 'customize', ariaLabel: 'Customize prescription sections', active: customizeDrawer, onClick: handleDrawerCustomize },
      ...(isPillUpAccessableFromGB ? [{ key: 'fulfilment', node: <RxFulfilmentToggle ref={tourRef} checked={pillupSwitch} onChange={pillUpChange}
        label={isZydusFulfilment ? 'eaZY Dose' : 'PillUp'} logo={isZydusFulfilment ? EazyDoseLogo : Pillup}
        help={<Popover open={popOver3} onOpenChange={showHidePillUpPopover} content={profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status === 1 ? PILLUP_CONTENT() : null} trigger="hover" placement="bottom">
          <span className="d-inline-flex" aria-label="About medicine fulfilment"><TPLibraryIcon name="info-circle" variant="linear" size={16} /></span>
        </Popover>} /> }] : [])] : [],
    smart: [
      ...(isSmartSyncConnectAccessableFromGB ? [{ key: 'smartsync', label: connectLoading ? 'SmartSync Connecting...' : isConnected ? 'SmartSync Connected' : 'SmartSync Disconnected',
        icon: headerIcon('bluetooth'), variant: 'tonal', theme: isConnected ? 'success' : connectLoading ? 'neutral' : 'error',
        onClick: isConnected ? handleDisconnectPopup : handleConnectButtonClick, disabled: connectLoading, loading: connectLoading, active: Boolean(isDisconnect) }] : []),
      ...(handleVideoConsult ? [{ key: 'video', ariaLabel: 'Video consultation', icon: headerIcon('video'), onClick: handleVideoConsult, loading: isVideoConsultLoading }] : []),
      ...(showTeleconsultIcon ? [{ key: 'teleconsult', ariaLabel: isTeleconsultActive ? 'Meeting in progress' : 'Tele-Consultation', icon: headerIcon('video'), onClick: onTeleconsultClick, disabled: isTeleconsultJoinLoading || isTeleconsultActive, loading: isTeleconsultJoinLoading }] : []),
    ],
    primary: { label: 'Visit', icon: visitActionIcon, onClick: handleSubmitClick, loading: loading || loader, disabled: (!prescription && clicked) || loader },
    more: !isCvtExtHosAccessableFromGB ? rxClearAction(() => setIsClearModalOpen(true), !prescription || loading) : undefined,
  };
  return <RxWorkflowHeader variant="smart-rx" patient={patient_data} onBack={checkDataFillOrNot} actions={actions} aria-label="Smart prescription header">
    <CommonModal
                  isModalOpen={isBackModalOpen}
                  onCancel={showHideBackModal}
                  modalWidth={500}
                  title={"You may lose your data"}
                  modalBody={
                    <>
                      <div className="alert-warning rounded-10px p-2 patient-details">
                        <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                          <span>
                            Are you sure you want to leave? <br />
                            You will permanently lose your data.
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <div
                            onClick={() => navigate("/", { replace: true })}
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
    <CommonModal
                  isModalOpen={showDiconnectPopup}
                  // onCancel={showHideBackModal}
                  modalWidth={500}
                  title={"Please click on connect button"}
                  modalBody={
                    <>
                      <div className="alert-warning rounded-10px p-2 patient-details">
                        <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                          <span>
                            Device is not connected. This can be due to: <br />
                            1. Cable not connected <br />
                            2. Cable damaged / loose connection
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <Button
                            onClick={handleConnectButtonClick}
                            className="lh-lg btn btn-primary3 btn-41 px-4"
                          >
                            <span>Connect</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
    <CommonModal
                isModalOpen={isDisconnect}
                onCancel={showHideDisconnectModal}
                modalWidth={500}
                title={"Disconnect Device"}
                modalBody={
                  <>
                    <div className="alert-warning rounded-10px p-2 patient-details">
                      <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" />
                        <span>
                          Are you sure you want to Disconnect <br />
                          SmartSync device.
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="d-flex align-items-center mt-2 justify-content-end">
                        <div
                          onClick={handleDisconnectConfirm}
                          className="me-4 text-decoration-underline btn p-0 text-main"
                        >
                          Disconnect
                        </div>
                        <Button
                          onClick={showHideDisconnectModal}
                          className="lh-lg btn btn-primary3 btn-41 px-4"
                        >
                          <span>No, Stay Connected</span>
                        </Button>
                      </div>
                    </div>
                  </>
                }
              />
    <CommonModal
                isModalOpen={isClearModalOpen}
                onCancel={showHideClearModal}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                  <>
                    <div className="alert-warning rounded-10px p-2 patient-details">
                      <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" />
                        <span>
                          Are you sure you want to clear all the <br />
                          prescription pages data?
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="d-flex align-items-center mt-2 justify-content-end">
                        <div
                          onClick={() => handleClearClick()}
                          className="me-4 text-decoration-underline btn p-0 text-main"
                        >
                          Clear
                        </div>
                        <Button
                          onClick={showHideClearModal}
                          className="lh-lg btn btn-primary3 btn-41 px-4"
                        >
                          <span>No</span>
                        </Button>
                      </div>
                    </div>
                  </>
                }
              />
    <Drawer placement="right" closeIcon={false} onClose={handleDrawerCustomize} open={customizeDrawer} className="modalWidth-900" width="auto">{CUSTOMIZE_CONTENT_TAB}</Drawer>
    {!isCvtExtHosAccessableFromGB && isPillUpAccessableFromGB && <Tour placement="bottom" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} />}
    {videoLink && !isCvtExtHosAccessableFromGB && <VideoModal videoLink={videoLink} onCancel={() => setVideoLink(null)} />}
  </RxWorkflowHeader>;
}

export default React.memo(HeaderPrescription);
