# Appointment Listing — documentation set

The rebuilt appointment listing (route `/appointments-x`), written up so that a
developer, a QA engineer, or a test-writing agent can pick it up without having
been in the room while it was built.

Read in this order.

| File | What it is | Who it is for | State |
| --- | --- | --- | --- |
| [PRD.md](PRD.md) | What the screen is, who it serves, and every behaviour it promises | Product, design, engineering | Written |
| [SCOPE.md](SCOPE.md) | Every file created, every file touched, and the blast radius on existing code | Engineering, reviewers | Written |
| [TEST-PLAN.md](TEST-PLAN.md) | The end-to-end / API / smoke suite, written to be executable by a person or an agent | QA, test agents | Written |
| [../appointment-listing-backend-map.md](../appointment-listing-backend-map.md) | Endpoint-by-endpoint contract for every call the screen makes | Backend | Written |

## The one-paragraph version

The legacy appointment screen is a table. This rebuild keeps that table, adds a
Google-Calendar-style day/week/month schedule beside it, and puts booking,
rescheduling and patient creation inline instead of on separate pages. It is
built entirely on the Tesseract design system and reads only from production
APIs — there is no mock data anywhere in it.

## Where this lives

Branch **`feat/new-appointment-v1-shyam`**, cut from `origin/prod` and pushed.
It sits directly on prod's tip (0 behind), so a diff against prod shows this
work and nothing else. A merge rehearsal into an untouched `prod` checkout
reports *"Automatic merge went well"* with zero conflicted files.

## Status at time of writing

- **Read paths**: verified in a live browser against UAT.
- **Write paths** (confirm a booking, commit a reschedule, save a new patient):
  implemented and reviewed, **not yet fired**, because each writes real data.
  These are the first things to test.
- **Known backend gaps**: see [SCOPE.md § Open backend questions](SCOPE.md#open-backend-questions).

## Getting this branch running

### 1. Authenticate to GitHub Packages (first time only)

The design system `@dhspl-tatvacare/tesseract-ui` lives in a **private GitHub
Packages registry**, not on npmjs. `.npmrc` reads the token from the
`NODE_AUTH_TOKEN` environment variable, so without it `npm install` fails with:

```
npm error 401 Unauthorized - GET https://npm.pkg.github.com/@dhspl-tatvacare%2ftesseract-ui
```

Get a token from the `gh` CLI rather than pasting a personal access token
anywhere. It needs the `read:packages` scope.

```bash
gh auth refresh -h github.com -s read:packages
```

Then install with the token in the environment for that one command:

```bash
NODE_AUTH_TOKEN=$(gh auth token) npm install --legacy-peer-deps
```

### 2. Run it

```bash
npm run start:dev
```

Needs a local `.env.dev`. Then open `/appointments-x`.

### Notes

**Do not run `npm ci`.** `package-lock.json` is gitignored and stale on `prod`
(it has no `@dhspl-tatvacare` entry at all), so a clean install from the lock
will not give you the design system. Always `npm install --legacy-peer-deps`.

**`npm run build` currently fails on `prod` itself**, in
`@cloudflare/realtimekit`, with a Babel `transform-classes` error. It is
reproducible on an untouched `prod` checkout and is unrelated to this branch.
Fixing it belongs in its own change, not here.

**If you switch branches with the dev server running, restart it.** Webpack
keeps the old module graph and reports import errors for files that are
perfectly fine (typically `ConsultationLayout.js` against the dental slices).
A restart clears it. The same staleness stops CSS modules recompiling, so if a
style change refuses to appear, restart before debugging it.

**The `babel-preset-react-app` warning is noise.** It prints on every install,
build and push (a pre-push hook builds). It is a missing peer declaration in
create-react-app, which is unmaintained, and it is not an error. Silence it if
you like by adding `@babel/plugin-proposal-private-property-in-object` to
devDependencies; it changes nothing about this branch.
