import React from "react";
import Sider from "antd/es/layout/Sider";
import TabVitalsList from "./tab_design/TabVitalsList";
import TabMedicalHistoryList from "./tab_design/TabMedicalHistoryList";
import TabPrivateNotesList from "./tab_design/TabPrivateNotesList";
import TabObstetricList from "../pages/obstetric/components/obstetricList/TabObstetricList";
import TabUploadDocumentList from "../pages/medicalRecords/components/uploadDocumentList/TabUploadDocumentList";
import TabLabParametersList from "./tab_design/TabLabParametersList";
import TabDDxList from "./tab_design/TabDDxList";
import TabVoiceRx from "./tab_design/TabVoiceRx";
import TabCarePlanList from "./tab_design/TabCarePlanList";
import GroundingBox from "./GroundingBox";
import { EDIT, ADD } from "../utils/constants";
import "./ConsultationSidebar.scss";
import { ASSETS } from "../assets";

const {
  vitalsPrimary: vitalsDark,
  vitalsSecondary: vitalsWhite,
  historyPrimary: medicalHistoryDark,
  historySecondary: medicalHistoryWhite,
  vaccinePrimary: vaccinationDark,
  vaccineSecondary: vaccinationWhite,
  personalNotesPrimary: privateNotesDark,
  personalNotesSecondary: privateNotesWhite,
  scalePrimary: growthChartDark,
  scaleSecondary: growthChart,
  obstetricPrimary: obstetricDark,
  obstetricSecondary: obstetricWhite,
  recordsPrimary: medicalRecordsDark,
  recordsSecondary: medicalRecordsWhite,
  labParameters: labParamsDark,
  labParametersWhite: labParamsWhite,
  carePlanActiveSolid: carePlanIconDark,
  carePlan: carePlanIcon,
  genRxMic: genRxImg,
  voiceRxDefault,
  ddx: ddxImg,
  tabDdxInactive: ddxInactiveImg,
} = ASSETS.images;

const ConsultationSidebar = ({
  collapsed,
  setCollapsed,
  collapsedFlag,
  openCollapsed,
  customizedPadLeftList,
  vitalsData,
  vitalsPastList,
  patientBirthWeight,
  handleDrawerVital,
  medicalHistoryData,
  updatedGynecHistory,
  handleDrawerMedicalHistory,
  isVaccinationAccessable,
  handleDrawerVaccination,
  privateNotesList,
  handleDrawerPrivateNotes,
  isGrowthChartAccessable,
  handleDrawerGrowth,
  isGynaecHistoryAccessable,
  examinationHistory,
  shouldShowAncHistory,
  shouldShowImmunisation,
  obstetricDetails,
  handleDrawerObstetric,
  allUploadedDocs,
  handleAddClick,
  fileInputRef,
  handleFileUpload,
  labParamsData,
  handleAddLabParamsDrawer,
  handleViewLabParamsDrawer,
  isCarePlanEnabled,
  caseManagerData,
  isApexAIAccessable,
  tp_monetization_enable,
  isFreeVoiceRxUser,
  generatedDDx,
  handleDDxDrawer,
  isDDxLoading,
  handleDDxKnowMore,
  getGenerateDDx,
  isDDxGenerated,
  setIsGenRxDrawerVisible,
  handleGenRxKnowMore,
  patient_data,
  tcmId,
  selectedCarePlan,
  setSelectedCarePlan,
  userId,
  clinicId,
  carePlanPlaceholder,
  isGroundingAccessableForZydus,
  handleGroundingKnowMore,
  obstetricDrawer,
  handleDrawerMedicalReport,
  setFilesData,
  setIsEditDocument,
  handleUploadDocPopup,
  setUploadDocDrawer,
  handleDrawerUploadDoc,
}) => {
  
  return (
    <div className="consultation-sidebar-container">
      <div className="nav-panel">
        {customizedPadLeftList?.map((e, i) => {
          if (e.tmdpm_status !== 0) return null;

          let icon = null;
          let active = false;
          let onClick = () => {};
          let label = "";

          switch (e.tmdpm_id) {
            case 1: // Vitals
              active = collapsedFlag === 1;
              icon = active ? vitalsDark : vitalsWhite;
              label = "Vitals";
              onClick = () => 
                vitalsData?.length === 0 && vitalsPastList?.length === 0 && !patientBirthWeight
                  ? handleDrawerVital()
                  : openCollapsed(1);
              break;
            case 3: // History
              active = collapsedFlag === 2;
              icon = active ? medicalHistoryDark : medicalHistoryWhite;
              label = "History";
              onClick = () =>
                medicalHistoryData?.length === 0 && !updatedGynecHistory
                  ? handleDrawerMedicalHistory()
                  : openCollapsed(2);
              break;
            case 8: // Private Notes
              active = collapsedFlag === 4;
              icon = active ? privateNotesDark : privateNotesWhite;
              label = "Notes";
              onClick = () =>
                privateNotesList?.length === 0
                  ? handleDrawerPrivateNotes()
                  : openCollapsed(4);
              break;
            case 7: // Vaccine
              if (!isVaccinationAccessable) return null;
              active = collapsedFlag === 3;
              icon = active ? vaccinationDark : vaccinationWhite;
              label = "Vaccine";
              onClick = handleDrawerVaccination;
              break;
            case 16: // Growth
              if (!isGrowthChartAccessable) return null;
              active = collapsedFlag === 5;
              icon = active ? growthChartDark : growthChart;
              label = "Growth";
              onClick = handleDrawerGrowth;
              break;
            case 17: // Obstetric
              if (!isGynaecHistoryAccessable) return null;
              active = collapsedFlag === 6;
              icon = active ? obstetricDark : obstetricWhite;
              label = "Obstetric";
              onClick = () =>
                examinationHistory?.length === 0 && !shouldShowAncHistory && !shouldShowImmunisation && !obstetricDetails?.lmp
                  ? handleDrawerObstetric()
                  : openCollapsed(6);
              break;
            case 18: // Records
              active = collapsedFlag === 7;
              icon = active ? medicalRecordsDark : medicalRecordsWhite;
              label = "Records";
              onClick = () => allUploadedDocs?.length === 0 ? handleAddClick() : openCollapsed(7);
              break;
            case 19: // Investigation Results
              active = collapsedFlag === 8;
              icon = active ? labParamsDark : labParamsWhite;
              label = "Results";
              onClick = () => labParamsData?.length === 0 ? handleAddLabParamsDrawer() : openCollapsed(8);
              break;
            case 22: // Care Plan
              if (!isCarePlanEnabled) return null;
              active = collapsedFlag === 11;
              icon = active ? carePlanIconDark : carePlanIcon;
              label = "Care Plan";
              onClick = () => openCollapsed(11);
              break;
            default:
              return null;
          }

          return (
            <button
              key={i}
              type="button"
              className={`nav-item ${active ? "active" : ""}`}
              onClick={onClick}
            >
              <div className="item-content">
                <div className="icon-container">
                  <img src={icon} alt={label} />
                </div>
                <label className="item-label">{label}</label>
              </div>
            </button>
          );
        })}
        
        {/* AI Buttons at bottom or end */}
        {/* {(tp_monetization_enable || isFreeVoiceRxUser) && (
          <button
            type="button"
            className={`nav-item ai-item ${collapsedFlag === 10 ? "active" : ""}`}
            onClick={() => openCollapsed(10)}
          >
            <div className="item-content">
              <div className="icon-container">
                <img src={collapsedFlag === 10 ? genRxImg : voiceRxDefault} alt="VoiceRx" />
              </div>
              <label className="item-label">Voice Rx</label>
            </div>
          </button>
        )} */}
      </div>

      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={collapsed ? "tabsider" : "tabsider1"}
        width={320}
      >
        <div className="sider-content">
          {collapsedFlag === 1 ? (
            <TabVitalsList
              mode={caseManagerData !== undefined ? EDIT : ADD}
              handleDrawerVital={handleDrawerVital}
              handleCollapsed={() => setCollapsed(!collapsed)}
              isTabRx={true}
            />
          ) : collapsedFlag === 2 ? (
            <TabMedicalHistoryList
              mode={caseManagerData !== undefined ? EDIT : ADD}
              handleDrawerMedicalHistory={handleDrawerMedicalHistory}
              handleCollapsed={() => setCollapsed(!collapsed)}
              gynecHistory={updatedGynecHistory}
              isTabRx={true}
            />
          ) : collapsedFlag === 4 ? (
            <TabPrivateNotesList
              mode={caseManagerData !== undefined ? EDIT : ADD}
              handleDrawerPrivateNotes={handleDrawerPrivateNotes}
              handleCollapsed={() => setCollapsed(!collapsed)}
              isTabRx={true}
            />
          ) : collapsedFlag === 6 ? (
            <TabObstetricList
              obstetricDrawer={obstetricDrawer}
              handleCollapsed={() => setCollapsed(!collapsed)}
              handleDrawerObstetric={handleDrawerObstetric}
              isTabRx={true}
            />
          ) : collapsedFlag === 7 ? (
            <TabUploadDocumentList
              handleCollapsed={() => setCollapsed(!collapsed)}
              handleDrawerMedicalReport={handleDrawerMedicalReport}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              handleAddClick={handleAddClick}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              setFilesData={setFilesData}
              setIsEditDocument={setIsEditDocument}
              handleUploadDocPopup={handleUploadDocPopup}
              setUploadDocDrawer={setUploadDocDrawer}
              isTabRx={true}
            />
          ) : collapsedFlag === 8 ? (
            <TabLabParametersList
              handleCollapsed={() => setCollapsed(!collapsed)}
              labParamsData={labParamsData}
              handleAddLabParamsDrawer={handleAddLabParamsDrawer}
              handleViewLabParamsDrawer={handleViewLabParamsDrawer}
              isTabRx={true}
            />
          ) : collapsedFlag === 9 && (isApexAIAccessable || tp_monetization_enable) ? (
            <TabDDxList
              generatedDDx={generatedDDx?.results}
              handleDDxDrawer={handleDDxDrawer}
              isDDxLoading={isDDxLoading}
              handleDDxKnowMore={handleDDxKnowMore}
              getGenerateDDx={getGenerateDDx}
              isDDxGenerated={isDDxGenerated}
              isTabRx={true}
            />
          ) : collapsedFlag === 10 && (tp_monetization_enable || isFreeVoiceRxUser) ? (
            <TabVoiceRx
              handleGenRxKnowMore={handleGenRxKnowMore}
              setIsGenRxDrawerVisible={setIsGenRxDrawerVisible}
              isTabRx={true}
            />
          ) : collapsedFlag === 11 && isCarePlanEnabled ? (
            <TabCarePlanList
              handleCollapsed={() => setCollapsed(!collapsed)}
              patientId={patient_data?.patient_unique_id}
              selectedTcmId={tcmId}
              selectedCarePlan={selectedCarePlan}
              setSelectedCarePlan={setSelectedCarePlan}
              userId={userId}
              clinicId={clinicId}
              carePlanPlaceholder={carePlanPlaceholder}
              isTabRx={true}
            />
          ) : collapsedFlag === 12 && isGroundingAccessableForZydus ? (
            <GroundingBox handleGroundingKnowMore={handleGroundingKnowMore} />
          ) : null}
        </div>
      </Sider>
    </div>
  );
};

export default ConsultationSidebar;
