"use client";

import React from "react";

import { CardShell } from "../CardShell";
import { InlineDataRow } from "../InlineDataRow";
import { SectionSummaryBar } from "../SectionSummaryBar";
import { SidebarLink } from "../SidebarLink";







export function OphthalSummaryCard({ data, onSidebarNav }) {


  /* ─ OD (Right eye) values ─ */
  const odValues = [
  data.vaRight && { key: "UC Dist", value: data.vaRight },
  data.nearVaRight && { key: "UC Near", value: data.nearVaRight },
  data.glassPrescription && { key: "C Dist", value: data.glassPrescription }].
  filter(Boolean);

  /* ─ OS (Left eye) values ─ */
  const osValues = [
  data.vaLeft && { key: "UC Dist", value: data.vaLeft },
  data.nearVaLeft && { key: "UC Near", value: data.nearVaLeft }].
  filter(Boolean);

  /* ─ Supplementary findings (IOP, Slit Lamp, Fundus) ─ */
  const suppValues = [
  data.iop && { key: "IOP", value: data.iop },
  data.slitLamp && { key: "Slit Lamp", value: data.slitLamp },
  data.fundus && { key: "Fundus", value: data.fundus }].
  filter(Boolean);

  return (
    <CardShell
      icon={<span />}
      tpIconName="eye"
      title="Ophthal Summary"
      dataSources={["EMR Records"]}
      collapsible
      sidebarLink={
      onSidebarNav ?
      <SidebarLink
        text="View detailed ophthal history"
        onClick={() => onSidebarNav("ophthal")} /> :

      undefined
      }>
      
      <div className="flex flex-col gap-[8px]">
        {odValues.length > 0 &&
        <div>
            <SectionSummaryBar label="OD (Right)" icon="eye" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={odValues} source="existing" />
            </div>
          </div>
        }

        {osValues.length > 0 &&
        <div>
            <SectionSummaryBar label="OS (Left)" icon="eye" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={osValues} source="existing" />
            </div>
          </div>
        }

        {suppValues.length > 0 &&
        <div>
            <SectionSummaryBar label="Findings" icon="clipboard-activity" />
            <div className="pl-[4px]">
              <InlineDataRow tag="" values={suppValues} source="existing" />
            </div>
          </div>
        }
      </div>
    </CardShell>);

}