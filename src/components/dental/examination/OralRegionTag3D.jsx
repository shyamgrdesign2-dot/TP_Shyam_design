import { memo, useState } from "react";
import { Html } from "@react-three/drei";
import { ORAL_POSITION_LABEL } from "./types";

const TIP_PLACEMENTS = {
  below: {
    tip: { top: "calc(100% + 14px)", left: "50%", transform: "translateX(-50%)" },
    leader: { bottom: "100%", left: "50%", width: 0, height: 14, borderLeft: "1px dashed rgba(148,163,184,0.5)", transform: "translateX(-50%)" },
  },
  above: {
    tip: { bottom: "calc(100% + 14px)", left: "50%", transform: "translateX(-50%)" },
    leader: { top: "100%", left: "50%", width: 0, height: 14, borderLeft: "1px dashed rgba(148,163,184,0.5)", transform: "translateX(-50%)" },
  },
  right: {
    tip: { left: "calc(100% + 14px)", top: "50%", transform: "translateY(-50%)" },
    leader: { right: "100%", top: "50%", height: 0, width: 14, borderTop: "1px dashed rgba(148,163,184,0.5)", transform: "translateY(-50%)" },
  },
  left: {
    tip: { right: "calc(100% + 14px)", top: "50%", transform: "translateY(-50%)" },
    leader: { left: "100%", top: "50%", height: 0, width: 14, borderTop: "1px dashed rgba(148,163,184,0.5)", transform: "translateY(-50%)" },
  },
};

const OralRegionTag3D = memo(function OralRegionTag3D({ position, list, label, forceShowAll = false, onHover, hideTag = false, tooltipSide = "below" }) {
  const [hover, setHover] = useState(false);
  if (hideTag || !list || list.length === 0) return null;
  const showTip = hover || forceShowAll;
  const firstName = list[0]?.name ?? "";
  const tagLabel = list.length > 1 ? `${firstName} +${list.length - 1}` : firstName;
  const siteOf = (e) => ((e.surfaces || []).map((p) => ORAL_POSITION_LABEL[p] || p).join(", ") || "Whole mouth");
  const metaOf = (e) => [siteOf(e), (e.since || "").trim() ? `since ${e.since.trim()}` : "", (e.note || "").trim()].filter(Boolean).join(" | ");
  const setHov = (v) => {
    setHover(v);
    onHover?.(v);
  };

  const groups = { past: [], findings: [], procedures: [] };
  list.forEach((e) => {
    if (e.kind === "past") groups.past.push(e);
    else if (e.kind === "procedure") groups.procedures.push(e);
    else groups.findings.push(e);
  });

  const secBox = (title, items) => items.length ? (
    <div className="oral-tag-sec">
      <div className="oral-tag-sec-head">{title}</div>
      <div className="oral-tag-rows">
        {items.map((e) => {
          const m = metaOf(e);
          return (
            <div key={e.id} className="oral-tag-row">
              <span className="oral-tag-row-name">{e.name}</span>
              {m ? <span className="oral-tag-row-meta"> ({m})</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const placement = TIP_PLACEMENTS[tooltipSide] || TIP_PLACEMENTS.below;

  return (
    <Html position={position} center zIndexRange={showTip ? [500, 300] : [40, 10]} style={{ pointerEvents: "auto", whiteSpace: "nowrap" }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="oral-tag-wrap">
        <div className="oral-region-tag">
          {tagLabel}
        </div>
        {showTip && (
          <div className="oral-tag-tip" style={placement.tip}>
            <div className="oral-tag-leader" style={placement.leader} />
            <div className="oral-tag-tip-header">
              <span className="oral-tag-tip-badge">Oral</span>
              <span className="oral-tag-tip-label">{label || "Oral Examination"}</span>
            </div>
            <div className="oral-tag-sections">
              {secBox("Past Procedures", groups.past)}
              {secBox("Findings", groups.findings)}
              {secBox("Procedures", groups.procedures)}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
});

export default OralRegionTag3D;
