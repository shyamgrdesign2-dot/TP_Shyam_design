import { useCallback } from "react";

export const PRESCRIPTION_NEW_WIDE_DROPDOWN_CLASS = "prescription-new-wide-dropdown";
export const PRESCRIPTION_NEW_BOX_DROPDOWN_CLASS = "prescription-new-box-dropdown";

export function usePrescriptionNewPopupProps(showVoiceRxModule) {
  const isPrescriptionNewContext = showVoiceRxModule !== undefined;

  return useCallback(
    (popupClassName = "") => {
      if (!isPrescriptionNewContext) {
        return popupClassName ? { popupClassName } : {};
      }

      const classNames = String(popupClassName).split(/\s+/).filter(Boolean);
      if (classNames.includes("boxpopup")) {
        return {
          popupMatchSelectWidth: true,
          popupClassName: [PRESCRIPTION_NEW_BOX_DROPDOWN_CLASS, popupClassName]
            .filter(Boolean)
            .join(" "),
        };
      }

      return {
        popupMatchSelectWidth: false,
        popupClassName: [PRESCRIPTION_NEW_WIDE_DROPDOWN_CLASS, popupClassName]
          .filter(Boolean)
          .join(" "),
      };
    },
    [isPrescriptionNewContext]
  );
}
