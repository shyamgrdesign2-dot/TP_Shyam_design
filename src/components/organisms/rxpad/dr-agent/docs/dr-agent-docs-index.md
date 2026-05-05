# Dr.Agent — documentation index

> **Scope:** the spec set for the **Dr.Agent AI brand panel** that renders inside the RxPad consultation experience.
> **Audience:** product managers + designers (card vocabulary, intents, patient-summary spec, demo script), frontend devs (anatomy + render pipeline + sizing rules), backend / AI engineers (intent classifier, response management, summary generation contract), AI assistants (must read before proposing changes to any card, intent, or AI behaviour).
> **Read when:** designing or building any AI surface in the RxPad panel, tuning when cards appear, adding intents or canned messages, or running a stakeholder demo.
> **Where this lives in code:** `src/components/organisms/rxpad/dr-agent/`. Subsystem overview: [`../../rxpad-subsystem.md`](../../rxpad-subsystem.md).

Fifteen documents, each scoped to one slice of the system. Read them
in the order below when on-boarding; otherwise jump to the doc that
matches your task.

## Where Dr.Agent lives in the code

`src/components/organisms/rxpad/dr-agent/` — the panel, card engine,
chat surface, intent classifier, response orchestration. Mounted by
`TPRxPadShell` inside every consultation flow. Subsystem overview:
[`../../rxpad-subsystem.md`](../../rxpad-subsystem.md).

---

## Read in this order (on-boarding)

| # | Doc | What you learn |
|---|---|---|
| 1 | [`dr-agent-overview.md`](./dr-agent-overview.md) | What Dr.Agent *is* — product framing, audience, the role it plays inside a consultation. **Start here.** |
| 2 | [`dr-agent-v0-spec.md`](./dr-agent-v0-spec.md) | The simplified V0 variant — what shipped first vs. what the full system aspires to. |
| 3 | [`00-sizing-rules.md`](./00-sizing-rules.md) | Pixel-level visual contract for everything in the panel. **Read before writing any component, card, button, badge.** |
| 4 | [`02-card-architecture-and-anatomy.md`](./02-card-architecture-and-anatomy.md) | How a card is built — params, slots, render pipeline. |
| 5 | [`card-catalog-and-categories.md`](./card-catalog-and-categories.md) | The card taxonomy — categories + when each kind is used. |
| 6 | [`03-card-catalog-detailed.md`](./03-card-catalog-detailed.md) | Every card: trigger, contents, variations. The reference catalogue. |
| 7 | [`card-data-structuring.md`](./card-data-structuring.md) | What data drives each card and how the fallback states cascade. |
| 8 | [`01-response-management-system.md`](./01-response-management-system.md) | How the agent decides what to show, when, and in what format. |
| 9 | [`intent-classifier-and-canned-messages.md`](./intent-classifier-and-canned-messages.md) | Intent classification + canned-message playbook. |
| 10 | [`04-interaction-logic-and-scenarios.md`](./04-interaction-logic-and-scenarios.md) | Pills, consultation flow, and how the agent adapts per scenario. |
| 11 | [`ux-interaction-patterns.md`](./ux-interaction-patterns.md) | Interaction patterns shared across cards (gestures, focus, dismissals). |
| 12 | [`sbar-overview-card-spec.md`](./sbar-overview-card-spec.md) | Full spec for the SBAR overview card (the consultation-summary surface). |
| 13 | [`patient-summary-generation-spec.md`](./patient-summary-generation-spec.md) | End-to-end spec for the patient summary agent. |
| 14 | [`patient-summary-permutations.md`](./patient-summary-permutations.md) | Data permutations for the patient summary. |
| 15 | [`demo-flow-guide.md`](./demo-flow-guide.md) | Demo script — the story to walk a stakeholder through the experience. |

---

## Jump-by-task

| If you're… | Read |
|---|---|
| Onboarding to Dr.Agent | `dr-agent-overview.md` → `dr-agent-v0-spec.md` |
| Building a new card | `00-sizing-rules.md` + `02-card-architecture-and-anatomy.md` + `03-card-catalog-detailed.md` |
| Wiring data into cards | `card-data-structuring.md` |
| Tuning when a card appears | `01-response-management-system.md` + `04-interaction-logic-and-scenarios.md` |
| Adding intents / canned replies | `intent-classifier-and-canned-messages.md` |
| Working on the SBAR card | `sbar-overview-card-spec.md` |
| Working on patient summary | `patient-summary-generation-spec.md` + `patient-summary-permutations.md` |
| Walking a stakeholder through the demo | `demo-flow-guide.md` |

---

## Cross-references

- [`../../rxpad-subsystem.md`](../../rxpad-subsystem.md) — RxPad subsystem overview (Dr.Agent is one of its surfaces).
- [`../../../voicerx/voicerx-subsystem.md`](../../../voicerx/voicerx-subsystem.md) — voice subsystem; Dr.Agent consumes voice signals.
- [`../../rxpad-sync-context.jsx`](../../rxpad-sync-context.jsx) — the data bus Dr.Agent uses to publish AI signals + copy to the Rx form.
- `../../../../../../design.md` — overall visual contract (sizing rules in `00-sizing-rules.md` extend it).
