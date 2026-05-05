"use client";

import React from "react";

import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { SidebarLink } from "../SidebarLink";







/* ── helpers ────────────────────────────────────────── */



function gravidaLabel(gravida) {
  if (gravida == null) return "";
  if (gravida === 1) return "Primigravida";
  if (gravida === 2) return "Secundigravida";
  return `G${gravida} Multigravida`;
}

function ancVaccineFlag(status) {
  const lower = status.toLowerCase();
  if (lower.includes("overdue")) return "high";
  if (lower.includes("due")) return "warning";
  if (
  lower.includes("given") ||
  lower.includes("done") ||
  lower.includes("complete"))

  return "success";
  return "normal";
}

/* ── component ──────────────────────────────────────── */

export function ObstetricExpandedCard({ data, onSidebarNav }) {
  /* ─ Basic info row ─ */
  const basicValues = [
  data.lmp && { key: "LMP", value: data.lmp },
  data.edd && { key: "EDD", value: data.edd },
  data.gestationalWeeks && { key: "GA", value: `${data.gestationalWeeks} wks` },
  data.gravida != null && {
    key: "GPLAE",
    value: `G${data.gravida}P${data.para ?? 0}L${data.living ?? 0}A${data.abortion ?? 0}E${data.ectopic ?? 0}`
  }].
  filter(Boolean);

  /* ─ ANC & Vaccines row — single combined value ─ */
  const ancVaccineParts = [];

  if (data.ancDue && data.ancDue.length > 0) {
    ancVaccineParts.push(...data.ancDue);
  }
  if (data.vaccineStatus && data.vaccineStatus.length > 0) {
    data.vaccineStatus.forEach((item) => {
      const colonIdx = item.indexOf(":");
      if (colonIdx > -1) {
        const name = item.slice(0, colonIdx).trim();
        const status = item.slice(colonIdx + 1).trim();
        ancVaccineParts.push(`${name} (${status})`);
      } else {
        ancVaccineParts.push(item);
      }
    });
  }

  const ancVaccineValues =
  ancVaccineParts.length > 0 ?
  [{ key: "", value: ancVaccineParts.join(", ") }] :
  [];

  /* ─ Last exam row ─ */
  const examValues = [
  data.presentation && { key: "Presentation", value: data.presentation },
  data.fetalMovement && { key: "Fetal Movement", value: data.fetalMovement },
  data.fundusHeight && { key: "Fundus Ht", value: data.fundusHeight },
  data.oedema && { key: "Oedema", value: data.oedema },
  data.amnioticFluid && { key: "Amniotic Fluid", value: data.amnioticFluid },
  data.bpLatest && { key: "BP", value: data.bpLatest }].
  filter(Boolean);

  const badge =
  data.gravida != null ?
  {
    label: gravidaLabel(data.gravida),
    color: "#6D28D9",
    bg: "#EDE9FE"
  } :
  undefined;

  return (
    <CardShell
      icon={<span />}
      tpIconName="Obstetric"
      title="Obstetric Summary"
      badge={badge}
      dataSources={["EMR Records", "ANC Records"]}
      collapsible
      sidebarLink={
      onSidebarNav ?
      <SidebarLink
        text="View detailed obstetric history"
        onClick={() => onSidebarNav("obstetric")} /> :

      undefined
      }>
      
      <div className="flex flex-col gap-[8px]">
        {basicValues.length > 0 &&
        <div>
            <SectionSummaryBar label="Basic Info" icon="health-file-02" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={basicValues} source="existing" />
            </div>
          </div>
        }

        {ancVaccineValues.length > 0 &&
        <div>
            <SectionSummaryBar label="ANC / Vaccines" icon="injection" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={ancVaccineValues} source="existing" />
            </div>
          </div>
        }

        {examValues.length > 0 &&
        <div>
            <SectionSummaryBar label="Last Exam" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={examValues} source="existing" />
            </div>
          </div>
        }
      </div>
    </CardShell>);

}