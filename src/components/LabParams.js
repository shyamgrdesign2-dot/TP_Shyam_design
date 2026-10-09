import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, DatePicker, Input, Popover, Tooltip, message, Spin, Select, Radio } from 'antd';
import { EllipsisOutlined, DeleteOutlined, CaretRightOutlined, CaretDownOutlined, SettingOutlined } from "@ant-design/icons";
import axios from 'axios';
import moment from "moment";
import { jwtDecode } from 'jwt-decode';
import { LAB_PARAMS_RESULTS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from '../utils/constants';
import {
  extractUnitsFromValue,
  valueWithoutUnitsForApi,
  normalizeLabResultsResponse,
  filterLabResultsByDoctor,
  buildLabResultsSavePayload,
  getLabResultsOwnerDoctorId,
  isLabResultsReceptionistSession,
  mergeLabResultRowMeta,
} from '../utils/labResultsUtils';
import { DEFAULT_TESTS_DATA } from '../utils/labParamsConstants';
import { getCustomInvestigations, CUSTOM_INVESTIGATIONS_CHANGED_EVENT } from '../api/services/ApiCustomInvestigation';
import InlineInvestigationPanel from './InlineInvestigationPanel';
import { InvestigationSettingsPanel } from '../pages/lims/InvestigationSettingsPage';
import { isMobile } from "react-device-detect";
import api from "../api/services/axiosService";
import { env } from "../EnvironmentConfig";
import CheckableTag from 'antd/es/tag/CheckableTag';
import CommonModal from '../common/CommonModal';
import "./LabParamsCustomInvestigation.css";

import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import _ from 'lodash';
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  edit: editIcon,
} = ASSETS.images;

const REMARKS_TEST_NAME = "Remarks";

function applyCustomRowsToInputValues(prev, customRows, targetDates) {
  const next = { ...prev };

  customRows.forEach((row) => {
    const report = { ...(next[row.reportName] || {}) };
    const test = { ...(report[row.testName] || {}) };
    targetDates.forEach((date) => {
      if (!test[date]) {
        test[date] = { ...row, date };
      }
    });
    report[row.testName] = test;
    if (!report[REMARKS_TEST_NAME]) {
      report[REMARKS_TEST_NAME] = {};
      targetDates.forEach((date) => {
        report[REMARKS_TEST_NAME][date] = {
          reportName: row.reportName,
          testName: REMARKS_TEST_NAME,
          value: "",
          units: "",
          arrowDirection: "",
          refRange: "",
          date,
        };
      });
    }
    next[row.reportName] = report;
  });

  Object.keys(next).forEach((reportName) => {
    const report = { ...next[reportName] };
    let mutated = false;
    Object.keys(report).forEach((testName) => {
      if (testName === REMARKS_TEST_NAME) return;
      const sample = Object.values(report[testName] || {})[0];
      if (
        sample?.isCustom &&
        !customRows.some((row) => row.reportName === reportName && row.testName === testName)
      ) {
        delete report[testName];
        mutated = true;
      }
    });
    const remaining = Object.keys(report).filter((testName) => testName !== REMARKS_TEST_NAME);
    const isCatalogReport = DEFAULT_TESTS_DATA.some((row) => row.reportName === reportName);
    if (remaining.length === 0 && !isCatalogReport) {
      delete next[reportName];
    } else if (mutated) {
      next[reportName] = report;
    }
  });

  return next;
}

function filterInputValuesBySearch(values, searchQuery) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return values;
  const filtered = {};
  Object.keys(values).forEach((reportName) => {
    const tests = values[reportName] || {};
    if (reportName.toLowerCase().includes(q)) {
      filtered[reportName] = tests;
      return;
    }
    const matchingTests = {};
    Object.keys(tests).forEach((testName) => {
      if (testName === REMARKS_TEST_NAME) return;
      if (testName.toLowerCase().includes(q)) {
        matchingTests[testName] = tests[testName];
      }
    });
    if (Object.keys(matchingTests).length > 0) {
      if (tests[REMARKS_TEST_NAME]) {
        matchingTests[REMARKS_TEST_NAME] = tests[REMARKS_TEST_NAME];
      }
      filtered[reportName] = matchingTests;
    }
  });
  return filtered;
}

const LabResultsTable = ({
    handleAddLabParamsDrawer,
    patient_unique_id,
    onSave,
    onSaveSuccess,
    isBackModalOpen,
    showHideBackModal,
    patientGender,
    prefillLabResults = [],
    onResultsChange,
    /** When false (e.g. consult flow), prefill is never applied. Only voice/snap/ambient/smart should pass true. */
    applyRawPrefill = false,
    /** Receptionist LIMS: last-visit doctor's um_id — filter + save against this doctor. */
    attendingDoctorUmId,
    /** Explicit receptionist flag from LIMS (?receptionist); avoids falling through to doctor path when lastVisitDoctor um_id is set. */
    isReceptionistSession,
    /** LIMS header Save proxies the inner button; notify when settings replaces that header. */
    onInvestigationSettingsChange,
    /** When set (LIMS drawer), settings open state is owned by the parent header. */
    investigationSettingsOpen: investigationSettingsOpenProp,
}) => {

    const [token, setToken] = useState(null);
    const searchRef = useRef(null);
    const [tokenData, setTokenData] = useState(null);
    const [dates, setDates] = useState([]);
    const [existingResults, setExistingResults] = useState([]);
    const [filledData, setFilledData] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [expandedReports, setExpandedReports] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [labParamsResults, setLabParamsResults] = useState([]);
    const [isRemarksVisible, setIsRemarksVisible] = useState({});
    const [testCounts, setTestCounts] = useState({});
    const [showEditTooltip, setShowEditTooltip] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef(null);
    const inputRef = useRef([]);
    const scrollRefs = useRef([]);
    const remarksRef = useRef(null);
    const scrollRef = useRef(null);
    const [defaultTestData, setDefaultTestData] = useState([]);
    const [customGroups, setCustomGroups] = useState([]);
    const [isCreateInvestigationOpen, setIsCreateInvestigationOpen] = useState(false);
    const [internalInvestigationSettingsOpen, setInternalInvestigationSettingsOpen] = useState(false);
    const isSettingsControlled = investigationSettingsOpenProp !== undefined;
    const isInvestigationSettingsOpen = isSettingsControlled
      ? investigationSettingsOpenProp
      : internalInvestigationSettingsOpen;
    const setInvestigationSettingsOpen = useCallback(
      (next) => {
        if (!isSettingsControlled) setInternalInvestigationSettingsOpen(next);
        onInvestigationSettingsChange?.(next);
      },
      [isSettingsControlled, onInvestigationSettingsChange]
    );

    useEffect(() => {
      setDefaultTestData(JSON.parse(JSON.stringify(DEFAULT_TESTS_DATA)));
    }, [])

    // Hospital-scoped custom investigations (PRD: Custom Investigation Groups/Investigations)
    // merge into the same master rows LabParams already renders from. Also
    // re-fetched on window focus so investigations created via the full
    // management page (src/pages/lims/InvestigationSettingsPage.jsx, reachable
    // separately from LIMS) show up here without a manual reload. hm_id is
    // derived server-side from the auth token — GET /custom-report-groups takes
    // no params. Inactive (isActive: false) items still appear here so they can
    // be used in result entry; settings badges/actions use the API flag.
    const fetchAndMergeCustomInvestigations = useCallback(async () => {
      if (!tokenData) return;
      try {
        const groups = await getCustomInvestigations();
        setCustomGroups(groups);
        const rows = groups.flatMap((group) =>
          (group.investigations || []).map((inv) => ({
            reportName: group.name,
            testName: inv.name,
            value: "",
            units: inv.unit || "",
            arrowDirection: "",
            resultType: inv.resultType || "numeric",
            dropdownOptions: inv.dropdownOptions || null,
            isCustom: true,
            customTestId: inv.id,
            refRange: {
              isConditional: (inv.referenceRanges || []).some((r) => r.gender && r.gender !== "all"),
              ranges: inv.referenceRanges || [],
            },
          }))
        );
        // Replace only the previously-merged custom rows so refetching never duplicates.
        setDefaultTestData((prev) => [...prev.filter((r) => !r.isCustom), ...rows]);
        const targetDates = dates.length > 0 ? dates : [new Date().toISOString().split("T")[0]];
        setInputValues((prev) => applyCustomRowsToInputValues(prev, rows, targetDates));
      } catch (error) {
        // Custom groups are additive. A missing/failed endpoint must not take down
        // catalog lab-result entry (DEFAULT_TESTS_DATA + existing results).
        console.error("Failed to load custom investigations", error);
      }
    }, [tokenData, dates]);

    useEffect(() => {
      fetchAndMergeCustomInvestigations();
    }, [fetchAndMergeCustomInvestigations]);

    useEffect(() => {
      window.addEventListener("focus", fetchAndMergeCustomInvestigations);
      window.addEventListener(CUSTOM_INVESTIGATIONS_CHANGED_EVENT, fetchAndMergeCustomInvestigations);
      return () => {
        window.removeEventListener("focus", fetchAndMergeCustomInvestigations);
        window.removeEventListener(CUSTOM_INVESTIGATIONS_CHANGED_EVENT, fetchAndMergeCustomInvestigations);
      };
    }, [fetchAndMergeCustomInvestigations]);

    const currentDate = new Date().toISOString().split("T")[0];
    const dateFormat = 'YYYY-MM-DD';
    const showDateFormat = 'DD MMM, YYYY';

    const refRangeCache = {}; // Cache to store refRange data by reportName

    // Throttled searchLabParams to avoid rapid API calls
    const throttledSearchLabParams = _.throttle(async (reportName) => {
        const labParamsData = await searchLabParams(reportName);
        // Store fetched data in cache under the reportName key
        refRangeCache[reportName] = labParamsData;
        return labParamsData;
    }, 2000); // Adjust throttle duration as needed

    //states for Remarks Functionality 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shouldShowDeletePopup, setShouldShowDeletePopup] = useState(null);
    const [modalContent, setModalContent] = useState("");
    const [activeReport, setActiveReport] = useState(null);
    const [activeTest, setActiveTest] = useState(null);
    const [activeDate, setActiveDate] = useState(null);

    const baseUrl = { customBaseUrl: env.lab_params_api_url  };
    const labParamsBaseUrl = env.lab_params_api_url;

    // Helper function to group data by reportName
    const groupByReportName = (data) => {
        const grouped = {};
        data.forEach((result) => {
            result.inputs.forEach((input) => {
                if (!grouped[input.reportName]) {
                    grouped[input.reportName] = {};
                }
                if (!grouped[input.reportName][input.testName]) {
                    grouped[input.reportName][input.testName] = {};
                }
                grouped[input.reportName][input.testName][result.date] = input;
            });
        });
        return grouped;
    };

    useEffect(() => {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        if (token) {
            try {
                setToken(token);
                const decoded = jwtDecode(token);
                setTokenData(decoded.result);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {

      setLoading(true)
      // Simulate a delay (2 seconds)
      const timer = setTimeout(() => {
        setLoading(false); // Hide the loader after 2 seconds
      }, 1000);
    
      // Cleanup the timer when the component is unmounted
      return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const toggleReport = (reportName) => {
        setExpandedReports((prev) => ({
            ...prev,
            [reportName]: !prev[reportName],
        }));
    };

    const handleClickOutside = (event) => {
      if (!remarksRef?.current?.contains(event.target)) {
        setShowEditTooltip(null);
      }
    };

    const searchLabParams = async (searchQuery) => {
        try {
            // const cleanedToken = token.replace(/['"]+/g, '');
            const cleanedToken = token?.startsWith('"') && token?.endsWith('"')
            ? token.slice(1, -1)
            : token;
            const response = await axios.get(`${labParamsBaseUrl}/api/v1/lab-parameters?search=${searchQuery}`, {
                headers: {
                    Authorization: `Bearer ${cleanedToken}`,
                },
            });
    
            const labParamsData = response.data;
    
            // If searchQuery is present, expand all the report names
            if (searchQuery) {
                const expanded = labParamsData.reduce((acc, report) => {
                    acc[report.reportName] = true; // Expand all reports
                    return acc;
                }, {});
                setExpandedReports(expanded); // Set expanded state for all reports
            } else {
                setExpandedReports({}); // Collapse all if no search query
            }
    
            return labParamsData;
        } catch (error) {
            console.error("Error fetching lab params:", error);
            return [];
        }
    };

    const getLabParams = async () => {
        try {
            const cleanedToken = token.replace(/['"]+/g, '');
            const patientId = patient_unique_id;
            const response = await axios.get(`${labParamsBaseUrl}/api/v1/lab-parameters/results/${patientId}`, {
                headers: {
                    'Authorization': `Bearer ${cleanedToken}`,
                },
            });
            const allResults = normalizeLabResultsResponse(response);
            const ownerDoctorId = getLabResultsOwnerDoctorId(tokenData?.user_id, attendingDoctorUmId);
            // Edit drawer must only hydrate the owning doctor's rows so save cannot re-post other doctors' data.
            setExistingResults(filterLabResultsByDoctor(allResults, ownerDoctorId));
        } catch (error) {
            console.error("Error fetching lab params:", error);
        }
    };

    useEffect(() => {
        if (token && tokenData) {
            getLabParams();
        }
    }, [token, tokenData?.user_id, patient_unique_id, attendingDoctorUmId]);

    const onSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    useEffect(() => {
        const fetchLabParams = async () => {
             if (searchQuery === '') {
                setLabParamsResults([]);
                setExpandedReports({});
            } else {
                const labParamsResults = await searchLabParams(searchQuery);
                setLabParamsResults(labParamsResults);
            }
        };
        fetchLabParams(); 
    }, [searchQuery]);
    
    useEffect(() => {
        const timeOutId = setTimeout(async () => {
            const updatedResults = mergeSearchResults(existingResults, labParamsResults, searchQuery);
    
            // Sort newly added data first when no search query
            if (!searchQuery) {
                const sortedResults = updatedResults.sort((a, b) => new Date(b.date) - new Date(a.date));
                const groupedData = groupByReportName(sortedResults);
                setInputValues(groupedData);
            } else {
                const groupedData = groupByReportName(updatedResults);
                setInputValues(groupedData);
            }
        }, 1000);
    
        return () => clearTimeout(timeOutId);
    }, [labParamsResults, existingResults, searchQuery, dates, defaultTestData]);

    // Custom investigations (and defaultTestData generally) never come back from
    // searchLabParams's backend call, so they were never part of the auto-expand
    // logic above — searching for one by name would never reveal its group. Layer
    // a case-insensitive local match on top, merging (not replacing) whatever the
    // backend-driven effect set, and running after it via the labParamsResults
    // dependency so this can't be clobbered by that effect's later resolution.
    useEffect(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return;
        const localMatchNames = defaultTestData
          .filter((row) =>
            row.testName?.toLowerCase().includes(q) || row.reportName?.toLowerCase().includes(q)
          )
          .map((row) => row.reportName);
        if (localMatchNames.length === 0) return;
        setExpandedReports((prev) => {
          const next = { ...prev };
          localMatchNames.forEach((reportName) => { next[reportName] = true; });
          return next;
        });
    }, [searchQuery, labParamsResults, defaultTestData]);

    const combineData = (currentFilledData, filledData) => {
        const combinedResults = [...filledData];
      
        currentFilledData.forEach((currentEntry) => {
            // Check if the date already exists in the filledData
            const filledEntry = combinedResults.find((entry) => entry.date === currentEntry.date);
    
            if (filledEntry) {
                // If date exists, loop through the inputs of currentFilledData
                currentEntry.inputs.forEach((currentInput) => {
                    const matchingInput = filledEntry.inputs.find(
                        (filledInput) =>
                            filledInput.reportName === currentInput.reportName &&
                            filledInput.testName === currentInput.testName
                    );
    
                    if (matchingInput) {
                        // Update input if match is found
                        matchingInput.value = currentInput.value;
                        matchingInput.arrowDirection = currentInput.arrowDirection;
                        matchingInput.units = currentInput.units;

                        // Mark the input as recently updated by adding a `recentlyUpdated` flag
                        matchingInput.recentlyUpdated = true;
                    } else {
                        // If no match, add the new input and mark it as recently added
                        filledEntry.inputs.push({
                            ...currentInput,
                            recentlyUpdated: true
                        });
                        }
                });
            } else {
                // If date doesn't exist, push the new entry and mark it as recently added
                combinedResults.push({
                    ...currentEntry,
                    inputs: currentEntry.inputs.map(input => ({
                        ...input,
                        recentlyUpdated: true
                    }))
                });
                }
        });
    
        // Sort results by recently updated entries first, then by date
        combinedResults.forEach(entry => {
            entry.inputs.sort((a, b) => {
                if (a.recentlyUpdated && !b.recentlyUpdated) return -1;
                if (!a.recentlyUpdated && b.recentlyUpdated) return 1;
                return 0;
            });
        });
        
        return combinedResults;
    };

    const addRemarksToUniqueReportNames = (inputs) => {
        const uniqueReportNames = [...new Set(inputs.map(input => input.reportName))];
        uniqueReportNames.forEach(reportName => {
            const hasRemarks = inputs.some(input => input.testName === "Remarks" && input.reportName === reportName);
            if (!hasRemarks) {
                inputs.push({
                    reportName: reportName,
                    testName: "Remarks",
                    value: "",  // Default value for Remarks
                    units: "",
                    arrowDirection: "",
                    refRange: "",
                    recentlyUpdated: true  // Mark as newly added
                });
            }
        });
    };

    const sanitizeDateValue = (value) => {
        if (!value) return null;
        const parsed = moment(value);
        if (parsed.isValid()) {
            return parsed.format("YYYY-MM-DD");
        }
        return null;
    };

    // Only used when applyRawPrefill is true (voice/snap/ambient/smart). Uses labResultsUtils for parsing. Consult flow never runs this.
    const mapLabResultToInput = useCallback(
        (result = {}) => {
            const apiMatchedTestName = (result?.testName || result?.testname || result?.name || "").trim();
            if (!apiMatchedTestName) {
                return null;
            }
            const rawValue = result?.value !== undefined ? String(result.value).trim() : "";
            if (!rawValue) {
                return null;
            }
            const reportName = (result?.reportName || result?.testName || result?.testname || result?.name || "").trim();
            if (!reportName) {
                return null;
            }
            const derivedUnits = extractUnitsFromValue(rawValue);
            const normalizedValue = valueWithoutUnitsForApi(rawValue);
            return {
                reportName: reportName,
                testName: apiMatchedTestName,
                value: normalizedValue,
                units: result?.units || derivedUnits || "",
                arrowDirection: "",
                refRange: result?.refRange || "",
                recentlyUpdated: true,
            };
        },
        []
    );

    const applyPrefillLabResults = useCallback(
        (labResultsArray = []) => {
            if (!Array.isArray(labResultsArray) || labResultsArray.length === 0) {
                return;
            }
            const seenKeys = new Set();
            const validResults = [];
            labResultsArray.forEach((result = {}) => {
                const reportName = (result?.reportName || result?.testname || result?.testName || result?.name || "").trim();
                const testName = (result?.testName || result?.testname || result?.name || "").trim();
                if (!reportName || !testName) {
                    return;
                }
                const dateKey = sanitizeDateValue(result?.date) || currentDate;
                const uniqueKey = `${reportName}|${testName}|${dateKey}`;
                if (seenKeys.has(uniqueKey)) {
                    return;
                }
                seenKeys.add(uniqueKey);
                validResults.push({ ...result, reportName, testName });
            });
            setDates((prevDates) => {
                const nextDates = new Set(prevDates);
                validResults.forEach((result = {}) => {
                    const normalizedDate = sanitizeDateValue(result?.date) || currentDate;
                    nextDates.add(normalizedDate);
                });
                return Array.from(nextDates).sort((a, b) => new Date(b) - new Date(a));
            });
            setInputValues((prev) => {
                const updated = { ...prev };
                validResults.forEach((result = {}) => {
                    const mappedInput = mapLabResultToInput(result);
                    if (!mappedInput || !mappedInput.reportName?.trim()) {
                        return;
                    }
                    const dateKey = sanitizeDateValue(result?.date) || currentDate;
                    const reportName = mappedInput.reportName.trim();
                    const testName = mappedInput.testName.trim();
                    if (!updated[reportName]) {
                        updated[reportName] = {};
                    }
                    if (!updated[reportName][testName]) {
                        updated[reportName][testName] = {};
                    }
                    updated[reportName][testName][dateKey] = {
                        ...mappedInput,
                        reportName: reportName,
                    };
                });
                return updated;
            });
        },
        [mapLabResultToInput, currentDate]
    );

    // Function to handle the modal opening
    const handleOpenModal = (reportName, testName, date) => {
        setActiveReport(reportName);
        setActiveTest(testName);
        setActiveDate(date);
        setModalContent(inputValues[reportName][testName][date]?.value || "");
        setIsModalOpen(true);
    };

    // Function to handle modal closing
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setActiveReport(null);
        setActiveTest(null);
        setActiveDate(null);
        setModalContent("");
    };

    // Function to handle saving remarks
    const handleSaveRemarks = () => {
        const updatedValues = { ...inputValues };
        if (!updatedValues[activeReport]) updatedValues[activeReport] = {};
        if (!updatedValues[activeReport][activeTest]) updatedValues[activeReport][activeTest] = {};
        if (!updatedValues[activeReport][activeTest][activeDate]) {
            updatedValues[activeReport][activeTest][activeDate] = {};
        }

        updatedValues[activeReport][activeTest][activeDate].value = modalContent;

        // Update input values
        setInputValues(updatedValues);

        // Close modal
        handleCloseModal();
    };

    // resultType is only meaningful for custom investigations; existing/default
    // rows have no resultType and keep today's numeric behaviour (PRD §7: only
    // numeric results ever get Low/Normal/High).
    const calculateArrowDirection = (value, refRange, gender, resultType, patientAge) => {
        if (resultType && resultType !== "numeric") {
            return "";
        }
        if (!value || isNaN(parseFloat(value))) {
            return "";
        }

        let selectedRange;
        const ranges = refRange?.ranges;
        const age = patientAge != null && patientAge !== "" ? Number(patientAge) : undefined;
        const isAgeInRange = (range) => {
            const ageFrom = range?.ageFrom != null && range.ageFrom !== "" ? Number(range.ageFrom) : undefined;
            const ageTo = range?.ageTo != null && range.ageTo !== "" ? Number(range.ageTo) : undefined;
            if (ageFrom == null && ageTo == null) return true; // no age constraint on this range
            if (age == null) return true; // patient age unknown — don't exclude on age
            if (ageFrom != null && age < ageFrom) return false;
            if (ageTo != null && age > ageTo) return false;
            return true;
        };
        const byGender = (range) => range?.gender?.toLowerCase() === gender?.toLowerCase();

        // Check if refRange has conditional ranges
        if (refRange?.gender?.toLowerCase() === "all") {
          selectedRange = Array.isArray(ranges) ? ranges[0] : undefined;
        } else if (Array.isArray(ranges)) {
          selectedRange =
            ranges.find((range) => byGender(range) && isAgeInRange(range)) ??
            ranges.find((range) => byGender(range)) ??
            ranges[0];
        }

        if (selectedRange) {
            const numericValue = parseFloat(value);
            const min = parseFloat(selectedRange.min);
            const max = parseFloat(selectedRange.max);

            if (numericValue > max) {
                return "up";
            } else if (numericValue < min) {
                return "down";
            }
        }
    
        return ""; // No arrow if within range
    };

    const mergeSearchResults = (existingResults, labParamsResults, searchQuery) => {
        const tempResults = [];
        const q = (searchQuery || "").trim().toLowerCase();
        const matchingLocalRows = q
          ? defaultTestData.filter(
              (row) =>
                row.testName?.toLowerCase().includes(q) ||
                row.reportName?.toLowerCase().includes(q)
            )
          : [];
        const searchRows = q
          ? [
              ...labParamsResults,
              ...matchingLocalRows.filter(
                (local) =>
                  !labParamsResults.some(
                    (lab) =>
                      lab.testName === local.testName && lab.reportName === local.reportName
                  )
              ),
            ]
          : labParamsResults;
    
        const currentFilledData = assemblePayload(inputValues);
        const data = combineData(currentFilledData, filledData);
    
        setFilledData(data);
        existingResults = data?.length > 0 ? data : existingResults; // Use the combined data

        // Case 1: No existing results
        if (existingResults.length === 0) {
          if (searchRows.length === 0) {

              // No labParamsResults: create entries for all dates using default data
              const allDates = dates.length > 0 ? dates : [new Date().toISOString().split('T')[0]];
              
              allDates.forEach((date) => {
                  const newEntry = {
                      date,
                      inputs: [...defaultTestData],
                  };

                  // Add 'Remarks' to each entry
                  addRemarksToUniqueReportNames(newEntry.inputs);
                  tempResults.push(newEntry);
              });

          } else {
              // LabParamsResults exist: create entries for all dates
              const allDates = dates.length > 0 ? dates : [new Date().toISOString().split('T')[0]];
              
              allDates.forEach((date) => {
                  const newEntry = {
                      date,
                      inputs: searchRows.map((lab) => ({
                          reportName: lab.reportName || "",
                          testName: lab.testName || "",
                          value: "",
                          units: lab.units || "",
                          arrowDirection: "",
                          refRange: lab.refRange || "",
                          resultType: lab.resultType,
                          dropdownOptions: lab.dropdownOptions,
                          isCustom: lab.isCustom,
                          customTestId: lab.customTestId,
                      })),
                  };

                  // Add 'Remarks' to each entry
                  addRemarksToUniqueReportNames(newEntry.inputs);
                  tempResults.push(newEntry);
              });
          }
          return tempResults;
        }

    
        // Case 2: Existing results present
        if (existingResults.length > 0) {

          // Iterate over all existing results
          if (searchRows.length > 0) {
              dates.forEach((currentDate) => {
                  const existingEntry = existingResults.find((entry) => entry.date === currentDate);

                  const newEntry = {
                      date: currentDate, // Use the current date from the loop
                      inputs: searchRows.map((lab) => {
                          const existingInput = existingEntry?.inputs.find(
                              (input) =>
                                  input.testName === lab.testName &&
                                  input.reportName === lab.reportName
                          );

                          return {
                              reportName: lab.reportName || "",
                              testName: lab.testName || "",
                              value: existingInput ? existingInput.value : "", // Retain value if exists
                              units: lab.units || "",
                              arrowDirection: existingInput ? existingInput.arrowDirection : "",
                              refRange: lab.refRange || "",
                              resultType: lab.resultType,
                              dropdownOptions: lab.dropdownOptions,
                              isCustom: lab.isCustom,
                              customTestId: lab.customTestId,
                          };
                      }),
                  };

                  // Call function to add 'Remarks'
                  addRemarksToUniqueReportNames(newEntry.inputs);

                  tempResults.push(newEntry);
              });
              return tempResults;
          }

          // When searching with no local/backend hits, keep the full list in
          // state (the listing still filters via visibleInputValues). When not
          // searching, append any missing catalog/custom rows.
          if (defaultTestData?.length > 0 && !q) {
              dates.forEach((currentDate) => {
                  const existingEntry = existingResults.find((entry) => entry.date === currentDate);

                  const newEntry = {
                      date: currentDate,
                      inputs: existingEntry ? [...existingEntry.inputs] : [],
                  };

                  defaultTestData.forEach((lab) => {
                      const existingInput = newEntry.inputs.find(
                          (input) =>
                              input.testName === lab.testName &&
                              input.reportName === lab.reportName
                      );

                      if (!existingInput) {
                          newEntry.inputs.push({
                              reportName: lab.reportName || "",
                              testName: lab.testName || "",
                              value: "",
                              units: lab.units || "",
                              arrowDirection: "",
                              refRange: lab.refRange || "",
                              resultType: lab.resultType,
                              dropdownOptions: lab.dropdownOptions,
                              isCustom: lab.isCustom,
                              customTestId: lab.customTestId,
                              recentlyUpdated: true, // Mark predefined data as newly added
                          });
                      }
                  });

                  // Call function to add 'Remarks'
                  addRemarksToUniqueReportNames(newEntry.inputs);

                  tempResults.push(newEntry);
              });

              return tempResults;
          }
        }

        return existingResults; // Fallback: return existing results if nothing changes
    };

    // Function to get the unique count of testNames for each reportName
    const getUniqueTestNameCount = (inputValues) => {
        const reportCounts = {};

        Object.keys(inputValues).forEach((reportName) => {
            const testNameSet = new Set();

            Object.keys(inputValues[reportName]).forEach((testName) => {
                const hasValue = Object.keys(inputValues[reportName][testName]).some((date) => {
                    return inputValues[reportName][testName][date]?.value;
                });

                if (hasValue) {
                    testNameSet.add(testName);
                }
            });

            if (testNameSet.size > 0) {
                reportCounts[reportName] = testNameSet.size;
            }
        });

        return reportCounts;
    };

    // Update the state when inputValues change
    useEffect(() => {
        const counts = getUniqueTestNameCount(inputValues);
        setTestCounts(counts);
    }, [inputValues]);
    
    useEffect(() => {
        if (existingResults.length === 0) {
            setDates([currentDate]);
        } else {
            const uniqueDates = [...new Set(existingResults.map((result) => result.date))];
            setDates(uniqueDates);
        }
    }, [existingResults]);

    // Only apply raw prefill (value/units parsing) when opened from voice/snap/ambient/smart. Consult flow keeps applyRawPrefill false so this never runs.
    useEffect(() => {
        if (applyRawPrefill && prefillLabResults?.length > 0) {
            applyPrefillLabResults(prefillLabResults);
        }
    }, [applyRawPrefill, prefillLabResults, applyPrefillLabResults]);

  function replaceDate(inputValues, oldDate, newDate) {
    const updatedValues = { ...inputValues };

    Object.keys(updatedValues).forEach((reportName) => {
      Object.keys(updatedValues[reportName]).forEach((testName) => {
        const testData = { ...updatedValues[reportName][testName] };

        if (testData.hasOwnProperty(oldDate)) {
          const reorderedData = {};

          Object.keys(testData).forEach((key) => {
            if (key === oldDate) {
              // Replace the old date key with the new date key
              reorderedData[newDate] = testData[oldDate];
            } else {
              // Retain other keys and their values
              reorderedData[key] = testData[key];
            }
          });
          // Update the test data with the reordered object
          updatedValues[reportName][testName] = reorderedData;
        } else {
          console.warn(`Date "${oldDate}" not found in the test data.`);
        }
      });
    });
    return updatedValues;
  }

    function deleteDateByIndex(inputValues, date) {
      const updatedValues = { ...inputValues };
      Object.keys(updatedValues).forEach((reportName) => {
        Object.keys(updatedValues[reportName]).forEach((testName) => {
          const testData = updatedValues[reportName][testName];
            delete testData[date];
        });
      });
      return updatedValues;
    }

    const handleDateChange = (newDate, index) => {
      setDates((prevDates) => {
        const updatedDates = [...prevDates];
        updatedDates[index] = newDate;
        return updatedDates;
      });
      setInputValues((prev) => {
        const updatedData = replaceDate(prev, dates[index], newDate);
        return updatedData;
      });
    };

    const handleDeleteDate = (dateToDelete) => {
        setDates((prevDates) => prevDates.filter((date) => date !== dateToDelete));
        const updatedData = deleteDateByIndex(inputValues, dateToDelete);
        setInputValues(updatedData);
        setShouldShowDeletePopup(null);
    };

    const disabledDate = (current) => {
        return current && current >= moment().add(1, 'days').startOf('day');
    };

    const handleInputChange = (reportName, testName, date, value) => {
      setInputValues((prev) => {
          const updatedData = { ...prev };
  
          if (!updatedData[reportName]) {
              updatedData[reportName] = {};
          }
  
          if (!updatedData[reportName][testName]) {
              updatedData[reportName][testName] = {};
          }
  
          if (!updatedData[reportName][testName][date]) {
              updatedData[reportName][testName][date] = {
                  reportName,
                  testName,
                  value: "",
                  arrowDirection: "",
                  refRange: "",
                  units: getUnitForTest(reportName, testName),
                  resultType: getResultTypeForTest(reportName, testName),
                  dropdownOptions: getDropdownOptionsForTest(reportName, testName),
                  ...getCustomTestIdForTest(reportName, testName),
              };
          }

          // Update value and calculate arrow direction using existing refRange if available
          const existingRefRange = updatedData[reportName][testName][date].refRange;
          const gender = patientGender || "Male"; // Assuming `patientGender` is available globally or passed in
          const resultType = updatedData[reportName][testName][date].resultType;

          updatedData[reportName][testName][date].value = value;
          updatedData[reportName][testName][date].arrowDirection = calculateArrowDirection(value, existingRefRange, gender, resultType);
  
          // Fetch refRange if not already available
          if (!existingRefRange) {
              fetchRefRange(reportName, testName, date);
          }
  
          return updatedData;
      });
    };
  
    // Fetch refRange and update state if refRange is missing
    const fetchRefRange = async (reportName, testName, date) => {
        const labParamsData = await throttledSearchLabParams(reportName);
    
        const matchedParam = labParamsData.find((param) => param.testName === testName);
        const refRange = matchedParam ? matchedParam.refRange : "";
    
        setInputValues((prev) => {
            const updatedData = { ...prev };
            if (updatedData[reportName] && updatedData[reportName][testName] && updatedData[reportName][testName][date]) {
                updatedData[reportName][testName][date].refRange = refRange;
                updatedData[reportName][testName][date].arrowDirection = calculateArrowDirection(
                    updatedData[reportName][testName][date].value,
                    refRange,
                    patientGender || "Male",
                    updatedData[reportName][testName][date].resultType
                );
            }
            return updatedData;
        });
    };
    
    const getUnitForTest = (reportName, testName) => {
        for (const date of dates) {
            const units = inputValues[reportName]?.[testName]?.[date]?.units;
            if (units) {
                return units;
            }
        }
        return "";
    };

    const getResultTypeForTest = (reportName, testName) => {
        for (const date of dates) {
            const resultType = inputValues[reportName]?.[testName]?.[date]?.resultType;
            if (resultType) {
                return resultType;
            }
        }
        // Fall back to the merged master list — a brand-new cell (first edit for
        // this test/date) has no inputValues entry yet to read resultType from.
        // Match on testName alone: search-matched rows set reportName to the
        // test's own name, not its real group name (see the info-icon fix above).
        const defaultRow = defaultTestData.find((row) => row.testName === testName);
        return defaultRow?.resultType || "numeric";
    };

    const getCustomTestIdForTest = (reportName, testName) => {
        for (const date of dates) {
            const cell = inputValues[reportName]?.[testName]?.[date];
            if (cell?.isCustom) {
                return { isCustom: true, customTestId: cell.customTestId };
            }
        }
        return { isCustom: false, customTestId: undefined };
    };

    const getDropdownOptionsForTest = (reportName, testName) => {
        for (const date of dates) {
            const options = inputValues[reportName]?.[testName]?.[date]?.dropdownOptions;
            if (options) {
                return options;
            }
        }
        const defaultRow = defaultTestData.find((row) => row.testName === testName);
        return defaultRow?.dropdownOptions || null;
    };

    const assemblePayload = () => {
        const results = dates.map((date) => {
                const inputs = Object.keys(inputValues)
                    .flatMap((reportName) =>
                        Object.keys(inputValues[reportName])
                            .map((testName) => {
                                const cell = inputValues[reportName][testName][date];
                                const testValue = cell?.value || "";
                                if (testValue) {
                                    return {
                                        reportName,
                                        testName: testName,
                                        value: testValue,
                                        arrowDirection: cell?.arrowDirection || "",
                                        refRange: cell?.refRange,
                                        units: cell?.units || getUnitForTest(reportName, testName),
                                        // Backend contract §10: custom-investigation results need
                                        // isCustom + customTestId so they save against the right
                                        // hospital-scoped investigation record.
                                        ...(cell?.isCustom ? { isCustom: true, customTestId: cell.customTestId } : {}),
                                    };
                                } else {
                                    return null; // Exclude tests without a value
                                }
                            })
                            .filter((input) => input !== null) // Remove null entries
                    );
    
                return inputs.length > 0 ? { date, inputs } : null; // Remove dates with no valid inputs
            })
            .filter((result) => result !== null); // Filter out null dates
    
        return results;
    };

    const handleAddNewDate = (date) => {
        if (!dates.includes(date)) {
      // Update the dates
            setDates((prevDates) => [...prevDates, date]);

      // Update the inputValues to include the new date
            setInputValues((prevInputValues) => {
                const updatedValues = JSON.parse(JSON.stringify(prevInputValues)); // Deep clone the previous state

                // Iterate over each reportName and testName to add the new date
        Object.keys(updatedValues).forEach((reportName) => {
          Object.keys(updatedValues[reportName]).forEach((testName) => {
                        if (!updatedValues[reportName][testName][date]) {
                            // Find the previous available refRange (if any)
                            const previousDates = Object.keys(updatedValues[reportName][testName]);
                            const lastDateWithRefRange = previousDates
                                .sort((a, b) => new Date(b) - new Date(a)) // Sort dates descending
                                .find((prevDate) => updatedValues[reportName][testName][prevDate]?.refRange); // Find the latest refRange
    
                            const refRangeFromPrevious = lastDateWithRefRange
                                ? updatedValues[reportName][testName][lastDateWithRefRange]?.refRange
                                : "";
    
                            updatedValues[reportName][testName][date] = {
                                reportName: reportName,
                                testName: testName,
                                value: "", // Initialize empty value
                                units: getUnitForTest(reportName, testName),
                                arrowDirection: "",
                                refRange: refRangeFromPrevious, // Use the refRange from the last available date or default
                            };
            }
          });
        });

                return updatedValues;
            });
    } else {
            message.warning('Date already exists');
    }
    };

  useEffect(() => {
    const sortedDates = dates.sort((a, b) => new Date(b) - new Date(a));
  
    setDates(sortedDates);
  
  }, [inputValues, dates]);

    const handleSave = async () => {
        const currentFilledData = assemblePayload(inputValues);
        const data = combineData(currentFilledData, filledData);

        setFilledData([]);

        const ownerDoctorId = getLabResultsOwnerDoctorId(tokenData?.user_id, attendingDoctorUmId);
        // Extra safety: never POST another doctor's dated rows if they leaked into state.
        // Also restore documentsUrls / isExternalPatient / attendingDoctorId from the GET rows.
        const ownedResults = mergeLabResultRowMeta(
          filterLabResultsByDoctor(data, ownerDoctorId).map((entry) => {
            const { doctorId, receptionistId, ...rest } = entry || {};
            return rest;
          }),
          existingResults,
        );

        const payload = buildLabResultsSavePayload({
            patientId: patient_unique_id,
            results: ownedResults,
            tokenUserId: tokenData?.user_id,
            attendingDoctorUmId: ownerDoctorId,
            isReceptionist: isLabResultsReceptionistSession(),
        });

        try {
            const response = await api.post(
              LAB_PARAMS_RESULTS,
              payload,
              baseUrl
            );
            if (response) {
                // Only for voice/ambient/snap/smart: fetch updated lab results from GET API and pass to onSave so Rx pad updates.
                // Consult flow (applyRawPrefill === false) skips this and just calls onSave() so parent refetches via getLabParams.
                if (applyRawPrefill) {
                    try {
                        const { getTodayLabResults } = await import('../utils/labResultsUtils');
                        const fetchedLabResults = await getTodayLabResults({ patient_unique_id }, false);
                        if (fetchedLabResults && fetchedLabResults.length > 0 && typeof onSave === 'function') {
                            onSave(fetchedLabResults);
                        } else {
                            if (typeof onSave === 'function') onSave();
                        }
                    } catch (err) {
                        if (typeof onSave === 'function') onSave();
                    }
                } else {
                    if (typeof onSave === 'function') onSave();
                }
                handleAddLabParamsDrawer();
            }
        } catch (error) {
            console.error("Error during save:", error);
        }
    }

    const handleScroll = (index) => {
        const scrollLeft = scrollRefs.current[index].scrollLeft;
        scrollRefs.current.forEach((ref, i) => {
            if (i !== index) {
                ref.scrollLeft = scrollLeft; // Synchronize scroll position
            }
        });
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef?.current?.offsetLeft);
        setScrollLeft(scrollRef?.current?.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const x = e.pageX - scrollRef?.current.offsetLeft;
        const walk = x - startX; // Distance moved
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseLeaveOrUp = () => {
        setIsDragging(false);
    };

    const handleDeleteDataModal = () => {
      setFilledData([]);
      setInputValues([]);
      handleAddLabParamsDrawer();
      showHideBackModal();
    }

    // Search expands matching backend groups and filters the listing to
    // matching catalog/custom rows. "no matches" means the query hits neither.
    const queryMatchesExisting = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const hits = (row) =>
        row?.testName?.toLowerCase().includes(q) || row?.reportName?.toLowerCase().includes(q);
      return defaultTestData.some(hits) || labParamsResults.some(hits);
    }, [searchQuery, defaultTestData, labParamsResults]);

    const visibleInputValues = useMemo(
      () => filterInputValuesBySearch(inputValues, searchQuery),
      [inputValues, searchQuery]
    );

    const handleCustomInvestigationCreated = (newRow) => {
      setDefaultTestData((prev) => [...prev, newRow]);
      setInputValues((prev) => {
        const updatedData = { ...prev };
        const targetDates = dates.length > 0 ? dates : [currentDate];
        targetDates.forEach((date) => {
          if (!updatedData[newRow.reportName]) updatedData[newRow.reportName] = {};
          if (!updatedData[newRow.reportName][newRow.testName]) {
            updatedData[newRow.reportName][newRow.testName] = {};
          }
          updatedData[newRow.reportName][newRow.testName][date] = { ...newRow, date };
        });
        return updatedData;
      });
      setExpandedReports((prev) => ({ ...prev, [newRow.reportName]: true }));
      setIsCreateInvestigationOpen(false);
      // Refresh customGroups so the "existing group" picker includes what was
      // just created, next time the panel opens (it was only fetched on mount
      // and window focus, so without this it'd stay stale within the session).
      fetchAndMergeCustomInvestigations();
    };

    const closeInvestigationSettings = useCallback(async () => {
      await fetchAndMergeCustomInvestigations();
      setInvestigationSettingsOpen(false);
    }, [fetchAndMergeCustomInvestigations, setInvestigationSettingsOpen]);

    const tooltipTitle = (notes, reportName, testName, date) => {
      return (
        <div
          className="d-flex justify-content-between flex-column h-100 w-100"
          ref={remarksRef}
        >
          <div className='h-80' style={{overflow:'auto'}}>{notes}</div>
          <div
            className="d-flex"
            onClick={() => handleOpenModal(reportName, testName, date)}
          >
            <img className="me-3" style={{cursor:'pointer'}} src={editIcon} alt="edit" />
            <div className="lab-params-tooltip-txt">Edit Remark</div>
          </div>
        </div>
      );
    };
    
    return (
      <div style={{background:"#fff", position: "relative", minHeight: "100vh"}}>
        {isInvestigationSettingsOpen ? (
          <InvestigationSettingsPanel onClose={closeInvestigationSettings} />
        ) : (
        <>
        <div
          className="modalCard-header h-60 align-items-center justify-content-between d-flex"
          style={{ position: "sticky", top: "0", zIndex: "5" }}
        >
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={showHideBackModal}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
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
                        onClick={handleDeleteDataModal}
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
            <div className="modal-title">Add Investigation Results</div>
          </div>
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-41 px-2 me-2 focus-none d-flex align-items-center justify-content-center"
              title="Investigation Settings"
              aria-label="Investigation Settings"
              onClick={() => setInvestigationSettingsOpen(true)}
            >
              <SettingOutlined style={{ fontSize: "18px" }} />
            </Button>
            <Button
              className="btn btn-primary3 btn-41 px-4 me-20"
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
        <div
          className="align-items-center d-flex justify-content-between px-20 py-3 gap-4"
          style={{
            position: "sticky",
            top: "3.78rem",
            backgroundColor: "white",
            zIndex: "999",
          }}
        >
          <Input
            value={searchQuery}
            ref={searchRef}
            placeholder="Search by test name or category"
            className="inputheight38"
            style={{ width: "18rem" }}
            prefix={<i className="icon-search" />}
            suffix={
              searchQuery.length > 0 && (
                <i className="icon-Cross" onClick={() => onSearch("")}></i>
              )
            }
            onChange={(e) => onSearch(e.target.value)}
          />
          {!applyRawPrefill && (
            <div className="position-relative">
              <Button className="btn btn-primary2 btn-41">Add New Date</Button>
              <DatePicker
                key={Math.random()}
                suffixIcon={null}
                inputReadOnly
                onChange={(date, dateString) => handleAddNewDate(dateString)}
                disabledDate={disabledDate}
                className="calender-labparams"
              />
            </div>
          )}
        </div>

        {searchQuery.trim() !== "" && !queryMatchesExisting && (
          <div
            className="lab-params-create-banner"
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              margin: "8px 16px",
              padding: "12px 16px",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 10,
              color: "#1e1b4b",
              fontFamily:
                'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <div className="lab-params-create-banner-copy" style={{ minWidth: 0 }}>
              <div
                className="lab-params-create-banner-title"
                style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: "#1e1b4b" }}
              >
                {`Can't find "${searchQuery.trim()}"?`}
              </div>
              <div
                className="lab-params-create-banner-body"
                style={{ fontSize: 13, lineHeight: 1.45, color: "#3730a3" }}
              >
                Create a hospital-scoped custom investigation to use in result entry.
              </div>
            </div>
            <button
              type="button"
              className="lab-params-create-banner-cta"
              onClick={() => setIsCreateInvestigationOpen(true)}
              style={{
                flexShrink: 0,
                border: "1px solid #4b4ad5",
                background: "#fff",
                color: "#4b4ad5",
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.2,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Create custom investigation
            </button>
          </div>
        )}

        <InlineInvestigationPanel
          open={isCreateInvestigationOpen}
          onClose={() => setIsCreateInvestigationOpen(false)}
          initialName={searchQuery.trim()}
          existingGroups={customGroups}
          defaultGroupMode={customGroups.length > 0 ? "existing" : "new"}
          onCreated={handleCustomInvestigationCreated}
        />

        <div style={{ overflowX: "auto", margin: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#F1F1F5" }}>
              <tr style={{ position: "sticky", left: 0 }}>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#F1F1F5",
                    width: "23rem",
                    padding: "10px",
                    borderTopLeftRadius: "10px",
                    borderBottomLeftRadius: "10px",
                    fontWeight: "600",
                    zIndex: 3,
                  }}
                >
                  {" "}
                  {/* Set a fixed width here */}
                  <span>Name</span>
                </th>

                <th>
                  <div className='d-flex'>
                {dates?.length < 2 ? (dates.map((date, index) => (
                  <>
                        <div
                      key={date}
                      className="date-values"
                          style={{ padding: "10px 0",textWrap: "nowrap" }}
                    >
                      <span>{moment(date).format(showDateFormat)}</span>
                      <Tooltip
                        trigger={"click"}
                        placement="bottom"
                        title={
                          <>
                            <div className="tooltip-content">
                              <img className="me-2" src={editIcon} alt="Edit" />
                              <span>Edit Date</span>
                              <DatePicker
                                key={Math.random()}
                                suffixIcon={null}
                                inputReadOnly
                                onChange={(date, dateString) =>
                                  handleDateChange(dateString, index)
                                }
                                disabledDate={disabledDate}
                                className="calender-labparams"
                              />
                            </div>
                            {dates.length > 1 && (
                              <div
                                className="tooltip-content"
                                onClick={() => setShouldShowDeletePopup(date)}
                              >
                                <DeleteOutlined className="delete-icon" />
                                <span>Delete</span>
                              </div>
                            )}
                          </>
                        }
                        overlayClassName="custom-tooltip"
                      >
                        <EllipsisOutlined
                          className="vertical-dots"
                          style={{ fontSize: "16px" }}
                        />
                      </Tooltip>
                        </div>
                        <div
                      className="date-values"
                          style={{ padding: "10px 0" }}
                    >
                        </div>
                  </>
                ))):(dates.map((date, index) => (
                        <div
                    key={date}
                    className="date-values"
                          style={{ padding: "10px 0",textWrap: "nowrap"}}
                  >
                    <span>{moment(date).format(showDateFormat)}</span>
                    <Tooltip
                      trigger={"click"}
                      placement="bottom"
                      title={
                        <>
                          <div className="tooltip-content">
                            <img className="me-2" src={editIcon} alt="Edit" />
                            <span>Edit Date</span>
                            <DatePicker
                              key={Math.random()}
                              suffixIcon={null}
                              inputReadOnly
                              onChange={(date, dateString) =>
                                handleDateChange(dateString, index)
                              }
                              disabledDate={disabledDate}
                              className="calender-labparams"
                            />
                          </div>
                          {dates.length > 1 && (
                            <div
                              className="tooltip-content"
                              onClick={() => setShouldShowDeletePopup(date)}
                            >
                              <DeleteOutlined className="delete-icon" />
                              <span>Delete</span>
                            </div>
                          )}
                        </>
                      }
                      overlayClassName="custom-tooltip"
                    >
                      <EllipsisOutlined
                        className="vertical-dots"
                        style={{ fontSize: "16px" }}
                      />
                    </Tooltip>
                        </div>
                )))
                }
                  </div>
                </th>
              </tr>
            </thead>
            { loading ? (
                    <div
                      className="d-flex flex-column justify-content-center"
                      style={{ height: "calc(100vh - 218px)" }}
                    >
                      <div style={{position:'absolute', left:"50%"}}>
                        <Spin />
                      </div>
                    </div>  
                  ) : labParamsResults?.length > 0 || searchQuery === "" || queryMatchesExisting ? (
                    <>
                      <div style={{ height: "15px" }}></div>
                      <tbody>
                        {Object.keys(visibleInputValues).map((reportName) => (
                          <>
                            {/* Report Name Row */}
                            <tr
                              key={reportName}
                              style={{
                                cursor: "pointer",
                                width: "100%",
                              }}
                              onClick={() => toggleReport(reportName)}
                            >
                              <td
                                colSpan={Object.keys(inputValues).length + 1} // Span across all columns
                                style={{
                                  position: "sticky",
                                  left: 0, // Set the left position to make it stick on the left
                                  zIndex: 2, // Ensure it stays above the other rows
                                  background: " #FAFAFB", // Provide a background so it doesn't overlap
                                  padding: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  width: "29rem",
                                  borderTopLeftRadius: "10px",
                                  borderBottomLeftRadius: "10px",
                                }}
                              >
                                {" "}
                                {/* Match this width to the header */}
                                <span>{reportName}</span>
                                {testCounts[reportName] > 0 && (
                                  <span> ({testCounts[reportName]})</span>
                                )}
                                {!!expandedReports[reportName] ? (
                                  <button
                                    className="btn p-0 ms-2 iconrotate180"
                                    style={{ position: "absolute", left: isMobile? "635px" : "816px" }}
                                  >
                                    <i className="icon-right fs-5" />
                                  </button>
                                ) : (
                                  <button
                                    className="btn p-0 ms-2 iconrotate270"
                                    style={{ position: "absolute", left: "816px" }}
                                  >
                                    <i className="icon-right fs-5" />
                                  </button>
                                )}
                              </td>
                              {dates.length < 2 ? (
                                // Render at least two empty <td>s if the length is less than 2
                                <>
                                  <td
                                    style={{
                                      background: "#FAFAFB",
                                      width: "160px",
                                      padding: "10px",
                                    }}
                                  ></td>
                                  <td
                                    style={{
                                      background: "#FAFAFB",
                                      width: "160px",
                                      padding: "10px",
                                    }}
                                  ></td>
                                </>
                              ) : (
                                dates.map((entry, entryIndex) => {
                                  const isLastCell = entryIndex === dates.length - 1;
                                  return (
                                    <td
                                      key={entry.date}
                                      style={{
                                        background: "#FAFAFB",
                                        width: "160px",
                                        padding: "10px",
                                        textAlign: "right", // Right align the icon for the last cell
                                        borderTopRightRadius: isLastCell ? "10px" : " ",
                                        borderBottomRightRadius: isLastCell
                                          ? "10px"
                                          : " ",
                                      }}
                                    ></td>
                                  );
                                })
                              )}
                            </tr>
                            {!expandedReports[reportName] && (
                              <div style={{ height: "10px" }}></div>
                            )}
                            {/* <div style="height: 15px;"></div> */}
                            {/* Test Name and Test Values Rows */}
                            {expandedReports[reportName] && (
                              <>
                                {/* Main Loop: Exclude "Remarks" */}
                                {Object.keys(visibleInputValues[reportName] || {})
                                  .filter((testName) => testName !== "Remarks") // Exclude "Remarks"
                                  .map((testName, index) => {
                                    // Text/Positive-Negative/Dropdown investigations never carry
                                    // reference ranges (see toPayload), and only numeric ones show
                                    // the free-text input — the other two need their own widget.
                                    // Read from defaultTestData (always freshly populated by
                                    // fetchAndMergeCustomInvestigations) rather than trusting any one
                                    // date's inputValues cell — the merge/cache pipeline
                                    // (assemblePayload/combineData) can settle on a cell that dropped
                                    // resultType/dropdownOptions from an earlier pass, and a search-
                                    // matched row's "reportName" is the test's own name (each match
                                    // renders as its own one-item group), not its real group name in
                                    // defaultTestData — so match on testName alone.
                                    const defaultRow = defaultTestData.find((row) => row.testName === testName);
                                    const cellWithResultType = Object.values(
                                      inputValues[reportName][testName] || {}
                                    ).find((cell) => cell?.resultType);
                                    const effectiveResultType = defaultRow?.resultType || cellWithResultType?.resultType;
                                    const effectiveDropdownOptions =
                                      defaultRow?.dropdownOptions || cellWithResultType?.dropdownOptions;
                                    return (
                                    <tr key={testName} style={{ background: "#fff" }}>
                                    {/* Test Name Column */}
                                    <td
                                      style={{
                                        position: "sticky",
                                        left: 0,
                                        background: "#fff",
                                        width: "23rem",
                                        padding: "10px",
                                        //   borderRight: "1px solid #ddd",
                                        overflow: "hidden",
                                        zIndex: 3,
                                      }}
                                    >
                                      {testName}
                                      {testName !== "Remarks" &&
                                        (!effectiveResultType || effectiveResultType === "numeric") && (
                                        <Tooltip
                                          placement="bottom"
                                          title={
                                            <div className="ref-range-tooltip">
                                              {/* Logic for rendering the reference range */}
                                              {(() => {
                                                let hasRenderedRefRange = false;
                                                const GENDER_LABEL = { all: "All", male: "Male", female: "Female" };
                                                const GENDER_ORDER = { all: 0, male: 1, female: 2 };
                                                // 0-120 is the "applies to everyone" default band (see
                                                // useInvestigationFieldsState's toPayload) — omit it from the
                                                // label so only genuinely age-restricted rows show an age band.
                                                const formatAgeBand = (range) => {
                                                  const from = range.ageFrom ?? 0;
                                                  const to = range.ageTo ?? 120;
                                                  if (from <= 0 && to >= 120) return "";
                                                  // Age To left blank defaults to 120 (see toPayload) — with
                                                  // an actual Age From, that reads as "no upper bound".
                                                  if (from > 0 && to >= 120) return ` (${from}+ years)`;
                                                  return ` (${from}-${to}y)`;
                                                };
                                                return inputValues[reportName][testName] &&
                                                  Object.keys(inputValues[reportName][testName]).map((date, index) => {
                                                    const testData = inputValues[reportName][testName][date];
                                                    const refRange = testData?.refRange;
                                                    if (
                                                      refRange &&
                                                      refRange.ranges &&
                                                      refRange.ranges.length > 0 &&
                                                      !hasRenderedRefRange
                                                    ) {
                                                      hasRenderedRefRange = true;
                                                      // Every configured gender + age-band row, not just the
                                                      // first match per gender — a gender can have several
                                                      // rows (e.g. Male 0-10 and Male 10+) and all of them
                                                      // need to show up here.
                                                      const sortedRanges = [...refRange.ranges].sort((a, b) => {
                                                        const genderDiff =
                                                          (GENDER_ORDER[a.gender?.toLowerCase()] ?? 3) -
                                                          (GENDER_ORDER[b.gender?.toLowerCase()] ?? 3);
                                                        if (genderDiff !== 0) return genderDiff;
                                                        return (a.ageFrom ?? 0) - (b.ageFrom ?? 0);
                                                      });
                                                      return (
                                                        <div key={index}>
                                                          <strong>Reference Range:</strong>
                                                          {sortedRanges.length > 0 ? (
                                                            <div>
                                                              {sortedRanges.map((range, rangeIndex) => (
                                                                <div key={rangeIndex}>
                                                                  {(GENDER_LABEL[range.gender?.toLowerCase()] || range.gender) +
                                                                    formatAgeBand(range)}
                                                                  : {range.min} - {range.max} {range.unit}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <div>No reference range available</div>
                                                          )}
                                                        </div>
                                                      );
                                                    }
                                                    return null;
                                                  });
                                              })()}
                                              <div className="disclaimer-text">
                                                <span style={{ fontWeight: "600" }}>Disclaimer:</span>{" "}
                                                {`This range is only for reference and may vary between patients based on different conditions.`}
                                              </div>
                                            </div>
                                          }
                                          overlayClassName="lab-params-tooltip"
                                          overlayInnerStyle={{
                                            padding: "12px",
                                            width: "250px",
                                            background: "white",
                                            color: "black",
                                          }}
                                        >
                                          <i
                                            className="icon-info ms-1"
                                            style={{
                                              cursor: "pointer",
                                              color: "#d3d3d3",
                                              fontSize: "18px",
                                              marginBottom: "10px",
                                            }}
                                          ></i>
                                        </Tooltip>
                                      )}
                                    </td>

                                    <td
                                      colSpan={Object.keys(inputValues).length}
                                      style={{ padding: 0 }}
                                    >
                                      <div
                                        ref={scrollRef}
                                        onMouseDown={handleMouseDown}
                                        onMouseLeave={handleMouseLeaveOrUp}
                                        onMouseUp={handleMouseLeaveOrUp}
                                        onMouseMove={handleMouseMove}
                                        style={{
                                          display: "flex",
                                          overflowX: "auto",
                                          cursor: isDragging ? "grabbing" : "grab",
                                        }}
                                      >
                                        {/* Test Value Columns (aligned with date columns in <thead>) */}
                                        {dates.map((date, inputIndex) => (
                                            <div key={inputIndex} className="test-values-container">
                                              {/* Test Values Rendering */}
                                              {/* Use your test values rendering logic here */}
                                              {testName !== "Remarks" && ["dropdown", "positive_negative"].includes(
                                                effectiveResultType
                                              ) && (
                                                <div style={{ width: "180px" }}>
                                                  {effectiveResultType === "dropdown" ? (
                                                    <Select
                                                      style={{ width: "100%" }}
                                                      placeholder="Select"
                                                      allowClear
                                                      value={inputValues[reportName][testName][date]?.value || undefined}
                                                      options={(effectiveDropdownOptions || []).map(
                                                        (opt) => ({ value: opt, label: opt })
                                                      )}
                                                      onChange={(value) => handleInputChange(reportName, testName, date, value || "")}
                                                    />
                                                  ) : (
                                                    <Radio.Group
                                                      size="small"
                                                      style={{ display: "flex", width: "100%" }}
                                                      value={inputValues[reportName][testName][date]?.value || undefined}
                                                      onChange={(e) => handleInputChange(reportName, testName, date, e.target.value)}
                                                    >
                                                      <Radio.Button value="Positive" style={{ flex: 1, textAlign: "center" }}>Positive</Radio.Button>
                                                      <Radio.Button value="Negative" style={{ flex: 1, textAlign: "center" }}>Negative</Radio.Button>
                                                    </Radio.Group>
                                                  )}
                                                </div>
                                              )}
                                              {testName !== "Remarks" && !["dropdown", "positive_negative"].includes(
                                                effectiveResultType
                                              ) && (
                                                <div style={{ width: "180px" }}>
                                                <Input
                                                  style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    borderRadius: "9px",
                                                    color: inputValues[reportName][
                                                      testName
                                                    ][date]?.arrowDirection
                                                      ? "#E54848"
                                                      : "inherit",
                                                  }}
                                                  type="text"
                                                  inputMode={(() => {
                                                    const refRange = inputValues[reportName][testName][date]?.refRange;
                                                    const hasRanges = refRange?.ranges?.some((range) => String(range.min ?? '').trim() || String(range.max ?? '').trim());
                                                    return hasRanges ? "numeric" : "text";
                                                  })()}
                                                  className={`lab-params-input
                                                  ${
                                                    inputValues[reportName][testName][date]
                                                      ?.arrowDirection !== "" && inputValues[reportName][testName][date]?.value
                                                      ? "lab-params-intput-warning"
                                                      : ""
                                                  }`}
                                                  value={inputValues[reportName][testName][date]?.value || ""}
                                                  suffix={
                                                    inputValues[reportName][testName][date]?.arrowDirection === "up" ? (
                                                      <ArrowUpOutlined
                                                        className="lab-params-warning"
                                                        style={{ paddingLeft: 5 }}
                                                      />
                                                    ) : inputValues[reportName][testName][date]?.arrowDirection === "down" ? (
                                                      <ArrowDownOutlined
                                                        className="lab-params-warning"
                                                        style={{ paddingLeft: 5 }}
                                                      />
                                                    ) : <span />
                                                  }
                                                  addonAfter={
                                                    <div
                                                      style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          textAlign: "center",
                                                          overflow: "hidden",
                                                          whiteSpace: "nowrap",
                                                          textOverflow: "ellipsis",
                                                          fontSize: "12px",
                                                          fontWeight: "600",
                                                        }}
                                                      >
                                                        {
                                                          inputValues[reportName][testName][date]?.units ||
                                                          getUnitForTest(reportName, testName) ||
                                                          "--"
                                                        }                                            
                                                      </span>
                                                    </div>
                                                  }
                                                  onChange={(e) => {
                                                    const refRange = inputValues[reportName][testName][date]?.refRange;
                                                  
                                                    // Check if any range in the ranges array has a non-empty min or max
                                                    const hasMinOrMax = refRange?.ranges?.some(
                                                      (range) => String(range.min ?? '').trim() || String(range.max ?? '').trim()
                                                    );
                                                  
                                                    handleInputChange(
                                                      reportName,
                                                      testName,
                                                      date,
                                                      hasMinOrMax ? e.target.value.trim() : e.target.value
                                                    );
                                                  }}
                                                />
                                                </div>
                                              )}
                                            </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                    );
                                  })}

                                {/* Render Remarks row at the end */}
                                {Object.keys(visibleInputValues[reportName] || {})
                                  .filter((testName) => testName === "Remarks")
                                  .map((testName, index) => (
                                    <tr key={testName} style={{ background: "#fff" }}>
                                      {/* Remarks Test Name Column */}
                                      <td
                                        style={{
                                          position: "sticky",
                                          left: 0,
                                          background: "#fff",
                                          width: "23rem",
                                          padding: "10px",
                                          overflow: "hidden",
                                          zIndex: 3,
                                        }}
                                      >
                                        {testName}
                                      </td>

                                      <td colSpan={Object.keys(inputValues).length} style={{ padding: 0 }}>
                                        <div
                                          ref={scrollRef}
                                          onMouseDown={handleMouseDown}
                                          onMouseLeave={handleMouseLeaveOrUp}
                                          onMouseUp={handleMouseLeaveOrUp}
                                          onMouseMove={handleMouseMove}
                                          style={{
                                            display: "flex",
                                            overflowX: "auto",
                                            cursor: isDragging ? "grabbing" : "grab",
                                          }}
                                        >
                                          {dates.map((date, inputIndex) => (
                                            <div key={inputIndex} className="test-values-container">
                                              {/* Remarks Values Rendering */}
                                              <div>
                                                {inputValues[reportName][testName][date]?.value ? (
                                                  <Tooltip
                                                    title={tooltipTitle(
                                                      inputValues?.[reportName]?.[testName]?.[date]?.value,
                                                      reportName,
                                                      testName,
                                                      date
                                                    )}
                                                    overlayClassName="customTooltip"
                                                    placement="top"
                                                  >
                                                    <div className="truncated">
                                                      {inputValues[reportName][testName][date]?.value}
                                                    </div>
                                                    <span
                                                      style={{
                                                        fontWeight: 500,
                                                        color: "#171725",
                                                        textDecoration: "underline",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                      }}
                                                    >
                                                      View Remarks
                                                    </span>
                                                  </Tooltip>
                                                ) : (
                                                  <Button
                                                    className="remarks-btn"
                                                    onClick={() =>
                                                      handleOpenModal(reportName, testName, date)
                                                    }
                                                  >
                                                    <span
                                                      className="underline-button"
                                                      style={{ fontWeight: 600 }}
                                                    >
                                                      Add Remarks
                                                    </span>
                                                  </Button>
                                                )}
                                                {isRemarksVisible[reportName]?.[testName]?.[date] && (
                                                  <div className="full-remarks-container">
                                                    <div className="full-remarks-content">
                                                      {inputValues[reportName][testName][date]?.value}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </>
                              )}
                          </>
                        ))}
                      </tbody>
                      <div 
                        onClick={() => searchRef.current.focus()} // Step 3: Focus on input when the div is clicked
                        style={{
                          cursor: "pointer",
                          marginLeft: "1.25rem",
                          marginTop: "0.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        Unable to find the parameter? Discover more by{" "}
                        <span className="hyperling-text-style">searching</span>
                      </div>
                    </>
                  ) : (            
                    <div style={{padding:"1rem 0", fontSize:"1rem", fontWeight:"500"}}>
                      No Results Found
                    </div>
                  )
              }
            </table>
          </div>

        <CommonModal
          isModalOpen={isModalOpen}
          onCancel={handleCloseModal}
          modalWidth={500}
          title={"Add Remarks"}
          modalBody={
            <>
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <textarea
                  className="remarks-textarea"
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  placeholder="Write your remarks here..."
                            style={{ width: '100%', height: '150px', resize: 'none', overflowY: 'scroll' }}
                />
              </div>
                    <div className='d-flex justify-content-end'>
                      <Button onClick={() => {handleSaveRemarks()}} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>Save</span>
                </Button>
              </div>
            </>
          }
        />

        {shouldShowDeletePopup !== null && 
          <CommonModal
            isModalOpen={shouldShowDeletePopup !== null}
            onCancel={() => setShouldShowDeletePopup(null)}
            modalWidth={357}
            title={"You may lose your data"}
            modalBody={
              <>
                <div className="alert-warning rounded-10px p-2 patient-details">
                  <div className="d-flex align-items-center">
                    <img className="me-3" src={alertIcon} alt="Warning" />
                    <span>Are you sure you want to delete ?</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="d-flex align-items-center mt-2 justify-content-end">
                    <div
                      onClick={() => handleDeleteDate(shouldShowDeletePopup)}
                      className="me-4 text-decoration-underline btn p-0 text-main"
                    >
                      Yes, Delete
                    </div>
                    <Button
                      onClick={() => setShouldShowDeletePopup(null)}
                      className="lh-lg btn btn-primary3 btn-41 px-4"
                    >
                      <span>No</span>
                    </Button>
                  </div>
                </div>
              </>
            }
        />}
        </>
        )}
      </div>
    );
};

export default LabResultsTable;