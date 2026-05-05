// Iconsax proxy — returns one icon match for a custom-module name.
//
// The Iconsax MCP (`https://app.iconsax.io/api/mcp`) responds in
// markdown-formatted text rather than structured JSON. This route
// hides that detail from the client and exposes:
//
//   POST /api/iconsax-icon
//     body: { query: string, mode?: "auto" | "search" }
//
//     mode=auto    (default) — returns the single best match as
//                  { name, style, svg } (or null fields if no match).
//     mode=search  — returns up to 12 candidates as
//                  { results: [{ name, style, svg }] } so the editor's
//                  override picker can render a grid.
//
// The bearer key lives in ICONSAX_API_KEY (.env.local, gitignored) and
// is never sent to the browser.

import { NextResponse } from "next/server"

const MCP_URL = "https://app.iconsax.io/api/mcp"

// Iconsax doesn't ship a "diet plan" icon, but it does have "food",
// "exercise", "lab" etc. The keyword map below is a best-effort hint
// from medical-module words to concrete Iconsax-friendly queries.
// Match is a case-insensitive substring against any STEM in the list,
// so "vaccination" matches the "vaccin" stem.
type Rewrite = { stems: string[]; queries: string[] }
const QUERY_REWRITES: Rewrite[] = [
  { stems: ["diet", "nutri", "food", "meal"], queries: ["food", "apple", "leaf"] },
  { stems: ["exercise", "workout", "fitness", "gym"], queries: ["activity", "heart"] },
  { stems: ["sleep", "rest"], queries: ["moon", "cloud"] },
  { stems: ["blood", "pressure", "cardio", "heart"], queries: ["heart", "pulse"] },
  { stems: ["lab", "investigation", "sample", "test"], queries: ["test", "flask", "lab"] },
  { stems: ["vital", "temperature", "fever"], queries: ["heart", "thermometer"] },
  { stems: ["med", "drug", "tablet", "prescription"], queries: ["pill", "tablets"] },
  { stems: ["note", "comment", "remark"], queries: ["note", "document"] },
  { stems: ["plan", "schedule", "calendar", "followup", "follow-up"], queries: ["calendar", "clock"] },
  { stems: ["vaccin", "injection", "immun"], queries: ["syringe", "shield"] },
  { stems: ["eye", "vision", "optical"], queries: ["eye"] },
  { stems: ["tooth", "dental"], queries: ["tooth"] },
  { stems: ["surg", "operation", "procedure"], queries: ["scissor", "knife"] },
]

type IconResult = { name: string; style: string; svg: string | null }

async function callMcp<T>(method: string, params?: unknown): Promise<T> {
  const apiKey = process.env.ICONSAX_API_KEY
  if (!apiKey) throw new Error("ICONSAX_API_KEY is not set")

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e9),
      method,
      params,
    }),
    // Don't cache — the rate-limit per minute is what matters.
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as { result?: T; error?: unknown }
  if (json.error) {
    throw new Error(`MCP error: ${JSON.stringify(json.error).slice(0, 200)}`)
  }
  if (!json.result) throw new Error("MCP empty result")
  return json.result
}

// MCP search responses look like:
//
//   ✅ **3 icons found**
//
//   📦 **bottle-and-glass** [bulk] — food
//
//   📦 **bottle** [bulk] — food
//
//   ...with optional ```svg ... ``` blocks per icon when include_svg=true.
//
// This parser pulls (name, style) tuples out of the markdown and the
// matching SVG block (if present) when include_svg was set.
function parseSearchText(text: string): IconResult[] {
  const out: IconResult[] = []
  // Capture each `📦 **name** [style] — category` block, plus any
  // immediately-following ```svg ...``` block before the next 📦.
  const blockRe = /📦\s+\*\*([\w-]+)\*\*\s*\[(\w+)\][^\n]*(?:\n+```svg\s*([\s\S]*?)```)?/g
  let match: RegExpExecArray | null
  while ((match = blockRe.exec(text)) !== null) {
    const [, name, style, svg] = match
    out.push({ name, style, svg: svg?.trim() || null })
  }
  return out
}

async function searchIconsax(query: string, opts: { limit: number; includeSvg: boolean }): Promise<IconResult[]> {
  const args = {
    query,
    limit: opts.limit,
    include_svg: opts.includeSvg,
    style: "bulk" as const,
  }
  // Try Pro first (key has access to 50k+ Pro icons). On miss, fall
  // back to the free catalogue so we don't whiff just because the term
  // isn't in Pro.
  const tryCalls: Array<"search_pro_icons" | "search_icons"> = ["search_pro_icons", "search_icons"]
  for (const tool of tryCalls) {
    try {
      const result = await callMcp<{ content: Array<{ type: string; text: string }> }>("tools/call", {
        name: tool,
        arguments: args,
      })
      const text = result.content?.find((c) => c.type === "text")?.text ?? ""
      const parsed = parseSearchText(text)
      if (parsed.length) return parsed
    } catch {
      // Try next tool / next rewrite.
    }
  }
  return []
}

async function autoMatch(rawQuery: string): Promise<IconResult | null> {
  const cleaned = rawQuery.trim().toLowerCase()
  if (!cleaned) return null

  // Build the list of queries to try, in order:
  //   1. The full module name (e.g. "diet plan")
  //   2. Each significant word individually (e.g. "diet", "plan")
  //   3. Rewrites pulled from QUERY_REWRITES.
  const tried = new Set<string>()
  const queries: string[] = []
  function push(q: string) {
    const k = q.trim().toLowerCase()
    if (!k || tried.has(k)) return
    tried.add(k)
    queries.push(k)
  }

  // Order matters: most-specific first, curated rewrites next, raw
  // single-word fallback last. The fallback often produces wrong
  // matches ("plan" → "air-plane") so we let the rewrite map win when
  // a known medical keyword is in the name.
  push(cleaned)
  for (const rewrite of QUERY_REWRITES) {
    if (rewrite.stems.some((stem) => cleaned.includes(stem))) {
      for (const q of rewrite.queries) push(q)
    }
  }
  for (const word of cleaned.split(/\s+/)) {
    if (word.length >= 3) push(word)
  }

  for (const q of queries) {
    const hits = await searchIconsax(q, { limit: 1, includeSvg: true })
    if (hits[0]) return hits[0]
  }
  return null
}

// ── HTTP handler ─────────────────────────────────────────────────────────

export const runtime = "nodejs"

export async function POST(req: Request) {
  let body: { query?: unknown; mode?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const query = typeof body.query === "string" ? body.query.trim() : ""
  if (!query) {
    return NextResponse.json({ error: "Missing 'query'" }, { status: 400 })
  }

  if (!process.env.ICONSAX_API_KEY) {
    return NextResponse.json(
      { error: "ICONSAX_API_KEY is not configured on the server." },
      { status: 503 },
    )
  }

  const mode = body.mode === "search" ? "search" : "auto"

  try {
    if (mode === "search") {
      const results = await searchIconsax(query, { limit: 12, includeSvg: true })
      return NextResponse.json({ results })
    }
    const match = await autoMatch(query)
    return NextResponse.json({ match })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
