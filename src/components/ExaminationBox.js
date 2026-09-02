import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
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
  Tooltip
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../common/CommonModal';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, onlyNumberFormat, removeBeforeWhiteSpace, capitalizeAfterSentence } from "../utils/utils";

import { MenuOutlined } from '@ant-design/icons';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getExaminationTemplates,
  getFrequentlySearchedExamination,
  searchExamination,
  singleTemplateDetails
} from "../redux/examinationSlice";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { guardDropAnimation } from "../utils/dndTransitionGuard";
import { setIsDDxReadyToGenerate } from "../redux/ddxSlice";
import { ASSETS } from "../assets";
import { Grid5, Trash } from "iconsax-reactjs";
import {
  VOICE_MODULE_DUMMY_DIGITISED_DATA,
  moduleRowsToPreviousContext,
  VoiceRxModuleButton,
  VoiceRxModuleActionButton,
  VoiceRxModuleCapture,
  useVoiceRxModuleCapture,
} from "./dr-agent/voicerx/VoiceRxModuleCapture";
import voiceModuleStyles from "./dr-agent/voicerx/VoiceRxModuleCapture.module.scss";
import { usePrescriptionNewPopupProps } from "./usePrescriptionNewPopupProps";
import {
  PrescriptionEmptyLineDraftSearch,
  PrescriptionEmptyLineDragHandle,
  usePrescriptionNewEmptyLineUi,
} from "./PrescriptionEmptyLineUi";
import {
  RxPadSection,
  Button as TesseractButton,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import "./tesseractRxPad.scss";
import { attachTesseractCtBehind } from "./tesseractCt";
const {
  alerticon: alertIcon,
  examination: Examinationicon,
} = ASSETS.images;

function ExaminationBox({ showVoiceRxModule, useTesseractUi = false }) {
  const isVoiceRxModuleEnabled = Boolean(showVoiceRxModule);
  // Voice-mode table layout classes are legacy-only; the Tesseract shell uses
  // the plain antd grid so header and body columns always align.
  const useVoiceTableLayout = isVoiceRxModuleEnabled && !useTesseractUi;
  const getPrescriptionNewPopupProps = usePrescriptionNewPopupProps(showVoiceRxModule);
  const {
    selectedExaminationList,
    parentOptionsList,
    childOptionsList,
    templates,
    loading,
  } = useSelector((state) => state.examination);
  const dispatch = useDispatch();

  const { examinationData, setExaminationData, symptomsData } = useContext(CashManagerContext);
  // const [ examinationData, setExaminationData] = useState([]);

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

  const createCustomExaminationRow = useCallback((examinationName) => ({
    unique_id: uuidv4(),
    change: 1,
    pms_default: 0,
    examination_name: examinationName,
  }), []);

  const createCommittedExaminationRow = useCallback((examinationRow, examinationName) => ({
    ...examinationRow,
    examination_name: examinationName,
    note: "",
  }), []);

  const onEmptyLineExaminationCommit = useCallback(() => {
    dispatch(setIsDDxReadyToGenerate(true));
  }, [dispatch]);

  const onEmptyLineExaminationRemove = useCallback((nextExaminations) => {
    if (nextExaminations.length > 0) {
      dispatch(setIsDDxReadyToGenerate(true));
    } else if ((Array.isArray(symptomsData) ? symptomsData : []).length === 0) {
      dispatch(setIsDDxReadyToGenerate(false));
    }
  }, [dispatch, symptomsData]);

  const emptyLineUi = usePrescriptionNewEmptyLineUi({
    rows: examinationData,
    setRows: setExaminationData,
    showVoiceRxModule,
    useTesseractUi,
    nameField: "examination_name",
    rowKeyPrefix: "examination",
    searchOptions: parentSearchOptions,
    setSearchQuery: setSearchParentQuery,
    createCustomRow: createCustomExaminationRow,
    createCommittedRow: createCommittedExaminationRow,
    onAfterCommit: onEmptyLineExaminationCommit,
    onAfterRemove: onEmptyLineExaminationRemove,
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

  const applyVoiceExaminations = useCallback((nextExaminations) => {
    if (Array.isArray(nextExaminations) && nextExaminations.length > 0) {
      setExaminationData(nextExaminations);
      resetEmptyLineDraft();
    }
  }, [resetEmptyLineDraft, setExaminationData]);

  const examinationsVoicePreviousContext = useMemo(
    () => moduleRowsToPreviousContext(examinationData, "examinations"),
    [examinationData]
  );
  const {
    voiceCaptureOpen,
    setVoiceCaptureOpen,
    voiceUpdated,
    handleVoiceCaptureComplete,
    sectionRef,
  } = useVoiceRxModuleCapture({
    moduleName: "Examinations",
    onApply: applyVoiceExaminations,
    successMessage: "Examinations filled from voice dictation",
    copyPayloadKeys: ["examinations"],
  });

  useEffect(() => {
    if (selectedExaminationList.length > 0) {
      const updatedData = examinationData.map((e, i) => {
        return { ...e, ...selectedExaminationList[i] };
      });
      setExaminationData(updatedData);
    }
  }, [selectedExaminationList]);

  useEffect(() => {
    dispatch(getExaminationTemplates());
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
          searchExamination({ searchQuery: searchParentQuery, type: "parent" })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedExamination());
    }
  }, [searchParentQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.examination_name,
        label: <div>{e.examination_name}</div>,
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
      searchParentQuery && parentOptionsList.findIndex(e => e.examination_name?.toLowerCase()?.trim() == searchParentQuery?.toLowerCase()?.trim()) === -1 &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            change: 1,
            pms_default: 0,
            examination_name: searchParentQuery
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
  }, [parentOptionsList, searchParentQuery]);

  const onSearchParent = useCallback(
    (query) => {
      setSearchParentQuery(removeBeforeWhiteSpace(query));
      // ?.replace(/,/g, '')
    },
    [searchParentQuery]
  );

  // Frequently-used chips (Tesseract shell only) — captured from the
  // frequently-searched list; not overwritten by typed-search results.
  const [frequentExaminationChips, setFrequentExaminationChips] = useState([]);
  useEffect(() => {
    if (!searchParentQuery && Array.isArray(parentOptionsList) && parentOptionsList.length > 0) {
      setFrequentExaminationChips(parentOptionsList.map((e) => e.examination_name).filter(Boolean));
    }
  }, [parentOptionsList, searchParentQuery]);
  const availableExaminationChips = useTesseractUi
    ? frequentExaminationChips.filter(
        (name) => !examinationData.some(
          (row) => String(row.examination_name || "").toLowerCase() === name.toLowerCase()
        )
      )
    : [];
  const onChipAdd = useCallback((name) => {
    setExaminationData((prev) => [
      ...prev,
      {
        unique_id: uuidv4(),
        change: 1,
        pms_default: 0,
        examination_name: name,
        note: "",
      },
    ]);
    dispatch(setIsDDxReadyToGenerate(true));
  }, [dispatch, setExaminationData]);

  const onSelectParent = useCallback(
    (data, e) => {
      examinationData.push({
        ...JSON.parse(e.key),
        note: "",
      });
      setExaminationData((prev) => [...prev]);
      setSearchParentQuery("");
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [searchParentQuery, examinationData]
  );

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchExamination({
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
    childOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.examination_name,
        label: <div>{e.examination_name}</div>,
      });
    });
    if (searchChildQuery?.query && childOptionsList.findIndex(e => e.examination_name?.toLowerCase()?.trim() == searchChildQuery?.query?.toLowerCase()?.trim()) === -1) {
      data.push({
        key: JSON.stringify({
          ...examinationData[searchChildQuery.index],
          unique_id: uuidv4(),
          change: 1,
          pms_default: 0,
          examination_name: searchChildQuery.query
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
  }, [childOptionsList]);

  const onFocusChid = (i) => {
    setSearchChildQuery({ query: examinationData[i].examination_name, index: i });
    dispatch(
      searchExamination({ searchQuery: examinationData[i].examination_name, type: "child" })
    );
  };

  const onSearchChild = useCallback(
    (query, i) => {
      const updateQuery = removeBeforeWhiteSpace(query)
      // ?.replace(/,/g, '')
      examinationData[i] = {
        ...examinationData[i],
        change: 1,
        examination_name: updateQuery
      };
      setExaminationData((prev) => [...prev]);
      setSearchChildQuery({ query: updateQuery, index: i });
    },
    [searchChildQuery, examinationData]
  );

  const onSelectChild = useCallback(
    (data, e, i) => {
      examinationData[i] = { ...examinationData[i], ...JSON.parse(e.key) };
      setExaminationData((prev) => [...prev]);
      setSearchChildQuery({ query: JSON.parse(e.key).examination_name, index: i });
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [searchChildQuery, examinationData]
  );

  const onChangeNoteChild = useCallback(
    (e, i) => {
      examinationData[i].note = e.target.value;
      // ?.replace(/,/g, '')
      setExaminationData((prev) => [...prev]);
      dispatch(setIsDDxReadyToGenerate(true));
    },
    [examinationData]
  );

  const onRemoveRow = (index) => {
    if (removeEmptyLineRow(index)) {
      return;
    }

    examinationData.splice(index, 1);
    setExaminationData((prev) => [...prev]);
    if (examinationData?.length > 0) {
      dispatch(setIsDDxReadyToGenerate(true));
    } else if (symptomsData?.length === 0) {
      dispatch(setIsDDxReadyToGenerate(false));
    }
  };

  //PopOver1 function
  const showHideTemplatesListPopover = useCallback(() => {
    setPopOver1(!popOver1);
  }, [popOver1]);

  const onSearch = (e) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      let filteredTemplates = templates.filter((template) => {
        return template.tet_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const onTemplateSelected = async (template) => {
    const action = await dispatch(singleTemplateDetails(template.tet_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action?.payload;
      setExaminationData([...examinationData, ...updatedData]);
      showHideTemplatesListPopover();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tet_id) => {
    const action = await dispatch(deleteTemplate(tet_id));
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
    const templateExamination = examinationData;
    if (templateExamination.length === 0) {
      errorMessage('At least 1 examination added')
    } else if (templateExamination.filter(e => String(e.examination_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup examination name')
    } else {
      var sendData = {
        tet_template_name: inputTemplateName,
        examination: templateExamination,
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
    const templateExamination = examinationData;
    if (templateExamination.length === 0) {
      errorMessage('At least 1 examination added')
    } else if (templateExamination.filter(e => String(e.examination_name ?? "").trim() === "").length > 0) {
      errorMessage('Please fillup examination name')
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tet_id: data.tet_id,
        tet_template_name: data.tet_template_name,
        examination: templateExamination,
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

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = reorder(
      examinationData,
      result.source.index,
      result.destination.index
    );
    setExaminationData(reorderedItems);
  };

  const TABLE_EXAMINATION = useMemo(() => {
    const examinationRows = Array.isArray(examinationData) ? examinationData : [];
    const shouldUseEmptyLineTableLayout = isNewEmptyLineUiEnabled && isVoiceRxModuleEnabled && !useTesseractUi;

    return (
      <div
        className={[shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleTableScrollWrap : "", useTesseractUi ? "tesseract-ct" : ""].filter(Boolean).join(" ") || undefined}
        ref={useTesseractUi ? attachTesseractCtBehind : undefined}
      >
        {useTesseractUi && (
          <Row gutter={0} className="tesseract-ct-head">
            <Col lg={1} md={1} sm={1} xs={1} className="tesseract-ct-th" />
            <Col lg={8} md={8} sm={8} xs={8} className="tesseract-ct-th">Name</Col>
            <Col lg={14} md={14} sm={13} xs={13} className="tesseract-ct-th">Notes</Col>
            <Col lg={1} md={1} sm={2} xs={2} className="tesseract-ct-th tesseract-ct-sticky-action" />
          </Row>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="examination" direction="vertical">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={[
                  isNewEmptyLineUiEnabled ? "prescription-empty-line-ui" : "mt-2",
                  shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleTableBody : "",
                ].filter(Boolean).join(" ")}
              >
                {examinationRows.map((item, index) => {
                  const rowKey = isNewEmptyLineUiEnabled ? getEmptyLineRowKey(item, index) : `examination-${index}`;

                  return (
                    <Draggable key={rowKey} draggableId={rowKey} index={index}>
                      {(provided) => (
                        <Row
                          ref={provided.innerRef}
                          {...guardDropAnimation(provided.draggableProps)}
                          key={rowKey}
                          gutter={[0]}
                          className={isNewEmptyLineUiEnabled ? [
                            "symptoms-table-row",
                            emptyLineRemovingRowKeys.includes(rowKey) ? "prescription-empty-line-row--removing" : "",
                            shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleTableRow : "",
                          ].filter(Boolean).join(" ") : `${index === 0 && 'mt-14 border-top'
                          } align-items-center border-bottom`}
                        >
                          <Col lg={1} md={1} sm={1} xs={1} className={[
                            isNewEmptyLineUiEnabled ? "symptoms-table-cell center" : "text-center",
                            shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleDragCell : "",
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
                          <Col lg={8} md={8} sm={8} xs={8} className={[
                            isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                            shouldUseEmptyLineTableLayout ? voiceModuleStyles.modulePrimaryCell : "",
                          ].filter(Boolean).join(" ")}>
                            <div className="fontroboto fw-medium w-100">
                              <AutoComplete
                                defaultValue={item.examination_name}
                                value={item.examination_name}
                                placeholder="Examination Name"
                                bordered={false}
                                defaultOpen={false}
                                disabled={item?.pms_default ? true : false}
                                onSearch={(query) => onSearchChild(query, index)}
                                onFocus={() => onFocusChid(index)}
                                options={childSearchOptions}
                                className="autocomplete-custom w-100 inputborder"
                                {...getPrescriptionNewPopupProps()}
                                defaultActiveFirstOption={true}
                                onSelect={(data, e) => onSelectChild(data, e, index)}
                              />
                            </div>
                          </Col>
                          <Col lg={14} md={14} sm={13} xs={13} className={[
                            isNewEmptyLineUiEnabled ? "symptoms-table-cell" : "border-end",
                            shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleWideNotesCell : "",
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
                            shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleActionCell : "",
                          ].filter(Boolean).join(" ")}>
                            <Button
                              className="btn py-0 btn-delete-prescription px-0"
                              onClick={() => onRemoveRow(index)}
                            >
                              {useTesseractUi ? <TPLibraryIcon name="trash" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>}
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
                      shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleTableRow : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <Col lg={1} md={1} sm={1} xs={1} className={[
                      "symptoms-table-cell center",
                      shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleDragCell : "",
                    ].filter(Boolean).join(" ")} />
                    <Col lg={8} md={8} sm={8} xs={8} className={[
                      "symptoms-table-cell prescription-empty-line-cell--draft-active",
                      shouldUseEmptyLineTableLayout ? voiceModuleStyles.modulePrimaryCell : "",
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
                    <Col lg={14} md={14} sm={13} xs={13} className={[
                      "symptoms-table-cell",
                      shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleWideNotesCell : "",
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
                      shouldUseEmptyLineTableLayout ? voiceModuleStyles.moduleActionCell : "",
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
    examinationData,
    childSearchOptions,
    isNewEmptyLineUiEnabled,
    isVoiceRxModuleEnabled,
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

  //Child Componet
  // const TABLE_EXAMINATION = useMemo(() => {
  //   return (
  //     examinationData.length > 0 &&
  //     examinationData.map((item, index) => {
  //       return (
  //         <Row
  //           key={index}
  //           gutter={[0]}
  //           className={`${index === 0 && "mt-14 border-top"} align-items-center border-bottom`}
  //         >
  //           <Col lg={9} md={9} sm={9} xs={9} className="border-end">
  //             <div className="fontroboto fw-medium">
  //               <AutoComplete
  //                 defaultValue={item.examination_name}
  //                 value={item.examination_name}
  //                 placeholder="Examination Name"
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
  //           <Col lg={14} md={14} sm={13} xs={13} className="border-end">
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
  //               <i className="icon-delete"></i>
  //             </Button>
  //           </Col>
  //         </Row>
  //       );
  //     })
  //   );
  // }, [examinationData, childSearchOptions]);

  //Template Componet
  const TEMPLATE_CONTENT = useCallback(() => {
    return (
      <>
        <div className="pop-header" key="examination-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Examination Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={showHideTemplatesListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="examination-template-search">
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
                    <div className="title text-main2">{template.tet_template_name}</div>
                    <div className="text-truncate">
                      <span>{template.examination}</span>
                    </div>
                  </div>
                  <Button
                    className="btn btn-delete-prescription p-0 ms-2"
                    onClick={() => {
                      showHideModal(template.tet_id)
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
                      useTesseractUi ? <TPLibraryIcon name="trash" variant="linear" size={18} /> : isVoiceRxModuleEnabled ? <Trash color="currentColor" size={18} strokeWidth={1.5} variant="Linear" /> : <i className="icon-delete"></i>
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
              value={inputTemplateName && JSON.parse(inputTemplateName).tet_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              {...getPrescriptionNewPopupProps()}
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tet_template_name,
                  label: (
                    <div key={template.tet_id}>
                      {template.tet_template_name}
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
                      <span>{JSON.parse(option.data.key).examination}</span>
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
    setExaminationData([])
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
                  Are you sure you want to Clear Selected <b>Examinations</b>?
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

  // Body below the header — identical for the classic and Tesseract shells.
  const BODY_CONTENT = (
    <>
      {DELETE_MODAL}
      {REMOVE_ALL_ROWS}
      {TABLE_EXAMINATION}
      {isVoiceRxModuleEnabled && voiceCaptureOpen ? (
        <div className={voiceModuleStyles.moduleSlot}>
          <VoiceRxModuleCapture
            moduleName="Examinations"
            previousContext={examinationsVoicePreviousContext}
            dummyDigitisedData={VOICE_MODULE_DUMMY_DIGITISED_DATA.examination}
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
              placeholder="Search Examinations"
              prefix={<i className="icon-search"></i>}
            />
          </AutoComplete>
        </div>
      ) : null}
      {useTesseractUi && availableExaminationChips.length > 0 && (
        <div className="tesseract-rxpad-chips">
          {availableExaminationChips.map((name) => (
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
        data-voice-rx-dictation-target="examinations"
        title="Examinations"
        icon="bulk/stethoscope"
        className={["tesseract-rxpad", voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}
        headerActions={
          <>
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="examinations"
                label="Start Examinations voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
            )}
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
                  {tesseractActionButton({ icon: "grid-5", label: "Browse examination templates" })}
                </Tooltip>
              </span>
            </Popover>
            <Popover
              open={popOver2}
              onOpenChange={() => (examinationData.length > 0) && showHideSaveTemplatePopOver()}
              content={SAVE_CONTENT}
              trigger="click"
              overlayClassName="pop-450 pp-0"
              placement="bottomRight"
            >
              <span>
                <Tooltip placement="bottom" title="Save as template">
                  {tesseractActionButton({ icon: "ram", label: "Save examination as template", disabled: examinationData.length === 0 })}
                </Tooltip>
              </span>
            </Popover>
            <Tooltip placement="bottom" title="Clear all entries">
              <span>
                {tesseractActionButton({ icon: "eraser", label: "Clear examinations", onClick: showHideClearData, disabled: examinationData.length === 0 })}
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
      <div ref={sectionRef} data-voice-rx-dictation-target="examinations" className={[voiceModuleStyles.moduleRoot, isVoiceRxModuleEnabled && voiceUpdated ? voiceModuleStyles.moduleUpdated : ""].filter(Boolean).join(" ")}>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Examinationicon} alt="Examination" />
            <div className="title-common">Examinations</div>
          </div>
          <div className="d-flex align-items-center">
            {isVoiceRxModuleEnabled && (
              <VoiceRxModuleButton
                active={voiceCaptureOpen}
                dictationTargetId="examinations"
                label="Start Examinations voice input"
                onClick={() => setVoiceCaptureOpen(true)} />
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
                  <Tooltip placement="bottom" title="Browse examination templates">
                    <VoiceRxModuleActionButton type="template" label="Browse examination templates" />
                  </Tooltip>
                </span>
              ) : (
                <button className="btn d-flex align-items-center btn-text">
                  {" "}
                  <i className="icon-template me-2"></i> <span>Templates</span>
                </button>
              )}
            </Popover>
            <Tooltip placement="bottom" title={(examinationData.length > 0) ? "" : "Please enter some Examination to save a template"}>
              <Popover
                open={popOver2}
                // onOpenChange={showHideSaveTemplatePopOver}
                onOpenChange={() => (examinationData.length > 0) && showHideSaveTemplatePopOver()}
                content={SAVE_CONTENT}
                trigger="click"
                overlayClassName="pop-450 pp-0"
                placement="bottom"
              >
                {isVoiceRxModuleEnabled ? (
                  <span>
                    <VoiceRxModuleActionButton
                      type="save"
                      label="Save examination as template"
                      disabled={examinationData.length === 0}
                    />
                  </span>
                ) : (
                  <button className="btn d-flex align-items-center btn-text">
                    {" "}
                    <i className="icon-save me-2"></i> <span>Save</span>
                  </button>
                )}
              </Popover>
            </Tooltip>
            {isVoiceRxModuleEnabled ? (
              <Tooltip placement="bottom" title="Clear this section">
                <VoiceRxModuleActionButton
                  type="clear"
                  label="Clear examinations"
                  onClick={showHideClearData}
                  disabled={examinationData.length === 0}
                />
              </Tooltip>
            ) : (
              <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={examinationData.length > 0 ? false : true}>
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

export default React.memo(ExaminationBox);
