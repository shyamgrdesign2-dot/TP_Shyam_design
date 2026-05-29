import React from "react";
import MuiCheckbox from "@mui/material/Checkbox";

export function TPCheckbox({ color = "primary", ...props }) {
  return <MuiCheckbox color={color} {...props} />;
}
