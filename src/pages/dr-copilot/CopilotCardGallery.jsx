import React, { useMemo, useState } from "react";
import { CardRenderer } from "../../components/dr-copilot/cards/CardRenderer";
import { RxPadSyncProvider } from "../../components/dr-copilot/compat/rxpad-sync-context";
import { CATALOG_ENTRIES } from "../../components/dr-copilot/mock/catalog-data";
import "../../components/dr-copilot/ui/tokens.css";
import "../../components/dr-copilot/ui/copilot.css";

/**
 * Dev harness for the ported Dr. Copilot card layer.
 *
 * Renders every entry in the mock catalog through the real CardRenderer, which
 * is the cheapest way to prove two things at once: that the scoped Tailwind
 * build actually produces styles inside #dr-copilot-root, and that each ported
 * card mounts without throwing. Each card is isolated behind an error boundary
 * so one bad card cannot blank the page.
 *
 * Not linked from anywhere in the product. Route: /copilot-cards
 */

class CardBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            border: "1px solid #C8102E",
            borderRadius: 8,
            padding: 12,
            background: "#fff5f5",
            color: "#C8102E",
            fontSize: 12,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
          }}
        >
          {this.props.kind}: {String(this.state.error && this.state.error.message)}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CopilotCardGallery() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = q
      ? CATALOG_ENTRIES.filter(
          (e) => e.kind.includes(q) || e.label.toLowerCase().includes(q)
        )
      : CATALOG_ENTRIES;
    const byCategory = new Map();
    for (const e of entries) {
      if (!byCategory.has(e.categoryName)) byCategory.set(e.categoryName, []);
      byCategory.get(e.categoryName).push(e);
    }
    return [...byCategory.entries()];
  }, [query]);

  const shown = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div id="dr-copilot-root" className="dr-copilot-scope" style={{ background: "#F1F1F5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#171725", margin: 0 }}>
          Velora card gallery
        </h1>
        <p style={{ fontSize: 13, color: "#717179", margin: "4px 0 16px" }}>
          {shown} of {CATALOG_ENTRIES.length} mock cards, rendered through the real CardRenderer.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by kind or label"
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #E4E4EB",
            fontSize: 14,
            marginBottom: 24,
          }}
        />

        <RxPadSyncProvider>
          {groups.map(([categoryName, list]) => (
            <section key={categoryName} style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  color: "#717179",
                  margin: "0 0 12px",
                }}
              >
                {categoryName}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {list.map((entry) => (
                  <div key={entry.kind + entry.label}>
                    <div style={{ fontSize: 11, color: "#A2A2A8", marginBottom: 6, fontFamily: "monospace" }}>
                      {entry.label} · {entry.kind}
                    </div>
                    <CardBoundary kind={entry.kind}>
                      <CardRenderer output={{ kind: entry.kind, data: entry.data }} />
                    </CardBoundary>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </RxPadSyncProvider>
      </div>
    </div>
  );
}
