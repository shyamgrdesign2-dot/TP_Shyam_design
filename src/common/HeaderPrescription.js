import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { Container, Navbar, Row, Col } from 'react-bootstrap';
import { Button, Dropdown, Tooltip, Popover, Input, Spin, Tabs, Select, Drawer, message } from 'antd';
import { LoadingOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from 'react-router-dom';
import { isMobile, isDesktop } from 'react-device-detect';
import { useCompactPrescriptionHeader } from '../hooks/useCompactPrescriptionHeader';
import { useTabletViewport } from '../hooks/useTabletViewport';
import { v4 as uuidv4 } from 'uuid';
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import CustomizeSetting from './CustomizeSetting';

import CashManagerContext from "../context/CashManagerContext";
import ProfilePopover from './ProfilePopover';
import CommonModal from './CommonModal';

// import videoimg1 from '../assets/images/tutorial-img1.webp';
// import videoimg2 from '../assets/images/tutorial-img2.webp';

import VideoModal from './VideoModal';
import SaveDraft from './SaveDraft';
import TabVoiceRxButton from '../components/tab_design/TabVoiceRxButton';
import {
    VoiceRxModuleActionButton,
} from '../components/dr-agent/voicerx/VoiceRxModuleCapture';
import voiceModuleStyles from '../components/dr-agent/voicerx/VoiceRxModuleCapture.module.scss';
import { useRxPadSync } from '../components/dr-agent/rxpad/dr-agent/RxPadSyncContext';

import { errorMessage, getClinicName, shouldMonetizationDisabled, removeBeforeWhiteSpace, isVoiceRxFree, filterCustomModuleContent, getDraftMoengageDoctorAttributes, getSupportedMimeType, trackEvent, medicationsHaveFrequencyAndDuration } from "../utils/utils";
import { transcribeAnyAudio } from '../components/dr-agent/voicerx/api/agent-audio-service';

import { EXTRA_OPTIONS, GB_PILLUP_MEDICINE, GB_ZYDUS_USER, GB_CARE_PLAN, MESSAGE_KEY, S_DDX, S_VOICE_RX, OPTHAL_PAD_MODULE_ID, GB_SAVE_AS_DRAFT_RX, GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI, MEDICINE_STOCK_STATUS } from "../utils/constants";
import { assignCarePlan, updateCarePlanName } from "../pages/smartSync/services/carePlanService";

import { useSelector, useDispatch } from "react-redux";

import {
    oneClickAddTemplate,
    oneClickUpdateTemplate,
    oneClickDeleteTemplate,
    oneClickTemplatesList,
    oneClickSingleTemplateDetails,
    addCaseManager,
    editCaseManager,
    getInvestigationAndMedicine,
    orderMedicineAndInvestigation,
    draftToConsultation
} from "../redux/caseManagerSlice";
import { addMedicine } from "../redux/medicationSlice";
import { customizedPad, listVideo } from "../redux/doctorsSlice";
import GenRxButton from '../components/GenRxButton';

import { placeIctOrder } from '../redux/appointmentsSlice';
import { getDecodedToken } from '../utils/localStorage';
import { appendStripped, stripEmptyRows } from '../utils/voiceRxRowStrip';
import {
  attachCrossConsultToCaseManagerPayload,
  syncCrossConsultReferral,
} from '../utils/crossConsultHelpers';
import { env } from '../EnvironmentConfig';
import { updateCredits } from '../redux/monetizationSlice';
import { setAddToRx, storeVoicePrescription } from '../api/services/ApiGenRx';
import { updateVoiceEditedData, beginVoiceAttempt, markVoiceLogCreated, addVoiceHistoryEntry } from '../redux/voiceDigitizationSlice';
import { store } from '../redux/store';
import { VOICE_RX_2_VERSION, uploadAndLogVoiceRx2, buildVoiceHistoryEntry, trackVoiceRx2StartEvent } from '../components/dr-agent/voicerx/voiceRx2Logging';
import { setSelectAutofill } from '../redux/ddxSlice';
import VideoConsultButton from '../components/VideoConsultButton';

import { EVENTS } from '../utils/events';
import { OPHTHALMOLOGY_SECTIONS } from "../utils/ophthalmologyExamConstants";
import { buildOpthalPayload } from "../utils/ophthalmologyPayload";
import {
    createOpthalPrescription,
    updateOpthalPrescription,
} from "../pages/ophthalmology/service";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { syncGynecHistoryAfterEndVisit } from "../utils/gynecHistoryUtils";
import { markLatestNeoVoiceConsultationFinishedForPatient } from "../api/services/ApiNeoSapien";
import { resetOpthalForm, setTableValues as setOpthalTableValues } from '../redux/ophthalmologyExamSlice';
import { useChikitsalay } from '../pages/chikitsalay/useChikitsalay';
import { ASSETS } from "../assets";
import {
    hasInvalidChikitsalayDiagnosis,
    hasInvalidChikitsalayInvestigation,
    hasInvalidChikitsalayMedication,
    getInvalidChikitsalayInventoryMessage,
} from "../utils/chikitsalayInventory";
import {
    CUSTOM_MEDICINE_DEFAULT_UNIT_ID,
    CUSTOM_MEDICINE_TYPE_ID,
    CUSTOM_MEDICINE_UNITS,
    mergeMedicineUnitOptions,
    parseMedicationFrequencySlots,
    resolveCopiedDoseFields,
} from "../utils/medicationCopyNormalization";
import {
    buildInvestigationEndVisitPayload,
    needsCustomMedicineCreate,
} from "../utils/voiceRxEndVisitPayload";
import { buildGenxOrderMedicineAndInvestigationPayload } from "../utils/genxInvestigationUtils";
import CopilotSearchField from "../components/dr-copilot/surfaces/CopilotSearchField";
const {
  alerticon: alertIcon,
  tutorial2,
  tubeIcon: playIcons,
  fullIcon: fullicon,
  settingsIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  video: videoSvg,
  notesMultiple,
} = ASSETS.images;

var oneClickCosultationTemplateId = 0
const HEADER_DICTATION_TARGET = "header";
const HEADER_DICTATION_NO_INPUT_LOCATION = "no input field selected and no cursor is active";

function getVoiceDictationTargetId(element) {
    const targetNode = element?.closest?.("[data-voice-rx-dictation-target]");
    return targetNode?.getAttribute("data-voice-rx-dictation-target") || HEADER_DICTATION_TARGET;
}

function getEditableSelection(element) {
    if (!element || (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA")) return null;
    let selectionStart = null;
    let selectionEnd = null;
    try {
        selectionStart = typeof element.selectionStart === "number" ? element.selectionStart : null;
        selectionEnd = typeof element.selectionEnd === "number" ? element.selectionEnd : null;
    } catch (_) {
        selectionStart = null;
        selectionEnd = null;
    }
    return {
        element,
        selectionStart,
        selectionEnd,
        targetId: getVoiceDictationTargetId(element),
    };
}

function getDashedMedicineFrequencyFields(item = {}) {
    const parsedFrequency = parseMedicationFrequencySlots(item?.tmm_freq_type_name || item?.frequency);
    if (!parsedFrequency) return {};
    return {
        tmm_freq_type_name: parsedFrequency.label,
        tmm_freq_type: 0,
        tmf_block: 0,
        tmf_block_val: "",
        tcm_tmm_freq_morning: parsedFrequency.morning,
        tcm_tmm_freq_afternoon: parsedFrequency.afternoon,
        tcm_tmm_freq_evening: parsedFrequency.evening,
        tcm_tmm_freq_night: parsedFrequency.night,
    };
}

async function getConsentForVoicePrescriptionPayload() {
    let userIp = "";
    try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        userIp = ipData?.ip || "";
    } catch (error) {
        console.warn("[voice-rx-2/consent] Could not fetch IP:", error?.message || error);
    }
    return {
        timestamp: Date.now(),
        ip: userIp || "0.0.0.0",
        given: true,
    };
}

function normalizeVoiceHistoryForStore(history) {
    if (!Array.isArray(history)) return [];
    return history.map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const digitize = Array.isArray(entry.digitize)
            ? (entry.digitize.find((item) => item && typeof item === "object") || {})
            : (entry.digitize || {});
        return {
            ...entry,
            digitize,
        };
    });
}

function HeaderPrescription({ isVaccinationEnabled, isGrowthChartEnabled, gynecHistory, labParamsData, zydusSelectedLabParams, handleGenRx, labReportID, selectedCarePlan, hasExistingCarePlan = false, handleVideoConsult, isVideoConsultLoading, showTeleconsultIcon, onTeleconsultClick, isTeleconsultJoinLoading, isTeleconsultActive, isTabPrescription, hideVoiceRxIcon, showVoiceRxModule, isNewPrescriptionUi = false, onEndVisit, isEndVisitLoading = false, hasDentalData = false, onPreviewClick, showPreviewButton = false, onSelectLetterHead, isDentalConsultation = false }) {

    const { profile, siteId, storeCode, customizedPadLeftList, customizedPadRightList, opthalModuleAutoAdded, userId } = useSelector((state) => state.doctors);

    const { frequencyList, timingList, videoList, medicineTypeList } = useSelector((state) => state.doctors);
    const vaccines = useSelector((state) => state.vaccines);
    const { givenVaccines, updatedDueVaccines } = vaccines;
    const { measurements } = useSelector((state) => state.growthChart);
    const { isObstetricDetailsUpdated } = useSelector(
        (state) => state.obstetric
    );
    const voiceDigitization = useSelector((state) => state.voiceDigitization);
    const location = useLocation();

    const {
        templates,
        loading,
    } = useSelector((state) => state.caseManager);
    const dispatch = useDispatch();
    const isChikitsalayAccessable = useChikitsalay();
    const { activeVoiceModule, setHeaderDictation } = useRxPadSync();

    const {customModules} = useSelector((state) => state.customModules);

    const navigate = useNavigate();
    const isTablet = useTabletViewport();
    const isCompactHeader = useCompactPrescriptionHeader();
    const headerOverlayZIndex = isNewPrescriptionUi ? 1305 : undefined;
    const shouldUseMobileTemplateContent = isMobile && !isTablet;
    const { patient_data, send_path, tcmId, pamId, consultationDate, symptomsData, setSymptomsData, examinationData, setExaminationData, surgeriesData, setSurgeriesData, diagnosisData, setDiagnosisData, adviceData, setAdviceData, investigationData, setInvestigationData, medicationData, setMedicationData, vitalsData, setVitalsData, medicalHistoryData, setMedicalHistoryData, privateNotesData, setPrivateNotesData, followUpDate, setFollowUpDate, additionalNote, setAdditionalNote, startTime, customModuleContents, setCustomModuleContents, pillupSwitch, useVoiceRx, useDDX, isDraft, rxDrawingCanvasIds, referralData } = useContext(CashManagerContext);
    const { isAutofillSelected, selectedSymptomsCollector, symptomCollector } = useSelector(
        (state) => state.ddx
    );
    const ophthalmologyExam = useSelector((state) => state.ophthalmologyExam);

    const [isBackModalOpen, setIsBackModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    //PopOver1
    const [popOver1, setPopOver1] = useState(false);
    const [allTemplates, setAllTemplates] = useState([]);
    const [matchedTemplates, setMatchedTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [removeTemplateId, setRemoveTemplateId] = useState(null);

    //PopOver2
    const [popOver2, setPopOver2] = useState(false);
    const [inputTemplateName, setInputTemplateName] = useState(null);
    const TAB_ADD_TEMPLATE = 1;
    const TAB_UPDATE_TEMPLATE = 2;
    const ADD_EDIT_TEMPLATE_TABS = [
        { key: TAB_ADD_TEMPLATE, label: "New Template" },
        { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
    ];
    const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

    const [templateDrawer, setTemplateDrawer] = useState(false);
    const [saveDrawer, setSaveDrawer] = useState(false);

    const [customizeDrawer, setCustomizeDrawer] = useState(false);

    //PopOverVideo function
    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);
    const tp_monetization_enable = !shouldMonetizationDisabled();

    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
    const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);
    const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
    const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
    // header transcribe voice state
    const [, setHeaderVoiceStateRaw] = useState("idle"); // "idle" | "recording" | "transcribing"
    const headerVoiceStateRef = useRef("idle");
    const setHeaderVoiceState = useCallback((s) => { headerVoiceStateRef.current = s; setHeaderVoiceStateRaw(s); }, []);
    const headerVoiceMediaRecorderRef = useRef(null);
    const headerVoiceAudioChunksRef = useRef([]);
    const headerVoiceStreamRef = useRef(null);
    const headerVoiceLastShiftTimeRef = useRef(0);
    const headerVoiceCursorRef = useRef(null); // { element, selectionStart, selectionEnd, targetId }
    const headerVoiceTargetIdRef = useRef(HEADER_DICTATION_TARGET);
    const headerVoiceInputLocationRef = useRef(HEADER_DICTATION_NO_INPUT_LOCATION);
    const headerVoiceRecordStartMsRef = useRef(0);
    const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
    const shouldUseChikitsalayInventoryValidation =
        isNewPrescriptionUi && Boolean(showVoiceRxModule) && isChikitsalayAccessable;
    const hasUngroundedMedications = shouldUseChikitsalayInventoryValidation
        ? (
            diagnosisData.some(hasInvalidChikitsalayDiagnosis) ||
            investigationData.some(hasInvalidChikitsalayInvestigation) ||
            medicationData.some(hasInvalidChikitsalayMedication)
        )
        : medicationData.some(
            (item) => !!item?.voice_rx_from_module && !(Number(item?.tmm_id) > 0)
        );
    const [saveDraftLoading, setSaveDraftLoading] = useState(false);
    const isSaveAsDraftRxAccessableFromGB = useFeatureIsOn(GB_SAVE_AS_DRAFT_RX);
    const {isEditRx = false, isVoiceRxNewUiFlow = false} = location.state || {};
    const shouldEnableDraft = isDraft !== 0 && isSaveAsDraftRxAccessableFromGB && !isEditRx && !isVoiceRxNewUiFlow;
    const shouldHideLegacyVoiceRxCta = isNewPrescriptionUi;
    const shouldShowLegacyVoiceRxCta =
        !shouldHideLegacyVoiceRxCta &&
        (isFreeVoiceRxUser || tp_monetization_enable) &&
        handleGenRx &&
        !hideVoiceRxIcon;

    const publishHeaderDictation = useCallback((status, targetId) => {
        const resolvedTargetId = status === "idle"
            ? HEADER_DICTATION_TARGET
            : targetId || headerVoiceTargetIdRef.current || HEADER_DICTATION_TARGET;
        setHeaderDictation({ status, targetId: resolvedTargetId });
    }, [setHeaderDictation]);

    const insertTranscriptAtCursor = useCallback((transcript, cursor) => {
        const text = String(transcript || "");
        const el = cursor?.element;
        if (!text || !el || !document.contains(el) || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return false;
        const current = el.value || "";
        const start = typeof cursor.selectionStart === "number" ? cursor.selectionStart : current.length;
        const end = typeof cursor.selectionEnd === "number" ? cursor.selectionEnd : start;
        const safeStart = Math.max(0, Math.min(start, current.length));
        const safeEnd = Math.max(safeStart, Math.min(end, current.length));
        const newValue = current.slice(0, safeStart) + text + current.slice(safeEnd);
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (!nativeSetter) return false;
        nativeSetter.call(el, newValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const newPos = safeStart + text.length;
        try {
            el.setSelectionRange(newPos, newPos);
        } catch (_) {}
        el.focus();
        return true;
    }, []);

    const copyTranscriptToClipboard = useCallback(async (transcript) => {
        const text = String(transcript || "").trim();
        if (!text) return;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }
            message.success("Transcript copied to clipboard.");
        } catch (error) {
            console.error("[HeaderTranscribe] clipboard copy failed", error);
            message.warning("Transcript is ready, but it could not be copied to clipboard.");
        }
    }, []);

    // ── Header transcribe: cursor tracking ─────────────────────────────────
    useEffect(() => {
        if (!isVoiceRxNewFromGB) return;
        const onFocusIn = (e) => {
            const selection = getEditableSelection(e.target);
            if (selection) headerVoiceCursorRef.current = selection;
        };
        const onUpdateCursor = (event) => {
            const el = document.activeElement;
            const selection = getEditableSelection(el);
            if (selection) {
                headerVoiceCursorRef.current = selection;
                return;
            }
            if (event?.target?.closest?.("[data-header-dictation-trigger]")) return;
            headerVoiceCursorRef.current = null;
        };
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('click', onUpdateCursor);
        document.addEventListener('keyup', onUpdateCursor);
        return () => {
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('click', onUpdateCursor);
            document.removeEventListener('keyup', onUpdateCursor);
        };
    }, [isVoiceRxNewFromGB]);

    // ── Header transcribe: start / stop recording ──────────────────────────
    const headerVoiceStopAndTranscribe = useCallback(async () => {
        const recorder = headerVoiceMediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;
        const targetId = headerVoiceTargetIdRef.current || headerVoiceCursorRef.current?.targetId || HEADER_DICTATION_TARGET;
        const voiceInputLocation = headerVoiceInputLocationRef.current || HEADER_DICTATION_NO_INPUT_LOCATION;
        setHeaderVoiceState("transcribing");
        publishHeaderDictation("transcribing", targetId);
        const submitClickedAtMs = Date.now();
        const submitClickedAt = new Date(submitClickedAtMs).toISOString();
        const durationMs = submitClickedAtMs - (headerVoiceRecordStartMsRef.current || submitClickedAtMs);
        const submitId = `header-transcribe-${submitClickedAtMs}-${Math.random().toString(36).slice(2, 8)}`;
        dispatch(beginVoiceAttempt());
        await new Promise((resolve) => {
            recorder.onstop = resolve;
            recorder.stop();
        });
        const stream = headerVoiceStreamRef.current;
        if (stream) { stream.getTracks().forEach(t => t.stop()); headerVoiceStreamRef.current = null; }
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(headerVoiceAudioChunksRef.current, { type: mimeType });
        const cursor = headerVoiceCursorRef.current;
        try {
            const transcribeAnyAudioContext = {
                patientId: patient_data?.patient_unique_id,
                doctorId: profile?.doctor_unique_id,
                sessionId: voiceDigitization?.sessionId || submitId,
            };
            const { transcript } = await transcribeAnyAudio({
                audioBlob,
                context: transcribeAnyAudioContext,
            });
            const clinicalCompletedAtMs = Date.now();
            if (transcript) {
                const inserted = insertTranscriptAtCursor(transcript, cursor);
                if (!inserted) {
                    await copyTranscriptToClipboard(transcript);
                }
            }
            uploadAndLogVoiceRx2({
                audioBlob,
                patientData: patient_data,
                profile,
                sessionId: voiceDigitization?.sessionId || submitId,
                submitId,
                requestId: submitId,
                submitClickedAt,
                submitClickedAtMs,
                durationMs,
                clinicalStatus: "completed",
                mode: "dictation",
                voicecall: (voiceDigitization?.voiceCallCount || 0) + 1,
                moduleName: "header-dictation",
                sourceSurface: "header",
                voiceInputLocation,
                isDoctorAgent: false,
                voiceLogCreated: voiceDigitization?.voiceLogCreated,
                markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
                clinicalCompletedAtMs,
            }).then(({ source }) => {
                dispatch(addVoiceHistoryEntry(buildVoiceHistoryEntry({
                    type: "AUDIO_NO_CONTEXT",
                    source,
                    durationMs,
                    timeRequiredInMs: clinicalCompletedAtMs - submitClickedAtMs,
                    conversation: transcript || "",
                    digitize: [],
                    isDoctorAgent: false,
                    moduleName: "header-dictation",
                })));
            });
        } catch (err) {
            console.error('[HeaderTranscribe] transcription failed', err);
            uploadAndLogVoiceRx2({
                audioBlob,
                patientData: patient_data,
                profile,
                sessionId: voiceDigitization?.sessionId || submitId,
                submitId,
                requestId: submitId,
                submitClickedAt,
                submitClickedAtMs,
                durationMs,
                clinicalStatus: "failed",
                failedPhase: "agents-transcribe-any-audio",
                errorMessage: err?.message || "Header voice transcription failed",
                mode: "dictation",
                voicecall: (voiceDigitization?.voiceCallCount || 0) + 1,
                moduleName: "header-dictation",
                sourceSurface: "header",
                voiceInputLocation,
                isDoctorAgent: false,
                voiceLogCreated: voiceDigitization?.voiceLogCreated,
                markVoiceLogCreated: () => dispatch(markVoiceLogCreated()),
                clinicalCompletedAtMs: Date.now(),
            });
        }
        setHeaderVoiceState("idle");
        headerVoiceTargetIdRef.current = HEADER_DICTATION_TARGET;
        headerVoiceInputLocationRef.current = HEADER_DICTATION_NO_INPUT_LOCATION;
        publishHeaderDictation("idle", HEADER_DICTATION_TARGET);
    }, [copyTranscriptToClipboard, dispatch, insertTranscriptAtCursor, patient_data, profile, publishHeaderDictation, setHeaderVoiceState, voiceDigitization]); // eslint-disable-line react-hooks/exhaustive-deps

    const headerVoiceStartRecording = useCallback(async (triggerType = "manual_click") => {
        if (headerVoiceStateRef.current !== "idle") return;
        if (activeVoiceModule) return;
        const cursor = headerVoiceCursorRef.current;
        const hasCursor = cursor?.element && document.activeElement === cursor.element;
        const targetId = hasCursor ? cursor.targetId : HEADER_DICTATION_TARGET;
        headerVoiceTargetIdRef.current = targetId;
        headerVoiceInputLocationRef.current = hasCursor ? targetId : HEADER_DICTATION_NO_INPUT_LOCATION;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            headerVoiceStreamRef.current = stream;
            const mimeType = getSupportedMimeType();
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            headerVoiceAudioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) headerVoiceAudioChunksRef.current.push(e.data); };
            headerVoiceMediaRecorderRef.current = recorder;
            recorder.start();
            headerVoiceRecordStartMsRef.current = Date.now();
            trackVoiceRx2StartEvent({
                patientData: patient_data,
                profile,
                sessionId: voiceDigitization?.sessionId || "",
                mode: "dictation",
                fromVoiceRecording: true,
                voicecall: voiceDigitization?.voiceCallCount || 0,
                moduleName: "header-dictation",
                sourceSurface: "header",
                voiceInputLocation: headerVoiceInputLocationRef.current || HEADER_DICTATION_NO_INPUT_LOCATION,
                isDoctorAgent: false,
                triggerType,
                triggeredByDoubleShift: triggerType === "double_shift",
                extra: {
                    doctorId: profile?.doctor_unique_id || "",
                    patientId: patient_data?.patient_unique_id || "",
                    trigger_location: "header_dictation_shortcut",
                },
            });
            setHeaderVoiceState("recording");
            publishHeaderDictation("recording", targetId);
        } catch (err) {
            console.error('[HeaderTranscribe] mic access failed', err);
            headerVoiceTargetIdRef.current = HEADER_DICTATION_TARGET;
            headerVoiceInputLocationRef.current = HEADER_DICTATION_NO_INPUT_LOCATION;
            publishHeaderDictation("idle", HEADER_DICTATION_TARGET);
        }
    }, [activeVoiceModule, patient_data, profile, publishHeaderDictation, setHeaderVoiceState, voiceDigitization?.sessionId, voiceDigitization?.voiceCallCount]);

    const headerVoiceCancelRecording = useCallback(() => {
        const recorder = headerVoiceMediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            try { recorder.stop(); } catch (_) {}
        }
        const stream = headerVoiceStreamRef.current;
        if (stream) { stream.getTracks().forEach(t => t.stop()); headerVoiceStreamRef.current = null; }
        headerVoiceAudioChunksRef.current = [];
        setHeaderVoiceState("idle");
        headerVoiceTargetIdRef.current = HEADER_DICTATION_TARGET;
        headerVoiceInputLocationRef.current = HEADER_DICTATION_NO_INPUT_LOCATION;
        publishHeaderDictation("idle", HEADER_DICTATION_TARGET);
    }, [publishHeaderDictation, setHeaderVoiceState]);

    // ── Header transcribe: keyboard triggers ───────────────────────────────
    // double-shift → start | single shift (while recording) → submit | Esc → cancel
    useEffect(() => {
        if (!isVoiceRxNewFromGB) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (headerVoiceStateRef.current === "recording") {
                    headerVoiceCancelRecording();
                }
                return;
            }
            if (e.key !== 'Shift') return;
            const now = Date.now();
            if (headerVoiceStateRef.current === "recording") {
                // any single shift while recording → submit
                headerVoiceLastShiftTimeRef.current = 0;
                headerVoiceStopAndTranscribe();
                return;
            }
            // idle: detect double-shift to start
            if (now - headerVoiceLastShiftTimeRef.current < 500) {
                headerVoiceLastShiftTimeRef.current = 0;
                headerVoiceStartRecording("double_shift");
            } else {
                headerVoiceLastShiftTimeRef.current = now;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isVoiceRxNewFromGB, headerVoiceStartRecording, headerVoiceStopAndTranscribe, headerVoiceCancelRecording]);

    const syncOrderMedicineAndInvestigation = useCallback((resolvedTcmId) => {
        const tokenData = getDecodedToken()?.result;
        const isZydusAccount =
            isZydusUserAccessableFromGB &&
            tokenData?.hospital_business_id == env.zydus_business_id;

        // Every account calls this API; only the payload differs.
        // TODO(mahe): add the Mahe account check here once its identifier is known.
        const isGenxOrderAccount = isZydusAccount;

        const patientUniqueId = patient_data?.patient_unique_id;
        const hasMedication = Array.isArray(medicationData) && medicationData.length > 0;
        const hasInvestigation = Array.isArray(investigationData) && investigationData.length > 0;
        if (!resolvedTcmId || !patientUniqueId || (!hasMedication && !hasInvestigation)) return;

        // Zydus/Mahe send the GenX payload (patientId + creationTimeStamp + services + drugLines).
        // It comes back null when the rows are not GenX-backed (e.g. blank patientId).
        const genxOrderPayload = isGenxOrderAccount
            ? buildGenxOrderMedicineAndInvestigationPayload({
                tcmId: resolvedTcmId,
                patientData: patient_data,
                investigationData,
                medicationData,
                allowRehydratedZydusMedicationRows: true,
            })
            : null;

        // Everyone else — and any Zydus/Mahe case where the GenX payload could not be built —
        // sends the prod payload so the order API still fires exactly like prod.
        const orderPayload = genxOrderPayload || {
            tcm_id: resolvedTcmId,
            patient_unique_id: patientUniqueId,
        };

        const clinic_name = getClinicName(profile?.hospital_data);
        const eventPayload = {
            clinic_name,
            patient_id: patientUniqueId,
            tcm_id: resolvedTcmId,
            hasMedication: genxOrderPayload
                ? Array.isArray(genxOrderPayload.drugLines) && genxOrderPayload.drugLines.length > 0
                : hasMedication,
            hasInvestigation: genxOrderPayload
                ? Array.isArray(genxOrderPayload.services) && genxOrderPayload.services.length > 0
                : hasInvestigation,
        };

        dispatch(orderMedicineAndInvestigation(orderPayload))
            .then((orderAction) => {
                const requestSucceeded =
                    orderAction?.meta?.requestStatus === "fulfilled" &&
                    orderAction?.payload?.status !== false;
                if (requestSucceeded) {
                    window?.Moengage?.track_event("TP_orderMedicineAndInvestigation_API_response", {
                        ...eventPayload,
                        status: "success",
                    });
                } else {
                    const failureReason =
                        orderAction?.payload?.message ||
                        orderAction?.payload?.error ||
                        orderAction?.error?.message ||
                        "request_rejected";
                    window?.Moengage?.track_event("TP_orderMedicineAndInvestigation_API_response", {
                        ...eventPayload,
                        status: "failure",
                        reason: failureReason,
                    });
                }
            });
    }, [dispatch, patient_data, medicationData, investigationData, profile?.hospital_data, isZydusUserAccessableFromGB]);

    const hasRxDrawingCanvasIds =
        (Array.isArray(rxDrawingCanvasIds) && rxDrawingCanvasIds.length > 0) ||
        (typeof rxDrawingCanvasIds === "string" && rxDrawingCanvasIds.split(",").filter(Boolean).length > 0);

    const trackSaveDraftEvent = useCallback(() => {
        window?.Moengage?.track_event(EVENTS.SAVE_DRAFT.save, {
            ...getDraftMoengageDoctorAttributes(profile),
        });
    }, [profile]);
    
    useEffect(() => {
        dispatch(oneClickTemplatesList());
        dispatch(listVideo());
    }, []);

    useEffect(() => {
        setMatchedTemplates(templates);
        setAllTemplates(templates);
    }, [templates]);

    useEffect(() => {
        if (
        isAutofillSelected &&
        selectedSymptomsCollector?.medicalHistory?.length > 0
        ) {
        // Create a new array to store the updated medical history
        let updatedMedicalHistory = [...medicalHistoryData];

        if (updatedMedicalHistory.length === 0) {
            updatedMedicalHistory = selectedSymptomsCollector.medicalHistory?.map((e, i) => {
                return {
                title: e?.title,
                tmmhs_id: e?.tmmhs_id,
                no_know_history:
                    false,
                tags: [],
                };
            });
        }

        // Process each section from selectedSymptomsCollector
        selectedSymptomsCollector.medicalHistory.forEach((section) => {
            // Find the matching section in medicalHistoryData
            const sectionIndex = updatedMedicalHistory.findIndex(
            (item) =>
                item.title === section.title
            );

            if (sectionIndex !== -1) {
            // Process each item in the section
            section.items.forEach((newItem) => {
                // Check if item already exists in the section
                const itemExists = updatedMedicalHistory[
                sectionIndex
                ].tags.some(
                (existingTag) =>
                    existingTag.title?.toLowerCase() ===
                    newItem.name?.toLowerCase()
                );

                // Only add if item doesn't exist
            if (!itemExists) {
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

                default:
                    break;
                }

                // Add the new tag to the section
                updatedMedicalHistory[sectionIndex].tags.push(newTag);
            }
            });
            }
        });

        // Update the medical history state
        setMedicalHistoryData(updatedMedicalHistory);
        }
    }, [isAutofillSelected, selectedSymptomsCollector]);

    async function onResetClick() {
        setSymptomsData([])
        setExaminationData([])
        setDiagnosisData([])
        setAdviceData([])
        setInvestigationData([])
        setMedicationData([])
        // setVitalsData([])
        // setMedicalHistoryData([])
        setPrivateNotesData(null)
        setFollowUpDate(null)
        setAdditionalNote('')
        setSurgeriesData([]);
        setCustomModuleContents([]);
        dispatch(resetOpthalForm());
    }

    const showClearConfirmation = useCallback(() => {
        setIsClearModalOpen(true);
    }, []);

    const showHideClearModal = useCallback(() => {
        setIsClearModalOpen(false);
    }, []);

    const handleConfirmClear = async () => {
        await onResetClick();
        setIsClearModalOpen(false);
    };

    const items = [
        {
            label: <div onClick={showClearConfirmation}>Clear</div>,
            key: 'clear',
        },
    ];
    // const languageItems = [
    //     {
    //         label: '1st menu item',
    //         key: '0',
    //     },
    //     {
    //         label: '2nd menu item',
    //         key: '1',
    //     },
    //     {
    //         label: '3rd menu item',
    //         key: '3',
    //     },
    // ];

    // Helper function to check if custom module content has data (supports both V1 and V2)
    const hasCustomModuleContent = useCallback(() => {
        return customModuleContents?.some((e) => {
            return e?.content?.some(row => {
                if (e.module_version === "v2") {
                    // For V2 modules, check if any named field has content
                    const { id, ...fields } = row;
                    return Object.values(fields).some(value => value && value.toString().trim().length > 0);
                } else {
                    // For V1 modules, check for title or notes
                    return row.title || row.notes;
                }
            });
        });
    }, [customModuleContents]);

    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    // Handle Template Drawer
    const handleDrawerTemplate = useCallback(() => {
        setTemplateDrawer(!templateDrawer);
    }, [templateDrawer]);

    // Handle Save Drawer
    const handleDrawerSave = useCallback(() => {
        setInputTemplateName(null);
        setSaveDrawer(!saveDrawer);
    }, [saveDrawer]);

    //PopOver1 function
    const showHideTemplatesListPopover = useCallback(() => {
        setPopOver1(!popOver1);
    }, [popOver1]);

    const onSearch = (e) => {
        const searchQuery = e.target.value;
        if (searchQuery) {
            let filteredTemplates = templates.filter((template) => {
                return template.tmoc_template_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            });
            setMatchedTemplates(filteredTemplates);
        } else {
            setMatchedTemplates(templates);
        }
    };

    const onTemplateSelected = async (tmoc_id, tmoc_template_name) => {
        oneClickCosultationTemplateId = tmoc_id
        window.Moengage.track_event("one_click_template_select", {
            "template_name": tmoc_template_name
        });
        const action = await dispatch(
            oneClickSingleTemplateDetails({
                templateId: tmoc_id,
                isChikitsalayAccessable,
            })
        );
        if (action.meta.requestStatus === "fulfilled") {
            const data = action.payload
            if (data !== undefined) {
                if (data?.opthalModuleData) {
                    const slitLampRows = data.opthalModuleData?.slitLampExamination;
                    const fundusRows = data.opthalModuleData?.fundusExamination;
                    if (hasSectionData(slitLampRows)) {
                        const values = buildSectionTableValues("slitLampTable", slitLampRows);
                        dispatch(setOpthalTableValues({ tableId: "slitLampTable", values }));
                    }
                    if (hasSectionData(fundusRows)) {
                        const values = buildSectionTableValues("fundusTable", fundusRows);
                        dispatch(setOpthalTableValues({ tableId: "fundusTable", values }));
                    }
                }
                if (data.symptoms.length > 0) {
                    const updatedData = data.symptoms.map(e => {
                        return { ...e, unique_id: uuidv4(), since: "", severity: "", note: "" }
                    })
                    setSymptomsData([...symptomsData, ...updatedData]);
                }
                if (data.examination.length > 0) {
                    const updatedData = data.examination.map(e => {
                        return { ...e, unique_id: uuidv4(), note: "" }
                    })
                    setExaminationData([...examinationData, ...updatedData]);
                }
                if (data?.surgeries && data.surgeries?.length > 0) {
                  const updatedData = data.surgeries.map((e) => {
                    return { ...e, unique_id: uuidv4(), notes: "" };
                  });
                  setSurgeriesData([...surgeriesData, ...updatedData]);
                }
                if (data.diagnosis.length > 0) {
                    const updatedData = data.diagnosis.map(e => {
                        return { ...e, unique_id: uuidv4(), since: "", status: e.hasOwnProperty('status') ? e.status : "", note: "" }
                    })
                    setDiagnosisData([...diagnosisData, ...updatedData]);
                }
                if (data.advice.length > 0) {
                    const updatedData = data.advice.map(e => {
                        return { ...e, unique_id: uuidv4() }
                    })
                    setAdviceData([...adviceData, ...updatedData]);
                }
                if (data.investigation.length > 0) {
                    const updatedData = data.investigation.map(e => {
                        return { ...e, unique_id: uuidv4(), note: "" }
                    })
                    setInvestigationData([...investigationData, ...updatedData]);
                }
                if (data.medicine.length > 0) {
                    if (!isMobile) {
                        const updatedData = data.medicine.map((e) => {

                            const unitObj = e?.medicineUnit ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit) : null;
                            const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
                            const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

                            return {
                                ...e,
                                tmm_unit_name: unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
                                tmm_freq_type_name:
                                    e.tmf_block == 0
                                        ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                                            ? e.tcm_tmm_freq_morning + " - "
                                            : "0 -"
                                        }${e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                                            ? e.tcm_tmm_freq_afternoon + " - "
                                            : "0 -"
                                        }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                                            ? e.tcm_tmm_freq_evening + " - "
                                            : ""
                                        }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                                            ? e.tcm_tmm_freq_night
                                            : "0"}`
                                        : frequencyObj !== undefined
                                            ? frequencyObj.tmf_title
                                            : "",
                                tmf_block_val: frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
                                tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
                                tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
                                tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
                                unique_id: uuidv4(),
                            };
                        });
                        setMedicationData([...medicationData, ...updatedData])
                    } else {
                        const updatedData = data.medicine.map((e) => {
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
                                (x) => x.tmf_id == e.tmm_freq_type
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
                                tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
                                unique_id: uuidv4(),
                            };
                        });
                        setMedicationData([...medicationData, ...updatedData])
                    }
                }
                if(data?.userModules?.length > 0){
                    const moduleMap = new Map();
                    
                    // First, preserve ALL existing custom module data (both V1 and V2)
                    customModuleContents.forEach((module) => {
                      // Filter content based on module version
                      let filteredContent;
                      if (module.module_version === "v2") {
                        // For V2 modules, check if any named field has content
                        filteredContent = module?.content?.filter((row) => {
                          const { id, ...fields } = row;
                          return Object.values(fields).some(value => value && value.toString().trim().length > 0);
                        });
                      } else {
                        // For V1 modules, check for title or notes
                        filteredContent = module?.content?.filter((e) => e.title || e.notes);
                      }
                      moduleMap.set(module.module_id, { ...module, content: filteredContent || [] });
                    });
                    
                    // Then, add template module data to existing modules
                    data?.userModules?.forEach((module) => {
                        if(customModules?.find((x) => x.module_id == module.module_id)){
                            if (moduleMap.has(module.module_id)) {
                                const existingModule = moduleMap.get(module.module_id);
                                moduleMap.set(module.module_id, {
                                  ...existingModule,
                                  content: [
                                    ...existingModule.content,
                                    ...module.content,
                                  ],
                                });
                              } else {
                                moduleMap.set(module.module_id, { ...module });
                              }
                        }
                    });
                    setCustomModuleContents(Array.from(moduleMap.values()));
                }
            }
            (isMobile || (isTablet && isNewPrescriptionUi) || (isCompactHeader && showVoiceRxModule)) ? handleDrawerTemplate() : showHideTemplatesListPopover()
        } else {
            errorMessage(action.error)
        }
    };

    const onDeleteTemplateClicked = async (tmoc_id) => {
        const action = await dispatch(oneClickDeleteTemplate(tmoc_id));
        if (action.meta.requestStatus === "rejected") {
            errorMessage(action.error)
        }
    };

    //PopOver2 function
    const showHideSaveTemplatePopOver = useCallback(() => {
        setPopOver2(!popOver2);
    }, [popOver2]);

    const onTabChange = useCallback(
        (key) => {
            setInputTemplateName(null);
            setTabChange(key);
        },
        [tabChange]
    );

    const onChangeSaveTemplate = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value)
            setInputTemplateName(updateQuery);
        },
        [inputTemplateName]
    );

    const onAddTemplateClicked = async () => {
        let updatedMedication = []
        if (!isMobile) {
            updatedMedication = [...medicationData]
        } else {
            updatedMedication = medicationData.map((e) => {
                const medicineUnit = e?.medicineUnit.map((e1) => {
                    return {
                        tmu_id: JSON.parse(e1.key).tmu_id,
                        tmu_title: JSON.parse(e1.key).tmu_title,
                    };
                });

                return {
                    ...e,
                    medicineUnit: medicineUnit,
                };
            });
        }
        const templateSymptoms = symptomsData;
        const templateExaminations = examinationData;
        const templateSurgeries = surgeriesData;
        const templateDiagnosis = diagnosisData;
        const templateInvestigations = investigationData;

        if (shouldUseChikitsalayInventoryValidation && (
            templateDiagnosis.some(hasInvalidChikitsalayDiagnosis) ||
            templateInvestigations.some(hasInvalidChikitsalayInvestigation) ||
            updatedMedication.some(hasInvalidChikitsalayMedication)
        )) {
            errorMessage(getInvalidChikitsalayInventoryMessage({
                diagnosisData: templateDiagnosis,
                investigationData: templateInvestigations,
                medicationData: updatedMedication,
            }));
            return;
        }
        
        var sendData = {
            tmoc_template_name: inputTemplateName,
            data: {
                symptoms: templateSymptoms.map(({ symptom_name, change }) => ({ symptom_name, ...(change !== undefined && { change }) })),
                examination: templateExaminations.map(({ examination_name, change }) => ({ examination_name, ...(change !== undefined && { change }) })),
                surgeries: templateSurgeries.map(({ name, change, masterId, notes }) => ({ name, masterId, notes, ...(change !== undefined && { change }) })),
                diagnosis: templateDiagnosis.map(({ tds_id, tds_name, icd_code, status, pms_default, change }) => ({ tds_id, tds_name, icd_code, status, pms_default, ...(change !== undefined && { change }) })),
                medicine: updatedMedication,
                advice: adviceData.map(({ advice_name, change }) => ({ advice_name, ...(change !== undefined && { change }) })),
                investigation: templateInvestigations.map(({ investigation_name, change, id, service_code }) => ({ investigation_name, ...(change !== undefined && { change }), ...(id != null && String(id).trim() !== "" && { id }), ...(service_code != null && String(service_code).trim() !== "" && { service_code }) })),
                userModules: customModuleContents?.map((e) => {
                    // Filter content based on module version
                    let filteredContent;
                    if (e.module_version === "v2") {
                        // For V2 modules, filter rows with content and remove 'id' field
                        filteredContent = e.content
                            ?.filter((row) => {
                                const { id, ...fields } = row;
                                return Object.values(fields).some(value => value && value.toString().trim().length > 0);
                            })
                            .map((row) => {
                                // Remove 'id' field from the actual payload
                                const { id, ...cleanRow } = row;
                                return cleanRow;
                            });
                    } else {
                        // For V1 modules, check for title or notes
                        filteredContent = e.content?.filter(c => c?.title || c?.notes);
                    }
                    return {...e, content: filteredContent};
                }),
                opthalModuleData: buildOpthalTemplatePayload(),
            }
        }

        const action = await dispatch(oneClickAddTemplate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            // const updatedData = symptomsData.map(e => {
            //     const obj = { ...e };
            //     delete obj['change'];
            //     return obj;
            //     return { ...e, change: 0 }
            // })
            if (symptomsData.length > 0) {
                const updatedData = symptomsData.map(e => {
                    return { ...e, change: 0 }
                })
                setSymptomsData(updatedData)
            }

            if (examinationData.length > 0) {
                const updatedData = examinationData.map(e => {
                    return { ...e, change: 0 }
                })
                setExaminationData(updatedData)
            }

            if (surgeriesData.length > 0) {
              const updatedData = surgeriesData.map((e) => {
                return { ...e, change: 0 };
              });
              setSurgeriesData(updatedData);
            }

            if (diagnosisData.length > 0) {
                const fetchDiagnosisList = action.payload.diagnosis
                const updatedData = diagnosisData.map((e, i) => {
                    return { ...e, ...fetchDiagnosisList[i], change: 0 }
                })
                setDiagnosisData(updatedData)
            }

            if (adviceData.length > 0) {
                const updatedData = adviceData.map(e => {
                    return { ...e, change: 0 }
                })
                setAdviceData(updatedData)
            }

            if (investigationData.length > 0) {
                const updatedData = investigationData.map(e => {
                    return { ...e, change: 0 }
                })
                setInvestigationData(updatedData)
            }

            if(customModuleContents?.length > 0){
                const updatedData = customModuleContents?.map(e => {
                    return { ...e, change: 0 }
                })
                setCustomModuleContents(updatedData);
            }

            setInputTemplateName(null);
            !isMobile ? showHideSaveTemplatePopOver() : handleDrawerSave()
        }
    };

    const onSearchTemplate = useCallback(() => {
        setInputTemplateName(null);
    }, [inputTemplateName]);

    const onSelectTemplate = useCallback(
        (data, e) => {
            setInputTemplateName(e.key);
        },
        [inputTemplateName]
    );

    const onUpdateTemplateClicked = async () => {
        let updatedMedication = []
        if (!isMobile) {
            updatedMedication = [...medicationData]
        } else {
            updatedMedication = medicationData.map((e) => {
                const medicineUnit = e?.medicineUnit.map((e1) => {
                    return {
                        tmu_id: JSON.parse(e1.key).tmu_id,
                        tmu_title: JSON.parse(e1.key).tmu_title,
                    };
                });

                return {
                    ...e,
                    medicineUnit: medicineUnit,
                };
            });
        }
        const templateSymptoms = symptomsData;
        const templateExaminations = examinationData;
        const templateSurgeries = surgeriesData;
        const templateDiagnosis = diagnosisData;
        const templateInvestigations = investigationData;

        if (shouldUseChikitsalayInventoryValidation && (
            templateDiagnosis.some(hasInvalidChikitsalayDiagnosis) ||
            templateInvestigations.some(hasInvalidChikitsalayInvestigation) ||
            updatedMedication.some(hasInvalidChikitsalayMedication)
        )) {
            errorMessage(getInvalidChikitsalayInventoryMessage({
                diagnosisData: templateDiagnosis,
                investigationData: templateInvestigations,
                medicationData: updatedMedication,
            }));
            return;
        }

        var data = JSON.parse(inputTemplateName);
        var sendData = {
            tmoc_id: data.tmoc_id,
            tmoc_template_name: data.tmoc_template_name,
            data: {
                symptoms: templateSymptoms.map(({ symptom_name, change }) => ({ symptom_name, ...(change !== undefined && { change }) })),
                examination: templateExaminations.map(({ examination_name, change }) => ({ examination_name, ...(change !== undefined && { change }) })),
                surgeries: templateSurgeries.map(({ name, change, masterId, notes }) => ({ name, masterId, notes, ...(change !== undefined && { change }) })),
                diagnosis: templateDiagnosis.map(({ tds_id, tds_name, status, pms_default }) => ({ tds_id, tds_name, status, pms_default })),
                medicine: updatedMedication,
                advice: adviceData.map(({ advice_name, change }) => ({ advice_name, ...(change !== undefined && { change }) })),
                investigation: templateInvestigations.map(({ investigation_name, change, id, service_code }) => ({ investigation_name, ...(change !== undefined && { change }), ...(id != null && String(id).trim() !== "" && { id }), ...(service_code != null && String(service_code).trim() !== "" && { service_code }) })),
                userModules: customModuleContents?.map((e) => {
                    // Filter content based on module version
                    let filteredContent;
                    if (e.module_version === "v2") {
                        // For V2 modules, filter rows with content and remove 'id' field
                        filteredContent = e.content
                            ?.filter((row) => {
                                const { id, ...fields } = row;
                                return Object.values(fields).some(value => value && value.toString().trim().length > 0);
                            })
                            .map((row) => {
                                // Remove 'id' field from the actual payload
                                const { id, ...cleanRow } = row;
                                return cleanRow;
                            });
                    } else {
                        // For V1 modules, check for title or notes
                        filteredContent = e.content?.filter(c => c?.title || c?.notes);
                    }
                    return {...e, content: filteredContent};
                }),
                opthalModuleData: buildOpthalTemplatePayload(),
            }
        }
        const action = await dispatch(oneClickUpdateTemplate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            // const updatedData = symptomsData.map(e => {
            //     const obj = { ...e };
            //     delete obj['change'];
            //     return obj;
            //     return { ...e, change: 0 }
            // })
            if (symptomsData.length > 0) {
                const updatedData = symptomsData.map(e => {
                    return { ...e, change: 0 }
                })
                setSymptomsData(updatedData)
            }

            if (examinationData.length > 0) {
                const updatedData = examinationData.map(e => {
                    return { ...e, change: 0 }
                })
                setExaminationData(updatedData)
            }

            if (surgeriesData.length > 0) {
              const updatedData = surgeriesData.map((e) => {
                return { ...e, change: 0 };
              });
              setSurgeriesData(updatedData);
            }

            if (diagnosisData.length > 0) {
                const fetchDiagnosisList = action.payload.diagnosis
                const updatedData = diagnosisData.map((e, i) => {
                    return { ...e, ...fetchDiagnosisList[i] }
                })
                setDiagnosisData(updatedData)
            }

            if (adviceData.length > 0) {
                const updatedData = adviceData.map(e => {
                    return { ...e, change: 0 }
                })
                setAdviceData(updatedData)
            }

            if (investigationData.length > 0) {
                const updatedData = investigationData.map(e => {
                    return { ...e, change: 0 }
                })
                setInvestigationData(updatedData)
            }

            if(customModuleContents?.length > 0){
                const updatedData = customModuleContents?.map(e => {
                    return { ...e, change: 0 }
                })
                setCustomModuleContents(updatedData);
            }

            setInputTemplateName(null);
            !isMobile ? showHideSaveTemplatePopOver() : handleDrawerSave()
        }

    };

    const showHideModal = useCallback((template_id) => {
        template_id !== undefined ? setRemoveTemplateId(template_id) : setRemoveTemplateId(null)
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    //Template Remove
    const DELETE_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={500}
                zIndex={headerOverlayZIndex}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to delete this template?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={() => {
                                    onDeleteTemplateClicked(removeTemplateId)
                                    showHideModal()
                                }}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    Yes Delete
                                </div>
                                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen]);

    const CLEAR_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isClearModalOpen}
                onCancel={showHideClearModal}
                modalWidth={500}
                zIndex={headerOverlayZIndex}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to clear all prescription data?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div
                                    onClick={handleConfirmClear}
                                    className="me-4 text-decoration-underline btn p-0 text-main"
                                >
                                    Clear
                                </div>
                                <Button onClick={showHideClearModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [handleConfirmClear, isClearModalOpen, showHideClearModal]);

    //Template Componet Web
    const TEMPLATE_CONTENT_WEB = useCallback(() => {
        return (
            <>
                <div className="pop-header" key="oneclickrx-template">
                    <div className="align-items-center d-flex justify-content-between">
                        <div className="title-common">One Click Rx Templates</div>
                        <Button
                            className="btn btn-delete-prescription p-0"
                            onClick={showHideTemplatesListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    <div className="mt-3" key="symptoms-template-search">
                        <Input
                            allowClear
                            className="popinput"
                            onChange={onSearch}
                            placeholder="Search Templates"
                            prefix={<i className="icon-search me-2" />}
                        />
                    </div>
                </div>
                <div className="pop-body">
                    {matchedTemplates.length > 0 &&
                        matchedTemplates.map((template, i) => {
                            return (
                                <div
                                    className="align-items-center d-flex medicine-templates"
                                    key={i}
                                >
                                    <div
                                        className="round-box"
                                        onClick={() => onTemplateSelected(template.tmoc_id, template.tmoc_template_name)}
                                    >
                                        <i className="icon-template"></i>
                                    </div>
                                    <div
                                        className="text-truncate w-100"
                                        onClick={() => onTemplateSelected(template.tmoc_id, template.tmoc_template_name)}
                                    >
                                        <div className="title text-main2">{template.tmoc_template_name}</div>
                                        <div className="text-truncate">{template.medicine_name}</div>
                                    </div>
                                    <Button
                                        className="btn btn-delete-prescription p-0 ms-2"
                                        onClick={() => {
                                            showHideModal(template.tmoc_id)
                                            showHideTemplatesListPopover()
                                        }}
                                    >
                                        {template.loading ? (
                                            <Spin
                                                indicator={
                                                    <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                }
                                            />
                                        ) : (
                                            <i className="icon-delete"></i>
                                        )}
                                    </Button>
                                </div>
                            );
                        })}
                </div>
            </>
        );
    }, [popOver1, matchedTemplates]);

    //Save Componet Web
    const SAVE_CONTENT_WEB = useCallback(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100"
                    />
                    <Button
                        className="btn btn-delete-prescription"
                        onClick={showHideSaveTemplatePopOver}
                    >
                        <i className="icon-Cross"></i>
                    </Button>
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="pop-header d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="pop-header d-flex">
                        <Select
                            showSearch
                            value={inputTemplateName && JSON.parse(inputTemplateName).tmoc_template_name}
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tmoc_template_name,
                                    label: (
                                        <div key={template.tst_id}>
                                            {template.tmoc_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box"><i className="icon-template"></i></div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">{JSON.parse(option.data.key).medicine_name}</div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, popOver2, inputTemplateName, loading, allTemplates]);

    //Template Componet Tab
    const TEMPLATE_CONTENT_TAB = useMemo(() => {
        return (
            <>
                <div>
                    <div className="medicine-templates">
                        <Input className="popinput" onChange={onSearch} placeholder="Search Templates" prefix={<i className='icon-search me-2'></i>} allowClear />
                    </div>
                    <div className="tab-template-height" >
                        {matchedTemplates.length > 0 &&
                            matchedTemplates.map((template, i) => {
                                return (
                                    <div className="align-items-center d-flex justify-content-between medicine-templates" key={i}>
                                        <div className="align-items-center d-flex text-truncate w-100" onClick={() => onTemplateSelected(template.tmoc_id, template.tmoc_template_name)}>
                                            <div className="round-box"><i className="icon-template"></i></div>
                                            <div className="text-truncate w-100">
                                                <div className="title text-main2">{template.tmoc_template_name}</div>
                                                <div className="text-truncate">{template.medicine_name}</div>
                                            </div>
                                        </div>
                                        <Button className="btn btn-delete-prescription p-0 ms-3" onClick={() => showHideModal(template.tmoc_id)}>
                                            {template.loading ? (
                                                <Spin
                                                    indicator={
                                                        <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                    }
                                                />
                                            ) : (
                                                <i className="icon-delete"></i>
                                            )}
                                        </Button>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </>
        );
    }, [templateDrawer, matchedTemplates]);

    //Save Componet Tab
    const SAVE_CONTENT_TAB = useMemo(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100" />
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="medicine-templates d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="medicine-templates d-flex">
                        <Select
                            showSearch
                            value={inputTemplateName && JSON.parse(inputTemplateName).tmoc_template_name}
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tmoc_template_name,
                                    label: (
                                        <div key={template.tst_id}>
                                            {template.tmoc_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box"><i className="icon-template"></i></div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">{JSON.parse(option.data.key).medicine_name}</div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, saveDrawer, inputTemplateName, loading, allTemplates]);

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
                page="normal-rx-page"
                isTabRx={Boolean(isTabPrescription)}
            />
        );
    }, [customizeDrawer, isTabPrescription, isVaccinationEnabled, isGrowthChartEnabled, handleDrawerCustomize]);
    
    const hasOpthalValues = useCallback(() => {
        return (
            Object.values(ophthalmologyExam?.visualAcuity || {}).some((eye) =>
                Object.values(eye || {}).some((value) => value)
            ) ||
            Object.values(ophthalmologyExam?.tables || {}).some((table) =>
                Object.values(table || {}).some((value) => value)
            ) ||
            Object.values(ophthalmologyExam?.extraFields || {}).some((value) => value)
        );
    }, [ophthalmologyExam]);

    const hasSymptomsWithSince = useMemo(
        () =>
            symptomsData.length > 0 &&
            symptomsData.every(
                (symptom) => String(symptom?.since ?? "").trim() !== ""
            ),
        [symptomsData]
    );

    const hasMedicationsFrequencyAndDuration = useMemo(
        () => medicationsHaveFrequencyAndDuration(medicationData),
        [medicationData]
    );

    const hasOutOfStockMedication = useMemo(
        () =>
            medicationData.some(
                (medication) =>
                    medication?.stock_status === MEDICINE_STOCK_STATUS.NO_STOCK
            ),
        [medicationData]
    );

    const hasDiagnosisNameAndIcdCode = useMemo(
        () =>
            diagnosisData.length > 0 &&
            diagnosisData.every(
                (diagnosis) =>
                    String(diagnosis?.tds_name ?? "").trim() !== "" &&
                    String(diagnosis?.icd_code ?? "").trim() !== ""
            ),
        [diagnosisData]
    );

    const hasValidChikitsalayInventoryRows = useMemo(
        () =>
            !(
                diagnosisData.some(hasInvalidChikitsalayDiagnosis) ||
                investigationData.some(hasInvalidChikitsalayInvestigation) ||
                medicationData.some(hasInvalidChikitsalayMedication)
            ),
        [diagnosisData, investigationData, medicationData]
    );

    const invalidChikitsalayInventoryMessage = useMemo(
        () =>
            getInvalidChikitsalayInventoryMessage({
                diagnosisData,
                investigationData,
                medicationData,
            }),
        [diagnosisData, investigationData, medicationData]
    );

    const endVisitTooltipMessage = useMemo(() => {
        if (isChikitsalayAccessable) {
            const missingMedicationFields =
                medicationData.length > 0 && !hasMedicationsFrequencyAndDuration;

            if (!hasSymptomsWithSince && diagnosisData.length === 0) {
                return "Please fill Symptoms and Diagnosis to end the consultation.";
            } else if (!hasSymptomsWithSince) {
                return "Please fill Symptoms and Since to end the consultation.";
            } else if (diagnosisData.length === 0) {
                return "Please fill Diagnosis to end the consultation.";
            } else if (!hasDiagnosisNameAndIcdCode) {
                return "Please fill Diagnosis names that has ICD codes for all diagnoses to end the consultation.";
            } else if (shouldUseChikitsalayInventoryValidation && !hasValidChikitsalayInventoryRows) {
                return invalidChikitsalayInventoryMessage;
            } else if (hasOutOfStockMedication) {
                return "Please select an in-stock medicine or alternative to end the consultation.";
            } else if (missingMedicationFields) {
                return "Please fill Frequency and Duration for all medicines to end the consultation.";
            }
        }
        return "Please fill your prescription to end visit.";
    }, [
        isChikitsalayAccessable,
        hasSymptomsWithSince,
        diagnosisData,
        hasDiagnosisNameAndIcdCode,
        hasValidChikitsalayInventoryRows,
        invalidChikitsalayInventoryMessage,
        shouldUseChikitsalayInventoryValidation,
        hasOutOfStockMedication,
        medicationData.length,
        hasMedicationsFrequencyAndDuration,
    ]);

    const opthalTablesById = useMemo(() => {
        return OPHTHALMOLOGY_SECTIONS.reduce((acc, section) => {
            section.tables.forEach((table) => {
                acc[table.id] = table;
            });
            return acc;
        }, {});
    }, []);

    const hasOphthalValue = useCallback((value) => {
        if (value === 0 || value === "0") return true;
        if (value === null || value === undefined) return false;
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    }, []);

    const hasSectionData = useCallback((items) => {
        if (!Array.isArray(items)) return false;
        return items.some((item) =>
            ["OD", "OS", "od", "os", "remarks"].some((key) => hasOphthalValue(item?.[key]))
        );
    }, [hasOphthalValue]);

    const hasOphthalPayloadData = useCallback((data) => {
        if (!data) return false;
        const hasOphthalArrayData = (items, keys) =>
            Array.isArray(items) &&
            items.some((item) => keys.some((key) => hasOphthalValue(item?.[key])));

        return (
            hasOphthalArrayData(data.visualAcuity, [
                "ucDistance",
                "ucNear",
                "pinhole",
                "cDistance",
                "cNear",
            ]) ||
            hasOphthalArrayData(data.autoRefraction, [
                "sphere",
                "cylinder",
                "axis",
                "add",
                "distance",
                "near",
            ]) ||
            hasOphthalArrayData(data.lensometerValues, [
                "sphere",
                "cylinder",
                "axis",
                "add",
                "distance",
                "near",
            ]) ||
            hasOphthalArrayData(data.glassPrescription, [
                "sphere",
                "cylinder",
                "axis",
                "add",
                "distance",
                "near",
            ]) ||
            hasOphthalArrayData(data.intraOcularPressure, [
                "nct",
                "gat",
                "cc",
                "cct",
                "ciop",
            ]) ||
            hasOphthalArrayData(data.slitLampExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalArrayData(data.fundusExamination, ["OD", "OS", "remarks"]) ||
            hasOphthalValue(data.pd)
        );
    }, [hasOphthalValue]);

    const buildSectionTableValues = useCallback((tableId, rows) => {
        const table = opthalTablesById[tableId];
        if (!table) return {};
        const nextValues = {};
        const normalize = (value) => String(value || "").toLowerCase();
        table.rows.forEach((row) => {
            const entry = rows?.find((item) => {
                const labelMatch = normalize(item?.section ?? item?.title ?? item?.name);
                const keyMatch = normalize(
                    item?.sectionKey ?? item?.section_key ?? item?.key ?? item?.id
                );
                return (
                    labelMatch === normalize(row.label) || keyMatch === normalize(row.key)
                );
            });
            table.columns.forEach((column) => {
                if (column.type === "label") return;
                const cellKey = `${row.key}-${column.key}`;
                if (column.key === "od") {
                    nextValues[cellKey] = entry?.OD ?? entry?.od ?? "";
                    return;
                }
                if (column.key === "os") {
                    nextValues[cellKey] = entry?.OS ?? entry?.os ?? "";
                    return;
                }
                nextValues[cellKey] = entry?.[column.key] ?? "";
            });
        });
        return nextValues;
    }, [opthalTablesById]);

    const buildOpthalTemplatePayload = useCallback(() => {
        const payload = buildOpthalPayload({
            sections: OPHTHALMOLOGY_SECTIONS,
            tables: ophthalmologyExam?.tables,
            extraFields: ophthalmologyExam?.extraFields,
            visualAcuity: ophthalmologyExam?.visualAcuity,
        });
        return {
            slitLampExamination: payload.slitLampExamination || [],
            fundusExamination: payload.fundusExamination || [],
        };
    }, [ophthalmologyExam]);

    const buildMedicinePayload = useCallback(async () => {
        const getVoiceRxMedicineName = (item = {}) => (
            item.tmm_medicine_name ||
            item.medicine_name ||
            item.voice_rx_original_name ||
            item.name ||
            ""
        );

        const payload = [];
        const createdVoiceMedicineByGroup = new Map();
        const defaultMedicineType = Array.isArray(medicineTypeList) ? medicineTypeList[0]?.tmy_id : 0;

        for (const { medicineUnit, ...rest } of medicationData) {
            const shouldKeepUnitMetadata = showVoiceRxModule && (
                rest?.voice_rx_group_id ||
                rest?.voice_rx_original_name ||
                rest?.tmm_dosage_unit_name ||
                rest?.tmm_unit_name
            );
            const voiceMedicineUnits = shouldKeepUnitMetadata
                ? mergeMedicineUnitOptions(medicineUnit, CUSTOM_MEDICINE_UNITS)
                : medicineUnit;
            const dashedFrequencyFields = getDashedMedicineFrequencyFields(rest);
            if (!needsCustomMedicineCreate(rest)) {
                if (shouldKeepUnitMetadata) {
                    const doseFields = resolveCopiedDoseFields(rest, voiceMedicineUnits, {
                        defaultIfMissing: true,
                        defaultDose: "1",
                        includeCustomUnits: true,
                    });
                    const resolvedUnit = doseFields.tmm_unit || rest.tmm_unit || rest.tmu_id || rest.default_tmm_unit || 0;
                    payload.push({
                        ...rest,
                        ...dashedFrequencyFields,
                        ...doseFields,
                        tmm_unit: resolvedUnit,
                        tmu_id: resolvedUnit,
                        default_tmm_unit: rest.default_tmm_unit || resolvedUnit,
                        medicineUnit: voiceMedicineUnits,
                    });
                } else {
                    payload.push(rest);
                }
                continue;
            }

            const medicineName = getVoiceRxMedicineName(rest);
            const medicineGroupKey = String(
                rest.voice_rx_group_id ||
                rest.voice_rx_original_name ||
                medicineName
            ).trim().toLowerCase();
            let createdMedicine = createdVoiceMedicineByGroup.get(medicineGroupKey);

            if (!createdMedicine) {
                const customVoiceMedicineType = showVoiceRxModule ? CUSTOM_MEDICINE_TYPE_ID : rest.tmm_type || defaultMedicineType || 0;
                const action = await dispatch(addMedicine({
                    tmm_medicine_name: medicineName,
                    tmm_type: customVoiceMedicineType,
                    tmm_generic: rest.tmm_generic || "",
                    tmm_company: rest.tmm_company || "",
                }));
                if (action.meta.requestStatus !== "fulfilled") {
                    throw new Error(action?.error?.message || `Failed to add medicine ${medicineName}`);
                }

                createdMedicine = Array.isArray(action.payload) ? action.payload[0] : action.payload;
                if (medicineGroupKey) {
                    createdVoiceMedicineByGroup.set(medicineGroupKey, createdMedicine);
                }
            }

            const createdMedicineUnits = mergeMedicineUnitOptions(
                Array.isArray(createdMedicine?.medicineUnit) && createdMedicine.medicineUnit.length
                    ? createdMedicine.medicineUnit
                    : Array.isArray(medicineUnit) && medicineUnit.length
                        ? medicineUnit
                        : [],
                CUSTOM_MEDICINE_UNITS
            );
            const doseFields = resolveCopiedDoseFields(rest, createdMedicineUnits, {
                defaultIfMissing: true,
                defaultDose: "1",
                fallbackUnitIdOnMissing: CUSTOM_MEDICINE_DEFAULT_UNIT_ID,
                fallbackUnitIdOnUnitMismatch: CUSTOM_MEDICINE_DEFAULT_UNIT_ID,
                fallbackUnitTitle: "unit(s)",
                includeCustomUnits: true,
            });
            const resolvedUnit = doseFields.tmm_unit || rest.tmm_unit || createdMedicine?.default_tmm_unit || createdMedicine?.tmm_unit || 0;

            payload.push({
                ...rest,
                tmm_id: createdMedicine?.tmm_id,
                tmm_medicine_name: createdMedicine?.tmm_medicine_name || medicineName,
                tmm_type: createdMedicine?.tmm_type ?? rest.tmm_type ?? 0,
                tmm_generic: createdMedicine?.tmm_generic ?? rest.tmm_generic ?? "",
                tmm_company: createdMedicine?.tmm_company ?? rest.tmm_company ?? "",
                ...dashedFrequencyFields,
                ...doseFields,
                tmm_unit: resolvedUnit,
                tmu_id: resolvedUnit,
                medicineUnit: createdMedicineUnits,
                voice_rx_original_tmm_id: rest.tmm_id ?? 0,
                voice_rx_from_module: false,
                voice_rx_fuzzy_miss: false,
                voice_rx_requires_inventory_selection: false,
                voice_rx_original_name: rest.voice_rx_original_name || medicineName,
                pms_default: createdMedicine?.pms_default ?? rest.pms_default ?? 1,
                objectID: createdMedicine?.objectID || rest.objectID,
                default_tmm_unit: rest.default_tmm_unit ?? createdMedicine?.default_tmm_unit ?? resolvedUnit ?? 0,
            });
        }

        return payload;
    }, [dispatch, medicationData, medicineTypeList, showVoiceRxModule]);

    const buildInvestigationPayload = useCallback(() => {
        return buildInvestigationEndVisitPayload(investigationData);
    }, [investigationData]);

    const onSaveAsDraft = async () => {
        if (saveDraftLoading) return;
        trackSaveDraftEvent();
        const selectedCanvasCount = Array.isArray(rxDrawingCanvasIds) ? rxDrawingCanvasIds.length
          : typeof rxDrawingCanvasIds === "string" ? rxDrawingCanvasIds.split(",").filter(Boolean).length : 0;
        if (selectedCanvasCount > 0) {
          trackEvent("drawing_canvas_saved_in_draft", {
            specialty: profile?.dp_name,
            specialty_id: profile?.dp_id,
            doctor_unique_id: profile?.doctor_unique_id,
            doctor_name: profile?.um_name,
            patient_id: patient_data?.patient_unique_id,
            consultation_id: tcmId,
            selected_canvas_count: selectedCanvasCount,
            prescription_type: isTabPrescription ? "tab_rx" : "normal_rx",
          });
        }
        setSaveDraftLoading(true);

        try {
          const opthalPayload = buildOpthalPayload({
            sections: OPHTHALMOLOGY_SECTIONS,
            tables: ophthalmologyExam?.tables,
            extraFields: ophthalmologyExam?.extraFields,
            visualAcuity: ophthalmologyExam?.visualAcuity,
            tcmId,
          });
          const opthalId = ophthalmologyExam?.opthalPrescriptionId;
          const opthalPatientId = patient_data?.patient_unique_id;
          const shouldSyncOpthal = hasOphthalPayloadData(opthalPayload);
      
          const medicinePayload = await buildMedicinePayload();
          const investigationPayload = buildInvestigationPayload();

          const sendData = {
            is_draft: 1,
            ui_version: isVoiceRxNewFromGB ? "new" : "old",
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
            medicine: medicinePayload,
            advice: adviceData,
            investigation: investigationPayload,
            vitals: vitalsData,
            follow_up_date: followUpDate,
            visit_advice: additionalNote,
            medical_history: medicalHistoryData,
            private_notes_id:
              privateNotesData?.id !== undefined ? privateNotesData?.id : 0,
            consultation_start_datetime: startTime,
            oneclick_cosultation_template_id: oneClickCosultationTemplateId,
            vaccines: {
              given: givenVaccines,
              due: updatedDueVaccines,
            },
            moduleContents: filterCustomModuleContent(customModuleContents),
            pillup_fulfilment: isPillUpAccessableFromGB && pillupSwitch ? 1 : 0,
            labReportID: labReportID,
            zydusSelectedLabParams: zydusSelectedLabParams,
            canvas_filename: rxDrawingCanvasIds,
          };
      
          const decodedToken = getDecodedToken();
          const tokenData = decodedToken?.result;
          if (
            tokenData?.hospital_business_id == env.zydus_business_id &&
            isZydusUserAccessableFromGB
          ) {
            sendData["zydus_details"] = {
              departmentId: patient_data?.departmentId,
              encounterId: patient_data?.encounterId,
              mrno: patient_data?.mrno,
              doctorCode: patient_data?.employeeId,
              zydusSelectedLabParams: zydusSelectedLabParams,
            };
          }
      
          const caseManagerPromise =
            tcmId == 0
              ? dispatch(addCaseManager(sendData))
              : dispatch(editCaseManager(sendData));
          let action;
      
          if (tcmId == 0) {
            action = await caseManagerPromise;
            const generatedTcmId = action?.payload?.tcm_id ?? tcmId;
            if (shouldSyncOpthal) {
              const opthalPayloadWithTcm = {
                ...opthalPayload,
                tcm_id: generatedTcmId,
              };
              if (opthalId) {
                await updateOpthalPrescription(opthalId, opthalPayloadWithTcm, {
                  patientId: opthalPatientId,
                });
              } else {
                await createOpthalPrescription(opthalPayloadWithTcm, {
                  patientId: opthalPatientId,
                });
              }
            }
          } else {
            if (shouldSyncOpthal) {
              const opthalPromise = opthalId
                ? updateOpthalPrescription(opthalId, opthalPayload, {
                    patientId: opthalPatientId,
                  })
                : createOpthalPrescription(opthalPayload, {
                    patientId: opthalPatientId,
                  });
              [action] = await Promise.all([caseManagerPromise, opthalPromise]);
            } else {
              action = await caseManagerPromise;
            }
          }
      
          if (action?.meta?.requestStatus === "fulfilled") {
            if (
              opthalModuleAutoAdded &&
              customizedPadRightList?.some(
                (item) => item?.tmdpm_id === OPTHAL_PAD_MODULE_ID,
              )
            ) {
              dispatch(
                customizedPad({
                  data: {
                    default: false,
                    reset: false,
                    left: customizedPadLeftList,
                    right: customizedPadRightList,
                  },
                }),
              );
            }
            try {
              const generatedTcmId = action?.payload?.tcm_id ?? tcmId;

              if (generatedTcmId > 0 && selectedCarePlan) {
                if (
                  hasExistingCarePlan &&
                  selectedCarePlan?.plan_name
                ) {
                  // Editing existing consultation with existing care plan: update care plan name against tcm_id
                  await updateCarePlanName(
                    parseInt(generatedTcmId),
                    selectedCarePlan.plan_name,
                  );
                } else if (
                  !hasExistingCarePlan &&
                  selectedCarePlan?.plan_id &&
                  patient_data?.patient_unique_id &&
                  tokenData?.user_id &&
                  tokenData?.clinic_id
                ) {
                  // First-time care plan assignment for this consultation (including new consultations): assign care plan with tcm_id
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
              console.error(
                "Care plan sync after save as draft rx failed:",
                error,
              );
            }
      
            message.open({
              key: MESSAGE_KEY,
              type: "",
              className: "message-appointment",
              content: (
                <div className="d-flex align-items-center">
                  <img src={visitEnd} className="me-3" alt="Check Badge" />
                  <div>
                    <div className="title-common text-start fontroboto">
                      Rx Saved as Draft Successfully
                    </div>
                  </div>
                  <img
                    src={imgCloseVisit}
                    className="ms-3"
                    onClick={() => message.destroy()}
                    alt="Close"
                  />
                </div>
              ),
              duration: 5,
            });
            navigate("/", { replace: true });
          }
        } catch (error) {
          console.error("Save as draft failed:", error);
          errorMessage("Failed to save draft. Please try again.");
        } finally {
          setSaveDraftLoading(false);
        }
    }; 

    async function onEndVisitClick() {
        if (symptomsData.length > 0 && symptomsData.filter(e => e.symptom_name == "").length > 0) {
            errorMessage('Please fillup symptom name')
        } else if (examinationData.length > 0 && examinationData.filter(e => e.examination_name == "").length > 0) {
            errorMessage('Please fillup examination name')
        } else if (surgeriesData.length > 0 && surgeriesData.filter(e => e.name == "").length > 0) {
            errorMessage('Please fillup surgery name')
        } else if (diagnosisData.length > 0 && diagnosisData.filter((e) => e.tds_name == "").length > 0) {
            errorMessage('Please fillup diagnosis name')
        } else if (isChikitsalayAccessable && !hasDiagnosisNameAndIcdCode) {
            errorMessage('Please add Diagnosis names that has ICD codes for all diagnoses')
        } else if (shouldUseChikitsalayInventoryValidation && !hasValidChikitsalayInventoryRows) {
            errorMessage(invalidChikitsalayInventoryMessage)
        } else if (isChikitsalayAccessable && hasOutOfStockMedication) {
            errorMessage('Please select an in-stock medicine or alternative to end the consultation.')
        } else if (medicationData.length > 0 && medicationData.filter((e) => e.tmm_medicine_name == "").length > 0) {
            errorMessage('Please fillup medication name')
        } else if (adviceData.length > 0 && adviceData.filter(e => e.advice_name == "").length > 0) {
            errorMessage('Please fillup advice name')
        } else if (investigationData.length > 0 && investigationData.filter(e => e.investigation_name == "").length > 0) {
            errorMessage('Please fillup investigation name')
        } else {
            const opthalPayload = buildOpthalPayload({
                sections: OPHTHALMOLOGY_SECTIONS,
                tables: ophthalmologyExam?.tables,
                extraFields: ophthalmologyExam?.extraFields,
                visualAcuity: ophthalmologyExam?.visualAcuity,
                tcmId,
            });

            const opthalId = ophthalmologyExam?.opthalPrescriptionId;
            const opthalPatientId = patient_data?.patient_unique_id;
            const shouldSyncOpthal = hasOphthalPayloadData(opthalPayload);

            const medicinePayload = await buildMedicinePayload();
            const investigationPayload = buildInvestigationPayload();

            var sendData = {
                ui_version: isVoiceRxNewFromGB ? "new" : "old",
                action: tcmId == 0 ? 'add' : 'edit',
                tcm_id: tcmId,
                patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
                pam_id: patient_data !== undefined ? patient_data.hasOwnProperty('pam_id') ? patient_data.pam_id : pamId : 0,
                consultation_date: consultationDate,
                symptoms: symptomsData,
                examination: examinationData,
                surgeries: surgeriesData,
                diagnosis: diagnosisData,
                medicine: medicinePayload,
                advice: adviceData,
                investigation: investigationPayload,
                vitals: vitalsData,
                follow_up_date: followUpDate,
                visit_advice: additionalNote,
                medical_history: medicalHistoryData,
                private_notes_id: privateNotesData?.id !== undefined ? privateNotesData?.id : 0,
                consultation_start_datetime: startTime,
                oneclick_cosultation_template_id: oneClickCosultationTemplateId,
                vaccines: {
                    given: givenVaccines,
                    due: updatedDueVaccines
                },
                moduleContents: (customModuleContents || [])
                    .map((e) => {
                        if (!e) return null;
                        // Filter content based on module version
                        let filteredContent;
                        if (e.module_version === "v2") {
                            // For V2 modules, filter rows with content and remove 'id' field
                            filteredContent = e.content
                                ?.filter((row) => {
                                    // Check if any field (except 'id') has content
                                    const { id, ...fields } = row || {};
                                    return Object.values(fields).some(
                                        (value) => value && value.toString().trim().length > 0
                                    );
                                })
                                .map((row) => {
                                    // Remove 'id' field from the actual payload
                                    const { id, ...cleanRow } = row || {};
                                    return cleanRow;
                                }) || [];
                        } else {
                            // For V1 modules, check for title or notes
                            filteredContent = (e.content || []).filter(
                                (e1) => e1.title || e1.notes
                            );
                        }

                        // Skip modules with no content after filtering
                        if (!filteredContent || filteredContent.length === 0) {
                            return null;
                        }

                        return { ...e, content: filteredContent };
                    })
                    .filter(Boolean),
                pillup_fulfilment: isPillUpAccessableFromGB && pillupSwitch ? 1 : 0,
                labReportID: labReportID,
                zydusSelectedLabParams: zydusSelectedLabParams,
                canvas_filename: rxDrawingCanvasIds
            };

            const decodedToken = getDecodedToken();
            const tokenData = decodedToken?.result;
            if (tokenData?.hospital_business_id == env.zydus_business_id && isZydusUserAccessableFromGB) {
                sendData['zydus_details'] = {
                    "departmentId": patient_data?.departmentId,
                    "encounterId": patient_data?.encounterId,
                    "mrno": patient_data?.mrno,
                    "doctorCode": patient_data?.employeeId,
                    "zydusSelectedLabParams": zydusSelectedLabParams
                }
            }

            attachCrossConsultToCaseManagerPayload(sendData, referralData, {
                referredBy: profile?.um_name,
                pendingCrossConsult: patient_data,
            });

            const clinic_name = getClinicName(profile?.hospital_data);
            const consultationEventPayload = {
                clinic_name,
                patient_number: patient_data?.pm_contact_no,
                patient_id: patient_data?.patient_unique_id,
                patient_name: patient_data?.pm_fullname || patient_data?.patient_name || [patient_data?.pm_first_name, patient_data?.pm_last_name].filter(Boolean).join(" "),
                doctor_id: profile?.doctor_unique_id,
                doctor_name: profile?.um_name,
                appEnv: process.env.REACT_APP_ENV || "prod",
                tcm_id: tcmId,
            };
            const shouldAttachVoiceCallCount =
                isVoiceRxNewUiFlow &&
                showVoiceRxModule;
            if (shouldAttachVoiceCallCount) {
                consultationEventPayload.voicecall = voiceDigitization?.voiceCallCount || 0;
                consultationEventPayload.voice_rx_session_id = voiceDigitization?.sessionId || "";
                consultationEventPayload.voice_rx_version = VOICE_RX_2_VERSION;
                consultationEventPayload.voice_rx_history_count = Array.isArray(voiceDigitization?.history) ? voiceDigitization.history.length : 0;
                consultationEventPayload.voice_rx_has_history = Boolean(voiceDigitization?.history?.length);
            }
            tcmId == 0 ?
                window.Moengage.track_event("TP_Consultation_ended", consultationEventPayload)
                :
                window.Moengage.track_event("TP_Consultation_edited", consultationEventPayload)

            const finalSelectedCanvasCount = Array.isArray(rxDrawingCanvasIds) ? rxDrawingCanvasIds.length
              : typeof rxDrawingCanvasIds === "string" ? rxDrawingCanvasIds.split(",").filter(Boolean).length : 0;
            if (finalSelectedCanvasCount > 0) {
              trackEvent("drawing_canvas_saved_in_final_rx", {
                specialty: profile?.dp_name,
                specialty_id: profile?.dp_id,
                doctor_unique_id: profile?.doctor_unique_id,
                doctor_name: profile?.um_name,
                patient_id: patient_data?.patient_unique_id,
                consultation_id: tcmId,
                selected_canvas_count: finalSelectedCanvasCount,
                prescription_type: isTabPrescription ? "tab_rx" : "normal_rx",
              });
            }
            const caseManagerPromise = isDraft 
                ? dispatch(draftToConsultation(sendData))
                : tcmId == 0
                ? dispatch(addCaseManager(sendData))
                : dispatch(editCaseManager(sendData));
            let action;

            if (tcmId == 0) {
                action = await caseManagerPromise;
                const generatedTcmId = action?.payload?.tcm_id ?? tcmId;
                if (shouldSyncOpthal) {
                    const opthalPayloadWithTcm = {
                        ...opthalPayload,
                        tcm_id: generatedTcmId,
                    };
                    if (opthalId) {
                        await updateOpthalPrescription(opthalId, opthalPayloadWithTcm, { patientId: opthalPatientId });
                    } else {
                        await createOpthalPrescription(opthalPayloadWithTcm, { patientId: opthalPatientId });
                    }
                }
            } else {
                if (shouldSyncOpthal) {
                    const opthalPromise = opthalId
                        ? updateOpthalPrescription(opthalId, opthalPayload, { patientId: opthalPatientId })
                        : createOpthalPrescription(opthalPayload, { patientId: opthalPatientId });
                    [action] = await Promise.all([
                        caseManagerPromise,
                        opthalPromise,
                    ]);
                } else {
                    action = await caseManagerPromise;
                }
            }
            if (action.meta.requestStatus === "fulfilled") {
                const generatedTcmId = action?.payload?.tcm_id ?? tcmId;
                try {
                    await syncGynecHistoryAfterEndVisit(
                        patient_data?.patient_unique_id,
                        userId,
                        gynecHistory,
                        { getGynecDetails, postGynecDetails, updateGynecDetails }
                    );
                } catch (error) {
                    console.error("[GynecHistory][EndVisit] sync failed", error);
                }
                try {
                    await markLatestNeoVoiceConsultationFinishedForPatient(
                        patient_data?.patient_unique_id
                    );
                } catch (error) {
                    console.error("[NeoSapien][EndVisit] mark finished failed", error);
                }
                const liveVoiceDigitizationForStore = store.getState()?.voiceDigitization || voiceDigitization;
                if (liveVoiceDigitizationForStore?.history?.length > 0) {
                    const voiceEditedData = {
                        patientDetails: {},
                        vitalsAndBodyComposition: vitalsData,
                        symptoms: symptomsData,
                        examinations: examinationData,
                        diagnosis: diagnosisData,
                        medications: medicinePayload,
                        vaccinations: givenVaccines,
                        surgeries: surgeriesData,
                        labResults: [],
                        medicalHistory: medicalHistoryData,
                        advice: adviceData,
                        labInvestigation: investigationData,
                        followUp: followUpDate,
                        others: customModuleContents,
                    };
                    dispatch(updateVoiceEditedData(voiceEditedData));
                    try {
                        const consentPayload = await getConsentForVoicePrescriptionPayload();
                        await storeVoicePrescription({
                            patientId: patient_data?.patient_unique_id,
                            doctorId: profile?.doctor_unique_id,
                            tcmId: generatedTcmId,
                            appointmentId: patient_data?.pam_id ?? pamId,
                            sessionId: liveVoiceDigitizationForStore.sessionId,
                            payload: {
                                history: normalizeVoiceHistoryForStore(liveVoiceDigitizationForStore.history),
                                digitizeData: liveVoiceDigitizationForStore.digitizeData || {},
                                editedData: voiceEditedData,
                                clinicNotes: liveVoiceDigitizationForStore.clinicNotes || {},
                                soap: liveVoiceDigitizationForStore.soap || null,
                                version: "v3",
                                consent: consentPayload,
                            },
                        });
                    } catch (error) {
                        console.error("[voice-rx-2/store-prescription] Failed", error?.message || error);
                    }
                }
                syncOrderMedicineAndInvestigation(generatedTcmId);
                if (
                    opthalModuleAutoAdded &&
                    customizedPadRightList?.some((item) => item?.tmdpm_id === OPTHAL_PAD_MODULE_ID)
                ) {
                    dispatch(
                        customizedPad({
                            data: {
                                default: false,
                                reset: false,
                                left: customizedPadLeftList,
                                right: customizedPadRightList,
                            },
                        })
                    );
                }
                try {
                    const decodedToken = getDecodedToken();
                    const tokenData = decodedToken?.result;

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

                try {
                    await syncCrossConsultReferral({
                        tcmId: generatedTcmId,
                        pendingCrossConsult: patient_data,
                    });
                } catch (error) {
                    console.error('Cross consult sync failed:', error);
                }
                
                message.open({
                    key: MESSAGE_KEY,
                    type: '',
                    className: 'message-appointment',
                    content: (
                        <div className='d-flex align-items-center'>
                            <img src={visitEnd} className='me-3' />
                            <div>
                                <div className='title-common text-start fontroboto'>{`${patient_data?.pm_first_name}'s visit ended successfully.`}</div>
                                <div className='fontroboto text-start fw-normal mt-1'>View completed visits in finished tab.</div>
                            </div>
                            <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
                        </div>
                    ),
                    duration: 5,
                });

                if (useVoiceRx) {
                    let sendData = {
                        b2c_id: profile?.b2c,
                        service_name: S_VOICE_RX
                    }
                    dispatch(updateCredits(sendData))
                }
                if (useDDX) {
                    let sendData = {
                        b2c_id: profile?.b2c,
                        service_name: S_DDX
                    }
                    dispatch(updateCredits(sendData))
                }

                if (isAutofillSelected) {
                  await setAddToRx({
                    _id: symptomCollector?._id,
                    addToRx: true,
                  });
                  dispatch(setSelectAutofill(false));
                }

                window.Moengage.track_event("Z_enter_getInvestigationAndMedicine", {
                    clinic_name,
                    patient_id: patient_data?.patient_unique_id,
                    mrno: patient_data?.mrno,
                    isInvestigationList: investigationData.length > 0 ? true : false,
                    isMedicineList: medicationData.length > 0 ? true : false
                })

                if (tokenData?.hospital_business_id == env.zydus_business_id
                    && isZydusUserAccessableFromGB
                    && patient_data?.mrno !== undefined
                    && (medicationData.length > 0 || investigationData.length > 0)
                ) {

                    window.Moengage.track_event("Z_getInvestigationAndMedicine_API_before_call", {
                        clinic_name,
                        patient_id: patient_data?.patient_unique_id,
                        tcm_id: action?.payload?.tcm_id,
                    })

                    let sendInvestigationAndMedicine = {
                        patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
                        tcm_id: action?.payload?.tcm_id
                    }
                    const actionIM = await dispatch(getInvestigationAndMedicine(sendInvestigationAndMedicine))
                    if (actionIM.meta.requestStatus === "fulfilled") {
                        const cmInvestigations = actionIM?.payload?.investigation ?? [];
                        const investigationList = (investigationData.length > 0 ? cmInvestigations : []).map(
                            (item) => ({
                                serviceName: String(item?.investigation_name ?? "").trim(),
                                serviceCode: String(item?.service_code ?? "").trim(),
                            })
                        );
                        const investigationsForMoengage = investigationData.length > 0
                            ? cmInvestigations
                                .map((item) => `${item.investigation_name}:${item.service_code ?? ""}`)
                                .join(", ")
                            : "";

                        window.Moengage.track_event("Z_getInvestigationAndMedicine_API_Response", {
                            clinic_name,
                            patient_id: patient_data?.patient_unique_id,
                            status: 'suceess',
                            investigationList: investigationsForMoengage,
                            medicineList: medicationData.length > 0 ? actionIM?.payload?.medicine.map(({ tmm_medicine_name, display_qty, tmm_remarks }) => JSON.stringify({ name: tmm_medicine_name, quantity:display_qty, instruction: tmm_remarks })).join(', ') : []
                        })

                        let zydusSendData = {
                            "action": tcmId == 0 ? 'add' : 'edit',
                            "tcmId": action?.payload?.tcm_id,
                            "siteId": siteId,
                            "departmentId": patient_data?.departmentId,
                            "visitId": patient_data?.visitId,
                            "encounterId": patient_data?.encounterId,
                            "mrno": patient_data?.mrno,
                            "doctorCode": patient_data?.employeeId,
                            "storeCode": storeCode, // hardcoded value
                            "duplicateCheck": 1, // hardcoded value
                            "investigationList": investigationList,
                            "medicineList": medicationData.length > 0 ? actionIM?.payload?.medicine.map(({ tmm_medicine_name, display_qty, tmm_remarks }) => ({ name: tmm_medicine_name, quantity:display_qty, instruction: tmm_remarks })) : [],
                            "pillupSwitch": isPillUpAccessableFromGB && pillupSwitch ? 1 : 0
                        }
                        
                        window.Moengage.track_event("Z_placeIctOrder_API_before_call", {
                            "action": tcmId == 0 ? 'add' : 'edit',
                            "tcmId": action?.payload?.tcm_id,
                            "siteId": siteId,
                            "departmentId": patient_data?.departmentId,
                            "visitId": patient_data?.visitId,
                            "encounterId": patient_data?.encounterId,
                            "mrno": patient_data?.mrno,
                            "doctorCode": patient_data?.employeeId,
                            "storeCode": storeCode, // hardcoded value
                            "duplicateCheck": 1, // hardcoded value
                            "investigationList": investigationsForMoengage,
                            "medicineList": medicationData.length > 0 ? actionIM?.payload?.medicine.map(({ tmm_medicine_name, display_qty, tmm_remarks }) => JSON.stringify({ name: tmm_medicine_name, quantity:display_qty, instruction: tmm_remarks })).join(', ') : [],
                            "pillupSwitch": isPillUpAccessableFromGB && pillupSwitch ? 1 : 0
                        })

                        const actionPIO = await dispatch(placeIctOrder(zydusSendData))
                        if (actionPIO.payload?.status !== 400) {
                            window.Moengage.track_event("Z_placeIctOrder_API_Response", {
                                status: 'suceess'
                            })
                        } else {
                            window.Moengage.track_event("Z_placeIctOrder_API_Response", {
                                status: 'failure',
                                reason:actionPIO.payload.data.message
                            })
                        }

                    } else {
                        window.Moengage.track_event("Z_getInvestigationAndMedicine_API_Response", {
                            clinic_name,
                            status: 'failure',
                            reason:action.error
                        })
                    }
                }

                navigate('/prescription_print_view', { replace: true, state: { ...action.payload, patient_data: patient_data, labParamsData: labParamsData, zydusSelectedLabParams: zydusSelectedLabParams, labReportID: labReportID, from: window.location.pathname, isVoiceRxNewUiFlow } })
            } else {
                errorMessage(action.error)
            }
        }
    }

    const checkDataFillOrNot = () => {
        if (hasDentalData || symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || medicationData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || vitalsData.length > 0 || medicalHistoryData.length > 0 || privateNotesData || (gynecHistory && Object.keys(gynecHistory).length > 0) || isObstetricDetailsUpdated || labParamsData?.length > 0 || zydusSelectedLabParams?.length > 0 || hasOpthalValues() || hasCustomModuleContent() || followUpDate || additionalNote || givenVaccines?.length > 0 || updatedDueVaccines?.length > 0 || measurements?.length > 0 || selectedCarePlan?.plan_name) {
            showHideBackModal()
        } else {
            if (send_path !== undefined) {
                navigate(-1);
            } else {
                navigate('/', { replace: true });
            }
        }
    }

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
                        <Button className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}>
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    {videoList?.filter(e => e.category_id === 1)[0]?.video?.map((item1, i1) => {
                        return (
                            <div key={i1} className={`d-flex ${i1 !== videoList?.filter(e => e.category_id === 1)[0]?.video?.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
                                <div className="tutorial-play me-14">
                                    <button type="button"
                                        onClick={() => {
                                            setVideoLink(item1)
                                            const clinic_name = getClinicName(profile?.hospital_data);
                                            window.Moengage.track_event("TP_Tutorial_Viewed", {
                                                clinic_name,
                                                tutorial_type: videoList[0]?.category,
                                            });
                                        }}
                                    >
                                        <img src={playIcons} />
                                    </button>
                                    <span className='tutorial-thumb'><img src={item1.thumbnail} /></span>
                                </div>
                                <div>
                                    <h3 className="title-common text-welcome">{item1?.tmv_title}</h3>
                                    <div className="fs-12 fontroboto fw-normal text-main">{item1?.tmv_description}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </>
        );
    }, [popOverVideo]);
    return (
        <Navbar className={`justify-content-between headerprescription p-0 ${isCompactHeader ? ' headerprescription--tablet' : ''}${isNewPrescriptionUi ? ' headerprescription--new-ui' : ''}${isTabPrescription ? ' headerprescription--tab' : ''}`}>
            <Container fluid className='h-100 gx-0 w-100'>
                <Row className='h-100 align-items-center w-100 justify-content-between'>
                    <Col sm="auto" className={`h-100 ${isCompactHeader ? 'pr-0' : ''}`}>
                        <div className='align-items-center d-flex h-100'>
                            <div className='border-end h-100 text-center'>
                                <div onClick={checkDataFillOrNot} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                    <i className='icon-right'></i>
                                </div>
                                <CommonModal
                                    isModalOpen={isBackModalOpen}
                                    onCancel={showHideBackModal}
                                    modalWidth={500}
                                    zIndex={headerOverlayZIndex}
                                    title={"You may lose your data"}
                                    modalBody={
                                        <>
                                            <div className="alert-warning rounded-10px p-2 patient-details">
                                                <div className="d-flex align-items-center">
                                                    <img className='me-3' src={alertIcon} alt="Warning" />
                                                    <span>
                                                        You’ve entered few details that hasn’t been saved yet. What would you like to do?
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="d-flex align-items-center mt-2 justify-content-end">
                                                    <div onClick={() => send_path !== undefined ? navigate(-1) : navigate('/', { replace: true })} className="me-4 text-decoration-underline btn p-0 color-red">
                                                        {shouldEnableDraft ? "Go Back Without Saving" : "Yes, Leave"}
                                                    </div>
                                                    <Button onClick={() => {shouldEnableDraft && onSaveAsDraft(); showHideBackModal();}} className="lh-lg btn btn-primary3 btn-41 px-4">
                                                        {shouldEnableDraft ? <span>Save as Draft</span> : <span>No, Stay</span>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    }
                                />
                            </div>
                            <ProfilePopover patient_data={patient_data} isPrescriptionPage />
                        </div>
                    </Col>
                    {/* Grows, so the Copilot field inside it can take the gap
                        between the patient's name and the tools rather than
                        sitting at a fixed width with empty header either side. */}
                    <Col sm="auto" className={isTablet ? 'headerprescription-actions-col' : ''} style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <div className={`align-items-center d-flex h-100 justify-content-end${isTablet ? ' headerprescription-actions' : ''}`}>
                            {/* Velora's entry point during a consultation, first in the
                                row of tools and left of the tutorial. Nothing opens by
                                default here: the doctor is mid-prescription, so Copilot
                                waits to be asked, and when asked it opens as a popup - the
                                Rx pad has no width to give a side dock. */}
                            <div style={{ flex: "1 1 auto", minWidth: 240, maxWidth: 560, padding: "0 24px" }}>
                                <CopilotSearchField
                                    patientId={patient_data?.patient_unique_id}
                                    patientLabel={patient_data?.pm_fullname}
                                    hideWhenOpen
                                />
                            </div>

                            {!showVoiceRxModule && (
                                <Popover
                                    open={popOverVideo}
                                    onOpenChange={showHideVideoListPopover}
                                    content={VIDEO_CONTENT}
                                    trigger="click"
                                    overlayClassName="pop-430 pp-0 videoTutorial"
                                    placement="bottom"
                                    zIndex={headerOverlayZIndex}
                                >
                                    <button className={`btn d-flex align-items-center btn-text p-0 ${!isCompactHeader ? 'me-20' : ''}`}>
                                        {/* onClick={showHideVideoListPopover} */}
                                        <span><img src={tutorial2} /></span>
                                    </button>
                                </Popover>
                            )}
                            {showVoiceRxModule ? (
                                <div className={voiceModuleStyles.headerActionGroup}>
                                    <Popover
                                        open={popOverVideo}
                                        onOpenChange={showHideVideoListPopover}
                                        content={VIDEO_CONTENT}
                                        trigger="click"
                                        overlayClassName="pop-430 pp-0 videoTutorial"
                                        placement="bottom"
                                        zIndex={headerOverlayZIndex}
                                    >
                                        <button className="btn d-flex align-items-center btn-text p-0">
                                            {/* onClick={showHideVideoListPopover} */}
                                            <span><img src={tutorial2} /></span>
                                        </button>
                                    </Popover>
                                    <div className={voiceModuleStyles.headerActionDivider} aria-hidden="true" />
                                    {isCompactHeader ? (
                                        <Tooltip placement="bottom" title="Browse prescription templates" zIndex={headerOverlayZIndex}>
                                            <span>
                                                <VoiceRxModuleActionButton type="template" label="Browse prescription templates" onClick={handleDrawerTemplate} />
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <Popover
                                            open={popOver1}
                                            onOpenChange={showHideTemplatesListPopover}
                                            content={shouldUseMobileTemplateContent ? TEMPLATE_CONTENT_TAB : TEMPLATE_CONTENT_WEB}
                                            trigger="click"
                                            overlayClassName="pop-350 pp-0"
                                            placement="bottom"
                                            zIndex={headerOverlayZIndex}
                                        >
                                            <span>
                                                <Tooltip placement="bottom" title="Browse prescription templates" zIndex={headerOverlayZIndex}>
                                                    <VoiceRxModuleActionButton type="template" label="Browse prescription templates" />
                                                </Tooltip>
                                            </span>
                                        </Popover>
                                    )}
                                    <Tooltip placement="bottom" title={hasUngroundedMedications ? "Some items aren't linked to your inventory. Please resolve them before saving as a template." : (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) ? "Save prescription as template" : "Please enter some data to save a template"} zIndex={headerOverlayZIndex}>
                                        {isMobile ? (
                                            <VoiceRxModuleActionButton
                                                type="save"
                                                label="Save prescription as template"
                                                disabled={hasUngroundedMedications || !(symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent())}
                                                onClick={() => !hasUngroundedMedications && (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) && handleDrawerSave()}
                                            />
                                        ) : (
                                            <Popover
                                                open={popOver2}
                                                onOpenChange={() => !hasUngroundedMedications && (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) && showHideSaveTemplatePopOver()}
                                                content={SAVE_CONTENT_WEB}
                                                trigger="click"
                                                overlayClassName="pop-450 pp-0"
                                                placement="bottom"
                                                zIndex={headerOverlayZIndex}
                                            >
                                                <span>
                                                    <VoiceRxModuleActionButton
                                                        type="save"
                                                        label="Save prescription as template"
                                                        disabled={hasUngroundedMedications || !(symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent())}
                                                    />
                                                </span>
                                            </Popover>
                                        )}
                                    </Tooltip>
                                    <Tooltip placement="bottom" title="Customize prescription sections" zIndex={headerOverlayZIndex}>
                                        <VoiceRxModuleActionButton type="customize" label="Customize prescription sections" onClick={handleDrawerCustomize} />
                                    </Tooltip>
                                </div>
                            ) : !isMobile ? (
                                <div className="d-flex align-items-center">
                                    <Popover
                                        open={popOver1}
                                        onOpenChange={showHideTemplatesListPopover}
                                        content={TEMPLATE_CONTENT_WEB}
                                        trigger="click"
                                        overlayClassName="pop-350 pp-0"
                                        placement="bottom"
                                        zIndex={headerOverlayZIndex}
                                    >
                                        <button className="btn d-flex align-items-center btn-text">
                                            {" "}
                                            <i className="icon-template me-2"></i> <span>{isCompactHeader ? "Temp" : "Templates"}</span>
                                        </button>
                                    </Popover>
                                    <Tooltip placement="bottom" title={hasUngroundedMedications ? "Some items aren't linked to your inventory. Please resolve them before saving as a template." : (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) ? "" : "Please enter some data to save a template"} zIndex={headerOverlayZIndex}>
                                        <Popover
                                            open={popOver2}
                                            onOpenChange={() => !hasUngroundedMedications && (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) && showHideSaveTemplatePopOver()}
                                            content={SAVE_CONTENT_WEB}
                                            trigger="click"
                                            overlayClassName="pop-450 pp-0"
                                            placement="bottom"
                                            zIndex={headerOverlayZIndex}
                                        >
                                            <span>
                                                <button className="btn d-flex align-items-center btn-text" disabled={hasUngroundedMedications}>
                                                    {" "}
                                                    <i className="icon-save me-2"></i> <span>Save</span>
                                                </button>
                                            </span>
                                        </Popover>
                                    </Tooltip>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center">
                                    <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerTemplate}>
                                        <i className="icon-template me-2"></i> <span>{isCompactHeader ? "Temp" : "Templates"}</span>
                                    </button>
                                    <Tooltip placement="bottom" title={hasUngroundedMedications ? "Some items aren't linked to your inventory. Please resolve them before saving as a template." : (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) ? "" : "Please enter some data to save a template"} zIndex={headerOverlayZIndex}>
                                        <span>
                                            <button className='btn d-flex align-items-center btn-text' disabled={hasUngroundedMedications} onClick={() => !hasUngroundedMedications && (symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 || diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 || medicationData.length > 0 || hasOpthalValues() || hasCustomModuleContent()) && handleDrawerSave()}> <i className="icon-save me-2"></i> <span>Save</span></button>
                                        </span>
                                    </Tooltip>
                                </div>
                            )}

                            {DELETE_MODAL}
                            {CLEAR_MODAL}

                            {!showVoiceRxModule && (
                                <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerCustomize}>
                                    {isCompactHeader ? <img src={settingsIcon} alt="Settings" className='me-2' /> : <i className="icon-setting me-2"></i>} <span>{(isCompactHeader) ? "Custom" : "Customize"}</span>
                                </button>
                            )}

                            {/* <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerCustomize}>
                               <span><img height={42} src={tutorial} /></span>
                            </button> */}

                            <Drawer title="One Click Rx Templates" placement="right" onClose={handleDrawerTemplate} open={templateDrawer} className="modalWidth-563" width="auto" zIndex={headerOverlayZIndex}>
                                {TEMPLATE_CONTENT_TAB}
                            </Drawer>
                            <Drawer title="Save Template" placement="right" onClose={handleDrawerSave} open={saveDrawer} className="modalWidth-563" width="auto" zIndex={headerOverlayZIndex}>
                                {SAVE_CONTENT_TAB}
                            </Drawer>
                            <Drawer placement="right" closeIcon={false} onClose={handleDrawerCustomize} open={customizeDrawer} className="modalWidth-900" width="auto" zIndex={headerOverlayZIndex}>
                                {CUSTOMIZE_CONTENT_TAB}
                            </Drawer>

                            {videoLink && (
                                <VideoModal
                                    videoLink={videoLink}
                                    onCancel={() => setVideoLink(null)}
                                />
                            )}

                            {/* <Link className='text-main align-items-center d-flex fw-medium text14 me-30'>
                                <i className='icon-setting me-2'></i> <span className='text-decoration-underline'>Customize</span>
                            </Link> */}

                            {/* <Dropdown
                                menu={{
                                    items
                                }}
                                trigger={['click']}
                            >
                                <a onClick={(e) => e.preventDefault()} className='text-main align-items-center d-flex fw-medium text14 me-30'>
                                    <i className='icon-language me-2'></i>
                                    <span className='text-decoration-underline'>English</span>
                                    <i className='icon-right iconrotate270 ms-1'></i>
                                </a>
                            </Dropdown> */}
                            {/* <Tooltip placement="bottom" title="Ready to print? Please enter your prescription details.">
                                <div onClick={() => window.print()}>
                                    <Button className='btn align-items-center d-flex btn-41 btn-input me-20'>
                                        <i className='icon-Print me-2'></i>
                                        Print
                                    </Button>
                                </div>
                            </Tooltip> */}
                            {showTeleconsultIcon && (
                                <Tooltip placement="bottom" title={isTeleconsultActive ? "Meeting in progress" : "Tele-Consultation"} destroyTooltipOnHide trigger={["hover"]} mouseLeaveDelay={0} zIndex={headerOverlayZIndex}>
                                    <span className={isTeleconsultActive ? "d-inline-block" : ""}>
                                        <button
                                            type="button"
                                            className={`btn align-items-center justify-content-center d-flex btn-41 teleconsult-video-btn ${!isCompactHeader ? 'me-20' : ''}`}
                                            style={isCompactHeader ? {marginLeft: '10px'} : {}}
                                            onClick={onTeleconsultClick}
                                            disabled={isTeleconsultJoinLoading || isTeleconsultActive}
                                        >
                                            {isTeleconsultJoinLoading ? (
                                                <LoadingOutlined style={{ fontSize: 24, ...(!isCompactHeader && { marginLeft: '10px' }) }} />
                                            ) : (
                                                <img src={videoSvg} alt="Tele-Consultation" width={26} height={26} style={isCompactHeader ? { marginLeft: '10px' } : {}} />
                                            )}
                                        </button>
                                    </span>
                                </Tooltip>
                            )}
                            {handleVideoConsult && (
                                <VideoConsultButton 
                                    onClick={handleVideoConsult} 
                                    loading={isVideoConsultLoading}
                                />
                            )}
                            {/* Legacy VoiceRx CTA belongs only to the old prescription UI. */}
                            {shouldShowLegacyVoiceRxCta ? (
                                isCompactHeader ?
                                    <>
                                        <div className="headerprescription-tablet-sep" aria-hidden="true" />
                                        <TabVoiceRxButton onClick={handleGenRx} />
                                    </>
                                    :
                                    <GenRxButton onClick={handleGenRx} />
                            ) : null}

                            {isCompactHeader && <div className="headerprescription-tablet-sep" aria-hidden="true" />}

                            {shouldEnableDraft && <SaveDraft onSaveAsDraft={onSaveAsDraft} loading={saveDraftLoading} label={isCompactHeader ? 'Draft' : 'Save as Draft'} />}

                            {(() => {
                              // PrescriptionNew-module signals (symptoms/examinations/diagnosis/surgeries/advice/investigations/medications/follow-up/visit-advice/custom modules/opthal/vaccines/private notes/drawing canvas).
                              const hasPrescriptionModuleData = (
                                hasDentalData ||
                                symptomsData.length > 0 || examinationData.length > 0 || surgeriesData.length > 0 ||
                                diagnosisData.length > 0 || adviceData.length > 0 || investigationData.length > 0 ||
                                medicationData.length > 0 || privateNotesData || followUpDate || additionalNote ||
                                givenVaccines.length > 0 || updatedDueVaccines?.length > 0 ||
                                customModuleContents?.some((e) => e?.content?.length && e?.content?.some(c => c.title || c.notes)) ||
                                hasOpthalValues() || hasCustomModuleContent() || hasRxDrawingCanvasIds
                              );
                              // Sidebar-only signals (vitals/medical history/measurements/gynec/obstetric/lab params/zydus labs).
                              const hasSidebarOnlyData = (
                                vitalsData.length > 0 || medicalHistoryData.length > 0 || measurements.length > 0 ||
                                (gynecHistory && Object.keys(gynecHistory).length > 0) || isObstetricDetailsUpdated ||
                                labParamsData?.length > 0 || zydusSelectedLabParams?.length > 0
                              );
                              // New UI: require at least one prescription-module entry. Old UI: any signal enables end-visit.
                              const canEndVisit = isChikitsalayAccessable ? hasSymptomsWithSince && hasDiagnosisNameAndIcdCode && (!shouldUseChikitsalayInventoryValidation || hasValidChikitsalayInventoryRows) && !hasOutOfStockMedication && hasMedicationsFrequencyAndDuration : (hasPrescriptionModuleData || hasSidebarOnlyData);
                              return (
                                <>
                                {onSelectLetterHead && !isDentalConsultation && (
                                  <Tooltip placement="bottom" title="Letterhead" zIndex={headerOverlayZIndex}>
                                    <button type="button" className="btn align-items-center justify-content-center d-flex btn-41 me-2" onClick={onSelectLetterHead}>
                                      <img src={notesMultiple} alt="Notes" />
                                    </button>
                                  </Tooltip>
                                )}
                                {showPreviewButton && onPreviewClick && (
                                  <>
                                    <div className="headerprescription-preview-divider" aria-hidden="true" />
                                    <Tooltip placement="bottom" title="Preview Rx" zIndex={headerOverlayZIndex}>
                                      <Button
                                        type="button"
                                        className="btn-41 btn px-2 me-2 ant-btn-text btn-input align-items-center d-flex consultation-preview-btn"
                                        onClick={onPreviewClick}
                                        icon={<i className="icon-Preview" />}
                                      >
                                        Preview
                                      </Button>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip placement="bottom" title={canEndVisit ? "" : endVisitTooltipMessage} zIndex={headerOverlayZIndex}>
                                    <Button type='button' data-testid="prescription-end-visit" className='btn align-items-center d-flex btn-41 btn-primary3 me-20' onClick={() => canEndVisit && (onEndVisit ? onEndVisit() : onEndVisitClick())} loading={onEndVisit ? isEndVisitLoading : (loading && !saveDraftLoading)}>
                                        <i className='icon-exit me-2'></i>
                                        {isCompactHeader ? "End" : "End Visit"}
                                    </Button>
                                </Tooltip>
                                </>
                              );
                            })()}

                            <Dropdown className='btn btn-outline btn-more p-0' menu={{ items }} trigger={['click']} overlayStyle={{ zIndex: headerOverlayZIndex }}>
                                <a onClick={(e) => e.preventDefault()}>
                                    <i className='icon-More'></i>
                                </a>
                            </Dropdown>
                        </div>
                    </Col>
                </Row>
            </Container>
        </Navbar>
    );
}

export default React.memo(HeaderPrescription);
