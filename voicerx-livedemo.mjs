// FULL LIVE DEMO CAPTURE — bypass mic + Speech API so:
//   • Siri waveform animates from a fake AudioContext source
//   • Scripted-transcript fallback pumps real words into the live transcript view
//   • All UI states (active conversation, processing, transcript, clinical notes,
//     per-module mic, double-shift VoiceBar, past visits) appear cleanly.

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] || "videos/voicerx-2-promo/capture/livedemo";
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
  // 1) Disable Web Speech API so scripted-transcript fallback fires
  try {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
  } catch {}

  // 2) Fake a real MediaStream so the Siri waveform analyser has something to read
  if (navigator.mediaDevices) {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const dest = ctx.createMediaStreamDestination();
        // Modulated sine — gives the analyser a varied envelope so the Siri wave wiggles
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const carrierGain = ctx.createGain();
        osc.frequency.value = 220;
        lfo.frequency.value = 6;
        lfoGain.gain.value = 80;
        carrierGain.gain.value = 0.08;
        lfo.connect(lfoGain).connect(osc.frequency);
        osc.connect(carrierGain).connect(dest);
        osc.start(); lfo.start();
        return dest.stream;
      } catch {
        return orig(constraints);
      }
    };
    navigator.mediaDevices.enumerateDevices = async () => [
      { kind: "audioinput", deviceId: "default", label: "MacBook Microphone", groupId: "demo" },
    ];
    if (navigator.permissions) {
      const oq = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (d) => {
        if (d?.name === "microphone") return Promise.resolve({ state: "granted", onchange: null });
        return oq(d);
      };
    }
  }
});

page.setDefaultNavigationTimeout(25000);
const settle = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

async function shot(name, getBox, pad = 0) {
  const box = await page.evaluate(getBox);
  if (!box || box.width < 4) { console.log(`✗ ${name}`); return; }
  await page.screenshot({
    path: `${OUT}/${name}.png`, type: "png", omitBackground: false,
    clip: {
      x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
      width: box.width + pad * 2, height: box.height + pad * 2,
    },
  });
  console.log(`✓ ${name}  ${Math.round(box.width)}×${Math.round(box.height)}`);
}

// ── Land
await page.goto("http://localhost:3000/rxpad/voice?patientId=apt-ramesh-ckd", { waitUntil: "networkidle2" });
await settle(3000);

// Open VoiceRx panel
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

// Start with Voice → bottom sheet
await page.evaluate(() => {
  try { localStorage.removeItem("tp-voicerx-bottomsheet-besttip-v1"); } catch {}
  const fab = Array.from(document.querySelectorAll("*")).find(
    (el) => el.children.length === 0 && el.textContent.trim() === "Start with Voice",
  );
  if (fab) fab.parentElement?.click();
});
await settle(1500);

// 01 — mode sheet
await shot("01-mode-sheet", () => {
  const h = Array.from(document.querySelectorAll("h3")).find((x) => x.textContent.trim() === "Consultation mode");
  if (!h) return null;
  let p = h;
  for (let i = 0; i < 8 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 380 && r.width > 280) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// Start conversation
await page.evaluate(() => {
  const start = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start conversation");
  if (start) start.click();
});
await settle(7500);

// 02 — ACTIVE AGENT with Siri wave + live transcript (full panel)
await shot("02-active-agent-live", () => {
  const submit = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Submit",
  );
  if (!submit) return null;
  let p = submit;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 320 && r.height > 600) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// 02b — just the dock (Siri wave + controls)
await shot("02b-dock-live", () => {
  const submit = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === "Submit",
  );
  if (!submit) return null;
  let p = submit;
  for (let i = 0; i < 10 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.height > 60 && r.height < 240 && r.width > 280) {
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    p = p.parentElement;
  }
  return null;
});

// 02c — just the transcript text region
await shot("02c-transcript-live", () => {
  const el = document.querySelector(".vrx-scroll");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

// ── Submit → loading
await page.evaluate(() => {
  const submit = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Submit");
  if (submit) submit.click();
});
await settle(4500);

// 03 — Processing / shiner state
await shot("03-processing-shiner", () => {
  const el = document.querySelector(".vrx-shiner-enter, .vrx-transcript-zone-in, [class*='shiner']");
  if (!el) return null;
  let p = el;
  for (let i = 0; i < 8 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 320 && r.height > 500) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

await settle(6500);

// 04 — Results canvas / Clinical Notes tab
await shot("04-clinical-notes", () => {
  const copy = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.includes("Copy all to RxPad")
  );
  if (!copy) return null;
  let p = copy;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 320 && r.height > 600) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// Switch to Transcript tab
await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Transcript" || b.textContent.trim() === "Transcripts");
  if (t) t.click();
});
await settle(1500);

// 05 — Transcript tab
await shot("05-transcript-tab", () => {
  const card = document.querySelector(".vrx-transcript-frame, [class*='TranscriptCard']");
  if (card) {
    const r = card.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  // Fallback to results canvas
  const copy = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent.includes("Copy all to RxPad")
  );
  if (!copy) return null;
  let p = copy;
  for (let i = 0; i < 14 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 320 && r.height > 600) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

// ── Reset for per-module mic capture
await page.goto("http://localhost:3000/rxpad/voice?patientId=apt-ramesh-ckd", { waitUntil: "networkidle2" });
await settle(2500);

// Click the per-module mic on Medication module
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.getAttribute("aria-label") === "Use Voice AI to fill medication (rx)"
  );
  if (btn) btn.click();
});
await settle(1800);

// 06 — Medication module with mic ACTIVE
await shot("06-medication-mic-active", () => {
  const m = document.querySelector('[data-rxpad-module="medication"]');
  if (!m) return null;
  const r = m.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

// Cancel module recorder
await page.evaluate(() => {
  const cancel = Array.from(document.querySelectorAll("button")).find(
    (b) => b.getAttribute("aria-label") === "Cancel"
  );
  if (cancel) cancel.click();
});
await settle(800);

// 07 — Trigger double-shift VoiceBar
await page.evaluate(() => {
  const fire = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
  fire(); setTimeout(fire, 150);
});
await settle(2000);

await shot("07-voicebar-double-shift", () => {
  const region = document.querySelector('[aria-label="Voice dictation bar"]');
  if (!region) return null;
  const bar = region.querySelector('[role="dialog"]') || region.children[1] || region;
  const r = bar.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

// 08 — Full canvas wide shot (entire VoiceRx ecosystem inside EMR)
await page.keyboard.press("Escape");
await settle(800);
await shot("08-full-canvas", () => ({
  x: 0, y: 0, width: window.innerWidth, height: window.innerHeight
}));

// 09 — Past Visit panel sidebar
await shot("09-past-visit", () => {
  const el = Array.from(document.querySelectorAll('h3,h2,h1')).find((h) => h.textContent.trim() === "Past Visit");
  if (!el) return null;
  let p = el;
  for (let i = 0; i < 6 && p; i++) {
    const r = p.getBoundingClientRect();
    if (r.width > 240 && r.height > 380) return { x: r.x, y: r.y, width: r.width, height: r.height };
    p = p.parentElement;
  }
  return null;
});

await browser.close();
console.log("\n✓ All live demo captures done");
