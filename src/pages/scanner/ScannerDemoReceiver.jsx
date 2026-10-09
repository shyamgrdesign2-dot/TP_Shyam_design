import React from "react";
import { Typography } from "antd";
import { useSearchParams } from "react-router-dom";

const { Title, Text } = Typography;

// Stand-in "parent page" for testing the /scanner -> returnUrl handoff.
// Point returnUrl at this route to visually confirm both values arrive.
const ScannerDemoReceiver = () => {
  const [searchParams] = useSearchParams();
  const value1 = searchParams.get("value1");
  const value2 = searchParams.get("value2");

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>Received from scanner</Title>
      <Text>value1: {value1 || "(none)"}</Text>
      <br />
      <Text>value2: {value2 || "(none)"}</Text>
    </div>
  );
};

export default ScannerDemoReceiver;
