import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import ApiAppointments from "../../../api/services/ApiAppointments";
import { isCopilotMock, mockListPatients } from "../chart-search/copilotMock";

/**
 * The patients the context picker can switch to.
 *
 * Two lists, one control. Opened, it shows today: the clinic in front of the
 * doctor, which is what they pick from nearly every time. Typed into, it asks
 * the server, because the patient they cannot find is by definition not on
 * today's list, and filtering today's rows locally would answer "no patients
 * found" for someone who is simply booked next week.
 *
 * Same contract the appointment listing runs on (`listAppointment`: a
 * YYYY-MM-DD window, `apStatue` per tab, server-side `search`), so the names
 * and ids here are the ones the rest of the portal shows. Copilot keys on
 * `patient_unique_id`, which is what every row carries.
 */

const DATE = "YYYY-MM-DD";
const PAGE = 25;
/* Queue, arrived, engaged, finished: every state a real visit passes
   through. A patient whose appointment is done is still a patient to ask
   about, so the picker must not be limited to who is still waiting. */
const STATUSES = [0, 1, 2, 3];
/* How far back a search looks. Long enough to find last year's patient,
   short enough that the server is not asked for the whole history. */
const SEARCH_MONTHS_BACK = 24;
const SEARCH_MONTHS_AHEAD = 3;

function normaliseGender(raw) {
  const g = String(raw || "").trim().toUpperCase();
  if (g.startsWith("M")) return "M";
  if (g.startsWith("F")) return "F";
  return undefined;
}

function ageOf(rec) {
  if (rec.ageYears) return Number(rec.ageYears);
  if (rec.dob) {
    const years = moment().diff(moment(rec.dob), "years");
    return years >= 0 && years < 130 ? years : undefined;
  }
  return undefined;
}

function toOption(rec, isToday) {
  const label = rec.pm_salutation
    ? `${rec.pm_salutation} ${rec.pm_fullname || ""}`.trim()
    : rec.pm_fullname || rec.patient_name || rec.pm_first_name;
  const id = rec.patient_unique_id || rec.pm_pid || rec.pm_id;
  if (!label || !id) return null;
  const gender = normaliseGender(rec.pm_gender);
  const age = ageOf(rec);
  return {
    id: String(id),
    label,
    gender,
    age,
    meta: [gender, age != null ? `${age}y` : null, rec.pm_contact_no].filter(Boolean).join(" | "),
    pid: rec.pm_pid || rec.mrno || null,
    phone: rec.pm_contact_no || null,
    isToday,
    kind: "patient",
  };
}

async function listPatients({ start, end, search, isToday }) {
  /* Demo mode: today's six and a searchable dozen, all invented. */
  if (isCopilotMock()) return mockListPatients({ search, isToday });
  /* The contract takes one status per call, so the four go out together
     rather than one after another: a picker that opens in one round trip,
     not four. A status that fails is dropped, not fatal.

     But four drops are not "no patients". With every call swallowed, a
     dead network used to come back as an empty list, and the picker told
     the doctor "No appointments today" when it had simply not reached the
     server. Only when all of them fail is it an error, and then it is said
     as one, with a way to try again. */
  const pages = await Promise.all(
    STATUSES.map((apStatue) =>
      ApiAppointments.getAllAppointment({
        startDate: start,
        endDate: end,
        apStatue,
        filterVisitType: "",
        search: search || "",
        sortOrder: "ascend",
        page: 0,
      }).catch(() => null)
    )
  );
  if (pages.every((res) => !res)) throw new Error("patient list unreachable");

  const out = [];
  const seen = new Set();
  for (const res of pages) {
    const rows = (res && res.status && res.data && res.data.app_data) || [];
    for (const rec of rows) {
      const option = toOption(rec, isToday);
      if (!option || seen.has(option.id)) continue;
      seen.add(option.id);
      out.push(option);
      /* One page per status is the whole of today, and enough of a search to
         choose from; the doctor narrows with more words, not more scrolling. */
      if (out.length >= PAGE * 2) return out;
    }
  }
  return out;
}

export function useCopilotPatientPicker({ enabled, search }) {
  const [today, setToday] = useState([]);
  /* The server's answer, with the query it answers. Kept rather than
     cleared while the next query is in flight, so the list does not blink
     empty on every keystroke; the query it carries is what stops that kept
     answer being read as "no match" for words it was never asked about. */
  const [found, setFound] = useState(null);
  const [status, setStatus] = useState("idle");
  /* Which of the two lists failed, so a retry asks for that one again and
     the picker can say which: "could not load today" and "the search did
     not finish" ask different things of the doctor. */
  const [failed, setFailed] = useState(null);
  /* Bumped by retry(). Both effects list it, so one "Try again" re-runs
     whichever request is due without the caller knowing which that is. */
  const [attempt, setAttempt] = useState(0);
  const loadedRef = useRef(false);
  const runRef = useRef(0);

  useEffect(() => {
    if (!enabled || loadedRef.current) return undefined;
    loadedRef.current = true;
    let live = true;
    let settled = false;
    const day = moment().format(DATE);
    setStatus("loading");
    setFailed(null);
    listPatients({ start: day, end: day, isToday: true })
      .then((rows) => {
        settled = true;
        if (!live) return;
        setToday(rows);
        setStatus("ready");
      })
      .catch(() => {
        settled = true;
        /* Unlatched, so the next open (or Try again) asks afresh rather
           than showing a list that never arrived. */
        loadedRef.current = false;
        if (!live) return;
        setFailed("today");
        setStatus("error");
      });
    return () => {
      live = false;
      /* Closed before the answer came back. The latch was already set, so
         without this every later open would skip the fetch and sit on
         "loading" forever. */
      if (!settled) loadedRef.current = false;
    };
  }, [enabled, attempt]);

  const query = String(search || "").trim();

  useEffect(() => {
    if (!enabled) return undefined;
    if (query.length < 2) {
      /* Retires any search still in flight: cleared or cut back to one
         letter, the doctor is no longer asking it, and a late answer must
         not land on top of today's list. */
      runRef.current += 1;
      setFound(null);
      setStatus((s) => (s === "searching" ? "ready" : s));
      setFailed((f) => (f === "search" ? null : f));
      return undefined;
    }
    const run = ++runRef.current;
    /* Typing is a stream of queries; only the last one is worth asking. */
    const t = setTimeout(() => {
      setStatus("searching");
      setFailed((f) => (f === "search" ? null : f));
      listPatients({
        start: moment().subtract(SEARCH_MONTHS_BACK, "months").format(DATE),
        end: moment().add(SEARCH_MONTHS_AHEAD, "months").format(DATE),
        search: query,
        isToday: false,
      })
        .then((rows) => {
          if (run !== runRef.current) return;
          const todayIds = new Set(today.map((p) => p.id));
          setFound({
            query,
            rows: rows.map((p) => (todayIds.has(p.id) ? { ...p, isToday: true } : p)),
          });
          setStatus("ready");
        })
        .catch(() => {
          if (run !== runRef.current) return;
          setFailed("search");
          setStatus("error");
        });
    }, 320);
    return () => clearTimeout(t);
  }, [enabled, query, today, attempt]);

  const rows = useMemo(() => {
    if (!query) return today;
    const q = query.toLowerCase();
    const matches = (p) =>
      String(p.label || "").toLowerCase().includes(q) ||
      String(p.meta || "").toLowerCase().includes(q) ||
      String(p.id || "").toLowerCase().includes(q);
    const local = today.filter(matches);
    if (!found) return local;
    /* The last answer is kept while the next one is on its way, so the list
       does not blink on every keystroke. But an answer for "abh" is not an
       answer for "abhxq": rows from an older search are shown only if they
       still match what is typed now. Without this the picker listed, and
       pre-selected, a patient the doctor had not searched for, and Enter
       opened the wrong chart. */
    const answer = found.query === query ? found.rows : found.rows.filter(matches);
    const ids = new Set(local.map((p) => p.id));
    return [...local, ...answer.filter((p) => !ids.has(p.id))];
  }, [today, found, query]);

  const reset = useCallback(() => setFound(null), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    rows,
    status,
    searching: status === "searching",
    /* "today" or "search" while that request has failed, else null. */
    failed,
    /* True once the search for exactly what is typed has come back, so "no
       match" is only said about a search that actually ran. */
    searched: !!found && found.query === query,
    retry,
    reset,
  };
}

/**
 * Patients a question names, for the bridge between conversations.
 *
 * "What is Ramesh Patel's HbA1c?" asked hospital-wide, or inside another
 * patient's chart, is about one particular person; the answer is in their
 * chart. So the question is read for a name (two or three capitalised words,
 * never one preceded by "Dr"), the name is looked up the same way the picker
 * searches, and the matches come back as patients to move the question to.
 * Two words at least, because one capitalised word is as often a drug, a
 * test or a doctor as it is a patient.
 */
const NOT_NAMES = new Set([
  "find", "show", "what", "which", "when", "who", "whose", "how", "list", "give", "any", "all",
  "velora", "hba1c", "bp", "tsh", "ldl", "cad", "ckd", "type", "the", "patient", "patients", "chart",
  "today", "yesterday", "summarise", "summarize", "did", "does", "do", "is", "was", "are", "has", "have",
  "can", "tell", "please", "check", "dr", "doctor", "mr", "mrs", "ms", "miss", "master", "baby", "smt", "shri",
]);

export function namesInQuestion(question) {
  const text = String(question || "");
  const out = [];
  const re = /(?:^|[^A-Za-z.])((?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){1,2})(?=['’]s\b|[^A-Za-z]|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 4), m.index + 1);
    if (/dr\.?\s*$/i.test(before)) continue;
    const words = m[1].split(/\s+/).filter((w) => !NOT_NAMES.has(w.toLowerCase()));
    if (words.length >= 2) out.push(words.join(" "));
  }
  return [...new Set(out)];
}

/** One search of the whole patient list, as the picker searches it. */
export function searchPatients(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return Promise.resolve([]);
  if (isCopilotMock()) return mockListPatients({ search: q });
  return listPatients({
    start: moment().subtract(SEARCH_MONTHS_BACK, "months").format(DATE),
    end: moment().add(SEARCH_MONTHS_AHEAD, "months").format(DATE),
    search: q,
    isToday: false,
  }).catch(() => []);
}

/* Words that are never a name, for questions typed in lower case ("ramesh
   hba1c", "symptoms of kavita"): the clinical vocabulary a doctor asks with,
   on top of the question words above. */
const NOT_NAMES_LOWER = new Set([
  ...NOT_NAMES,
  "symptoms", "symptom", "history", "medical", "medication", "medications", "medicines", "medicine",
  "latest", "last", "recent", "lab", "labs", "results", "result", "report", "reports", "sugar", "glucose",
  "pressure", "blood", "diagnosis", "condition", "conditions", "allergy", "allergies", "vitals", "summary",
  "summarise", "about", "with", "for", "and", "the", "his", "her", "their", "of", "on", "in", "me", "my",
  "visit", "visits", "prescription", "advice", "family", "weight", "thyroid", "diabetes", "level", "levels",
]);

/* Candidate names in a question typed without capitals: two neighbouring
   name-like words first ("ramesh patel"), then single ones ("ramesh"). */
function lowerCaseNames(question) {
  const words = String(question || "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !NOT_NAMES_LOWER.has(w));
  const pairs = [];
  for (let i = 0; i < words.length - 1; i++) pairs.push(`${words[i]} ${words[i + 1]}`);
  return [...pairs, ...words].slice(0, 4);
}

/* What in a question points at one patient, strongest first: a mobile
   number, a patient ID, a capitalised name, a possessive ("akhil's"). Each
   is a reason to show the patient search even when nothing matches, because
   the doctor plainly meant someone. */
function strongIdentifiers(question) {
  const text = String(question || "")
  const out = []
  const phone = text.match(/\b\d{10}\b/)
  if (phone) out.push(phone[0])
  const id = text.match(/\b(?:pat|mrn|uhid)[-\s]?\d{3,}\b/i)
  if (id) out.push(id[0].toUpperCase().replace(/\s+/g, ""))
  out.push(...namesInQuestion(text))
  const possessive = [...text.matchAll(/\b([A-Za-z]{3,})['’]s\b/g)]
    .map((m) => m[1])
    .filter((w) => !NOT_NAMES_LOWER.has(w.toLowerCase()))
  out.push(...possessive)
  return [...new Set(out)]
}

/* `lowerCase` also reads names typed without capitals. Only for a
   hospital-wide chat, where a name is the only thing a question can be
   about; inside a patient's chat it would search on every clinical word.

   Returns `{ name, patients }`. `patients` can be empty when the question
   clearly named someone (a number, an ID, a name) but no one matched: the
   card then opens on that search with nothing found, ready to correct. */
export async function findPatientsNamed(question, { lowerCase = false } = {}) {
  const strong = strongIdentifiers(question);
  const names = strong.length ? strong : lowerCase ? lowerCaseNames(question) : [];
  for (const name of names) {
    const rows = await searchPatients(name);
    if (rows && rows.length) {
      const display = /\d/.test(name) ? name : name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
      return { name: display, patients: rows.slice(0, 4) };
    }
  }
  if (strong.length) {
    const first = strong[0];
    return { name: /\d/.test(first) ? first : first.replace(/\b[a-z]/g, (c) => c.toUpperCase()), patients: [] };
  }
  return null;
}
