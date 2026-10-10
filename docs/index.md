---
title: Web UI
description: What the fantasy web UI is, where to start, and how the docs are organized.
sidebar_position: 1
---

The web UI is a single-page console for managing your fantasy team: lineup, matchup, waivers, trades, league standings and bot activity. It talks only to the `fantasy-core-pipeline` API.

```mermaid
flowchart LR
    You([You]) --> OP[oauth2-proxy]
    OP --> UI[fantasy-web-ui<br/>nginx + React SPA]
    UI -->|/v1/*| API[fantasy-core-pipeline API]
    API --> MQ[(RabbitMQ)]
    MQ --> W[fantasy-browser-worker]
    W --> ESPN[ESPN]
```

## Where do I start?

| I want to… | Read |
|---|---|
| Use the UI | [User guide](./user-guide/index.md) |
| Run it locally or change the code | [Developer guide](./developer/index.md) |
| Understand how sign-in works | [Authentication](./auth.md) |
| Match colors and layout conventions | [Design system](./design-system.md) |
