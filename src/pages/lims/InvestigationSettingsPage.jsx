import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  InputBox,
  Empty,
  Alert,
  SegmentedControl,
  Dropdown,
  SectionCard,
} from "@dhspl-tatvacare/tesseract-ui";
import LimsAccessBoundary from "./LimsAccessBoundary";
import {
  getCustomInvestigations,
  createCustomInvestigationGroup,
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

// Tesseract's CDN icon resolution (Button's `icon`/`leftIcon` props) doesn't
// fetch anything in this app's setup — it renders the icon name as literal
// text instead of a glyph (same issue already worked around elsewhere in
// this feature, e.g. InvestigationFields.jsx's "×" remove-range button).
// These are plain inline SVGs passed as Button children instead, so they
// still pick up the button's theme colour via currentColor.
const EditGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const DeleteGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

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
 * Plain absolute-positioned panel — not Tesseract's `Drawer` molecule, which
 * portals at a fixed z-index that renders invisibly when this page is nested
 * inside another Drawer (e.g. embedded in LabParams.js). Anchored to the
 * nearest position:relative ancestor (.page), same approach as
 * InlineInvestigationPanel.
 */
const SidePanel = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawerPanel} role="dialog" aria-label={title}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>{title}</span>
          <button type="button" className={styles.drawerCloseButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  );
};

/**
 * Plain centered dialog — not Tesseract's `ConfirmDialog`, which portals at a
 * z-index below SidePanel above (1001): a delete confirmed from inside the
 * create/edit panel would render underneath it. Higher z-index (1002/1003)
 * than SidePanel so it's always on top regardless of which panel triggered it.
 */
const ConfirmModal = ({ open, onCancel, onConfirm, title, description }) => {
  if (!open) return null;
  return (
    <div className={styles.confirmBackdrop} onClick={onCancel}>
      <div className={styles.confirmDialog} role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <span className={styles.confirmTitle}>{title}</span>
        <span className={styles.confirmDescription}>{description}</span>
        <div className={styles.confirmActions}>
          <Button variant="outline" theme="neutral" onClick={onCancel}>
            Cancel
          </Button>
          <Button theme="error" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

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
      <div className={styles.drawerBody}>
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
      </div>
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
 * shown here is active by definition.
 *
 * Reachable both as its own routed page (`/lims/investigation-settings`) and
 * embedded directly inside LabParams.js's results-entry panel — pass
 * `onClose` to render it embedded; the "Back" control then closes the panel
 * instead of navigating history.
 */
function InvestigationSettingsPageInner({ onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const umid = getDecodedToken()?.result?.user_id;

  const [prefillName, setPrefillName] = useState(searchParams.get("prefillName") || "");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [investigationDrawer, setInvestigationDrawer] = useState(null); // null | { groupId?, groupName?, editing? }
  const [confirmDelete, setConfirmDelete] = useState(null); // null | { type: 'group'|'investigation', item }
  const [actionError, setActionError] = useState("");
  // The backend never exposes whether an item has a patient result recorded
  // against it — it's only discoverable as a 409 on an actual edit/delete
  // attempt (see ApiCustomInvestigation.js). Once discovered this session,
  // remember it so the delete action stops being offered for that item
  // (and for its parent group) instead of repeating the same failed call.
  const [lockedIds, setLockedIds] = useState(() => new Set());
  const markLocked = (...ids) =>
    setLockedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => id && next.add(id));
      return next;
    });

  const load = async () => {
    setLoading(true);
    setGroups(await getCustomInvestigations());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const isOwnItem = (item) => String(item.createdBy) === String(umid);
  const isLocked = (id) => lockedIds.has(id);
  // A group is locked (per the backend's own cascade rule) if it's directly
  // locked or any investigation inside it is — mirror that here so the
  // group's delete action disappears as soon as any of its investigations
  // is discovered to be in use.
  const isGroupLocked = (group) =>
    isLocked(group.id) || (group.investigations || []).some((inv) => isLocked(inv.id));

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
      if (error?.response?.status === 409) markLocked(group.id);
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
      if (error?.response?.status === 409) markLocked(inv.id);
      setActionError(extractErrorMessage(error));
      setConfirmDelete(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button type="button" className={styles.backLink} onClick={() => (onClose ? onClose() : navigate(-1))}>
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
            const groupLocked = isGroupLocked(group);
            return (
              <SectionCard
                key={group.id}
                title={group.name}
                subtitle={`${groupInvestigations.length} investigation(s)`}
                collapsible
                collapsed={!isExpanded}
                onCollapsedChange={(nowCollapsed) => setExpandedGroupId(nowCollapsed ? null : group.id)}
                headerActions={
                  <div className={styles.groupHeaderActions} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openCreateInvestigation(group)}>
                      + Investigation
                    </Button>
                    {!groupLocked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        theme="error"
                        aria-label="Delete group"
                        disabled={!isOwnItem(group)}
                        onClick={() => setConfirmDelete({ type: "group", item: group })}
                      >
                        <DeleteGlyph />
                      </Button>
                    )}
                  </div>
                }
              >
                {groupInvestigations.length === 0 ? (
                  <div className={styles.emptyInvestigations}>No investigations in this group yet.</div>
                ) : (
                  groupInvestigations.map((inv) => {
                    const editable = isOwnItem(inv);
                    const invLocked = isLocked(inv.id);
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
                            aria-label="Edit investigation"
                            disabled={!editable}
                            onClick={() => openEditInvestigation(group, inv)}
                          >
                            <EditGlyph />
                          </Button>
                          {!invLocked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              theme="error"
                              aria-label="Delete investigation"
                              disabled={!editable}
                              onClick={() => setConfirmDelete({ type: "investigation", item: inv })}
                            >
                              <DeleteGlyph />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      <SidePanel
        open={!!investigationDrawer}
        onClose={() => setInvestigationDrawer(null)}
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
      </SidePanel>

      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.item?.name}"?`}
        description={
          confirmDelete?.type === "group"
            ? "This cannot be undone. A group can only be deleted while every investigation inside it is still unused — if any one of them has a patient result recorded against it, the delete will be rejected."
            : "This cannot be undone. An investigation can only be deleted while it's still unused — once a patient result has been recorded against it, the delete will be rejected."
        }
        onConfirm={() =>
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

/**
 * For embedding directly inside LabParams.js's results-entry panel — same
 * component, no LimsAccessBoundary gate (matches the inline create panel,
 * which doesn't gate on LIMS access either) and takes `onClose` so "Back"
 * closes the panel instead of navigating history.
 */
export function InvestigationSettingsPanel({ onClose }) {
  return <InvestigationSettingsPageInner onClose={onClose} />;
}
