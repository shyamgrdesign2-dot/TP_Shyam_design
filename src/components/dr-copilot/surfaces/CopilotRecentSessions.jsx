import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { listCopilotSessions } from "../chart-search/copilotApi"
import { CopilotIcon } from "../ui/CopilotIcon"
import { isVisibleSession } from "../chart-search/copilotHistoryPrefs"

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

function shortTime(ms, group, nowMs) {
  if (!ms) return ""
  if (group === "today") {
    const diff = Math.max(0, nowMs - ms) / 1000
    if (diff < 90) return "Just now"
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`
    return safeFormat(ms, CLOCK)
  }
  if (group === "yesterday") return safeFormat(ms, CLOCK)
  if (group === "week") return safeFormat(ms, { weekday: "short", ...CLOCK })
  return safeFormat(ms, { day: "numeric", month: "short" })
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
        active ? "bg-tp-violet-100 text-tp-violet-600" : "bg-tp-slate-100 text-tp-slate-500",
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

/* ── Row ───────────────────────────────────────────────────────────────── */

function SessionRow({ row, group, nowMs, active, pending, failed, locked, onPick }) {
  const clinic = row.mode === "find_patients"
  const patientName = row.patient && row.patient.patientName
  const mine = clinic && row.scope === "mine"
  const scopeLabel = clinic ? (mine ? "All my patients" : "All hospital patients") : patientName || "Patient chart"
  const preview = cleanPreview(row.preview)
  const ms = (Number(row.updated_at) || 0) * 1000
  const when = shortTime(ms, group, nowMs)
  const whenFull = fullTime(ms)
  /* The date as well as the time: within 24 hours "9:20 pm" can be last
     night or tonight, and the date settles it. */
  const whenDated = ms ? `${safeFormat(ms, { day: "numeric", month: "short" })}, ${safeFormat(ms, CLOCK)}` : ""
  const kind = clinic ? (mine ? "My patients search" : "Hospital search") : "Patient conversation"

  return (
    <li>
      <button
        type="button"
        data-recent-row=""
        onClick={() => onPick(row)}
        disabled={locked && !pending}
        aria-current={active ? "true" : undefined}
        aria-busy={pending || undefined}
        title={active ? "This conversation is open now" : whenFull ? `Open this conversation. Last asked ${whenFull}` : "Open this conversation"}
        className={[
          /* A card per conversation rather than a list line: room for whose
             it is, what kind it was, the question, and when. */
          "group flex w-full items-start gap-[12px] rounded-[12px] border-[1px] px-[12px] py-[11px] text-left transition-colors duration-[var(--copilot-dur-state)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
          active
            ? "cursor-default border-tp-blue-200 bg-tp-blue-50"
            : pending
              ? "cursor-progress border-tp-slate-200 bg-tp-slate-100"
              : "border-tp-slate-200 bg-white hover:border-tp-slate-300 hover:bg-tp-slate-50 active:bg-tp-slate-100 disabled:cursor-default disabled:opacity-50",
        ].join(" ")}
      >
        <ScopeMark clinic={clinic} active={active} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="flex w-full items-center gap-[8px]">
            <span
              className={[
                "min-w-0 flex-1 truncate text-[13px] font-semibold leading-[18px]",
                active ? "text-tp-blue-700" : "text-tp-slate-800",
              ].join(" ")}
            >
              {!clinic && <span className="sr-only">Chart of </span>}
              {scopeLabel}
            </span>
            {pending ? (
              <span className="flex shrink-0 items-center gap-[5px] text-[11px] font-medium leading-[14px] text-tp-violet-600">
                <Spinner />
                Opening…
              </span>
            ) : active ? (
              <span className="shrink-0 rounded-[6px] bg-tp-blue-100 px-[6px] py-[1px] text-[10.5px] font-semibold leading-[14px] text-tp-blue-700">
                Open now
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap text-[11px] leading-[14px] text-tp-slate-500 tabular-nums">
                <span className="sr-only">Last asked </span>
                {when}
              </span>
            )}
          </span>
          {preview ? (
            <span className="line-clamp-2 w-full break-words text-[12.5px] leading-[17px] text-tp-slate-600">
              {preview}
            </span>
          ) : (
            /* Opened and left without a question. Said plainly rather than
               shown as a blank line that looks like a loading fault. */
            <span className="w-full text-[12.5px] leading-[17px] text-tp-slate-500">No question was asked</span>
          )}
          {/* What kind of conversation and when, as two tags: scanned down
              the list, the tags line up and the eye reads them as a column. */}
          <span className="mt-[6px] flex w-full flex-wrap items-center gap-[6px] text-[11px] leading-[14px]">
            <span
              className={[
                "inline-flex h-[20px] items-center gap-[4px] rounded-[6px] px-[6px] font-medium",
                clinic ? "bg-tp-violet-50 text-tp-violet-700" : "bg-tp-blue-50 text-tp-blue-700",
              ].join(" ")}
            >
              <CopilotIcon
                asset={clinic ? "medical/hospital-building-4" : "users/user"}
                variant="linear"
                size={11}
              />
              {kind}
            </span>
            {whenDated && (
              <span className="inline-flex h-[20px] items-center gap-[4px] rounded-[6px] bg-tp-slate-100 px-[6px] tabular-nums text-tp-slate-600">
                <CopilotIcon name="calendar-1" variant="linear" size={11} />
                {whenDated}
              </span>
            )}
          </span>
          {failed && (
            <span role="alert" className="mt-[3px] text-[11.5px] font-medium leading-[15px] text-tp-error-600">
              This conversation did not open. Open it again to retry.
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

/* ── The list ──────────────────────────────────────────────────────────── */

export default function CopilotRecentSessions({ onPick, onClose, activeSessionId, variant = "overlay" }) {
  const sidebar = variant === "sidebar"
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
    setState((s) => ({ ...s, status: "loading" }))
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
  }, [attempt])

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
    [activeSessionId, onClose, onPick, pendingId, sidebar]
  )

  /* A restore that landed while this list stays mounted. */
  useEffect(() => {
    if (pendingId && pendingId === activeSessionId) {
      clearTimeout(timerRef.current)
      setPendingId(null)
    }
  }, [activeSessionId, pendingId])

  /* What the list shows: the last 24 hours only, minus anything the doctor
     cleared, narrowed by the search. The service keeps longer; Velora keeps
     a working day, so last week's chats are not here to dig through. */
  const [query, setQuery] = useState("")
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.rows.filter((row) => {
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
  }, [state.rows, nowMs, query])

  const groups = useMemo(() => {
    const e = dayEdges(nowMs)
    const byKey = {}
    visible.forEach((row) => {
      const key = groupOf((Number(row.updated_at) || 0) * 1000, e)
      ;(byKey[key] = byKey[key] || []).push(row)
    })
    return GROUPS.filter((g) => byKey[g.key]).map((g) => ({ ...g, rows: byKey[g.key] }))
  }, [visible, nowMs])

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

  const surface = sidebar ? "bg-tp-slate-50" : "bg-tp-slate-0"
  const fadeFrom = sidebar ? "from-tp-slate-50" : "from-tp-slate-0"
  const ready = state.status === "ready"
  const count = visible.length
  const searching = !!query.trim()

  return (
    <section
      aria-label="Recent conversations"
      className={[
        "copilot-recent-in",
        sidebar
          ? "flex h-full w-[372px] shrink-0 flex-col border-l border-tp-slate-100"
          : "absolute inset-0 z-40 flex flex-col",
        surface,
      ].join(" ")}
    >
      <style>{RECENT_CSS}</style>

      <header
        className={[
          "flex h-[60px] shrink-0 items-start gap-[6px] border-b border-tp-slate-100 pt-[10px]",
          sidebar ? "pl-[10px]" : "pl-[10px]",
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
        {sidebar && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide recent conversations"
            title="Hide recent conversations"
            className="copilot-icon-btn flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] text-tp-slate-500 transition-colors duration-[var(--copilot-dur-state)] hover:bg-tp-slate-100 hover:text-tp-slate-800 active:bg-tp-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
          >
            <CopilotIcon name="sidebar-right" variant="linear" size={17} />
          </button>
        )}
        <span aria-hidden="true" className="mx-[2px] mt-[7px] h-[18px] w-px shrink-0 bg-tp-slate-200" />
        {/* 10px header padding + 7px here puts the 18px title line's centre
            on the controls' 26px line; the subtitle hangs below it. */}
        <div className="flex min-w-0 flex-col pt-[7px]">
          <h2 className="truncate text-[13.5px] font-semibold leading-[18px] text-tp-slate-800">Recent conversations</h2>
          <p className="truncate text-[11px] leading-[15px] text-tp-slate-500">
            From the last 24 hours
          </p>
        </div>
      </header>

      {/* Search across today's conversations: a patient's name, a word from
          the question, or "hospital" for the hospital-wide ones. */}
      {state.status === "ready" && state.rows.length > 0 && (
        <div className="shrink-0 px-[12px] pb-[4px] pt-[10px]">
          <label className="copilot-context-search flex h-[36px] items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-200 bg-white px-[10px]">
            <span className="flex shrink-0 items-center text-tp-slate-500">
              <CopilotIcon name="search-normal" variant="linear" size={15} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by patient name or a word you asked"
              aria-label="Search today's conversations"
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
              Nothing from today mentions &ldquo;{query.trim()}&rdquo;. Try a patient&apos;s first name or one word from the question.
            </StatePanel>
          )}

          {ready && !count && !searching && (
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
              so you can go back to it. They are kept for 24 hours.
            </StatePanel>
          )}

          {ready && count > 0 && (
            <div key="list" className="copilot-recent-in px-[8px] pb-[12px]">
              {groups.map((g) => (
                <div key={g.key} role="group" aria-labelledby={`copilot-recent-${g.key}`}>
                  <h3
                    id={`copilot-recent-${g.key}`}
                    className="px-[10px] pb-[4px] pt-[14px] text-[11px] font-semibold leading-[14px] text-tp-slate-500"
                  >
                    {g.label}
                  </h3>
                  <ul className="flex flex-col gap-[6px]">
                    {g.rows.map((row) => (
                      <SessionRow
                        key={row.session_id}
                        row={row}
                        group={g.key}
                        nowMs={nowMs}
                        active={!!activeSessionId && row.session_id === activeSessionId}
                        pending={pendingId === row.session_id}
                        failed={failedId === row.session_id}
                        locked={!!pendingId}
                        onPick={pick}
                      />
                    ))}
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

      {/* Said once, where the list ends, so a missing conversation from
          yesterday morning is not a surprise. */}
      <p className="m-0 flex shrink-0 items-center gap-[8px] border-t border-tp-warning-100 bg-tp-warning-50 px-[14px] py-[10px] text-[11.5px] leading-[16px] text-tp-warning-800">
        <CopilotIcon name="info-circle" variant="linear" size={14} className="shrink-0 text-tp-warning-600" />
        Velora keeps your conversations for 24 hours. Older ones are cleared automatically.
      </p>
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
