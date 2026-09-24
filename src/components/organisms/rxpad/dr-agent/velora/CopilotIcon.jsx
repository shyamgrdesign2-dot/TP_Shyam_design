"use client";
import { TPLibraryIcon } from "@dhspl-tatvacare/tesseract-ui";

// Same renderer and CDN as PM Doctor Portal. Clinical icons are bulk;
// disclosure/size controls are linear and the close-square is bold.
export function CopilotIcon({ name, variant = "bulk", size = 18, ...props }) {
  return <TPLibraryIcon name={name} variant={variant.toLowerCase()} size={size} color="currentColor" {...props} />;
}

// Pin the family: note-2 also exists in the CDN's content-edit family.
export function EvidenceIcon(props) {
  return <CopilotIcon {...props} name="note-2" variant="bulk" family="school-learning" corner="rounded" />;
}

const icon = name => function Icon(props) { return <CopilotIcon name={name} {...props} />; };
export const Calendar2 = icon("calendar");
export const DocumentText = icon("document-text");
export const Receipt1 = icon("receipt-1");
export const Heart = icon("heart");
export const StatusUp = icon("status-up");
export const MessageQuestion = icon("message-question");
export const ClipboardText = icon("clipboard-text");
export const Activity = icon("clipboard-activity");
export const Hospital = icon("hospital");
export const Health = icon("health");
export const SearchStatus = icon("search-status");
export const Clock = icon("clock");
