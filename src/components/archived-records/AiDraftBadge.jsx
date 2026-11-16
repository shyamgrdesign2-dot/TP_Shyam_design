import React from "react";
import { Badge, Tooltip } from "@dhspl-tatvacare/tesseract-ui";
import { InfoCircle } from "iconsax-reactjs";
import { TpAiSparkIcon } from "../dr-agent/shared/AiBrandSparkIcon";
import styles from "./ArchivedRecords.module.scss";

export const AI_DRAFT_NOTE =
  "This data was read by AI from the scanned file. It has not been verified by a doctor or the medical records team. Review each item against its page and save it. Until then it stays an AI draft.";

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
