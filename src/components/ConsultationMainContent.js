import React, { useState } from "react";
import { Content } from "antd/es/layout/layout";
import SymptomsBox from "./SymptomsBox";
import ExaminationBox from "./ExaminationBox";
import OphthalmologyExamPanel from "./ophthalmology/OphthalmologyExamPanel";
import DiagnosisBox from "./DiagnosisBox";
import MedicationsBox from "./MedicationsBox";
import AdviceBox from "./AdviceBox";
import InvestigationBox from "./InvestigationBox";
import TabFollowUpBox from "./tab_design/TabFollowUpBox";
import SurgicalBox from "./SurgicalBox";
import CustomModule from "./CustomModule";
import {
  AddCustomModuleDrawer,
  AddCustomModuleV2,
  CustomModuleV2,
} from "./customModulesV2";
import LoopingVideo from "./common/LoopingVideo";
import SCBanner from "./SCBanner";
import { OPTHAL_PAD_MODULE_ID } from "../utils/constants";
import { ASSETS } from "../assets";

export default function ConsultationMainContent({
  customizedPadRightList,
  allAvailableModules,
  customModuleContents,
  showShimmer,
  showSCBanner,
  setShowSCBanner,
  handleDDxDrawer,
  generatedDDx,
  getGenerateDDx,
  isDDxLoading,
  handleDDxKnowMore,
  isDDxGenerated,
  patientData,
  loadPrevOpthalSignal,
}) {
  const [isAddCustomModuleDrawerVisible, setIsAddCustomModuleDrawerVisible] = useState(false);

  const {
    genRxBg_2: genRxBgWebm,
    genRxBg: genRxBgMp4,
  } = ASSETS.images;

  return (
    <Content className="main-content-layout">
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
              namedFields:
                moduleContent.module_version === "v2" &&
                moduleContent.content?.length > 0
                  ? Object.keys(moduleContent.content[0])
                      .filter((key) => key !== "id")
                      .map((key, index) => ({
                        fieldName: key,
                        fieldLabel:
                          key.charAt(0).toUpperCase() +
                          key.slice(1).replace(/_/g, " "),
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
            className={`prescription-box-sm ${
              showShimmer ? "genrx-shimmer" : ""
            }`}
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
                generatedDDx={generatedDDx}
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
              generatedDDx={generatedDDx}
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
              patientData={patientData}
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
            {" "}
            <InvestigationBox
              handleDDxDrawer={handleDDxDrawer}
              generatedDDx={generatedDDx}
            />
          </div>
        ) : e.tmdpm_id === 15 && e.tmdpm_status === 0 ? (
          <div key={i} className="prescription-box-sm">
            <TabFollowUpBox />
          </div>
        ) : (
          e.is_custom_module &&
          e.tmdpm_status === 0 &&
          customModule &&
          (customModule.version === "v2" ? (
            <CustomModuleV2 module={customModule} />
          ) : (
            <CustomModule module={customModule} />
          ))
        );
      })}

      <AddCustomModuleV2
        onOpenDrawer={() => setIsAddCustomModuleDrawerVisible(true)}
      />
      <AddCustomModuleDrawer
        open={isAddCustomModuleDrawerVisible}
        onClose={() => setIsAddCustomModuleDrawerVisible(false)}
      />
    </Content>
  );
}
