import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Layout,
  Drawer,
  Button,
  Spin,
  message,
  Tabs,
} from "antd";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { isMobile } from "react-device-detect";
import api from "../api/services/axiosService";
import { env } from "../EnvironmentConfig";
import { pdfjs, Document as PdfDocument, Page as PdfPage } from "react-pdf";

import { useSelector, useDispatch } from "react-redux";

import {
  ADD,
  EDIT,
  EXTRA_OPTIONS,
  FAILED_VERIFICATION,
  FREE,
  GB_ZYDUS_USER,
  GB_CARE_PLAN,
  NEO_NATOLOGISTS_DP_ID,
  PAEDIATRICS,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  S_DDX,
  OPTHAL_PAD_MODULE_ID,
  OPTHAL_PAD_MODULE,
  GB_OPTHAL_MODULE,
  GB_VIDEO_CONSULT,
  GB_TELE_CONSULT,
  GB_VOICE_RX_FREE,
  GB_DENTAL_MODULE,
  MESSAGE_KEY,
} from "../utils/constants";
import { FETCH_SMART_RX } from "../utils/constants";

import {
  getPatientBirthWeight,
  getVitals,
  resetVitalsState,
} from "../redux/vitalsSlice";
import {
  getPatientLastHistory,
  listPrivateNotes,
} from "../redux/medicalhistorySlice";

import CashManagerContext from "../context/CashManagerContext";

import HeaderPrescription from "../common/HeaderPrescription";

import VitalsBox from "../components/VitalsBox";
import TabVitalsList from "../components/tab_design/TabVitalsList";
import MedicalHistoryBox from "../components/MedicalHistoryBox";
import TabMedicalHistoryList from "../components/tab_design/TabMedicalHistoryList";
import PrivateNotesBox from "../components/PrivateNotesBox";
import TabPrivateNotesList from "../components/tab_design/TabPrivateNotesList";

// 
// 
// 
import Sider from "antd/es/layout/Sider";
import { Content } from "antd/es/layout/layout";
import Vaccination from "../pages/vaccination/Vaccination";
import GrowthChart from "../pages/growthChart/GrowthChart";
import { viewPatient } from "../redux/appointmentsSlice";
import { useAccess } from "../pages/vaccination/useAccess";
import { getGynecDetails } from "../api/services/ApiGynec";
import Obstetric from "../pages/obstetric/Obstetric";
import TabObstetricList from "../pages/obstetric/components/obstetricList/TabObstetricList";
import { fetchObstetricDetails } from "../pages/obstetric/service";
import { addObstetricDetails } from "../redux/obstetricSlice";
import {
  setAllUploadedDocs,
  setPatientUploadedDocs,
  setUploadDocCategories,
  zydusDocsList,
  zydusRadioList,
} from "../redux/uploadDocSlice";
import {
  fetchAllDocumentCategories,
  fetchAllPatientDocs,
  fetchDocsUploadedByPatient,
} from "../pages/medicalRecords/service";
import TabUploadDocumentList from "../pages/medicalRecords/components/uploadDocumentList/TabUploadDocumentList";
import UploadDocument from "../pages/medicalRecords/UploadDocument";
import MedicalRecords from "../pages/medicalRecords/MedicalRecords";
import TabLabParametersList from "../components/tab_design/TabLabParametersList";
import LabParams from "../components/LabParams";
import ViewLabParam from "../components/ViewLabParams";
import UploadDocPopup from "../pages/medicalRecords/components/uploadDocPopup/UploadDocPopup";
import {
  generateUniqueFileName,
  getCorrectedFileName,
  mergeDocuments,
} from "../pages/medicalRecords/utils/helper";
import TabDDxList from "../components/tab_design/TabDDxList";
import {
  setIsApexAISelected,
  setIsDDxReadyToGenerate,
  setShowSCPopup,
  setSymptomCollector,
  setSelectAutofill,
} from "../redux/ddxSlice";
import DifferentialDiagnosisDrawer from "../components/DifferentialDiagnosisDrawer";
import CommonModal from "../common/CommonModal";
import DDxKnowMore from "../components/DDxKnowMore";
import { getDDxDetails } from "../api/services/ApiDDx";
import { getDecodedToken } from "../utils/localStorage";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import {
  errorMessage,
  getClinicName,
  shouldMonetizationDisabled,
  trackEvent,
  getDeviceSdkData,
  getTokenData,
  isVoiceRxFree,
} from "../utils/utils";

import ConsultationHeader from "./ConsultationHeader";
import ConsultationSidebar from "./ConsultationSidebar";
import TabRxCanvas from "../pages/tabRx/components/TabRxCanvas";
import { uploadTabRxFiles, upsertTabRxRx } from "../pages/tabRx/services/tabRxService";
import { getMetadata, getTemplates } from "../pages/tabRx/services/templateService";
import ApiVideoConsult from "../api/services/ApiVideoConsult";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import TabVoiceRx from "../components/tab_design/TabVoiceRx";
import GenRxKnowMore from "../components/GenRxKnowMore";
import ConsultationDrawer from "../components/ConsultationDrawer";
import TatvaAiKnowMore from "../components/TatvaAiKnowMore";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import { checkCredits } from "../redux/monetizationSlice";
import { services, setCustomizedPadLists } from "../redux/doctorsSlice";
import SCPopup from "../components/SCPopup";
import { fetchSymptomsCollectorData, setAddToRx } from "../api/services/ApiGenRx";
import {
  getCarePlanNames,
  getCarePlanAssignments,
  assignCarePlan,
  hasExistingCarePlanForConsultation,
  updateCarePlanName,
} from "../pages/smartSync/services/carePlanService";
import TabCarePlanList from "../components/tab_design/TabCarePlanList";
import GroundingBox from "../components/GroundingBox";
import GroundingKnowMore from "../components/GroundingKnowMore";
import {
  getModules,
  searchModulesByHospital,
} from "../redux/customModuleSlice";
import TabRxHeader from "../pages/tabRx/components/tabRxHeader/TabRxHeader";
import ClinicalExaminationContent from "./ClinicalExaminationContent";
import { ExaminationTab } from "./dental/examination/ExaminationTab";
import { ClipboardText } from "iconsax-reactjs";
import { TPMedicalIcon } from "./dental/tp-ui/medical-icons";

import VideoConsultModal from "../components/VideoConsultModal";
import { addCaseManager, editCaseManager, viewCaseManager } from "../redux/caseManagerSlice";
import {
  setAppointmentTeleconsultStatus,
  setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId,
  setJoinToken,
} from "../redux/teleconsultNotificationSlice";
import { saveDentalExamination, selectDentalExamination } from "../redux/dentalExaminationSlice";
import { saveOralExaminationThunk, patchOralExaminationThunk } from "../redux/oralExaminationSlice";
import { transformToothStateToApi } from "./dental/lib/examination-helpers";
import { renderPrintPayloadToBlob } from "../utils/printPayload";
import { buildConsultationPreviewPrintPayload } from "../utils/buildConsultationPreviewPrintPayload";
import { resolveDentalOralForPrint } from "../utils/resolveDentalOralPrintData";
import { ASSETS } from "../assets";
import { ToothIcon } from "./dental/ToothIcon";

const worker = require("pdfjs-dist/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = worker;

const {
  vitalsWhite,
  vitalsDark,
  medicalHistoryWhite,
  medicalHistoryDark,
  vaccinationWhite,
  vaccination: vaccinationDark,
  alerticon: alertIcon,
  growthChart,
  growthChartDark,
  privateNotesWhite,
  privateNotesDark,
  apexai: apexAIImg,
  blinkingdot: blinkingDot,
  ddxTabVector: ddxVector,
  ddx: ddxImg,
  tabDdxInactive: ddxInactiveImg,
  genRxMic: genRxImg,
  voiceRxDefault,
  obstetricWhite,
  obstetricDark,
  uploadDocWhite: medicalRecordsWhite,
  uploadDocDark: medicalRecordsDark,
  labParametersWhite: labParamsWhite,
  labParameters: labParamsDark,
  groundingWhite: groundingImgWhite,
  groundingPurple: groundingImgDark,
  carePlan: carePlanIcon,
  carePlanActiveSolid: carePlanIconDark,
  notesWhite,
  docsWhite,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function ConsultationLayout({ children, headerProps }) {
  const {
    customizedPadLeftList,
    customizedPadRightList: originalCustomizedPadRightList,
    frequencyList,
    timingList,
    userId,
    opthalModuleAutoAdded,
    defaultPrintSettings,
  } = useSelector((state) => state.doctors);

  // Local state to manage customizedPadRightList with deleted modules for edit case
  const [customizedPadRightList, setCustomizedPadRightList] = useState(
    originalCustomizedPadRightList,
  );
  // Track modules that have been explicitly removed from Rx pad to prevent re-adding
  const [removedModuleIds, setRemovedModuleIds] = useState(new Set());
  const { planDetails } = useSelector((state) => state.subscription);
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isApexAIAccessable = useFeatureIsOn("cdss");
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isVideoConsultAccessible = useFeatureIsOn(GB_VIDEO_CONSULT);
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const isDentalEnabled = useFeatureIsOn(GB_DENTAL_MODULE);
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);
  const { selectedVitalsList, vitalsPastList, patientBirthWeight } =
    useSelector((state) => state.vitals);
  const { privateNotesList } = useSelector((state) => state.medicalhistory);
  const {
    obstetricDetails: allObstetricDetails,
    isObstetricDetailsFetched,
    isNavigateToObstetric,
  } = useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const { examinationHistory = [] } = obstetricDetails || [];
  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);
  const isOpthalModuleAccessible = useFeatureIsOn(GB_OPTHAL_MODULE);
  const shouldShowAncHistory = obstetricDetails?.ancHistory?.find(
    (item) =>
      !item?.deleted &&
      (item?.dueDate ||
        item?.status === "Completed" ||
        item?.notes ||
        item?.enablePrint),
  );

  const shouldShowImmunisation = obstetricDetails?.immunisationHistory?.find(
    (item) =>
      !item?.deleted &&
      (item?.givenDate ||
        item?.status === "Given" ||
        item?.notes ||
        item?.enablePrint),
  );
  const { allUploadedDocs, uploadDocCategories } = useSelector(
    (state) => state.uploadDoc,
  );
  const {
    isApexAISelected,
    showSCPopup,
    isDDxReadyToGenerate,
    isAutofillSelected,
    selectedSymptomsCollector,
    symptomCollector,
  } = useSelector((state) => state.ddx);
  const { profile } = useSelector((state) => state.doctors);
  const { isLoading } = useSelector((state) => state.uploadDoc);
  const { customModules, hospitalSearchResults } = useSelector(
    (state) => state.customModules,
  );
  const dentalExamination = useSelector(selectDentalExamination);
  const oralExamination = useSelector((state) => state.oralExamination);
  const decodedToken = getDecodedToken();
  const tokenData = decodedToken?.result;
  const isGroundingAccessableForZydus =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  const dispatch = useDispatch();

  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location;

  // Create a combined module list that includes both user's modules and hospital-wide modules
  // This ensures deleted modules are still available when editing a prescription
  const allAvailableModules = React.useMemo(() => {
    // Add userId to each module in customModules
    const modulesWithUserId = customModules.map((module) => ({
      ...module,
      userId: userId || module.userId, // Use existing userId if available, otherwise add from Redux
    }));

    const combined = [...modulesWithUserId];
    const existingIds = new Set(modulesWithUserId.map((m) => m.module_id));

    // Add hospital modules that aren't already in the user's list
    if (hospitalSearchResults?.modules) {
      hospitalSearchResults.modules.forEach((module) => {
        if (!existingIds.has(module.module_id)) {
          combined.push(module);
        }
      });
    }

    return combined;
  }, [customModules, hospitalSearchResults, userId]);
  const {
    patient_data,
    caseManagerData,
    videoConsultData,
    fromVoiceRecording,
    audioBlob,
    mode,
    digitizedData,
    inputText,
    send_path,
    tcm_id,
    pam_id,
    fromEditRx,
    smartRxFilesData,
  } = state || {};


  const chartType = state?.chartType;
  const tcmId =
    caseManagerData !== undefined
      ? caseManagerData.tcm_id
      : tcm_id || 0;
  const pamId =
    caseManagerData !== undefined
      ? caseManagerData.pam_id
      : pam_id || patient_data?.pam_id || 0;
  const consultationDate =
    caseManagerData !== undefined
      ? caseManagerData.consultation_date
      : moment().format("YYYY-MM-DD HH:mm:ss");

  const [currentTcmId, setCurrentTcmId] = useState(tcmId);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewPdfFile, setPreviewPdfFile] = useState(null);
  const [previewDivWidth, setPreviewDivWidth] = useState(550);
  const [previewNumPages, setPreviewNumPages] = useState(0);

  const previewDivRef = useRef(null);

  useEffect(() => {
    if (previewDivRef.current) {
      setPreviewDivWidth(previewDivRef.current.offsetWidth);
    }
  }, [isPreviewDrawerOpen, previewDivRef.current]);

  useEffect(() => {
    setCurrentTcmId(tcmId);
  }, [tcmId]);

  useEffect(() => {
    dispatch(resetVitalsState());
  }, []);

  // When coming from edit flows that only passed identifiers, fetch caseManagerData here
  useEffect(() => {
    if (!fromEditRx || caseManagerData || !patient_data || !tcmId) {
      return;
    }

    const fetchCaseManagerData = async () => {
      try {
        const sendData = {
          patient_unique_id: patient_data?.patient_unique_id || 0,
          tcm_id: tcmId,
        };
        const action = await dispatch(viewCaseManager(sendData));
        if (action.meta.requestStatus === "fulfilled") {
          navigate(location.pathname, {
            replace: true,
            state: {
              ...state,
              caseManagerData: action.payload,
            },
          });
        } else {
          message.error(action.error || "Failed to load prescription");
        }
      } catch (e) {
        console.error("Error fetching case manager data for TabRx:", e);
        message.error("Failed to load prescription");
      }
    };

    fetchCaseManagerData();
  }, [fromEditRx, caseManagerData, patient_data, tcmId, dispatch, navigate, location, state]);

  // Clear removedModuleIds for modules that are explicitly added back via Redux
  // This handles the case when a user adds a module back via "Add to Rx"
  useEffect(() => {
    if (
      removedModuleIds.size > 0 &&
      originalCustomizedPadRightList?.length > 0
    ) {
      const modulesInRedux = new Set(
        originalCustomizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id),
      );

      // Check if any removed modules are now back in Redux (explicitly added)
      const needsUpdate = Array.from(removedModuleIds).some((moduleId) =>
        modulesInRedux.has(moduleId),
      );

      if (needsUpdate) {
        setRemovedModuleIds((prev) => {
          const newSet = new Set(prev);
          let hasChanges = false;
          modulesInRedux.forEach((moduleId) => {
            if (newSet.has(moduleId)) {
              newSet.delete(moduleId);
              hasChanges = true;
            }
          });
          return hasChanges ? newSet : prev;
        });
      }
    }
  }, [originalCustomizedPadRightList]);

  // Update local customizedPadRightList when Redux state changes
  // Filter out any modules that are in removedModuleIds to prevent them from reappearing
  useEffect(() => {
    const filteredList = originalCustomizedPadRightList.filter(
      (item) => !item.is_custom_module || !removedModuleIds.has(item.tmdpm_id),
    );
    setCustomizedPadRightList(filteredList);
  }, [originalCustomizedPadRightList, removedModuleIds]);

  // Reconstruct customizedPadRightList to include deleted modules when editing a prescription
  useEffect(() => {
    if (
      caseManagerData?.moduleContents?.length > 0 &&
      allAvailableModules.length > 0
    ) {
      // Get module IDs from the prescription content
      const moduleIdsInPrescription = caseManagerData.moduleContents.map(
        (content) => content.module_id,
      );

      // Get module IDs already in the right list (check both Redux and local state)
      const existingModuleIdsInRedux = new Set(
        originalCustomizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id),
      );
      const existingModuleIdsInLocal = new Set(
        customizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id),
      );
      // Combine both sets to get all existing module IDs
      const existingModuleIds = new Set([
        ...existingModuleIdsInRedux,
        ...existingModuleIdsInLocal,
      ]);

      // Find modules that are in the prescription but not in the right list (deleted modules)
      // Exclude modules that have been explicitly removed from Rx pad
      const missingModules = moduleIdsInPrescription.filter(
        (moduleId) =>
          !existingModuleIds.has(moduleId) && !removedModuleIds.has(moduleId),
      );

      if (missingModules.length > 0) {
        // Create pad entries for missing modules
        const missingModuleEntries = missingModules
          .map((moduleId) => {
            // Try to find the module definition
            const moduleDefinition = allAvailableModules.find(
              (m) => m.module_id === moduleId,
            );

            if (moduleDefinition) {
              return {
                tmdpm_id: moduleDefinition.module_id,
                tmdpm_name: moduleDefinition.name,
                tmdpm_type: "custom_module",
                tmdpm_status: 0, // Enabled
                is_custom_module: true,
              };
            }

            // If module definition not found, try to get name from moduleContents
            const moduleContent = caseManagerData.moduleContents.find(
              (content) => content.module_id === moduleId,
            );

            if (moduleContent) {
              console.warn(
                `Module definition not found for ${moduleId}, using fallback from moduleContents`,
              );
              return {
                tmdpm_id: moduleId,
                tmdpm_name: moduleContent.module_name || moduleId,
                tmdpm_type: "custom_module",
                tmdpm_status: 0, // Enabled
                is_custom_module: true,
              };
            }

            // Last resort: create entry with just the ID
            console.error(
              `Cannot find module ${moduleId} in allAvailableModules or moduleContents`,
            );
            return {
              tmdpm_id: moduleId,
              tmdpm_name: `Module ${moduleId}`,
              tmdpm_type: "custom_module",
              tmdpm_status: 0,
              is_custom_module: true,
            };
          })
          .filter(Boolean);

        // Add missing modules to the right list
        // Merge with current local state to preserve any modules already added
        const currentModuleIds = new Set(
          customizedPadRightList
            .filter((item) => item.is_custom_module)
            .map((item) => item.tmdpm_id),
        );
        // Only add modules that aren't already in the local state
        const newModuleEntries = missingModuleEntries.filter(
          (entry) => !currentModuleIds.has(entry.tmdpm_id),
        );
        if (newModuleEntries.length > 0) {
          const updatedRightList = [
            ...customizedPadRightList,
            ...newModuleEntries,
          ];
          setCustomizedPadRightList(updatedRightList);
        }
      }
    }
  }, [
    caseManagerData,
    allAvailableModules,
    originalCustomizedPadRightList,
    removedModuleIds,
    customizedPadRightList,
  ]);

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
  const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
  const [obstetricDrawer, setObstetricDrawer] = useState(false);
  const [isGrowthChart, setIsGrowthChart] = useState(false);
  const [shouldShowApexPopup, setShowApexPopup] = useState(true);
  const [shouldShowGenRxPopup, setShowGenRxPopup] = useState(true);
  const [shouldShowTatvaAiPopup, setShowTatvaAiPopup] = useState(true);
  const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
  const {
    isVaccinationAccessable,
    isGrowthChartAccessable,
    isGynaecHistoryAccessable,
  } = useAccess(caseManagerData?.patient_data?.patient_age);
  const [updatedGynecHistory, setUpdatedGynecHistory] = useState(null);
  const [labParamsData, setLabParamsData] = useState(null);
  const [generatedDDx, setGeneratedDDx] = useState({ results: [] });
  const [likeDislike, setLikeDislike] = useState([]);
  const [isDDxGenerated, setIsDDxGenerated] = useState(false);
  const [isDDxLoading, setIsDDxLoading] = useState(false);
  const [customModuleContents, setCustomModuleContents] = useState([]);
  const [pillupSwitch, setPillupSwitch] = useState(true);
  const [showSCBanner, setShowSCBanner] = useState(false);

  const { servicesList } = useSelector((state) => state.doctors);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalData, setSubModalData] = useState(null);
  const [useVoiceRx, setUseVoiceRx] = useState(false);
  const [useDDX, setUseDDX] = useState(false);
  const [selectedCarePlan, setSelectedCarePlan] = useState(null);
  const [carePlanPlaceholder, setCarePlanPlaceholder] = useState(undefined);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [videoConsultUrl, setVideoConsultUrl] = useState(null);
  const [videoConsultAction, setVideoConsultAction] = useState(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [isTeleconsultJoinLoading, setIsTeleconsultJoinLoading] = useState(false);

  // Check if video consultation is available for this patient
  const isVideoConsultAvailable =
    isVideoConsultAccessible &&
    videoConsultData?.pam_status_type_appointment === 1;
  const isTeleConsultAvailableType2 =
    isTeleConsultEnabled && videoConsultData?.pam_status_type_appointment === 2;

  const [isSelectLetterHead, setIsSelectLetterHead] = useState(false);
  const [isEndVisitLoading, setIsEndVisitLoading] = useState(false);
  const [activeDentalTab, setActiveDentalTab] = useState("clinical");
  const [loadPrevOpthalSignal, setLoadPrevOpthalSignal] = useState(0);



  const showHideSubModal = (object) => {
    object && setSubModalData(object);
    setIsSubModalOpen(!isSubModalOpen);
  };

  const contextApi = {
    patient_data,
    tcmId,
    pamId,
    consultationDate,
    symptomsData,
    setSymptomsData,
    examinationData,
    setExaminationData,
    surgeriesData,
    setSurgeriesData,
    diagnosisData,
    setDiagnosisData,
    adviceData,
    setAdviceData,
    investigationData,
    setInvestigationData,
    medicationData,
    setMedicationData,
    vitalsData,
    setVitalsData,
    medicalHistoryData,
    setMedicalHistoryData,
    privateNotesData,
    setPrivateNotesData,
    followUpDate,
    setFollowUpDate,
    additionalNote,
    setAdditionalNote,
    startTime,
    customModuleContents,
    setCustomModuleContents,
    customizedPadRightList,
    setCustomizedPadRightList,
    pillupSwitch,
    setPillupSwitch,
    markModuleAsRemoved: (moduleId) => {
      setRemovedModuleIds((prev) => new Set([...prev, moduleId]));
      // Note: customModuleContents is already updated in the component's handleRemoveFromRxPad
      // We don't need to update it here to avoid double removal
    },
    markModuleAsAdded: (moduleId) => {
      // Remove module from removedModuleIds when explicitly added back to Rx pad
      setRemovedModuleIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    },
    showHideSubModal,
    useVoiceRx,
    setUseVoiceRx,
    useDDX,
    setUseDDX,
    selectedCarePlan,
    setSelectedCarePlan,
  };

  const [collapsed, setCollapsed] = useState(false);
  const [collapsedFlag, setCollapsedFlag] = useState(null);
  const [vitalDrawer, setVitalDrawer] = useState(false);
  const [medicalHistoryDrawer, setMedicalHistoryDrawer] = useState(false);
  const [privateNotesDrawer, setPrivateNotesDrawer] = useState(false);
  const [selectPrivateNotes, setSelectPrivateNotes] = useState(null);
  const [vaccinationDrawer, setVaccinationDrawer] = useState(false);
  const [growthDrawer, setGrowthDrawer] = useState(false);
  const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
  const [medicalReportDrawer, setMedicalReportDrawer] = useState(false);
  const [labReportID, setLabReportID] = useState(null);
  const [labParamsDrawer, setLabParamsDrawer] = useState(false);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [shouldShowUploadDocPopup, setShowUploadDocPopup] = useState(false);
  const [ddxDrawer, setDDxDrawer] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [isEditDocument, setIsEditDocument] = useState(false);
  const fileInputRef = useRef(null);
  const [isFileSizeError, setIsFileSizeError] = useState(false);
  const [isFileLimitError, setIsFileLimitError] = useState(false);
  const [isFileTypeError, setIsFileTypeError] = useState(null);
  const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
  const [groundingKnowMoreDrawer, setGroundingKnowMoreDrawer] = useState(false);
  const [isGenRxDrawerVisible, setIsGenRxDrawerVisible] = useState(
    caseManagerData?.smart_prescription_filename ||
    (inputText &&
      typeof inputText === "string" &&
      inputText.trim().length > 0) ||
    (fromVoiceRecording && audioBlob) ||
    false,
  );
  const [tatvaAiKnowMoreDrawer, setTatvaAiKnowMoreDrawer] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);

  const getAllObstetricDetails = async () => {
    if (!patient_data?.patient_unique_id) return;
    const obstetricResponse = await fetchObstetricDetails(
      patient_data.patient_unique_id,
    );
    if (obstetricResponse) {
      dispatch(addObstetricDetails(obstetricResponse));
    }
  };

  const baseUrl = env.lab_params_api_url;

  const getAllPatientDocs = async () => {
    if (!patient_data?.patient_unique_id) return;
    const doctorUploadedDocs = await fetchAllPatientDocs(
      patient_data.patient_unique_id,
    );
    const patientUploadedDocs = await fetchDocsUploadedByPatient(
      patient_data.patient_unique_id,
    );
    dispatch(setPatientUploadedDocs(patientUploadedDocs));
    dispatch(
      setAllUploadedDocs(
        mergeDocuments(doctorUploadedDocs, patientUploadedDocs),
      ),
    );
    const tokenData = decodedToken?.result;
    if (
      tokenData?.hospital_business_id == env.zydus_business_id &&
      isZydusUserAccessableFromGB &&
      patient_data.mrno != null &&
      patient_data.mrno != undefined
    ) {
      dispatch(
        zydusDocsList({ mrno: patient_data.mrno, um_id: tokenData?.user_id }),
      );
      dispatch(
        zydusRadioList({ mrno: patient_data.mrno, um_id: tokenData?.user_id }),
      );
    }
  };

  const getAllDocumentCategories = async () => {
    const response = await fetchAllDocumentCategories();
    dispatch(setUploadDocCategories(response));
  };

  // Fetch custom modules on component mount
  useEffect(() => {
    const fetchModules = async () => {
      if (userId) {
        // Always fetch user's own modules
        await dispatch(getModules(userId));

        // If editing a case with custom modules, also fetch hospital-wide modules
        // This ensures deleted modules are still available for rendering
        if (caseManagerData?.moduleContents?.length > 0) {
          const hospitalId = decodedToken?.result?.clinic_id;
          if (hospitalId) {
            await dispatch(
              searchModulesByHospital({
                hospitalId,
                moduleName: "",
                page: 1,
                limit: 100,
                departmentId: profile?.dp_id,
              }),
            );
          }
        }
      }
    };

    fetchModules();
  }, [userId, dispatch]);

  useEffect(() => {
    if (isAutofillSelected) {
      setShowShimmer(true);
      if (selectedSymptomsCollector?.medicalHistory?.length > 0) {
        openCollapsed(2);
      }
      const timer = setTimeout(() => {
        setShowShimmer(false);
      }, 1000); // 1 seconds

      return () => clearTimeout(timer); // Cleanup timeout
    }
  }, [isAutofillSelected]);

  useEffect(() => {
    if (uploadDocCategories?.length === 0) {
      getAllDocumentCategories();
    }
    if (patient_data?.patient_unique_id && allUploadedDocs?.length === 0) {
      getAllPatientDocs();
    }
  }, []);

  useEffect(() => {
    if (!patient_data?.patient_unique_id) return;
    const sendData = {
      patient_unique_id: patient_data?.patient_unique_id,
    };
    dispatch(viewPatient(sendData));
  }, [patient_data?.patient_unique_id]);

  useEffect(() => {
    getSymptomsCollectorData();
  }, []);

  useEffect(() => {
    if (isGynaecHistoryAccessable) {
      getAllObstetricDetails();
    }
  }, [isGynaecHistoryAccessable]);

  useEffect(() => {
    if (isCarePlanEnabled) {
      fetchCarePlanNames();
    }
  }, [isCarePlanEnabled]);

  useEffect(() => {
    if (!isOpthalModuleAccessible) {
      return;
    }
    if (
      !Array.isArray(customizedPadRightList) ||
      customizedPadRightList.length === 0
    ) {
      return;
    }
    if (
      customizedPadRightList.some(
        (item) => item?.tmdpm_id === OPTHAL_PAD_MODULE_ID,
      )
    ) {
      return;
    }
    if (opthalModuleAutoAdded) {
      return;
    }
    const medicationsIndex = customizedPadRightList.findIndex(
      (item) => item?.tmdpm_id === 12,
    );
    const nextRightList = [...customizedPadRightList];
    if (medicationsIndex >= 0) {
      nextRightList.splice(medicationsIndex + 1, 0, { ...OPTHAL_PAD_MODULE });
    } else {
      nextRightList.push({ ...OPTHAL_PAD_MODULE });
    }
    dispatch(
      setCustomizedPadLists({
        right: nextRightList,
        opthalModuleAutoAdded: true,
      }),
    );
  }, [customizedPadRightList, isOpthalModuleAccessible, opthalModuleAutoAdded]);

  useEffect(() => {
    if (caseManagerData !== undefined) {
      if (
        caseManagerData.vitals?.length > 0 &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 1 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        if (tcmId !== 0) {
          const updatedData = caseManagerData.vitals.map((e, i) => {
            return {
              ...e,
              systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
              diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
            };
          });
          setVitalsData(updatedData);
        }
      }
      if (
        caseManagerData.medical_history?.length > 0 &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 3 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setMedicalHistoryData(
          JSON.parse(JSON.stringify(caseManagerData.medical_history)),
        );
      }
      if (
        caseManagerData.symptoms?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 5 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setSymptomsData(caseManagerData.symptoms);
      }
      if (
        caseManagerData.examination?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 10 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setExaminationData(caseManagerData.examination);
      }
      if (
        caseManagerData?.surgeries?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 21 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setSurgeriesData(caseManagerData.surgeries);
      }
      if (
        caseManagerData.diagnosis?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 11 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setDiagnosisData(caseManagerData.diagnosis);
      }
      if (
        caseManagerData.medicine?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 12 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        const updatedData = caseManagerData.medicine.map((e) => {
          const medicineUnit = e?.medicineUnit.map((e1) => {
            return {
              key: JSON.stringify({ ...e1 }),
              value: e1.tmu_id,
              label: <>{e1.tmu_title}</>,
            };
          });

          const unitObj = medicineUnit
            ? medicineUnit.find((x) => x.value == e.tmm_unit)
            : null;
          const frequencyObj = frequencyList.find(
            (x) => x.tmf_id == e.tmm_freq_type,
          );
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          return {
            ...e,
            tmm_unit_name:
              unitObj && unitObj !== undefined
                ? JSON.parse(unitObj.key).tmu_title
                : "",
            tmm_freq_type_name:
              frequencyObj !== undefined ? frequencyObj.tmf_title : "",
            tmf_block_val:
              frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            medicineUnit: medicineUnit,
            tmm_days_duration_type: EXTRA_OPTIONS.some(
              (x) => x.value == e.tmm_duration_type,
            )
              ? e.tmm_duration_type
              : e.tmm_days
                ? `${e.tmm_days} ${e.tmm_duration_type}`
                : "",
            unique_id: uuidv4(),
          };
        });
        setMedicationData([...updatedData]);
      }
      if (
        caseManagerData.advice?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 13 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setAdviceData(caseManagerData.advice);
      }
      if (
        caseManagerData.investigation?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 14 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setInvestigationData(caseManagerData.investigation);
      }
      if (
        caseManagerData.follow_up_date &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 15 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setFollowUpDate(caseManagerData.follow_up_date);
      }
      if (
        caseManagerData.visit_advice &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 15 && e.tmdpm_status === 0,
        ) !== -1
      ) {
        setAdditionalNote(caseManagerData.visit_advice);
      }
      setPillupSwitch(caseManagerData?.pillup_fulfilment == 1 ? true : false);
    }
  }, []);

  // Separate useEffect to handle customModuleContents after customModules are loaded
  useEffect(() => {
    if (caseManagerData?.moduleContents?.length) {
      // Don't filter out modules - they should all be rendered even if deleted
      // The allAvailableModules list will include deleted modules from hospital search
      const normalizedContents = caseManagerData.moduleContents.map(
        (moduleContent) => {
          // Try to find matching module in allAvailableModules (may not exist if deleted)
          const matchingModule = allAvailableModules?.find(
            (cm) => String(cm.module_id) === String(moduleContent.module_id),
          );

          // If no matching module found, use the moduleContent as-is (preserve original data)
          if (!matchingModule) {
            return moduleContent;
          }

          // Normalize content based on module version
          let normalizedContent = [];

          if (matchingModule?.version === "v2") {
            // For v2, preserve all existing fields and only add missing namedFields
            normalizedContent = (moduleContent.content || []).map((item) => {
              // Start with all existing fields from the item (preserve original data)
              const normalizedItem = { ...item };

              // Only add missing namedFields, don't overwrite existing ones
              matchingModule.namedFields?.forEach((field) => {
                if (!(field.fieldName in normalizedItem)) {
                  normalizedItem[field.fieldName] = "";
                }
              });

              return normalizedItem;
            });
          } else {
            // For v1, normalize to {title, notes} structure
            normalizedContent = (moduleContent.content || []).map((item) => {
              // If item already has title and notes, use them (preserve original)
              if (item.title !== undefined || item.notes !== undefined) {
                return {
                  title: item.title || "",
                  notes: item.notes || "",
                };
              }
              // Otherwise, try to convert from other structures
              // Get first two string values as title and notes
              const values = Object.values(item).filter(
                (v) => typeof v === "string" && v.trim().length > 0,
              );
              return {
                title: values[0] || "",
                notes: values[1] || "",
              };
            });
          }

          return {
            ...moduleContent,
            content: normalizedContent,
          };
        },
      );
      setCustomModuleContents(normalizedContents);
    }
  }, [caseManagerData?.moduleContents, allAvailableModules]);

  const getSymptomsCollectorData = async () => {
    const payload = {
      um_id: String(userId),
      patient_unique_id: String(patient_data?.patient_unique_id),
      hm_id: String(decodedToken?.result?.clinic_id),
      pam_id:
        patient_data !== undefined && patient_data.pam_id !== undefined
          ? String(patient_data.pam_id)
          : caseManagerData !== undefined
            ? String(caseManagerData.pam_id)
            : 0,
    };
    const response = await fetchSymptomsCollectorData(payload);
    if (response && Object.keys(response)?.length > 0) {
      dispatch(
        setSymptomCollector({
          ...response?.summary_json_doctor,
          _id: response?._id,
        }),
      );
      setShowSCBanner(true);
      if (patient_data?.pam_status === "0") {
        dispatch(setShowSCPopup(true));
      }
    }
  };

  // Drawer Vitals
  const handleDrawerVital = useCallback(() => {
    setCollapsedFlag(1);
    setVitalDrawer(!vitalDrawer);
  }, [collapsedFlag, vitalDrawer]);

  // Drawer Medical History
  const handleDrawerMedicalHistory = useCallback(() => {
    setCollapsedFlag(2);
    setMedicalHistoryDrawer(!medicalHistoryDrawer);
  }, [collapsedFlag, medicalHistoryDrawer]);

  // Drawer Private Notes
  const handleDrawerPrivateNotes = useCallback(
    (data) => {
      setCollapsedFlag(4);
      setSelectPrivateNotes(data);
      setPrivateNotesDrawer(!privateNotesDrawer);
    },
    [privateNotesDrawer, selectPrivateNotes],
  );

  // Drawer Vaccination
  const handleDrawerVaccination = (chartType) => {
    setCollapsedFlag(3);
    setCollapsed(false);
    setVaccinationDrawer(!vaccinationDrawer);
    if (!vaccinationDrawer) {
      trackEvent("TP_Vac_Module", {
        patientName: patient_data?.pm_fullname || "",
        patientId: patient_data?.patient_unique_id || "",
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        doctorName: profile?.um_name,
        source: chartType ? "Patient Details" : "Consult",
      });
    }
  };

  // Drawer Growth Chart
  const handleDrawerGrowth = () => {
    setCollapsedFlag(5);
    setCollapsed(false);
    setGrowthDrawer(!growthDrawer);
    setIsGrowthChart(!isGrowthChart);
  };

  // Drawer Obstetric
  const handleDrawerObstetric = (obstetricKey) => {
    setCollapsedFlag(6);
    setObstetricDrawer(
      typeof obstetricKey === "string" ? obstetricKey : !obstetricDrawer,
    );
  };

  const getLabParams = async () => {
    try {
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      const cleanedToken = token.replace(/['"]+/g, "");
      const response = await axios.get(
        `${baseUrl}/api/v1/lab-parameters/results/${patient_data?.patient_unique_id}`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        },
      );
      setLabParamsData(response.data?.data?.results || []);
    } catch (error) {
      console.error("Error fetching lab params:", error);
    }
  };

  useEffect(() => {
    getLabParams();
  }, []);

  const showHideBackModal = () => {
    setIsBackModalOpen(!isBackModalOpen);
  };

  // Function to update lab params data in parent component when saved
  const handleLabParamsUpdate = () => {
    getLabParams();
  };

  // Drawer Medical History
  const handleAddLabParamsDrawer = () => {
    setCollapsedFlag(8);
    setLabParamsDrawer(!labParamsDrawer);
  };

  const handleAddClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files) {
      const filesData = Array.from(files);
      if (filesData.length > 0) {
        const updatedFiles = [];
        filesData.forEach((file) => {
          const cleanFileName = getCorrectedFileName(file?.name || "");
          // Check if the file is an image and if its name follows typical camera-captured file patterns
          const isCapturedFromCamera =
            (file.type === "image/jpeg" ||
              file.type === "image/png" ||
              file.type === "image/jpg") &&
            (cleanFileName === "image.jpg" ||
              cleanFileName === "image.png" ||
              cleanFileName === "image.jpeg");

          let newFile = file;

          if (isCapturedFromCamera) {
            // Generate a unique file name for camera-captured images
            const uniqueFileName = generateUniqueFileName(file);
            newFile = new File([file], uniqueFileName, { type: file.type });
          } else {
            // If the file name had spaces, create a new file with spaces removed
            newFile = new File([file], cleanFileName, { type: file.type });
          }

          updatedFiles.push(newFile);
        });
        setFilesData(updatedFiles);
        handleDrawerUploadDoc();
      }
    }
    event.target.value = null;
  };

  // Drawer Upload Document
  const handleDrawerUploadDoc = () => {
    setCollapsedFlag(7);
    setUploadDocDrawer(!uploadDocDrawer);
  };

  const handleDeletePopup = () => {
    setShowDeletePopup(true);
  };

  const handleUploadDocPopup = () => {
    setShowUploadDocPopup((prev) => !prev);
  };

  // Drawer Medical Report
  const handleDrawerMedicalReport = () => {
    setMedicalReportDrawer(!medicalReportDrawer);
  };

  useEffect(() => {
    if (chartType === "vaccination") {
      handleDrawerVaccination(chartType);
    } else if (chartType === "growthChart") {
      handleDrawerGrowth();
    }
  }, [chartType]);

  useEffect(() => {
    if (isNavigateToObstetric) {
      handleDrawerObstetric(isNavigateToObstetric);
    }
  }, [isNavigateToObstetric]);

  useEffect(() => {
    if (
      collapsedFlag === 6 &&
      examinationHistory?.length === 0 &&
      !shouldShowImmunisation &&
      !shouldShowAncHistory &&
      !obstetricDetails?.lmp &&
      !obstetricDetails?.edd &&
      !obstetricDetails?.ceed &&
      !obstetricDetails?.gravidity &&
      !obstetricDetails?.parity &&
      !obstetricDetails?.livingChildren &&
      !obstetricDetails?.abortion &&
      !obstetricDetails?.ectopicPregnancies
    ) {
      setCollapsed(false);
    }
  }, [collapsedFlag, collapsed]);

  //Handle Sider
  const openCollapsed = useCallback(
    (flag) => {
      setCollapsedFlag(flag);
      setCollapsed(true);
    },
    [collapsedFlag, collapsed],
  );

  const handleCollapsed = useCallback(
    (flag) => {
      setCollapsedFlag(flag);
      !collapsed && setCollapsed(!collapsed);
      if (flag === 1) {
        handleDrawerVital();
      } else if (flag === 2) {
        handleDrawerMedicalHistory();
      } else if (flag === 3) {
        handleDrawerVaccination();
      } else if (flag === 4) {
        handleDrawerPrivateNotes();
      } else if (flag === 5) {
        handleDrawerGrowth();
      } else if (flag === 6) {
        handleDrawerObstetric();
      } else if (flag === 7) {
        handleDrawerUploadDoc();
      } else if (flag === 8) {
        handleAddLabParamsDrawer();
      } else if (flag === 11) {
        // Care plan is handled by openCollapsed, no additional action needed
      }
    },
    [
      collapsedFlag,
      collapsed,
      vitalDrawer,
      medicalHistoryDrawer,
      vaccinationDrawer,
      privateNotesDrawer,
    ],
  );

  useEffect(() => {
    const patientLastHistory = async () => {
      const V_action = await dispatch(
        getVitals({
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          pam_id:
            patient_data !== undefined && patient_data.pam_id !== undefined
              ? patient_data.pam_id
              : 0,
          mode: caseManagerData !== undefined && tcmId !== 0 ? EDIT : ADD,

          pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0, //extra
          pm_id: patient_data !== undefined ? patient_data.pm_id : 0, //extra
        }),
      );

      if (
        (profile?.dp_name === PAEDIATRICS ||
          profile?.dp_id === NEO_NATOLOGISTS_DP_ID) &&
        patient_data?.ageMonths <= 12 &&
        patient_data?.ageYears === 0
      ) {
        dispatch(
          getPatientBirthWeight({
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
            pam_id:
              patient_data !== undefined && patient_data.pam_id !== undefined
                ? patient_data.pam_id
                : 0,
          }),
        );
      }

      const PN_action = await dispatch(
        listPrivateNotes({
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          mode: caseManagerData !== undefined ? EDIT : ADD,
        }),
      );

      if (caseManagerData === undefined) {
        const MH_action = await dispatch(
          getPatientLastHistory({
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
          }),
        );
        if (MH_action.meta.requestStatus === "fulfilled") {
          setMedicalHistoryData(JSON.parse(JSON.stringify(MH_action.payload)));
        }
      }
    };
    patientLastHistory();
  }, []);

  useEffect(() => {
    if (caseManagerData === undefined || tcmId === 0) {
      const updatedData = selectedVitalsList.map((e, i) => {
        return {
          ...e,
          systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
          diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
        };
      });
      setVitalsData(updatedData);
    }
  }, [selectedVitalsList]);

  useEffect(() => {
    if (caseManagerData !== undefined) {
      if (
        caseManagerData.private_notes &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 8 && e.tmdpm_status === 0,
        ) !== -1 &&
        privateNotesList.findIndex(
          (e) => e.id === caseManagerData.private_notes.id,
        ) !== -1 &&
        tcmId
      ) {
        setPrivateNotesData(caseManagerData.private_notes);
      }
    }
  }, [privateNotesList]);

  // Auto-open ConsultationDrawer when coming from Voice Recording page
  useEffect(() => {
    if (fromVoiceRecording && audioBlob) {
      setIsGenRxDrawerVisible(true);
      const clinic_name = getClinicName(profile?.hospital_data);
      trackEvent("TP_VoiceRx_Start", {
        patient_contact: patient_data?.pm_contact_no || "",
        patient_id: patient_data?.patient_unique_id || "",
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        clinic_name,
      });
    }
  }, [fromVoiceRecording, audioBlob]);

  // Auto-open ConsultationDrawer when coming from typed input (text Voice Rx)
  useEffect(() => {
    if (
      inputText &&
      typeof inputText === "string" &&
      inputText.trim().length > 0
    ) {
      setIsGenRxDrawerVisible(true);
      const clinic_name = getClinicName(profile?.hospital_data);
      trackEvent("TP_VoiceRx_Start", {
        patient_contact: patient_data?.pm_contact_no || "",
        patient_id: patient_data?.patient_unique_id || "",
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        clinic_name,
      });
    }
  }, [inputText]);

  const handleSaveGynecHistory = (updatedGynecHistory) => {
    setUpdatedGynecHistory(updatedGynecHistory);
  };

  useEffect(() => {
    if (isGynaecHistoryAccessable) {
      fetchGynecHistory();
    }
  }, [isGynaecHistoryAccessable]);

  const fetchGynecHistory = async () => {
    try {
      const data = await getGynecDetails(
        patient_data.patient_unique_id,
        userId,
      );
      // Destructure to remove createdAt and createdBy
      const { createdAt, createdBy, ...updatedData } = data || {};

      setUpdatedGynecHistory(updatedData);
    } catch (error) {
      console.error("Error fetching gynec history:", error);
    }
  };

  const handleViewLabParamsDrawer = () => {
    setViewlabparamsDrawer((prev) => !prev);
  };

  const handleDDxDrawer = (field) => {
    setDDxDrawer((prev) => !prev);
    if (!ddxDrawer) {
      window.Moengage.track_event("TP_CDSS_Ddx_reviewed", {
        clinic_name: getClinicName(profile?.hospital_data),
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
        field: field,
      });
    }
  };

  const handleGenRxKnowMore = () => {
    setGenRxKnowMoreDrawer((prev) => !prev);
  };

  const handleGroundingKnowMore = () => {
    setGroundingKnowMoreDrawer((prev) => !prev);
  };

  const handleTatvaAiKnowMore = () => {
    setTatvaAiKnowMoreDrawer((prev) => !prev);
  };

  const handleDDxKnowMore = () => {
    setDDxKnowMoreDrawer((prev) => !prev);
  };

  // Function to close "View Lab Params" and open "Add Lab Params"
  const handleSwitchToAddLabParams = () => {
    setViewlabparamsDrawer(false);
    setLabParamsDrawer(true);
  };

  const handleRetryBtn = () => {
    setFilesData([]);
    setIsFileSizeError(false);
    setIsFileLimitError(false);
    setIsFileTypeError(null);
  };

  const getGenerateDDx = async (field) => {
    const DDX_planDetails = servicesList?.find((e) => e.service_name === S_DDX);
    if (
      DDX_planDetails?.plan_tier === FREE &&
      DDX_planDetails?.credit_balance <= 0
    ) {
      showHideSubModal({ service_name: S_DDX });
    }
    if (DDX_planDetails?.plan_tier === FAILED_VERIFICATION) {
      showHideSubModal({ service_name: S_DDX });
    } else {
      let sendData = {
        b2c_id: profile?.b2c,
        service_name: S_DDX,
      };
      const action = await dispatch(checkCredits(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (action?.payload?.hasOwnProperty("service_name")) {
          if (
            action?.payload?.plan_tier === FREE &&
            action?.payload?.credit_balance <= 0
          ) {
            if (
              action?.payload?.credit_balance != DDX_planDetails?.credit_balance
            ) {
              await dispatch(services(sendData?.b2c_id));
            }
            showHideSubModal({ service_name: S_DDX });
          } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal();
          } else {
            setIsDDxLoading(true);
            setIsDDxGenerated(true);
            window.Moengage.track_event("TP_CDSS_Ack_GenDx", {
              clinic_name: getClinicName(profile?.hospital_data),
              doctor_id: profile?.doctor_unique_id,
              patient_number: patient_data?.pm_contact_no,
              patient_id: patient_data?.patient_unique_id,
              field: field,
            });
            const payload = {
              patientId: patient_data?.patient_unique_id,
              symptoms: symptomsData?.map((symptom) => {
                if (symptom) {
                  return {
                    name: symptom.symptom_name,
                    since: symptom.since,
                    severity: symptom.severity,
                    notes: symptom.note,
                  };
                }
              }),
              examinations: examinationData?.map((examination) => {
                if (examination) {
                  return {
                    name: examination.examination_name,
                    notes: examination.note,
                  };
                }
              }),
            };
            const generatedDDxResponse = await getDDxDetails(payload);
            if (generatedDDxResponse?.results) {
              setGeneratedDDx(generatedDDxResponse);
              setLikeDislike(generatedDDxResponse?.results?.map(() => ""));
              setUseDDX(true);
            }
            dispatch(setIsDDxReadyToGenerate(false));
            setIsDDxLoading(false);
          }
        } else {
          typeof action?.payload?.data?.error === "object"
            ? errorMessage(action?.payload?.data?.error?.description)
            : errorMessage(action?.payload?.data?.message);
        }
      } else {
        errorMessage(action.payload.message);
      }
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_GenerateDDX", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: tokenData?.user_id,
      clinic_id: tokenData?.clinic_id,
      clinic_Name: clinic_name,
      payment_Status: planDetails?.currentPlanStatus,
      token_count: DDX_planDetails?.credit_balance,
      ...deviceSdkData,
    });
  };

  const fetchCarePlanNames = async () => {
    try {
      if (isCarePlanEnabled) {
        const response = await getCarePlanNames();
        // The CarePlanDropdown component handles its own data fetching
      }
    } catch (error) {
      console.error("Error fetching care plan names:", error);
    }
  };

  // Derive placeholder plan name by fetching assignments and matching current tcm_id
  useEffect(() => {
    const resolvePlaceholder = async () => {
      try {
        if (!isCarePlanEnabled) return;
        if (!patient_data?.patient_unique_id) return;
        if (!tcmId || Number(tcmId) === 0) return;

        const resp = await getCarePlanAssignments(
          patient_data?.patient_unique_id,
        );
        const list = Array.isArray(resp) ? resp : [];

        const match = list.find((x) => Number(x?.tcm_id) === Number(tcmId));
        setCarePlanPlaceholder(match?.plan_name || undefined);
      } catch (e) {
        setCarePlanPlaceholder(undefined);
      }
    };

    resolvePlaceholder();
  }, [isCarePlanEnabled, patient_data?.patient_unique_id, tcmId]);

  const handleApexAIClose = () => {
    dispatch(setIsApexAISelected(false));
    setCollapsedFlag(null);
    setCollapsed(false);
  };

  const handleApexAI = () => {
    dispatch(setIsApexAISelected(true));
    openCollapsed(
      isGroundingAccessableForZydus
        ? 12
        : isFreeVoiceRxUser || tp_monetization_enable
          ? 10
          : 9,
    );
    window.Moengage.track_event("TP_Apex_AI_Ack", {
      clinic_name: getClinicName(profile?.hospital_data),
      doctor_id: profile?.doctor_unique_id,
      patient_number: patient_data?.pm_contact_no,
      patient_id: patient_data?.patient_unique_id,
    });
  };

  const handleGenRx = () => {
    setIsGenRxDrawerVisible(true);
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_VoiceRx_Start", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
    });

    navigate("/voice-rx-consult", {
      state: {
        patient_data,
        autoOpenModal: false,
        fromPrescription: true,
      },
    });
  };

  const handleVideoConsult = async () => {
    if (!videoConsultData?.pam_id) {
      message.error("Invalid appointment ID");
      return;
    }

    setIsInitiatingCall(true);

    try {
      const response = await ApiVideoConsult.initiateTeleCall(
        videoConsultData.pam_id,
      );

      if (response.error) {
        message.error(response.error);
        return;
      }

      if (response.data?.message === "success") {
        if (
          response.data.action === "join-video-call" &&
          response.data.callJoinUrlForDoctor
        ) {
          setVideoConsultUrl(response.data.callJoinUrlForDoctor);
          setVideoConsultAction(response.data.action);
          setIsVideoModalVisible(true);
        } else if (response.data.action === "join-audio-call") {
          message.info(
            response.data.displayMessage || "Audio call initiated successfully",
          );
        }

        trackEvent("TP_VideoConsult_Started_TabPrescription", {
          patient_contact: patient_data?.pm_contact_no || "",
          patient_id: patient_data?.patient_unique_id || "",
          doctor_speciality: profile?.dp_name,
          doctor_unique_id: profile?.doctor_unique_id,
          clinic_name: getClinicName(profile?.hospital_data),
          page: "Tab Prescription",
          call_type: response.data.action,
        });
      } else {
        message.error("Failed to initiate consultation");
      }
    } catch (error) {
      message.error("Failed to start video consultation. Please try again.");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleEndVisit = async () => {
    setIsEndVisitLoading(true);
    try {
      const patientId = patient_data?.patient_unique_id;

      // Save dental examination before ending visit when on dental route
      if (location.pathname === "/dental" && patientId && dentalExamination?.toothState && Object.keys(dentalExamination.toothState).length > 0) {
        try {
          const tooth_states = transformToothStateToApi(dentalExamination.toothState);
          await dispatch(saveDentalExamination({
            patientId,
            data: {
              dentition_type: dentalExamination.dentitionType || "adult",
              tooth_states,
              version: dentalExamination.version || 0,
            },
          }));
        } catch (dentalErr) {
          console.warn("[Dental] Save failed before end visit:", dentalErr);
        }
      }

      // Save oral examination before ending visit when on dental route
      if (location.pathname === "/dental" && patientId) {
        const canvasOralEntries = oralExamination?.canvasOralEntries || [];
        const canvasOralNotes = oralExamination?.canvasOralNotes || "";
        const hasOralData = canvasOralEntries.length > 0 || canvasOralNotes.trim().length > 0;
        if (hasOralData) {
          try {
            const oralData = {
              findings: canvasOralEntries
                .filter((e) => e.kind === "finding")
                .map((e) => ({ id: e.id, name: e.name, area: e.surfaces || [], since_date: e.since || undefined, notes: e.note || "" })),
              procedures: canvasOralEntries
                .filter((e) => e.kind === "procedure")
                .map((e) => ({ id: e.id, name: e.name, area: e.surfaces || [], procedure_date: e.since || undefined, status: e.status || "PLANNED", notes: e.note || "" })),
              treatment_history: canvasOralEntries
                .filter((e) => e.kind === "past")
                .map((e) => ({ id: e.id, name: e.name, area: e.surfaces || [], since_date: e.since || undefined, notes: e.note || "" })),
              overall_notes: canvasOralNotes,
            };
            const version = oralExamination?.version || 0;
            if (version === 0) {
              await dispatch(saveOralExaminationThunk({ patientId, data: oralData }));
            } else {
              await dispatch(patchOralExaminationThunk({
                patientId,
                data: {
                  version,
                  operations: [
                    { type: "UPSERT_ORAL_FINDINGS", findings: oralData.findings },
                    { type: "UPSERT_ORAL_PROCEDURES", procedures: oralData.procedures },
                    { type: "UPSERT_ORAL_TREATMENT_HISTORY", treatment_history: oralData.treatment_history },
                    { type: "UPSERT_ORAL_NOTES", overall_notes: oralData.overall_notes },
                  ],
                },
              }));
            }
          } catch (oralErr) {
            console.warn("[Oral] Save failed before end visit:", oralErr);
          }
        }
      }

      const sendData = {
        action: currentTcmId === 0 ? 'add' : 'edit',
        patient_unique_id: patientId,
        tcm_id: currentTcmId,
        pam_id: pamId,
        consultation_date: consultationDate,
        symptoms: symptomsData,
        examination: examinationData,
        surgeries: surgeriesData,
        diagnosis: diagnosisData,
        medicine: medicationData,
        advice: adviceData,
        investigation: investigationData,
        vitals: vitalsData,
        follow_up_date: followUpDate,
        visit_advice: additionalNote,
        medical_history: medicalHistoryData,
        moduleContents: customModuleContents,
      };

      const action = await (currentTcmId === 0
        ? dispatch(addCaseManager(sendData))
        : dispatch(editCaseManager(sendData)));

      if (action.meta.requestStatus === "fulfilled") {
        try {
          // Ensure care plan is linked to the definitive consultation id
          const decodedToken = getDecodedToken();
          const tokenData = decodedToken?.result;
          const generatedTcmId = action?.payload?.tcm_id ?? currentTcmId;
          setCurrentTcmId(generatedTcmId);

          const hasExistingCarePlan = await hasExistingCarePlanForConsultation(
            patient_data?.patient_unique_id,
            generatedTcmId,
            'submit',
          );

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
        } catch (error) {
          console.error('Care plan sync after submit failed:', error);
        }

        // Fetch care plan assignments to include in print state
        let carePlanAssignments = [];
        try {
          if (patient_data?.patient_unique_id) {
            const assignmentsResp = await getCarePlanAssignments(patient_data.patient_unique_id);
            carePlanAssignments = Array.isArray(assignmentsResp?.data) ? assignmentsResp.data : (Array.isArray(assignmentsResp) ? assignmentsResp : (assignmentsResp?.assignments || []));
          }
        } catch (cpFetchErr) {
          console.error('Failed to fetch care plan assignments for print state:', cpFetchErr);
        }

        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEnd} className="me-3" />
              <div>
                <div className="title-common text-start fontroboto">{`${patient_data?.pm_first_name}'s visit ended successfully.`}</div>
                <div className="fontroboto text-start fw-normal mt-1">
                  View completed visits in finished tab.
                </div>
              </div>
              <img
                src={imgCloseVisit}
                className="ms-3"
                onClick={() => message.destroy()}
              />
            </div>
          ),
          duration: 5,
        });

        // if (tcmId === 0) {
        //   try {
        //     await upsertTabRxRx({
        //       patient_unique_id: patient_data?.patient_unique_id,
        //       tcm_id: action.payload?.tcm_id,
        //       pam_id: action.payload?.pam_id,
        //     });
        //   } catch (upsertErr) {
        //     console.error('Failed to upsert TabRxRx:', upsertErr);
        //   }
        // }

        if (isAutofillSelected) {
          try {
            await setAddToRx({
              _id: symptomCollector?._id,
              addToRx: true,
            });
            dispatch(setSelectAutofill(false));
          } catch (autofillErr) {
            console.error('Failed to set add to Rx auto-fill:', autofillErr);
          }
        }

        const activeDentalData = (dentalExamination?.toothState && Object.keys(dentalExamination.toothState).length > 0)
          ? transformToothStateToApi(dentalExamination.toothState)
          : [];

        navigate("/tab-rx-prescription", {
          replace: true,
          state: {
            ...action.payload,
            patient_data: patient_data,
            page: location?.pathname === "/dental" ? "dental" : "tabrx",
            dentalExaminationData: activeDentalData,
          },
        });
      } else {
        errorMessage(action.error);
      }
    } catch (error) {
      console.warn("[ConsultationLayout] Error ending visit:", error);
      errorMessage("Failed to end visit");
    } finally {
      setIsEndVisitLoading(false);
    }
  };

  const handlePreviewRx = async () => {
    setIsPreviewLoading(true);
    setIsPreviewDrawerOpen(true);
    setPreviewPdfFile(null);
    try {
      const activeDentalData =
        dentalExamination?.toothState &&
        Object.keys(dentalExamination.toothState).length > 0
          ? transformToothStateToApi(dentalExamination.toothState)
          : [];

      const payload = buildConsultationPreviewPrintPayload({
        patient_data,
        profile,
        userId,
        caseManagerData,
        currentTcmId,
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
        medicalHistoryData,
        followUpDate,
        additionalNote,
        customModuleContents,
        defaultPrintSettings,
        frequencyList,
        timingList,
        customModules: allAvailableModules,
        activeDentalData,
        oralExamination,
        isDentalEnabled,
      });

      if (!payload) {
        throw new Error("Print settings are not loaded yet. Please try again.");
      }

      const { dentalExaminationData: resolvedDental, examChart: resolvedOralChart } =
        await resolveDentalOralForPrint({
          patientId: patient_data?.patient_unique_id,
          tcmId: currentTcmId,
          consultationDate,
          printSettings: payload.printSettings,
          inMemoryDental: { tooth_states: activeDentalData },
          inMemoryOral: oralExamination,
          caseManagerData: payload.caseManagerData,
          allowFullApiFallback: false,
        });

      const pdfBlob = await renderPrintPayloadToBlob(
        {
          ...payload,
          dentalExaminationData: resolvedDental,
          examChart: resolvedOralChart,
          oralExamination,
          patientUniqueId: patient_data?.patient_unique_id,
          tcmId: currentTcmId,
        },
        {
        selectedLang: "English",
        isGynaecHistoryAccessable,
        onlyShowDental: false,
      });

      if (pdfBlob) {
        setPreviewPdfFile(pdfBlob);
      } else {
        throw new Error("Failed to render PDF preview.");
      }
    } catch (err) {
      console.error("Failed to generate PDF preview:", err);
      message.error(err?.message || "Failed to generate prescription preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleTeleconsultClick = async () => {
    if (joinToken) return;
    const appointmentId = pamId || patient_data?.pam_id || videoConsultData?.pam_id;
    if (!appointmentId) {
      message.error("No appointment selected");
      return;
    }

    setIsTeleconsultJoinLoading(true);
    try {
      const response = await ApiTeleconsult.checkVideoAvailability(appointmentId);
      const data = response?.data ?? response;
      const token = data?.joinPayload?.token ?? data?.token;

      if (token) {
        dispatch(setJoinToken(token));
        dispatch(setActiveTeleconsultAppointmentId(appointmentId));

        if (data?.consultationId) {
          dispatch(setActiveTeleconsultConsultationId(data.consultationId));
        }

        window.Moengage.track_event("TP_TC_StartCall", {
          doctor_name: profile?.um_name,
          doctor_number: profile?.um_contact,
          doctor_specialty: profile?.dp_name,
          doctor_um_id: tokenData?.user_id,
        });

        if (data?.status) {
          dispatch(
            setAppointmentTeleconsultStatus({
              appointmentId,
              status: data.status,
            })
          );
        }
      } else {
        message.error("Teleconsult unavailable as appointment time has passed");
      }
    } catch (_error) {
      message.error("Teleconsult unavailable at the moment.");
    } finally {
      setIsTeleconsultJoinLoading(false);
    }
  };

  // Check if we should show only ConsultationDrawer (coming from Voice Rx - typed input, dictation, or ambient)
  const showOnlyDrawer =
    isGenRxDrawerVisible &&
    // Typed input from Voice Rx
    ((inputText &&
      typeof inputText === "string" &&
      inputText.trim().length > 0) ||
      // Audio recording from Voice Rx (dictation or ambient mode)
      (fromVoiceRecording && audioBlob) ||
      // Coming from edit prescription (print view)
      caseManagerData?.smart_prescription_filename);

  return (
    <CashManagerContext.Provider value={contextApi}>
      {/* <TabRxWelcomePopup open={true} onClose={() => {}} onGetStarted={() => {}} /> */}
      <>
        {/* {isGenRxDrawerVisible && (
          <ConsultationDrawer
            visible={isGenRxDrawerVisible}
            onClose={() => setIsGenRxDrawerVisible(false)}
            handleGenRxKnowMore={handleGenRxKnowMore}
            labReportID={labReportID}
            digitizedData={digitizedData}
            typedInputText={inputText}
            mode={mode}
          />
        )} */}
        <>
          <ConsultationHeader
            patientData={patient_data}
            isVaccinationEnabled={isVaccinationAccessable}
            isGrowthChartEnabled={isGrowthChartAccessable}
            handleGenRx={handleGenRx}
            handleVideoConsult={
              isVideoConsultAvailable ? handleVideoConsult : null
            }
            isVideoConsultLoading={isInitiatingCall}
            isEndVisitLoading={isEndVisitLoading}
            showTeleconsultIcon={!!isTeleConsultAvailableType2}
            onTeleconsultClick={handleTeleconsultClick}
            isTeleconsultJoinLoading={isTeleconsultJoinLoading}
            isTeleconsultActive={!!joinToken}
            onEndVisit={handleEndVisit}
            handleSelectLetterHead={() => setIsSelectLetterHead(!isSelectLetterHead)}
            hasDentalData={location.pathname === "/dental" && Object.keys(dentalExamination?.toothState ?? {}).length > 0}
            onPreviewClick={handlePreviewRx}
            {...headerProps}
          />
          <div 
            className="w-100 bg-body wrapper2 prescription-wrapper p-0"
            style={{
              overflowY: "hidden",
              overflowX: "hidden",
              overscrollBehavior: "contain",
            }}
          >
            <Layout style={{ height: "100%" }}>
              <ConsultationSidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                collapsedFlag={collapsedFlag}
                openCollapsed={openCollapsed}
                customizedPadLeftList={customizedPadLeftList}
                vitalsData={vitalsData}
                vitalsPastList={vitalsPastList}
                patientBirthWeight={patientBirthWeight}
                handleDrawerVital={handleDrawerVital}
                medicalHistoryData={medicalHistoryData}
                updatedGynecHistory={updatedGynecHistory}
                handleDrawerMedicalHistory={handleDrawerMedicalHistory}
                isVaccinationAccessable={isVaccinationAccessable}
                handleDrawerVaccination={handleDrawerVaccination}
                privateNotesList={privateNotesList}
                handleDrawerPrivateNotes={handleDrawerPrivateNotes}
                isGrowthChartAccessable={isGrowthChartAccessable}
                handleDrawerGrowth={handleDrawerGrowth}
                isGynaecHistoryAccessable={isGynaecHistoryAccessable}
                examinationHistory={examinationHistory}
                shouldShowAncHistory={shouldShowAncHistory}
                shouldShowImmunisation={shouldShowImmunisation}
                obstetricDetails={obstetricDetails}
                handleDrawerObstetric={handleDrawerObstetric}
                allUploadedDocs={allUploadedDocs}
                handleAddClick={handleAddClick}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                labParamsData={labParamsData}
                handleAddLabParamsDrawer={handleAddLabParamsDrawer}
                handleViewLabParamsDrawer={handleViewLabParamsDrawer}
                isCarePlanEnabled={isCarePlanEnabled}
                caseManagerData={caseManagerData}
                isApexAIAccessable={isApexAIAccessable}
                tp_monetization_enable={tp_monetization_enable}
                isFreeVoiceRxUser={isFreeVoiceRxUser}
                generatedDDx={generatedDDx}
                handleDDxDrawer={handleDDxDrawer}
                isDDxLoading={isDDxLoading}
                handleDDxKnowMore={handleDDxKnowMore}
                getGenerateDDx={getGenerateDDx}
                isDDxGenerated={isDDxGenerated}
                setIsGenRxDrawerVisible={setIsGenRxDrawerVisible}
                handleGenRxKnowMore={handleGenRxKnowMore}
                patient_data={patient_data}
                tcmId={tcmId}
                selectedCarePlan={selectedCarePlan}
                setSelectedCarePlan={setSelectedCarePlan}
                userId={userId}
                clinicId={decodedToken?.result?.clinic_id}
                carePlanPlaceholder={carePlanPlaceholder}
                isGroundingAccessableForZydus={isGroundingAccessableForZydus}
                handleGroundingKnowMore={handleGroundingKnowMore}
                obstetricDrawer={obstetricDrawer}
                handleDrawerMedicalReport={handleDrawerMedicalReport}
                setFilesData={setFilesData}
                setIsEditDocument={setIsEditDocument}
                handleUploadDocPopup={handleUploadDocPopup}
                setUploadDocDrawer={setUploadDocDrawer}
                handleDrawerUploadDoc={handleDrawerUploadDoc}
              />
              {location.pathname === "/dental" ? (
                <Content className="dental-content-wrapper w-100 d-flex flex-column" style={{ height: "100%", overflow: "hidden" }}>
                  <div className="dental-tab-bar">
                    <div className="dental-tab-inner">
                      <button
                        type="button"
                        className={`dental-tab-btn ${activeDentalTab === "clinical" ? "active" : "inactive"}`}
                        onClick={() => setActiveDentalTab("clinical")}
                      >
                        <ClipboardText
                          size={20}
                          variant={activeDentalTab === "clinical" ? "Bulk" : "Linear"}
                          color={activeDentalTab === "clinical" ? "#4B4AD5" : "#92929D"}
                        />
                        Clinical Examination
                        {activeDentalTab === "clinical" && <span className="dental-tab-underline" />}
                      </button>
                      <button
                        type="button"
                        className={`dental-tab-btn ${activeDentalTab === "dental" ? "active" : "inactive"}`}
                        onClick={() => setActiveDentalTab("dental")}
                      >
                        <ToothIcon
                          name="tooth"
                          variant={activeDentalTab === "dental" ? "bulk" : "linear"}
                          size={20}
                          color={activeDentalTab === "dental" ? "#4B4AD5" : "#92929D"}
                        />
                        Dental Examination
                        {activeDentalTab === "dental" && <span className="dental-tab-underline" />}
                      </button>
                    </div>
                  </div>
                  <div className="dental-tab-content flex-grow-1 overflow-auto" style={{ backgroundColor: "#F8F8FB" }}>
                    {activeDentalTab === "clinical" ? (
                      <div className="p-3">
                        <ClinicalExaminationContent
                          allAvailableModules={allAvailableModules}
                          showShimmer={showShimmer}
                          setShowSCBanner={setShowSCBanner}
                          showSCBanner={showSCBanner}
                          handleDDxDrawer={handleDDxDrawer}
                          generatedDDx={generatedDDx}
                          getGenerateDDx={getGenerateDDx}
                          isDDxLoading={isDDxLoading}
                          handleDDxKnowMore={handleDDxKnowMore}
                          isDDxGenerated={isDDxGenerated}
                          loadPrevOpthalSignal={loadPrevOpthalSignal}
                        />
                      </div>
                    ) : (
                      <ExaminationTab 
                        patientId={patient_data?.patient_unique_id} 
                        patientAge={patient_data?.ageYears} 
                      />
                    )}
                  </div>
                </Content>
              ) : (
                children
              )}
            </Layout>
          </div>
        </>
        {vitalDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerVital}
            open={vitalDrawer}
            className="modalWidth-700"
            width="auto"
          >
            <VitalsBox
              handleDrawerVital={handleDrawerVital}
              handleCollapsed={(flag) => handleCollapsed(flag)}
              isGrowthChart={isGrowthChart}
            />
          </Drawer>
        )}
        <Drawer
          className="scroll-y-hidden"
          closeIcon={false}
          placement="right"
          onClose={handleDrawerMedicalHistory}
          open={medicalHistoryDrawer}
          width="100%"
        >
          <MedicalHistoryBox
            handleDrawerMedicalHistory={handleDrawerMedicalHistory}
            handleCollapsed={(flag) => handleCollapsed(flag)}
            onSave={handleSaveGynecHistory}
          />
        </Drawer>
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerPrivateNotes}
          open={privateNotesDrawer}
          className="modalWidth-563"
          width="auto"
        >
          <PrivateNotesBox
            handleDrawerPrivateNotes={handleDrawerPrivateNotes}
            handleCollapsed={(flag) => handleCollapsed(flag)}
            selectPrivateNotes={selectPrivateNotes}
          />
        </Drawer>
        {vaccinationDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerVaccination}
            open={vaccinationDrawer}
            width="100%"
          >
            <Vaccination
              handleDrawerVaccination={handleDrawerVaccination}
              source={chartType ? "Patient Details" : "Consult"}
            />
          </Drawer>
        )}
        {growthDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerGrowth}
            open={growthDrawer}
            width="100%"
            push={false}
          >
            <GrowthChart
              handleDrawerVaccination={handleDrawerGrowth}
              handleDrawerVital={handleDrawerVital}
            />
          </Drawer>
        )}
        {obstetricDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerObstetric}
            open={obstetricDrawer}
            width="100%"
            push={false}
            zIndex={100}
          >
            <Obstetric
              obstetricDetails={obstetricDetails}
              obstetricDrawer={obstetricDrawer}
              handleDrawerObstetric={handleDrawerObstetric}
              handleCollapsed={(flag) => handleCollapsed(flag)}
              handleDrawerMedicalReport={handleDrawerMedicalReport}
            />
          </Drawer>
        )}
        {uploadDocDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleDeletePopup}
            open={uploadDocDrawer}
            className="modalWidth-700"
            width="auto"
            push={false}
          >
            <UploadDocument
              onClose={handleDeletePopup}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              shouldShowDeletePopup={shouldShowDeletePopup}
              setShowDeletePopup={setShowDeletePopup}
              filesData={filesData}
              setFilesData={setFilesData}
              isEditDocument={isEditDocument}
              setIsEditDocument={setIsEditDocument}
              handleUploadDocPopup={handleUploadDocPopup}
            />
          </Drawer>
        )}
        {medicalReportDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleDrawerMedicalReport}
            open={medicalReportDrawer}
            className="modalWidth-700"
            width={"auto"}
            push={false}
          >
            <MedicalRecords
              medicalReportDrawer={medicalReportDrawer}
              onClose={handleDrawerMedicalReport}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              setFilesData={setFilesData}
              setIsEditDocument={setIsEditDocument}
              handleUploadDocPopup={handleUploadDocPopup}
              setUploadDocDrawer={setUploadDocDrawer}
            />
          </Drawer>
        )}
        {isPreviewDrawerOpen && (
          <Drawer
            className="scroll-y-hidden"
            closeIcon={false}
            placement="right"
            onClose={() => setIsPreviewDrawerOpen(false)}
            open={isPreviewDrawerOpen}
            width={isMobile ? "100%" : "60%"}
            push={false}
            bodyStyle={{ padding: 0 }}
          >
            <div className="search-modalCard h-100 d-flex flex-column" style={{ backgroundColor: "#fff" }}>
              <div className='modalCard-header h-60 align-items-center justify-content-between d-flex flex-shrink-0'>
                <div className='align-items-center d-flex h-100'>
                  <div className='border-end h-100 text-center me-3'>
                    <div
                      onClick={() => setIsPreviewDrawerOpen(false)}
                      className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'
                    >
                      <i className='icon-right'></i>
                    </div>
                  </div>
                  <div className="title-common">
                    Preview Rx
                  </div>
                </div>
              </div>
              <div ref={previewDivRef} className="flex-grow-1 overflow-auto h-100 position-relative d-flex flex-column align-items-center" style={{ backgroundColor: "#F8F8FB", padding: "20px 0" }}>
                {isPreviewLoading ? (
                  <Spin size="large" tip="Generating Preview..." style={{ marginTop: "100px" }} />
                ) : previewPdfFile ? (
                  <PdfDocument
                    loading={<Spin style={{ marginTop: "100px" }} />}
                    error={<div style={{ marginTop: "100px", color: "#ff4d4f" }}>Failed to load PDF file.</div>}
                    file={previewPdfFile}
                    onLoadSuccess={({ numPages }) => setPreviewNumPages(numPages)}
                  >
                    {Array.apply(null, Array(previewNumPages))
                      .map((x, i) => i + 1)
                      .map((page) => (
                        <div key={page} style={{ marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                          <PdfPage
                            loading={null}
                            width={previewDivWidth > 40 ? previewDivWidth - 40 : 550}
                            pageNumber={page}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      ))}
                  </PdfDocument>
                ) : (
                  <div className="text-muted" style={{ marginTop: "100px" }}>No preview available</div>
                )}
              </div>
            </div>
          </Drawer>
        )}
        {shouldShowUploadDocPopup && (
          <UploadDocPopup
            shouldShowUploadDocPopup={shouldShowUploadDocPopup}
            onCancel={handleUploadDocPopup}
            setFilesData={setFilesData}
            filesData={filesData}
            setUploadDocDrawer={setUploadDocDrawer}
            setIsFileSizeError={setIsFileSizeError}
            setIsFileLimitError={setIsFileLimitError}
            setIsFileTypeError={setIsFileTypeError}
          />
        )}
        {labParamsDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={showHideBackModal}
            open={labParamsDrawer}
            className="modalWidth-700"
            width={"auto"}
            push={false}
          >
            <LabParams
              handleAddLabParamsDrawer={handleAddLabParamsDrawer}
              patient_unique_id={patient_data?.patient_unique_id}
              onSave={handleLabParamsUpdate}
              isBackModalOpen={isBackModalOpen}
              showHideBackModal={showHideBackModal}
              patientGender={patient_data?.pm_gender}
            />
          </Drawer>
        )}
        {viewlabparamsDrawer && (
          <Drawer
            closeIcon={false}
            className="modalWidth-700"
            placement="right"
            open={viewlabparamsDrawer}
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleViewLabParamsDrawer}
            width="auto"
          >
            <ViewLabParam
              handleViewLabParamsDrawer={handleViewLabParamsDrawer}
              labParamsData={labParamsData}
              handleSwitchToAddLabParams={handleSwitchToAddLabParams}
            />
          </Drawer>
        )}
        {ddxDrawer && (
          <Drawer
            closeIcon={false}
            className="modalWidth-700"
            placement="right"
            open={ddxDrawer}
            onClose={handleDDxDrawer}
            width="auto"
            zIndex={999}
          >
            <DifferentialDiagnosisDrawer
              handleDDxDrawer={handleDDxDrawer}
              generatedDDx={generatedDDx?.results}
              includeExcludeInput={generatedDDx?.input}
              likeDislike={likeDislike}
              setLikeDislike={setLikeDislike}
            />
          </Drawer>
        )}

        {ddxKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={ddxKnowMoreDrawer}
            onClose={handleDDxKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <DDxKnowMore handleDDxKnowMore={handleDDxKnowMore} />
          </Drawer>
        )}

        {genRxKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={genRxKnowMoreDrawer}
            onClose={handleGenRxKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <GenRxKnowMore
              handleGenRxKnowMore={handleGenRxKnowMore}
              isOpen={genRxKnowMoreDrawer}
            />
          </Drawer>
        )}

        {tatvaAiKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={tatvaAiKnowMoreDrawer}
            onClose={handleTatvaAiKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <TatvaAiKnowMore
              handleTatvaAiKnowMore={handleTatvaAiKnowMore}
              handleDDxKnowMore={handleDDxKnowMore}
              handleGenRxKnowMore={handleGenRxKnowMore}
            />
          </Drawer>
        )}

        {groundingKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={groundingKnowMoreDrawer}
            onClose={handleGroundingKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <GroundingKnowMore
              handleGroundingKnowMore={handleGroundingKnowMore}
            />
          </Drawer>
        )}

        {(isLoading || isEndVisitLoading) ? (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <Spin size="large" />
          </div>
        ) : null}
      </>
      {isFileSizeError || isFileLimitError || isFileTypeError ? (
        <CommonModal
          isModalOpen={isFileSizeError || isFileLimitError || isFileTypeError}
          onCancel={handleRetryBtn}
          modalWidth={500}
          title={
            isFileSizeError
              ? "Exceeded File Size"
              : isFileLimitError
                ? "Exceeded File Upload Limit"
                : isFileTypeError
                  ? "File format not supported"
                  : "You may lose your data"
          }
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    {isFileSizeError ? (
                      <>
                        The file size exceeded{" "}
                        <span style={{ fontWeight: 700 }}>15MB.</span> Please
                        upload a file smaller than 15MB
                      </>
                    ) : isFileLimitError ? (
                      <>
                        You can only upload up to
                        <span style={{ fontWeight: 700 }}> 5 files.</span>{" "}
                        Please reduce the number of files and try again.
                      </>
                    ) : isFileTypeError ? (
                      <>
                        You can't upload
                        <span style={{ fontWeight: 700 }}>
                          {" "}
                          {isFileTypeError}
                        </span>{" "}
                        file. Only PDF, JPG, JPEG, and PNG formats are accepted.
                      </>
                    ) : (
                      "Are you sure you want to leave ?"
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleRetryBtn}
                  className="w-100 btn btn-primary3 btn-41 px-4"
                >
                  Retry
                </Button>
              </div>
            </>
          }
        />
      ) : null}

      <ExpiredSubModal
        title={
          subModalData &&
          subModalData?.hasOwnProperty("service_name") &&
          subModalData?.service_name
        }
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />

      {showSCPopup && !caseManagerData?.smart_prescription_filename && (
        <SCPopup
          handlePopup={() => dispatch(setShowSCPopup(false))}
          handleGenRx={handleGenRx}
        />
      )}

      {isVideoConsultAvailable && (
        <VideoConsultModal
          visible={isVideoModalVisible}
          onClose={() => {
            setIsVideoModalVisible(false);
            setVideoConsultUrl(null);
            setVideoConsultAction(null);
          }}
          videoUrl={videoConsultUrl}
          patientName={patient_data?.pm_fullname}
          appointmentId={videoConsultData?.pam_id}
          callAction={videoConsultAction}
        />
      )}


    </CashManagerContext.Provider>
  );
}
export default ConsultationLayout;
