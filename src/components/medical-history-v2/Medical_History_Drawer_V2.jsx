import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { isMobile } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";
import {
  Checkbox,
  ConfirmDialog,
  DatePicker,
  Divider,
  Drawer,
  DrawerContent,
  Dropdown,
  Button,
  InputBox,
  SectionCard,
  SegmentedControl,
  Skeleton,
  TesseractThemeProvider,
  Toggle,
  Tooltip,
  TPIcon,
} from "@dhspl-tatvacare/tesseract-ui";
// eslint-disable-next-line import/no-unresolved
import "@dhspl-tatvacare/tesseract-ui/styles.css";

import { listSectionwithTag, addTag } from "../../redux/medicalhistorySlice";
import CashManagerContext from "../../context/CashManagerContext";
import {
  ensureFiveSections,
  mergeMedicalHistoryTagsBySection,
} from "../../utils/medicalHistoryUtils";

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from "./Medical_History_Drawer_V2.module.css";

const SECTION_TITLES = {
  1: "Lifestyle",
  2: "Medical Condition",
  3: "Family History",
  4: "Allergies",
  5: "Surgical History",
  additional: "Additional Notes",
};

const SECTION_ICONS = {
  1: "health-care",
  2: "clipboard-activity",
  3: "profile-2user",
  4: "mask",
  5: "surgical-scissors-02",
  additional: "note-2",
};

const MIN_SUGGESTED_COUNT = 8;

const DEFAULT_SUGGESTIONS = {
  1: ["Diet", "Smoking", "Alcohol", "Exercise", "Tobacco (Chewing)", "Sleep Disorder", "Stress", "Caffeine", "Sedentary Lifestyle", "Drug Use"],
  2: ["Diabetes", "Hypertension", "Asthma", "Thyroid", "PCOD", "Anemia", "Heart Disease", "Cholesterol", "Migraine", "Arthritis"],
  3: ["Diabetes", "Hypertension", "Heart Disease", "Cancer", "Asthma", "Thyroid Disorder", "Stroke", "Kidney Disease", "Arthritis", "Mental Illness"],
  4: ["Dust", "Pollen", "Penicillin", "Sulfa Drugs", "Aspirin", "Latex", "Milk", "Eggs", "Shellfish", "Soy"],
  5: ["Appendectomy", "Cesarean Section", "Cataract Surgery", "Hernia Repair", "Tonsillectomy", "Knee Replacement", "Hip Replacement", "Gallbladder Removal", "Bypass Surgery", "Fracture Fixation"],
};

const FIELD_TEMPLATES = {
  2: { since: "", status: "Active", medication: "", note: "" },
  4: { since: "", status: "Active", note: "" },
  3: { relationship: "", note: "" },
  1: { since: "", status: "Active", note: "" },
  5: { since: "", status: "Active", note: "", dateType: "year", date: "" },
};

const SINCE_UNITS = [
  { singular: "Hour", plural: "Hour(s)" },
  { singular: "Day", plural: "Day(s)" },
  { singular: "Week", plural: "Week(s)" },
  { singular: "Month", plural: "Month(s)" },
  { singular: "Year", plural: "Year(s)" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const MEDICATION_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const RELATIONSHIP_OPTIONS = [
  "Father", "Mother", "Brother", "Sister",
  "Grandfather", "Grandmother", "Uncle", "Aunt",
  "Son", "Daughter", "Spouse", "Other",
].map((r) => ({ value: r, label: r }));

const ENABLE_OPTIONS = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

const DATE_TYPE_OPTIONS = [
  { value: "year", label: "Year Only" },
  { value: "full", label: "Full Date" },
];

const ADD_CUSTOM_LABELS = {
  1: "a custom lifestyle",
  2: "a custom medical condition",
  3: "a custom family history",
  4: "a custom allergy",
  5: "a custom surgical history",
};

const SECTION_CONFIG_KEY = "mh_v2_section_config";

function loadSectionConfig() {
  try {
    const stored = localStorage.getItem(SECTION_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function SinceInput({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const buildSuggestions = (numStr) => {
    const num = parseInt(numStr, 10);
    return SINCE_UNITS.map((u) =>
      `${numStr} ${num <= 1 ? u.singular : u.plural}`
    );
  };

  const handleChange = (e) => {
    const numericOnly = e.target.value.replace(/[^0-9]/g, "");
    setLocalValue(numericOnly);
    if (numericOnly) {
      setSuggestions(buildSuggestions(numericOnly));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange("");
    }
  };

  const handleFocus = (e) => {
    e.target.select();
    if (value) {
      const numMatch = (value || "").match(/^(\d+)/);
      if (numMatch) {
        setSuggestions(buildSuggestions(numMatch[1]));
        setShowSuggestions(true);
      }
    } else {
      setSuggestions(["1 Hour", "1 Day", "1 Week", "1 Month", "1 Year"]);
      setShowSuggestions(true);
    }
  };

  const hasClearable = !!localValue;

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (localValue && /^\d+$/.test(localValue)) {
        const num = parseInt(localValue, 10);
        const defaultVal = `${localValue} ${num <= 1 ? "Day" : "Day(s)"}`;
        setLocalValue(defaultVal);
        onChange(defaultVal);
      }
    }, 150);
  };

  const handleSelect = (val) => {
    setLocalValue(val);
    onChange(val);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalValue("");
    onChange("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className={styles.sinceWrap} ref={wrapRef}>
      <div className={styles.sinceInputRow}>
        <input
          className={styles.sinceInput}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Select duration"
          type="text"
          inputMode="numeric"
        />
      </div>
      {showSuggestions && (suggestions.length > 0 || hasClearable) && (
        <div className={styles.sinceSuggestions}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={styles.sinceSuggestionItem}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              type="button"
            >
              {s}
            </button>
          ))}
          {hasClearable && (
            <>
              <div className={styles.sinceSuggestionDivider} />
              <button
                className={`${styles.sinceSuggestionItem} ${styles.sinceClearOption}`}
                onMouseDown={handleClear}
                type="button"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedChipWithTooltip({ tag, enable, realIdx, selected, subtextParts, tooltipContent, onTagClick, onDelete }) {
  const titleRef = useRef(null);
  const subtextRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const titleEl = titleRef.current;
    const subtextEl = subtextRef.current;
    const truncated =
      (titleEl && titleEl.scrollWidth > titleEl.clientWidth) ||
      (subtextEl && subtextEl.scrollWidth > subtextEl.clientWidth);
    setIsTruncated(truncated);
  }, []);

  useEffect(() => {
    checkTruncation();
  }, [tag.title, subtextParts, checkTruncation]);

  const chip = (
    <div
      className={`${styles.selectedChip} ${styles.chipSlideIn}`}
      data-enable={enable || ""}
      data-selected={String(selected)}
      onClick={onTagClick}
      onMouseEnter={checkTruncation}
    >
      <div className={styles.selectedChipBody}>
        <div ref={titleRef} className={styles.selectedChipTitle}>{tag.title}</div>
        {subtextParts.length > 0 && (
          <div ref={subtextRef} className={styles.selectedChipSubtext}>
            {subtextParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className={styles.chipDot}> | </span>}
                {part}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <button
        className={styles.selectedChipClose}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Remove ${tag.title}`}
      >
        &times;
      </button>
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      side="top"
      variant="dark"
      arrow
      maxWidth={360}
      disabled={!isTruncated}
    >
      {chip}
    </Tooltip>
  );
}

function UnselectedChipWithTooltip({ tag, onClick }) {
  const titleRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const el = titleRef.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => { checkTruncation(); }, [checkTruncation]);

  return (
    <Tooltip
      content={tag.title}
      side="top"
      variant="dark"
      arrow
      disabled={!isTruncated}
    >
      <div
        className={styles.tagBadge}
        data-enable=""
        data-selected="false"
        onClick={onClick}
        onMouseEnter={checkTruncation}
      >
        <div ref={titleRef} className={styles.tagTitle}>{tag.title}</div>
      </div>
    </Tooltip>
  );
}

function SectionPanel({
  section,
  sectionIndex,
  icon,
  selectedTag,
  crossSearchQuery,
  onTagClick,
  onEnableToggle,
  onDeleteTag,
  onNoKnownHistory,
  onSectionExpand,
  onAddCustom,
}) {
  const allTags = (section.tags || []).filter((t) => !t.delete);
  const selectedTags = allTags.filter(
    (t) => t.enable === "Y" || t.enable === "N"
  );
  const unselectedTags = allTags.filter(
    (t) => t.enable !== "Y" && t.enable !== "N"
  );

  const isExpanded = section.isExpand !== false;

  const [showAllChips, setShowAllChips] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const [sortMode, setSortMode] = useState(null);
  const chipsRef = useRef(null);

  const query = (crossSearchQuery || "").trim().toLowerCase();
  const filteredUnselected = useMemo(() => {
    let list = query
      ? unselectedTags.filter((t) =>
          (t.title || "").toLowerCase().includes(query)
        )
      : [...unselectedTags];

    if (sortMode === "az") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortMode === "za") {
      list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else if (sortMode === "freq") {
      list.sort((a, b) => (b.pms_default || 0) - (a.pms_default || 0));
    }
    return list;
  }, [unselectedTags, query, sortMode]);

  const hasNoExactMatch =
    query &&
    !allTags.some((t) => (t.title || "").toLowerCase() === query);

  useEffect(() => {
    if (!chipsRef.current || showAllChips) return;
    const container = chipsRef.current;
    const maxH = 86;
    if (container.scrollHeight > maxH + 10) {
      const children = Array.from(container.children);
      let hidden = 0;
      for (const child of children) {
        if (child.offsetTop + child.offsetHeight > maxH) hidden++;
      }
      setOverflowCount(hidden);
    } else {
      setOverflowCount(0);
    }
  }, [filteredUnselected, showAllChips, crossSearchQuery]);

  const getRealIndex = (tag) => section.tags.indexOf(tag);

  const isSelected = (realIndex) =>
    selectedTag?.sectionIndex === sectionIndex &&
    selectedTag?.tagIndex === realIndex;

  const needsTooltip = (title) => title && title.length > 28;

  const buildSubtext = (tag) => {
    const parts = [];
    parts.push(tag.enable === "Y" ? "Yes" : "No");
    if (tag.enable === "N") return parts;
    if (tag.since) parts.push(tag.since);
    if (tag.status) parts.push(tag.status);
    if (tag.relation) parts.push(tag.relation);
    if (tag.medication === "Y" || tag.medication === "Yes") parts.push("On Medication");
    if (tag.note) parts.push(tag.note);
    return parts;
  };

  const buildTooltipContent = (tag, sectionTitle) => {
    const rows = [];
    rows.push({ label: "Enabled", value: tag.enable === "Y" ? "Yes" : "No" });
    if (tag.enable === "Y") {
      if (tag.status) rows.push({ label: "Status", value: tag.status });
      if (tag.since) rows.push({ label: "Since", value: tag.since });
      if (tag.relationship) rows.push({ label: "Relation", value: tag.relationship });
      if (tag.medication === "Y" || tag.medication === "Yes")
        rows.push({ label: "Medication", value: "Yes" });
      else if (tag.medication === "N" || tag.medication === "No")
        rows.push({ label: "Medication", value: "No" });
      if (tag.note) rows.push({ label: "Note", value: tag.note });
    }
    return (
      <div className={styles.chipTooltip}>
        <div className={styles.chipTooltipTitle}>
          {sectionTitle && <>{sectionTitle}: </>}{tag.title}
        </div>
        <div className={styles.chipTooltipRows}>
          {rows.map((r, i) => (
            <div key={i} className={styles.chipTooltipRow}>
              <span className={styles.chipTooltipBullet} />
              <span className={styles.chipTooltipLabel}>{r.label}:</span>
              <span className={styles.chipTooltipValue}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSelectedTag = (tag) => {
    const realIdx = getRealIndex(tag);
    const enable = tag.enable;
    const subtextParts = buildSubtext(tag);

    return (
      <SelectedChipWithTooltip
        key={tag.unique_id || tag.tmmhst_id || realIdx}
        tag={tag}
        enable={enable}
        realIdx={realIdx}
        selected={isSelected(realIdx)}
        subtextParts={subtextParts}
        tooltipContent={buildTooltipContent(tag, section.title)}
        onTagClick={() => onTagClick(sectionIndex, realIdx)}
        onDelete={() => onDeleteTag(sectionIndex, realIdx)}
      />
    );
  };

  const renderUnselectedTag = (tag) => {
    const realIdx = getRealIndex(tag);
    return (
      <UnselectedChipWithTooltip
        key={tag.unique_id || tag.tmmhst_id || realIdx}
        tag={tag}
        onClick={() => onTagClick(sectionIndex, realIdx)}
      />
    );
  };

  const addCustomLabel = ADD_CUSTOM_LABELS[section.tmmhs_id] || "+ Add as Custom";

  const sectionTitle = (
    <>
      {section.title}
      {selectedTags.length > 0 && !section.no_know_history && (
        <span className={styles.sectionCount}>{selectedTags.length}</span>
      )}
    </>
  );

  return (
    <div className={styles.sectionCardWrap}>
      <SectionCard
        title={sectionTitle}
        icon={icon || "health"}
        collapsible={!section.no_know_history}
        collapsed={section.no_know_history ? true : !isExpanded}
        onCollapsedChange={() => onSectionExpand(sectionIndex)}
        tone="violet"
        iconColor="var(--tesseract-violet-500)"
        divided
        headerActions={
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="sm"
              label="No known history"
              checked={section.no_know_history || false}
              onCheckedChange={(checked) =>
                onNoKnownHistory(sectionIndex, checked)
              }
            />
          </div>
        }
      >
        {!section.no_know_history && (
          <>
            {selectedTags.length > 0 ? (
              <div className={styles.tagGrid}>
                {selectedTags.map((tag) => renderSelectedTag(tag))}
              </div>
            ) : (
              <div className={styles.selectedTagsEmpty}>
                Select the chips below to add them here
              </div>
            )}

            {filteredUnselected.length > 0 && (
              <>
                <div className={styles.frequentlyUsedDivider}>
                  <span className={styles.frequentlyUsedLabel}>
                    {selectedTags.length > 0 ? "Frequently Used" : "Suggested"}
                  </span>
                  <Tooltip
                    content={sortMode === "az" ? "Sort applied: A to Z (click to switch to Z-A)" : sortMode === "za" ? "Sort applied: Z to A (click to remove sort)" : "Sort alphabetically (A to Z)"}
                    side="top"
                    variant="dark"
                    arrow
                  >
                    <button
                      className={styles.sortFilterBtn}
                      type="button"
                      data-active={String(!!sortMode)}
                      data-sort={sortMode || ""}
                      onClick={() => setSortMode(prev => prev === null ? "az" : prev === "az" ? "za" : null)}
                    >
                      <span className={styles.sortIcon} data-sort={sortMode || ""} />
                    </button>
                  </Tooltip>
                </div>
                <div className={styles.frequentlyUsedWrap}>
                  <div
                    ref={chipsRef}
                    className={`${styles.tagGrid} ${showAllChips ? "" : styles.frequentlyUsedChips}`}
                  >
                    {filteredUnselected.map((tag) => renderUnselectedTag(tag))}
                  </div>
                  {overflowCount > 0 && !showAllChips && (
                    <button
                      className={styles.showMoreOverlay}
                      onClick={() => setShowAllChips(true)}
                      type="button"
                    >
                      +{overflowCount} more
                    </button>
                  )}
                </div>
                {showAllChips && overflowCount > 0 && (
                  <button
                    className={styles.showMoreBtn}
                    onClick={() => setShowAllChips(false)}
                    type="button"
                  >
                    Show less
                    <span className={styles.showMoreArrow} data-expanded="true" />
                  </button>
                )}
              </>
            )}

            {hasNoExactMatch && (
              <button
                className={styles.addCustomBtn}
                onClick={() => onAddCustom(sectionIndex)}
                type="button"
              >
                <TPIcon name="add" size={16} variant="linear" family="arrow2" />
                <span className={styles.addCustomLabel}>
                  Add &ldquo;<strong>{crossSearchQuery}</strong>&rdquo; as {addCustomLabel}
                </span>
              </button>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

function DetailPanel({
  tag,
  tmmhs_id,
  sectionTitle,
  sectionIndex,
  tagIndex,
  onFieldChange,
  onEnableToggle,
}) {
  const isEnabled = tag.enable === "Y";

  const relationships = useMemo(
    () => (tag.relationship ? tag.relationship.split(", ").filter(Boolean) : []),
    [tag.relationship]
  );

  const handleRelationshipChange = (selected) => {
    onFieldChange(
      sectionIndex,
      tagIndex,
      "relationship",
      Array.isArray(selected) ? selected.join(", ") : selected || ""
    );
  };

  const dateValue = useMemo(() => {
    if (!tag.date) return null;
    if ((tag.dateType || "year") === "year") {
      const year = parseInt(tag.date, 10);
      return isNaN(year) ? null : new Date(year, 0, 1);
    }
    const d = new Date(tag.date);
    return isNaN(d.getTime()) ? null : d;
  }, [tag.date, tag.dateType]);

  const handleDateChange = useCallback((date) => {
    if (!date) {
      onFieldChange(sectionIndex, tagIndex, "date", "");
      return;
    }
    if (typeof date === "string") {
      onFieldChange(sectionIndex, tagIndex, "date", date);
      return;
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return;
    }
    if ((tag.dateType || "year") === "year") {
      onFieldChange(sectionIndex, tagIndex, "date", String(date.getFullYear()));
    } else {
      const iso = date.toISOString().split("T")[0];
      onFieldChange(sectionIndex, tagIndex, "date", iso);
    }
  }, [tag.dateType, sectionIndex, tagIndex, onFieldChange]);

  const handleSinceChange = useCallback((val) => {
    onFieldChange(sectionIndex, tagIndex, "since", val);
  }, [sectionIndex, tagIndex, onFieldChange]);

  const sectionIcon = SECTION_ICONS[tmmhs_id] || "health";

  return (
    <div>
      <div className={styles.detailHeader}>
        <span className={styles.detailHeaderIcon}>
          <TPIcon name={sectionIcon} size={20} variant="bulk" />
        </span>
        <div className={styles.detailHeaderText}>
          <div className={styles.detailSection}>{sectionTitle}</div>
          <Tooltip content={tag.title} side="bottom">
            <div className={styles.detailTagName}>{tag.title}</div>
          </Tooltip>
        </div>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.detailFields}>
          <div className={styles.fieldGroup} data-enable-value={tag.enable || "Y"}>
            <SegmentedControl
              options={ENABLE_OPTIONS}
              value={tag.enable || "Y"}
              onValueChange={(val) =>
                onEnableToggle(sectionIndex, tagIndex, val)
              }
              size="md"
              variant="block"
              theme="primary"
              fullWidth
            />
          </div>

          <Divider spacing={8} />

          {isEnabled && (
            <>
              {(tmmhs_id === 1 || tmmhs_id === 2 || tmmhs_id === 4) && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Status</span>
                  <SegmentedControl
                    options={STATUS_OPTIONS}
                    value={tag.status || "Active"}
                    onValueChange={(val) =>
                      onFieldChange(sectionIndex, tagIndex, "status", val)
                    }
                    size="md"
                    variant="block"
                    fullWidth
                  />
                </div>
              )}

              {(tmmhs_id === 1 || tmmhs_id === 2 || tmmhs_id === 4) && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Since</span>
                  <SinceInput
                    value={tag.since || ""}
                    onChange={handleSinceChange}
                  />
                </div>
              )}

              {tmmhs_id === 2 && (tag.status || "Active") === "Active" && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Medication</span>
                  <SegmentedControl
                    options={MEDICATION_OPTIONS}
                    value={tag.medication || ""}
                    onValueChange={(val) =>
                      onFieldChange(sectionIndex, tagIndex, "medication", val)
                    }
                    size="md"
                    variant="block"
                    fullWidth
                  />
                </div>
              )}

              {tmmhs_id === 3 && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Relationship</span>
                  <Dropdown
                    mode="multi"
                    chips
                    searchable
                    clearable
                    options={RELATIONSHIP_OPTIONS}
                    value={relationships}
                    onChange={handleRelationshipChange}
                    placeholder="Select relationship"
                    label=""
                    searchPlaceholder="Search..."
                    size="md"
                  />
                </div>
              )}

              {tmmhs_id === 5 && (
                <>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Date of Surgery</span>
                    <SegmentedControl
                      options={DATE_TYPE_OPTIONS}
                      value={tag.dateType || "year"}
                      onValueChange={(val) =>
                        onFieldChange(sectionIndex, tagIndex, "dateType", val)
                      }
                      size="sm"
                      variant="block"
                      fullWidth
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <DatePicker
                      mode={(tag.dateType || "year") === "year" ? "year" : "single"}
                      value={dateValue}
                      onChange={handleDateChange}
                      placeholder={
                        (tag.dateType || "year") === "year"
                          ? "Select year"
                          : "Select date"
                      }
                      size="md"
                      fullWidth
                    />
                  </div>
                </>
              )}

              {tmmhs_id === 5 && (
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Since</span>
                  <SinceInput
                    value={tag.since || ""}
                    onChange={handleSinceChange}
                  />
                </div>
              )}

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>
                  {tmmhs_id === 5 ? "Surgical History Remarks" : "Note"}
                </span>
                <textarea
                  className={styles.noteField}
                  value={tag.note || ""}
                  onChange={(e) =>
                    onFieldChange(sectionIndex, tagIndex, "note", e.target.value)
                  }
                  placeholder={
                    tmmhs_id === 5
                      ? "Enter surgical history remarks here"
                      : "Enter any specific notes here"
                  }
                  rows={3}
                />
              </div>
            </>
          )}

          {!isEnabled && (
            <div className={styles.detailEmpty}>
              <span className={styles.detailEmptyIcon}>
                <TPIcon name={sectionIcon} size={40} variant="bulk" />
              </span>
              <div className={styles.detailEmptyHeading}>Marked as No</div>
              <div className={styles.detailEmptySubtext}>
                This {sectionTitle.toLowerCase()} item is not applicable. Toggle to Yes above to add details.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableCustomizeRow({ id, icon, name, isVisible, onToggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={rowStyle} className={styles.customizeRow} {...attributes}>
      <span ref={setActivatorNodeRef} className={styles.dragHandle} {...listeners}>
        <svg viewBox="64 64 896 896" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z" />
        </svg>
      </span>
      <span className={styles.customizeRowIcon}>
        <TPIcon name={icon} size={16} variant="bulk" />
      </span>
      <span className={styles.customizeRowName}>{name}</span>
      <Toggle
        size="sm"
        color="primary"
        checked={isVisible}
        onCheckedChange={onToggleVisibility}
        ariaLabel={`Toggle ${name} visibility`}
      />
    </div>
  );
}

function MedicalHistoryDrawerV2({
  open,
  onOpenChange,
  onSave,
  initialActiveKey,
  hideMenstrualHistoryTab,
  overrideMedicalHistoryData,
  gynecOnly = false,
  initialGynecHistory,
  showVoiceRxModule,
}) {
  const { defaultList, loading } = useSelector((state) => state.medicalhistory);
  const dispatch = useDispatch();
  const { medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext);

  const [sections, setSections] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [crossSearchQuery, setCrossSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [additionalHistory, setAdditionalHistory] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [sectionConfig, setSectionConfig] = useState(() => {
    const stored = loadSectionConfig();
    return stored || { order: null, hidden: [] };
  });
  const isDirty = useRef(false);
  const initialSnapshot = useRef("");
  const detailKey = useRef(0);

  useEffect(() => {
    if (open) {
      dispatch(listSectionwithTag());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (!open || !defaultList?.length) return;

    const data2 = overrideMedicalHistoryData || medicalHistoryData || [];
    const base = defaultList ? JSON.parse(JSON.stringify(defaultList)) : [];
    const overlay = Array.isArray(data2) && data2.length > 0
      ? JSON.parse(JSON.stringify(data2))
      : [];

    let merged;
    if (overlay.length > 0) {
      merged = base.map((section) => {
        const overlaySection = overlay.find(
          (s) => Number(s?.tmmhs_id) === Number(section?.tmmhs_id)
        );
        if (!overlaySection) return section;
        return {
          ...section,
          ...overlaySection,
          tags: mergeMedicalHistoryTagsBySection(
            section?.tags || [],
            overlaySection?.tags || [],
            section?.tmmhs_id
          ),
        };
      });
    } else {
      merged = base;
    }

    const five = ensureFiveSections(merged);
    five.forEach((s) => {
      s.isExpand = true;
      (s.tags || []).forEach((t) => {
        if (!t.unique_id) t.unique_id = uuidv4();
      });
      const defaults = DEFAULT_SUGGESTIONS[s.tmmhs_id] || [];
      const existingTitles = new Set((s.tags || []).map((t) => (t.title || "").toLowerCase()));
      if (s.tags.length < MIN_SUGGESTED_COUNT) {
        for (const title of defaults) {
          if (s.tags.length >= MIN_SUGGESTED_COUNT) break;
          if (!existingTitles.has(title.toLowerCase())) {
            s.tags.push({
              tmmhst_id: 0,
              title,
              pms_default: 0,
              unique_id: uuidv4(),
            });
            existingTitles.add(title.toLowerCase());
          }
        }
      }
    });

    setSections(five);
    setCrossSearchQuery("");
    isDirty.current = false;
    initialSnapshot.current = JSON.stringify(five.map((s) => ({
      id: s.tmmhs_id,
      nkh: s.no_know_history || false,
      tags: (s.tags || []).filter((t) => t.enable === "Y" || t.enable === "N").map((t) => ({
        id: t.tmmhst_id, enable: t.enable, since: t.since, status: t.status,
        medication: t.medication, relationship: t.relationship, note: t.note, date: t.date,
      })),
    })));

    let firstSelected = null;
    for (let si = 0; si < five.length && !firstSelected; si++) {
      const tags = five[si].tags || [];
      for (let ti = 0; ti < tags.length; ti++) {
        if (tags[ti].enable === "Y" || tags[ti].enable === "N") {
          firstSelected = { sectionIndex: si, tagIndex: ti };
          break;
        }
      }
    }
    setSelectedTag(firstSelected);
    setHasExistingData(!!firstSelected);

    const overlayData = overrideMedicalHistoryData || medicalHistoryData || [];
    const overlayArr = Array.isArray(overlayData) ? overlayData : [];
    const additionalSection = overlayArr.find((s) => s?.additional_history != null);
    setAdditionalHistory(additionalSection?.additional_history || "");
  }, [open, defaultList, overrideMedicalHistoryData, medicalHistoryData]);

  const selectTagSmooth = useCallback((tag) => {
    detailKey.current += 1;
    setSelectedTag(tag);
  }, []);

  const handleTagClick = useCallback((sectionIndex, tagIndex) => {
    const currentTag = sections[sectionIndex]?.tags[tagIndex];
    if (!currentTag) return;

    const currentEnable = currentTag.enable;
    const isAlreadySelected = currentEnable === "Y" || currentEnable === "N";

    if (isAlreadySelected) {
      selectTagSmooth({ sectionIndex, tagIndex });
      return;
    }

    isDirty.current = true;
    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const tag = next[sectionIndex].tags[tagIndex];
      const tmmhs_id = next[sectionIndex].tmmhs_id;
      const template = FIELD_TEMPLATES[tmmhs_id] || FIELD_TEMPLATES[1];
      const updatedTag = { ...template, ...tag, enable: "Y" };
      next[sectionIndex].tags.splice(tagIndex, 1);
      next[sectionIndex].tags.push(updatedTag);
      return next;
    });

    const newTagIndex = sections[sectionIndex].tags.length - 1;
    selectTagSmooth({ sectionIndex, tagIndex: newTagIndex });
  }, [sections, selectTagSmooth]);

  const handleEnableToggle = useCallback((sectionIndex, tagIndex, forceValue) => {
    isDirty.current = true;
    const currentTag = sections[sectionIndex]?.tags[tagIndex];
    if (!currentTag) return;

    const currentEnable = currentTag.enable;
    const tmmhs_id = sections[sectionIndex].tmmhs_id;
    const template = FIELD_TEMPLATES[tmmhs_id] || FIELD_TEMPLATES[1];

    let newEnableState;
    if (forceValue) {
      newEnableState = forceValue;
    } else if (currentEnable === "Y") {
      newEnableState = "N";
    } else {
      newEnableState = "Y";
    }

    const wasUnselected = currentEnable !== "Y" && currentEnable !== "N";

    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const tag = next[sectionIndex].tags[tagIndex];

      if (wasUnselected) {
        const updatedTag = { ...template, ...tag, enable: newEnableState };
        next[sectionIndex].tags.splice(tagIndex, 1);
        next[sectionIndex].tags.push(updatedTag);
      } else {
        next[sectionIndex].tags[tagIndex].enable = newEnableState;
      }
      return next;
    });

    const newTagIndex = wasUnselected
      ? sections[sectionIndex].tags.length - 1
      : tagIndex;
    selectTagSmooth({ sectionIndex, tagIndex: newTagIndex });
  }, [sections]);

  const handleTagFieldChange = useCallback((sectionIndex, tagIndex, field, value) => {
    isDirty.current = true;
    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sectionIndex].tags[tagIndex][field] = value;
      return next;
    });
  }, []);

  const handleNoKnownHistory = useCallback((sectionIndex, checked) => {
    isDirty.current = true;
    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sectionIndex].no_know_history = checked;
      return next;
    });
  }, []);

  const handleSectionExpand = useCallback((sectionIndex) => {
    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sectionIndex].isExpand = !next[sectionIndex].isExpand;
      return next;
    });
  }, []);

  const handleAddCustom = useCallback((sectionIndex) => {
    const title = crossSearchQuery.trim();
    if (!title) return;
    isDirty.current = true;

    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const tmmhs_id = next[sectionIndex].tmmhs_id;
      const template = FIELD_TEMPLATES[tmmhs_id] || FIELD_TEMPLATES[1];
      next[sectionIndex].tags.push({
        tmmhst_id: 0,
        title: title,
        pms_default: 0,
        enable: "Y",
        unique_id: uuidv4(),
        ...template,
      });
      return next;
    });

    const newTagIndex = sections[sectionIndex]?.tags?.length || 0;
    selectTagSmooth({ sectionIndex, tagIndex: newTagIndex });
  }, [crossSearchQuery, sections, selectTagSmooth]);

  const handleDeleteTag = useCallback((sectionIndex, tagIndex) => {
    isDirty.current = true;
    setSections((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[sectionIndex].tags[tagIndex].delete = true;
      next[sectionIndex].tags[tagIndex].enable = "-";
      return next;
    });
    setSelectedTag((prev) => {
      if (prev?.sectionIndex === sectionIndex && prev?.tagIndex === tagIndex) return null;
      return prev;
    });
  }, []);

  const doSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const medicalHistory = sections.map((section) => ({
        title: section.title || SECTION_TITLES[section.tmmhs_id],
        tmmhs_id: section.tmmhs_id,
        no_know_history: section.no_know_history || false,
        tags: section.no_know_history
          ? []
          : (section.tags || [])
              .filter((t) => !t.delete && (t.enable === "Y" || t.enable === "N"))
              .map((t) => ({
                tmmhst_id: t.tmmhst_id || 0,
                title: (t.title || "").trim(),
                pms_default: t.pms_default ?? 0,
                enable: t.enable || "Y",
                note: t.note || "",
                since: t.since || "",
                status: t.status ?? "",
                medication: t.medication || "",
                relationship: t.relationship || "",
                dateType: t.dateType || "",
                date: t.date ?? "",
              })),
        tmpmh_remarks: section.tmpmh_remarks ?? "",
      }));

      for (const section of medicalHistory) {
        const newTags = section.tags.filter((t) => !t.tmmhst_id || t.tmmhst_id === 0);
        if (newTags.length > 0) {
          try {
            const result = await dispatch(
              addTag({
                tmmhs_id: section.tmmhs_id,
                title: section.title,
                tags: section.tags.map((t) => ({
                  tmmhst_id: t.tmmhst_id || 0,
                  title: t.title,
                  pms_default: t.pms_default ?? 0,
                })),
              })
            ).unwrap();
            if (result?.tags) {
              for (const tag of section.tags) {
                if (!tag.tmmhst_id || tag.tmmhst_id === 0) {
                  const match = result.tags.find(
                    (r) => r.title?.trim().toLowerCase() === tag.title?.trim().toLowerCase()
                  );
                  if (match) tag.tmmhst_id = match.tmmhst_id;
                }
              }
            }
          } catch (e) {
            console.warn("[MedicalHistoryV2] addTag failed", section.tmmhs_id, e);
          }
        }
      }

      if (additionalHistory.trim()) {
        medicalHistory.push({
          title: "Additional History",
          additional_history: additionalHistory.trim(),
        });
      }

      if (typeof setMedicalHistoryData === "function") {
        setMedicalHistoryData(medicalHistory);
      }
      if (onSave) onSave(medicalHistory);
    } finally {
      setSaving(false);
    }
  }, [saving, sections, additionalHistory, dispatch, setMedicalHistoryData, onSave]);

  const handleSave = useCallback(async () => {
    await doSave();
    onOpenChange(false);
  }, [doSave, onOpenChange]);

  const handleDrawerClose = useCallback((newOpen) => {
    if (!newOpen) {
      if (isDirty.current) {
        setShowConfirm(true);
      } else {
        onOpenChange(false);
      }
    }
  }, [onOpenChange]);

  const handleConfirmSave = useCallback(async () => {
    setShowConfirm(false);
    await doSave();
    onOpenChange(false);
  }, [doSave, onOpenChange]);

  const handleConfirmDiscard = useCallback(() => {
    setShowConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const hiddenSet = useMemo(() => new Set(sectionConfig.hidden || []), [sectionConfig.hidden]);

  const displayOrder = useMemo(() => {
    if (!sections.length) return [];
    const order = sectionConfig.order || [...sections.map((s) => s.tmmhs_id), "additional"];
    return order
      .map((id) => {
        if (id === "additional") return "additional";
        const idx = sections.findIndex((s) => s.tmmhs_id === id);
        return idx !== -1 ? idx : null;
      })
      .filter((v) => v !== null);
  }, [sectionConfig.order, sections]);

  const updateSectionConfig = useCallback((updater) => {
    setSectionConfig((prev) => {
      const next = updater(prev);
      try { localStorage.setItem(SECTION_CONFIG_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    updateSectionConfig((prev) => {
      const currentOrder = prev.order || [...sections.map((s) => s.tmmhs_id), "additional"];
      const oldIndex = currentOrder.indexOf(active.id);
      const newIndex = currentOrder.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, order: arrayMove(currentOrder, oldIndex, newIndex) };
    });
  }, [sections, updateSectionConfig]);

  const toggleSectionVisibility = useCallback((tmmhsId) => {
    updateSectionConfig((prev) => {
      const hidden = new Set(prev.hidden || []);
      if (hidden.has(tmmhsId)) hidden.delete(tmmhsId);
      else hidden.add(tmmhsId);
      return { ...prev, hidden: Array.from(hidden) };
    });
  }, [updateSectionConfig]);

  const resetSectionConfig = useCallback(() => {
    updateSectionConfig(() => ({ order: null, hidden: [] }));
  }, [updateSectionConfig]);

  const selectedTagData = useMemo(() => {
    if (!selectedTag) return null;
    const section = sections[selectedTag.sectionIndex];
    if (!section) return null;
    const tag = section.tags?.[selectedTag.tagIndex];
    if (!tag || tag.delete) return null;
    return { tag, tmmhs_id: section.tmmhs_id, sectionTitle: section.title };
  }, [selectedTag, sections]);

  const showDetail = selectedTagData && (selectedTagData.tag.enable === "Y" || selectedTagData.tag.enable === "N");

  if (gynecOnly) return null;

  return (
    <TesseractThemeProvider colorScheme="light">
      <Drawer open={open} onOpenChange={handleDrawerClose}>
        <DrawerContent
          className={styles.drawerShell}
          width={isMobile ? "full" : "85%"}
          title="Medical History"
          bodyPadding={0}
          showClose
          action={
            <div className={styles.headerActions}>
              <Tooltip
                trigger="click"
                variant="light"
                arrow
                side="bottom"
                align="end"
                sideOffset={8}
                maxWidth={380}
                open={showCustomize}
                onOpenChange={setShowCustomize}
                interactive
                content={
                  <div className={styles.customizePopover}>
                    <div className={styles.customizePanelHeader}>
                      <span className={styles.customizePanelTitle}>Customize Medical History</span>
                      <Button
                        variant="link"
                        theme="warning"
                        size="sm"
                        onClick={resetSectionConfig}
                        className={styles.customizePanelReset}
                      >
                        Reset
                      </Button>
                    </div>
                    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                      <SortableContext
                        items={sectionConfig.order || [...sections.map((s) => s.tmmhs_id), "additional"]}
                        strategy={verticalListSortingStrategy}
                      >
                        {(sectionConfig.order || [...sections.map((s) => s.tmmhs_id), "additional"]).map((tmmhsId) => (
                          <SortableCustomizeRow
                            key={tmmhsId}
                            id={tmmhsId}
                            icon={SECTION_ICONS[tmmhsId] || "health"}
                            name={SECTION_TITLES[tmmhsId] || tmmhsId}
                            isVisible={!hiddenSet.has(tmmhsId)}
                            onToggleVisibility={() => toggleSectionVisibility(tmmhsId)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                }
              >
                <Button
                  variant="tonal"
                  theme={showCustomize ? "primary" : "neutral"}
                  size="md"
                  className={styles.headerSettingsBtn}
                  aria-label="Customize sections"
                >
                  <TPIcon name="setting" size={18} variant="linear" />
                </Button>
              </Tooltip>
              <Divider orientation="vertical" />
              <Button
                variant="solid"
                theme="primary"
                onClick={handleSave}
                loading={saving}
                size="md"
              >
                {hasExistingData ? "Save Changes" : "Save History"}
              </Button>
            </div>
          }
        >
          {loading ? (
            <div style={{ padding: "var(--tesseract-space-6)" }}>
              <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
              <div style={{ height: "var(--tesseract-space-4)" }} />
              <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
              <div style={{ height: "var(--tesseract-space-4)" }} />
              <Skeleton variant="rectangular" width="100%" height={120} radius="8" />
            </div>
          ) : (
            <div className={styles.drawerBody}>
              <div className={styles.leftPanel}>
                <div className={styles.searchBar}>
                  <InputBox
                    placeholder="Search across all sections..."
                    leftIcon={<TPIcon name="search" size={16} variant="linear" />}
                    size="md"
                    surface="muted"
                    value={crossSearchQuery}
                    onChange={(e) => setCrossSearchQuery(e.target.value)}
                    clearable={!!crossSearchQuery}
                    fullWidth
                  />
                </div>

                <div className={styles.sectionsScroll}>
                  {displayOrder.map((entry) => {
                    if (entry === "additional") {
                      if (hiddenSet.has("additional")) return null;
                      return (
                        <div key="additional" className={styles.sectionCardWrap}>
                          <SectionCard
                            title="Additional Notes"
                            icon="note-2"
                            tone="violet"
                            iconColor="var(--tesseract-violet-500)"
                            divided
                          >
                            <textarea
                              className={styles.additionalHistoryField}
                              value={additionalHistory}
                              onChange={(e) => setAdditionalHistory(e.target.value)}
                              placeholder="Type any additional medical history notes here..."
                              rows={4}
                            />
                          </SectionCard>
                        </div>
                      );
                    }
                    const sectionIndex = entry;
                    const section = sections[sectionIndex];
                    if (!section) return null;
                    const isHidden = hiddenSet.has(section.tmmhs_id);
                    if (isHidden) {
                      const hasPatientData = (section.tags || []).some(
                        (t) => !t.delete && (t.enable === "Y" || t.enable === "N")
                      );
                      if (!hasPatientData) return null;
                    }
                    return (
                      <SectionPanel
                        key={section.tmmhs_id}
                        section={section}
                        sectionIndex={sectionIndex}
                        icon={SECTION_ICONS[section.tmmhs_id]}
                        selectedTag={selectedTag}
                        crossSearchQuery={crossSearchQuery}
                        onTagClick={handleTagClick}
                        onEnableToggle={handleEnableToggle}
                        onNoKnownHistory={handleNoKnownHistory}
                        onSectionExpand={handleSectionExpand}
                        onAddCustom={handleAddCustom}
                        onDeleteTag={handleDeleteTag}
                      />
                    );
                  })}
                </div>
              </div>

              <div className={styles.rightPanel}>
                {showDetail ? (
                  <DetailPanel
                    key={detailKey.current}
                    tag={selectedTagData.tag}
                    tmmhs_id={selectedTagData.tmmhs_id}
                    sectionTitle={selectedTagData.sectionTitle}
                    sectionIndex={selectedTag.sectionIndex}
                    tagIndex={selectedTag.tagIndex}
                    onFieldChange={handleTagFieldChange}
                    onDelete={handleDeleteTag}
                    onEnableToggle={handleEnableToggle}
                  />
                ) : (
                  <div className={styles.rightPanelEmpty}>
                    <span className={styles.emptyIcon}>
                      <TPIcon name="health" size={48} variant="bulk" />
                    </span>
                    <div className={styles.emptyHeading}>No medical history selected</div>
                    <div className={styles.emptySubtext}>
                      Pick a condition, allergy, or lifestyle chip from the left to view and edit its details here.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="You may lose your changes"
        withDescription={false}
        callout="You have unsaved changes that will be lost. Would you like to save your medical history changes before leaving?"
        calloutTone="warning"
        calloutCustomIcon={<TPIcon name="danger" size={24} variant="bulk" />}
        calloutLines={5}
        primaryLabel="Save and Close"
        onPrimary={handleConfirmSave}
        primaryTheme="primary"
        secondaryLabel="Discard Changes"
        onSecondary={handleConfirmDiscard}
        secondaryTheme="error"
      />
    </TesseractThemeProvider>
  );
}

export default MedicalHistoryDrawerV2;
