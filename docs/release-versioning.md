# Release versioning & Sentry release tracking

Goal: every prod deploy carries a unique, human-readable version, and every Sentry
error can be traced to the release it first appeared in.

The train continues the number already in `package.json` — it was sitting at `4.7.5`
untracked, and the first tracked release is `4.8.0`. Do not reset it to 1.0.0.

## The release string

```
pm-doctor-portal@4.8.0+61c4b3f
└─ package ────┘ └sem┘ └─sha─┘
```

- **package prefix** — makes Sentry parse the string as semver, so releases sort
  correctly and `release:latest` / `release.version` filters work.
- **`+sha`** — semver build metadata pinning the exact commit. Legal semver, and
  Sentry keeps it.

Non-prod builds use `pm-doctor-portal@<short-sha>` (no semver). The `uat` / `qa`
branches are ahead of what shipped, so reusing the semver there would attribute
unreleased errors to a version that is live in prod.

`prod` and `zy-preprod` build the **same commit of the `prod` branch**, so they
share one release and record two Sentry deploys (`-e prod`, `-e zy-preprod`).

## How to cut a release

1. In the PR that merges into `prod`, bump `"version"` in `package.json`.
   - patch `4.8.0 → 4.8.1` — bug fixes only
   - minor `4.8.1 → 4.9.0` — new features, backwards compatible
   - major `4.9.0 → 5.0.0` — breaking change to how the app is used
2. Merge to `prod`.
3. CI does the rest: builds, uploads sourcemaps under that release, deploys,
   registers the release + deploy in Sentry, and pushes the `vX.Y.Z` git tag.

**Forgetting the bump fails the deploy.** The `Resolve release version` step
aborts if `vX.Y.Z` already exists on a *different* commit. That is deliberate —
it is the forcing function, not a bug.

Re-running the workflow on an already-tagged commit (`workflow_dispatch`, or a
retry after a late step failed) is allowed: the tag points at the same commit, so
the deploy proceeds and the tagging step is skipped.

## Do not confuse `version` with `apiCompatibilityVersion`

`package.json` carries both, and they are independent:

| field | meaning | who reads it |
|---|---|---|
| `version` | the release train (`4.8.0`) | CI → git tag + Sentry release |
| `apiCompatibilityVersion` | breaking change vs. the backend contract | `src/hooks/useVersionCheck.js`, force-reloads open tabs |

A routine semver bump must **not** hard-refresh every doctor mid-consult. Only
bump `apiCompatibilityVersion` when an open tab running old JS would actually break.

## Wiring (why it is split the way it is)

The release string is resolved **once** in CI and fanned out:

```
CI: Resolve release version
      └─ --build-arg SENTRY_RELEASE=...
           ├─ ENV SENTRY_RELEASE            → sentry-cli sourcemaps upload --release
           └─ ENV REACT_APP_SENTRY_RELEASE  → CRA inlines → Sentry.init({ release })
```

All three **must** be byte-identical or Sentry silently ships minified stack
traces. One variable, one source, no drift.

- Release resolution lives in CI, not the Dockerfile — the Docker context has no
  reliable git metadata.
- `releases set-commits --auto` runs in the CI job (needs full git history, hence
  `fetch-depth: 0`) and is **non-fatal**: it requires the GitHub integration to be
  enabled for the Sentry org, and a missing integration must never fail an
  already-live prod deploy. A `::warning::` is emitted instead.

## Sourcemaps

Prod and zy-preprod build with `GENERATE_SOURCEMAP=true`. Without it the upload
step ran but shipped nothing, so prod stack traces were minified.

Maps never reach the CDN: the Dockerfile deletes `*.map` immediately after the
Sentry upload, and CI extracts the blob assets from that post-delete image.

## What you get in Sentry

- **Releases** — list sorted by semver, with commits and authors attached.
- **`firstRelease`** — filter issues by the release they first appeared in. This
  is the "which release started this" answer.
- **Regressions** — Sentry re-opens an issue and names the release it came back in.
- **Deploys** — per-environment deploy timeline for each release.
- **Release health** — crash-free session rate per release (sessions are already
  sent by default; setting `release` is what makes them attributable).

Attribution is **forward-only**. Issues that already exist will show the first
tagged release as their `firstRelease`, not their true origin.

## Ops

`curl https://<host>/version.json` →

```json
{ "version": "61c4b3f", "apiVersion": 1.1, "release": "pm-doctor-portal@4.8.0+61c4b3f" }
```

Served from the container with no-cache, never from blob/CDN.
