import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge, Button } from "@dhspl-tatvacare/tesseract-ui";

import { REPORTS, FINDINGS, CORRELATIONS, HYPOTHESES, LINKS, byId } from "../data/demoRun";
import styles from "./CorrelationSankey.module.css";

const W = 1120;
const PAD = 24;
/* Headroom for the column headings above the first row. */
const HEAD_H = 26;
const NODE_W = 12;
const NODE_R = 4;
const UNIT = 12;
const MIN_H = 16;
const LABEL_GAP = 10;

/* A finding row is two lines: the name, and under it the value with a direction
   mark. Reference range and reasoning stay in the tooltip, so the row still
   carries only what a doctor scans for. */
const ROW_H = 32;
const ROW_GAP = 12;
const ROW_GAP_MAX = 20;
const COL_GAP_MIN = 28;
const COL_GAP_MAX = 96;

const X = { groupLeft: PAD, labelLeft: PAD + 152, findings: 344, corr: 420, corrLabelRight: 700, hyp: 780, hypLabel: 796 };

/* Lanes two and three are cards, not loose text, so each has a measured box and
   an inner padding. Ribbons start after the box, never across it. */
const CARD_PAD_X = 12;
const CARD_PAD_Y = 10;

/* A card is rows stacked from its top edge: always a title, then a chip where
   there is a verdict to carry, then the inline action where there is a next
   test. Heights are derived from the rows so no card is ever taller than the
   ink inside it. */
const TITLE_ROW = 18;
const CHIP_H = 16;
const CHIP_R = 8;
const CHIP_PAD = 8;
const CHIP_ROW = CHIP_H + 4;
const ACTION_ROW = 18;
const CARD_R = 8;
const CARD_MIN = CARD_PAD_Y * 2 + TITLE_ROW;
/* The two type glyphs, and the chevron that says a card opens. A relationship
   and a diagnosis are different kinds of thing, so each gets one mark used
   everywhere it appears. */
const GLYPH = 16;
const GLYPH_GAP = 8;
const ICON_BASE = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/bulk";
const REL_ICON = `${ICON_BASE}/content-edit/link-2.svg`;
const DX_ICON = `${ICON_BASE}/medical/health.svg`;
const CHEV = "https://pmdoctorportal.tatvacare.in/tp-icons/rounded/linear/arrow/arrow-right4.svg";

/** A masked glyph inside the SVG, drawn through foreignObject so the CDN icon
 *  takes the card's own tone the way every other icon in this feature does. */
function CardGlyph({ src, x, y, size = GLYPH, color, opacity = 1 }) {
  return (
    <foreignObject x={x} y={y} width={size} height={size} opacity={opacity}>
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: size,
          height: size,
          backgroundColor: color,
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </foreignObject>
  );
}

const GROUP_W = X.labelLeft - X.groupLeft - 14;

const CARD = {
  corrX: X.corr + NODE_W + LABEL_GAP,
  corrW: X.corrLabelRight - 12 - (X.corr + NODE_W + LABEL_GAP),
  hypX: X.hypLabel,
  hypW: W - PAD - X.hypLabel,
};

/* Every label lives inside a measured gutter and is truncated to it. Nothing is
   allowed to run past its gutter into a ribbon or into the next column. */
const GUTTER = {
  finding: X.findings - LABEL_GAP - X.labelLeft,
  corr: CARD.corrW - CARD_PAD_X * 2,
  hyp: CARD.hypW - CARD_PAD_X * 2,
};

/* Advance widths for the two type sizes in the chart, measured off the app
   font. Used to truncate, since SVG text cannot ellipsis itself. */
const CW_NAME = 6.3;
const CW_LEAD = 7.4;
const CW_CHIP = 6.2;

/* Ribbons leave and arrive on a short straight shoulder before the curve, so
   they read as connections rather than as loose ink against the node edge. */
const SHOULDER = 12;

/* Unfocused nodes fade, they do not disappear. Rects and chips carry the fade;
   the label keeps most of its ink, because 12px text at a tenth of its opacity
   is not de-emphasised, it is unreadable. */
const DIM_MARK = 0.35;
const DIM_TEXT = 0.7;

/**
 * The chart says what each stage *is*, in the fewest words that stay true. The
 * run's own wording is longer and repeats itself across stages, which reads on
 * a flow diagram as though the columns were not distinct kinds of thing. Full
 * wording is preserved verbatim in the tooltip and in the cards below.
 */
/* CORRELATIONS ONLY. A diagnosis is the one thing on this chart a doctor may
   copy onto a prescription, so its name is never shortened or reworded here.
   This map used to carry h2 and h3 from an older third column that held
   statements rather than diagnoses, and it went on renaming the real
   diagnoses to those statements long after they were replaced. */
const CHART_LABEL = {
  c1: "Hepatocellular injury pattern",
  c2: "Widal titres reactive",
  c3: "No leucocytosis",
  c4: "Bilirubin and albumin normal",
  c5: "Ultrasound structurally normal",
  c6: "Normal findings bundled",
  c7: "High CRP, normal white count",
  c8: "Dengue and malaria negative",
  c9: "Low urea, normal clearance",
  c10: "Bowel gas only",
};

const chartLabel = (d) => CHART_LABEL[d.id] || d.name;

/** "0-5 /hpf" reads as a subtraction. Say it the way a clinician would. */
function readableRange(ref) {
  if (!ref) return "";
  const m = String(ref).match(/^\s*([\d.]+)\s*-\s*([\d.]+)\s*(.*)$/);
  if (m) return `${m[1]} to ${m[2]}${m[3] ? ` ${m[3]}` : ""}`.trim();
  const lt = String(ref).match(/^\s*<\s*([\d.]+)\s*(.*)$/);
  if (lt) return `under ${lt[1]}${lt[2] ? ` ${lt[2]}` : ""}`.trim();
  return String(ref);
}

const FLAG_WORD = { HIGH: "above range", LOW: "below range", ABNORMAL: "abnormal", NORMAL: "in range" };

/* Direction of the abnormality, carried on the row itself. Up is above range,
   down is below range, a cross is abnormal without a direction. In range says
   nothing, because nothing moved. */
const FLAG_MARK = { HIGH: "↑", LOW: "↓", ABNORMAL: "×", NORMAL: "" };

/* The direction arrows are the product's own assets rather than the ↑ and ↓
   characters, which render at whatever weight the font decides. Masked through
   the icon's alpha channel so the arrow takes the row's own colour: a value
   above range is red whether you read the number or the mark. */
const ARROW_SRC = {
  HIGH: "https://pmdoctorportal.tatvacare.in/tp-icons/straight/bold/arrow/arrow-up3.svg",
  LOW: "https://pmdoctorportal.tatvacare.in/tp-icons/straight/bold/arrow/arrow-down.svg",
};

/* Drawn through foreignObject rather than an SVG <mask>, because a mask whose
   content is a cross-origin <image> is not reliably rasterised. A CSS
   mask-image on a plain span is the same mechanism every other icon on this
   screen already uses, so it behaves the same way here. */
function FlagArrow({ flag, x, y, size = 11, color, opacity = 1 }) {
  const src = ARROW_SRC[flag];
  if (!src) return null;
  return (
    <foreignObject x={x} y={y - size + 1} width={size} height={size} opacity={opacity}>
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: size,
          height: size,
          backgroundColor: color,
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </foreignObject>
  );
}

/** The three tiers under the chart, named the same way in the tooltip. */
/* The first suggested investigation, which is what the node offers inline.
   The rest live in the detail panel. */
const firstTest = (h) => (h.investigations || [])[0] || null;

const TIER_WORD = { strong: "Strong", medium: "Medium", low: "Low" };

/** The value as it reads on the row: the number, then its direction. */
function readingOf(f) {
  /* The direction is drawn, not typed, for HIGH and LOW. Anything else keeps
     its character because there is no asset for it. */
  if (ARROW_SRC[f.flag]) return f.value;
  const mark = FLAG_MARK[f.flag] || "";
  return mark ? `${f.value} ${mark}` : f.value;
}

function truncate(text, maxPx, charW) {
  const s = String(text == null ? "" : text);
  const max = Math.floor(maxPx / charW);
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1)).replace(/[\s,.;:]+$/, "")}…`;
}

/** Space between two chips sitting on one row. */
const CHIP_GAP = 6;

function chipWidth(label) {
  const w = Math.round(label.length * CW_CHIP) + CHIP_PAD * 2;
  return w % 2 === 0 ? w : w + 1;
}

function textWidth(label, charW) {
  const w = Math.round(String(label).length * charW);
  return w % 2 === 0 ? w : w + 1;
}

/** The narrow bar is the colour key: it stays saturated so the eye can find the
 *  hue, while the card beside it stays pale. */
/* ONE SCALE ACROSS THE WHOLE CHART: everything is coloured by how strong the
   evidence is, and by nothing else. The middle column used to be coloured by
   RELATIONSHIP (violet for "associated with", amber for "contradicts") while
   the last column was coloured by CONFIDENCE, so the same green could mean two
   different things depending on which column you were looking at. It now reads
   left to right in one language:

     green   Strong        blue   Moderate        amber   Low or weakened

   A finding keeps its own red / green, because "out of range" is a fact about
   the measurement, not a claim the agent is making. */
/* Evidence belongs to the DIAGNOSIS column and nowhere else.
   Column 1 is findings: red or green, because "out of range" is a measurement.
   Column 2 is REASONING, the step where findings are combined. It is neutral,
   because a piece of reasoning is not itself strong or weak, it is just the
   working. Colouring it competed with the answer.
   Column 3 is the diagnoses, and only there does strength mean anything:
     green  strong      amber  medium      red  low
   That is a traffic light, and it reads as one. */
/* One vocabulary. The data said "Moderate" while every label said "Medium",
   so the panel and the chip disagreed about the same number. */
/* One vocabulary: Strong, Medium, Low, Speculative. */
const EV_TONE = { Strong: "evStrong", Medium: "evMedium", Low: "evLow", Speculative: "evLow" };

/* ONE SCALE, ALL THE WAY ACROSS. A correlation carries its own `evidence`
   score and a diagnosis carries `confidence`, and they mean the same thing:
   how well supported is this. Colouring the middle by relationship instead
   threw that score away, so a Strong correlation and a Moderate one looked
   identical. A link weakened by its challenge drops to the bottom tone
   whatever it claimed. */
function evTone(node) {
  if (!node) return "evLow";
  if (node.dead || node.verdict === "weakened") return "evLow";
  return EV_TONE[node.confidence || node.evidence] || "evLow";
}

const barFill = (node) => `var(--corr-bar-${evTone(node)})`;

/* A ribbon carries TWO facts, so it is drawn as a gradient rather than a flat
   fill: where it starts (a finding's own status, red or green) and where it
   lands (the reasoning step, or the diagnosis and its confidence). A flat fill
   could only say one of the two, which is why the whole chart went grey the
   moment the middle column became neutral. */
function endFill(node) {
  if (!node) return "var(--corr-muted)";
  if (node.flag !== undefined) {
    if (node.collapsed) return "var(--corr-muted)";
    return node.flag === "NORMAL" ? "var(--corr-normal)" : "var(--corr-abnormal)";
  }
  return barFill(node);
}

/**
 * A card is a tinted surface, not a block of colour: the palest step of its own
 * ramp, a border one step up, and text near the dark end. Strong fill is held
 * back for the selected card, which is the only one that should shout.
 */

/* Selected is a deeper tint and a firm edge, never a solid fill. A saturated
   violet pill with white text reads as a button you are meant to press, and
   these are cards you are meant to read. */
const surfaceOf = (tone, on) => (on ? `var(--corr-sel-${tone})` : `var(--corr-tint-${tone})`);
const edgeOf = (tone, on) => (on ? `var(--corr-solid-${tone})` : `var(--corr-edge-${tone})`);
/* The text keeps its own tone whether or not the card is selected: the
   selection is said by the surface and the edge, not by inverting the ink. */
const inkOf = (tone) => `var(--corr-ink-${tone})`;
const chipFillOf = (tone, on) => (on ? `var(--corr-chipon-${tone})` : `var(--corr-chip-${tone})`);

/** A chip only where it carries a verdict the card colour cannot. "Contradicts"
 *  is already said by the amber card and by the legend, so saying it again here
 *  is noise, not hierarchy. */
/* How many DIFFERENT reports a correlation reaches across. This is the whole
   claim of the feature: one report read alone answers one question, several
   read together answer another, and a correlation spanning three reports is
   doing something a doctor could not do by eye. Counted off LINKS, never
   asserted. */
function reportSpan(c) {
  const reports = new Set(
    LINKS.filter(([, to]) => to === c.id)
      .map(([from]) => byId[from])
      .filter((f) => f && f.report && f.report !== "all")
      .map((f) => f.report)
  );
  return reports.size;
}

function corrChip(c) {
  if (c.dead) return { label: "LED NOWHERE" };
  const n = reportSpan(c);
  /* One report is the ordinary case and saying so adds nothing. Two or more is
     the thing worth pointing at. */
  if (n >= 2) return { label: `${n} REPORTS` };
  return null;
}

function hypChip(h) {
  if (h.tier === "medium") return { label: "MEDIUM" };
  if (h.tier === "low") return { label: "LOW" };
  return null;
}

const corrCardH = () => CARD_MIN + CHIP_ROW;
/* A diagnosis with confirmatory tests gets a line naming them, above the
   action. The chart previously offered "Add to Rx" without ever saying what
   would be added, so the one thing on the diagram a doctor can act on was also
   the only thing it would not describe. */
const TEST_ROW = 15;
const testsLine = (h) => {
  const t = h.investigations || [];
  if (!t.length) return null;
  return `Confirm with ${t.join(", ")}`;
};
const hypCardH = (h) =>
  CARD_MIN + CHIP_ROW + (testsLine(h) ? TEST_ROW : 0) + (firstTest(h) ? ACTION_ROW : 0);

/** One column of blocks, spread over the tallest column so the ribbons fan out
 *  instead of bunching at the top. */
function stackColumn(items, blockOf, heightOf, total, minGap, maxGap) {
  const blocks = items.map(blockOf);
  const sum = blocks.reduce((a, b) => a + b, 0);
  const span = total - PAD * 2;
  const slots = Math.max(items.length - 1, 1);
  const gap = Math.max(minGap, Math.min(maxGap, (span - sum) / slots));
  const used = sum + gap * (items.length - 1);
  let y = PAD + Math.max(0, (span - used) / 2);
  return items.map((item, i) => {
    const block = blocks[i];
    const h = heightOf(item);
    const top = y;
    y += block + gap;
    return { top, block, h, cy: top + block / 2, y: top + (block - h) / 2 };
  });
}

function columnNeed(blocks, minGap) {
  const sum = blocks.reduce((a, b) => a + b, 0);
  return sum + minGap * Math.max(blocks.length - 1, 0) + PAD * 2;
}

function useLayout() {
  return useMemo(() => {
    const outCount = {};
    const inCount = {};
    LINKS.forEach(([a, b]) => {
      outCount[a] = (outCount[a] || 0) + 1;
      inCount[b] = (inCount[b] || 0) + 1;
    });

    const nodeH = (id, count) => Math.max(MIN_H, (count[id] || 1) * UNIT);

    /* A card column's block is whichever is taller, the card or the ribbon
       bundle arriving at it, plus a little air so cards never kiss. */
    const fBlocks = FINDINGS.map((f) => Math.max(ROW_H, nodeH(f.id, outCount)));
    const cBlocks = CORRELATIONS.map((c) => Math.max(corrCardH(c) + 8, nodeH(c.id, inCount)));
    const hBlocks = HYPOTHESES.map((hp) => Math.max(hypCardH(hp) + 8, nodeH(hp.id, inCount)));

    const height = Math.max(
      columnNeed(fBlocks, ROW_GAP),
      columnNeed(cBlocks, COL_GAP_MIN),
      columnNeed(hBlocks, COL_GAP_MIN),
    );

    const pos = {};
    stackColumn(FINDINGS, (_, i) => fBlocks[i], (f) => nodeH(f.id, outCount), height, ROW_GAP, ROW_GAP_MAX)
      .forEach((slot, i) => { pos[FINDINGS[i].id] = { ...slot, x: X.findings }; });
    stackColumn(CORRELATIONS, (_, i) => cBlocks[i], (c) => nodeH(c.id, inCount), height, COL_GAP_MIN, COL_GAP_MAX)
      .forEach((slot, i) => { pos[CORRELATIONS[i].id] = { ...slot, x: X.corr }; });
    stackColumn(HYPOTHESES, (_, i) => hBlocks[i], (hp) => nodeH(hp.id, inCount), height, COL_GAP_MIN, COL_GAP_MAX)
      .forEach((slot, i) => { pos[HYPOTHESES[i].id] = { ...slot, x: X.hyp }; });

    return { pos, outCount, inCount, height };
  }, []);
}

function buildRibbons(pos, outCount, inCount) {
  const usedOut = {};
  const usedIn = {};
  return LINKS.map(([a, b, band], i) => {
    const from = pos[a];
    const to = pos[b];
    if (!from || !to) return null;

    const oh = from.h / (outCount[a] || 1);
    const ih = to.h / (inCount[b] || 1);
    const oy = from.y + (usedOut[a] || 0);
    const iy = to.y + (usedIn[b] || 0);
    usedOut[a] = (usedOut[a] || 0) + oh;
    usedIn[b] = (usedIn[b] || 0) + ih;

    // Leaving a correlation, start after its label gutter so ribbons never
    // cross the text. This is the fix for the vendor's overlapping labels.
    const isCorrSource = byId[a] && byId[a].relationship !== undefined;
    const x1 = isCorrSource ? X.corrLabelRight : from.x + NODE_W;
    const x2 = to.x;
    const s1 = x1 + SHOULDER;
    const s2 = x2 - SHOULDER;
    const mx = s1 + (s2 - s1) / 2;

    const d =
      `M${x1},${oy} L${s1},${oy}` +
      ` C${mx},${oy} ${mx},${iy} ${s2},${iy}` +
      ` L${x2},${iy} L${x2},${iy + ih} L${s2},${iy + ih}` +
      ` C${mx},${iy + ih} ${mx},${oy + oh} ${s1},${oy + oh}` +
      ` L${x1},${oy + oh} Z`;

    return { key: `${a}-${b}-${i}`, d, a, b, band, from: endFill(byId[a]), to: endFill(byId[b]) };
  }).filter(Boolean);
}

/**
 * Everything reachable from a node, following links in both directions until
 * nothing new appears. Selecting a hypothesis therefore lights the whole chain
 * back through its correlations to the findings that produced it.
 */
/* The chain that actually feeds this node, and the chain it actually feeds.
   The old walk went both ways at every step, so from a hypothesis it climbed to
   a correlation and then came back DOWN into that correlation's other
   hypotheses, lighting up half the chart. Direction is fixed per pass: up only,
   then down only, so a hypothesis traces to its own evidence and nothing
   else. */
/* Findings grouped by the report they came out of, the way the source
   documents actually arrive. A doctor reads "these four are the LFT" as one
   thought; a flat list of 27 parameters makes them reconstruct that grouping in
   their head every time. Derived from the data, and only for runs of adjacent
   rows, so the group bracket can never claim to span a row that is not in it. */
function findingGroups(pos) {
  const out = [];
  FINDINGS.forEach((f) => {
    if (f.collapsed) return;
    const report = REPORTS.find((r) => r.id === f.report);
    const last = out[out.length - 1];
    if (last && last.report === f.report) {
      last.ids.push(f.id);
      return;
    }
    out.push({
      report: f.report,
      name: report ? report.name : "Other findings",
      modality: report ? report.modality : "",
      ids: [f.id],
    });
  });
  return out
    .map((g) => {
      const ys = g.ids.map((id) => pos[id]).filter(Boolean);
      if (!ys.length) return null;
      return {
        ...g,
        top: Math.min(...ys.map((p) => p.y)),
        bottom: Math.max(...ys.map((p) => p.y + p.h)),
        count: g.ids.length,
      };
    })
    .filter(Boolean);
}

/* Every OTHER finding that shares a correlation with this one, across reports.
   Tracing the chain shows what a finding led to; this shows what it is keeping
   company with, which is what "why is this flagged" usually means. */
function siblingsOf(id) {
  const out = { [id]: true };
  LINKS.filter(([from]) => from === id).forEach(([, corr]) => {
    out[corr] = true;
    LINKS.filter(([, to]) => to === corr).forEach(([from]) => { out[from] = true; });
  });
  return out;
}

function traceFrom(id) {
  const seen = { [id]: true };

  const up = [id];
  while (up.length) {
    const cur = up.shift();
    LINKS.forEach(([a, b]) => {
      if (b === cur && !seen[a]) { seen[a] = true; up.push(a); }
    });
  }

  const down = [id];
  while (down.length) {
    const cur = down.shift();
    LINKS.forEach(([a, b]) => {
      if (a === cur && !seen[b]) { seen[b] = true; down.push(b); }
    });
  }

  return seen;
}

/** A chip is a tint of its own tone against a tinted card. On the one selected
 *  card the ground goes solid, so the chip inverts instead. */
function Chip({ x, y, label, fill, ink, opacity = 1 }) {
  return (
    <g aria-hidden="true" opacity={opacity}>
      <rect x={x} y={y} width={chipWidth(label)} height={CHIP_H} rx={CHIP_R} fill={fill} />
      {/* Centred in the pill, both axes, so the label never sits low against the
          chip floor. */}
      <text
        x={x + chipWidth(label) / 2}
        y={y + CHIP_H / 2}
        className={styles.tChip}
        fill={ink}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  );
}

/** The next test, offered on the node itself. It is the only thing in the chart
 *  you can act on, so it should not need a hover to be found. */
function AddTestAction({ x, y, test, done, ink, onAdd }) {
  /* The node says what the action IS, not what the payload happens to be. The
     payload is a test today and could be a diagnosis tomorrow, and "Add Blood
     culture to Rx" read as a sentence about blood culture rather than a
     button. The specific item is named in the detail panel. */
  const label = done ? "Added to Rx" : "Add to Rx";
  const w = textWidth(label, CW_NAME) + CHIP_PAD;
  const act = (ev) => {
    ev.stopPropagation();
    if (!done) onAdd();
  };
  const key = (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    act(ev);
  };
  return (
    <g
      className={done ? undefined : styles.action}
      role={done ? undefined : "button"}
      tabIndex={done ? undefined : 0}
      aria-label={done ? undefined : `Add ${test} to prescription`}
      onClick={done ? undefined : act}
      onKeyDown={done ? undefined : key}
    >
      <rect x={x - 4} y={y - 4} width={w + 8} height={ACTION_ROW + 4} rx={NODE_R} fill="transparent" />
      <text
        x={x}
        y={y + 12}
        className={done ? styles.tActionDone : styles.tAction}
        fill={done ? "var(--tesseract-fg-success)" : ink}
      >
        {label}
      </text>
    </g>
  );
}

export default function CorrelationSankey({ selected = null, onSelect, onAddTest, fit = false }) {
  const { pos, outCount, inCount, height } = useLayout();
  const ribbons = useMemo(() => buildRibbons(pos, outCount, inCount), [pos, outCount, inCount]);
  const [hover, setHover] = useState(null);
  /* THE CURSOR IS NOT STATE.
     This was `useState`, written on every mousemove over any node or ribbon.
     Each write re-rendered the whole chart — every finding row, every ribbon
     path, every card, plus a nodeDim/textDim call per node — at pointer rate,
     which is what made the tab crawl while the result was on screen. Only the
     tooltip ever reads it, and it can position itself from a ref without React
     re-rendering anything. `hover` stays state because it changes what is
     dimmed and which tooltip shows, and it only changes on enter/leave. */
  const tipXY = useRef({ x: 0, y: 0 });
  const [added, setAdded] = useState({});
  const closeTimer = useRef(null);

  /* The tooltip can hold a button, so the pointer has to be able to travel from
     the node into the tooltip. Closing is deferred and cancelled on entry. */
  const holdOpen = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const releaseSoon = useCallback(() => {
    holdOpen();
    closeTimer.current = setTimeout(() => setHover(null), 180);
  }, [holdOpen]);
  useEffect(() => holdOpen, [holdOpen]);

  const track = useCallback((ev) => {
    tipXY.current = { x: ev.clientX, y: ev.clientY };
  }, []);

  const enter = useCallback((next, ev) => {
    holdOpen();
    /* Position first, so the tooltip's first paint is already in the right
       place rather than at the last node's coordinates. */
    track(ev);
    setHover(next);
  }, [holdOpen, track]);

  const focusOn = useCallback((next, ev) => {
    holdOpen();
    const r = ev.currentTarget.getBoundingClientRect();
    tipXY.current = { x: r.right, y: r.top };
    setHover(next);
  }, [holdOpen]);

  const pick = useCallback((id) => {
    if (!onSelect) return;
    /* Clicking a correlation or a diagnosis always OPENS it. Toggling meant a
       second click on the same card silently closed the panel, which read as
       the panel failing to open at all. Findings still toggle, because there
       nothing opens and the click only lights the trace. */
    const node = byId[id];
    const opensPanel = node && node.flag === undefined;
    onSelect(!opensPanel && selected === id ? null : id);
  }, [onSelect, selected]);

  const addTest = useCallback((id, test) => {
    setAdded((prev) => ({ ...prev, [id]: true }));
    if (onAddTest) onAddTest(id, test);
  }, [onAddTest]);

  /* Hover is transient and wins while it lasts; selection persists so the
     doctor can read the cards below without losing the path. */
  const focus = useMemo(() => {
    if (hover) {
      if (hover.kind === "link") {
        return { nodes: { [hover.a]: true, [hover.b]: true }, link: hover.key };
      }
      return { nodes: traceFrom(hover.id), link: null };
    }
    if (selected) {
      const node = byId[selected];
      const lit = node && node.flag !== undefined ? siblingsOf(selected) : traceFrom(selected);
      return { nodes: lit, link: null };
    }
    return null;
  }, [hover, selected]);

  const nodeDim = (id) => {
    if (!focus) return 1;
    return focus.nodes[id] ? 1 : DIM_MARK;
  };
  const textDim = (id) => {
    if (!focus) return 1;
    return focus.nodes[id] ? 1 : DIM_TEXT;
  };
  /* RIBBON WEIGHT.
     These sat at 0.26 and 0.16 at rest, which drew the argument at the
     strength of a watermark: the ribbons are the only thing on the chart that
     says one finding LED to another, and they read as decorative smoke behind
     the cards. Raised so the flow is the first thing the eye follows, with the
     band still separating a strong link from a weak one. Thickness already
     carries strength, so opacity's job here is legibility, not ranking.
     The dim state drops further than before, keeping the contrast between
     traced and untraced wide now that the resting state is this much stronger. */
  const REST = { 3: 0.58, 2: 0.42, 1: 0.3 };
  const LIVE = { 3: 0.88, 2: 0.72, 1: 0.6 };
  const FADE = 0.05;

  const linkDim = (r) => {
    const rest = REST[r.band] || REST[1];
    const live = LIVE[r.band] || LIVE[1];
    if (!focus) return rest;
    if (focus.link) return focus.link === r.key ? live : FADE;
    return focus.nodes[r.a] && focus.nodes[r.b] ? live : FADE;
  };

  return (
    <div className={styles.wrap}>
      {/* When a detail panel takes half the drawer the chart would otherwise
          scroll sideways under it. `fit` drops the minimum width so the whole
          diagram scales down to whatever is left, the way a canvas would. */}
      <div className={styles.scroll} data-fit={fit || undefined}>
        <svg
          className={styles.svg}
          viewBox={`0 -${HEAD_H} ${W} ${height + HEAD_H}`}
          height={fit ? undefined : height + HEAD_H}
          role="img"
          aria-label="Findings flowing into correlations and into hypotheses"
        >
          <defs>
            {ribbons.map((r) => (
              <linearGradient key={r.key} id={`rib-${r.key}`} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={r.from} />
                <stop offset="100%" stopColor={r.to} />
              </linearGradient>
            ))}
            {/* The Tesseract bordered-card edge, adapted to SVG: a vertical
                gradient so the top and bottom of the card stroke read solid and
                the middle of each side fades to a whisper. One per tone. */}
            {["associated", "contradicts", "dead", "reasoning", "evStrong", "evMedium", "evLow"].map((t) => (
              <linearGradient key={`cardEdge-${t}`} id={`cardEdge-${t}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--corr-edge-${t})`} stopOpacity="1" />
                <stop offset="50%" stopColor={`var(--corr-edge-${t})`} stopOpacity="0.12" />
                <stop offset="100%" stopColor={`var(--corr-edge-${t})`} stopOpacity="1" />
              </linearGradient>
            ))}
          </defs>

          <g className={styles.ribbons}>
            {ribbons.map((r) => (
              <path
                key={r.key}
                d={r.d}
                fill={`url(#rib-${r.key})`}
                opacity={linkDim(r)}
                className={styles.ribbon}
                onMouseEnter={(e) => enter({ kind: "link", ...r }, e)}
                onMouseMove={track}
                onMouseLeave={releaseSoon}
              />
            ))}

            {/* A correlation that produced no hypothesis has no ribbon to draw,
                so the flow is stopped explicitly in the ribbon channel: the
                stub is where its ribbon would have been, and the LED NOWHERE
                chip on the node names it. */}
            {CORRELATIONS.filter((c) => c.dead).map((c) => {
              const p = pos[c.id];
              const sx = X.corrLabelRight;
              const sy = p.y + p.h / 2;
              return (
                <g key={`dead-${c.id}`} aria-hidden="true" opacity={nodeDim(c.id) * 0.8}>
                  <path d={`M${sx},${sy} L${sx + 22},${sy}`} stroke="var(--corr-bar-dead)" strokeWidth="2" strokeDasharray="5,4" fill="none" strokeLinecap="round" />
                  <circle cx={sx + 30} cy={sy} r="3.5" fill="none" stroke="var(--corr-bar-dead)" strokeWidth="2" />
                </g>
              );
            })}
          </g>

          {/* The report brackets, drawn behind the rows they enclose. */}
          <g className={styles.groups} aria-hidden="true">
            {findingGroups(pos).map((g) => (
              <g key={g.report}>
                <path
                  d={`M${X.labelLeft - 12},${g.top} L${X.labelLeft - 16},${g.top} L${X.labelLeft - 16},${g.bottom} L${X.labelLeft - 12},${g.bottom}`}
                  fill="none"
                  stroke="var(--corr-group-line)"
                  strokeWidth="1"
                />
                <text
                  x={X.labelLeft - 24}
                  y={(g.top + g.bottom) / 2 - 3}
                  className={styles.tGroup}
                >
                  {truncate(g.name, GROUP_W, CW_NAME)}
                </text>
                <text
                  x={X.labelLeft - 24}
                  y={(g.top + g.bottom) / 2 + 11}
                  className={styles.tGroupMeta}
                >
                  {g.count} {g.count === 1 ? "finding" : "findings"}
                  {g.modality ? ` · ${g.modality}` : ""}
                </text>
              </g>
            ))}
          </g>

          <g>
            {FINDINGS.map((f) => {
              const p = pos[f.id];
              const fill = f.collapsed ? "var(--corr-muted)" : f.flag === "NORMAL" ? "var(--corr-normal)" : "var(--corr-abnormal)";
              const dim = nodeDim(f.id);
              const tdim = textDim(f.id);
              /* The orphan mark sits in the label channel with the name, not in
                 the ribbon band where it reads as a collision. */
              const orphanChipW = f.orphan ? chipWidth("NOT USED") : 0;
              const orphanChipX = X.findings - LABEL_GAP - orphanChipW;
              const nameRoom = f.orphan ? GUTTER.finding - orphanChipW - 8 : GUTTER.finding;
              const quiet = f.collapsed || f.flag === "NORMAL";
              /* Both lines end at the node, so name and reading sit against the
                 rect they belong to instead of drifting off to the left rule. */
              const rowRight = X.findings - LABEL_GAP;
              const nameRight = f.orphan ? orphanChipX - 8 : rowRight;
              /* The reading line has to clear the chip too. The name was
                 shortened for it and this line was not, so on an orphaned
                 finding the NOT USED chip painted straight over the value —
                 the chip spans cy-8..cy+10 and the reading sits at cy+11. */
              const readRight = f.orphan ? orphanChipX - 8 : rowRight;
              const readRoom = (f.orphan ? nameRoom : GUTTER.finding) - 14;
              return (
                <g
                  key={f.id}
                  className={styles.node}
                  tabIndex={0}
                  role="button"
                  aria-label={`${f.name}, ${f.value}, ${FLAG_WORD[f.flag] || f.flag}`}
                  onMouseEnter={(e) => enter({ kind: "finding", id: f.id }, e)}
                  onMouseMove={track}
                  onMouseLeave={releaseSoon}
                  onFocus={(e) => focusOn({ kind: "finding", id: f.id }, e)}
                  onBlur={releaseSoon}
                  onClick={() => pick(f.id)}
                >
                  <rect x={p.x} y={p.y} width={NODE_W} height={p.h} rx={NODE_R} fill={fill} opacity={dim * (f.collapsed ? 0.4 : 1)} />
                  {selected === f.id && (
                    <rect x={p.x - 4} y={p.y - 4} width={NODE_W + 8} height={p.h + 8} rx={CARD_R} fill="none" stroke="var(--corr-select)" strokeWidth="2" />
                  )}
                  {f.orphan && (
                    <>
                      <rect x={p.x - 4} y={p.y - 4} width={NODE_W + 8} height={p.h + 8} rx={CARD_R} fill="none" stroke="var(--corr-bar-dead)" strokeWidth="1.5" strokeDasharray="3,3" opacity={dim} />
                      <Chip
                        x={orphanChipX}
                        y={p.cy - 8}
                        label="NOT USED"
                        fill="var(--corr-chip-dead)"
                        ink="var(--corr-ink-dead)"
                        opacity={dim}
                      />
                    </>
                  )}
                  <text
                    x={nameRight}
                    y={p.cy - 4}
                    className={quiet ? styles.tNameQuiet : styles.tName}
                    opacity={tdim}
                  >
                    {truncate(f.name, nameRoom, CW_NAME)}
                  </text>
                  <text
                    x={ARROW_SRC[f.flag] ? readRight - 14 : readRight}
                    y={p.cy + 11}
                    className={quiet ? styles.tReadQuiet : styles.tRead}
                    opacity={tdim}
                  >
                    {truncate(readingOf(f), readRoom, CW_NAME)}
                  </text>
                  <FlagArrow
                    flag={f.flag}
                    x={readRight - 11}
                    y={p.cy + 11}
                    color={quiet ? "var(--tesseract-fg-tertiary)" : "var(--tesseract-error-600)"}
                    opacity={tdim}
                  />
                </g>
              );
            })}

            {CORRELATIONS.map((c) => {
              const p = pos[c.id];
              const chip = corrChip(c);
              const dim = nodeDim(c.id);
              const on = selected === c.id;
              const tone = evTone(c);
              const ch = corrCardH(c);
              const cy0 = p.cy - ch / 2;
              const lx = CARD.corrX + CARD_PAD_X;
              return (
                <g
                  key={c.id}
                  className={styles.node}
                  tabIndex={0}
                  role="button"
                  aria-label={c.name}
                  onMouseEnter={(e) => enter({ kind: "corr", id: c.id }, e)}
                  onMouseMove={track}
                  onMouseLeave={releaseSoon}
                  onFocus={(e) => focusOn({ kind: "corr", id: c.id }, e)}
                  onBlur={releaseSoon}
                  onClick={() => pick(c.id)}
                >
                  <rect x={p.x} y={p.y} width={NODE_W} height={p.h} rx={NODE_R} fill={barFill(c)} opacity={dim * (c.collapsed ? 0.45 : 1)} />
                  <rect
                    x={CARD.corrX}
                    y={cy0}
                    width={CARD.corrW}
                    height={ch}
                    rx={CARD_R}
                    fill={surfaceOf(tone, on)}
                    stroke={on ? edgeOf(tone, on) : `url(#cardEdge-${tone})`}
                    strokeWidth={on ? "1.5" : "1.25"}
                    opacity={dim * (c.collapsed ? 0.7 : 1)}
                  />
                  {/* HEADER: the claim, at full width. */}
                  <text
                    x={lx}
                    y={cy0 + CARD_PAD_Y + 13}
                    className={styles.tCard}
                    fill={inkOf(tone)}
                    opacity={textDim(c.id)}
                  >
                    {truncate(chartLabel(c), GUTTER.corr - 18, CW_NAME)}
                  </text>
                  {/* BODY: how well supported, ALWAYS, because that is the
                      scale the whole column is coloured on. The report span is
                      a second chip beside it where there is one. These used to
                      be exclusive, so a cross-report correlation lost its
                      evidence word and two identically green cards read as
                      though they were saying different kinds of thing. */}
                  <Chip
                    x={lx}
                    y={cy0 + CARD_PAD_Y + TITLE_ROW + 2}
                    label={String(c.evidence || "").toUpperCase()}
                    fill={chipFillOf(tone, on)}
                    ink={inkOf(tone)}
                    opacity={dim}
                  />
                  {chip ? (
                    <Chip
                      x={lx + chipWidth(String(c.evidence || "").toUpperCase()) + CHIP_GAP}
                      y={cy0 + CARD_PAD_Y + TITLE_ROW + 2}
                      label={chip.label}
                      fill={chipFillOf(tone, on)}
                      ink={inkOf(tone)}
                      opacity={dim}
                    />
                  ) : null}
                  {/* FOOTER edge: the chevron says the card opens. Sat faint and
                      tiny in the edge colour, so it read as decoration; now it
                      is larger and takes the card's ink so it reads as the way
                      in. A soft disc behind it lifts it off the tint. */}
                  <circle
                    cx={CARD.corrX + CARD.corrW - CARD_PAD_X - 8}
                    cy={cy0 + ch / 2}
                    r="11"
                    fill={chipFillOf(tone, on)}
                    opacity={dim * 0.9}
                  />
                  <CardGlyph
                    src={CHEV}
                    x={CARD.corrX + CARD.corrW - CARD_PAD_X - 16}
                    y={cy0 + ch / 2 - 8}
                    size={16}
                    color={`var(--corr-ink-${tone})`}
                    opacity={dim}
                  />
                </g>
              );
            })}

            {HYPOTHESES.map((hp) => {
              const p = pos[hp.id];
              const chip = hypChip(hp);
              const dim = nodeDim(hp.id);
              const on = selected === hp.id;
              /* The last column is colour-coded by CONFIDENCE, on the same
                 scale the panels use: green strong, blue moderate, amber thin.
                 A uniform violet column said only "these are hypotheses",
                 which the reader already knew from where they sit. */
              const tone = evTone(hp);
              const ch = hypCardH(hp);
              const cy0 = p.cy - ch / 2;
              const lx = CARD.hypX + CARD_PAD_X;
              const tLine = testsLine(hp);
              const actionY = cy0 + CARD_PAD_Y + TITLE_ROW + CHIP_ROW + (tLine ? TEST_ROW : 0);
              return (
                <g
                  key={hp.id}
                  className={styles.node}
                  tabIndex={0}
                  role="button"
                  aria-label={hp.name}
                  onMouseEnter={(e) => enter({ kind: "hyp", id: hp.id }, e)}
                  onMouseMove={track}
                  onMouseLeave={releaseSoon}
                  onFocus={(e) => focusOn({ kind: "hyp", id: hp.id }, e)}
                  onBlur={releaseSoon}
                  onClick={() => pick(hp.id)}
                >
                  <rect x={p.x} y={p.y} width={NODE_W} height={p.h} rx={NODE_R} fill={barFill(hp)} opacity={dim} />
                  <rect
                    x={CARD.hypX}
                    y={cy0}
                    width={CARD.hypW}
                    height={ch}
                    rx={CARD_R}
                    fill={surfaceOf(tone, on)}
                    stroke={on ? edgeOf(tone, on) : `url(#cardEdge-${tone})`}
                    strokeWidth={on ? "1.5" : "1.25"}
                    opacity={dim}
                  />
                  {/* HEADER: the diagnosis mark, then the name. */}
                  <CardGlyph
                    src={DX_ICON}
                    x={lx}
                    y={cy0 + CARD_PAD_Y}
                    color={`var(--corr-solid-${tone})`}
                    opacity={textDim(hp.id)}
                  />
                  <text
                    x={lx + GLYPH + GLYPH_GAP}
                    y={cy0 + CARD_PAD_Y + 13}
                    className={styles.tLead}
                    fill={inkOf(tone)}
                    opacity={textDim(hp.id)}
                  >
                    {truncate(chartLabel(hp), GUTTER.hyp - GLYPH - GLYPH_GAP - 18, CW_LEAD)}
                  </text>
                  {/* BODY: how sure, always shown. */}
                  <Chip
                    x={lx + GLYPH + GLYPH_GAP}
                    y={cy0 + CARD_PAD_Y + TITLE_ROW + 2}
                    label={chip ? chip.label : String(hp.confidence || "").toUpperCase()}
                    fill={chipFillOf(tone, on)}
                    ink={inkOf(tone)}
                    opacity={dim}
                  />
                  <circle
                    cx={CARD.hypX + CARD.hypW - CARD_PAD_X - 8}
                    cy={cy0 + ch / 2}
                    r="11"
                    fill={chipFillOf(tone, on)}
                    opacity={dim * 0.9}
                  />
                  <CardGlyph
                    src={CHEV}
                    x={CARD.hypX + CARD.hypW - CARD_PAD_X - 16}
                    y={cy0 + ch / 2 - 8}
                    size={16}
                    color={`var(--corr-ink-${tone})`}
                    opacity={dim}
                  />
                  {tLine && (
                    <text
                      x={lx + GLYPH + GLYPH_GAP}
                      y={cy0 + CARD_PAD_Y + TITLE_ROW + CHIP_ROW + 10}
                      className={styles.tTests}
                      opacity={textDim(hp.id)}
                    >
                      {truncate(tLine, GUTTER.hyp - GLYPH - GLYPH_GAP - 18, CW_NAME)}
                    </text>
                  )}
                  {firstTest(hp) && (
                    <AddTestAction
                      x={lx + GLYPH + GLYPH_GAP}
                      y={actionY}
                      test={firstTest(hp)}
                      done={Boolean(added[hp.id])}
                      ink={inkOf(tone)}
                      onAdd={() => addTest(hp.id, hp.investigations)}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {hover && (
        <SankeyTooltip
          hover={hover}
          atRef={tipXY}
          added={added}
          onAddTest={addTest}
          onHold={holdOpen}
          onRelease={releaseSoon}
        />
      )}
    </div>
  );
}

/** Keeps the card inside the window on all four sides. It picks the side of the
 *  cursor with room for the whole card, flips to the other when there is not,
 *  and clamps after flipping so a card taller than the viewport still starts on
 *  screen and scrolls inside itself. */
const EDGE = 12;
const OFFSET = 16;
const TIP_MIN_H = 120;

function clampToViewport(at, size) {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const w = size.w || 280;
  const h = size.h || 160;

  let left = at.x + OFFSET;
  if (left + w > vw - EDGE) left = at.x - OFFSET - w;
  left = Math.max(EDGE, Math.min(left, vw - EDGE - w));

  /* Below the cursor by preference. Flip above when the card does not fit
     below, unless above is tighter still, in which case stay on the roomier
     side and let maxHeight scroll the overflow. */
  const roomBelow = vh - EDGE - (at.y + OFFSET);
  const roomAbove = at.y - OFFSET - EDGE;
  const below = h <= roomBelow || roomBelow >= roomAbove;
  const room = Math.max(TIP_MIN_H, below ? roomBelow : roomAbove);

  let top = below ? at.y + OFFSET : at.y - OFFSET - Math.min(h, room);
  top = Math.max(EDGE, Math.min(top, vh - EDGE - Math.min(h, room)));

  return { left, top, maxHeight: Math.min(room, vh - EDGE * 2) };
}

function SankeyTooltip({ hover, atRef, added, onAddTest, onHold, onRelease }) {
  const ref = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const tipKey = hover.kind === "link" ? hover.key : hover.id;
  const done = hover.kind === "hyp" && Boolean(added[hover.id]);

  /* Written straight to the node. Following the cursor is a paint concern, not
     a state change: routing it through React re-rendered the entire chart
     behind this card on every pointer move. */
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const s = clampToViewport(atRef.current, sizeRef.current);
    el.style.left = `${s.left}px`;
    el.style.top = `${s.top}px`;
    el.style.maxHeight = `${s.maxHeight}px`;
  }, [atRef]);

  /* Measure before paint, then clamp against the real box. Guessing the size
     is what let the old tooltip run off the edge of the window. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    sizeRef.current = { w: r.width, h: r.height };
    place();

    /* One listener while the card is open, coalesced to a frame, instead of a
       React handler on every node firing at pointer rate. */
    let frame = 0;
    const onMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tipKey, done, place]);

  /* First paint, before the layout effect has measured: the same clamp with the
     fallback size, so the card opens in roughly the right place and is nudged
     to the exact one a frame later rather than jumping in from the corner. */
  const style = clampToViewport(atRef.current, sizeRef.current);
  const hyp = hover.kind === "hyp" ? byId[hover.id] : null;
  const live = Boolean(hyp && firstTest(hyp));
  let body = null;

  if (hover.kind === "finding") {
    const f = byId[hover.id];
    body = (
      <>
        <span className={styles.tpKind}>{f.collapsed ? "Collapsed" : `${f.modality}`}</span>
        {f.collapsed ? (
          <>
            <span className={styles.tpTitle}>{f.name}</span>
            <span className={styles.tpRow}>
              Every remaining parameter across the selected reports sat inside its reference range.
              Collapsed so the abnormal findings can be seen.
            </span>
          </>
        ) : (
          <>
            {/* The number is what the doctor came for, so it leads. */}
            <span className={f.flag === "NORMAL" ? styles.tpValue : styles.tpValueBad}>
              {f.value}
            </span>
            <span className={styles.tpTitle}>{f.name}</span>
            <span className={styles.tpRow}>
              {f.ref ? <>Normal range {readableRange(f.ref)}. </> : null}
              <b className={f.flag === "NORMAL" ? undefined : styles.tpFlagBad}>
                This result is {FLAG_WORD[f.flag] || f.flag.toLowerCase()}.
              </b>
            </span>
            <span className={styles.tpMeta}>LOINC {f.loinc} · read with {f.confidence} confidence</span>
          </>
        )}
        {f.orphan && (
          <span className={styles.tpDead}>
            The agent could not weave this into any correlation, even after a retry.
          </span>
        )}
      </>
    );
  } else if (hover.kind === "corr") {
    const c = byId[hover.id];
    /* Short on purpose. The mechanism, the challenge and the guide rule all
       live in the detail panel now, and printing them here as well produced a
       card tall enough to cover the chart it was explaining. */
    body = (
      <>
        <span className={styles.tpKind}>Correlation · {c.support}</span>
        <span className={styles.tpTitle}>{c.name}</span>
        <span className={styles.tpRow}>
          <b>{c.evidence} evidence</b> · {c.relationship.replace(/_/g, " ")} · {c.verdict} the challenge
        </span>
        {c.dead && (
          <span className={styles.tpDead}>Survived, then led nowhere. No hypothesis was built from it.</span>
        )}
        <span className={styles.tpHint}>Click to open the full reasoning</span>
      </>
    );
  } else if (hyp) {
    /* Rationale, Built from and Not ruled out are printed verbatim on the
       hypothesis card below. Repeating them here is what made this card tall
       enough to cover the column it was explaining. */
    body = (
      <>
        <span className={styles.tpKind}>Hypothesis · {TIER_WORD[hyp.tier] || hyp.tier}</span>
        <span className={styles.tpTitle}>{hyp.name}</span>
        <span className={styles.tpRow}>
          {/* Counted off LINKS rather than read from a hardcoded string, so it
              can never disagree with the chart it sits on. */}
          <b>{hyp.confidence} confidence</b> · built from {LINKS.filter(([, to]) => to === hyp.id).length} correlations
        </span>
        {live && (
          <span className={styles.tpAction}>
            {done ? (
              <Badge variant="soft" color="success" size="sm" icons="none">
                {firstTest(hyp)} added to Rx
              </Badge>
            ) : (
              <Button
                variant="outline"
                theme="primary"
                size="sm"
                onClick={() => onAddTest(hyp.id, hyp.investigations)}
              >
                Add {firstTest(hyp)} to Rx
              </Button>
            )}
          </span>
        )}
      </>
    );
  } else {
    const a = byId[hover.a];
    const b = byId[hover.b];
    body = (
      <>
        <span className={styles.tpKind}>Link</span>
        <span className={styles.tpTitle}>{a.name} → {b.name}</span>
        <span className={styles.tpRow}>
          <b>{(b.relationship || "supports").replace(/_/g, " ")}</b> · {hover.band === 3 ? "strong" : "moderate"} evidence
        </span>
      </>
    );
  }

  return (
    <div
      ref={ref}
      className={live ? `${styles.tip} ${styles.tipLive}` : styles.tip}
      style={style}
      role="tooltip"
      onMouseEnter={live ? onHold : undefined}
      onMouseLeave={live ? onRelease : undefined}
    >
      {body}
    </div>
  );
}
