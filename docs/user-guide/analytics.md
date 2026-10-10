---
title: Analytics
description: Browse season VORP and review backtest results.
sidebar_position: 14
---

Route: `/analytics`, with two tabs.

| Tab | Shows | Endpoint |
|---|---|---|
| VORP Browser | Players ranked by value over replacement, filterable by week and position, with sort options | `GET /v1/stats/vorp` |
| Backtest Results | Lineup, waiver and draft strategies compared with baselines for a chosen season | `GET /v1/backtest/results`, `GET /v1/backtest/results/<season>` |

Read-only. VORP is a value comparison and is never labeled as fantasy points.
