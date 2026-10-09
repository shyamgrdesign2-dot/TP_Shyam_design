import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Button, Input, Spin, Tabs, Tooltip, message } from "antd";
import ApiAppointments from "../../api/services/ApiAppointments";
import { fetchAllPatients } from "../../pages/allPatients.js/service";
import {
  NeoCopyIcon,
  NeoCheckCircleIcon,
  NeoUserIcon,
  NeoVolumeIcon,
  NeoPillIcon,
  NeoFlaskIcon,
  NeoHeartIcon,
  NeoSearchIcon,
  NeoCalendarIcon,
  NeoClipboardIcon,
  NeoArrowRightIcon,
  NeoSparkleIcon,
} from "./icons";
import {
  copyTextToClipboard,
  getHospitalPatientsFromAppointments,
  mapNeoEncounterToCaseManagerData,
  mapNeoSectionToCaseManagerData,
  matchEncountersToAppointments,
} from "../../utils/neoConsultationUtils";
import { useNeoConsultationContext } from "./NeoConsultationProvider";
import "./NeoConsultation.scss";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Avatar circle using patient initials. */
function PatientAvatar({ name, size = 32 }) {
  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "#7c3aed",
    "#2563eb",
    "#059669",
    "#d97706",
    "#dc2626",
    "#0891b2",
  ];
  const hue = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <span
      className="neo-patient-avatar"
      style={{
        width: size,
        height: size,
        background: hue,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </span>
  );
}

/** Copy a single section text to clipboard. */
async function copySectionText(label, lines) {
  const text = `${label}:\n${lines.join("\n")}`;
  return copyTextToClipboard(text);
}

const normalizePatients = (response) => {
  const raw =
    response?.patients ||
    response?.data?.patients ||
    response?.data?.data?.patients ||
    response?.data ||
    response?.records ||
    [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((p) => ({
      patient_unique_id: p?.patient_unique_id || p?.pm_pid || p?.patient_id || "",
      pm_fullname:
        p?.pm_fullname ||
        [p?.pm_first_name, p?.pm_middle_name, p?.pm_last_name]
          .filter(Boolean)
          .join(" ")
          .trim(),
      pm_salutation: p?.pm_salutation || p?.salutation || "",
      pm_contact_no: p?.pm_contact_no || p?.mobile || p?.phone || "",
      record: p,
    }))
    .filter((p) => p.patient_unique_id);
};

const mergeUniquePatients = (...lists) => {
  const seen = new Set();
  const out = [];
  lists.flat().forEach((p) => {
    const id = p?.patient_unique_id || p?.pm_pid;
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(p);
  });
  return out;
};

/**
 * Section card with two actions:
 *   1. Copy icon  → copies the formatted text to clipboard, then reveals…
 *   2. "Move to Rx Pad" CTA → autofills ONLY this module into the prescription
 *      page and navigates the doctor there.
 *
 * The "Move to Rx Pad" affordance only shows after the doctor copies, which
 * matches the user-requested flow: "user once copy each module there should
 * be an option highlighting move to rx pad".
 */
function SectionCard({
  icon,
  label,
  lines = [],
  children,
  noCopy = false,
  sectionKey,
  onMoveToRx,
  selectedPatient,
}) {
  const [justCopied, setJustCopied] = useState(false);
  const resetTimerRef = useRef(null);
  const disabled = lines.length === 0;

  const handleCopy = useCallback(async () => {
    const ok = await copySectionText(label, lines);
    if (!ok) {
      message.error("Copy failed");
      return;
    }
    message.success(`${label} copied`);
    setJustCopied(true);
    clearTimeout(resetTimerRef.current);
    // Keep the "Move to Rx Pad" CTA visible for 15 s — long enough for the
    // doctor to react, short enough that stale state doesn't linger.
    resetTimerRef.current = setTimeout(() => setJustCopied(false), 15000);
  }, [label, lines]);

  // Clear timer on unmount
  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const handleMoveToRx = useCallback(() => {
    if (!onMoveToRx) return;
    onMoveToRx(sectionKey, label);
    setJustCopied(false);
  }, [onMoveToRx, sectionKey, label]);

  const showMoveToRx = justCopied && !!sectionKey && !!onMoveToRx;

  return (
    <div className={`neo-section${showMoveToRx ? " neo-section--copied" : ""}`}>
      <div className="neo-section__header">
        <span className="neo-section__icon">{icon}</span>
        <span className="neo-section__label">{label}</span>

        {/* Inline "Move to Rx Pad" CTA — appears for 15 s after a copy */}
        {showMoveToRx && (
          <Tooltip
            title={
              !selectedPatient
                ? "Select a patient first (use Change above)"
                : `Autofill only ${label} into the prescription`
            }
            placement="left"
          >
            <button
              type="button"
              className="neo-section__move-btn"
              onClick={handleMoveToRx}
              aria-label={`Move ${label} to Rx pad`}
            >
              <NeoArrowRightIcon size={12} />
              <span>Move to Rx Pad</span>
            </button>
          </Tooltip>
        )}

        {!noCopy && (
          <Tooltip title={`Copy ${label}`} placement="left">
            <button
              type="button"
              className={`neo-section__copy-btn${justCopied ? " neo-section__copy-btn--copied" : ""}`}
              disabled={disabled}
              onClick={handleCopy}
              aria-label={`Copy ${label}`}
            >
              {justCopied ? (
                <NeoCheckCircleIcon size={14} />
              ) : (
                <NeoCopyIcon size={14} />
              )}
            </button>
          </Tooltip>
        )}
      </div>
      <div className="neo-section__body">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────────────────────

function SymptomsList({ symptoms, onMoveToRx, selectedPatient }) {
  if (!symptoms?.length) return null;
  const lines = symptoms.map((s) => {
    const meta = [s.duration, s.severity].filter(Boolean).join(" · ");
    const name = s?.name || s?.lineItem;
    return meta ? `${name} — ${meta}` : name;
  });
  return (
    <SectionCard
      icon={<NeoHeartIcon size={15} />}
      label="Symptoms"
      lines={lines}
      sectionKey="symptoms"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
    >
      <ul className="neo-section__bullet-list">
        {symptoms.map((s, i) => {
          const name = s?.name || s?.lineItem;
          const duration = s?.duration;
          const severity = s?.severity;
          const negated = s?.negated || name?.startsWith("no ");
          return (
            <li
              key={i}
              className={`neo-section__bullet${negated ? " neo-section__bullet--negated" : ""}`}
            >
              <span className="neo-section__dot" data-severity={severity?.toLowerCase()} />
              <span className="neo-section__bullet-name">{name}</span>
              {duration && (
                <span className="neo-section__bullet-meta">{duration}</span>
              )}
              {severity && (
                <span className="neo-section__bullet-meta">{severity}</span>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function ExaminationList({ examinations, onMoveToRx, selectedPatient }) {
  if (!examinations?.length) return null;
  const lines = examinations.map((e) => e?.name || e?.lineItem);
  return (
    <SectionCard
      icon={<NeoFlaskIcon size={15} />}
      label="On Examination"
      lines={lines}
      sectionKey="examinations"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
    >
      <ul className="neo-section__bullet-list">
        {examinations.map((e, i) => (
          <li key={i} className="neo-section__bullet neo-section__bullet--exam">
            <span className="neo-section__dot neo-section__dot--green" />
            <span>{e?.name || e?.lineItem}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function DiagnosisList({ diagnosis, onMoveToRx, selectedPatient }) {
  if (!diagnosis?.length) return null;
  const lines = diagnosis.map((d) => {
    const name = d?.name || d?.lineItem;
    return d?.status ? `${name} (${d.status})` : name;
  });
  return (
    <SectionCard
      icon={<NeoClipboardIcon size={15} />}
      label="Diagnosis"
      lines={lines}
      sectionKey="diagnosis"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
    >
      <ul className="neo-section__diag-list">
        {diagnosis.map((d, i) => {
          const name = d?.name || d?.lineItem;
          const status = d?.status;
          return (
            <li key={i} className="neo-section__diag-item">
              <span className="neo-section__dot neo-section__dot--purple" />
              <span className="neo-section__diag-name">{name}</span>
              {d?.duration && (
                <span className="neo-section__diag-meta">{d.duration}</span>
              )}
              {status && (
                <span
                  className={`neo-section__diag-status neo-section__diag-status--${status.toLowerCase()}`}
                >
                  {status}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function MedicationsList({ medications }) {
  // Medications stay clipboard-copy-only on purpose — see
  // mapNeoEncounterToCaseManagerData: matching drug IDs to the backend
  // catalogue isn't done locally, so we can't safely autofill them into the
  // prescription module. The doctor pastes the copied text manually.
  if (!medications?.length) return null;
  const lines = medications.map((m) => {
    const name = m?.groundedMedicineName || m?.name || m?.lineItem;
    const meta = [m?.frequency, m?.dosage, m?.duration].filter(Boolean).join(" · ");
    return meta ? `${name} — ${meta}` : name;
  });
  return (
    <SectionCard
      icon={<NeoPillIcon size={15} />}
      label="Medications"
      lines={lines}
    >
      <ul className="neo-section__med-list">
        {medications.map((m, i) => {
          const name = m?.groundedMedicineName || m?.name || m?.lineItem;
          if (!name) return null;
          const meta = [m?.frequency, m?.dosage, m?.duration]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={i} className="neo-section__med-row">
              <span className="neo-section__med-name">{name}</span>
              {meta && <span className="neo-section__med-meta">{meta}</span>}
              {m?.notes && (
                <span className="neo-section__med-notes">{m.notes}</span>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function VitalsGrid({ vitals: v, onMoveToRx, selectedPatient }) {
  if (!v) return null;
  const entries = [
    { key: "Temp", val: v.temperature, unit: "°F" },
    { key: "Pulse", val: v.pulse, unit: "bpm" },
    { key: "BP", val: v.bloodPressure, unit: "mmHg" },
    { key: "SpO₂", val: v.spo2, unit: "%" },
    { key: "RR", val: v.respiratoryRate, unit: "/min" },
    { key: "Wt", val: v.weight, unit: "kg" },
    { key: "Ht", val: v.height, unit: "cm" },
    { key: "BMI", val: v.bmi, unit: "" },
  ].filter(({ val }) => val !== undefined && val !== null && val !== "");
  if (!entries.length) return null;
  const lines = entries.map(({ key, val, unit }) => `${key}: ${val}${unit}`);
  return (
    <SectionCard
      icon={<NeoHeartIcon size={15} />}
      label="Vitals"
      lines={lines}
      sectionKey="vitals"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
    >
      <div className="neo-section__vitals-grid">
        {entries.map(({ key, val, unit }) => (
          <div key={key} className="neo-section__vitals-cell">
            <span className="neo-section__vitals-key">{key}</span>
            <span className="neo-section__vitals-val">
              {val}
              {unit && (
                <span className="neo-section__vitals-unit">{unit}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function InvestigationsList({ investigations, onMoveToRx, selectedPatient }) {
  if (!investigations?.length) return null;
  const lines = investigations.map((l) => l?.name || l?.lineItem);
  return (
    <SectionCard
      icon={<NeoSearchIcon size={15} />}
      label="Investigations"
      lines={lines}
      sectionKey="labInvestigation"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
    >
      <ul className="neo-section__bullet-list">
        {investigations.map((l, i) => (
          <li key={i} className="neo-section__bullet">
            <span className="neo-section__dot neo-section__dot--blue" />
            <span>{l?.name || l?.lineItem}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function AdviceBlock({ advice, followUp, onMoveToRx, selectedPatient }) {
  const hasAdvice = advice?.length > 0;
  const hasFollowUp = !!followUp;
  if (!hasAdvice && !hasFollowUp) return null;
  const lines = [
    ...(advice || []).map((a) => a?.name || a?.lineItem || String(a)),
    ...(followUp ? [`Follow-up: ${followUp}`] : []),
  ];
  return (
    <SectionCard
      icon={<NeoCalendarIcon size={15} />}
      label="Advice & Follow-up"
      sectionKey="advice"
      onMoveToRx={onMoveToRx}
      selectedPatient={selectedPatient}
      lines={lines}
    >
      {hasAdvice && (
        <ul className="neo-section__bullet-list">
          {advice.map((a, i) => (
            <li key={i} className="neo-section__bullet">
              <span className="neo-section__dot neo-section__dot--amber" />
              <span>{a?.name || a?.lineItem || String(a)}</span>
            </li>
          ))}
        </ul>
      )}
      {hasFollowUp && (
        <div className="neo-section__followup">
          <NeoCalendarIcon size={13} />
          <span>{followUp}</span>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Change-patient dropdown
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patient search dropdown — calls the same API used by Walk-In / Add Appointment:
 * POST /api/v1/appointment/searchPatient { search: query }
 *
 * Seeds with today's appointment patients immediately, then live-searches
 * on keystroke (debounced 400 ms). The API result shape is the same as
 * `state.records.patients` in Redux (pm_fullname, pm_contact_no, patient_unique_id, …).
 */
/**
 * Patient picker dropdown.
 * - Opens with a list of recent patients from GET /api/v1/patient/listDashboard
 *   (same endpoint used by the All Patients page) so there's always something
 *   to pick from even without a query.
 * - Debounced search on keystroke: first tries listDashboard with `search=`,
 *   falls back to the appointment searchPatient API.
 * - Today's queue patients (from todayPatients prop) are merged at the top.
 */
function ChangePatientDropdown({ todayPatients = [], onSelect, onClose, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [recentPatients, setRecentPatients] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus search on mount; if an initialQuery is provided run it immediately
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    if (initialQuery?.trim()) {
      doSearch(initialQuery.trim());
    } else {
      loadRecent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const loadRecent = async () => {
    setLoading(true);
    try {
      const res = await fetchAllPatients({ page: 1, limit: 25, search: "" });
      const list = normalizePatients(res);
      if (list.length > 0) {
        setRecentPatients(list);
        return;
      }

      // Fallback to appointment search source used across patient flows.
      const res2 = await ApiAppointments.searchPatients("", "");
      setRecentPatients(normalizePatients(res2));
    } catch {
      setRecentPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      // Primary: All-patients dashboard search (same as All Patients page)
      const res = await fetchAllPatients({ page: 1, limit: 25, search: q });
      const list = normalizePatients(res);
      if (list.length > 0) {
        setSearchResults(list);
        setLoading(false);
        return;
      }
      // Fallback: appointment search API
      const res2 = await ApiAppointments.searchPatients(q, "");
      setSearchResults(normalizePatients(res2));
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSearchResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(val.trim()), 350);
  };

  const hasQuery = query.trim().length > 0;

  // Build the display list:
  // - No query: merge today's queue (de-duped) at top, then recent patients
  // - With query: show search results
  const displayList = useMemo(() => {
    if (hasQuery) return searchResults || [];
    return mergeUniquePatients(todayPatients || [], recentPatients);
  }, [hasQuery, searchResults, todayPatients, recentPatients]);

  const renderItem = (p) => {
    const fullName = `${p.pm_salutation ? p.pm_salutation + " " : ""}${p.pm_fullname || ""}`.trim();
    return (
      <button
        key={p.patient_unique_id || p.pm_pid}
        type="button"
        className="neo-change-dropdown__item"
        onClick={() => {
          onSelect({
            patient_unique_id: p.patient_unique_id || p.pm_pid,
            pm_fullname: p.pm_fullname,
            pm_salutation: p.pm_salutation,
            pm_contact_no: p.pm_contact_no,
            record: p,
          });
          onClose();
        }}
      >
        <PatientAvatar name={p.pm_fullname} size={36} />
        <div className="neo-change-dropdown__item-info">
          <div className="neo-change-dropdown__item-name">
            {fullName || `Patient #${p.patient_unique_id || p.pm_pid}`}
          </div>
          {p.pm_contact_no && (
            <div className="neo-change-dropdown__item-phone">{p.pm_contact_no}</div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="neo-change-dropdown">
      <div className="neo-change-dropdown__search">
        <NeoSearchIcon size={15} />
        <Input
          ref={inputRef}
          placeholder="Search by name or mobile..."
          bordered={false}
          value={query}
          onChange={handleQueryChange}
          className="neo-change-dropdown__input"
        />
        {loading && <Spin size="small" />}
      </div>
      {!hasQuery && todayPatients.length > 0 && (
        <div className="neo-change-dropdown__section-label">Today's appointments</div>
      )}
      <div className="neo-change-dropdown__list">
        {!loading && displayList.length === 0 && (
          <div className="neo-change-dropdown__empty">
            {hasQuery ? `No patients found for "${query}"` : "No patients available"}
          </div>
        )}
        {displayList.map(renderItem)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-encounter view
// ─────────────────────────────────────────────────────────────────────────────

function EncounterView({ encounter, suggestedAppointment, hospitalPatients, transcriptionOnly = false }) {
  const ctx = useNeoConsultationContext();
  const [selectedPatient, setSelectedPatient] = useState(
    suggestedAppointment || null
  );
  const [showChangeDropdown, setShowChangeDropdown] = useState(false);
  // Open Transcript tab if there is a transcription (so doctor sees the full text first),
  // fall back to Clinical Notes if there's no transcript but there is structured data.
  const initialTab = (() => {
    const hasTranscript = !!(encounter?.transcription);
    if (transcriptionOnly) return "transcript";
    return hasTranscript ? "transcript" : "clinical";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showChangeDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowChangeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showChangeDropdown]);

  const isAutoDetected = !!suggestedAppointment && !transcriptionOnly;
  // Name that the AI extracted from the recording (may be empty)
  const detectedName =
    encounter?.patientDetails?.name ||
    encounter?.patientLabel ||
    "";
  const displayName = selectedPatient
    ? `${selectedPatient.pm_salutation ? selectedPatient.pm_salutation + " " : ""}${selectedPatient.pm_fullname || ""}`.trim()
    : detectedName || "Select a patient";
  const displayPhone = selectedPatient?.pm_contact_no || encounter?.patientDetails?.phone || "";
  // True when the AI found a name but no actual patient record is linked yet
  const needsPatientPick = !isAutoDetected && !selectedPatient;

  // Bulk autofill — every populated module from the voice API lands in the
  // prescription page's matching section, then we navigate the user there.
  const handleCopyToRx = useCallback(() => {
    if (!selectedPatient) {
      message.warning("Select a patient first to copy to Rx");
      setShowChangeDropdown(true);
      return;
    }
    const caseManagerData = transcriptionOnly
      ? null
      : mapNeoEncounterToCaseManagerData(encounter);
    message.success(
      `Opening prescription for ${selectedPatient.pm_fullname || "patient"}…`
    );
    ctx?.applyToPatient(selectedPatient.record || selectedPatient, encounter, {
      caseManagerData,
      copiedText: transcriptionOnly ? (encounter?.transcription || "") : undefined,
    });
  }, [selectedPatient, encounter, ctx, transcriptionOnly]);

  // Per-section autofill — fired by the "Move to Rx Pad" CTA that appears
  // after a section's copy button is clicked. Only that section ends up in
  // the prescription page's caseManagerData; everything else is empty.
  const handleMoveSectionToRx = useCallback(
    (sectionKey, sectionLabel) => {
      if (!selectedPatient) {
        message.warning(
          `Select a patient first to move ${sectionLabel} to Rx Pad`
        );
        setShowChangeDropdown(true);
        return;
      }
      const caseManagerData = mapNeoSectionToCaseManagerData(sectionKey, encounter);
      if (!caseManagerData) {
        message.error(`Could not prepare ${sectionLabel} for Rx Pad`);
        return;
      }
      message.success(
        `Moving ${sectionLabel} to ${selectedPatient.pm_fullname || "patient"}'s Rx Pad…`
      );
      ctx?.applyToPatient(selectedPatient.record || selectedPatient, encounter, {
        caseManagerData,
      });
    },
    [selectedPatient, encounter, ctx]
  );

  const symptoms = encounter?.symptoms || [];
  const examinations = encounter?.examinations || [];
  const diagnosis = encounter?.diagnosis || [];
  const medications = encounter?.medications || [];
  const labInvestigation = encounter?.labInvestigation || [];
  const advice = encounter?.advice || [];
  const followUp = encounter?.followUp || "";
  const vitals = encounter?.vitalsAndBodyComposition;
  const transcription = encounter?.transcription || "";

  const tabItems = [
    {
      key: "transcript",
      label: (
        <span className="neo-tab-label">
          <NeoVolumeIcon size={14} /> Transcript
        </span>
      ),
      children: (
        <div className="neo-encounter__transcript">
          {transcription ? (
            <p className="neo-encounter__transcript-text">{transcription}</p>
          ) : (
            <p className="neo-encounter__transcript-empty">
              No transcript available for this encounter.
            </p>
          )}
        </div>
      ),
    },
    {
      key: "clinical",
      label: (
        <span className="neo-tab-label">
          <NeoClipboardIcon size={14} /> Clinical Notes
        </span>
      ),
      children: transcriptionOnly ? (
        <div className="neo-encounter__transcript">
          <p className="neo-encounter__transcript-empty" style={{ textAlign: "center", padding: "32px 16px" }}>
            No structured clinical notes were extracted from this recording.<br />
            Select a patient and use <strong>Copy to Rx</strong> to open their prescription with the transcription.
          </p>
        </div>
      ) : (
        <div className="neo-encounter__sections">
          <VitalsGrid
            vitals={vitals}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
          <SymptomsList
            symptoms={symptoms}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
          <ExaminationList
            examinations={examinations}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
          <DiagnosisList
            diagnosis={diagnosis}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
          <MedicationsList medications={medications} />
          <InvestigationsList
            investigations={labInvestigation}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
          <AdviceBlock
            advice={advice}
            followUp={followUp}
            onMoveToRx={handleMoveSectionToRx}
            selectedPatient={selectedPatient}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="neo-encounter">
      {/* ── Patient header ── */}
      <div className="neo-encounter__patient-bar">
        <div className="neo-encounter__patient-left">
          <PatientAvatar name={displayName} size={40} />
          <div className="neo-encounter__patient-info">
            {isAutoDetected ? (
              <span className="neo-encounter__auto-badge">
                <NeoCheckCircleIcon size={12} />
                Auto-detected
              </span>
            ) : needsPatientPick ? (
              <span className="neo-encounter__manual-badge">
                <NeoSparkleIcon size={12} />
                {detectedName
                  ? `AI detected "${detectedName}" — confirm patient`
                  : "Pick a patient to copy to Rx"}
              </span>
            ) : null}
            <div className="neo-encounter__patient-name">{displayName}</div>
            {displayPhone && (
              <div className="neo-encounter__patient-phone">{displayPhone}</div>
            )}
          </div>
        </div>

        <div className="neo-encounter__patient-actions" ref={dropdownRef}>
          <div className="neo-encounter__change-wrap">
            <Button
              size="middle"
              icon={<NeoUserIcon size={14} />}
              className="neo-encounter__change-btn"
              onClick={() => setShowChangeDropdown((v) => !v)}
            >
              {selectedPatient ? "Change" : "Pick patient"}{" "}
              <span className="neo-encounter__change-caret">▾</span>
            </Button>
            {showChangeDropdown && (
              <ChangePatientDropdown
                todayPatients={hospitalPatients}
                onSelect={setSelectedPatient}
                onClose={() => setShowChangeDropdown(false)}
                // Pre-seed the search with the AI-detected name so the doctor
                // only needs to tap the patient row — no manual typing required
                initialQuery={
                  !selectedPatient
                    ? (encounter?.patientDetails?.name || "")
                    : ""
                }
              />
            )}
          </div>

          <Button
            type="primary"
            icon={<NeoArrowRightIcon size={14} />}
            className="neo-encounter__copy-rx-btn"
            onClick={handleCopyToRx}
            disabled={!selectedPatient}
            title={!selectedPatient ? "Select a patient first" : undefined}
          >
            Copy to Rx
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="neo-encounter__tabs"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel root
// ─────────────────────────────────────────────────────────────────────────────

function NeoConsultationPanel() {
  const ctx = useNeoConsultationContext();
  const lastFlashedRecordIdRef = useRef(null);

  const consultationResult = ctx?.consultationResult;
  const rawAppointmentsData = ctx?.appointmentsData;
  const dismissConsultation = ctx?.dismissConsultation;

  // Stabilize arrays so useMemo deps don't change on every render
  const appointmentsData = useMemo(
    () => rawAppointmentsData || [],
    [rawAppointmentsData]
  );

  const transcription = consultationResult?.transcription || "";

  // When patientEncounters is empty but digitizeData has structured data
  // (symptoms, diagnosis, medications, etc.), treat digitizeData as a single
  // implicit encounter so the clinical notes panel always renders.
  // We also attach the top-level transcription so EncounterView can show it
  // (digitizeData itself doesn't carry a transcription field).
  const encounters = useMemo(() => {
    const fromEncounters = consultationResult?.patientEncounters || [];
    if (fromEncounters.length > 0) return fromEncounters;
    const dd = consultationResult?.digitizeData;
    if (!dd) return [];
    const hasData =
      dd.symptoms?.length > 0 ||
      dd.diagnosis?.length > 0 ||
      dd.medications?.length > 0 ||
      dd.examinations?.length > 0 ||
      dd.labInvestigation?.length > 0 ||
      dd.advice?.length > 0 ||
      dd.followUp ||
      (dd.vitalsAndBodyComposition &&
        Object.values(dd.vitalsAndBodyComposition).some(
          (v) => v !== "" && v !== 0 && v != null
        ));
    if (!hasData && !transcription) return [];
    // Merge the top-level transcription into the synthetic encounter object
    return [{ ...dd, transcription: dd.transcription || transcription }];
  }, [consultationResult, transcription]);

  const matchedEncounters = useMemo(
    () => matchEncountersToAppointments(encounters, appointmentsData),
    [encounters, appointmentsData]
  );

  const hospitalPatients = useMemo(
    () => getHospitalPatientsFromAppointments(appointmentsData),
    [appointmentsData]
  );

  // Single active encounter index for multi-encounter navigation.
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!consultationResult) return;
    const recordKey =
      consultationResult.recordId || consultationResult.processedAt;
    if (lastFlashedRecordIdRef.current === recordKey) return;
    lastFlashedRecordIdRef.current = recordKey;
    setActiveIdx(0);
  }, [consultationResult, encounters.length, appointmentsData.length]);

  if (!ctx?.enabled || !ctx.consultationVisible || !consultationResult) {
    return null;
  }

  // Even if the backend returned no structured patientEncounters, we still
  // have a transcription. Build a synthetic "transcription-only" encounter so
  // the doctor can still pick a patient and open their Rx.
  const viewEncounters =
    matchedEncounters.length > 0
      ? matchedEncounters
      : transcription
      ? [
          {
            encounter: { transcription },
            matchedAppointment: null,
            isMatched: false,
            isSyntheticTranscriptOnly: true,
          },
        ]
      : [];

  const currentItem = viewEncounters[activeIdx] || viewEncounters[0];

  if (!currentItem) {
    // Nothing at all — shouldn't normally happen
    return (
      <div className="neo-panel-empty">
        <p className="neo-panel-empty__text">No consultation data available.</p>
        <Button onClick={dismissConsultation}>Done</Button>
      </div>
    );
  }

  return (
    <div className="neo-panel" role="region" aria-label="Neo consultation">
      {/* Multi-encounter navigator (only when > 1 real encounter) */}
      {viewEncounters.length > 1 && (
        <div className="neo-panel__nav">
          {viewEncounters.map((item, idx) => {
            const name =
              item.encounter?.patientDetails?.name ||
              item.encounter?.patientLabel ||
              `Patient ${idx + 1}`;
            return (
              <button
                key={idx}
                type="button"
                className={`neo-panel__nav-btn${idx === activeIdx ? " neo-panel__nav-btn--active" : ""}`}
                onClick={() => setActiveIdx(idx)}
              >
                <PatientAvatar name={name} size={24} />
                <span>{name}</span>
              </button>
            );
          })}
        </div>
      )}

      <EncounterView
        key={activeIdx}
        encounter={currentItem.encounter}
        suggestedAppointment={currentItem.matchedAppointment}
        hospitalPatients={hospitalPatients}
        transcriptionOnly={currentItem.isSyntheticTranscriptOnly}
      />
    </div>
  );
}

export default NeoConsultationPanel;
