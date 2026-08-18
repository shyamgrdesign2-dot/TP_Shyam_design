import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerBody,
  InputBox,
  Badge,
  Empty,
  Alert,
  ConfirmDialog,
} from "@dhspl-tatvacare/tesseract-ui";
import LimsAccessBoundary from "./LimsAccessBoundary";
import {
  getCustomInvestigations,
  createCustomInvestigationGroup,
  updateCustomInvestigationGroup,
  setCustomInvestigationGroupActive,
  deleteCustomInvestigationGroup,
  createCustomInvestigation,
  updateCustomInvestigation,
  setCustomInvestigationActive,
  deleteCustomInvestigation,
} from "../../api/services/ApiCustomInvestigation";
import { useInvestigationFieldsState } from "../../components/investigationFields/useInvestigationFieldsState";
import InvestigationFields from "../../components/investigationFields/InvestigationFields";
import { getDecodedToken } from "../../utils/localStorage";
import styles from "./InvestigationSettingsPage.module.css";

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

const InvestigationDrawerBody = ({ drawerState, hmid, umid, masterList, onDone }) => {
  const fields = useInvestigationFieldsState(
    drawerState.editing
      ? {
          name: drawerState.editing.name,
          unit: drawerState.editing.unit,
          resultType: drawerState.editing.resultType,
          dropdownOptions: drawerState.editing.dropdownOptions,
          referenceRanges: drawerState.editing.referenceRanges,
        }
      : { name: drawerState.prefillName || "" },
    masterList
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!fields.isValid) return;
    setSubmitting(true);
    try {
      const payload = fields.toPayload();
      if (drawerState.editing) {
        await updateCustomInvestigation({ id: drawerState.editing.id, ...payload });
      } else {
        await createCustomInvestigation({
          hmid,
          groupId: drawerState.groupId,
          ...payload,
          createdBy: umid,
        });
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DrawerBody>
        <InvestigationFields fields={fields} />
      </DrawerBody>
      <DrawerFooterActions
        onCancel={onDone}
        onSubmit={submit}
        submitting={submitting}
        disabled={!fields.isValid}
        label={drawerState.editing ? "Save Changes" : "Create Investigation"}
      />
    </>
  );
};

/**
 * Hospital-level master data: create/edit/deactivate/delete custom investigation
 * groups and, inside each group, the investigations that belong to it. An
 * investigation can only be created inside a group — matches the PRD's group-first
 * flow. Opened in its own tab from the results-entry "Create custom investigation"
 * prompt in LabParams.js (kept out of that component's DOM to avoid nesting a
 * Tesseract Drawer inside the antd Drawer it already lives in).
 */
function InvestigationSettingsPageInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const decodedToken = getDecodedToken();
  const hmid = decodedToken?.result?.clinic_id;
  const umid = decodedToken?.result?.user_id;

  const [prefillName, setPrefillName] = useState(searchParams.get("prefillName") || "");
  const [groups, setGroups] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [groupDrawer, setGroupDrawer] = useState(null); // null | { id?, name }
  const [investigationDrawer, setInvestigationDrawer] = useState(null); // null | { groupId, groupName, editing? }
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'group'|'investigation', action: 'delete'|'deactivate', item }

  const load = async () => {
    if (!hmid) return;
    setLoading(true);
    const res = await getCustomInvestigations(hmid);
    setGroups(res.groups);
    setInvestigations(res.investigations);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hmid]);

  const investigationsByGroup = useMemo(() => {
    const map = {};
    investigations.forEach((inv) => {
      if (!map[inv.groupId]) map[inv.groupId] = [];
      map[inv.groupId].push(inv);
    });
    return map;
  }, [investigations]);

  // Investigations only carry groupId, never a denormalized groupName.
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const masterList = useMemo(
    () =>
      investigations.map((inv) => ({
        reportName: inv.groupName || groupNameById.get(inv.groupId) || "",
        testName: inv.name,
      })),
    [investigations, groupNameById]
  );

  const canEditOrDelete = (item) => item.createdBy === umid && !item.hasBeenUsed;

  const openCreateGroup = () => setGroupDrawer({ name: "" });
  const openEditGroup = (group) => setGroupDrawer({ id: group.id, name: group.name });

  const saveGroup = async () => {
    if (!groupDrawer?.name?.trim()) return;
    if (groupDrawer.id) {
      await updateCustomInvestigationGroup({ id: groupDrawer.id, hmid, name: groupDrawer.name.trim() });
    } else {
      await createCustomInvestigationGroup({ hmid, name: groupDrawer.name.trim(), createdBy: umid });
    }
    setGroupDrawer(null);
    load();
  };

  const openCreateInvestigation = (group) => {
    setInvestigationDrawer({ groupId: group.id, groupName: group.name, prefillName });
    setPrefillName(""); // one-time use — the banner disappears once it's been applied
  };
  const openEditInvestigation = (inv) =>
    setInvestigationDrawer({
      groupId: inv.groupId,
      groupName: inv.groupName || groupNameById.get(inv.groupId) || "",
      editing: inv,
    });

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    const { type, action, item } = confirmTarget;
    if (type === "group") {
      if (action === "delete") await deleteCustomInvestigationGroup(item.id);
      if (action === "deactivate") await setCustomInvestigationGroupActive({ id: item.id, isActive: !item.isActive });
    } else {
      if (action === "delete") await deleteCustomInvestigation(item.id);
      if (action === "deactivate") await setCustomInvestigationActive({ id: item.id, isActive: !item.isActive });
    }
    setConfirmTarget(null);
    load();
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
            const groupInvestigations = investigationsByGroup[group.id] || [];
            const isExpanded = expandedGroupId === group.id;
            const groupLocked = groupInvestigations.length > 0;
            return (
              <div key={group.id} className={styles.groupCard}>
                <div
                  className={styles.groupCardHeader}
                  onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                >
                  <div className={styles.groupCardHeaderLeft}>
                    <span className={styles.chevron}>{isExpanded ? "▾" : "▸"}</span>
                    <span className={styles.groupName}>{group.name}</span>
                    {!group.isActive && <Badge color="neutral">Inactive</Badge>}
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
                      disabled={groupLocked}
                      onClick={() => openEditGroup(group)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      theme="neutral"
                      onClick={() => setConfirmTarget({ type: "group", action: "deactivate", item: group })}
                    >
                      {group.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      theme="error"
                      disabled={groupLocked}
                      onClick={() => setConfirmTarget({ type: "group", action: "delete", item: group })}
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
                        const editable = canEditOrDelete(inv);
                        return (
                          <div key={inv.id} className={styles.investigationRow}>
                            <div className={styles.investigationInfo}>
                              <span className={styles.investigationName}>{inv.name}</span>
                              <span className={styles.investigationMeta}>
                                {inv.resultType} {inv.unit ? `· ${inv.unit}` : ""}
                              </span>
                              {!inv.isActive && <Badge color="neutral">Inactive</Badge>}
                              {inv.hasBeenUsed && <Badge color="primary">In use</Badge>}
                            </div>
                            <div className={styles.investigationActions}>
                              <Button
                                size="sm"
                                variant="ghost"
                                theme="neutral"
                                disabled={!editable}
                                onClick={() => openEditInvestigation(inv)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                theme="neutral"
                                onClick={() =>
                                  setConfirmTarget({ type: "investigation", action: "deactivate", item: inv })
                                }
                              >
                                {inv.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                theme="error"
                                disabled={!editable}
                                onClick={() =>
                                  setConfirmTarget({ type: "investigation", action: "delete", item: inv })
                                }
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

      <Drawer open={!!groupDrawer} onOpenChange={(next) => !next && setGroupDrawer(null)}>
        <DrawerContent
          width="30%"
          title={groupDrawer?.id ? "Edit Group" : "New Group"}
          footer={
            <DrawerFooterActions
              onCancel={() => setGroupDrawer(null)}
              onSubmit={saveGroup}
              submitting={false}
              disabled={!groupDrawer?.name?.trim()}
              label={groupDrawer?.id ? "Save Changes" : "Create Group"}
            />
          }
        >
          <DrawerBody>
            <InputBox
              label="Group name"
              required
              fullWidth
              value={groupDrawer?.name || ""}
              onChange={(e) => setGroupDrawer((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Hormonal Profile"
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer open={!!investigationDrawer} onOpenChange={(next) => !next && setInvestigationDrawer(null)}>
        <DrawerContent
          width="40%"
          title={investigationDrawer?.editing ? "Edit Investigation" : `New Investigation — ${investigationDrawer?.groupName || ""}`}
        >
          {investigationDrawer && (
            <InvestigationDrawerBody
              drawerState={investigationDrawer}
              hmid={hmid}
              umid={umid}
              masterList={masterList}
              onDone={() => {
                setInvestigationDrawer(null);
                load();
              }}
            />
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(next) => !next && setConfirmTarget(null)}
        title={
          confirmTarget?.action === "delete"
            ? `Delete "${confirmTarget?.item?.name}"?`
            : `${confirmTarget?.item?.isActive ? "Deactivate" : "Activate"} "${confirmTarget?.item?.name}"?`
        }
        description={
          confirmTarget?.action === "delete"
            ? "This cannot be undone."
            : confirmTarget?.item?.isActive
            ? "It won't be available for new result entry, but existing results stay visible."
            : "It will become available for new result entry again."
        }
        primaryLabel="Cancel"
        onPrimary={() => setConfirmTarget(null)}
        secondaryLabel={confirmTarget?.action === "delete" ? "Delete" : "Confirm"}
        secondaryTheme={confirmTarget?.action === "delete" ? "error" : "primary"}
        onSecondary={handleConfirm}
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
