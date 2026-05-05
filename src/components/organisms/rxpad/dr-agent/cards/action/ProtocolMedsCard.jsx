"use client";

import { CardShell } from "../CardShell";
import { cn } from "@/src/hooks/utils";
import { useTouchDevice } from "@/src/hooks/use-touch-device";


import { CopyIcon } from "../CopyIcon";












export function ProtocolMedsCard({
  data,
  onCopy,
  onCopySingle
}) {
  const isTouch = useTouchDevice();
  const isSafe =
  !data.safetyCheck.toLowerCase().includes("warning") &&
  !data.safetyCheck.toLowerCase().includes("caution") &&
  !data.safetyCheck.toLowerCase().includes("alert");

  return (
    <CardShell
      icon={<span />}
      tpIconName="pill"
      title="Suggested Rx"
      copyAll={() => onCopy?.(data.copyPayload)}
      copyAllTooltip="Fill medications to RxPad"
      dataSources={["AI-Generated", "Clinical Guidelines"]}>
      
      {/* Diagnosis context */}
      <div className="mb-2 rounded-[6px] bg-tp-slate-50 px-2.5 py-[4px] text-[14px] text-tp-slate-500">
        <span className="font-medium text-tp-slate-600">For:</span>{" "}
        {data.diagnosis}
      </div>

      {/* Safety check line */}
      <div
        className={cn(
          "mb-2 flex items-center gap-1 text-[14px] font-medium",
          isSafe ? "text-tp-success-600" : "text-tp-warning-600"
        )}>
        
        <span>{isSafe ? "\u2713" : "!"}</span>
        <span>{data.safetyCheck}</span>
      </div>

      {/* Medication list */}
      <div className="space-y-0">
        {data.meds.map((med, i) =>
        <div
          key={`${med.name}-${i}`}
          className={cn(
            "group/med flex items-start gap-2 py-[5px]"
          )}
          style={i < data.meds.length - 1 ? { borderBottom: "0.5px solid var(--tp-slate-50, #F8FAFC)" } : undefined}>
          
            {/* Med details */}
            <div className="min-w-0 flex-1">
              <div className="text-[14px]">
                <strong className="font-medium text-tp-slate-800">
                  {med.name}
                </strong>
                <span className="ml-1 text-tp-slate-500">
                  {med.dosage}
                </span>
              </div>
              <div className="text-[14px] text-tp-slate-400">
                {med.timing} · {med.duration}
                {med.notes &&
              <span className="ml-1 italic">{med.notes}</span>
              }
              </div>
            </div>

            {/* Individual copy button — hover only */}
            <CopyIcon
            size={12}
            onClick={() => onCopySingle?.(med.name)}
            className={cn("mt-[2px] transition-opacity", isTouch ? "opacity-70" : "opacity-0 group-hover/med:opacity-100")} />
          
          </div>
        )}
      </div>
    </CardShell>);

}