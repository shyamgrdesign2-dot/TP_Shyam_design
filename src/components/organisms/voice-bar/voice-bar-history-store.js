"use client";

/**
 * Quick-dictation history — last 50 transcripts, persisted in localStorage,
 * each tagged with the patient it was spoken against. Global per browser
 * (not per patient) so the doctor can scan everything they've dictated
 * across the session.
 *
 * Schema: { id: string, ts: number, text: string, patientId?: string, patientName?: string }
 */

const STORAGE_KEY = "tp-voicerx-quickdictation-history-v1";
const MAX_ENTRIES = 50;

function safeRead() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / disabled — silently ignore */
  }
}

export function loadHistory() {
  return safeRead();
}

export function appendHistory(text, patient) {
  const value = (text ?? "").trim();
  if (!value) return safeRead();
  const entry = {
    id: `qd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    text: value,
    patientId: patient?.id ?? null,
    patientName: patient?.name ?? null,
  };
  const next = [entry, ...safeRead()].slice(0, MAX_ENTRIES);
  safeWrite(next);
  return next;
}

export function clearHistory() {
  safeWrite([]);
  return [];
}

export function deleteHistoryEntry(id) {
  const next = safeRead().filter((e) => e.id !== id);
  safeWrite(next);
  return next;
}

export const HISTORY_MAX = MAX_ENTRIES;
