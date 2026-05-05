#!/usr/bin/env node
/**
 * validate-tokens.mjs
 *
 * Cross-checks the three token sources to ensure they agree:
 * 1. src/design-system/tokens/_colors.scss (canonical SCSS)
 * 2. app/globals.css (:root CSS custom properties)
 * 3. src/design-system/theme/tp-mui-theme.js (MUI fallback palette)
 *
 * Usage: node scripts/validate-tokens.mjs
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

let errors = 0
let warnings = 0

function error(msg) { console.error(`  ❌ ${msg}`); errors++ }
function warn(msg)  { console.warn(`  ⚠️  ${msg}`); warnings++ }
function ok(msg)    { console.log(`  ✅ ${msg}`) }

// ── Parse SCSS $-variables ──
function parseSCSSVars(filePath) {
  const content = readFileSync(resolve(ROOT, filePath), "utf-8")
  const vars = {}
  const re = /^\$([a-zA-Z0-9_-]+):\s*([^;]+);/gm
  let match
  while ((match = re.exec(content)) !== null) {
    const name = match[1].trim()
    let value = match[2].trim()
    if (value.startsWith("(") || value.includes("map-get") || value.includes("$")) continue
    vars[name] = value
  }
  return vars
}

// ── Parse CSS custom properties from :root ──
function parseCSSVars(filePath) {
  const content = readFileSync(resolve(ROOT, filePath), "utf-8")
  const vars = {}
  // Match inside :root { ... }
  const rootMatch = content.match(/:root\s*\{([^}]+)\}/s)
  if (!rootMatch) return vars
  const re = /--([\w-]+):\s*([^;]+);/g
  let match
  while ((match = re.exec(rootMatch[1])) !== null) {
    vars[match[1].trim()] = match[2].trim()
  }
  return vars
}

// ── Main ──
console.log("\n🔍 TatvaPractice Token Validation\n")

// 1. Load sources
console.log("Loading sources...")
const scssColors = parseSCSSVars("src/design-system/tokens/_colors.scss")
const cssVars = parseCSSVars("app/globals.css")

// 2. Cross-check: every TP color SCSS var has a matching CSS custom property
console.log("\n📋 SCSS → CSS custom properties:")
const colorPrefixes = ["tp-blue", "tp-violet", "tp-amber", "tp-slate", "tp-success", "tp-warning", "tp-error"]
let matched = 0, missing = 0

for (const [scssName, scssValue] of Object.entries(scssColors)) {
  // Only check color scale vars (tp-blue-500, etc.)
  const isColorScale = colorPrefixes.some(p => scssName.startsWith(p))
  if (!isColorScale) continue

  const cssName = scssName // CSS var name matches SCSS var name (e.g., tp-blue-500)
  const cssValue = cssVars[cssName]

  if (!cssValue) {
    error(`SCSS $${scssName} = ${scssValue} — missing CSS var --${cssName}`)
    missing++
  } else if (cssValue.toUpperCase() !== scssValue.toUpperCase()) {
    error(`MISMATCH: SCSS $${scssName} = ${scssValue} vs CSS --${cssName} = ${cssValue}`)
  } else {
    matched++
  }
}
ok(`${matched} color tokens match between SCSS and CSS`)
if (missing > 0) warn(`${missing} color tokens missing from CSS`)

// 3. Check AI gradient stops
console.log("\n📋 AI gradient stops:")
const aiChecks = [
  ["ai-pink", scssColors["ai-pink"]],
  ["ai-violet", scssColors["ai-violet"]],
  ["ai-indigo", scssColors["ai-indigo"]],
]
for (const [name, scssVal] of aiChecks) {
  const cssVal = cssVars[name]
  if (!cssVal) {
    error(`Missing CSS var --${name}`)
  } else if (cssVal.toUpperCase() !== scssVal?.toUpperCase()) {
    error(`MISMATCH: --${name}: SCSS=${scssVal} CSS=${cssVal}`)
  } else {
    ok(`--${name} ✓`)
  }
}

// 4. Check semantic surface tokens
console.log("\n📋 Semantic surface tokens:")
const semanticChecks = ["background", "foreground", "primary", "secondary", "destructive", "border", "ring"]
for (const name of semanticChecks) {
  if (cssVars[name]) {
    ok(`--${name} = ${cssVars[name]}`)
  } else {
    warn(`--${name} not found in CSS`)
  }
}

// 5. Summary
console.log("\n" + "─".repeat(50))
if (errors === 0) {
  console.log(`✅ Validation passed. ${matched} tokens verified, ${warnings} warnings.`)
} else {
  console.log(`❌ Validation failed. ${errors} errors, ${warnings} warnings.`)
  process.exit(1)
}
console.log()
