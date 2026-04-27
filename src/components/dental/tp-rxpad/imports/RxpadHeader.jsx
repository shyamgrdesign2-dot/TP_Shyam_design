import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDown2,
  Calendar2,
  CallCalling,
  Card,
  DocumentSketch,
  DocumentText,
  Edit2,
  Eye,
  Grid5,
  Ram,
  Setting2,
  User } from
"iconsax-reactjs";
import { ChevronLeft, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger } from
"../../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { TPDrawer, TPDrawerContent } from "../../tp-ui/tp-drawer";
import { TPSplitButton } from "../../tp-ui/button-system";
import { RxPreviewDocument } from "../RxPreviewDocument";
import { getComposedRxPreviewSnapshot } from "../rx-preview-composer";
import svgPaths from "./svg-gb0jbe9ifm";
import styles from "./RxpadHeader.module.scss";
import { getAppointmentPatient } from "../../lib/appointment-patients";
import { pushPlanConsultationFromRxPage } from "../../lib/plan-consultation-queue";

function buildProfileFields(patientId) {
  const p = getAppointmentPatient(patientId);
  return [
  {
    key: "patient-id",
    label: "Patient ID",
    value: p.patientCode,
    icon:
    <Card
      color="var(--tp-violet-500)"
      size={18}
      strokeWidth={1.5}
      variant="Linear" />


  },
  {
    key: "mobile",
    label: "Mobile Number",
    value: p.mobile.replace(/^\+91-/, ""),
    icon:
    <CallCalling
      color="var(--tp-violet-500)"
      size={18}
      strokeWidth={1.5}
      variant="Linear" />


  },
  {
    key: "dob",
    label: "DOB",
    value: p.dob,
    icon:
    <Calendar2
      color="var(--tp-violet-500)"
      size={18}
      strokeWidth={1.5}
      variant="Linear" />


  }];

}

function EndVisitIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M8.9 7.56c.31-3.6 2.16-5.07 6.21-5.07h.13c4.47 0 6.26 1.79 6.26 6.26v6.52c0 4.47-1.79 6.26-6.26 6.26h-.13c-4.02 0-5.87-1.45-6.2-4.99"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />


      <path
        d="M2 12h12.88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />

      <path
        d="M12.65 8.65L16 12l-3.35 3.35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round" />

    </svg>);

}

export default function RxpadHeader({
  className,
  onBack,
  patientId: patientIdProp
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ctxTreatment = searchParams?.get("ctxTreatment")?.trim() ?? "";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  const getCurrentPatientId = () => {
    if (patientIdProp) return patientIdProp;
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    return params.get("patientId") ?? "apt-1";
  };

  const headerPatient = getAppointmentPatient(getCurrentPatientId());
  const profileFields = buildProfileFields(getCurrentPatientId());

  useEffect(() => {
    if (!isPreviewOpen) return;
    setPreviewSnapshot(getComposedRxPreviewSnapshot(getCurrentPatientId()));
  }, [isPreviewOpen]);

  const openEndVisit = () => {
    const pid = getCurrentPatientId();
    pushPlanConsultationFromRxPage(pid);
    const src = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const next = new URLSearchParams();
    next.set("patientId", pid);
    next.set("snackbar", "visit-ended");
    const planId = src.get("planId");
    const serviceId = src.get("serviceId");
    const appointmentId = src.get("appointmentId");
    const returnTo = src.get("returnTo");
    const ctx = src.get("ctxTreatment");
    if (planId) next.set("planId", planId);
    if (serviceId) next.set("serviceId", serviceId);
    if (appointmentId) next.set("appointmentId", appointmentId);
    if (returnTo) next.set("returnTo", returnTo);
    if (ctx) next.set("ctxTreatment", ctx);
    navigate(`/rxpad/end-visit?${next.toString()}`);
  };

  return (
    <div className={`${styles.root} ${className || ""}`} data-name="Rxpad_Header">
      <div className={styles.innerRow}>
        <div className={styles.bar}>
          <div className={styles.leftCluster}>
            <button
              aria-label="Go back"
              className={styles.backBtn}
              data-name="Back Button"
              onClick={onBack}
              type="button">

              <div className={styles.backBtnBorder} aria-hidden />
              <div className={styles.backIconWrap} data-name="Back Arrow">
                <ChevronLeft
                  color="#454551"
                  size={24}
                  strokeWidth={2}
                  style={{ opacity: 0.7 }} />

              </div>
            </button>

            <div className={styles.userInfoWrap} data-name="User Info">
              <DropdownMenu
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}>

                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={styles.profileTrigger}
                    data-name="Container">

                    <div
                      className={styles.avatarRing}
                      data-name="Profile Image">

                      <div className={styles.avatarIcon} data-name="User">
                        <User
                          color="var(--tp-slate-500)"
                          size={22.857}
                          variant="Bulk" />

                      </div>
                    </div>
                    <div
                      className={styles.userTextCol}
                      data-name="User Details">

                      <div className={styles.nameRow} data-name="Header">
                        <p className={styles.patientName}>
                          {headerPatient.name}
                        </p>
                        <div
                          className={`${styles.chevronWrap} ${styles.chevronSpin} ${isProfileOpen ? styles.chevronSpinOpen : ""}`}
                          data-name="Dropdown Icon">

                          <ArrowDown2
                            color="var(--tp-slate-700)"
                            size={20}
                            strokeWidth={2}
                            variant="Linear" />

                        </div>
                        {ctxTreatment ?
                        <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                              className={styles.planProcedureChip}
                              tabIndex={0}>

                                {ctxTreatment}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                            side="bottom"
                            sideOffset={8}
                            className={styles.planProcedureTooltip}
                            arrowClassName="bg-white fill-white">

                              <div className={styles.planProcedureTooltipTitle}>
                                Plan Context
                              </div>
                              <p className={styles.planProcedureTooltipSummary}>
                                {ctxTreatment}
                              </p>
                              <ul className={styles.planProcedureTooltipList}>
                                <li>
                                  This Rx session is linked to this treatment
                                  line.
                                </li>
                                <li>
                                  Use End Visit to attach notes back to the
                                  treatment plan.
                                </li>
                              </ul>
                            </TooltipContent>
                          </Tooltip> :
                        null}
                      </div>
                      <div className={styles.metaRow} data-name="Age & gender">
                        <p className={styles.metaItem}>
                          {headerPatient.genderShort}
                        </p>
                        <p className={styles.metaSep} aria-hidden>
                          ·
                        </p>
                        <p
                          className={styles.metaItem}>
                          {`${headerPatient.age}Y`}</p>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={6}
                  className={styles.menuContent}>

                  <div className={styles.menuArrowOuter} />
                  <div className={styles.menuArrowInner} />
                  <div className={styles.menuFields}>
                    {profileFields.map((item) =>
                    <div key={item.key} className={styles.menuFieldRow}>
                        <div className={styles.menuIconCircle}>{item.icon}</div>
                        <div className={styles.menuFieldText}>
                          <p className={styles.menuLabel}>{item.label}</p>
                          <p className={styles.menuValue}>{item.value}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.menuActions}>
                    <button
                      type="button"
                      className={styles.menuActionBtn}
                      onClick={() => {
                        setIsProfileOpen(false);
                        const pid = getCurrentPatientId();
                        const qs = new URLSearchParams();
                        if (pid) qs.set("patientId", pid);
                        const suffix = qs.toString() ? `?${qs.toString()}` : "";
                        navigate(`/patient-detail${suffix}`);
                      }}>

                      <DocumentText
                        color="currentColor"
                        size={20}
                        strokeWidth={1.5}
                        variant="Linear" />

                      <span className={styles.menuActionLabel}>
                        View patient summary
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.menuActionBtn}
                      onClick={() => setIsProfileOpen(false)}>

                      <Edit2
                        color="currentColor"
                        size={20}
                        strokeWidth={1.5}
                        variant="Linear" />

                      <span className={styles.menuActionLabel}>
                        Edit patient details
                      </span>
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className={styles.toolbar} data-name="Toolbar">
            <button
              type="button"
              aria-label="Tutorial"
              className={styles.iconBtn}
              data-name="Tutorial">

              <svg
                className={styles.tutorialSvg}
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 42 42">

                <g id="Tutorial">
                  <g id="Union" opacity="0.8">
                    <path
                      clipRule="evenodd"
                      d={svgPaths.p3172ac80}
                      fill="var(--fill-0, #8A4DBB)"
                      fillRule="evenodd" />


                    <path
                      clipRule="evenodd"
                      d={svgPaths.p2ee5cec0}
                      fill="var(--fill-0, #8A4DBB)"
                      fillRule="evenodd" />

                  </g>
                </g>
              </svg>
            </button>
            <div
              className={styles.toolbarDivider}
              data-name="Divider"
              aria-hidden />

            <button
              type="button"
              aria-label="Template"
              className={styles.toolGrey}
              data-name="Template">

              <Grid5
                color="#454551"
                size={24}
                strokeWidth={1.5}
                variant="Linear" />

            </button>
            <button
              type="button"
              aria-label="Save"
              className={styles.toolGrey}
              data-name="Save">

              <Ram
                color="#454551"
                size={24}
                strokeWidth={1.5}
                variant="Linear" />

            </button>
            <button
              type="button"
              aria-label="Customisation"
              className={styles.toolGreyAlt}
              data-name="Customisation">

              <Setting2
                color="#454551"
                size={24}
                strokeWidth={1.5}
                variant="Linear" />

            </button>
            <div
              className={styles.toolbarDivider}
              data-name="Divider"
              aria-hidden />

            <button
              type="button"
              aria-label="Preview"
              onClick={() => setIsPreviewOpen(true)}
              className={styles.previewBtn}
              data-name="Preview">

              <Eye
                color="var(--tp-blue-500)"
                size={24}
                strokeWidth={1.5}
                variant="Linear" />

              <p className={styles.previewLabel}>Preview</p>
            </button>
            <TPSplitButton
              primaryAction={{
                label: "End Visit",
                icon: <EndVisitIcon size={24} />,
                onClick: openEndVisit
              }}
              secondaryActions={[
              {
                id: "end-visit",
                label: "End Visit",
                icon: <EndVisitIcon size={14} />,
                onClick: openEndVisit
              },
              {
                id: "draft",
                label: "Save as Draft",
                icon:
                <DocumentSketch
                  color="currentColor"
                  size={14}
                  variant="Linear" />,


                onClick: () => {}
              }]}

              variant="solid"
              theme="primary"
              size="md" />


            <button
              type="button"
              aria-label="More options"
              className={styles.moreBtn}
              style={{
                "--transform-inner-width": "1200",
                "--transform-inner-height": "18"
              }}>

              <MoreVertical color="#454551" size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.bottomRule} aria-hidden />
      <TPDrawer open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <TPDrawerContent
          side="right"
          size="xl"
          className={styles.drawerContent}>

          <div className={styles.drawerHeader}>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className={styles.drawerClose}
              aria-label="Close preview">

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="var(--tp-slate-700)"
                xmlns="http://www.w3.org/2000/svg">

                <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" />
              </svg>
            </button>
            <div className={styles.drawerDivider} aria-hidden />
            <h2 className={styles.drawerTitle}>Preview Rx</h2>
          </div>
          <div className={styles.drawerBody}>
            <RxPreviewDocument snapshot={previewSnapshot} />
          </div>
        </TPDrawerContent>
      </TPDrawer>
    </div>);

}