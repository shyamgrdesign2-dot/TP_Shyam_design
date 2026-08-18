import React, { useState, useEffect } from "react";
import { Button, InputBox, Dropdown, SegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import {
  createCustomInvestigationGroup,
  createCustomInvestigation,
} from "../api/services/ApiCustomInvestigation";
import { useInvestigationFieldsState } from "./investigationFields/useInvestigationFieldsState";
import InvestigationFields from "./investigationFields/InvestigationFields";
import styles from "./InlineInvestigationPanel.module.css";

/**
 * "Can't find it, create it" flow for hospital-scoped custom investigations
 * (PRD §11-12), rendered INSIDE LabParams.js's own DOM as a slide-in panel —
 * deliberately not Tesseract's `Drawer` molecule. That component portals its
 * overlay at a z-index (800) calibrated for owning a full page; LabParams
 * already renders inside an antd Drawer (z-index 1000+), so a nested
 * Tesseract Drawer would render invisibly underneath it. Staying in this
 * component's own DOM subtree (position: absolute inside the relatively-
 * positioned LabParams root) means there's no separate stacking context to
 * lose — it always renders on top of the table it's anchored to, in the same
 * tab, same drawer.
 */
const InlineInvestigationPanel = ({
  open,
  onClose,
  initialName = "",
  hmid,
  createdBy,
  existingGroups = [],
  masterList = [],
  onCreated,
}) => {
  const [groupMode, setGroupMode] = useState(existingGroups.length > 0 ? "existing" : "new");
  const [selectedGroupId, setSelectedGroupId] = useState(existingGroups[0]?.id ?? "");
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fields = useInvestigationFieldsState({ name: initialName }, masterList);
  const groupOptions = existingGroups.map((g) => ({ value: g.id, label: g.name }));

  const isGroupValid = groupMode === "existing" ? selectedGroupId !== "" : newGroupName.trim().length > 0;
  const canSubmit = fields.isValid && isGroupValid && !submitting;

  const resetForm = () => {
    fields.reset();
    setGroupMode(existingGroups.length > 0 ? "existing" : "new");
    setSelectedGroupId(existingGroups[0]?.id ?? "");
    setNewGroupName("");
  };

  // This component stays mounted (renders null when closed) rather than being
  // torn down, so state set once at initial mount would otherwise go stale —
  // e.g. defaulting to "New group" forever if it first opened before
  // existingGroups had loaded. Re-sync everything, including the search-term
  // name prefill, every time it's actually opened rather than only on mount.
  useEffect(() => {
    if (!open) return;
    resetForm();
    fields.setName(initialName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let groupId = selectedGroupId;
      let groupName = existingGroups.find((g) => g.id === selectedGroupId)?.name || "";

      if (groupMode === "new") {
        const created = await createCustomInvestigationGroup({
          hmid,
          name: newGroupName.trim(),
          createdBy,
        });
        groupId = created?.id;
        groupName = newGroupName.trim();
      }

      const payload = fields.toPayload();
      const created = await createCustomInvestigation({
        hmid,
        groupId,
        ...payload,
        createdBy,
      });

      onCreated?.({
        reportName: groupName,
        testName: payload.name,
        value: "",
        units: payload.unit,
        arrowDirection: "",
        resultType: payload.resultType,
        dropdownOptions: payload.dropdownOptions,
        refRange: {
          isConditional: payload.referenceRanges.some((r) => r.gender !== "ALL"),
          ranges: payload.referenceRanges,
        },
        isCustom: true,
        id: created?.id,
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} />
      <div className={styles.panel} role="dialog" aria-label="Create Custom Investigation">
        <div className={styles.header}>
          <span className={styles.title}>Create Custom Investigation</span>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Group</span>
            <SegmentedControl
              size="sm"
              options={[
                { value: "existing", label: "Existing group" },
                { value: "new", label: "New group" },
              ]}
              value={groupMode}
              onValueChange={setGroupMode}
              disabled={existingGroups.length === 0}
            />
            {groupMode === "existing" ? (
              <Dropdown
                label=""
                placeholder="Select a group"
                options={groupOptions}
                value={selectedGroupId}
                onChange={setSelectedGroupId}
              />
            ) : (
              <InputBox
                fullWidth
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Hormonal Profile"
              />
            )}
          </div>

          <InvestigationFields fields={fields} />
        </div>

        <div className={styles.footer}>
          <Button variant="outline" theme="neutral" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Create Investigation
          </Button>
        </div>
      </div>
    </>
  );
};

export default InlineInvestigationPanel;
