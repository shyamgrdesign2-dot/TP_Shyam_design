import React, { useState, useContext } from "react";
import { useSelector } from "react-redux";
import { Content } from "antd/es/layout/layout";
import { v4 as uuidv4 } from "uuid";

import CashManagerContext from "../context/CashManagerContext";
import SymptomsBox from "./SymptomsBox";
import ExaminationBox from "./ExaminationBox";
import SurgicalBox from "./SurgicalBox";
import DiagnosisBox from "./DiagnosisBox";
import MedicationsBox from "./MedicationsBox";
import AdviceBox from "./AdviceBox";
import InvestigationBox from "./InvestigationBox";
import ReferralBox from "./ReferralBox";
import TabFollowUpBox from "./tab_design/TabFollowUpBox";
import OphthalmologyExamPanel from "./ophthalmology/OphthalmologyExamPanel";
import CustomModule from "./CustomModule";
import {
  CustomModuleV2,
  AddCustomModuleV2,
  AddCustomModuleDrawer,
} from "./customModulesV2";
import SCBanner from "./SCBanner";
import LoopingVideo from "./common/LoopingVideo";
import CarePlanDropdown from "./CarePlanDropdown";
import CarePlanList from "./CarePlanList";

import { OPTHAL_PAD_MODULE_ID } from "../utils/constants";
import { useCrossConsult } from "../hooks/useCrossConsult";
import { ASSETS } from "../assets";

const { genRxBgWebm, genRxBgMp4, carePlan: carePlanIcon } = ASSETS.images;

const ClinicalExaminationContent = ({
  allAvailableModules,
  showShimmer,
  setShowSCBanner,
  showSCBanner,
  handleDDxDrawer,
  generatedDDx,
  getGenerateDDx,
  isDDxLoading,
  handleDDxKnowMore,
  isDDxGenerated,
  loadPrevOpthalSignal,
  isCarePlanEnabled,
  selectedCarePlan,
  setSelectedCarePlan,
  carePlanPlaceholder,
  userId,
  clinicId,
  tcmId,
  showVoiceRxModule,
}) => {
  const {
    patient_data,
    customizedPadRightList,
    customModuleContents,
  } = useContext(CashManagerContext);

  const [isAddCustomModuleDrawerVisible, setIsAddCustomModuleDrawerVisible] = useState(false);
  const isCrossConsultAccessable = useCrossConsult();

  return (
    <Content className="clinical-examination-content">
      {showSCBanner && (
        <SCBanner handleBanner={() => setShowSCBanner(false)} />
      )}
      {customizedPadRightList?.map((e, i) => {
        let customModule = allAvailableModules?.find(
          (m) => m.module_id === e.tmdpm_id
        );

        // If module not found in allAvailableModules, create fallback from moduleContents
        if (!customModule && e.is_custom_module && customModuleContents?.length > 0) {
          const moduleContent = customModuleContents.find(
            (content) => content.module_id === e.tmdpm_id
          );

          if (moduleContent) {
            customModule = {
              module_id: moduleContent.module_id,
              name: moduleContent.module_name || e.tmdpm_name,
              version: moduleContent.module_version || "v2",
              namedFields: moduleContent.module_version === "v2" && moduleContent.content?.length > 0
                ? Object.keys(moduleContent.content[0])
                  .filter((key) => key !== "id")
                  .map((key, index) => ({
                    fieldName: key,
                    fieldLabel: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
                    fieldType: "string",
                    isRequired: false,
                    order: index,
                  }))
                : [],
            };
          }
        }

        return e.tmdpm_id === 5 && e.tmdpm_status === 0 ? (
          <div
            key={i}
            className={`prescription-box-sm ${showShimmer ? "genrx-shimmer" : ""}`}
            style={showShimmer ? { padding: "2px" } : {}}
          >
            {showShimmer && (
              <LoopingVideo
                webm={genRxBgWebm}
                mp4={genRxBgMp4}
                className="genrx-shimmer-video"
                ariaLabel="Background"
              />
            )}
            <div
              className={showShimmer ? "genrx-shimmer-content" : ""}
              style={
                showShimmer
                  ? { background: "white", borderRadius: "17px" }
                  : {}
              }
            >
              <SymptomsBox
                handleDDxDrawer={handleDDxDrawer}
                generatedDDx={generatedDDx?.results}
              />
            </div>
          </div>
        ) : e.tmdpm_id === 10 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <ExaminationBox />
          </div>
        ) : e.tmdpm_id === 21 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <SurgicalBox />
          </div>
        ) : e.tmdpm_id === 11 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <DiagnosisBox
              handleDDxDrawer={handleDDxDrawer}
              generatedDDx={generatedDDx?.results}
              getGenerateDDx={getGenerateDDx}
              isDDxLoading={isDDxLoading}
              handleDDxKnowMore={handleDDxKnowMore}
              isDDxGenerated={isDDxGenerated}
            />
          </div>
        ) : e.tmdpm_id === 12 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <MedicationsBox />
          </div>
        ) : e.tmdpm_id === OPTHAL_PAD_MODULE_ID && e.tmdpm_status === 0 ? (
          <div key={i} className="opthal-panel-wrapper">
            <OphthalmologyExamPanel
              patientData={patient_data}
              showHeader
              headerTitle="Ophthal"
              loadPrevAllSignal={loadPrevOpthalSignal}
              fetchLastOnMount={true}
            />
          </div>
        ) : e.tmdpm_id === 13 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <AdviceBox />
          </div>
        ) : e.tmdpm_id === 14 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <InvestigationBox
              handleDDxDrawer={handleDDxDrawer}
              generatedDDx={generatedDDx?.results}
            />
          </div>
        ) : e.tmdpm_id === 15 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <TabFollowUpBox />
          </div>
        ) : e.tmdpm_id === 26 && e.tmdpm_status === 0 && isCrossConsultAccessable ? (
          <div key={i} className="prescription-box-sm">
            <ReferralBox />
          </div>
        ) : e.tmdpm_id === 22 && e.tmdpm_status === 0 && isCarePlanEnabled ? (
          <div key={i} className="prescription-box-sm p-14">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img
                  src={carePlanIcon}
                  alt="Care Plans"
                  className="me-3"
                  style={{ width: "20px", height: "20px" }}
                />
                <div className="title-common">Care Plans</div>
              </div>
            </div>
            <CarePlanList
              patientId={patient_data?.patient_unique_id}
              selectedTcmId={tcmId}
              readOnly
              title="Assigned Care Plans"
              hideWhenEmpty
              onCarePlanSelect={(plan) => {
                setSelectedCarePlan(plan);
              }}
            />
            <div className="mt-3">
              <CarePlanDropdown
                onCarePlanSelect={(plan) => {
                  setSelectedCarePlan(plan);
                }}
                selectedCarePlan={selectedCarePlan}
                patientId={patient_data?.patient_unique_id}
                doctorId={userId}
                clinicId={clinicId}
                placeholder={carePlanPlaceholder}
              />
            </div>
          </div>
        ) : (
          e.is_custom_module &&
          e.tmdpm_status === 0 &&
          customModule &&
          (customModule.version === "v2" ? (
            <CustomModuleV2 key={i} module={customModule} />
          ) : (
            <CustomModule key={i} module={customModule} />
          ))
        );
      })}

      <AddCustomModuleV2 onOpenDrawer={() => setIsAddCustomModuleDrawerVisible(true)} />
      <AddCustomModuleDrawer
        open={isAddCustomModuleDrawerVisible}
        onClose={() => setIsAddCustomModuleDrawerVisible(false)}
      />
    </Content>
  );
};

export default ClinicalExaminationContent;
