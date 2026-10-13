---
title: Developer guide
description: Stack, source layout and where to look when you change the web UI.
sidebar_position: 1
---

The UI is a Vite single-page app written in TypeScript. It has no backend of its own: in production nginx serves the build and proxies `/v1/*` to the core API.

## What is the stack?

| Concern | Choice |
|---|---|
| Build | Vite 8, TypeScript 6 |
| UI | React 19, Mantine 9 (`@mantine/core`, `charts`, `hooks`, `nprogress`) |
| Routing | React Router 7 (`BrowserRouter`; large pages are lazy-loaded) |
| Data | TanStack Query 5 |
| Charts | Mantine Charts on Recharts |
| Drag and drop | `@dnd-kit/core` |
| Tests | Vitest 5, Testing Library, jsdom |
| Component library | Storybook 10 |
| Lint | oxlint |
| Serve | nginx in a Docker image |

## Where is the code?

| Path | Holds |
|---|---|
| `src/App.tsx` | Route table |
| `src/components/` | Pages and panels; `ui/` and `player/` hold shared components, and `inbox/` and `tradeScore/` group larger features |
| `.storybook/` | Storybook config and the `mockFetch` story helper |
| `src/api/` | Request client, response types and query definitions |
| `src/hooks/` | Shared hooks such as `useSelectedWeek` and `useDraftConfig` |
| `src/theme.ts` | Palette and Mantine theme ([design system](../design-system.md)) |
| `nginx.conf.template` | Production proxy |

## What do I read next?

| Page | Covers |
|---|---|
| [API client and types](./api-client.md) | Requests, errors, timeouts, sign-in redirect |
| [State and data fetching](./state.md) | Config, query cache, week selection |
| [Run locally](./running-locally.md) | Dev server, port-forward, env vars |
| [Testing](./testing.md) | Running tests and CI checks |
| [Component library](./storybook.md) | Writing and running stories |
