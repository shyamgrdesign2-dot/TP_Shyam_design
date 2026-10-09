# ---- BUILD STAGE ----
# CRA often prints nothing for a long time during "Creating an optimized production build..." — that is normal.
# Faster builds: pass GENERATE_SOURCEMAP=false from CI (see workflows). Smaller image: .map files removed after Sentry upload in npm run build.
FROM node:20 AS build

ARG REACT_APP_ENV
ARG SENTRY_AUTH_TOKEN
ARG GENERATE_SOURCEMAP
ARG PUBLIC_URL
# Release identity for this build, e.g. pm-doctor-portal@4.8.0+61c4b3f (prod)
# or pm-doctor-portal@61c4b3f (non-prod). Computed in CI, never here — the
# Docker context has no reliable git metadata.
ARG SENTRY_RELEASE
# GitHub Packages PAT (read:packages). Pass from CI:
#   --build-arg NODE_AUTH_TOKEN=${{ secrets.GH_PACKAGES_TOKEN }}
# Used only for npm install; not kept as ENV so it is less likely to linger in layers.
ARG NODE_AUTH_TOKEN
# Bearer token for the Dr. Copilot search service, from a CI secret. The service
# does not yet accept the portal's own session tokens, so a build that should
# reach it needs one supplied. Empty is fine: Copilot then says it cannot
# authenticate rather than failing the build.
ARG REACT_APP_COPILOT_TOKEN

ENV REACT_APP_ENV=$REACT_APP_ENV
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP
ENV PUBLIC_URL=$PUBLIC_URL
ENV REACT_APP_COPILOT_TOKEN=$REACT_APP_COPILOT_TOKEN
# One build-arg drives both consumers so they can never drift:
#   SENTRY_RELEASE            -> sentry-cli sourcemaps upload --release
#   REACT_APP_SENTRY_RELEASE  -> inlined by CRA into Sentry.init({ release })
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV REACT_APP_SENTRY_RELEASE=$SENTRY_RELEASE

ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

WORKDIR /app

COPY package*.json .npmrc ./

RUN if [ -z "$NODE_AUTH_TOKEN" ]; then \
    echo "NODE_AUTH_TOKEN build arg is required to install @dhspl-tatvacare packages" >&2; \
    exit 1; \
  fi \
  && printf '\n//npm.pkg.github.com/:_authToken=%s\n' "$NODE_AUTH_TOKEN" >> .npmrc \
  && npm install --legacy-peer-deps \
  && rm -f .npmrc

COPY . .

RUN npm run build

RUN find /app/build -name "*.map" -type f -delete

# ---- PRODUCTION STAGE ----
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
