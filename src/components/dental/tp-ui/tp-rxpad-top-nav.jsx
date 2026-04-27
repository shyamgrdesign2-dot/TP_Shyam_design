import React from "react";
import RxpadHeader from "../tp-rxpad/imports/RxpadHeader";
export function TPRxPadTopNav({ className, onBack, patientId }) {
  return (
    <RxpadHeader className={className} onBack={onBack} patientId={patientId} />);

}