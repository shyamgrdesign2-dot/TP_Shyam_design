import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerBody,
  InputBox,
  Empty,
  Alert,
  SegmentedControl,
  Dropdown,
  ConfirmDialog,
} from "@dhspl-tatvacare/tesseract-ui";
import LimsAccessBoundary from "./LimsAccessBoundary";
import {
  getCustomInvestigations,
  createCustomInvestigationGroup,
  updateCustomInvestigationGroup,
  deleteCustomInvestigationGroup,
  createCustomInvestigation,
  updateCustomInvestigation,
  deleteCustomInvestigation,
} from "../../api/services/ApiCustomInvestigation";
import { useInvestigationFieldsState } from "../../components/investigationFields/useInvestigationFieldsState";
import { useDuplicateCheck } from "../../components/investigationFields/useDuplicateCheck";
import InvestigationFields from "../../components/investigationFields/InvestigationFields";
import { getDecodedToken } from "../../utils/localStorage";
import styles from "./InvestigationSettingsPage.module.css";

const extractErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";

const DrawerFooterActions = ({ onCancel, onSubmit, submitting, disabled, label }) => (
  <div className={styles.footerActions}>
    <Button variant="outline" theme="neutral" onClick={onCancel} disabled={submitting}>
      Cancel
    </Button>
    <Button onClick={onSubmit} loading={submitting} disabled={disabled}>
      {label}
    </Button>
  </div>
);

/**
 * Create-or-edit body for one investigation. In create mode with no fixed
 * groupId, shows the existing/new group toggle (there is no create-empty-group
 * endpoint — a new group is always created together with this investigation,
 * in one call). In edit mode the group is fixed — the API has no move-between-
 * groups operation.
 */
const InvestigationDrawerBody = ({ groups, groupId, groupName, editing, onDone }) => {
  const [groupMode, setGroupMode] = useState(groupId ? "existing" : groups.length > 0 ? "existing" : "new");
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || groups[0]?.id || "");
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const allowGroupPicker = !editing && !groupId;

  const fields = useInvestigationFieldsState(
    editing
      ? {
          name: editing.name,
          unit: editing.unit,
          resultType: editing.resultType,
          dropdownOptions: editing.dropdownOptions,
          referenceRanges: editing.referenceRanges,
        }
      : {}
  );
  const duplicateCheck = useDuplicateCheck(fields.name, { skip: !!editing && fields.name === editing.name });
  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  const isGroupValid = !allowGroupPicker || (groupMode === "existing" ? selectedGroupId !== "" : newGroupName.trim().length > 0);
  const canSubmit = fields.isValid && isGroupValid && duplicateCheck.status !== "blocked" && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = fields.toPayload();
      if (editing) {
        await updateCustomInvestigation({ id: editing.id, ...payload });
      } else if (allowGroupPicker && groupMode === "new") {
        await createCustomInvestigationGroup({ name: newGroupName.trim(), investigations: [payload] });
      } else {
        await createCustomInvestigation({ groupId: allowGroupPicker ? selectedGroupId : groupId, ...payload });
      }
      onDone();
    } catch (error) {
      setSubmitError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DrawerBody>
        {allowGroupPicker && (
          <div className={styles.field} style={{ marginBottom: "var(--tesseract-space-5)" }}>
            <span className={styles.fieldLabel}>Group</span>
            <SegmentedControl
              size="sm"
              options={[
                { value: "existing", label: "Existing group" },
                { value: "new", label: "New group" },
              ]}
              value={groupMode}
              onValueChange={setGroupMode}
              disabled={groups.length === 0}
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
        )}
        {!allowGroupPicker && groupName && (
          <p className={styles.subtitle} style={{ marginBottom: "var(--tesseract-space-4)" }}>
            In <strong>{groupName}</strong>
          </p>
        )}
        <InvestigationFields fields={fields} duplicateCheck={duplicateCheck} />
        {submitError && (
          <Alert status="error" title="Couldn't save">
            {submitError}
          </Alert>
        )}
      </DrawerBody>
      <DrawerFooterActions
        onCancel={onDone}
        onSubmit={submit}
        submitting={submitting}
        disabled={!canSubmit}
        label={editing ? "Save Changes" : "Create Investigation"}
      />
    </>
  );
};

/**
 * Hospital-level master data: create/edit/delete custom investigation groups
 * and, inside each group, the investigations that belong to it. An
 * investigation can only be created inside a group — matches the PRD's
 * group-first flow. There is no activate/deactivate on the real backend
 * (isActive is always true, no endpoint exists to change it) — every item
 * shown here is active by definition. Opened in its own tab from the
 * results-entry "Create custom investigation" prompt in LabParams.js (kept
 * out of that component's DOM to avoid nesting a Tesseract Drawer inside the
 * antd Drawer it already lives in).
 */
function InvestigationSettingsPageInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const umid = getDecodedToken()?.result?.user_id;

  const [prefillName, setPrefillName] = useState(searchParams.get("prefillName") || "");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [renameGroupDrawer, setRenameGroupDrawer] = useState(null); // null | { id, name }
  const [investigationDrawer, setInvestigationDrawer] = useState(null); // null | { groupId?, groupName?, editing? }
  const [confirmDelete, setConfirmDelete] = useState(null); // null | { type: 'group'|'investigation', item }
  const [actionError, setActionError] = useState("");

  const load = async () => {
    setLoading(true);
    setGroups(await getCustomInvestigations());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // The backend doesn't expose whether an item has a patient result recorded
  // against it (the usage lock is enforced server-side, surfaced only as a 409
  // on the actual edit/delete attempt) — so this can only gate on creatorship,
  // not usage. A locked item's edit/delete will still 409; handled below.
  const isOwnItem = (item) => String(item.createdBy) === String(umid);

  const openCreateGroup = () => setInvestigationDrawer({});
  const openCreateInvestigation = (group) => {
    setInvestigationDrawer({ groupId: group.id, groupName: group.name });
    setPrefillName("");
  };
  const openEditInvestigation = (group, inv) =>
    setInvestigationDrawer({ groupId: group.id, groupName: group.name, editing: inv });

  const handleDeleteGroup = async (group) => {
    try {
      await deleteCustomInvestigationGroup(group.id);
      setConfirmDelete(null);
      load();
    } catch (error) {
      setActionError(extractErrorMessage(error));
      setConfirmDelete(null);
    }
  };

  const handleDeleteInvestigation = async (inv) => {
    try {
      await deleteCustomInvestigation(inv.id);
      setConfirmDelete(null);
      load();
    } catch (error) {
      setActionError(extractErrorMessage(error));
      setConfirmDelete(null);
    }
  };

  const saveGroupRename = async () => {
    if (!renameGroupDrawer?.name?.trim()) return;
    try {
      await updateCustomInvestigationGroup({ id: renameGroupDrawer.id, name: renameGroupDrawer.name.trim() });
      setRenameGroupDrawer(null);
      load();
    } catch (error) {
      setActionError(extractErrorMessage(error));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className={styles.title}>Custom Investigation Groups</h1>
          <p className={styles.subtitle}>
            Hospital-wide master data — create investigation groups, and the investigations inside
            them, for use across result entry.
          </p>
        </div>
        <Button onClick={openCreateGroup}>+ New Group</Button>
      </div>

      {prefillName && (
        <Alert
          status="info"
          title={`Creating from results entry: "${prefillName}"`}
          className={styles.prefillBanner}
          showDismiss
          onDismiss={() => setPrefillName("")}
        >
          Pick or create a group below, then add the investigation — its name will be filled in for
          you.
        </Alert>
      )}

      {actionError && (
        <Alert
          status="error"
          title="Action failed"
          className={styles.prefillBanner}
          showDismiss
          onDismiss={() => setActionError("")}
        >
          {actionError}
        </Alert>
      )}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : groups.length === 0 ? (
        <Empty
          title="No custom groups yet"
          description="Create a group first — investigations live inside a group."
          action={<Button onClick={openCreateGroup}>+ New Group</Button>}
        />
      ) : (
        <div className={styles.groupList}>
          {groups.map((group) => {
            const groupInvestigations = group.investigations || [];
            const isExpanded = expandedGroupId === group.id;
            return (
              <div key={group.id} className={styles.groupCard}>
                <div
                  className={styles.groupCardHeader}
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className={styles.groupCardHeaderLeft}>
                    <span className={styles.chevron}>{isExpanded ? "▾" : "▸"}</span>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupCount}>{groupInvestigations.length} investigation(s)</span>
                  </div>
                  <div className={styles.groupCardActions} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openCreateInvestigation(group)}>
                      + Investigation
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      theme="neutral"
                      disabled={!isOwnItem(group)}
                      onClick={() => setRenameGroupDrawer({ id: group.id, name: group.name })}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      theme="error"
                      disabled={!isOwnItem(group)}
                      onClick={() => setConfirmDelete({ type: "group", item: group })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.investigationList}>
                    {groupInvestigations.length === 0 ? (
                      <div className={styles.emptyInvestigations}>
                        No investigations in this group yet.
                      </div>
                    ) : (
                      groupInvestigations.map((inv) => {
                        const editable = isOwnItem(inv);
                        return (
                          <div key={inv.id} className={styles.investigationRow}>
                            <div className={styles.investigationInfo}>
                              <span className={styles.investigationName}>{inv.name}</span>
                              <span className={styles.investigationMeta}>
                                {inv.resultType} {inv.unit ? `· ${inv.unit}` : ""}
                              </span>
                            </div>
                            <div className={styles.investigationActions}>
                              <Button
                                size="sm"
                                variant="ghost"
                                theme="neutral"
                                disabled={!editable}
                                onClick={() => openEditInvestigation(group, inv)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                theme="error"
                                disabled={!editable}
                                onClick={() => setConfirmDelete({ type: "investigation", item: inv })}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={!!renameGroupDrawer} onOpenChange={(next) => !next && setRenameGroupDrawer(null)}>
        <DrawerContent
          width="30%"
          title="Rename Group"
          footer={
            <DrawerFooterActions
              onCancel={() => setRenameGroupDrawer(null)}
              onSubmit={saveGroupRename}
              submitting={false}
              disabled={!renameGroupDrawer?.name?.trim()}
              label="Save Changes"
            />
          }
        >
          <DrawerBody>
            <InputBox
              label="Group name"
              required
              fullWidth
              value={renameGroupDrawer?.name || ""}
              onChange={(e) => setRenameGroupDrawer((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Hormonal Profile"
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!investigationDrawer} onOpenChange={(next) => !next && setInvestigationDrawer(null)}>
        <DrawerContent
          width="40%"
          title={
            investigationDrawer?.editing
              ? "Edit Investigation"
              : investigationDrawer?.groupId
              ? `New Investigation — ${investigationDrawer?.groupName || ""}`
              : "New Group"
          }
        >
          {investigationDrawer && (
            <InvestigationDrawerBody
              groups={groups}
              groupId={investigationDrawer.groupId}
              groupName={investigationDrawer.groupName}
              editing={investigationDrawer.editing}
              onDone={() => {
                setInvestigationDrawer(null);
                setPrefillName("");
                load();
              }}
            />
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.item?.name}"?`}
        description="This cannot be undone. If this has any patient result recorded against it, the delete will be rejected."
        primaryLabel="Cancel"
        onPrimary={() => setConfirmDelete(null)}
        secondaryLabel="Delete"
        secondaryTheme="error"
        onSecondary={() =>
          confirmDelete?.type === "group"
            ? handleDeleteGroup(confirmDelete.item)
            : handleDeleteInvestigation(confirmDelete.item)
        }
      />
    </div>
  );
}

export default function InvestigationSettingsPage() {
  return (
    <LimsAccessBoundary>
      <InvestigationSettingsPageInner />
    </LimsAccessBoundary>
  );
}
