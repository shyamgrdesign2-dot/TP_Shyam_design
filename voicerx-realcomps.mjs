// Re-capture the REAL Siri wave + live transcript + shiner box + post-submit
// chat reveal — by faking the mic via Chrome flags and disabling Web Speech API
// so the scripted-transcript fallback runs.

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "videos/voicerx-2-promo/capture/realcomps";
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

// Disable Web Speech API so the scripted-transcript fallback kicks in
// (`useLiveTranscript`'s `liveSupported` will be false, so `useDrAgentPanel`
// will pump VOICE_RX_AMBIENT_CHUNKS or VOICE_RX_DICTATION_CHUNKS into state).
await page.evaluateOnNewDocument(() => {
  try {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
  } catch {}
});

page.setDefaultNavigationTimeout(25000);

async function settle(ms = 1200) {
  await new Promise((r) => setTimeout(r, ms));
}
async function clip(name, getBox, pad = 14) {
  const box = await page.evaluate(getBox);
  if (!box || box.width < 4 || box.height < 4) {
    console.log(`✗ ${name} — invalid box`);
    return;
  }
  const c = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  await page.screenshot({ path: `${OUT}/${name}.png`, type: "png", clip: c });
  console.log(`✓ ${name}  ${Math.round(c.width)}×${Math.round(c.height)}`);
}

// ── 1. Land + open VoiceRx panel
await page.goto("http://localhost:3000/rxpad/voice", { waitUntil: "networkidle2" });
await settle(2500);

// Expand the VoiceRx panel
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
await settle(1800);

// Start with Voice → Conversation mode (ambient) → Start conversation
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
// Wait for scripted transcript to pump in several chunks
await settle(7000);

// ── 2. Capture: Active Agent in Conversation Mode WITH live transcript + Siri wave
await clip("01-active-agent-conversation-live", () => {
  const close = Array.from(document.querySelectorAll("button")).find(
    (b) => b.getAttribute("aria-label") === "Cancel" || b.getAttribute("aria-label") === "Go back",
  );
  if (!close) return null;
  let p = close;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 280 && r.height > 580) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── 2b. Tighter crop: just the transcript zone (the "main body" with the live text)
await clip("02-transcript-zone", () => {
  // The transcript scroll area is `.vrx-scroll` inside the panel
  const el = document.querySelector(".vrx-scroll");
  if (!el) return null;
  let p = el;
  for (let i = 0; i < 5 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 180) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── 2c. The dock alone (Siri wave + cancel/mic/submit row)
await clip("03-dock-with-wave", () => {
  const submit = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Submit",
  );
  if (!submit) return null;
  let p = submit;
  for (let i = 0; i < 10 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 80 && r.height < 280 && r.width > 280) {
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    p = p.parentElement;
  }
  return null;
});

// ── 3. Submit → capture the SHINER LOADER (the post-submit shimmer card + chat reveal)
await page.evaluate(() => {
  const submit = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Submit",
  );
  if (submit) submit.click();
});
// The submit phase shows a "Processing" pill for ~7s. After that, the shiner
// box reveals with the transcript animation. Wait ~9s to catch the shiner state.
await settle(9000);

await clip("04-shiner-loader", () => {
  const el = document.querySelector(".vrx-shiner-enter, .vrx-transcript-zone-in");
  if (el) {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  // Fallback: find the back-face panel
  const panel = document.querySelector('[aria-label="Minimize agent"]');
  if (!panel) return null;
  let p = panel;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 280 && r.height > 580) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// Wait for the result canvas to appear (after the loader)
await settle(7000);

// ── 4. The VoiceRxCanvas — results screen with tabs + transcript + clinical notes
await clip("05-results-canvas", () => {
  // Find by the "Copy all to RxPad" button which lives in the canvas footer
  const copy = Array.from(document.querySelectorAll("button")).find(
    (b) => b.getAttribute("aria-label")?.includes("Copy all to RxPad") || b.textContent.includes("Copy all to RxPad"),
  );
  if (!copy) return null;
  let p = copy;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 280 && r.height > 500) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── 4b. Tighter crop: just the tab strip
await clip("06-tabs-bar", () => {
  const t = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Clinical Notes"));
  if (!t) return null;
  let p = t;
  for (let i = 0; i < 5 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 30 && r.height < 80 && r.width > 200) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── 4c. Switch to Transcript tab and capture it
await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Transcript" || b.textContent.trim() === "Transcripts");
  if (t) t.click();
});
await settle(1500);
await clip("07-transcript-tab-body", () => {
  const card = document.querySelector(".vrx-transcript-frame, [class*='TranscriptCard']");
  if (card) {
    const r = card.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  return null;
});

// ── 5. Click Copy all to RxPad → capture the copy-into-module shimmer
await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Clinical Notes");
  if (t) t.click();
});
await settle(800);
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.includes("Copy all to RxPad"));
  if (c) c.click();
});
await settle(2000);

// Capture the copy-aura / shimmer state — the form should show shimmering rows
await clip("08-copy-shimmer-form", () => {
  // The Rx form is in the main area. Find the data-rxpad-module wrapper of symptoms.
  const el = document.querySelector('[data-rxpad-module="symptoms"]');
  if (!el) return null;
  // Crop a larger area covering 3 modules
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: Math.min(900, r.height * 3) };
});

await browser.close();
console.log("\n✓ Real component captures complete");
