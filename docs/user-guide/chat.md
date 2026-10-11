---
title: Assistant
description: Ask read-only questions about your league and roster.
sidebar_position: 12
---

Route: `/chat`. Type a question, choose a week, and submit.

The page shows the conversation as a thread: each question followed by its answer, with the provider, model and response time under every answer. The reply box sits under the latest answer, and a follow-up continues the same conversation, so the assistant sees the earlier questions and answers alongside refreshed league context. While an answer is on its way the thread stays in place and the new turn shows a loading placeholder.

Answers are formatted as Markdown: bold text, lists, code and tables render as such. HTML in an answer is shown as plain text, never rendered.

Every conversation is saved as an LLM session in Activity. **View saved conversation** opens it there, and **Ask a follow-up** on a saved session opens `/chat?session=<id>` with its earlier messages loaded. **New conversation** clears the thread and starts a fresh session.

| Endpoint | Purpose |
|---|---|
| `POST /v1/chat/query` | Ask a question; pass `session_id` to continue a conversation |
| `GET /v1/activity/sessions/{id}` | Load a saved conversation's messages |

Read-only. If no AI provider is reachable, the API returns `503` and that turn shows a **No AI provider available** notice with a **Retry** button. Other failures show the error on the turn that failed, also with **Retry**.
