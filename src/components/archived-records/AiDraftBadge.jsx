import React from "react";
import { Badge, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { InfoCircle } from "iconsax-reactjs";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import styles from "./ArchivedRecords.module.scss";

export const AI_DRAFT_NOTE =
  "This data was read by AI from the scanned file. It has not been verified by a doctor or the medical records team. Review each item against its page and save it. Until then it stays an AI draft.";

// The same words for the blue header of the Rx pad panel: a quiet tag beside
// the section title, readable on the dark bar. Hover or focus says what it means.
export function AiDraftHeaderTag() {
  return (
    <Tooltip content={AI_DRAFT_NOTE}>
      <span className={styles.headerTag} tabIndex={0}>AI draft</span>
    </Tooltip>
  );
}

// "AI draft" with an (i) beside it that says what that means and how it ends.
// `details`, when given, adds what is known about the file to the same hover,
// so the header needs only one (i).
export default function AiDraftBadge({ onDark = false, details = "" }) {
  return (
    <span className={styles.aiDraft}>
      <Badge variant="soft" color="violet" size="sm" icon={<TpAiSparkIcon size={12} />}>AI draft</Badge>
      <Tooltip content={details ? `${AI_DRAFT_NOTE} ${details}` : AI_DRAFT_NOTE}>
        <button type="button" className={styles.infoBtn} data-on-dark={onDark ? "true" : undefined} aria-label="What AI draft means">
          <InfoCircle size={14} />
        </button>
      </Tooltip>
    </span>
  );
}
