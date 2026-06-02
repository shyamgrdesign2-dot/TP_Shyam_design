"use client";

/**
 * Referral panel — the same referral fields used in the RxPad form, for the
 * handwriting flows (TabRx etc.). Held in RxExtrasContext and printed as a
 * structured block beneath the handwritten pages.
 */

import { ReferralFields } from "@/src/components/organisms/rxpad/referral/ReferralFields";
import { useRxExtras } from "@/src/components/organisms/rxpad/rx-extras-context";

export function ReferralContent() {
  const { referral, setReferral } = useRxExtras();

  return (
    <div className="flex flex-col gap-3 p-3">
      <ReferralFields value={referral} onChange={setReferral} />
      <p className="text-[12px] leading-[16px] text-tp-slate-500">
        This referral appears on the printed prescription.
      </p>
    </div>
  );
}

export default ReferralContent;
