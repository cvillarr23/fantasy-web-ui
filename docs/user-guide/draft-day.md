---
title: Draft Day
description: Follow a live draft, see recommendations and intervene on your picks.
sidebar_position: 13
---

Route: `/draft`. The first visit asks for league, team and season, then connects to a live stream. **Reconfigure** reopens that form.

## What does it show?

| Panel | Shows |
|---|---|
| Status header | Connection state, pick clock, whose turn it is |
| Pick feed | Recent picks |
| Position grid, roster vs league, team comparison | Needs by team |
| Recommendation | Ranked candidates for the next pick |
| Diagnostics | Stream health and reconnect count |

A banner warns when the stream is disconnected or has gone quiet.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/draft/stream` | Server-sent events with draft status |
| `GET /v1/draft/status` | Status snapshot |
| `POST /v1/draft/start` | Start the listener for your league |
| `POST /v1/draft/pause`, `POST /v1/draft/resume` | Hold or release your next auto-pick |
| `POST /v1/draft/auto-publish` | Toggle auto-publish |
| `POST /v1/trigger/draft-pick` | Queue a pick |

## What actions can it take?

| Action | Confirmation | Effect |
|---|---|---|
| **Draft this player** | Button on the candidate | Queues a pick for the current pick number |
| Hold or release next auto-pick | None | Affects only our system, not ESPN's autodraft |
| **Auto-publish picks** switch | None | Off means nothing is sent automatically |
| Manual pick | Player search plus submit | Queues a pick for the player you chose |

:::info
Auto-publish disables itself after repeated pick failures and retries on the next pick.
:::

## Practice Draft

Route: `/practice`. Connects the system to a mock draft room so you can rehearse.

| Field | Meaning |
|---|---|
| Practice draft room URL | The room to join |
| Practice league ID, team ID, season | The practice draft's identifiers |

| Endpoint | Purpose |
|---|---|
| `POST /v1/draft/practice/sync-job` | Start the room connector |
| `GET /v1/draft/practice/sync-job/status` | Poll status |
| `DELETE /v1/draft/practice/sync-job` | End the connector (up to 45 s) |

The page shows the same live panels as Draft Day once connected. If the listener isn't confirmed, use **Retry start**.
