import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Row, Col } from "react-bootstrap";
import { Button, Dropdown, Tooltip, Popover, Input, Spin, Tabs, Select, Drawer, message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import "./ConsultationHeader.scss";
import { ASSETS } from "../assets";
import { errorMessage, getClinicName, removeBeforeWhiteSpace } from "../utils/utils";
import { MESSAGE_KEY } from "../utils/constants";
import CashManagerContext from "../context/CashManagerContext";
import useTabletViewport from "../hooks/useTabletViewport";
import CustomizeSetting from "../common/CustomizeSetting";
import ProfilePopover from "../common/ProfilePopover";
import CommonModal from "../common/CommonModal";
import VideoModal from "../common/VideoModal";

import {
    oneClickAddTemplate,
    oneClickUpdateTemplate,
    oneClickDeleteTemplate,
    oneClickTemplatesList,
    oneClickSingleTemplateDetails,
} from "../redux/caseManagerSlice";
import { listVideo } from "../redux/doctorsSlice";
import { resetOpthalForm } from "../redux/ophthalmologyExamSlice";

const {
  alerticon: alertIcon,
  tutorial: tutorial2,
  tubeIcon: playIcons,
  settingsNew,
  endIcon,
  notesMultiple,
  video: videoSvg,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const ConsultationHeader = ({
  patientData,
  isVaccinationEnabled,
  isGrowthChartEnabled,
  handleGenRx,
  handleVideoConsult,
  isVideoConsultLoading,
  isEndVisitLoading,
  onTeleconsultClick,
  showTeleconsultIcon,
  isTeleconsultJoinLoading,
  isTeleconsultActive,
  onEndVisit,
  handleSelectLetterHead,
  hasDentalData = false,
  onPreviewClick,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isTablet = useTabletViewport();
  
  const { 
    profile, 
    videoList 
  } = useSelector((state) => state.doctors);
  
  const { 
    templates, 
    loading: templateLoading 
  } = useSelector((state) => state.caseManager);

  const { 
    patient_data, 
    symptomsData, setSymptomsData,
    examinationData, setExaminationData,
    surgeriesData, setSurgeriesData,
    diagnosisData, setDiagnosisData,
    adviceData, setAdviceData,
    investigationData, setInvestigationData,
    medicationData, setMedicationData,
    vitalsData, setVitalsData,
    medicalHistoryData, setMedicalHistoryData,
    privateNotesData, setPrivateNotesData,
    followUpDate, setFollowUpDate,
    additionalNote, setAdditionalNote,
    customModuleContents, setCustomModuleContents,
    isDraft,
  } = useContext(CashManagerContext);

  // States from TabRxHeaderV2
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [popOver1, setPopOver1] = useState(false);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [popOver2, setPopOver2] = useState(false);
  const [inputTemplateName, setInputTemplateName] = useState(null);
  const [templateDrawer, setTemplateDrawer] = useState(false);
  const [saveDrawer, setSaveDrawer] = useState(false);
  const [customizeDrawer, setCustomizeDrawer] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  
  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

  useEffect(() => {
    dispatch(oneClickTemplatesList());
    dispatch(listVideo());
  }, [dispatch]);

  useEffect(() => {
    setMatchedTemplates(templates);
  }, [templates]);

  // Helper functions
  const hasEnteredData = useCallback(() => {
    return (
      hasDentalData ||
      symptomsData?.length > 0 ||
      examinationData?.length > 0 ||
      surgeriesData?.length > 0 ||
      diagnosisData?.length > 0 ||
      adviceData?.length > 0 ||
      investigationData?.length > 0 ||
      medicationData?.length > 0 ||
      vitalsData?.length > 0 ||
      medicalHistoryData?.length > 0 ||
      privateNotesData ||
      followUpDate ||
      additionalNote ||
      customModuleContents?.length > 0
    );
  }, [hasDentalData, symptomsData, examinationData, surgeriesData, diagnosisData, adviceData, investigationData, medicationData, vitalsData, medicalHistoryData, privateNotesData, followUpDate, additionalNote, customModuleContents]);

  const onResetClick = useCallback(() => {
    setSymptomsData([]);
    setExaminationData([]);
    setDiagnosisData([]);
    setAdviceData([]);
    setInvestigationData([]);
    setMedicationData([]);
    setPrivateNotesData(null);
    setFollowUpDate(null);
    setAdditionalNote("");
    setSurgeriesData([]);
    setCustomModuleContents([]);
    dispatch(resetOpthalForm());
  }, [setSymptomsData, setExaminationData, setDiagnosisData, setAdviceData, setInvestigationData, setMedicationData, setPrivateNotesData, setFollowUpDate, setAdditionalNote, setSurgeriesData, setCustomModuleContents, dispatch]);

  const showHideBackModal = () => setIsBackModalOpen(!isBackModalOpen);
  const showHideTemplatesListPopover = () => setPopOver1(!popOver1);
  const showHideSaveTemplatePopOver = () => setPopOver2(!popOver2);
  const showHideVideoListPopover = () => setPopOverVideo(!popOverVideo);
  const handleDrawerTemplate = () => setTemplateDrawer(!templateDrawer);
  const handleDrawerSave = () => setSaveDrawer(!saveDrawer);
  const handleDrawerCustomize = useCallback(() => {
    setCustomizeDrawer((prev) => !prev);
  }, []);

  const onTemplateSelected = async (tmoc_id, tmoc_template_name) => {
    const action = await dispatch(oneClickSingleTemplateDetails(tmoc_id));
    if (action.meta.requestStatus === "fulfilled") {
        const data = action.payload;
        if (data) {
            // Apply template data (simplified version for now)
            if (data.symptoms?.length > 0) setSymptomsData([...symptomsData, ...data.symptoms.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.examination?.length > 0) setExaminationData([...examinationData, ...data.examination.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.diagnosis?.length > 0) setDiagnosisData([...diagnosisData, ...data.diagnosis.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.medicine?.length > 0) setMedicationData([...medicationData, ...data.medicine.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.advice?.length > 0) setAdviceData([...adviceData, ...data.advice.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.investigation?.length > 0) setInvestigationData([...investigationData, ...data.investigation.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.surgeries?.length > 0) setSurgeriesData([...surgeriesData, ...data.surgeries.map(e => ({ ...e, unique_id: uuidv4() }))]);
            if (data.userModules?.length > 0) setCustomModuleContents([...customModuleContents, ...data.userModules]);
        }
        setPopOver1(false);
        setTemplateDrawer(false);
    } else {
        errorMessage(action.error);
    }
  };

  const onAddTemplateClicked = async () => {
    const sendData = {
      tmoc_template_name: inputTemplateName,
      data: {
        symptoms: symptomsData,
        examination: examinationData,
        diagnosis: diagnosisData,
        medicine: medicationData,
        advice: adviceData,
        investigation: investigationData,
      }
    };
    const action = await dispatch(oneClickAddTemplate(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      setInputTemplateName(null);
      setPopOver2(false);
      setSaveDrawer(false);
      message.success("Template saved successfully");
    }
  };

  const checkDataFillOrNot = () => {
    if (hasEnteredData()) {
        showHideBackModal();
    } else {
        navigate(-1);
    }
  };

  // Content renderers
  const TEMPLATE_CONTENT = (
    <div className="pop-350 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-bold">Templates</div>
            <Input 
                placeholder="Search Template" 
                onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    setMatchedTemplates(templates.filter(t => t.tmoc_template_name.toLowerCase().includes(val)));
                }}
                className="ms-2"
            />
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {matchedTemplates?.map((template) => (
                <div 
                    key={template.tmoc_id} 
                    className="p-2 cursor-pointer hover-bg-light border-bottom d-flex justify-content-between align-items-center"
                    onClick={() => onTemplateSelected(template.tmoc_id, template.tmoc_template_name)}
                >
                    <span>{template.tmoc_template_name}</span>
                    <Button 
                        type="text" 
                        danger 
                        icon={<i className="icon-delete" />} 
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(oneClickDeleteTemplate(template.tmoc_id));
                        }}
                    />
                </div>
            ))}
        </div>
    </div>
  );

  const SAVE_CONTENT = (
    <div className="pop-450 p-3">
        <div className="fw-bold mb-3">Save as Template</div>
        <Input 
            placeholder="Template Name" 
            value={inputTemplateName}
            onChange={(e) => setInputTemplateName(removeBeforeWhiteSpace(e.target.value))}
            className="mb-3"
        />
        <div className="d-flex justify-content-end">
            <Button onClick={() => setPopOver2(false)} className="me-2">Cancel</Button>
            <Button type="primary" onClick={onAddTemplateClicked} disabled={!inputTemplateName}>Save</Button>
        </div>
    </div>
  );

  const VIDEO_CONTENT = (
    <div className="pop-430 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-bold">Video Tutorial</div>
            <Button type="text" icon={<i className="icon-Cross" />} onClick={() => setPopOverVideo(false)} />
        </div>
        {videoList?.[0]?.video?.map((video, i) => (
            <div key={i} className="d-flex mb-3 cursor-pointer" onClick={() => setVideoLink(video)}>
                <img src={video.thumbnail} alt={video.tmv_title} style={{ width: 80, height: 45, objectFit: 'cover' }} className="me-3 rounded" />
                <div>
                    <div className="fw-bold small">{video.tmv_title}</div>
                    <div className="text-muted smallest">{video.tmv_description}</div>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="tab-rx-header-v2">
      <div className="header-left">
        <div onClick={checkDataFillOrNot} className="back-btn-wrapper">
            <i className="icon-right" />
        </div>
        
        <ProfilePopover patient_data={patient_data} isPrescriptionPage />
      </div>

      <div className="header-right">
        {/* Tutorial */}
        <Popover
            open={popOverVideo}
            onOpenChange={setPopOverVideo}
            content={VIDEO_CONTENT}
            trigger="click"
            placement="bottom"
        >
            <button className="icon-btn bg-transparent">
                <img src={tutorial2} alt="Tutorial" />
            </button>
        </Popover>

        <div className="divider" />

        {/* Templates */}
        <Popover
            open={popOver1}
            onOpenChange={setPopOver1}
            content={TEMPLATE_CONTENT}
            trigger="click"
            placement="bottom"
        >
            <button className="icon-btn">
                <i className="icon-template" />
            </button>
        </Popover>

        {/* Save */}
        <Tooltip title={hasEnteredData() ? "" : "Enter some data to save a template"}>
            <Popover
                open={popOver2}
                onOpenChange={(open) => hasEnteredData() && setPopOver2(open)}
                content={SAVE_CONTENT}
                trigger="click"
                placement="bottom"
            >
                <button className="icon-btn" disabled={!hasEnteredData()}>
                    <i className="icon-save" />
                </button>
            </Popover>
        </Tooltip>

        {/* Settings */}
        <button className="icon-btn" onClick={handleDrawerCustomize}>
            <img src={settingsNew} alt="Settings" />
        </button>

        {/* Notes/Letterhead */}
        {/* <button className="icon-btn" onClick={handleSelectLetterHead}>
            <img src={notesMultiple} alt="Notes" />
        </button> */}

        {showTeleconsultIcon && (
            <Tooltip title={isTeleconsultActive ? "Meeting in progress" : "Tele-Consultation"}>
                <button
                    type="button"
                    className="icon-btn"
                    onClick={onTeleconsultClick}
                    disabled={isTeleconsultJoinLoading || isTeleconsultActive}
                >
                    {isTeleconsultJoinLoading ? (
                        <LoadingOutlined />
                    ) : (
                        <img src={videoSvg} alt="Video" />
                    )}
                </button>
            </Tooltip>
        )}

        <div className="divider" />

        <Tooltip title={hasEnteredData() ? "" : "Please fill prescription to end visit"}>
          <Button
            type="button"
            className="btn-41 btn px-2 ant-btn-text btn-input align-items-center d-flex"
            onClick={onPreviewClick}
            icon={<i className="icon-Preview" />}
          >
            Preview
          </Button>
        </Tooltip>

        {/* End Visit */}
        <Tooltip title={hasEnteredData() ? "" : "Please fill prescription to end visit"}>
            <button
                type="button"
                className="pill-btn end-visit"
                onClick={() => hasEnteredData() && onEndVisit()}
                disabled={isEndVisitLoading}
            >
                {isEndVisitLoading ? <Spin size="small" /> : <img src={endIcon} alt="End" />}
                <span>End</span>
            </button>
        </Tooltip>
      </div>

      {/* Drawers & Modals */}
      <CommonModal
        isModalOpen={isBackModalOpen}
        onCancel={showHideBackModal}
        modalWidth={500}
        title="You may lose your data"
        modalBody={
            <>
                <div className="alert-warning p-3 rounded">
                    <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" style={{ width: 24 }} />
                        <span>You’ve entered details that haven’t been saved yet. Leave anyway?</span>
                    </div>
                </div>
                <div className="mt-4 d-flex justify-content-end">
                    <Button type="text" danger onClick={() => navigate(-1)} className="me-3">Yes, Leave</Button>
                    <Button type="primary" onClick={showHideBackModal}>No, Stay</Button>
                </div>
            </>
        }
      />

      <Drawer
        placement="right"
        closeIcon={false}
        onClose={handleDrawerCustomize}
        open={customizeDrawer}
        width="auto"
      >
        <CustomizeSetting handleDrawerCustomize={handleDrawerCustomize} isVaccinationEnabled={isVaccinationEnabled} isGrowthChartEnabled={isGrowthChartEnabled} page="normal-rx-page"/>
      </Drawer>

      {videoLink && (
        <VideoModal
            videoLink={videoLink}
            onCancel={() => setVideoLink(null)}
        />
      )}
    </div>
  );
};

export default ConsultationHeader;
