import React, { useState } from "react";
import ChartSearchPanel from "../../components/dr-copilot/chart-search/ChartSearchPanel";

/**
 * Live harness for Chart Search against the clinical archive.
 *
 * Must be served from an origin the archive allows: it accepts
 * http://localhost:5173 and rejects http://localhost:3007, so run this with
 * `npm run start:chart`. Route: /chart-search-x
 */
export default function ChartSearchPage() {
  const [mrn, setMrn] = useState("10032023015162");
  const [applied, setApplied] = useState("10032023015162");

  return (
    <div style={{ minHeight: "100vh", background: "#f1f1f5", padding: "28px 24px 80px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#171725", margin: "0 0 4px" }}>
          Chart Search
        </h1>
        <p style={{ fontSize: 13, color: "#717179", margin: "0 0 20px" }}>
          Ask one patient's record a question. Every claim links to the dated record it
          came from.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={mrn}
            onChange={(e) => setMrn(e.target.value)}
            placeholder="Patient MRN"
            style={{
              width: 260,
              height: 38,
              padding: "0 12px",
              border: "1px solid #e2e2ea",
              borderRadius: 10,
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={() => setApplied(mrn.trim())}
            style={{
              height: 38,
              padding: "0 16px",
              border: 0,
              borderRadius: 10,
              background: "#673aac",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Set patient
          </button>
        </div>

        <ChartSearchPanel mrn={applied} patientName={`MRN ${applied}`} />
      </div>
    </div>
  );
}
