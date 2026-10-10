---
title: Submissions & sessions
description: Track queued lineup, waiver and trade actions and the LLM sessions behind them.
sidebar_position: 11
---

Route: `/activity`. The header also shows an activity indicator with the count of unread items.

## What does it show?

| Tab | Shows |
|---|---|
| Submissions | Queued actions with status, timeline events and dependency holds |
| LLM sessions | Recorded assistant and bot sessions |
| Needs attention | Submissions that failed or have an unknown outcome |

A **Search this page** box filters the loaded rows. Detail pages are `/activity/actions/<id>` and `/activity/sessions/<id>`.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/activity/bots` | Bot status |
| `GET /v1/activity/actions` | Submissions (paged by 50) |
| `GET /v1/activity/actions/<id>` | One submission with events |
| `POST /v1/activity/actions/<id>/check` | Ask the worker to re-check ESPN |
| `POST /v1/activity/read/<id>` | Mark read |
| `GET /v1/activity/sessions`, `GET /v1/activity/sessions/<id>` | LLM sessions |

## What actions can it take?

**Check**, **Mark read** and a link to open a session in the [Assistant](./chat.md). None writes a new move to ESPN, so none needs confirmation.
