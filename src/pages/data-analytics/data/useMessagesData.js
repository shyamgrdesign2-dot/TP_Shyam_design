import { useCallback, useEffect, useState } from "react";
import ApiBulkMessages from "../../../api/services/ApiBulkMessages";

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
  reachByCampaign: null,
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
    const safe = (p) => p.then((r) => r).catch(() => null);
    const [creditRes, campaignRes] = await Promise.all([
      safe(ApiBulkMessages.userCredit()),
      safe(ApiBulkMessages.userCampaign(body)),
    ]);

    const creditSrc = creditRes?.data ?? creditRes ?? {};
    const credits = toNum(
      creditSrc.userCredit ?? creditSrc.credit ?? creditSrc.credits ?? creditSrc.balance ?? creditSrc.available_credits
    );
    let rows = campaignRes?.data ?? campaignRes ?? [];
    if (!Array.isArray(rows)) rows = rows?.campaigns ?? rows?.list ?? rows?.rows ?? [];

    // Client-side range guard for when the API ignores the range params
    const inRange = (r) => {
      if (!startDate || !endDate || !r?.campaign_date) return true;
      const d = parseCampaignDate(r.campaign_date);
      return d ? d >= startDate && d <= endDate : true;
    };
    const period = rows.filter(inRange);
    const sent = period.filter((r) => r.campaign_sent);
    const scheduled = period.filter((r) => !r.campaign_sent);

    const channelCounts = {};
    for (const r of period) {
      const ch = r.send_on || r.message_type || "Other";
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }

    setState({
      loading: false,
      kpis: buildKpis(credits, period, sent, scheduled),
      channelMix: Object.entries(channelCounts).map(([label, value]) => ({ label, value })),
      sentVsScheduled: [
        { label: "Delivered", value: sent.length },
        { label: "Scheduled", value: scheduled.length },
      ],
      reachByCampaign: buildReach(sent),
    });
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function buildKpis(credits, period = [], sent = [], scheduled = []) {
  const reached = sent.reduce((a, r) => a + toNum(r.total_patient), 0);
  return [
    { key: "msgCredits", label: "Credit balance", kind: "number", value: Math.round(credits), tooltip: "Message credits currently available, a live balance, not filtered by the date range" },
    { key: "msgCampaigns", label: "Campaigns sent", kind: "number", value: sent.length, tooltip: "Campaigns delivered in the selected period" },
    { key: "msgReach", label: "Patients reached", kind: "number", value: reached, tooltip: "Total patients targeted by delivered campaigns in the selected period" },
    { key: "msgScheduled", label: "Scheduled campaigns", kind: "number", value: scheduled.length, tooltip: "Campaigns scheduled but not yet sent" },
    { key: "msgAvgReach", label: "Avg reach per campaign", kind: "number", value: sent.length ? Math.round(reached / sent.length) : 0, approx: true, tooltip: "Patients reached divided by campaigns sent in the selected period" },
  ];
}

// Top campaigns by patients reached — chart series for a scrollable bar
function buildReach(sent) {
  const rows = [...sent]
    .sort((a, b) => toNum(b.total_patient) - toNum(a.total_patient))
    .slice(0, 12)
    .map((r) => ({
      x: truncate(r.message_text?.split("\n")[0] || r.campaign_status || "Campaign", 18),
      Patients: toNum(r.total_patient),
    }));
  if (!rows.length) return null;
  return { data: rows, series: [{ key: "Patients", label: "Patients" }], xKey: "x" };
}

// campaign_date arrives display-formatted ("06 Jan 2025"); normalise to
// YYYY-MM-DD for the range guard, tolerating ISO already.
function parseCampaignDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function truncate(s, max) {
  const t = String(s || "");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
