import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import { usePatientPicker } from '../hooks/usePatientPicker';
import {
  formatPatientPickerMeta,
  getPatientDisplayName,
  getPatientInitials,
  mergePickerPatients,
  resolveAiMatchPatient,
  sortPickerPatientsWithSelectedFirst,
} from '../utils/patientPickerUtils';
import { SearchNormal, StatSparklesIcon, TpIcon } from './TpIcons';
import './AssignPatientPicker.scss';

function CheckIcon({ size = 12, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AssignPatientPicker({
  open,
  onCancel,
  suggestedName = '',
  dbMatchCandidates = [],
  title = 'Assign to patient',
  confirmLabel = 'Confirm assignment',
  onConfirm,
  confirming = false,
  mode = 'opd',
}) {
  const {
    query,
    setQuery,
    patients,
    loading,
    loadingMore,
    hasMore,
    loadError,
    loadMore,
  } = usePatientPicker({ enabled: open, mode });
  const [selectedId, setSelectedId] = useState(null);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const observer = useRef(null);

  const mergedPatients = useMemo(
    () => mergePickerPatients(patients, dbMatchCandidates),
    [patients, dbMatchCandidates]
  );

  const aiMatchPatient = useMemo(
    () => resolveAiMatchPatient(mergedPatients, dbMatchCandidates, suggestedName),
    [mergedPatients, dbMatchCandidates, suggestedName]
  );

  const listPriorityId = useMemo(() => {
    if (hasManualSelection && selectedId) return selectedId;
    return aiMatchPatient?.patient_unique_id || null;
  }, [hasManualSelection, selectedId, aiMatchPatient?.patient_unique_id]);

  const displayPatients = useMemo(
    () => sortPickerPatientsWithSelectedFirst(mergedPatients, listPriorityId),
    [mergedPatients, listPriorityId]
  );

  useEffect(() => {
    if (!open) {
      setHasManualSelection(false);
      setSelectedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasManualSelection) return;
    setSelectedId(aiMatchPatient?.patient_unique_id || null);
  }, [open, aiMatchPatient?.patient_unique_id, hasManualSelection]);

  useEffect(() => () => {
    if (observer.current) observer.current.disconnect();
  }, []);

  const lastPatientElementRef = useCallback((node) => {
    if (observer.current) {
      observer.current.disconnect();
    }

    if (!node || loading || loadingMore || !hasMore) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: node.closest('.tp-assign-picker__list'),
        threshold: 0.1,
        rootMargin: '80px',
      }
    );

    observer.current.observe(node);
  }, [hasMore, loadMore, loading, loadingMore]);

  const selectedPatient = displayPatients.find(
    (patient) => String(patient.patient_unique_id) === String(selectedId)
  );

  const handleSelectPatient = (id) => {
    setHasManualSelection(true);
    setSelectedId(id);
  };

  if (!open) return null;

  return (
    <div className="tp-assign-picker">
      <div className="tp-assign-picker__title-row">
        <div className="tp-assign-picker__title">{title}</div>
        {onCancel && (
          <button type="button" className="tp-assign-picker__cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {aiMatchPatient && (
        <div className="tp-assign-picker__ai-banner">
          <StatSparklesIcon size={12} color="#6d28d9" />
          <span>
            AI match: <strong>{getPatientDisplayName(aiMatchPatient)}</strong>
          </span>
        </div>
      )}

      <div className="tp-assign-picker__search">
        <TpIcon icon={SearchNormal} size={16} color="#94a3b8" />
        <input
          type="search"
          placeholder="Search patients by name, MRN, bed…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && <Spin size="small" />}
      </div>

      <div className="tp-assign-picker__list">
        {!loading && displayPatients.length === 0 && (
          <div className="tp-assign-picker__empty">
            {query.trim()
              ? `No patients found for "${query.trim()}"`
              : loadError || 'No patients available'}
          </div>
        )}

        {displayPatients.map((patient, index) => {
          const id = patient.patient_unique_id;
          const isSelected = String(selectedId) === String(id);
          const isAiMatch = aiMatchPatient
            && String(aiMatchPatient.patient_unique_id) === String(id);
          const displayName = getPatientDisplayName(patient);
          const meta = formatPatientPickerMeta(patient);
          const isLast = index === displayPatients.length - 1;

          return (
            <button
              key={id}
              type="button"
              ref={isLast ? lastPatientElementRef : null}
              className={`tp-assign-picker__item ${isSelected ? 'tp-assign-picker__item--selected' : ''}`}
              onClick={() => handleSelectPatient(id)}
            >
              <span className="tp-assign-picker__avatar">{getPatientInitials(patient.pm_fullname)}</span>
              <div className="tp-assign-picker__info">
                <div className="tp-assign-picker__name-row">
                  <span className="tp-assign-picker__name">{displayName}</span>
                  {isAiMatch && (
                    <span className="tp-assign-picker__ai-badge">
                      <StatSparklesIcon size={9} color="#6d28d9" />
                      AI match
                    </span>
                  )}
                </div>
                {meta && <span className="tp-assign-picker__meta">{meta}</span>}
              </div>
              {isSelected && (
                <span className="tp-assign-picker__check" aria-hidden>
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}

        {loadingMore && (
          <div className="tp-assign-picker__loading-more">
            <Spin size="small" />
            <span>Loading more patients…</span>
          </div>
        )}

        {!hasMore && !loading && displayPatients.length > 0 && (
          <div className="tp-assign-picker__end">
            Showing all {displayPatients.length} patients
          </div>
        )}
      </div>

      <div className="tp-assign-picker__footer">
        <button
          type="button"
          className="tp-assign-picker__confirm"
          disabled={!selectedPatient || confirming}
          onClick={() => selectedPatient && onConfirm(selectedPatient)}
        >
          <CheckIcon size={16} color="#ffffff" />
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export default AssignPatientPicker;
