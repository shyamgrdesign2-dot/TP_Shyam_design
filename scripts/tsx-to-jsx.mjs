#!/usr/bin/env node
/**
 * Phase 12 — TSX → JSX codemod
 *
 * Strips TypeScript type annotations from every .tsx / .ts file
 * (except app/api/** and *.d.ts) then renames:
 *   .tsx → .jsx
 *   .ts  → .js  (non-declaration)
 *
 * Uses @babel/preset-typescript via @babel/core.
 * Run: node scripts/tsx-to-jsx.mjs [--dry-run]
 */

import { transformSync } from "@babel/core"
import { readFileSync, writeFileSync, renameSync, readdirSync, statSync } from "fs"
import { join, extname, relative, dirname } from "path"
import { fileURLToPath } from "url"

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "")
const DRY = process.argv.includes("--dry-run")

// ── Exclusions ────────────────────────────────────────────────────────────────
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.claude/,
  /\.d\.ts$/,
  /next-env\.d\.ts$/,
  // Keep API routes as TS (they use Next.js typed request/response objects)
  /^app\/api\//,
  // Keep scripts themselves
  /^scripts\//,
]

function shouldSkip(relPath) {
  return SKIP_PATTERNS.some((re) => re.test(relPath))
}

// ── Babel config ──────────────────────────────────────────────────────────────
function babelConfig(isJSX) {
  return {
    presets: [
      ["@babel/preset-typescript", {
        // Keep JSX tokens — next pass handles JSX
        allExtensions: true,
        isTSX: isJSX,
        // Don't remove class field declarations (needed for Next.js)
        allowDeclareFields: true,
      }],
    ],
    plugins: [],
    // Preserve formatting as much as possible
    generatorOpts: {
      retainLines: true,
    },
    // Don't add source map comments
    sourceMaps: false,
    // Treat as module
    sourceType: "module",
  }
}

// ── File collector ─────────────────────────────────────────────────────────────
function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    if (shouldSkip(rel)) continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      collectFiles(full, files)
    } else {
      const ext = extname(entry)
      if (ext === ".tsx" || ext === ".ts") {
        files.push({ full, rel, ext })
      }
    }
  }
  return files
}

// ── Transform one file ─────────────────────────────────────────────────────────
function transformFile({ full, rel, ext }) {
  const source = readFileSync(full, "utf8")
  const isJSX = ext === ".tsx"

  let output
  try {
    const result = transformSync(source, {
      ...babelConfig(isJSX),
      filename: full,
    })
    output = result.code
  } catch (err) {
    console.error(`  ✗ TRANSFORM ERROR: ${rel}`)
    console.error(`    ${err.message}`)
    return false
  }

  const newExt = isJSX ? ".jsx" : ".js"
  const newFull = full.replace(new RegExp(`\\${ext}$`), newExt)
  const newRel = rel.replace(new RegExp(`\\${ext}$`), newExt)

  if (DRY) {
    console.log(`  [dry] ${rel} → ${newRel}`)
    return true
  }

  // Write transformed content to new extension
  writeFileSync(newFull, output, "utf8")
  // Delete original
  if (newFull !== full) {
    import("fs").then(({ unlinkSync }) => unlinkSync(full))
  }

  return true
}

// ── Main ──────────────────────────────────────────────────────────────────────
const files = collectFiles(ROOT)
console.log(`Found ${files.length} TS/TSX files to transform (DRY=${DRY})`)

let ok = 0, fail = 0
for (const f of files) {
  const success = transformFile(f)
  if (success) ok++
  else fail++
}

console.log(`\nDone: ${ok} transformed, ${fail} failed`)
if (fail > 0) process.exit(1)
