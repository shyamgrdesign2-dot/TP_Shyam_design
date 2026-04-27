/**
 * Medical History content panel — always-open section cards.
 */
import React from "react";
import { ActionButton, SectionCard } from "../detail-shared";
import layout from "./sidebarContentLayout.module.scss";
const SECTIONS = [
  {
    id: "medical",
    title: "Medical Conditions",
    items: [
      {
        name: "Type 2 Diabetes",
        detail: "Since: 2 years | Status: Active | HbA1c (27 Jan'26): 7.4%",
      },
      {
        name: "Hypertension",
        detail: "Since: 1 year | Status: Controlled | Home BP log reviewed",
      },
      {
        name: "Hypothyroidism",
        detail:
          "Since: 8 months | Status: Stable | TSH recheck advised in 6 weeks",
      },
    ],
  },
  {
    id: "allergies",
    title: "Allergies",
    items: [
      {
        name: "Dust Mite Allergy",
        detail:
          "Since: 1 year | Status: Active | Trigger: sweeping/closed spaces",
      },
      {
        name: "NSAID Sensitivity",
        detail: "Status: Suspected | Reaction: gastric discomfort",
      },
    ],
  },
  {
    id: "family",
    title: "Family History",
    items: [
      {
        name: "Diabetes Mellitus",
        detail:
          "Relatives: Father, Paternal Uncle | Early-onset pattern in family",
      },
      {
        name: "Cardiovascular Disease",
        detail: "Relative: Maternal Grandfather | MI at 62 years",
      },
    ],
  },
  {
    id: "surgery",
    title: "Surgery History",
    items: [
      {
        name: "Appendectomy",
        detail:
          "Date: 20 Nov 2018 | Hospital: City General Hospital | Outcome: Uneventful recovery",
      },
      {
        name: "Impacted Wisdom Tooth Extraction",
        detail:
          "Date: 14 Jul 2023 | Facility: TP Dental Care | Outcome: Healed well in 1 week",
      },
    ],
  },
  {
    id: "dental-history",
    title: "Dental History",
    items: [
      {
        name: "Upper Right Quadrant (UR)",
        detail:
          "Findings: Generalized plaque, cervical sensitivity | Procedures: Quadrant scaling and root planing (Completed)",
      },
      {
        name: "Upper Left Quadrant (UL)",
        detail:
          "Findings: Early caries (26, 27), mild gingival inflammation | Procedures: Fluoride varnish + oral prophylaxis (Planned)",
      },
      {
        name: "Lower Arches (LR/LL)",
        detail:
          "Findings: Calculus deposits in molar region, food impaction | Procedures: Full-mouth scaling and polishing (In Progress)",
      },
      {
        name: "Full Mouth Summary",
        detail:
          "Primary Diagnosis: Chronic generalized gingivitis | Advice: 3-month periodontal maintenance recall",
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    items: [
      {
        name: "Smoking",
        detail:
          "6 cigarettes/day | Counselling started | Quit target: 3 months",
      },
      {
        name: "Exercise",
        detail: "Walks 25 minutes/day | 5 days/week",
      },
      {
        name: "Sleep",
        detail: "Average 6 hours/night | Irregular bedtime on weekdays",
      },
    ],
  },
];
function renderDetail(detail) {
  const parts = detail
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return detail;
  return parts.map((part, index) => (
    <React.Fragment>
      {index > 0 ? <span className={layout.detailPipe}> | </span> : null}
      <span>{part}</span>
    </React.Fragment>
  ));
}
function HistoryCard({ title, items }) {
  return (
    <SectionCard title={title} hideChevron={true}>
      <div className={layout.historyCardBody}>
        {items.map((item) => (
          <div>
            <p className={layout.historyName}>{item.name}</p>
            {item.detail ? (
              <p className={layout.historyDetail}>
                {renderDetail(item.detail)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
export function HistoryContent() {
  return (
    <div className={layout.pageRoot}>
      <ActionButton label="Add/Edit Details" icon="plus" />
      <div className={layout.overflowScroll}>
        <div className={layout.innerStack}>
          {SECTIONS.map((section) => (
            <HistoryCard title={section.title} items={section.items} />
          ))}
        </div>
      </div>
    </div>
  );
}
