// Surgical component cutouts — transparent background, no chrome.
// For each shot: walk up to find the right element, then inject CSS that
// kills every panel/card/header/border around it so only the target renders.
// Output PNGs are transparent and composite onto any storyboard bg.

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "videos/voicerx-2-promo/capture/cutouts";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  defaultViewport: { width: 1700, height: 1100, deviceScaleFactor: 2 },
  args: [
    "--no-sandbox",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--allow-running-insecure-content",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const page = await browser.newPage();

// Disable Web Speech API → scripted-transcript fallback runs.
// Also stub getUserMedia so the per-module mic never hits the "allow access" branch.
await page.evaluateOnNewDocument(() => {
  try {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
  } catch {}
  // Always resolve mic permission queries
  if (navigator.permissions) {
    const orig = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (d) => {
      if (d?.name === "microphone") return Promise.resolve({ state: "granted", onchange: null });
      return orig(d);
    };
  }
});

page.setDefaultNavigationTimeout(25000);
const settle = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

// Inject a CSS rule that zaps backgrounds, borders, shadows, headers
// on every ancestor of an element matched by `selector`. The target
// element keeps its own styles, but everything around it goes transparent.
async function isolate(selector, opts = {}) {
  await page.evaluate(
    ({ sel, keepChildren }) => {
      const target = document.querySelector(sel);
      if (!target) return;
      target.dataset.isolated = "target";

      // Mark ancestors
      let node = target.parentElement;
      while (node && node !== document.body) {
        node.dataset.isolated = "ancestor";
        node = node.parentElement;
      }

      // Hide siblings of ancestors (so only the path from body to target is visible)
      const ancestors = Array.from(document.querySelectorAll('[data-isolated="ancestor"]'));
      for (const a of ancestors) {
        for (const child of a.children) {
          if (!child.dataset.isolated) child.dataset.isolated = "sibling";
        }
      }

      const css = document.createElement("style");
      css.id = "__cutout_css__";
      css.textContent = `
        html, body { background: transparent !important; }
        [data-isolated="ancestor"] {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          border: 0 !important;
          backdrop-filter: none !important;
          filter: none !important;
        }
        [data-isolated="sibling"] { display: none !important; }
        /* Kill known chrome elements anywhere on the page */
        header, nav, [role="banner"],
        [aria-label="Go back"], [aria-label="Cancel"][class*="back"],
        [class*="Header"], [class*="header"],
        [class*="Tab"][class*="Bar"], [class*="tabbar"],
        [class*="sidebar"], [class*="Sidebar"] {
          ${keepChildren ? "" : "display: none !important;"}
        }
      `;
      document.head.appendChild(css);
    },
    { sel: selector, keepChildren: !!opts.keepChildren }
  );
}

async function resetIsolation() {
  await page.evaluate(() => {
    document.getElementById("__cutout_css__")?.remove();
    document.querySelectorAll("[data-isolated]").forEach((el) => delete el.dataset.isolated);
  });
}

async function shoot(name, getBox, pad = 8) {
  const box = await page.evaluate(getBox);
  if (!box || box.width < 4 || box.height < 4) {
    console.log(`✗ ${name} — no box`);
    return;
  }
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    type: "png",
    omitBackground: true,
    clip,
  });
  console.log(`✓ ${name}  ${Math.round(clip.width)}×${Math.round(clip.height)}`);
}

// ── Land + open VoiceRx panel + start conversation
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2500);

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

await page.evaluate(() => {
  try { localStorage.removeItem("tp-voicerx-bottomsheet-besttip-v1"); } catch {}
  const fab = Array.from(document.querySelectorAll("*")).find(
    (el) => el.children.length === 0 && el.textContent.trim() === "Start with Voice",
  );
  if (fab) fab.parentElement?.click();
});
await settle(1500);
await page.evaluate(() => {
  const start = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start conversation");
  if (start) start.click();
});
await settle(7000);

// ── A. Dock cutout: just cancel + wave + mic + submit row, transparent bg
async function captureDock() {
  // Find Submit, then walk to the *flex row* that contains it — not its card parent.
  await page.evaluate(() => {
    const submit = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent.trim() === "Submit",
    );
    if (!submit) return;
    // Walk up until we find a parent with multiple direct button children (the controls row)
    let p = submit.parentElement;
    for (let i = 0; i < 8 && p; i++) {
      const btnKids = Array.from(p.children).filter((c) => c.tagName === "BUTTON" || c.querySelector("button"));
      if (btnKids.length >= 2) { p.id = "__dock_row__"; return; }
      p = p.parentElement;
    }
  });
  await isolate("#__dock_row__");
  await settle(500);
  await shoot("01-dock-row-cutout", () => {
    const el = document.getElementById("__dock_row__");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, 12);
  await resetIsolation();
}
await captureDock();

// ── B. Transcript text cutout: just the scrolling transcript region, no card frame
async function captureTranscript() {
  await page.evaluate(() => {
    const el = document.querySelector(".vrx-scroll");
    if (el) el.id = "__transcript__";
  });
  await isolate("#__transcript__");
  await settle(500);
  await shoot("02-transcript-cutout", () => {
    const el = document.getElementById("__transcript__");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, 8);
  await resetIsolation();
}
await captureTranscript();

// ── Submit → wait for processing → shiner reveal
await page.evaluate(() => {
  const submit = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Submit",
  );
  if (submit) submit.click();
});
await settle(10000);

// ── C. Shiner box cutout: just the shimmering text container
async function captureShiner() {
  await page.evaluate(() => {
    const el = document.querySelector(".vrx-shiner-enter, .vrx-transcript-zone-in, [class*='shiner']");
    if (el) el.id = "__shiner__";
  });
  await isolate("#__shiner__");
  await settle(500);
  await shoot("03-shiner-cutout", () => {
    const el = document.getElementById("__shiner__");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, 8);
  await resetIsolation();
}
await captureShiner();

// Wait for result canvas
await settle(7000);

// ── D. Copy CTA alone
async function captureCopyCTA() {
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label")?.includes("Copy all to RxPad") || b.textContent.includes("Copy all to RxPad"),
    );
    if (c) c.id = "__copy_cta__";
  });
  await isolate("#__copy_cta__");
  await settle(500);
  await shoot("04-copy-cta-cutout", () => {
    const el = document.getElementById("__copy_cta__");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, 16);
  await resetIsolation();
}
await captureCopyCTA();

// ── Click copy → form shimmer
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Copy all to RxPad"));
  if (c) c.click();
});
await settle(1500);

// ── E. Form shimmer rows: just three module rows, no surrounding form chrome
async function captureFormRows() {
  await page.evaluate(() => {
    const symptoms = document.querySelector('[data-rxpad-module="symptoms"]');
    if (symptoms) {
      // Find the parent that contains the symptoms + next 2 module siblings
      let p = symptoms.parentElement;
      if (p) {
        const wrapper = document.createElement("div");
        wrapper.id = "__rows_wrapper__";
        wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;background:transparent;";
        const mods = ["symptoms", "examinations", "diagnosis"]
          .map((k) => document.querySelector(`[data-rxpad-module="${k}"]`))
          .filter(Boolean);
        if (mods.length) {
          mods[0].parentElement.insertBefore(wrapper, mods[0]);
          mods.forEach((m) => wrapper.appendChild(m));
        }
      }
    }
  });
  await isolate("#__rows_wrapper__");
  await settle(800);
  await shoot("05-form-rows-cutout", () => {
    const el = document.getElementById("__rows_wrapper__");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, 8);
  await resetIsolation();
}
await captureFormRows();

await browser.close();
console.log("\n✓ Cutouts done");
