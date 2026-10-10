---
title: Move overview
description: Review the roster impact of a waiver claim or trade before you send it.
sidebar_position: 6
---

Route: `/moves/review`. Reached from **Review move** on Waivers or from the trade builder. It has no sidebar entry.

## What does it show?

- Who joins and leaves the roster.
- Projected lineup points per week, before and after, in a chart.
- Warnings, such as a missing drop or a thin position.
- A **Show rest of season** toggle.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `POST /v1/roster/move-preview` | Compare eligible lineups before and after (up to 90 s) |
| `POST /v1/trigger/waiver` | Queue the claim (waiver moves only) |

## What actions can it take?

| Action | Confirmation | Effect |
|---|---|---|
| Review a waiver | **Confirm live waiver claim** dialog | Queues the claim for ESPN |
| Dry run | **Confirm waiver dry run** dialog | Worker simulates the claim without submitting |

Before the dialog opens, the page re-checks the latest roster. Only the exact roster scope and proposal you reviewed can be confirmed. A waiver supports one addition and at most one drop.
