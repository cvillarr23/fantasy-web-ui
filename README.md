# fantasy-web-ui

Fantasy team management console for lineup, matchup, waivers, trades, league standings,
player rankings, draft monitoring, and persistent bot/LLM activity.

The mobile navigation drawer and desktop sidebar share the same pages. Weekly views
follow the current league week unless a week is selected explicitly. Move reviews show
who joins/leaves the roster, projected lineup impact, and warnings before a waiver request.
The Trades page shows outgoing proposals awaiting approval, including the counterparty,
players and pitch, alongside the manual VORP evaluator. Refresh the list to check for new proposals.
The Inbox page shows incoming offers in the API's rank order, with score evidence, expiry,
and seen/snooze/dismiss controls. Accept and decline require review of the exact players
and notes plus an audit label. Counter queues negotiation for later outgoing approval.
Queue receipts are separate from confirmed ESPN outcomes; unavailable score breakdowns
remain explicitly unavailable.
A response that ESPN rejected, or whose outcome is unknown, offers a reviewed Retry; an
unknown outcome also needs confirmation that ESPN shows the offer unanswered.

- [Palette and UI conventions](docs/ui-design-system.md)
- [Project architecture and rollout notes](https://github.com/cvillarr23/fantasy-project/blob/main/docs/season-management-ux.md)

## Running locally

```bash
npm install
npm run dev
```

The dev server proxies `/v1/*` to a locally-running `fantasy-core-pipeline` API
(default `http://localhost:8000`; override with `VITE_API_PROXY_TARGET`).
Set `TRIGGER_API_KEY` in the dev server environment to use protected move and inbox
controls. It is injected by the server proxy and must never be put in a `VITE_*`
variable or browser storage. Production nginx reads the same server-side variable.

## Deployment

CI publishes `ghcr.io/<owner>/fantasy-web-ui` images on `master` (`latest` + commit
SHA tags). Image reference updates in `fantasy-infra` are owned by Argo CD Image
Updater, which writes back digest-pinned references directly to infra git.
