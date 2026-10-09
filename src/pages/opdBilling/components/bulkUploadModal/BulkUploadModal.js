import { useState, useRef } from "react";
import { Button, Table, Tag, Alert, Progress, Tooltip, Dropdown } from "antd";
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import CommonModal from "../../../../common/CommonModal";
import { bulkInsertBillItems } from "../../service";
import { calculateTotalAmount } from "../../utils/helper";

// ─── constants ───────────────────────────────────────────────────────────────

const BILL_ITEM_TYPES = [
  { label: "Service",        value: "Service" },
  { label: "Consumable",     value: "Consumables" },
  { label: "Dental Service", value: "Dental_Service" },
];
const VALID_TYPE_VALUES  = BILL_ITEM_TYPES.map((t) => t.value);
const TYPE_LABEL         = Object.fromEntries(BILL_ITEM_TYPES.map((t) => [t.value, t.label]));

const DISCOUNT_TYPES     = ["percentage", "days", "flat"];

// Alphanumeric + common punctuation (spaces, hyphens, parentheses, etc.)
const ALPHANUMERIC_RE    = /^[a-zA-Z0-9 _\-().,'&/]+$/;
const NUMERIC_RE         = /^\d+(\.\d+)?$/;

// ─── column alias map → normalised key ────────────────────────────────────────
const COL_ALIASES = {
  "type": "type",
  "service type": "type",
  "item type": "type",
  "name": "name",
  "service name": "name",
  "item name": "name",
  "dental service name": "name",
  "consumable name": "name",
  "clinical service name": "name",
  "rental service name": "name",
  "price": "price",
  "price per unit": "price",
  "discounttype": "discountType",
  "discount type": "discountType",
  "discount": "discount",
  "gst": "gst",
  "gst (%)": "gst",
};

// ─── sample data ─────────────────────────────────────────────────────────────

const SAMPLE_ROWS = [
  {
    "Type *":          "Service",
    "Name *":          "Consultation Fee",
    "Price *":         500,
    "Discount Type":   "percentage",
    "Discount":        10,
    "GST (%)":         0,
  },
  {
    "Type *":          "Consumables",
    "Name *":          "Dressing Kit",
    "Price *":         150,
    "Discount Type":   "flat",
    "Discount":        0,
    "GST (%)":         5,
  },
  {
    "Type *":          "Dental_Service",
    "Name *":          "Dental Consultation",
    "Price *":         1000,
    "Discount Type":   "percentage",
    "Discount":        0,
    "GST (%)":         0,
  },
];

function buildNotesRow(typeValues) {
  return {
    "Type *":         `MANDATORY. Allowed: ${typeValues.join(" | ")}`,
    "Name *":         "MANDATORY. Any text, special characters allowed.",
    "Price *":        "MANDATORY. Numeric, 0 or more (0 = free service).",
    "Discount Type":  `Optional. Allowed: ${DISCOUNT_TYPES.join(" | ")}`,
    "Discount":       "Optional. Numeric.",
    "GST (%)":        "Optional. Numeric (0–100).",
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function normaliseRow(raw) {
  const out = {};
  Object.keys(raw).forEach((k) => {
    // strip the * suffix used in sample headers
    const clean = k.replace(/\s*\*$/, "").toLowerCase().trim();
    const mapped = COL_ALIASES[clean];
    if (mapped) out[mapped] = String(raw[k] ?? "").trim();
  });
  return out;
}

// Each error identifies the failing column and a human-readable reason,
// so the grid, tooltips and the invalid-rows export can all reference them.
function validateRow(row, validTypeValues) {
  const errors = [];

  // type – mandatory, must be one of allowed values
  if (!row.type) {
    errors.push({ field: "Type", message: "Type is mandatory" });
  } else if (!validTypeValues.includes(row.type)) {
    errors.push({ field: "Type", message: `"${row.type}" is not allowed. Use: ${validTypeValues.join(", ")}` });
  } else if (!ALPHANUMERIC_RE.test(row.type)) {
    errors.push({ field: "Type", message: "Must be alphanumeric" });
  }

  // name – mandatory (special characters allowed)
  if (!row.name) {
    errors.push({ field: "Name", message: "Name is mandatory" });
  }

  // price – mandatory, numeric ≥ 0 (0 = free service)
  if (!row.price) {
    errors.push({ field: "Price", message: "Price is mandatory" });
  } else if (!NUMERIC_RE.test(row.price)) {
    errors.push({ field: "Price", message: "Must be a number ≥ 0 (use 0 for free services)" });
  }

  // discountType – optional but must be valid if provided
  if (row.discountType && !DISCOUNT_TYPES.includes(row.discountType.toLowerCase())) {
    errors.push({ field: "Discount Type", message: `Must be one of: ${DISCOUNT_TYPES.join(", ")}` });
  }

  // discount – optional, numeric
  if (row.discount && !NUMERIC_RE.test(row.discount)) {
    errors.push({ field: "Discount", message: "Must be numeric" });
  }

  // gst – optional, numeric 0–100
  if (row.gst) {
    if (!NUMERIC_RE.test(row.gst)) errors.push({ field: "GST (%)", message: "Must be numeric" });
    else if (parseFloat(row.gst) > 100) errors.push({ field: "GST (%)", message: "Must be ≤ 100" });
  }

  return errors;
}

const formatError = (e) => `${e.field}: ${e.message}`;

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        // keep each row's position in the uploaded file (header is row 1),
        // then skip the notes row — it contains "MANDATORY…" text
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
          defval: "",
        })
          .map((raw, i) => ({ raw, srcRow: i + 2 }))
          .filter(
            ({ raw }) => !Object.values(raw).some((v) => String(v).startsWith("MANDATORY") || String(v).startsWith("Optional"))
          );
        resolve(rows);
      } catch {
        reject(new Error("Could not parse file. Ensure it is a valid CSV or Excel file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

function downloadSample(sampleRows, typeValues) {
  const wb = XLSX.utils.book_new();
  const notesRow = buildNotesRow(typeValues);

  // sheet with notes row first, then sample data
  const ws = XLSX.utils.json_to_sheet([notesRow, ...sampleRows], {
    header: ["Type *", "Name *", "Price *", "Discount Type", "Discount", "GST (%)"],
  });

  // column widths
  ws["!cols"] = [
    { wch: 20 }, { wch: 28 }, { wch: 12 },
    { wch: 18 }, { wch: 12 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "BillingItems");
  XLSX.writeFile(wb, "billing_items_sample.xlsx");
}

// Export only the invalid rows, in original file order, with every uploaded
// column preserved plus the file row number and the validation error(s).
function downloadInvalidRows(invalidRows, format) {
  const sorted = [...invalidRows].sort((a, b) => a._row - b._row);

  const uploadedCols = [];
  sorted.forEach((r) =>
    Object.keys(r._raw).forEach((k) => {
      if (!uploadedCols.includes(k)) uploadedCols.push(k);
    })
  );

  const header = ["Row No.", ...uploadedCols, "Validation Error"];
  const data = sorted.map((r) => ({
    "Row No.": r._row,
    ...Object.fromEntries(uploadedCols.map((c) => [c, r._raw[c] ?? ""])),
    "Validation Error": r._errors.map(formatError).join("; "),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data, { header });
  ws["!cols"] = [{ wch: 8 }, ...uploadedCols.map(() => ({ wch: 18 })), { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "InvalidRows");
  XLSX.writeFile(wb, `invalid_rows.${format}`, { bookType: format });
}

// ─── component ───────────────────────────────────────────────────────────────

const BulkUploadModal = ({ onCancel, onSuccess, isDentalEnabled }) => {
  const [rows, setRows]         = useState(null);
  const [fileError, setFileError] = useState(null);
  const [progress, setProgress] = useState(null);   // { done, total }
  const [result, setResult]     = useState(null);   // { success, failed }
  const [rowFilter, setRowFilter] = useState("all"); // 'all' | 'valid' | 'invalid'
  const fileRef                 = useRef(null);

  const availableTypes = BILL_ITEM_TYPES.filter(
    (t) => t.value !== "Dental_Service" || isDentalEnabled
  );
  const availableTypeValues = availableTypes.map((t) => t.value);
  const availableSampleRows = SAMPLE_ROWS.filter(
    (r) => r["Type *"] !== "Dental_Service" || isDentalEnabled
  );

  const validRows   = rows?.filter((r) => r._errors.length === 0) ?? [];
  const invalidRows = rows?.filter((r) => r._errors.length > 0)  ?? [];
  const uploading   = progress && !result;

  const displayedRows =
    rowFilter === "valid"   ? validRows
    : rowFilter === "invalid" ? invalidRows
    : rows ?? [];

  // ── file select ──
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileError(null);
    setRows(null);
    setResult(null);
    setProgress(null);
    setRowFilter("all");

    try {
      const rawRows = await parseFile(file);
      if (!rawRows.length) { setFileError("The file has no data rows."); return; }

      const firstKeys = Object.keys(rawRows[0].raw).map((k) =>
        k.replace(/\s*\*$/, "").toLowerCase().trim()
      );
      const missing = ["type", "name", "price"].filter(
        (req) => !firstKeys.some((k) => COL_ALIASES[k] === req)
      );
      if (missing.length) {
        setFileError(`Missing required columns: ${missing.join(", ")}.`);
        return;
      }

      const parsed = rawRows.map(({ raw, srcRow }) => {
        const row    = normaliseRow(raw);
        const errors = validateRow(row, availableTypeValues);
        const dt     = row.discountType?.toLowerCase() || "percentage";
        const item   = {
          name:         row.name,
          type:         row.type,
          price:        parseFloat(row.price),
          discountType: dt,
          discount:     row.discount ? parseFloat(row.discount) : undefined,
          gst:          row.gst      ? parseFloat(row.gst)      : undefined,
        };
        item.totalAmount = calculateTotalAmount(item);
        return { ...item, _errors: errors, _row: srcRow, _raw: raw };
      });
      setRows(parsed);
    } catch (err) {
      setFileError(err.message);
    }
    e.target.value = "";
  };

  // ── upload ──
  const handleUpload = async () => {
    if (!validRows.length) return;
    setProgress({ done: 0, total: validRows.length });

    const items = validRows.map(({ _errors, _row, _raw, ...item }) => ({
      ...item,
      discount: item.discount || undefined,
      gst:      item.gst      || undefined,
    }));

    try {
      const res = await bulkInsertBillItems(items);
      const inserted = res?.count ?? res?.insertedCount ?? items.length;
      setProgress({ done: items.length, total: items.length });
      setResult({ success: inserted, failed: items.length - inserted });
      onSuccess && onSuccess();
    } catch {
      setProgress({ done: items.length, total: items.length });
      setResult({ success: 0, failed: items.length });
    }
  };

  // ── table columns ──
  const columns = [
    { title: "Row",   dataIndex: "_row",  key: "_row",  width: 55 },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (v) => TYPE_LABEL[v] ?? v,
    },
    { title: "Name",        dataIndex: "name",     key: "name" },
    { title: "Price (₹)",   dataIndex: "price",    key: "price" },
    {
      title: "Discount Type",
      dataIndex: "discountType",
      key: "discountType",
      render: (v) => v || "-",
    },
    { title: "Discount", dataIndex: "discount", key: "discount", render: (v) => v ?? "-" },
    { title: "GST (%)", dataIndex: "gst",      key: "gst",      render: (v) => v ?? "-" },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, r) =>
        r._errors.length === 0 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Valid</Tag>
        ) : (
          <Tooltip title={r._errors.map(formatError).join(" | ")}>
            <Tag icon={<CloseCircleOutlined />} color="error" style={{ cursor: "pointer" }}>
              {r._errors.length} error{r._errors.length > 1 ? "s" : ""}
            </Tag>
          </Tooltip>
        ),
    },
    {
      title: "Validation Errors",
      key: "errors",
      width: 280,
      render: (_, r) =>
        r._errors.length === 0 ? (
          <span style={{ color: "#bbb" }}>-</span>
        ) : (
          <div className="d-flex flex-column gap-1">
            {r._errors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: "#cf1322" }}>
                <span style={{ fontWeight: 600 }}>{e.field}:</span> {e.message}
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <CommonModal
      isModalOpen={true}
      onCancel={onCancel}
      modalWidth={960}
      title="Bulk Upload Bill Items"
      modalBody={
        <div className="d-flex flex-column gap-3">

          {/* ── field rules ── */}
          <div
            className="rounded-3 p-3"
            style={{ background: "#f8f9fa", fontSize: 12.5, border: "1px solid #e9ecef" }}
          >
            <div className="fw-semibold mb-2" style={{ fontSize: 13 }}>Column Instructions</div>
            <div className="d-flex flex-wrap gap-3">
              {[
                { label: "Type",          req: true,  rule: `Alphanumeric. One of: ${availableTypeValues.join(" | ")}` },
                { label: "Name",          req: true,  rule: "Any text. Special characters allowed." },
                { label: "Price",         req: true,  rule: "Numeric, 0 or more (e.g. 0, 500 or 499.99). Use 0 for free services." },
                { label: "Discount Type", req: false, rule: `One of: ${DISCOUNT_TYPES.join(" | ")}` },
                { label: "Discount",      req: false, rule: "Numeric." },
                { label: "GST (%)",       req: false, rule: "Numeric (0–100)." },
              ].map(({ label, req, rule }) => (
                <div key={label} style={{ minWidth: 200, flex: "1 1 200px" }}>
                  <span style={{ fontWeight: 600 }}>
                    {label}
                    {req && <span style={{ color: "#ff4d4f", marginLeft: 2 }}>*</span>}
                  </span>
                  <div style={{ color: "#666", marginTop: 1 }}>{rule}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── top bar: sample download ── */}
          <div className="d-flex align-items-center justify-content-between">
            <div style={{ fontSize: 13, color: "#555" }}>
              Accepts <b>.csv</b>, <b>.xlsx</b>, or <b>.xls</b>.
              The sample file includes a notes row and example data for all types.
            </div>
            <Button icon={<DownloadOutlined />} onClick={() => downloadSample(availableSampleRows, availableTypeValues)} size="small">
              Download sample
            </Button>
          </div>

          {/* ── drop zone ── */}
          <div
            className="d-flex align-items-center justify-content-center border rounded-3 p-4"
            style={{
              borderStyle: "dashed",
              cursor: uploading ? "not-allowed" : "pointer",
              background: "#fafafa",
            }}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFile}
            />
            <div className="text-center">
              <UploadOutlined style={{ fontSize: 28, color: "#1677ff" }} />
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {rows ? "Click to replace file" : "Click to select file"}
              </div>
            </div>
          </div>

          {fileError && <Alert type="error" message={fileError} showIcon />}

          {/* ── progress ── */}
          {progress && (
            <Progress
              percent={Math.round((progress.done / progress.total) * 100)}
              status={
                result
                  ? result.failed === progress.total ? "exception" : "success"
                  : "active"
              }
            />
          )}

          {/* ── result ── */}
          {result && (
            <Alert
              type={
                result.failed === 0 ? "success"
                : result.success === 0 ? "error"
                : "warning"
              }
              message={
                result.failed === 0
                  ? `All ${result.success} item(s) uploaded successfully.`
                  : `${result.success} uploaded successfully, ${result.failed} failed.`
              }
              description={
                invalidRows.length > 0
                  ? `${invalidRows.length} invalid row(s) were skipped. Download them, correct the errors, and upload the corrected file.`
                  : undefined
              }
              action={
                invalidRows.length > 0 ? (
                  <Dropdown
                    menu={{
                      items: [
                        { key: "xlsx", label: "Excel (.xlsx)" },
                        { key: "csv",  label: "CSV (.csv)" },
                      ],
                      onClick: ({ key }) => downloadInvalidRows(invalidRows, key),
                    }}
                  >
                    <Button size="small" danger icon={<DownloadOutlined />}>
                      Download invalid rows
                    </Button>
                  </Dropdown>
                ) : undefined
              }
              showIcon
            />
          )}

          {/* ── preview table ── */}
          {rows && !result && (
            <>
              <div className="d-flex gap-2 align-items-center justify-content-between flex-wrap">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {[
                    { key: "all",     color: "processing", label: `${rows.length} total` },
                    { key: "valid",   color: "success",    label: `${validRows.length} valid` },
                    { key: "invalid", color: "error",      label: `${invalidRows.length} invalid — will be skipped` },
                  ].map(({ key, color, label }) => (
                    <Tag
                      key={key}
                      color={color}
                      onClick={() => setRowFilter(key)}
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        marginInlineEnd: 0,
                        ...(rowFilter === key && {
                          fontWeight: 600,
                          boxShadow: "0 0 0 1.5px currentcolor inset",
                        }),
                      }}
                    >
                      {label}
                    </Tag>
                  ))}
                  <span style={{ fontSize: 12, color: "#888" }}>
                    Click a count to filter the rows below.
                  </span>
                </div>
                {invalidRows.length > 0 && (
                  <Dropdown
                    menu={{
                      items: [
                        { key: "xlsx", label: "Excel (.xlsx)" },
                        { key: "csv",  label: "CSV (.csv)" },
                      ],
                      onClick: ({ key }) => downloadInvalidRows(invalidRows, key),
                    }}
                  >
                    <Button size="small" danger icon={<DownloadOutlined />}>
                      Download invalid rows
                    </Button>
                  </Dropdown>
                )}
              </div>
              <Table
                key={rowFilter}
                size="small"
                columns={columns}
                dataSource={displayedRows}
                rowKey="_row"
                rowClassName={(r) => (r._errors.length ? "ant-table-row-disabled" : "")}
                pagination={{ pageSize: 8, size: "small" }}
                scroll={{ x: true }}
              />
            </>
          )}

          {/* ── actions ── */}
          <div className="d-flex align-items-center justify-content-end gap-3 mt-1">
            <div
              onClick={onCancel}
              className="text-decoration-underline btn p-0 text-main"
            >
              Cancel
            </div>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={uploading}
              disabled={validRows.length === 0 || !!result?.success}
              style={{ height: 41, paddingInline: 24 }}
            >
              {uploading
                ? `Uploading ${progress.done}/${progress.total}…`
                : `Upload${validRows.length > 0 ? ` (${validRows.length} items)` : ""}`}
            </Button>
          </div>
        </div>
      }
    />
  );
};

export default BulkUploadModal;
