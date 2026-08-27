import React, { Suspense, lazy, useEffect, useState } from "react";
import { Drawer as AntDrawer } from "antd";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, DrawerContent, Button, InputBox } from "@dhspl-tatvacare/tesseract-ui";

import { endVisit } from "../../../redux/appointmentsSlice";
import { clearAbhaDetails } from "../../../redux/abhaSlice";
import { fetchBillsByPatient, fetchPatientWalletBalance } from "../../opdBilling/service";
import { getLoggedInDoctorId } from "../data/useDoctorSlots";
import { S_TATVA_PRACTICE, S_BILLING, TRIAL } from "../../../utils/constants";
import { TAB_IDS } from "../data/appointmentsConfig";
import { getClinic, trackEvent } from "../../../utils/utils";
import UploadDocument from "../../medicalRecords/UploadDocument";
import UploadDocPopup from "../../medicalRecords/components/uploadDocPopup/UploadDocPopup";
import styles from "./BookAppointmentDrawer.module.css";

// The billing / lab / certificate flows reuse the same feature components as
// the legacy screen (they are full products of their own); only the row that
// launches them lives in the Tesseract page. Lazy so the appointment chunk
// stays lean until a flow is opened.
const CreateBill = lazy(() => import("../../opdBilling/components/createBill/CreateBill"));
const RecentBills = lazy(() => import("../../opdBilling/components/recentBills/RecentBills"));
const AddAdvance = lazy(() => import("../../opdBilling/components/advanceDeposit/AddAdvance"));
const CreateCertificate = lazy(() => import("../../../components/medical_certificate/CreateCertificate"));
const LabParams = lazy(() => import("../../../components/LabParams"));
const ExpiredSubModal = lazy(() => import("../../monetization/components/ExpiredSubModal"));
const AbhaDrawer = lazy(() => import("../../../components/abha/AbhaDrawer"));

const BILLING_GATED = new Set(["create-bill", "advance-deposit"]);

/**
 * action: { type: "create-bill" | "advance-deposit" | "add-lab-results" |
 *           "create-certificate" | "end-visit" | "end-visit-reason" |
 *           "create-abha" | "upload-records", record, name, tabId, files } | null
 * onClose(): dismiss without side effects.
 * onDone(toast): dismiss after a completed flow; toast is {status, title}.
 *
 * Billing parity with the legacy screen: Create Bill / Advance Deposit are
 * blocked with the billing upsell modal when the account's EMR plan is paid
 * but its billing plan is still TRIAL; Create Bill first loads the
 * patient's bills for today and opens Recent Bills (View/Create) when any
 * exist, exactly like AppointmentData.js.
 */
export default function RowActionDrawers({ action, onClose, onDone }) {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.doctors?.profile);
  const { planDetails } = useSelector((state) => state.subscription) || {};
  const serviceMappings = planDetails?.service_mappings;
  const emrPlan = serviceMappings?.find((e) => e.service_name === S_TATVA_PRACTICE);
  const billingPlan = serviceMappings?.find((e) => e.service_name === S_BILLING);
  const billingLocked = emrPlan?.plan_tier !== TRIAL && billingPlan?.plan_tier === TRIAL;

  const [endVisitReason, setEndVisitReason] = useState("");
  const [ending, setEnding] = useState(false);
  // Billing flow state: null | "recent" | "create"
  const [billingView, setBillingView] = useState(null);
  const [patientBills, setPatientBills] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [billData, setBillData] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showUploadDocPopup, setShowUploadDocPopup] = useState(false);

  useEffect(() => {
    if (action?.type !== "end-visit") setEndVisitReason("");
    if (action?.type !== "create-bill") {
      setBillingView(null);
      setPatientBills([]);
      setBillData(null);
    }
    if (action?.type === "upload-records") {
      setUploadFiles(action.files || []);
      setShowDeletePopup(false);
      setShowUploadDocPopup(Boolean(action.openPicker));
    } else {
      setUploadFiles([]);
      setShowDeletePopup(false);
      setShowUploadDocPopup(false);
    }
  }, [action]);

  const loadPatientBills = async (record) => {
    const today = moment().format("YYYY-MM-DD");
    const response = await fetchBillsByPatient({
      doctorIds: [getLoggedInDoctorId()],
      sortBy: "date",
      sortOrder: "asc",
      page: 1,
      limit: 25,
      patientId: record?.patient_unique_id,
      appointmentId: record?.pam_id,
      type: "new",
      startDate: today,
      endDate: today,
    });
    const bills = (response?.bills || []).map((bill) => ({ ...bill, patient: response?.patient }));
    setPatientBills(bills);
    try {
      const wallet = await fetchPatientWalletBalance(record?.patient_unique_id);
      setWalletBalance(wallet?.advanceDepositBalance || 0);
    } catch {
      setWalletBalance(0);
    }
    return bills;
  };

  // Create Bill entry: today's bills decide Create vs View/Create (recent).
  useEffect(() => {
    let alive = true;
    if (action?.type === "create-bill" && !billingLocked) {
      loadPatientBills(action.record)
        .then((bills) => alive && setBillingView(bills.length > 0 ? "recent" : "create"))
        .catch(() => alive && setBillingView("create"));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the opened action
  }, [action, billingLocked]);

  useEffect(() => {
    if (action?.type !== "create-bill" || billingView !== "create" || billingLocked) return;
    const record = action.record;
    const clinic = getClinic();
    trackEvent("TP_Billing_CreateBill", {
      patientName: record?.pm_fullname,
      patientId: record?.patient_unique_id,
      doctorSpeciality: profile?.dp_name,
      doctorId: profile?.doctor_unique_id,
      doctorContact: profile?.um_contact,
      source:
        action.tabId === TAB_IDS.QUEUE
          ? "appointment_queue"
          : action.tabId === TAB_IDS.FINISHED
          ? "appointment_finished"
          : "",
      city: clinic?.hm_city,
      pincode: clinic?.hm_pincode,
      subscriptionStatus: planDetails?.currentPlanStatus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when Create (not View) opens
  }, [action?.type, billingView, billingLocked]);

  if (!action) return null;
  const { type, record } = action;
  const recordsFiles =
    type === "upload-records" ? (uploadFiles.length > 0 ? uploadFiles : action.files || []) : [];

  // Billing upsell gate (same trigger as the legacy checkBillingPurchased).
  if (BILLING_GATED.has(type) && billingLocked) {
    return (
      <Suspense fallback={null}>
        <ExpiredSubModal title={S_BILLING} isSubModalOpen showHideSubModal={onClose} />
      </Suspense>
    );
  }

  const submitEndVisit = async () => {
    if (!endVisitReason.trim() || ending) return;
    setEnding(true);
    try {
      const act = await dispatch(
        endVisit({
          pam_id: record.pam_id,
          patient_unique_id: record.patient_unique_id,
          pm_id: record.pm_id,
          pm_pid: record.pm_pid,
          tpvl_remarks: endVisitReason.trim(),
        })
      );
      if (act.meta.requestStatus === "fulfilled") {
        onDone?.({ status: "success", title: `${action.name || "Patient"}'s visit was ended.` });
      } else {
        onDone?.({ status: "error", title: "Could not end the visit. Please try again." });
      }
    } finally {
      setEnding(false);
    }
  };

  if (type === "end-visit") {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent
          side="right"
          width="min(720px, max(480px, 50vw))"
          title="End Visit"
          action={
            <Button
              variant="solid"
              theme="primary"
              size="md"
              loading={ending}
              disabled={!endVisitReason.trim()}
              onClick={submitEndVisit}
            >
              Done
            </Button>
          }
        >
          <div className={styles.form}>
            <InputBox
              label="Reason"
              required
              placeholder="Enter the reason for ending this visit"
              value={endVisitReason}
              onChange={(e) => setEndVisitReason(e.target.value)}
              autoGrow
              height={132}
              maxHeight={280}
              fullWidth
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (type === "end-visit-reason") {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent side="right" width="min(610px, 90vw)" title={action.name || "End Visit Reason"}>
          <div className={styles.form}>
            <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>End Visit Reason</div>
            <div
              style={{
                minHeight: 100,
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--tesseract-slate-200)",
                background: "var(--tesseract-slate-50)",
                whiteSpace: "pre-wrap",
              }}
            >
              {record?.tpvl_remarks || "No reason was recorded for this visit."}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Legacy feature drawers, mounted with the same props as the old screen.
  return (
    <Suspense fallback={null}>
      {type === "create-bill" && billingView === "recent" && (
        <AntDrawer closeIcon={false} placement="right" open width="77%" push={false} onClose={onClose}>
          <RecentBills
            handleRecentBillDrawer={onClose}
            handleCreateBillDrawer={() => setBillingView((v) => (v === "create" ? "recent" : "create"))}
            patientBills={patientBills}
            getPatientBills={() => loadPatientBills(record)}
            totalAdvanceBalance={walletBalance}
            patientData={record}
            billData={billData}
            setBillData={setBillData}
            createBillDrawer={false}
            setCreateBillDrawer={(v) => setBillingView(v ? "create" : "recent")}
          />
        </AntDrawer>
      )}
      {type === "create-bill" && billingView === "create" && (
        <AntDrawer closeIcon={false} placement="right" bodyStyle={{ backgroundColor: "white" }} open width="100%" push={false} onClose={onClose}>
          <CreateBill
            handleCreateBillDrawer={onClose}
            isBackModalOpen={false}
            showHideBackModal={onClose}
            patientData={record}
            editBillData={
              billData && Object.keys(billData).length > 0
                ? {
                    ...billData,
                    patient: { ...billData?.patient, patientId: billData?.patientId || billData?.patient?.patientId },
                  }
                : null
            }
            setEditedBillData={setBillData}
          />
        </AntDrawer>
      )}
      {type === "advance-deposit" && (
        <AntDrawer closeIcon={false} placement="right" open width="85%" push={false} onClose={onClose}>
          <AddAdvance handleAddAdvanceDrawer={onClose} patientData={record} />
        </AntDrawer>
      )}
      {type === "create-certificate" && (
        <AntDrawer width="auto" title="Create Certificate" placement="right" closable open onClose={onClose}>
          <CreateCertificate handleCreateCertificateDrawer={onClose} patient_data={record} replace={false} />
        </AntDrawer>
      )}
      {type === "add-lab-results" && (
        <AntDrawer closeIcon={false} className="modalWidth-700" placement="right" open width="auto" onClose={onClose}>
          <LabParams
            handleAddLabParamsDrawer={onClose}
            patient_unique_id={record?.patient_unique_id}
            isBackModalOpen={false}
            showHideBackModal={onClose}
            onSave={() => onDone?.({ status: "success", title: "Lab results saved." })}
          />
        </AntDrawer>
      )}
      {type === "create-abha" && (
        <AbhaDrawer
          onClose={onClose}
          open
          patientUniqueId={record?.patient_unique_id}
          onSuccess={() => {
            dispatch(clearAbhaDetails());
            onDone?.({ status: "success", title: "ABHA linked for this patient." });
          }}
        />
      )}
      {type === "upload-records" && recordsFiles.length > 0 && (
        <AntDrawer
          closeIcon={false}
          placement="right"
          bodyStyle={{ backgroundColor: "white" }}
          onClose={() => setShowDeletePopup(true)}
          open
          className="modalWidth-700"
          width="auto"
          push={false}
        >
          <UploadDocument
            key={record?.pam_id || record?.patient_unique_id || "upload-doc"}
            onClose={() => setShowDeletePopup(true)}
            handleDrawerUploadDoc={onClose}
            shouldShowDeletePopup={showDeletePopup}
            setShowDeletePopup={setShowDeletePopup}
            filesData={recordsFiles}
            setFilesData={setUploadFiles}
            patientData={record}
            handleUploadDocPopup={() => setShowUploadDocPopup((prev) => !prev)}
            isAppointmentData
          />
        </AntDrawer>
      )}
      {type === "upload-records" && showUploadDocPopup && (
        <UploadDocPopup
          shouldShowUploadDocPopup={showUploadDocPopup}
          onCancel={() => {
            setShowUploadDocPopup(false);
            if (!uploadFiles.length) onClose();
          }}
          setFilesData={(next) => {
            setUploadFiles((prev) => (typeof next === "function" ? next(prev) : next));
          }}
          filesData={uploadFiles}
          setUploadDocDrawer={(open) => {
            if (open) setShowUploadDocPopup(false);
            else onClose();
          }}
          patientData={record}
          setIsFileSizeError={() => {}}
          setIsFileLimitError={() => {}}
          setIsFileTypeError={() => {}}
        />
      )}
    </Suspense>
  );
}
