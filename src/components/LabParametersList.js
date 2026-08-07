import { useMemo } from "react";
import { Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getDecodedToken } from "../utils/localStorage";

const LabParametersList = ({ labParamsData }) => {
  const loggedInDoctorId = useMemo(() => {
    try {
      return getDecodedToken()?.result?.user_id;
    } catch {
      return undefined;
    }
  }, []);

  const isOtherDoctorEntry = (entry) => {
    const entryDoctorId = entry?.doctorId;
    if (entryDoctorId == null || entryDoctorId === "") return false;
    if (loggedInDoctorId == null || loggedInDoctorId === "") return false;
    return String(entryDoctorId) !== String(loggedInDoctorId);
  };

  const transformData = (data) => {
    const result = {};

    data?.forEach((entry) => {
      entry.inputs?.forEach(({ testName, value, arrowDirection, units, reportName }) => {
        // Skip testNames like "Remarks"
        if (testName !== "Remarks") {
          // Use both testName and reportName as a key for grouping
          const key = `${testName}-${reportName}`;
          if (!result[key]) {
            result[key] = [];
          }
          result[key].push({
            date: entry.date,
            value,
            arrowDirection,
            units,
            testName,
            reportName,
            doctorId: entry.doctorId,
            receptionistId: entry.receptionistId,
          });
        }
      });
    });

    return result;
  };

  const groupedData = transformData(labParamsData);

  const renderTableHeader = () => {
    // Sort labParamsData by date (descending) and take the first two dates
    const recentLabParamsData = [...(labParamsData || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    return (
      <tr>
        <th
          className="obstetricTcell"
          style={{
            width: "50%", // Adjust width if needed
            fontWeight: 600,
            borderTop: "1px solid white",
          }}
        >
          NAME
        </th>
        {recentLabParamsData?.map((entry, index) => (
          <th
            key={`${entry?.date}-${entry?.doctorId ?? ""}-${index}`}
            className="obstetricTcell"
            style={{
              width: "25%", // Adjust width if needed
              fontWeight: 600,
              paddingRight: "18px",
              borderTop: "1px solid white",
              borderRight: index === recentLabParamsData.length - 1 ? "1px solid white" : "none",
            }}
          >
            <div className="d-flex align-items-center gap-1">
              <span>{dayjs(entry?.date).format("DD MMM, YYYY")}</span>
              {isOtherDoctorEntry(entry) ? (
                <Tooltip title="Data added by another doctor" placement="top">
                  <InfoCircleOutlined
                    style={{
                      fontSize: 14,
                      color: "#696974",
                      cursor: "pointer",
                    }}
                  />
                </Tooltip>
              ) : null}
            </div>
          </th>
        ))}
      </tr>
    );
  };

  const renderTableData = () => {
    const recentLabParamsData = [...(labParamsData || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    return (
      <>
        {Object.keys(groupedData)?.map((key, index) => {
          const [testName, reportName] = key.split("-");

          return (
            <tr key={index} className="column-border">
              {/* First column for the test name and report name, display them in the same row */}
              <td className="labParamsTcell" style={{ width: "50%", fontWeight: 500 }}>
                {groupedData[key][0]?.units
                  ? `${testName} (${groupedData[key][0]?.units})`
                  : `${testName}`}
              </td>

              {/* Render values for each date in the same row */}
              {recentLabParamsData?.map((dateEntry, dataIndex) => {
                // Prefer same date+doctor match when multi-doctor rows exist
                const dataForDate =
                  groupedData[key].find(
                    (entry) =>
                      entry.date === dateEntry.date &&
                      String(entry.doctorId ?? "") === String(dateEntry.doctorId ?? "")
                  ) ||
                  groupedData[key].find((entry) => entry.date === dateEntry.date);

                return (
                  <td
                    key={`${dateEntry?.date}-${dateEntry?.doctorId ?? ""}-${dataIndex}`}
                    style={{ width: "25%", color: "#454551 !important" }}
                    className={`labParamsTcell ${
                      dataForDate?.arrowDirection !== ""
                        ? "lab-params-warning"
                        : ""
                    }`}
                  >
                    {/* Render the value or '--' if undefined */}
                    {dataForDate ? (
                      <>
                        {dataForDate?.value || "--"}

                        {/* Conditionally render arrow icons based on arrowDirection */}
                        {dataForDate?.arrowDirection === "up" ? (
                          <ArrowUpOutlined
                            className="lab-params-warning"
                            style={{ paddingLeft: 5 }}
                          />
                        ) : dataForDate?.arrowDirection === "down" ? (
                          <ArrowDownOutlined
                            className="lab-params-warning"
                            style={{ paddingLeft: 5 }}
                          />
                        ) : null}
                      </>
                    ) : (
                      <span>{"--"}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div>
      {labParamsData?.length > 0 && (
        <>
          <div style={{ overflow: "hidden", marginRight: "5px" }}>
            <table
              className="tableView"
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>{renderTableHeader()}</thead>
            </table>
          </div>

          {/* Scrollable tbody */}
          <div
            style={{
              maxHeight: "200px", // Adjust this height as needed
              overflowY: "scroll",
            }}
          >
            <table
              className="tableView"
              style={{
                tableLayout: "fixed",
                width: "100%",
              }}
            >
              <tbody>{renderTableData()}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default LabParametersList;