import { renderPrescriptionDropdown } from './PrescriptionDropdownHints';
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AutoComplete, Row, message } from "antd";
import { TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import { v4 as uuidv4 } from "uuid";

import { removeBeforeWhiteSpace } from "../utils/utils";
import { focusNewPrescriptionRow } from "./tesseractCt";

const EMPTY_LINE_ANIMATION_MS = 180;
// Enumerable symbols survive the object spreads used by row editors, while JSON
// persistence ignores them. UI identity must not depend on the edited object.
const ROW_UI_KEY = Symbol('prescriptionRowKey');
const EmptyLineContext = React.createContext(undefined);

export function PrescriptionDisabledDelete() {
  return <button type="button" disabled aria-label="Delete row" className="btn-delete-prescription prescription-disabled-delete">
    <TPLibraryIcon name="trash" corner="rounded" variant="linear" size={18} />
  </button>;
}

function withDisabledDelete(children) {
  return React.Children.map(children, child => {
    if (!React.isValidElement(child)) return child;
    if (child.props.className?.includes('tesseract-ct-sticky-action') && !child.props.children) {
      return React.cloneElement(child, {}, <PrescriptionDisabledDelete />);
    }
    return child.props.children ? React.cloneElement(child, {}, withDisabledDelete(child.props.children)) : child;
  });
}

export function PrescriptionEmptyLineRow({ children, className, ...props }) {
  const hintId = useId();
  const [searchOpen, setSearchOpen] = useState(false);
  const rowRef = useRef(null);
  const isDetailCell = (event) => event.target.closest?.('.ant-col')
    ?.querySelector('.prescription-empty-line-draft-disabled-control');
  const guideToName = (event) => {
    if (!isDetailCell(event)) return;
    event.preventDefault();
    message.info({ key: 'prescription-add-name', content: 'Enter the name to fill in all other details.' });
    const input = rowRef.current?.querySelector('.prescription-empty-line-draft-search input');
    input?.focus();
    setSearchOpen(true);
  };
  return (
    <EmptyLineContext.Provider value={{ hintId, searchOpen, setSearchOpen }}>
      <Row {...props} ref={rowRef} className={`${className || ''} prescription-guided-add-row`}
        onPointerDownCapture={event => { if (isDetailCell(event)) event.preventDefault(); }}
        onClickCapture={guideToName} aria-describedby={hintId}>
        {withDisabledDelete(children)}
      </Row>
      <span id={hintId} className="visually-hidden">
        Enter the name to fill in all other details.
      </span>
    </EmptyLineContext.Provider>
  );
}

PrescriptionEmptyLineRow.propTypes = { children: PropTypes.node, className: PropTypes.string };

export const isEmptyLineHeaderOption = (option) => option?.key === -1 || option?.key === "-1";

export const createPrescriptionSearchHeading = () => ({
  key: -1,
  disabled: true,
  className: 'prescription-dropdown-heading',
  label: 'FREQUENTLY USED',
});

export function PrescriptionEmptyLineDragHandle({ dragHandleProps }) {
  return (
    <span {...dragHandleProps} className="prescription-empty-line-drag-handle">
      <svg
        className="prescription-empty-line-drag-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="#9aa0aa"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="9" cy="5" r="1.4" />
        <circle cx="15" cy="5" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="15" cy="12" r="1.4" />
        <circle cx="9" cy="19" r="1.4" />
        <circle cx="15" cy="19" r="1.4" />
      </svg>
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
  const row = React.useContext(EmptyLineContext);
  const [localOpen, setLocalOpen] = useState(false);
  return (
    <div ref={inputRef} className={inputClassName}>
      <AutoComplete
        value={value}
        placeholder="Search & add"
        aria-describedby={row?.hintId}
        bordered={false}
        onSearch={onSearch}
        options={options}
        className="autocomplete-custom w-100 prescription-empty-line-draft-search"
        {...popupProps}
        dropdownRender={renderPrescriptionDropdown}
        open={row ? row.searchOpen : localOpen}
        onDropdownVisibleChange={open => {
          (row?.setSearchOpen || setLocalOpen)(open);
          popupProps.onDropdownVisibleChange?.(open);
        }}
        defaultActiveFirstOption={true}
        onSelect={onSelect}
        onInputKeyDown={event => {
          if (event.key === 'Escape') (row?.setSearchOpen || setLocalOpen)(false);
          // Let Select commit its highlighted result, including after arrow navigation.
          const activeId = event.currentTarget.getAttribute('aria-activedescendant');
          const activeOption = activeId && document.getElementById(activeId);
          if (event.key === 'Enter' && activeOption && activeOption.getAttribute('aria-disabled') !== 'true' && activeOption.textContent !== 'FREQUENTLY USED') return;
          onInputKeyDown(event);
        }}
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
  useTesseractUi = false,
}) {
  // Two UI modes only: the Tesseract shell (PrescriptionNew) always uses the
  // inline empty-line draft row; the classic UI never does. The old GB
  // tp-config `newEmptyLineUI` gate is gone.
  const isEnabled = Boolean(useTesseractUi);
  const [draftName, setDraftName] = useState("");
  const [removingRowKeys, setRemovingRowKeys] = useState([]);
  const latestRowsRef = useRef([]);
  const rowUiKeysRef = useRef(new WeakMap());
  const rowRemovalTimersRef = useRef([]);
  const draftInputRef = useRef(null);
  const focusAfterCommitRef = useRef(false);

  useEffect(() => {
    if (!focusAfterCommitRef.current) return;
    // rc-select restores focus after a popup mouse-down. Move focus after
    // that queued restoration; this effect already runs after the row mounts.
    const timer = setTimeout(() => {
      if (focusNewPrescriptionRow(draftInputRef.current)) focusAfterCommitRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [rows]);

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
      if (item[ROW_UI_KEY]) return item[ROW_UI_KEY];
      const key = rowUiKeysRef.current.get(item) || `${rowKeyPrefix}-${item.unique_id || uuidv4()}`;
      rowUiKeysRef.current.set(item, key);
      if (Object.isExtensible(item)) item[ROW_UI_KEY] = key;
      return key;
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
    focusAfterCommitRef.current = true;

    if (commitRow) {
      const result = commitRow(sourceRow, name);

      if (result === false) {
        focusAfterCommitRef.current = false;
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
