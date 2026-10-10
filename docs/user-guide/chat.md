---
title: Assistant
description: Ask read-only questions about your league and roster.
sidebar_position: 12
---

Route: `/chat`. Type a question, choose a week, and submit. The answer appears below with a link to the LLM session in Activity.

| Endpoint | Purpose |
|---|---|
| `POST /v1/chat/query` | Ask a question |

Read-only. If no AI provider is reachable, the API returns `503` and the page shows a **No AI provider available** notice. Retry later.
