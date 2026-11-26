---
title: Lineup
description: Stage lineup swaps and IR moves for the current week and submit them to ESPN.
sidebar_position: 3
---

Route: `/lineup` (the default page). It shows your roster by slot, the league's position depth, and the swap and IR controls.

![Lineup with a staged swap](../screenshots/issue-72-lineup.png)

## What does it show?

- A week selector and, when you have an opponent, a **View matchup** link.
- A position-depth grid comparing your team with the league.
- A **Bye-week crunch ahead** banner when, in the next few weeks, NFL byes leave a starting slot empty or force you to start a below-replacement player. It names the week and who is on bye, and links to waiver fill-ins and trades. It is hidden when byes are covered or the outlook can't load.
- Your starters and bench, with bye, injury and rumor badges and suggested bench swaps. **BYE** marks a player on bye in the selected week; **Bye Wk N** shows an upcoming bye.
- On each card, **Actual** and **Projected** fantasy points. Actual appears once the player's game starts; a dash means unknown. A **News** badge marks news from the last 24 hours.
- While core is tracking the week's games, the player's game line, as on [Matchup](./matchup.md).
- Bench and IR as separate sections. Each shows how many of the league's slots are filled (for example "Bench 6/7", "IR 1/1"), with a placeholder for every open spot. An open bench spot links to **Browse free agents** on [Waivers](./waivers.md). Counts appear only once the league's settings have synced.

Select a player's name to open the player popover (Summary, News and Stats). It is a button, so Enter and Space work too. Drag the card anywhere else to stage a swap. Only a bench player can be dragged onto a starting slot. IR players have to be activated first.

A player core can't match to its player records has a plain name, no News badge and no live game line.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup/roster` | Roster for the selected week (works on a bye) |
| `GET /v1/roster/deficits` | Position depth grid |
| `GET /v1/matchup` | Opponent banner; a `404` is treated as "no opponent" |
| `GET /v1/roster/bye-outlook` | Bye-week crunch banner (best-effort) |
| `GET /v1/league/current-week` | Default week |
| `GET /v1/live/players` | Live game lines and actual points |
| `GET /v1/news/recent` | News badges |
| `GET /v1/players/{id}/summary` | The player popover |
| `POST /v1/trigger/lineup` | Submit swaps or IR moves |

## What actions can it take?

| Action | Confirmation | Effect |
|---|---|---|
| Stage a swap | None | Held in the page until you submit |
| **Submit lineup changes** | Button only | Queues the staged swaps for the worker |
| IR move or activation | **Confirm** dialog | Queues a live ESPN IR change |
| **Track lineup changes** | None | Opens the submission in [Activity](./activity.md) |

:::warning
Submit is enabled only for the current week; other weeks are planning only. A queued receipt does not confirm ESPN changed. ESPN can still refuse an IR move, so check your roster afterward.
:::

Staged swaps survive a trip to Waivers or Trades and back. On narrow screens the quick actions wrap:

![Mobile lineup](../screenshots/issue-72-mobile.png)
