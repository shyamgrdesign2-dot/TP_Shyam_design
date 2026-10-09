import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { listCopilotSessions } from "../chart-search/copilotApi"
import { CopilotIcon } from "../ui/CopilotIcon"
import { isVisibleSession } from "../chart-search/copilotHistoryPrefs"
import { useCopilotPatientPicker } from "./useCopilotPatientPicker"
import { canScopeToMine, useHospitalGroup } from "./copilotScopeStore"

/**
 * The conversations this doctor has had, newest first.
 *
 * The service keeps every completed conversation for 30 days, across both
 * scopes, so a doctor who asked about a patient yesterday can pick it up today
 * rather than starting again. Without this the history exists but is
 * unreachable, which is worse than not having it.
 *
 * Each row says which scope it belongs to, because that is the thing a doctor
 * must not have to guess: a patient's name, or "All hospital patients" for a
 * clinic search. Opening one changes scope, so the label is the promise. The
 * scope is said three ways at once (the glyph, the words, and the order of
 * the row) so that no single one has to carry it: the hospital mark and the
 * person mark are the same two the scope chip uses, so a doctor who has
 * learnt the chip has already learnt this list.
 *
 * Two shapes. In the popup it is a column on the right of the conversation
 * (variant "sidebar"), because there is room for both and covering the thread
 * to show its own history made it feel like a trapdoor. In the narrow sheet
 * there is no room beside, so it lies over the thread with a way back.
 *
 * Both shapes share the panel's floating controls, which the dock pins to the
 * top right of the surface over whatever is there. The header here keeps that
 * corner clear rather than putting a second control under the first: in the
 * popup the history button that opened this column is also what hides it.
 */

/* The dock's controls are absolutely placed 10px from the top and 14px from
   the right, 32px each with a 6px gap: two of them in the popup (history,
   close) and up to three in the sheet. Their centre line is 26px down. The
   header reserves that corner and puts its own buttons and its title line on
   the same 26px line, so the column's top edge reads as one row with them. */
/* Room for the panel's floating controls. The sidebar needs none now: with
   history open, the controls move to the conversation's edge beside it. */
const HEADER_CLEARANCE = { sidebar: "pr-[12px]", overlay: "pr-[132px]" }

/* A restore normally replaces this list within a second. If the list is still
   here after this long, nothing happened, and saying so is kinder than a row
   that spins forever. */
const RESTORE_TIMEOUT_MS = 15000

const DAY_MS = 86400000
const UNDO_MS = 6000

/* ── Time ──────────────────────────────────────────────────────────────────
 *
 * Grouped by day because that is how a doctor remembers a conversation ("the
 * one from yesterday's OPD"), and inside a group the time says only what the
 * heading has not: minutes for the last hour, the clock after that, the
 * weekday earlier in the week, and the date beyond it. The full date and time
 * are always one hover away, so the short label never has to be the only
 * record of when. */

const GROUPS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "Earlier this week" },
  { key: "older", label: "Older" },
]

function dayEdges(nowMs) {
  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const startToday = today.getTime()
  /* Weeks start on Monday here, as they do on an Indian OPD roster. On a
     Monday or Tuesday the "earlier this week" group is simply empty. */
  const sinceMonday = (today.getDay() + 6) % 7
  return {
    startToday,
    startYesterday: startToday - DAY_MS,
    startWeek: startToday - sinceMonday * DAY_MS,
  }
}

function groupOf(ms, edges) {
  if (ms >= edges.startToday) return "today"
  if (ms >= edges.startYesterday) return "yesterday"
  if (ms >= edges.startWeek) return "week"
  return "older"
}

function safeFormat(ms, options) {
  try {
    return new Date(ms).toLocaleString("en-IN", options)
  } catch (e) {
    return ""
  }
}

const CLOCK = { hour: "numeric", minute: "2-digit", hour12: true }

/* "Today, 9 Oct" / "Yesterday, 8 Oct": the line under the question. */
function dayLine(ms, nowMs) {
  if (!ms) return ""
  const d = new Date(ms)
  const today = new Date(nowMs)
  const yest = new Date(nowMs - 86400000)
  const date = safeFormat(ms, { day: "numeric", month: "short" })
  if (d.toDateString() === today.toDateString()) return `Today, ${date}`
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${date}`
  return safeFormat(ms, { weekday: "short", day: "numeric", month: "short" })
}

function fullTime(ms) {
  if (!ms) return ""
  return safeFormat(ms, { weekday: "long", day: "numeric", month: "long", year: "numeric", ...CLOCK })
}

/* The preview is the doctor's own first question, as typed. Runs of spaces
   and line breaks pasted in from elsewhere are folded so a row never shows a
   hole in the middle of a sentence; nothing else about it is changed. */
function cleanPreview(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
}

function mergeRows(existing, incoming) {
  const seen = new Set(existing.map((r) => r.session_id))
  return existing.concat(incoming.filter((r) => r && r.session_id && !seen.has(r.session_id)))
}

/* ── Small parts ───────────────────────────────────────────────────────── */

/* A ring, not an icon: there is no spinner in the icon set, and this is a
   bordered circle rather than a drawn glyph. Stops turning under reduced
   motion and still reads as "working" from the words beside it. */
function Spinner({ tone = "violet" }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-block h-[12px] w-[12px] shrink-0 animate-spin rounded-full border-[1.5px] motion-reduce:animate-none",
        tone === "slate" ? "border-tp-slate-200 border-t-tp-slate-500" : "border-tp-violet-200 border-t-tp-violet-600",
      ].join(" ")}
    />
  )
}

/* Same 30px rounded tile as the scope picker's rows. Linear by default, bulk
   only on the conversation that is open now, which is the system's rule for
   icons and also the quickest way to find "where am I" in a long list. */
function ScopeMark({ clinic, active }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "mt-[1px] flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] transition-colors duration-[var(--copilot-dur-state)]",
        active ? "bg-tp-blue-100 text-tp-blue-600" : "bg-tp-slate-100 text-tp-slate-500",
      ].join(" ")}
    >
      {clinic ? (
        <CopilotIcon asset="medical/hospital-building-4" variant="bulk" size={15} />
      ) : (
        <CopilotIcon asset="users/user" variant="bulk" size={15} />
      )}
    </span>
  )
}

/* The resting shape of the list while it loads: rows of the same height and
   rhythm as the real ones, so nothing jumps when they arrive. Widths vary so
   it reads as text to come rather than as a grid of grey bars. */
const SKELETON_ROWS = [
  [46, 88, 62],
  [58, 80, 0],
  [40, 92, 54],
  [52, 76, 0],
  [44, 84, 48],
  [60, 70, 0],
]

function SkeletonList() {
  return (
    <div role="status" aria-live="polite" className="px-[8px] pt-[10px]">
      <span className="sr-only">Loading your recent conversations</span>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="mx-[10px] mb-[8px] mt-[4px] h-[9px] w-[52px] rounded-[4px] bg-tp-slate-200" />
        {SKELETON_ROWS.map(([title, line1, line2], i) => (
          <div key={i} className="flex gap-[10px] px-[10px] py-[9px]">
            <div className="h-[30px] w-[30px] shrink-0 rounded-[10px] bg-tp-slate-100" />
            <div className="flex min-w-0 flex-1 flex-col gap-[7px] pt-[3px]">
              <div className="flex items-center justify-between gap-[10px]">
                <div className="h-[10px] rounded-[4px] bg-tp-slate-200" style={{ width: `${title}%` }} />
                <div className="h-[8px] w-[38px] rounded-[4px] bg-tp-slate-100" />
              </div>
              <div className="h-[9px] rounded-[4px] bg-tp-slate-100" style={{ width: `${line1}%` }} />
              {line2 > 0 && <div className="h-[9px] rounded-[4px] bg-tp-slate-100" style={{ width: `${line2}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Empty and error share one shape on purpose: a mark, one line that names
   the situation, one or two that say what to do, and at most one action. */
function StatePanel({ icon, tone, title, children, action }) {
  return (
    <div className="copilot-recent-in flex flex-col items-center px-[24px] pb-[24px] pt-[40px] text-center">
      <span
        aria-hidden="true"
        className={[
          "mb-[12px] flex h-[44px] w-[44px] items-center justify-center rounded-[12px]",
          tone === "error" ? "bg-tp-error-50 text-tp-error-500" : "bg-tp-violet-50 text-tp-violet-500",
        ].join(" ")}
      >
        <CopilotIcon name={icon} variant="bulk" size={22} />
      </span>
      <p className="text-[13.5px] font-semibold leading-[18px] text-tp-slate-800">{title}</p>
      <div className="mt-[6px] max-w-[260px] text-[12.5px] leading-[18px] text-tp-slate-500">{children}</div>
      {action}
    </div>
  )
}

const SECONDARY_BUTTON =
  "inline-flex h-[32px] items-center justify-center gap-[6px] rounded-[10px] border-[1px] border-tp-slate-200 bg-tp-slate-0 px-[12px] text-[12.5px] font-semibold text-tp-slate-700 transition-colors duration-[var(--copilot-dur-state)] hover:border-tp-slate-300 hover:bg-tp-slate-50 hover:text-tp-slate-900 active:bg-tp-slate-100 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"

/* ── New chat ──────────────────────────────────────────────────────────── */

/* Who to talk about: rises from the bottom of the sidebar and covers it,
   so starting a chat never leaves the column the doctor is working in.
   Picking a patient who already has a chat today opens that chat, history
   and all; anyone else starts fresh. */
function NewChatSheet({ onClose, onStart, existing, onOpenExisting }) {
  const [search, setSearch] = useState("")
  const picker = useCopilotPatientPicker({ enabled: true, search })
  const inputRef = useRef(null)
  const group = useHospitalGroup()
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus({ preventScroll: true })
    /* Captured and stopped: Escape closes this sheet only, not Velora. */
    const onKey = (e) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])
  const q = search.trim()
  const rows = picker.rows || []
  const scopes = [
    ...(canScopeToMine() ? [{ group: "mine", label: "All my patients", note: "The patients you have treated", asset: "users/profile-2user" }] : []),
    { group: "all", label: "All hospital patients", note: "Every patient in the hospital", asset: "medical/hospital-building-4" },
  ]
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} className="copilot-sheet-backdrop absolute inset-0 z-[20] bg-[rgba(15,23,42,0.18)]" />
      <div role="dialog" aria-label="Start a new conversation" className="copilot-sheet-up absolute inset-x-0 bottom-0 z-[21] h-[60%] flex flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_-12px_32px_-12px_rgba(15,23,42,0.3)]">
        <span aria-hidden="true" className="mx-auto mt-[8px] h-[4px] w-[34px] shrink-0 rounded-full bg-tp-slate-300" />
        <div className="flex shrink-0 items-start gap-[8px] px-[16px] pb-[8px] pt-[8px]">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-semibold leading-[20px] text-tp-slate-900">New conversation</p>
            <p className="m-0 text-[12px] leading-[17px] text-tp-slate-500">Select a patient to start a new conversation.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-500 hover:bg-tp-slate-100">
            <CopilotIcon name="close-square" variant="bold" size={18} />
          </button>
        </div>
        <div className="shrink-0 px-[12px] pb-[8px]">
          <label className="copilot-context-search flex h-[36px] items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-200 bg-white px-[10px]">
            <span className="flex shrink-0 items-center text-tp-slate-500">
              <CopilotIcon name="search-normal" variant="linear" size={15} />
            </span>
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Patient name, patient ID or mobile number"
              aria-label="Search for a patient"
              className="h-full w-full min-w-0 bg-transparent text-[12.5px] text-tp-slate-800 outline-none placeholder:text-tp-slate-400"
            />
            {picker.searching && (
              <span aria-hidden="true" className="h-[12px] w-[12px] shrink-0 animate-spin rounded-full border-[1.5px] border-tp-slate-200 border-t-tp-violet-500 motion-reduce:animate-none" />
            )}
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[8px] pb-[12px]">
          {!q && (
            <>
              {scopes.map((sc) => (
                <button
                  key={sc.group}
                  type="button"
                  onClick={() => onStart({ kind: "scope", group: sc.group })}
                  className="flex w-full items-center gap-[10px] rounded-[10px] px-[8px] py-[8px] text-left transition-colors hover:bg-tp-slate-50"
                >
                  <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-tp-slate-100 text-tp-slate-600">
                    <CopilotIcon asset={sc.asset} variant="bulk" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-[18px] text-tp-slate-800">{sc.label}</span>
                    <span className="block text-[11.5px] leading-[16px] text-tp-slate-500">{sc.note}</span>
                  </span>
                  {sc.group === group && <span className="shrink-0 text-[11px] text-tp-slate-400">Current</span>}
                </button>
              ))}
              <div aria-hidden="true" className="mx-[8px] mt-[8px] h-px bg-tp-slate-200" />
              <p className="m-0 flex items-center gap-[6px] px-[10px] pb-[4px] pt-[12px] text-[11px] font-semibold uppercase tracking-[0.4px] text-tp-slate-400">
                <CopilotIcon name="calendar-1" variant="linear" size={13} />
                Today&apos;s appointments
              </p>
            </>
          )}
          {rows.length ? (
            rows.map((p) => {
              /* Already talked about: a quiet count at the right, and the
                 row goes back to the latest of those chats instead of
                 starting another. */
              const prior = (existing && existing.get(String(p.id))) || []
              return (
              <div key={p.id} className="relative">
              <button
                type="button"
                onClick={() => (prior.length && onOpenExisting ? onOpenExisting(prior[0]) : onStart({ kind: "patient", patient: p }))}
                title={prior.length ? `Open ${p.label}'s latest conversation` : undefined}
                className="flex w-full items-start gap-[10px] rounded-[10px] px-[8px] py-[8px] text-left transition-colors hover:bg-tp-slate-50"
              >
                <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-tp-slate-100 text-tp-slate-500">
                  <CopilotIcon asset="users/user" variant="bulk" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-[6px]">
                    <span className="truncate text-[13px] font-semibold leading-[18px] text-tp-slate-800">{p.label}</span>
                    {p.isToday && q && <span className="shrink-0 rounded-[6px] bg-tp-success-50 px-[5px] text-[10.5px] font-semibold text-tp-success-700">Today</span>}
                  </span>
                  <span className="block truncate text-[11.5px] leading-[16px] tabular-nums text-tp-slate-500">
                    {[p.age != null ? `${p.age}y` : null, p.gender, p.pid, p.phone].filter(Boolean).join(" | ")}
                  </span>
                </span>
                {prior.length > 0 && (
                  <span className="shrink-0 pt-[2px] text-[11px] text-tp-slate-400">
                    {prior.length === 1 ? "1 chat" : `${prior.length} chats`}
                  </span>
                )}
              </button>
              </div>
              )
            })
          ) : (
            <p className="m-0 px-[10px] py-[12px] text-[12.5px] leading-[18px] text-tp-slate-500">
              {q.length < 2
                ? "No appointments today. Search by name, patient ID or mobile number."
                : picker.searching
                  ? "Searching…"
                  : `No patient matches “${q}”.`}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Row menu ──────────────────────────────────────────────────────────── */

/* A ⋯ at a row's top-right, shown on hover or focus: what can be done to
   that one conversation, kept out of the way of opening it. */
function RowMenu({ label, items, placement = "bottom-[9px] right-[10px]", alwaysVisible = false, inline = false, compact = false }) {
  const [open, setOpen] = useState(false)
  /* A destructive item with `confirm` asks once, in the menu itself. */
  const [confirming, setConfirming] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    /* Captured and stopped: Escape closes this menu only, not Velora. */
    const onKey = (e) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
    /* Captured: the popup stops mousedown at its own surface, so a bubbling
       listener never heard a click elsewhere in it and the menu stayed open. */
    document.addEventListener("pointerdown", onDown, true)
    window.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("keydown", onKey, true)
    }
  }, [open])
  return (
    <div ref={ref} className={inline ? "relative z-[3]" : `absolute z-[2] ${placement}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setConfirming(null)
          setOpen((v) => !v)
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          compact ? "h-[22px] w-[22px] rounded-[6px]" : "h-[26px] w-[26px] rounded-[8px]",
          "flex items-center justify-center text-tp-slate-500 transition-[opacity,background-color] hover:bg-tp-slate-200 hover:text-tp-slate-800 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tp-blue-500",
          open ? "bg-tp-slate-200 opacity-100" : alwaysVisible ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
        ].join(" ")}
      >
        <CopilotIcon asset="settings/3-dots-more" family="straight" variant="bold" size={15} style={{ transform: "rotate(90deg)" }} />
      </button>
      {open && (
        <div role="menu" className={`copilot-menu-in absolute ${inline ? "left-0" : "right-0"} top-[30px] z-[5] w-[240px] overflow-hidden rounded-[12px] border-[1px] border-tp-slate-200 bg-white p-[4px] shadow-[0_14px_36px_-12px_rgba(15,23,42,0.3)]`}>
          {confirming ? (
            <div className="px-[10px] py-[8px]">
              <p className="m-0 text-[12px] leading-[17px] text-tp-slate-600">{confirming.confirm}</p>
              <div className="mt-[8px] flex justify-end gap-[6px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirming(null)
                  }}
                  className="h-[28px] rounded-[8px] px-[10px] text-[12px] font-semibold text-tp-slate-600 hover:bg-tp-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const run = confirming.onSelect
                    setConfirming(null)
                    setOpen(false)
                    run()
                  }}
                  className="h-[28px] rounded-[8px] bg-tp-error-600 px-[10px] text-[12px] font-semibold text-white hover:bg-tp-error-700"
                >
                  {confirming.label}
                </button>
              </div>
            </div>
          ) : items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                if (item.confirm) {
                  setConfirming(item)
                  return
                }
                setOpen(false)
                item.onSelect()
              }}
              className={[
                "flex w-full gap-[8px] rounded-[8px] px-[10px] py-[8px] text-left text-[12.5px] font-semibold transition-colors",
                item.note ? "items-start" : "items-center",
                item.danger ? "text-tp-error-700 hover:bg-tp-error-50" : "text-tp-slate-700 hover:bg-tp-slate-50",
              ].join(" ")}
            >
              <span className={`flex h-[18px] shrink-0 items-center ${item.danger ? "text-tp-error-600" : "text-tp-slate-500"}`}>
                <CopilotIcon name={item.danger ? "trash" : "edit-2"} variant="linear" size={15} style={{ display: "block" }} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="leading-[18px]">{item.label}</span>
                {item.note && <span className="mt-[1px] text-[11.5px] font-normal leading-[16px] text-tp-slate-500">{item.note}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* A patient's card before their first question. The open one is selected;
   another (the page Velora was opened on) switches back to that patient. */
function ProvisionalCard({ patient, active, onOpen }) {
  const first = String(patient.label || "").trim().split(/\s+/)[0] || "this patient"
  const body = (
    <span className="flex w-full items-start gap-[12px] px-[12px] pb-[10px] pt-[11px]">
      <span
        className={[
          "mt-[1px] flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]",
          active ? "bg-tp-blue-100 text-tp-blue-600" : "bg-tp-slate-100 text-tp-slate-500",
        ].join(" ")}
      >
        <CopilotIcon asset="users/user" variant="bulk" size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className={`truncate text-[13px] font-semibold leading-[18px] ${active ? "text-tp-blue-700" : "text-tp-slate-800"}`}>{patient.label}</span>
        <span className="truncate text-[12.5px] leading-[17px] text-tp-slate-600">Ask about {first}</span>
      </span>
    </span>
  )
  if (active) {
    return (
      <div className="flex w-full flex-col overflow-hidden rounded-[12px] border-[1px] border-tp-blue-200 bg-tp-blue-50" aria-current="true">
        {body}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen && onOpen(patient)}
      title={`Switch to ${patient.label}'s chat`}
      className="flex w-full flex-col overflow-hidden rounded-[12px] border-[1px] border-tp-slate-200 bg-white text-left transition-colors hover:border-tp-slate-300 hover:bg-tp-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
    >
      {body}
    </button>
  )
}

/* ── Row ───────────────────────────────────────────────────────────────── */

function SessionRow({ row, group, nowMs, active, pending, failed, locked, onPick, onDelete, sidebar = false }) {
  const clinic = row.mode === "find_patients"
  const patientName = row.patient && row.patient.patientName
  const mine = clinic && row.scope === "mine"
  const scopeLabel = clinic ? (mine ? "All my patients" : "All hospital patients") : patientName || "Patient chart"
  const preview = cleanPreview(row.preview)
  const ms = (Number(row.updated_at) || 0) * 1000
  /* In the sidebar: the clock time at the top right, the day on its own
     line below the question. */
  const when = ms ? safeFormat(ms, CLOCK) : ""
  const whenFull = fullTime(ms)
  const day = ms ? dayLine(ms, nowMs) : ""
  /* Nothing asked yet (the hospital chat before its first question): no
     time to show and nothing to clear, so no footer and no menu. */
  const started = !!ms

  return (
    <li className="group/row relative">
      {onDelete && started && (
        <RowMenu
          label="More for this conversation"
          alwaysVisible={sidebar}
          placement={sidebar ? "bottom-[3px] right-[6px]" : undefined}
          items={[
            row.__home
              ? { label: "Clear conversation", note: "Empties this chat so it starts afresh.", danger: true, onSelect: () => onDelete(row) }
              : { label: "Delete conversation", note: "Removes this chat from your history.", danger: true, onSelect: () => onDelete(row) },
          ]}
        />
      )}
      <button
        type="button"
        data-recent-row=""
        onClick={() => onPick(row)}
        disabled={locked && !pending}
        aria-current={active ? "true" : undefined}
        aria-busy={pending || undefined}
        title={active ? "This conversation is open now" : whenFull ? `Open this conversation. Last asked ${whenFull}` : "Open this conversation"}
        className={[
          "group flex w-full flex-col overflow-hidden rounded-[12px] border-[1px] text-left transition-colors duration-[var(--copilot-dur-state)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
          active
            ? "cursor-default border-tp-blue-200 bg-tp-blue-50"
            : pending
              ? "cursor-progress border-tp-slate-200 bg-tp-slate-100"
              : "border-tp-slate-200 bg-white hover:border-tp-slate-300 hover:bg-tp-slate-50 active:bg-tp-slate-100 disabled:cursor-default disabled:opacity-50",
        ].join(" ")}
      >
        {/* Whose chat and what was asked. The question fills a line before
            it wraps, and stops at two. */}
        <span className="flex w-full items-start gap-[12px] px-[12px] pb-[10px] pt-[11px]">
          <ScopeMark clinic={clinic} active={active} />
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span
              className={[
                "truncate text-[13px] font-semibold leading-[18px]",
                active ? "text-tp-blue-700" : "text-tp-slate-800",
              ].join(" ")}
            >
              {!clinic && <span className="sr-only">Chart of </span>}
              {scopeLabel}
            </span>
            {preview ? (
              <span className="line-clamp-2 w-full break-words text-[12.5px] leading-[17px] text-tp-slate-600">{preview}</span>
            ) : (
              <span className="w-full text-[12.5px] leading-[17px] text-tp-slate-500">No question was asked</span>
            )}
            {failed && (
              <span role="alert" className="mt-[3px] text-[11.5px] font-medium leading-[15px] text-tp-error-600">
                This conversation did not open. Open it again to retry.
              </span>
            )}
          </span>
        </span>
        {/* When, in a strip of its own, with the row's menu at its end. */}
        {(started || pending) && (
        <span
          className={[
            "flex h-[32px] w-full items-center gap-[6px] border-t-[1px] px-[12px] text-[11px] leading-[14px] tabular-nums",
            active ? "border-tp-blue-100 bg-tp-blue-100/40 text-tp-blue-600" : "border-tp-slate-100 bg-tp-slate-50 text-tp-slate-500",
          ].join(" ")}
        >
          {pending ? (
            <span className="flex items-center gap-[5px] font-medium text-tp-violet-600">
              <Spinner />
              Opening…
            </span>
          ) : (
            <>
              <span className="sr-only">Last asked </span>
              <span className="truncate">{[day, when].filter(Boolean).join(" · ")}</span>
            </>
          )}
        </span>
        )}
      </button>
    </li>
  )
}

/* ── The list ──────────────────────────────────────────────────────────── */

export default function CopilotRecentSessions({ orderRef: orderRefProp, pinned = [], homeAnchored = false, onOpenPatient, openNewChat = false, onNewChatOpened, onPick, onClose, onStartChat, onDelete, onClearAll, homeRow, current, refreshKey = 0, activeSessionId, variant = "overlay" }) {
  const sidebar = variant === "sidebar"
  /* "New chat" opens its own sheet inside the sidebar, over the list. */
  const [newOpen, setNewOpen] = useState(false)
  useEffect(() => {
    if (!openNewChat || !sidebar) return
    setNewOpen(true)
    if (onNewChatOpened) onNewChatOpened()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewChat, sidebar])
  const [state, setState] = useState({
    status: "loading",
    rows: [],
    hasMore: false,
    nextOffset: null,
    more: "idle",
  })
  const [attempt, setAttempt] = useState(0)
  const [pendingId, setPendingId] = useState(null)
  const [failedId, setFailedId] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [edges, setEdges] = useState({ top: false, bottom: false })

  const mountedRef = useRef(true)
  const timerRef = useRef(null)
  const moreCtrlRef = useRef(null)
  const scrollRef = useRef(null)
  const backRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      if (moreCtrlRef.current) moreCtrlRef.current.abort()
    }
  }, [])

  /* "12 min ago" goes stale while the column sits open through a clinic. A
     minute is the finest step any label here shows. */
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  /* The overlay covers what the doctor was looking at, so focus goes to its
     way back. The column opens beside the thread and leaves focus where it
     was, so typing a question is never interrupted by opening history. */
  useEffect(() => {
    if (!sidebar && backRef.current) backRef.current.focus({ preventScroll: true })
  }, [sidebar])

  useEffect(() => {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null
    /* Quietly when there is already a list: a refresh after the first
       question of a new chat should not blank the column. */
    setState((s) => (s.status === "ready" ? s : { ...s, status: "loading" }))
    listCopilotSessions(0, ctrl ? { signal: ctrl.signal } : undefined)
      .then((res) => {
        if (!mountedRef.current || (ctrl && ctrl.signal.aborted)) return
        const rows = (res && res.sessions) || []
        setState({
          status: "ready",
          rows: mergeRows([], rows),
          hasMore: !!(res && res.has_more),
          nextOffset: res && res.next_offset != null ? res.next_offset : rows.length,
          more: "idle",
        })
      })
      .catch(() => {
        if (!mountedRef.current || (ctrl && ctrl.signal.aborted)) return
        setState({ status: "error", rows: [], hasMore: false, nextOffset: null, more: "idle" })
      })
    return () => {
      if (ctrl) ctrl.abort()
    }
  }, [attempt, activeSessionId, refreshKey])

  const loadMore = useCallback(() => {
    if (state.more === "loading" || !state.hasMore) return
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null
    moreCtrlRef.current = ctrl
    setState((s) => ({ ...s, more: "loading" }))
    listCopilotSessions(state.nextOffset || 0, ctrl ? { signal: ctrl.signal } : undefined)
      .then((res) => {
        if (!mountedRef.current) return
        const incoming = (res && res.sessions) || []
        setState((s) => ({
          ...s,
          rows: mergeRows(s.rows, incoming),
          hasMore: !!(res && res.has_more) && incoming.length > 0,
          nextOffset: res && res.next_offset != null ? res.next_offset : (s.nextOffset || 0) + incoming.length,
          more: "idle",
        }))
      })
      .catch(() => {
        if (!mountedRef.current || (ctrl && ctrl.signal.aborted)) return
        setState((s) => ({ ...s, more: "error" }))
      })
  }, [state.more, state.hasMore, state.nextOffset])

  /* Opening a conversation. The dock restores it and closes this list, so a
     pick is usually the last thing this component sees. While it works the
     row says "Opening…" and the others wait, because a second click would
     start a second restore racing the first. If the dock hands back the
     restore's promise its outcome is used directly; if not, the timeout
     above is the backstop. */
  const pick = useCallback(
    (row) => {
      if (!row || pendingId) return
      if (row.__home) {
        if (homeRow && homeRow.onOpen) homeRow.onOpen()
        return
      }
      if (row.session_id === activeSessionId) {
        /* Already in front of the doctor. In the sheet that means going back
           to it; beside the thread it is already there. */
        if (!sidebar && onClose) onClose()
        return
      }
      if (!onPick) return
      const id = row.session_id
      setFailedId(null)
      setPendingId(id)
      clearTimeout(timerRef.current)
      const fail = () => {
        if (!mountedRef.current) return
        clearTimeout(timerRef.current)
        setPendingId((p) => (p === id ? null : p))
        setFailedId(id)
      }
      timerRef.current = setTimeout(fail, RESTORE_TIMEOUT_MS)
      let result
      try {
        result = onPick(row)
      } catch (e) {
        fail()
        return
      }
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (!mountedRef.current) return
            clearTimeout(timerRef.current)
            setPendingId((p) => (p === id ? null : p))
          },
          fail
        )
      }
    },
    [activeSessionId, onClose, onPick, pendingId, sidebar, homeRow]
  )

  /* A restore that landed while this list stays mounted. */
  useEffect(() => {
    if (pendingId && pendingId === activeSessionId) {
      clearTimeout(timerRef.current)
      setPendingId(null)
    }
  }, [activeSessionId, pendingId])

  /* What the list shows: every conversation, minus anything the doctor
     cleared, narrowed by the search. The service keeps longer; Velora keeps
     a working day, so last week's chats are not here to dig through. */
  const [query, setQuery] = useState("")
  /* Deleted from the row menu: gone from the list at once, while the parent
     forgets the conversation itself. */
  const [removed, setRemoved] = useState(() => new Set())
  /* A delete waits a few seconds before it is made, with Undo on screen,
     so a slip on the wrong card costs nothing. Closing Velora commits it. */
  const [undoRow, setUndoRow] = useState(null)
  const commitRef = useRef(null)
  const deleteRow = useCallback(
    (row) => {
      if (commitRef.current) commitRef.current()
      setRemoved((prev) => new Set(prev).add(row.session_id))
      let timer = null
      const commit = () => {
        clearTimeout(timer)
        commitRef.current = null
        if (mountedRef.current) setUndoRow(null)
        if (onDelete) onDelete(row)
      }
      timer = setTimeout(commit, UNDO_MS)
      commitRef.current = commit
      commitRef.timer = timer
      setUndoRow(row)
    },
    [onDelete]
  )
  const undoDelete = useCallback(() => {
    if (!undoRow) return
    clearTimeout(commitRef.timer)
    commitRef.current = null
    setRemoved((prev) => {
      const next = new Set(prev)
      next.delete(undoRow.session_id)
      return next
    })
    setUndoRow(null)
  }, [undoRow])
  useEffect(
    () => () => {
      if (commitRef.current) commitRef.current()
    },
    []
  )
  /* Each patient's conversations, newest first, so
     the new-chat sheet can offer the one that already exists. */
  const byPatient = useMemo(() => {
    const m = new Map()
    state.rows
      .filter((r) => r.patient && r.patient.patientUid && !removed.has(r.session_id) && isVisibleSession(r, nowMs))
      .sort((a, b) => (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0))
      .forEach((r) => {
        const k = String(r.patient.patientUid)
        m.set(k, [...(m.get(k) || []), r])
      })
    return m
  }, [state.rows, removed, nowMs])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.rows.filter((row) => {
      if (removed.has(row.session_id)) return false
      if (!isVisibleSession(row, nowMs)) return false
      if (!q) return true
      const clinic = row.mode === "find_patients"
      const hay = [
        clinic ? (row.scope === "mine" ? "all my patients search" : "all hospital patients hospital search") : "",
        (row.patient && row.patient.patientName) || "",
        row.preview || "",
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [state.rows, nowMs, query, removed])

  /* The hospital chat is one conversation among the others, in the same
     newest-first order. Until it has been used today it waits at the end
     as the default chat, so the list is never empty. */
  const listed = useMemo(() => {
    /* In a patient's chat that patient's card is the default; the empty
       hospital chat is offered only when the hospital chat is open. */
    if (!sidebar || !homeRow || query.trim() || (current && !homeAnchored)) return visible
    const g = homeRow.mine ? "mine" : "all"
    const has = visible.some((r) => r.mode === "find_patients" && (r.scope === "mine" ? "mine" : "all") === g)
    if (has) return visible
    return [...visible, { session_id: "__home__", __home: true, mode: "find_patients", scope: g, preview: homeRow.sub, updated_at: Math.floor((homeRow.updatedAt || 0) / 1000) }]
  }, [visible, sidebar, homeRow, query, current, homeAnchored])
  /* Patients shown before any question: the open one and every other
     patient opened during this visit, in the order they were opened. */
  const provisional = useMemo(() => {
    const samePatient = (r, id) => r.patient && String(r.patient.patientUid) === String(id)
    const has = (id) => visible.some((r) => samePatient(r, id)) || state.rows.some((r) => removed.has(r.session_id) && samePatient(r, id))
    const list = []
    ;(pinned || []).forEach((p) => {
      if (!has(p.id) && !list.some((x) => String(x.id) === String(p.id))) list.push(p)
    })
    if (current && !has(current.id) && !list.some((x) => String(x.id) === String(current.id))) list.unshift(current)
    const q = query.trim().toLowerCase()
    return q ? list.filter((p) => String(p.label || "").toLowerCase().includes(q)) : list
  }, [visible, current, pinned, query, state.rows, removed])
  /* The sidebar's order holds still for the whole visit. Opening a card, or
     asking in it, never moves it; only a chat that was not in the list
     before (a new chat) takes the top. Velora reopened, the list is sorted
     newest first again. The order lives in the dock, so collapsing and
     expanding the sidebar keeps it. */
  const localOrderRef = useRef(null)
  const orderRef = orderRefProp || localOrderRef
  const ordered = useMemo(() => {
    if (!sidebar) return listed
    const keyOf = (r) =>
      r.__prov ? `p:${r.patient.patientUid}` : r.__home ? `h:${r.scope}` : r.session_id
    const provItems = provisional.map((p) => ({ session_id: `__prov__:${p.id}`, __prov: true, patient: { patientUid: p.id, patientName: p.label } }))
    const natural = [...provItems, ...listed]
    if (state.status !== "ready") return natural
    if (!orderRef.current) {
      const m = new Map()
      natural.forEach((r, i) => m.set(keyOf(r), i))
      orderRef.current = { ranks: m, startedAt: Date.now() }
      return natural
    }
    const { ranks, startedAt } = orderRef.current
    let min = Math.min(0, ...ranks.values())
    let max = Math.max(0, ...ranks.values())
    const fresh = []
    natural.forEach((r) => {
      const k = keyOf(r)
      if (ranks.has(k)) return
      /* A first question turns a placeholder into a conversation: it keeps
         the placeholder's place. */
      const stand = r.patient && r.mode !== "find_patients" ? `p:${r.patient.patientUid}` : r.mode === "find_patients" ? `h:${r.scope === "mine" ? "mine" : "all"}` : null
      if (stand && ranks.has(stand)) {
        ranks.set(k, ranks.get(stand))
        return
      }
      fresh.push(r)
    })
    /* New this visit goes on top, in the order it arrived; an older page of
       history loaded by scrolling goes underneath. */
    const top = fresh.filter((r) => r.__prov || r.__home || (Number(r.updated_at) || 0) * 1000 >= startedAt - 5000)
    const bottom = fresh.filter((r) => !top.includes(r))
    top.reverse().forEach((r) => ranks.set(keyOf(r), --min))
    bottom.forEach((r) => ranks.set(keyOf(r), ++max))
    return [...natural].sort((a, b) => ranks.get(keyOf(a)) - ranks.get(keyOf(b)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listed, provisional, sidebar, state.status])
  const groups = useMemo(() => {
    /* One list in the sidebar, in the visit's held order: no day headings. */
    if (sidebar) return ordered.length ? [{ key: "recent", label: "Recent", rows: ordered }] : []
    const e = dayEdges(nowMs)
    const byKey = {}
    visible.forEach((row) => {
      const key = groupOf((Number(row.updated_at) || 0) * 1000, e)
      ;(byKey[key] = byKey[key] || []).push(row)
    })
    return GROUPS.filter((g) => byKey[g.key]).map((g) => ({ ...g, rows: byKey[g.key] }))
  }, [visible, ordered, sidebar, nowMs])

  /* Fades at the scroll edges say "there is more this way", and only when
     there is. A plain gradient in the column's own colour, never a blur. */
  const measureEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }, [])
  useLayoutEffect(measureEdges, [measureEdges, state.status, state.rows.length, state.more])

  /* Up and down move between conversations, Home and End jump to the ends:
     the list behaves like the list it looks like, and Tab still leaves it. */
  const onListKeyDown = useCallback((event) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"]
    if (!keys.includes(event.key) || !scrollRef.current) return
    const rows = Array.from(scrollRef.current.querySelectorAll("button[data-recent-row]:not([disabled])"))
    if (!rows.length) return
    const at = rows.indexOf(document.activeElement)
    let next = at
    if (event.key === "Home") next = 0
    else if (event.key === "End") next = rows.length - 1
    else if (event.key === "ArrowDown") next = at < 0 ? 0 : Math.min(rows.length - 1, at + 1)
    else next = at < 0 ? rows.length - 1 : Math.max(0, at - 1)
    event.preventDefault()
    rows[next].focus()
  }, [])

  /* A shade darker than the conversation, so the history column reads as
     its own surface beside the chat rather than part of it. */
  const surface = sidebar ? "bg-tp-slate-100" : "bg-tp-slate-0"
  const fadeFrom = sidebar ? "from-tp-slate-100" : "from-tp-slate-0"
  const ready = state.status === "ready"
  const count = ordered.length
  const searching = !!query.trim()

  return (
    <section
      aria-label="Recent conversations"
      className={[
        "copilot-recent-in",
        sidebar
          ? "relative flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-r border-tp-slate-100"
          : "absolute inset-0 z-40 flex flex-col",
        surface,
      ].join(" ")}
    >
      <style>{RECENT_CSS}</style>

      <header
        className={[
          sidebar
            ? "relative z-[6] flex h-[52px] shrink-0 items-center gap-[6px] pl-[12px]"
            : "flex h-[60px] shrink-0 items-start gap-[6px] border-b border-tp-slate-100 pt-[10px] pl-[10px]",
          HEADER_CLEARANCE[sidebar ? "sidebar" : "overlay"],
        ].join(" ")}
      >
        {/* The way back, which an overlay has to carry: it covers the thread,
            and "Back" in words is what a doctor looks for, where a bare arrow
            is something to work out. */}
        {!sidebar && (
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            aria-label="Back to the conversation"
            title="Back to the conversation"
            className="flex h-[32px] shrink-0 items-center gap-[2px] rounded-[8px] pl-[4px] pr-[9px] text-[12.5px] font-semibold text-tp-slate-600 transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100 hover:text-tp-slate-900 active:bg-tp-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
          >
            <CopilotIcon name="chevron-left" variant="linear" size={16} />
            Back
          </button>
        )}
        {/* Its own collapse control, on the edge that faces the conversation:
            the column slides in from the right, so the control that sends it
            back sits where it would be pushed from. The clock in the corner
            still toggles it too; this is the one a doctor finds without
            looking for it. */}
        {sidebar ? (
          /* The sidebar is part of Velora now, so it carries Velora's name,
             as a chat app's history column carries the app's; the collapse
             control sits at its right edge, where the eye looks for it. */
          <>
            <span className={`copilot-glass-tag relative flex items-center gap-[7px] rounded-[10px] py-[5px] pl-[6px] ${onClearAll ? "pr-[4px]" : "pr-[11px]"}`}>
              <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-[7px]" aria-hidden="true">
                <img src="/icons/dr-agent/agent-bg.svg" alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                <img src="/icons/dr-agent/agent-spark.svg" alt="" draggable={false} className="relative z-10" width={13} height={13} />
              </span>
              <span className="text-[13.5px] font-semibold leading-none text-tp-slate-700">Velora</span>
              {onClearAll && (
                <RowMenu
                  label="More for Velora history"
                  alwaysVisible
                  inline
                  compact
                  items={[
                    {
                      label: "Clear all history",
                      note: "Removes every conversation, for every patient and search.",
                      danger: true,
                      confirm: "Every conversation is removed, for every patient. This cannot be undone.",
                      onSelect: onClearAll,
                    },
                  ]}
                />
              )}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Collapse recent conversations"
              title="Collapse"
              className="copilot-icon-btn flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] text-tp-slate-500 transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100 hover:text-tp-slate-800 active:bg-tp-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
            >
              <CopilotIcon name="sidebar-left" variant="linear" size={17} />
            </button>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="mx-[2px] mt-[7px] h-[18px] w-px shrink-0 bg-tp-slate-200" />
            <div className="flex min-w-0 flex-col pt-[7px]">
              <h2 className="truncate text-[13.5px] font-semibold leading-[18px] text-tp-slate-800">Recent conversations</h2>
              <p className="truncate text-[11px] leading-[15px] text-tp-slate-500">All your conversations</p>
            </div>
          </>
        )}
      </header>

      {/* Start a conversation with someone new: opens the patient picker as
          "Start a new chat with", and the pick begins a fresh chat. */}
      {sidebar && newOpen && onStartChat && (
        <NewChatSheet
          onClose={() => setNewOpen(false)}
          existing={byPatient}
          onOpenExisting={(row) => {
            setNewOpen(false)
            pick(row)
          }}
          onStart={(choice) => {
            setNewOpen(false)
            onStartChat(choice)
          }}
        />
      )}

      {sidebar && onStartChat && (
        <div className="shrink-0 px-[12px] pt-[10px]">
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="flex h-[38px] w-full items-center justify-center gap-[8px] rounded-[10px] border-[1px] border-dashed border-tp-violet-300 bg-[linear-gradient(135deg,rgba(176,79,208,0.07),rgba(123,79,196,0.06),rgba(75,74,213,0.08))] text-[13px] font-semibold transition-colors hover:border-tp-violet-400 hover:bg-[linear-gradient(135deg,rgba(176,79,208,0.13),rgba(123,79,196,0.11),rgba(75,74,213,0.14))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
          >
            {/* Velora's own action, in Velora's gradient: the icon through a
                mask, the words clipped to it. */}
            <span className="copilot-grad-icon flex">
              <CopilotIcon name="message-add" variant="linear" size={17} />
            </span>
            <span className="copilot-grad-text">Start new chat</span>
          </button>
        </div>
      )}

      {/* The list's heading first, then its search. */}
      {sidebar && (
        <div className="group/row relative flex shrink-0 items-center px-[18px] pb-[4px] pt-[14px]">
          <p className="m-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.4px] text-tp-slate-400">Recent conversations</p>
        </div>
      )}

      {/* Search across today's conversations: a patient's name, a word from
          the question, or "hospital" for the hospital-wide ones. */}
      {(sidebar || (state.status === "ready" && state.rows.length > 0)) && (
        <div className="shrink-0 px-[12px] pb-[4px] pt-[4px]">
          <label className="copilot-context-search copilot-search-plain flex h-[36px] items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-300 bg-transparent px-[10px]">
            <span className="flex shrink-0 items-center text-tp-slate-500">
              <CopilotIcon name="search-normal" variant="linear" size={15} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient or question"
              aria-label="Search conversations"
              className="h-full w-full min-w-0 bg-transparent text-[12.5px] text-tp-slate-800 outline-none placeholder:text-tp-slate-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-500 hover:bg-tp-slate-100"
              >
                <CopilotIcon name="close-circle" variant="bulk" size={15} />
              </button>
            )}
          </label>
        </div>
      )}


      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={measureEdges}
          onKeyDown={onListKeyDown}
          aria-busy={state.status === "loading" || undefined}
          className="h-full overflow-y-auto overscroll-contain"
        >
          {state.status === "loading" && <SkeletonList />}

          {state.status === "error" && (
            <StatePanel
              icon="cloud-cross"
              tone="error"
              title="Could not load your conversations"
              action={
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`${SECONDARY_BUTTON} mt-[14px]`}>
                  <CopilotIcon name="refresh-circle" variant="bulk" size={15} />
                  Try again
                </button>
              }
            >
              Nothing has been lost. This is usually the internet connection. Check it, then try again.
            </StatePanel>
          )}

          {ready && !count && searching && (
            <StatePanel icon="search-normal" title="No conversation matches">
              No conversation mentions &ldquo;{query.trim()}&rdquo;. Try a patient&apos;s first name or one word from the question.
            </StatePanel>
          )}

          {ready && !count && !searching && sidebar && !provisional.length && (
            <p className="m-0 px-[22px] py-[10px] text-[12.5px] leading-[18px] text-tp-slate-500">
              Chats with patients appear here as you start them.
            </p>
          )}

          {ready && !count && !searching && !sidebar && (
            <StatePanel
              icon="message-time"
              title="No conversations yet"
              action={
                !sidebar && onClose ? (
                  <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} mt-[14px]`}>
                    Ask a question
                  </button>
                ) : null
              }
            >
              Each conversation you have with Velora today is kept here, about one patient or about all hospital patients,
              so you can go back to it.
            </StatePanel>
          )}

          {ready && count > 0 && (
            <div key="list" className={["copilot-recent-in px-[8px] pb-[12px]", sidebar ? "pt-[6px]" : ""].join(" ")}>
              {groups.map((g) => (
                <div key={g.key} role="group" aria-labelledby={`copilot-recent-${g.key}`}>
                  {!sidebar && <h3
                    id={`copilot-recent-${g.key}`}
                    className="px-[10px] pb-[4px] pt-[14px] text-[11px] font-semibold leading-[14px] text-tp-slate-500"
                  >
                    {g.label}
                  </h3>}
                  <ul className="flex flex-col gap-[6px]">
                    {g.rows.map((row) =>
                      row.__prov ? (
                        <li key={row.session_id}>
                          <ProvisionalCard
                            patient={{ id: row.patient.patientUid, label: row.patient.patientName }}
                            active={!!current && String(current.id) === String(row.patient.patientUid)}
                            onOpen={onOpenPatient}
                          />
                        </li>
                      ) : (
                      <SessionRow
                        key={row.session_id}
                        row={row}
                        group={g.key}
                        nowMs={nowMs}
                        active={row.__home ? !!(homeRow && homeRow.active) : !!activeSessionId && row.session_id === activeSessionId}
                        pending={pendingId === row.session_id}
                        failed={failedId === row.session_id}
                        locked={!!pendingId}
                        sidebar={sidebar}
                        onPick={pick}
                        onDelete={
                          row.__home
                            ? homeRow && homeRow.onClear
                              ? () => homeRow.onClear()
                              : undefined
                            : sidebar && onDelete
                              ? deleteRow
                              : undefined
                        }
                      />
                      )
                    )}
                  </ul>
                </div>
              ))}

              {/* The page the service sends is 50 long; older ones come on
                  request rather than all at once, and the end of the list
                  says it is the end, so a doctor looking for something does
                  not keep scrolling for a conversation that has expired. */}
              <div className="px-[10px] pt-[14px]">
                {state.hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={state.more === "loading"}
                    className={`${SECONDARY_BUTTON} w-full`}
                  >
                    {state.more === "loading" ? (
                      <>
                        <Spinner tone="slate" />
                        Loading older conversations…
                      </>
                    ) : (
                      <>
                        <CopilotIcon name="chevron-down" variant="linear" size={15} />
                        Show older conversations
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-center text-[11px] leading-[15px] text-tp-slate-500">
                    End of the list.
                  </p>
                )}
                {state.more === "error" && (
                  <p role="alert" className="mt-[6px] text-center text-[11.5px] leading-[15px] text-tp-error-600">
                    Older conversations could not be loaded. Try again.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-0 top-0 h-[16px] bg-gradient-to-b to-transparent transition-opacity duration-[var(--copilot-dur-state)]",
            fadeFrom,
            edges.top ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-0 bottom-0 h-[28px] bg-gradient-to-t to-transparent transition-opacity duration-[var(--copilot-dur-state)]",
            fadeFrom,
            edges.bottom ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </div>

      {undoRow && (
        <div role="status" className="copilot-menu-in mx-[10px] mb-[10px] flex shrink-0 items-center gap-[10px] rounded-[10px] bg-tp-slate-800 py-[8px] pl-[12px] pr-[6px] text-[12px] text-white shadow-[0_10px_24px_-10px_rgba(15,23,42,0.5)]">
          <span className="min-w-0 flex-1 truncate">
            Conversation deleted{undoRow.patient && undoRow.patient.patientName ? ` (${undoRow.patient.patientName})` : ""}
          </span>
          <button
            type="button"
            onClick={undoDelete}
            className="h-[26px] shrink-0 rounded-[8px] px-[10px] text-[12px] font-semibold text-tp-violet-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Undo
          </button>
        </div>
      )}
    </section>
  )
}

/* One arrival, shared by the column, the overlay and the list when it
   replaces the skeleton: a short settle into place, not a performance.
   Under reduced motion it simply appears. */
const RECENT_CSS = `
#dr-copilot-root .copilot-recent-in {
  animation: copilot-recent-in var(--copilot-dur-enter, 200ms) var(--copilot-ease-out, ease-out) both;
}
@keyframes copilot-recent-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  #dr-copilot-root .copilot-recent-in { animation: none; }
}
`
