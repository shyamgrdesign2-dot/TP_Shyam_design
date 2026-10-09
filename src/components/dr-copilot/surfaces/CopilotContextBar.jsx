import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Tooltip } from "@dhspl-tatvacare/tesseract-ui"
import { CopilotIcon } from "../ui/CopilotIcon"
import { isCopilotMock, mockPatientMeta } from "../chart-search/copilotMock"
import { useCopilotPatientPicker } from "./useCopilotPatientPicker"
import { COPILOT_SCOPE_MENU_EVENT, canScopeToMine, hospitalGroupLabel } from "./copilotScopeStore"

/**
 * What Velora is answering about, and the one place it changes.
 *
 * Velora answers in two scopes that read identically in a chat log: one
 * patient's chart, or every patient in the hospital. A doctor who cannot see
 * which one they are in either asks a chart question of the hospital or reads
 * a hospital answer as if it were their patient's.
 *
 * So the scope is a floating tag at the top, in both scopes, carrying the
 * patient's name with their sex and age - the Dr. Agent prototype's chip, the
 * same glass and proportions - and it opens the prototype's own context
 * picker: the two hospital scopes, a divider, then today's patients with a
 * search over them. Everything about who is being discussed lives up here;
 * the composer below used to carry a second copy of it, which meant two
 * places to look and two places to keep right.
 *
 * The picker is written for a doctor between two patients, not for someone
 * exploring a product. Every line in it either says what a choice does or
 * says what to do next: the notes wrap instead of trailing off mid-sentence,
 * the row in use says "Current" in words as well as in colour, the scope that
 * does not work yet says so on its face, and every empty, loading and failed
 * list ends in an instruction rather than a dead end. It is also a proper
 * combobox: focus stays in the search, the arrow keys walk the rows, Enter
 * takes the highlighted one (the top match while typing, so "name, Enter" is
 * a whole switch), Escape closes it and puts focus back on the chip.
 */

const HOSPITAL_NOTE = "Finds patients across the hospital, not one chart."
const MINE_NOTE = "Only the patients you have treated."
const MINE_TIP = "Coming soon. For now, use All hospital patients to find a patient."
const PATIENT_NOTE = "Answers from this chart only, with citations you can open."
const SEARCH_PLACEHOLDER = "Search by patient name or mobile number"

/* The search answers from the server only from two letters on (see the
   picker hook); one letter filters today's list and nothing more, which is
   worth saying so a single letter does not look like a failed search. */
const MIN_SEARCH = 2

/** "2 questions asked" or nothing, so a switch is predictable before it is made. */
function waiting(count) {
  if (!count) return null
  return count === 1 ? "1 question asked" : `${count} questions asked`
}

/* The chip and the rows write sex and age the same way, "M, 34y", so the
   patient the doctor picked is recognisably the patient the chip names. */
function sexAge(p) {
  return [p.gender, p.age != null ? `${p.age}y` : null].filter(Boolean).join(", ")
}

function patientLine(p) {
  const phone = String(p.meta || "").split("|").map((x) => x.trim()).find((x) => /^\+?\d[\d\s-]{6,}$/.test(x))
  return [p.gender, p.age != null ? `${p.age}y` : null, phone].filter(Boolean).join("  |  ")
}

/* The radio, drawn the way the Dr. Agent prototype draws it: a ring that
   fills with a dot when chosen. It is a form control rather than an icon,
   so it is drawn here, not taken from the icon set. */
function Mark({ on, disabled }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-[var(--copilot-dur-state)]",
        on ? "border-tp-blue-500" : disabled ? "border-tp-slate-200" : "border-tp-slate-300",
      ].join(" ")}
    >
      {on && <span className="h-[8px] w-[8px] rounded-full bg-tp-blue-500" />}
    </span>
  )
}

/* Bulk glyphs, from the Tesseract set: hospital-building-4 for the whole
   hospital, profile-2user for "my patients", users/user for one patient. */
const AVATAR_ASSET = {
  hospital: "medical/hospital-building-4",
  mine: "users/profile-2user",
  user: "users/user",
}

function Avatar({ icon, on, disabled }) {
  return (
    <span
      className={[
        "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] transition-colors duration-[var(--copilot-dur-state)] motion-reduce:transition-none",
        on
          ? "bg-tp-blue-100 text-tp-blue-600"
          : disabled
            ? "bg-tp-slate-100 text-tp-slate-300"
            : "bg-tp-slate-200/60 text-tp-slate-500",
      ].join(" ")}
    >
      <CopilotIcon asset={AVATAR_ASSET[icon] || AVATAR_ASSET.user} variant="bulk" size={16} />
    </span>
  )
}

/* A small word in a pill. Words rather than colour alone, so "Current" and
   "Coming soon" read on a washed-out clinic monitor and to a screen reader. */
function Tag({ tone, children }) {
  const tones = {
    current: "bg-tp-blue-100 text-tp-blue-700",
    soon: "bg-tp-slate-100 text-tp-slate-600",
    today: "bg-tp-success-50 text-tp-success-700",
  }
  return (
    <span
      className={[
        "shrink-0 whitespace-nowrap rounded-[6px] px-[6px] py-[2px] text-[10.5px] font-semibold leading-[14px]",
        tones[tone],
      ].join(" ")}
    >
      {children}
    </span>
  )
}

/* One choosable line. `on` is the scope Velora is in now (selected);
   `active` is the row the keyboard or pointer is on (highlighted). They are
   separate states and look separate: a highlighted row is grey, the current
   row is violet with an edge, and the current row under the pointer is a
   deeper violet, so both can be read at once. */
function Row({ id, icon, title, note, meta, wrapNote, on, active, count, disabled, onPick, onHover, tag }) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      tabIndex={-1}
      aria-selected={on}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onPick}
      onMouseMove={disabled ? undefined : onHover}
      title={disabled ? MINE_TIP : undefined}
      className={[
        "flex w-full items-center gap-[10px] rounded-[10px] px-[10px] py-[8px] text-left outline-none",
        "transition-colors duration-[var(--copilot-dur-press)] motion-reduce:transition-none",
        "focus-visible:shadow-[inset_0_0_0_2px_var(--tp-blue-500)]",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        on
          ? active
            ? "bg-tp-blue-100/70"
            : "bg-tp-blue-50"
          : active
            ? "bg-tp-slate-100"
            : "",
        !disabled && !on ? "active:bg-tp-slate-200" : "",
      ].join(" ")}
    >
      <Mark on={on} disabled={disabled} />
      <Avatar icon={icon} on={on} disabled={disabled} />
      <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <span
          className={[
            "truncate text-[13px] font-semibold leading-[1.3]",
            on ? "text-tp-blue-700" : disabled ? "text-tp-slate-500" : "text-tp-slate-800",
          ].join(" ")}
        >
          {title}
        </span>
        <span
          className={[
            "text-[11.5px] leading-[1.4]",
            disabled ? "text-tp-slate-400" : "text-tp-slate-500",
            wrapNote ? "" : "truncate",
          ].join(" ")}
        >
          {meta || note}
        </span>
      </span>
      {(tag || count) && (
        <span className="flex shrink-0 flex-col items-end gap-[3px] self-start pt-[1px]">
          {tag}
          {count && <span className="whitespace-nowrap text-[10.5px] font-medium text-tp-slate-500">{count}</span>}
        </span>
      )}
    </button>
  )
}

/* Rows-shaped placeholders while the list is on its way, so the picker
   keeps its size and the doctor sees where the names will land. */
function SkeletonRows({ label }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-[2px] px-[2px]">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-[10px] px-[10px] py-[8px]" aria-hidden="true">
          <span className="h-[16px] w-[16px] shrink-0 rounded-full bg-tp-slate-100" />
          <span className="h-[32px] w-[32px] shrink-0 animate-pulse rounded-[10px] bg-tp-slate-100 motion-reduce:animate-none" />
          <span className="flex flex-1 flex-col gap-[6px]">
            <span
              className="h-[10px] animate-pulse rounded-[4px] bg-tp-slate-200 motion-reduce:animate-none"
              style={{ width: `${62 - i * 12}%` }}
            />
            <span className="h-[8px] w-[28%] animate-pulse rounded-[4px] bg-tp-slate-100 motion-reduce:animate-none" />
          </span>
        </div>
      ))}
    </div>
  )
}

/* Every state with no rows to show ends here: what happened, in a line,
   then what to do about it, then the one control that does it. */
function ListMessage({ icon, title, body, action, onAction, tone = "neutral" }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className="flex flex-col items-center px-[16px] py-[18px] text-center">
      <span
        className={[
          "mb-[8px] flex h-[36px] w-[36px] items-center justify-center rounded-[12px]",
          tone === "error" ? "bg-tp-error-50 text-tp-error-500" : "bg-tp-slate-100 text-tp-slate-500",
        ].join(" ")}
      >
        <CopilotIcon name={icon} variant="linear" size={18} />
      </span>
      <p className="m-0 text-[13px] font-semibold leading-[1.35] text-tp-slate-800">{title}</p>
      {body && <p className="m-0 mt-[2px] max-w-[260px] text-[12px] leading-[1.45] text-tp-slate-500">{body}</p>}
      {action && (
        <ActionButton onClick={onAction} className="mt-[10px]">
          {action}
        </ActionButton>
      )}
    </div>
  )
}

/* A plain text action inside the picker: "Try again", "Clear search". */
function ActionButton({ onClick, className = "", children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-[32px] items-center gap-[6px] rounded-[10px] border-[1px] border-tp-blue-200 bg-white px-[12px] text-[12.5px] font-semibold text-tp-blue-600 outline-none",
        "transition-colors duration-[var(--copilot-dur-press)] hover:bg-tp-blue-50 active:bg-tp-blue-100 motion-reduce:transition-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

/* A one-line footnote under rows that are on screen but not the whole
   answer: a search that failed behind today's matches, a single letter. */
function InlineNote({ children, action, onAction, tone = "neutral" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={[
        "mx-[2px] mt-[6px] flex items-center gap-[8px] rounded-[8px] px-[10px] py-[7px] text-[11.5px] leading-[1.4]",
        tone === "error" ? "bg-tp-error-50 text-tp-error-700" : "bg-tp-slate-100 text-tp-slate-600",
      ].join(" ")}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-[28px] shrink-0 items-center rounded-[8px] px-[8px] text-[12px] font-semibold text-tp-blue-600 underline-offset-2 outline-none hover:bg-tp-blue-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
        >
          {action}
        </button>
      )}
    </div>
  )
}

export default function CopilotContextBar({
  patientName,
  patientMeta,
  clinic,
  patients = [],
  activePatientId,
  onPickPatient,
  onPickClinic,
  /* Which patients a hospital-wide question covers: "mine" or "all". */
  group = "all",
  patientQuestions = 0,
  clinicQuestions = 0,
}) {
  const [open, setOpen] = useState(false)
  /* Still in the DOM while it fades out. Closing is quicker than opening
     and only fades, so the list is gone by the time the doctor looks back
     at the thread. */
  const [present, setPresent] = useState(false)
  const [search, setSearch] = useState("")
  /* Opened from "New chat": the pick starts a fresh conversation. */
  const [fresh, setFresh] = useState(false)
  /* The highlighted row, as an index into `options`; -1 is none. */
  const [active, setActive] = useState(-1)
  const wrapRef = useRef(null)
  const chipRef = useRef(null)
  const searchRef = useRef(null)
  /* Only keyboard moves scroll the list; a row scrolling itself under a
     moving pointer would chase the mouse. */
  const moveByKey = useRef(false)

  const uid = useId().replace(/[:]/g, "")
  const popupId = `copilot-scope-${uid}`
  const titleId = `${popupId}-title`
  const scopesId = `${popupId}-scopes`
  const listId = `${popupId}-patients`
  const optionId = (i) => `${popupId}-opt-${i}`

  /* The picker opens as a sheet inside the panel, not a dropdown under the
     tag: a dropdown had room for four patients, a sheet has room for the
     clinic. It is portalled into the panel root so it can cover the panel. */
  const sheetRef = useRef(null)
  const [panelEl, setPanelEl] = useState(null)
  useEffect(() => {
    if (wrapRef.current) setPanelEl(wrapRef.current.closest("#dr-agent-panel-root"))
  }, [])

  const close = useCallback((returnFocus) => {
    setOpen(false)
    /* Straight back to the chip, the control that opened it, so a keyboard
       user is where they started and the next Enter reopens the picker. */
    if (returnFocus && chipRef.current) chipRef.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (open) {
      setPresent(true)
      return undefined
    }
    if (!present) return undefined
    const t = setTimeout(() => setPresent(false), 140)
    return () => clearTimeout(t)
  }, [open, present])

  /* A switch is quiet by design. The tag it changed is what confirms it, so
     it rings once, and says so to a screen reader in the same breath. */
  const [flash, setFlash] = useState(false)
  const [announce, setAnnounce] = useState("")
  const mineOn = !!clinic && group === "mine"
  const mineAvailable = canScopeToMine()
  const scopeId = clinic ? `__clinic_${group}__` : activePatientId || patientName || "__none__"
  const seen = useRef(scopeId)
  const label = clinic ? hospitalGroupLabel(group) : patientName || "Choose a patient"
  const meta = clinic ? null : patientMeta
  const tipMeta = clinic ? null : patientMeta || (isCopilotMock() ? mockPatientMeta(activePatientId) : null)
  useEffect(() => {
    if (seen.current === scopeId) return undefined
    seen.current = scopeId
    setFlash(true)
    setAnnounce(`Velora is now answering about ${label}.`)
    const t = setTimeout(() => setFlash(false), 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId])

  /* The empty state names the scope and offers to change it; this is the
     tag opening because that text was clicked. */
  useEffect(() => {
    const onAsk = (e) => {
      setFresh(!!(e && e.detail && e.detail.fresh))
      setOpen(true)
    }
    window.addEventListener(COPILOT_SCOPE_MENU_EVENT, onAsk)
    return () => window.removeEventListener(COPILOT_SCOPE_MENU_EVENT, onAsk)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    setSearch("")
    setActive(-1)
    /* The picker renders in the same commit that opens it, so the field is
       already there: straight into the search, ready to type a name. */
    if (searchRef.current) searchRef.current.focus({ preventScroll: true })
    const onDown = (e) => {
      const inside =
        (wrapRef.current && wrapRef.current.contains(e.target)) ||
        (sheetRef.current && sheetRef.current.contains(e.target))
      if (!inside) close(false)
    }
    /* Captured on the window, ahead of everything else. The popup that
       holds this chip closes itself on Escape from a window listener of its
       own, so a picker that merely listened alongside it took the whole of
       Velora down with it. Escape here closes the picker and nothing else. */
    const onKey = (e) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      close(true)
    }
    /* Outside presses are caught in the capture phase too. The popup stops
       mousedown at its own surface (so a click inside it does not close
       Velora), and React listens at the portal root, so a bubbling listener
       here never heard a click on the thread: the picker stayed open over
       the conversation. Pointer events also cover touch on an iPad. */
    document.addEventListener("pointerdown", onDown, true)
    window.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("keydown", onKey, true)
    }
  }, [open, close])

  /* Today's list when it opens, the server's answer once the doctor types.
     Rows already known to the page (the appointment list, when it populates
     the store) come in as `patients` and go first, so the picker is never
     empty while the fetch is in flight. */
  const {
    rows: fetched,
    status: listStatus,
    searching,
    failed,
    searched,
    retry,
  } = useCopilotPatientPicker({
    enabled: open,
    search,
  })

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const known = q
      ? patients.filter(
          (p) =>
            String(p.label || "").toLowerCase().includes(q) ||
            String(p.meta || "").toLowerCase().includes(q) ||
            String(p.id || "").toLowerCase().includes(q)
        )
      : patients.filter((p) => p.isToday)
    const ids = new Set(known.map((p) => p.id))
    const base = [...known, ...fetched.filter((p) => !ids.has(p.id))]
    /* The patient in scope stays at the top, wherever they came from. */
    if (!clinic && activePatientId) {
      const i = base.findIndex((p) => p.id === activePatientId)
      if (i > 0) base.unshift(base.splice(i, 1)[0])
    }
    return base
  }, [patients, fetched, search, clinic, activePatientId])

  /* Every row the keyboard can land on, in screen order: the two hospital
     scopes, then the patients. The disabled one is listed so the indexes
     match the screen, and skipped when moving. */
  const PATIENT_START = 2
  const options = useMemo(
    () => [
      { kind: "clinic" },
      { kind: "mine", disabled: !mineAvailable },
      ...shown.map((p) => ({ kind: "patient", patient: p })),
    ],
    [shown, mineAvailable]
  )

  const query = search.trim()
  /* Typing highlights the top match without an arrow press, so Enter after
     a name takes that patient. An explicit arrow choice overrides it.

     Only once the search for exactly these words has answered. Before that
     the top row is whatever the last answer or today's list happened to put
     first, and "name, Enter" would open that chart: the wrong patient, with
     nothing on screen to say so. A row the doctor chose with the arrow keys
     is always honoured; it was picked, not guessed. */
  /* Nor on one letter: it matches nearly everyone on today's list. */
  const settled = query.length >= MIN_SEARCH && searched
  const highlighted =
    active >= 0 && active < options.length
      ? active
      : settled && shown.length
        ? PATIENT_START
        : -1

  useEffect(() => {
    setActive(-1)
  }, [search])

  useEffect(() => {
    if (!moveByKey.current || highlighted < 0) return
    moveByKey.current = false
    const el = document.getElementById(optionId(highlighted))
    if (el) el.scrollIntoView({ block: "nearest" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted])

  /* Focus goes back to the chip after a keyboard pick, where the keyboard
     user started. After a click it is left alone: sending it to the chip
     would draw the keyboard ring on a control the doctor never tabbed to. */
  const pick = (option, viaKey) => {
    if (!option || option.disabled) return
    close(!!viaKey)
    const opts = fresh ? { fresh: true } : undefined
    setFresh(false)
    if (option.kind === "clinic" || option.kind === "mine") {
      const want = option.kind === "mine" ? "mine" : "all"
      if ((fresh || !clinic || group !== want) && onPickClinic) onPickClinic(want, opts)
      return
    }
    const p = option.patient
    const isCurrent = !clinic && p.id === activePatientId
    if ((fresh || !isCurrent) && onPickPatient) onPickPatient(p, opts)
  }

  const move = (dir) => {
    const n = options.length
    let i = highlighted
    for (let step = 0; step < n; step += 1) {
      i = i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n
      if (!options[i].disabled) {
        moveByKey.current = true
        setActive(i)
        return
      }
    }
  }

  const onPopupKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      move(e.key === "ArrowDown" ? 1 : -1)
    } else if (e.key === "Enter" && highlighted >= 0 && e.target === searchRef.current) {
      e.preventDefault()
      pick(options[highlighted], true)
    }
  }

  /* Tabbing past the last control in the picker leaves it, and a picker
     left by the keyboard closes; a click elsewhere is the mousedown
     listener's job, which is why a blur with nowhere to go is ignored. */
  const onWrapBlur = (e) => {
    const next = e.relatedTarget
    const inside =
      (wrapRef.current && wrapRef.current.contains(next)) ||
      (sheetRef.current && sheetRef.current.contains(next))
    if (open && next && !inside) close(false)
  }

  const clearSearch = () => {
    setSearch("")
    if (searchRef.current) searchRef.current.focus()
  }

  /* What the list area says when it has no rows, in priority order. */
  let emptyState = null
  if (shown.length === 0) {
    if (failed === "search" && query.length >= MIN_SEARCH) {
      emptyState = (
        <ListMessage
          tone="error"
          icon="cloud-cross"
          title="The search did not finish"
          body="Check your internet connection, then try again."
          action="Try again"
          onAction={retry}
        />
      )
    } else if (failed === "today" && !query) {
      emptyState = (
        <ListMessage
          tone="error"
          icon="cloud-cross"
          title="Could not load today's patients"
          body="Check your internet connection, then try again. You can still search by name above."
          action="Try again"
          onAction={retry}
        />
      )
    } else if (query.length >= MIN_SEARCH && (searching || !searched)) {
      emptyState = <SkeletonRows label={`Searching all patients for ${query}`} />
    } else if (!query && listStatus === "loading") {
      emptyState = <SkeletonRows label="Loading today's patients" />
    } else if (query && query.length < MIN_SEARCH) {
      emptyState = (
        <ListMessage
          icon="search-normal"
          title="Keep typing"
          body="Type at least 2 letters to search all patients."
        />
      )
    } else if (query) {
      emptyState = (
        <ListMessage
          icon="search-zoom-out"
          title={`No patient found for "${query}"`}
          body="Check the spelling, or search by patient ID or mobile number instead."
          action="Clear search"
          onAction={clearSearch}
        />
      )
    } else {
      emptyState = (
        <ListMessage
          icon="calendar-1"
          title="No appointments today"
          body="To find any other patient, type their name, ID or mobile number in the search above."
        />
      )
    }
  }

  const listLabel = query ? `Patients matching "${query}"` : "Today's appointments"
  /* Rendered from the moment it opens (not a commit later, which would
     leave the search field missing when focus is sent to it) until the
     fade-out is done. */
  const mounted = open || present
  const leaving = present && !open

  return (
    <div className="relative inline-block max-w-full" ref={wrapRef} onBlur={onWrapBlur}>
      {/* The chat's heading: whose chat this is, fixed to it. A patient's
          tag adds age, sex and ID to tell two of one name apart. Another
          chat starts from the sidebar, or by asking about a patient by name,
          which offers them to pick. */}
      <span
        role="status"
        aria-label={`Velora is answering about ${label}${tipMeta ? `, ${tipMeta}` : ""}`}
        className={[
          "copilot-context-chip copilot-scope-heading inline-flex max-w-[360px] items-center gap-[6px] px-[10px]",
          flash ? "copilot-context-chip--flash" : "",
        ].join(" ")}
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-tp-slate-600">
          <CopilotIcon
            asset={mineOn ? "users/profile-2user" : clinic ? "medical/hospital-building-4" : "users/user"}
            variant="bulk"
            size={16}
            style={{ display: "block" }}
          />
        </span>
        <span className="truncate text-[12.5px] font-medium leading-[16px] text-tp-slate-800">{label}</span>
        {!clinic && tipMeta && (
          <span className="shrink-0 whitespace-nowrap text-[12px] leading-[16px] tabular-nums text-tp-slate-500">
            ({tipMeta})
          </span>
        )}
      </span>

      {mounted && panelEl && createPortal(
        <div
          className="absolute inset-0 z-[60] flex flex-col justify-end"
          style={
            leaving
              ? {
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity var(--copilot-dur-exit, 140ms) var(--copilot-ease-in, ease-in)",
                }
              : undefined
          }
        >
          {/* The page behind steps back, and a tap on it closes the sheet. */}
          <div
            aria-hidden="true"
            className="copilot-sheet-backdrop absolute inset-0 bg-[rgba(15,23,42,0.42)]"
            onClick={() => close(true)}
          />
        <div
          id={popupId}
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={onPopupKeyDown}
          className="copilot-sheet-up relative mx-auto flex h-[min(72%,640px)] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[18px] bg-tp-slate-50 shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)]"
        >
          {/* A grabber, so it reads as a sheet that came up, not a page. */}
          <span aria-hidden="true" className="mx-auto mt-[8px] h-[4px] w-[36px] shrink-0 rounded-full bg-tp-slate-300" />
          <div className="flex shrink-0 items-center justify-between gap-[10px] px-[18px] pb-[8px] pt-[8px]">
            <p id={titleId} className="m-0 text-[14px] font-semibold leading-[20px] text-tp-slate-800">
              {fresh ? "Start a new chat with" : "Choose what Velora answers about"}
            </p>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close"
              title="Close"
              className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] text-tp-slate-600 transition-colors hover:bg-tp-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
            >
              <CopilotIcon name="close-square" variant="bold" size={22} />
            </button>
          </div>
          <div className="mx-[18px] shrink-0 border-t border-tp-slate-200" />

          <div id={scopesId} role="listbox" aria-label="Hospital scopes" className="flex shrink-0 flex-col gap-[2px] px-[8px] pt-[8px]">
            <Row
              id={optionId(0)}
              icon="hospital"
              title="All hospital patients"
              note={HOSPITAL_NOTE}
              wrapNote
              on={!!clinic && !mineOn}
              active={highlighted === 0}
              count={clinic && !mineOn ? waiting(clinicQuestions) : null}
              onHover={() => setActive(0)}
              onPick={() => pick(options[0])}
            />
            {/* Chosen like any other scope where it can be kept (demo data
                today). Against the live record search it stays visible but
                disabled, saying "Coming soon": the service takes no doctor
                scope yet, so a search worded that way would quietly return
                the whole hospital. */}
            <Row
              id={optionId(1)}
              icon="mine"
              title="All my patients"
              note={MINE_NOTE}
              wrapNote
              on={mineOn}
              disabled={!mineAvailable}
              active={highlighted === 1}
              count={mineOn ? waiting(clinicQuestions) : null}
              tag={mineAvailable ? null : <Tag tone="soon">Coming soon</Tag>}
              onHover={mineAvailable ? () => setActive(1) : undefined}
              onPick={mineAvailable ? () => pick(options[1]) : undefined}
            />
          </div>

          <div className="relative mx-[18px] my-[8px] shrink-0" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-tp-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-tp-slate-50 px-[10px] text-[11.5px] font-medium text-tp-slate-500">
                or choose one patient
              </span>
            </div>
          </div>

          <div className="shrink-0 px-[12px] pb-[6px]">
            <div className="copilot-context-search flex h-[38px] items-center gap-[8px] rounded-[10px] border-[1px] border-tp-slate-200 bg-white px-[10px]">
              <span className="shrink-0 text-tp-slate-500">
                <CopilotIcon name="search-normal" variant="linear" size={16} />
              </span>
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-label="Search patients by name, patient ID or mobile number"
                aria-expanded="true"
                aria-controls={`${scopesId} ${listId}`}
                aria-autocomplete="list"
                aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
                autoComplete="off"
                spellCheck={false}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                className="h-full w-full min-w-0 bg-transparent text-[13px] text-tp-slate-800 outline-none placeholder:text-tp-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  title="Clear search"
                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] text-tp-slate-500 outline-none transition-colors duration-[var(--copilot-dur-press)] hover:bg-tp-slate-100 hover:text-tp-slate-600 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tp-blue-500"
                >
                  <CopilotIcon name="close-circle" variant="linear" size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-[8px] px-[18px] pb-[4px] pt-[4px]">
            <span className="truncate text-[11px] font-semibold leading-[14px] text-tp-slate-500">
              {listLabel}
            </span>
            {searching && shown.length > 0 ? (
              <span role="status" className="flex shrink-0 items-center gap-[5px] text-[11px] font-medium text-tp-blue-600">
                <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-tp-blue-500 motion-reduce:animate-none" />
                Searching all patients
              </span>
            ) : shown.length > 0 ? (
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-tp-slate-500">{shown.length}</span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[8px] pb-[10px]">
            {emptyState || (
              <>
                <div id={listId} role="listbox" aria-label={listLabel} className="flex flex-col gap-[2px]">
                  {shown.map((p, i) => {
                    const index = PATIENT_START + i
                    const on = !clinic && p.id === activePatientId
                    /* Sex, age and mobile, which is how a doctor tells two
                       patients of the same name apart at a glance; the long
                       record ID meant nothing to read. */
                    const line = patientLine(p)
                    return (
                      <Row
                        key={p.id}
                        id={optionId(index)}
                        icon="user"
                        title={p.label}
                        note={PATIENT_NOTE}
                        meta={line || p.meta}
                        on={on}
                        active={highlighted === index}
                        count={on ? waiting(patientQuestions) : null}
                        tag={
                          query && p.isToday ? (
                            <Tag tone="today">Today</Tag>
                          ) : null
                        }
                        onHover={() => setActive(index)}
                        onPick={() => pick(options[index])}
                      />
                    )
                  })}
                </div>
                {failed === "search" && query.length >= MIN_SEARCH && (
                  <InlineNote tone="error" action="Try again" onAction={retry}>
                    Could not search all patients. Showing today&apos;s matches only.
                  </InlineNote>
                )}
                {failed === "today" && !query && (
                  <InlineNote tone="error" action="Try again" onAction={retry}>
                    Today&apos;s full list did not load.
                  </InlineNote>
                )}
                {query && query.length < MIN_SEARCH && (
                  <InlineNote>Showing today&apos;s matches. Type one more letter to search all patients.</InlineNote>
                )}
              </>
            )}
          </div>

          <p className="m-0 shrink-0 border-t border-tp-slate-200 bg-white px-[18px] py-[9px] text-[11.5px] leading-[16px] text-tp-slate-500">
            Each choice keeps its own conversation, so switching never mixes them.
          </p>
        </div>
        </div>,
        panelEl
      )}

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  )
}
