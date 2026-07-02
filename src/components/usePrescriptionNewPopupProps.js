import { useCallback } from "react";

export const PRESCRIPTION_NEW_WIDE_DROPDOWN_CLASS = "prescription-new-wide-dropdown";

export function usePrescriptionNewPopupProps(showVoiceRxModule) {
  const isPrescriptionNewContext = showVoiceRxModule !== undefined;

  return useCallback(
    (popupClassName = "") => {
      if (!isPrescriptionNewContext) {
        return popupClassName ? { popupClassName } : {};
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
