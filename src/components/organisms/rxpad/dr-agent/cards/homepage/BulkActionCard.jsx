"use client";
import React, { useState } from "react";
import { Flash, TickCircle } from "iconsax-reactjs";
import { CardShell } from "../CardShell";

import { FooterCTA, FooterCTAGroup } from "../FooterCTA";



export function BulkActionCard({ data, onPillTap }) {
  const [confirmed, setConfirmed] = useState(false);
  const visibleRecipients = data.recipients.slice(0, 3);
  const remainingCount = data.totalCount - visibleRecipients.length;

  return (
    <CardShell
      icon={<Flash size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.action}
      badge={{ label: "Action", color: "#92400E", bg: "#FEF3C7" }}
      sidebarLink={
      confirmed ?
      <FooterCTA
        label={`Sent to ${data.totalCount} recipients`}
        disabled
        tone="neutral"
        iconLeft={<TickCircle size={14} variant="Bold" />} /> :


      <FooterCTAGroup>
            <FooterCTA label="Confirm & Send" onClick={() => setConfirmed(true)} tone="success" fullWidth />
            <FooterCTA label="Cancel" onClick={() => onPillTap?.("Cancel bulk action")} tone="danger" fullWidth />
          </FooterCTAGroup>

      }>
      
      {confirmed ?
      <div className="rounded-[8px] bg-tp-green-50 p-[10px] text-center">
          <p className="text-[14px] font-semibold text-tp-green-700">Action confirmed</p>
          <p className="mt-[2px] text-[12px] text-tp-green-600">Sent to {data.totalCount} recipients</p>
        </div> :

      <>
          {/* Message Preview */}
          <div className="mb-[10px] rounded-[8px] bg-tp-slate-50 p-[8px]">
            <p className="mb-[2px] text-[12px] font-semibold tracking-wider text-tp-slate-400">Message preview</p>
            <p className="text-[14px] text-tp-slate-700 italic">&ldquo;{data.messagePreview}&rdquo;</p>
          </div>

          {/* Recipients */}
          <div className="mb-[8px]">
            <p className="mb-[3px] text-[12px] font-semibold tracking-wider text-tp-slate-400">Recipients ({data.totalCount})</p>
            <div className="space-y-[2px]">
              {visibleRecipients.map((name, i) =>
            <p key={i} className="text-[14px] text-tp-slate-700">&bull; {name}</p>
            )}
              {remainingCount > 0 &&
            <p className="text-[12px] text-tp-slate-400">+ {remainingCount} more</p>
            }
            </div>
          </div>

        </>
      }
    </CardShell>);

}