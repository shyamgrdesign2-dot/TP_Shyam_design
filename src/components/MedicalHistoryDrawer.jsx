import React from "react";
import { Drawer } from "antd";

import { useMedicalHistoryDrawerProps } from "../utils/medicalHistoryFeatureFlag";

/**
 * antd Drawer for the Medical History body, with the props that the
 * `medical-history-new-ui` rollout changes applied in one place.
 *
 * Call sites pass the two widths and keep every other Drawer prop as-is; when
 * the feature is off this renders with production's width and antd's default
 * mask/Esc behaviour. Fold this back into a plain <Drawer> once the redesign is
 * fully rolled out.
 */
function MedicalHistoryDrawer({ legacyWidth = "75%", newWidth = "85%", children, ...drawerProps }) {
  const rolloutProps = useMedicalHistoryDrawerProps({ legacyWidth, newWidth });

  return (
    <Drawer {...drawerProps} {...rolloutProps}>
      {children}
    </Drawer>
  );
}

export default MedicalHistoryDrawer;
