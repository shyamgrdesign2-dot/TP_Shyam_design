import React, { useState } from "react";
import { Button, Typography, message } from "antd";
import { useSearchParams } from "react-router-dom";

import ScannerView from "./components/ScannerView";
import { redirectToParent, postResultToOpener } from "./utils/returnToParent";
import "./Scanner.scss";

const { Title, Text } = Typography;

const Scanner = () => {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const targetOrigin = searchParams.get("targetOrigin");

  const [values, setValues] = useState([]);
  const [phase, setPhase] = useState("scanning");
  const step = values.length + 1;

  const handleScan = (rawValue) => {
    setValues((prev) => [...prev, rawValue]);
    setPhase("confirmed");
  };

  const handleError = (err) => {
    message.error(err?.message || "Unable to access camera");
  };

  const handleContinue = () => {
    setPhase(values.length >= 2 ? "done" : "scanning");
  };

  const handleRetryLast = () => {
    setValues((prev) => prev.slice(0, -1));
    setPhase("scanning");
  };

  const handleDone = () => {
    const result = { value1: values[0], value2: values[1] };

    if (postResultToOpener(result, targetOrigin)) {
      window.close();
      return;
    }

    if (!returnUrl) {
      message.error(
        "Cannot return scanned values - open this page via window.open() or pass returnUrl"
      );
      return;
    }
    redirectToParent(returnUrl, result);
  };

  return (
    <div className="scanner-page">
      <div className="scanner-page__header">
        <Title level={4}>
          {phase === "done"
            ? "Both codes scanned"
            : `Scan code ${Math.min(step, 2)} of 2`}
        </Title>
      </div>

      {phase === "scanning" && (
        <div className="scanner-page__camera">
          <ScannerView onScan={handleScan} onError={handleError} />
        </div>
      )}

      {phase === "confirmed" && (
        <div className="scanner-page__confirm">
          <div className="scanner-page__check">&#10003;</div>
          <Text>Code {values.length} scanned</Text>
          <Text className="scanner-page__value">{values[values.length - 1]}</Text>
          <Button type="primary" onClick={handleContinue}>
            {values.length >= 2 ? "Review" : "Scan next code"}
          </Button>
          <Button onClick={handleRetryLast}>Rescan this code</Button>
        </div>
      )}

      {phase === "done" && (
        <div className="scanner-page__summary">
          <Text>Value 1: {values[0]}</Text>
          <Text>Value 2: {values[1]}</Text>
          <Button type="primary" onClick={handleDone}>
            Done - send to parent
          </Button>
          <Button
            onClick={() => {
              setValues((prev) => prev.slice(0, -1));
              setPhase("scanning");
            }}
          >
            Rescan value 2
          </Button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
