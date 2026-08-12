# ---- BUILD STAGE ----
# CRA often prints nothing for a long time during "Creating an optimized production build..." — that is normal.
# Faster builds: pass GENERATE_SOURCEMAP=false from CI (see workflows). Smaller image: .map files removed after Sentry upload in npm run build.
FROM node:20 AS build

ARG REACT_APP_ENV
ARG SENTRY_AUTH_TOKEN
ARG GENERATE_SOURCEMAP
ARG PUBLIC_URL
# GitHub Packages PAT (read:packages) for @dhspl-tatvacare/* — passed from CI as a build-arg:
#   buildArguments: NODE_AUTH_TOKEN=${{ secrets.GH_PACKAGES_TOKEN }}
# Consumed only for the install; .npmrc references it via ${NODE_AUTH_TOKEN} and is removed after
# so the token never lingers in an image layer.
ARG NODE_AUTH_TOKEN

ENV REACT_APP_ENV=$REACT_APP_ENV
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP
ENV PUBLIC_URL=$PUBLIC_URL

ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

WORKDIR /app

COPY package*.json .npmrc ./

RUN NODE_AUTH_TOKEN="$NODE_AUTH_TOKEN" npm install --legacy-peer-deps \
  && rm -f .npmrc

COPY . .

# COPY . . re-adds .npmrc — drop it again so npm run build never needs the token env
RUN rm -f .npmrc

RUN npm run build

RUN find /app/build -name "*.map" -type f -delete

# ---- PRODUCTION STAGE ----
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]