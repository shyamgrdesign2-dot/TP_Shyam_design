"use client";
import { useEffect, useState } from 'react';
import { isLiveTestPatient } from './liveClient';
import { SYNC_SUMMARY } from './fixtures';

const unknown = { syncedAt: null, prescriptions: null, pathologyReports: null, radiologyReports: null, visits: null };
const requests = new Map();
export function usePatientSync(patientId) {
  const live = isLiveTestPatient(patientId);
  const [state, setState] = useState(unknown);
  useEffect(() => {
    if (!live) return;
    let active = true;
    setState(unknown);
    if (!requests.has(patientId)) requests.set(patientId, fetch(`/api/velora/starters?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Record coverage unavailable');
      return { ...unknown, visits: data.visitCount ?? null, syncedAt: data.corpus_updated_at || null };
    }).catch(error => { requests.delete(patientId); return { ...unknown, error: error.message }; }));
    requests.get(patientId).then(data => { if (active) setState(data); });
    const update = event => {
      if (event.detail.patientId === patientId) setState(current => ({ ...current, syncedAt: event.detail.syncedAt, error: null }));
    };
    window.addEventListener('velora:sync', update);
    return () => { active = false; window.removeEventListener('velora:sync', update); };
  }, [patientId, live]);
  const summary = live ? state : SYNC_SUMMARY;
  const date = summary.syncedAt ? new Date(summary.syncedAt) : null;
  const validDate = date && !Number.isNaN(date.valueOf()) ? date : null;
  const format = options => validDate ? new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'Asia/Kolkata' }).format(validDate) : null;
  return { ...summary, live, shortDate: format({ day: 'numeric', month: 'short' }), shortTime: format({ hour: 'numeric', minute: '2-digit', hour12: true }), label: format({ day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) };
}
