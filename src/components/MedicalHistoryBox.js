import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { Button, Card, Row, Col, Input, Popover, Tabs, DatePicker } from 'antd';

import { isMobile } from 'react-device-detect';

import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { v4 as uuidv4 } from 'uuid';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, removeBeforeWhiteSpace, onlyNumberFormat, capitalizeAfterSentence } from "../utils/utils";

import moment from "moment";
import dayjs from "dayjs";

import {
    listSectionwithTag,
    addTag,
} from "../redux/medicalhistorySlice";
import { useLocation } from "react-router-dom";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { GB_VOICE_RX_NEW_UI, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { jwtDecode } from "jwt-decode";
import { CLOTS_LIST, CYCLE_KEY_LIST, FLOW_LIST, GYNEC_SECTION_ENABLE_LIST, PAIN_LIST, PAIN_OCCURANCE_LIST, REPRODUCTIVE_LIFE_STAGES_LIST, TYPES_REPRODUCTIVE_STAGES } from "../utils/gynec_constants";
import { useAccess } from "../pages/vaccination/useAccess";
import { getClinicName } from "../utils/utils";
import {
    ensureFiveSections,
    findMatchingMedicalHistoryTag,
    mergeMedicalHistoryTagsBySection,
    tagsAreDuplicateForHistoryMerge,
} from "../utils/medicalHistoryUtils";
import { convertAgentMedicalHistoryRowsToSections } from "../utils/medicalHistoryConverters";
import VideoModal from "../common/VideoModal";
import { ASSETS } from "../assets";
import {
    VoiceRxModuleCapture,
    VoiceRxModuleButton,
    useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import {
    Button as TesseractButton,
    ConfirmDialog,
    Divider as TesseractDivider,
    TesseractThemeProvider,
    TPIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import MedicalHistoryPanel from "./medical-history/MedicalHistoryPanel";
import { CustomizeButton } from "./medical-history/CustomizePanel";
import medicalHistoryStyles from "./medical-history/medicalHistory.module.css";
import useSectionConfig from "./medical-history/useSectionConfig";
import useCrossSectionTagSearch from "./medical-history/useCrossSectionTagSearch";
import { ENABLE_DESELECTED } from "./medical-history/constants";
import { useVoiceRxNewUiFlag } from "../utils/voiceRxNavigation";
const {
  noRecordRound: noRecordFound,
  tubeIcon: playIcons,
  tutorial2,
} = ASSETS.images;

const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD-MM-YYYY'

function normalizeMedicalHistoryMatch(value) {
    return String(value || "").trim().toLowerCase();
}

function mapMedicalHistoryIdsFromDefaultList(data = [], defaultList = []) {
    if (!Array.isArray(data)) return [];

    return data
        .map((item) => {
            const incomingTitle = item?.title || item?.section || item?.type || "Medical Condition";
            let section = defaultList?.find((defaultItem) => (
                Number(defaultItem?.tmmhs_id) === Number(item?.tmmhs_id) ||
                normalizeMedicalHistoryMatch(defaultItem?.title) === normalizeMedicalHistoryMatch(incomingTitle)
            ));
            if (!section && normalizeMedicalHistoryMatch(incomingTitle) === "others") {
                section = defaultList?.find((defaultItem) => normalizeMedicalHistoryMatch(defaultItem?.title) === "lifestyle");
            }

            const mappedTags = Array.isArray(item?.tags)
                ? item.tags
                    .map((tag) => {
                        const tagTitle = String(tag?.title || tag?.name || tag?.lineItem || "").trim();
                        if (!tagTitle) return null;
                        const matchedTag = findMatchingMedicalHistoryTag(
                            { title: tagTitle, tmmhst_id: tag?.tmmhst_id },
                            section?.tags,
                            section?.tmmhs_id
                        );
                        return {
                            ...tag,
                            title: tagTitle,
                            ...(matchedTag?.tmmhst_id ? { tmmhst_id: matchedTag.tmmhst_id } : {}),
                            note: tag?.note || tag?.notes || "",
                            notes: tag?.notes || tag?.note || "",
                            enable: tag?.enable === "" || tag?.enable === undefined ? "Y" : tag?.enable,
                            relationship: tag?.relationship || tag?.relation || "",
                            since: tag?.since || tag?.duration || "",
                            status: tag?.status || "",
                            medication: tag?.medication || "",
                        };
                    })
                    .filter(Boolean)
                : [];

            return {
                ...item,
                title: section?.title || incomingTitle,
                ...(section?.tmmhs_id ? { tmmhs_id: section.tmmhs_id } : {}),
                no_know_history: Boolean(item?.no_know_history),
                tags: mappedTags,
            };
        })
        .filter((section) => (
            section.no_know_history ||
            section.tags.length ||
            hasMedicalHistoryDetailValue(section.medical_history_remarks)
        ));
}

function mergeMedicalHistorySections(base = [], incoming = []) {
    const baseData = Array.isArray(base) ? JSON.parse(JSON.stringify(base)) : [];
    const incomingData = Array.isArray(incoming) ? JSON.parse(JSON.stringify(incoming)) : [];
    const usedIncomingIndexes = new Set();

    const merged = baseData.map((section) => {
        const incomingIndex = incomingData.findIndex((item) => (
            Number(item?.tmmhs_id) === Number(section?.tmmhs_id) ||
            normalizeMedicalHistoryMatch(item?.title) === normalizeMedicalHistoryMatch(section?.title)
        ));
        const incomingSection = incomingIndex >= 0 ? incomingData[incomingIndex] : null;
        if (!incomingSection) return section;
        usedIncomingIndexes.add(incomingIndex);

        const mergedTags = [
            ...(section?.tags || []).map((tag) => ({
                ...tag,
                ...(findMatchingMedicalHistoryTag(tag, incomingSection?.tags, section?.tmmhs_id) || {}),
            })),
            ...(incomingSection?.tags || []).filter(
                (incomingTag) => !(section?.tags || []).some((existingTag) =>
                    tagsAreDuplicateForHistoryMerge(existingTag, incomingTag, section?.tmmhs_id)
                )
            ),
        ];

        return {
            ...section,
            ...incomingSection,
            tags: mergeMedicalHistoryTagsBySection(mergedTags, [], section?.tmmhs_id || incomingSection?.tmmhs_id),
        };
    });

    incomingData.forEach((section, index) => {
        if (!usedIncomingIndexes.has(index)) merged.push(section);
    });

    return merged;
}

function hasMedicalHistoryDetailValue(value) {
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "" && String(value).trim() !== "-";
}

function getMedicalHistoryRemarks(data = []) {
    if (!Array.isArray(data)) return "";
    const section = data.find((item) => hasMedicalHistoryDetailValue(item?.medical_history_remarks));
    return String(section?.medical_history_remarks || "");
}

function medicalHistoryEnableState(value) {
    const key = String(value || "").trim().toLowerCase();
    if (["n", "no", "false", "absent", "negative"].includes(key)) return "N";
    if (["y", "yes", "true", "active", "inactive", "present", "positive"].includes(key)) return "Y";
    return key ? value : "";
}

function getDisplayableMedicalHistoryContext(data = []) {
    if (!Array.isArray(data)) return undefined;

    const sections = data
        .map((section) => {
            const tags = Array.isArray(section?.tags)
                ? section.tags.filter((tag) => {
                    const enable = medicalHistoryEnableState(tag?.enable);
                    if (enable === "N") return true;
                    if (enable === "Y") return true;
                    return [
                        tag?.since,
                        tag?.status,
                        tag?.medication,
                        tag?.relationship,
                        tag?.note,
                        tag?.notes,
                        tag?.date,
                    ].some(hasMedicalHistoryDetailValue);
                })
                : [];
            const nextSection = {
                ...section,
                tags,
            };
            const hasSectionData = Boolean(section?.no_know_history) ||
                tags.length > 0 ||
                hasMedicalHistoryDetailValue(section?.medical_history_remarks);
            return hasSectionData ? nextSection : null;
        })
        .filter(Boolean);

    return sections.length ? sections : undefined;
}

function MedicalHistoryBox(props) {

    const { handleDrawerMedicalHistory, handleCollapsed, onSave, initialActiveKey, hideMenstrualHistoryTab, overrideMedicalHistoryData, gynecOnly = false, initialGynecHistory, showVoiceRxModule } = props
    const { TabPane } = Tabs;
    const {
        defaultList,
        loading,
    } = useSelector((state) => state.medicalhistory);
    const { profile, userId } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { isGynaecHistoryAccessable } = useAccess();

    const { medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext);
    // const [ medicalHistoryData, setMedicalHistoryData] = useState([]);
    const [cloneMedicalHistoryData, setCloneMedicalHistoryData] = useState([])

    const MEDICAL_PROBLEM = {
        since: '',
        status: '',
        medication: '',
        note: ''
    }
    const FAMILY_HISTORY = {
        relationship: '',
        note: ''
    }
    const OTHERS = {
        since: '',
        status: '',
        note: ''
    }

    const SURGICAL_HISTORY = {
        since: '',
        status: '',
        note: '',
        dateType: 'year',
        date: ''
    }

    const videoLink = {
        link: "https://www.youtube.com/embed/Y91zuWBeao4",
        thumbnail: "https://i.ytimg.com/vi/o6ALwX9hPMM/hqdefault.jpg",
        tmv_description: "Gynec History",
        tmv_title: "Gynec History",
    };

    const [shouldShowVideo, setShowVideo] = useState(false);
    const [popOverVideo, setPopOverVideo] = useState(false);
    const [selectData, setSelectData] = useState(null);
    const [gynecEditState, setGynecEditState] = useState("CREATE");
    const [sectionState, setSectionState] = useState({ ...GYNEC_SECTION_ENABLE_LIST });

    const [inputCycles, setInputCycles] = useState(null);
    const [inputMenarche, setInputMenarche] = useState(null);
    const [inputMenopause, setInputMenopause] = useState(null);
    const [inputCyclesDays, setInputCyclesDays] = useState(null);
    const [inputPadsNum, setInputPadsNum] = useState(null);
    const { state } = useLocation();
    const { patient_data, caseManagerData } = state || {};
    const [gynecLoading, setGynecLoading] = useState(false);
    const [gynecHistory, setGynecHistory] = useState({});
    const [remarks,setRemarks] = useState(medicalHistoryData?.[0]?.medical_history_remarks || "");
    const [surgicalDateType, setSurgicalDateType] = useState('year');
    const [surgicalDate, setSurgicalDate] = useState(null);
    const selectedHistoryNoteVoiceTargetRef = useRef(null);
    const initialSnapshotRef = useRef("");
    const isVoiceRxNewFromGB = useVoiceRxNewUiFlag();
    const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule) && isVoiceRxNewFromGB && !gynecOnly;

    const applyVoiceMedicalHistory = useCallback((nextMedicalHistory) => {
        const sectionedMedicalHistory = convertAgentMedicalHistoryRowsToSections(nextMedicalHistory);
        const mappedMedicalHistory = mapMedicalHistoryIdsFromDefaultList(sectionedMedicalHistory, defaultList);
        console.groupCollapsed("[VoiceRx MedicalHistory] MedicalHistoryBox applyVoiceMedicalHistory");
        console.log("incoming nextMedicalHistory", nextMedicalHistory);
        console.log("sectionedMedicalHistory", sectionedMedicalHistory);
        console.log("defaultList length", defaultList?.length || 0);
        console.log("defaultList section titles", defaultList?.map((section) => ({ tmmhs_id: section?.tmmhs_id, title: section?.title, tags: section?.tags?.length })) || []);
        console.log("mappedMedicalHistory", mappedMedicalHistory);
        console.groupEnd();
        if (!mappedMedicalHistory.length) {
            console.warn("[VoiceRx MedicalHistory] applyVoiceMedicalHistory no-op: mappedMedicalHistory is empty", {
                nextMedicalHistory,
                sectionedMedicalHistory,
                defaultListLength: defaultList?.length || 0,
            });
            return;
        }

        if (typeof setMedicalHistoryData === "function") {
            setMedicalHistoryData((prev = []) => {
                const next = mergeMedicalHistorySections(prev, mappedMedicalHistory);
                console.groupCollapsed("[VoiceRx MedicalHistory] setMedicalHistoryData merge");
                console.log("prev medicalHistoryData", prev);
                console.log("incoming mappedMedicalHistory", mappedMedicalHistory);
                console.log("next medicalHistoryData", next);
                console.groupEnd();
                return next;
            });
        }
        setCloneMedicalHistoryData((prev = []) => {
            const next = mergeMedicalHistorySections(prev, mappedMedicalHistory);
            console.groupCollapsed("[VoiceRx MedicalHistory] setCloneMedicalHistoryData merge");
            console.log("prev cloneMedicalHistoryData", prev);
            console.log("incoming mappedMedicalHistory", mappedMedicalHistory);
            console.log("next cloneMedicalHistoryData", next);
            console.groupEnd();
            return next;
        });
        const nextRemarks = mappedMedicalHistory.find((section) => section?.medical_history_remarks)?.medical_history_remarks;
        if (nextRemarks) setRemarks(nextRemarks);
    }, [defaultList, setMedicalHistoryData]);

    const {
        voiceCaptureOpen,
        setVoiceCaptureOpen,
        voiceUpdated,
        handleVoiceCaptureComplete,
    } = useVoiceRxModuleCapture({
        moduleName: "Medical History",
        onApply: applyVoiceMedicalHistory,
        successMessage: "Medical history filled from voice dictation",
    });

    const applyAdditionalHistoryTranscript = useCallback((transcript) => {
        const cleanTranscript = String(transcript || "").trim();
        if (!cleanTranscript) return;

        setRemarks((prev = "") => {
            const base = String(prev || "").trimEnd();
            const separator = base ? "\n" : "";
            return `${base}${separator}${cleanTranscript}`.slice(0, 5000);
        });
    }, []);

    const {
        voiceCaptureOpen: additionalHistoryVoiceCaptureOpen,
        setVoiceCaptureOpen: setAdditionalHistoryVoiceCaptureOpen,
        voiceUpdated: additionalHistoryVoiceUpdated,
        handleVoiceCaptureComplete: handleAdditionalHistoryVoiceCaptureComplete,
    } = useVoiceRxModuleCapture({
        moduleName: "Additional History",
        onTranscriptionApply: applyAdditionalHistoryTranscript,
        transcriptionSuccessMessage: "Additional history transcript appended",
    });

    const applySelectedHistoryNoteTranscript = useCallback((transcript) => {
        const cleanTranscript = String(transcript || "").trim();
        const target = selectedHistoryNoteVoiceTargetRef.current || selectData;
        if (!cleanTranscript || target?.section_index === undefined || target?.tag_index === undefined) return;

        setCloneMedicalHistoryData((prev = []) => {
            const section = prev[target.section_index];
            const tag = section?.tags?.[target.tag_index];
            if (!tag) return prev;

            const currentNote = String(tag.note || "").trimEnd();
            const separator = currentNote ? "\n" : "";
            const nextData = [...prev];
            const nextTags = [...(section.tags || [])];
            nextTags[target.tag_index] = {
                ...tag,
                note: `${currentNote}${separator}${cleanTranscript}`,
            };
            nextData[target.section_index] = {
                ...section,
                tags: nextTags,
            };
            return nextData;
        });
    }, [selectData]);

    const {
        voiceCaptureOpen: selectedHistoryNoteVoiceCaptureOpen,
        setVoiceCaptureOpen: setSelectedHistoryNoteVoiceCaptureOpen,
        voiceUpdated: selectedHistoryNoteVoiceUpdated,
        handleVoiceCaptureComplete: handleSelectedHistoryNoteVoiceCaptureComplete,
    } = useVoiceRxModuleCapture({
        moduleName: "Medical History Note",
        onTranscriptionApply: applySelectedHistoryNoteTranscript,
        transcriptionSuccessMessage: "Medical history note transcript appended",
    });

    const openMedicalHistoryVoiceCapture = useCallback(() => {
        setAdditionalHistoryVoiceCaptureOpen(false);
        setSelectedHistoryNoteVoiceCaptureOpen(false);
        setVoiceCaptureOpen(true);
    }, [setAdditionalHistoryVoiceCaptureOpen, setSelectedHistoryNoteVoiceCaptureOpen, setVoiceCaptureOpen]);

    const openAdditionalHistoryVoiceCapture = useCallback(() => {
        setVoiceCaptureOpen(false);
        setSelectedHistoryNoteVoiceCaptureOpen(false);
        setAdditionalHistoryVoiceCaptureOpen(true);
    }, [setAdditionalHistoryVoiceCaptureOpen, setSelectedHistoryNoteVoiceCaptureOpen, setVoiceCaptureOpen]);

    const openSelectedHistoryNoteVoiceCapture = useCallback(() => {
        if (!selectData) return;
        selectedHistoryNoteVoiceTargetRef.current = selectData;
        setVoiceCaptureOpen(false);
        setAdditionalHistoryVoiceCaptureOpen(false);
        setSelectedHistoryNoteVoiceCaptureOpen(true);
    }, [selectData, setAdditionalHistoryVoiceCaptureOpen, setSelectedHistoryNoteVoiceCaptureOpen, setVoiceCaptureOpen]);

    const medicalHistoryPreviousContext = useMemo(() => (
        getDisplayableMedicalHistoryContext(medicalHistoryData) ||
        getDisplayableMedicalHistoryContext(cloneMedicalHistoryData)
    ), [cloneMedicalHistoryData, medicalHistoryData]);

    const datePickerRef = useRef(null);
    // Function to handle custom input changes
    const onChangeCustomInput = (type) => (e) => {
        const value = onlyNumberFormat(e.target.value);;
        if (type === "Cycle") {
            setInputCycles(value);
            handleGynecValueChange("intervalOfCycle", value);
        }
        if (type === "Menarche") {
            setInputMenarche(value);
            handleGynecValueChange("ageAtMenarche", value);
        }
        if (type === "Menopause") {
            setInputMenopause(value);
            handleGynecValueChange("ageAtMenopause", value);
        }
        if (type === "cyclesDays") {
            setInputCyclesDays(value);
            handleGynecValueChange("durationOfMenstrualFlow", value);
        }
        if (type === "padsNum") {
            setInputPadsNum(value);
            handleGynecValueChange("numberOfPadsPerDay", value);
        }
    };

    // Common function to handle segment click changes
    const onChangeSegmentedChild = (type, value, setInputFunction) => {
        if (value === 'custom') {
            setInputFunction(''); // Reset custom input value when clicked
        } else {
            handleGynecValueChange(type, value); // Handle predefined segment value
        }
    };

    // handles for specific case
    const onChangeSegmentedCyclesChild = (value) => onChangeSegmentedChild("intervalOfCycle", value, setInputCycles);
    const onChangeSegmentedMenarcheChild = (value) => onChangeSegmentedChild("ageAtMenarche", value, setInputMenarche);
    const onChangeSegmentedMenopauseChild = (value) => onChangeSegmentedChild("ageAtMenopause", value, setInputMenopause);
    const onChangeSegmentedCyclesDaysChild = (value) => onChangeSegmentedChild("durationOfMenstrualFlow", value, setInputCyclesDays);
    const onChangeSegmentedPadNumChild = (value) => onChangeSegmentedChild("numberOfPadsPerDay", value, setInputPadsNum);

    const customCyclesValue = gynecHistory?.intervalOfCycle > 32 ? gynecHistory.intervalOfCycle : inputCycles;
    const CYCLES_LIST = Array.from({ length: 11 }, (_, i) => ({
        value: 22 + i,
        label: (22 + i).toString()
    })).concat({
        value: -1,
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customCyclesValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("Cycle")}
                onClick={() => onChangeSegmentedCyclesChild(-1)}
            />
        )
    })

    const customMenarcheValue = gynecHistory?.ageAtMenarche > 17 ? gynecHistory.ageAtMenarche : inputMenarche;
    const MENARCHE_LIST = Array?.from({ length: 11 }, (_, i) => ({
        value: 7 + i,
        label: (7 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customMenarcheValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("Menarche")}
                onClick={() => onChangeSegmentedMenarcheChild('custom')}
            />
        )
    });

    const customMenoPause = (gynecHistory?.ageAtMenopause > 49 || gynecHistory?.ageAtMenopause < 45) ? gynecHistory.ageAtMenopause : inputMenopause;
    const MENOPAUSE_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 45 + i,
        label: (45 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customMenoPause}
                inputMode="numeric"
                onChange={onChangeCustomInput("Menopause")}
                onClick={() => onChangeSegmentedMenopauseChild('custom')}
            />
        )
    });

    const customCyclesDaysValue = gynecHistory?.durationOfMenstrualFlow > 5 ? gynecHistory.durationOfMenstrualFlow : inputCyclesDays;
    const DURATION_OF_CYCLE_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 1 + i,
        label: (1 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customCyclesDaysValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("cyclesDays")}
                onClick={() => onChangeSegmentedCyclesDaysChild('custom')}
            />
        )
    });

    const customPadNumValue = gynecHistory?.numberOfPadsPerDay > 5 ? gynecHistory.numberOfPadsPerDay : inputPadsNum;
    const PAD_NUM_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 1 + i,
        label: (1 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customPadNumValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("padsNum")}
                onClick={() => onChangeSegmentedPadNumChild('custom')}
            />
        )
    });

    const defaultActiveTabKey = initialActiveKey || ((hideMenstrualHistoryTab && !gynecOnly) ? 'medical' : 'gynec');
    const [activeTab, setActiveTab] = useState(defaultActiveTabKey);
    const [tokenData, setTokenData] = useState(null);

    const onTabChange = (key) => {
        setActiveTab(key);
    };

    useEffect(() => {
        setActiveTab(defaultActiveTabKey);
    }, [defaultActiveTabKey]);

    useEffect(() => {
        dispatch(listSectionwithTag());
    }, [dispatch]);

    useEffect(() => {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        try {
            var decoded = jwtDecode(token);
            setTokenData(decoded.result)
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        const isPrescriptionOnly = overrideMedicalHistoryData != null;
        let data2 = [];
        if (isPrescriptionOnly) {
            const ctx = medicalHistoryData ? JSON.parse(JSON.stringify(medicalHistoryData)) : [];
            const ovr = overrideMedicalHistoryData ? JSON.parse(JSON.stringify(overrideMedicalHistoryData)) : [];
            const combinedBySection = (a, b) => {
                const byId = (arr) => (arr || []).reduce((acc, s) => ({ ...acc, [s.tmmhs_id]: s }), {});
                const aMap = byId(a);
                const bMap = byId(b);
                const ids = new Set([...Object.keys(aMap), ...Object.keys(bMap)]);
                return Array.from(ids, (id) => {
                    const sa = aMap[id];
                    const sb = bMap[id];
                    if (!sa) return sb;
                    if (!sb) return sa;
                    const secId = Number(id) || sa?.tmmhs_id || sb?.tmmhs_id;
                    return { ...sa, ...sb, tags: mergeMedicalHistoryTagsBySection(sa.tags, sb.tags, secId) };
                });
            };
            data2 = combinedBySection(ctx, ovr);
        } else {
            const sourceData = medicalHistoryData;
            data2 = sourceData ? JSON.parse(JSON.stringify(sourceData)) : [];
        }

        const buildMergedArray = (data1) =>
            data1?.map((e) => {
                const sectionFromSource = data2?.find((x) => x?.tmmhs_id === e?.tmmhs_id);
                if (isPrescriptionOnly) {
                    if (!sectionFromSource || !data2?.length) {
                        return { ...e, ...(sectionFromSource || {}), tags: e?.tags ?? [] };
                    }
                    const mergedTags = [
                        ...(e?.tags || [])?.map((tag) => ({
                            ...tag,
                            ...(findMatchingMedicalHistoryTag(tag, sectionFromSource?.tags, e?.tmmhs_id) || {}),
                        })),
                        ...(sectionFromSource?.tags || [])?.filter(
                            (item2) =>
                                !(e?.tags || [])?.some((item1) =>
                                    tagsAreDuplicateForHistoryMerge(item1, item2, e?.tmmhs_id)
                                )
                        ),
                    ];
                    return {
                        ...e,
                        ...(sectionFromSource || {}),
                        tags: mergeMedicalHistoryTagsBySection(mergedTags, [], e?.tmmhs_id),
                    };
                }
                if (!data2?.length) {
                    return e;
                }
                const mergedTagsConsult = [
                    ...(e?.tags || [])?.map((tag) => ({
                        ...tag,
                        ...(findMatchingMedicalHistoryTag(tag, sectionFromSource?.tags, e?.tmmhs_id) || {}),
                    })),
                    ...(sectionFromSource?.tags || [])?.filter(
                        (item2) =>
                            !(e?.tags || [])?.some((item1) =>
                                tagsAreDuplicateForHistoryMerge(item1, item2, e?.tmmhs_id)
                            )
                    ),
                ];
                return {
                    ...e,
                    ...(sectionFromSource || {}),
                    tags: mergeMedicalHistoryTagsBySection(mergedTagsConsult, [], e?.tmmhs_id),
                };
            }) ?? data1;

        try {
            if (defaultList?.length > 0) {
                const data1 = defaultList ? JSON.parse(JSON.stringify(defaultList)) : [];
                const mergedArray = buildMergedArray(data1);
                console.groupCollapsed("[VoiceRx MedicalHistory] MedicalHistoryBox sync effect");
                console.log("reason", "defaultList/medicalHistoryData sync");
                console.log("defaultList length", defaultList?.length || 0);
                console.log("medicalHistoryData source", medicalHistoryData);
                console.log("data2 source used for merge", data2);
                console.log("mergedArray for cloneMedicalHistoryData", mergedArray);
                console.groupEnd();
                setCloneMedicalHistoryData(mergedArray ? JSON.parse(JSON.stringify(mergedArray)) : []);
                setRemarks(getMedicalHistoryRemarks(mergedArray));
                initialSnapshotRef.current = buildDirtySnapshot(mergedArray, getMedicalHistoryRemarks(mergedArray));
            } else if (isPrescriptionOnly && Array.isArray(data2) && data2.length > 0) {
                const fiveSections = ensureFiveSections(data2);
                setCloneMedicalHistoryData(JSON.parse(JSON.stringify(fiveSections)));
                setRemarks(getMedicalHistoryRemarks(data2));
                initialSnapshotRef.current = buildDirtySnapshot(fiveSections, getMedicalHistoryRemarks(data2));
            } else {
                setRemarks("");
                initialSnapshotRef.current = buildDirtySnapshot([], "");
            }
        } catch (error) {
            console.error("Error merging medical history data:", error);
            setCloneMedicalHistoryData([]);
            setRemarks("");
            initialSnapshotRef.current = buildDirtySnapshot([], "");
        }
    // defaultList always; overrideMedicalHistoryData for voice/snap/smart; medicalHistoryData for voice merge and consult.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultList, overrideMedicalHistoryData, medicalHistoryData]);

    const onExpandCollapseClick = useCallback((i) => {
        cloneMedicalHistoryData[i].isExpand = !cloneMedicalHistoryData[i].isExpand
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [cloneMedicalHistoryData]);

    const onTagClick = useCallback((tmmhs_id, tmmhst_id, i, i1) => {
        setSelectData({
            tmmhs_id: tmmhs_id,
            tmmhst_id: tmmhst_id,
            section_index: i,
            tag_index: i1
        });
        let initial = {}
        if (tmmhs_id === 2) {
            initial = { ...MEDICAL_PROBLEM }
        } else if (tmmhs_id === 3) {
            initial = { ...FAMILY_HISTORY }
        } else if (tmmhs_id === 5) {
            initial = { ...SURGICAL_HISTORY }
        } else {
            initial = { ...OTHERS }
        }
        if (cloneMedicalHistoryData[i].tags[i1].enable === undefined || cloneMedicalHistoryData[i].tags[i1].enable === "-") {
            setCloneMedicalHistoryData((prev) => {
                const newArray = [...prev];
                newArray[i].tags[i1] = {
                    ...newArray[i].tags[i1],
                    ...initial,
                    enable: "Y"
                };
                return newArray;
            })
        }
        if (tmmhs_id === 5) {
            try {
                const dateType = cloneMedicalHistoryData[i].tags[i1].dateType;
                const dateValue = cloneMedicalHistoryData[i].tags[i1].date;
                if (dateType && dateValue) {
                    if (dateType === 'onlyYear') {
                        setSurgicalDateType('year');
                        setSurgicalDate(dateValue);
                    } else if (dateType === 'fullDate') {
                        setSurgicalDateType('full');
                        try {
                            const parsedDate = dayjs(dateValue, 'DD-MM-YYYY');
                            if (parsedDate.isValid()) {
                                setSurgicalDate(parsedDate);
                            } else {
                                setSurgicalDate(null);
                            }
                        } catch (error) {
                            console.error('Error parsing surgical date:', error);
                            setSurgicalDate(null);
                        }
                    }
                } else {
                    const sinceValue = cloneMedicalHistoryData[i].tags[i1].since;
                    if (sinceValue) {
                        if (/^\d{4}$/.test(sinceValue)) {
                            setSurgicalDateType('year');
                            setSurgicalDate(sinceValue);
                        } else {
                            setSurgicalDateType('full');
                            try {
                                const parsedDate = dayjs(sinceValue, 'DD-MM-YYYY');
                                if (parsedDate.isValid()) {
                                    setSurgicalDate(parsedDate);
                                } else {
                                    setSurgicalDate(null);
                                }
                            } catch (error) {
                                console.error('Error parsing surgical date:', error);
                                setSurgicalDate(null);
                            }
                        }
                    } else {
                        setSurgicalDateType('year');
                        setSurgicalDate(null);
                    }
                }
            } catch (error) {
                console.error('Error initializing surgical history:', error);
                setSurgicalDateType('year');
                setSurgicalDate(null);
            }
        }
    }, [selectData, cloneMedicalHistoryData]);

    const onSurgicalDateTypeChange = useCallback((value) => {
        setSurgicalDateType(value);
        setSurgicalDate(null);
    }, []);
    const onSurgicalDateChange = useCallback((date) => {
        setSurgicalDate(date);
    }, []);
    const onSurgicalYearChange = useCallback((value) => {
        setSurgicalDate(value);
    }, []);

    /**
     * When the patient already has history, open with the first recorded item
     * selected so the detail pane shows real data instead of the empty state.
     * Routed through onTagClick so surgical date/since initialisation is shared.
     */
    useEffect(() => {
        if (selectData || !cloneMedicalHistoryData?.length) return;
        for (let i = 0; i < cloneMedicalHistoryData.length; i++) {
            const section = cloneMedicalHistoryData[i];
            const tags = section?.tags || [];
            for (let j = 0; j < tags.length; j++) {
                if (!tags[j].delete && (tags[j].enable === "Y" || tags[j].enable === "N")) {
                    onTagClick(section.tmmhs_id, tags[j].tmmhst_id, i, j);
                    return;
                }
            }
        }
    }, [cloneMedicalHistoryData, selectData, onTagClick]);

    // Since Web
    const onChangeStatus = useCallback((key) => {
        if (key != cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status) {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].status = key
        } else {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].status = ''
        }
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    const onChangeMedication = useCallback((key) => {
        if (key != cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication) {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].medication = key
        } else {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].medication = ''
        }
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    const onChangeInputNote = useCallback((e) => {
        cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].note = capitalizeAfterSentence(e.target.value)
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    // ── Redesigned Medical History tab ────────────────────────────────────
    // State and handlers below back the new chip/detail UI. They mutate the
    // same cloneMedicalHistoryData shape the old UI used, so onSaveClicked and
    // every downstream consumer stay untouched.

    const [crossSearchQuery, setCrossSearchQuery] = useState("");
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

    const onCrossSearchChange = useCallback((e) => {
        setCrossSearchQuery(removeBeforeWhiteSpace(e.target.value));
    }, []);

    const { resultsBySection: searchResultsBySection } = useCrossSectionTagSearch(
        cloneMedicalHistoryData,
        crossSearchQuery
    );

    const {
        order: sectionOrder,
        hiddenSet: hiddenSectionIds,
        onDragEnd: onSectionDragEnd,
        toggleVisibility: onToggleSectionVisibility,
        reset: onResetSectionConfig,
    } = useSectionConfig({
        sections: cloneMedicalHistoryData,
        doctorId: profile?.doctor_unique_id,
        enabled: !gynecOnly,
    });

    const getFieldTemplate = useCallback((tmmhs_id) => {
        if (tmmhs_id === 2) return { ...MEDICAL_PROBLEM };
        if (tmmhs_id === 3) return { ...FAMILY_HISTORY };
        if (tmmhs_id === 5) return { ...SURGICAL_HISTORY };
        return { ...OTHERS };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Append a tag to a section as already-selected, and focus it. */
    const appendSelectedTag = useCallback((sectionIndex, tag) => {
        let newTagIndex = 0;
        setCloneMedicalHistoryData((prev) => {
            const next = [...prev];
            const section = next[sectionIndex];
            if (!section) return prev;
            const tags = [...(section.tags || [])];
            newTagIndex = tags.length;
            tags.push({
                pms_default: 0,
                ...getFieldTemplate(section.tmmhs_id),
                ...tag,
                unique_id: tag.unique_id || uuidv4(),
                enable: "Y",
            });
            next[sectionIndex] = { ...section, tags };
            return next;
        });
        const section = cloneMedicalHistoryData[sectionIndex];
        setSelectData({
            tmmhs_id: section?.tmmhs_id,
            tmmhst_id: tag.tmmhst_id || 0,
            section_index: sectionIndex,
            tag_index: newTagIndex,
        });
    }, [cloneMedicalHistoryData, getFieldTemplate]);

    const onAddCustomTag = useCallback((sectionIndex) => {
        const title = crossSearchQuery.trim();
        if (!title) return;
        appendSelectedTag(sectionIndex, { tmmhst_id: 0, title, pms_default: 1 });
        setCrossSearchQuery("");
    }, [crossSearchQuery, appendSelectedTag]);

    const onAddSearchResult = useCallback((sectionIndex, tag) => {
        appendSelectedTag(sectionIndex, {
            tmmhst_id: tag.tmmhst_id || 0,
            title: String(tag.title || "").trim(),
            pms_default: tag.pms_default ?? 0,
        });
        setCrossSearchQuery("");
    }, [appendSelectedTag]);

    /**
     * Removing a chip deselects it rather than deleting it — "-" is the same
     * third state the old Y/N/- toggle produced, and onSaveClicked already
     * filters it out.
     */
    const onDeselectTag = useCallback((sectionIndex, tagIndex) => {
        setCloneMedicalHistoryData((prev) => {
            const next = [...prev];
            const section = next[sectionIndex];
            if (!section) return prev;
            const tags = [...(section.tags || [])];
            tags[tagIndex] = { ...tags[tagIndex], enable: ENABLE_DESELECTED };
            next[sectionIndex] = { ...section, tags };
            return next;
        });
        setSelectData((prev) =>
            prev?.section_index === sectionIndex && prev?.tag_index === tagIndex ? null : prev
        );
    }, []);

    const onNoKnownHistorySection = useCallback((sectionIndex, checked) => {
        setCloneMedicalHistoryData((prev) => {
            const next = [...prev];
            next[sectionIndex] = { ...next[sectionIndex], no_know_history: checked };
            return next;
        });
    }, []);

    const updateSelectedTag = useCallback((patch) => {
        setSelectData((current) => {
            if (!current) return current;
            setCloneMedicalHistoryData((prev) => {
                const next = [...prev];
                const section = next[current.section_index];
                if (!section) return prev;
                const tags = [...(section.tags || [])];
                if (!tags[current.tag_index]) return prev;
                tags[current.tag_index] = { ...tags[current.tag_index], ...patch };
                next[current.section_index] = { ...section, tags };
                return next;
            });
            return current;
        });
    }, []);

    const onEnableChange = useCallback((value) => {
        updateSelectedTag({ enable: value });
    }, [updateSelectedTag]);

    // `oldSince` is written alongside `since` to match the previous AutoComplete
    // behaviour; both are persisted today.
    const onSinceChange = useCallback((value) => {
        updateSelectedTag({ since: value, oldSince: value });
    }, [updateSelectedTag]);

    const onRelationshipChange = useCallback((value) => {
        updateSelectedTag({ relationship: value });
    }, [updateSelectedTag]);

    /**
     * Custom and library tags are added with tmmhst_id 0. The save API does not
     * create tags, so they are registered here first and their real ids merged
     * back in — this replaces the registration the old "Edit & Add" popover did
     * via onAddEditSaveClick.
     */
    const registerNewTags = useCallback(async () => {
        for (let i = 0; i < cloneMedicalHistoryData.length; i++) {
            const section = cloneMedicalHistoryData[i];
            const tags = (section?.tags || []).filter((t) => !t.delete);
            const hasNew = tags.some(
                (t) => (!t.tmmhst_id || t.tmmhst_id === 0) && (t.enable === "Y" || t.enable === "N")
            );
            if (!hasNew) continue;

            try {
                const action = await dispatch(addTag({
                    tmmhs_id: section.tmmhs_id,
                    title: section.title,
                    tags: tags.map((t) => ({
                        tmmhst_id: t.tmmhst_id || 0,
                        title: t.title,
                        pms_default: t.pms_default ?? 0,
                    })),
                }));
                const registered = action?.payload?.tags;
                if (action.meta.requestStatus !== "fulfilled" || !registered?.length) continue;

                section.tags.forEach((tag) => {
                    if (tag.tmmhst_id) return;
                    const match = registered.find(
                        (r) => String(r.title || "").trim().toLowerCase() ===
                            String(tag.title || "").trim().toLowerCase()
                    );
                    if (match) tag.tmmhst_id = match.tmmhst_id;
                });
            } catch (e) {
                console.warn("[MedicalHistoryBox] addTag failed for section", section?.tmmhs_id, e);
            }
        }
    }, [cloneMedicalHistoryData, dispatch]);

    /**
     * Unsaved-changes guard. The antd Drawer at each call site closes on mask
     * click and Esc without consulting this component, so those call sites set
     * maskClosable={false} and keyboard={false} — every close then routes
     * through the header back arrow and lands here.
     */
    const buildDirtySnapshot = useCallback((sections, remarksValue) => JSON.stringify({
        remarks: String(remarksValue || "").trim(),
        sections: (sections || []).map((s) => ({
            id: s?.tmmhs_id,
            nkh: !!s?.no_know_history,
            tags: (s?.tags || [])
                .filter((t) => t.enable === "Y" || t.enable === "N")
                .map((t) => ({
                    id: t.tmmhst_id,
                    title: t.title,
                    enable: t.enable,
                    since: t.since,
                    status: t.status,
                    medication: t.medication,
                    relationship: t.relationship,
                    note: t.note,
                    date: t.date,
                })),
        })),
    }), []);

    const isMedicalHistoryDirty = useCallback(
        () => buildDirtySnapshot(cloneMedicalHistoryData, remarks) !== initialSnapshotRef.current,
        [buildDirtySnapshot, cloneMedicalHistoryData, remarks]
    );

    const isMedicalTab = !gynecOnly && activeTab === "medical";

    /**
     * The antd tab strip is only rendered when both tabs are available; the
     * `hide-tabs-nav` class removes it otherwise. When it is visible it costs
     * 46px plus antd's 16px .ant-tabs-nav bottom margin — the gynec tab already
     * cancels that margin with its own -1rem wrapper, so the medical panel does
     * the same and reports 60 + 46 as its height offset.
     */
    const TABS_NAV_HEIGHT = 46;
    const tabsNavVisible = !(hideMenstrualHistoryTab || gynecOnly);
    const medicalPanelHeightOffset = 60 + (tabsNavVisible ? TABS_NAV_HEIGHT : 0);

    /** Drives the Save label: "Save Changes" once the patient has history. */
    const hasExistingHistory = useMemo(
        () => (cloneMedicalHistoryData || []).some(
            (s) => s?.no_know_history ||
                (s?.tags || []).some((t) => !t.delete && (t.enable === "Y" || t.enable === "N"))
        ) || !!String(remarks || "").trim(),
        [cloneMedicalHistoryData, remarks]
    );

    const requestCloseDrawer = useCallback(() => {
        if (!gynecOnly && activeTab === "medical" && isMedicalHistoryDirty()) {
            setShowUnsavedConfirm(true);
            return;
        }
        handleDrawerMedicalHistory();
    }, [gynecOnly, activeTab, isMedicalHistoryDirty, handleDrawerMedicalHistory]);

    const onSaveClicked = async () => {
        await registerNewTags();
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Medical_history_updated", {
            clinic_name,
            "patient_number": patient_data?.pm_contact_no,
            "patient_id": patient_data?.patient_unique_id
        });
        if (!hideMenstrualHistoryTab) {
            await handleSave({ closeDrawer: activeTab === "gynec" });
            if (activeTab === "gynec") {
                return;
            }
        } else {
            await handleSave();
        }
        if (gynecOnly) {
            return;
        }
        if (selectData && selectData.tmmhs_id === 5) {
            const sectionIndex = selectData.section_index;
            const tagIndex = selectData.tag_index;
            if (cloneMedicalHistoryData[sectionIndex] && cloneMedicalHistoryData[sectionIndex].tags[tagIndex]) {
                cloneMedicalHistoryData[sectionIndex].tags[tagIndex].dateType = surgicalDateType === 'year' ? 'onlyYear' : 'fullDate';
                if (surgicalDateType === 'year' && surgicalDate) {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = surgicalDate.toString();
                } else if (surgicalDateType === 'full' && surgicalDate) {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = dayjs(surgicalDate).format('DD-MM-YYYY');
                } else {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = '';
                }
                cloneMedicalHistoryData[sectionIndex].tags[tagIndex].since = '';
            }
        }
        
        const medicalHistory = cloneMedicalHistoryData?.map((e, i) => {
            return {
                title: e?.title,
                tmmhs_id: e?.tmmhs_id,
                no_know_history: e?.no_know_history !== undefined ? e?.no_know_history : false,
                tags: !e?.no_know_history ? e?.tags?.filter(x => x.enable == 'Y' || x.enable == 'N') : [],
                ...remarks && i === 0 && {medical_history_remarks: remarks?.trim()}
            }
        })
        // Saved state becomes the new baseline, so closing right after a save
        // does not trip the unsaved-changes guard.
        initialSnapshotRef.current = buildDirtySnapshot(cloneMedicalHistoryData, remarks);
        if (!remarks && medicalHistory.filter(e => !e?.no_know_history && e?.tags?.length === 0).length === medicalHistory.length) {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData([]);
            handleDrawerMedicalHistory()
        } else {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData(JSON.parse(JSON.stringify(medicalHistory)));
            handleCollapsed(2)
        }
    }

    const handleSelectionChange = (key, value) => {
        setActiveMenstrualData(key)
        if (key === "pain" && value === "None") {
            setGynecHistory(prevState => ({ ...prevState, ["occurrenceOfPain"]: null }));
        }

        setGynecHistory(prevState => {
            if (!prevState) {
                return { [key]: value }; // Handle case when prevState is null or undefined
            }

            setPrevActiveMentrualData(activeMenstrualData)
            if (prevState[key] === value && activeMenstrualData === key) {
                setActiveMenstrualData("");

                switch (activeMenstrualData) {
                    case 'cycle':
                        setRightPanelTitle('Cycle');
                        break;
                    case 'flow':
                        setRightPanelTitle('Flow');
                        break;
                    case 'pain':
                        setRightPanelTitle('Pain');
                        break;
                    case 'ageAtMenarche':
                        setRightPanelTitle('Age at menarche');
                        break;
                    case 'reproductiveLifeStages':
                        setRightPanelTitle("Lifecycle Hormonal Changes");
                        break;
                    case 'notes':
                        setRightPanelTitle('Enter the notes');
                        break;
                    default:
                        setRightPanelTitle('Please select data from left pan');
                        break;
                }

                const updatedState = { ...prevState, [key]: null };

                // Check for specific keys and set corresponding fields to null
                if (key === "cycle") {
                    updatedState.intervalOfCycle = null;
                    setInputCycles('')
                    updatedState.cycleNotes = null;
                }
                if (key === "flow") {
                    updatedState.durationOfMenstrualFlow = null;
                    setInputCyclesDays('')
                    updatedState.clots = null;
                    updatedState.numberOfPadsPerDay = null;
                    setInputPadsNum('')
                    updatedState.flowNotes = null;
                }
                if (key === "pain") {
                    updatedState.occurrenceOfPain = null;
                    updatedState.painNotes = null;
                }
                if (key === "reproductiveLifeStages") {
                    updatedState.ageAtMenopause = null;
                    setInputMenopause('')
                    updatedState.typeOfMenopause = null;
                    updatedState.reproductiveNotes = null;
                }
                if (key === "ageAtMenarche") {
                    updatedState.ageAtMenarche = null;
                    updatedState.menarcheNotes = null
                    setInputMenarche('')
                }

                return updatedState;
            } else {
                setActiveMenstrualData(key);
                switch (key) {
                    case 'cycle':
                        setRightPanelTitle('Cycle');
                        break;
                    case 'flow':
                        setRightPanelTitle('Flow');
                        break;
                    case 'pain':
                        setRightPanelTitle('Pain');
                        break;
                    case 'ageAtMenarche':
                        setRightPanelTitle('Age at menarche');
                        break;
                    case 'reproductiveLifeStages':
                        setRightPanelTitle("Lifecycle Hormonal Changes");
                        break;
                    case 'notes':
                        setRightPanelTitle('Enter the notes');
                        break;
                    default:
                        setRightPanelTitle('No Data');
                        break;
                }
                return {
                    ...prevState,
                    [key]: value
                };
            }
        });
    };

    const handleGynecValueChange = (key, value) => {
        setGynecHistory(prevState => {
            if (!prevState) {
                return { [key]: value };
            }
            if (prevState[key] !== value) {
                return { ...prevState, [key]: value };
            } else {
                return { ...prevState, [key]: '' };
            }
        });
    };

    const [activeMenstrualData, setActiveMenstrualData] = useState(null);
    const [prevActiveMentrualData, setPrevActiveMentrualData] = useState("cycle");
    const [rightPanelTitle, setRightPanelTitle] = useState("No Record");

    const disabledDate = (current) => {
        // Disable dates after today
        return current && current > moment().endOf('day');
    };

    const formatDate = (dateString) => {
        return dateString ? moment(dateString, showDateFormat).format(dateFormat) : '';
    };

    const onDateChanged = (date, dateString) => {
        handleGynecValueChange("lmp", formatDate(dateString))
        setSelectedDate(formatDate(dateString))
    };

    const handleNoteChange = (key, value) => {
        setGynecHistory(prevState => ({ ...prevState, [key]: value }));
    };

    const handleSave = async ({ closeDrawer = true } = {}) => {
        if (gynecOnly) {
            const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
                if (
                    key !== 'createdAt' && key !== 'createdBy' &&
                    gynecHistory[key] !== '' && gynecHistory[key] !== null &&
                    gynecHistory[key] !== 'custom' && gynecHistory[key] !== 'number'
                ) {
                    acc[key] = gynecHistory[key];
                }
                return acc;
            }, {});
            const lmpRaw = filteredGynecHistory.lmp ?? filteredGynecHistory.lastMenstrualPeriod;
            if (lmpRaw) {
                const parsed = moment(lmpRaw, [showDateFormat, dateFormat, 'YYYY-MM-DD']);
                if (parsed.isValid()) filteredGynecHistory.lastMenstrualPeriod = parsed.format(showDateFormat);
            }
            if (onSave) onSave(filteredGynecHistory);
            if (patient_data?.patient_unique_id) await handleSaveClick();
            if (closeDrawer) handleDrawerMedicalHistory();
            return;
        }
        if (!hideMenstrualHistoryTab) {
            const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
                if (
                    key !== 'createdAt' && key !== 'createdBy' &&
                    gynecHistory[key] !== '' && gynecHistory[key] !== null &&
                    gynecHistory[key] !== 'custom' && gynecHistory[key] !== 'number'
                ) {
                    acc[key] = gynecHistory[key];
                }
                return acc;
            }, {});
            if (onSave) onSave(filteredGynecHistory);
            await handleSaveClick();
            if (closeDrawer) handleDrawerMedicalHistory();
            return;
        }
        if (hideMenstrualHistoryTab) {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData(cloneMedicalHistoryData);
            if (onSave) {
                onSave(cloneMedicalHistoryData);
            }
        }
    };

    const onExpandCollapseGynecClick = useCallback((key) => {
        setSectionState(prevState => ({ ...prevState, [key]: !prevState[key] }));
    }, []);

    useEffect(() => {
        if (isGynaecHistoryAccessable && !gynecOnly) {
            fetchGynecHistory();
        }
    }, [isGynaecHistoryAccessable, gynecOnly]);

    // Rx pad (voice/ambient/snap/smart): sync initial gynec data when drawer opens so Menstrual History tab shows it
    useEffect(() => {
        if (gynecOnly && initialGynecHistory != null && typeof initialGynecHistory === 'object' && Object.keys(initialGynecHistory).length > 0) {
            setGynecHistory({ ...initialGynecHistory });
        }
    }, [gynecOnly, initialGynecHistory]);

    const fetchGynecHistory = async () => {
        if (!patient_data?.patient_unique_id) return;
        try {
            const data = await getGynecDetails(patient_data.patient_unique_id, userId);
            if (data) {
                setGynecEditState("UPDATE");
                if (Object.keys(data).length > 2) {
                    setActiveMenstrualData("cycle")
                    setRightPanelTitle('Cycle')
                }
            }
            setGynecHistory(data);
            setGynecLoading(false);
        } catch (error) {
            console.error('Error fetching gynec history:', error);
            setGynecLoading(false);
        }
    };

    // Function to check if gynecHistory has any meaningful entries except createdAt and createdBy
    const hasGynecHistoryData = (gynecHistory) => {
        if (!gynecHistory) return false;
        const { createdAt, createdBy, ...rest } = gynecHistory;
        return Object.keys(rest).length > 0;
    };

    const trackUpdateEvent = () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Gynec_history_updated", {
            clinic_name,
            doctor_id: profile?.doctor_unique_id,
            patient_number: patient_data?.pm_contact_no,
            patient_id: patient_data?.patient_unique_id,
        })
    }

    const handleSaveClick = async () => {
        setGynecEditState("UPDATE");
        setGynecLoading(true);
        const today = moment().toISOString();
        const hasData = hasGynecHistoryData(gynecHistory);

        if (!hasData) {
            setGynecLoading(false);
            return false;
        }

        // Filter out keys with empty string values
        const filteredGynecHistory = Object.keys(gynecHistory).reduce((acc, key) => {
            if (gynecHistory[key] !== '' && gynecHistory[key] !== null && gynecHistory[key] !== "custom" && gynecHistory[key] !== "number") {
                acc[key] = gynecHistory[key];
            }
            return acc;
        }, {});

        setGynecHistory(filteredGynecHistory)

        if (gynecEditState === "CREATE") {
            const payload = {
                patientId: patient_data.patient_unique_id,
                timeline: [{
                    ...filteredGynecHistory,
                    createdAt: today,
                    createdBy: tokenData?.user_id,
                }],
                createdAt: today,
                createdBy: tokenData?.user_id,
            };
            try {
                const response = await postGynecDetails(payload);
                if (response?.data) {
                    trackUpdateEvent();
                }
                return true;
            } catch (error) {
                console.error('Error:', error);
                errorMessage("Unable to create gynec history for you. please try again.")
                return false;
            } finally {
                setGynecLoading(false);
            }
        } else {
            const payload = {
                ...filteredGynecHistory,
                createdAt: today,
                createdBy: tokenData?.user_id,
            };
            try {
                const response = await updateGynecDetails(patient_data.patient_unique_id, payload, userId);
                if (response?.data) {
                    trackUpdateEvent();
                }
                return true;
            } catch (error) {
                console.error('Error:', error);
                errorMessage("Unable able to update gynecdetail for you. please try again.")
                return false;
            } finally {
                setGynecLoading(false);
            }
        }
    };

    const isCustomOrNumberOrUndefined = (value) => {
        return value === undefined || value === '' || value === 'number' || value === 'custom' || value === null || value === -1;
    };

    const [selectedDate, setSelectedDate] = useState(null);
    useEffect(() => {
        if (gynecHistory?.lmp) {
            setSelectedDate(moment(gynecHistory.lmp).format(showDateFormat));
        }
    }, [gynecHistory]);

    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div
                    className="video-contant rounded-4 p-20"
                    key="oneclickrx-video"
                >
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button
                            className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>

                    <div className={`d-flex`}>
                        <div className="tutorial-play me-14">
                            <button type="button" onClick={() => setShowVideo(true)}>
                                <img src={playIcons} />
                            </button>
                            <span className="tutorial-thumb">
                                <img src={videoLink.thumbnail} />
                            </span>
                        </div>
                        <div>
                            <h3 className="title-common text-welcome">
                                {videoLink.tmv_title}
                            </h3>
                            <div className="fs-12 fontroboto fw-normal text-main">
                                {videoLink.tmv_description}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }, [popOverVideo]);
    
    
    const onRemarksChange = (e) => {
        setRemarks(e.target.value);
    }

    return (
        <>
            {hideMenstrualHistoryTab && (
                <style>{`
                    .hide-tabs-nav .ant-tabs-nav {
                        display: none !important;
                    }
                    /* No margin here: with the tab strip hidden the redesigned
                       panel must sit flush under the 60px header. It carries its
                       own top padding via .searchBar. */
                    .hide-tabs-nav .ant-tabs-content-holder {
                        margin-top: 0;
                    }
                    .hide-tabs-nav .ant-tabs-content {
                        padding-top: 0;
                    }
                `}</style>
            )}
            <Card bordered={false} className={[
                "search-modalCard",
                isVoiceRxModuleEnabled ? voiceModuleStyles.moduleRoot : "",
                isVoiceRxModuleEnabled && (voiceUpdated || additionalHistoryVoiceUpdated || selectedHistoryNoteVoiceUpdated) ? voiceModuleStyles.moduleUpdated : "",
            ].filter(Boolean).join(" ")}>
                <div className='modalCard-header h-60 align-items-center justify-content-between d-flex'>
                    <div className='align-items-center d-flex h-100'>
                        <div className='border-end h-100 text-center me-3'>
                            <div
                                onClick={requestCloseDrawer}
                                className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                <i className='icon-right'></i>
                            </div>
                        </div>
                        <div className="title-common">
                            {(isGynaecHistoryAccessable && !hideMenstrualHistoryTab) ? `Gynec History` : `Medical History`}
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {/* Gynec video tutorial belongs to the Menstrual History
                            tab; hidden on Medical History so that header matches
                            the redesign (gear + Save only). */}
                        {isGynaecHistoryAccessable && !isMedicalTab && (
                            <Popover
                                open={popOverVideo}
                                onOpenChange={showHideVideoListPopover}
                                content={VIDEO_CONTENT}
                                trigger="click"
                                overlayClassName="pop-430 pp-0 videoTutorial"
                                placement="bottom"
                            >
                                <button className="btn d-flex align-items-center btn-text p-0 me-20">
                                    <span>
                                        <img src={tutorial2} alt="Video tutorial" />
                                    </span>
                                </button>
                            </Popover>
                        )}
                        {/* {isVoiceRxModuleEnabled && (
                            <VoiceRxModuleButton
                                active={voiceCaptureOpen}
                                label="Start Medical History voice input"
                                onClick={openMedicalHistoryVoiceCapture}
                            />
                        )} */}
                        <TesseractThemeProvider colorScheme="light">
                            <span className={`${medicalHistoryStyles.headerActions} me-20`}>
                                {isMedicalTab && (
                                    <>
                                        <CustomizeButton
                                            order={sectionOrder}
                                            hiddenSet={hiddenSectionIds}
                                            onDragEnd={onSectionDragEnd}
                                            onToggleVisibility={onToggleSectionVisibility}
                                            onReset={onResetSectionConfig}
                                        />
                                        <TesseractDivider orientation="vertical" />
                                    </>
                                )}
                                <TesseractButton
                                    variant="solid"
                                    theme="primary"
                                    size="md"
                                    onClick={onSaveClicked}
                                >
                                    {isMedicalTab
                                        ? (hasExistingHistory ? "Save Changes" : "Save History")
                                        : "Save"}
                                </TesseractButton>
                            </span>
                        </TesseractThemeProvider>
                    </div>
                </div>
                <Tabs 
                    defaultActiveKey={defaultActiveTabKey} 
                    onChange={onTabChange}
                    className={(hideMenstrualHistoryTab || gynecOnly) ? "hide-tabs-nav" : ""}
                >
                    {((isGynaecHistoryAccessable && !hideMenstrualHistoryTab) || gynecOnly) &&
                        <TabPane tab="Menstrual History" key="gynec">
                            <div style={{ marginTop: "-1rem" }}>
                                <Row>
                                    <Col lg={12}>
                                        <div className="bg-white overflow-y-auto medical-history-section" style={{ height: 'calc(100vh - 115px)' }}>
                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center lmp-gynec">
                                                    <label className="pe-3">Last menstrual period :</label>
                                                    <DatePicker
                                                        style={{
                                                            border: "1px solid #fff",
                                                            borderRadius: "18px",
                                                        }}
                                                        placeholder={showDateFormat.toLowerCase()}
                                                        value={
                                                            selectedDate
                                                                ? dayjs(selectedDate, "DD-MM-YYYY")
                                                                : ""
                                                        }
                                                        format={{
                                                            format: showDateFormat,
                                                            type: 'mask',
                                                        }}

                                                        onChange={onDateChanged}
                                                        disabledDate={disabledDate}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Age at menarche</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('ageAtMenarche')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.ageAtMenarche ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.ageAtMenarche &&
                                                    <div className="d-flex flex-wrap">
                                                        <div key="regular" className={`history-badge gynec-history-badge ${activeMenstrualData === "ageAtMenarche" && gynecHistory?.[activeMenstrualData] ? 'history-selected' : gynecHistory?.ageAtMenarche ? 'history-active' : ''}`}>
                                                            <div onClick={() => handleSelectionChange('ageAtMenarche', gynecHistory?.ageAtMenarche || 'number')}>
                                                                {isCustomOrNumberOrUndefined(gynecHistory?.ageAtMenarche) ? `+Add` : `${gynecHistory?.ageAtMenarche} years`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Cycle</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('cycle')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.cycle ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.cycle &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {CYCLE_KEY_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    // className={`btn p-0 ${ activeMenstrualData ==="cycle" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.cycle === item.value ? 'history-active' : ''}`}
                                                                    className={`btn p-0 ${activeMenstrualData === "cycle" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.cycle === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('cycle', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Flow</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('flow')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.flow ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.flow &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {FLOW_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn w-100 p-0 ${activeMenstrualData === "flow" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.flow === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('flow', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Pain</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('pain')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.pain ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.pain &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {PAIN_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 ${activeMenstrualData === "pain" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.pain === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('pain', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Lifecycle Hormonal Changes</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('reproductiveStages')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.reproductiveStages ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.reproductiveStages &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {REPRODUCTIVE_LIFE_STAGES_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 btn-padding ${activeMenstrualData === "reproductiveLifeStages" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.reproductiveLifeStages === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('reproductiveLifeStages', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Note</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('note')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.note ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.note ? !isCustomOrNumberOrUndefined(gynecHistory?.notes) ? (
                                                    <div className="gynec-notes d-flex">
                                                        <div className='pe-0'>
                                                            {gynecHistory?.notes}
                                                        </div>
                                                        <button className='btn d-flex pe-0' onClick={() => handleSelectionChange('notes', gynecHistory?.notes || 'number')}>
                                                            <span className="px-1">Edit</span><i className="icon-Edit" style={{ fontSize: "18px" }}></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-wrap">
                                                        <div key="regular" className={`history-badge gynec-history-badge ${activeMenstrualData === "notes" && isCustomOrNumberOrUndefined(gynecHistory?.notes) ? 'history-selected' : gynecHistory?.notes ? 'history-active' : ''}`}>
                                                            <div onClick={() => handleSelectionChange('notes', gynecHistory?.notes || 'number')}>
                                                                +Add
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    ""
                                                )
                                                }
                                            </div>
                                        </div>
                                    </Col>
                                    {/* Options for the selected values */}
                                    <Col lg={12}>
                                        <div className="bg-body overflow-y-auto" style={{ height: 'calc(100vh - 61px)' }}>
                                            <h4 className="border-bottom px-4 pt-3 pb-3">{(activeMenstrualData === "reproductiveLifeStages" && !gynecHistory?.reproductiveLifeStages) ? `Lifecycle Hormonal Changes` : rightPanelTitle}</h4>
                                            <div className="mb-2 mx-4">
                                                {/* Cycle Options */}
                                                {activeMenstrualData === "cycle" && (
                                                    <div>
                                                        <h6 className="pb-1">Interval of cycle (in days)</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {CYCLES_LIST.map((item, i) => {
                                                                const isCustomButton = i === CYCLES_LIST.length - 1;
                                                                const isActive = gynecHistory?.intervalOfCycle === item.value || (isCustomButton && gynecHistory?.intervalOfCycle !== "" && (gynecHistory?.intervalOfCycle === customCyclesValue || gynecHistory?.intervalOfCycle === inputCycles));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange("intervalOfCycle", item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>

                                                        </div>
                                                        <Input.TextArea
                                                            value={gynecHistory?.cycleNotes}
                                                            placeholder="Enter any specific cycle notes here"
                                                            className="textareaPlaceholder"
                                                            rows={3}
                                                            onChange={(e) => handleNoteChange('cycleNotes', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {/* Flow Options */}
                                                {activeMenstrualData === "flow" && (
                                                    <div>
                                                        <h6 className="pb-1">Duration of menstrual flow (in days)</h6>
                                                        <div className="segement-static d-flex mb-3">
                                                            {DURATION_OF_CYCLE_LIST.map((item, i) => {
                                                                const isCustomButton = i === DURATION_OF_CYCLE_LIST.length - 1;
                                                                const isActive = gynecHistory?.durationOfMenstrualFlow === item.value || (isCustomButton && gynecHistory?.durationOfMenstrualFlow !== "" && (gynecHistory?.durationOfMenstrualFlow === customCyclesDaysValue || gynecHistory?.durationOfMenstrualFlow === inputCyclesDays));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('durationOfMenstrualFlow', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <h6 className="pt-2 pb-1">Clots During Flow</h6>
                                                        <div className="segement-static d-flex mb-3">
                                                            {CLOTS_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 ${gynecHistory?.clots === item.value ? 'btn-segement' : ''}`}
                                                                    onClick={() => handleGynecValueChange('clots', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <h6 className="pt-2 pb-1">Number of Pads Per Day</h6>
                                                        <div className="segement-static d-flex">
                                                            {PAD_NUM_LIST.map((item, i) => {
                                                                const isCustomButton = i === PAD_NUM_LIST.length - 1;
                                                                const isActive = gynecHistory?.numberOfPadsPerDay === item.value || (isCustomButton && gynecHistory?.numberOfPadsPerDay !== "" && (gynecHistory?.numberOfPadsPerDay === customPadNumValue || gynecHistory?.numberOfPadsPerDay === inputPadsNum));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('numberOfPadsPerDay', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.flowNotes}
                                                                placeholder="Enter any specific flow notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('flowNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Pain Options */}
                                                {activeMenstrualData === "pain" && (
                                                    <div>
                                                        <h6 className="pb-1">Occurrence of pain</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {PAIN_OCCURANCE_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 pain-occurance ${gynecHistory?.occurrenceOfPain === item.value ? 'btn-segement' : ''}
                                                                    }`}
                                                                    onClick={() => handleGynecValueChange('occurrenceOfPain', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.painNotes}
                                                                placeholder="Enter any specific pain notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('painNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Age at Menarche */}
                                                {activeMenstrualData === "ageAtMenarche" && (
                                                    <div>
                                                        <h6 className="pb-1">Age at Menarche</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {MENARCHE_LIST.map((item, i) => {
                                                                const isCustomButton = i === MENARCHE_LIST.length - 1;
                                                                const isActive = gynecHistory?.ageAtMenarche === item.value || (isCustomButton && gynecHistory?.ageAtMenarche !== "" && (gynecHistory?.ageAtMenarche === customMenarcheValue || gynecHistory?.ageAtMenarche === inputMenarche));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('ageAtMenarche', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.menarcheNotes}
                                                                placeholder="Enter any specific menarche notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('menarcheNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Reproductive Life stages*/}
                                                {activeMenstrualData === "reproductiveLifeStages" && gynecHistory?.reproductiveLifeStages && (
                                                    <div>
                                                        <h6 className="pb-1">Age at {gynecHistory?.reproductiveLifeStages}</h6>
                                                        <div className="segement-static d-flex mb-2">
                                                            {MENOPAUSE_LIST.map((item, i) => {
                                                                const isCustomButton = i === MENOPAUSE_LIST.length - 1;
                                                                const isActive = gynecHistory?.ageAtMenopause === item.value || (isCustomButton && gynecHistory?.ageAtMenopause !== "" && (gynecHistory?.ageAtMenopause === customMenoPause || gynecHistory?.ageAtMenopause === inputMenopause));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('ageAtMenopause', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <h6 className="pt-4 pb-1">Type of {gynecHistory?.reproductiveLifeStages}</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {TYPES_REPRODUCTIVE_STAGES.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 types-reproductive-stages ${gynecHistory?.typeOfMenopause === item.value ? 'btn-segement' : ''} ${gynecHistory?.typeOfMenopause === 'custom' && item.value === 'custom' ? 'custom-input-selected' : ''
                                                                        }`}
                                                                    onClick={() => handleGynecValueChange('typeOfMenopause', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.reproductiveNotes}
                                                                placeholder="Enter any specific reproductive notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('reproductiveNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {gynecHistory && activeMenstrualData === "reproductiveLifeStages" && !gynecHistory?.[activeMenstrualData] && (
                                                    <div className="text-center">
                                                        <img className="my-4" style={{ width: 194 }} src={noRecordFound} alt="No Result Found" />
                                                        <div className="fontroboto text-main title-common"> No selected data Found! </div>
                                                        <div className="fontroboto text-main title fw-normal mt-2"> Please select data from the left panel. </div>
                                                    </div>
                                                )}
                                                {activeMenstrualData === "notes" && (
                                                    <div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <Input.TextArea
                                                                value={!isCustomOrNumberOrUndefined(gynecHistory?.notes) ? `${gynecHistory?.notes}` : ``}
                                                                placeholder="Write notes"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('notes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {!activeMenstrualData && (
                                                    <div className="text-center">
                                                        <img className="my-4" style={{ width: 194 }} src={noRecordFound} alt="No Result Found" />
                                                        <div className="fontroboto text-main title-common"> No Records Found! </div>
                                                        <div className="fontroboto text-main title fw-normal mt-2"> You haven't added any gynec history. </div>
                                                    </div>
                                                )
                                                }
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </TabPane>
                    }
                    {!gynecOnly && (
                    <TabPane tab="Medical History" key="medical">
                      {/* -16px, not the -1rem the gynec tab uses: the root font
                          size is 14px, so 1rem cancels only 14 of antd's 16px
                          nav margin and leaves a 2px seam. */}
                      <div style={{ marginTop: tabsNavVisible ? "-16px" : 0 }}>
                        <MedicalHistoryPanel
                            heightOffset={medicalPanelHeightOffset}
                            loading={loading}
                            sections={cloneMedicalHistoryData}
                            selectData={selectData}
                            order={sectionOrder}
                            hiddenSet={hiddenSectionIds}
                            crossSearchQuery={crossSearchQuery}
                            onCrossSearchChange={onCrossSearchChange}
                            searchResultsBySection={searchResultsBySection}
                            onAddSearchResult={onAddSearchResult}
                            remarks={remarks}
                            onRemarksChange={onRemarksChange}
                            onTagClick={onTagClick}
                            onDeleteTag={onDeselectTag}
                            onNoKnownHistory={onNoKnownHistorySection}
                            onSectionExpand={onExpandCollapseClick}
                            onAddCustom={onAddCustomTag}
                            onEnableChange={onEnableChange}
                            onStatusChange={onChangeStatus}
                            onMedicationChange={onChangeMedication}
                            onSinceChange={onSinceChange}
                            onRelationshipChange={onRelationshipChange}
                            onNoteChange={onChangeInputNote}
                            surgicalDateType={surgicalDateType}
                            surgicalDate={surgicalDate}
                            onSurgicalDateTypeChange={onSurgicalDateTypeChange}
                            onSurgicalDateChange={onSurgicalDateChange}
                            onSurgicalYearChange={onSurgicalYearChange}
                            moduleCaptureSlot={
                                isVoiceRxModuleEnabled && voiceCaptureOpen ? (
                                    <div className={voiceModuleStyles.moduleSlot}>
                                        <VoiceRxModuleCapture
                                            moduleName="Medical History"
                                            moduleApiName="medical_history"
                                            previousContext={medicalHistoryPreviousContext}
                                            dummyDigitisedData={[]}
                                            onCancel={() => setVoiceCaptureOpen(false)}
                                            onComplete={handleVoiceCaptureComplete}
                                        />
                                    </div>
                                ) : null
                            }
                            additionalHistoryVoiceButton={
                                isVoiceRxModuleEnabled ? (
                                    <span className="d-inline-flex" onClick={(e) => e.stopPropagation()}>
                                        <VoiceRxModuleButton
                                            active={additionalHistoryVoiceCaptureOpen}
                                            dictationTargetId="medical-history-additional"
                                            label="Start Additional History voice input"
                                            onClick={openAdditionalHistoryVoiceCapture}
                                        />
                                    </span>
                                ) : null
                            }
                            additionalHistoryVoiceCaptureSlot={
                                isVoiceRxModuleEnabled && additionalHistoryVoiceCaptureOpen ? (
                                    <div className={voiceModuleStyles.moduleSlot}>
                                        <VoiceRxModuleCapture
                                            mode="transcribe"
                                            moduleName="Additional History"
                                            onCancel={() => setAdditionalHistoryVoiceCaptureOpen(false)}
                                            onComplete={handleAdditionalHistoryVoiceCaptureComplete}
                                        />
                                    </div>
                                ) : null
                            }
                            noteVoiceButton={
                                isVoiceRxModuleEnabled ? (
                                    /* No ms-2: .fieldLabel is a flex row and
                                       supplies the gap. */
                                    <span className="d-inline-flex">
                                        <VoiceRxModuleButton
                                            active={selectedHistoryNoteVoiceCaptureOpen}
                                            dictationTargetId="medical-history-note"
                                            label="Start Medical History note voice input"
                                            onClick={openSelectedHistoryNoteVoiceCapture}
                                        />
                                    </span>
                                ) : null
                            }
                            noteVoiceCaptureSlot={
                                isVoiceRxModuleEnabled && selectedHistoryNoteVoiceCaptureOpen ? (
                                    <div className={voiceModuleStyles.moduleSlot}>
                                        <VoiceRxModuleCapture
                                            mode="transcribe"
                                            moduleName="Medical History Note"
                                            hideCaptions={true}
                                            onCancel={() => setSelectedHistoryNoteVoiceCaptureOpen(false)}
                                            onComplete={handleSelectedHistoryNoteVoiceCaptureComplete}
                                        />
                                    </div>
                                ) : null
                            }
                        />
                      </div>
                    </TabPane>
                    )}
                </Tabs>
            </Card>
            {shouldShowVideo && (
                <VideoModal
                    videoLink={videoLink}
                    onCancel={() => setShowVideo(false)}
                />
            )}
            <TesseractThemeProvider colorScheme="light">
                <ConfirmDialog
                    open={showUnsavedConfirm}
                    onOpenChange={setShowUnsavedConfirm}
                    title="You may lose your changes"
                    withDescription={false}
                    callout="You have unsaved changes that will be lost. Would you like to save your medical history changes before leaving?"
                    calloutTone="warning"
                    calloutCustomIcon={<TPIcon name="danger" size={24} variant="bulk" />}
                    calloutLines={5}
                    primaryLabel="Save and Close"
                    onPrimary={async () => {
                        setShowUnsavedConfirm(false);
                        await onSaveClicked();
                        handleDrawerMedicalHistory();
                    }}
                    primaryTheme="primary"
                    secondaryLabel="Discard Changes"
                    onSecondary={() => {
                        setShowUnsavedConfirm(false);
                        handleDrawerMedicalHistory();
                    }}
                    secondaryTheme="error"
                />
            </TesseractThemeProvider>
        </>
    );
}

export default MedicalHistoryBox;
