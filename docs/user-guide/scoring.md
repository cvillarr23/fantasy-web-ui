---
title: Scoring guide
description: Your league's scoring rules in plain English, with a worked example from this week.
sidebar_position: 10.5
---

Route: `/scoring`. Under **League** in the navigation, and linked from the Matchup page's games panel and a player's **Stats** tab ("How is this scored?").

## What does it show?

- **Your league's rules**, grouped by category. Rules that cost points are in red. A rule that applies to one position names it.
- **Worked example**: a player from this week's matchup, with each stat, the rule applied to it and the points it earned. It starts on your highest scorer; pick any other player who has points, from either team.
- Four steps from stats to a matchup score. Only your **starters** count toward it.

The example needs live game data, which core keeps only around game time. Without it (before kickoff, or for a past week) the page shows the steps without a player. A page opened with `?week=` reads that week's matchup.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/scoring/rules` | The league's rules for the configured season |
| `GET /v1/matchup` | Both rosters, with each player's scoring breakdown |
| `GET /v1/league/current-week` | Default week |

A `404` from the rules endpoint means that season's league settings aren't synced yet.

## What actions can it take?

Read-only. Nothing here writes to ESPN, so nothing needs confirmation.
