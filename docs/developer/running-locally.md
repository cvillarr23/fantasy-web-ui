---
title: Run locally
description: Start the dev server against a local or port-forwarded core API.
sidebar_position: 4
---

:::note[Prerequisites]
- Node 22 (the Docker image uses `node:22-alpine`).
- A reachable `fantasy-core-pipeline` API: a local instance or a port-forward to the cluster.
:::

## How do I start the dev server?

1. Install dependencies.

   ```bash
   npm install
   ```

2. Start Vite.

   ```bash
   npm run dev
   ```

3. Open the printed URL. **Verify**: Settings loads and `GET /v1/draft/config` returns `200` in the network tab.

## How do I point at a port-forwarded API?

Vite proxies `/v1/*` to `http://localhost:8000` by default. Forward the cluster Service to that port, or override the target.

```bash
kubectl port-forward svc/fantasy-core-pipeline 8000:8000
VITE_API_PROXY_TARGET=http://localhost:8000 npm run dev
```

## Which environment variables matter?

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_PROXY_TARGET` | Dev server | API origin for the proxy; default `http://localhost:8000` |
| `TRIGGER_API_KEY` | Dev server | Injected as `X-API-Key` on write routes. Needed to submit lineups, waivers and inbox responses |
| `VITE_DEV_LEAGUE_ID`, `VITE_DEV_TEAM_ID` | `.env.local` (gitignored) | Prefill league and team on every reload; dev builds only |
| `CORE_API_UPSTREAM` | Docker/nginx | Upstream for `/v1/*`; default is the in-cluster Service |

:::warning
Never put `TRIGGER_API_KEY` in a `VITE_*` variable. Those are bundled into the page.
:::

## How do I build and serve the production image?

```bash
npm run build
docker build -t fantasy-web-ui .
```

CI publishes `ghcr.io/<owner>/fantasy-web-ui` on pushes to `master`. Argo CD Image Updater updates the digest in `fantasy-infra`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Writes fail with `401` or `502` | `TRIGGER_API_KEY` missing or wrong in the dev server environment |
| Every request fails | The API isn't reachable at `VITE_API_PROXY_TARGET` |
| Pages say "No league configured yet" | Save settings, or set the `VITE_DEV_*` variables |
