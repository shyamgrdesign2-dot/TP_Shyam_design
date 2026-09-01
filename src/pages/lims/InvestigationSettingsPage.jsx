import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import {
  Button,
  InputBox,
  Empty,
  Alert,
  SectionCard,
  Badge,
  Chip,
} from "@dhspl-tatvacare/tesseract-ui";
import LimsAccessBoundary from "./LimsAccessBoundary";
import {
  getCustomInvestigations,
  deleteCustomInvestigationGroup,
  deleteCustomInvestigation,
} from "../../api/services/ApiCustomInvestigation";
import InlineInvestigationPanel from "../../components/InlineInvestigationPanel";
import { getDecodedToken } from "../../utils/localStorage";
import styles from "./InvestigationSettingsPage.module.css";

const extractErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";

// Tesseract's CDN icon resolution (Button's `icon`/`leftIcon` props) doesn't
// fetch anything in this app's setup — it renders the icon name as literal
// text instead of a glyph. Plain inline SVGs as Button children pick up
// currentColor instead.
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

const PlusGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SearchGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

const RESULT_TYPE_LABEL = {
  numeric: "Numeric",
  text: "Text",
  positive_negative: "Positive/Negative",
  dropdown: "Dropdown",
};

/**
 * Plain centered dialog — not Tesseract's `ConfirmDialog`, which portals at a
 * z-index that would render invisibly when nested inside LabParams.js's own
 * Drawer. High enough (1002/1003) to sit above the group list.
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
 * Hospital-level master data: create/edit/delete custom investigation groups
 * and investigations. Create/edit opens the shared InlineInvestigationPanel
 * drawer — the list stays mounted underneath.
 *
 * Reachable as `/lims/investigation-settings` or embedded in LabParams via
 * InvestigationSettingsPanel (`onClose` closes the panel instead of history).
 */
function InvestigationSettingsPageInner({ onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const umid = getDecodedToken()?.result?.user_id;

  const [prefillName, setPrefillName] = useState(searchParams.get("prefillName") || "");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // null | { mode: 'new-group' } | { mode: 'add', groupId, groupName } | { mode: 'edit', groupId, groupName, editing }
  const [investigationDrawer, setInvestigationDrawer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [lockedIds, setLockedIds] = useState(() => new Set());
  const markLocked = (...ids) =>
    setLockedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => id && next.add(id));
      return next;
    });

  const load = async () => {
    setLoading(true);
    try {
      setGroups(await getCustomInvestigations());
    } catch (error) {
      setActionError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isOwnItem = (item) =>
    umid != null &&
    umid !== "" &&
    item?.createdBy != null &&
    item.createdBy !== "" &&
    String(item.createdBy) === String(umid);
  const isLocked = (id) => lockedIds.has(id);
  const isItemActive = (item) => Boolean(item?.isActive) || isLocked(item?.id);
  const ownGroups = groups.filter(isOwnItem);
  const canDeleteOwnedInactiveGroup = (group) => {
    const investigations = group.investigations || [];
    return (
      isOwnItem(group) &&
      !isItemActive(group) &&
      investigations.every((inv) => isOwnItem(inv) && !isItemActive(inv))
    );
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredGroups = !q
    ? groups
    : groups.filter(
        (group) =>
          group.name.toLowerCase().includes(q) ||
          (group.investigations || []).some((inv) => inv.name.toLowerCase().includes(q))
      );

  const openCreateGroup = () => setInvestigationDrawer({ mode: "new-group" });
  const openCreateInvestigation = (group) => {
    setInvestigationDrawer({ mode: "add", groupId: group.id, groupName: group.name });
    setPrefillName("");
  };
  const openEditInvestigation = (group, inv) =>
    setInvestigationDrawer({
      mode: "edit",
      groupId: group.id,
      groupName: group.name,
      editing: inv,
    });

  const closeInvestigationDrawer = () => {
    setInvestigationDrawer(null);
    setPrefillName("");
  };

  const handleDrawerDone = () => {
    closeInvestigationDrawer();
    load();
  };

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

  const drawerKey =
    investigationDrawer?.mode === "edit"
      ? `edit-${investigationDrawer.editing?.id}`
      : investigationDrawer?.mode === "add"
      ? `add-${investigationDrawer.groupId}`
      : investigationDrawer?.mode === "new-group"
      ? "new-group"
      : "closed";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Button
            variant="ghost"
            theme="neutral"
            size="sm"
            onClick={() => (onClose ? onClose() : navigate(-1))}
          >
            ← Back
          </Button>
          <Button
            variant="solid"
            theme="primary"
            size="md"
            onClick={openCreateGroup}
            className={styles.primaryCta}
          >
            + New group
          </Button>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Custom Investigation Groups</h1>
          {!loading && (
            <Badge variant="soft" color="neutral" size="sm">
              {filteredGroups.length} group{filteredGroups.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <p className={styles.subtitle}>
          Hospital-wide master data — create investigation groups, and the investigations inside
          them, for use across result entry.
        </p>
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
          action={
            <Button
              variant="solid"
              theme="primary"
              onClick={openCreateGroup}
              className={styles.primaryCta}
            >
              + New group
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <InputBox
              placeholder="Search groups or investigations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              clearable
              fullWidth
              radius="pill"
              surface="muted"
              leftIcon={<SearchGlyph />}
              showLabel={false}
              showHelper={false}
            />
          </div>

          {filteredGroups.length === 0 ? (
            <Empty
              title="No matches"
              description={`No groups or investigations match "${searchQuery.trim()}".`}
            />
          ) : (
            <div className={styles.groupList}>
              {filteredGroups.map((group) => {
                const groupInvestigations = group.investigations || [];
                const isExpanded = expandedGroupId === group.id;
                const groupActive = isItemActive(group);
                const canManageGroup = isOwnItem(group);
                const hasInvestigations = groupInvestigations.length > 0;
                const lastUpdated = [group.updatedAt, ...groupInvestigations.map((i) => i.updatedAt)]
                  .filter(Boolean)
                  .sort()
                  .pop();
                const previewChips = groupInvestigations.slice(0, 3);
                const overflowCount = groupInvestigations.length - previewChips.length;
                const foreignInvestigation = groupInvestigations.some((inv) => !isOwnItem(inv));
                const activeInvestigation = groupInvestigations.some(isItemActive);
                const canDeleteGroup = canDeleteOwnedInactiveGroup(group);

                return (
                  <SectionCard
                    key={group.id}
                    className={styles.groupCard}
                    title={
                      <span className={styles.groupTitleWithBadge}>
                        <span className={styles.groupTitleName}>{group.name}</span>
                        <Badge
                          variant="soft"
                          color={groupActive ? "success" : "neutral"}
                          size="sm"
                        >
                          {groupActive ? "Active" : "Inactive"}
                        </Badge>
                      </span>
                    }
                    subtitle={
                      `${groupInvestigations.length} investigation${
                        groupInvestigations.length === 1 ? "" : "s"
                      }${lastUpdated ? ` · Updated ${moment(lastUpdated).fromNow()}` : ""}`
                    }
                    headerExtra={
                      hasInvestigations ? (
                        <div className={styles.groupChips}>
                          {previewChips.map((inv) => (
                            <Chip key={inv.id} label={inv.name} size="sm" variant="soft" />
                          ))}
                          {overflowCount > 0 && (
                            <Chip label={`+${overflowCount} more`} size="sm" variant="outline" />
                          )}
                        </div>
                      ) : null
                    }
                    collapsible
                    collapsed={!isExpanded}
                    onCollapsedChange={(nowCollapsed) =>
                      setExpandedGroupId(nowCollapsed ? null : group.id)
                    }
                    headerActions={
                      canManageGroup ? (
                        <div className={styles.groupHeaderActions} onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            theme="primary"
                            aria-label="Add investigation"
                            title="Add investigation"
                            onClick={() => openCreateInvestigation(group)}
                          >
                            <PlusGlyph />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            theme="error"
                            aria-label="Delete group"
                            title={
                              canDeleteGroup
                                ? "Delete group"
                                : groupActive
                                ? "Active groups cannot be deleted"
                                : foreignInvestigation
                                ? "Cannot delete a group that contains investigations created by another user"
                                : activeInvestigation
                                ? "Cannot delete a group while an investigation inside it is active"
                                : "Delete group"
                            }
                            disabled={!canDeleteGroup}
                            onClick={() => setConfirmDelete({ type: "group", item: group })}
                          >
                            <DeleteGlyph />
                          </Button>
                        </div>
                      ) : null
                    }
                  >
                    {groupInvestigations.length === 0 ? (
                      <div className={styles.emptyGroupBox}>
                        {canManageGroup
                          ? "No investigations yet — add one to activate this group."
                          : "No investigations yet."}
                      </div>
                    ) : (
                      <div className={styles.investigationTableWrap}>
                        <table className={styles.investigationTable}>
                          <colgroup>
                            <col className={styles.colName} />
                            <col className={styles.colType} />
                            <col className={styles.colUnit} />
                            <col className={styles.colStatus} />
                            <col className={styles.colActions} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th scope="col">Investigation</th>
                              <th scope="col">Result type</th>
                              <th scope="col">Unit</th>
                              <th scope="col">Status</th>
                              <th scope="col">
                                <span className={styles.srOnly}>Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupInvestigations.map((inv) => {
                              const canManageInv = isOwnItem(inv);
                              const invActive = isItemActive(inv);
                              const canDeleteInv = canManageInv && !invActive;
                              return (
                                <tr key={inv.id}>
                                  <td className={styles.investigationName}>{inv.name}</td>
                                  <td className={styles.investigationCell}>
                                    {RESULT_TYPE_LABEL[inv.resultType] || inv.resultType}
                                  </td>
                                  <td className={styles.investigationCell}>{inv.unit || "—"}</td>
                                  <td>
                                    <Badge
                                      variant="soft"
                                      color={invActive ? "success" : "neutral"}
                                      size="sm"
                                    >
                                      {invActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </td>
                                  <td>
                                    {canManageInv && (
                                      <div className={styles.investigationActions}>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          theme="neutral"
                                          aria-label="Edit investigation"
                                          disabled={invActive}
                                          title={
                                            invActive
                                              ? "Active investigations cannot be edited"
                                              : "Edit investigation"
                                          }
                                          onClick={() => openEditInvestigation(group, inv)}
                                        >
                                          <EditGlyph />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          theme="error"
                                          aria-label="Delete investigation"
                                          disabled={!canDeleteInv}
                                          title={
                                            invActive
                                              ? "Active investigations cannot be deleted"
                                              : "Delete investigation"
                                          }
                                          onClick={() =>
                                            setConfirmDelete({ type: "investigation", item: inv })
                                          }
                                        >
                                          <DeleteGlyph />
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {canManageGroup && (
                          <Button
                            size="sm"
                            variant="outline"
                            theme="primary"
                            fullWidth
                            className={styles.addAnotherCta}
                            onClick={() => openCreateInvestigation(group)}
                          >
                            + Add another investigation to this group
                          </Button>
                        )}
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
        </>
      )}

      <InlineInvestigationPanel
        key={drawerKey}
        open={!!investigationDrawer}
        onClose={closeInvestigationDrawer}
        existingGroups={ownGroups}
        initialName={prefillName}
        defaultGroupMode={investigationDrawer?.mode === "new-group" ? "new" : "existing"}
        fixedGroupId={
          investigationDrawer?.mode === "add" || investigationDrawer?.mode === "edit"
            ? investigationDrawer.groupId
            : undefined
        }
        fixedGroupName={
          investigationDrawer?.mode === "add" || investigationDrawer?.mode === "edit"
            ? investigationDrawer.groupName
            : undefined
        }
        editing={investigationDrawer?.mode === "edit" ? investigationDrawer.editing : null}
        onCreated={handleDrawerDone}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.item?.name}"?`}
        description={
          confirmDelete?.type === "group"
            ? "This cannot be undone. The group and every unused investigation inside it will be deleted. If any investigation has a patient result recorded against it, the delete will be rejected."
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
 * For embedding inside LabParams — same list, without the full-page
 * no-access UI. `onClose` closes the panel instead of history.back.
 * Not gated by GB_LIMS: any account that can enter investigation results
 * can manage hospital custom groups they created.
 */
export function InvestigationSettingsPanel({ onClose }) {
  return <InvestigationSettingsPageInner onClose={onClose} />;
}
