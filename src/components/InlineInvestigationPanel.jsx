import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  InputBox,
  Dropdown,
  SegmentedControl,
  Alert,
  Drawer,
  DrawerContent,
} from "@dhspl-tatvacare/tesseract-ui";
import {
  createCustomInvestigationGroup,
  createCustomInvestigation,
  updateCustomInvestigation,
} from "../api/services/ApiCustomInvestigation";
import { useInvestigationFieldsState } from "./investigationFields/useInvestigationFieldsState";
import { useDuplicateCheck } from "./investigationFields/useDuplicateCheck";
import InvestigationFields from "./investigationFields/InvestigationFields";
import styles from "./InlineInvestigationPanel.module.css";

const extractErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";

/**
 * Shared create/edit drawer for hospital-scoped custom investigations.
 * Used from LabParams ("Can't find it") and InvestigationSettingsPage
 * (+ New group / + Add investigation / Edit).
 *
 * Uses Tesseract Drawer. Overlay/content z-index is raised in the CSS module
 * so the portal stacks above antd LabParams drawers (z-index 1000/1100).
 *
 * There is no create-empty-group endpoint — creating a new group always
 * creates its first investigation in the same call.
 */
const InlineInvestigationPanel = ({
  open,
  onClose,
  initialName = "",
  existingGroups = [],
  onCreated,
  /** When set, Existing-group dropdown is locked to this group. */
  fixedGroupId,
  fixedGroupName,
  /** "new" for + New group; "existing" otherwise. */
  defaultGroupMode,
  /** When set, form is edit mode (group locked; PUT investigation). */
  editing = null,
}) => {
  const isEditing = !!editing;
  const groupLocked = isEditing || !!fixedGroupId;

  const resolvedDefaultMode = useMemo(() => {
    if (isEditing || fixedGroupId) return "existing";
    if (defaultGroupMode === "new" || defaultGroupMode === "existing") return defaultGroupMode;
    return existingGroups.length > 0 ? "existing" : "new";
  }, [isEditing, fixedGroupId, defaultGroupMode, existingGroups.length]);

  const [groupMode, setGroupMode] = useState(resolvedDefaultMode);
  const [selectedGroupId, setSelectedGroupId] = useState(
    fixedGroupId || existingGroups[0]?.id || ""
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fields = useInvestigationFieldsState(
    editing
      ? {
          name: editing.name,
          unit: editing.unit,
          resultType: editing.resultType,
          dropdownOptions: editing.dropdownOptions,
          referenceRanges: editing.referenceRanges,
        }
      : { name: initialName }
  );
  const duplicateCheck = useDuplicateCheck(fields.name, {
    skip: isEditing && fields.name === editing.name,
  });

  const groupOptions = useMemo(() => {
    const opts = existingGroups.map((g) => ({ value: g.id, label: g.name }));
    if (fixedGroupId && !opts.some((o) => String(o.value) === String(fixedGroupId))) {
      opts.unshift({
        value: fixedGroupId,
        label: fixedGroupName || "Selected group",
      });
    }
    return opts;
  }, [existingGroups, fixedGroupId, fixedGroupName]);

  const isGroupValid =
    isEditing ||
    (groupMode === "existing" ? selectedGroupId !== "" : newGroupName.trim().length > 0);
  const canSubmit =
    fields.isValid && isGroupValid && duplicateCheck.status !== "blocked" && !submitting;

  const resetForm = () => {
    fields.reset();
    setGroupMode(resolvedDefaultMode);
    setSelectedGroupId(fixedGroupId || existingGroups[0]?.id || "");
    setNewGroupName("");
    setSubmitError("");
  };

  // Re-sync when opened — create flows need a fresh form; edit remounts via
  // `key` with initial editing values, so do not call reset() there.
  useEffect(() => {
    if (!open) return;
    setSubmitError("");
    if (editing) {
      setGroupMode("existing");
      setSelectedGroupId(fixedGroupId || editing.groupId || "");
      return;
    }
    setGroupMode(resolvedDefaultMode);
    setSelectedGroupId(fixedGroupId || existingGroups[0]?.id || "");
    setNewGroupName("");
    fields.reset();
    fields.setName(initialName || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, fixedGroupId, defaultGroupMode, initialName]);

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) handleClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = fields.toPayload();

      if (isEditing) {
        await updateCustomInvestigation({ id: editing.id, ...payload });
        onCreated?.({ ...payload, id: editing.id, customTestId: editing.id, isCustom: true });
        resetForm();
        onClose?.();
        return;
      }

      let groupId = selectedGroupId;
      let groupName =
        existingGroups.find((g) => String(g.id) === String(selectedGroupId))?.name ||
        fixedGroupName ||
        "";
      let created;

      if (groupMode === "new") {
        const res = await createCustomInvestigationGroup({
          name: newGroupName.trim(),
          investigations: [payload],
        });
        groupId = res.group?.id;
        groupName = res.group?.name || newGroupName.trim();
        created = res.investigations?.[0];
      } else {
        created = await createCustomInvestigation({
          groupId: fixedGroupId || groupId,
          ...payload,
        });
        if (fixedGroupId) {
          groupId = fixedGroupId;
          groupName = fixedGroupName || groupName;
        }
      }

      onCreated?.({
        reportName: groupName,
        testName: payload.name,
        value: "",
        units: payload.unit || "",
        arrowDirection: "",
        resultType: payload.resultType,
        dropdownOptions: payload.dropdownOptions,
        refRange: {
          isConditional: (payload.referenceRanges || []).some((r) => r.gender !== "all"),
          ranges: payload.referenceRanges || [],
        },
        isCustom: true,
        customTestId: created?.id,
        id: created?.id,
      });
      resetForm();
      onClose?.();
    } catch (error) {
      setSubmitError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEditing ? "Edit Investigation" : "Create Custom Investigation";
  const submitLabel = isEditing ? "Save Changes" : "Create Investigation";
  const showGroupToggle = !isEditing;
  const dropdownDisabled = groupLocked || (groupMode === "existing" && !!fixedGroupId);

  return (
    <div className={styles.drawerStack}>
      <Drawer open={!!open} onOpenChange={handleOpenChange}>
        <DrawerContent
          side="right"
          width="40%"
          title={title}
          showClose
          className={styles.drawerContent}
          footer={
            <div className={styles.footer}>
              <Button
                variant="outline"
                theme="neutral"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                theme="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
                className={styles.primaryCta}
              >
                {submitLabel}
              </Button>
            </div>
          }
        >
          <div className={styles.body}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Group</span>
              {showGroupToggle && (
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: "existing", label: "Existing group" },
                    { value: "new", label: "New group" },
                  ]}
                  value={groupMode}
                  onValueChange={setGroupMode}
                  disabled={existingGroups.length === 0 && !fixedGroupId}
                />
              )}
              {isEditing || groupMode === "existing" ? (
                <Dropdown
                  label=""
                  placeholder="Select a group"
                  options={groupOptions}
                  value={isEditing ? fixedGroupId || selectedGroupId : selectedGroupId}
                  onChange={setSelectedGroupId}
                  disabled={isEditing || dropdownDisabled}
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

            <InvestigationFields fields={fields} duplicateCheck={duplicateCheck} />

            {submitError && (
              <Alert status="error" title={isEditing ? "Couldn't save" : "Couldn't create investigation"}>
                {submitError}
              </Alert>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default InlineInvestigationPanel;
