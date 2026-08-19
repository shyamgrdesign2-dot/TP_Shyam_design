import React from "react";
import { Button } from "@dhspl-tatvacare/tesseract-ui";
import { useListingAccess } from "../data/useListingAccess";
import { queueRxChoices } from "./rowActions";

/**
 * Queue row CTA. Same options and gates as PrimaryActionButton; Tesseract
 * Button for listing styles. The typed-Rx face is always "Consult".
 */
export default function QueueRxSplitButton({ row, onRowAction }) {
  const access = useListingAccess();
  const { primary, rest } = queueRxChoices(access);
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
