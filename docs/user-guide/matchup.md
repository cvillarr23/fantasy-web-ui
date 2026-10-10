---
title: Matchup
description: Compare your starters with this week's opponent, with actual and projected points.
sidebar_position: 4
---

Route: `/matchup`. Two team columns (cards on mobile) with starters, a collapsible bench, and suggested swaps.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup` | Both sides, with actual and projected points |
| `GET /v1/league/current-week` | Default week |

A `404` means no opponent this week (bye, or the season hasn't reached it) and shows an empty state, not an error.

## What actions can it take?

Read-only. **Edit lineup for this week** links to [Lineup](./lineup.md) with the same week. Nothing here writes to ESPN, so nothing needs confirmation.
