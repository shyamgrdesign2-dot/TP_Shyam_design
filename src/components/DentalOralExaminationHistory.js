import React, { useState, useCallback, useEffect } from "react";
import Card from "react-bootstrap/Card";
import { Spin } from "antd";
import moment from "moment";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { getExamination } from "../api/services/ApiDental";
import { getOralExamination } from "../api/services/ApiOral";
import { GB_DENTAL_MODULE } from "../utils/constants";
import {
  extractDentalApiPayload,
  formatDentalExamItem,
  formatOralEntryMeta,
  getToothFullName,
  hasDentalExamPayload,
  mapOralApiToChart,
  normalizeOralHistoryList,
} from "../utils/cardiologyDentalOralExam";
import { hasOralExamChartData } from "../utils/examChartStorage";
import { ASSETS } from "../assets";

const { examination: Examinationsicon, heartbeat: heartBeat } = ASSETS.images;

const ORAL_GROUP_DEFS = [
  { label: "Past Procedures", kind: "past" },
  { label: "Findings", kind: "finding" },
  { label: "Procedures", kind: "procedure" },
];

function resolveVisitDateLabel(item) {
  const raw =
    item?.consultation_date ||
    item?.consultationDate ||
    item?.patient_consultaion_date ||
    item?.date ||
    item?.created_at ||
    item?.updated_at;
  return raw ? moment(raw).format("D MMM YYYY") : "";
}

function getTeethWithData(dentalExam) {
  const toothStates = Array.isArray(dentalExam?.tooth_states) ? dentalExam.tooth_states : [];
  return toothStates.filter((toothState) => {
    const hasHistory = (toothState.treatment_history || []).length > 0;
    const hasFindings = (toothState.findings || []).length > 0;
    const hasProcedures = (toothState.procedures || []).length > 0;
    const hasNotes = String(toothState.overall_notes || "").trim().length > 0;
    return hasHistory || hasFindings || hasProcedures || hasNotes;
  });
}

function getOralGroups(oralEntries) {
  return ORAL_GROUP_DEFS.map((group) => ({
    ...group,
    list: (oralEntries || []).filter((entry) =>
      group.kind === "past"
        ? entry.kind === "past"
        : group.kind === "procedure"
          ? entry.kind === "procedure"
          : entry.kind !== "past" && entry.kind !== "procedure"
    ),
  })).filter((group) => group.list.length > 0);
}

function renderDentalSection(dentalExam) {
  const teethWithData = getTeethWithData(dentalExam);
  if (teethWithData.length === 0) return null;

  return (
    <div className="opthal-section">
      <div className="opthal-section-header">
        <img className="opthal-section-icon" src={Examinationsicon} alt="" />
        <div className="opthal-section-title">Dental Examination</div>
      </div>
      <div className="visit-exam-inline-list">
        {teethWithData.map((toothState) => {
          const toothCode = toothState.tooth_code;
          const fullName = getToothFullName(toothCode);
          const categories = [];
          if ((toothState.treatment_history || []).length > 0) {
            categories.push({
              label: "Past Procedures",
              items: (toothState.treatment_history || []).map((item) =>
                formatDentalExamItem(item, toothCode)
              ),
            });
          }
          if ((toothState.findings || []).length > 0) {
            categories.push({
              label: "Findings",
              items: (toothState.findings || []).map((item) =>
                formatDentalExamItem(item, toothCode)
              ),
            });
          }
          if ((toothState.procedures || []).length > 0) {
            categories.push({
              label: "Procedures",
              items: (toothState.procedures || []).map((item) =>
                formatDentalExamItem(item, toothCode)
              ),
            });
          }
          const notes = String(toothState.overall_notes || "").trim();
          if (notes) {
            categories.push({
              label: "Notes",
              items: [{ name: notes, details: "" }],
            });
          }
          return (
            <p className="visit-exam-line" key={`dental-tooth-${toothCode}`}>
              <strong>{fullName}: </strong>
              {categories.map((cat, catIdx) => (
                <span key={cat.label}>
                  {catIdx > 0 ? "; " : ""}
                  <strong>{cat.label}: </strong>
                  {cat.items.map((item, itemIdx) => (
                    <span key={`${cat.label}-${itemIdx}`}>
                      {itemIdx > 0 ? ", " : ""}
                      <span className="visit-exam-item-name">{item.name}</span>
                      {item.details ? (
                        <span className="visit-exam-item-meta">{item.details}</span>
                      ) : null}
                    </span>
                  ))}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function renderOralVisitSection(visit, visitKey) {
  const chart = mapOralApiToChart(visit);
  if (!hasOralExamChartData(chart)) return null;

  const oralEntries = Array.isArray(chart.oralEntries) ? chart.oralEntries : [];
  const oralNotes = String(chart.oralNotes || "").trim();
  const oralGroups = getOralGroups(oralEntries);
  const dateLabel = resolveVisitDateLabel(visit);

  return (
    <div className="opthal-section" key={visitKey}>
      <div className="opthal-section-header">
        <img className="opthal-section-icon" src={Examinationsicon} alt="" />
        <div className="opthal-section-title">
          Oral Examination{dateLabel ? ` (${dateLabel})` : ""}
        </div>
      </div>
      <div className="visit-exam-inline-list">
        {oralGroups.map((group) => (
          <p className="visit-exam-line" key={`${visitKey}-${group.label}`}>
            <strong>{group.label}: </strong>
            {group.list.map((entry, idx) => (
              <span key={`${visitKey}-${group.label}-${idx}`}>
                {idx > 0 ? ", " : ""}
                <span className="visit-exam-item-name">{entry.name}</span>
                <span className="visit-exam-item-meta">{formatOralEntryMeta(entry)}</span>
              </span>
            ))}
          </p>
        ))}
        {oralNotes ? (
          <p className="visit-exam-line">
            <strong>Notes: </strong>
            {oralNotes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DentalOralExaminationHistory() {
  const [isExpand, setIsExpand] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dentalExam, setDentalExam] = useState(null);
  const [oralVisits, setOralVisits] = useState([]);

  const location = useLocation();
  const locationState = location.state || {};
  const { patient_data } = locationState;
  const patientId = patient_data?.patient_unique_id;

  const { profile } = useSelector((state) => state.doctors);
  const isDentalEnabled = useFeatureIsOn(GB_DENTAL_MODULE);
  const isDentalDoctor =
    profile?.dp_id === 26 ||
    String(profile?.dp_name || "").toLowerCase().includes("dental");
  const showDentalOralHistory = isDentalEnabled || isDentalDoctor;

  useEffect(() => {
    if (!showDentalOralHistory || !patientId) {
      setDentalExam(null);
      setOralVisits([]);
      return undefined;
    }

    let cancelled = false;

    const fetchExaminationHistory = async () => {
      setLoading(true);
      try {
        const [dentalRes, oralRes] = await Promise.all([
          getExamination(patientId).catch(() => null),
          getOralExamination(patientId).catch(() => null),
        ]);
        if (cancelled) return;

        const dentalPayload = extractDentalApiPayload(dentalRes);
        setDentalExam(hasDentalExamPayload(dentalPayload) ? dentalPayload : null);

        const oralPayload = extractDentalApiPayload(oralRes);
        const visits = normalizeOralHistoryList(oralPayload).filter((visit) =>
          hasOralExamChartData(mapOralApiToChart(visit))
        );
        setOralVisits(visits);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load dental/oral examination history:", err);
          setDentalExam(null);
          setOralVisits([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExaminationHistory();
    return () => {
      cancelled = true;
    };
  }, [showDentalOralHistory, patientId]);

  const manageExpand = useCallback(() => {
    setIsExpand((prev) => !prev);
  }, []);

  if (!showDentalOralHistory) return null;

  const hasDentalData = getTeethWithData(dentalExam).length > 0;
  const hasOralData = oralVisits.length > 0;
  const hasHistoryContent = hasDentalData || hasOralData;

  return (
    <div className="appointment-wrap PatientDetailswrap m-0">
      <Card>
        <Card.Header className="bg-white py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <img src={Examinationsicon} alt="Dental & Oral Examination" className="me-3" />
              Dental & Oral Examination
            </div>
          </div>
        </Card.Header>
        <div className="p-3">
          {hasHistoryContent ? (
            <div
              className={`${!isExpand ? "overflow-hidden" : "overflow-auto"}`}
              style={{ height: isExpand ? 529 : 190 }}
            >
              <div className="opthal-summary visit-exam-summary mb-0">
                {hasDentalData && renderDentalSection(dentalExam)}
                {oralVisits.map((visit, idx) =>
                  renderOralVisitSection(
                    visit,
                    `oral-visit-${resolveVisitDateLabel(visit) || idx}`
                  )
                )}
              </div>
            </div>
          ) : (
            <div
              className="d-flex flex-column justify-content-center"
              style={{ minHeight: "190px" }}
            >
              {loading ? (
                <div className="align-items-center text-center">
                  <Spin />
                </div>
              ) : (
                <div className="align-items-center text-center">
                  <img
                    src={heartBeat}
                    width={57}
                    height={52}
                    alt="No dental or oral examination saved for the patient!"
                  />
                  <p className="mt-4 fontroboto">
                    No Dental or Oral Examination saved <br /> for the patient!
                  </p>
                </div>
              )}
            </div>
          )}
          {hasHistoryContent ? (
            <div
              className="py-2 text-center text-primary fw-medium cursor-pointer"
              onClick={manageExpand}
            >
              {isExpand ? "View less" : "View more"}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default React.memo(DentalOralExaminationHistory);
