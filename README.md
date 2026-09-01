# Pm-Doctor-Portal

Doctor portal website, React.

---

## On this branch: `feat/new-appointment-v1-shyam`

A rebuilt appointment listing screen on the Tesseract design system, with a
Google-Calendar-style schedule alongside the existing table.

**Route:** `/appointments-x` (the legacy appointment screen is untouched and
still live at its own route — this is a parallel implementation.)

### Read this first

| Document | What it answers |
| --- | --- |
| **[docs/appointment-listing/README.md](docs/appointment-listing/README.md)** | Start here. Index, setup, and current status |
| [docs/appointment-listing/PRD.md](docs/appointment-listing/PRD.md) | What problems this solves and every behaviour it promises |
| [docs/appointment-listing/SCOPE.md](docs/appointment-listing/SCOPE.md) | Every file added, the blast radius on existing code, environment traps, open decisions |
| [docs/appointment-listing/TEST-PLAN.md](docs/appointment-listing/TEST-PLAN.md) | ~145 test cases, priority-ordered, written to be run by a person or an agent |
| [docs/appointment-listing-backend-map.md](docs/appointment-listing-backend-map.md) | Endpoint-by-endpoint contract for every call the screen makes |

### What it adds

- **Table view** rebuilt on Tesseract, plus a Patient ID column and a
  teleconsult popover that shows the call before you join it.
- **Calendar view** — day / week / month, the doctor's availability drawn under
  the appointments, pinch and trackpad zoom, drag-to-reschedule on pointer
  devices and tap-to-move on touch.
- **Confirm Appointment** and **Reschedule** drawers, sharing one component.
- **Add New Patient** drawer, opened from the patient search.
- **Reschedule is now one write** — `PUT /api/v1/appointment/{pam_id}` moves an
  appointment in place, replacing the book-then-cancel pair that left a window
  where the patient held two appointments and minted a new `pam_id`.

Every value on the screen comes from a production API. There is no mock data
in the module.

### Running it

The design system is on a **private GitHub Packages registry**, so install
needs a token with `read:packages`:

```bash
gh auth refresh -h github.com -s read:packages
```

```bash
NODE_AUTH_TOKEN=$(gh auth token) npm install --legacy-peer-deps
```

```bash
npm run start:dev
```

Needs a local `.env.dev`. Then open `/appointments-x`.

### Four things that look like bugs and are not

Read [SCOPE.md § 7](docs/appointment-listing/SCOPE.md#7-environment-traps)
before raising any of these:

1. **`npm ci` does not work here.** `package-lock.json` is gitignored and stale
   on `prod`, with no `@dhspl-tatvacare` entry at all. Always
   `npm install --legacy-peer-deps`.
2. **`npm run build` fails** in `@cloudflare/realtimekit` with a Babel
   `transform-classes` error. This is reproducible on an untouched `prod`
   checkout and is unrelated to this branch.
3. **Import errors for exports that plainly exist** (usually
   `ConsultationLayout.js` against the dental slices) mean webpack is holding
   the module graph from the branch that was checked out when the dev server
   started. Restart it.
4. The `babel-preset-react-app` peer-dependency warning is noise, not an error.

### Status

Read paths are verified in a live browser against UAT. **Write paths —
confirming a booking, committing a reschedule, saving a new patient — are
implemented and reviewed but have never been fired**, because each writes real
data. They are P0 in the test plan and should be the first thing tested.

Two backend decisions are still open: the reschedule endpoint accepts no visit
type, category or remark, so edits to those are silently discarded; and there
is no concurrency guard on a move. Both are written up in
[SCOPE.md § 6](docs/appointment-listing/SCOPE.md#6-open-backend-questions).
