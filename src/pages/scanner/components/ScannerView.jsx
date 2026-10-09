import React from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

const ScannerView = ({ onScan, onError }) => {
  const handleScan = (results) => {
    const first = results?.[0];
    if (first?.rawValue) {
      onScan(first.rawValue);
    }
  };

  return (
    <Scanner
      onScan={handleScan}
      onError={onError}
      constraints={{ facingMode: "environment" }}
      components={{ torch: true, onOff: true, finder: true }}
      scanDelay={300}
    />
  );
};

export default ScannerView;
