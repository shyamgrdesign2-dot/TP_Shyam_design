import React, { useEffect, useState } from "react";
import { Button, Typography } from "antd";

import { SCANNER_RESULT_MESSAGE_TYPE } from "./utils/returnToParent";

const { Title, Text } = Typography;

// Stand-in "parent page" for testing the window.open + postMessage handoff.
const ScannerDemoLauncher = () => {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type !== SCANNER_RESULT_MESSAGE_TYPE) return;
      setResult({ value1: event.data.value1, value2: event.data.value2 });
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const openScanner = () => {
    window.open(`${window.location.origin}/scanner`, "_blank");
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>Scanner launcher demo</Title>
      <Button type="primary" onClick={openScanner}>
        Open scanner in new tab
      </Button>
      <div style={{ marginTop: 16 }}>
        <Text>value1: {result?.value1 || "(waiting...)"}</Text>
        <br />
        <Text>value2: {result?.value2 || "(waiting...)"}</Text>
      </div>
    </div>
  );
};

export default ScannerDemoLauncher;
