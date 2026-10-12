# fantasy-web-ui

Fantasy team management console for lineup, matchup, waivers, trades, league standings,
player rankings, draft monitoring, and persistent bot/LLM activity.

This project is unofficial and not affiliated with ESPN or Disney. It is for personal use on your own leagues. Read the [disclaimer and scope](https://github.com/cvillarr23/fantasy-project/blob/main/DISCLAIMER.md) before using it.

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
An offer that answers one of your counters, or that you countered, shows its
negotiation history. That is every offer and counter in the thread in order,
whose move it is, and how many of the thread's counters you have used. Counter
is disabled once the thread reaches its limit.

## Documentation

| Read | For |
|---|---|
| [User guide](docs/user-guide/index.md) | What each page shows, its API endpoints and which actions need confirmation |
| [Developer guide](docs/developer/index.md) | Stack, layout, API client, state, testing and running locally |
| [Authentication](docs/auth.md) | oauth2-proxy sign-in and how write endpoints are protected |
| [Design system](docs/design-system.md) | Palette, UI conventions and where shared components live |
| [Component library](docs/developer/storybook.md) | Storybook stories for the shared components |

These pages are also published on the project documentation site built from
[`fantasy-project`](https://github.com/cvillarr23/fantasy-project).

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

To prefill the league and team on every reload, put them in a gitignored `.env.local`:

```bash
VITE_DEV_LEAGUE_ID=123456
VITE_DEV_TEAM_ID=1
```

To browse and work on the shared components in Storybook:

```bash
npm run storybook
```

## Deployment

CI publishes `ghcr.io/<owner>/fantasy-web-ui` images on `master` (`latest` + commit
SHA tags). Image reference updates in `fantasy-infra` are owned by Argo CD Image
Updater, which writes back digest-pinned references directly to infra git.
