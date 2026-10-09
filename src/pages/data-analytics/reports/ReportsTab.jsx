import React, { useState } from "react";
import {
  Button,
  TPLibraryIcon,
} from "@dhspl-tatvacare/tesseract-ui";
import { REPORTS } from "./reportsCatalog";
import SectionBlock from "../sections/SectionBlock";
import ReportDownloadDrawer from "./ReportDownloadDrawer";
import usePermissions from "../data/usePermissions";

const GROUPS = ["Financial", "Clinical"];
const GROUP_ICON = {
  Financial: "dollar-circle",
  Clinical: "activity",
};

export default function ReportsTab({ filters, department = "opd" }) {
  const [active, setActive] = useState(null);
  // Per-user report grants (legacy Role Assignment tables via Pm-Core).
  // Admins / fetch-failure / ungranted users see everything (fail open) —
  // see usePermissions for the rollout posture.
  const permissions = usePermissions(filters?.clinic);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {GROUPS.map((group) => {
        const items = REPORTS.filter(
          (r) =>
            r.group === group &&
            (r.dept === "both" || r.dept === department) &&
            permissions.canView(r.roleId)
        );
        if (!items.length) return null;
        return (
          <SectionBlock key={group} title={group} count={items.length}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(max(240px, calc(25% - 9px)), 1fr))",
                gap: 12,
              }}
            >
              {items.map((r) => (
                <div
                  key={r.id}
                  className="da-kpi-card"
                  onClick={() => setActive(r)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 16,
                    borderRadius: "var(--tesseract-radius-14)",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {/* Top row: title + icon top-aligned */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: "var(--tesseract-fg-heading)", display: "block" }}>
                        {r.label}
                      </span>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          lineHeight: 1.4,
                          color: "var(--tesseract-fg-secondary)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: "2.8em",
                        }}
                      >
                        {r.desc}
                      </p>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: "var(--tesseract-radius-10)",
                        background: "var(--tesseract-violet-100)",
                        color: "var(--tesseract-violet-600)",
                      }}
                    >
                      {r.icon ? (
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-block",
                            width: 22,
                            height: 22,
                            flexShrink: 0,
                            backgroundColor: "var(--tesseract-violet-600)",
                            WebkitMaskImage: `url(${r.icon})`,
                            WebkitMaskSize: "contain",
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskImage: `url(${r.icon})`,
                            maskSize: "contain",
                            maskRepeat: "no-repeat",
                            maskPosition: "center",
                          }}
                        />
                      ) : (
                        <TPLibraryIcon name={GROUP_ICON[group] || "document"} size={22} variant="bulk" color="var(--tesseract-violet-600)" />
                      )}
                    </span>
                  </div>
                  {/* CTA at bottom */}
                  <div style={{ marginTop: "auto", paddingTop: 8 }}>
                    <Button
                      variant="outline"
                      theme="primary"
                      size="sm"
                      fullWidth
                      leftIcon={<TPLibraryIcon name="document-download" size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(r);
                      }}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        );
      })}

      <ReportDownloadDrawer
        report={active}
        department={department}
        filters={filters}
        onClose={() => setActive(null)}
      />
    </div>
  );
}
