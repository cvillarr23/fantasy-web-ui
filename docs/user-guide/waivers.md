---
title: Waivers
description: Ranked waiver pickups, IR chains and a link to review each move.
sidebar_position: 5
---

Route: `/waivers`. Recommendations refresh every 60 seconds.

![Waiver Manager](../screenshots/issue-72-waivers.png)

## What does it show?

- Ranked add/drop recommendations with a **value over replacement (VORP)** badge. VORP compares player value; it is not your projected score gain.
- Open IR slots and IR moves, including dependency stages for IR-chained claims.
- A collapsible **League position depth** grid.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/waiver/recommendations` | Ranked recommendations, open IR slots and IR moves |
| `GET /v1/roster/deficits` | Position depth grid |

## What actions can it take?

| Action | Confirmation | Effect |
|---|---|---|
| **Review move** | Opens [Move overview](./move-overview.md) | No write yet |
| Quick links | None | Jump to Lineup or Trades with the same week |

The claim itself is submitted from Move overview, behind a confirmation dialog.
