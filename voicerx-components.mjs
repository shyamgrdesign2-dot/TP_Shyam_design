// Captures component-cropped screenshots from the running VoiceRx app.
// Each shot is clipped to the actual component's bounding box (not the
// full page), padded by --pad pixels so there's a little breathing room.

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "videos/voicerx-2-promo/capture/components";
const PAD = 12;
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  defaultViewport: { width: 1700, height: 1100, deviceScaleFactor: 2 },
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(25000);

async function settle(ms = 1000) { await new Promise((r) => setTimeout(r, ms)); }

async function clip(name, selectorOrEvalGetter, opts = {}) {
  let box;
  if (typeof selectorOrEvalGetter === "string") {
    const handle = await page.$(selectorOrEvalGetter);
    if (!handle) {
      console.log(`✗ ${name} — selector not found: ${selectorOrEvalGetter}`);
      return;
    }
    box = await handle.boundingBox();
  } else {
    // function executed in the page to return { x, y, w, h }
    box = await page.evaluate(selectorOrEvalGetter);
  }
  if (!box || box.width < 4 || box.height < 4) {
    console.log(`✗ ${name} — invalid box`);
    return;
  }
  const pad = opts.pad ?? PAD;
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    type: "png",
    omitBackground: opts.omitBackground ?? false,
    clip,
  });
  console.log(`✓ ${name}  ${Math.round(clip.width)}×${Math.round(clip.height)}`);
}

// ── Helpers to drive the app
async function openVoiceRxPanel() {
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll("*")).find(
      (el) => el.textContent.trim() === "VoiceRx" && el.children.length <= 2,
    );
    if (!t) return;
    let n = t;
    for (let i = 0; i < 8 && n; i++) {
      if (n.tagName === "BUTTON" || n.getAttribute?.("role") === "button") { n.click(); return; }
      n = n.parentElement;
    }
  });
  await settle(1500);
}

async function clickButtonByText(text) {
  await page.evaluate((t) => {
    const fab = Array.from(document.querySelectorAll("*")).find(
      (el) => el.children.length === 0 && el.textContent.trim() === t,
    );
    if (fab) fab.parentElement?.click();
  }, text);
}

async function clickAriaLabel(label) {
  await page.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === l,
    );
    if (btn) btn.click();
  }, label);
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Initial load
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2500);

// ── 01. Rx module: Symptoms header + body (white-bg crop)
await clip("01-rx-module-symptoms",
  () => {
    const m = document.querySelector('[data-rxpad-module="symptoms"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

// ── 02. Rx module: Examinations
await clip("02-rx-module-examinations",
  () => {
    const m = document.querySelector('[data-rxpad-module="examinations"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

// ── 03. Rx module: Diagnosis
await clip("03-rx-module-diagnosis",
  () => {
    const m = document.querySelector('[data-rxpad-module="diagnosis"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

// ── 04. Rx module: Medication
await clip("04-rx-module-medication",
  () => {
    const m = document.querySelector('[data-rxpad-module="medication"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

// ── 05. Medication module with mic ACTIVE
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.getAttribute("aria-label") === "Use Voice AI to fill medication (rx)",
  );
  if (btn) btn.click();
});
await settle(1500);
await clip("05-rx-module-medication-mic-active",
  () => {
    const m = document.querySelector('[data-rxpad-module="medication"]');
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

// Cancel the recorder by clicking its X
await page.evaluate(() => {
  const all = document.querySelectorAll("button");
  for (const b of all) {
    const t = b.textContent.trim();
    if (b.getAttribute("aria-label") === "Cancel" || t === "" && b.querySelector('[d*="18 6"]')) {
      b.click(); return;
    }
  }
});
await settle(800);

// ── 06. Past Visit panel — Digital Rx tab
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2000);
await clip("06-past-visit-panel-digital",
  () => {
    // The left sidebar's first "Past Visit" content panel
    const el = Array.from(document.querySelectorAll('h3, h2, h1')).find((h) => h.textContent.trim() === "Past Visit");
    if (!el) return null;
    let p = el;
    for (let i = 0; i < 5 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.width > 240 && r.height > 400) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 07. Past Visit — Written Rx tab
await page.evaluate(() => {
  const w = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Written Rx");
  if (w) w.click();
});
await settle(800);
await clip("07-past-visit-panel-written",
  () => {
    const el = Array.from(document.querySelectorAll('h3, h2, h1')).find((h) => h.textContent.trim() === "Past Visit");
    if (!el) return null;
    let p = el;
    for (let i = 0; i < 5 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.width > 240 && r.height > 400) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 08. VoiceRx Active Agent (Dr.Agent panel) - open it
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2000);
await openVoiceRxPanel();

// ── 08. Dr.Agent panel — pre-consultation state with "Start with Voice"
await clip("08-dragent-panel-start",
  () => {
    const fab = Array.from(document.querySelectorAll("*")).find(
      (el) => el.children.length === 0 && el.textContent.trim() === "Start with Voice",
    );
    if (!fab) return null;
    // Walk up to find the agent panel container
    let p = fab;
    for (let i = 0; i < 12 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.width > 300 && r.height > 600) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 09. Consultation mode bottom sheet
await page.evaluate(() => {
  try { localStorage.removeItem("tp-voicerx-bottomsheet-besttip-v1"); } catch {}
  const fab = Array.from(document.querySelectorAll("*")).find(
    (el) => el.children.length === 0 && el.textContent.trim() === "Start with Voice",
  );
  if (fab) fab.parentElement?.click();
});
await settle(1500);
await clip("09-consultation-mode-sheet",
  () => {
    // Find the bottom sheet by the heading "Consultation mode"
    const h = Array.from(document.querySelectorAll("h3")).find((x) => x.textContent.trim() === "Consultation mode");
    if (!h) return null;
    let p = h;
    for (let i = 0; i < 8 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.height > 380 && r.width > 280) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 10. Conversation mode ACTIVE — Siri wave + controls (mic-unavailable state)
await page.evaluate(() => {
  const start = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start conversation");
  if (start) start.click();
});
await settle(2500);
await clip("10-active-agent-conversation-mode",
  () => {
    // The active agent fills the panel; find the back-face panel container
    const close = Array.from(document.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "End voice consultation",
    );
    if (!close) return null;
    let p = close;
    for (let i = 0; i < 12 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.width > 280 && r.height > 600) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 11. Just the dock — wave + controls
await clip("11-active-agent-dock",
  () => {
    const submit = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent.trim() === "Submit",
    );
    if (!submit) return null;
    let p = submit;
    for (let i = 0; i < 8 && p; i++) {
      const r = p.getBoundingClientRect();
      if (r.width > 280 && r.height > 50 && r.height < 240) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      p = p.parentElement;
    }
    return null;
  },
);

// ── 12. VoiceBar (Whisper-style dictation strip)
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2000);
await page.evaluate(() => {
  const fire = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
  fire();
  setTimeout(fire, 150);
});
await settle(2000);
await clip("12-voice-bar-overlay",
  () => {
    const region = document.querySelector('[aria-label="Voice dictation bar"]');
    if (!region) return null;
    const bar = region.querySelector('[role="dialog"]') || region.children[1];
    const r = (bar || region).getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  },
);

await browser.close();
console.log("\n✓ Done");
