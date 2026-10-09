import React, { useState, useCallback, useEffect } from "react";
import Card from "react-bootstrap/Card";
import { Spin } from "antd";
import { useLocation } from "react-router-dom";
import { useIsDentalEnabled } from "../hooks/useIsDentalEnabled";
import { getExamination } from "../api/services/ApiDental";
import { getOralExamination } from "../api/services/ApiOral";
import { ORAL_POSITION_LABEL } from "./dental/examination/types";
import {
  extractDentalApiPayload,
  hasDentalExamPayload,
  mapOralApiToChart,
  normalizeOralHistoryList,
} from "../utils/cardiologyDentalOralExam";
import {
  buildToothCategories,
  getTeethWithDentalData,
} from "./print_settings/dental/dentalPrintHelpers";
import { hasOralExamChartData } from "../utils/examChartStorage";
import { ASSETS } from "../assets";

const { examination: Examinationsicon, heartbeat: heartBeat } = ASSETS.images;

const ORAL_GROUP_DEFS = [
  { label: "Past Procedures", kind: "past" },
  { label: "Findings", kind: "finding" },
  { label: "Procedures", kind: "procedure" },
];

function mergeOralVisitsChart(visits) {
  const oralEntries = [];
  const noteParts = [];

  (visits || []).forEach((visit) => {
    const chart = mapOralApiToChart(visit);
    if (Array.isArray(chart.oralEntries)) {
      oralEntries.push(...chart.oralEntries);
    }
    const notes = String(chart.oralNotes || "").trim();
    if (notes) noteParts.push(notes);
  });

  return {
    oralEntries,
    oralNotes: noteParts.join("\n"),
  };
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

function formatOralRecordMeta(entry) {
  const since = String(entry?.since || "").trim();
  const note = String(entry?.note || "").trim();
  const region = (entry?.surfaces || [])
    .map((s) => ORAL_POSITION_LABEL[s] || s)
    .join(", ");
  const parts = [region, since ? `since ${since}` : "", note].filter(Boolean);
  return parts.length ? ` (${parts.join(" | ")})` : "";
}

function RecordSectionHeader({ title }) {
  return <div className="dental-oral-record-header">{title}</div>;
}

function renderOralRecordSection(oralVisits) {
  const { oralEntries, oralNotes } = mergeOralVisitsChart(oralVisits);
  const oralGroups = getOralGroups(oralEntries);
  if (oralGroups.length === 0 && !oralNotes) return null;

  return (
    <div className="dental-oral-record-section">
      <RecordSectionHeader title="Oral Record" />
      <div className="dental-oral-record-content">
        {oralGroups.map((group) => (
          <p className="dental-oral-record-line" key={group.label}>
            <strong>{group.label}: </strong>
            {group.list.map((entry, idx) => (
              <span key={`${group.label}-${idx}`}>
                {idx > 0 ? ", " : ""}
                <span className="dental-oral-record-item-name">{entry.name}</span>
                <span className="dental-oral-record-item-meta">
                  {formatOralRecordMeta(entry)}
                </span>
              </span>
            ))}
          </p>
        ))}
        {oralNotes ? (
          <p className="dental-oral-record-line">
            <strong>Notes: </strong>
            {oralNotes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function renderToothRecordSection(dentalExam) {
  const toothStates = Array.isArray(dentalExam?.tooth_states) ? dentalExam.tooth_states : [];
  const teethWithData = getTeethWithDentalData(toothStates, true);
  if (teethWithData.length === 0) return null;

  return (
    <div className="dental-oral-record-section">
      <RecordSectionHeader title="Tooth Record" />
      <div className="dental-oral-record-content">
        {teethWithData.map((toothState) => {
          const { toothCode, fullName, categories } = buildToothCategories(toothState, true);
          if (!categories.length) return null;

          return (
            <p className="dental-oral-record-line" key={`tooth-${toothCode}`}>
              <strong>{fullName}: </strong>
              {categories.map((cat, catIdx) => (
                <span key={cat.label}>
                  {catIdx > 0 ? "; " : ""}
                  <strong>{cat.label}: </strong>
                  {cat.items.map((item, itemIdx) => (
                    <span key={`${cat.label}-${itemIdx}`}>
                      {itemIdx > 0 ? ", " : ""}
                      <span className="dental-oral-record-item-name">{item.name}</span>
                      {item.details ? (
                        <span className="dental-oral-record-item-meta">{item.details}</span>
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

function DentalOralExaminationHistory() {
  const [isExpand, setIsExpand] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dentalExam, setDentalExam] = useState(null);
  const [oralVisits, setOralVisits] = useState([]);

  const location = useLocation();
  const locationState = location.state || {};
  const { patient_data } = locationState;
  const patientId = patient_data?.patient_unique_id;

  const showDentalOralHistory = useIsDentalEnabled();

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

  const hasDentalData = getTeethWithDentalData(dentalExam?.tooth_states, true).length > 0;
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
              <div className="dental-oral-record-summary mb-0">
                {hasOralData && renderOralRecordSection(oralVisits)}
                {hasDentalData && renderToothRecordSection(dentalExam)}
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
