---
title: Game details
description: One NFL game in your matchup, with the fantasy points each side got from it.
sidebar_position: 4.5
---

Route: `/matchup/game/{event_id}`, with the same `?week=` as the [Matchup](./matchup.md) page (the current week without one). Open it from a tile in the games panel, or with **Open game details** in a player's popover. **← Matchup** goes back.

## What does it show?

- **Score:** the away and home teams, whether the game is upcoming, live or final, and while it is live the clock, who has the ball and where. Before kickoff it shows the kickoff time.
- **Your fantasy points from this game** against **the opponent's**, with a bar showing the split. Only starters count. A dash means the game has not started.
- **Matchup players in this game:** both rosters' players whose NFL team is playing, marked **You** or **Opp**, with **Bench** for those whose points don't count. Select a row for the scoring breakdown (stat, what they did, the league rule and the points). **Player card** opens the popover.
- **Fantasy-relevant plays:** this game's plays by those players, newest first.

## How often does it refresh?

Every 30 seconds while the game is in progress, or once its kickoff time has passed. It stops when the game is final or the browser tab is hidden.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup/games/{event_id}` | The score, each side's points, players and plays |
| `GET /v1/players/{id}/summary` | The player popover |
| `GET /v1/league/current-week` | Default week |

Live game data exists only while the core service is tracking the week's games. Otherwise the endpoint returns `404` and the page says there is no live data.

## What actions can it take?

Read-only.
