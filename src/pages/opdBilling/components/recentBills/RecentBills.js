import { Button } from "antd";
import BillTable from "../billingDashboard/BillingTable/BillTable";
import { useState, useCallback } from "react";

const RecentBills = ({
  handleRecentBillDrawer,
  handleCreateBillDrawer,
  patientBills,
  getPatientBills,
  totalAdvanceBalance,
  patientData,
  billData,
  setBillData,
  createBillDrawer,
  setCreateBillDrawer,
  fromLims = false,
}) => {
  const [sortConfig, setSortConfig] = useState({ field: null, order: null });
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const showCloseButton = fromLims || !isReceptionist;
  
  const handleSortChange = useCallback(
    (field, order) => {
      setSortConfig({ field, order });
      getPatientBills(patientData, { field, order });
    },
    [getPatientBills, patientData]
  );

  return (
    <div>
      <div
        className="modalCard-header h-60 align-items-center justify-content-between d-flex"
        style={{
          position: "sticky",
          top: "0",
          zIndex: "5",
          background: "#fff",
        }}
      >
        <div className="align-items-center d-flex">
          {showCloseButton && (
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={handleRecentBillDrawer}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
          )}
          <div className={`modal-title ${isReceptionist && !fromLims ? "px-4" : ""}`}>
            {patientData?.pm_fullname}'s Recent Bills
          </div>
        </div>
        <Button
          type="button"
          className={`btn-create-bill px-4 me-20 d-flex align-items-center justify-content-between ${
            isReceptionist ? "receptionist-btn" : ""
          }`}
          onClick={handleCreateBillDrawer}
          style={{ width: "fit-content", height: 41 }}
        >
          <span className="icon-Add fs-5" />
          <span>Create New Bill</span>
        </Button>
      </div>
      <div className="m-4 rounded-20px bg-white">
        <BillTable
          createBillDrawer={createBillDrawer}
          setCreateBillDrawer={setCreateBillDrawer}
          billData={billData}
          setBillData={setBillData}
          data={patientBills}
          isPatientScreen={true}
          getPatientBills={getPatientBills}
          handleRecentBillDrawer={handleRecentBillDrawer}
          onSortChange={handleSortChange}
          totalAdvanceBalance={totalAdvanceBalance}
          isPreviewForm3c={true}
        />
      </div>
    </div>
  );
};

export default RecentBills;
