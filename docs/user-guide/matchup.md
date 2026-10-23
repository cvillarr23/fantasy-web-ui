---
title: Matchup
description: Compare your starters with this week's opponent, with actual and projected points.
sidebar_position: 4
---

Route: `/matchup`. A summary of both teams, then two team columns (player cards on mobile) with starters, a collapsible bench, and suggested swaps.

## What does the summary show?

- **Actual** is what a team or player has scored so far. **Projected** is ESPN's estimate for the whole week. A dash means nothing has been scored yet.
- **Projected margin** is your projected total minus the opponent's.
- **Win chance** is an estimate from that margin, not an ESPN figure, and is labeled as an estimate.
- A starter projected for 0.0 is highlighted in red with a "Projected 0.0" label (a red "!" on phones). That usually means the player is out, inactive or on a bye, so check your lineup.
- The pills under the title jump to the summary or to your team.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup` | Both sides, with actual and projected points |
| `GET /v1/league/current-week` | Default week |

A `404` means no opponent this week (bye, or the season hasn't reached it) and shows an empty state, not an error.

## What actions can it take?

Read-only. **Edit lineup for this week** links to [Lineup](./lineup.md) with the same week. Nothing here writes to ESPN, so nothing needs confirmation.
