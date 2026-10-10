---
title: Standings & leaders
description: League standings and player leaders, with filters.
sidebar_position: 10
---

Route: `/league`, titled **Your league**. A segmented control switches views.

| View | Shows | Refresh |
|---|---|---|
| Team standings | Record and points for every team | Every 60 s |
| Player leaders | Top players, filterable by name, position, roster owner and week or season totals | Manual |

| Endpoint | Purpose |
|---|---|
| `GET /v1/league/standings` | Standings rows |
| `GET /v1/league/player-leaders` | Leaders rows, paged |

Read-only; **Refresh** re-reads the current view. Requests allow up to 45 seconds.
