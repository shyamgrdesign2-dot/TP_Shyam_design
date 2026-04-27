/**
 * Personal Notes panel — free-form notes area.
 */
import React, { useEffect, useState } from "react";
import layout from "./sidebarContentLayout.module.scss";
const PERSONAL_NOTES_STORAGE_KEY = "tp-rxpad-personal-notes";
export function PersonalNotesContent() {
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(PERSONAL_NOTES_STORAGE_KEY);
    if (saved != null) {
      setNotes(saved);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, notes);
  }, [notes]);
  return (
    <div className={layout.fullColumn}>
      <div className={layout.scrollFlex}>
        <div className={layout.innerStack}>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
            placeholder="Write personal notes..."
            className={layout.textareaNotes}
          />
          <p className={layout.notesHint}>
            Doctor-only note. This content is not included in print and is never
            shared with the patient.
          </p>
        </div>
      </div>
    </div>
  );
}
