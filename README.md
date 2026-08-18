# fantasy-web-ui

Draft-day monitoring dashboard for the fantasy manager pipeline. Part 1 of a planned
web UI (see `fantasy-core-pipeline`'s planning notes) that will eventually grow into a
full overview/management console in front of ESPN's fantasy app.

## What it does

- Follows a live draft in real time via `fantasy-core-pipeline`'s `GET /v1/draft/stream`
  SSE endpoint: pipeline health, job state, on-the-clock team, current pick.
- Shows every pick (yours and opponents') with player name/position, click-to-expand
  for a fuller summary (team, injury status, recent news).
- Shows the system's top-5 ranked draft candidates, with a placeholder slot for ESPN's
  own suggested pick (not yet available - pending a `fantasy-browser-worker` follow-up).
- Lets you pause/resume the pipeline's auto-draft, and publish a manual pick to the
  `draft_targets` queue (does not yet click ESPN's UI for you - that automation is a
  separate follow-up, WORKER-06).

## Running locally

```bash
npm install
npm run dev
```

The dev server proxies `/v1/*` to a locally-running `fantasy-core-pipeline` API
(default `http://localhost:8000`; override with `VITE_API_PROXY_TARGET`).

## Deployment

Not yet wired up - a `fantasy-infra` follow-up covers the Dockerfile, k8s
Deployment/Service/Ingress, and fronting this (and the API) with OIDC via
oauth2-proxy so it isn't left open. See `fantasy-core-pipeline`'s draft-day web UI
plan for the full requirements list.
