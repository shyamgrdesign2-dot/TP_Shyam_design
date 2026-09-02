import React from "react";
import { Button } from "@dhspl-tatvacare/tesseract-ui";
import { useListingAccess } from "../data/useListingAccess";
import { queueRxChoices } from "./rowActions";
import { TAB_IDS } from "../data/appointmentsConfig";

/**
 * Queue / Referral row CTA. Same options and gates as PrimaryActionButton;
 * Tesseract Button for listing styles. The typed-Rx face is always "Consult".
 * Chikitsalay Consult-only applies to clinic Queue, not Referral.
 */
export default function QueueRxSplitButton({ row, onRowAction, tabId = TAB_IDS.QUEUE }) {
  const access = useListingAccess();
  const { primary, rest } = queueRxChoices({
    ...access,
    isChikitsalay: tabId === TAB_IDS.REFERRAL ? false : access.isChikitsalay,
  });
  if (!primary) return null;

  const run = (action) => () => onRowAction?.(action, row);
  const menu = rest
    .filter((o) => o.action !== primary.action)
    .map((o) => ({ id: o.id, label: o.label, onClick: run(o.action) }));

  return (
    <Button
      variant="outline"
      theme="primary"
      size="sm"
      onClick={run(primary.action)}
      menu={menu.length ? menu : undefined}
    >
      {primary.label}
    </Button>
  );
}
