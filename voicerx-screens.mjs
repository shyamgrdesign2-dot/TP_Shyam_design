import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(20000);

async function shot(name) {
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 90 });
  console.log(`✓ ${name}.jpg`);
}

// 1. Initial RxPad / VoiceRx collapsed
await page.goto('http://localhost:3000/rxpad/voice', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 2000));
await shot('01-rxpad-collapsed');

// 2. Expand VoiceRx → Dr.Agent panel with "Start with Voice"
await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll('*')).find(el => el.textContent.trim() === 'VoiceRx' && el.children.length <= 2);
  if (t) {
    let n = t;
    for (let i = 0; i < 8; i++) {
      if (n.tagName === 'BUTTON' || n.getAttribute?.('role') === 'button') { n.click(); break; }
      n = n.parentElement;
    }
  }
});
await shot('02-voicerx-panel-open');

// 3. Open consultation-mode bottom sheet
try { localStorage; } catch {}
await page.evaluate(() => {
  try { localStorage.removeItem('tp-voicerx-bottomsheet-besttip-v1'); } catch {}
});
await page.evaluate(() => {
  const fab = Array.from(document.querySelectorAll('*')).find(el => el.children.length === 0 && el.textContent.trim() === 'Start with Voice');
  if (fab) fab.parentElement.click();
});
await new Promise(r => setTimeout(r, 1500));
await shot('03-consultation-mode-sheet');

// 4. Pick Conversation Mode and Start → active agent
await page.evaluate(() => {
  const start = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Start conversation');
  if (start) start.click();
});
await new Promise(r => setTimeout(r, 1500));
await shot('04-conversation-mode-active');

// 5. Sidebar History overlay with mic
await page.evaluate(() => {
  const cancel = document.querySelector('button[aria-label="Go back"]');
  if (cancel) cancel.click();
});
await new Promise(r => setTimeout(r, 1000));
await page.evaluate(() => {
  const aside = document.querySelector('aside, [role="complementary"]');
  if (!aside) return;
  const hist = Array.from(aside.querySelectorAll('*')).find(el => el.textContent.trim() === 'History');
  if (hist) hist.click();
});
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Add/Edit Details');
  if (btn) btn.click();
});
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Use Voice AI to fill add/edit details');
  if (btn) btn.click();
});
await shot('05-sidebar-mic-overlay');

// 6. Symptoms module mic (in Rx form)
await page.goto('http://localhost:3000/rxpad/voice', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Use Voice AI to fill symptoms');
  if (btn) btn.click();
});
await new Promise(r => setTimeout(r, 1200));
await shot('06-symptoms-mic-open');

// 7. VoiceBar (double-tap Shift)
await page.goto('http://localhost:3000/rxpad/voice', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => {
  const fire = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
  fire();
  setTimeout(fire, 150);
});
await new Promise(r => setTimeout(r, 1500));
await shot('07-voicebar-open');

// 8. Results canvas (simulate via direct voice flow)
await page.goto('http://localhost:3000/rxpad/voice', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));
await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll('*')).find(el => el.textContent.trim() === 'VoiceRx' && el.children.length <= 2);
  if (t) {
    let n = t;
    for (let i = 0; i < 8; i++) {
      if (n.tagName === 'BUTTON' || n.getAttribute?.('role') === 'button') { n.click(); break; }
      n = n.parentElement;
    }
  }
});
await new Promise(r => setTimeout(r, 1500));
await shot('08-full-canvas-with-panel');

await browser.close();
console.log('Done.');
