#!/usr/bin/env node
/**
 * diff-screenshots.mjs
 *
 * Compares current screenshots against the baseline and generates
 * visual diff images + a summary report.
 *
 * Usage:
 *   npm run diff:visual                          (capture fresh + diff)
 *   node scripts/diff-screenshots.mjs --current docs/migration/current-screenshots
 *
 * Workflow:
 *   1. Captures fresh screenshots to a temp dir (or reads --current)
 *   2. Compares each against the baseline in docs/migration/baseline-screenshots/
 *   3. Writes diff images + report to docs/migration/diff-output/
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs"
import { resolve, dirname, basename, join } from "path"
import { fileURLToPath } from "url"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const BASELINE_DIR = resolve(ROOT, "docs/migration/baseline-screenshots")
const DIFF_DIR = resolve(ROOT, "docs/migration/diff-output")

function parseArgs() {
  const args = process.argv.slice(2)
  const currentIdx = args.indexOf("--current")
  return {
    currentDir: currentIdx >= 0 ? resolve(args[currentIdx + 1]) : null,
    threshold: 0.1,  // pixelmatch threshold (0 = exact, 1 = anything matches)
  }
}

function comparePNGs(img1Path, img2Path, diffPath, threshold) {
  const img1 = PNG.sync.read(readFileSync(img1Path))
  const img2 = PNG.sync.read(readFileSync(img2Path))

  // Handle size mismatches by using the larger dimensions
  const width = Math.max(img1.width, img2.width)
  const height = Math.max(img1.height, img2.height)

  // Resize to match if needed (pad with transparent)
  function padImage(img, w, h) {
    if (img.width === w && img.height === h) return img.data
    const padded = Buffer.alloc(w * h * 4, 0)
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const srcIdx = (y * img.width + x) * 4
        const dstIdx = (y * w + x) * 4
        padded[dstIdx] = img.data[srcIdx]
        padded[dstIdx + 1] = img.data[srcIdx + 1]
        padded[dstIdx + 2] = img.data[srcIdx + 2]
        padded[dstIdx + 3] = img.data[srcIdx + 3]
      }
    }
    return padded
  }

  const data1 = padImage(img1, width, height)
  const data2 = padImage(img2, width, height)
  const diff = new PNG({ width, height })

  const numDiffPixels = pixelmatch(data1, data2, diff.data, width, height, {
    threshold,
    alpha: 0.3,
    diffColor: [255, 0, 0],
    diffColorAlt: [0, 255, 0],
  })

  writeFileSync(diffPath, PNG.sync.write(diff))

  const totalPixels = width * height
  const diffPercent = ((numDiffPixels / totalPixels) * 100).toFixed(3)

  return {
    diffPixels: numDiffPixels,
    totalPixels,
    diffPercent: parseFloat(diffPercent),
    sizeMismatch: img1.width !== img2.width || img1.height !== img2.height,
  }
}

// ── Main ──
function main() {
  const { currentDir, threshold } = parseArgs()

  if (!currentDir) {
    console.log("Usage: node scripts/diff-screenshots.mjs --current <dir>")
    console.log("  or:  npm run diff:visual  (captures fresh screenshots first)")
    process.exit(1)
  }

  if (!existsSync(BASELINE_DIR)) {
    console.error("❌ No baseline found at", BASELINE_DIR)
    console.error("   Run `npm run baseline` first to capture the baseline.")
    process.exit(1)
  }

  mkdirSync(DIFF_DIR, { recursive: true })

  const viewports = readdirSync(BASELINE_DIR).filter(d =>
    existsSync(join(BASELINE_DIR, d)) && readdirSync(join(BASELINE_DIR, d)).length > 0
  )

  const results = []
  let totalDiff = 0, totalFiles = 0, passCount = 0, failCount = 0

  for (const vp of viewports) {
    const baselineVpDir = join(BASELINE_DIR, vp)
    const currentVpDir = join(currentDir, vp)
    const diffVpDir = join(DIFF_DIR, vp)
    mkdirSync(diffVpDir, { recursive: true })

    if (!existsSync(currentVpDir)) {
      console.log(`⚠️  No current screenshots for viewport "${vp}", skipping`)
      continue
    }

    const baselineFiles = readdirSync(baselineVpDir).filter(f => f.endsWith(".png"))

    for (const file of baselineFiles) {
      const baselinePath = join(baselineVpDir, file)
      const currentPath = join(currentVpDir, file)
      const diffPath = join(diffVpDir, `diff-${file}`)

      if (!existsSync(currentPath)) {
        results.push({ viewport: vp, file, status: "MISSING", diffPercent: 100 })
        failCount++
        totalFiles++
        continue
      }

      try {
        const result = comparePNGs(baselinePath, currentPath, diffPath, threshold)
        const status = result.diffPercent === 0 ? "PASS" : result.diffPercent < 0.1 ? "WARN" : "FAIL"

        results.push({
          viewport: vp,
          file,
          status,
          diffPercent: result.diffPercent,
          diffPixels: result.diffPixels,
          sizeMismatch: result.sizeMismatch,
        })

        if (status === "PASS") passCount++
        else failCount++

        totalDiff += result.diffPercent
        totalFiles++
      } catch (err) {
        results.push({ viewport: vp, file, status: "ERROR", error: err.message })
        failCount++
        totalFiles++
      }
    }
  }

  // ── Report ──
  console.log("\n🔍 Visual Diff Report\n")
  console.log(`${"Viewport".padEnd(10)} ${"Route".padEnd(30)} ${"Status".padEnd(8)} Diff%`)
  console.log("─".repeat(65))

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️ " : "❌"
    console.log(`${r.viewport.padEnd(10)} ${r.file.padEnd(30)} ${icon.padEnd(8)} ${r.diffPercent ?? "N/A"}%`)
  }

  console.log("─".repeat(65))
  console.log(`\nTotal: ${totalFiles} comparisons | ✅ ${passCount} pass | ❌ ${failCount} fail`)
  console.log(`Diff output: ${DIFF_DIR}\n`)

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: totalFiles, pass: passCount, fail: failCount },
    results,
  }
  writeFileSync(join(DIFF_DIR, "report.json"), JSON.stringify(report, null, 2))

  if (failCount > 0) process.exit(1)
}

main()
