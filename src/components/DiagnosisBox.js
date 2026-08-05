import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import {
  AutoComplete,
  Input,
  Button,
  Row,
  Col,
  Select,
  Popover,
  Tabs,
  Spin,
  Tooltip,
} from "antd";
import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import CommonModal from '../common/CommonModal';

import CashManagerContext from "../context/CashManagerContext";
import { errorMessage, isNumeric, onlyNumberFormat, removeBeforeWhiteSpace, capitalizeAfterSentence, shouldMonetizationDisabled } from "../utils/utils";

import { MenuOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getDiagnosisTemplates,
  getFrequentlySearchedDiagnosis,
  searchDiagnosis,
  getLoadPreviousDiagnosis,
  singleTemplateDetails,
} from "../redux/diagnosisSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import DifferentialDiagnosis from "./DifferentialDiagnosis";
import { ASSETS } from "../assets";
import { useChikitsalay } from "../pages/chikitsalay/useChikitsalay";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  moduleRowsToPreviousContext,
  VoiceRxModuleButton,
  VoiceRxModuleActionButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import { Grid5, Trash } from "iconsax-reactjs";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import { usePrescriptionNewPopupProps } from "./usePrescriptionNewPopupProps";
import {
  PrescriptionEmptyLineDraftSearch,
  PrescriptionEmptyLineDragHandle,
  usePrescriptionNewEmptyLineUi,
} from "./PrescriptionEmptyLineUi";
import {
  DIAGNOSIS_INVENTORY_WARNING,
  hasInvalidChikitsalayDiagnosis,
} from "../utils/chikitsalayInventory";
import {
  RxPadSection,
  Button as TesseractButton,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import "./tesseractRxPad.scss";
import { attachTesseractCtBehind } from "./tesseractCt";
const {
  alerticon: alertIcon,
  diagnosis: Diagnosisicon,
} = ASSETS.images;

function DiagnosisBox({handleDDxDrawer, generatedDDx, getGenerateDDx, isDDxLoading, handleDDxKnowMore, isDDxGenerated, showVoiceRxModule, useTesseractUi = false}) {
  const getPrescriptionNewPopupProps = usePrescriptionNewPopupProps(showVoiceRxModule);
  const {
    selectedDiagnosisList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.diagnosis);
  const isChikitsalayAccessable = useChikitsalay();
  const dispatch = useDispatch();

  const { patient_data, diagnosisData, setDiagnosisData, tcmId } = useContext(CashManagerContext);
  // const [diagnosisData, setDiagnosisData] = useState([]);

  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isApexAIAccessable = useFeatureIsOn("cdss");
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  // Voice-mode table layout classes are legacy-only; the Tesseract shell uses
  // the plain antd grid so header and body columns always align.
  const useVoiceTableLayout = isVoiceRxModuleEnabled && !useTesseractUi;

  const ddxOptionsList = generatedDDx?.map((item) => {
    return {
      tds_id: item?._id,
      unique_id: item?._id,
      tds_name: item?.differentialDiagnosisName,
      likelihood: item?.likelihood,
      pms_default: 1,
      usage_count: 0,
      isDDx: true,
    };
  });

  const STATUS_LIST = [
    { value: "Ruled Out", label: "Ruled Out" },
    { value: "Suspected", label: "Suspected" },
    { value: "Confirmed", label: "Confirmed" },
  ];

  //PopOver1
  const [popOver1, setPopOver1] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);

  const [searchParentQuery, setSearchParentQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);

  const [searchChildQuery, setSearchChildQuery] = useState(null);
  const [childSearchOptions, setChildSearchOptions] = useState([]);
  const [sinceOptions, setSinceOptions] = useState([]);
  const SINCE_OPTIONS = [
    { value: "Hour", label: "Hour" },
    { value: "Day", label: "Day" },
    { value: "Week", label: "Week" },
    { value: "Month", label: "Month" },
    { value: "Year", label: "Year" },
  ];

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

  const createCustomDiagnosisRow = useCallback((diagnosisName) => ({
    unique_id: uuidv4(),
    change: 1,
    tds_id: 0,
    tds_name: diagnosisName,
    pms_default: 0,
  }), []);

  const createCommittedDiagnosisRow = useCallback((diagnosisRow, diagnosisName) => ({
    ...diagnosisRow,
    tds_name: diagnosisName,
    since: "",
    status: "",
    note: "",
  }), []);

  const emptyLineUi = usePrescriptionNewEmptyLineUi({
    rows: diagnosisData,
    setRows: setDiagnosisData,
    showVoiceRxModule,
    useTesseractUi,
    nameField: "tds_name",
    rowKeyPrefix: "diagnosis",
    searchOptions: parentSearchOptions,
    setSearchQuery: setSearchParentQuery,
    createCustomRow: createCustomDiagnosisRow,
    createCommittedRow: createCommittedDiagnosisRow,
    canCreateCustomRow: !isChikitsalayAccessable,
  });
  const {
    draftInputRef: emptyLineDraftInputRef,
    draftName: emptyLineDraftName,
    getRowKey: getEmptyLineRowKey,
    isEnabled: isNewEmptyLineUiEnabled,
    onDraftInputKeyDown: onEmptyLineDraftInputKeyDown,
    onDraftSearch: onEmptyLineDraftSearch,
    onDraftSelect: onEmptyLineDraftSelect,
    removingRowKeys: emptyLineRemovingRowKeys,
    removeRow: removeEmptyLineRow,
    resetDraft: resetEmptyLineDraft,
    resetRowsUi: resetEmptyLineRowsUi,
  } = emptyLineUi;

  const applyVoiceDiagnosis = useCallback((nextDiagnosis) => {
    if (Array.isArray(nextDiagnosis) && nextDiagnosis.length > 0) {
      setDiagnosisData(nextDiagnosis);
      resetEmptyLineDraft();
    }
  }, [resetEmptyLineDraft, setDiagnosisData]);

  const diagnosisVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(diagnosisData, "diagnosis"),
    [diagnosisData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Diagnosis",
    onApply: applyVoiceDiagnosis,
    successMessage: "Diagnosis filled from voice dictation",
    copyPayloadKeys: ["diagnosis", "diagnoses"],
  });

  useEffect(() => {
    if (selectedDiagnosisList.length > 0) {
      const updatedData = diagnosisData.map((e, i) => {
        return { ...e, ...selectedDiagnosisList[i], change: 0 };
      });
      setDiagnosisData(updatedData);
    }
  }, [selectedDiagnosisList]);

  useEffect(() => {
    dispatch(getDiagnosisTemplates());
  }, []);

  useEffect(() => {
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [templates]);

  //Parent AutoComplete
  useEffect(() => {
    if (searchParentQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchDiagnosis({ searchQuery: searchParentQuery, type: "parent" })
        );
      }, 500);

      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedDiagnosis());
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList
      .filter((e) => !isChikitsalayAccessable || e?.icd_code)
      .forEach((e) => {
        data.push({
          key: JSON.stringify({ ...e, unique_id: uuidv4() }),
          value: e.tds_name,
          label: <div>{`${e.tds_name} ${e?.icd_code ? `(${e?.icd_code})` : ''}`}</div>,
        });
      });
    if (searchParentQuery.length === 0) {
      data.unshift({
        key: -1,
        label: (
          <>
            <div>FREQUENTLY USED</div>
          </>
        ),
      });
    } else {
      searchParentQuery && parentOptionsList.findIndex(e => e.tds_name?.toLowerCase()?.trim() == searchParentQuery?.toLowerCase()?.trim()) === -1 && !isChikitsalayAccessable &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            change: 1,
            tds_id: 0,
            tds_name: searchParentQuery,
            pms_default: 0,
          }),
          value: searchParentQuery,
          label: (
            <>
              <div>{searchParentQuery}<i className="icon-Add mx-1 text-primary fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a></div>
            </>
          ),
        });
    }
    setParentSearchOptions(data);
  }, [parentOptionsList, isChikitsalayAccessable, searchParentQuery]);

  const onSearchParent = useCallback(
    (query) => {
      setSearchParentQuery(removeBeforeWhiteSpace(query));
    },
    [searchParentQuery]
  );

  const onSelectParent = useCallback(
    (data, e) => {
      diagnosisData.push({
        ...JSON.parse(e.key),
        since: "",
        status: "",
        note: "",
      });
      setDiagnosisData((prev) => [...prev]);
      setSearchParentQuery("");
    },
    [searchParentQuery, diagnosisData]
  );

  // Frequently-used chips (Tesseract shell only) — captured from the
  // frequently-searched list; not overwritten by typed-search results.
  const [frequentDiagnosisChips, setFrequentDiagnosisChips] = useState([]);
  useEffect(() => {
    if (!searchParentQuery && Array.isArray(parentOptionsList) && parentOptionsList.length > 0) {
      setFrequentDiagnosisChips(parentOptionsList.map((e) => e.tds_name).filter(Boolean));
    }
  }, [parentOptionsList, searchParentQuery]);
  const availableDiagnosisChips = useTesseractUi
    ? frequentDiagnosisChips.filter(
        (name) => !diagnosisData.some(
          (row) => String(row.tds_name || "").toLowerCase() === name.toLowerCase()
        )
      )
    : [];
  const onChipAdd = useCallback((name) => {
    setDiagnosisData((prev) => [
      ...prev,
      {
        unique_id: uuidv4(),
        change: 1,
        pms_default: 0,
        tds_name: name,
        since: "",
        status: "",
        note: "",
      },
    ]);
  }, [setDiagnosisData]);

  const onSelectDDx = (e) => {
    diagnosisData.push({
      ...e,
      since: "",
      status: "",
      note: "",
    });
    setDiagnosisData((prev) => [...prev]);
    setSearchParentQuery("");
  };

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchDiagnosis({
            searchQuery: searchChildQuery.query,
            type: "child",
          })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [searchChildQuery]);

  useEffect(() => {
    const data = [];
    childOptionsList
      .filter((e) => !isChikitsalayAccessable || e?.icd_code)
      .forEach((e) => {
        data.push({
          key: JSON.stringify({ ...e, unique_id: uuidv4() }),
          value: e.tds_name,
          label: <div>{`${e.tds_name} ${e?.icd_code ? `(${e?.icd_code})` : ''}`}</div>,
        });
      });
    if (searchChildQuery?.query && childOptionsList.findIndex(e => e.tds_name?.toLowerCase()?.trim() == searchChildQuery?.query?.toLowerCase()?.trim()) === -1 && !isChikitsalayAccessable) {
      data.push({
        key: JSON.stringify({
          ...diagnosisData[searchChildQuery.index],
          unique_id: uuidv4(),
          change: 1,
          tds_name: searchChildQuery.query,
        }),
        value: searchChildQuery.query,
        label: (
          <>
            <div>{searchChildQuery.query}</div>
          </>
        ),
      });
    }
    setChildSearchOptions(data);
  }, [childOptionsList, isChikitsalayAccessable]);

  const onFocusChid = (i) => {
    setSearchChildQuery({ query: diagnosisData[i].tds_name, index: i });
    dispatch(
      searchDiagnosis({ searchQuery: diagnosisData[i].tds_name, type: "child" })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query)
      diagnosisData[i] = {
        ...diagnosisData[i],
        change: 1,
        tds_name: updateQuery
      };
      setDiagnosisData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, diagnosisData]
  );

  const onSelectChild = useCallback(
    (data, e, i) => {
      diagnosisData[i] = { ...diagnosisData[i], ...JSON.parse(e.key), voice_rx_from_module: false };
      setDiagnosisData((prev) => [...prev]);
      setSearchChildQuery({ query: JSON.parse(e.key).tds_name, index: i });
    },
    [searchChildQuery, diagnosisData]
  );

  const onSearchSinceChid = useCallback(
    (query, i) => {
      const updateQuery = onlyNumberFormat(query);
      diagnosisData[i].since = updateQuery;
      setDiagnosisData((prev) => [...prev]);
      if (updateQuery) {
        const options = SINCE_OPTIONS.map((option) => {
          return {
            key: Math.random(),
            value: `${updateQuery} ${updateQuery <= 1 ? option.value : `${option.value}(s)`}`,
            label: <>{`${updateQuery} ${updateQuery <= 1 ? option.label : `${option.label}(s)`}`}</>,
          };
        });
        setSinceOptions(options);
      } else {
        setSinceOptions([]);
      }
    },
    [sinceOptions, diagnosisData]
  );

  const onBlurSinceChid = useCallback(
    (i) => {
      if (isNumeric(diagnosisData[i].since)) {
        diagnosisData[i].since = `${diagnosisData[i].since} ${parseInt(diagnosisData[i].since) <= 1 ? 'Year' : 'Year(s)'}`;
        setDiagnosisData((prev) => [...prev]);
      }
    },
    [diagnosisData]
  );

  const onSelectSinceChild = useCallback(
    (data, i) => {
      setSinceOptions([]);
      diagnosisData[i].since = data;
      setDiagnosisData((prev) => [...prev]);
    },
    [sinceOptions, diagnosisData]
  );

  const onSelectStatusChild = useCallback(
    (data, i) => {
      diagnosisData[i].status = data;
      setDiagnosisData((prev) => [...prev]);
    },
    [diagnosisData]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      diagnosisData[i].note = e.target.value;
      setDiagnosisData((prev) => [...prev]);
    },
    [diagnosisData]
  );

  const onRemoveRow = (index) => {
    if (removeEmptyLineRow(index)) {
      return;
    }

    diagnosisData.splice(index, 1);
    setDiagnosisData((prev) => [...prev]);
  };

  //PopOver1 function
  const showHideTemplatesListPopover = useCallback(() => {
    setPopOver1(!popOver1);
  }, [popOver1]);

  const onSearch = (e) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      let filteredTemplates = templates.filter((template) => {
        return template.tdt_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const loadPreviousClick = async () => {
    var sendData = {
      patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: tcmId,
    };
    const action = await dispatch(getLoadPreviousDiagnosis(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map(e => {
        return { ...e, unique_id: uuidv4() }
      })
      setDiagnosisData([...diagnosisData, ...updatedData]);

    } else {
      errorMessage(action.error)
    }
  };

  const onTemplateSelected = async (template) => {
    const action = await dispatch(singleTemplateDetails(template.tdt_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action?.payload;
      setDiagnosisData([...diagnosisData, ...updatedData]);
      showHideTemplatesListPopover();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tdt_id) => {
    const action = await dispatch(deleteTemplate(tdt_id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error)
    }
  };

  //PopOver2 function
  const showHideSaveTemplatePopOver = useCallback(() => {
    setInputTemplateName(null);
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
    const templateDiagnosis = diagnosisData;
    if (templateDiagnosis.length === 0) {
      errorMessage('At least 1 diagnosis added')
    } else if (templateDiagnosis.filter((e) => String(e.tds_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup diagnosis name')
    } else if (isVoiceRxModuleEnabled && isChikitsalayAccessable && templateDiagnosis.some(hasInvalidChikitsalayDiagnosis)) {
      errorMessage(DIAGNOSIS_INVENTORY_WARNING)
    } else {
      var sendData = {
        tdt_template_name: inputTemplateName,
        diagnosis: templateDiagnosis,
      };
      const action = await dispatch(addTemplate(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
      }
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
    const templateDiagnosis = diagnosisData;
    if (templateDiagnosis.length === 0) {
      errorMessage('At least 1 diagnosis added')
    } else if (templateDiagnosis.filter((e) => String(e.tds_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup diagnosis name')
    } else if (isVoiceRxModuleEnabled && isChikitsalayAccessable && templateDiagnosis.some(hasInvalidChikitsalayDiagnosis)) {
      errorMessage(DIAGNOSIS_INVENTORY_WARNING)
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tdt_id: data.tdt_id,
        tdt_template_name: data.tdt_template_name,
        diagnosis: templateDiagnosis,
      };
      const action = await dispatch(updateTemplate(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        showHideSaveTemplatePopOver();
      }
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

  //Child Componet
  // const TABLE_DIAGNOSIS = useMemo(() => {
  //   return (
  //     diagnosisData.length > 0 &&
  //     diagnosisData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className={`${index === 0 && "mt-14 border-top"
  //             } align-items-center border-bottom`}
  //         >
  //           <Col lg={7} md={7} sm={7} xs={7} className="border-end">
  //             <div className="fontroboto fw-medium">
  //               <AutoComplete
  //                 defaultValue={item.tds_name}
  //                 value={item.tds_name}
  //                 placeholder="Diagnosis Name"
  //                 bordered={false}
  //                 defaultOpen={false}
  //                 onSearch={(query) => onSearchChild(query, index)}
  //                 onFocus={() => onFocusChid(index)}
  //                 options={childSearchOptions}
  //                 className="autocomplete-custom w-100 inputborder"
  //                 defaultActiveFirstOption={true}
  //                 onSelect={(data, e) => onSelectChild(data, e, index)}
  //               />
  //             </div>
  //           </Col>
  //           <Col lg={4} md={4} sm={4} xs={4} className="border-end">
  //             <AutoComplete
  //               defaultValue={item.since}
  //               value={item.since}
  //               placeholder="Since"
  //               bordered={false}
  //               defaultOpen={false}
  //               onSearch={(query) => onSearchSinceChid(query, index)}
  //               onBlur={() => onBlurSinceChid(index)}
  //               options={sinceOptions}
  //               className="autocomplete-custom w-100 inputborder"
  //               defaultActiveFirstOption={true}
  //               onSelect={(data) => onSelectSinceChild(data, index)}
  //             />
  //           </Col>
  //           <Col lg={4} md={4} sm={4} xs={4} className="border-end">
  //             <Select
  //               className="autocomplete-custom w-100 inputborder"
  //               placeholder="Status"
  //               defaultValue={item.status != "" ? item.status : null}
  //               value={item.status != "" ? item.status : null}
  //               onSelect={(data) => onSelectStatusChild(data, index)}
  //               options={STATUS_LIST}
  //               onClear={() => onSelectStatusChild("", index)}
  //               allowClear
  //             />
  //           </Col>
  //           <Col lg={8} md={8} sm={7} xs={7} className="border-end">
  //             <Input
  //               className="notesinput border-0"
  //               placeholder="Notes"
  //               defaultValue={item.note}
  //               value={item.note}
  //               onChange={(e) => onChangeNoteChild(e, index)}
  //             />
  //           </Col>
  //           <Col lg={1} md={1} sm={2} xs={2} className="text-center">
  //             <Button
  //               className="btn py-0 btn-delete-prescription px-0"
  //               onClick={() => onRemoveRow(index)}
  //             >
  //               <i className="icon-delete" />
  //             </Button>
  //           </Col>
  //         </Row>
  //       );
  //     })
  //   );
  // }, [diagnosisData, childSearchOptions]);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = reorder(
      diagnosisData,
      result.source.index,
      result.destination.index
    );
    setDiagnosisData(reorderedItems);
  };

  const TABLE_DIAGNOSIS = useMemo(() => {
    const diagnosisRows = Array.isArray(diagnosisData) ? diagnosisData : [];

    return (
      <div
        className={[useVoiceTableLayout ? voiceModuleStyles.moduleTableScrollWrap : "", useTesseractUi ? "tesseract-ct" : ""].filter(Boolean).join(" ") || undefined}
        ref={useTesseractUi ? attachTesseractCtBehind : undefined}
      >
        {useTesseractUi && (
          <Row gutter={0} className="tesseract-ct-head">
            <Col lg={1} md={1} sm={1} xs={1} className="tesseract-ct-th" />
            <Col lg={6} md={6} sm={6} xs={6} className="tesseract-ct-th">Name</Col>
            <Col lg={4} md={4} sm={4} xs={4} className="tesseract-ct-th">Since</Col>
            <Col lg={4} md={4} sm={4} xs={4} className="tesseract-ct-th">Status</Col>
            <Col lg={8} md={8} sm={7} xs={7} className="tesseract-ct-th">Notes</Col>
            <Col lg={1} md={1} sm={2} xs={2} className="tesseract-ct-th tesseract-ct-sticky-action" />
          </Row>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="diagnosis" direction="vertical">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={[
                  isNewEmptyLineUiEnabled ? "prescription-empty-line-ui" : "mt-2",
                  useVoiceTableLayout ? voiceModuleStyles.moduleTableBody : "",
                ].filter(Boolean).join(" ")}
              >
              {diagnosisRows.map((item, index) => {
                const rowKey = isNewEmptyLineUiEnabled ? getEmptyLineRowKey(item, index) : `diagnosis-${index}`;

                return (
                  <Draggable key={rowKey} draggableId={rowKey} index={index}>
                    {(provided) => (
                      <Row
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        key={rowKey}
                        gutter={[0]}
                        className={isNewEmptyLineUiEnabled ? [
                          "symptoms-table-row",
                          emptyLineRemovingRowKeys.includes(rowKey) ? "prescription-empty-line-row--removing" : "",
                          useVoiceTableLayout ? voiceModuleStyles.moduleTableRow : "",
                        ].filter(Boolean).join(" ") : [
                          index === 0 && "mt-14 border-top",
                          "align-items-center border-bottom",
                          useVoiceTableLayout ? voiceModuleStyles.moduleTableRow : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <Col lg={1} md={1} sm={1} xs={1} className={[
                          isNewEmptyLineUiEnabled ? "symptoms-table-cell center" : "text-center",
                          useVoiceTableLayout ? voiceModuleStyles.moduleDragCell : "",
                        ].filter(Boolean).join(" ")}>
                          {isNewEmptyLineUiEnabled ? (
                            <PrescriptionEmptyLineDragHandle dragHandleProps={provided.dragHandleProps} />
                          ) : (
                            <MenuOutlined
                              {...provided.dragHandleProps}
                              className="drag-handle"
                            >
                            </MenuOutlined>
                          )}
                        </Col>
                        <Col
                          lg={6}
                          md={6}
                          sm={6}
                          xs={6}
                          className={[
                            isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                            useVoiceTableLayout ? voiceModuleStyles.modulePrimaryCell : "",
                            isVoiceRxModuleEnabled && isChikitsalayAccessable && hasInvalidChikitsalayDiagnosis(item) ? "align-self-stretch" : "",
                          ].filter(Boolean).join(" ")}
                          style={isVoiceRxModuleEnabled && isChikitsalayAccessable && hasInvalidChikitsalayDiagnosis(item) ? { background: "#fff8ef" } : undefined}
                        >
                          <div className={isVoiceRxModuleEnabled && isChikitsalayAccessable && hasInvalidChikitsalayDiagnosis(item) ? "fontroboto fw-medium d-flex align-items-center gap-1 w-100 h-100 p-2 pe-3" : "fontroboto fw-medium d-flex align-items-center gap-1 w-100"}>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <AutoComplete
                                defaultValue={item.tds_name}
                                value={`${item.tds_name}${item?.icd_code ? ` (${item?.icd_code})` : ''}`}
                                placeholder="Diagnosis Name"
                                bordered={false}
                                defaultOpen={false}
                                disabled={item?.pms_default && !(isChikitsalayAccessable && hasInvalidChikitsalayDiagnosis(item)) ? true : false}
                                onSearch={(query) => onSearchChild(query, index)}
                                onFocus={() => onFocusChid(index)}
                                options={childSearchOptions}
                                className="autocomplete-custom w-100 inputborder"
                                {...getPrescriptionNewPopupProps()}
                                defaultActiveFirstOption={true}
                                onSelect={(data, e) => onSelectChild(data, e, index)}
                              />
                            </div>
                            {isVoiceRxModuleEnabled && isChikitsalayAccessable && hasInvalidChikitsalayDiagnosis(item) && (
                              <Tooltip
                                placement="top"
                                trigger={["hover", "click"]}
                                overlayInnerStyle={{
                                  background: "#2f2e39",
                                  borderRadius: 8,
                                  color: "#fff",
                                  fontSize: 14,
                                  lineHeight: 1.35,
                                  maxWidth: 360,
                                  padding: "12px 16px",
                                  textAlign: "center",
                                }}
                                title={DIAGNOSIS_INVENTORY_WARNING}
                              >
                                <span className="d-inline-flex flex-shrink-0 me-2" style={{ cursor: "pointer", lineHeight: 1 }}>
                                  <InfoCircleOutlined
                                    className="fs-18"
                                    style={{ color: "#d46b08", background: "#fff0df", borderRadius: "50%" }}
                                  />
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </Col>
                        <Col lg={4} md={4} sm={4} xs={4} className={[
                          isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                          useVoiceTableLayout ? voiceModuleStyles.moduleShortCell : "",
                        ].filter(Boolean).join(" ")}>
                          <AutoComplete
                            defaultValue={item.since}
                            value={item.since}
                            placeholder="Since"
                            bordered={false}
                            defaultOpen={false}
                            onSearch={(query) => onSearchSinceChid(query, index)}
                            onBlur={() => onBlurSinceChid(index)}
                            options={sinceOptions}
                            className="autocomplete-custom w-100 inputborder"
                            {...getPrescriptionNewPopupProps()}
                            defaultActiveFirstOption={true}
                            onSelect={(data) => onSelectSinceChild(data, index)}
                          />
                        </Col>
                        <Col lg={4} md={4} sm={4} xs={4} className={[
                          isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                          useVoiceTableLayout ? voiceModuleStyles.moduleShortCell : "",
                        ].filter(Boolean).join(" ")}>
                          <Select
                            className="autocomplete-custom w-100 inputborder"
                            placeholder="Status"
                            defaultValue={item.status != "" ? item.status : null}
                            value={item.status != "" ? item.status : null}
                            onSelect={(data) => onSelectStatusChild(data, index)}
                            options={STATUS_LIST}
                            {...getPrescriptionNewPopupProps()}
                            onClear={() => onSelectStatusChild("", index)}
                            allowClear
                          />
                        </Col>
                        <Col lg={8} md={8} sm={7} xs={7} className={[
                          isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                          useVoiceTableLayout ? voiceModuleStyles.moduleNotesCell : "",
                        ].filter(Boolean).join(" ")}>
                          <Input
                            className="notesinput border-0"
                            placeholder="Notes"
                            defaultValue={item.note}
                            value={item.note}
                            onChange={(e) => onChangeNoteChild(e, index)}
                          />
                        </Col>
                        <Col lg={1} md={1} sm={2} xs={2} className={[
                          isNewEmptyLineUiEnabled ? "symptoms-table-cell center" : "text-center",
                          useTesseractUi ? "tesseract-ct-sticky-action" : "",
                          useVoiceTableLayout ? voiceModuleStyles.moduleActionCell : "",
                        ].filter(Boolean).join(" ")}>
                          <Button
                            className="btn py-0 btn-delete-prescription px-0"
                            onClick={() => onRemoveRow(index)}
                          >
                            {useTesseractUi ? <TPLibraryIcon name="trash" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete" />}
                          </Button>
                        </Col>
                      </Row>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {isNewEmptyLineUiEnabled && (
                <Row
                  gutter={[0]}
                  className={[
                    "symptoms-table-row",
                    "prescription-empty-line-row--animated",
                    "prescription-empty-line-row--draft",
                    useVoiceTableLayout ? voiceModuleStyles.moduleTableRow : "",
                  ].filter(Boolean).join(" ")}
                >
                  <Col lg={1} md={1} sm={1} xs={1} className={[
                    "symptoms-table-cell center",
                    useVoiceTableLayout ? voiceModuleStyles.moduleDragCell : "",
                  ].filter(Boolean).join(" ")} />
                  <Col lg={6} md={6} sm={6} xs={6} className={[
                    "symptoms-table-cell prescription-empty-line-cell--draft-active",
                    useVoiceTableLayout ? voiceModuleStyles.modulePrimaryCell : "",
                  ].filter(Boolean).join(" ")}>
                    <PrescriptionEmptyLineDraftSearch
                      inputRef={emptyLineDraftInputRef}
                      inputClassName="fontroboto fw-medium w-100"
                      value={emptyLineDraftName}
                      options={parentSearchOptions}
                      popupProps={getPrescriptionNewPopupProps()}
                      onSearch={onEmptyLineDraftSearch}
                      onSelect={onEmptyLineDraftSelect}
                      onInputKeyDown={onEmptyLineDraftInputKeyDown}
                    />
                  </Col>
                  <Col lg={4} md={4} sm={4} xs={4} className={[
                    "symptoms-table-cell",
                    useVoiceTableLayout ? voiceModuleStyles.moduleShortCell : "",
                  ].filter(Boolean).join(" ")}>
                    <AutoComplete
                      value=""
                      placeholder="Since"
                      bordered={false}
                      defaultOpen={false}
                      disabled
                      className="autocomplete-custom w-100 prescription-empty-line-draft-disabled-control"
                    />
                  </Col>
                  <Col lg={4} md={4} sm={4} xs={4} className={[
                    "symptoms-table-cell",
                    useVoiceTableLayout ? voiceModuleStyles.moduleShortCell : "",
                  ].filter(Boolean).join(" ")}>
                    <Select
                      className="autocomplete-custom w-100 prescription-empty-line-draft-disabled-control"
                      placeholder="Status"
                      value={null}
                      options={STATUS_LIST}
                      disabled
                    />
                  </Col>
                  <Col lg={8} md={8} sm={7} xs={7} className={[
                    "symptoms-table-cell",
                    useVoiceTableLayout ? voiceModuleStyles.moduleNotesCell : "",
                  ].filter(Boolean).join(" ")}>
                    <Input
                      className="notesinput border-0 prescription-empty-line-draft-disabled-control"
                      placeholder="Notes"
                      value=""
                      disabled
                    />
                  </Col>
                  <Col lg={1} md={1} sm={2} xs={2} className={[
                    "symptoms-table-cell center",
                    useTesseractUi ? "tesseract-ct-sticky-action" : "",
                    useVoiceTableLayout ? voiceModuleStyles.moduleActionCell : "",
                  ].filter(Boolean).join(" ")} />
                </Row>
              )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }, [
    diagnosisData,
    childSearchOptions,
    isVoiceRxModuleEnabled,
    isChikitsalayAccessable,
    isNewEmptyLineUiEnabled,
    emptyLineDraftInputRef,
    emptyLineDraftName,
    emptyLineRemovingRowKeys,
    getEmptyLineRowKey,
    onEmptyLineDraftInputKeyDown,
    onEmptyLineDraftSearch,
    onEmptyLineDraftSelect,
    parentSearchOptions,
    useTesseractUi,
  ]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="diagnosis-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Diagnosis Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="diagnosis-template-search">
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
                    onClick={() => onTemplateSelected(template)}
                  >
                    {useTesseractUi ? <TPLibraryIcon name="grid-5" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}
                  </div>
                  <div
                    className="text-truncate w-100"
                    onClick={() => onTemplateSelected(template)}
                  >
                    <div className="title text-main2">{template.tdt_template_name}</div>
                    <div className="text-truncate">
                      <span>{template.diagnosis}</span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tdt_id)
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
                      useTesseractUi ? <TPLibraryIcon name="trash" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete" />
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOver1, matchedTemplates]);

  //Save Componet
  const SAVE_CONTENT = useCallback(() => {
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
            <i className="icon-Cross" />
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
              value={inputTemplateName && JSON.parse(inputTemplateName).tdt_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              {...getPrescriptionNewPopupProps()}
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tdt_template_name,
                  label: (
                    <div key={template.tdt_id}>
                      {template.tdt_template_name}
                    </div>
                  ),
                };
              })}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">{useTesseractUi ? <TPLibraryIcon name="grid-5" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Grid5 color="#4C4E5C" size={18} strokeWidth={1.6} variant="Linear" /> : <i className="icon-template"></i>}</div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      <span>{JSON.parse(option.data.key).diagnosis}</span>
                    </div>
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

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    resetEmptyLineRowsUi();
    setDiagnosisData([])
    showHideClearData()
  };

  //Remove All Rows
  const REMOVE_ALL_ROWS = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen1}
        onCancel={showHideClearData}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to Clear Selected <b>Diagnosis</b>?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={onRemoveRows}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  <span>Yes, Clear</span>
                </div>
                <Button onClick={showHideClearData} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isModalOpen1]);

  // Differential Diagnosis block. The old point-n-click pad shows it ABOVE the
  // search field (as on prod); NewRx shows it below the chips.
  const DDX_BLOCK = (isApexAIAccessable || tp_monetization_enable) ? (
    <div style={{ padding: useTesseractUi ? "0" : "0 14px" }}>
      <DifferentialDiagnosis
        handleDDxDrawer={handleDDxDrawer}
        ddxOptionsList={ddxOptionsList?.filter(
          (e) => ![...diagnosisData.map((e1) => e1.tds_name)].includes(e.tds_name)
        )}
        getGenerateDDx={getGenerateDDx}
        isDDxLoading={isDDxLoading}
        onSelectParent={onSelectDDx}
        isDiagnosis={true}
        handleDDxKnowMore={handleDDxKnowMore}
        isDDxGenerated={isDDxGenerated}
      />
    </div>
  ) : null;

  // Body below the header — identical for the classic and Tesseract shells.
  const BODY_CONTENT = (
    <>
      {DELETE_MODAL}
      {REMOVE_ALL_ROWS}
      {TABLE_DIAGNOSIS}
      {!useTesseractUi && DDX_BLOCK}
      {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
        <div className={voiceModuleStyles.moduleSlot}>
          <VoiceRxModuleCapture
            moduleName="Diagnosis"
            previousContext={diagnosisVoicePreviousContext}
            dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.diagnosis}
            onCancel={() => setVoiceCaptureOpen(false)}
            onComplete={handleVoiceCaptureComplete} />
        </div>
      ) : !isNewEmptyLineUiEnabled ? (
        <div className="p-14">
          <AutoComplete
            value={searchParentQuery}
            onSearch={onSearchParent}
            options={parentSearchOptions}
            className="autocomplete-custom w-100"
            onSelect={onSelectParent}
            defaultActiveFirstOption={true}
            {...getPrescriptionNewPopupProps(!searchParentQuery ? "boxpopup" : "")}
          >
            <Input
              placeholder="Search Diagnosis"
              prefix={<i className="icon-search" />}
            />
          </AutoComplete>
        </div>
      ) : null}
      {useTesseractUi && availableDiagnosisChips.length > 0 && (
        <div className="tesseract-rxpad-chips">
          {availableDiagnosisChips.map((name) => (
            <TesseractButton
              key={name}
              variant="tonal"
              theme="neutral"
              size="sm"
              className="tesseract-rxpad-chip"
              title={name}
              onClick={() => onChipAdd(name)}
            >
              {name}
            </TesseractButton>
          ))}
        </div>
      )}
      {useTesseractUi && DDX_BLOCK}
    </>
  );

  if (useTesseractUi) {
    // Tesseract shell (RxPadSection) — same behavior, redesigned chrome.
    const tesseractActionButton = ({ icon, label, onClick, disabled }) => (
      <TesseractButton
        variant="tonal"
        theme="neutral"
        size="sm"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        icon={<TPLibraryIcon name={icon} variant="linear" size={18} />}
      />
    );
    return (
      <RxPadSection
        ref={sectionRef}
        data-voice-rx-dictation-target="diagnosis"
        title="Diagnosis"
        icon="bulk/diagnosis"
        headerMeta={
          <>
            {isChikitsalayAccessable ? <span className="text-danger me-2">*</span> : null}
            {isChikitsalayAccessable && (
              <a href="https://icdcodes.ai/results" target="_blank" rel="noopener noreferrer" className="text-decoration-underline text-primary fs-14">
                Find ICD codes
              </a>
            )}
          </>
        }
        className={["tesseract-rxpad", voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}
        headerActions={
          <>
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="diagnosis"
                label="Start Diagnosis voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
            <Tooltip placement="bottom" title="Load previous diagnosis">
              <span>
                {tesseractActionButton({ icon: "refresh-arrow", label: "Load previous diagnosis", onClick: loadPreviousClick })}
              </span>
            </Tooltip>
            <Popover
              open={popOver1}
              onOpenChange={showHideTemplatesListPopover}
              content={TEMPLATE_CONTENT}
              trigger="click"
              overlayClassName="pop-350 pp-0"
              placement="bottomRight"
            >
              <span>
                <Tooltip placement="bottom" title="Browse templates">
                  {tesseractActionButton({ icon: "grid-5", label: "Browse diagnosis templates" })}
                </Tooltip>
              </span>
            </Popover>
            <Popover
              open={popOver2}
              onOpenChange={() => (diagnosisData.length > 0) && showHideSaveTemplatePopOver()}
              content={SAVE_CONTENT}
              trigger="click"
              overlayClassName="pop-450 pp-0"
              placement="bottomRight"
            >
              <span>
                <Tooltip placement="bottom" title="Save as template">
                  {tesseractActionButton({ icon: "ram", label: "Save diagnosis as template", disabled: diagnosisData.length === 0 })}
                </Tooltip>
              </span>
            </Popover>
            <Tooltip placement="bottom" title="Clear all entries">
              <span>
                {tesseractActionButton({ icon: "eraser", label: "Clear diagnosis", onClick: showHideClearData, disabled: diagnosisData.length === 0 })}
              </span>
            </Tooltip>
          </>
        }
      >
        {BODY_CONTENT}
      </RxPadSection>
    );
  }

  return (
    <>
      <div ref={sectionRef} data-voice-rx-dictation-target="diagnosis" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Diagnosisicon} alt="Diagnosis" />
            <div className="title-common">Diagnosis {isChikitsalayAccessable ? <span className="text-danger">*</span> : ""}</div>
          </div>
          <div className="d-flex align-items-center">
            {isChikitsalayAccessable && (<a href="https://icdcodes.ai/results" target="_blank" rel="noopener noreferrer" className="text-decoration-underline text-primary fs-14">
              Find ICD codes
            </a>)}
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="diagnosis"
                label="Start Diagnosis voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Load previous diagnosis">
                <VoiceRxModuleActionButton type="reload" label="Load previous diagnosis" onClick={loadPreviousClick} />
              </Tooltip>
            ) : (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={loadPreviousClick}
              >
                {" "}
                <i className="icon-reload me-2"></i> <span>Load Prev. Diagnosis</span>
              </button>
            )}
            <Popover
              open={popOver1}
              onOpenChange={showHideTemplatesListPopover}
              content={TEMPLATE_CONTENT}
              trigger="click"
              overlayClassName="pop-350 pp-0"
              placement="bottom"
            >
              {isVoiceRxModuleEnabled ? (
                <span>
                  <Tooltip placement="bottom" title="Browse diagnosis templates">
                    <VoiceRxModuleActionButton type="template" label="Browse diagnosis templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2" /> <span>Templates</span>
                </button>
              )}
            </Popover>

            <Tooltip placement="bottom" title={(diagnosisData.length > 0) ? "" : "Please enter some Diagnosis to save a template"}>
              <Popover
                open={popOver2}
                onOpenChange={() => (diagnosisData.length > 0) && showHideSaveTemplatePopOver()}
                // onOpenChange={showHideSaveTemplatePopOver}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton
                      type="save"
                      label="Save diagnosis as template"
                      disabled={diagnosisData.length === 0}
                    />
                  </span>
                ) : (
                  <button className="btn d-flex align-items-center btn-text">
                    {" "}
                    <i className="icon-save me-2" /> <span>Save</span>
                  </button>
                )}
              </Popover>
            </Tooltip>
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Clear this section">
                <VoiceRxModuleActionButton
                  type="clear"
                  label="Clear diagnosis"
                  onClick={showHideClearData}
                  disabled={diagnosisData.length === 0}
                />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={diagnosisData.length > 0 ? false : true}>
                <i className="icon-eraser1 me-2"></i> <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {BODY_CONTENT}
      </div>
    </>
  );
}

export default React.memo(DiagnosisBox);
