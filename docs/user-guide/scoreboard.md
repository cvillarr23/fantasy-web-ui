---
title: Scoreboard
description: Every matchup in the league for a week, score-only.
sidebar_position: 9
---

Route: `/scoreboard`. One card per matchup with both teams' scores; your team is highlighted.

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup/scoreboard` | All matchups for the season and week |
| `GET /v1/league/current-week` | Default week |

Read-only. There are no actions and nothing to confirm.
