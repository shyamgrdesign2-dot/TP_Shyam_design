"use client";

import { ArrowRight2, Link1 } from "iconsax-reactjs";
import { CardShell } from "../CardShell";

import { FooterCTA } from "../FooterCTA";





export function ExternalCtaCard({ data }) {
  const target = data.openInNewTab === false ? "_self" : "_blank";
  const rel = target === "_blank" ? "noreferrer noopener" : undefined;

  return (
    <CardShell
      icon={<Link1 size={14} variant="Bulk" color="var(--tp-blue-500, #4B4AD5)" />}
      title={data.title}
      sidebarLink={
      <FooterCTA
        label={data.ctaLabel}
        href={data.ctaUrl}
        target={target}
        rel={rel}
        tone="primary"
        iconRight={<ArrowRight2 size={14} variant="Linear" />}
        compact />

      }>
      
      <div className="rounded-[12px] border border-tp-slate-100 bg-tp-slate-50/60 px-[8px] py-[7px]">
        <p className="text-[14px] leading-[1.5] text-tp-slate-600">{data.description}</p>
      </div>
    </CardShell>);

}