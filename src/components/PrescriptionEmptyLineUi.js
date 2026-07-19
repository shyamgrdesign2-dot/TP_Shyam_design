import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AutoComplete } from "antd";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { v4 as uuidv4 } from "uuid";
import { Menu as IconsaxMenu } from "iconsax-reactjs";

import { removeBeforeWhiteSpace } from "../utils/utils";

const TP_CONFIG_DATA_FEATURE_KEY = "tp-config-data";
const EMPTY_LINE_ANIMATION_MS = 180;

export const isEmptyLineHeaderOption = (option) => option?.key === -1 || option?.key === "-1";

export function PrescriptionEmptyLineDragHandle({ dragHandleProps }) {
  return (
    <span {...dragHandleProps} className="prescription-empty-line-drag-handle">
      <IconsaxMenu
        className="prescription-empty-line-drag-icon"
        color="#9aa0aa"
        size={18}
        variant="Outline"
        aria-hidden="true"
      />
    </span>
  );
}

PrescriptionEmptyLineDragHandle.propTypes = {
  dragHandleProps: PropTypes.object,
};

PrescriptionEmptyLineDragHandle.defaultProps = {
  dragHandleProps: undefined,
};

export function PrescriptionEmptyLineDraftSearch({
  inputRef,
  inputClassName,
  value,
  options,
  popupProps,
  onSearch,
  onSelect,
  onInputKeyDown,
}) {
  return (
    <div ref={inputRef} className={inputClassName}>
      <AutoComplete
        value={value}
        placeholder="Search & add"
        bordered={false}
        defaultOpen={false}
        onSearch={onSearch}
        options={options}
        className="autocomplete-custom w-100 prescription-empty-line-draft-search"
        {...popupProps}
        defaultActiveFirstOption={true}
        onSelect={onSelect}
        onInputKeyDown={onInputKeyDown}
      />
    </div>
  );
}

PrescriptionEmptyLineDraftSearch.propTypes = {
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  inputClassName: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.object),
  popupProps: PropTypes.object,
  onSearch: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onInputKeyDown: PropTypes.func.isRequired,
};

PrescriptionEmptyLineDraftSearch.defaultProps = {
  inputRef: undefined,
  inputClassName: "w-100",
  value: "",
  options: [],
  popupProps: {},
};

export function usePrescriptionNewEmptyLineUi({
  rows,
  setRows,
  showVoiceRxModule,
  nameField,
  rowKeyPrefix,
  searchOptions = [],
  setSearchQuery = () => {},
  createCustomRow,
  createCommittedRow,
  commitRow,
  canCreateCustomRow = true,
  onAfterCommit,
  onAfterRemove,
}) {
  const tpConfigData = useFeatureValue(TP_CONFIG_DATA_FEATURE_KEY, {});
  const isEnabled = showVoiceRxModule !== undefined && tpConfigData?.newEmptyLineUI === true;
  const [draftName, setDraftName] = useState("");
  const [removingRowKeys, setRemovingRowKeys] = useState([]);
  const latestRowsRef = useRef([]);
  const rowUiKeysRef = useRef(new WeakMap());
  const rowRemovalTimersRef = useRef([]);
  const draftInputRef = useRef(null);

  const clearRemovalTimers = useCallback(() => {
    rowRemovalTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    rowRemovalTimersRef.current = [];
  }, []);

  useEffect(() => {
    latestRowsRef.current = Array.isArray(rows) ? rows : [];
  }, [rows]);

  useEffect(() => clearRemovalTimers, [clearRemovalTimers]);

  const resetDraft = useCallback(() => {
    setDraftName("");
    setSearchQuery("");
  }, [setSearchQuery]);

  const resetRowsUi = useCallback(() => {
    latestRowsRef.current = [];
    clearRemovalTimers();
    setRemovingRowKeys([]);
    resetDraft();
  }, [clearRemovalTimers, resetDraft]);

  const getRowKey = useCallback((item, index) => {
    if (item && typeof item === "object") {
      if (!rowUiKeysRef.current.has(item)) {
        rowUiKeysRef.current.set(item, uuidv4());
      }

      return rowUiKeysRef.current.get(item);
    }

    return `${rowKeyPrefix}-row-${index}`;
  }, [rowKeyPrefix]);

  const blurDraftInput = useCallback(() => {
    const blurInput = () => {
      const input = draftInputRef.current?.querySelector?.("input");
      input?.blur?.();
    };

    blurInput();
    window.requestAnimationFrame(blurInput);
  }, []);

  const commitDraftRow = useCallback((sourceRow) => {
    const name = String(sourceRow?.[nameField] ?? "").trim();

    if (!name) {
      return false;
    }

    blurDraftInput();

    if (commitRow) {
      const result = commitRow(sourceRow, name);

      if (result === false) {
        return false;
      }

      resetDraft();
      onAfterCommit?.(name, sourceRow);
      return true;
    }

    const nextRow = createCommittedRow(sourceRow, name);
    setRows((previousRows) => {
      const currentRows = Array.isArray(previousRows) ? previousRows : [];
      return [...currentRows, nextRow];
    });
    resetDraft();
    onAfterCommit?.(name, nextRow);
    return true;
  }, [blurDraftInput, commitRow, createCommittedRow, nameField, onAfterCommit, resetDraft, setRows]);

  const onDraftSearch = useCallback((query) => {
    const nextQuery = removeBeforeWhiteSpace(query);
    setDraftName(nextQuery);
    setSearchQuery(nextQuery);
  }, [setSearchQuery]);

  const onDraftSelect = useCallback((data, option) => {
    if (isEmptyLineHeaderOption(option)) {
      return;
    }

    try {
      commitDraftRow(JSON.parse(option.key));
    } catch (error) {
      if (canCreateCustomRow) {
        commitDraftRow(createCustomRow(data));
      }
    }
  }, [canCreateCustomRow, commitDraftRow, createCustomRow]);

  const onDraftInputKeyDown = useCallback((event) => {
    if (event.key !== "Enter" || event.isComposing) {
      return;
    }

    const name = String(event.currentTarget?.value ?? draftName ?? "").trim();

    if (!name) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const availableOptions = Array.isArray(searchOptions) ? searchOptions : [];
    const matchingOption = availableOptions.find((option) => {
      return !isEmptyLineHeaderOption(option) &&
        String(option?.value ?? "").trim().toLowerCase() === name.toLowerCase();
    });

    if (matchingOption) {
      onDraftSelect(matchingOption.value, matchingOption);
      return;
    }

    if (canCreateCustomRow) {
      commitDraftRow(createCustomRow(name));
    }
  }, [canCreateCustomRow, commitDraftRow, createCustomRow, draftName, onDraftSelect, searchOptions]);

  const removeRow = useCallback((index) => {
    if (!isEnabled) {
      return false;
    }

    const currentRows = latestRowsRef.current;
    const rowKey = getRowKey(currentRows[index], index);

    if (!rowKey || removingRowKeys.includes(rowKey)) {
      return true;
    }

    setRemovingRowKeys((previousKeys) => [...previousKeys, rowKey]);

    const timerId = window.setTimeout(() => {
      const previousRows = latestRowsRef.current;
      const nextRows = previousRows.filter((row, rowIndex) => getRowKey(row, rowIndex) !== rowKey);

      latestRowsRef.current = nextRows;
      setRows(nextRows);
      onAfterRemove?.(nextRows);
      setRemovingRowKeys((previousKeys) => previousKeys.filter((key) => key !== rowKey));
      rowRemovalTimersRef.current = rowRemovalTimersRef.current.filter((activeTimerId) => activeTimerId !== timerId);
    }, EMPTY_LINE_ANIMATION_MS);

    rowRemovalTimersRef.current.push(timerId);
    return true;
  }, [getRowKey, isEnabled, onAfterRemove, removingRowKeys, setRows]);

  return {
    draftInputRef,
    draftName,
    getRowKey,
    isEnabled,
    onDraftInputKeyDown,
    onDraftSearch,
    onDraftSelect,
    removingRowKeys,
    removeRow,
    resetDraft,
    resetRowsUi,
  };
}
