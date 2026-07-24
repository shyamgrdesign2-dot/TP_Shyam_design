import { useCallback, useEffect, useState } from "react";
import ApiBulkMessages from "../../../api/services/ApiBulkMessages";
import { toNum, pctDelta, safe, previousWindow } from "./deltaUtils";

// Messages (bulk SMS / WhatsApp campaigns) — LIVE from the same APIs the
// Messages page uses:
//   GET  /communication/userCredit          → credit balance
//   POST /campaign/userCampaign             → campaign rows (supports
//        { draft: 0, start_date, end_date } so the date filter applies)
// Rows: message_text, campaign_date/time, send_on (SMS/WhatsApp),
// total_patient, campaign_sent (bool), campaign_status.
// Campaigns are business-level: the doctor/clinic filters do not apply here.

const ZERO = {
  loading: true,
  kpis: buildKpis(0, []),
  channelMix: [],
  sentVsScheduled: [],
};

export default function useMessagesData({ startDate, endDate } = {}) {
  const [state, setState] = useState(ZERO);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const body = { draft: 0 };
    if (startDate && endDate && startDate !== endDate) {
      body.start_date = startDate;
      body.end_date = endDate;
    }
    // True previous-period numbers: same query over the equal-length window
    // immediately before the selected range → real "vs previous period" pills.
    const prevWin = startDate && endDate ? previousWindow(startDate, endDate) : null;
    const prevBody = { draft: 0 };
    if (prevWin && prevWin.startDate !== prevWin.endDate) {
      prevBody.start_date = prevWin.startDate;
      prevBody.end_date = prevWin.endDate;
    }
    const [creditRes, campaignRes, prevCampaignRes] = await Promise.all([
      safe(ApiBulkMessages.userCredit()),
      safe(ApiBulkMessages.userCampaign(body)),
      prevWin ? safe(ApiBulkMessages.userCampaign(prevBody)) : Promise.resolve(null),
    ]);

    const creditSrc = creditRes?.data ?? creditRes ?? {};
    const credits = toNum(
      creditSrc.userCredit ?? creditSrc.credit ?? creditSrc.credits ?? creditSrc.balance ?? creditSrc.available_credits
    );
    const normalizeRows = (res) => {
      let rows = res?.data ?? res ?? [];
      if (!Array.isArray(rows)) rows = rows?.campaigns ?? rows?.list ?? rows?.rows ?? [];
      return Array.isArray(rows) ? rows : [];
    };
    const rows = normalizeRows(campaignRes);

    // Client-side range guard for when the API ignores the range params
    const inRange = (r, s, e) => {
      if (!s || !e || !r?.campaign_date) return true;
      const d = parseCampaignDate(r.campaign_date);
      return d ? d >= s && d <= e : true;
    };
    const period = rows.filter((r) => inRange(r, startDate, endDate));
    const sent = period.filter((r) => r.campaign_sent);
    const scheduled = period.filter((r) => !r.campaign_sent);

    // Previous-window sent campaigns — deltas only compare delivered activity
    // (credit balance is live, scheduled is forward-looking; neither compares).
    const prevSent = prevWin
      ? normalizeRows(prevCampaignRes)
          .filter((r) => inRange(r, prevWin.startDate, prevWin.endDate))
          .filter((r) => r.campaign_sent)
      : [];

    const channelCounts = {};
    for (const r of period) {
      const ch = r.send_on || r.message_type || "Other";
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }

    setState({
      loading: false,
      kpis: buildKpis(credits, period, sent, scheduled, prevSent),
      channelMix: Object.entries(channelCounts).map(([label, value]) => ({ label, value })),
      sentVsScheduled: [
        { label: "Delivered", value: sent.length },
        { label: "Scheduled", value: scheduled.length },
      ],
    });
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(credits, period = [], sent = [], scheduled = [], prevSent = []) {
  const reached = sent.reduce((a, r) => a + toNum(r.total_patient), 0);
  const prevReached = prevSent.reduce((a, r) => a + toNum(r.total_patient), 0);
  const avgReach = sent.length ? Math.round(reached / sent.length) : 0;
  const prevAvgReach = prevSent.length ? prevReached / prevSent.length : 0;
  const d = (cur, prev) => {
    const delta = pctDelta(cur, prev);
    return delta == null ? {} : { delta };
  };
  return [
    { key: "msgCredits", label: "Credit balance", kind: "number", value: Math.round(credits), tooltip: "Message credits currently available, a live balance, not filtered by the date range" },
    { key: "msgCampaigns", label: "Campaigns sent", kind: "number", value: sent.length, tooltip: "Campaigns delivered in the selected period", ...d(sent.length, prevSent.length) },
    { key: "msgReach", label: "Patients reached", kind: "number", value: reached, tooltip: "Total patients targeted by delivered campaigns in the selected period", ...d(reached, prevReached) },
    { key: "msgAvgReach", label: "Avg reach per campaign", kind: "number", value: avgReach, approx: true, tooltip: "Patients reached divided by campaigns sent in the selected period", ...d(avgReach, prevAvgReach) },
  ];
}

// campaign_date arrives display-formatted ("06 Jan 2025"); normalise to
// YYYY-MM-DD for the range guard, tolerating ISO already.
function parseCampaignDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


