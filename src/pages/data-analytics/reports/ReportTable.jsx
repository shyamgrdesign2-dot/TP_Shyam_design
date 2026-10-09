import React, { useCallback, useEffect, useState } from "react";
import { DataTable, Button, Empty, Badge } from "@dhspl-tatvacare/tesseract-ui";
import { deriveColumns, normalizeTable, downloadBlob } from "./tableUtils";
import { formatINR } from "../charts/format";

// Generic Tab-3 report table: fetches a tabular payload, auto-derives columns
// from the returned rows (robust to unknown shapes), and offers CSV export.
export default function ReportTable({
  fetcher,
  exportFetcher,
  params = {},
  filename = "report.csv",
  summaryKeys,
}) {
  const [state, setState] = useState({
    loading: true,
    rows: [],
    pagination: null,
    summary: null,
  });
  const [exporting, setExporting] = useState(false);

  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    if (typeof fetcher !== "function") {
      setState({ loading: false, rows: [], pagination: null, summary: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const payload = await fetcher(params).catch(() => null);
    setState({ loading: false, ...normalizeTable(payload) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  const onExport = async () => {
    if (typeof exportFetcher !== "function") return;
    setExporting(true);
    try {
      const blob = await exportFetcher({ ...params, format: "csv" });
      await downloadBlob(blob?.data ?? blob, filename);
    } catch (e) {
      /* export not available — silent */
    } finally {
      setExporting(false);
    }
  };

  const columns = deriveColumns(state.rows);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {state.pagination?.total != null && (
          <Badge variant="soft" color="neutral">
            {`${state.pagination.total} records`}
          </Badge>
        )}
        {exportFetcher && (
          <div style={{ marginLeft: "auto" }}>
            <Button
              variant="outline"
              theme="neutral"
              size="sm"
              loading={exporting}
              disabled={state.loading || !state.rows.length}
              onClick={onExport}
            >
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {state.summary && (
        <ReportSummary summary={state.summary} keys={summaryKeys} />
      )}

      <DataTable
        columns={columns}
        data={state.rows}
        rowKey={(row, i) => row?.id ?? row?.inp_rm_id ?? row?.rm_id ?? i}
        stickyHeader
        maxHeight={440}
        sortable
        pageSize={10}
        loading={state.loading}
        emptyState={
          <Empty
            title="No records"
            description="No data for the selected filters."
          />
        }
      />
    </div>
  );
}

// Render a compact summary strip from a {key: value} summary object.
function ReportSummary({ summary, keys }) {
  if (!summary || typeof summary !== "object") return null;
  const entries = (keys || Object.keys(summary))
    .filter((k) => summary[k] != null && typeof summary[k] !== "object")
    .slice(0, 6);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "4px 2px" }}>
      {entries.map((k) => (
        <div key={k} style={{ minWidth: 120 }}>
          <div style={{ fontSize: 12, color: "var(--tesseract-slate-500)", textTransform: "capitalize" }}>
            {k.replace(/([a-z])([A-Z])/g, "$1 $2")}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--tesseract-slate-800)" }}>
            {typeof summary[k] === "number" ? formatINR(summary[k]) : String(summary[k])}
          </div>
        </div>
      ))}
    </div>
  );
}
