# fantasy-web-ui

Fantasy team management console for lineup, matchup, waivers, trades, league standings,
player rankings, draft monitoring, and persistent bot/LLM activity.

The mobile navigation drawer and desktop sidebar share the same pages. Weekly views
follow the current league week unless a week is selected explicitly. Move reviews show
who joins/leaves the roster, projected lineup impact, and warnings before a waiver request.
The Trades page shows outgoing proposals awaiting approval, including the counterparty,
players and pitch, alongside the manual VORP evaluator. Refresh the list to check for new proposals.

- [Palette and UI conventions](docs/ui-design-system.md)
- [Project architecture and rollout notes](https://github.com/cvillarr23/fantasy-project/blob/main/docs/season-management-ux.md)

## Running locally

```bash
npm install
npm run dev
```

The dev server proxies `/v1/*` to a locally-running `fantasy-core-pipeline` API
(default `http://localhost:8000`; override with `VITE_API_PROXY_TARGET`).

## Deployment

CI publishes `ghcr.io/<owner>/fantasy-web-ui` images on `master` (`latest` + commit
SHA tags). Image reference updates in `fantasy-infra` are owned by Argo CD Image
Updater, which writes back digest-pinned references directly to infra git.
