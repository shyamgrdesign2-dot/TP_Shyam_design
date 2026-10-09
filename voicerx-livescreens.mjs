// Capture LIVE VoiceRx product pages — NO Siri waveform.
// 1) Full RxPad form (all modules visible, scrollable height)
// 2) Dr.Agent chat with Ramesh Kumar pre-visit summary
// 3) Consultation mode bottom sheet (Conversation + Dictation)
// 4) Empty RxPad modules cluster (Symptoms/Diagnosis/Medication standalone)

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "videos/voicerx-2-promo/capture/live";
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

await page.evaluateOnNewDocument(() => {
  try {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
  } catch {}
});
page.setDefaultNavigationTimeout(25000);

const settle = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

async function shot(name, getBox, pad = 0) {
  const box = await page.evaluate(getBox);
  if (!box || box.width < 4) { console.log(`✗ ${name}`); return; }
  await page.screenshot({
    path: `${OUT}/${name}.png`, type: "png",
    omitBackground: true,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });
  console.log(`✓ ${name}  ${Math.round(box.width)}×${Math.round(box.height)}`);
}

await page.goto("http://localhost:3000/rxpad/voice?patientId=apt-ramesh-ckd", { waitUntil: "networkidle2" });
await settle(3000);

// ── A. Full RxPad form column (Symptoms → Surgery)
await shot("01-rxpad-form-full", () => {
  const el = document.querySelector('[data-rxpad-module="symptoms"]');
  if (!el) return null;
  const wrapper = el.closest(".space-y-4") || el.parentElement;
  const r = wrapper.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: Math.min(window.innerHeight - r.y, r.height) };
});

// ── B. Open VoiceRx panel for chat capture
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
await settle(2000);

// ── C. Dr.Agent chat bubble with Ramesh Kumar pre-visit summary
await shot("02-dragent-chat", () => {
  const target = Array.from(document.querySelectorAll("*")).find(
    (el) => el.textContent && el.textContent.includes("Ramesh Kumar has shared pre-visit details")
  );
  if (!target) return null;
  const card = target.closest('[class*="card"]') || target.closest('.flex-col');
  let p = card;
  for (let i = 0; i < 6 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 320 && r.height > 380) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── D. Open consultation mode bottom sheet
await page.evaluate(() => {
  try { localStorage.removeItem("tp-voicerx-bottomsheet-besttip-v1"); } catch {}
  const fab = Array.from(document.querySelectorAll("*")).find(
    (el) => el.children.length === 0 && el.textContent.trim() === "Start with Voice",
  );
  if (fab) fab.parentElement?.click();
});
await settle(1800);

await shot("03-mode-sheet", () => {
  const h = Array.from(document.querySelectorAll("h3,h2")).find((x) => x.textContent.trim() === "Consultation mode");
  if (!h) return null;
  let p = h;
  for (let i = 0; i < 8 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 380 && r.width > 280) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── E. Individual Rx module cards (clean, no chrome)
const moduleKeys = ["symptoms", "examinations", "diagnosis", "medication", "advices", "lab_investigation", "surgery"];
// Need to close the bottom sheet first
await page.evaluate(() => {
  const close = Array.from(document.querySelectorAll("button")).find((b) => b.getAttribute("aria-label") === "Close");
  if (close) close.click();
});
await settle(1000);
await page.goto("http://localhost:3000/rxpad/voice?patientId=apt-ramesh-ckd", { waitUntil: "networkidle2" });
await settle(2500);

for (const key of moduleKeys) {
  await shot(`mod-${key}`, (k) => {
    const el = document.querySelector(`[data-rxpad-module="${k}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

await browser.close();
console.log("\n✓ Done");
