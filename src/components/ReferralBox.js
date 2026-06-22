import React, { useContext } from "react";

import CashManagerContext from "../context/CashManagerContext";
import ReferralPanelForm from "./referral/ReferralPanelForm";
import { ReferralIcon } from "../pages/snapRx/components/ReferralIcon";
import "./ReferralBox.scss";

function ReferralBox() {
  const { referralData, setReferralData } = useContext(CashManagerContext);

  return (
    <div>
      <div className="d-flex align-items-center p-14-pb0">
          <ReferralIcon size={18} color="#7C3AED" variant="bulk" />
        <div className="title-common ms-2">Referral</div>
      </div>
      <div className="p-14">
        <ReferralPanelForm
          value={referralData}
          onChange={setReferralData}
          variant="prescription"
        />
      </div>
    </div>
  );
}

export default React.memo(ReferralBox);
