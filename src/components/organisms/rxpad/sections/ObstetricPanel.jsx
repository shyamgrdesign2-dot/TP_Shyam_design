"use client";

import { Users } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { PanelSubSection, PanelEmptyState } from "./ExpandedPanel";


/**
 * Obstetric History Panel
 * ───────────────────────
 * Displays obstetric formula, previous pregnancies, and current pregnancy data.
 *
 * Display rules:
 *   - Obstetric formula (G_P_A_L_) prominently displayed at top
 *   - Current pregnancy: highlighted card with EDD, gestational age, antenatal visits
 *   - Previous pregnancies: timeline cards with outcome badges
 *   - Outcome colors: Live Birth (green), Stillbirth (red), Miscarriage (amber), Ectopic (red)
 *   - Antenatal visits: compact table with key metrics
 */

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const outcomeStyles = {
  "Live Birth": "bg-tp-success-50 text-tp-success-600",
  "Stillbirth": "bg-tp-error-50 text-tp-error-600",
  "Miscarriage": "bg-tp-warning-50 text-tp-warning-600",
  "Abortion": "bg-tp-slate-100 text-tp-slate-600",
  "Ectopic": "bg-tp-error-50 text-tp-error-600"
};

const deliveryStyles = {
  "NVD": "bg-tp-success-50 text-tp-success-600",
  "LSCS": "bg-tp-blue-50 text-tp-blue-600",
  "Assisted": "bg-tp-warning-50 text-tp-warning-600",
  "N/A": "bg-tp-slate-100 text-tp-slate-500"
};

export function ObstetricPanel({
  history,
  onCopyToRxPad



}) {
  if (!history) {
    return (
      <PanelEmptyState
        icon={<Users size={32} />}
        message="No obstetric history"
        description="Obstetric records will appear here" />);


  }

  const source = "Obstetric History";

  return (
    <div className="space-y-1">
      {/* Obstetric Formula */}
      {history.obstetricFormula &&
      <div className="group/item mb-3 flex items-center gap-3 rounded-lg border border-tp-blue-200 bg-tp-blue-50/50 px-3 py-2.5">
          <div className="flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-tp-blue-500">Obstetric Formula</span>
            <p className="text-lg font-bold text-tp-blue-700 mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>{history.obstetricFormula}</p>
          </div>
          <CopyButton
          onCopy={() => onCopyToRxPad?.({ target: "notes", items: [`Obstetric Formula: ${history.obstetricFormula}`], source })}
          showOnHover={false}
          size={14} />
        
        </div>
      }

      {/* Current Pregnancy */}
      {history.currentPregnancy &&
      <PanelSubSection title="Current Pregnancy" defaultOpen={true}>
          <div className="rounded-lg border border-tp-violet-200 bg-tp-violet-50/30 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {history.currentPregnancy.edd &&
            <div>
                  <span className="text-[10px] text-tp-slate-500">EDD</span>
                  <p className="text-xs font-semibold text-tp-violet-700">{formatDate(history.currentPregnancy.edd)}</p>
                </div>
            }
              {history.currentPregnancy.gestationalAge &&
            <div>
                  <span className="text-[10px] text-tp-slate-500">Gestational Age</span>
                  <p className="text-xs font-semibold text-tp-slate-800">{history.currentPregnancy.gestationalAge}</p>
                </div>
            }
              {history.currentPregnancy.lmp &&
            <div>
                  <span className="text-[10px] text-tp-slate-500">LMP</span>
                  <p className="text-xs font-medium text-tp-slate-700">{formatDate(history.currentPregnancy.lmp)}</p>
                </div>
            }
            </div>

            {/* Antenatal Visits */}
            {history.currentPregnancy.antenatalVisits && history.currentPregnancy.antenatalVisits.length > 0 &&
          <div className="mt-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-tp-slate-500 mb-1.5 block">Antenatal Visits</span>
                <div className="overflow-hidden rounded-lg border border-tp-slate-200">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-tp-slate-50">
                        <th className="px-2 py-1.5 text-left font-medium text-tp-slate-500">Date</th>
                        <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">GA</th>
                        <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">BP</th>
                        <th className="px-2 py-1.5 text-center font-medium text-tp-slate-500">FHR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.currentPregnancy.antenatalVisits.map((v) =>
                  <tr key={v.id} className="border-t border-tp-slate-100">
                          <td className="px-2 py-1.5 text-tp-slate-700">{formatDate(v.date)}</td>
                          <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.gestationalAge}</td>
                          <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.bp || "—"}</td>
                          <td className="px-2 py-1.5 text-center text-tp-slate-800">{v.fetalHeartRate || "—"}</td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
              </div>
          }
          </div>
        </PanelSubSection>
      }

      {/* Previous Pregnancies */}
      <PanelSubSection
        title="Previous Pregnancies"
        count={history.previousPregnancies.length}>
        
        {history.previousPregnancies.map((preg) =>
        <div key={preg.id} className="group/item mb-2 rounded-lg border border-tp-slate-200 bg-white px-3 py-2 last:mb-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-tp-slate-800">{preg.year}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${outcomeStyles[preg.outcome]}`}>
                {preg.outcome}
              </span>
              {preg.modeOfDelivery && preg.modeOfDelivery !== "N/A" &&
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${deliveryStyles[preg.modeOfDelivery]}`}>
                  {preg.modeOfDelivery}
                </span>
            }
              <CopyButton
              onCopy={() => onCopyToRxPad?.({
                target: "notes",
                items: [`${preg.year}: ${preg.outcome} (${preg.modeOfDelivery || "—"})${preg.birthWeight ? `, ${preg.birthWeight}` : ""}`],
                source
              })}
              size={12}
              className="ml-auto" />
            
            </div>
            <div className="flex gap-4 text-[12px] text-tp-slate-500">
              {preg.birthWeight && <span>Weight: {preg.birthWeight}</span>}
              {preg.gender && <span>Gender: {preg.gender}</span>}
            </div>
            {preg.complications && preg.complications.length > 0 &&
          <p className="mt-1 text-[12px] text-tp-warning-600">Complications: {preg.complications.join(", ")}</p>
          }
          </div>
        )}
      </PanelSubSection>
    </div>);

}