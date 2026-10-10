---
title: Settings
description: Set the league, team and season that every page uses.
sidebar_position: 2
---

Route: `/settings`. The league and team you save here apply on every device.

| Field | Meaning |
|---|---|
| League ID | Your ESPN league ID |
| Your team ID | Your team's ID within that league |
| Season | Four-digit year, such as `2026` |

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/draft/config` | Load the saved settings on startup |
| `POST /v1/draft/config` | Save them (the **Save** button) |

## What actions does it have?

**Save** writes the settings to the server and caches them in browser storage. It needs no confirmation and does not touch ESPN. Changing league, team or season clears every cached read.

:::info
Until you save, pages show "No league configured yet" with a **Go to Settings** button.
:::
