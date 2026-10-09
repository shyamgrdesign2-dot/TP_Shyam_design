# Correlation Agent: the rules

The contract for the chart, its colours and its cards. If a change contradicts
this file, either the change is wrong or this file needs updating first.

## The three columns

| Column | Name | The question it answers |
|---|---|---|
| 1 | **Lab results** | What did the reports say? |
| 2 | **Relationship** | What do those values mean together? |
| 3 | **Diagnosis** | What might the patient have? |

Column 3 holds candidate diagnoses only: things a doctor would write on a
prescription. Anything else is a conclusion of column 2 and belongs there.

## Colour

Semantic tokens only. Violet marks the agent's own voice and appears on panels,
headings and its CTAs, never inside the chart.

**The AI gradient is a token. Never hand-roll it.**

```
background: var(--tesseract-gradient-ai-hero);
```

which resolves to `linear-gradient(91deg, #d565ea, #673aac, #1a1994)`, magenta
through violet into deep blue. There is a softer `--tesseract-gradient-ai-card`
for surfaces rather than controls. Two mistakes have already been made here:
flattening it to violet only (the blue end is half the asset), and rebuilding it
by eye from the VoiceRx recorder's fill instead of using the token.

**Which CTAs wear it: the ones that OPEN the agent.** Correlate, View
correlation, Start a correlation, Generate correlation. Those are the trigger
points, and the gradient is what marks them as the agent's own.

**Blue stays the doctor's action.** Done and Add to Rx are things the doctor
does with the result, not ways into the agent, so they keep the product's
primary blue.

### Lab results: range status

| Meaning | Token |
|---|---|
| Out of range | `--corr-abnormal` |
| In range | `--corr-normal` |
| Collapsed or unused | `--corr-muted` |

### Relationship and Diagnosis: evidence

Both carry an evidence score on the same four-level scale. A relationship
carries `evidence`, a diagnosis carries `confidence`, and they mean the same
thing: how well supported is this claim.

| Level | Meter steps | Colour |
|---|---|---|
| Strong | 4 | success green |
| Moderate | 3 | amber |
| Low | 2 | error red |
| Speculative | 1 | error red, outline only |

Speculative and Low share a hue and separate by fill and step count.

A relationship weakened by its challenge drops to the bottom tone, and so does
any diagnosis resting on it. A claim is never stronger than the link beneath it.

## Emphasis

The diagnosis is the answer; the relationship is how it was reached.

| | Relationship card | Diagnosis card |
|---|---|---|
| Resting stroke | none | 1px, tone-coloured |
| Fill | flat tint | tint plus tone-coloured left rule |
| Affordance | chevron | chevron and a diagnosis glyph by the heading |
| Weight | lighter | heavier |

## Node card anatomy

Both card types use three regions:

- **Header**: the type glyph, then the name. One glyph for Relationship, one
  for Diagnosis, used everywhere those things appear. No tooltip here.
- **Body**: the confidence tag and any other tags
- **Footer**: the action, and an accordion chevron so the card reads as
  openable

## "Built from" is cumulative

A relationship lists the **lab results** it was built from.

A diagnosis lists the **relationships** it rests on, and under each one, the
lab results that fed that relationship. Each row carries the evidence colour of
the thing it belongs to, so a Strong relationship and its findings read Strong
together.

This is what connects the two columns inside the panel rather than only in the
chart. A doctor reading a diagnosis should be able to walk all the way back to
the measured numbers without leaving the panel.

## Ribbons

Each ribbon is a `linearGradient` from source colour to target colour.
Thickness carries link strength. Opacity drops to 0.06 outside the current
trace.

## Vocabulary

- **Strong / Moderate / Low / Speculative** for evidence
- **Lab results**, **Relationship**, **Diagnosis** for the columns
- **Medical records** for the records section, matching the rail

## Interaction

| Click | Result |
|---|---|
| A lab result | Highlights every other finding sharing a relationship with it, across reports |
| A relationship | Opens the detail panel |
| A diagnosis | Opens the detail panel with its actions |

Panel-opening nodes always open and never toggle closed. The panel closes from
its own control.

## The diagnosis card

Two actions in one card, separated by a divider:

1. **Add diagnosis** to the Rx. Primary.
2. **Add investigation**, under "To confirm this", one row per test. Secondary.

A diagnosis with no confirming test offers only the first.

## Derived, never asserted

Computed from `LINKS` and `FINDINGS` at render time so the chart and the panels
cannot disagree:

- "N reports" on a relationship = distinct source reports feeding it
- "Built from N" = link count
- Report brackets = runs of adjacent findings sharing a `report`

## Fixture data

One story across `demoRun.js`, `mockBackend.js` and the lab entries, transcribed
from three real report PDFs in `public/demo-reports/`. Clinical values are real,
patient identity is invented.

Invariants, checked whenever the fixture changes:

- Every finding feeds at least one correlation. No `orphan` flag survives a
  finding being wired up.
- Every correlation has at least one source and, apart from the collapsed
  bundle, at least one target.
- Every finding names a report that exists.
- Counts quoted in `RUN_EVENTS` match the arrays.
- `CHART_LABEL` shortens correlations only. A diagnosis name is what a doctor
  may copy onto a prescription and is never reworded for the chart.

## Default selection

The picker opens with the most recent EPISODE ticked, not the most recent day:
every eligible report within a week of the newest one, per source. A workup is
routinely spread over two or three days, and selecting only the latest date
split it apart.

## Open

- Tooltips reworked to match the detail panels
- Evidence tags on a single line in the side panel
- Source links styled blue
- "Show report groups" toggle and Download
- Two-CTA diagnosis card
- Selected chip contrast in the chart
- Rx-pad chips verified in the standard pad
- VoiceRx hide verified in the real pad
