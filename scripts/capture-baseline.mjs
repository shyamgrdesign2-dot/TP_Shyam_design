#!/usr/bin/env node
/**
 * capture-baseline.mjs
 *
 * Launches the Next.js dev server, navigates to every known route,
 * and captures screenshots at two viewports:
 *   • 1920×1080 (desktop)
 *   • 768×1024  (iPad portrait)
 *
 * Screenshots are saved to docs/migration/baseline-screenshots/.
 *
 * Usage:
 *   npm run baseline              (starts dev server automatically)
 *   node scripts/capture-baseline.mjs --url http://localhost:3000
 *                                     (use existing server)
 */

import puppeteer from "puppeteer"
import { mkdirSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const OUT_DIR = resolve(ROOT, "docs/migration/baseline-screenshots")

// ── Routes to capture ──
const ROUTES = [
  "/",
  "/tp-appointment-screen",
  "/invisit",
  "/rxpad",
  "/rxpad/end-visit",
  "/patient-details",
  "/print-preview",
  // Design system showcase routes
  "/foundations/colors",
  "/foundations/typography",
  "/foundations/spacing",
  "/foundations/shadows",
  "/foundations/icons",
  "/components/buttons",
  "/components/inputs",
  "/components/cards",
  "/components/dialogs",
  "/components/tables",
  "/components/navigation",
  "/components/feedback",
  "/components/data-display",
]

// ── Viewports ──
const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "ipad",    width: 768,  height: 1024 },
]

// ── Helpers ──
function slugify(route) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "--")
}

function parseArgs() {
  const args = process.argv.slice(2)
  const urlIdx = args.indexOf("--url")
  return {
    url: urlIdx >= 0 ? args[urlIdx + 1] : null,
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return true
    } catch { /* server not ready yet */ }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs / 1000}s`)
}

// ── Main ──
async function main() {
  const { url: providedUrl } = parseArgs()
  const BASE_URL = providedUrl || "http://localhost:3000"
  let devServer = null

  // Start dev server if no URL provided
  if (!providedUrl) {
    console.log("🚀 Starting Next.js dev server...")
    devServer = spawn("npm", ["run", "dev"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    })
    devServer.stdout.on("data", () => {}) // drain
    devServer.stderr.on("data", () => {}) // drain
  }

  try {
    console.log(`⏳ Waiting for server at ${BASE_URL}...`)
    await waitForServer(BASE_URL)
    console.log("✅ Server is ready\n")

    // Ensure output directories exist
    for (const vp of VIEWPORTS) {
      mkdirSync(resolve(OUT_DIR, vp.name), { recursive: true })
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    let captured = 0
    let skipped = 0

    for (const vp of VIEWPORTS) {
      console.log(`\n📐 Viewport: ${vp.name} (${vp.width}×${vp.height})`)

      const page = await browser.newPage()
      await page.setViewport({ width: vp.width, height: vp.height })

      for (const route of ROUTES) {
        const slug = slugify(route)
        const filePath = resolve(OUT_DIR, vp.name, `${slug}.png`)
        const url = `${BASE_URL}${route}`

        try {
          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 15_000,
          })
          // Wait an extra beat for animations to settle
          await page.evaluate(() => new Promise(r => setTimeout(r, 500)))

          await page.screenshot({
            path: filePath,
            fullPage: true,
          })
          console.log(`  ✅ ${route} → ${vp.name}/${slug}.png`)
          captured++
        } catch (err) {
          console.log(`  ⚠️  ${route} — skipped (${err.message.slice(0, 60)})`)
          skipped++
        }
      }

      await page.close()
    }

    await browser.close()

    console.log(`\n${"─".repeat(50)}`)
    console.log(`📸 Captured: ${captured} screenshots`)
    if (skipped > 0) console.log(`⚠️  Skipped: ${skipped} routes`)
    console.log(`📁 Output: ${OUT_DIR}`)
    console.log()

  } finally {
    if (devServer) {
      devServer.kill("SIGTERM")
      console.log("🛑 Dev server stopped")
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
