# Syncing a doctor's schedule to Google Calendar

**Status:** proposal. Nothing in this document is implemented. The portal today
ships one option only — **Download .ics** in the toolbar's overflow menu
(available in both the table and calendar views), which exports whatever the
current tab, date and filters have narrowed to.

This document exists so the team can decide *whether* and *how* to go further.
It covers the two viable designs, what each costs, and what the backend would
have to build.

---

## 1. The constraint everything follows from

There is no way to make Google Calendar import a file automatically from the
browser. Three things look like they would work and none do:

| Idea | Why it fails |
|---|---|
| Link that downloads `.ics` and opens it in Google Calendar | The browser hands the file to the OS, which opens the *desktop* calendar app. A web page cannot direct it. |
| `calendar.google.com/render?cid=<url>` or `webcal://<url>` | Takes a **URL that Google's servers fetch**, not file content. A `blob:` URL from a download only exists inside the user's browser. |
| POST the `.ics` body to a Google endpoint | No such endpoint exists. Import is a manual file picker under Settings → Import. |

So automatic sync requires **either** an authenticated API call **or** a
publicly fetchable URL. There is no third door, and no "no auth, no server"
option. Everything below is a consequence of that.

---

## 2. Option A — OAuth push ("Sync" button)

The doctor presses a button; the portal writes events into their calendar
through the Google Calendar API.

**How it works.** Google Identity Services in the browser opens Google's own
consent dialog and returns an access token. The portal `POST`s each appointment
to `calendar/v3/calendars/primary/events`.

**Backend required:** none, if a session-scoped button is acceptable.

**Setup:** a Google Cloud project, an OAuth client ID with the portal's origins
whitelisted, scope `https://www.googleapis.com/auth/calendar.events`, and an
app-verification review by Google if this ships beyond internal users.

### What it can and cannot do

* One press syncs everything currently on screen. No file, no import screen.
* **It cannot run in the background.** A browser-only flow receives an access
  token valid for about an hour and **no refresh token** — Google issues those
  only to a confidential (server-side) client. Nothing syncs while the tab is
  closed. If "automatic" means unattended, this option does not deliver it
  without a backend that stores refresh tokens per doctor.

### Making it safe to press twice

Give every event a deterministic id derived from the appointment id, so a
second run **updates** rather than duplicates. Google requires ids to be
base32hex (`0-9`, `a-v`) and **at least 5 characters** — a low appointment id
like `1` produces a 3-character id that the API rejects, so pad it.

```
id = "tp" + Number(pam_id).toString(32).padStart(6, "0")
```

Handle `409 Conflict` on insert as "already there" and `PUT` to update instead.
Push cancelled appointments with `status: "cancelled"` so they grey out rather
than linger.

### If unattended sync is the actual requirement

The backend stores a refresh token per doctor and runs the sync server-side.
That means holding long-lived Google credentials for every doctor, plus token
refresh, revocation handling and re-consent flows. It is real work and a real
secret-management responsibility. Worth it only if hands-off sync is a
committed product requirement.

---

## 3. Option B — subscribable `.ics` feed

The doctor pastes one URL into Google Calendar once. Google polls it forever
after. No button, no OAuth, no file.

```
https://tatvapractice.in/ics/{doctorId}/{token}.ics
```

**Backend required:** yes. This is the option that genuinely needs the team.

### 3.1 Security model — read this before designing anything else

Calendar clients fetch feed URLs **anonymously**. Google's fetcher sends no
cookies, no `Authorization` header, and follows no login redirect. **The URL
cannot be protected by a session.** Its only protection is being unguessable —
a *capability URL*. Anyone holding the link can read that doctor's schedule
until the token is rotated.

That is a genuine trade-off, not an oversight, and it needs an owner.
Mitigations are not optional:

| Risk | Mitigation |
|---|---|
| Link leaks (shared screen, forwarded mail, browser history) | Rotation endpoint; the old token dies immediately |
| Token guessed | ≥ 160 bits from a CSPRNG. Never sequential, never derived from `doctorId` |
| Crawler indexes it | `X-Robots-Tag: noindex, nofollow`; never render the URL into any HTML page |
| Unbounded historical exposure | Serve a rolling window (§3.4), never the full history |
| Silent long-term exposure | Log every fetch (time, IP, user agent); surface "last fetched" in the UI |

### 3.2 Authenticated endpoints (normal session)

**`GET /api/v1/appointment/calendarFeed`** — returns the caller's link,
creating one on first call.

```json
{
  "status": true,
  "data": {
    "url": "https://tatvapractice.in/ics/8f2c.../c7b1e9d4a2f60b83e5147ac9d0f3128b6e5a97c4.ics",
    "createdAt": "2026-08-12T04:10:00Z",
    "lastFetchedAt": "2026-08-12T09:00:11Z"
  }
}
```

`lastFetchedAt` is `null` until a calendar client has actually polled it. The
UI uses it to confirm the subscription is live.

**`POST /api/v1/appointment/calendarFeed/rotate`** — invalidates the current
token, returns a new one. Existing subscriptions break by design; the UI must
say so before calling.

### 3.3 The public endpoint

**`GET /ics/{doctorId}/{token}.ics`** — unauthenticated; this is what Google
fetches.

* `200` with `Content-Type: text/calendar; charset=utf-8`
* `404` for an unknown or rotated token. **Never `401`/`403`** — a 404 leaks
  nothing about whether the doctor exists.
* Constant-time token comparison. Never log the token itself.
* Rate-limit per IP. Google polls hourly at best; anything faster is a
  misconfigured client or someone probing.

```
Content-Type: text/calendar; charset=utf-8
Cache-Control: private, max-age=900
ETag: "<hash of the generated body>"
X-Robots-Tag: noindex, nofollow
Content-Disposition: inline; filename="tatvapractice.ics"
```

Honour `If-None-Match` and return `304` when unchanged — Google polls far more
often than a clinic's schedule changes.

### 3.4 Feed contents

**Window:** `today − 7 days` to `today + 60 days`, rolling. Keeps the payload
small and caps what a leaked link exposes.

**Statuses:** queue, finished and draft as normal events. Cancelled ones
included with `STATUS:CANCELLED`, so they disappear from the doctor's calendar
instead of lingering.

---

## 4. What may be shared (applies to both options)

Agreed with the practice. **This list is a ceiling, not a default.**

| Property | Content |
|---|---|
| `SUMMARY` | `<patient name> (<visit type>)` |
| `DESCRIPTION` | `Patient ID` · `Age/Sex` · `Visit` · `Category` |
| `LOCATION` | `Teleconsultation`, only when the appointment is one |

**Never emitted — decided, not an oversight:** mobile number, email, address,
appointment remarks/notes, and billing status. Remarks are excluded because
they are free text and can contain anything clinical, with no generic way to
sanitise them. Billing is an admin fact with no bearing on the consultation.

A calendar event replicates to consumer accounts and phones the practice does
not control. Keeping contact details out is what makes a leaked feed link an
embarrassment rather than a reportable breach.

The portal already encodes exactly this in `shareableDetails()`
(`src/pages/appointment-listing/data/exportIcs.js`). A service implementation
should mirror that function rather than re-derive the rule.

---

## 5. iCalendar rules worth not rediscovering

All of these are already implemented and working in `buildIcs()`
(`src/pages/appointment-listing/data/exportIcs.js`) — that function can be
lifted into the service as-is.

* **`UID`** — stable and globally unique: `{pam_id}-tatvapractice@tatvacare.in`.
  Stability is what makes an edited appointment *update* rather than duplicate.
* **`DTSTART` / `DTEND`** — floating local time, no `Z`, no `VTIMEZONE`. A
  clinic's 11:15 stays 11:15 wherever the calendar is opened.
* **`DTSTAMP`** — UTC, refreshed on every generation.
* **Escaping** — `\` `;` `,` and newlines, per RFC 5545 §3.3.11. Skipping this
  silently corrupts any name containing a comma.
* **Folding** — content lines wrapped at 75 octets, continuations prefixed with
  a single space, CRLF throughout.
* **`SEQUENCE`** — increment when an event's time changes, or clients ignore
  the update.
* **Header** — `PRODID:-//TatvaCare//TatvaPractice//EN`, `VERSION:2.0`,
  `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, plus
  `X-WR-CALNAME:TatvaPractice — Dr <name>` so it is named sensibly in the
  doctor's sidebar.

---

## 6. Comparison

| | A · OAuth push | B · Subscribable feed |
|---|---|---|
| Backend work | None (session-scoped) | Endpoint, token storage, rotation |
| Doctor effort | Press Sync, consent once per session | Paste a URL once, then nothing |
| Truly hands-off | No | Yes |
| Freshness | Instant, when pressed | Google's poll interval (often hours) |
| Data exposure | Scoped to the consenting account | Anyone holding the URL |
| Revocation | Doctor revokes in Google | Rotate the token |
| Google review | Likely, for a public app | None |

**Neither is strictly better.** A is cheaper and safer but needs a press. B is
hands-off but puts patient data behind an unguessable URL rather than a login.

If unattended sync is required *and* the capability-URL exposure is
unacceptable, the only remaining answer is server-side OAuth with stored
refresh tokens — the most work of the three, and the one that keeps both
properties.

---

## 7. Client work in this repo, if either is approved

1. `data/calendarFeed.js` (option B) — `getFeedLink()`, `rotateFeedLink()`.
2. A dialog from the calendar header menu: the URL with a copy button, per-app
   subscription steps, "last fetched" confirmation, a plain statement of which
   fields are shared, and rotation behind a confirm.
3. Or (option A) a Sync button plus a client-id config value.
4. Gate whichever entry point behind a config flag until the backend ships.

Subscription steps for the doctor, once per app:

* **Google Calendar** — Other calendars → **+** → *From URL* → paste → Add.
* **Outlook** — Add calendar → Subscribe from web.
* **Apple Calendar** — File → New Calendar Subscription.
