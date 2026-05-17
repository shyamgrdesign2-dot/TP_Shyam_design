import React, { useState, useEffect, useCallback, useRef, useMemo, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Drawer, Tabs, message, Layout } from "antd";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";

import {
  ADD, EDIT, EXTRA_OPTIONS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  GB_ZYDUS_USER, GB_CARE_PLAN, GB_VOICE_RX_FREE,
  OPTHAL_PAD_MODULE_ID, GB_OPTHAL_MODULE, GB_VIDEO_CONSULT, GB_TELE_CONSULT
} from "../utils/constants";

import { resetVitalsState, getVitals } from "../redux/vitalsSlice";
import { listPrivateNotes } from "../redux/medicalhistorySlice";
import { viewPatient } from "../redux/appointmentsSlice";
import { fetchObstetricDetails, addObstetricDetails } from "../redux/obstetricSlice";
import {
  setAllUploadedDocs, setPatientUploadedDocs, setUploadDocCategories,
  zydusDocsList, zydusRadioList
} from "../redux/uploadDocSlice";
import { getModules, searchModulesByHospital } from "../redux/customModuleSlice";
import {
  resetOpthalForm, setLastOpthalPrescriptionData, setOpthalPrescriptionId
} from "../redux/ophthalmologyExamSlice";

import CashManagerContext from "../context/CashManagerContext";
import HeaderV2 from "../components/shell/HeaderV2";
import NavPanel from "../components/shell/NavPanel";
import SymptomsBox from "../components/SymptomsBox";
import ExaminationBox from "../components/ExaminationBox";
import OphthalmologyExamPanel from "../components/ophthalmology/OphthalmologyExamPanel";
import DiagnosisBox from "../components/DiagnosisBox";
import MedicationsBox from "../components/MedicationsBox";
import AdviceBox from "../components/AdviceBox";
import InvestigationBox from "../components/InvestigationBox";
import TabFollowUpBox from "../components/tab_design/TabFollowUpBox";
import VitalsList from "../components/VitalsList";
import MedicalHistoryList from "../components/MedicalHistoryList";
import PrivateNotesList from "../components/PrivateNotesList";
import ObstetricList from "./obstetric/components/obstetricList/ObstetricList";
import UploadDocumentList from "./medicalRecords/components/uploadDocumentList/UploadDocumentList";
import LabParametersList from "../components/LabParametersList";
import ZydusLabParametersList from "../components/ZydusLabParametersList";
import CarePlanList from "../components/CarePlanList";
import CarePlanDropdown from "../components/CarePlanDropdown";
import SurgicalBox from "../components/SurgicalBox";
import CustomModule from "../components/CustomModule";
import { CustomModuleV2, AddCustomModuleV2, AddCustomModuleDrawer } from "../components/customModulesV2";
import { ExaminationTab } from "../components/dental/examination/ExaminationTab";
import { TreatmentPlanTab } from "../components/dental/plan/TreatmentPlanTab";
import { RxPadChromeProvider } from "../components/dental/tp-rxpad/rxpad-chrome-context";
import { RxPadSyncProvider } from "../components/dental/tp-rxpad/rxpad-sync-context";
import { BillingCatalogProvider } from "../components/dental/lib/billing-catalog-context";

import { useAccess } from "./vaccination/useAccess";
import {
  errorMessage, getClinicName, shouldMonetizationDisabled,
  trackEvent, getTokenData, getDeviceSdkData, isVoiceRxFree
} from "../utils/utils";
import { fetchAllDocumentCategories, fetchAllPatientDocs, fetchDocsUploadedByPatient } from "./medicalRecords/service";
import { mergeDocuments } from "./medicalRecords/utils/helper";
import { env } from "../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import LoopingVideo from "../components/common/LoopingVideo";
import { getDecodedToken } from "../utils/localStorage";
import { getOpthalPrescriptionDetails } from "./ophthalmology/service";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import ApiVideoConsult from "../api/services/ApiVideoConsult";
import {
  setAppointmentTeleconsultStatus, setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId, setJoinToken
} from "../redux/teleconsultNotificationSlice";

import { ASSETS } from "../assets";
import VitalsBox from "../components/VitalsBox";
import MedicalHistoryBox from "../components/MedicalHistoryBox";
import PrivateNotesBox from "../components/PrivateNotesBox";
import Vaccination from "./vaccination/Vaccination";
import GrowthChart from "./growthChart/GrowthChart";
import Obstetric from "./obstetric/Obstetric";

const { Content, Sider } = Layout;
const { TabPane } = Tabs;

const DoctorWorksurface = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const {
    patient_data, send_path, caseManagerData, videoConsultData,
    fromVoiceRecording, audioBlob, mode, digitizedData, inputText,
    teleconsultAutoJoin, isEditRx, fromRepeatRx
  } = state || {};

  const {
    userId,
    customizedPadLeftList,
    customizedPadRightList: originalCustomizedPadRightList,
    frequencyList,
    timingList,
    profile
  } = useSelector((state) => state.doctors);

  const images = ASSETS.images;

  // --- Logic Mirroring from Prescription.js ---
  const [vitalDrawer, setVitalDrawer] = useState(false);
  const [medicalHistoryDrawer, setMedicalHistoryDrawer] = useState(false);
  const [privateNotesDrawer, setPrivateNotesDrawer] = useState(false);
  const [selectPrivateNotes, setSelectPrivateNotes] = useState(null);
  const [vaccinationDrawer, setVaccinationDrawer] = useState(false);
  const [growthDrawer, setGrowthDrawer] = useState(false);
  const [updatedGynecHistory, setUpdatedGynecHistory] = useState(null);
  const [obstetricDrawer, setObstetricDrawer] = useState(false);
  const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
  const [medicalReportDrawer, setMedicalReportDrawer] = useState(false);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [isEditDocument, setIsEditDocument] = useState(false);
  const fileInputRef = useRef(null);
  const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState("clinical");
  const [generatedDDx, setGeneratedDDx] = useState({ results: [] });
  const [isDDxLoading, setIsDDxLoading] = useState(false);
  const [ddxDrawer, setDDxDrawer] = useState(false);
  const [likeDislike, setLikeDislike] = useState([]);
  const [isDDxGenerated, setIsDDxGenerated] = useState(false);
  const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
  const [tatvaAiKnowMoreDrawer, setTatvaAiKnowMoreDrawer] = useState(false);
  const [groundingKnowMoreDrawer, setGroundingKnowMoreDrawer] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalData, setSubModalData] = useState(null);
  const [addlabparamsDrawer, setAddlabparamsDrawer] = useState(false);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [labParamsData, setLabParamsData] = useState([]);
  const [isAddCustomModuleDrawerVisible, setIsAddCustomModuleDrawerVisible] = useState(false);
  // Local state to manage customizedPadRightList with deleted modules for edit case
  const [customizedPadRightList, setCustomizedPadRightList] = useState(originalCustomizedPadRightList);
  // Track modules that have been explicitly removed from Rx pad to prevent re-adding
  const [removedModuleIds, setRemovedModuleIds] = useState(new Set());

  const handleDrawerVital = useCallback(() => {
    setVitalDrawer(!vitalDrawer);
  }, [vitalDrawer]);

  const handleDrawerMedicalHistory = useCallback(() => {
    setMedicalHistoryDrawer(!medicalHistoryDrawer);
  }, [medicalHistoryDrawer]);

  const handleDrawerPrivateNotes = useCallback(
    (notes) => {
      setSelectPrivateNotes(notes);
      setPrivateNotesDrawer(!privateNotesDrawer);
    },
    [privateNotesDrawer]
  );

  const handleDrawerVaccination = (chartType) => {
    setVaccinationDrawer(!vaccinationDrawer);
  };

  const handleDrawerGrowth = () => {
    setGrowthDrawer(!growthDrawer);
  };

  const handleDrawerUploadDoc = () => {
    setUploadDocDrawer(!uploadDocDrawer);
  };

  const handleDrawerMedicalReport = () => {
    setMedicalReportDrawer(!medicalReportDrawer);
  };

  const handleDrawerObstetric = (obstetricKey) => {
    setObstetricDrawer(!obstetricDrawer);
  };

  const showHideSubModal = (object) => {
    object && setSubModalData(object);
    setIsSubModalOpen(!isSubModalOpen);
  };

  const handleDDxKnowMore = () => {
    setDDxKnowMoreDrawer(!ddxKnowMoreDrawer);
  };

  const handleDDxDrawer = (field) => {
    setDDxDrawer(!ddxDrawer);
  };

  const handleGenRxKnowMore = () => {
    setGenRxKnowMoreDrawer(!genRxKnowMoreDrawer);
  };

  const handleTatvaAiKnowMore = () => {
    setTatvaAiKnowMoreDrawer(!tatvaAiKnowMoreDrawer);
  };

  const handleGroundingKnowMore = () => {
    setGroundingKnowMoreDrawer(!groundingKnowMoreDrawer);
  };

  const showHideBackModal = () => {
    setIsBackModalOpen(!isBackModalOpen);
  };

  const handleCollapsed = (flag) => {
    // Legacy collapsed logic if needed
  };

  const handleSaveGynecHistory = (data) => {
    setUpdatedGynecHistory(data);
  };

  const handleLabParamsUpdate = (data) => {
    setLabParamsData(data);
  };

  const handleViewLabParamsDrawer = () => {
    setViewlabparamsDrawer(!viewlabparamsDrawer);
  };

  const handleAddLabParamsDrawer = () => {
    setAddlabparamsDrawer(!addlabparamsDrawer);
  };

  const handleSwitchToAddLabParams = () => {
    setViewlabparamsDrawer(false);
    setAddlabparamsDrawer(true);
  };

  const handleDeletePopup = () => {
    setShowDeletePopup(!shouldShowDeletePopup);
  };

  // State replication
  const [symptomsData, setSymptomsData] = useState([]);
  const [examinationData, setExaminationData] = useState([]);
  const [surgeriesData, setSurgeriesData] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState([]);
  const [adviceData, setAdviceData] = useState([]);
  const [investigationData, setInvestigationData] = useState([]);
  const [medicationData, setMedicationData] = useState([]);
  const [vitalsData, setVitalsData] = useState([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState([]);
  const [privateNotesData, setPrivateNotesData] = useState(null);
  const [followUpDate, setFollowUpDate] = useState(null);
  const [additionalNote, setAdditionalNote] = useState("");
  const [customModuleContents, setCustomModuleContents] = useState([]);
  const [selectedCarePlan, setSelectedCarePlan] = useState(null);
  const [pillupSwitch, setPillupSwitch] = useState(true);
  const [useVoiceRx, setUseVoiceRx] = useState(false);
  const [useDDX, setUseDDX] = useState(false);
  const startTime = moment().format("YYYY-MM-DD HH:mm:ss");

  const tcmId = (fromRepeatRx || caseManagerData == null) ? 0 : Number(caseManagerData?.tcm_id || caseManagerData?.tcmId || 0);
  const pamId = (fromRepeatRx || caseManagerData == null) ? 0 : caseManagerData?.pam_id || patient_data?.pam_id;
  const consultationDate = caseManagerData?.consultation_date || moment().format("YYYY-MM-DD HH:mm:ss");

  // Feature Flags
  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);
  const isOpthalModuleAccessible = useFeatureIsOn(GB_OPTHAL_MODULE);
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isApexAIAccessable = useFeatureIsOn("cdss");
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);

  const decodedToken = getDecodedToken();
  const tokenData = decodedToken?.result;
  const isGroundingAccessableForZydus = tokenData?.hospital_business_id == env.zydus_business_id && isZydusUserAccessableFromGB;

  const { isVaccinationAccessable, isGrowthChartAccessable, isGynaecHistoryAccessable } = useAccess(patient_data?.ageYears);

  // Redux States for Lists
  const { vitalsPastList, patientBirthWeight } = useSelector((state) => state.vitals);
  const { privateNotesList } = useSelector((state) => state.medicalhistory);
  const { allUploadedDocs } = useSelector((state) => state.uploadDoc);
  const { customModules, hospitalSearchResults } = useSelector((state) => state.customModules);
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);

  // Context API for Child Boxes
  const contextApi = {
    patient_data, send_path, tcmId, pamId, consultationDate,
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
    startTime,
    customModuleContents, setCustomModuleContents,
    pillupSwitch, setPillupSwitch,
    useVoiceRx, setUseVoiceRx,
    useDDX, setUseDDX,
    selectedCarePlan, setSelectedCarePlan,
    markModuleAsRemoved: (moduleId) => setRemovedModuleIds((prev) => new Set([...prev, moduleId])),
    markModuleAsAdded: (moduleId) => setRemovedModuleIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(moduleId);
      return newSet;
    }),
    isDraft: caseManagerData?.is_draft
  };

  // --- Effects & Data Fetching (Replicated from Prescription.js) ---
  useEffect(() => {
    dispatch(resetVitalsState());
    if (userId) {
      dispatch(getModules(userId));
      const hospitalId = decodedToken?.result?.clinic_id;
      if (hospitalId) {
        dispatch(searchModulesByHospital({ hospitalId, moduleName: "", page: 1, limit: 100, departmentId: profile?.dp_id }));
      }
    }
  }, [dispatch, userId]);

  // Combined module list logic
  const allAvailableModules = useMemo(() => {
    const modulesWithUserId = customModules.map((module) => ({ ...module, userId: userId || module.userId }));
    const combined = [...modulesWithUserId];
    const existingIds = new Set(modulesWithUserId.map((m) => m.module_id));
    if (hospitalSearchResults?.modules) {
      hospitalSearchResults.modules.forEach((module) => {
        if (!existingIds.has(module.module_id)) combined.push(module);
      });
    }
    return combined;
  }, [customModules, hospitalSearchResults, userId]);

  // Sync customizedPadRightList
  useEffect(() => {
    const filteredList = originalCustomizedPadRightList.filter(item => !item.is_custom_module || !removedModuleIds.has(item.tmdpm_id));
    setCustomizedPadRightList(filteredList);
  }, [originalCustomizedPadRightList, removedModuleIds]);

  // --- Helper Functions for UI ---
  const CUSTOMIZED_PAD_LEFT_LIST = () => {
    return customizedPadLeftList?.map((e, i) => {
      if (e.tmdpm_id === 1 && e.tmdpm_status === 0) {
        return (
          <div key={i} className="prescription-box-sm p-14 mb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img src={images.vitals} alt="vitals" className="me-3" />
                <div className="title-common">Vitals & Body Composition</div>
              </div>
              <button className="btn d-flex align-items-center btn-text" onClick={handleDrawerVital}>
                <i className={`${vitalsData.length > 0 ? "icon-Edit" : "icon-Add"} me-1 fs-5`}></i>
                <span>{vitalsData.length > 0 ? "Edit" : "Add"}</span>
              </button>
            </div>
            {(vitalsData.length > 0 || vitalsPastList.length > 0 || patientBirthWeight) && (
              <VitalsList mode={caseManagerData !== undefined ? EDIT : ADD} />
            )}
          </div>
        );
      }
      if (e.tmdpm_id === 3 && e.tmdpm_status === 0) {
        return (
          <div key={i} className="prescription-box-sm p-14 mb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img src={images.medicalHistory} alt="History" className="me-3" />
                <div className="title-common">{isGynaecHistoryAccessable ? `Gynec History` : `Medical History`}</div>
              </div>
              <button className="btn d-flex align-items-center btn-text" onClick={handleDrawerMedicalHistory}>
                <i className={`${medicalHistoryData.length > 0 ? "icon-Edit" : "icon-Add"} me-1 fs-5`}></i>
                <span>{medicalHistoryData.length > 0 ? "Edit" : "Add"}</span>
              </button>
            </div>
            {medicalHistoryData.length > 0 && <MedicalHistoryList />}
          </div>
        );
      }
      // Add other modules (Vaccine, Growth, Notes, etc.) following the same pattern as Prescription.js
      return null;
    });
  };

  return (
    <CashManagerContext.Provider value={contextApi}>
      <Layout style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <HeaderV2
          isVaccinationEnabled={isVaccinationAccessable}
          isGrowthChartEnabled={isGrowthChartAccessable}
          pamId={pamId}
          patient_data={patient_data}
        />
        <Layout>
          <Sider width={80} theme="light" style={{ borderRight: "1px solid #e2e8f0", }}>
            <NavPanel
              customizedPadLeftList={customizedPadLeftList}
              isApexAIAccessable={isApexAIAccessable}
              tp_monetization_enable={tp_monetization_enable}
              isFreeVoiceRxUser={isFreeVoiceRxUser}
            />
          </Sider>
          <Content style={{ padding: "24px", overflow: "auto" }}>
            <div className="container-fluid">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="custom-worksurface-tabs"
                style={{ marginBottom: 24 }}
              >
                <TabPane tab="Clinical Examination" key="clinical">
                  <div className="row">
                    <div>
                      {customizedPadRightList?.map((e, i) => {
                        let customModule = allAvailableModules?.find(m => m.module_id === e.tmdpm_id);

                        if (e.tmdpm_id === 5 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><SymptomsBox /></div>;
                        if (e.tmdpm_id === 10 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><ExaminationBox /></div>;
                        if (e.tmdpm_id === 21 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><SurgicalBox /></div>;
                        if (e.tmdpm_id === 11 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><DiagnosisBox /></div>;
                        if (e.tmdpm_id === 12 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><MedicationsBox /></div>;
                        if (e.tmdpm_id === 13 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><AdviceBox /></div>;
                        if (e.tmdpm_id === 14 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><InvestigationBox /></div>;
                        if (e.tmdpm_id === 15 && e.tmdpm_status === 0) return <div key={i} className="prescription-box-sm"><TabFollowUpBox /></div>;

                        if (e.is_custom_module && e.tmdpm_status === 0 && customModule) {
                          return customModule.version === "v2" ?
                            <div key={i} className="prescription-box-sm"><CustomModuleV2 module={customModule} /></div> :
                            <div key={i} className="prescription-box-sm"><CustomModule module={customModule} /></div>;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </TabPane>
                <TabPane tab="Dental Examination" key="dental">
                  <div className="bg-white p-4 rounded-3 shadow-sm" style={{ minHeight: "600px" }}>
                    <RxPadChromeProvider>
                      <RxPadSyncProvider>
                        <BillingCatalogProvider>
                          <ExaminationTab patientId={patient_data?.patient_unique_id} patientAge={patient_data?.ageYears || 30} />
                        </BillingCatalogProvider>
                      </RxPadSyncProvider>
                    </RxPadChromeProvider>
                  </div>
                </TabPane>
                <TabPane tab="Treatment Plan" key="plan">
                  <div className="bg-white p-4 rounded-3 shadow-sm" style={{ minHeight: "600px" }}>
                    <RxPadChromeProvider>
                      <RxPadSyncProvider>
                        <BillingCatalogProvider>
                          <TreatmentPlanTab patientId={pamId} patientAge={patient_data?.patient_age || 30} />
                        </BillingCatalogProvider>
                      </RxPadSyncProvider>
                    </RxPadChromeProvider>
                  </div>
                </TabPane>
              </Tabs>
            </div>
          </Content>
        </Layout>

        {/* Replicated Drawers from Prescription.js */}
        {vitalDrawer && (
          <Drawer closeIcon={false} placement="right" onClose={handleDrawerVital} open={vitalDrawer} width={700}>
            <VitalsBox handleDrawerVital={handleDrawerVital} />
          </Drawer>
        )}
        <Drawer closeIcon={false} placement="right" onClose={handleDrawerMedicalHistory} open={medicalHistoryDrawer} width="75%">
          <MedicalHistoryBox handleDrawerMedicalHistory={handleDrawerMedicalHistory} onSave={handleSaveGynecHistory} />
        </Drawer>
        <Drawer closeIcon={false} placement="right" onClose={handleDrawerPrivateNotes} open={privateNotesDrawer} width={563}>
          <PrivateNotesBox handleDrawerPrivateNotes={handleDrawerPrivateNotes} selectPrivateNotes={selectPrivateNotes} />
        </Drawer>
        {vaccinationDrawer && (
          <Drawer closeIcon={false} placement="right" onClose={handleDrawerVaccination} open={vaccinationDrawer} width="100%">
            <Vaccination handleDrawerVaccination={handleDrawerVaccination} source="Consult" />
          </Drawer>
        )}
        {growthDrawer && (
          <Drawer closeIcon={false} placement="right" onClose={handleDrawerGrowth} open={growthDrawer} width="100%">
            <GrowthChart handleDrawerVaccination={handleDrawerGrowth} />
          </Drawer>
        )}
        {obstetricDrawer && (
          <Drawer closeIcon={false} placement="right" onClose={handleDrawerObstetric} open={obstetricDrawer} width="100%" zIndex={100}>
            <Obstetric obstetricDrawer={obstetricDrawer} handleDrawerObstetric={handleDrawerObstetric} />
          </Drawer>
        )}
        {/* ... Add other drawers similarly ... */}

      </Layout>
    </CashManagerContext.Provider>
  );
};

export default DoctorWorksurface;
