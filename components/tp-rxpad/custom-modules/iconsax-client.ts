// Client-side helper for the /api/iconsax-icon proxy. Keeps the bearer
// key on the server — the browser only sees module-name → icon results.

export type IconsaxResult = {
  name: string
  style: string
  svg: string | null
}

export async function autoMatchIcon(query: string): Promise<IconsaxResult | null> {
  if (typeof window === "undefined") return null
  const trimmed = query.trim()
  if (!trimmed) return null
  try {
    const res = await fetch("/api/iconsax-icon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, mode: "auto" }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { match?: IconsaxResult | null }
    return json.match ?? null
  } catch {
    return null
  }
}

export async function searchIcons(query: string): Promise<IconsaxResult[]> {
  if (typeof window === "undefined") return []
  const trimmed = query.trim()
  if (!trimmed) return []
  try {
    const res = await fetch("/api/iconsax-icon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, mode: "search" }),
    })
    if (!res.ok) return []
    const json = (await res.json()) as { results?: IconsaxResult[] }
    return Array.isArray(json.results) ? json.results : []
  } catch {
    return []
  }
}
