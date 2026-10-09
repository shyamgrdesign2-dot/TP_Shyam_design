import React from "react";
import { Button } from "antd";
import ReferralPanelForm from "../referral/ReferralPanelForm";

function TabReferralPanel({
  handleCollapsed,
  isTabRx = true,
  referralData,
  onReferralChange,
}) {
  return (
    <>
      <div
        className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${
          isTabRx ? "tab-rx-header" : ""
        }`}
      >
        Referral
        <Button
          type="text"
          className="btn p-0 btn-outline"
          onClick={handleCollapsed}
        >
          <i className="icon-Contract fs-21 text-white p-0" />
        </Button>
      </div>
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 108px)" }}>
        <div className="p-10">
          <ReferralPanelForm
            value={referralData}
            onChange={onReferralChange}
            variant="tabRx"
          />
        </div>
      </div>
    </>
  );
}

export default React.memo(TabReferralPanel);
