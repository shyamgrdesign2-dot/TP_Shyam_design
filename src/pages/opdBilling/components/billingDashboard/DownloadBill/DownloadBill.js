import React from "react";
import { Divider } from "antd";
import { useSelector } from "react-redux";
import moment from "moment";
import { useLocation } from "react-router-dom";
import "./DownloadBill.scss";

const DownloadBill = ({
  downloadData,
  parent,
  dateRange,
  isDoctorDashboard,
  paymentSummary,
  tableRowNumberStart = 0,
  omitPaymentSummary = false,
  omitBillsTable = false,
  hidePrintHeader = false,
  doctors,
}) => {
  const { profile } = useSelector((state) => state.doctors);
  const { doctorList } = useSelector((state) => state.bulkMessages);
  const { state } = useLocation();
  const { patient_data } = state || {};

  const hospitalData = profile?.hospital_data?.[0] || {};
  const { hm_name, um_contact, um_email, hm_address, hm_address1, hm_state } =
    hospitalData;

  const doctorsForLookup = Array.isArray(doctors) && doctors.length > 0
    ? doctors
    : Array.isArray(doctorList)
    ? doctorList
    : [];

  const paymentSummaryFiltered = Array.isArray(paymentSummary)
    ? paymentSummary.filter(
        (item) =>
          (Number(item?.receivedAmount) || 0) !== 0 ||
          (Number(item?.refundedAmount) || 0) !== 0
      )
    : [];

  const paymentSummaryWithTotal =
    paymentSummaryFiltered.length > 0
      ? [
          ...paymentSummaryFiltered,
          {
            paymentMode: "Total",
            receivedAmount: paymentSummaryFiltered.reduce(
              (sum, item) => sum + (Number(item.receivedAmount) || 0),
              0
            ),
            refundedAmount: paymentSummaryFiltered.reduce(
              (sum, item) => sum + (Number(item.refundedAmount) || 0),
              0
            ),
          },
        ]
      : [];

  function getDoctorNameById(um_id, record) {
    if (record?.doctorName) return record.doctorName;
    if (record?.doctor?.name) return record.doctor.name;
    if (um_id == null || um_id === "") return "";

    const doctor = doctorsForLookup.find(
      (doc) => String(doc?.um_id) === String(um_id)
    );
    if (doctor?.um_name) return doctor.um_name;

    if (
      String(profile?.um_id) === String(um_id) ||
      String(profile?.doctor_unique_id) === String(um_id) ||
      String(profile?.user_id) === String(um_id)
    ) {
      return profile?.um_name || "";
    }

    return "";
  }

  const CELL_FONT_SIZE = 9;
  const cellTextStyle = {
    fontSize: CELL_FONT_SIZE,
    lineHeight: 1.25,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
  };

  // Define the columns
  const columns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      align: "center",
      height: 20,
      width: "4%",
      render: (text, record, index, { startIndex = 0 } = {}) => (
        <div style={cellTextStyle}>{startIndex + index + 1}</div>
      ),
    },
    {
      title: "BILL NO & DATE",
      dataIndex: "billNo",
      key: "billNo",
      align: "center",
      height: 20,
      width: isDoctorDashboard ? "14%" : "18%",
      render: (text, record) => (
        <div style={cellTextStyle}>
          <div>{record.billNumber}</div>
          <div>{moment(record.date).format("DD MMM YYYY")}</div>
        </div>
      ),
    },
    isDoctorDashboard
      ? {
          title: "Patient Name",
          dataIndex: "patientName",
          key: "patientName",
          align: "left",
          height: 20,
          width: "13%",
          render: (text, record) => (
            <div style={cellTextStyle}>{record?.patient?.name}</div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "Doctor Name",
          dataIndex: "doctorName",
          key: "doctorId",
          align: "left",
          height: 20,
          width: "13%",
          render: (text, record) => (
            <div style={cellTextStyle}>
              {getDoctorNameById(record?.doctorId, record)}
            </div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "Mobile",
          dataIndex: "patientDetails",
          key: "patientDetails",
          align: "center",
          height: 20,
          width: "10%",
          render: (text, record) => (
            <div style={cellTextStyle}>{record?.patient?.phone}</div>
          ),
        }
      : undefined,
    {
      title: "TOTAL",
      dataIndex: "payableAmount",
      key: "payableAmount",
      align: "center",
      height: 20,
      width: "8%",
      render: (text, record) => (
        <div style={cellTextStyle}>₹{record?.payableAmount}</div>
      ),
    },
    {
      title: "GST",
      dataIndex: "applicableGst",
      key: "applicableGst",
      align: "center",
      height: 20,
      width: "7%",
      render: (text, record) => (
        <div style={cellTextStyle}>₹{record?.applicableGst ?? 0}</div>
      ),
    },
    {
      title: "PAID",
      dataIndex: "paidAmount",
      key: "paidAmount",
      align: "center",
      height: 20,
      width: "8%",
      render: (text, record) => (
        <div style={cellTextStyle}>₹{record?.paidAmount}</div>
      ),
    },
    {
      title: "MOP",
      dataIndex: "mop",
      key: "mop",
      align: "center",
      height: 20,
      width: "10%",
      render: (text, record) => {
        const paymentModes = Array.isArray(record?.paymentModes)
          ? record.paymentModes
              .map((pm) => pm?.paymentMode)
              .filter(Boolean)
              .join(", ")
          : "N/A";
        return <span style={cellTextStyle}>{paymentModes}</span>;
      },
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      align: "center",
      height: 20,
      width: isDoctorDashboard ? "13%" : "16%",
      render: (text, record) => (
        <span style={cellTextStyle}>{record?.paymentStatus}</span>
      ),
    },
  ]?.filter((item) => item);

  const advanceColumns = [
    {
      title: "#",
      dataIndex: "key",
      key: "key",
      align: "center",
      height: 20,
      render: (text, record, index, { startIndex = 0 } = {}) => (
        <div className="fs-14">{startIndex + index + 1}</div>
      ),
    },
    {
      title: "BILL NO",
      dataIndex: "receiptNumber",
      key: "receiptNumber",
      align: "center",
      height: 20,
      render: (text, record) => record?.billNumber || record?.receiptNumber,
    },
    {
      title: "DATE",
      dataIndex: "date",
      key: "date",
      align: "center",
      height: 20,
      render: (text, record) =>
        record.date ? moment(record.date)?.format("DD MMM YYYY") : "",
    },
    isDoctorDashboard
      ? {
          title: "PATIENT NAME",
          dataIndex: "patientName",
          key: "patientName",
          align: "left",
          height: 20,
          ellipsis: true,
          render: (text, record) => (
            <div className="cursor-pointer">
              <div className="fs-14 patient-name-cell">
                {record?.patient?.name}
              </div>
            </div>
          ),
        }
      : undefined,
    isDoctorDashboard
      ? {
          title: "MOBILE NUMBER",
          dataIndex: "patientDetails",
          key: "patientDetails",
          align: "center",
          height: 20,
          ellipsis: true,
          render: (text, record) => (
            <div>
              <span className="patient-name-cell" style={{ color: "#888" }}>
                {record?.patient?.phone}
              </span>
            </div>
          ),
        }
      : undefined,
    {
      title: "TOTAL AMOUNT",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "center",
      height: 20,
      render: (text, record) => (
        <div>
          <span style={{ color: "#888" }}>{record?.totalAmount}</span>
        </div>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      align: "center",
      height: 20,
      ellipsis: true,
      render: (text, record) => (
        <span style={{ color: "#888" }}>{record?.transactionType}</span>
      ),
    },
  ]?.filter((item) => item);

  const summaryColumns = [
    {
      title: "PAYMENT MODE",
      dataIndex: "paymentMode",
      key: "paymentMode",
      align: "center",
      render: (text, record, index) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          {record.paymentMode}
        </span>
      ),
    },
    {
      title: "RECEIVED AMOUNT",
      dataIndex: "receivedAmount",
      key: "receivedAmount",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{record.receivedAmount?.toFixed(2)}
        </span>
      ),
    },
    {
      title: "REFUNDED AMOUNT",
      dataIndex: "refundedAmount",
      key: "refundedAmount",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{record.refundedAmount?.toFixed(2)}
        </span>
      ),
    },
    {
      title: "TOTAL",
      dataIndex: "total",
      key: "total",
      align: "center",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
            fontSize: 12,
          }}
        >
          ₹{(record.receivedAmount - record.refundedAmount)?.toFixed(2)}
        </span>
      ),
    },
  ];

  const PatientPlank = () => {
    return (
      <div
        className={`d-flex align-items-center flex-wrap border border-radius-10 cursor-pointer patient-plank ${
          patient_data?.patient_unique_id && "pe-none disabled"
        }`}
        style={{
          padding: "5px 10px",
          width: "fit-content",
        }}
      >
        <div className="list-patientName d-flex align-items-center me-4 ml-2">
          <i className="icon-patients backbar me-2"></i>{" "}
          <span className="patientInfo">
            {patient_data.pm_salutation ? `${patient_data.pm_salutation} ` : ""}
            {patient_data?.pm_fullname}
          </span>
        </div>
        <div className="list-patientName d-flex align-items-center me-4">
          <i className="icon-phone backbar me-2"></i>
          <span className="patientInfo">{patient_data?.pm_contact_no}</span>
        </div>
        <div className="list-patientName d-flex align-items-center me-4">
          <i className="icon-Id backbar me-2"></i>
          <span className="patientInfo">{patient_data?.pm_pid}</span>
        </div>
      </div>
    );
  };

  // Get the columns to use based on parent type
  const getColumns = () => {
    return parent === "advance" ? advanceColumns : columns;
  };

  // Render table cell content
  const renderCell = (col, record, index) => {
    if (!col.render) {
      return record[col.dataIndex] || "";
    }
    return col.render(record[col.dataIndex], record, index, {
      startIndex: tableRowNumberStart,
    });
  };

  const hasBills = Array.isArray(downloadData) && downloadData.length > 0;
  const showPaymentSummaryBlock =
    !omitPaymentSummary && Array.isArray(paymentSummaryFiltered) && paymentSummaryFiltered.length > 0;

  if (!hasBills && (!omitBillsTable || !showPaymentSummaryBlock)) {
    return (
      <div className="printable-bill-content">
        <div className="header">
          <h1>{hm_name}</h1>
          <p>
            {hm_address ?? ""}
            {hm_address && hm_address1 ? `, ${hm_address1}` : ""}
            {hm_state} {um_contact ? ` • ${um_contact}` : ""}
            {um_email ? ` • ${um_email}` : ""}
          </p>
          <Divider />
          <p>
            Bill between{" "}
            {moment(dateRange?.startDate).format("DD/MM/YYYY")} -{" "}
            {moment(dateRange?.endDate).format("DD/MM/YYYY")}
          </p>
        </div>
        <div>No data available</div>
      </div>
    );
  }

  const tableColumns = getColumns();

  return (
    <div className="printable-content">
      {!hidePrintHeader && (
        <>
          <div className="header">
            <h1>{hm_name}</h1>
            <p>
              {hm_address ?? ""}
              {hm_address && hm_address1 ? `, ${hm_address1}` : ""}
              {hm_state} {um_contact ? ` • ${um_contact}` : ""}
              {um_email ? ` • ${um_email}` : ""}
            </p>
            <Divider />
            <p>
              Bill between{" "}
              {moment(dateRange?.startDate).format("DD/MM/YYYY")} -{" "}
              {moment(dateRange?.endDate).format("DD/MM/YYYY")}
            </p>
          </div>
          {patient_data ? <PatientPlank /> : null}
        </>
      )}

      {hasBills && !omitBillsTable && (
        <div>
        <table
          className="bill-table print-bill-table"
          style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
        >
            <thead>
              <tr>
                {tableColumns.map((col, colIndex) => (
                  <th
                    key={colIndex}
                    style={{
                      padding: "4px 3px",
                      textAlign: col.align || "center",
                      fontWeight: 600,
                      border: "1px solid #ddd",
                      fontSize: `${CELL_FONT_SIZE}px`,
                      lineHeight: 1.25,
                      backgroundColor: "#fafafa",
                      width: col.width || "auto",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      whiteSpace: "normal",
                      overflow: "hidden",
                    }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {downloadData.map((record, index) => (
                <tr
                  key={index}
                  style={{
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  {tableColumns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      style={{
                        padding: "4px 3px",
                        border: "1px solid #d9d9d9",
                        fontSize: `${CELL_FONT_SIZE}px`,
                        lineHeight: 1.25,
                        textAlign: col.align || "center",
                        width: col.width || "auto",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        whiteSpace: "normal",
                        overflow: "hidden",
                        verticalAlign: "middle",
                      }}
                    >
                      {renderCell(col, record, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentSummaryBlock && (
        <div style={{ marginTop: "30px", paddingTop: "20px" }}>
          <div className="header">
            <h2 style={{ margin: "0", fontWeight: "bold", color: "#4B4AD5" }}>
              Payment Summary
            </h2>
            <Divider />
          </div>

          <div>
            <table className="bill-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {summaryColumns.map((col, colIndex) => (
                    <th
                      key={colIndex}
                      style={{
                        padding: "8px 12px",
                        textAlign: col.align || "center",
                        fontWeight: 600,
                        border: "1px solid #ddd",
                        fontSize: "12px",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentSummaryWithTotal.map((record, index) => (
                  <tr key={index}>
                    {summaryColumns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #d9d9d9",
                          fontSize: "12px",
                          textAlign: col.align || "center",
                          fontWeight: record.paymentMode === "Total" ? "medium" : "normal",
                        }}
                      >
                        {col.render
                          ? col.render(record[col.dataIndex], record, index)
                          : record[col.dataIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadBill;
